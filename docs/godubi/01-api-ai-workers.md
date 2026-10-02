# GoDubi — API de AI Workers (documentación recibida 2026-10-02)

> Copia de la documentación de GoDubi que aportó el equipo. Las secciones relevantes para el proyecto
> están completas; las de media, reuniones y workspace se resumen (no aplican). Análisis en
> [analisis.md](analisis.md).

## Autenticación
API Key del **AI Worker** (formato `gd_aiw_{32 caracteres}`), por header:
- `Authorization: Bearer gd_aiw_…` (recomendado) o `X-API-Key: gd_aiw_…`

Scopes de la key: `read` (lectura), `write` (crear/editar/borrar), `execute` (completar tareas, pedir revisión).

**Rate limit:** 60 pedidos/minuto y **500 pedidos/hora**. Headers `X-RateLimit-Limit-Minute`, `X-RateLimit-Remaining-Minute`, `X-RateLimit-Limit-Hour`, `X-RateLimit-Remaining-Hour`.

Todos los paths van bajo `/api/ai`.

## Capabilities (permisos por worker)

| Grupo | Capabilities |
|---|---|
| Lectura | `read_order_context`, `read_tasks`, `read_files`, `read_activity` |
| Escritura sobre la orden | `create_tasks`, `update_tasks`, `complete_tasks`, `delete_tasks` (restringida), `add_task_comments`, `add_post_comments`, `post_activity`, `upload_files`, `delete_files` (restringida), `request_review`, `create_subtasks`, `assign_tasks`, `manage_board` (avanzadas) |
| Web y APIs externas | `web_search`, `web_read`, `external_api_call` (HTTP arbitrario), `connector_execute` (Google Drive/Sheets/Calendar, Notion, Slack, Telegram, Supabase, CleverFox, AFIP) |
| Multi-agente | `read_worker_activity`, `send_worker_message`, `subscribe_order_events`, `orchestrate_workers` |
| Knowledge y memoria | `knowledge_search`, `knowledge_write`, `memory_search`, `memory_store` |
| Workspace | `workspace_read`, `workspace_write`, `workspace_git`, `workspace_exec`, `workspace_deploy` |
| Media y reuniones | `image_generate`, `audio_tts`, `audio_stt`, `video_generate`, `meeting_bot`, `skill_execute` |
| Roles del sistema | `worker_provisioning` (sólo Worker Builder), `concierge_route` (sólo Concierge: `worker_list`/`worker_describe`/`worker_delegate`), `concierge_request_handoff` |

Roles por defecto: `executor` (ejecución completa de tareas), `reviewer` (lectura + comentarios), `assistant` (lectura mínima + comentarios).

## Sesión
- `GET /session` → sesión activa, AI Worker autenticado, órdenes asignadas, capabilities.
- `POST /session/end` `{ "summary": "…" }` → cierra la sesión y guarda el resumen.

## Persona del worker
Se administra desde la UI de GoDubi (no por la key del worker). Por API sólo se lee.
Campos: `tone` (`professional|friendly|technical|casual`), `workStyle` (`proactive`, `asksClarification`, `detailLevel`, `stepByStep`, `qualityFocused`), `responseFormat` (`useMarkdown`, `includeCodeExamples`, `maxLength`, `structuredOutput`), `forbiddenTopics[]`, `systemPromptOverride`.
- `GET /worker/persona` → `{ id, name, systemPrompt, tone, language, workStyle, responseFormat, skills, forbiddenTopics, systemPromptOverride }`

## Orden (contexto e instrucciones)
- `GET /orders/:orderId/context` (`read_order_context`) → `{ order, board.tasks, files, activity, collaborators, instructions }`
- `GET /orders/:orderId/instructions` (`read_order_context`) → brief humano de la asignación (se edita sólo desde la UI): `projectContext`, `objectives[]`, `constraints[]`, `reportingStyle` (`minimal|normal|detailed|verbose`), `updateFrequency` (`on_completion|hourly|on_milestone|continuous`), `requiresApproval`, `approvalThreshold`.

