# 00 — Inventario de relevamiento (Fase 0)

Fecha: 2026-09-25 · Spec relevado: Mermab API **v4.0.0** (OpenAPI 3.0.3, 522 operaciones en el spec; `llms.txt` dice 493).

## 1. Archivos leídos

| Archivo | Origen | Notas |
|---|---|---|
| `docs/api/llms.txt` | https://cloud.mermab.com/llms.txt | Convenciones obligatorias. Leído completo. |
| `docs/api/openapi.yaml` | https://cloud.mermab.com/docs/openapi.yaml | 800 KB, generado con Scribe (Laravel). Contrato. |
| `docs/api/collection.json` | https://cloud.mermab.com/docs/collection.json | Postman. 266 requests traen "respuesta de ejemplo", pero todas son `401`/`500` (se generó sin sesión): **no sirven como ejemplos de datos**. |
| Brief GoDubi (GitLab) | link en `llms.txt` | **No accesible**: GitLab responde 403 con challenge de Cloudflare. Pendiente que lo compartan. |
| Resto de `docs/` | — | **Vacío.** No hay recetarios, tablas nutricionales, flujos de agentes, mockups ni anteproyecto. |
| Repo | — | Expo SDK **57** (`expo ~57.0.25`), RN 0.86, React 19.2, TS 6.0, Expo Router con rutas en `src/app/`, `web.output: "static"`. |

### Verificaciones en vivo (sin credenciales)

- `GET /api/health` → `200 {"status":"ok","version":"4.0.0","realtime":{"socket_url":"https://cloud.mermab.com"}}` ✅
- `GET /api/org/profile` sin token → `401` ✅ (esperado).
- Headers de rate limit presentes: `x-ratelimit-limit: 60`, `x-ratelimit-remaining`.
- **CORS**: el preflight acepta `http://localhost:3000` y `https://app.mermab.com` (con `allow-credentials: true`), pero **no** `http://localhost:8081` (puerto por defecto de Expo web), ni 5173/8080. Ver `api-gaps.md` G-03 y `decisiones.md` D-04.

## 2. Hallazgos que condicionan todo el diseño

1. **El spec casi no documenta respuestas.** Solo 15 de 522 operaciones tienen schema 2xx, y ninguna de las que usa esta app (ni `login`, ni `me`, ni `/org/*`). Tampoco hay `components/schemas`. Consecuencia: `openapi-typescript` nos da tipos de **paths, query params y bodies**, pero los **tipos de respuesta hay que escribirlos a mano** a partir de respuestas reales, validados con zod. → G-01.
2. **No se documentan permisos por endpoint.** Solo sabemos que `/auth/me` y `/capabilities` devuelven roles/permisos. Hasta tener un usuario organización de prueba no sabemos qué endpoints fuera de `/org/*` puede usar (nutrición, notificaciones, contactos, familias, jornadas...). → G-02.
3. **El Portal Organización (`/api/org/*`) usa `POST` para las acciones de asignación** (a diferencia de los `PUT` del módulo admin): llevan `Idempotency-Key` obligatorio.
4. **Push solo Web Push** (`endpoint` + `keys.p256dh/auth`); no acepta tokens de Expo. → G-06.
5. **No hay módulo de recetas** (confirmado) y no llegaron recetarios fuente. → G-10.
6. `Idempotency-Key` y `Retry-After` no aparecen declarados en ningún endpoint del spec; la regla sale de `llms.txt`. Gana `llms.txt` (es la documentación normativa) — ver nota en §7.

## 3. Módulos de la API relevantes para una organización

