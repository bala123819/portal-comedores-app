import { File } from 'expo-file-system';
import type { LocalFile } from './types';

/**
 * Archivo del multipart en el celular. Desde el SDK 58 el `fetch` global es el de Expo
 * (`expo/fetch`), que NO acepta el `{ uri, name, type }` clásico de React Native: tira
 * "Unsupported FormDataPart implementation" antes de mandar nada, y la app lo mostraba como
 * "El asistente no está disponible" (P-37). Sí acepta un `File` de expo-file-system, que lee
 * los bytes del archivo (tiene `bytes()`), con su nombre y tipo.
 *
 * La versión web está en `filePart.web.ts`.
 */
export async function toFilePart(file: LocalFile): Promise<Blob> {
  return new File(file.uri) as unknown as Blob;
}
