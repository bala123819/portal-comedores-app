# Módulo "Lo recibido" y panel nutricional

Registro de lo que se hizo para el **Pilar 1** del reparto del equipo: que la organización vea todo lo que le llegó del Banco en un período y cuánto cubre eso de lo que necesitan sus familias, por grupo de alimentos. Es el "panel nutricional" de la propuesta de tesis.

- **Fecha:** 2026-10-20 · **Rama:** `recibido-nutricion`
- **Autoría:** Tomás Balardini, con asistencia de IA (Claude Code)
- **Fuente de verdad:** post 11/14 de la guía del Banco en GoDubi (orden #1149), copiado en [`docs/bda/11-recibido-nutricion.md`](../bda/11-recibido-nutricion.md)
- **Decisiones:** D-18, D-19 y D-20 en [`docs/decisiones.md`](../decisiones.md) · **Problemas:** P-20 y P-21 · **Observaciones del backend:** G-19 en [`docs/api-gaps.md`](../api-gaps.md)

---

## 1. Qué puede hacer la organización

| Acción | Endpoint | Dónde está en la app |
|---|---|---|
| Ver todo lo recibido en un período: pedidos entregados y mermas retiradas | `GET /org/received?from=&to=` | Lo recibido |
| Ver el resumen del período: kg, entregas, la última, por origen y por mes | `GET /org/received` (`summary`) | Lo recibido |
| Filtrar por origen (pedidos al Banco / rescates de merma) | `GET /org/received?kind=` | Lo recibido |
| Abrir el pedido de una entrega | `GET /org/distributions/{id}` | Lo recibido → detalle del pedido |
| Ver la cobertura nutricional de un mes, total y por grupo | `GET /org/nutrition?month=AAAA-MM` | Nutrición, Inicio |

## 2. Pantallas

### Lo recibido (`/recibido`)
- Chips de período: último mes, 3 meses (por defecto, como el backend), 6 meses y último año. El período siempre termina hoy.
- Tarjeta de resumen del período **entero** (no sólo de la página): kg totales, cantidad de entregas y la última, kg por origen y barras por mes.
- Filtro por origen, que sólo aparece si en el período hay pedidos y mermas.
- Lista paginada de entregas: número, fecha, kg, origen (`origin.label`), hasta 3 productos con su cantidad, "y N productos más" y el número de remito.
- Tocar un pedido abre `/pedido/[id]`. Una merma abre el retiro sólo si el módulo `mermas` está activo (hoy apagado).
- Botón "Ver el panel nutricional".

### Nutrición › Cobertura nutricional (`/nutricion`)
- Selector de mes con flechas: del mes actual hasta 11 meses atrás.
- **Cobertura total:** "28 % cubierto" con barra y "54,4 kg recibidos de 198 kg que necesitan".
- **Por grupo** (cereales, frutas y verduras, lácteos, proteínas animales, aceites): porcentaje, barra, "X kg de Y kg" y un nivel con ícono y texto (Cubierto / En camino / Falta).
- Notas: kg sin grupo cargado, bultos surtidos y origen (pedidos / mermas).
- Si el Banco no cargó la necesidad por grupo (`needs_available: false`), sólo lo recibido, sin porcentajes, con un aviso.
- Debajo siguen la cuota mensual y las necesidades de las familias, que ya existían.

### Inicio
- Sección **"Alimentación de este mes"**: cobertura total y los dos grupos que más faltan ("Lo que más falta: frutas y verduras (0 %) y aceites (0 %)"). Lleva al panel.

### Accesos
- Mercadería: "Ver todo lo recibido".
- Más › Alimentación: "Lo recibido".
- Nutrición: "Ver todo lo recibido".

## 3. Archivos

| Capa | Archivos |
|---|---|
| Tipos | `src/features/recibido/types.ts` (formas reales del post 11) |
| API | `src/services/api/endpoints/org.ts` (`orgApi.received`, `orgApi.nutrition`) |
| Datos | `src/features/recibido/hooks.ts` (`useReceived`, `useOrgNutrition`), `src/features/query-keys.ts` |
| Períodos | `src/features/recibido/period.ts` (chips de período, meses) |
| Componentes | `src/components/recibido/ReceivedCard.tsx`, `ReceivedSummaryCard.tsx`, `src/components/nutricion/CoverageBars.tsx`, `MonthNavigator.tsx` |
| Pantallas | `src/app/(app)/recibido.tsx`, `src/app/(app)/nutricion.tsx`, Inicio, Mercadería y Más |
| Módulo | `src/lib/features.ts` (`recibido`), ruta protegida en `src/app/(app)/_layout.tsx` |
| Textos | `src/lib/labels.ts` (`coverageGroupLabels`, `receivedKindLabels`, `receivedOriginLabels`) |
| Mocks | `src/mocks/handler.ts` (`/org/received` y `/org/nutrition`, armados con los pedidos entregados y los retiros completados del mock), `src/mocks/data.ts` (dos entregas de meses anteriores) |

## 4. Reglas del backend que respeta la app
- El período es de hasta un año y "hasta" no puede ser anterior a "desde" (422): con los chips nunca se arma un período inválido.
- La paginación de `/org/received` viene en `meta`, fuera de `data`, y `data` trae `{ summary, items }` (P-20).
- El `summary` es del período entero: se toma de la primera página.
- `coverage_pct` puede venir `null` (sin necesidad cargada): se muestra sólo lo recibido.
- Para este rol se usa `/org/nutrition`, no `/nutrition/summary`.

## 5. Verificación
- `npx tsc --noEmit` y `npx expo lint`: sin errores ni advertencias.
- Web en modo simulado (`EXPO_PUBLIC_USE_MOCKS=true`, `EXPO_PUBLIC_MODULES_SCOPE=real`, es decir, sólo los módulos que existen hoy en el backend), con Chrome headless por CDP en 390 × 844. Pasaron las 22 verificaciones:
  - Inicio: "Alimentación de este mes", porcentaje y "Lo que más falta".
  - Lo recibido: resumen, pedidos y mermas, "Por mes", filtro de período (el pedido de hace 66 días no aparece en "Último mes" y sí en "Último año"), filtro "Rescates de merma" y vuelta a "Todo", y apertura del detalle del pedido.
  - Nutrición: grupos con nombre y nivel, mes anterior, sigue la cuota mensual, ya no aparece la sección vieja ("Lo que recibieron").
  - Accesos desde Mercadería, Más y Nutrición.
  - Cero errores de consola.
- **Contra la API real (2026-10-20):**
  - `npm run smoke` (25 PASS) suma `/org/received`, su 422 por período inválido y `/org/nutrition`: responden con la forma que espera la app.
  - Con la app en modo real y la sesión del usuario de prueba, Nutrición mostró los valores del servidor (cuota de 234 kg, 7 personas, 21 % cubierto).
  - En Lo recibido, "Último año" pidió en vivo `/org/received?from=2025-10-21&to=2026-10-20` y mostró las 3 entregas del tenant de pruebas.
  - El servidor agrega `summary.reconciliation_pending`, que el post no documenta (G-19).

## 6. Pendientes
- Respuesta del Banco sobre `reconciliation_pending` (G-19).
- Validar los umbrales de cobertura (100 % y 50 %) con el área social (G-19).
- Preguntas al Banco en G-19: nombres de grupos sin tildes, kg sin grupo, "PDF de las donaciones".
- Probar las pantallas en un celular.
