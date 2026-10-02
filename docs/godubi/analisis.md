# Análisis de GoDubi para el proyecto

**Documentos analizados:** [01-api-ai-workers.md](01-api-ai-workers.md) (2026-10-02). Se actualiza a medida que llegue más documentación.

## 1. Qué es esta API (y qué no)

Es la API **del lado del agente**: la usa un AI Worker (o un cliente externo que se autentica *como* worker)
para leer su orden, tareas, archivos y conocimiento, y para actuar (crear tareas, pedir revisión, llamar APIs externas, delegar en otros workers).

**No es** una API para que una app de usuarios finales "chatee" con un agente:
- La key `gd_aiw_…` es la identidad del worker y da acceso a su orden, conocimiento y memoria → **es un secreto**. No puede ir en la app (mismo criterio que la `X-API-Key` de Mermab).
- No hay un endpoint del tipo "mandar mensaje de usuario y recibir respuesta". Lo más cercano es `POST /delegate` con `waitForCompletion` y `POST /events/send-message`, pero son **de worker a worker**.
- Límite de **500 pedidos/hora** por key: compartido entre todos los usuarios si se usa una sola key para la app.

**Consecuencia:** la app no puede hablar directo con GoDubi. Hace falta **un servicio intermedio (gateway)** del lado servidor que guarde la key y traduzca nuestro contrato (`docs/agentes-contrato.md`) a GoDubi. La app no cambia.

## 2. Qué nos sirve

| Recurso de GoDubi | Para qué lo usaríamos | Prioridad |
|---|---|---|
| **Persona** (`tone`, `language`, `forbiddenTopics`, `responseFormat.useMarkdown=false`, `maxLength`) | Fijar el estilo de los agentes: español rioplatense, cálido, sin tecnicismos, texto plano, respuestas cortas | Alta |
| **Instrucciones de orden** (`projectContext`, `objectives`, `constraints`, `requiresApproval`) | Volcar las reglas del contrato: sólo proponer acciones, nunca ejecutar postulaciones/retiros, no inventar datos nutricionales | Alta |
| **Knowledge base** (`knowledge/save`, `knowledge/search`) | Cargar el **recetario** y tablas nutricionales para el agente de recetas y el nutricional (RAG) | **Alta — fase 1** |
| **Archivos con procesamiento** (`files/:id/content`: PDF, Word, Excel) | Subir los **recetarios del Banco** tal como vengan (Excel/Word/PDF) y que GoDubi extraiga el texto | Alta |
| **external_api_call** con `integrationId` | Que el agente consulte la **API Mermab** con credenciales guardadas cifradas en GoDubi (alternativa o complemento al MCP de Mermab), con auditoría | Media — fase 2 |
| **Multi-agente** (`delegate`, Concierge) | Un worker "recepción" que deriva a Recetas / Nutrición / Operación | Media |
| **request_review** | Aprobación humana en GoDubi para acciones sensibles (complementa la regla de que en la app confirma el usuario) | Media |
| **Memoria** (`memory`, `core memory`) | Preferencias por organización (p. ej. cantidad habitual de personas). Cuidar privacidad | Baja |
| **Skills** | Empaquetar instrucciones reutilizables (p. ej. "escalar recetas") | Baja |
| **Servidor MCP de GoDubi** (`/mcp/init-context`) | GoDubi tiene un MCP propio: un cliente externo (por ejemplo Claude Code) podría actuar como worker para preparar y probar agentes | A confirmar |

## 3. Qué no nos sirve

Reuniones (Recall.ai), generación de imagen/video/audio, workspace/deploy, conectores de Google/Notion/Slack/Supabase/CleverFox/AFIP, board de tareas como interfaz de usuario. Telegram aparece como conector; **WhatsApp no** (ver dudas).

## 4. Arquitectura propuesta (hipótesis a validar)

```
App ──HTTP (contrato v1)──▶ Gateway (servidor propio, guarda la key gd_aiw_)
                               │  POST /api/ai/orders/:orderId/delegate
                               │       { toWorkerId: <Recetas|Nutrición|Concierge>, prompt, waitForCompletion: true }
                               │  GET  /api/ai/orders/:orderId/delegations/:id  (si no bloquea)
                               ▼
                         GoDubi: workers Recetas / Nutrición / Operación
                               │  knowledge base: recetario, tablas nutricionales
                               │  external_api_call / MCP Mermab (fase 2)
                               ▼
                         API Mermab (Banco)
```

El gateway arma el `prompt` con el pedido de la app (alimentos, personas, pregunta) e indica el formato de
respuesta (JSON del contrato). Valida la respuesta antes de devolverla a la app.

**A validar:** que una key de worker "gateway" con `orchestrate_workers` pueda delegar y obtener el resultado
de forma bloqueante, la latencia real (objetivo < 8 s, máximo 30 s) y la forma del resultado de una delegación.

## 5. Dudas para la próxima documentación / el equipo de GoDubi

1. **Canal de entrada para usuarios finales:** ¿hay forma oficial de que una app o un webhook dispare a un worker y reciba la respuesta (API de chat, webhook entrante, trigger HTTP)? Si existe, el gateway se simplifica o desaparece.
2. **WhatsApp:** no figura entre los conectores. ¿Cómo se conecta el chatbot de WhatsApp a GoDubi?
3. **Servidor MCP de GoDubi:** ¿URL o paquete, transporte y cómo se autentica (¿con la key `gd_aiw_`?)? ¿Y cómo se conecta un **MCP externo** (el de Mermab) a un worker?
4. **Órdenes:** ¿qué es una "orden" en nuestro caso? ¿Una sola orden "Portal Comedores" con todos los workers, o una por organización?
5. **Formato de salida:** ¿se puede forzar salida estructurada (JSON) en un worker (`responseFormat.structuredOutput`)?
6. **Costos y límites:** 500 pedidos/hora por key, ¿alcanza para la prueba con comedores? ¿Hay límites por modelo/proveedor?
7. **Delegación:** ¿qué devuelve `GET /delegations/:id` (texto final, archivos, posts)?
