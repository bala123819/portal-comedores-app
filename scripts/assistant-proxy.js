/**
 * Proxy del asistente para la web en desarrollo.
 *
 * La API del asistente de GoDubi no responde al pedido previo de CORS (OPTIONS → 404, sin cabeceras
 * `Access-Control-*`), así que el navegador bloquea las llamadas directas. El celular no tiene ese
 * problema. En web, la app le habla a `/api-asistente/*` en el mismo servidor de Metro, y este
 * middleware reenvía el pedido tal cual a la API real: mismo método, cabeceras, cuerpo (también el
 * multipart de los adjuntos) y respuesta.
 *
 * Sólo existe mientras corre `expo start`: un `expo export` estático no lo incluye (ver docs/tesis P-31).
 */
const https = require('node:https');

const PREFIX = '/api-asistente';
const TARGET = new URL(process.env.EXPO_PUBLIC_ASSISTANT_BASE_URL || 'https://webchat.godubi.com/v1/webchat');

/** Cabeceras del navegador que no tienen que llegar a la API (las de conexión y las del origen local). */
const DROP = new Set(['host', 'origin', 'referer', 'cookie', 'connection', 'accept-encoding']);

function proxy(req, res) {
  const path = req.url.slice(PREFIX.length) || '/';
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!DROP.has(key) && !key.startsWith('sec-')) headers[key] = value;
  }
  const upstream = https.request(
    {
      protocol: TARGET.protocol,
      hostname: TARGET.hostname,
      port: TARGET.port || 443,
      method: req.method,
      path: TARGET.pathname.replace(/\/$/, '') + path,
      headers,
      timeout: 95_000,
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
  upstream.on('error', () => {
    if (res.headersSent) return res.end();
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ statusCode: 502, message: 'ASSISTANT_PROXY_ERROR' }));
  });
  req.pipe(upstream);
}

/** Para `server.enhanceMiddleware` de metro.config.js */
function withAssistantProxy(middleware) {
  return (req, res, next) => {
    if (req.url === PREFIX || req.url.startsWith(`${PREFIX}/`)) return proxy(req, res);
    return middleware(req, res, next);
  };
}

module.exports = { withAssistantProxy, ASSISTANT_PROXY_PREFIX: PREFIX };