## Tareas
- `GET /orders/:orderId/tasks` (`read_tasks`) — con filtros (estado, asignado…)
- `POST /orders/:orderId/tasks` (`create_tasks`) `{ title, description, dueDate, tag }`
- `PATCH /orders/:orderId/tasks/:taskId` (`update_tasks`)
- `POST /orders/:orderId/tasks/:taskId/complete` (`complete_tasks`)
- `POST /orders/:orderId/tasks/:taskId/comments` (`add_task_comments`)

## Posts / actividad
- `GET /orders/:orderId/posts` (`read_activity`)
- `POST /orders/:orderId/posts` (`post_activity`) `{ text, type: "ai_update" }`
- `POST /orders/:orderId/posts/:postId/comments` (`add_post_comments`)

## Archivos
- `GET /orders/:orderId/files` (`read_files`) → `[{ id, title, description, filepath, status, createdAt, user }]`
- `GET /orders/:orderId/files/:fileId/content` (`read_files`) → **lee y procesa** PDF, imágenes, Word, Excel/CSV y texto: `{ fileId, filename, mimeType, fileSize, signedUrl, content: { type, pageCount, fullText, pages[] }, processedAt }`
- `GET /orders/:orderId/posts/:postId/files/:fileId/content` (`read_files`) — ídem para adjuntos de posts (imágenes en base64).
- `POST /orders/:orderId/files` (`upload_files`) — multipart; dispara el indexado.

## Revisión humana
- `POST /orders/:orderId/request-review` (`request_review`) `{ taskId, message, priority }` → notificación in-app para aprobar/rechazar.
- `GET /orders/:orderId/actions` → historial de acciones del worker (auditoría).

## Knowledge base (RAG)
Cada worker tiene un knowledge base con embeddings. La ingesta es asíncrona (`status: "processing"`).
- `POST /orders/:orderId/knowledge/search` (`knowledge_search`) `{ query, topK, knowledgeBaseId }` → `{ results: [{ content, source, sourceType, relevanceScore }], totalResults, query }`
- `POST /orders/:orderId/knowledge/save` (`knowledge_write`) `{ title, content, sourceType, sourceRef }` → `{ saved, documentId, knowledgeBaseId, title, status }`

## Memoria
Memorias semánticas (`fact`, `preference`, …) y *core memory* (clave-valor inyectado en cada ejecución).
- `POST /orders/:orderId/memory/search` (`memory_search`) `{ query, topK, types[] }`
- `POST /orders/:orderId/memory` (`memory_store`) `{ type, content, confidence }` (deduplica)
- `GET /memory/core` · `PUT /memory/core/:key` `{ value }` · `DELETE /memory/core/:key`

## Llamadas a APIs externas
Integraciones con credenciales cifradas, creadas desde la UI y referenciadas por `integrationId` (bearer, api_key, basic, custom_header, oauth2). Todo queda auditado en `ai_worker_action_logs`.
- `POST /orders/:orderId/external-api-call` (`external_api_call`) `{ url, method, headers, queryParams, body, timeoutMs, integrationId }` → `{ status, headers, body, durationMs }`

## Multi-agente
- `GET /orders/:orderId/worker-activity` (`read_worker_activity`)
- `GET /orders/:orderId/worker-messages` (`send_worker_message`)
- `GET /orders/:orderId/workers-status` (`orchestrate_workers`) → busy / idle / error / running
- `POST /orders/:orderId/delegate` (`orchestrate_workers`) `{ toWorkerId, prompt, waitForCompletion }` — bloqueante si `waitForCompletion: true`
- `GET /orders/:orderId/delegations/:delegationId` (`orchestrate_workers`) → estado y resultado

## Eventos y mensajes entre workers
- `POST /events/subscribe` (`subscribe_order_events`) `{ orderId, eventPattern: "task.*", promptTemplate }` — con `promptTemplate`, cada evento dispara una ejecución automática.
- `POST /events/unsubscribe` · `GET /events/subscriptions?orderId=`
- `POST /events/send-message` (`send_worker_message`) `{ orderId, toWorkerId, message, triggerExecution }`