| Módulo (tag OpenAPI) | Uso en la app | Prioridad |
|---|---|---|
| Autenticación | Login, sesión, perfil, contraseña | Núcleo |
| Sistema | Health, capabilities (diagnóstico / permisos) | Núcleo |
| **Portal Organización** | Perfil, estadísticas, mermas disponibles, postulaciones, asignaciones, familias | Núcleo |
| Otros (sin tag propio) | Quién retira: pickers, eligible-contacts, pickup-authorizations; `/org/families*` | Núcleo |
| Nutrición | Resumen nutricional de merma y por rango | Alta |
| Grupos Nutricionales | Catálogo de grupos (código, g/día recomendados, color) | Alta |
| Productos Unificados | Datos nutricionales / Open Food Facts | Media |
| Notificaciones | Bandeja, no leídas, push web | Alta |
| Organizaciones (sub-recursos) | Contactos, requerimientos de documentos, documentos, ficha social, carta compromiso, compromisos de recolección | Media (según permisos) |
| Familias | Resumen demográfico, detalle | Media |
| Programas | Jornadas de recolección (`collection-sessions`), talleres (`trainings`) | Baja/Media |
| Asignaciones de Mermas (admin) | `POST /assignments/{id}/remito` (subir remito) — solo si el rol lo permite | Baja |

Fuera de alcance (aunque estén en el spec): Usuarios, Roles, Donantes, Sucursales, Portal Sucursal, Portal Donante, Depósitos, Inventario, Distribuciones, Pagos, Compras, Donaciones, Billing, API Keys, Webhooks, Analytics, Zonas, Kits, Importación, Tareas, Tenant config, Reportes admin, Voluntarios, Public renditions.

## 4. Endpoints que vamos a usar

Convenciones: base `https://cloud.mermab.com/api`; `Accept` + `Content-Type: application/json`; `Authorization: Bearer`. **IK** = requiere `Idempotency-Key`. Respuesta: envoltorio `{success, data, meta?, message?, errors?}`. "Resp." = forma de `data`; *s/d* = sin documentar en el spec (hay que relevarla contra la API real).

### 4.1 Autenticación y sistema

| Método | Ruta | Body / query | Resp. | Notas |
|---|---|---|---|---|
| POST | `/auth/login` | `email*`, `password*` | s/d (token + user) | Rate limit 10/min. ¿IK? ver §7 |
| POST | `/auth/logout` | — | s/d | Revoca el token actual |
| GET | `/auth/me` | — | s/d (usuario + roles + permisos + tenant) | ¿Trae `organization_id`? → G-02 |
| POST | `/auth/refresh` | — | s/d (token nuevo) | Borra el token actual |
| PUT | `/auth/profile` | `first_name`(2-100), `last_name`(2-100), `phone`(regex `^[\d\s+\-()]{6,20}$`), `avatar_url`, `preferences` | s/d | |
| PUT | `/auth/password` | `current_password*`, `new_password*` (≥8) | s/d | |
| GET | `/health` | — | `{status, timestamp, version, realtime.socket_url}` | Sin auth. Único bien documentado. |
| GET | `/capabilities` | — | s/d (módulos + permisos del usuario) | Acepta Bearer según descripción |

### 4.2 Portal Organización

| Método | Ruta | Body / query | Resp. | Notas |
|---|---|---|---|---|
| GET | `/org/profile` | — | s/d | Fuente del `organization_id` |
| GET | `/org/stats` | — | s/d | Dashboard |
| PUT | `/org/address` | `street*`, `city*`, `street_number`, `neighborhood`, `state`, `postal_code`, `country`, `full_address`, `latitude`(-90..90), `longitude` | s/d | Edición de dirección (fase posterior) |
| GET | `/org/mermas/available` | `urgent`, `priority`, `max_distance` (km), `per_page` | s/d, paginado | Corazón operativo |
| GET | `/org/mermas/{merma}` | — | s/d | Detalle |
| GET | `/org/applications` | `status`, `per_page` | s/d, paginado | |
| POST | `/org/applications` **IK** | `merma_id*` (uuid), `message` (≤500), `can_pickup_immediately`, `preferred_pickup_time` (`H:i`), `requires_transport_help` | s/d | "Postularme" |
| GET | `/org/applications/{application}` | — | s/d | |
| DELETE | `/org/applications/{application}` | — | s/d | **Cancelar postulación** (es un DELETE, no `/cancel`) |
| GET | `/org/assignments` | `status` (o `pending`), `per_page` | s/d, paginado | |
| GET | `/org/assignments/{assignment}` | — | s/d | |
| POST | `/org/assignments/{a}/confirm` **IK** | — | s/d | `asignada → confirmada` |
| POST | `/org/assignments/{a}/start-transit` **IK** | — | s/d | `confirmada → en_camino` |
| POST | `/org/assignments/{a}/complete` **IK** | `picked_up_by_name*` (≤255), `picked_up_by_dni*` (≤20), `notes` (≤500) | s/d | Sin remito ni cantidades recibidas → G-05 |
| POST | `/org/assignments/{a}/cancel` **IK** | `reason` (≤500, opcional) | s/d | Reactiva la merma |
| GET | `/org/families` | (`source` declarado como body en un GET: probable error del spec) | s/d | Familias de mi organización |
| GET | `/org/families/demographics` | — | s/d | Resumen demográfico |
| GET | `/org/families/{family_id}` | — | s/d | |

