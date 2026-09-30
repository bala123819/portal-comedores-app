import { Building2, LogOut } from 'lucide-react-native';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { Button, EmptyState, Screen } from '@/components/ui';
import { useSession } from '@/features/auth/store';

/** `/auth/me` devolvió un usuario sin organización asociada. */
export default function SinOrganizacionScreen() {
  const signOut = useSession((s) => s.signOut);
  return (
    <Screen contentClassName="flex-grow justify-center">
      <EmptyState
        icon={Building2}
        title="Esta app es para organizaciones"
        message="Tu usuario no está asociado a ningún comedor u organización social. Si creés que es un error, comunicate con el Banco de Alimentos."
      />
      <WhatsAppButton context={{ kind: 'general' }} variant="secondary" />
      <Button title="Salir" icon={LogOut} variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}
