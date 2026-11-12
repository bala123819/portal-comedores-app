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

  const pct = Math.round(Math.min(1, ratio) * 100);

  return (
    <Card className="gap-4" accessibilityLabel={`Cupo de ${monthName(quota.month)}`}>
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-accent">
          <Scale size={22} color={colors.accentForeground} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="caption" className="font-semibold uppercase tracking-wide">
            Cupo de {monthName(quota.month)}
          </Text>
          {over ? (
            <Text variant="title" tone="destructive">
              Te pasás por {formatNumber(-remaining)} kg
            </Text>
          ) : (
            <View className="flex-row flex-wrap items-baseline gap-x-2">
              <Text variant="title">{formatNumber(remaining)} kg</Text>
              <Text tone="muted">disponibles</Text>
            </View>
          )}
        </View>
        <View className="rounded-full bg-muted px-2.5 py-1">
          <Text className="text-xs font-bold text-muted-foreground">{pct} % usado</Text>
        </View>
      </View>
      <ProgressBar value={ratio} tone={over ? 'warning' : ratio > 0.85 ? 'warning' : 'primary'} />
      {compact ? null : (
        <View className="flex-row gap-2">
          <QuotaStat label="Corresponde" value={quota.monthly_quota_kg} />
          <QuotaStat label="Recibido" value={quota.delivered_kg} />
          <QuotaStat label="En curso" value={quota.requested_in_progress_kg + extraKg} />
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

function QuotaStat({ label, value }: { label: string; value: number }) {
  return (
    <View
      className="flex-1 gap-0.5 rounded-xl bg-muted px-3 py-2.5"
      accessible
      accessibilityLabel={`${label}: ${formatNumber(value)} kilos`}
    >
      <Text variant="caption">{label}</Text>
      <Text variant="label">{formatNumber(value)} kg</Text>
    </View>
  );
}
