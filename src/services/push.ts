/**
 * Push nativo: la API solo acepta suscripciones Web Push (G-06), no tokens de Expo/FCM.
 * Queda deshabilitado hasta que el backend lo soporte. Versión web: `push.web.ts`.
 */
export type PushStatus = 'unsupported' | 'unconfigured' | 'denied' | 'subscribed' | 'available';

export async function getPushStatus(): Promise<PushStatus> {
  return 'unsupported';
}

export async function enablePush(): Promise<PushStatus> {
  return 'unsupported';
}

export async function disablePush(): Promise<void> {}
