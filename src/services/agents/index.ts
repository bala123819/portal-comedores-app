import { env } from '@/lib/env';
import { createHttpAgents } from './http';
import { mockAgents } from './mock';
import type { AgentsProvider } from './types';

/** Punto único de acceso a los agentes: cambiar de proveedor no toca pantallas. */
export const agents: AgentsProvider = env.agentsUrl ? createHttpAgents(env.agentsUrl) : mockAgents;

export type * from './types';
