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
