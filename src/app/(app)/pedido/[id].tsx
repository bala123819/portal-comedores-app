import { useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  Clock,
  FileDown,
  MessageSquare,
  UserCheck,
  XCircle,
} from 'lucide-react-native';
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
  SectionHeader,
  SkeletonList,
  StatusBadge,
  Stepper,
  Text,
  TextArea,
  toast,
} from '@/components/ui';
import { useCancelDistribution, useDistribution } from '@/features/pedidos/hooks';
import type { Distribution, DistributionItem } from '@/features/pedidos/types';
import { formatDateTime, formatDay, formatNumber, formatQuantity } from '@/lib/format';
import { distributionStatusLabels, label, timeSlotLabels } from '@/lib/labels';
import { distributionStepOf, distributionSteps } from '@/lib/status';
import { downloadAndOpen } from '@/services/download';
import { humanMessage } from '@/services/api/errors';
import { orgApi } from '@/services/api/endpoints';
import { colors } from '@/theme/tokens';

/** Texto de ayuda según el estado (qué pasa ahora y qué tiene que hacer la organización). */
function statusHelp(d: Distribution): { tone: 'warning' | 'accent'; text: string } | null {
  switch (d.status) {
    case 'pendiente':
    case 'en_revision':
      return {
        tone: 'warning',
        text: 'El Banco está revisando tu pedido. Te avisamos cuando haya una respuesta.',
      };
    case 'aprobada':
      return {
        tone: 'accent',
        text: 'El Banco aprobó tu pedido y fijó las cantidades. Ahora lo va a preparar.',
      };
    case 'programada':
    case 'en_preparacion':
      return {
        tone: 'accent',
        text: 'El Banco está armando tu pedido. Te avisamos cuando esté listo para retirar.',
      };
    case 'lista_para_retiro':
      return {
        tone: 'accent',
        text: '¡Tu pedido está listo! Ya pueden ir a retirarlo. Llevá el remito.',
      };
    default:
      return null;
  }
}

/** Fila de producto: lo pedido y, cuando existen, lo aprobado y lo entregado. */
function ItemRow({ item }: { item: DistributionItem }) {
  const approvedDiffers =
    item.quantity_approved != null && item.quantity_approved !== item.quantity_requested;
  return (
    <View className="gap-1">
      <View className="flex-row items-start justify-between gap-2">
        <Text variant="label" className="flex-1">
          {item.product.name}
        </Text>
        {item.kg_requested != null ? (
          <Text variant="caption">{formatNumber(item.kg_requested)} kg</Text>
        ) : null}
      </View>
      <Text variant="caption">Pediste {formatQuantity(item.quantity_requested, item.unit)}</Text>
      {item.quantity_approved != null ? (
        <Text
          variant="caption"
          tone={approvedDiffers ? 'accent' : 'muted'}
          className={approvedDiffers ? 'font-semibold' : undefined}
        >
          El Banco aprobó {formatQuantity(item.quantity_approved, item.unit)}
        </Text>
      ) : null}
      {item.quantity_delivered != null ? (
        <Text variant="caption">
          Retiraste {formatQuantity(item.quantity_delivered, item.unit)}
        </Text>
      ) : null}
    </View>
  );
}

