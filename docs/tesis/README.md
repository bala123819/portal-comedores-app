# Documentación del desarrollo (para la tesis)

Esta carpeta registra **todo** lo que se hace en el frontend del Portal Comedores, commit por commit,
para usarlo como material de la documentación final de la tesis (Banco de Alimentos · entrega noviembre 2026).

| Documento | Qué contiene | Cuándo se actualiza |
|---|---|---|
| [bitacora.md](bitacora.md) | Una entrada por commit: objetivo, qué se hizo, decisiones, problemas, verificación y pendientes. Incluye hitos sin commit (reuniones, material recibido). | **En cada commit** |
| [arquitectura.md](arquitectura.md) | Stack, capas, flujos (sesión, datos, idempotencia, offline, módulos, agentes) y su justificación. | Cuando cambia la arquitectura |
| [problemas-y-soluciones.md](problemas-y-soluciones.md) | Registro técnico de problemas encontrados, causa y solución. | Cuando aparece/se resuelve un problema |
| [estado-actual.md](estado-actual.md) | Foto del estado del proyecto: qué funciona, qué está apagado, qué falta (front, back, agentes). | Al cerrar cada etapa |

Documentos relacionados (fuera de esta carpeta):
- `docs/00-inventario.md` — relevamiento inicial de la API (Fase 0).
- `docs/bda/` — guía de la API que mandó el Banco (fuente de verdad del backend).
- `docs/api-gaps.md` — faltantes y bugs del backend, y qué pedirle al Banco.
- `docs/decisiones.md` — decisiones técnicas numeradas (D-01, D-02…).
- `docs/mapa-pantallas.md` — propuesta original de navegación.

## Cómo se mantiene (proceso)

1. Se hace el cambio y se commitea con Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
2. **En el mismo commit** (o en el inmediato siguiente) se agrega la entrada en `bitacora.md` usando la plantilla de abajo.
3. `npm run bitacora` lista los commits que todavía no tienen entrada; `npm run bitacora -- --write`
   agrega al final un esqueleto con hash, fecha, autoría y archivos tocados, para completar a mano.
4. Si el cambio introduce una decisión, se numera en `docs/decisiones.md` y se referencia desde la entrada.
5. Si hubo un problema técnico relevante, se registra en `problemas-y-soluciones.md` (P-xx) y se referencia.

> Los commits que documentan la bitácora del propio commit anterior se registran agrupados en la
> entrada del commit que documentan (no generan una entrada nueva).

## Plantilla de entrada

```markdown
## <hash> · <título del commit>
- **Fecha:** AAAA-MM-DD HH:MM · **Autoría:** <autor> (+ asistencia de IA si corresponde)
- **Etapa:** <Fase 0 / Base / Acople a la API real / …>

**Objetivo.** Por qué se hizo este cambio.

**Qué se hizo.**
- …

**Decisiones.** D-xx (ver docs/decisiones.md) …

**Problemas y soluciones.** P-xx …

**Verificación.** Typecheck, lint, pruebas manuales (en qué plataforma y modo: mocks / API real).

**Pendientes.** Lo que quedó para después.

**Archivos principales.** …
```
