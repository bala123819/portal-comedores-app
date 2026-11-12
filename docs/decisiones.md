# Decisiones

Registro de decisiones menores (las de arquitectura/UX se consultan antes).

### D-01 · Código fuente bajo `src/` (2026-09-25)
El prompt pide `app/`, `components/`, `features/`… en la raíz; el proyecto (y `AGENTS.md`) usa Expo Router con rutas en `src/app/`. Se mantiene `src/` y toda la estructura del prompt va adentro: `src/app`, `src/components`, `src/features`, `src/services`, `src/lib`, `src/theme`, `src/data`, `src/mocks`. Alias `@/` → `src/`. `scripts/` y `docs/` quedan en la raíz.

### D-02 · Expo SDK 57
Es la versión instalada en el repo (última estable al momento). No se actualiza. La doc de referencia es `https://docs.expo.dev/versions/v57.0.0/`.

### D-03 · Tipos: generados para requests, escritos a mano para respuestas
Por G-01, `openapi-typescript` genera `schema.d.ts` (paths, params, bodies), pero las respuestas no tienen schema. Se usa un cliente propio tipado (`fetch` + unwrap del envoltorio) en lugar de `openapi-fetch`, porque `openapi-fetch` infiere respuestas del spec y acá serían `never`/`unknown`. Los tipos de respuesta viven por módulo con zod para validar en runtime.

### D-04 · Web en desarrollo en el puerto 3000
El CORS de la API admite `http://localhost:3000` pero no `:8081`. El script `web` pasa a `expo start --web --port 3000`.

### D-05 · `web.output`
El prompt pide `"single"`; el repo tiene `"static"`. Se cambia a `"single"` en Fase 1 (SPA para PWA; la app es 100 % autenticada, no gana nada con SSG).

### D-06 · Idempotency-Key también en DELETE y POST "de marcado"
Por simplicidad y seguridad, el cliente agrega IK a todo método mutante (`POST`, `PUT`, `PATCH`, `DELETE`), salvo `auth/login|logout|refresh` (a verificar en Fase 1). La key vive en el estado de la mutación y se reusa en reintentos.

### D-07 · Typed routes desactivadas
El generador de rutas tipadas de Expo producía rutas inválidas en este proyecto (incluía archivos que no son pantallas). `experiments.typedRoutes: false` en `app.json`.

### D-08 · Acoplarse al backend real del Banco (2026-09-30)
El Banco mandó la guía de la API de organizaciones (`docs/bda/`). Pasa a ser la fuente de verdad. Decisiones:
- **Interruptores por módulo** (`src/lib/features.ts`): con la API real sólo se activan login/sesión, perfil y clave, organización (perfil, impacto, dirección), familias (lectura) y avisos. Mermas/retiros, alta de familias, contactos, documentación, jornadas/talleres y endpoints de nutrición quedan **apagados** (no se llaman: un 403 "es un bug de la app"). Sus pantallas siguen en el código, protegidas con `Stack.Protected` / `Redirect`, y se ven en modo mocks como prototipo.
- **Pestañas con la API real**: Inicio · Familias · Recetas · Más. Con mermas activas: Inicio · Disponibles · Mis retiros · Recetas · Más (Familias pasa a "Más").
- **No se copió el `apiClient.ts` del Banco**: se incorporaron sus reglas al cliente propio (ver `docs/bda/04-05-cliente-y-uso.md`).
- **Mocks con las formas reales** (incluidos los bugs conocidos: 500 por id no UUID o dirección inválida, 422 en inglés de `source`, `"message":"201"` del subscribe). `EXPO_PUBLIC_MODULES_SCOPE=real` hace que los mocks muestren sólo lo que existe hoy.
- **Rutas de familia en singular** (`/familia/[id]`, `/familia/resumen`, `/familia/nueva`) para no chocar con la pestaña `/familias`.
- **Token**: dura 24 h; se rota al abrir la app si tiene más de 12 h.
- **Reintentos**: el cliente reintenta los GET (500/429/red) y React Query sólo agrega uno más ante corte de red, para no hacer ráfagas contra el límite de 60/min.

