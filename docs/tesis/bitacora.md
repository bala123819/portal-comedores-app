# Bitácora de desarrollo — Portal Comedores (frontend)

Registro cronológico de cada commit y de los hitos sin commit. Las entradas más nuevas van al final.
Formato y proceso: ver [README.md](README.md). Referencias: decisiones `D-xx` en `docs/decisiones.md`,
problemas `P-xx` en [problemas-y-soluciones.md](problemas-y-soluciones.md), faltantes del backend `G-xx` en `docs/api-gaps.md`.

---

## Hito · Reunión con el Banco de Alimentos: definición de la propuesta
- **Fecha:** 2026-09-08 · **Sin commit** (anterior al repositorio)

Reunión del equipo (Balardini Tomás, Martina Gonella, Julieta Leiro) con Santiago Helguera (Banco de Alimentos). Se descarta la vertical de logística con La Anónima (ya la implementa el Banco) y se define la vertical de **organizaciones sociales (comedores)**: gestión de pedidos, registro de familias, panel nutricional, cursos, stock interno y muro de necesidades, con dos interfaces (app móvil minimalista y chatbot de WhatsApp con agentes de IA). El Banco desarrolla el backend; el equipo hace el frontend y los agentes (aporte central). Documento: `docs/propuesta/propuesta-tesis.md`.

---

## 456bf60 · Initial commit
- **Fecha:** 2026-09-25 16:48 · **Autoría:** bala123819
- **Etapa:** Inicio del proyecto

**Objetivo.** Crear el repositorio de la app.

**Qué se hizo.**
- Proyecto generado con `create-expo` 5.0.2 (Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6, Expo Router con rutas en `src/app/`).
- Plantilla de ejemplo de Expo (pantallas de demo, íconos, tema).

**Archivos principales.** 55 archivos de la plantilla (`src/app`, `src/components`, `assets/`, `app.json`, `package.json`).

---

## ff0d176 · chore: proyecto inicial Expo con soporte web
- **Fecha:** 2026-09-25 17:08 · **Autoría:** bala123819
- **Etapa:** Inicio del proyecto

**Objetivo.** Partir de una base limpia con soporte web.

**Qué se hizo.**
- Se quitó el código de demo de la plantilla (`reset-project`): pantallas `explore`, componentes animados, tema y hooks de ejemplo.
- La plantilla original quedó guardada en `example/` (ignorada por git) como referencia.
- `src/app/_layout.tsx` y `src/app/index.tsx` mínimos.

**Archivos principales.** 20 archivos (−1174 líneas).

---

## d40260e · Testng borrar
- **Fecha:** 2026-09-25 17:43 · **Autoría:** bala123819
- **Etapa:** Inicio del proyecto

**Qué se hizo.** Commit de prueba: se borró un ícono de la plantilla (`assets/images/tabIcons/home@2x.png`). Sin impacto funcional.

---

## 9451c0d · docs: relevamiento fase 0 (inventario de API, gaps, decisiones y mapa de pantallas)
- **Fecha:** 2026-09-25 18:12 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Fase 0 — Relevamiento

**Objetivo.** Entender la API Mermab antes de escribir código: qué ofrece a una organización, con qué contrato y qué falta.

**Qué se hizo.**
- Descarga de la documentación pública de la API a `docs/api/`: `llms.txt` (convenciones), `openapi.yaml` (contrato, 522 operaciones) y `collection.json` (Postman).
- Análisis del OpenAPI con scripts: operaciones por módulo, bodies, parámetros, enums.
- Verificación en vivo sin credenciales: `GET /health` responde OK; las rutas `/org/*` piden sesión (401).
- `docs/00-inventario.md`: módulos útiles para una organización, endpoints a usar (método, ruta, body, notas), entidades, enums, máquinas de estado, reglas de negocio y dudas.
- `docs/api-gaps.md`: 11 faltantes (G-01 a G-11).
- `docs/decisiones.md`: decisiones D-01 a D-06.
- `docs/mapa-pantallas.md`: propuesta de navegación y pantallas.

**Hallazgos principales.**
- Sólo 15 de 522 operaciones documentan la respuesta exitosa: los tipos de respuesta no se pueden generar (G-01).
- No se documentan permisos por endpoint (G-02).
- CORS admite `localhost:3000` pero no `localhost:8081` (puerto de Expo web) (G-03, D-04).
- Push sólo Web Push (G-06). No existe módulo de recetas (G-10). Brief de GoDubi inaccesible (G-11).

