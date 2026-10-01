#!/usr/bin/env bash
# smoke-test.sh — script del Banco de Alimentos (docs/bda/06-como-probar.md), sin cambios de lógica.
# Recorre los endpoints de la app de organizaciones que HOY funcionan y dice PASS/FAIL en cada uno.
#
# Requiere: bash, curl y jq. Alternativa sin dependencias: `npm run smoke`.
# Uso:
#   export MERMAB_EMAIL='...'
#   export MERMAB_PASSWORD='...'
#   ./scripts/smoke-test.sh
#
# No modifica datos de negocio: sólo crea y borra un aviso de prueba en TU bandeja y abre/cierra sesión.
# Hace ~22 pedidos (el límite del coordinador es 60 por minuto y el del login 10 por minuto).

set -u
API="${MERMAB_API:-https://cloud.mermab.com/api}"
: "${MERMAB_EMAIL:?Falta MERMAB_EMAIL}"
: "${MERMAB_PASSWORD:?Falta MERMAB_PASSWORD}"
command -v jq >/dev/null || { echo "Falta jq (https://jqlang.github.io/jq/)"; exit 2; }

BODY_FILE="$(mktemp)"; trap 'rm -f "$BODY_FILE"' EXIT
TOKEN=""; CODE=""; PASS=0; FAIL=0

# call METHOD PATH [JSON]  -> deja el código en $CODE y el cuerpo en $BODY_FILE
call() {
  local method=$1 path=$2 data=${3:-}
  local args=(-sS -o "$BODY_FILE" -w '%{http_code}' -X "$method" -H 'Accept: application/json')
  [ -n "$TOKEN" ] && args+=(-H "Authorization: Bearer $TOKEN")
  [ "$method" = "POST" ] && args+=(-H "Idempotency-Key: $(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen)")
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' -d "$data")
  CODE=$(curl "${args[@]}" "$API$path" 2>/dev/null || echo "000")
  sleep 0.3
}

# expect "nombre" CODIGO_ESPERADO [filtro jq que debe dar true]
expect() {
  local name=$1 want=$2 filter=${3:-}
  local ok=1 detail="HTTP $CODE"
  [ "$CODE" = "$want" ] || { ok=0; detail="esperaba HTTP $want y llegó $CODE"; }
  if [ $ok -eq 1 ] && [ -n "$filter" ]; then
    jq -e "$filter" "$BODY_FILE" >/dev/null 2>&1 || { ok=0; detail="HTTP $CODE pero la respuesta no cumple: $filter"; }
  fi
  if [ $ok -eq 1 ]; then PASS=$((PASS+1)); printf 'PASS  %-58s %s\n' "$name" "$detail"
  else FAIL=$((FAIL+1)); printf 'FAIL  %-58s %s\n' "$name" "$detail"; head -c 300 "$BODY_FILE"; echo; fi
}
field() { jq -r "$1" "$BODY_FILE"; }

echo "API: $API"; echo

call GET /health;                                   expect "GET  /health"                               200 '.status == "ok"'
call GET /capabilities;                             expect "GET  /capabilities sin token da 401"        401

call POST /auth/login "{\"email\":\"$MERMAB_EMAIL\",\"password\":\"$MERMAB_PASSWORD\"}"
expect "POST /auth/login" 200 '.data.access_token != null and (.data.user.roles | index("organization_coordinator"))'
TOKEN=$(field '.data.access_token // empty')
[ -n "$TOKEN" ] || { echo; echo "Sin token no se puede seguir. Revisá el mail y la clave."; exit 1; }

call GET /auth/me;                                  expect "GET  /auth/me"                              200 '.data.email != null'
call GET /capabilities;                             expect "GET  /capabilities"                         200 '.data.rate_limits.general != null'
call GET /org/profile;                              expect "GET  /org/profile"                          200 '.data.organization.id != null'
call GET /org/stats;                                expect "GET  /org/stats"                            200 '.data.impacto != null'

call GET '/org/families?per_page=2';                expect "GET  /org/families?per_page=2"              200 '.data | type == "array"'
FAMILY_ID=$(field '.data[0].id // empty')
if [ -n "$FAMILY_ID" ]; then
  call GET "/org/families/$FAMILY_ID";              expect "GET  /org/families/{id}"                    200 '.data.id != null'
else
  echo "SKIP  GET /org/families/{id} (la organización no tiene familias)"
fi
call GET /org/families/demographics;                expect "GET  /org/families/demographics"            200 '.data.total_families != null'
call GET '/org/families?source=cualquiera';         expect "GET  /org/families?source=x da 422"         422 '.errors.source != null'
call GET /org/families/00000000-0000-4000-8000-000000000000; expect "GET  /org/families/{uuid inexistente} da 404" 404

call GET /notifications/unread-count;               expect "GET  /notifications/unread-count"           200 '.data.count != null'
call GET '/notifications?per_page=5';               expect "GET  /notifications"                        200 '.data.data | type == "array"'
call POST /notifications/test;                      expect "POST /notifications/test"                   200 '.data.notification.id != null'
NOTIF_ID=$(field '.data.notification.id // empty')
if [ -n "$NOTIF_ID" ]; then
  call POST "/notifications/$NOTIF_ID/read";        expect "POST /notifications/{id}/read"              200
  call DELETE "/notifications/$NOTIF_ID";           expect "DELETE /notifications/{id}"                 200
fi

call PUT /auth/profile '{"phone":"abc"}';           expect "PUT  /auth/profile con teléfono inválido da 422" 422 '.errors.phone != null'
call GET /organizations;                            expect "GET  /organizations (ruta del banco) da 403" 403

call POST /auth/logout;                             expect "POST /auth/logout"                          200
call GET /auth/me;                                  expect "GET  /auth/me con el token cerrado da 401"  401

echo; echo "RESULTADO: $PASS PASS, $FAIL FAIL"
[ $FAIL -eq 0 ]
