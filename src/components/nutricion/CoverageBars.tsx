import { CircleAlert, CircleCheck, CircleDashed, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { ProgressBar, Text } from '@/components/ui';
import type { NutritionGroupCoverage, OrgNutrition } from '@/features/recibido/types';
import { formatNumber } from '@/lib/format';
import { coverageGroupLabels } from '@/lib/labels';
import { toneColor, type Tone } from '@/theme/tokens';

export interface CoverageLevel {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

/** Nivel de cobertura con ícono y texto (nunca sólo color). */
export function coverageLevel(pct: number): CoverageLevel {
  if (pct >= 100) return { label: 'Cubierto', tone: 'success', icon: CircleCheck };
  if (pct >= 50) return { label: 'En camino', tone: 'primary', icon: CircleDashed };
  return { label: 'Falta', tone: 'warning', icon: CircleAlert };
}

export function groupName(g: Pick<NutritionGroupCoverage, 'code' | 'name'>) {
  return coverageGroupLabels[g.code] ?? g.name;
}

function GroupRow({ group, withNeeds, maxKg }: { group: NutritionGroupCoverage; withNeeds: boolean; maxKg: number }) {
  const name = groupName(group);
  const pct = group.coverage_pct;

  if (!withNeeds || pct == null) {
    return (
      <View className="gap-1.5" accessible accessibilityLabel={`${name}: ${formatNumber(group.received_kg)} kilos recibidos`}>
        <View className="flex-row justify-between gap-3">
          <Text variant="label" className="flex-1">
            {name}
          </Text>
          <Text className="text-sm font-semibold">{formatNumber(group.received_kg)} kg</Text>
        </View>
        <ProgressBar value={maxKg ? group.received_kg / maxKg : 0} color={group.color} />
      </View>
    );
  }

  const level = coverageLevel(pct);
  const Icon = level.icon;
  return (
    <View
      className="gap-1.5"
      accessible
      accessibilityLabel={`${name}: ${formatNumber(pct, 0)} por ciento cubierto, ${formatNumber(group.received_kg)} de ${formatNumber(group.quota_kg)} kilos. ${level.label}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="label" className="flex-1">
          {name}
        </Text>
        <View className="flex-row items-center gap-1">
          <Icon size={16} color={toneColor[level.tone]} />
          <Text className="text-sm font-semibold">{formatNumber(pct, 0)} %</Text>
        </View>
      </View>
      <ProgressBar value={pct / 100} tone={level.tone} />
      <Text variant="caption">
        {formatNumber(group.received_kg)} kg de {formatNumber(group.quota_kg)} kg · {level.label}
      </Text>
    </View>
  );
}

/**
 * Panel nutricional (`GET /org/nutrition`): lo recibido de cada grupo contra lo que la organización
 * necesita. Si el Banco no cargó la necesidad por grupo (`needs_available: false`), sólo lo recibido.
 */
export function CoverageBars({ data }: { data: OrgNutrition }) {
  const withNeeds = data.needs_available;
  const maxKg = Math.max(...data.groups.map((g) => g.received_kg), 0);
  return (
    <View className="gap-4">
      {data.groups.map((g) => (
        <GroupRow key={g.code} group={g} withNeeds={withNeeds} maxKg={maxKg} />
      ))}
    </View>
  );
}

/** Cobertura total del período en una línea (Inicio y encabezado del panel). */
export function CoverageTotal({ data }: { data: OrgNutrition }) {
  const pct = data.needs_available ? data.totals.coverage_pct : null;
  if (pct == null) {
    return <Text variant="title">{formatNumber(data.totals.received_kg)} kg recibidos</Text>;
  }
  const level = coverageLevel(pct);
  const Icon = level.icon;
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icon size={22} color={toneColor[level.tone]} />
        <Text variant="title">{formatNumber(pct, 0)} % cubierto</Text>
      </View>
      <ProgressBar value={pct / 100} tone={level.tone} />
      <Text variant="caption">
        {formatNumber(data.totals.received_kg)} kg recibidos de {formatNumber(data.totals.quota_kg)} kg que necesitan
      </Text>
    </View>
  );
}