**Decisiones.** D-01 (código bajo `src/`), D-02 (Expo SDK 57), D-03 (tipos generados para requests, escritos a mano para respuestas), D-04 (web en puerto 3000), D-05 (`web.output: single`), D-06 (Idempotency-Key en mutaciones).

**Verificación.** No aplica (sólo documentación).

**Archivos principales.** `docs/00-inventario.md`, `docs/api-gaps.md`, `docs/decisiones.md`, `docs/mapa-pantallas.md`, `docs/api/*`.

---

## e14c185 · Commit con esqueleto basico app front
- **Fecha:** 2026-09-30 20:35 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Desarrollo completo del frontend (Fases 1 a 8 del plan), contra datos simulados

**Objetivo.** Construir todo el frontend previsto en el plan (base técnica, librería de UI, auth, operación, recetario, nutrición, familias, programas, documentación, notificaciones, agentes, PWA), sin depender todavía de credenciales del backend.

**Qué se hizo.**
- **Base técnica:** NativeWind 4 (Tailwind 3) con tokens de color HSL en `src/global.css` y valores hex en `src/theme/tokens.ts`; ESLint + Prettier; alias `@/`; TanStack Query con persistencia de cache; Zustand para la sesión; react-hook-form + zod; FlashList; `expo-secure-store` (token) y `localStorage` en web.
- **Cliente de API propio** (`src/services/api/`): envoltorio `{success, data, meta}`, errores humanos en español, manejo de 401/403/422/429, `Idempotency-Key` por intención del usuario, tipos de requests generados del OpenAPI (`npm run gen:api`).
- **Modo simulado** (`src/mocks/`): API falsa con datos realistas y transiciones de estado, para desarrollar sin credenciales.
- **Librería de UI** (`src/components/ui/`): botones, inputs, select, tarjetas, badges de estado, chips, avatar, toasts, diálogos, confirmaciones, bottom sheet, skeletons, estados vacío/error, banner offline, stepper, gráficos simples. Todo con tokens y esquinas redondeadas.
- **Pantallas (29):** login; inicio; alimentos disponibles; detalle de merma; postulación; pedidos; retiros con máquina de estados (asignada → confirmada → en camino → completada); quién retira; completar retiro; recetario con escalado y modo cocina; sugerencias de recetas; asistente (chat); notificaciones; nutrición; familias (lista, detalle, alta); jornadas y talleres; documentación; mi organización; perfil y contraseña; ayuda; diagnóstico de API; catálogo de componentes.
- **Recetario:** schema zod, conversor `npm run recetas:convertir` (JSON/CSV → `src/data/recetas`), 8 recetas **de ejemplo** marcadas como tales, escalado con redondeo por unidad, cruce con alimentos recibidos.
- **Agentes y WhatsApp:** interfaz única `src/services/agents/` (implementación simulada + HTTP), botón de WhatsApp con mensajes según contexto. Las acciones que propone un agente sólo navegan; el usuario confirma.
- **PWA:** `public/index.html`, `manifest.json`, service worker (app shell offline + Web Push), íconos de la app.

**Decisiones.** D-07 (typed routes desactivadas) y las de la Fase 0.

**Problemas y soluciones.** P-01 a P-09 (operationId duplicados, typed routes, modo oscuro de NativeWind en web, botones anidados, modales en web, cache restaurado con estado viejo, `useNativeDriver` en web, lint del React Compiler, cucharadas sin escalar bien).

**Verificación.** `tsc --noEmit` y `expo lint` sin errores. Pruebas manuales en web (navegador, viewport de celular) con datos simulados: login, flujo completo de postulación y de retiro, recetas con escalado, asistente, diagnóstico. Build de producción web (`expo export`) OK. No probado contra la API real ni en un celular.

**Pendientes.** Probar contra la API real (faltaban credenciales). Tamaño del bundle web (4,6 MB). Recetarios reales. Endpoint de agentes. Prueba en Android.

