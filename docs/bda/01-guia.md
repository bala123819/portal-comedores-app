# API de la app de organizaciones: guía para empezar (1/6)

## 1. Conexión y usuario de prueba
- **URL base:** `https://cloud.mermab.com/api`
- **Es producción real.** No hay staging. El usuario vive en el tenant de pruebas *Banco de Alimentos Patagonia (TEST)*, dentro de la misma base que los bancos reales. Usar **sólo** este usuario.
- **Usuario:** `coordinadora.tesis.api@org.test` · **Clave:** por canal privado (en este repo va en `.env`, nunca versionada).
- **Organización:** *Comedor Prueba Tesis API* (ficticia), 3 familias y 6 personas ficticias.
- Con este usuario **sólo se puede modificar**: perfil, clave, dirección de la organización y avisos. Todo lo demás es lectura.

## 3. Qué funciona hoy (probado en vivo)
| Pantalla | Endpoints |
|---|---|
| Login y sesión | `POST /auth/login`, `GET /auth/me`, `GET /capabilities`, `POST /auth/refresh`, `POST /auth/logout` |
| Perfil del usuario | `PUT /auth/profile`, `PUT /auth/password` |
| Inicio y perfil de la organización | `GET /org/profile`, `GET /org/stats`, `PUT /org/address` |
| Familias (sólo lectura) | `GET /org/families`, `GET /org/families/{id}`, `GET /org/families/demographics` |
| Avisos | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `DELETE /notifications/{id}`, `DELETE /notifications`, `POST /notifications/test` |

## 4. Trampas conocidas del backend
1. `PUT /org/address` con un dato inválido responde **500** (no 422). Validar antes: obligatorios `street`, `city`, `state`, `latitude` (−90..90), `longitude` (−180..180).
2. Un `{id}` que no es UUID da **500** (no 404). Usar ids que salgan de la lista.
3. Límite **60 pedidos/min** por usuario (login 10/min). Al pasarse responde **500 en vez de 429**. No hacer ráfagas.
4. `POST /notifications/subscribe` devuelve HTTP 200 con `"message": "201"`: es éxito.
5. Paginación en dos formas: familias `{data:[...], meta}`; avisos `{data:{data:[...], meta}}`.
6. `GET /org/stats`: sólo `impacto` sirve; los otros bloques cuentan mermas y vienen en cero.
7. Cambiar la clave no cierra las sesiones abiertas.
8. Los mails no salen del servidor: no diseñar pantallas que dependan de recibir un correo.
9. Push: `/notifications/subscribe` pide `keys.p256dh` y `keys.auth` (Web Push). Push nativo (FCM/APNs/Expo) requiere ajuste del backend. No probado con dispositivo real.
10. CORS: en web sólo `localhost:3000` y `localhost:3001`.

## 5. Errores
| HTTP | Cuándo | Qué hacer |
|---|---|---|
| 401 `No autenticado` | Token ausente, vencido o revocado | Borrar el token y volver al login |
| 403 `No tenés permiso para realizar esta acción` | Ruta del banco | Bug de la app: no debería llamarla |
| 404 `Ruta no encontrada` | Id inexistente o de otra organización | Mostrar "no encontrado" |
| 422 `{message, errors:{campo:[...]}}` | Validación | Mostrar `errors[campo][0]` junto al campo |
| 500 `Error interno del servidor` | Bugs conocidos (dirección inválida, id no UUID, límite superado) | GET: esperar 2–4 s y reintentar. Escritura: no reintentar sin `Idempotency-Key` |

## 6. Todavía no existe
Registro de usuarios, recuperar contraseña, Pedidos (`/org/distributions`), documentos, contactos, ficha logística y social, alta y edición de familias, editar teléfono/mail de la organización. **Postular a mermas y retirar existe en el servidor pero no se probó y quedó fuera del alcance.** Todo eso es backend nuevo.

## 7. Cómo reportar
Comentar en el hilo el request y la respuesta **sin el token**.