### D-09 · Smoke test en TypeScript
`scripts/smoke-test.sh` (del Banco) necesita `jq` y `uuidgen`, que no vienen en Windows. `npm run smoke` hace lo mismo sin dependencias. Reemplaza al `check:api` anterior.

### D-10 · Autenticación de los agentes en dos fases (2026-10-01)
Fase 1 (recetas y nutrición general): la app no manda el token del usuario, sólo ids de contexto; esos agentes no devuelven datos privados. Fase 2 (datos de la organización): el agente no puede confiar en el `organizationId` del body; se recomienda reenviar el token Bearer del usuario para que el agente consulte la API como ese usuario. Se decide con el equipo de agentes antes de habilitar la fase 2. Contrato en `docs/agentes-contrato.md`.

### D-11 · Diseño del agente de Nutrición y Cocina (2026-10-05)
Un solo worker en GoDubi para recetas y nutrición. **Sin entrenar un modelo:** modelo general + persona (system prompt con reglas de seguridad alimentaria) + knowledge base (recetario, pautas, Guías Alimentarias para la Población Argentina, y los materiales del Banco cuando lleguen) + contexto de la organización en cada consulta. La demografía (edades y condiciones, sólo cantidades) la manda la app desde la sesión del usuario: el agente no accede a la API del Banco. El agente responde JSON con recetas del recetario (`recetaId`) o sugeridas (base 10 porciones); la app escala las cantidades. Permisos mínimos (`read_order_context`, `read_files`, `knowledge_search`). Guía: `docs/agentes/nutricion/`.

### D-12 · Familias sobre `/org/families*` y un módulo por persona (2026-10-14)
El Banco habilitó el 7/10 el alta, la edición y la baja de familias y miembros en el portal de la organización (`/org/families*`, posts 5–7 de la serie "API organizaciones" en GoDubi). La app deja de usar `/organizations/{id}/families` y `/family-types` y pasa a `/org/families*` y `/org/family-types`: la organización la resuelve el backend por el usuario, igual que el resto del portal. El formulario se arma con `GET /org/families/form-config` (qué campos se muestran, cuáles son obligatorios y las opciones de cada lista); las etiquetas siguen en `labels.ts`. Para trabajar en paralelo sin conflictos (Familias, Pedidos e Interacciones, una persona cada uno), cada módulo tiene su propio archivo de endpoints (`src/services/api/endpoints/familias.ts`) y sus query keys locales, sin tocar archivos compartidos. El módulo sigue detrás del interruptor `familiasAlta` hasta verificarlo contra el servidor con el smoke test.