**Archivos principales.** 168 archivos: `src/app/**`, `src/components/**`, `src/features/**`, `src/services/**`, `src/lib/**`, `src/mocks/**`, `src/data/recetas/**`, `public/**`, `scripts/**`, configuración (`babel`, `metro`, `tailwind`, `eslint`, `app.json`).

---

## Hito · Recepción de la guía de la API del Banco de Alimentos
- **Fecha:** 2026-09-30 · **Sin commit**

El equipo del Banco envió 6 posts con la guía de la API para la app de organizaciones, probados contra el servidor el 29/09: usuario de prueba (`coordinadora.tesis.api@org.test`, tenant de pruebas), ejemplos reales de respuestas, un cliente `apiClient.ts`, un script de humo y la lista de bugs conocidos. **Cambio de alcance:** sólo están habilitados para la organización login/sesión, perfil, organización, familias (lectura) y avisos; mermas y retiros "existen pero no se probaron y quedaron fuera del alcance". Se decide acoplar la app a lo que el backend ofrece hoy (D-08).

---

## 0d00782 · feat: acoplar la app a la API real del Banco de Alimentos
- **Fecha:** 2026-09-30 21:10 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Acople a la API real

**Objetivo.** Que la app use exactamente lo que el backend del Banco ofrece hoy, con las formas reales de las respuestas y respetando sus reglas y bugs conocidos.

**Qué se hizo.**
- `docs/bda/`: la guía del Banco guardada como fuente de verdad (sin la clave). `scripts/smoke-test.sh` (script del Banco) y `npm run smoke` (equivalente en TypeScript, sin `jq`), que reemplaza al `check:api` anterior.
- **Cliente HTTP** ajustado a las reglas del Banco: autolímite de 50 pedidos/min, reintento de GET ante 500/429/red, `Idempotency-Key` en todo POST, dos formas de paginación, rechazo de ids no UUID.
- **Tipos y mocks** con las formas reales: login (`access_token`), `/auth/me`, `/org/profile` (`{organization, user}`), `/org/stats` (bloques en español; sólo `impacto` útil), familias (`total_members`, `family_type`, `head_of_household`, `age`), demografía (edades, condiciones especiales, tipos de familia), avisos (paginación anidada, `body`, `is_read`).
- **Interruptores por módulo** (`src/lib/features.ts`): mermas/retiros, alta de familias, contactos, documentación, jornadas y nutrición quedan apagados con la API real (no se llaman) y protegidos por ruta; visibles en modo simulado.
- **Pantallas:** pestañas Inicio · Familias · Recetas · Más; Inicio con organización, impacto, cuota y demografía; Familias con búsqueda, filtro y resumen; Mi organización con datos reales y dirección validada; Nutrición basada en la cuota mensual y las familias; cambio de clave con `new_password_confirmation`; `device_type` válido en Web Push.

**Decisiones.** D-08 (acoplarse al backend real), D-09 (smoke test en TypeScript).

**Problemas y soluciones.** P-10 (colisión de rutas `/familias`), P-11 (pestañas ocultas accesibles por URL), P-12 (reintentos que se multiplicaban), P-13 (clave en `.env` con `< >`).

**Verificación.** `tsc` y `lint` sin errores. Pruebas manuales en web con mocks en "alcance real" (`EXPO_PUBLIC_MODULES_SCOPE=real`): login, inicio, familias (lista, detalle, id inválido), resumen, organización, nutrición, avisos, rutas bloqueadas. También en modo prototipo completo. **No probado contra la API real** (pendiente de correr `npm run smoke`).

**Pendientes.** Correr `npm run smoke:samples` y probar la app con el usuario real. Prueba en celular. Recetarios reales. Agentes.

**Archivos principales.** `src/services/api/client.ts`, `src/lib/features.ts`, `src/features/*/types.ts`, `src/mocks/*`, `src/app/(app)/(tabs)/*`, `src/app/(app)/familia/*`, `src/app/(app)/organizacion.tsx`, `src/app/(app)/nutricion.tsx`, `docs/bda/*`, `scripts/smoke-test.*`.

---

## 01d4acf · docs: documentación de tesis (bitácora, arquitectura, problemas y estado)
- **Fecha:** 2026-10-01 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Documentación

**Objetivo.** Dejar registrado todo el desarrollo para la documentación final de la tesis y establecer el proceso para que cada commit futuro quede documentado.

