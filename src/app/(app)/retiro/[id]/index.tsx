import { router, useLocalSearchParams } from 'expo-router';
import {
  CalendarCheck,
  CalendarClock,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Truck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { SuggestedRecipes } from '@/components/recetas/SuggestedRecipes';
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Header,
  InfoRow,
  ListItem,
  Screen,
  SectionHeader,
  SkeletonList,
  StatusBadge,
  Stepper,
  Text,
  TextArea,
} from '@/components/ui';
import {
  useAssignment,
  useCancelAssignment,
  useConfirmAssignment,
  usePickers,
  useStartTransit,
} from '@/features/asignaciones/hooks';
import { branchAddress, mapsUrl, mermaOrigin } from '@/features/mermas/selectors';
import { formatDateTime, formatDay, formatQuantity, formatTimeRange } from '@/lib/format';
import {
  assignmentActionLabels,
  assignmentSteps,
  canCancelAssignment,
  primaryAssignmentAction,
  statusMeta,
} from '@/lib/status';

const STEP_LABELS: Record<string, string> = {
  asignada: 'Asignado',
  confirmada: 'Confirmado',
  en_camino: 'En camino',
  completada: 'Retirado',
};

export default function RetiroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useAssignment(id);
  const pickers = usePickers(id);
  const confirm = useConfirmAssignment();
  const transit = useStartTransit();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [transitOpen, setTransitOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = useCancelAssignment(() => setCancelOpen(false));

  const a = q.data;
  if (!a) {
    return (
      <Screen header={<Header title="Retiro" back backFallback="/retiros" />}>
        {q.isPending ? <SkeletonList count={3} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      </Screen>
    );
  }

  const status = String(a.status);
  const m = a.merma;
  const stepIndex = assignmentSteps.indexOf(status as (typeof assignmentSteps)[number]);
  const failed = stepIndex < 0 ? statusMeta('assignment', status).label : undefined;
  const action = primaryAssignmentAction(status);
  const address = m ? branchAddress(m) : null;
  const maps = m ? mapsUrl(m) : null;
  const declared = pickers.data ?? [];
  const foods = (a.products ?? []).map((p) => ({
    name: p.merma_product?.name ?? p.name ?? '',
    nutritional_group: p.merma_product?.nutritional_group,
  })).filter((f) => f.name);

  const primary =
    action === 'confirm' ? (
      <Button
        title={assignmentActionLabels.confirm}
        icon={CalendarCheck}
        size="lg"
        fullWidth
        loading={confirm.isPending}
        onPress={() => confirm.mutate(a.id)}
      />
    ) : action === 'start-transit' ? (
      <Button
        title={assignmentActionLabels['start-transit']}
        icon={Truck}
        size="lg"
        fullWidth
        onPress={() => setTransitOpen(true)}
      />
    ) : action === 'complete' ? (
      <Button
        title={assignmentActionLabels.complete}
        icon={PackageCheck}
        size="lg"
        fullWidth
        onPress={() => router.push({ pathname: '/retiro/[id]/completar', params: { id: a.id } })}
      />
    ) : null;

  return (
    <Screen
      header={<Header title="Retiro" back backFallback="/retiros" />}
      refreshing={q.isRefetching}
      onRefresh={() => {
        void q.refetch();
        void pickers.refetch();
      }}
      footer={primary}
    >
      <StatusBadge kind="assignment" status={status} />
      <View className="gap-1">
        <Text variant="title">{m?.title ?? 'Retiro de alimentos'}</Text>
        {m ? <Text tone="muted">{mermaOrigin(m)}</Text> : null}
      </View>

      <Card>
        <Stepper
          steps={assignmentSteps.map((s) => ({ key: s, label: STEP_LABELS[s] }))}
          current={stepIndex < 0 ? 0 : stepIndex}
          failed={failed}
        />
      </Card>

      {status === 'asignada' ? (
        <Card tone="warning">
          <Text>El Banco les asignó estos alimentos. Confirmá si van a poder retirarlos.</Text>
        </Card>
      ) : null}

      <Card className="gap-4">
        <InfoRow
          icon={CalendarClock}
          label="Cuándo"
          value={`${formatDay(a.scheduled_pickup_date)} ${formatTimeRange(a.scheduled_pickup_time_start, a.scheduled_pickup_time_end)}`.trim()}
        />
        <InfoRow icon={MapPin} label="Dónde" value={address} />
        <InfoRow icon={Phone} label="Contacto en el lugar" value={[m?.contact_name, m?.contact_phone].filter(Boolean).join(' · ') || null} />
        {status === 'completada' ? (
          <>
            <InfoRow icon={UserCheck} label="Retiró" value={[a.picked_up_by_name, a.picked_up_by_dni ? `DNI ${a.picked_up_by_dni}` : null].filter(Boolean).join(' · ')} />
            <InfoRow icon={CalendarCheck} label="Retirado" value={a.completed_at ? formatDateTime(a.completed_at) : null} />
          </>
        ) : null}
        {a.cancellation_reason ? <InfoRow icon={XCircle} label="Motivo de cancelación" value={a.cancellation_reason} tone="destructive" /> : null}
        {maps && status !== 'completada' ? (
          <Button title="Cómo llegar" icon={Navigation} variant="outline" size="sm" onPress={() => Linking.openURL(maps)} className="self-start" />
        ) : null}
      </Card>

      {status !== 'completada' && status !== 'cancelada' && status !== 'no_show' ? (
        <>
          <SectionHeader title="Quién va a retirar" />
          <ListItem
            icon={Users}
            title={
              declared.length
                ? declared.map((p) => p.name ?? p.contact?.name).filter(Boolean).join(', ')
                : 'Todavía no avisaron quién va'
            }
            subtitle={declared.length ? 'Tocá para cambiar' : 'La sucursal consulta esta lista en la puerta'}
            onPress={() => router.push({ pathname: '/retiro/[id]/quien-retira', params: { id: a.id } })}
          />
        </>
      ) : null}

      <SectionHeader title="Alimentos" />
      <View className="gap-2">
        {(a.products ?? []).map((p) => {
          const unit = p.merma_product?.unit ?? p.unit;
          return (
            <Card key={p.id} className="flex-row items-center justify-between gap-2">
              <Text variant="label" className="flex-1">
                {p.merma_product?.name ?? p.name ?? 'Producto'}
              </Text>
              <View className="items-end">
                <Text className="font-bold">{formatQuantity(p.quantity_assigned, unit)}</Text>
                {p.quantity_received != null ? (
                  <Text variant="caption">Recibido: {formatQuantity(p.quantity_received, unit)}</Text>
                ) : null}
              </View>
            </Card>
          );
        })}
      </View>

      <SuggestedRecipes foods={foods} context={{ assignmentId: a.id }} />

      <WhatsAppButton context={{ kind: 'retiro', titulo: m?.title ?? 'retiro', fecha: formatDay(a.scheduled_pickup_date) }} />

      {canCancelAssignment(status) ? (
        <Button title={assignmentActionLabels.cancel} icon={XCircle} variant="ghost" onPress={() => setCancelOpen(true)} />
      ) : null}

      <ConfirmDialog
        visible={transitOpen}
        title="¿Salen a retirar ahora?"
        message="Le avisamos al Banco y a la sucursal que van en camino."
        confirmLabel="Sí, salimos"
        loading={transit.isPending}
        onCancel={() => setTransitOpen(false)}
        onConfirm={() => transit.mutate(a.id, { onSuccess: () => setTransitOpen(false) })}
      />

      <ConfirmDialog
        visible={cancelOpen}
        title="¿No pueden ir a retirar?"
        message="Los alimentos vuelven a quedar disponibles para otra organización. Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar retiro"
        destructive
        loading={cancel.isPending}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => cancel.mutate({ id: a.id, reason: reason.trim() })}
      >
        <TextArea
          label="Contanos por qué (opcional)"
          value={reason}
          onChangeText={setReason}
          maxLength={500}
          placeholder="Ej: no conseguimos transporte"
        />
      </ConfirmDialog>
    </Screen>
  );
}
