# Ejemplos reales: familias y avisos (3/6)

## GET /org/families
Filtros: `search` (nombre o código), `status` (`activa`, `inactiva`, `suspendida`), `source` (`manual` por defecto, `program_enrollment` o `all`), `page`, `per_page` (25 por defecto). `source` inválido → 422 **en inglés** ("The selected source is invalid.").

Respuesta `{ success, data: [...], meta }`. Una familia:
```json
{
  "id": "87809bec-…", "organization_id": "30ff5546-…", "is_direct": false, "source": "manual",
  "code": "FAM-2026-0030", "name": "Familia Ejemplo Dos", "registration_date": "2026-09-02",
  "phone": null, "email": null, "total_members": 2, "status": "activa", "notes": null,
  "special_needs_notes": null, "housing_situation": "propietario",
  "family_type": { "id": "…", "code": "madre_sola_con_hijos", "name": "Madre sola con hijos", "icon": "mdi-human-female-boy", "color": "#E91E63" },
  "members": [ {
    "id": "…", "family_id": "…", "first_name": "Marta", "last_name": "Muestra", "full_name": "Marta Muestra",
    "document_number": "90000004", "document_type": "dni", "birth_date": "1990-11-22", "age": 35,
    "age_group": "adults_18_64", "gender": "femenino", "relationship": "jefe_hogar", "is_head_of_household": true,
    "phone": null, "email": null, "is_pregnant": true, "is_nursing_mother": false, "is_diabetic": false,
    "is_celiac": false, "is_lactose_intolerant": false, "has_disability": false, "disability_description": null,
    "other_conditions": null, "employment_level": null, "education_level": null,
    "has_special_conditions": true, "nutritional_weight": 1.3, "status": "activo", "notes": null } ],
  "head_of_household": { "id": "…", "full_name": "Marta Muestra", "document_number": "90000004" },
  "created_at": "…", "updated_at": "…"
}
```

## GET /org/families/{id}
Igual que un ítem de la lista, más `address` (puede ser `null`). Id de otra organización o inexistente → 404. **Id no UUID → 500** (bug).

## GET /org/families/demographics
```json
{ "success": true, "data": {
  "total_families": 3, "total_members": 6, "weighted_beneficiaries": 5.5,
  "family_types": [ { "name": "Adultos mayores (65+)", "code": "adultos_mayores", "count": 1 } ],
  "age_groups": { "infants_0_2": 1, "children_3_12": 1, "teens_13_17": 1, "adults_18_64": 2, "seniors_65_plus": 1 },
  "special_conditions": { "pregnant_women": 1, "nursing_mothers": 0, "diabetics": 1, "celiacs": 1, "lactose_intolerant": 0, "disabled": 0 } } }
```

## Avisos
`GET /notifications` pagina como **`{data:{data:[...], meta}}`** con `meta.unread_count`. Filtros: `page`, `per_page`, `unread=true`, `type`.
```json
{ "id": "a2dd8761-…", "type": "sistema", "title": "Notificación de Prueba",
  "body": "¡Las notificaciones están funcionando correctamente!", "data": { "test": true },
  "action_url": "/notifications", "icon": "/icons/notification-default.png",
  "is_read": false, "read_at": null, "created_at": "2026-09-29T23:10:27.000000Z" }
```
- `GET /notifications/unread-count` → `{ data: { count } }`
- `POST /notifications/test` → `{ data: { message, notification } }` (crea un aviso en la propia bandeja)
- `POST /notifications/read-all` → `{ data: { marked_count, unread_count } }`
- `DELETE /notifications/{id}` → `{ data: { message, unread_count } }` (inexistente → 404 "Notificación no encontrada")
- `DELETE /notifications` → `{ data: { deleted_count, unread_count } }`
- `POST /notifications/{id}/read` → el aviso con `is_read: true`