**Qué se hizo.**
- `docs/tesis/`: README con el proceso y la plantilla, esta bitácora (reconstruida desde el primer commit), arquitectura, problemas y soluciones, estado actual.
- `npm run bitacora`: detecta commits sin entrada en la bitácora y puede agregar el esqueleto.
- Regla en `AGENTS.md` para que toda sesión de desarrollo documente sus commits.

**Verificación.** No aplica (documentación y un script auxiliar).

---

## ca451e7 · docs: contrato de agentes y pedido al Banco
- **Fecha:** 2026-10-01 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Planificación de agentes y coordinación con el Banco

**Objetivo.** Destrabar las dos dependencias externas más grandes de la tesis: los agentes de IA (componente central, sin construir) y los módulos del backend que el Banco todavía no habilitó (mermas y retiros).

**Qué se hizo.**
- `docs/agentes-contrato.md` (versión 1): endpoints `POST /recipes/suggest`, `/chat` y `/nutrition/ask` con pedidos y respuestas de ejemplo, contexto común, autenticación por fases, regla de acciones propuestas (sólo navegan, el usuario confirma), errores, tiempos, cómo probar.
- `src/services/agents/http.ts`: timeout de 30 s, header `X-Agents-Contract: 1` y validación con zod de las respuestas (una respuesta fuera de contrato muestra un error legible en vez de romper la pantalla).
- `docs/comunicaciones/2026-10-01-pedido-al-banco.md`: mensaje al Banco con el estado y los pedidos priorizados (mermas y retiros, recetarios, brief GoDubi y contrato de agentes, número de WhatsApp, push nativo y VAPID, CORS para la PWA, módulos a futuro). Versión final ajustada por el equipo antes de enviar.
- Hito: el usuario corrió `npm run smoke:samples`; las respuestas reales (login, me, capabilities, organización, estadísticas, familias, demografía, avisos) coinciden con los tipos de la app (sólo sobran `created_at`/`updated_at`, que no se usan).

**Decisiones.** D-10 (autenticación de agentes en dos fases).

**Verificación.** `tsc` y `lint` sin errores. El cliente HTTP de agentes no se probó contra un servicio real (no existe todavía); el agente simulado sigue funcionando igual.

**Pendientes.** Enviar el mensaje al Banco (completar el resultado del smoke test). Definir quién construye los agentes. Prueba de la app con la API real y en celular.

**Archivos principales.** `docs/agentes-contrato.md`, `docs/comunicaciones/2026-10-01-pedido-al-banco.md`, `src/services/agents/http.ts`, `docs/decisiones.md`.

---

## Hito · Documentación de GoDubi (1): API de AI Workers
- **Fecha:** 2026-10-02 · **Sin commit propio** (se registra en el commit siguiente)

Se confirma que los agentes se construirán en **GoDubi**. El equipo aportó la documentación de la API de AI Workers (49 endpoints). Hallazgo clave: es una API del lado del agente, autenticada con una key secreta por worker y con límite de 500 pedidos/hora; no ofrece un canal para que una app de usuarios finales converse con un agente. Se propone un **gateway** propio del lado servidor que implemente el contrato de la app y delegue en los workers. Quedan dudas (canal de entrada, WhatsApp, MCP) para la próxima documentación.

---

## d6ae016 · docs: análisis de la API de GoDubi
- **Fecha:** 2026-10-02 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Planificación de agentes

**Objetivo.** Evaluar qué ofrece GoDubi para construir los agentes y cómo se conecta con la app.

**Qué se hizo.**
- `docs/godubi/01-api-ai-workers.md`: documentación de la API de AI Workers (autenticación, capabilities, persona, instrucciones, tareas, archivos con procesamiento, knowledge base, memoria, external API calls, multi-agente, eventos, MCP helpers, catálogo).
- `docs/godubi/analisis.md`: qué sirve (persona, instrucciones, knowledge base para el recetario, procesamiento de los recetarios del Banco, external_api_call hacia Mermab, multi-agente, revisión humana), qué no (reuniones, media, workspace, conectores ajenos), arquitectura con gateway y dudas abiertas.
- `docs/agentes-contrato.md`: nota de que con GoDubi la URL de agentes apunta al gateway.

