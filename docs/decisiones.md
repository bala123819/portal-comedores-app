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

### D-16 · Perfil de la organización sobre `/org/*` (post 3/14) (2026-10-20)
Se implementa el post 3/14 de la serie "API organizaciones" (`docs/bda/03-perfil-organizacion.md`): perfil editable, dirección, estadísticas, ficha social, capacidad logística, documentos y requisitos.
- **Verificado contra el servidor real el 2026-10-20:** los seis GET responden con las formas documentadas; `PUT /org/profile` y `PUT /org/logistics` se probaron reenviando los mismos valores (no cambian datos) y con los errores del post (422 `FIELD_NOT_EDITABLE`, días con mayúscula, horario invertido, email inválido).
- **Documentación pasa a `/org/requirements`, `/org/documents` y `/org/social-data`** (antes `/organizations/{id}/*`, que con el rol organización dan 403). El módulo `documentacion` se suma a `enabledInBackend` en `src/lib/features.ts`. Perfil editable y logística no tienen interruptor (como interacciones, D-13).
- **Carta compromiso:** `/organizations/{id}/terms-pdf` da 403 `INSUFFICIENT_PERMISSION` a este rol, así que se quita la descarga y se muestra la fecha de aceptación (`terms_accepted_at` de la ficha social).
- **Edición en hojas inferiores** dentro de "Mi organización" (`ProfileSheet`, `LogisticsSheet`): se mandan sólo los campos que cambiaron (un `""` o `null` borra el dato, G-15) y nunca los que maneja el Banco. Los dos horarios viajan juntos porque el backend valida el rango con ambos.
- **Reglas del Banco en el cliente:** días en minúscula y sin tilde (chips lunes–sábado; los que llegan con tilde se normalizan), horas `HH:MM` con máscara, fin posterior al inicio, email válido, kilos y m³ ≥ 0. Los 422 de los días llegan por posición (`preferred_pickup_days.0`) y se muestran en el campo.
- **Lógica de formularios aparte** (`src/features/org/form.ts`): valores del form ⇄ cuerpo de la API, testeable sin pantalla.
- **Descargas con `error_code`:** `api.raw` ahora lee el JSON del error, y la descarga nativa repite el pedido para conocerlo (`downloadFileAsync` no lo expone). Así la app distingue `DOCUMENT_NOT_FOUND` de un corte de conexión.
