import { router, type Href } from 'expo-router';

/**
 * Vuelve a la pantalla anterior o, si no hay historial, va a `fallback`. En web pasa cuando la
 * pantalla se abrió directo (recargar, un link): `router.back()` solo no hace nada y el formulario
 * quedaba abierto después de guardar, con riesgo de guardar dos veces (P-23).
 */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
