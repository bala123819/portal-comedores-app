# API gaps — pedidos y drift respecto de la API Mermab

> **Actualización 2026-09-30.** El Banco mandó la guía de la API de organizaciones (`docs/bda/`), con
> respuestas reales. Quedan **resueltos**: G-01 para los endpoints que usamos (forma real de login, me,
> org profile/stats/address, familias, demografía y avisos), G-02 (qué endpoints puede usar el rol
> `organization_coordinator`) y G-03 (CORS: `localhost:3000` y `3001`). Abajo, los bugs conocidos que
> reportó el Banco (G-12) y lo que falta pedir (G-13).

Registro de lo que falta o no coincide en la API. No se modifica el backend desde este repo: esto es lo que se le pide al Banco / equipo Mermab. Mientras tanto se usa un mock tipado (`mocks/`) detrás de la misma interfaz.

Formato: **qué falta · qué pantalla lo necesita · propuesta · mientras tanto**.

---

### G-01 · Respuestas 2xx sin documentar (crítico)
- **Qué falta:** solo 15/522 operaciones documentan la respuesta exitosa; no existe `components/schemas`. Ninguna de `auth/*` ni `/org/*` documenta `data`. La colección Postman se generó sin sesión: todos los ejemplos son `401`/`500`.
- **Pantallas:** todas.
- **Propuesta:** que Scribe genere respuestas con `@responseFile` o API Resources (`@apiResource`) al menos para `auth/login`, `auth/me`, `capabilities`, `/org/*`, `/notifications*`, `/nutrition/merma/{id}/summary`, `/assignments/{id}/pickers|eligible-contacts`; y regenerar Postman con un usuario de ejemplo.
- **Mientras tanto:** tipos de respuesta escritos a mano en `features/*/types.ts`, validados con zod y relevados contra la API real con un usuario de prueba (`npm run check:api` los vuelca a `docs/api/samples/`, con datos personales enmascarados).

### G-02 · Permisos por endpoint sin documentar
- **Qué falta:** el spec no dice qué permiso/rol exige cada endpoint. No sabemos si un usuario organización puede usar `/nutrition/*`, `/notifications/*`, `/organizations/{id}/contacts|requirements|documents|social-data|collection-commitments`, `/assignments/{id}/pickers|eligible-contacts|remito`, `/collection-sessions/*`, `/programs/*`.
- **Pantallas:** Nutrición, Quién retira, Documentación, Jornadas, Talleres.
- **Propuesta:** agregar en cada operación el permiso requerido (p. ej. extensión `x-permission`) y que `/capabilities` liste los endpoints/acciones habilitados para el usuario.
- **Mientras tanto:** la app consulta `/auth/me` + `/capabilities`; si algo da `403`, el módulo se oculta. En Fase 1 se prueba cada uno con el usuario organización y se documenta el resultado acá.

### G-03 · CORS no admite el puerto por defecto de Expo web
- **Qué falta:** el preflight solo devuelve `Access-Control-Allow-Origin` para `http://localhost:3000` y `https://app.mermab.com` (probado 2026-09-25). No admite `http://localhost:8081` (Expo) ni el dominio donde vayamos a publicar la PWA.
- **Pantallas:** todas en web.
- **Propuesta:** agregar el dominio de deploy de la PWA (a definir) a `allowed_origins`; opcional `http://localhost:8081`.
- **Mientras tanto:** en desarrollo, Expo web corre en el puerto 3000 (`expo start --web --port 3000`). Ver D-04.

### G-04 · Enum de estado de postulaciones sin documentar
- **Qué falta:** `status` de postulación no tiene enum. Solo se deducen `pendiente` y `rechazada`; `aprobada` y `cancelada` son inferidos.
- **Pantallas:** Mis postulaciones, StatusBadge.
- **Propuesta:** documentar el enum (y el de jornadas de recolección).
- **Mientras tanto:** mapeo en `lib/status.ts` con fallback genérico "Estado: {valor}" para valores desconocidos, y log en desarrollo.

### G-05 · Completar retiro desde el portal de organización es incompleto
- **Qué falta:** `POST /org/assignments/{id}/complete` solo acepta `picked_up_by_name`, `picked_up_by_dni`, `notes`. La versión admin (`PUT /assignments/{id}/complete`) acepta además `remito_tokens[]`, `products[{id, quantity_received}]`, `evidence_photo_url`, `signature_url`. No está claro si la organización puede subir remito (`POST /assignments/{id}/remito`).
- **Pantallas:** Detalle de asignación → Completar retiro.
- **Propuesta:** aceptar `remito_tokens` y `products[].quantity_received` también en el endpoint de organización, y habilitar `/assignments/{id}/remito` para el dueño de la asignación.
- **Mientras tanto:** completar solo con nombre + DNI + notas. Botón "Subir remito" oculto hasta confirmar.

### G-06 · Push solo Web Push; sin clave VAPID pública
- **Qué falta:** `POST /notifications/subscribe` solo acepta suscripciones Web Push (`endpoint`, `keys.p256dh`, `keys.auth`). No acepta tokens de Expo/FCM nativos, y no hay endpoint para obtener la clave pública VAPID.
- **Pantallas:** Notificaciones (push), ajustes.
- **Propuesta:** (a) `GET /notifications/vapid-public-key`; (b) aceptar `{ provider: "expo", token }` en `/notifications/subscribe`.
- **Mientras tanto:** push web en Fase 8 si se consigue la clave; push nativo diferido. En la app, badge de no leídas con refresco al volver a foco (sin polling agresivo).

