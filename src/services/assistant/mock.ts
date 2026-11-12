import type { FetchLike } from './client';
import type { ChatTurn, PendingApproval, WriteAction } from './types';

/**
 * Servidor simulado del asistente (sin red). Implementa la misma API HTTP que el real, así el
 * cliente (`client.ts`) ejercita exactamente la misma lógica: sesión, renovación, errores,
 * polling y tarjetas. Escenarios del contrato (§ "Escenarios del mock"), disparados por texto:
 *
 *  1  respuesta que crece ............ cualquier mensaje
 *  2  con foto ....................... adjuntar una imagen
 *  3  failed + Reintentar ............ "probar falla"
 *  4  TURN_BUSY ...................... mandar mientras responde (el botón lo evita; la API igual lo valida)
 *  5  paused / operator .............. "hablar con una persona"
 *  6  sesión vencida → renovación .... "vencer sesión"
 *  7  429 ............................ "probar 429"
 *  8  sin conexión ................... "probar sin red" (el primer envío falla; el reintento entra)
 *  9  tarjeta confirmada ............. "llegó la familia Pérez…", "necesitamos 5 kg de arroz…", "se rompió la heladera"
 * 10  tarjeta rechazada .............. tocar Cancelar en cualquiera de las anteriores
 * 11  tarjeta vencida ................ "tarjeta que vence" (dura 30 s)
 * 12  logout ......................... cerrar sesión en la app
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const PENDING_MS = 700;
const TYPING_MS = 2600;

interface Script {
  reply: string;
  failFirst?: boolean;
  operator?: boolean;
  approval?: { action: WriteAction; input: Record<string, unknown>; ttlMs?: number };
}

interface MockTurn extends ChatTurn {
  clientMessageId?: string;
  startedAt: number;
  attempt: number;
  script?: Script;
  approvalCreated?: boolean;
  operatorSent?: boolean;
}

interface MockConversation {
  id: string;
  paused: boolean;
  createdAt: string;
  turns: MockTurn[];
  approvals: (PendingApproval & { decided?: boolean })[];
  seq: number;
}

const WELCOME = 'Hola, soy el asistente del comedor (modo de prueba). Puedo ayudarte con pedidos, familias, avisos al Banco y recetas.';

const REPLY_FAMILIAS = `Hoy tienen **3 familias** activas:

- **Familia Gómez** · 4 integrantes (1 celíaco)
- **Familia Ruiz** · 2 integrantes
- **Prueba Asistente** · 3 integrantes

¿Querés que te muestre los integrantes de alguna?`;

const REPLY_KILOS = `Este mes recibieron **312 kg** en 4 entregas:

1. Arroz y fideos: **120 kg**
2. Legumbres: **80 kg**
3. Leche en polvo: **62 kg**
4. Verduras: **50 kg**

La última entrega fue el *lunes*.`;

const REPLY_RECETA = `## Guiso de arroz y lentejas (40 personas)

**Ingredientes**
- 4 kg de arroz
- 3 kg de lentejas (remojadas)
- 2 kg de cebolla y 2 kg de zanahoria
- 1 kg de zapallo

**Preparación**
1. Rehogá la cebolla y la zanahoria.
2. Sumá las lentejas con agua y cociná 20 minutos.
3. Agregá el arroz y el zapallo y cociná 18 minutos más.

> Es apto para celíacos si el caldo no tiene TACC.`;

const REPLY_FOTO = `Veo **arroz, lentejas, cebollas y una calabaza**. Con eso te propongo:

- **Guiso de lentejas** para el almuerzo
- **Arroz con calabaza** como opción sin TACC

¿Para cuántas personas cocinan hoy?`;

/** Asunto del aviso a partir del mensaje: "se me rompió el horno" → "Se rompió el horno". */
function noticeTitle(text: string): string {
  const broken = text.match(/se (?:me |nos )?(romp[ií][oó]|rompieron)\s+(.+?)(?:[.,;!?]|$)/i);
  if (broken) {
    const verb = /rompieron/i.test(broken[1]) ? 'rompieron' : 'rompió';
    return `Se ${verb} ${broken[2].trim()}`.slice(0, 80);
  }
  if (/garrafa/i.test(text)) return 'Necesitamos una garrafa';
  const first = text.replace(/^(hola|buen(os|as) (d[ií]as|tardes|noches))[\s,.!]*/i, '').split(/[.!?\n]/)[0].trim();
  const subject = first || text.trim();
  return (subject.charAt(0).toUpperCase() + subject.slice(1)).slice(0, 80);
}

