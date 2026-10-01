# Documentación del Banco de Alimentos (BdA) — API de la app de organizaciones

Material que mandó el equipo del Banco (6 posts, probados contra el servidor el 29/09/2026).
**Es la fuente de verdad** para la app: si contradice el OpenAPI o `docs/00-inventario.md`, gana esto.

| Archivo | Contenido |
|---|---|
| [01-guia.md](01-guia.md) | Conexión, usuario de prueba, qué funciona, trampas del backend, errores, qué no existe |
| [02-sesion-perfil-organizacion.md](02-sesion-perfil-organizacion.md) | Ejemplos reales: login, me, perfil, clave, refresh/logout, org profile/stats/address |
| [03-familias-avisos.md](03-familias-avisos.md) | Ejemplos reales: familias, demografía, avisos |
| [04-05-cliente-y-uso.md](04-05-cliente-y-uso.md) | Resumen del `apiClient.ts` que mandaron y reglas de uso (no se copió: se incorporaron sus reglas a `src/services/api/client.ts`) |
| [06-como-probar.md](06-como-probar.md) | smoke test, Postman, Scribe; el script está en `scripts/smoke-test.sh` |

La clave del usuario de prueba **no** está en el repo: va en `.env` (`CHECK_API_PASSWORD`), que git ignora.
