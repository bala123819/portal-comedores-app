# Contrato app ↔ agentes de IA (versión 1)

**Estado:** propuesta para el equipo que construya los agentes (GoDubi / n8n). Fecha: 2026-10-01.
**Implementación en la app:** `src/services/agents/` (`http.ts` valida este contrato; `mock.ts` lo simula).

## 1. Alcance

La app **no implementa** los agentes: les manda pedidos HTTP y muestra lo que responden. Los agentes
viven fuera de este repo y, si necesitan datos del Banco, los consultan por su cuenta (MCP server del
backend o la API Mermab del lado servidor).

| Agente | Qué hace | Necesita datos del Banco | Fase |
|---|---|---|---|
| **Recetas** | Con una lista de alimentos y una cantidad de personas, sugiere recetas del recetario de la app | No | **1** |
| **Nutrición** | Responde preguntas sobre valores nutricionales de alimentos o recetas | No (fase 1) / Sí (fase 2: lo recibido por la organización) | 1 y 2 |
| **General / operación** | Responde dudas de uso y puede proponer abrir una pantalla | Sí (fase 2) | 2 |
| **WhatsApp** | El mismo cerebro, por otro canal (chatbot) | Igual que arriba | Aparte |

## 2. Conexión

- **Base URL:** la que se configure en la app como `EXPO_PUBLIC_AGENTS_URL` (p. ej. `https://agentes.ejemplo.org/portal`). Si está vacía, la app usa el agente simulado.
- **Método:** siempre `POST` con JSON. Headers que manda la app:
  - `Accept: application/json`
  - `Content-Type: application/json`
  - `X-Agents-Contract: 1` (versión de este contrato)
- **HTTPS obligatorio.** **CORS:** si la app se usa en web, el servicio debe permitir el origen de la PWA (en desarrollo `http://localhost:3000`).
- **Tiempo máximo de respuesta: 30 s.** Pasado ese tiempo la app corta y muestra "la conexión está muy lenta" con opción de reintentar. Objetivo deseable: < 8 s.
- **Idioma:** respuestas en español rioplatense, claro, sin tecnicismos, pensadas para referentes de comedores.

## 3. Autenticación y privacidad (decisión D-10)

- **Fase 1 (recetas y nutrición general): sin token del usuario.** La app sólo manda ids de contexto. Estos agentes no deben devolver datos privados de ninguna organización, así que no necesitan saber quién pregunta.
- **Fase 2 (datos de la organización):** el agente **no puede confiar** en el `organizationId` que llega en el body: cualquiera podría mandar otro id. Antes de habilitar la fase 2 hay que acordar una de estas opciones:
  1. **(Recomendada)** La app reenvía el token de sesión del usuario (`Authorization: Bearer …`) y el agente llama a la API Mermab **como ese usuario**. El backend ya limita lo que cada usuario ve.
  2. El agente usa su propia API key del tenant y valida la identidad del usuario contra `/auth/me` con el token reenviado.
- **Nunca** se envían a los agentes claves de API de Mermab ni de proveedores de IA desde la app.
- No guardar conversaciones con datos personales más tiempo del necesario.

## 4. Contexto común (`context`)

Todos los pedidos incluyen un objeto `context` con lo mínimo para entender desde dónde pregunta el usuario:

```json
{
  "organizationId": "30ff5546-785b-41c2-8da6-80db4babbebb",
  "mermaId": "…",
  "assignmentId": "…",
  "recetaId": "guiso-de-lentejas"
}
```
Todos los campos son opcionales; sólo vienen los que aplican a la pantalla.

## 5. Endpoints

### 5.1 `POST /recipes/suggest` — agente de recetas (fase 1)

**Pedido:**
```json
{
  "foods": [
    { "name": "Papas", "nutritional_group": "frutas_verduras" },
    { "name": "Lentejas" }
  ],
  "servings": 120,
  "context": { "organizationId": "…" }
}
```
- `foods[].name`: texto libre que escribió el usuario o nombre de un producto recibido.
- `foods[].nutritional_group` (opcional): `cereales`, `frutas_verduras`, `lacteos`, `proteinas`, `aceites`.
- `servings`: cantidad de personas (1 a 2000).

**Respuesta 200:**
```json
{
  "recipes": [
    {
      "recetaId": "guiso-de-lentejas",
      "nombre": "Guiso de lentejas",
      "motivo": "Usa papas y lentejas · rinde para 120 personas escalando la receta"
    }
  ]
}
```
- **`recetaId` debe existir en el recetario de la app** (`src/data/recetas/<id>.json`, mismo `id`). La app abre la receta local y escala las cantidades sola. Si el id no existe, la app muestra la tarjeta pero no la puede abrir.
- Hasta 6 recetas, de la más a la menos conveniente. Lista vacía si no hay ninguna.
- El recetario se le comparte al agente como archivos JSON (schema en `src/features/recetas/schema.ts`). Si el agente quiere proponer recetas nuevas, primero tienen que sumarse al recetario.

