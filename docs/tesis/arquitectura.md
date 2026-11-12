# Arquitectura del frontend

## 1. Contexto

```
Celular (Android/iOS) · Navegador (PWA)
        │  una sola base de código: Expo + React Native + react-native-web
        ▼
┌──────────────────────────────────────────────┐
│ Portal Comedores (este repo)                 │
│  pantallas → hooks de datos → cliente HTTP   │
└──────┬─────────────────┬─────────────────────┘
       │ HTTPS + Bearer  │ HTTPS (sin token del usuario)
       ▼                 ▼
 API Mermab (Banco)   Agentes de IA (GoDubi / n8n) — pendiente
 Laravel + Postgres   ↔ MCP server del backend
 multi-tenant
```

- **Usuario:** referente de un comedor/organización social (rol `organization_coordinator`).
- **Backend:** API Mermab, producción compartida, multi-tenant. No se modifica desde este repo.
- **Agentes:** viven fuera del repo; la app se integra por una interfaz propia.

## 2. Stack y justificación

| Necesidad | Elección | Por qué |
|---|---|---|
| Android, iOS y web desde un código | Expo SDK 58 + React Native 0.88 + react-native-web | Framework recomendado por React Native; PWA sin código aparte |
| Navegación | Expo Router (rutas por archivos en `src/app/`) | Estándar de Expo; deep links y web automáticos |
| Lenguaje | TypeScript estricto | Detecta errores de contrato con la API en compilación |
| Estilos | NativeWind 4 (Tailwind) + tokens | Sistema de diseño único en todas las plataformas |
| Datos del servidor | TanStack Query + persistencia | Cache, reintentos, paginación infinita y uso sin conexión |
| Estado de cliente | Zustand | Sesión mínima, sin boilerplate |
| Formularios | react-hook-form + zod | Validación tipada y errores por campo (422) |
| Tipos de la API | `openapi-typescript` (requests) + tipos propios (respuestas) | El spec no documenta respuestas (G-01) |
| Token | `expo-secure-store` (nativo) / `localStorage` (web) | Almacenamiento seguro donde existe |
| Listas | FlashList | Rendimiento en celulares de gama baja |
| Íconos | lucide-react-native | Livianos y consistentes |

Ver también `docs/decisiones.md`.

## 3. Capas y carpetas

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Pantallas | `src/app/` | Rutas: `(auth)` login, `(app)/(tabs)` pestañas, `(app)/*` pantallas apiladas, `dev/` herramientas |
| Componentes | `src/components/ui/`, `src/components/<dominio>/` | Librería propia (4 estados: carga, vacío, error, datos) y componentes de dominio |
| Módulos | `src/features/<modulo>/` | Hooks de React Query, tipos y lógica por módulo (auth, org, familias, notificaciones, interacciones…) |
| Servicios | `src/services/` | Cliente HTTP, endpoints, errores, idempotencia, storage, red, push, descargas, agentes, **asistente (chat GoDubi)** |
| Utilidades | `src/lib/` | Etiquetas (enums → texto), estados, formatos, recetas, WhatsApp, **módulos activos** |
| Simulación | `src/mocks/` | API falsa con las formas reales |
| Datos locales | `src/data/recetas/` | Recetario (generado) |

## 4. Flujos principales

### 4.1 Sesión
1. Login (`POST /auth/login`) → `access_token` (dura 24 h) guardado en almacenamiento seguro.
2. Al abrir la app: si el token tiene más de 12 h se rota (`POST /auth/refresh`; el anterior muere en el acto).
3. Se carga el usuario (`/auth/me`) y la organización (`/org/profile`). Si el usuario no tiene organización → pantalla "esta app es para organizaciones".
4. Cualquier 401 borra el token y vuelve al login. Las rutas se protegen con `Stack.Protected` según el estado de la sesión.

### 4.2 Pedidos a la API (`src/services/api/client.ts`)
- Headers `Accept`/`Content-Type`, `Authorization: Bearer`. Nunca `X-API-Key` (credencial del tenant).
- Desenvuelve `{success, data, meta}` y soporta las dos formas de paginación del backend.
- **Límite:** se autolimita a 50 pedidos/min (el servidor corta a 60 y responde 500).
- **Reintentos:** sólo los GET, ante 500/429/red, con espera. Las escrituras nunca se reintentan solas.
- **Idempotencia:** todo POST lleva `Idempotency-Key`. La key se genera una vez por intención del usuario (`useIdempotencyKey`) y se reusa si reintenta la misma acción, para que no se duplique.
- **Errores:** traducidos a mensajes humanos en español; los 422 se vuelcan campo por campo en el formulario.

### 4.3 Uso sin conexión
- Las lecturas marcadas como persistentes (organización, familias, demografía, recetas) se guardan en el dispositivo (24 h).
- Banner "Sin conexión" y reintentos al reconectar o al volver a la app.

### 4.4 Módulos según el backend (`src/lib/features.ts`)
- Cada módulo (mermas, alta de familias, contactos, documentación, programas, nutrición, pedidos) se prende o apaga. Con la API real están activos `familiasAlta`, `pedidos` y `contactos` (`enabledInBackend`).
- Con la API real sólo se usa lo que el Banco ofrece hoy; los módulos apagados **no hacen pedidos** y sus rutas quedan bloqueadas.
- Se activan sin tocar código (`EXPO_PUBLIC_ENABLE_MODULES`). En modo simulado se ve todo, como prototipo.

