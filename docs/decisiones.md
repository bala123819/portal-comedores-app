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
