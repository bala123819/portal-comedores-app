import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Adjuntos del chat (contrato §4): fotos JPEG comprimidas a ~1600 px y PDF, hasta 10 MB.
 * Devuelve `null` si la persona canceló; tira `Error` con un mensaje para mostrar si algo falla.
 */
export interface LocalAttachment {
  key: string;
  uri: string;
  name: string;
  type: string;
  kind: 'image' | 'pdf';
}

export const MAX_ATTACHMENTS = 4;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 1600;

let counter = 0;
const key = () => `att-${Date.now()}-${++counter}`;

async function compress(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  // En web se manda el archivo tal cual, así que el tope de 10 MB de la API se controla acá.
  if (Platform.OS === 'web') {
    if (asset.fileSize && asset.fileSize > MAX_BYTES) throw new Error('La foto es muy grande. El máximo es 10 MB.');
    return asset.uri;
  }
  const ctx = ImageManipulator.manipulate(asset.uri);
  const longest = Math.max(asset.width ?? 0, asset.height ?? 0);
  if (longest > MAX_SIDE) {
    ctx.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

export async function pickPhoto(source: 'camera' | 'library'): Promise<LocalAttachment | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Necesitamos permiso para usar la cámara. Podés darlo desde los ajustes del teléfono.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const uri = await compress(result.assets[0]);
  return { key: key(), uri, name: `foto-${Date.now()}.jpg`, type: 'image/jpeg', kind: 'image' };
}

export async function pickPdf(): Promise<LocalAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  if (a.size && a.size > MAX_BYTES) throw new Error('El PDF es muy grande. El máximo es 10 MB.');
  return { key: key(), uri: a.uri, name: a.name || 'documento.pdf', type: 'application/pdf', kind: 'pdf' };
}