### 4.5 Modo simulado (`src/mocks/`)
- `EXPO_PUBLIC_USE_MOCKS=true`: el cliente responde con una API falsa (misma forma que la real, incluidos sus bugs conocidos).
- `EXPO_PUBLIC_MODULES_SCOPE=real`: los mocks muestran sólo lo que existe hoy en el backend.

### 4.6 Asistente de IA, agentes y WhatsApp
**Chat con el asistente (`src/services/assistant/`, `src/features/asistente/`, `/asistente`)**: guía y contrato de GoDubi del 2026-11-11. Detalle en `docs/asistente/README.md` (D-23).

```
Pantalla /asistente ── useAssistantChat (TanStack Query: polling 1,5 s / 5 s)
        │                       │
        │                       ▼
        │              AssistantClient (client.ts)
        │        sesión PKCE · renovación silenciosa · errores
        │                       │ fetch
        │          ┌────────────┴────────────┐
        │          ▼                         ▼
        │   API real GoDubi webchat     fetch simulado (mock.ts)
        │   (celular directo; web por   (sólo con
        │    el proxy /api-asistente)    ASSISTANT_MODE=mock)
        │
        └─ tarjeta "Confirmar" ─► el asistente guarda en /api/org/... ─► invalidación de consultas
                                  (mismo backend que los formularios)
```

**Dictado por voz (D-24):** `useDictation` (`src/features/asistente/dictation.ts`) pasa la voz a texto en el
celular con el reconocedor del sistema (`expo-speech-recognition`) y lo deja en la barra del Composer. Al
asistente sólo le llega texto, así que el contrato con GoDubi no cambia. El módulo nativo se carga de forma
opcional: sin él (Expo Go), el botón no aparece.

- **Sesión propia del chat**, independiente del token de Mermab: PKCE (`bootstrap` + `exchange`), guardada en secure-store, se renueva sola un minuto antes de vencer o ante un 403 de sesión (un reintento), y se cierra con el logout de la app.
- **Escrituras sólo con confirmación:** lo que el asistente quiere guardar llega como tarjeta (`approvals`). La decisión nunca se reintenta sola. Al confirmar, se refrescan las consultas de Familias, Pedidos o Avisos (`ACTION_INVALIDATES`).
- **Convive con los formularios:** atajos "Hacerlo con el asistente" en alta de familia, pedido y mensaje al Banco, que abren el chat con texto precargado.
- **Modo:** real en el celular y en web (D-26). Como la API no admite CORS (P-25), en web se pasa por el proxy `/api-asistente` del servidor de desarrollo (`scripts/assistant-proxy.js`, registrado en `metro.config.js`). El simulador (`EXPO_PUBLIC_ASSISTANT_MODE=mock`) es un `fetch` falso, así el modo de prueba ejercita el mismo cliente.

**Proveedor anterior (`src/services/agents/`)**: lo sigue usando *Sugerir recetas*. Tiene la interfaz `AgentsProvider` con una implementación simulada (recetario local) y otra HTTP (`EXPO_PUBLIC_AGENTS_URL`), y manda sólo ids. Sus acciones propuestas sólo navegan.

**WhatsApp:** `wa.me/<número>` con mensaje prearmado según desde dónde se abre. Queda como alternativa también en el chat vacío.

### 4.7 Comunicación con el Banco (`src/features/interacciones/`)
- La organización deja un suceso, una solicitud, una consulta o un reclamo (`POST /org/interactions`, con `Idempotency-Key`); al Banco le llega un aviso.
- La lista (`/banco`) filtra por estado y tipo en el servidor (`status`, `type`) y muestra los contadores de `/org/interactions/summary`, que también alimenta el acceso del Inicio.
- Crear un mensaje invalida todas las consultas `['interactions', …]` (lista, resumen y detalle).
- Sólo alta y lectura (D-13).

### 4.8 PWA
- `public/manifest.json`, íconos y `public/sw.js`: app shell sin conexión y avisos Web Push. La API no se cachea en el service worker (lo hace React Query).
- En web sólo funciona desde `localhost:3000`/`3001` por CORS del backend.

## 5. Sistema de diseño
- Paleta en tokens HSL (`src/global.css`) y hex (`src/theme/tokens.ts`): primario verde sage `#3B9B6E`, fondo blanco cálido, estados success/warning/info/destructive.
- Radios: 6/8/10/14 px y pill; nunca esquinas cuadradas.
- Accesibilidad: áreas táctiles de 48 px, texto base 16 px, el color nunca es el único portador de significado (ícono + texto).
- Todo enum de la API se muestra con una etiqueta en español (`src/lib/labels.ts`); estados con color + ícono (`src/lib/status.ts`).

## 6. Calidad
- `npm run typecheck`, `npm run lint` antes de cada commit.
- `npm run smoke`: verificación de la API real (21 chequeos, equivalente al script del Banco).
- Pantallas de desarrollo: diagnóstico de la API y catálogo de componentes.
