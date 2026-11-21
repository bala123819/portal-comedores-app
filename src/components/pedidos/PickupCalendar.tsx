import { CalendarDays } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDay, parseDate, toISODate } from '@/lib/format';
import { colors } from '@/theme/tokens';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** "Noviembre 2026", "Noviembre – Diciembre 2026", "Diciembre 2026 – Enero 2027" */
function rangeTitle(first: Date, last: Date): string {
  if (first.getFullYear() !== last.getFullYear()) {
    return `${MONTHS[first.getMonth()]} ${first.getFullYear()} – ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  }
  return first.getMonth() === last.getMonth()
    ? `${MONTHS[first.getMonth()]} ${first.getFullYear()}`
    : `${MONTHS[first.getMonth()]} – ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
}

/**
 * Calendario de semanas (lunes a domingo) que cubre sólo los días habilitados (`days`, en
 * orden). Los días de esas semanas que quedan fuera del rango se ven pero no se pueden elegir.
 */
export function PickupCalendar({
  days,
  value,
  onChange,
}: {
  days: string[];
  value: string;
  onChange: (day: string) => void;
}) {
  const first = parseDate(days[0]);
  const last = parseDate(days[days.length - 1]);
  if (!first || !last) return null;

  const enabled = new Set(days);
  const today = toISODate(new Date());
  // Desde el lunes de la semana del primer día hasta el domingo de la del último
  const start = new Date(
    first.getFullYear(),
    first.getMonth(),
    first.getDate() - ((first.getDay() + 6) % 7),
  );
  const end = new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate() + ((7 - last.getDay()) % 7),
  );
  const weeks: Date[][] = [];
  for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (!weeks.length || weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  }

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-center gap-2 px-1 pb-1">
        <CalendarDays size={18} color={colors.primary} />
        <Text variant="label" className="text-[15px]">
          {rangeTitle(first, last)}
        </Text>
      </View>
      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <Text key={i} variant="caption" className="flex-1 text-center text-xs font-semibold">
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={toISODate(week[0])} className="flex-row">
          {week.map((d) => {
            const iso = toISODate(d);
            const available = enabled.has(iso);
            const selected = iso === value;
            const isToday = iso === today;
            return (
              <View key={iso} className="flex-1 items-center py-0.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={capitalize(formatDay(iso))}
                  accessibilityState={{ selected, disabled: !available }}
                  disabled={!available}
                  onPress={() => onChange(iso)}
                  className={cn(
                    'h-11 w-11 items-center justify-center rounded-full',
                    selected
                      ? 'bg-primary'
                      : available
                        ? 'active:bg-accent web:hover:bg-accent'
                        : undefined,
                  )}
                >
                  <Text
                    className={cn(
                      'text-base',
                      selected
                        ? 'font-bold text-primary-foreground'
                        : available
                          ? 'font-semibold text-foreground'
                          : 'text-muted-foreground/40',
                    )}
                  >
                    {d.getDate()}
                  </Text>
                  {/* Punto bajo el número para marcar hoy */}
                  {isToday ? (
                    <View
                      className={cn(
                        'absolute bottom-1.5 h-1 w-1 rounded-full',
                        selected ? 'bg-primary-foreground' : 'bg-primary',
                      )}
                    />
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