export default function PedidoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useDistribution(id);
  const cancel = useCancelDistribution();
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [downloading, setDownloading] = useState(false);
  const d = q.data;

  if (!d) {
    return (
      <Screen header={<Header title="Pedido" back backFallback="/mercaderia" />}>
        {q.isPending ? (
          <SkeletonList count={2} />
        ) : (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        )}
      </Screen>
    );
  }

  const step = distributionStepOf(String(d.status));
  const help = statusHelp(d);
  // Si el motivo ya empieza con el estado ("Cancelado por la organización: …"), no se repite.
  const statusLabel = label(distributionStatusLabels, String(d.status));
  const failed =
    step === null
      ? d.rejection_reason?.toLowerCase().startsWith(statusLabel.toLowerCase())
        ? d.rejection_reason
        : [statusLabel, d.rejection_reason].filter(Boolean).join(': ')
      : undefined;

  const downloadReceipt = async () => {
    setDownloading(true);
    try {
      await downloadAndOpen(orgApi.receiptPath(d.id), `remito-${d.number}.pdf`);
    } catch (e) {
      toast.error(humanMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen
      header={<Header title={`Pedido ${d.number}`} back backFallback="/mercaderia" />}
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
    >
      <View className="flex-row flex-wrap items-center gap-2">
        <StatusBadge kind="distribution" status={d.status} />
        {d.is_urgent ? (
          <View className="flex-row items-center gap-1">
            <AlertTriangle size={16} color={colors.destructive} />
            <Text variant="caption" tone="destructive">
              Urgente
            </Text>
          </View>
        ) : null}
      </View>

      <Card>
        <Stepper steps={distributionSteps} current={step ?? 0} failed={failed} />
      </Card>

      {help ? (
        <Card tone={help.tone}>
          <Text>{help.text}</Text>
        </Card>
      ) : null}

      {d.receipt_available ? (
        <Button
          title="Descargar remito"
          icon={FileDown}
          variant="primary"
          loading={downloading}
          onPress={downloadReceipt}
        />
      ) : null}

      <Card className="gap-4">
        <InfoRow icon={Clock} label="Pediste" value={formatDateTime(d.created_at)} />
        <InfoRow
          icon={CalendarClock}
          label="Día de retiro que pediste"
          value={
            d.requested_distribution_date
              ? [
                  formatDay(d.requested_distribution_date),
                  d.time_slot ? label(timeSlotLabels, d.time_slot) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : null
          }
        />
        <InfoRow
          icon={CalendarCheck}
          label="Día que fijó el Banco"
          value={d.scheduled_distribution_date ? formatDay(d.scheduled_distribution_date) : null}
          tone="primary"
        />
        <InfoRow
          icon={UserCheck}
          label="Retiró"
          value={
            d.actual_distribution_date
              ? [formatDay(d.actual_distribution_date), d.received_by_name]
                  .filter(Boolean)
                  .join(' · ')
              : null
          }
        />
        <InfoRow icon={MessageSquare} label="Para qué es" value={d.notes} />
        <InfoRow
          icon={AlertTriangle}
          label="Por qué es urgente"
          value={d.is_urgent ? d.urgency_reason : null}
        />
        <InfoRow label="Número de remito" value={d.receipt_number} />
      </Card>

      {d.items?.length ? (
        <>
          <SectionHeader
            title={d.items.length === 1 ? '1 producto' : `${d.items.length} productos`}
          />
          <Card className="gap-4">
            {d.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            <View className="flex-row justify-between border-t border-border pt-3">
              <Text variant="label">Total pedido</Text>
              <Text variant="label">{formatNumber(d.total_kg ?? 0)} kg</Text>
            </View>
          </Card>
        </>
      ) : null}

      {d.can_cancel ? (
        <Button
          title="Cancelar pedido"
          icon={XCircle}
          variant="ghost"
          onPress={() => setConfirm(true)}
        />
      ) : null}

      <ConfirmDialog
        visible={confirm}
        title="¿Cancelar el pedido?"
        message="El Banco no va a preparar este pedido. Si después lo necesitás, podés hacer uno nuevo."
        confirmLabel="Sí, cancelar pedido"
        destructive
        loading={cancel.isPending}
        confirmDisabled={!reason.trim()}
        onCancel={() => {
          setConfirm(false);
          cancel.reset();
        }}
        onConfirm={() =>
          cancel.mutate(
            { id: d.id, reason: reason.trim() },
            {
              onSuccess: () => {
                setConfirm(false);
                setReason('');
                void q.refetch();
              },
              // 409 DISTRIBUTION_NOT_CANCELLABLE: el banco ya lo aprobó; se refresca para mostrar el estado real
              onError: () => void q.refetch(),
            },
          )
        }
      >
        <TextArea
          label="¿Por qué lo cancelás?"
          placeholder="Ej: lo pedimos por error"
          value={reason}
          onChangeText={setReason}
          maxLength={255}
          error={cancel.isError ? humanMessage(cancel.error) : undefined}
        />
      </ConfirmDialog>
    </Screen>
  );
}
