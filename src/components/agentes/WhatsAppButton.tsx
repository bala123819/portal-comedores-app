import { MessageCircle } from 'lucide-react-native';
import { Button, toast } from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { openWhatsApp, whatsappAvailable, type WhatsAppContext } from '@/lib/whatsapp';

type Ctx = WhatsAppContext extends infer T ? (T extends WhatsAppContext ? Omit<T, 'organizacion'> : never) : never;

/** "Hablar por WhatsApp" con mensaje prearmado según el contexto. Se oculta si no hay número. */
export function WhatsAppButton({
  context,
  title = 'Hablar por WhatsApp',
  variant = 'outline',
}: {
  context: Ctx;
  title?: string;
  variant?: 'outline' | 'secondary' | 'primary';
}) {
  const org = useSession((s) => s.organization?.name ?? null);
  if (!whatsappAvailable()) return null;
  return (
    <Button
      title={title}
      icon={MessageCircle}
      variant={variant}
      onPress={async () => {
        const ok = await openWhatsApp({ ...context, organizacion: org } as WhatsAppContext);
        if (!ok) toast.error('No pudimos abrir WhatsApp en este dispositivo.');
      }}
    />
  );
}
