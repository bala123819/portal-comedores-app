import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, CalendarDays, Send, UserRound } from 'lucide-react-native';
import { View } from 'react-native';
import { InteractionTypeIcon, interactionTypeLabel } from '@/components/interacciones/InteractionCard';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Header,
  InfoRow,
  Screen,
  SectionHeader,
  SkeletonList,
  StatusBadge,
  Stepper,
  Text,
} from '@/components/ui';
import { useInteraction } from '@/features/interacciones/hooks';
import { formatDateTime } from '@/lib/format';

const STEPS = [
  { key: 'enviada', label: 'Enviado' },
  { key: 'pendiente', label: 'Esperando al Banco' },
  { key: 'atendida', label: 'Atendido' },
];

export default function InteraccionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useInteraction(id);
  const i = q.data;

  if (!i) {
    return (
      <Screen header={<Header title="Mensaje al Banco" back backFallback="/banco" />}>
        {q.isPending ? <SkeletonList count={2} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      </Screen>
    );
  }

  const attended = i.status === 'atendida';
  const type = interactionTypeLabel(i);

  return (
    <Screen
      header={<Header title={type} subtitle="Mensaje al Banco" back backFallback="/banco" />}
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
    >
      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <InteractionTypeIcon type={String(i.interaction_type)} size="lg" />
          <View className="flex-1 gap-1.5">
            <View className="flex-row flex-wrap gap-2">
              <Badge label={type} tone="accent" size="sm" />
              <StatusBadge kind="interaction" status={i.status} size="sm" />
            </View>
          </View>
        </View>
        <Text variant="heading" selectable>
          {i.title}
        </Text>
        {i.notes ? (
          <Text selectable className="leading-6">
            {i.notes}
          </Text>
        ) : (
          <Text tone="muted">Sin detalle.</Text>
        )}
      </Card>

      <SectionHeader title="Seguimiento" />
      <Card className="gap-4">
        <Stepper steps={STEPS} current={attended ? 2 : 1} />
        <InfoRow icon={CalendarDays} label="Enviado" value={formatDateTime(i.created_at)} />
        {i.created_by?.name ? <InfoRow icon={UserRound} label="Lo envió" value={i.created_by.name} /> : null}
        {attended ? (
          <InfoRow icon={CalendarCheck} label="Atendido" value={i.attended_at ? formatDateTime(i.attended_at) : null} tone="success" />
        ) : null}
      </Card>

      {attended ? (
        <Card tone="accent" className="gap-1">
          <Text variant="label">El Banco ya atendió tu mensaje</Text>
          <Text className="text-sm">Si necesitás algo más sobre este tema, mandá un mensaje nuevo.</Text>
        </Card>
      ) : (
        <Card tone="info" className="gap-1">
          <Text variant="label">Todavía está pendiente</Text>
          <Text className="text-sm">
            El Banco ya recibió el aviso. Cuando lo atienda, vas a ver acá la fecha.
          </Text>
        </Card>
      )}

      <Button
        title="Enviar otro mensaje"
        icon={Send}
        variant="outline"
        onPress={() => router.push({ pathname: '/banco/nueva', params: { tipo: String(i.interaction_type) } })}
      />
    </Screen>
  );
}
