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
  /**
   * Chat con el asistente (GoDubi webchat, docs/asistente/). Los tres datos son públicos: identifican
   * la publicación del asistente, no dan acceso por sí solos (la sesión se arma con PKCE).
   * `assistantMode`: 'mock' | 'http' | '' (vacío = http en el celular, mock en web por CORS).
   */
  assistantMode: (process.env.EXPO_PUBLIC_ASSISTANT_MODE || '').toLowerCase(),
  assistantBaseUrl: (process.env.EXPO_PUBLIC_ASSISTANT_BASE_URL || 'https://webchat.godubi.com/v1/webchat').replace(/\/$/, ''),
  assistantPublicationId: process.env.EXPO_PUBLIC_ASSISTANT_PUBLICATION_ID || '9806bc2a-7c76-4fe2-8d7a-79ae79544419',
  assistantOrigin: process.env.EXPO_PUBLIC_ASSISTANT_ORIGIN || 'https://app-organizaciones.mermab.com',
  /** Organización fija que atiende hoy el asistente: si la sesión de la app es de otra, se avisa. */
  assistantOrgName: process.env.EXPO_PUBLIC_ASSISTANT_ORG_NAME || 'Comedor Prueba Tesis API',
};
