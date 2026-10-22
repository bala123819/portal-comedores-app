# API organizaciones (3/14) — Perfil de la organización

> Copia del post 3/14 de la serie "API organizaciones" publicada por el Banco en el feed de la orden #1149 de GoDubi el 07/10/2026 (post 6497).
> Verificado contra el servidor el 20/10/2026: ver D-16 y G-18.

| | Endpoint | Qué hace |
|---|---|---|
| `GET` | `/api/org/profile` | Datos de la organización: contacto, dirección, zona, cupo, días y horarios de retiro. |
| `PUT` | `/api/org/profile` | Edita teléfono, email, descripción, días/horario de retiro, heladera y capacidad del vehículo. Lo demás lo cambia el banco (422 `FIELD_NOT_EDITABLE`). |
| `PUT` | `/api/org/address` | Carga o corrige la dirección (con latitud y longitud). |
| `GET` | `/api/org/stats` | Números de la organización: postulaciones, retiros, kilos recibidos. |
| `GET` | `/api/org/social-data` | Ficha social que relevó el banco (servicios, comidas, cocina, agua). Sólo lectura. |
| `GET` | `/api/org/logistics` | Capacidad logística: frío, transporte y contacto operativo. |
| `PUT` | `/api/org/logistics` | Actualiza la capacidad logística. |
| `GET` | `/api/org/documents` | Documentos de la organización, con vencimiento y si están verificados. |
| `GET` | `/api/org/documents/{id}/download` | Descarga un documento (archivo). |
| `GET` | `/api/org/requirements` | Qué documentación pide el banco y en qué estado está cada una. |

**Ejemplos reales** (tenant de pruebas; listados recortados con "… (N más)"):

**Ver el perfil**
`GET /api/org/profile`
→ **200**
```json
{
 "success": true,
 "data": {
  "organization": {
   "id": "30ff5546-785b-41c2-8da6-80db4babbebb",
   "name": "Comedor Prueba Tesis API",
   "legal_name": "Comedor Prueba Tesis API (datos ficticios)",
   "tax_id": "PRUEBA-TESIS-01",
   "organization_type": "comedor",
   "email": "comedor.prueba@org.test",
   "phone": "+54 299 000 0099",
   "description": "[PRUEBA TESIS] Comedor de prueba: almuerzo de lunes a viernes para 40 chicos.",
   "total_beneficiaries": 6,
   "services_per_day": 1,
   "monthly_quota_kg": 198,
   "status": "aprobada",
   "pickup_preference": "pickup",
   "preferred_pickup_days": ["lunes", "jueves"],
   "preferred_pickup_time_start": "09:00:00",
   "preferred_pickup_time_end": "12:00:00",
   "has_refrigeration": true,
   "has_own_vehicle": false,
   "vehicle_capacity_kg": "300.00",
   "compliance_score": 0,
   "geographic_zone": {
    "id": "cd816fa3-73b0-4488-ba66-432eb1a4f206",
    "code": "PT-TESIS",
    "name": "Zona Prueba Tesis",
    "max_radius_km": 50,
    "is_active": true,
    "assigned_at": "2026-10-07T14:16:05.000000Z",
    "assignment_method": "manual"
   },
   "address": {
    "street": "Av. Argentina",
    "street_number": "1234",
    "neighborhood": "Centro",
    "city": "Neuquén",
    "state": "Neuquén",
    "postal_code": "8300",
    "full_address": "Av. Argentina 1234, Centro, Neuquén, Neuquén (8300)",
    "latitude": "-26.82709178",
    "longitude": "-65.29185585"
   }
  },
  "user": {
   "id": "e2e1ba9d-852a-4cc7-89e5-3ca84e1c5598",
   "full_name": "Coordinadora Prueba Tesis",
   "email": "coordinadora.tesis.api@org.test"
  }
 }
}
```

**Editar el perfil (campos permitidos)**
`PUT /api/org/profile`
```json
{
 "phone": "+54 299 000 0099",
 "email": "comedor.prueba@org.test",
 "description": "[PRUEBA TESIS] Comedor de prueba: almuerzo de lunes a viernes para 40 chicos.",
 "pickup_preference": "pickup",
 "preferred_pickup_days": ["lunes", "jueves"],
 "preferred_pickup_time_start": "09:00",
 "preferred_pickup_time_end": "12:00",
 "has_refrigeration": true,
 "vehicle_capacity_kg": 300
}
```
→ **200** · misma forma que la respuesta de «Ver el perfil», con los datos actualizados.

**Error: campo que maneja el banco**
`PUT /api/org/profile`
```json
{
 "tax_id": "30-00000000-0",
 "has_own_vehicle": true
}
```
→ **422**
```json
{
 "success": false,
 "message": "Estos datos no se pueden cambiar desde la app: tax_id, has_own_vehicle. Pedíselo al banco.",
 "error_code": "FIELD_NOT_EDITABLE",
 "details": {
  "fields": ["tax_id", "has_own_vehicle"],
  "editable_fields": ["email", "phone", "description", "pickup_preference", "preferred_pickup_days", "preferred_pickup_time_start", "preferred_pickup_time_end", "has_refrigeration", "vehicle_capacity_kg"]
 }
}
```

