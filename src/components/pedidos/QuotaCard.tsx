import { Scale } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, ProgressBar, Text } from '@/components/ui';
import type { Quota } from '@/features/pedidos/types';
import { formatNumber } from '@/lib/format';
import { colors } from '@/theme/tokens';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "2026-10" → "octubre" */
function monthName(month: string): string {
  const m = /^\d{4}-(\d{2})$/.exec(month);
  return m ? (MONTH_NAMES[Number(m[1]) - 1] ?? month) : month;
}

/**
 * Cupo del mes (`GET /org/quota`): lo que le corresponde, lo recibido y lo pedido en curso.
 * `extraKg` muestra cómo queda el cupo con un pedido que se está armando.
 */
export function QuotaCard({
  quota,
  extraKg = 0,
  compact,
}: {
  quota: Quota;
  extraKg?: number;
  compact?: boolean;
}) {
  const used = quota.delivered_kg + quota.requested_in_progress_kg + extraKg;
  const remaining = quota.remaining_kg - extraKg;
  const over = remaining < 0;
  const ratio = quota.monthly_quota_kg > 0 ? used / quota.monthly_quota_kg : 0;

  return (
    <Card className="gap-3" accessibilityLabel={`Cupo de ${monthName(quota.month)}`}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent">
          <Scale size={20} color={colors.accentForeground} />
        </View>
        <View className="flex-1">
          <Text variant="caption">Cupo de {monthName(quota.month)}</Text>
          <Text variant="heading">
            {over
              ? `Te pasás por ${formatNumber(-remaining)} kg`
              : `Te quedan ${formatNumber(remaining)} kg`}
          </Text>
        </View>
      </View>
      <ProgressBar value={ratio} tone={over ? 'warning' : ratio > 0.85 ? 'warning' : 'primary'} />
      {compact ? null : (
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          <Text variant="caption">Corresponde: {formatNumber(quota.monthly_quota_kg)} kg</Text>
          <Text variant="caption">Recibido: {formatNumber(quota.delivered_kg)} kg</Text>
          <Text variant="caption">
            Pedido en curso: {formatNumber(quota.requested_in_progress_kg + extraKg)} kg
          </Text>
        </View>
      )}
      {!quota.enforced && over ? (
        <Text variant="caption">
          El cupo es una referencia: el Banco igual recibe el pedido y ajusta al aprobar.
        </Text>
      ) : null}
    </Card>
  );
}
