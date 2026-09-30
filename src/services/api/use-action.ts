import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from '@/components/ui/Toast';
import { humanMessage, isApiError } from './errors';
import { useIdempotencyKey } from './idempotency';

interface ActionOptions<TVars, TData> {
  /** Query keys a invalidar al terminar bien */
  invalidate?: QueryKey[];
  successMessage?: string | ((data: TData, vars: TVars) => string);
  onSuccess?: (data: TData, vars: TVars) => void;
  /** false = no mostrar toast de error (lo maneja la pantalla, p. ej. formularios con 422) */
  errorToast?: boolean;
}

/**
 * Mutación con `Idempotency-Key` por intención del usuario:
 * reintentar la misma acción (mismos datos) reusa la key; una acción exitosa la descarta.
 */
export function useAction<TVars, TData>(
  fn: (vars: TVars, idempotencyKey: string) => Promise<TData>,
  { invalidate = [], successMessage, onSuccess, errorToast = true }: ActionOptions<TVars, TData> = {},
) {
  const qc = useQueryClient();
  const idem = useIdempotencyKey();

  const mutation = useMutation<TData, unknown, TVars>({
    mutationFn: (vars) => fn(vars, idem.keyFor(vars)),
    onSuccess: async (data, vars) => {
      idem.reset();
      await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (successMessage) {
        toast.success(typeof successMessage === 'function' ? successMessage(data, vars) : successMessage);
      }
      onSuccess?.(data, vars);
    },
    onError: (error) => {
      if (!errorToast) return;
      if (isApiError(error) && error.kind === 'unauthorized') return;
      toast.error(humanMessage(error));
    },
  });

  return mutation;
}

/** Vuelca los errores 422 por campo de la API en react-hook-form. Devuelve true si mapeó alguno. */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>> = {},
): boolean {
  if (!isApiError(error) || !error.fieldErrors) return false;
  let mapped = false;
  for (const [apiField, messages] of Object.entries(error.fieldErrors)) {
    const field = (fieldMap[apiField] ?? apiField) as Path<T>;
    setError(field, { type: 'server', message: messages[0] });
    mapped = true;
  }
  return mapped;
}