### G-07 · Drift en enums
- `organization_type`: el enum del PUT dice `comedor|hogar`, el ejemplo usa `cocina_comunitaria` y `/document-requirements` menciona `comedor, hogar, cocina_comunitaria, escuela`.
- `default_unit` de productos: POST describe `kg, litros, unidades, paquetes, cajas, docenas`; el enum del PUT solo `kg|litros`.
- `document_type`: enum `personeria_juridica|estatuto`, ejemplo `inscripcion_renspa`.
- `GET /org/families` y `GET /nutrition/summary` declaran parámetros como *body* en un GET (deberían ser query).
- `llms.txt` habla de 493 operaciones; el spec tiene 522.
- `Idempotency-Key` y `Retry-After` no están declarados en ninguna operación del spec (solo en `llms.txt`).
- **Mientras tanto:** los labels contemplan todos los valores vistos, con fallback.

### G-08 · Cuota nutricional de la organización
- **Qué falta:** existe `PUT /organizations/{id}/quota` (admin) pero no un GET explícito de la cuota ni de su consumo para la organización.
- **Pantallas:** Información nutricional.
- **Propuesta:** incluir la cuota en `GET /org/profile` o `GET /org/stats`, o un `GET /org/nutrition` con cuota vs. recibido en el período.
- **Mientras tanto:** mostrarla solo si aparece en `/org/profile`; `/nutrition/summary` con rango solo si responde acotado a la organización.

### G-09 · Jornadas y talleres sin vista de organización
- **Qué falta:** `GET /collection-sessions` y `GET /programs/{id}/trainings` no tienen filtros documentados ni versión `/org/*`.
- **Pantallas:** Programas y jornadas.
- **Propuesta:** `GET /org/collection-sessions?status=programada` y `GET /org/trainings`.
- **Mientras tanto:** módulo detrás de feature flag, activado solo si los endpoints responden con el rol organización.

### G-10 · No hay módulo de recetas (y no hay recetarios fuente)
- **Qué falta:** la API no tiene recetas. Además, en `docs/` no se copió ningún recetario (Excel/PDF/Word/JSON).
- **Pantallas:** Recetario, sugerencias en merma/asignación, agente de recetas.
- **Propuesta de contrato para el backend** (a futuro):
  - `GET /api/recipes?search=&category=&tag=&nutritional_group=&per_page=` → `{ id, name, category, base_servings, tags[], time_minutes, nutritional_info? }`
  - `GET /api/recipes/{id}` → + `ingredients[{name, quantity, unit, nutritional_group_code?, unified_product_id?}]`, `steps[]`
  - `GET /api/recipes/suggest?merma_id=|assignment_id=` → recetas ordenadas por coincidencia.
- **Mientras tanto:** recetario local en `data/recetas/*.json` detrás de `features/recetas/repository.ts`. **Necesito los recetarios** para el script de conversión.

### G-11 · Brief GoDubi inaccesible
- El link de `llms.txt` a GitLab devuelve 403 (challenge de Cloudflare). Se necesita una copia en `docs/` para definir contexto y acciones sensibles de los agentes (Fase 7).

### G-12 · Bugs conocidos del backend (reportados por el Banco, `docs/bda/01-guia.md` §4)
| Bug | Cómo lo maneja la app |
|---|---|
| `PUT /org/address` con dato inválido → 500 (no 422) | Validación con zod + coordenadas obligatorias antes de enviar |
| `{id}` no UUID → 500 (no 404) | `orgApi.family()` corta antes con "no encontrado" |
| Pasarse de 60 req/min → 500 (no 429) | Cliente autolimitado a 50/min; GET reintenta con espera |
| `/notifications/subscribe` → 200 con `"message":"201"` | Se toma el 200 como éxito |
| Dos formas de paginación | `toPage()` soporta ambas |
| `/org/stats` sólo sirve `impacto` | La app sólo muestra `impacto` |
| Clave incorrecta en login → 422 en `errors.email` (no 401) | La pantalla de login lo muestra como "email o contraseña incorrectos" |
| `PUT /auth/password` exige `new_password_confirmation` (no está en el OpenAPI) | Se envía |
| `?source=x` inválido → 422 en inglés | La app no deja elegir `source` |
| Cambiar la clave no cierra las sesiones abiertas | Informativo |

### G-13 · Lo que falta para completar la app (pedir al Banco)
| Falta | Pantalla que lo espera (ya hecha, apagada) | Módulo |
|---|---|---|
| Mermas: postular y retirar probado para este rol | Disponibles, pedido, retiro, quién retira | `mermas` |
| Alta y edición de familias | Registrar familia | `familiasAlta` |
| Contactos y autorizaciones de retiro | Mi organización › Contactos | `contactos` |
| Documentos, ficha social, carta compromiso | Documentación | `documentacion` |
| Jornadas y talleres con vista de organización | Jornadas y talleres | `programas` |
| Lectura de grupos nutricionales / resumen nutricional para este rol | Nutrición (secciones extra) | `nutricionApi` |
| Push nativo (FCM/APNs/Expo) y clave VAPID pública para Web Push | Avisos en el dispositivo | — |
| Recuperar contraseña (los mails no salen del servidor) | Login | — |
| Editar teléfono y mail de la organización | Mi organización | — |

Cuando el Banco habilite un módulo: `EXPO_PUBLIC_ENABLE_MODULES=<módulo>` y se prueba, sin tocar código.
