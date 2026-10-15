# Pedidos de mercadería (posts 9/14 y 10/14 de la guía del Banco)

> Copia textual de los posts **"API organizaciones (9/14)"** y **"(10/14)"** publicados por el Banco en la orden #1149 de GoDubi el 2026-10-07.
> Las respuestas son del tenant de pruebas (datos ficticios). El 2026-10-14 se verificó con GET contra el servidor real que `/org/catalog`, `/org/quota`, `/org/distributions` (listado y detalle) y el remito en PDF ya responden (ver D-14).
>
> Observado en el servidor real y no documentado en los posts: `time_slot` es texto libre (llegan `"mañana"` y `"09:00-12:00"`); `category` y `nutritional_group` pueden venir en `null`.

---

# API organizaciones (9/14) — Pedidos de mercadería (1/2)

| | Endpoint | Qué hace |
|---|---|---|
| `GET` | `/api/org/catalog` | Productos que se pueden pedir, con `availability`: `disponible` o `poco_stock` (no muestra cantidades). Filtros: `search`, `food_category_id`, `per_page`. |
| `GET` | `/api/org/quota` | Cupo del mes: lo que le corresponde, lo recibido y lo pedido en curso. |
| `POST` | `/api/org/distributions` | Hace un pedido. Entra aunque supere stock o cupo, con `warnings`. |
| `GET` | `/api/org/distributions` | Pedidos de la organización. `status=abiertos` (en curso) o un estado puntual; `from`/`to` por fecha. |
| `GET` | `/api/org/distributions/{id}` | Un pedido con sus productos y su estado. |
| `POST` | `/api/org/distributions/{id}/cancel` | Cancela un pedido que el banco todavía no aprobó. |
| `GET` | `/api/org/distributions/{id}/receipt` | Remito en PDF, desde que el pedido está listo para retirar. |

**Reglas:** fecha de retiro desde hoy; hasta 30 productos por pedido, sin repetir; hasta 3 pedidos esperando respuesta (`pendiente` o `en_revision`). El banco decide las cantidades al aprobar. Cuando aprueba, rechaza, deja listo o cancela un pedido, a la organización le llega un aviso (post 2).

**Ejemplos reales** (tenant de pruebas):

**Catálogo para pedir**
`GET /api/org/catalog?per_page=10`
→ **200**
```json
{
 "success": true,
 "data": [
  {
   "product_id": "a41386ad-9e1d-475a-a0b4-cbabd9b1f86c",
   "name": "Aceite de girasol 900 ml (prueba)",
   "brand": null,
   "unit": "unidades",
   "weight_per_unit_kg": 0.83,
   "availability": "disponible",
   "availability_label": "Disponible",
   "image_url": null,
   "category": {"id": "4132c7d1-d82f-42a2-bd85-dd101431a77e", "name": "Aceites Vegetales"},
   "nutritional_group": null
  },
  "… (6 más)"
 ],
 "meta": {"current_page": 1, "last_page": 1, "per_page": 10, "total": 7}
}
```
`poco_stock` = quedan pocas unidades. Si no está en el catálogo, no hay.

**Cupo del mes**
`GET /api/org/quota`
→ **200**
```json
{
 "success": true,
 "data": {"month": "2026-10", "monthly_quota_kg": 198, "delivered_kg": 24.4, "requested_in_progress_kg": 0, "remaining_kg": 173.6, "enforced": false}
}
```
`enforced: false`: el cupo es informativo; el banco no bloquea por cupo.

**Hacer un pedido**
`POST /api/org/distributions` · header `Idempotency-Key`
```json
{
 "requested_distribution_date": "2026-10-08",
 "time_slot": "mañana",
 "notes": "[PRUEBA TESIS] Pedido semanal",
 "items": [
  {"product_id": "f73b833f-3d8a-4b81-967f-8212e143eb39", "quantity_requested": 4},
  {"product_id": "3ddd6582-7399-4d59-8591-ebec1ac540ae", "quantity_requested": 6}
 ]
}
```
→ **201**
```json
{
 "success": true,
 "message": "Pedido enviado al banco",
 "data": {
  "id": "f027f358-146c-4aad-9b78-b88e87841c2f",
  "number": "DIST-2026-00048",
  "status": "pendiente",
  "status_label": "Pendiente de revisión",
  "request_date": "2026-10-07",
  "requested_distribution_date": "2026-10-08",
  "scheduled_distribution_date": null,
  "actual_distribution_date": null,
  "time_slot": "mañana",
  "pickup_type": "pickup",
  "total_items": 2,
  "total_kg": 10.18,
  "is_urgent": false,
  "urgency_reason": null,
  "notes": "[PRUEBA TESIS] Pedido semanal",
  "rejection_reason": null,
  "received_by_name": null,
  "receipt_number": null,
  "can_cancel": true,
  "receipt_available": false,
  "requested_by_organization": true,
  "created_at": "2026-10-07T15:15:33.000000Z",
  "updated_at": "2026-10-07T15:15:33.000000Z",
  "items": [
   {
    "id": "e3b8c10d-ee89-492f-b226-e4e0efae8932",
    "product": {"id": "f73b833f-3d8a-4b81-967f-8212e143eb39", "name": "Arroz largo fino 1 kg (prueba)", "brand": null},
    "unit": "paquetes",
    "weight_per_unit_kg": 1,
    "quantity_requested": 4,
    "quantity_approved": null,
    "quantity_delivered": null,
    "kg_requested": 4
   },
   {"id": "50708138-e960-4798-be10-eedfa344287f", "product": {"id": "3ddd6582-7399-4d59-8591-ebec1ac540ae", "name": "Leche entera 1 L (prueba)", "brand": null}, "unit": "litros", "weight_per_unit_kg": 1.03, "quantity_requested": 6, "quantity_approved": null, "quantity_delivered": null, "kg_requested": 6.18}
  ]
 },
 "warnings": [],
 "quota": {"month": "2026-10", "monthly_quota_kg": 198, "delivered_kg": 24.4, "requested_in_progress_kg": 10.18, "remaining_kg": 163.42, "enforced": false}
}
```
Opcionales: `time_slot`, `notes` (el motivo), `is_urgent` + `urgency_reason`. Usen `can_cancel` y `receipt_available` para mostrar u ocultar los botones.