**Decisiones.** Ninguna nueva cerrada; la arquitectura con gateway queda como hipótesis hasta conocer el resto de la documentación.

**Verificación.** No aplica (documentación).

**Pendientes.** Recibir el resto de la documentación de GoDubi (canal de entrada, WhatsApp, MCP) y cerrar la arquitectura.

**Archivos principales.** `docs/godubi/01-api-ai-workers.md`, `docs/godubi/analisis.md`, `docs/agentes-contrato.md`.

---

## Hito · Documentación de GoDubi (2): servidor MCP
- **Fecha:** 2026-10-02 · **Sin commit propio** (se registra en el commit siguiente)

El equipo aportó la documentación del servidor MCP de GoDubi (`https://mcp.godubi.com/mcp`). Hallazgos: Claude Code puede conectarse como un AI Worker por OAuth (1 conexión = 1 worker); existe un **conector nativo de Mermab** en GoDubi; Telegram figura como conector pero WhatsApp no; todo consumo se factura en créditos; las acciones destructivas requieren aprobación humana; existe un modo Builder (beta) para crear workers desde el editor.

---

## 7b16291 · docs: documentación del MCP de GoDubi y plan de trabajo con agentes
- **Fecha:** 2026-10-02 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Planificación de agentes

**Objetivo.** Definir cómo se construyen y prueban los agentes en GoDubi y cómo se conectan con la app y con Mermab.

**Qué se hizo.**
- `docs/godubi/02-mcp.md`: conexión (OAuth / API Key / Builder), tools, conectores (incluido Mermab), facturación, confirmación de acciones destructivas, lectura de archivos, recursos, persona, instrucciones, seguridad.
- `docs/godubi/analisis.md` actualizado: hallazgos, qué sirve, arquitectura (app → gateway → workers Recetas/Nutrición/Operación → conector Mermab), plan para trabajar los agentes desde Claude Code y dudas abiertas.

**Decisiones.** Ninguna cerrada: la conexión de Claude Code a GoDubi requiere que el equipo cree el worker y autorice por OAuth.

**Verificación.** No aplica (documentación).

**Pendientes.** Crear en GoDubi la orden "Portal Comedores" y el worker Recetas; conectar Claude Code por OAuth; resolver canal de entrada, WhatsApp, conector Mermab y créditos.

**Archivos principales.** `docs/godubi/02-mcp.md`, `docs/godubi/analisis.md`.

---

## ba74931 · docs: propuesta de tesis y plan de acción
- **Fecha:** 2026-10-02 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Planificación

**Objetivo.** Alinear el trabajo con el alcance acordado en la propuesta de tesis y ordenar lo que falta hasta la entrega.

**Qué se hizo.**
- `docs/propuesta/`: documento original de la propuesta (reunión del 8/9) y su transcripción.
- `docs/tesis/plan-de-accion.md`: comparación funcionalidad por funcionalidad (pedidos, familias, panel nutricional, cursos, stock interno, muro, app, WhatsApp/agentes), avance estimado contra la propuesta (~30 %), decisiones urgentes, procesos candidatos a automatizar con agentes, cronograma semanal hasta noviembre, responsabilidades y riesgos.
- Hito de la reunión del 8/9 agregado al comienzo de la bitácora.

**Hallazgos.** "Gestión de pedidos" de la propuesta (solicitar alimentos con cantidades y motivo) no es el flujo de mermas construido; el backend de pedidos (`/org/distributions`) no existe todavía. Stock interno, muro y cursos no tienen backend ni están en la guía del Banco. Los agentes son el aporte central y están sin construir.

**Decisiones.** Quedan planteadas (A–E en el plan) para el equipo.

**Verificación.** No aplica (documentación).

**Pendientes.** Tomar las decisiones A–E; reunión con el área social; empezar el agente de Recetas y las pantallas de pedidos.

**Archivos principales.** `docs/propuesta/*`, `docs/tesis/plan-de-accion.md`, `docs/tesis/bitacora.md`.

---

## 914005c · docs: pedido integral al Banco y propuestas de contrato
- **Fecha:** 2026-10-02 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Coordinación con el Banco

**Objetivo.** Pedir al Banco, en un solo mensaje, todo lo que el proyecto necesita de su lado (backend, WhatsApp, agentes/GoDubi, contenidos y validación) según la propuesta de tesis.

