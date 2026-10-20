# Estado actual del proyecto

**Última actualización:** 2026-10-20 (lo recibido y panel nutricional). Antes: 2026-10-14 (comunicación con el Banco), 2026-10-01. Conexión con la API real verificada con `npm run smoke:samples` (formas de respuesta coinciden con la app).

## Funciona con la API real del Banco
| Pantalla | Endpoints | Probado contra la API real |
|---|---|---|
| Login, sesión, logout | `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout` | Pendiente |
| Inicio | `/org/profile`, `/org/stats`, `/org/families/demographics`, `/notifications/unread-count` | Pendiente |
| Familias (lectura) | `/org/families`, `/org/families/{id}`, `/org/families/demographics` | Pendiente |
| Familias: alta, edición, baja y miembros (desde 2026-10-14) | `/org/families*`, `/org/family-types`, `form-config`, búsqueda por DNI | Pendiente (`npm run smoke -- --familias`) |
| Mi organización | `/org/profile`, `PUT /org/address` | Pendiente |
| Nutrición: cobertura del mes por grupo de alimentos (desde 2026-10-20), cuota mensual y demografía | `/org/nutrition?month=`, `/org/profile`, `/org/families/demographics` | Cobertura verificada con la API real el 2026-10-20 (`npm run smoke` y la app con el usuario de prueba, D-18) |
| Lo recibido: pedidos entregados y mermas retiradas por período, con resumen por origen y por mes (desde 2026-10-20) | `/org/received` | Verificado con la API real el 2026-10-20 (`npm run smoke` y la app con el usuario de prueba, D-18) |
| Avisos | `/notifications*` | Pendiente |
| Perfil y clave | `PUT /auth/profile`, `PUT /auth/password` | Pendiente |
| Comunicación con el Banco (sucesos, solicitudes, consultas, reclamos) | `/org/interactions`, `/org/interactions/{id}`, `/org/interactions/summary`, `POST /org/interactions` | Pendiente (sin credenciales en `.env`, P-17); probado en web en modo simulado |
| Contactos de la organización (alta, edición, baja, principal, autorizaciones del Banco, pedir autorización) | `/org/contacts` | Verificado con la API real el 2026-10-20 (D-16) |

Probado en web con datos simulados que tienen la forma real de la API.

## Local (no depende de la API)
- Recetario: 8 recetas **de ejemplo** con escalado y modo cocina. Faltan los recetarios del Banco.
- Asistente: respuestas simuladas hasta tener el endpoint de agentes.
- Ayuda: preguntas frecuentes.

## Hecho pero apagado (el backend no lo ofrece hoy)
Mermas disponibles, pedidos y retiros;
documentación y ficha social; jornadas y talleres; datos nutricionales de productos. Se ven en modo simulado.

## Pendiente
### Frontend
- Correr `npm run smoke:samples` y probar la app con el usuario real.
- Probar en celular (Expo Go) y armar un APK instalable (EAS Build).
- Reducir el tamaño de la versión web (4,6 MB).
- Cargar los recetarios reales.

### Backend (Banco de Alimentos) — ver `docs/api-gaps.md` G-12 y G-13
- Habilitar mermas y retiros para el rol de organización.
- Documentos, jornadas (la escritura de familias se habilitó el 2026-10-07; los contactos, el 2026-10-20).
- Push nativo y clave VAPID; recuperar contraseña.
- Corregir los 500 que deberían ser 404/422/429.

### Agentes de IA y WhatsApp
- Construir los agentes (recetas, nutrición, operación) en GoDubi/n8n.
- Endpoint HTTP para la app (contrato propuesto en `docs/agentes-contrato.md`, v1).
- Número de WhatsApp del chatbot. Brief de GoDubi.
