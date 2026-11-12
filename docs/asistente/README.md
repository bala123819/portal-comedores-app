# Chat con el asistente dentro de la app

Implementación del chat con el asistente del comedor (GoDubi) según la **guía definitiva del 11/11/2026**
(post de "Memab developer" en la orden 1149 de GoDubi) y su contrato v2
([asistente-contrato.ts](asistente-contrato.ts), copia exacta del adjunto, SHA-256 `abcb4aac…f7738`).

- **Fecha:** 2026-11-11 · **Autoría:** Martina Gonella (+ asistencia de IA: Claude Code)
- **Decisión:** D-23 en [docs/decisiones.md](../decisiones.md) · **Problemas:** P-25, P-26 y P-27 en
  [problemas-y-soluciones.md](../tesis/problemas-y-soluciones.md)

---

## 1. Qué es

Un **solo chat dentro de la app** (`/asistente`). Detrás responde el asistente del comedor, que puede:

| Qué | Ejemplo | ¿Guarda datos? |
|---|---|---|
| Consultas | "¿Qué familias tenemos?", "¿Cuántos kilos recibimos este mes?" | No |
| Pedidos | "Necesitamos 5 kg de arroz para el jueves" | Sí, con tarjeta |
| Familias | "Llegó la familia Pérez, mamá con 3 chicos, uno celíaco" | Sí, con tarjeta |
| Avisos al Banco | "Se nos rompió la heladera" | Sí, con tarjeta |
| Nutrición y cocina | "Receta para 40 personas con arroz y lentejas", foto de la alacena | No |

**El chat no reemplaza los formularios.** Las dos formas guardan en el mismo backend (`/api/org/...`):

```
 Formulario (Familias, Pedidos, Avisos) ──┐
                                          ├──►  mismo backend  ──►  mismas listas en la app
 Chat ──► tarjeta "Confirmar" ────────────┘
```

Después de confirmar una tarjeta, la app refresca las consultas de Familias, Pedidos o Avisos, así lo cargado
por el chat aparece en las pantallas normales sin recargar.

> ⚠️ **Hoy el asistente atiende siempre a una organización fija: "Comedor Prueba Tesis API".** Para que las
> dos formas muestren lo mismo, la app tiene que estar logueada en esa organización. Si no, el chat muestra
> un aviso. Más adelante se suma la identificación con el login de Mermab (un paso entre bootstrap y
> exchange) y las pantallas no cambian.

## 2. Dónde está cada cosa

| Capa | Archivo | Qué hace |
|---|---|---|
| Configuración | [src/lib/env.ts](../../src/lib/env.ts) | `EXPO_PUBLIC_ASSISTANT_*` con valores por defecto del contrato (son públicos, no son secretos). |
| Tipos del contrato | [src/services/assistant/types.ts](../../src/services/assistant/types.ts) | Tipos, `ACTION_LABELS`, `ACTION_INVALIDATES` e interfaz `AssistantClient`. |
| Errores | [src/services/assistant/errors.ts](../../src/services/assistant/errors.ts) | `AssistantError` (status + código) y mensajes en lenguaje simple. |
| PKCE | [src/services/assistant/pkce.ts](../../src/services/assistant/pkce.ts) | `verifier` y `challenge` con `expo-crypto` (base64 propio, sin `Buffer`). |
| Cliente | [src/services/assistant/client.ts](../../src/services/assistant/client.ts) | Sesión (bootstrap + exchange), renovación silenciosa, pedidos, adjuntos multipart. |
| Simulador | [src/services/assistant/mock.ts](../../src/services/assistant/mock.ts) | `fetch` falso que imita la API, con los 12 escenarios del contrato. |
| Selección de modo | [src/services/assistant/index.ts](../../src/services/assistant/index.ts) | Exporta `assistant` (real o simulado). |
| Lógica del chat | [src/features/asistente/hooks.ts](../../src/features/asistente/hooks.ts) | `useAssistantChat`: conversación, polling, envío, reintentos, historial, tarjetas e invalidaciones. |
| Tarjetas en lenguaje humano | [src/features/asistente/format.ts](../../src/features/asistente/format.ts) | `describeApproval` (sin ids) y `remaining` (contador). |
| Adjuntos | [src/features/asistente/attachments.ts](../../src/features/asistente/attachments.ts) | Cámara / galería (JPEG ~1600 px) y PDF (≤ 10 MB). |
| Componentes | [src/components/asistente/](../../src/components/asistente/) | `Markdown`, `ChatBubbles`, `ApprovalCard`, `Composer`, `AssistantShortcut`. |
| Pantalla | [src/app/(app)/asistente.tsx](../../src/app/(app)/asistente.tsx) | Une todo. Parámetro `prefill` para los atajos. |
| Logout | [src/features/auth/store.ts](../../src/features/auth/store.ts) | `signOut` también cierra la sesión del chat. |