**Qué se hizo.**
- `docs/comunicaciones/2026-10-02-pedido-integral-al-banco.md`: 22 pedidos agrupados (backend, WhatsApp, agentes y GoDubi, contenidos, validación y avisos) con prioridades. Reemplaza al borrador del 1/10, que no se envió.
- `docs/api-gaps.md` G-14: propuestas de contrato para pedidos, alta/edición de familias, muro de necesidades, stock interno (organización → familia) y cursos.

**Decisiones.** Ninguna cerrada; el mensaje plantea al Banco la alternativa de backend propio liviano para muro, stock y cursos, y Telegram como canal alternativo a WhatsApp.

**Verificación.** No aplica (documentación).

**Pendientes.** Completar el resultado del smoke test y enviar el mensaje; registrar la respuesta como hito.

**Archivos principales.** `docs/comunicaciones/2026-10-02-pedido-integral-al-banco.md`, `docs/api-gaps.md`.

---

## Hito · Santiago Helguera es el dueño de GoDubi
- **Fecha:** 2026-10-02 · **Sin commit propio** (se registra en el commit siguiente)

El referente del Banco, Santiago Helguera, es también el dueño de GoDubi y ofreció los créditos necesarios para construir y probar los agentes. Los temas de plataforma (cuenta, créditos, modo Builder, conector Mermab, canal de entrada) se coordinan directamente con él. Se ajustó el mensaje integral (puntos 10, 14 y 15).

---

## 95f7973 · docs: ajustar el mensaje al Banco (Santiago es dueño de GoDubi)
- **Fecha:** 2026-10-02 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Coordinación con el Banco

**Qué se hizo.** Puntos 10, 14 y 15 del mensaje integral reescritos para pedirle a Santiago directamente la cuenta con créditos, el modo Builder y la información del canal de entrada de GoDubi.

**Verificación.** No aplica (documentación).

---

## 8d87a72 · feat: diseño del agente de Nutrición y Cocina para GoDubi
- **Fecha:** 2026-10-05 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Agentes de IA

**Objetivo.** Empezar el aporte central de la tesis: el primer agente, que sugiere qué cocinar y cómo alimentar mejor según los ingredientes disponibles y las características de la organización (edades, celiaquía, diabetes, embarazo, lactancia, intolerancia a la lactosa).

**Qué se hizo.**
- `docs/agentes/nutricion/README.md`: guía paso a paso en GoDubi (orden, worker, modelo, permisos, persona, instrucciones, conocimiento, pruebas, conexión MCP, integración con la app).
- `persona.md`: configuración y system prompt con reglas que no se rompen (TACC y contaminación cruzada, miel en menores de 1 año, sin azúcar para diabéticos, sin diagnósticos ni dosis, sin inventar números, sin afirmar acciones).
- `instrucciones-orden.md`: contexto, objetivos, restricciones y formato de respuesta JSON (recetas del recetario o sugeridas, adaptaciones por condición, advertencias, faltantes, preguntas).
- `conocimiento/recetario.md` (generado) y `conocimiento/pautas-alimentarias.md` (borrador a validar por nutricionista); referencia a las Guías Alimentarias para la Población Argentina.
- `casos-de-prueba.md`: 12 casos con resultado esperado y tabla de registro (resultado, costo, tiempo).
- `npm run agentes:conocimiento`: exporta el recetario de la app para el knowledge base.

**Decisiones.** D-11 (diseño del agente).

**Verificación.** El script de exportación genera el recetario (8 recetas). El agente no se probó todavía: falta crearlo en GoDubi.

**Pendientes.** Crear el worker en GoDubi; cargar el conocimiento; correr los casos de prueba; validar las pautas con una nutricionista del Banco; contrato v2 y gateway.

**Archivos principales.** `docs/agentes/nutricion/*`, `scripts/exportar-conocimiento-agente.ts`, `docs/decisiones.md`.

---

## 4b2d1c0 · commit final
- **Fecha:** 2026-10-14 · **Autoría:** bala123819
- **Etapa:** Agentes de IA

**Qué se hizo.** `.gitignore` excluye `.mcp.json`, la configuración del MCP de GoDubi que lleva el token personal.

**Verificación.** No aplica (configuración).

---

