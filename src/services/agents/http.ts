import { ApiError, kindFromStatus } from '@/services/api/errors';
import type { AgentRecipeCard, AgentReply, AgentsProvider } from './types';

/**
 * Proveedor HTTP hacia el orquestador de agentes (n8n / GoDubi) en EXPO_PUBLIC_AGENTS_URL.
 * No manda el token de Mermab: los agentes consultan la API por su cuenta (MCP / API key del
 * lado servidor). Contrato en docs/agentes-contrato.md.
 */
export function createHttpAgents(baseUrl: string): AgentsProvider {
  async function post<T>(path: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ApiError({ kind: 'network' });
    }
    if (!res.ok) throw new ApiError({ kind: kindFromStatus(res.status), status: res.status });
    return (await res.json()) as T;
  }

  return {
    name: 'http',
    sendMessage: (input) => post<AgentReply>('/chat', input),
    suggestRecipes: async (input) =>
      (await post<{ recipes: AgentRecipeCard[] }>('/recipes/suggest', input)).recipes ?? [],
    askNutrition: (input) => post<AgentReply>('/nutrition/ask', input),
  };
}