**Accesos al chat:** Inicio (tarjeta "Asistente"), Más, Ayuda, Nutrición y los atajos
**"Hacerlo con el asistente"** en *Registrar familia*, *Hacer un pedido* y *Mensaje al Banco*. Los atajos abren
el chat con un texto precargado **sin enviarlo**.

## 3. Flujos

### 3.1 Sesión (contrato §3)
1. `createPkcePair()` → `verifier` (32 bytes al azar, base64url, 43 caracteres) y `challenge` (SHA-256).
2. `POST /bootstrap { publicationId, origin, challenge }` → `bootstrapId` (vive 60 s, un solo uso).
3. `POST /sessions/exchange { bootstrapId, verifier }` → `{ token, expiresAt, welcome, attachmentsAllowed, … }`.
   Ante 403 `AUTHORIZATION_CONTEXT_MISMATCH` se repite desde el bootstrap una vez.
4. La sesión se guarda en `expo-secure-store` (clave `pc.assistant.session`), **separada del token de Mermab**.
5. **Renovación:** un minuto antes de `expiresAt`, o ante 403 `INVALID_CREDENTIAL` / `SESSION_EXPIRED` /
   `SESSION_REVOKED`, se arma una sesión nueva en silencio y se reintenta **una** vez (`authed()` en `client.ts`).
   Si varias consultas la necesitan a la vez, se arma una sola (`inFlight`).
6. **Logout de la app:** `POST /sessions/logout`, se borra la sesión guardada y `queryClient.clear()` limpia
   la caché del chat.

### 3.2 Conversación y mensajes (contrato §4)
- Al abrir: `GET /conversations` y se retoma la más reciente; si no hay, `POST /conversations`.
  El ícono de la esquina superior derecha abre una conversación nueva.
- **Polling** con TanStack Query: cada **1,5 s** mientras hay un turno en curso (`pending`/`running` o un
  envío que todavía no aparece) y cada **5 s** si no. `refetchIntervalInBackground: false` lo corta en segundo
  plano (`focusManager` ya está conectado a `AppState`) y `onlineManager` lo pausa sin red.
- **Historial sin huecos:** cada consulta suma los turnos nuevos a los que ya había (por `id`), dentro de los
  datos de la propia consulta. "Ver mensajes anteriores" pide `?before=<cursor>` hasta que viene `null`.
- **Enviar:** `POST /conversations/{id}/messages { clientMessageId, text, attachmentIds? }`. El
  `clientMessageId` es un UUID generado en la app y **se reutiliza en cada reintento**, así no se duplica.
- **Un mensaje a la vez:** con un turno en curso, Enviar y las sugerencias quedan deshabilitados.
- **Render:** cada turno `user` muestra el mensaje y, debajo, la `response` en markdown. Mientras está en
  `running`, se ve la parte ya escrita con "Escribiendo…". `failed` muestra "Reintentar". `waiting` y
  `paused` avisan que responde una persona del Banco. `operator` va con otro estilo y `assistant` (turno que
  se agrega después de confirmar una tarjeta) muestra su `response`.