## 23fa3f4 · feat(familias): migrar el alta a /org/families y sumar la capa de edición
- **Fecha:** 2026-10-14 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** CRUD de familias (rama `feature-tomas-familias`)

**Objetivo.** Primer paso del módulo de Familias, que queda a cargo de Tomás mientras las compañeras toman Pedidos e Interacciones. El 7/10 el Banco habilitó la escritura de familias y miembros en `/org/families*`; la app usaba las rutas viejas de `/organizations/{id}`.

**Qué se hizo.**
- `src/services/api/endpoints/familias.ts`: todos los endpoints de familias y miembros (listado, detalle, tipos, `form-config`, alta, edición, baja, miembros y búsqueda por DNI). Los ids que no son UUID se cortan antes como 404 (el servidor da 500).
- Hooks de alta, edición y baja de familias y miembros. Invalidan también el perfil y las estadísticas, porque embarazo, lactancia, fecha de nacimiento y bajas recalculan el cupo.
- Formulario de alta: usa `POST /org/families` y `form-config` (campos habilitados, obligatorios y opciones de cada lista). Suma email, situación laboral y nivel educativo, y muestra el 422 de DNI repetido en el campo de la persona.
- Mocks de `/org/families*` con las reglas documentadas: DNI repetido, 409 por entregas registradas, familias suspendidas o cargadas por el banco.
- Se quitaron las rutas viejas de `org.ts` y `organizations.ts`.

**Decisiones.** D-12.

**Verificación.** `tsc --noEmit` y `expo lint` sin errores. No se probó contra el servidor: falta correr el smoke test con el usuario de prueba.

**Pendientes.** Editar y dar de baja familias desde el detalle; alta, edición y baja de miembros; búsqueda por DNI; prender `familiasAlta` después de verificar contra el servidor.

**Archivos principales.** `src/services/api/endpoints/familias.ts`, `src/features/familias/*`, `src/app/(app)/familia/nueva.tsx`, `src/mocks/handler.ts`.

---

## e90ab0d · feat(familias): edición, baja y miembros desde la app
- **Fecha:** 2026-10-14 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** CRUD de familias (rama `feature-tomas-familias`)

**Objetivo.** Completar el módulo de Familias con todo lo que documenta la API organizaciones (posts 5–7 en GoDubi): editar y dar de baja familias, y administrar sus integrantes.

**Qué se hizo.**
- **Detalle de la familia:**
  - botón para editar;
  - pasar a inactiva o reactivar;
  - dar de baja. Si la API responde 409 porque la familia tiene entregas registradas, se ofrece pasarla a inactiva.
  - Las familias suspendidas por el banco o cargadas por un programa se muestran en solo lectura, con el motivo.
- **Editar familia** (`/familia/[id]/editar`): manda sólo los campos que cambian, como pide la API.
- **Integrantes** (`/familia/[id]/miembro/nuevo` y `/familia/[id]/miembro/[memberId]`):
  - agregar, editar, pasar a inactivo, reactivar y quitar;
  - campos extra: contacto, descripción de la discapacidad, otras condiciones y notas.
  - Al cargar el DNI se consulta `GET /org/families/members/search` y se avisa si la persona ya está en otra familia, con un enlace a esa familia.
- **Código compartido:** `FamilyFields` y `MemberFields` (componentes) y `features/familias/form.ts` (esquemas, form-config, campos cambiados y mensajes por `error_code`). El alta de familia pasa a usarlos.
- **Listado:** filtro "Incluir las del Banco" (`source=all`).
- **Mocks:** una familia suspendida y una de programa para probar los bloqueos; tipos de familia iguales a los reales; filtro por `source`.
- **Smoke test:** `npm run smoke -- --familias` prueba la escritura de punta a punta y siempre borra la familia de prueba al final.
- **Documentación:** `docs/api-gaps.md` G-15 con dudas para el Banco (cómo borrar un dato si `null` se ignora, cambio de tipo, referente del hogar, miembros inactivos) y `docs/mapa-pantallas.md` actualizado.

**Decisiones.** D-12 (sigue vigente).

**Problemas.** El reemplazo de texto por shell rompió los template strings de JSX y los finales de línea CRLF hicieron fallar otro reemplazo. Se resolvió con un script de parches que respeta CRLF. No se registra como P-xx porque no afecta la app.