**Error: validación (horario y días)**
`PUT /api/org/profile`
```json
{
 "preferred_pickup_days": ["Lunes"],
 "preferred_pickup_time_start": "15:00",
 "preferred_pickup_time_end": "10:00"
}
```
→ **422**
```json
{
 "success": false,
 "message": "Los días van en minúscula y sin tilde: lunes, martes, miercoles, jueves, viernes, sabado.",
 "errors": {
  "preferred_pickup_days.0": ["Los días van en minúscula y sin tilde: lunes, martes, miercoles, jueves, viernes, sabado."]
 }
}
```

**Estadísticas de la organización**
`GET /api/org/stats`
→ **200**
```json
{
 "success": true,
 "data": {
  "postulaciones": {"total": 3, "pendientes": 0, "aprobadas": 2, "rechazadas": 0},
  "asignaciones": {"total": 2, "pendientes": 0, "completadas": 1, "canceladas": 1, "este_mes": 2},
  "impacto": {"total_kg_recibidos": 42.4, "total_distribuciones": 2},
  "disponibilidad": {"mermas_disponibles": 0}
 }
}
```

**Ficha social**
`GET /api/org/social-data`
→ **200**
```json
{
 "success": true,
 "data": {
  "organization_id": "30ff5546-785b-41c2-8da6-80db4babbebb",
  "fields": {
   "fantasy_name": null,
   "interviewed_by": null,
   "founding_year": null,
   "has_legal_status": false,
   "legal_status_type": null,
   "delivers_viandas": false,
   "viandas_notes": null,
   "generates_own_income": false,
   "income_methods": [],
   "water_source": null,
   "has_bathroom": false,
   "cooking_sources": [],
   "property_ownership": null,
   "storage_methods": [],
   "terms_accepted_at": null,
   "terms_accepted_by": null
  },
  "fiscal_address": null,
  "services": [],
  "meal_schedule": [],
  "funding_sources": [],
  "kitchen_equipment": []
 }
}
```

**Capacidad logística**
`GET /api/org/logistics`
→ **200**
```json
{
 "success": true,
 "data": {
  "id": "4d3591ad-6804-4ace-a79f-a3cb961de5fb",
  "organization_id": "30ff5546-785b-41c2-8da6-80db4babbebb",
  "cold_capacity_m3": 2.5,
  "cold_capacity_type": null,
  "own_transport_capable": false,
  "transport_vehicle_type": null,
  "transport_notes": "[PRUEBA TESIS] retiramos en remis",
  "operational_contact_name": "Coordinadora Prueba",
  "operational_contact_phone": "+54 299 000 0001",
  "operational_contact_email": null,
  "created_at": "2026-10-07T11:27:33-03:00",
  "updated_at": "2026-10-07T12:06:30-03:00"
 }
}
```

**Actualizar la capacidad logística**
`PUT /api/org/logistics`
```json
{
 "cold_capacity_m3": 2.5,
 "own_transport_capable": false,
 "operational_contact_name": "Coordinadora Prueba",
 "operational_contact_phone": "+54 299 000 0001",
 "transport_notes": "[PRUEBA TESIS] retiramos en remis"
}
```
→ **200** · `{"success": true, "message": "Capacidad logística actualizada", "data": {…}}` con la misma forma que «Capacidad logística».

**Documentos**
`GET /api/org/documents`
→ **200**
```json
{
 "success": true,
 "data": [
  {
   "id": "2e205742-9ed6-4a5f-9d0f-f0a74361b7e2",
   "document_type": "estatuto",
   "document_name": "Estatuto [PRUEBA TESIS]",
   "mime_type": "application/pdf",
   "file_size": 193,
   "expires_at": "2027-12-31",
   "is_expired": false,
   "is_verified": false,
   "created_at": "2026-10-07T15:05:07.000000Z",
   "download_path": "/api/org/documents/2e205742-9ed6-4a5f-9d0f-f0a74361b7e2/download"
  }
 ]
}
```

**Descargar un documento**
`GET /api/org/documents/2e205742-9ed6-4a5f-9d0f-f0a74361b7e2/download`
→ **200** · el archivo (`application/pdf`, 193 bytes).

**Error: documento inexistente o ajeno**
`GET /api/org/documents/00000000-0000-4000-8000-000000000000/download`
→ **404** · `{"success": false, "message": "Documento no encontrado", "error_code": "DOCUMENT_NOT_FOUND"}`

**Requisitos de documentación**
`GET /api/org/requirements`
→ **200**
```json
{
 "success": true,
 "data": [
  {
   "id": "6087ab46-701f-4c23-9869-94effd0fb749",
   "document_type": "personeria_juridica",
   "label": "Personería Jurídica",
   "is_required": true,
   "has_expiration": false,
   "notes": null,
   "sort_order": 1,
   "scope": "global",
   "status": "missing",
   "document": null
  },
  "… (3 más)"
 ]
}
```

**Error: dirección incompleta**
`PUT /api/org/address`
```json
{
 "street": "Av. Argentina",
 "city": "Neuquén"
}
```
→ **422**
```json
{
 "success": false,
 "message": "Error de validación",
 "errors": {
  "state": ["The state field is required."],
  "latitude": ["The latitude field is required."],
  "longitude": ["The longitude field is required."]
 }
}
```
La dirección completa lleva `street`, `city`, `state`, `latitude` y `longitude` (obligatorios) y, opcionales, `street_number`, `neighborhood`, `postal_code`.
