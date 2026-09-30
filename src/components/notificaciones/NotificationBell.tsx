import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { IconButton } from '@/components/ui';
import { useUnreadCount } from '@/features/notificaciones/hooks';

export function NotificationBell() {
  const { data } = useUnreadCount();
  return (
    <IconButton
      icon={Bell}
      label="Notificaciones"
      badge={data || undefined}
      onPress={() => router.push('/notificaciones')}
    />
  );
}
