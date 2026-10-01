# Bitácora de desarrollo — Portal Comedores (frontend)

Registro cronológico de cada commit y de los hitos sin commit. Las entradas más nuevas van al final.
Formato y proceso: ver [README.md](README.md). Referencias: decisiones `D-xx` en `docs/decisiones.md`,
problemas `P-xx` en [problemas-y-soluciones.md](problemas-y-soluciones.md), faltantes del backend `G-xx` en `docs/api-gaps.md`.

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

## (este commit) · docs: documentación de tesis
- **Fecha:** 2026-10-01 · **Autoría:** bala123819 + asistencia de IA (Claude Code)
- **Etapa:** Documentación

**Objetivo.** Dejar registrado todo el desarrollo para la documentación final de la tesis y establecer el proceso para que cada commit futuro quede documentado.

**Qué se hizo.**
- `docs/tesis/`: README con el proceso y la plantilla, esta bitácora (reconstruida desde el primer commit), arquitectura, problemas y soluciones, estado actual.
- `npm run bitacora`: detecta commits sin entrada en la bitácora y puede agregar el esqueleto.
- Regla en `AGENTS.md` para que toda sesión de desarrollo documente sus commits.

**Verificación.** No aplica (documentación y un script auxiliar).