### D-13 · Comunicación con el Banco (interacciones) (2026-10-14)
Se implementa el canal de la organización con el Banco según el post 8/14 publicado en GoDubi (`docs/bda/08-interacciones.md`), que el Banco ordenó como paso 4 del orden sugerido.
- **Sin interruptor de módulo:** el Banco lo documentó con respuestas reales del servidor, así que se usa siempre (como avisos y familias). Si un 403 mostrara lo contrario, se agrega `interacciones` a `src/lib/features.ts`.
- **Tipos escritos a mano** (`src/features/interacciones/types.ts`): `/org/interactions` no está en el OpenAPI del repo.
- **Rutas** `/banco` (lista), `/banco/nueva` (alta, acepta `?tipo=` para llegar con el tipo elegido) y `/banco/[id]` (detalle). Acceso desde Inicio (con la cantidad de pendientes), Más › Mi organización y Ayuda.
- **Sólo alta y lectura:** la API no permite editar ni borrar interacciones, así que la app tampoco lo ofrece. Para seguir un tema se manda un mensaje nuevo.
- **Seguimiento** con el `Stepper` de la app en tres pasos (Enviado → Esperando al Banco → Atendido), porque la API sólo tiene `pendiente`/`atendida` con `attended_at`.
- **Formulario** con los límites del backend (asunto ≤ 255, detalle ≤ 5000), errores 422 en el campo y `Idempotency-Key` por intención (reintentar no duplica el mensaje).
- La solicitud se presenta como el camino para "insumos u otras necesidades que no estén en el catálogo", tal como lo define el Banco en el mapa de la API (post 6509).
### D-14 · Módulo `pedidos` activo con la API real (2026-10-14)
Los pedidos de mercadería (`/org/catalog`, `/org/quota`, `/org/distributions*`) figuraban como "se habilitan con la próxima actualización" (post 1/14). El 2026-10-14 se verificó con GET contra el servidor real que responden con las formas documentadas (catálogo de 7 productos, cupo, listado, detalle y remito PDF). Por eso se suma `pedidos` a `enabledInBackend` en `src/lib/features.ts` (la misma lista que prende `familiasAlta`, D-12): se activa también con la API real, sin `EXPO_PUBLIC_ENABLE_MODULES`. El alta y la cancelación **no** se probaron contra el servidor real (crean datos en el tenant del Banco); sí contra los mocks, que reproducen las reglas del post 9.
- **Navegación:** con la API real, pestaña **Mercadería** (Inicio · Mercadería · Familias · Recetas · Más). Con mermas activas (mocks) la pestaña se oculta para no pasar de 5 y se entra desde "Más" y el Inicio.
- **Nombre:** en la interfaz es "Mercadería" / "pedido de mercadería", para no confundirlo con los "pedidos" de mermas (postulaciones) de "Mis retiros".

### D-15 · Flujo del pedido de mercadería en dos pasos (2026-10-14)
1) `/pedido/nuevo`: catálogo con búsqueda y filtro por categoría, cantidad por producto. 2) `/pedido/confirmar`: revisar cantidades, ver cómo queda el cupo, día de retiro, franja, motivo y urgencia. El borrador vive en un store de zustand en memoria (`src/features/pedidos/cart.ts`): no se persiste (es un pedido a medio armar, no un dato del servidor).
- **Fecha de retiro con chips** (hoy + 13 días) en vez de un selector de fecha: no suma dependencias nativas y cumple la regla "desde hoy". El banco fija el día definitivo (`scheduled_distribution_date`).
- **Franja**: "Sin preferencia" / "Mañana" / "Tarde". La API acepta texto libre.
- **Reglas del Banco en el cliente** (además de las del servidor): hasta 30 productos sin repetir (el carrito es un mapa por `product_id`), cantidad > 0, y el botón "Hacer un pedido" se deshabilita con 3 pedidos esperando respuesta (`pendiente`/`en_revision`) para no llegar al 422 `TOO_MANY_OPEN_REQUESTS`.
- **`warnings`** (stock o cupo superados): el pedido entra igual; se muestran en un diálogo antes de ir al detalle.
- **Categorías**: se arman con lo que trae el catálogo (no hay listado de categorías para este rol) y se filtra en el cliente.
- **Errores por `error_code`**: el cliente ahora lee `error_code` (formato de la serie nueva) además de `code`/`error`.

