import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, Clock, MessageSquare, Truck, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Header,
  InfoRow,
  Screen,
  SkeletonList,
  StatusBadge,
  Text,
} from '@/components/ui';
import { mermaOrigin } from '@/features/mermas/selectors';
import { useApplication, useCancelApplication } from '@/features/postulaciones/hooks';
import { formatDateTime, formatDay, formatTime, formatTimeRange } from '@/lib/format';
import { canCancelApplication } from '@/lib/status';
import { colors } from '@/theme/tokens';

export default function PostulacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useApplication(id);
  const cancel = useCancelApplication();
  const [confirm, setConfirm] = useState(false);
  const a = q.data;

  if (!a) {
    return (
      <Screen header={<Header title="Pedido" back backFallback="/retiros" />}>
        {q.isPending ? <SkeletonList count={2} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      </Screen>
    );
  }
  const m = a.merma;

  return (
    <Screen
      header={<Header title="Pedido" back backFallback="/retiros" />}
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
    >
      <StatusBadge kind="application" status={a.status} />
      <View className="gap-1">
        <Text variant="title">{m?.title ?? 'Pedido de alimentos'}</Text>
        {m ? <Text tone="muted">{mermaOrigin(m)}</Text> : null}
      </View>

      {a.status === 'pendiente' ? (
        <Card tone="warning">
          <Text>El Banco está revisando tu pedido. Te avisamos cuando haya una respuesta.</Text>
        </Card>
      ) : a.status === 'aprobada' ? (
        <Card tone="accent" className="gap-2">
          <Text>¡Tu pedido fue aprobado! El retiro ya está en “Mis retiros”.</Text>
          <Button title="Ver mis retiros" variant="primary" onPress={() => router.push('/retiros')} />
        </Card>
      ) : null}

      <Card className="gap-4">
        <InfoRow icon={Clock} label="Pediste" value={formatDateTime(a.created_at)} />
        {m ? (
          <InfoRow
            icon={CalendarClock}
            label="Retiro previsto"
            value={`${formatDay(m.pickup_date)} ${formatTimeRange(m.pickup_time_start, m.pickup_time_end)}`}
          />
        ) : null}
        <InfoRow icon={Clock} label="Horario que preferís" value={a.preferred_pickup_time ? `${formatTime(a.preferred_pickup_time)} h` : null} />
        {a.can_pickup_immediately ? <Text>✓ Pueden retirar enseguida</Text> : null}
        {a.requires_transport_help ? (
          <View className="flex-row items-center gap-2">
            <Truck size={18} color={colors.mutedForeground} />
            <Text>Pidieron ayuda con el transporte</Text>
          </View>
        ) : null}
        <InfoRow icon={MessageSquare} label="Tu mensaje" value={a.message} />
        <InfoRow icon={MessageSquare} label="Respuesta del Banco" value={a.response_notes} tone="primary" />
      </Card>

      {m ? (
        <Button
          title="Ver los alimentos"
          variant="outline"
          onPress={() => router.push({ pathname: '/merma/[id]', params: { id: m.id } })}
        />
      ) : null}

      {canCancelApplication(String(a.status)) ? (
        <Button title="Cancelar pedido" icon={XCircle} variant="ghost" onPress={() => setConfirm(true)} />
      ) : null}

      <ConfirmDialog
        visible={confirm}
        title="¿Cancelar el pedido?"
        message="El Banco no va a tener en cuenta este pedido. Si después lo necesitás, podés volver a pedirlo mientras siga disponible."
        confirmLabel="Sí, cancelar pedido"
        destructive
        loading={cancel.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          cancel.mutate(a.id, {
            onSuccess: () => {
              setConfirm(false);
              void q.refetch();
            },
          })
        }
      />
    </Screen>
  );
}
