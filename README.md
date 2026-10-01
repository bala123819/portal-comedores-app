# Portal Comedores

App para comedores y organizaciones sociales del **Banco de Alimentos**, sobre la **API Mermab**.
Android, iOS y web (PWA) desde una sola base de código: Expo SDK 57 + Expo Router + TypeScript.

> Fuente de verdad del backend: **`docs/bda/`** (guía del Banco, probada contra el servidor).

## Qué hace hoy (con la API real)

| Pantalla | Endpoints |
|---|---|
| Ingreso y sesión | `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout` |
| Inicio | `/org/profile`, `/org/stats` (impacto), `/org/families/demographics`, `/notifications/unread-count` |
| Familias (lectura) | `/org/families` (búsqueda y filtro por estado), `/org/families/{id}`, `/org/families/demographics` |
| Mi organización | `/org/profile`, `PUT /org/address` (con ubicación del dispositivo) |
| Nutrición | cuota mensual (`monthly_quota_kg`) y necesidades de las familias |
| Avisos | `/notifications*` (leer, marcar, borrar, aviso de prueba) |
| Perfil y clave | `PUT /auth/profile`, `PUT /auth/password` |
| Recetario | local (`src/data/recetas`), con escalado por cantidad de personas y modo cocina |
| Asistente y WhatsApp | interfaz de agentes (simulada hasta tener endpoint) y `wa.me` |

**Apagado hasta que el Banco lo habilite** (pantallas hechas, ver `docs/api-gaps.md` G-13): mermas y
retiros, alta de familias, contactos, documentación, jornadas/talleres y endpoints de nutrición.
Se activan sin tocar código con `EXPO_PUBLIC_ENABLE_MODULES` (ver `src/lib/features.ts`).

## Instalación

```bash
npm install
cp .env.example .env      # y completar
```

Variables (`.env`, nunca se versiona):

| Variable | Para qué |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://cloud.mermab.com/api` |
| `EXPO_PUBLIC_USE_MOCKS` | `true` = datos simulados (no toca el servidor) |
| `EXPO_PUBLIC_MODULES_SCOPE` | con mocks: `real` muestra sólo lo que existe hoy; vacío = todo (prototipo) |
| `EXPO_PUBLIC_ENABLE_MODULES` | forzar módulos: `mermas,familiasAlta,contactos,documentacion,programas,nutricionApi` |
| `EXPO_PUBLIC_WHATSAPP_NUMBER` | número del chatbot (sin `+`) |
| `EXPO_PUBLIC_AGENTS_URL` | endpoint de agentes (n8n/GoDubi); vacío = simulado |
| `EXPO_PUBLIC_VAPID_PUBLIC_KEY` | clave pública Web Push (si el Banco la da) |
| `CHECK_API_EMAIL` / `CHECK_API_PASSWORD` | sólo para `npm run smoke`; no entran al bundle |

`.env.local` tiene prioridad sobre `.env`: si existe con `EXPO_PUBLIC_USE_MOCKS=true`, la app usa
datos simulados. **Para usar la API real, borrá `.env.local`.**

## Correr

```bash
npm run web       # navegador en http://localhost:3000 (el único puerto que acepta el CORS de la API)
npm run android   # Expo Go / emulador
npm run ios
```

> La API real es **producción compartida**: nada de pruebas de carga ni loops. Límite: 60 pedidos/min
> (login 10/min). Usar sólo el usuario de prueba que dio el Banco.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run smoke` | Verifica la API real (equivalente a `scripts/smoke-test.sh` del Banco, sin jq). Esperado: `21 PASS, 0 FAIL` |
| `npm run smoke:samples` | Igual, y guarda respuestas enmascaradas en `docs/api/samples/` (no se versionan) |
| `npm run gen:api` | Regenera `src/services/api/schema.d.ts` desde el OpenAPI (corrige operationId duplicados) |
| `npm run recetas:convertir` | Convierte `docs/recetarios/*.json|csv` → `src/data/recetas/` |
| `npm run typecheck` / `npm run lint` | Calidad |
| `npm run build:web` | Exporta la PWA a `dist/` |

## Estructura

```
src/
  app/            rutas (Expo Router): (auth), (app)/(tabs), (app)/…, dev/
  components/ui/  librería propia (tokens, esquinas redondeadas, 4 estados)
  components/…    componentes por dominio
  features/       hooks de React Query, tipos y lógica por módulo
  services/api/   cliente HTTP, endpoints, errores, idempotencia, schema generado
  services/agents interfaz de agentes (mock / HTTP)
  lib/            labels, estados, formatos, módulos (features.ts), recetas
  mocks/          API simulada con las formas reales
  data/recetas/   recetario (generado)
docs/
  bda/            guía del Banco (fuente de verdad)
  api/            OpenAPI, Postman, llms.txt
  00-inventario.md, api-gaps.md, decisiones.md, mapa-pantallas.md
scripts/          smoke test, gen-api, convertir-recetas
```

## Pantallas de desarrollo
En modo desarrollo, "Más" muestra **Diagnóstico de la API** (checklist de conexión) y **Componentes (UI)**.