### 3.3 Adjuntos
- Foto con la cámara o de la galería (`expo-image-picker`), comprimida con `expo-image-manipulator` a JPEG
  (lado mayor ≤ 1600 px, calidad 0,7). PDF con `expo-document-picker` (≤ 10 MB). Hasta 4 por mensaje.
- Se suben al tocar Enviar (`POST …/attachments`, multipart, campo `file`) y después se manda el mensaje con
  sus `attachmentIds`. Si el envío falla, al reintentar no se vuelven a subir.
- Sólo se ofrece adjuntar si la sesión dice `attachmentsAllowed: true`.

### 3.4 Tarjetas de confirmación (contrato §5)
- `GET …/approvals` al mismo ritmo que los mensajes.
- Cada tarjeta muestra el **título** de `ACTION_LABELS` (nunca `label`, `action` ni `connectionName`), los datos
  en lenguaje humano (`describeApproval`: nombres, parentesco, fechas, condiciones, productos y cantidades,
  asunto y detalle; **sin ids**) y un **contador** hasta `expiresAt`. Al vencer se deshabilita.
- **Confirmar / Cancelar** → `POST …/approvals/{id} { approve }`. Los botones se deshabilitan al primer toque y
  la decisión **nunca se reintenta sola** (podría guardar dos veces). Si falla la red, se refresca la lista.
- Según el resultado: `completed` → "Listo, quedó guardado" e invalidación; `rejected` → "No se guardó nada";
  `failed` → aviso; `uncertain` → aviso de revisar la pantalla, e invalidación igual. 409
  `APPROVAL_UNAVAILABLE` → "Esa tarjeta ya no está disponible".
- **Invalidación** (`ACTION_INVALIDATES` → consultas de la app):

  | Contrato | Consultas que se refrescan |
  |---|---|
  | `families` | `qk.familiesAll`, `qk.orgProfile`, `qk.orgStats`, búsqueda de miembros |
  | `distributions` | `qk.distributionsAll`, `qk.quota`, `qk.orgStats`, `qk.receivedAll` |
  | `interactions` | `qk.interactionsAll` |

### 3.5 Errores (contrato §6)

| Respuesta | Qué hace la app |
|---|---|
| 403 sesión inválida / vencida / revocada | Sesión nueva en silencio y un reintento (`client.ts`). |
| 403 `AUTHORIZATION_CONTEXT_MISMATCH` | Repite desde el bootstrap una vez. |
| 403 `SESSION_LIMIT` | Aviso y botón "Empezar una conversación nueva". |
| 409 `TURN_BUSY` | No debería pasar (Enviar se deshabilita); si pasa, el mensaje queda con "Reintentar". |
| 409 `IDEMPOTENCY_CONFLICT` | Aviso en consola de desarrollo (es un bug de la app). |
| 409 `CONVERSATION_CLOSED` | Abre una conversación nueva y manda ahí el mismo mensaje. |
| 409 `APPROVAL_UNAVAILABLE` | Aviso y refresco de las tarjetas. |
| 400 `UNSUPPORTED_ATTACHMENT` / 413 | Mensaje de tipo no permitido o archivo muy grande. |
| 429 | "Mandaste muchos mensajes seguidos…" y "Reintentar". |
| 5xx / sin red | "El asistente no está disponible ahora". **Al volver la conexión se reintenta solo** (`onlineManager`). |

### 3.6 Dictado por voz (D-24)
- Botón de micrófono a la izquierda de Enviar (`useDictation` en `src/features/asistente/dictation.ts`). Se
  piden los permisos de micrófono y reconocimiento de voz al primer toque.
- Mientras escucha: el botón pasa a un cuadrado rojo ("Terminar de dictar"), la barra se bordea de rojo y no
  se puede editar, y arriba se lee "Te escucho… Cuando termines, tocá el cuadrado y revisá el texto antes de
  enviarlo". El texto aparece en vivo y se agrega después de lo que ya estaba escrito.