### 5.2 `POST /chat` — conversación (fase 1 para recetas y nutrición; fase 2 para el resto)

**Pedido:**
```json
{
  "topic": "recetas",
  "conversationId": "c-123",
  "message": "¿Qué hago con 10 kilos de zapallo?",
  "history": [
    { "role": "user", "text": "Hola" },
    { "role": "assistant", "text": "¡Hola! ¿En qué te ayudo?" }
  ],
  "context": { "organizationId": "…" }
}
```
- `topic`: `general` | `recetas` | `nutricion` (la pestaña que eligió el usuario).
- `conversationId`: falta en el primer mensaje; después se manda el que devolvió el agente.
- `history`: mensajes anteriores de la conversación, sin incluir el actual.

**Respuesta 200** (la misma forma la usa `/nutrition/ask`):
```json
{
  "conversationId": "c-123",
  "text": "Con 10 kilos de zapallo podés hacer sopa o puré. Te dejo dos recetas:",
  "recipes": [{ "recetaId": "sopa-de-verduras", "nombre": "Sopa de verduras" }],
  "actions": [{ "type": "open_recipe", "targetId": "sopa-de-verduras", "label": "Ver la receta" }]
}
```
- `text` es obligatorio y no puede venir vacío. Texto plano, sin markdown.
- `recipes` y `actions` son opcionales.

### 5.3 `POST /nutrition/ask` — agente nutricional

**Pedido:**
```json
{ "question": "¿La lenteja tiene hierro?", "context": { "recetaId": "guiso-de-lentejas" } }
```
**Respuesta 200:** misma forma que `/chat`.

## 6. Acciones propuestas (regla de seguridad)

El agente **puede proponer** acciones, pero **la app nunca las ejecuta sola**: sólo lleva al usuario a la
pantalla correspondiente, donde decide y confirma él mismo. Tipos permitidos:

| `type` | Abre | `targetId` |
|---|---|---|
| `open_recipe` | Detalle de receta | id de la receta |
| `open_merma` | Detalle de alimentos disponibles | id de merma |
| `open_application` | Detalle de pedido | id de postulación |
| `open_assignment` | Detalle de retiro | id de asignación |

Cualquier otro `type` hace que la respuesta se rechace como fuera de contrato. Las acciones de
mermas, pedidos y retiros sólo funcionan cuando ese módulo esté habilitado en la app.
Acciones sensibles (postularse, confirmar, cancelar o completar un retiro) **nunca** se proponen como
algo que el agente "ya hizo".

## 7. Errores

| HTTP | Cuándo | Qué muestra la app |
|---|---|---|
| 400 / 422 | Pedido mal formado | "No pudimos procesar el pedido" |
| 429 | Demasiados pedidos | "Hiciste muchos pedidos seguidos…" (incluir `Retry-After`) |
| 5xx | Falla del agente o del proveedor de IA | "Algo falló, intentá de nuevo" + reintentar |
| 200 fuera de contrato | Falta `text`, `type` desconocido, etc. | "El asistente respondió algo que no pudimos leer" |

En el chat, el mensaje del usuario queda marcado "no se envió · tocá para reintentar".

## 8. Cómo probar

1. Levantar el servicio y configurar `EXPO_PUBLIC_AGENTS_URL` en `.env` de la app.
2. Reiniciar la app (`npm run web` o `npx expo start`).
3. Probar **Más › Asistente** (las tres pestañas) y **Recetas › ¿Qué cocino con lo que tengo?**.
4. Con `EXPO_PUBLIC_AGENTS_URL` vacío, la app vuelve al agente simulado (`src/services/agents/mock.ts`), útil como referencia del comportamiento esperado.

Ejemplo con curl:
```bash
curl -s -X POST "$AGENTS_URL/recipes/suggest" -H 'Content-Type: application/json' -H 'X-Agents-Contract: 1' \
  -d '{"foods":[{"name":"Papas"},{"name":"Zanahorias"}],"servings":50,"context":{}}'
```

## 9. Fuera de este contrato (para coordinar aparte)

- **WhatsApp:** hoy la app sólo abre `wa.me/<número>` con un mensaje prearmado. El chatbot de WhatsApp lo atiende el mismo orquestador; falta el número (`EXPO_PUBLIC_WHATSAPP_NUMBER`).
- **Avisos proactivos:** los webhooks del backend (`merma.created`, `inventory.expiring`, …) los consume el orquestador, no la app.
- **Brief GoDubi ↔ Mermab:** pendiente de recibir (G-11).
