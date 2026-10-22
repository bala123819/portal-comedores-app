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

### P-14 · La documentación de la API decía que `null` no borra un dato, y sí lo borra
- **Síntoma:** la pantalla "Editar familia" avisaba que vaciar un campo no lo cambiaba, siguiendo el post 5 de la API organizaciones ("un `null` en un campo que no tocaron se toma como no enviado").
- **Causa:** al probar contra el servidor, `PUT /org/families/{id}` con `phone: null` (o `""`) borró el teléfono.
- **Solución:** se quitó el aviso y los mocks se comportan como el servidor. Antes de mostrar una regla del backend en la interfaz, se verifica contra el servidor con el usuario de prueba. Registrado en `docs/api-gaps.md` G-15 para avisar al Banco.

### P-15 · Endpoints de interacciones fuera del OpenAPI
- **Síntoma:** `BodyOf<'/api/org/interactions', 'post'>` no existe: el spec del repo sólo tiene `/organizations/{id}/interactions` (otro rol).
- **Causa:** desde el 07/10/2026 la documentación vigente es la serie publicada por el Banco en GoDubi, más nueva que el OpenAPI.
- **Solución:** tipos a mano a partir de las respuestas reales del post 8/14, copiado en `docs/bda/08-interacciones.md` para que quede la fuente en el repo.

### P-16 · `watch()` de react-hook-form y el React Compiler
- **Síntoma:** `expo lint` avisaba "Compilation Skipped: Use of incompatible library" en el formulario de mensajes al Banco.
- **Causa:** `watch()` devuelve valores que el React Compiler no puede memoizar sin riesgo de UI vieja.
- **Solución:** `useWatch({ control, name })`, que sí es compatible.

### P-17 · Sin credenciales para probar contra la API real
- **Síntoma:** el login de prueba respondió 422: `CHECK_API_EMAIL` y `CHECK_API_PASSWORD` están vacías en el `.env` de esta máquina.
- **Solución (parcial):** se desarrolló contra las respuestas reales documentadas por el Banco y se agregaron mocks con la misma forma; se probó en web con Chrome headless (por CDP, sin instalar nada) en modo simulado. Queda pendiente repetir la prueba con el usuario real.

### P-18 · El 422 del servidor no se veía en el formulario de contactos
- **Síntoma:** al dar de alta un contacto con DNI repetido, el servidor respondía 422 en `dni` pero el campo no mostraba el error (sí se veían los errores de validación local).
- **Causa:** `setError` de react-hook-form muta el mismo objeto `formState.errors`; el formulario pasaba `errors` por props a `ContactFields` y el React Compiler memoizaba el componente porque la referencia no cambiaba.
- **Solución:** cada campo lee su error de `fieldState` del `Controller` (como `MemberFields`), que sí se suscribe a los cambios. Detectado con la prueba en el navegador.
- **Lección extra:** `expo start` con `CI=1` no recarga los cambios: las pruebas en el navegador tienen que correr sobre un servidor sin `CI`.

### P-19 · "Mi organización" se caía con la API real (`n.toFixed is not a function`)
- **Síntoma:** al abrir Más › Datos de la organización con el usuario real, la pantalla mostraba "Uncaught Error: n.toFixed is not a function" (en modo simulado andaba).
- **Causa:** `/org/profile` manda `vehicle_capacity_kg` como string (`"300.00"`) y `formatNumber` esperaba un número. Venía desde el acople a la API real (0d00782); los mocks lo mandaban como número.
- **Solución:** `formatNumber` acepta `number | string` y convierte (como `toCoord` con las coordenadas). Detectado al entrar a Contactos con la API real.

### P-20 · `/org/received` no tiene la forma de las otras listas
- **Síntoma:** `api.getPage` (y `toPage`) esperan `data` como lista, o `data.data` + `data.meta`. `/org/received` devuelve `data: { summary, items }` con la paginación en `meta`, **afuera** de `data`: con `getPage` la lista quedaba vacía.
- **Solución:** `orgApi.received` usa `request` directo (como el alta de pedidos, que trae `warnings` fuera de `data`) y devuelve `{ summary, items, meta }`. Es compatible con `InfiniteList`. El resumen se toma de la primera página, porque es del período entero.

### P-21 · El panel del navegador de la app de escritorio no recibía clics
- **Síntoma:** en la prueba manual, el login simulado no avanzaba: los clics y el texto no llegaban a los campos, y las capturas fallaban porque la página "no terminaba de dibujarse" (la ventana estaba tapada).
- **Solución:** se probó con Chrome headless manejado por CDP desde un script de Node, sin instalar nada (como en P-17), con un viewport de celular (390 × 844): 22 verificaciones automáticas y capturas de pantalla.
