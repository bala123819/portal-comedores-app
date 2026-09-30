import { router } from 'expo-router';
import { MapPinOff } from 'lucide-react-native';
import { EmptyState, Screen } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen contentClassName="flex-grow justify-center">
      <EmptyState
        icon={MapPinOff}
        title="No encontramos esta pantalla"
        actionLabel="Ir al inicio"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