### D-16 · Contactos sobre `/org/contacts` y módulo `contactos` activo (2026-10-20)
El padrón de la organización se migró de `/organizations/{id}/contacts*` (rol del Banco, en `pickup.ts`) a `/org/contacts` (post 4/14): la organización la resuelve el backend por el usuario, igual que familias (D-12). Se quitaron de la app la autorización y la revocación de retiros (`/pickup-authorizations`): **autorizar es del Banco**; la app sólo muestra `pickup_authorized` y `authorizations` (ámbito y vigencia). `pickup.ts` queda sólo con "quién retira" una merma (módulo `mermas`, apagado). El 2026-10-20 se verificó contra el servidor con el usuario de prueba (lista, alta, 422 por DNI repetido, edición, 409 `CONTACT_IDENTITY_LOCKED`, 404 `CONTACT_NOT_FOUND`, baja) y se suma `contactos` a `enabledInBackend`.
- **Pantallas propias** (`/contactos`, `/contactos/nuevo`, `/contactos/[id]`) en lugar de hojas dentro de "Mi organización", que queda con un acceso y el resumen ("N personas · M autorizadas a retirar"). No hay `GET /org/contacts/{id}`: la ficha sale de la lista cacheada.
- **Identidad bloqueada en el cliente:** si `pickup_authorized`, nombre y DNI se muestran fijos (candado); igual se maneja el 409 por si el Banco la autorizó mientras se editaba (se vuelven a lo guardado y se recarga).
- **Edición parcial:** el `PUT` manda sólo los campos que cambiaron (`changedFields`, como en miembros).
- **Contacto principal:** un switch; el backend desmarca al anterior y la app recarga la lista.
- **Errores por `error_code`:** `CONTACT_NOT_FOUND` vuelve a la lista actualizada; `CONTACT_DECLARED_FOR_PICKUP` se muestra en la ficha (no se puede probar con la API real hasta que haya mermas).

### D-17 · "Pedir autorización al Banco" reutiliza `/banco/nueva` (2026-10-20)
Siguiendo el post 4/14 ("cárguenla con su DNI y pídanlo con una interacción de tipo `solicitud`"), la ficha del contacto sin autorización vigente tiene el botón **Pedir autorización al Banco**, que abre `/banco/nueva` con `tipo=solicitud`, `titulo` ("Autorizar a <nombre> a retirar alimentos") y `notas` (nombre, DNI y cargo) ya completos y editables. No se envía sola: la persona revisa y toca "Enviar al Banco". Sin DNI el botón no aparece (se pide cargarlo primero). `/banco/nueva` acepta ahora `titulo` y `notas` como parámetros, recortados a los límites del backend.

### D-18 · Módulo `recibido` (lo recibido y panel nutricional) activo con la API real (2026-10-20)
`GET /org/received` y `GET /org/nutrition` están documentados por el Banco con respuestas reales del servidor (post 11/14, copiado en `docs/bda/11-recibido-nutricion.md`). Se suma el módulo `recibido` a `enabledInBackend` en `src/lib/features.ts`, igual que `pedidos` (D-14). Se desarrolló contra mocks con la forma exacta del post y el mismo día se verificó con GET contra el servidor real (`npm run smoke`, 25 PASS): `/org/received` (con su 422 de período inválido) y `/org/nutrition` responden con la forma que espera la app. El servidor agrega `summary.reconciliation_pending`, que el post no documenta (G-19).
- Rama `recibido-nutricion` (Pilar 1 del reparto del equipo). Al integrar con `main` se renumeró a D-18–D-20, P-20–P-21 y G-19, porque la rama `Contacto` ya había usado D-16, D-17, P-18, P-19 y G-18.

### D-19 · Panel nutricional sobre `/org/nutrition` (2026-10-20)
El mapa de la API del Banco (punto 3) pide usar `/org/nutrition` para este rol, no `/nutrition/summary`. La sección "Lo que recibieron" de Nutrición, que adivinaba la forma de `/nutrition/summary` (G-01), se reemplazó por **Cobertura nutricional**:
- **Mes navegable** (flechas): del mes actual hasta 11 meses atrás (el backend acepta hasta un año). No hay selector de fecha: no suma dependencias nativas.
- **Cobertura total** y **por grupo**: kg recibidos contra la necesidad del grupo (`quota_kg`) y el porcentaje (`coverage_pct`).
- **Niveles de cobertura (criterio propio, a validar con el área social):** 100 % o más = "Cubierto", de 50 % a 99 % = "En camino", menos de 50 % = "Falta". Cada nivel tiene ícono y texto, nunca sólo color.
- Si `needs_available` es `false`, se muestran los kg recibidos sin porcentaje y un aviso de que el Banco todavía no cargó la necesidad por grupo.
- Se muestran también los kg **sin grupo cargado** (`unclassified_kg`), los **bultos surtidos** (`bulk_kg`) y el origen (pedidos / mermas).
- Los nombres de los grupos se muestran con tildes (`coverageGroupLabels`): la API los manda sin tildes ("Lacteos").
- El Inicio suma "Alimentación de este mes": la cobertura total y los dos grupos con menos cobertura.
- Se quitaron `nutritionApi.summary`, `useNutritionSummary` y su ruta simulada, que ya no se usaban. Los grupos de alimentos y la búsqueda de productos (`/nutritional-groups`, `/unified-products`) siguen detrás del módulo `nutricionApi`, apagado con la API real.

