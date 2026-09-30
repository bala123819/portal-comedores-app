import { Linking } from 'react-native';
import { env } from './env';

export type WhatsAppContext =
  | { kind: 'general'; organizacion?: string | null }
  | { kind: 'merma'; titulo: string; numero?: string | null; organizacion?: string | null }
  | { kind: 'retiro'; titulo: string; fecha?: string; organizacion?: string | null }
  | { kind: 'receta'; nombre: string; organizacion?: string | null };

/** Mensaje prearmado según el contexto desde el que se abre el chatbot */
export function whatsappMessage(ctx: WhatsAppContext): string {
  const firma = ctx.organizacion ? ` Somos ${ctx.organizacion}.` : '';
  switch (ctx.kind) {
    case 'merma':
      return `Hola! Tengo una consulta sobre los alimentos "${ctx.titulo}"${ctx.numero ? ` (${ctx.numero})` : ''}.${firma}`;
    case 'retiro':
      return `Hola! Tengo una consulta sobre el retiro de "${ctx.titulo}"${ctx.fecha ? ` del ${ctx.fecha}` : ''}.${firma}`;
    case 'receta':
      return `Hola! Quiero consultar sobre la receta "${ctx.nombre}".${firma}`;
    default:
      return `Hola! Necesito ayuda con el Portal Comedores.${firma}`;
  }
}

export function whatsappUrl(ctx: WhatsAppContext): string | null {
  if (!env.whatsappNumber) return null;
  return `https://wa.me/${env.whatsappNumber}?text=${encodeURIComponent(whatsappMessage(ctx))}`;
}

export const whatsappAvailable = () => !!env.whatsappNumber;

export async function openWhatsApp(ctx: WhatsAppContext): Promise<boolean> {
  const url = whatsappUrl(ctx);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
