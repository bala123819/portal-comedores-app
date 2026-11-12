import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { IconButton } from '@/components/ui';
import { useUnreadCount } from '@/features/notificaciones/hooks';

/** `color`/`className` permiten usarla sobre fondos de color (p. ej. el encabezado del Inicio). */
export function NotificationBell({ color, className }: { color?: string; className?: string }) {
  const { data } = useUnreadCount();
  return (
    <IconButton
      icon={Bell}
      label="Notificaciones"
      badge={data || undefined}
      color={color}
      className={className}
      onPress={() => router.push('/notificaciones')}
    />
  );
}
