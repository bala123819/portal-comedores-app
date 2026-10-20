import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { IconButton, Text } from '@/components/ui';
import { currentMonth, monthLabel, shiftMonth } from '@/features/recibido/period';

/** Meses hacia atrás que se pueden consultar (el backend acepta hasta 1 año) */
const MAX_MONTHS_BACK = 11;

/** Selector de mes (AAAA-MM): no deja pasar del mes actual ni ir más de un año atrás. */
export function MonthNavigator({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const now = currentMonth();
  const oldest = shiftMonth(now, -MAX_MONTHS_BACK);
  const canPrev = month > oldest;
  const canNext = month < now;

  return (
    <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-1">
      {canPrev ? (
        <IconButton icon={ChevronLeft} label="Mes anterior" onPress={() => onChange(shiftMonth(month, -1))} />
      ) : (
        <View className="h-12 w-12" />
      )}
      <Text variant="label" accessibilityLiveRegion="polite">
        {month === now ? `Este mes (${monthLabel(month, true)})` : monthLabel(month, false, true)}
      </Text>
      {canNext ? (
        <IconButton icon={ChevronRight} label="Mes siguiente" onPress={() => onChange(shiftMonth(month, 1))} />
      ) : (
        <View className="h-12 w-12" />
      )}
    </View>
  );
}