**Pedido que supera el stock y el cupo (entra con aviso)**
`POST /api/org/distributions` · header `Idempotency-Key`
```json
{
 "requested_distribution_date": "2026-10-08",
 "notes": "[PRUEBA TESIS] Pedido grande",
 "items": [{"product_id": "a41386ad-9e1d-475a-a0b4-cbabd9b1f86c", "quantity_requested": 5000}]
}
```
→ **201** · el pedido igual que arriba, más:
```json
{
 "warnings": [
  {"code": "STOCK_INSUFFICIENT", "field": "items.0.quantity_requested", "message": "Puede que no haya todo lo que pediste de \"Aceite de girasol 900 ml (prueba)\": el banco lo ajusta al aprobar."},
  {"code": "QUOTA_EXCEEDED", "field": null, "message": "Con este pedido se pasan del cupo del mes (198 kg) por 3.976,4 kg."}
 ],
 "quota": {"month": "2026-10", "monthly_quota_kg": 198, "delivered_kg": 24.4, "requested_in_progress_kg": 4150, "remaining_kg": -3976.4, "enforced": false}
}
```

**Error: cuarto pedido esperando respuesta**
`POST /api/org/distributions` · header `Idempotency-Key`
→ **422**
```json
{"success": false, "message": "Ya tenés 3 pedidos esperando respuesta del banco. Esperá a que los revisen o cancelá alguno.", "error_code": "TOO_MANY_OPEN_REQUESTS"}
```

**Error: validación del pedido**
`POST /api/org/distributions` · header `Idempotency-Key`
```json
{"requested_distribution_date": "2020-01-01", "items": [{"product_id": "00000000-0000-4000-8000-000000000000", "quantity_requested": 0}]}
```
→ **422**
```json
{
 "success": false,
 "message": "La fecha de retiro no puede ser anterior a hoy. (and 2 more errors)",
 "errors": {
  "requested_distribution_date": ["La fecha de retiro no puede ser anterior a hoy."],
  "items.0.product_id": ["El producto no existe o no está disponible."],
  "items.0.quantity_requested": ["La cantidad tiene que ser mayor a cero."]
 }
}
```

---

# API organizaciones (10/14) — Pedidos de mercadería (2/2)

Ejemplos reales (tenant de pruebas). El pedido tiene la misma forma que en el alta del post 9.

**Estados del pedido**

| `status` | `status_label` | Qué significa |
|---|---|---|
| `pendiente` | Pendiente de revisión | Lo recibió el banco. Se puede cancelar. |
| `en_revision` | En revisión | El banco lo está mirando. Se puede cancelar. |
| `aprobada` | Aprobado | El banco fijó las cantidades (`quantity_approved`). |
| `programada` / `en_preparacion` | Programado / En preparación | El banco lo está armando. |
| `lista_para_retiro` | Listo para retirar | Ya se puede ir a buscar. Hay remito (`receipt_available: true`). |
| `distribuida` | Entregado | Retirado. Aparece en "lo recibido" (post 11). |
| `rechazada` / `cancelada` / `anulada` | Rechazado / Cancelado / Anulado | Con el motivo en `rejection_reason`. |

