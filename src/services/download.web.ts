import { api } from './api/client';

/** Web: se pide el archivo con el Bearer y se abre como blob en una pestaña nueva. */
export async function downloadAndOpen(path: string, filename: string): Promise<void> {
  const res = await api.raw(path, { timeoutMs: 60_000 });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
