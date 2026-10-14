> **Origen:** post "API organizaciones (8/14) — Interacciones con el banco" publicado por el Banco en GoDubi
> (orden 1149 "Desarrollo App - tesis", post 6502, 2026-10-07). Copia textual; los ejemplos son del
> tenant de pruebas *Banco de Alimentos Patagonia (TEST)* con datos ficticios. Estos endpoints **no están en
> el OpenAPI** del repo (`src/services/api/schema.d.ts` sólo tiene `/organizations/{id}/interactions`, de
> otro rol): los tipos de la app se escribieron a mano a partir de este documento.

# API organizaciones (8/14) — Interacciones con el banco

| | Endpoint | Qué hace |
|---|---|---|
| `POST` | `/api/org/interactions` | Deja un `suceso`, `solicitud`, `consulta` o `reclamo`. Al banco le llega un aviso. |
| `GET` | `/api/org/interactions` | Interacciones de la organización. Filtros: `type`, `status` (`pendiente` / `atendida`), `per_page`. |
| `GET` | `/api/org/interactions/{id}` | Una interacción. |
| `GET` | `/api/org/interactions/summary` | Cantidades por tipo y estado, y por mes. |

Es el canal de la organización con el banco: contar algo que pasó (`suceso`), pedir algo que no está en el catálogo (`solicitud`), preguntar (`consulta`) o reclamar (`reclamo`). Quedan `pendiente` hasta que el banco las atiende; ahí pasan a `atendida` con `attended_at`.

**Ejemplos reales** (tenant de pruebas):

**Dejar una solicitud**
`POST /api/org/interactions` · header `Idempotency-Key`
```json
{
 "interaction_type": "solicitud",
 "title": "[PRUEBA TESIS] Necesitamos leche",
 "notes": "Para 40 chicos, esta semana."
}
```
→ **201**
```json
{
 "success": true,
 "message": "Interacción enviada al banco",
 "data": {
  "id": "26a2f75c-3051-45d1-bf32-8bff943987ed",
  "interaction_type": "solicitud",
  "type_label": "Solicitud",
  "title": "[PRUEBA TESIS] Necesitamos leche",
  "notes": "Para 40 chicos, esta semana.",
  "status": "pendiente",
  "attended_at": null,
  "created_by": {"id": "e2e1ba9d-852a-4cc7-89e5-3ca84e1c5598", "name": "Coordinadora Prueba Tesis"},
  "created_at": "2026-10-07T15:13:19.000000Z"
 }
}
```

**Contar un suceso**
`POST /api/org/interactions` · header `Idempotency-Key`
```json
{
 "interaction_type": "suceso",
 "title": "[PRUEBA TESIS] Se cortó la luz en el comedor",
 "notes": "Perdimos parte de la mercadería fresca."
}
```
→ **201** · misma forma que la solicitud, con `"interaction_type": "suceso"` y `"type_label": "Suceso"`.

**Error: tipo no permitido**
`POST /api/org/interactions` · header `Idempotency-Key`
```json
{"interaction_type": "visita", "title": "x"}
```
→ **422**
```json
{
 "success": false,
 "message": "El tipo debe ser suceso, solicitud, consulta o reclamo.",
 "errors": {"interaction_type": ["El tipo debe ser suceso, solicitud, consulta o reclamo."]}
}
```
`title` es obligatorio (hasta 255 caracteres); `notes` es opcional (hasta 5000).

**Listar interacciones**
`GET /api/org/interactions?status=pendiente`
→ **200**
```json
{
 "success": true,
 "data": [
  {
   "id": "12dccc21-f38f-46c7-b1bf-a83d77f8667d",
   "interaction_type": "suceso",
   "type_label": "Suceso",
   "title": "[PRUEBA TESIS] Se cortó la luz en el comedor",
   "notes": "Perdimos parte de la mercadería fresca.",
   "status": "pendiente",
   "attended_at": null,
   "created_by": {"id": "e2e1ba9d-852a-4cc7-89e5-3ca84e1c5598", "name": "Coordinadora Prueba Tesis"},
   "created_at": "2026-10-07T15:13:20.000000Z"
  },
  "… (3 más)"
 ],
 "meta": {"current_page": 1, "last_page": 1, "per_page": 20, "total": 4}
}
```

**Ver una interacción**
`GET /api/org/interactions/26a2f75c-3051-45d1-bf32-8bff943987ed`
→ **200** · `{"success": true, "data": { … }}` con la misma forma que el alta.

**Resumen por tipo y estado**
`GET /api/org/interactions/summary`
→ **200**
```json
{
 "success": true,
 "data": {
  "total": 4,
  "pendientes": 4,
  "by_type": {
   "suceso": {"total": 2, "pendientes": 2},
   "solicitud": {"total": 2, "pendientes": 2},
   "consulta": {"total": 0, "pendientes": 0},
   "reclamo": {"total": 0, "pendientes": 0}
  },
  "by_month": [{"month": "2026-10", "total": 4}]
 }
}
```