**Listar pedidos abiertos**
`GET /api/org/distributions?status=abiertos`
→ **200** (el listado no trae `items`; el detalle sí)
```json
{
 "success": true,
 "data": [
  {
   "id": "b8bb6ec6-dec8-4bb5-b76c-97d397d69d5c",
   "number": "DIST-2026-00050",
   "status": "pendiente",
   "status_label": "Pendiente de revisión",
   "request_date": "2026-10-07",
   "requested_distribution_date": "2026-10-08",
   "scheduled_distribution_date": null,
   "actual_distribution_date": null,
   "time_slot": null,
   "pickup_type": "pickup",
   "total_items": 1,
   "total_kg": 1,
   "is_urgent": false,
   "urgency_reason": null,
   "notes": null,
   "rejection_reason": null,
   "received_by_name": null,
   "receipt_number": null,
   "can_cancel": true,
   "receipt_available": false,
   "requested_by_organization": true,
   "created_at": "2026-10-07T15:15:37.000000Z",
   "updated_at": "2026-10-07T15:15:37.000000Z"
  },
  "… (2 más)"
 ],
 "meta": {"current_page": 1, "last_page": 1, "per_page": 20, "total": 3}
}
```

**Ver un pedido**
`GET /api/org/distributions/f027f358-146c-4aad-9b78-b88e87841c2f`
→ **200** · `{"success": true, "data": { …pedido con items… }}`, igual que el alta.

**Cancelar un pedido pendiente**
`POST /api/org/distributions/a9d534ea-5a60-4344-9d5c-55c4e42b7461/cancel` · header `Idempotency-Key`
```json
{"reason": "Lo pedimos por error"}
```
→ **200**
```json
{
 "success": true,
 "message": "Pedido cancelado",
 "data": {"id": "a9d534ea-5a60-4344-9d5c-55c4e42b7461", "number": "DIST-2026-00049", "status": "cancelada", "status_label": "Cancelado", "rejection_reason": "Cancelado por la organización: Lo pedimos por error", "can_cancel": false, "…": "resto del pedido"}
}
```
`reason` es obligatorio.

**Error: remito antes de que esté listo**
`GET /api/org/distributions/f027f358-146c-4aad-9b78-b88e87841c2f/receipt`
→ **422** · `{"success": false, "message": "El remito está disponible desde que el pedido está listo para retirar."}`

**Pedido listo para retirar** (después de que el banco lo aprobó y lo preparó)
`GET /api/org/distributions/f027f358-146c-4aad-9b78-b88e87841c2f`
→ **200**
```json
{
 "success": true,
 "data": {
  "id": "f027f358-146c-4aad-9b78-b88e87841c2f",
  "number": "DIST-2026-00048",
  "status": "lista_para_retiro",
  "status_label": "Listo para retirar",
  "requested_distribution_date": "2026-10-08",
  "scheduled_distribution_date": "2026-10-08",
  "time_slot": "mañana",
  "can_cancel": false,
  "receipt_available": true,
  "items": [
   {"id": "e3b8c10d-ee89-492f-b226-e4e0efae8932", "product": {"id": "f73b833f-3d8a-4b81-967f-8212e143eb39", "name": "Arroz largo fino 1 kg (prueba)", "brand": null}, "unit": "paquetes", "weight_per_unit_kg": 1, "quantity_requested": 4, "quantity_approved": 4, "quantity_delivered": null, "kg_requested": 4},
   {"id": "50708138-e960-4798-be10-eedfa344287f", "product": {"id": "3ddd6582-7399-4d59-8591-ebec1ac540ae", "name": "Leche entera 1 L (prueba)", "brand": null}, "unit": "litros", "weight_per_unit_kg": 1.03, "quantity_requested": 6, "quantity_approved": 6, "quantity_delivered": null, "kg_requested": 6.18}
  ],
  "…": "resto de los campos"
 }
}
```

**Remito del pedido**
`GET /api/org/distributions/f027f358-146c-4aad-9b78-b88e87841c2f/receipt`
→ **200** · archivo PDF (`application/pdf`). Para mostrarlo o compartirlo en la app, descárguenlo con el mismo header `Authorization`.

**Error: cancelar un pedido ya aprobado**
`POST /api/org/distributions/f027f358-146c-4aad-9b78-b88e87841c2f/cancel` · header `Idempotency-Key`
```json
{"reason": "Ya no"}
```
→ **409**
```json
{"success": false, "message": "El pedido ya está listo para retirar: pedile al banco que lo cancele.", "error_code": "DISTRIBUTION_NOT_CANCELLABLE"}
```

**Aviso que recibe la organización** (en `GET /api/notifications`, post 2)
```json
{
 "type": "pedido_actualizado",
 "title": "El banco canceló tu pedido",
 "body": "El pedido DIST-2026-00048 quedó cancelado: [PRUEBA TESIS] se cancela para devolver el stock",
 "data": {"distribution_id": "f027f358-146c-4aad-9b78-b88e87841c2f", "distribution_number": "DIST-2026-00048", "organization_id": "30ff5546-785b-41c2-8da6-80db4babbebb", "status": "cancelada"},
 "action_url": "/pedidos/f027f358-146c-4aad-9b78-b88e87841c2f"
}
```
Llega con `status` = `aprobada`, `rechazada`, `lista_para_retiro` o `cancelada`. Usen `data.distribution_id` para abrir el pedido.
