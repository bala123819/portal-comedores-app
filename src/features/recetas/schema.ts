import { z } from 'zod';

/**
 * Schema del recetario propio (la API Mermab no tiene recetas, ver api-gaps G-10).
 * Claves sin tildes por compatibilidad (`categoria`, `informacion_nutricional`).
 * Lo que no esté en la fuente queda opcional: no se inventa.
 */
export const ingredienteSchema = z.object({
  nombre: z.string().min(1),
  /** null = "a gusto" / sin cantidad en la fuente */
  cantidad: z.number().positive().nullable(),
  unidad: z.string().nullable(),
  /** Código de grupo nutricional de la API: cereales, frutas_verduras, lacteos, proteinas, aceites */
  grupo_nutricional: z.string().optional(),
  nota: z.string().optional(),
});

export const recetaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  raciones_base: z.number().int().positive(),
  ingredientes: z.array(ingredienteSchema).min(1),
  pasos: z.array(z.string().min(1)).min(1),
  /** Minutos totales */
  tiempo: z.number().int().positive().optional(),
  informacion_nutricional: z
    .object({
      por_racion: z.record(z.string(), z.number()).optional(),
      notas: z.string().optional(),
    })
    .optional(),
  etiquetas: z.array(z.string()).default([]),
  fuente: z.string().optional(),
});

export type Ingrediente = z.infer<typeof ingredienteSchema>;
export type Receta = z.infer<typeof recetaSchema>;
