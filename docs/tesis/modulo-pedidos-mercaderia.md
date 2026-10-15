# Módulo de pedidos de mercadería

Registro de todo lo que se hizo para el frontend de **pedidos de mercadería**: la organización pide productos del catálogo del Banco, ve su cupo del mes, sigue el estado del pedido, lo cancela mientras el Banco no lo aprobó y descarga el remito.

- **Fecha:** 2026-10-14 · **Rama:** `mercaderias`
- **Autoría:** Julieta Leiro, con asistencia de IA (Claude Code)
- **Fuente de verdad:** posts 9/14 y 10/14 de la guía del Banco en GoDubi (orden #1149), copiados en [`docs/bda/09-10-pedidos-mercaderia.md`](../bda/09-10-pedidos-mercaderia.md)
- **Decisiones:** D-14 y D-15 en [`docs/decisiones.md`](../decisiones.md) · **Observaciones del backend:** G-17 en [`docs/api-gaps.md`](../api-gaps.md)

> **Bitácora:** estos cambios todavía no están commiteados. Al commitear, agregar la entrada en `bitacora.md` (plantilla en `README.md`) apuntando a este documento, y correr `npm run bitacora`.

---

## 1. Qué puede hacer la organización

| Acción | Endpoint | Dónde está en la app |
|---|---|---|
| Ver el cupo del mes (le corresponde / recibido / pedido en curso / le queda) | `GET /org/quota` | Mercadería, Inicio y la revisión del pedido |
| Ver el catálogo del Banco, buscar y filtrar por categoría | `GET /org/catalog` | Hacer un pedido (paso 1) |
| Armar y mandar un pedido (día de retiro, franja, motivo, urgencia) | `POST /org/distributions` | Hacer un pedido (pasos 1 y 2) |
| Ver los pedidos en curso, los entregados o todos | `GET /org/distributions?status=` | Mercadería |
| Seguir un pedido: estado, día que fijó el Banco, cantidades aprobadas y entregadas | `GET /org/distributions/{id}` | Detalle del pedido |
| Cancelar un pedido que el Banco todavía no aprobó (con motivo) | `POST /org/distributions/{id}/cancel` | Detalle del pedido |
| Descargar el remito en PDF cuando el pedido está listo | `GET /org/distributions/{id}/receipt` | Detalle del pedido |
| Abrir el pedido desde el aviso que manda el Banco (`pedido_actualizado`) | `GET /notifications` | Notificaciones |

## 2. Pantallas

### Mercadería (`/mercaderia`, pestaña)
- Tarjeta de **cupo del mes** con barra de progreso. Si con lo pedido se pasan, lo dice ("Te pasás por N kg") y aclara que el cupo es una referencia (`enforced: false`).
- Botón **Hacer un pedido**. Con 3 pedidos esperando respuesta se deshabilita y se explica por qué (regla del Banco).
- Filtros **En curso** (`status=abiertos`) / **Entregados** (`distribuida`) / **Todos**.
- Lista paginada de pedidos (número, estado, productos, kilos, día de retiro, urgente).

### Hacer un pedido · paso 1 (`/pedido/nuevo`)
- Catálogo con búsqueda (con *debounce* de 500 ms, por el límite de 60 pedidos por minuto) y chips de categoría.
- Cada producto muestra categoría, unidad y peso por unidad, y "Quedan pocas" si viene `poco_stock`. El catálogo no muestra stock: si un producto no está, es que el Banco no lo tiene.
- Botón **Agregar** y después control −/cantidad/+ (también se puede escribir la cantidad).
- Pie fijo con el resumen ("3 productos · unos 10,2 kg") y **Revisar pedido**.

### Hacer un pedido · paso 2 (`/pedido/confirmar`)
- Lista de productos con cantidades editables y kilos estimados.
- **Cupo con este pedido**: la misma tarjeta, sumando los kilos del pedido que se está armando.
- **Día de retiro**: chips desde hoy y las dos semanas siguientes (por defecto, mañana).
- **Horario**: Sin preferencia / Mañana / Tarde.
- **¿Para qué es el pedido?** (opcional, 500 caracteres) y **Es urgente** con el motivo obligatorio si se activa.
- Al enviar: si la respuesta trae `warnings` (stock o cupo superados), un diálogo los muestra y después lleva al pedido; si no, va directo al detalle.
- Errores: los de un campo se marcan en el campo; los de un producto puntual (`items.0.quantity_requested`) se muestran con el nombre del producto; el resto, con el mensaje del Banco. Reintentar no duplica el pedido (misma `Idempotency-Key`).

### Detalle del pedido (`/pedido/[id]`)
- Estado y **Stepper**: Enviado → Aprobado → Armando → Para retirar → Entregado. Si terminó rechazado, cancelado o anulado, se muestra con el motivo (`rejection_reason`).
- Texto de ayuda según el estado (qué pasa ahora y qué tienen que hacer).
- **Descargar remito** si `receipt_available` (en el celular abre el menú de compartir; en web, una pestaña nueva).
- Datos: cuándo se pidió, día y franja pedidos, día que fijó el Banco, quién retiró, motivo, urgencia, número de remito.
- Productos con lo **pedido**, lo **aprobado** (resaltado si el Banco cambió la cantidad) y lo **entregado**.
- **Cancelar pedido** sólo si `can_cancel`, con diálogo que pide el motivo (obligatorio en la API). Si el Banco ya lo aprobó (409 `DISTRIBUTION_NOT_CANCELLABLE`) se muestra su mensaje y se refresca el pedido.

### Otros puntos de entrada
- **Inicio:** sección "Pedidos de mercadería" con el cupo, aviso si hay pedidos listos para retirar, y el pedido en curso más próximo (o el botón para hacer uno).
- **Más:** entrada "Pedidos de mercadería" cuando la pestaña está oculta (modo mocks con mermas activas).
- **Notificaciones:** los avisos `pedido_actualizado` abren el pedido (`data.distribution_id`).

## 3. Estilo de diseño

Se reutilizó el sistema de diseño existente sin agregar estilos nuevos:
- Componentes de `src/components/ui` (`Screen`, `Header`, `Card`, `StatusBadge`, `Stepper`, `ProgressBar`, `Chip`, `InfiniteList`, `ConfirmDialog`, `Dialog`, `SwitchRow`, `TextArea`, `InfoRow`, `SkeletonList`, `ErrorState`, `EmptyState`).
- Tokens de color de `src/theme/tokens.ts` / `global.css` (verde institucional, tonos semánticos). El estado nunca va sólo con color: siempre ícono + texto.
- Los mismos patrones de pantallas parecidas: listado con chips de filtro como *Mis retiros*, formulario con `react-hook-form` + `zod` y pie fijo como *Pedir estos alimentos*, detalle con acción de cancelar como *Pedido* (postulación).
- Textos en español rioplatense y en lenguaje de la organización ("Te quedan 173,6 kg", "Ya pueden ir a retirarlo"), números con formato argentino (`formatNumber`), fechas relativas (`formatDay`).
- Accesibilidad: objetivos táctiles de 44–48 px, `accessibilityLabel` en los controles de cantidad, mensajes de error con `accessibilityRole="alert"`.

## 4. Archivos

### Nuevos
| Archivo | Qué es |
|---|---|
| `src/features/pedidos/types.ts` | Tipos según las respuestas reales (catálogo, cupo, pedido, ítem, body del alta, `warnings`) y reglas (`ORDER_RULES`: 30 productos, 3 pedidos esperando) |
| `src/features/pedidos/hooks.ts` | React Query: `useCatalog`, `useQuota`, `useDistributions`, `useDistribution`, `useWaitingRequests`, `useCreateDistribution`, `useCancelDistribution` |
| `src/features/pedidos/cart.ts` | Borrador del pedido (zustand, en memoria): cantidades por producto, tope de 30, kilos estimados |
| `src/components/pedidos/QuotaCard.tsx` | Tarjeta del cupo del mes (con vista previa de un pedido) |
| `src/components/pedidos/DistributionCard.tsx` | Tarjeta de un pedido en los listados |
| `src/components/pedidos/CatalogItem.tsx` | Producto del catálogo + `QuantityControl` (−/cantidad/+) |
| `src/app/(app)/(tabs)/mercaderia.tsx` | Pantalla principal (pestaña Mercadería) |
| `src/app/(app)/pedido/nuevo.tsx` | Paso 1: catálogo |
| `src/app/(app)/pedido/confirmar.tsx` | Paso 2: revisar y enviar |
| `src/app/(app)/pedido/[id].tsx` | Detalle, remito y cancelación |
| `docs/bda/09-10-pedidos-mercaderia.md` | Copia de la especificación del Banco (posts 9 y 10) |
| `docs/tesis/modulo-pedidos-mercaderia.md` | Este documento |

### Modificados
| Archivo | Cambio |
|---|---|
| `src/services/api/endpoints/org.ts` | `orgApi.catalog`, `quota`, `distributions`, `distribution` (valida UUID antes de llamar), `createDistribution` (devuelve también `warnings` y `quota`, que vienen fuera de `data`), `cancelDistribution`, `receiptPath` |
| `src/services/api/client.ts` | Lee `error_code` (formato de la serie nueva de la guía) además de `code` / `error` |
| `src/features/query-keys.ts` | Claves `catalog`, `quota`, `distributions`, `distributionsAll`, `distribution` (prefijo `orders`) |
| `src/lib/features.ts` | Módulo `pedidos`, sumado a `enabledInBackend` (módulos habilitados en el servidor real, activos sin forzarlos) |
| `src/lib/labels.ts` | Etiquetas de estados del pedido, disponibilidad, franjas y el tipo de aviso `pedido_actualizado` |
| `src/lib/status.ts` | Tipo de estado `distribution` (etiqueta, tono e ícono por estado), pasos del Stepper, `distributionStepOf`, `isOpenDistribution` |
| `src/app/(app)/(tabs)/_layout.tsx` | Pestaña Mercadería (oculta si hay mermas activas, para no pasar de 5) |
| `src/app/(app)/_layout.tsx` | Rutas `pedido/*` protegidas por el módulo `pedidos` |
| `src/app/(app)/(tabs)/index.tsx` | Sección "Pedidos de mercadería" en el Inicio; el *pull-to-refresh* también refresca los pedidos |
| `src/app/(app)/(tabs)/mas.tsx` | Entrada "Pedidos de mercadería" cuando la pestaña está oculta |
| `src/features/notificaciones/types.ts`, `src/app/(app)/notificaciones.tsx` | El aviso con `distribution_id` abre el pedido |
| `src/mocks/data.ts`, `src/mocks/handler.ts` | Catálogo, cupo y 4 pedidos de ejemplo (pendiente, listo para retirar, entregado, rechazado); rutas con las reglas del Banco (validaciones, 422 `TOO_MANY_OPEN_REQUESTS`, `warnings`, 409 `DISTRIBUTION_NOT_CANCELLABLE`, remito sólo si está listo) |
| `docs/decisiones.md`, `docs/api-gaps.md`, `docs/bda/README.md`, `docs/tesis/README.md` | D-14, D-15, G-17 e índices |

## 5. Reglas del Banco y cómo se cumplen

| Regla (post 9/10) | En la app |
|---|---|
| Fecha de retiro desde hoy | Sólo se ofrecen días desde hoy |
| Hasta 30 productos, sin repetir | El carrito es un mapa por producto y no deja pasar de 30 (avisa con un toast) |
| Hasta 3 pedidos esperando respuesta | Se cuenta en los pedidos abiertos y se deshabilita "Hacer un pedido"; si igual llega el 422, se muestra el mensaje del Banco |
| El pedido entra aunque supere stock o cupo, con `warnings` | Se muestran en un diálogo después de enviar |
| El banco decide las cantidades al aprobar | Se aclara en el paso 1 y se muestra lo aprobado en el detalle |
| `Idempotency-Key` en todo POST | `useAction` (una key por intención; reintentar con los mismos datos reusa la key) |
| Mostrar u ocultar botones con `can_cancel` y `receipt_available` | Así se hace en el detalle (no se deduce del estado) |
| `reason` obligatorio al cancelar | El botón de confirmar se habilita sólo con motivo |
| El remito se descarga con el mismo `Authorization` | `downloadAndOpen` (ya existía para documentos) |
| Ramificar por `error_code`, no por el texto | El cliente lo guarda en `ApiError.code` |
| Un id que no es UUID da 500 | `orgApi.distribution` lo corta antes como "no encontrado" |

## 6. Verificación

| Qué | Resultado |
|---|---|
| `npx tsc --noEmit` | Sin errores |
| `npx expo lint` | Sin errores ni advertencias |
| `expo export -p web` en modo mocks | El bundle compila con las rutas nuevas |
| GET contra la **API real** (usuario de prueba de la organización) | `/org/catalog` (7 productos), `/org/quota`, `/org/distributions` (listado, `status=abiertos`, detalle con `items`) y `/receipt` (200 `application/pdf`) responden con las formas documentadas |
| Flujo completo contra los **mocks** (script descartable, empaquetado con esbuild) | Validaciones 422 con errores por campo; alta con `STOCK_INSUFFICIENT` y `QUOTA_EXCEEDED`; misma `Idempotency-Key` → mismo pedido; 4.º pedido → `TOO_MANY_OPEN_REQUESTS`; cancelar sin motivo → 422; cancelar → `cancelada` con motivo; cancelar uno listo → 409 `DISTRIBUTION_NOT_CANCELLABLE`; remito antes de tiempo → 422 y después → PDF. Por `orgApi`: `warnings` y `quota` llegan al resultado del alta y `humanMessage` muestra el mensaje del Banco |

**No verificado todavía:**
- **Alta y cancelación contra el servidor real:** no se hicieron porque crean pedidos en el tenant del Banco y les llegan avisos. Para probarlas, hacer un pedido chico con la nota `[PRUEBA TESIS]` y cancelarlo, como hizo el Banco en sus ejemplos.
- **Celular (Android / iOS):** la prueba en navegador fue en web con tamaño de celular; falta recorrerlo en un dispositivo o emulador.

### Prueba de punta a punta en el navegador (2026-10-14)

`npm run web` en modo mocks (`EXPO_PUBLIC_USE_MOCKS=true EXPO_PUBLIC_MODULES_SCOPE=real`, la configuración "como en producción"), manejado con Playwright sobre Chrome en una pantalla de 390 × 844 (celular). Script descartable, fuera del repo. **37 de 37 pasos OK y sin errores de consola:**

- **Ingreso e Inicio:** sección de pedidos, aviso de pedido listo, cupo.
- **Pestaña Mercadería:** filtros En curso / Entregados / Todos.
- **Crear:** catálogo de 7 productos, "Quedan pocas", búsqueda, filtro por categoría, botón deshabilitado sin productos, agregar con "Agregar" y "+", escribir la cantidad, **sacar un producto**, resumen de kilos.
- **Editar:** cambiar cantidades en la revisión; el total y el cupo se recalculan.
- **Validaciones:** urgente sin motivo marca error.
- **Enviar:** detalle "Pendiente de revisión" con productos, horario y urgencia.
- **Pedido grande:** diálogo con los avisos de stock y cupo.
- **Límite de 3 pedidos esperando:** aviso y botón deshabilitado.
- **Eliminar (cancelar):** confirmar deshabilitado sin motivo; con motivo pasa a "Cancelado" y desaparece el botón; después se puede volver a pedir.
- **Pedido listo:** sin Cancelar, cantidad aprobada distinta resaltada, **descarga del remito PDF**.
- **Rechazado:** se ve el motivo.
- **Aviso → pedido.**
- **Id inválido:** muestra el error.
- **`/pedido/confirmar` sin productos:** vuelve al catálogo.

Arreglos que salieron de esta prueba:
- Detrás del diálogo de avisos se veía "0 productos · 0 kg": el carrito ahora se vacía recién al salir de la pantalla.
- El motivo de un pedido cancelado repetía la palabra ("Cancelado: Cancelado por la organización: …"; el Banco ya manda ese texto). Ahora no se repite.
- En pantalla de celular, "Aprobado" y "Preparando" quedaban pegados en el Stepper. El paso 3 ahora se llama **"Armando"**.
- El aviso de cupo de los mocks usaba "107.79 kg"; ahora usa formato argentino, como el Banco.
- **Remito en el celular:** la descarga nativa usa `File.downloadFileAsync` directo contra el servidor; en modo mocks sólo funciona en web.

## 7. Cómo probarlo

```bash
# Prototipo con datos simulados (todos los módulos; Mercadería queda en "Más" y en el Inicio)
EXPO_PUBLIC_USE_MOCKS=true npm run web

# Como en producción con mocks (pestaña Mercadería)
EXPO_PUBLIC_USE_MOCKS=true EXPO_PUBLIC_MODULES_SCOPE=real npm run web

# Contra la API real del Banco (el módulo pedidos ya está activo)
npm run web
```

En mocks, para ver los avisos de stock y cupo: pedir más de 20 unidades de un producto con "Quedan pocas" (atún o puré de tomate), o pedir mucho para pasarse del cupo. Para ver el límite de 3: hacer dos pedidos más (ya hay uno pendiente).

## 8. Pendientes

- Probar alta y cancelación contra la API real (ver §6) y recorrer las pantallas en el celular.
- Entrada de la bitácora al commitear.
- "Lo recibido" y el panel nutricional (`/org/received`, `/org/nutrition`, post 11) completan este módulo: los pedidos entregados aparecen ahí.
- Insumos que no están en el catálogo: según el Banco se piden como interacción de tipo `solicitud` (post 8), que todavía no tiene pantalla.
- Hablar con el Banco sobre las observaciones de G-17 (franjas como lista cerrada, categorías).
