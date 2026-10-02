# Análisis de GoDubi para el proyecto

**Documentos analizados:** [01-api-ai-workers.md](01-api-ai-workers.md) y [02-mcp.md](02-mcp.md) (2026-10-02).
Se actualiza a medida que llegue más documentación.

## 1. Qué es GoDubi para nosotros

Una plataforma donde viven los **AI Workers** (agentes). Cada worker tiene persona (identidad y tono),
capabilities (permisos), knowledge base (RAG), memoria, conectores y órdenes asignadas (proyectos).
Se usa de dos formas, con las mismas credenciales y datos:
- **API REST** (`/api/ai/*`) — 49 endpoints.
- **Servidor MCP** (`https://mcp.godubi.com/mcp`) — las mismas operaciones como *tools*; un cliente MCP (por ejemplo Claude Code) actúa **como un worker**.

Ambas son **del lado del agente**: no hay un canal para que una app de usuarios finales converse con un worker.

## 2. Hallazgos clave

1. **Hay un conector nativo de Mermab** ("gestión de banco de alimentos: inventario, distribuciones, organizaciones"). Es probablemente el camino para que los agentes lean datos del Banco, en lugar del MCP de Mermab o de `external_api_call`. Hay que ver sus acciones y con qué credencial se configura (se configura desde el panel; quien tenga la credencial del tenant).
2. **Claude Code puede conectarse a GoDubi por MCP con OAuth** (sin copiar claves): `claude mcp add --transport http godubi https://mcp.godubi.com/mcp` y luego autenticar eligiendo un worker. **1 conexión = 1 worker.**
3. **Modo Builder** (beta, por invitación): crear workers completos (persona, skills, conocimiento, triggers, órdenes) desde el editor. Si nos habilitan, se puede construir la flota de agentes desde acá.
4. **Telegram sí, WhatsApp no** entre los conectores (Telegram tiene `send_message` y `set_webhook`). El chatbot de WhatsApp sigue sin resolver; Telegram podría ser un canal alternativo para la tesis.
5. **Todo se paga en créditos** (por acción y por tokens). Sin balance → error `insufficient_credits`. Hay que saber quién tiene la cuenta y cuántos créditos hay para desarrollo y para la prueba con comedores.
6. **Acciones destructivas** requieren aprobación humana con token que vence en 15 min; `review_request` puede bloquear hasta que el usuario responde. Encaja con nuestra regla de que los agentes sólo proponen.
7. **Aislamiento por orden:** un worker sólo ve las órdenes asignadas → una orden "Portal Comedores" con todos los workers del proyecto.

## 3. Qué nos sirve

| Recurso | Uso | Prioridad |
|---|---|---|
| Persona (`tone`, `language: es`, `responseFormat.useMarkdown=false`, `maxLength`, `forbiddenTopics`) | Estilo de los agentes: rioplatense, cálido, sin tecnicismos, texto plano, corto | Alta |
| Instrucciones de orden (`constraints`, `requiresApproval`) | Reglas del contrato: sólo proponer acciones, no inventar datos nutricionales, no pedir datos personales | Alta |
| Knowledge base (`knowledge_save` / `knowledge_search`) | Recetario y tablas nutricionales para los agentes de recetas y nutrición | **Alta — fase 1** |
| `file_read` (PDF, Word, Excel) | Leer los recetarios del Banco tal como vengan y pasarlos al knowledge base | Alta |
| Conector **Mermab** | Datos de la organización para el agente de operación (fase 2) | Media |
| `delegate_to_worker` / `get_delegation_status` | Gateway que deriva a Recetas / Nutrición / Operación | Media |
| `review_request` | Aprobación humana de acciones sensibles | Media |
| Conector Telegram | Canal de chat alternativo a WhatsApp | A evaluar |
| Modo Builder | Crear los workers desde Claude Code | Si nos habilitan |

**No nos sirve:** workspace/deploy/shell, reuniones, imagen/audio/video, conectores de Google/Notion/Slack/Shopify/Jira/Asana/Strava/Supabase/CleverFox/AFIP.

## 4. Arquitectura propuesta

```
App ──HTTP (contrato v1)──▶ Gateway propio (servidor; guarda la key del worker "gateway")
                              │  delegate_to_worker / POST /delegate { toWorkerId, prompt, waitForCompletion: true }
                              ▼
                         GoDubi · orden "Portal Comedores"
                              ├─ Worker Recetas    (knowledge: recetario)
                              ├─ Worker Nutrición  (knowledge: tablas nutricionales)
                              └─ Worker Operación  (conector Mermab, fase 2)
                                          │
                                          ▼
                                     API Mermab (Banco)
```
- La key de GoDubi nunca va en la app (D-10 y regla general de secretos).
- El gateway arma el prompt, pide la respuesta en el formato del contrato y la valida.
- **A validar:** latencia de una delegación bloqueante; forma del resultado; consumo de créditos por mensaje; si 500 pedidos/hora por key alcanzan.

## 5. Cómo trabajamos los agentes desde Claude Code

1. En GoDubi (UI, lo hace el equipo): crear la orden **"Portal Comedores"** y un worker **Recetas** con capabilities mínimas (`read_order_context`, `read_files`, `knowledge_search`, `knowledge_write`), asignado a la orden.
2. Conectar Claude Code a GoDubi por **OAuth** eligiendo el worker Recetas (comando de la sección 2.2; lo ejecuta el equipo, no se copian claves).
3. Desde Claude Code, actuando como ese worker: cargar el recetario en su knowledge base, probar búsquedas, leer los recetarios del Banco subidos a la orden y armar casos de prueba.
4. Persona e instrucciones: se redactan acá y se pegan en la UI (por API sólo se leen).
5. Para el resto de los workers: una conexión por worker, o modo Builder si nos habilitan.

## 6. Dudas abiertas

1. **Canal de entrada para usuarios finales:** ¿API/webhook oficial para que una app dispare un worker y reciba la respuesta? (Si no, gateway con delegación.)
2. **WhatsApp:** ¿cómo se conecta? ¿Telegram es aceptable como alternativa?
3. **Conector Mermab:** acciones disponibles, credencial que usa (¿API key del tenant de pruebas?), quién lo configura.
4. **Créditos:** de quién es la cuenta, cuántos créditos hay, costo estimado por conversación.
5. **Modo Builder:** ¿nos pueden habilitar?
6. **Salida estructurada:** ¿`responseFormat.structuredOutput` garantiza JSON?
7. **Delegación:** qué devuelve `get_delegation_status` y cuánto tarda.
