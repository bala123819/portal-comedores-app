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
| [03-perfil-organizacion.md](03-perfil-organizacion.md) | Perfil de la organización: perfil editable, dirección, estadísticas, ficha social, logística, documentos y requisitos. Copia del post 3/14 de la serie "API organizaciones" (GoDubi, 07/10/2026) |
| [08-interacciones.md](08-interacciones.md) | Interacciones con el banco (suceso, solicitud, consulta, reclamo). Copia del post 8/14 de la serie "API organizaciones" publicada en GoDubi el 07/10/2026 |
| [09-10-pedidos-mercaderia.md](09-10-pedidos-mercaderia.md) | Serie nueva (2026-10-07, posts 9 y 10 de 14): catálogo, cupo, pedidos de mercadería, cancelar y remito |

> Desde el 07/10/2026 el Banco publica la documentación en el feed de la orden de GoDubi (serie
> "API organizaciones (1/14) … (14/14)"), que pasa a ser la fuente de verdad vigente. Cada módulo que se
> implementa copia acá el post correspondiente, con el número de la serie.

La clave del usuario de prueba **no** está en el repo: va en `.env` (`CHECK_API_PASSWORD`), que git ignora.
