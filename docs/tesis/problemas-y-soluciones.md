# Problemas encontrados y soluciones

Registro técnico de los problemas que aparecieron durante el desarrollo: síntoma, causa y solución.
Numeración `P-xx`, referenciada desde la [bitácora](bitacora.md).

| # | Problema | Commit |
|---|---|---|
| P-01 | Tipos generados mezclaban operaciones distintas | e14c185 |
| P-02 | Rutas tipadas de Expo inválidas | e14c185 |
| P-03 | Error de modo oscuro de NativeWind en web | e14c185 |
| P-04 | Botones anidados (HTML inválido) | e14c185 |
| P-05 | Diálogos que no se cerraban en web | e14c185 |
| P-06 | Estado viejo restaurado de la cache | e14c185 |
| P-07 | Advertencia de `useNativeDriver` en web | e14c185 |
| P-08 | Reglas del React Compiler | e14c185 |
| P-09 | Escalado de recetas poco práctico | e14c185 |
| P-10 | Colisión de rutas `/familias` | 0d00782 |
| P-11 | Pestañas ocultas accesibles por URL | 0d00782 |
| P-12 | Reintentos que se multiplicaban | 0d00782 |
| P-13 | Credenciales mal escritas en `.env` | 0d00782 |

---

### P-01 · Tipos generados mezclaban operaciones distintas
- **Síntoma:** el tipo del body de `POST /org/assignments/{id}/complete` (organización) exigía `products`, que es un campo del endpoint del panel del Banco.
- **Causa:** el OpenAPI tiene 12 `operationId` duplicados (p. ej. `completarAsignacin` en el endpoint de organización y en el del Banco); `openapi-typescript` fusiona las operaciones que comparten id.
- **Solución:** `scripts/gen-api.mjs` normaliza el spec antes de generar (renombra los duplicados con un sufijo derivado de la ruta). `npm run gen:api` usa ese script. Registrado como drift en `docs/api-gaps.md` (G-07).

### P-02 · Rutas tipadas de Expo inválidas
- **Síntoma:** el typecheck rechazaba rutas válidas (`/retiro/[id]`) y aceptaba "rutas" como `/../theme/tokens`.
- **Causa:** el generador de *typed routes* de Expo incluía archivos que no son pantallas en este entorno.
- **Solución:** `experiments.typedRoutes: false` (D-07). La navegación sigue funcionando; se pierde el autocompletado de rutas.

### P-03 · Error de modo oscuro de NativeWind en web
- **Síntoma:** `Cannot manually set color scheme, as dark mode is type 'media'` en la consola y pantalla en blanco.
- **Causa:** NativeWind 4 en web con `darkMode: 'media'` (por defecto) choca con el manejo de esquema de color de Expo.
- **Solución:** `darkMode: 'class'` en `tailwind.config.js`. La app es sólo modo claro (`userInterfaceStyle: light`).

### P-04 · Botones anidados (HTML inválido)
- **Síntoma:** advertencia de React en web: `<button>` no puede contener otro `<button>` (notificaciones con botón de borrar dentro; interruptor dentro de una fila presionable).
- **Causa:** en web, `Pressable` se renderiza como `<button>`.
- **Solución:** la fila de notificación pasó a ser un contenedor con dos zonas presionables hermanas; `SwitchRow` dejó de ser presionable entero (el texto alterna el valor).

### P-05 · Diálogos que no se cerraban en web
- **Síntoma:** después de confirmar "Salimos para allá", el diálogo seguía visible aunque la acción había terminado.
- **Causa:** el `Modal` de react-native-web espera el evento de fin de animación para desmontarse; si la página no está pintando (pestaña en segundo plano) nunca llega.
- **Solución:** `animationType="none"` en web para `Dialog` y `BottomSheet`.

### P-06 · Estado viejo restaurado de la cache
- **Síntoma:** al reabrir el detalle de un retiro se mostraba un estado anterior.
- **Causa:** la cache persistida se consideraba "fresca" (staleTime de 60 s) y no se revalidaba.
- **Solución:** `staleTime: 0` en los detalles con máquina de estados (asignación, postulación): se muestra lo cacheado al instante y se revalida en segundo plano.

### P-07 · Advertencia de `useNativeDriver` en web
- **Solución:** el skeleton usa el driver nativo sólo fuera de web.

### P-08 · Reglas del React Compiler (lint)
- **Síntoma:** errores de lint "Cannot access refs during render" (skeleton) e "incompatible library" (`watch()` de react-hook-form).
- **Solución:** `useState` en lugar de `useRef(...).current`; `useWatch` en lugar de `watch()`.

### P-09 · Escalado de recetas poco práctico
- **Síntoma:** para 85 personas la receta pedía "25 ½ cucharadas" de aceite.
- **Solución:** cucharadas y tazas pasan a ml/litros desde ~120 ml (`src/lib/recipe-scale.ts`).

### P-10 · Colisión de rutas `/familias`
- **Síntoma:** abrir `/familias` llevaba al resumen y abrir el detalle de una familia volvía a la lista.
- **Causa:** la pestaña `(tabs)/familias.tsx` y la carpeta `familias/` del stack resolvían la misma URL.
- **Solución:** las rutas del stack pasaron a singular: `/familia/[id]`, `/familia/resumen`, `/familia/nueva`.

### P-11 · Pestañas ocultas accesibles por URL
- **Síntoma:** con el módulo de mermas apagado, `/disponibles` seguía abriéndose escribiendo la URL.
- **Causa:** `href: null` oculta la pestaña pero no deshabilita la ruta.
- **Solución:** `Redirect` al inicio dentro de las pantallas de mermas cuando el módulo está apagado; el resto de las pantallas de módulos apagados se protegen con `Stack.Protected`.

### P-12 · Reintentos que se multiplicaban
- **Riesgo:** el cliente HTTP reintentaba los GET y React Query volvía a reintentar encima, lo que podía generar ráfagas contra el límite de 60 pedidos/min (que el servidor responde con 500).
- **Solución:** el cliente reintenta (500/429/red) y React Query sólo agrega un reintento más ante corte de red; autolímite de 50 pedidos/min en el cliente.

### P-13 · Credenciales mal escritas en `.env`
- **Síntoma:** el smoke test respondía "Las credenciales proporcionadas son incorrectas".
- **Causa:** la clave se había escrito entre `< >`, copiando el formato de los ejemplos (`<CLAVE>`).
- **Solución:** escribir la clave sin signos. Se diagnosticó sin mostrar la clave (sólo largo y caracteres especiales).