- **No se envía solo:** Enviar queda deshabilitado mientras escucha. Al terminar, el texto queda en la barra
  para corregirlo y enviarlo.
- Errores con mensajes simples (toast): permiso denegado, sin conexión, no te escuchamos, micrófono ocupado,
  dictado no disponible o en español no disponible.
- Sólo se muestra si hay reconocedor: **no en Expo Go** (hace falta un development build) ni en Firefox.

## 4. Modos y configuración

```bash
# .env (ver .env.example)
EXPO_PUBLIC_ASSISTANT_MODE=            # http | mock | vacío
EXPO_PUBLIC_ASSISTANT_BASE_URL=https://webchat.godubi.com/v1/webchat
EXPO_PUBLIC_ASSISTANT_PUBLICATION_ID=9806bc2a-7c76-4fe2-8d7a-79ae79544419
EXPO_PUBLIC_ASSISTANT_ORIGIN=https://app-organizaciones.mermab.com
EXPO_PUBLIC_ASSISTANT_ORG_NAME=Comedor Prueba Tesis API
```

- **Vacío o `http` (por defecto):** API real en el celular **y en web** (D-26). La API no responde al pedido previo
  de CORS (P-25), así que en web la app le habla a `/api-asistente`, un proxy dentro del servidor de `expo start`
  (`scripts/assistant-proxy.js`) que reenvía todo a la API real (P-31). `EXPO_PUBLIC_ASSISTANT_WEB_URL` permite
  apuntar a otro proxy (por ejemplo, el de un hosting de producción).
- **`mock`:** todo funciona sin red, con el mismo cliente (sesión, renovación, errores) contra un `fetch` falso.

### Escenarios del simulador (contrato § "Escenarios del mock")

| # | Escenario | Cómo dispararlo |
|---|---|---|
| 1 | Respuesta que crece | Cualquier mensaje |
| 2 | Con foto | Adjuntar una imagen |
| 3 | `failed` + Reintentar con el mismo `clientMessageId` | "probar falla" |
| 4 | `TURN_BUSY` | La API simulada lo valida; la app no deja mandar con un turno en curso |
| 5 | `paused` / `operator` | "quiero hablar con una persona" |
| 6 | Sesión vencida → renovación silenciosa | "vencer sesión" |
| 7 | 429 | "probar 429" |
| 8 | Sin conexión | "probar sin red" (el primer envío falla; Reintentar lo manda) |
| 9 | Tarjeta confirmada → turno `assistant` | "Llegó la familia Pérez…", "Necesitamos 5 kg de arroz…", "se rompió la heladera" |
| 10 | Tarjeta rechazada | Cancelar en cualquiera de las anteriores |
| 11 | Tarjeta vencida | "tarjeta que vence" (dura 30 s) |
| 12 | Logout | Cerrar sesión en la app |

> En modo simulado, lo que "guarda" el asistente no llega al backend de la app: el turno de confirmación
> aparece, pero la familia no se ve en Familias. Para eso hay que probar con la API real.

## 5. Cómo probarlo

**En el celular, con la API real** (Expo Go):
1. `npx expo start` y abrir con Expo Go (los módulos de cámara, galería y documentos vienen incluidos).
2. Entrar con la coordinadora de prueba del comedor "Comedor Prueba Tesis API" (credenciales fuera de esta doc).
3. Inicio → Asistente.

**Dictado por voz:** no funciona en Expo Go. En el celular hace falta un *development build*
(`npx expo run:android` o `npx eas-cli@latest build --profile development`). En la compu funciona en Chrome con el
simulador (pide permiso de micrófono).

**En la compu:** `npx expo start --web` e ir a `/asistente`: usa el asistente real a través del proxy. Para el
simulador, `EXPO_PUBLIC_ASSISTANT_MODE=mock`.

**Prueba rápida de la API con `curl`:** al final de [asistente-contrato.ts](asistente-contrato.ts).

