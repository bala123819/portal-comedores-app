/**
 * Variables públicas (EXPO_PUBLIC_*). Expo las inyecta en el bundle en tiempo de build,
 * por eso deben leerse con acceso estático `process.env.EXPO_PUBLIC_X`.
 * Nunca poner secretos acá.
 */
export const env = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL || 'https://cloud.mermab.com/api').replace(/\/$/, ''),
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS === 'true',
  whatsappNumber: (process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  agentsUrl: (process.env.EXPO_PUBLIC_AGENTS_URL || '').replace(/\/$/, ''),
  vapidPublicKey: process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || '',
};
