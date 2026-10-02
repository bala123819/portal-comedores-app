# Mensaje al Banco de Alimentos — 2026-10-01
n> **Reemplazado** por [2026-10-02-pedido-integral-al-banco.md](2026-10-02-pedido-integral-al-banco.md) (no se envió).

**Canal:** hilo de la guía de la API de organizaciones. **Estado:** borrador (enviar desde la cuenta del equipo).
**Antes de enviar:** completar la línea del resultado del smoke test.

---

Hola, ¿cómo están? Gracias por la guía de la API, nos ordenó mucho el trabajo.

**Cómo venimos**
- Conectamos la app a la API con el usuario de prueba y acoplamos todo a lo que hoy está habilitado: login y sesión, perfil y clave, perfil y estadísticas de la organización, dirección, familias (lectura) y avisos.
- Respetamos las reglas de la guía: menos de 60 pedidos por minuto, `Idempotency-Key` en los POST, validación de la dirección antes de enviarla, ids UUID, las dos formas de paginación.
- Corrimos `smoke-test` → **[pegar acá la línea "RESULTADO: … PASS, … FAIL"]**.
- Las respuestas reales coinciden con los ejemplos de la guía.

**Lo que necesitaríamos, en orden de prioridad**

1. **Mermas y retiros para el rol de organización.** Es el corazón de la app (ver alimentos disponibles, postularse, confirmar, avisar quién retira y registrar el retiro). Las pantallas ya están hechas y apagadas. ¿Se puede habilitar y probar `/org/mermas/available`, `/org/applications`, `/org/assignments` (y sus acciones) y `/assignments/{id}/pickers` / `eligible-contacts` con el usuario de prueba, con alguna merma ficticia en el tenant de pruebas? ¿Tienen una fecha estimada?
2. **Recetarios del Banco** (en el formato que tengan: Excel, Word, PDF). La app tiene un recetario con escalado según cantidad de personas, hoy con recetas de ejemplo.
3. **Agentes de IA y WhatsApp:**
   - El **brief de integración GoDubi ↔ Mermab** (el link de GitLab nos da 403).
   Preparamos un contrato de cómo les habla la app (lo adjuntamos: `docs/agentes-contrato.md`).
   - Un **número de WhatsApp** para el chatbot.
4. **Avisos en el celular:** `/notifications/subscribe` sólo acepta Web Push. ¿Se podría aceptar un token de Expo/FCM para la app nativa? Y para Web Push, ¿nos pueden pasar la **clave pública VAPID**?
5. **CORS para publicar la PWA:** cuando tengamos dominio, ¿pueden sumarlo a los orígenes permitidos?
6. **A futuro** (menos urgente): alta y edición de familias desde la app, contactos y autorizaciones de retiro, documentos y ficha social, jornadas, editar teléfono y mail de la organización, recuperar contraseña.


Cualquier cosa que no se pueda, nos avisan y lo dejamos documentado como trabajo futuro. ¡Gracias!