### 4.3 Quién retira (sin tag, dentro de "Otros")

| Método | Ruta | Body | Notas |
|---|---|---|---|
| GET | `/assignments/{id}/eligible-contacts` | — | Contactos que pueden retirar **y por qué los otros no** |
| GET | `/assignments/{id}/pickers` | — | Declarados para retirar |
| POST | `/assignments/{id}/pickers` **IK** | `organization_contact_id` **o** `name` + `dni`; `declared_via: web\|whatsapp` | Permite gente fuera del padrón (queda marcada) |
| DELETE | `/pickers/{picker_id}` | — | Baja de declaración |
| GET | `/organizations/{org}/contacts` | — | `id, name, position, phone, email, dni, is_primary` |
| GET / POST | `/organizations/{org}/contacts/{c}/pickup-authorizations` | `scope_type*: all\|donor\|donor_zone\|branch`, `scope_ref`, `valid_from`, `valid_until`, `created_via: web\|whatsapp` | Alta de autorización (¿permiso org?) |
| DELETE | `/pickup-authorizations/{id}` | — | Baja lógica |
| POST | `/assignments/{id}/remito` **IK** | multipart `remito` (jpeg/jpg/png/webp/pdf, ≤10 MB) → token | Solo útil si el complete de org acepta `remito_tokens` → G-05 |

### 4.4 Nutrición y productos

| Método | Ruta | Query | Notas |
|---|---|---|---|
| GET | `/nutrition/merma/{mermaId}/summary` | — | Resumen nutricional de una merma |
| GET | `/nutrition/summary` | `start_date*`, `end_date*` | Por rango; ¿acotado a la org o a todo el tenant? → G-02 |
| GET | `/nutrition/stats` | — | "Del tenant": probablemente no apto para org |
| GET | `/nutritional-groups` | `search` | Catálogo con `code`, `daily_recommended_grams`, `color`, `icon` |
| GET | `/unified-products`, `/unified-products/{id}`, `/unified-products/search?q=` | `search`, `food_category_id`, `per_page`(≤100) / `q*`(≥2), `limit`(≤50) | Datos OFF |
| GET | `/organizations/{org}` | — | Incluiría la cuota nutricional (`PUT /quota` es admin) → G-08 |

### 4.5 Notificaciones

| Método | Ruta | Notas |
|---|---|---|
| GET | `/notifications` | `per_page`, `type` (ej. `merma_nueva`), `unread` |
| GET | `/notifications/unread-count` | Badge |
| POST | `/notifications/read-all` **IK?** | Idempotente por naturaleza; mandamos IK igual |
| POST | `/notifications/{n}/read` **IK?** | Ídem |
| DELETE | `/notifications/{n}`, `/notifications` | Eliminar una / todas |
| POST | `/notifications/subscribe` | Web Push: `endpoint*`, `keys{p256dh*, auth*}`, `device_type`, `browser`, `os` |
| POST | `/notifications/unsubscribe` | `endpoint*` |

### 4.6 Documentación, programas y jornadas (según permisos)

