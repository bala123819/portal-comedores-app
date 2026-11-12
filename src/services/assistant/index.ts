import { Platform } from 'react-native';
import { env } from '@/lib/env';
import { createAssistantClient } from './client';
import { createMockFetch } from './mock';

/**
 * Punto único de acceso al chat con el asistente.
 * - `EXPO_PUBLIC_ASSISTANT_MODE=http`: API real de GoDubi.
 * - `EXPO_PUBLIC_ASSISTANT_MODE=mock`: simulado, sin red.
 * - Vacío: real en el celular y simulado en web, porque el navegador bloquea la API por CORS.
 */
const mode: 'http' | 'mock' =
  env.assistantMode === 'mock' || env.assistantMode === 'http'
    ? env.assistantMode
    : Platform.OS === 'web'
      ? 'mock'
      : 'http';

export const assistant = createAssistantClient({
  mode,
  baseUrl: env.assistantBaseUrl,
  publicationId: env.assistantPublicationId,
  origin: env.assistantOrigin,
  fetch: mode === 'mock' ? createMockFetch(env.assistantBaseUrl) : (url, init) => fetch(url, init),
});

export { assistantErrorMessage, AssistantError, isAssistantError } from './errors';
export * from './types';