### D-20 · Pantalla "Lo recibido" (2026-10-20)
`/recibido` lista lo que llegó del Banco: pedidos entregados y mermas retiradas.
- **Períodos con chips** (último mes, 3 meses, 6 meses, último año), siempre terminando hoy. Así nunca se arma un período inválido (el 422 de "hasta anterior a desde") ni de más de un año. Por defecto, 3 meses, como el backend.
- **Resumen del período entero** (sale de la primera página): kg, cantidad de entregas, la última, por origen y por mes.
- **Filtro por origen** (pedidos / mermas): sólo aparece si en el período hay de los dos. Si ya se eligió un origen, sigue visible para poder volver a "Todo".
- Cada entrega muestra hasta 3 productos (`items_preview`) y "y N productos más". Un pedido abre su detalle (`/pedido/[id]`). Una merma abre el retiro sólo si el módulo `mermas` está activo; si no, la tarjeta no se puede tocar.
- **Accesos:** Mercadería ("Ver todo lo recibido"), Más › Alimentación ("Lo recibido") y Nutrición ("Ver todo lo recibido").

### D-21 · Perfil de la organización sobre `/org/*` (post 3/14) (2026-10-20)
Se implementa el post 3/14 de la serie "API organizaciones" (`docs/bda/03-perfil-organizacion.md`): perfil editable, dirección, estadísticas, ficha social, capacidad logística, documentos y requisitos.
- **Verificado contra el servidor real el 2026-10-20:** los seis GET responden con las formas documentadas; `PUT /org/profile` y `PUT /org/logistics` se probaron reenviando los mismos valores (no cambian datos) y con los errores del post (422 `FIELD_NOT_EDITABLE`, días con mayúscula, horario invertido, email inválido).
- **Documentación pasa a `/org/requirements`, `/org/documents` y `/org/social-data`** (antes `/organizations/{id}/*`, que con el rol organización dan 403). El módulo `documentacion` se suma a `enabledInBackend` en `src/lib/features.ts`. Perfil editable y logística no tienen interruptor (como interacciones, D-13).
- **Carta compromiso:** `/organizations/{id}/terms-pdf` da 403 `INSUFFICIENT_PERMISSION` a este rol, así que se quita la descarga y se muestra la fecha de aceptación (`terms_accepted_at` de la ficha social).
- **Edición en hojas inferiores** dentro de "Mi organización" (`ProfileSheet`, `LogisticsSheet`): se mandan sólo los campos que cambiaron (un `""` o `null` borra el dato, G-15) y nunca los que maneja el Banco. Los dos horarios viajan juntos porque el backend valida el rango con ambos.
- **Reglas del Banco en el cliente:** días en minúscula y sin tilde (chips lunes–sábado; los que llegan con tilde se normalizan), horas `HH:MM` con máscara, fin posterior al inicio, email válido, kilos y m³ ≥ 0. Los 422 de los días llegan por posición (`preferred_pickup_days.0`) y se muestran en el campo.
- **Lógica de formularios aparte** (`src/features/org/form.ts`): valores del form ⇄ cuerpo de la API, testeable sin pantalla.
- **Descargas con `error_code`:** `api.raw` ahora lee el JSON del error, y la descarga nativa repite el pedido para conocerlo (`downloadFileAsync` no lo expone). Así la app distingue `DOCUMENT_NOT_FOUND` de un corte de conexión.
- Rama `perfil-organizacion`. Al integrar con `main` se renumeró a D-21 y G-20, porque `Contacto` y `recibido-nutricion` ya habían usado D-16–D-20 y G-18–G-19. "Mi organización" conserva el acceso a Contactos de D-16 y suma la edición del perfil y la capacidad logística.

