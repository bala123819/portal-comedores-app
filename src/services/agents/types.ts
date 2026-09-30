import type { FoodItem } from '@/lib/recipe-match';

/**
 * Contrato del frontend con los agentes (GoDubi / n8n). Los agentes viven fuera de este repo.
 * Se manda solo el contexto mínimo (ids), nunca el token del usuario ni secretos.
 * Contrato HTTP propuesto: docs/agentes-contrato.md
 */
export interface AgentContext {
  organizationId?: string | null;
  mermaId?: string;
  assignmentId?: string;
  recetaId?: string;
}

/**
 * Acción que un agente PROPONE. El frontend nunca la ejecuta: solo lleva al usuario a la
 * pantalla donde puede hacerla él mismo, con confirmación.
 */
export interface ProposedAction {
  type: 'open_merma' | 'open_assignment' | 'open_application' | 'open_recipe';
  targetId: string;
  label: string;
}

export interface AgentRecipeCard {
  recetaId: string;
  nombre: string;
  motivo?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  recipes?: AgentRecipeCard[];
  actions?: ProposedAction[];
  /** Solo en mensajes del usuario que no se pudieron enviar */
  failed?: boolean;
}

export interface AgentReply {
  conversationId?: string;
  text: string;
  recipes?: AgentRecipeCard[];
  actions?: ProposedAction[];
}

export type AgentTopic = 'general' | 'recetas' | 'nutricion';

export interface AgentsProvider {
  readonly name: string;
  sendMessage(input: {
    topic: AgentTopic;
    conversationId?: string;
    message: string;
    history: Pick<ChatMessage, 'role' | 'text'>[];
    context: AgentContext;
  }): Promise<AgentReply>;
  suggestRecipes(input: {
    foods: FoodItem[];
    servings: number;
    context: AgentContext;
  }): Promise<AgentRecipeCard[]>;
  askNutrition(input: { question: string; context: AgentContext }): Promise<AgentReply>;
}
