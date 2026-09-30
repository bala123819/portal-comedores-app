import { randomUUID } from 'expo-crypto';
import { useRef } from 'react';

export function newIdempotencyKey(): string {
  return randomUUID();
}

/**
 * Mantiene una `Idempotency-Key` por intención del usuario.
 * - La primera ejecución de una acción genera la key.
 * - Si falla y el usuario reintenta con los mismos datos, se reusa la misma key.
 * - Si cambian los datos (otra intención) o la acción salió bien, la próxima vez se genera otra.
 */
export function useIdempotencyKey() {
  const ref = useRef<{ key: string; fingerprint: string } | null>(null);

  return {
    keyFor(variables: unknown): string {
      const fingerprint = safeStringify(variables);
      if (!ref.current || ref.current.fingerprint !== fingerprint) {
        ref.current = { key: newIdempotencyKey(), fingerprint };
      }
      return ref.current.key;
    },
    reset() {
      ref.current = null;
    },
  };
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v) ?? '';
  } catch {
    return String(v);
  }
}