function scriptFor(text: string, hasAttachments: boolean): Script {
  const t = text.toLowerCase();
  if (/hablar con (una )?persona|operador/.test(t)) {
    return { reply: '', operator: true };
  }
  if (/probar falla/.test(t)) {
    return { reply: 'Ahora sí: el reintento funcionó con el mismo mensaje.', failFirst: true };
  }
  if (/tarjeta que vence/.test(t)) {
    return {
      reply: 'Preparé el aviso. **Esta tarjeta vence en 30 segundos** para probar el vencimiento.',
      approval: {
        action: 'mermab_create_organization_interaction',
        input: { interaction_type: 'consulta', title: 'Consulta de prueba', notes: 'Tarjeta que vence en 30 segundos.' },
        ttlMs: 30_000,
      },
    };
  }
  if (/heladera|garrafa|avis|reclamo|rompi/.test(t)) {
    return {
      reply: 'Preparé el aviso al Banco. **Revisalo y confirmalo** en la tarjeta de abajo.',
      approval: {
        action: 'mermab_create_organization_interaction',
        input: {
          interaction_type: /garrafa|necesit/.test(t) ? 'solicitud' : 'suceso',
          title: noticeTitle(text),
          notes: text,
        },
      },
    };
  }
  if (/lleg[oó] la familia|alta|nueva familia|familia .*(chicos|hijos|nenes)/.test(t)) {
    return {
      reply: 'Armé el alta de la familia con sus integrantes. **Revisala y confirmala** en la tarjeta.',
      approval: {
        action: 'mermab_create_org_family',
        input: {
          name: 'Familia Pérez',
          family_type_id: 'mock-type',
          housing_situation: 'alquilada',
          members: [
            { first_name: 'Laura', last_name: 'Pérez', relationship: 'jefe_hogar', is_head_of_household: true, birth_date: '1990-04-12' },
            { first_name: 'Tomás', last_name: 'Pérez', relationship: 'hijo', birth_date: '2016-08-03', is_celiac: true },
            { first_name: 'Sofía', last_name: 'Pérez', relationship: 'hijo', birth_date: '2019-02-20' },
            { first_name: 'Mateo', last_name: 'Pérez', relationship: 'hijo', birth_date: '2022-11-01' },
          ],
        },
      },
    };
  }
  if (/necesit|pedido|pedir|kg de|kilos de/.test(t)) {
    return {
      reply: 'Encontré **Arroz largo fino** disponible. Preparé el pedido para el **jueves**: confirmalo en la tarjeta.',
      approval: {
        action: 'mermab_create_distribution',
        input: {
          organization_id: 'mock-org',
          requested_distribution_date: '2026-11-12',
          notes: 'Pedido armado con el asistente',
          items: [{ product_id: 'p-arroz', product_name: 'Arroz largo fino', quantity_requested: 5, unit: 'kg' }],
        },
      },
    };
  }
  if (hasAttachments) return { reply: REPLY_FOTO };
  if (/familias/.test(t)) return { reply: REPLY_FAMILIAS };
  if (/kilos|kg|recibimos/.test(t)) return { reply: REPLY_KILOS };
  if (/receta|cocin|menú|menu|comida/.test(t)) return { reply: REPLY_RECETA };
  return {
    reply: `Entendí: *"${text.slice(0, 120)}"*.\n\nEstoy en **modo de prueba**. Probá con:\n- "¿Qué familias tenemos?"\n- "Receta para 40 personas con arroz y lentejas"\n- "Llegó la familia Pérez, mamá con 3 chicos"`,
  };
}

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
const fail = (status: number, message: string, headers?: Record<string, string>) =>
  json(status, { statusCode: status, message, error: 'Error' }, headers);

/** Lee nombre/tipo/tamaño del archivo del multipart (web: File; React Native: _parts). */
function fileInfo(body: unknown): { filename: string; mimeType: string; size: number } {
  const fd = body as FormData & { _parts?: [string, { name?: string; type?: string }][] };
  const web = typeof fd?.get === 'function' ? (fd.get('file') as File | null) : null;
  if (web && typeof web === 'object' && 'name' in web) {
    return { filename: web.name, mimeType: web.type || 'image/jpeg', size: web.size ?? 0 };
  }
  const part = fd?._parts?.find(([k]) => k === 'file')?.[1];
  return { filename: part?.name ?? 'adjunto', mimeType: part?.type ?? 'image/jpeg', size: 0 };
}

