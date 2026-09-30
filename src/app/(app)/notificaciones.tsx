import { router } from 'expo-router';
import { BellRing, CheckCheck, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import {
  Button,
  Card,
  ConfirmDialog,
  Header,
  IconButton,
  InfiniteList,
  OfflineBanner,
  Text,
  toast,
} from '@/components/ui';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useRemoveAllNotifications,
  useRemoveNotification,
} from '@/features/notificaciones/hooks';
import {
  isUnread,
  notificationBody,
  notificationTarget,
  notificationTitle,
  type AppNotification,
} from '@/features/notificaciones/types';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { label, notificationTypeLabels } from '@/lib/labels';
import { enablePush, getPushStatus, type PushStatus } from '@/services/push';
import { colors } from '@/theme/tokens';

function PushCard() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void getPushStatus().then(setStatus);
  }, []);
  if (Platform.OS !== 'web' || status !== 'available') return null;
  return (
    <Card tone="accent" className="mb-3 gap-2">
      <Text variant="label">Recibí avisos en este dispositivo</Text>
      <Text className="text-sm">Te avisamos cuando haya alimentos nuevos o cambie un retiro.</Text>
      <Button
        title="Activar avisos"
        icon={BellRing}
        size="sm"
        className="self-start"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            const s = await enablePush();
            setStatus(s);
            if (s === 'subscribed') toast.success('Listo, vas a recibir avisos');
            else if (s === 'denied') toast.error('El navegador bloqueó los avisos');
          } catch {
            toast.error('No pudimos activar los avisos');
          } finally {
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}

export default function NotificacionesScreen() {
  const query = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const remove = useRemoveNotification();
  const removeAll = useRemoveAllNotifications();
  const [confirmClear, setConfirmClear] = useState(false);

  const open = (n: AppNotification) => {
    if (isUnread(n)) markRead.mutate(n.id);
    const t = notificationTarget(n);
    if (t?.kind === 'merma') router.push({ pathname: '/merma/[id]', params: { id: t.id } });
    else if (t?.kind === 'assignment') router.push({ pathname: '/retiro/[id]', params: { id: t.id } });
    else if (t?.kind === 'application') router.push({ pathname: '/postulacion/[id]', params: { id: t.id } });
  };

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Notificaciones"
        back
        backFallback="/"
        right={
          <>
            <IconButton icon={CheckCheck} label="Marcar todas como leídas" onPress={() => markAll.mutate()} />
            <IconButton icon={Trash2} label="Borrar todas" onPress={() => setConfirmClear(true)} />
          </>
        }
      />
      <OfflineBanner />
      <View className="w-full max-w-content flex-1 self-center">
        <InfiniteList
          query={query}
          header={<PushCard />}
          renderItem={({ item }) => {
            const unread = isUnread(item);
            const title = notificationTitle(item) || label(notificationTypeLabels, item.type);
            return (
              <View
                className={cn(
                  'flex-row items-start rounded-xl border',
                  unread ? 'border-primary/40 bg-accent' : 'border-border bg-card',
                )}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${unread ? 'No leída. ' : ''}${title}. ${notificationBody(item)}`}
                  onPress={() => open(item)}
                  className="flex-1 flex-row gap-3 rounded-xl p-4 active:opacity-80"
                >
                  <View className={cn('mt-2 h-2.5 w-2.5 rounded-full', unread ? 'bg-primary' : 'bg-transparent')} />
                  <View className="flex-1 gap-1">
                    <Text variant="label" className={unread ? '' : 'font-normal'}>
                      {title}
                    </Text>
                    {notificationBody(item) ? <Text className="text-sm">{notificationBody(item)}</Text> : null}
                    <Text variant="caption">{formatRelative(item.created_at)}</Text>
                  </View>
                </Pressable>
                <IconButton icon={Trash2} label="Borrar notificación" color={colors.mutedForeground} onPress={() => remove.mutate(item.id)} className="m-2" />
              </View>
            );
          }}
          emptyTitle="No tenés notificaciones"
          emptyMessage="Acá te avisamos de alimentos nuevos y cambios en tus retiros."
        />
      </View>
      <ConfirmDialog
        visible={confirmClear}
        title="¿Borrar todas las notificaciones?"
        message="No se pueden recuperar."
        confirmLabel="Borrar todas"
        destructive
        loading={removeAll.isPending}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => removeAll.mutate(undefined, { onSuccess: () => setConfirmClear(false) })}
      />
    </View>
  );
}

