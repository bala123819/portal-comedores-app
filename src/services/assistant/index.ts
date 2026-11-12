import { Platform } from 'react-native';
import { env } from '@/lib/env';
import { createAssistantClient } from './client';
import { createMockFetch } from './mock';

/**
 * Punto único de acceso al chat con el asistente.
 * - Por defecto (o `EXPO_PUBLIC_ASSISTANT_MODE=http`): API real de GoDubi, en el celular y en web.
 * - `EXPO_PUBLIC_ASSISTANT_MODE=mock`: simulado, sin red.
 *
 * En web el navegador bloquea la API por CORS, así que se pasa por el proxy del servidor de
 * desarrollo (`/api-asistente`, scripts/assistant-proxy.js) o por `EXPO_PUBLIC_ASSISTANT_WEB_URL`.
 */
const mode: 'http' | 'mock' = env.assistantMode === 'mock' ? 'mock' : 'http';

const baseUrl = Platform.OS === 'web' && mode === 'http' ? env.assistantWebUrl : env.assistantBaseUrl;

export const assistant = createAssistantClient({
  mode,
  baseUrl,
  publicationId: env.assistantPublicationId,
  origin: env.assistantOrigin,
  fetch: mode === 'mock' ? createMockFetch(env.assistantBaseUrl) : (url, init) => fetch(url, init),
});

export { assistantErrorMessage, AssistantError, isAssistantError } from './errors';
export * from './types';
