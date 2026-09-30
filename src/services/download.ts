/**
 * Descarga autenticada de archivos (documentos, carta compromiso) en nativo:
 * se baja al cache con el Bearer y se abre el menú de compartir/abrir del sistema.
 * La versión web está en `download.web.ts`.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, apiConfig } from './api/client';
import { ApiError } from './api/errors';

export async function downloadAndOpen(path: string, filename: string): Promise<void> {
  const dir = new Directory(Paths.cache, 'descargas');
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, filename.replace(/[^\w.\- ]+/g, '_'));
  let file: File;
  try {
    file = await File.downloadFileAsync(api.url(path), target, {
      headers: {
        Accept: 'application/pdf, application/octet-stream, */*',
        Authorization: `Bearer ${apiConfig.getToken() ?? ''}`,
      },
      idempotent: true,
    });
  } catch {
    throw new ApiError({ kind: 'network', message: 'No pudimos descargar el archivo.' });
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { dialogTitle: filename });
  }
}