**Verificación.**
- `tsc --noEmit` y `expo lint` sin errores; el script del smoke test también compila.
- El bundle web compila con las rutas nuevas (`npm run web`).
- No se probó contra el servidor: falta `npm run smoke -- --familias` con el usuario de prueba.

**Pendientes.**
- Correr el smoke test de escritura.
- Prender `familiasAlta` (`EXPO_PUBLIC_ENABLE_MODULES=familiasAlta`).
- Probar en el celular.
- Responder G-15 con el Banco.

**Archivos principales.** `src/app/(app)/familia/**`, `src/components/familias/*`, `src/features/familias/*`, `src/mocks/*`, `scripts/smoke-test.ts`.

---

## a05df72 · feat(familias): prender el alta y la edición con la API real
- **Fecha:** 2026-10-14 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** CRUD de familias (rama `feature-tomas-familias`)

**Qué se hizo.** Con `npm run web` contra la API real no se veía nada nuevo, porque el interruptor `familiasAlta` sólo se prendía en modo mocks o con `EXPO_PUBLIC_ENABLE_MODULES`. Como el Banco habilitó la escritura de familias el 7/10, en `src/lib/features.ts` se suma la lista `enabledInBackend`: los módulos que el backend ya ofrece quedan prendidos por defecto para todo el equipo. `estado-actual.md` actualizado.

**Decisiones.** Amplía D-08 (acoplarse al backend): un módulo se prende en el código cuando el Banco confirma que lo habilitó.

**Verificación.** `tsc --noEmit` y `expo lint` sin errores. Falta probar el flujo en la app contra el servidor.

---

## a43f9a0 · fix(familias): ajustar la app a lo verificado contra el servidor
- **Fecha:** 2026-10-14 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** CRUD de familias (rama `feature-tomas-familias`)

**Objetivo.** Probar el módulo de Familias contra el servidor real y separar lo verificado de lo supuesto. Tomás pidió revisar qué partes salían de la documentación y cuáles eran supuestos.

**Qué se hizo.**
- `npm run smoke -- --familias` contra `https://cloud.mermab.com/api` con el usuario de prueba: **33 PASS, 0 FAIL** (12 de escritura de familias). La familia de prueba se borró.
- Script temporal, borrado después de usarlo, con los mismos helpers de la app (`familyBody`, `memberBody`, `changedFields`). Verificó los supuestos:
  - el alta acepta todos los campos que manda la app;
  - el `PUT` acepta `family_type_id`;
  - `null` o `""` borra un dato;
  - un nuevo referente del hogar desmarca al anterior;
  - un miembro inactivo sigue en la familia y en la búsqueda por DNI;
  - una familia inactiva deja de contar en `demographics`;
  - el `DELETE` borra la familia con sus miembros.
- Se quitó el aviso incorrecto de "Editar familia" y se ajustaron los textos de inactivar y reactivar para que digan sólo lo comprobado.
- Los mocks reproducen el borrado con `null` y el referente único.
- `docs/api-gaps.md` G-15 reescrito con los resultados.

**Problemas.** P-14 (la documentación de la API contradice al servidor en el borrado con `null`).

**Verificación.**
- Smoke test y script de supuestos contra el servidor, con los resultados de arriba.
- `tsc --noEmit` y `expo lint` sin errores.
- El bundle web compila con los cambios.
- Las pantallas no se probaron con clics: no hay un navegador automatizado en esta sesión.

**Pendientes.**
- Probar las pantallas a mano en web y en el celular.
- Avisar al Banco lo del `null`.
- Confirmar el `status` de una familia suspendida y el 409 por entregas.

---

## 3466ed8 · chore(bitacora): ignorar los commits de merge
- **Fecha:** 2026-10-14 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Trabajo en equipo

**Qué se hizo.** `npm run bitacora` ignora los commits de merge (`git log --no-merges`). El equipo trabaja en tres ramas, una por módulo (Familias, Pedidos de mercadería, Interacciones), que se unen a `main` con un merge commit. Ese commit no agrega trabajo propio: cada commit de la rama ya tiene su entrada. Se usa merge, no *squash* ni *rebase*, para que los hashes de la bitácora sigan existiendo en `main`.

**Verificación.** `npm run bitacora` sin faltantes.
