/** Enmascara datos personales en respuestas para mostrarlas/guardarlas en diagnóstico. */
const SENSITIVE = /(email|phone|telefono|dni|document|cuit|tax_id|address|street|name|token|password|latitude|longitude|birth)/i;

export function maskPersonalData(value: unknown, depth = 0): unknown {
  if (depth > 8) return '…';
  if (Array.isArray(value)) return value.slice(0, 3).map((v) => maskPersonalData(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] =
        SENSITIVE.test(k) && (typeof v === 'string' || typeof v === 'number')
          ? `«${typeof v}»`
          : maskPersonalData(v, depth + 1);
    }
    return out;
  }
  return value;
}
