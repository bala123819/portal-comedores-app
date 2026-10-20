# API organizaciones (11/14) — Lo recibido y panel nutricional

> Copia del post 11/14 de la serie "API organizaciones", publicada por el Banco en el feed de la orden
> 1149 de GoDubi el 07/10/2026 (post 6505). Es la fuente de verdad del módulo "Lo recibido" y del
> panel nutricional de la app.

| | Endpoint | Qué hace |
|---|---|---|
| `GET` | `/api/org/received` | Todo lo recibido (pedidos entregados y mermas retiradas) en un período, con resumen. Filtros: `from`, `to` (por defecto, últimos 90 días; hasta 1 año), `kind` (`distribution` o `merma`), `page`, `per_page`. |
| `GET` | `/api/org/nutrition` | Lo recibido por grupo nutricional contra el cupo de cada grupo. `month=AAAA-MM` (por defecto, el mes actual) o `from`/`to`. |

**Ejemplos reales** (tenant de pruebas):

**Lo recibido (pedidos y mermas)**
`GET /api/org/received?from=2026-09-01`
→ **200**
```json
{
 "success": true,
 "data": {
  "summary": {
   "period": {"from": "2026-09-01", "to": "2026-10-07"},
   "total_count": 2,
   "total_kg": 40.3,
   "by_kind": {"distribution": {"count": 1, "kg": 24.4}, "merma": {"count": 1, "kg": 15.9}},
   "by_month": [{"month": "2026-10", "count": 2, "kg": 40.3}],
   "last_received_date": "2026-10-07"
  },
  "items": [
   {
    "key": "merma:6a586e25-f1db-4e61-b8bc-9d2708827192",
    "kind": "merma",
    "id": "6a586e25-f1db-4e61-b8bc-9d2708827192",
    "date": "2026-10-07",
    "number": "MRM-20261007-0001",
    "kg": 15.9,
    "items_count": 2,
    "items_preview": [
     {"name": "Yogur bebible 1 L", "quantity": 12, "unit": "unidades", "kg": 12.6},
     {"name": "Pan lactal", "quantity": 6, "unit": "unidades", "kg": 3.3}
    ],
    "more_items": 0,
    "origin": {"tag": "merma", "label": "Rescate de merma"},
    "receipt_number": null,
    "detail_path": "/api/org/assignments/6a586e25-f1db-4e61-b8bc-9d2708827192"
   },
   {
    "key": "distribution:159df99e-4b03-4119-83c9-3a6e5db72b4e",
    "kind": "distribution",
    "id": "159df99e-4b03-4119-83c9-3a6e5db72b4e",
    "date": "2026-10-07",
    "number": "DIST-2026-00047",
    "kg": 24.4,
    "items_count": 3,
    "items_preview": [
     {"name": "Leche entera 1 L (prueba)", "quantity": 12, "unit": "litros", "kg": 12.36},
     {"name": "Arroz largo fino 1 kg (prueba)", "quantity": 10, "unit": "paquetes", "kg": 10},
     {"name": "Atún en lata 170 g (prueba)", "quantity": 12, "unit": "unidades", "kg": 2.04}
    ],
    "more_items": 0,
    "origin": {"tag": "inventario", "label": "Pedido al banco"},
    "receipt_number": "REC-DIST-2026-00047-110326",
    "detail_path": "/api/org/distributions/159df99e-4b03-4119-83c9-3a6e5db72b4e"
   }
  ]
 },
 "meta": {"current_page": 1, "last_page": 1, "per_page": 20, "total": 2}
}
```
- `items_preview` trae hasta 3 productos; `more_items` dice cuántos más hay. Para el detalle completo, `detail_path`.
- `origin.tag` indica de dónde vino: `inventario` (pedido al banco), `merma`, `kit`, `programa` o `donacion_directa`. `origin.label` es el texto para mostrar.
- El `summary` es del período entero, no sólo de la página.

**Sólo mermas**
`GET /api/org/received?kind=merma&from=2026-09-01`
→ **200** · misma forma, sólo con los ítems `merma`.

**Lo recibido por grupo nutricional** (para el panel nutricional)
`GET /api/org/nutrition?month=2026-10`
→ **200**
```json
{
 "success": true,
 "data": {
  "period": {"from": "2026-10-01", "to": "2026-10-31", "months": 1},
  "beneficiaries": {"total_beneficiaries": 6, "services_per_day": 1, "organization_type": "comedor"},
  "groups": [
   {"code": "cereales", "name": "Cereales", "color": null, "received_kg": 3.3, "quota_kg": 59.4, "coverage_pct": 5.6},
   {"code": "frutas_verduras", "name": "Frutas verduras", "color": null, "received_kg": 0, "quota_kg": 69.3, "coverage_pct": 0},
   {"code": "lacteos", "name": "Lacteos", "color": "#4CAF50", "received_kg": 24.96, "quota_kg": 23.76, "coverage_pct": 105.1},
   {"code": "proteinas", "name": "Proteinas animales", "color": "#4CAF50", "received_kg": 2.04, "quota_kg": 29.7, "coverage_pct": 6.9},
   {"code": "aceites", "name": "Aceites", "color": null, "received_kg": 0, "quota_kg": 15.84, "coverage_pct": 0}
  ],
  "unclassified_kg": 10,
  "bulk_kg": 0,
  "totals": {"received_kg": 40.3, "quota_kg": 198, "coverage_pct": 20.4},
  "sources": {"distributions_kg": 24.4, "mermas_kg": 15.9},
  "needs_available": true
 }
}
```
- `quota_kg` es lo que la organización necesita de cada grupo en el período (sale de su cupo); `coverage_pct` = recibido / necesidad.
- `unclassified_kg`: productos recibidos que todavía no tienen grupo nutricional cargado.
- `bulk_kg`: bultos surtidos (cajones mixtos), que no se pueden repartir por grupo.
- Si `needs_available` es `false`, el banco no cargó el cupo por grupo: muestren lo recibido sin porcentaje (`coverage_pct` viene `null`).

**Error: período inválido**
`GET /api/org/received?from=2026-10-10&to=2026-10-01`
→ **422**
```json
{
 "success": false,
 "message": "La fecha \"hasta\" no puede ser anterior a la fecha \"desde\".",
 "errors": {"to": ["La fecha \"hasta\" no puede ser anterior a la fecha \"desde\"."]}
}
```