### D-22 · Rediseño visual: ancho completo, paleta accesible y elevación (2026-11-09)
Pasada de diseño sobre el sistema de diseño (tokens y componentes base de `src/components/ui`), sin cambios de lógica. Rama `cambiosvisuales`.
- **Ancho completo en web:** `max-w-content` pasa de 720 px a `100%`, así el contenido acompaña a la barra de pestañas. Los márgenes laterales crecen con la pantalla (16 / 32 / 48 px a partir de 768 y 1024 px) con las clases `md:`/`lg:` en `Screen` y el hook `useContentPadding` (`src/lib/layout.ts`) en las listas de FlashList, que no toman clases responsive.
- **Listas en 2 columnas desde 1024 px** (`layout.twoColumnsFrom`): `InfiniteList` usa `numColumns` para que las tarjetas no queden estiradas en monitores anchos. En el celular, una columna como antes.
- **Primario más profundo:** `#3B9B6E` (152 45 % 42 %) → `#2E845C` (152 48 % 35 %), mismo tono. El texto blanco sobre el primario pasa de 3,4:1 a ≈4,6:1 y cumple WCAG AA. Los neutros cálidos (tono 40) pasan a neutros con tinte verde (tono 140) para armonizar con la marca.
- **Elevación con `boxShadow`** (tokens `shadows` en `src/theme/tokens.ts`; RN ≥ 0.76 lo soporta en web, iOS y Android): las tarjetas neutras flotan con sombra suave; las de aviso (tono) quedan planas. El botón primario lleva sombra verde para marcar la acción principal. Radios más amplios (`lg` 12, `xl` 16, `2xl` 20).
- **Jerarquía:** el chip seleccionado pasa de verde lleno a verde suave para no competir con el botón primario; la pestaña activa lleva una píldora de fondo (patrón Material 3); las tarjetas que se pueden tocar muestran un chevron.
- **Inicio** con encabezado de bienvenida verde que integra la tarjeta de la organización (mismo destino, `/organizacion`). **Login** con panel de marca en pantallas anchas y encabezado verde con tarjeta superpuesta en el celular.