| Método | Ruta | Notas |
|---|---|---|
| GET | `/organizations/{org}/requirements` | Requerimientos resueltos con estado |
| GET | `/organizations/{org}/documents` + `/documents/{d}/download` | Solo lectura |
| GET | `/organizations/{org}/social-data` | Ficha social (solo lectura) |
| GET | `/organizations/{org}/terms-pdf` | Carta compromiso, solo si ya fue aceptada |
| GET | `/organizations/{org}/collection-commitments?year=` | Historial de jornadas y ausencias |
| GET | `/collection-sessions`, `/collection-sessions/{id}` | **Sin filtros documentados** → G-09 |
| PUT | `/collection-sessions/{id}/confirm` (IK recomendado) | "La organización confirma su asistencia anticipadamente" |
| GET | `/programs`, `/programs/{id}/trainings` | Talleres; sin filtro por organización → G-09 |

## 5. Entidades principales (campos conocidos por los bodies)

- **Merma**: `donor_id`, `donor_branch_id`, `title`, `description`, `priority`, `is_urgent`, `publication_date`, `deadline` (null = "Sin vencimiento"), `pickup_date`, `pickup_time_start/end` (HH:mm), `requires_refrigerated_transport`, `requires_loading_help`, `returnable_containers`, `requires_gel_coolers`, `special_requirements[]`, `contact_name/phone/email`, `products[]` (`name`, `product_id`, `description`, `category`, …; con `quantity_assigned`), `merma_number`, `total_products`.
- **Postulación (application)**: `merma_id`, `organization_id`, `message`, `can_pickup_immediately`, `preferred_pickup_time`, `requires_transport_help`, `status`, `response_notes`.
- **Asignación (assignment)**: `scheduled_pickup_date`, `scheduled_pickup_time_start/end`, `products[]` (`merma_product_id`, `quantity_assigned`, `quantity_received`), `picked_up_by_name/dni`, `completion_notes`, `evidence_photo_url`, `signature_url`, `cancellation_reason`, `completed_at`, `cancelled_at`.
- **Contacto de organización**: `id, name, position, phone, email, dni, is_primary` (+ autorización de retiro).
- **Picker (declaración de retiro)**: contacto del padrón o `name`+`dni` libre; `declared_via`.
- **Grupo nutricional**: `name`, `code`, `description`, `daily_recommended_grams`, `priority_order`, `icon`, `color` (hex), `display_order`.
- **Producto unificado**: `name`, `barcode`, `brand`, `generic_name`, `default_unit`, `weight_per_unit_kg`, `quantity_text`, `food_category_id`, `nutritional_group_id`, `is_bulk`, `is_active`, `source`.
- **Organización**: `name`, `legal_name`, `tax_id`, `organization_type`, dirección, `phone`, `email`, `contact_person`, `service_count`, `total_beneficiaries`, `declared_families`, `has_refrigeration`, …, `status`.
- **Jornada (collection session)**: `program_id`, `session_date`, `organization_id`, `total_kg`, `volunteers_count`, `hours_total`, `contributions[]`, `attendances[]`, `status`.

## 6. Enums y máquinas de estado

| Entidad | Valores | Fuente | Confianza |
|---|---|---|---|
| Merma `status` | `activa`, `asignada`, `en_proceso`, `completada`, `cancelada`, `vencida`, `perdida` | query `status` de `GET /mermas` | Alta |
| Merma `priority` | `baja`, `normal`, `alta`, `critica` | bodies de mermas | Alta |
| Asignación `status` | `asignada`, `confirmada`, `en_camino`, `completada`, `cancelada`, `no_show` | query `status` de `GET /assignments` | Alta |
| Postulación `status` | `pendiente`, `rechazada` confirmados; `aprobada`, `cancelada` **inferidos** | descripciones de approve/complete + ejemplo Postman | **Media — confirmar** (G-04) |
| Organización `status` | `pendiente`, `verificada`, `aprobada`, `suspendida`, `inactiva` | query de `GET /organizations` | Alta |
| Organización `organization_type` | enum dice `comedor\|hogar`, ejemplo `cocina_comunitaria`; doc-requirements lista `comedor, hogar, cocina_comunitaria, escuela` | drift | Baja (G-07) |
| Grupo nutricional `code` | `cereales`, `frutas_verduras`, `lacteos`, `proteinas`, `aceites` | body de nutritional-groups | Alta |
| Unidad de producto | `kg`, `litros`, `unidades`, `paquetes`, `cajas`, `docenas` | body de unified-products (el enum del PUT solo lista `kg\|litros`: drift) | Media |
| Jornada `status` | `programada` confirmado; resto desconocido (hay acciones confirm/complete/mark-no-show/cancel) | descripciones | Baja |
| Programa `program_type` | `recurrente`, `por_demanda`, `evento`, `recoleccion` | body de programs | Alta |
| Autorización de retiro `scope_type` | `all`, `donor`, `donor_zone`, `branch` | body | Alta |
| `declared_via` / `created_via` | `web`, `whatsapp` | body | Alta |
| Notificación `type` | solo se conoce `merma_nueva` | ejemplo | Baja |

