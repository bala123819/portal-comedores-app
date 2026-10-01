import { z } from 'zod';
import { ApiError, kindFromStatus } from '@/services/api/errors';
import type { AgentRecipeCard, AgentReply, AgentsProvider } from './types';

/**
 * Proveedor HTTP hacia el orquestador de agentes (n8n / GoDubi) en EXPO_PUBLIC_AGENTS_URL.
 * Contrato: docs/agentes-contrato.md (versión 1).
 * No manda el token de Mermab (fase 1, D-10): sólo contexto mínimo (ids).
 */
export const AGENTS_CONTRACT_VERSION = '1';
const TIMEOUT_MS = 30_000;

const recipeCard = z.object({
  recetaId: z.string().min(1),
  nombre: z.string().min(1),
  motivo: z.string().optional(),
});

const action = z.object({
  type: z.enum(['open_merma', 'open_assignment', 'open_application', 'open_recipe']),
  targetId: z.string().min(1),
  label: z.string().min(1),
});

const replySchema = z.object({
  conversationId: z.string().optional(),
  text: z.string().min(1),
  recipes: z.array(recipeCard).optional(),
  actions: z.array(action).optional(),
});

const suggestSchema = z.object({ recipes: z.array(recipeCard) });

export function createHttpAgents(baseUrl: string): AgentsProvider {
  async function post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Agents-Contract': AGENTS_CONTRACT_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      const aborted = (e as { name?: string })?.name === 'AbortError';
      throw new ApiError({ kind: aborted ? 'timeout' : 'network' });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) throw new ApiError({ kind: kindFromStatus(res.status), status: res.status });
    const parsed = schema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      if (__DEV__) console.warn('[agentes] respuesta fuera de contrato', path, parsed.error.issues);
      throw new ApiError({ kind: 'server', message: 'El asistente respondió algo que no pudimos leer.' });
    }
    return parsed.data;
  }

  return {
    name: 'http',
    sendMessage: (input): Promise<AgentReply> => post('/chat', input, replySchema),
    suggestRecipes: async (input): Promise<AgentRecipeCard[]> =>
      (await post('/recipes/suggest', input, suggestSchema)).recipes,
    askNutrition: (input): Promise<AgentReply> => post('/nutrition/ask', input, replySchema),
  };
}