export function createMockFetch(baseUrl: string): FetchLike {
  const tokens = new Map<string, { expiresAt: number; revoked: boolean }>();
  const bootstraps = new Set<string>();
  const conversations: MockConversation[] = [];
  const attachments = new Map<string, { id: string; filename: string; mimeType: string; size: number }>();
  const once = new Set<string>(); // escenarios que fallan sólo la primera vez

  /** Avanza un turno según el tiempo transcurrido (la respuesta "crece" entre consultas). */
  function advance(c: MockConversation, turn: MockTurn) {
    const s = turn.script;
    if (!s || turn.role !== 'user' || turn.status === 'completed' || turn.status === 'failed') return;
    const elapsed = Date.now() - turn.startedAt;
    if (s.operator) {
      turn.status = 'waiting';
      c.paused = true;
      if (elapsed > 4000 && !turn.operatorSent) {
        turn.operatorSent = true;
        c.turns.push(makeTurn(c, 'operator', 'Hola, soy Marta del Banco de Alimentos. Ya vi tu mensaje, ¿en qué te ayudo?', 'completed'));
      }
      return;
    }
    if (elapsed < PENDING_MS) {
      turn.status = 'pending';
    } else if (s.failFirst && turn.attempt === 1) {
      turn.status = elapsed < PENDING_MS + 1200 ? 'running' : 'failed';
      turn.errorCode = turn.status === 'failed' ? 'AGENT_ERROR' : null;
    } else if (elapsed < PENDING_MS + TYPING_MS) {
      turn.status = 'running';
      const frac = (elapsed - PENDING_MS) / TYPING_MS;
      turn.response = s.reply.slice(0, Math.max(1, Math.floor(s.reply.length * frac)));
    } else {
      turn.status = 'completed';
      turn.response = s.reply;
      if (s.approval && !turn.approvalCreated) {
        turn.approvalCreated = true;
        c.approvals.push({
          id: uid(),
          label: s.approval.action,
          connectionName: 'mermab',
          action: s.approval.action,
          input: s.approval.input,
          expiresAt: new Date(Date.now() + (s.approval.ttlMs ?? 10 * 60_000)).toISOString(),
        });
      }
    }
    turn.updatedAt = new Date().toISOString();
  }

  function makeTurn(c: MockConversation, role: ChatTurn['role'], text: string, status: ChatTurn['status'], response: string | null = null): MockTurn {
    c.seq += 1;
    return {
      id: uid(),
      sequence: c.seq,
      role,
      text,
      status,
      response,
      errorCode: null,
      updatedAt: new Date().toISOString(),
      attachments: [],
      startedAt: Date.now(),
      attempt: 1,
    };
  }

  const publicTurn = ({ id, sequence, role, text, status, response, errorCode, updatedAt, attachments: a }: MockTurn): ChatTurn => ({
    id,
    sequence,
    role,
    text,
    status,
    response,
    errorCode,
    updatedAt,
    attachments: a,
  });

  return async (url, init) => {
    await wait(200 + Math.random() * 200);
    const method = (init.method ?? 'GET').toUpperCase();
    const [path, query = ''] = url.slice(baseUrl.length).split('?');
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null;

    // ─── Sesión (sin token) ───
    if (method === 'POST' && path === '/bootstrap') {
      const bootstrapId = uid();
      bootstraps.add(bootstrapId);
      return json(201, {
        bootstrapId,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        name: 'Asistente (prueba)',
        welcome: WELCOME,
        appearance: null,
        allowAnonymous: true,
      });
    }
    if (method === 'POST' && path === '/sessions/exchange') {
      const id = String(body?.bootstrapId ?? '');
      if (!bootstraps.delete(id)) return fail(403, 'AUTHORIZATION_CONTEXT_MISMATCH');
      const token = `mock-${uid()}`;
      const expiresAt = Date.now() + 60 * 60_000;
      tokens.set(token, { expiresAt, revoked: false });
      return json(201, {
        token,
        expiresAt: new Date(expiresAt).toISOString(),
        authenticated: false,
        identityKey: 'mock-identity',
        name: 'Asistente (prueba)',
        welcome: WELCOME,
        attachmentsAllowed: true,
        appearance: null,
      });
    }

    // ─── Todo lo demás lleva Bearer ───
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization ?? '';
    const tok = tokens.get(auth.replace(/^Bearer /, ''));
    if (!tok) return fail(403, 'INVALID_CREDENTIAL');
    if (tok.revoked) return fail(403, 'SESSION_REVOKED');
    if (tok.expiresAt <= Date.now()) return fail(403, 'SESSION_EXPIRED');

    if (method === 'POST' && path === '/sessions/logout') {
      tok.revoked = true;
      return json(201, { success: true });
    }
    if (path === '/conversations') {
      if (method === 'GET') {
        return json(200, [...conversations].reverse().slice(0, 30).map(({ id, paused, createdAt }) => ({ id, paused, createdAt })));
      }
      const c: MockConversation = { id: uid(), paused: false, createdAt: new Date().toISOString(), turns: [], approvals: [], seq: 0 };
      conversations.push(c);
      return json(201, { id: c.id, paused: false });
    }

    const m = path.match(/^\/conversations\/([^/]+)\/(messages|attachments|approvals)(?:\/([^/]+))?$/);
    const c = m ? conversations.find((x) => x.id === decodeURIComponent(m[1])) : undefined;
    if (!m || !c) return fail(404, 'NOT_FOUND');
    const [, , resource, sub] = m;

    if (resource === 'messages' && method === 'GET') {
      c.turns.forEach((t) => advance(c, t));
      const before = Number(new URLSearchParams(query).get('before')) || Infinity;
      const older = c.turns.filter((t) => t.sequence < before);
      const page = older.slice(-20);
      return json(200, {
        paused: c.paused,
        nextBefore: older.length > page.length ? page[0].sequence : null,
        messages: page.map(publicTurn),
      });
    }

    if (resource === 'messages' && method === 'POST') {
      const clientMessageId = String(body?.clientMessageId ?? '');
      const text = String(body?.text ?? '').trim();
      const ids = (body?.attachmentIds as string[] | undefined) ?? [];
      if (!text || !clientMessageId) return fail(400, 'VALIDATION_ERROR');

      const existing = c.turns.find((t) => t.clientMessageId === clientMessageId);
      if (existing) {
        if (existing.text !== text) return fail(409, 'IDEMPOTENCY_CONFLICT');
        if (existing.status === 'failed') {
          existing.status = 'pending';
          existing.errorCode = null;
          existing.attempt += 1;
          existing.startedAt = Date.now();
        }
        return json(201, { id: existing.id, status: existing.status });
      }

      const t = text.toLowerCase();
      if (/probar sin red/.test(t) && !once.has(`net:${clientMessageId}`)) {
        once.add(`net:${clientMessageId}`);
        throw new TypeError('Network request failed');
      }
      if (/probar 429/.test(t) && !once.has(`429:${clientMessageId}`)) {
        once.add(`429:${clientMessageId}`);
        return fail(429, 'TOO_MANY_REQUESTS', { 'Retry-After': '5' });
      }
      if (/vencer sesi[oó]n/.test(t) && !once.has(`exp:${clientMessageId}`)) {
        once.add(`exp:${clientMessageId}`);
        tok.expiresAt = Date.now() - 1; // el cliente debe renovar en silencio y reintentar una vez
        return fail(403, 'SESSION_EXPIRED');
      }
      c.turns.forEach((x) => advance(c, x));
      const last = [...c.turns].reverse().find((x) => x.role === 'user');
      if (last && (last.status === 'pending' || last.status === 'running')) return fail(409, 'TURN_BUSY');
      if (c.turns.filter((x) => x.role === 'user').length >= 100) return fail(403, 'SESSION_LIMIT');

      const turn = makeTurn(c, 'user', text, 'pending');
      turn.clientMessageId = clientMessageId;
      turn.attachments = ids.map((id) => attachments.get(id)).filter((a): a is NonNullable<typeof a> => !!a);
      turn.script = /vencer sesi[oó]n/.test(t)
        ? { reply: 'La sesión se renovó sola y el mensaje llegó igual. 👍' }
        : scriptFor(text, turn.attachments.length > 0);
      c.turns.push(turn);
      return json(201, { id: turn.id, status: 'pending' });
    }

    if (resource === 'attachments' && method === 'POST') {
      const info = fileInfo(init.body);
      if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(info.mimeType)) return fail(400, 'UNSUPPORTED_ATTACHMENT');
      const a = { id: uid(), ...info };
      attachments.set(a.id, a);
      return json(201, a);
    }

    if (resource === 'approvals' && method === 'GET' && !sub) {
      const now = Date.now();
      return json(
        200,
        c.approvals
          .filter((a) => !a.decided && new Date(a.expiresAt).getTime() > now)
          .map(({ decided: _d, ...a }) => a),
      );
    }

    if (resource === 'approvals' && method === 'POST' && sub) {
      const a = c.approvals.find((x) => x.id === decodeURIComponent(sub));
      if (!a || a.decided || new Date(a.expiresAt).getTime() <= Date.now()) return fail(409, 'APPROVAL_UNAVAILABLE');
      a.decided = true;
      if (!body?.approve) return json(201, { status: 'rejected' });
      const done: Record<string, string> = {
        mermab_create_org_family: 'Listo, **la familia quedó dada de alta**. La vas a ver en Familias.',
        mermab_create_distribution: 'Listo, **el pedido quedó cargado**. Lo vas a ver en Mercadería.',
        mermab_create_organization_interaction: 'Listo, **el aviso le llegó al Banco**.',
      };
      c.turns.push(makeTurn(c, 'assistant', '', 'completed', done[a.action] ?? 'Listo, quedó guardado.'));
      return json(201, { status: 'completed' });
    }

    return fail(404, 'NOT_FOUND');
  };
}