### Máquinas de estado (desde la óptica de la organización)

```
Postulación:  pendiente ──(banco aprueba)──▶ aprobada ─▶ crea Asignación
                  │  └──(banco rechaza / merma se completa con otra)──▶ rechazada
                  └──(org: DELETE /org/applications/{id})──▶ cancelada

Asignación:   asignada ──confirm──▶ confirmada ──start-transit──▶ en_camino ──complete──▶ completada
                 │                     │                              │
                 └──────────── cancel (org o banco) ──────────────────┴──▶ cancelada (merma vuelve a activa)
              (banco) no-show ──▶ no_show   ·   (banco) reschedule / products

Merma:        activa ─▶ asignada ─▶ en_proceso ─▶ completada   | cancelada | vencida | perdida
```

Qué transiciones de asignación se permiten desde cada estado (ej. ¿se puede completar desde `confirmada` sin pasar por `en_camino`?) no está documentado: los botones se mostrarán según el estado y se manejará el `422` del backend con un mensaje claro.

## 7. Reglas de negocio relevantes

1. Las transiciones de estado se hacen solo con endpoints de acción (nunca editar `status`).
2. `POST` con efecto real → `Idempotency-Key` UUID v4, generada una vez por intención y reutilizada en reintentos. `PUT` → recomendada. Aplicamos IK a todos los `POST`/`PUT`/`DELETE` mutantes excepto `auth/login`, `auth/refresh` y `auth/logout` hasta confirmar si las exigen (se verifica en Fase 1 con `check:api`).
3. Rate limit: 60 req/min general, 10 req/min en auth; respetar `Retry-After` en `429`.
4. Completar una asignación: la merma pasa a `completada` aunque haya otras asignaciones; las postulaciones abiertas de esa merma pasan a `rechazada`; se genera inventario en el banco.
5. Cancelar una asignación libera cantidades y **reactiva la merma** (`activa`).
6. Aprobar postulación (banco) no rechaza las demás; se resuelven cuando la merma termina.
7. Deadline `null` = "Sin vencimiento" (hay que mostrarlo así, no como fecha vacía).
8. Para declarar quién retira se puede usar alguien fuera del padrón (`name` + `dni`); la sucursal consulta la lista de pickers "en la puerta".
9. Autorización de retiro con alcance distinto de `all` exige `scope_ref`.
10. La carta compromiso en PDF solo existe si la organización ya la aceptó digitalmente.
11. Multi-tenant: el backend resuelve el tenant por el usuario; ningún endpoint `/org/*` pide `organization_id`.

## 8. Dudas abiertas (resumen; detalle y propuesta en `api-gaps.md`)

1. Forma real de las respuestas de `login`, `me`, `/org/*` (G-01) — **necesito un usuario organización de prueba** para relevarlas.
2. Qué permisos tiene el rol organización fuera de `/org/*` (G-02).
3. Valores reales del `status` de postulaciones (G-04).
4. ¿Cómo sube remito / cantidades recibidas una organización al completar? (G-05).
5. Push nativo (G-06) y clave VAPID pública para Web Push.
6. Cuota nutricional de la organización: dónde se lee (G-08).
7. Jornadas y talleres filtrados por organización (G-09).
8. Recetarios fuente: no hay ninguno en `docs/` (G-10).
9. Brief GoDubi inaccesible.
