# Estado actual del proyecto

**Última actualización:** 2026-10-01 (después del commit 0d00782).

## Funciona con la API real del Banco
| Pantalla | Endpoints | Probado contra la API real |
|---|---|---|
| Login, sesión, logout | `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout` | Pendiente |
| Inicio | `/org/profile`, `/org/stats`, `/org/families/demographics`, `/notifications/unread-count` | Pendiente |
| Familias (lectura) | `/org/families`, `/org/families/{id}`, `/org/families/demographics` | Pendiente |
| Mi organización | `/org/profile`, `PUT /org/address` | Pendiente |
| Nutrición | cuota mensual del perfil + demografía | Pendiente |
| Avisos | `/notifications*` | Pendiente |
| Perfil y clave | `PUT /auth/profile`, `PUT /auth/password` | Pendiente |

Probado en web con datos simulados que tienen la forma real de la API.

## Local (no depende de la API)
- Recetario: 8 recetas **de ejemplo** con escalado y modo cocina. Faltan los recetarios del Banco.
- Asistente: respuestas simuladas hasta tener el endpoint de agentes.
- Ayuda: preguntas frecuentes.

## Hecho pero apagado (el backend no lo ofrece hoy)
Mermas disponibles, pedidos y retiros; alta y edición de familias; contactos y autorizaciones de retiro;
documentación y ficha social; jornadas y talleres; datos nutricionales de productos. Se ven en modo simulado.

## Pendiente
### Frontend
- Correr `npm run smoke:samples` y probar la app con el usuario real.
- Probar en celular (Expo Go) y armar un APK instalable (EAS Build).
- Reducir el tamaño de la versión web (4,6 MB).
- Cargar los recetarios reales.

### Backend (Banco de Alimentos) — ver `docs/api-gaps.md` G-12 y G-13
- Habilitar mermas y retiros para el rol de organización.
- Alta/edición de familias, contactos, documentos, jornadas.
- Push nativo y clave VAPID; recuperar contraseña.
- Corregir los 500 que deberían ser 404/422/429.

### Agentes de IA y WhatsApp
- Construir los agentes (recetas, nutrición, operación) en GoDubi/n8n.
- Endpoint HTTP para la app y contrato de mensajes.
- Número de WhatsApp del chatbot. Brief de GoDubi.
