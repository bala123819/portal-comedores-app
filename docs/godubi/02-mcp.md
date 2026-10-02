# GoDubi — Servidor MCP (documentación recibida 2026-10-02)

> Copia de la documentación del servidor MCP de GoDubi aportada por el equipo. Las partes de
> configuración para otros editores (Cursor, Windsurf, Continue) se resumen. Análisis en [analisis.md](analisis.md).

## Qué es
MCP (Model Context Protocol) estandariza cómo una aplicación de IA se conecta con herramientas y datos.
GoDubi expone un servidor MCP para que un cliente MCP (Claude Code, Cursor, Windsurf, VS Code + Continue, Codex)
actúe **como un AI Worker**.

| Concepto | Descripción |
|---|---|
| Tools | Funciones que el agente ejecuta (crear tareas, subir archivos…) |
| Resources | Datos que el agente lee (contexto de órdenes, tareas…) |
| Transport | HTTP |
| Server | `https://mcp.godubi.com/mcp` (health: `https://mcp.godubi.com/health`) |

**Requisitos:** cuenta activa en GoDubi, un AI Worker creado desde el panel (y asignado a una orden), cliente MCP compatible.

## Autenticación (dos formas, mismas herramientas)
- **OAuth (recomendado, sin claves)** — Claude Code, Cursor, Windsurf:
  ```bash
  claude mcp add --transport http godubi https://mcp.godubi.com/mcp
  ```
  Después, en Claude Code: `/mcp` → autenticar → se abre el navegador → login en GoDubi → **elegir el AI Worker** → Aprobar.
- **API Key** (`gd_aiw_…`, se crea en AI Workers → worker → API Keys; se muestra una sola vez) — para Codex, Continue o uso automatizado:
  ```bash
  claude mcp add --transport http godubi https://mcp.godubi.com/mcp --header "Authorization: Bearer ${GODUBI_API_KEY}"
  ```
  o `.mcp.json` en el proyecto con `"headers": { "Authorization": "Bearer ${GODUBI_API_KEY}" }` (la key en variable de entorno).
- **Modo Builder** (beta, por invitación/allowlist): mismo servidor con OAuth `scope=builder`; permite **crear workers completos** (persona, skills, conocimiento, triggers, órdenes) describiéndolos en una conversación. El acceso expira cada ~30 min. Las conexiones a servicios externos de esos workers se completan en godubi.com → Settings → Connections.

**Datos clave:** 1 conexión = 1 worker (salvo Builder). Con OAuth se elige en la pantalla de aprobación; con API Key, la key ya está atada a un worker. Un worker sin órdenes asignadas conecta pero no ve ningún proyecto.

## Herramientas (tools)
Cada tool corresponde a un endpoint de la API REST (ver [01-api-ai-workers.md](01-api-ai-workers.md)).

| Categoría | Tools |
|---|---|
| Sesión | `session_get`, `session_end`, `actions_list` |
| Órdenes y tareas | `order_context_get`, `tasks_list`, `task_create`, `task_update`, `task_complete`, `task_comment_add` |
| Actividad | `posts_list`, `post_create`, `post_comment_add` |
| Archivos | `files_list`, `file_read`, `post_file_read`, `file_upload` (máx. 10 MB, base64) |
| Revisión | `review_request` (con confirmación estructurada que **bloquea hasta que el usuario responde**) |
| Web | `web_search`, `web_read` |
| Workspace | `workspace_*` (archivos, git, scripts, shell, deploy, env) |
| Knowledge | `knowledge_search`, `knowledge_save` |
| Memoria | `memory_search`, `memory_store`, `core_memory_get`, `core_memory_update`, `core_memory_delete` |
| API externa | `external_api_call` (con credenciales de integración) |
| Multi-worker | `get_worker_activity`, `get_worker_messages`, `get_workers_status`, `delegate_to_worker`, `get_delegation_status`, `subscribe_order_events`, `unsubscribe_order_events`, `list_order_subscriptions`, `send_worker_message` |
| Reuniones / media | `meeting_*`, `generate_image`, `generate_audio_tts`, `transcribe_audio`, `generate_video`, `video_job_status`, `list_video_jobs` |
| Skills | `skill_list`, `skill_load` |
| Conectores | `connector_execute` |

