# Ejemplos reales: sesión, perfil y organización (2/6)

Convenciones: `Accept: application/json`; con body `Content-Type: application/json`; con sesión `Authorization: Bearer $TOKEN`. OK: `{"success":true,"data":...}`. Error: `{"success":false,"message":"...","errors":{"campo":["..."]}}`. Los POST llevan `Idempotency-Key` (UUID v4 por operación; se reusa en reintentos). **El token dura 24 h.**

## POST /auth/login
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e2e1ba9d-…", "email": "coordinadora.tesis.api@org.test",
      "first_name": "Coordinadora", "last_name": "Prueba Tesis", "full_name": "Coordinadora Prueba Tesis",
      "avatar_url": null, "tenant_id": "b393b130-…",
      "roles": ["organization_coordinator"], "permissions": ["mermas.edit_own"], "is_verified": false
    },
    "access_token": "<TOKEN>", "token_type": "Bearer", "expires_in": 86400
  }
}
```
`{}` → 422 con error por campo. **Clave incorrecta → 422 con `errors.email`** (no 401).

## GET /auth/me
```json
{ "success": true, "data": {
  "id": "…", "email": "…", "first_name": "Coordinadora", "last_name": "Prueba Tesis",
  "full_name": "Coordinadora Prueba Tesis", "phone": "+54 299 000 0002", "avatar_url": null,
  "tenant_id": "…", "tenant": { "id": "…", "name": "Banco de Alimentos Patagonia (TEST)", "timezone": "America/Argentina/Buenos_Aires" },
  "roles": ["organization_coordinator"], "permissions": ["mermas.edit_own"],
  "is_verified": false, "is_active": true, "last_login_at": "2026-09-29T20:07:03-03:00", "preferences": [] } }
```

## PUT /auth/profile
Todo opcional. `first_name`/`last_name` 2–100; `phone` 6–20 (dígitos, espacios, `+ - ( )`); `preferences` objeto libre. `{"phone":"abc"}` → 422 `errors.phone`.

## PUT /auth/password
Body: `current_password`, `new_password`, **`new_password_confirmation`** (no figura en el OpenAPI). Clave actual incorrecta, confirmación distinta o < 8 caracteres → 422 en `current_password` o `new_password`.

## POST /auth/refresh y /auth/logout
`refresh` devuelve `{access_token, token_type, expires_in}` y **el token anterior deja de servir en el acto**. `logout` revoca el actual.

## GET /org/profile
```json
{ "success": true, "data": {
  "organization": {
    "id": "30ff5546-…", "name": "Comedor Prueba Tesis API", "legal_name": "…", "tax_id": "PRUEBA-TESIS-01",
    "organization_type": "comedor", "email": "contacto.tesis@org.test", "phone": "+54 299 000 0000",
    "total_beneficiaries": 6, "services_per_day": 1, "monthly_quota_kg": 198, "status": "aprobada",
    "pickup_preference": "pickup", "preferred_pickup_days": ["martes","jueves"],
    "preferred_pickup_time_start": "09:00:00", "preferred_pickup_time_end": "12:00:00",
    "has_refrigeration": true, "has_own_vehicle": false, "vehicle_capacity_kg": null,
    "compliance_score": 0, "geographic_zone": null,
    "address": { "street": "Calle Ejemplo 123, Neuquén", "street_number": null, "neighborhood": null,
      "city": "Neuquén", "state": "Neuquén", "postal_code": null,
      "full_address": "Calle Ejemplo 123, Neuquén, Neuquén, Neuquén", "latitude": null, "longitude": null } },
  "user": { "id": "…", "full_name": "Coordinadora Prueba Tesis", "email": "…" } } }
```
`total_beneficiaries` y `monthly_quota_kg` se recalculan solos a partir de las familias.

## GET /org/stats
Sólo `impacto` es útil hoy.
```json
{ "success": true, "data": {
  "postulaciones": { "total": 0, "pendientes": 0, "aprobadas": 0, "rechazadas": 0 },
  "asignaciones": { "total": 0, "pendientes": 0, "completadas": 0, "canceladas": 0, "este_mes": 0 },
  "impacto": { "total_kg_recibidos": 0, "total_distribuciones": 0 },
  "disponibilidad": { "mermas_disponibles": 0 } } }
```

## PUT /org/address
Obligatorios `street`, `city`, `state`, `latitude`, `longitude`. **Dato inválido → 500**: validar antes.
```json
{ "success": true, "message": "Dirección actualizada. No se encontró una zona geográfica compatible.",
  "data": { "address": { "street": "Av. Argentina", "street_number": "1234", "neighborhood": "Centro",
    "city": "Neuquén", "state": "Neuquén", "postal_code": "8300",
    "full_address": "Av. Argentina 1234, Centro, Neuquén, Neuquén (8300)",
    "latitude": "-38.95160000", "longitude": "-68.05910000" },
  "geographic_zone": null, "zone_assigned": false } }
```
Ojo: en la respuesta `latitude`/`longitude` vienen como **string**.