### D-23 · Chat con el asistente dentro de la app, junto con los formularios (2026-11-11)
Se implementa la guía definitiva del asistente (post de GoDubi del 11/11, contrato v2 en `docs/asistente/`). Detalle completo en `docs/asistente/README.md`.
- **Un solo chat dentro de la app**, en la ruta que ya existía (`/asistente`), que ya tenía accesos desde Inicio, Más, Nutrición y Ayuda. Se sacan las pestañas General / Recetas / Nutrición: ahora un mismo asistente atiende todo. No lleva pestaña propia porque ya hay cinco.
- **El chat no reemplaza los formularios.** Las dos formas guardan en el mismo backend. Los formularios siguen siendo el camino principal y suman un atajo discreto, "Hacerlo con el asistente", que abre el chat con un texto precargado sin enviarlo. Después de confirmar una tarjeta se invalidan las consultas de la app según `ACTION_INVALIDATES`, así lo guardado aparece en las pantallas normales.
- **Sesión del chat separada** del token de Mermab (PKCE, secure-store, renovación silenciosa). Se cierra junto con el logout de la app.
- **El simulador es un `fetch` falso, no otro cliente.** El modo de prueba pasa por el mismo `client.ts` que la API real, así la renovación de sesión, los errores y los reintentos se prueban con el mismo código. Cubre los 12 escenarios del contrato.
- **Modo por defecto según la plataforma:** API real en el celular y simulador en web, porque el navegador no puede llegar a la API (P-25). Se puede forzar con `EXPO_PUBLIC_ASSISTANT_MODE`.
- **Markdown con un renderizador propio** (`src/components/asistente/Markdown.tsx`, unas 200 líneas) en lugar de una librería. Las opciones conocidas (`react-native-markdown-display` y similares) no se actualizan hace años y no están probadas con React 19, RN 0.86 y NativeWind. Un chat necesita poco (títulos, negrita, cursiva, listas, enlaces, citas y tablas simples), y así se usan los componentes y colores del sistema de diseño. También tolera markdown a medio escribir mientras la respuesta crece.
- **Polling con TanStack Query** (`refetchInterval` de 1,5 s / 5 s, cortado en segundo plano y sin red) en lugar de un temporizador a mano: reaprovecha `focusManager` y `onlineManager`, que ya están conectados.
- **Aviso de organización distinta:** hoy el asistente atiende sólo a "Comedor Prueba Tesis API" (`EXPO_PUBLIC_ASSISTANT_ORG_NAME`). Si la app está en otra organización, el chat lo avisa, porque lo que guarde no se va a ver.
- **Dependencias nuevas:** `expo-image-picker`, `expo-image-manipulator` y `expo-document-picker`, instaladas con `npx expo install` (versiones del SDK 57). Vienen en Expo Go: no hace falta un development build. Se suma el plugin de `expo-image-picker` en `app.json` con los textos de permisos en español y el micrófono desactivado.

### D-24 · Dictado por voz en el chat del asistente, transcripto en el celular (2026-11-11)
Se suma un botón de micrófono a la barra del chat (`src/components/asistente/Composer.tsx`, hook en `src/features/asistente/dictation.ts`). Detalle en `docs/asistente/README.md` §3.6.
- **Opciones evaluadas:** (1) leer en voz alta las respuestas (`expo-speech`); (2a) pasar la voz a texto en el celular y mandar texto; (2b) mandar el audio como adjunto, al estilo WhatsApp. Se elige **2a**: el backend de GoDubi no cambia (al asistente le sigue llegando texto) y la 2b no es posible hoy, porque el contrato sólo acepta `image/*` y `application/pdf` como adjuntos.
- **Nunca se envía solo.** Lo dictado aparece en vivo en la barra y queda ahí para revisarlo y corregirlo. Enviar está deshabilitado mientras se escucha. Es importante porque el asistente después propone guardar familias, pedidos y avisos: un nombre o una cantidad mal entendidos no deberían llegar sin que la persona los vea.
- **Librería:** `expo-speech-recognition` (versión 57.x, la del SDK 57), porque Expo no tiene un módulo propio de voz a texto (`expo-speech` sólo hace texto a voz). Usa el reconocedor del sistema: Google en Android, Siri en iOS y la Web Speech API en Chrome y Safari. No tiene costo y no pasa por servidores propios.
- **Carga opcional:** el módulo nativo no viene en Expo Go. Se comprueba con `requireOptionalNativeModule` antes de importarlo. Si no está (Expo Go, Firefox), el botón no aparece y el resto del chat funciona igual. Para usar el dictado en el celular hace falta un *development build*.
- **Idioma:** `es-AR`. En iOS se elige el primero disponible entre es-AR, es-419, es-US, es-MX y es-ES. Se pasan palabras del dominio (comedor, merendero, Banco de Alimentos, lentejas…) como `contextualStrings` y se pone mayúscula al empezar cada oración.
- **Modo continuo** (sigue escuchando en las pausas hasta que se toca "terminar"), salvo en Android 12 o anterior, que no lo soporta y corta al final de la frase.
- Plugin en `app.json` con los textos de los permisos en español. Agrega `RECORD_AUDIO` en Android y `NSMicrophoneUsageDescription`/`NSSpeechRecognitionUsageDescription` en iOS. El `microphonePermission: false` de `expo-image-picker` queda igual: la cámara sigue sin grabar audio.