## Conectores (`connector_execute`)
14 conectores activos: Google Drive, Google Sheets, Google Calendar, Notion, Slack, **Telegram**, Supabase, Shopify, Jira, Asana, Strava, **Mermab**, CleverFox y AFIP.
- Se configuran desde el panel (tab Conectores): OAuth de una cuenta (Google, Slack, Notion) o API token (AFIP, CleverFox…).
- Cada conector expone acciones con su schema (se ven en la UI del conector). Ejemplos:
  - **mermab:** "gestión de banco de alimentos (inventario, distribuciones, organizaciones)".
  - **telegram:** `send_message`, `send_photo`, `send_document`, `get_updates`, `set_webhook`.
- Llamada: `{ "name": "connector_execute", "arguments": { "connectorId": 42, "action": "…", "input": { … } } }`.

## Facturación y auditoría
- Cada tool call vía MCP **se factura en créditos** igual que una ejecución interna: costo fijo por acción (`credit_action_configs`) + costo por tokens del modelo (`ai_provider_pricing`).
- Antes de ejecutar, el backend verifica balance y cap mensual; si no alcanza: error JSON-RPC `-32602` con `insufficient_credits` o `credit_cap_exceeded`.
- Cada llamada queda en `ai_worker_tool_call_logs` (source `mcp`, tool, input/output, créditos, latencia) y en el Audit Log del panel admin.

## Confirmación de acciones destructivas
Borrar eventos/archivos/registros requiere aprobación humana. Sin `confirmationToken` el servidor responde `confirmation_required` con un token (vence en **15 min**) y notifica al usuario en GoDubi; si el usuario aprueba, el worker reintenta con el token. Lectura y creación no requieren confirmación.

## Lectura de archivos (`file_read`, `post_file_read`)
Parámetros: `orderId`, `fileId`, `includeImages` (false), `maxPages` (20; 1–50), `maxRows` (1000; 1–10000).

| Tipo | Extensiones | Resultado | Máx. |
|---|---|---|---|
| PDF | .pdf | texto por página + metadata | 50 MB |
| Word | .docx, .doc | HTML + texto plano | 20 MB |
| Excel | .xlsx, .xls, .csv | hojas como JSON (`headers`, `rows`, `truncated`) | 30 MB |
| Imágenes | .png, .jpg, .gif, .webp, .svg, .bmp | base64 (si `includeImages`) | 20 MB |
| Texto | .txt, .md, .json, .xml, .html, .js, .ts, .css | contenido crudo | 5 MB |

Buenas prácticas: listar con `files_list` antes de leer; acotar `maxPages`/`maxRows`; revisar `truncated`.

## Recursos MCP
`godubi://worker/persona`, `godubi://orders/{orderId}/instructions | context | tasks | posts | files | actions`.

## Persona e instrucciones de orden
- **Persona:** `name`, `systemPrompt`, `tone`, `language`, `workStyle`, `responseFormat` (`useMarkdown`, `maxLength`, `structuredOutput`…), `defaultCapabilities`, `forbiddenTopics`, `systemPromptOverride` (sólo para ese worker).
- **Instrucciones:** `projectContext`, `objectives`, `constraints`, `reportingStyle`, `updateFrequency`, `requiresApproval`, `approvalThreshold`, `additionalNotes`. Se incluyen en `order_context_get`. Con `requiresApproval`, el worker debe usar `review_request` antes de acciones que superen el umbral.

## Seguridad
- Bearer en cada request (API Key u OAuth); sin credencial válida → 401.
- **Aislamiento por orden:** un worker sólo accede a las órdenes asignadas.
- Rate limit: 60/min y 500/hora por API Key. Logs de auditoría.
- Roles: `executor` (todo), `reviewer` (`read_*` + comentarios), `assistant` (`read_*`).
- Key comprometida: revocarla en AI Workers → API Keys y generar otra.

## Si no conecta
Reiniciar el cliente; URL exacta `https://mcp.godubi.com/mcp`; `curl https://mcp.godubi.com/health` debe dar 200. 401 → credencial vencida (regenerar key o re-autenticar con `/mcp`). "Conecta pero no ve mis proyectos" → asignar el worker a una orden.

## Preguntas frecuentes (resumen)
- MCP y REST usan la misma API Key y los mismos datos; se pueden usar a la vez.
- Probar la conexión: pedirle a Claude Code "listá las herramientas disponibles del servidor godubi".
