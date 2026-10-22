> **Origen:** post "API organizaciones (4/14) — Contactos (padrón de la organización)" publicado por el Banco en GoDubi
> (orden 1149 "Desarrollo App - tesis", post 6498, 2026-10-07). Copia textual; los ejemplos son del
> tenant de pruebas *Banco de Alimentos Patagonia (TEST)* con datos ficticios. Estos endpoints **no están en
> el OpenAPI** del repo (que sólo tiene `/organizations/{id}/contacts*`, de otro rol): los tipos de la app se
> escribieron a mano a partir de este documento. Verificado contra el servidor el 2026-10-20 (ver bitácora).

# API organizaciones (4/14) — Contactos (padrón de la organización)

| | Endpoint | Qué hace |
|---|---|---|
| `GET` | `/api/org/contacts` | Personas de la organización, con `pickup_authorized` (si el banco la autorizó a retirar). |
| `POST` | `/api/org/contacts` | Agrega una persona. El DNI no se puede repetir. |
| `PUT` | `/api/org/contacts/{id}` | Edita una persona. Si el banco ya la autorizó, nombre y DNI quedan fijos (409). |
| `DELETE` | `/api/org/contacts/{id}` | Da de baja una persona (no si está declarada para un retiro en curso: 409 `CONTACT_DECLARED_FOR_PICKUP`). |

Autorizar a alguien a retirar lo hace el banco. Si necesitan que autoricen a una persona, cárguenla acá con su DNI y pídanlo con una interacción de tipo `solicitud` (post 8).

**Ejemplos reales** (tenant de pruebas):

**Listar contactos**
`GET /api/org/contacts`
→ **200**
```json
{
 "success": true,
 "data": [
  {
   "id": "b4de777e-22f8-42a0-83d6-ef0b06eb8e4c",
   "name": "Coordinadora Prueba",
   "position": null,
   "phone": "+54 299 000 0001",
   "email": null,
   "dni": null,
   "is_primary": true,
   "pickup_authorized": false,
   "authorizations": []
  },
  {
   "id": "a99738d2-aef3-4e3e-90d8-d3f24b97cdb7",
   "name": "Retirante Autorizado Prueba",
   "position": "Voluntario",
   "phone": "+54 299 000 0002",
   "email": null,
   "dni": "99000001",
   "is_primary": false,
   "pickup_authorized": true,
   "authorizations": [
    {"scope_type": "all", "valid_from": null, "valid_until": null}
   ]
  }
 ]
}
```

**Agregar un contacto**
`POST /api/org/contacts` · header `Idempotency-Key`
```json
{
 "name": "Marta Prueba Tesis",
 "position": "Cocinera",
 "phone": "+54 299 000 0005",
 "email": "marta.prueba@org.test",
 "dni": "99.000.005"
}
```
→ **201** (el DNI se guarda sólo con números)
```json
{
 "success": true,
 "message": "Contacto agregado",
 "data": {
  "id": "9c4e0573-5fd2-48d5-8ebd-4aecaa395223",
  "name": "Marta Prueba Tesis",
  "position": "Cocinera",
  "phone": "+54 299 000 0005",
  "email": "marta.prueba@org.test",
  "dni": "99000005",
  "is_primary": false,
  "pickup_authorized": false,
  "authorizations": []
 }
}
```

**Error: DNI repetido en la organización**
`POST /api/org/contacts` · header `Idempotency-Key`
```json
{"name": "Otra Marta", "dni": "99000005"}
```
→ **422**
```json
{
 "success": false,
 "message": "Ya hay un contacto de la organización con ese DNI.",
 "errors": {"dni": ["Ya hay un contacto de la organización con ese DNI."]}
}
```

**Editar un contacto**
`PUT /api/org/contacts/9c4e0573-5fd2-48d5-8ebd-4aecaa395223`
```json
{"position": "Voluntaria", "is_primary": false}
```
→ **200**
```json
{
 "success": true,
 "message": "Contacto actualizado",
 "data": {
  "id": "9c4e0573-5fd2-48d5-8ebd-4aecaa395223",
  "name": "Marta Prueba Tesis",
  "position": "Voluntaria",
  "phone": "+54 299 000 0005",
  "email": "marta.prueba@org.test",
  "dni": "99000005",
  "is_primary": false,
  "pickup_authorized": false,
  "authorizations": []
 }
}
```
`is_primary: true` en otro contacto lo convierte en el principal (sólo hay uno).

**Error: cambiar el DNI de alguien autorizado por el banco**
`PUT /api/org/contacts/a99738d2-aef3-4e3e-90d8-d3f24b97cdb7`
```json
{"dni": "11111111"}
```
→ **409**
```json
{
 "success": false,
 "message": "Esta persona está autorizada por el banco para retirar: no se le puede cambiar el nombre ni el DNI. Si es otra persona, cargala como contacto nuevo y pedile al banco que la autorice.",
 "error_code": "CONTACT_IDENTITY_LOCKED"
}
```
El teléfono, el cargo y el email sí se pueden cambiar.

**Error: contacto de otra organización**
`PUT /api/org/contacts/7f0377fa-d316-46c7-9bba-93247f5ace82`
```json
{"name": "Pisado"}
```
→ **404**
```json
{"success": false, "message": "Contacto no encontrado", "error_code": "CONTACT_NOT_FOUND"}
```

**Dar de baja un contacto**
`DELETE /api/org/contacts/9c4e0573-5fd2-48d5-8ebd-4aecaa395223`
→ **200**
```json
{"success": true, "message": "Contacto dado de baja"}
```

**Error: dar de baja a alguien declarado para un retiro en curso**
`DELETE /api/org/contacts/a99738d2-aef3-4e3e-90d8-d3f24b97cdb7`
→ **409**
```json
{
 "success": false,
 "message": "Esta persona está declarada para retirar una merma en curso. Dala de baja de ese retiro primero.",
 "error_code": "CONTACT_DECLARED_FOR_PICKUP",
 "details": {"assignment_ids": ["f471da48-4a64-433d-b9ca-21e344d51930"]}
}
```
