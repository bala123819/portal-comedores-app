# Cómo probar (6/6)

## 1. Script de humo
- Versión original del BdA: `scripts/smoke-test.sh` (necesita bash, curl, **jq** y `uuidgen` o `/proc`; en Windows conviene WSL o Git Bash con jq instalado).
- Versión equivalente sin dependencias, en TypeScript: `npm run smoke` (`scripts/smoke-test.ts`). Hace los mismos ~22 pedidos, con la misma lógica PASS/FAIL.

```bash
# credenciales en .env: CHECK_API_EMAIL y CHECK_API_PASSWORD
npm run smoke
```
Resultado esperado: `RESULTADO: 21 PASS, 0 FAIL`. No modifica datos de negocio: sólo crea y borra un aviso de prueba en la propia bandeja y abre/cierra sesión.

## 2. Postman
Importar `https://cloud.mermab.com/docs/collection.json`, hacer login, pegar `data.access_token` en *Authorization › Bearer Token*. Ojo: >500 requests, casi todos del panel del banco (403 con este usuario).

## 3. Scribe
`https://cloud.mermab.com/docs/` con *Try It Out*. Guiarse por la lista de endpoints de `01-guia.md`.

## 4. Reglas
- Es **producción compartida**: nada de pruebas de carga ni loops.
- Si un endpoint responde distinto de la guía: correr el smoke test y reportar en el hilo el request y la respuesta **sin el token**.
