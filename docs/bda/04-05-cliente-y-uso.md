# Cliente `apiClient.ts` y reglas de uso (4/6 y 5/6) — resumen

El Banco mandó un `apiClient.ts` sin dependencias, probado contra la API real (27 verificaciones). **No lo copiamos tal cual**: `src/services/api/client.ts` ya cubre más (idempotencia por intención del usuario, cache offline con React Query, errores en español, modo mocks). Incorporamos todas sus reglas:

| Regla del cliente del BdA | Dónde está en nuestro código |
|---|---|
| Token en almacenamiento seguro (expo-secure-store), nunca AsyncStorage | `src/services/storage.ts` (web: `storage.web.ts` con localStorage, inevitable en navegador) |
| 401 con token → borrar token y mandar al login | `client.ts` → `onUnauthorized` → `features/auth/store.ts` |
| Autolimitarse a 50 pedidos/min (el servidor corta a 60 y responde 500) | `client.ts` → `throttle()` |
| GET: reintentar hasta 2 veces ante 500/429/red, con espera | `client.ts` (500/429) + React Query (`services/query-client.ts`) |
| Escrituras: no reintentar solas | `mutations.retry: false`; el usuario reintenta con la misma `Idempotency-Key` |
| `Idempotency-Key` en todo POST | `client.ts` + `use-action.ts` |
| Validar la dirección antes de mandarla (si no, 500) | `app/(app)/organizacion.tsx` (zod + coordenadas obligatorias) |
| Rechazar ids no UUID antes de pedirlos (si no, 500) | `endpoints/org.ts` → `family()` |
| Dos formas de paginación | `client.ts` → `toPage()` |
| `refresh()` invalida el token anterior en el acto | `features/auth/store.ts` (rotación a las 12 h; el token dura 24 h) |
| Cambio de clave con `new_password_confirmation` | `endpoints/auth.ts` |

## Push (5/6 §4)
`POST /notifications/subscribe`: `endpoint`, `keys.p256dh`, `keys.auth` obligatorios; `device_type` ∈ `desktop|mobile|tablet`; `browser`, `os`. Registrar dos veces el mismo `endpoint` lo actualiza. Respuesta: HTTP 200 con `"message":"201"` (bug conocido, es éxito). Baja: `POST /notifications/unsubscribe {endpoint}`. Listar: `GET /notifications/subscriptions`.

## Datos
Todo es ficticio y de una sola organización. Sólo se puede modificar: perfil, clave, dirección de la organización y avisos.
