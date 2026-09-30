import { CloudOff, Inbox, Lock, RefreshCw, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { humanMessage, isApiError } from '@/services/api/errors';
import { useIsOnline } from '@/services/network';
import { colors } from '@/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center gap-3 px-6 py-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
        <Icon size={30} color={colors.accentForeground} />
      </View>
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      {message ? (
        <Text tone="muted" className="text-center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} className="mt-2" />
      ) : null}
    </View>
  );
}

/** Estado de error con reintento. 403 → "no tenés permiso" (sin reintento). */
export function ErrorState({
  error,
  onRetry,
  title,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const kind = isApiError(error) ? error.kind : 'unknown';
  if (kind === 'forbidden') {
    return (
      <EmptyState
        icon={Lock}
        title="No tenés acceso a esta sección"
        message="Tu usuario no tiene permiso para ver esto. Si creés que es un error, consultá con el Banco de Alimentos."
      />
    );
  }
  const Icon = kind === 'network' || kind === 'timeout' ? WifiOff : kind === 'server' ? CloudOff : TriangleAlert;
  return (
    <View className="items-center gap-3 px-6 py-10" accessibilityRole="alert">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <Icon size={30} color={colors.destructive} />
      </View>
      <Text variant="heading" className="text-center">
        {title ?? 'No pudimos cargar esto'}
      </Text>
      <Text tone="muted" className="text-center">
        {humanMessage(error)}
      </Text>
      {onRetry ? (
        <Button title="Reintentar" icon={RefreshCw} variant="outline" onPress={onRetry} className="mt-2" />
      ) : null}
    </View>
  );
}

export function OfflineBanner() {
  const online = useIsOnline();
  if (online) return null;
  return (
    <View
      className="mx-4 mt-2 flex-row items-center gap-2 rounded-lg bg-warning px-3 py-2"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <WifiOff size={18} color={colors.foreground} />
      <Text className="flex-1 text-sm font-semibold text-foreground">
        Sin conexión. Te mostramos lo último que guardamos.
      </Text>
    </View>
  );
}
