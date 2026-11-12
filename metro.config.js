const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { withAssistantProxy } = require('./scripts/assistant-proxy');

const config = getDefaultConfig(__dirname);

// En web el asistente pasa por este proxy: la API de GoDubi no admite CORS (scripts/assistant-proxy.js)
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) =>
  withAssistantProxy(enhance ? enhance(middleware, server) : middleware);

module.exports = withNativeWind(config, { input: './src/global.css' });
