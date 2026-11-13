import type { LocalFile } from './types';

/** Archivo del multipart en web: el selector entrega una URI `data:`/`blob:` que se lee como Blob. */
export async function toFilePart(file: LocalFile): Promise<Blob> {
  return (await fetch(file.uri)).blob();
}