## MCP helpers
Usados por el **servidor MCP de GoDubi** para tener paridad con la ejecución interna.
- `GET /mcp/init-context` → `{ persona: { id, name, provider, modelId }, knowledgeBase: { documents, chunks }, coreMemory }` — "útil para que clientes externos vean la misma información ambient que el orchestrator interno".
- `POST /mcp/confirmations/notify` — crea la notificación in-app cuando una acción destructiva queda pendiente de aprobación (`confirmationToken`).

## Skills
- `GET /skills` (`skill_execute`) → skills asignados · `GET /skills/:slug` → texto completo de instrucciones.

## Conectores
- `POST /connectors/execute` (`connector_execute`) `{ orderId, connectorName, action, input }` — conectores: google_drive, google_sheets, google_calendar, notion, slack, telegram, supabase, cleverfox, afip. Acciones destructivas requieren `confirmationToken`.

## No aplican al proyecto (resumen)
- **Reuniones** (Recall.ai): `/meetings/join|transcript|leave`.
- **Media**: `/media/image`, `/media/tts`, `/media/stt`, `/media/video` (+ consulta de jobs).
- **Workspace** (deploy-system): capabilities `workspace_*`.

## Catálogo (49 endpoints, prefijo `/api/ai`)
| Método | Endpoint | Capability |
|---|---|---|
| GET | /session | - |
| POST | /session/end | - |
| GET | /worker/persona | - |
| GET | /orders/:orderId/instructions | read_order_context |
| GET | /orders/:orderId/context | read_order_context |
| GET | /orders/:orderId/tasks | read_tasks |
| POST | /orders/:orderId/tasks | create_tasks |
| PATCH | /orders/:orderId/tasks/:taskId | update_tasks |
| POST | /orders/:orderId/tasks/:taskId/complete | complete_tasks |
| POST | /orders/:orderId/tasks/:taskId/comments | add_task_comments |
| GET | /orders/:orderId/posts | read_activity |
| POST | /orders/:orderId/posts | post_activity |
| POST | /orders/:orderId/posts/:postId/comments | add_post_comments |
| GET | /orders/:orderId/files | read_files |
| POST | /orders/:orderId/files | upload_files |
| GET | /orders/:orderId/files/:fileId/content | read_files |
| GET | /orders/:orderId/posts/:postId/files/:fileId/content | read_files |
| POST | /orders/:orderId/request-review | request_review |
| GET | /orders/:orderId/actions | - |
| POST | /orders/:orderId/knowledge/search | knowledge_search |
| POST | /orders/:orderId/knowledge/save | knowledge_write |
| POST | /orders/:orderId/memory/search | memory_search |
| POST | /orders/:orderId/memory | memory_store |
| GET | /memory/core | - |
| PUT | /memory/core/:key | - |
| DELETE | /memory/core/:key | - |
| POST | /orders/:orderId/external-api-call | external_api_call |
| GET | /orders/:orderId/worker-activity | read_worker_activity |
| GET | /orders/:orderId/worker-messages | send_worker_message |
| GET | /orders/:orderId/workers-status | orchestrate_workers |
| POST | /orders/:orderId/delegate | orchestrate_workers |
| GET | /orders/:orderId/delegations/:delegationId | orchestrate_workers |
| POST | /events/subscribe | subscribe_order_events |
| POST | /events/unsubscribe | subscribe_order_events |
| GET | /events/subscriptions | subscribe_order_events |
| POST | /events/send-message | send_worker_message |
| POST | /meetings/join | meeting_bot |
| POST | /meetings/transcript | meeting_bot |
| POST | /meetings/leave | meeting_bot |
| GET | /mcp/init-context | - |
| POST | /mcp/confirmations/notify | - |
| POST | /media/image | image_generate |
| POST | /media/tts | audio_tts |
| POST | /media/stt | audio_stt |
| POST | /media/video | video_generate |
| GET | /media/video/:jobId | video_generate |
| GET | /media/video | video_generate |
| GET | /skills | skill_execute |
| GET | /skills/:slug | skill_execute |
| POST | /connectors/execute | connector_execute |