**Para cerrar la etapa** (pedido en la guía): un video corto desde el celular con una consulta, una receta con
foto, un alta de familia con su tarjeta confirmada (que después se vea en Familias), un aviso al Banco con la
tarjeta cancelada y la sesión vencida que se renueva sola. Se publica en la orden 1149 de GoDubi.

## 6. Verificación hecha (2026-11-11)

- `npx tsc --noEmit` y `npx expo lint`: sin errores.
- **API real con `curl`/Node:** bootstrap 201, exchange 201, `GET /conversations` 200 `[]`, token inválido →
  403 `INVALID_CREDENTIAL`, reusar `bootstrapId` → 403 `AUTHORIZATION_CONTEXT_MISMATCH`, logout 201 y después →
  403 `SESSION_EXPIRED`. El `verifier`/`challenge` armado con la función de `pkce.ts` es aceptado por el servidor,
  y `bytesToBase64` da lo mismo que `Buffer` para 0 a 69 bytes. Para no gastar el cupo diario **no se mandaron
  mensajes reales**.
- **CORS:** el pedido previo (`OPTIONS`) desde `http://localhost:3000` da 404 sin cabeceras CORS: confirma que en
  web no anda.
- **Navegador (Chrome, web, modo simulado, 420×900), con Playwright:** bienvenida y sugerencias; respuesta que
  crece con "Escribiendo…"; markdown (negrita, listas); tarjeta de alta de familia con 4 integrantes, "celíaco/a"
  y sin ids → Confirmar → toast + turno `assistant`; aviso al Banco → Cancelar → "No se guardó nada"; `failed` →
  Reintentar; sesión vencida → renovación silenciosa; sin red → Reintentar; 429 → Reintentar; operador con aviso
  y burbuja "Persona del Banco"; los tres atajos abren el chat con el texto precargado sin enviarlo; conversación
  nueva. **Sin errores en la consola de la página.**

**Dictado (2026-11-11), Chrome con Playwright y una `webkitSpeechRecognition` falsa:** idioma `es-AR`; con
"Hola." ya escrito, el texto en vivo queda "Hola. Necesito arroz y lentejas"; al terminar, "Hola. Necesito arroz y
lentejas para 40 personas" queda en la barra **sin enviarse**; vuelve el micrófono; Enviar lo manda y limpia la
barra. Sin errores en la consola. Permisos generados (`npx expo config --type introspect`): `RECORD_AUDIO`,
`NSMicrophoneUsageDescription` y `NSSpeechRecognitionUsageDescription`.

## 7. Pendientes

- **Probar en el celular con la API real** y grabar el video de cierre (§5). Ahí se valida lo que el simulador no
  cubre: subir adjuntos reales (multipart en React Native), comprimir fotos y la forma real de `input` en las
  tarjetas.
- **Forma del `input` de las tarjetas:** el contrato no la documenta. `describeApproval` es genérico (oculta
  claves técnicas, traduce parentesco, vivienda, tipo de aviso, fechas y condiciones) y reconoce integrantes y
  productos. Si un pedido real trae sólo `product_id` sin nombre, se va a ver "Producto · 5 kg": hay que pedirle a
  GoDubi que incluya el nombre o resolverlo con el catálogo.
- **Identificación con el login de Mermab** (cuando GoDubi la habilite): se agrega `code` en el exchange
  (`IdentityProvider` del contrato). Va a sacar la organización fija y el aviso de organización distinta.
- `src/services/agents/` (proveedor anterior) sigue usándose en *Sugerir recetas*. Evaluar si esa pantalla pasa
  también al asistente nuevo.
- Los módulos de adjuntos vienen en Expo Go, pero **el dictado por voz necesita un *development build***
  (`expo-speech-recognition` tiene código nativo). Falta probarlo con voz real en Android y en iOS.
- **Audio como adjunto** (mandar el mensaje de voz en vez del texto): hoy el contrato no acepta audio. Si GoDubi
  lo habilita y lo transcribe en el servidor, se podría sumar sin sacar el dictado.
