import { HeartPulse, Scale, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, ProgressBar, StatCard, Text } from '@/components/ui';
import type { Demographics } from '@/features/familias/types';
import { formatNumber } from '@/lib/format';
import { ageGroupLabels, label, specialConditionLabels } from '@/lib/labels';
import { colors } from '@/theme/tokens';

/** Resumen de `GET /org/families/demographics` (forma real, docs/bda 3/6) */
export function DemographicsSummary({ data, compact }: { data: Demographics; compact?: boolean }) {
  const ages = Object.entries(data.age_groups ?? {}).filter(([, n]) => (n ?? 0) > 0) as [string, number][];
  const maxAge = Math.max(1, ...ages.map(([, n]) => n));
  const conditions = Object.entries(data.special_conditions ?? {}).filter(([, n]) => (n ?? 0) > 0) as [string, number][];

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-3">
        <StatCard label="Familias" value={formatNumber(data.total_families)} icon={Users} />
        <StatCard label="Personas" value={formatNumber(data.total_members)} icon={Users} />
        {data.weighted_beneficiaries != null && !compact ? (
          <StatCard label="Equivalente en adultos" value={formatNumber(data.weighted_beneficiaries)} icon={Scale} />
        ) : null}
      </View>

      {!compact && ages.length ? (
        <Card className="gap-3">
          <Text variant="label">Edades</Text>
          {ages.map(([k, n]) => (
            <View key={k} className="gap-1" accessible accessibilityLabel={`${label(ageGroupLabels, k)}: ${n}`}>
              <View className="flex-row justify-between">
                <Text className="text-sm">{label(ageGroupLabels, k)}</Text>
                <Text className="text-sm font-semibold">{n}</Text>
              </View>
              <ProgressBar value={n / maxAge} />
            </View>
          ))}
        </Card>
      ) : null}

      {conditions.length ? (
        <Card tone="info" className="gap-2">
          <View className="flex-row items-center gap-2">
            <HeartPulse size={18} color={colors.info} />
            <Text variant="label">Tener en cuenta al cocinar</Text>
          </View>
          {conditions.map(([k, n]) => (
            <Text key={k} className="text-sm">
              • {n} {label(specialConditionLabels, k).toLowerCase()}
            </Text>
          ))}
        </Card>
      ) : null}

      {!compact && data.family_types?.length ? (
        <Card className="gap-2">
          <Text variant="label">Tipos de familia</Text>
          {data.family_types.map((t) => (
            <View key={t.code || t.name} className="flex-row justify-between">
              <Text className="flex-1 text-sm">{t.name}</Text>
              <Text className="text-sm font-semibold">{t.count}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
