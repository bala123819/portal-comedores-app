import { Search, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { NutritionBars } from '@/components/nutricion/NutritionBars';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  Header,
  Input,
  ProgressBar,
  Screen,
  SectionHeader,
  SkeletonList,
  StatCard,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { useNutritionalGroups, useNutritionSummary, useProductSearch } from '@/features/nutricion/hooks';
import { nutrientRows } from '@/features/nutricion/summary';
import { formatNumber, toISODate } from '@/lib/format';
import { label, nutritionalGroupLabels } from '@/lib/labels';
import { isApiError } from '@/services/api/errors';
import { router } from 'expo-router';

const RANGES = [
  { key: '1m', label: 'Último mes', months: 1 },
  { key: '3m', label: 'Últimos 3 meses', months: 3 },
  { key: '12m', label: 'Último año', months: 12 },
] as const;

function forbidden(e: unknown) {
  return isApiError(e) && e.kind === 'forbidden';
}

export default function NutricionScreen() {
  const org = useSession((s) => s.organization);
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('1m');
  const [q, setQ] = useState('');
  const months = RANGES.find((r) => r.key === range)!.months;
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);

  const groups = useNutritionalGroups();
  const summary = useNutritionSummary(toISODate(from), toISODate(to));
  const products = useProductSearch(q);
  const quota = org?.nutritional_quota ?? org?.manual_quota ?? null;
  const maxGrams = Math.max(...(groups.data ?? []).map((g) => g.daily_recommended_grams ?? 0), 1);

  return (
    <Screen header={<Header title="Nutrición" subtitle="Qué aporta lo que reciben" back backFallback="/mas" />}>
      {quota != null ? (
        <StatCard label="Cuota nutricional asignada" value={formatNumber(quota)} />
      ) : null}

      {!forbidden(summary.error) ? (
        <>
          <SectionHeader title="Lo que recibieron" />
          <View className="flex-row flex-wrap gap-2">
            {RANGES.map((r) => (
              <Chip key={r.key} label={r.label} selected={range === r.key} onPress={() => setRange(r.key)} />
            ))}
          </View>
          <Card>
            {summary.isPending ? (
              <SkeletonList count={1} />
            ) : summary.isError ? (
              <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
            ) : (
              <NutritionBars data={summary.data} groups={groups.data} />
            )}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Grupos de alimentos" />
      {groups.isPending ? (
        <SkeletonList count={2} />
      ) : groups.isError ? (
        forbidden(groups.error) ? null : <ErrorState error={groups.error} onRetry={() => groups.refetch()} />
      ) : (
        <View className="gap-2">
          {[...(groups.data ?? [])]
            .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99))
            .map((g) => (
              <Card key={g.id} className="gap-2">
                <View className="flex-row items-center justify-between gap-2">
                  <Text variant="label" className="flex-1">
                    {g.name || label(nutritionalGroupLabels, g.code)}
                  </Text>
                  {g.daily_recommended_grams ? (
                    <Text className="text-sm font-semibold">{formatNumber(g.daily_recommended_grams, 0)} g por día</Text>
                  ) : null}
                </View>
                {g.daily_recommended_grams ? (
                  <ProgressBar value={g.daily_recommended_grams / maxGrams} color={g.color} />
                ) : null}
                {g.description ? <Text variant="caption">{g.description}</Text> : null}
              </Card>
            ))}
          <Text variant="caption">Cantidad diaria recomendada por persona, según el Banco de Alimentos.</Text>
        </View>
      )}

      <SectionHeader title="Buscar un producto" />
      <Input icon={Search} placeholder="Ej: leche, arroz, lentejas" value={q} onChangeText={setQ} accessibilityLabel="Buscar producto" />
      {q.trim().length >= 2 ? (
        products.isPending ? (
          <SkeletonList count={1} />
        ) : products.isError ? (
          forbidden(products.error) ? (
            <Text tone="muted">Tu usuario no tiene acceso a los datos de productos.</Text>
          ) : (
            <ErrorState error={products.error} onRetry={() => products.refetch()} />
          )
        ) : products.data?.length ? (
          <View className="gap-2">
            {products.data.map((p) => {
              const rows = nutrientRows(p.nutriments ?? p.nutrition_data);
              return (
                <Card key={p.id} className="gap-2">
                  <Text variant="label">{p.name}</Text>
                  {p.brand || p.quantity_text ? <Text variant="caption">{[p.brand, p.quantity_text].filter(Boolean).join(' · ')}</Text> : null}
                  {p.nutritional_group?.code ? (
                    <Text className="text-sm">{label(nutritionalGroupLabels, p.nutritional_group.code)}</Text>
                  ) : null}
                  {rows.length ? (
                    rows.map((r) => (
                      <View key={r.key} className="flex-row justify-between">
                        <Text className="flex-1 text-sm">{r.label}</Text>
                        <Text className="text-sm font-semibold">{formatNumber(r.value)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text variant="caption">Sin datos nutricionales cargados.</Text>
                  )}
                </Card>
              );
            })}
          </View>
        ) : (
          <Text tone="muted">No encontramos productos con ese nombre.</Text>
        )
      ) : null}

      <Button
        title="Preguntarle al asistente nutricional"
        icon={Sparkles}
        variant="secondary"
        onPress={() => router.push({ pathname: '/asistente', params: { topic: 'nutricion' } })}
      />
    </Screen>
  );
}
