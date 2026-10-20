import { Info, Package, Scale, Search, Sparkles, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { CoverageBars, CoverageTotal } from '@/components/nutricion/CoverageBars';
import { MonthNavigator } from '@/components/nutricion/MonthNavigator';
import {
  Button,
  Card,
  ErrorState,
  Header,
  Input,
  ProgressBar,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonList,
  StatCard,
  Text,
} from '@/components/ui';
import { DemographicsSummary } from '@/components/familias/DemographicsSummary';
import { useSession } from '@/features/auth/store';
import { useDemographics } from '@/features/familias/hooks';
import { useNutritionalGroups, useProductSearch } from '@/features/nutricion/hooks';
import { nutrientRows } from '@/features/nutricion/summary';
import { useOrgNutrition } from '@/features/recibido/hooks';
import { currentMonth } from '@/features/recibido/period';
import { features } from '@/lib/features';
import { formatNumber } from '@/lib/format';
import { label, nutritionalGroupLabels } from '@/lib/labels';
import { isApiError } from '@/services/api/errors';
import { colors } from '@/theme/tokens';
import { router } from 'expo-router';

/**
 * Panel nutricional (`GET /org/nutrition`, post 11/14): lo recibido de cada grupo en el mes contra lo
 * que la organización necesita, con el porcentaje de cobertura.
 */
function CoverageSection() {
  const [month, setMonth] = useState(currentMonth);
  const nutrition = useOrgNutrition(month);
  const data = nutrition.data;

  return (
    <>
      <SectionHeader title="Cobertura nutricional" />
      <MonthNavigator month={month} onChange={setMonth} />
      {nutrition.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : nutrition.isError ? (
        <ErrorState error={nutrition.error} onRetry={() => nutrition.refetch()} />
      ) : data ? (
        <>
          <Card className="gap-4">
            <CoverageTotal data={data} />
            {data.totals.received_kg === 0 ? (
              <Text tone="muted">Este mes todavía no recibieron mercadería del Banco.</Text>
            ) : null}
          </Card>

          {data.needs_available ? null : (
            <Card tone="info" className="flex-row gap-3">
              <Info size={20} color={colors.info} />
              <Text className="flex-1 text-sm">
                El Banco todavía no cargó cuánto necesitan de cada grupo: por ahora se muestra sólo lo recibido.
              </Text>
            </Card>
          )}

          <Card className="gap-4">
            <Text variant="label">Por grupo de alimentos</Text>
            <CoverageBars data={data} />
            {data.unclassified_kg > 0 || data.bulk_kg > 0 || data.sources ? (
              <View className="gap-1 border-t border-border pt-3">
                {data.unclassified_kg > 0 ? (
                  <Text variant="caption">
                    {formatNumber(data.unclassified_kg)} kg recibidos todavía no tienen grupo de alimentos cargado.
                  </Text>
                ) : null}
                {data.bulk_kg > 0 ? (
                  <Text variant="caption">
                    {formatNumber(data.bulk_kg)} kg llegaron en bultos surtidos, que no se pueden repartir por grupo.
                  </Text>
                ) : null}
                {data.sources ? (
                  <Text variant="caption">
                    De pedidos al Banco: {formatNumber(data.sources.distributions_kg)} kg
                    {data.sources.mermas_kg > 0 ? ` · De rescates de merma: ${formatNumber(data.sources.mermas_kg)} kg` : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Card>
          <Text variant="caption">
            Lo que necesitan de cada grupo sale del cupo que el Banco calcula con las familias cargadas
            {data.beneficiaries?.total_beneficiaries != null
              ? ` (${formatNumber(data.beneficiaries.total_beneficiaries, 0)} personas)`
              : ''}
            .
          </Text>
        </>
      ) : null}
      <Button title="Ver todo lo recibido" icon={Package} variant="secondary" onPress={() => router.push('/recibido')} />
    </>
  );
}

function forbidden(e: unknown) {
  return isApiError(e) && e.kind === 'forbidden';
}

/**
 * Endpoints /nutritional-groups y /unified-products: sólo con el módulo `nutricionApi`.
 * Lo recibido por grupo ya no sale de `/nutrition/summary` sino de `/org/nutrition` (CoverageSection).
 */
function NutritionApiSections() {
  const [q, setQ] = useState('');
  const groups = useNutritionalGroups();
  const products = useProductSearch(q);
  const maxGrams = Math.max(...(groups.data ?? []).map((g) => g.daily_recommended_grams ?? 0), 1);

  return (
    <>
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

    </>
  );
}

/**
 * Nutrición: la cobertura del mes por grupo de alimentos (/org/nutrition, módulo `recibido`), la cuota
 * mensual (`monthly_quota_kg` de /org/profile, que el Banco recalcula con las familias) y las necesidades
 * de las familias (/org/families/demographics).
 */
export default function NutricionScreen() {
  const org = useSession((s) => s.organization);
  const demographics = useDemographics();
  const quota = org?.monthly_quota_kg ?? null;
  const weighted = demographics.data?.weighted_beneficiaries ?? null;
  // Cálculo propio, aproximado: cuota mensual / 30 días / personas (equivalente en adultos)
  const perPersonDay = quota && weighted ? (quota * 1000) / 30 / weighted : null;

  return (
    <Screen header={<Header title="Nutrición" subtitle="Lo que reciben y lo que necesitan" back backFallback="/mas" />}>
      {features.recibido ? <CoverageSection /> : null}

      <SectionHeader title="Cuota mensual" />
      <View className="flex-row flex-wrap gap-3">
        {quota != null ? <StatCard label="Kilos por mes asignados" value={`${formatNumber(quota)} kg`} icon={Scale} /> : null}
        {org?.total_beneficiaries != null ? (
          <StatCard label="Personas asistidas" value={formatNumber(org.total_beneficiaries)} icon={Users} />
        ) : null}
        {weighted != null ? <StatCard label="Equivalente en adultos" value={formatNumber(weighted)} icon={Users} /> : null}
      </View>
      {perPersonDay ? (
        <Card tone="accent">
          <Text>
            Son unos <Text className="font-bold">{formatNumber(perPersonDay, 0)} g por persona por día</Text> (cálculo aproximado:
            cuota mensual repartida en 30 días entre el equivalente en adultos).
          </Text>
        </Card>
      ) : null}
      <Text variant="caption">
        La cuota la calcula el Banco de Alimentos a partir de las familias cargadas: cada persona pesa según su necesidad
        (un bebé cuenta menos, una embarazada más).
      </Text>

      {demographics.data ? (
        <>
          <SectionHeader title="Necesidades de las familias" />
          <DemographicsSummary data={demographics.data} />
        </>
      ) : demographics.isPending ? (
        <SkeletonList count={2} />
      ) : null}

      {features.nutricionApi ? <NutritionApiSections /> : null}

      <Button
        title="Preguntarle al asistente nutricional"
        icon={Sparkles}
        variant="secondary"
        onPress={() => router.push({ pathname: '/asistente', params: { topic: 'nutricion' } })}
      />
    </Screen>
  );
}
