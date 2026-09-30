import { recetasRepository } from '@/features/recetas/repository';
import { normalize } from '@/lib/recipe-match';
import type { AgentsProvider, AgentReply } from './types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Proveedor simulado: usa el recetario local y respuestas fijas.
 * Sirve para desarrollar las pantallas mientras no exista el endpoint de agentes.
 */
export const mockAgents: AgentsProvider = {
  name: 'simulado',

  async sendMessage({ topic, message, context }) {
    await wait(700);
    const q = normalize(message);
    if (topic === 'nutricion' || /nutri|vitamin|proteina|caloria|celiac|diabet/.test(q)) {
      return mockAgents.askNutrition({ question: message, context });
    }
    if (topic === 'recetas' || /receta|cocin|prepar|comida|plato/.test(q)) {
      const recetas = await recetasRepository.list({ search: message.split(' ').pop() });
      const list = recetas.length ? recetas : (await recetasRepository.list()).slice(0, 3);
      return {
        text: 'Te dejo algunas recetas del recetario que te pueden servir. Tocá una para ver ingredientes y pasos.',
        recipes: list.slice(0, 3).map((r) => ({ recetaId: r.id, nombre: r.nombre })),
      };
    }
    const reply: AgentReply = {
      text:
        'Soy el asistente del Banco de Alimentos (modo de prueba). Puedo ayudarte con recetas, ' +
        'información nutricional y dudas sobre tus retiros. Para acciones como postularte o ' +
        'confirmar un retiro, te llevo a la pantalla correspondiente y lo confirmás vos.',
    };
    if (context.assignmentId) {
      reply.actions = [
        { type: 'open_assignment', targetId: context.assignmentId, label: 'Ver el retiro' },
      ];
    } else if (context.mermaId) {
      reply.actions = [{ type: 'open_merma', targetId: context.mermaId, label: 'Ver los alimentos' }];
    }
    return reply;
  },

  async suggestRecipes({ foods, servings }) {
    await wait(600);
    const matches = await recetasRepository.suggest(foods, 6);
    return matches.map((m) => ({
      recetaId: m.receta.id,
      nombre: m.receta.nombre,
      motivo: `Usa ${m.coincidencias.join(', ').toLowerCase()} · para ${servings} personas`,
    }));
  },

  async askNutrition() {
    await wait(700);
    return {
      text:
        'En modo de prueba no tengo datos nutricionales reales. Cuando el agente nutricional esté ' +
        'conectado, te va a responder con la información de los productos recibidos. Mientras tanto, ' +
        'podés ver el resumen por grupo en la sección "Nutrición".',
    };
  },
};
