import { ClipboardCheck, Timer } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Text } from '@/components/ui';
import { describeApproval, remaining } from '@/features/asistente/format';
import type { PendingApproval } from '@/services/assistant';
import { colors } from '@/theme/tokens';

/**
 * Tarjeta de confirmación (contrato §5): nada se guarda hasta que la persona toca Confirmar.
 * Muestra los datos en lenguaje humano, un contador hasta que vence y deshabilita los botones
 * al primer toque.
 */
export function ApprovalCard({
  approval,
  deciding,
  onDecide,
}: {
  approval: PendingApproval;
  deciding: boolean;
  onDecide: (approve: boolean) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const view = describeApproval(approval);
  const left = remaining(approval.expiresAt, now);
  const expired = left === null;

  return (
    <Card className="gap-3 border-primary/40" accessibilityLabel={`Confirmar: ${view.title}`}>
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-accent">
          <ClipboardCheck size={20} color={colors.accentForeground} />
        </View>
        <View className="flex-1">
          <Text variant="label">{view.title}</Text>
          <Text variant="caption">Revisá los datos. No se guarda nada hasta que confirmes.</Text>
        </View>
      </View>

      {view.fields.length ? (
        <View className="gap-1.5">
          {view.fields.map((f) => (
            <View key={f.label} className="flex-row gap-2">
              <Text variant="caption" className="w-28">
                {f.label}
              </Text>
              <Text className="flex-1 text-sm">{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {view.list ? (
        <View className="gap-1 rounded-xl bg-muted p-3">
          <Text className="text-sm font-semibold">{view.list.title}</Text>
          {view.list.items.map((it, i) => (
            <Text key={i} className="text-sm">
              • {it}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center gap-1">
        <Timer size={14} color={expired ? colors.destructive : colors.mutedForeground} />
        <Text variant="caption" tone={expired ? 'destructive' : 'muted'} accessibilityLiveRegion="polite">
          {expired ? 'Venció. Pedíselo de nuevo al asistente.' : `Vence en ${left}`}
        </Text>
      </View>

      <View className="flex-row gap-2">
        <Button
          title="Cancelar"
          variant="outline"
          className="flex-1"
          disabled={deciding || expired}
          onPress={() => onDecide(false)}
        />
        <Button
          title="Confirmar"
          className="flex-1"
          loading={deciding}
          disabled={deciding || expired}
          onPress={() => onDecide(true)}
        />
      </View>
    </Card>
  );
}
