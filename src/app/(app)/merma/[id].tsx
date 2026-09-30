import { router, useLocalSearchParams } from 'expo-router';
import {
  CalendarClock,
  Hand,
  Hourglass,
  MapPin,
  Navigation,
  Phone,
  Snowflake,
  TriangleAlert,
  UserRound,
} from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { NutritionBars } from '@/components/nutricion/NutritionBars';
import { SuggestedRecipes } from '@/components/recetas/SuggestedRecipes';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  flattenPages,
  Header,
  InfoRow,
  Screen,
  SectionHeader,
  SkeletonList,
  StatusBadge,
  Text,
} from '@/components/ui';
import { useMerma, useMermaNutrition } from '@/features/mermas/hooks';
import {
  availableQuantity,
  branchAddress,
  mapsUrl,
  mermaOrigin,
  mermaRequirements,
} from '@/features/mermas/selectors';
import { useNutritionalGroups } from '@/features/nutricion/hooks';
import { useApplications } from '@/features/postulaciones/hooks';
import { formatDay, formatDate, formatDeadline, formatQuantity, formatTimeRange } from '@/lib/format';
import { label, nutritionalGroupLabels, priorityLabels, productCategoryLabels, productConditionLabels } from '@/lib/labels';
import { isApiError } from '@/services/api/errors';
import { colors } from '@/theme/tokens';

export default function MermaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const merma = useMerma(id);
  const nutrition = useMermaNutrition(id);
  const groups = useNutritionalGroups();
  const pending = useApplications('pendiente');

  const m = merma.data;
  const alreadyApplied = flattenPages(pending.data).find((a) => a.merma_id === id);

  if (!m) {
    return (
      <Screen header={<Header title="Alimentos" back backFallback="/disponibles" />}>
        {merma.isPending ? <SkeletonList count={3} /> : <ErrorState error={merma.error} onRetry={() => merma.refetch()} />}
      </Screen>
    );
  }

  const deadline = formatDeadline(m.deadline);
  const address = branchAddress(m);
  const maps = mapsUrl(m);
  const reqs = mermaRequirements(m);
  const canApply = m.status === 'activa' && !alreadyApplied;
  const foods = (m.products ?? []).map((p) => ({ name: p.name, nutritional_group: p.nutritional_group }));
  const nutritionHidden = nutrition.isError && isApiError(nutrition.error) && nutrition.error.kind === 'forbidden';

  return (
    <Screen
      header={<Header title="Alimentos" subtitle={m.merma_number ?? undefined} back backFallback="/disponibles" />}
      refreshing={merma.isRefetching}
      onRefresh={() => merma.refetch()}
      footer={
        canApply ? (
          <Button
            title="Quiero retirarlo"
            icon={Hand}
            size="lg"
            fullWidth
            onPress={() => router.push({ pathname: '/postular/[id]', params: { id: m.id } })}
          />
        ) : alreadyApplied ? (
          <Button
            title="Ya lo pediste · ver pedido"
            variant="secondary"
            fullWidth
            onPress={() => router.push({ pathname: '/postulacion/[id]', params: { id: alreadyApplied.id } })}
          />
        ) : null
      }
    >
      <View className="flex-row flex-wrap gap-2">
        <StatusBadge kind="merma" status={m.status} />
        {m.is_urgent || m.priority === 'critica' ? <Badge label="Urgente" tone="warning" icon={TriangleAlert} /> : null}
        {m.priority && m.priority !== 'normal' && m.priority !== 'critica' ? (
          <Badge label={label(priorityLabels, m.priority)} tone="muted" />
        ) : null}
      </View>

      <View className="gap-1">
        <Text variant="title">{m.title}</Text>
        <Text tone="muted">{mermaOrigin(m)}</Text>
      </View>
      {m.description ? <Text>{m.description}</Text> : null}

      <Card className="gap-4">
        <InfoRow
          icon={CalendarClock}
          label="Cuándo retirar"
          value={`${formatDay(m.pickup_date)} ${formatTimeRange(m.pickup_time_start, m.pickup_time_end)}`.trim()}
        />
        <InfoRow
          icon={Hourglass}
          label="Vencimiento"
          value={deadline.text}
          tone={deadline.urgent || deadline.expired ? 'destructive' : 'muted'}
        />
        <InfoRow icon={MapPin} label="Dónde" value={address} />
        <InfoRow icon={UserRound} label="Contacto en el lugar" value={m.contact_name} />
        <InfoRow icon={Phone} label="Teléfono" value={m.contact_phone} />
        <View className="flex-row flex-wrap gap-2">
          {maps ? (
            <Button title="Cómo llegar" icon={Navigation} variant="outline" size="sm" onPress={() => Linking.openURL(maps)} />
          ) : null}
          {m.contact_phone ? (
            <Button
              title="Llamar"
              icon={Phone}
              variant="outline"
              size="sm"
              onPress={() => Linking.openURL(`tel:${m.contact_phone!.replace(/[^\d+]/g, '')}`)}
            />
          ) : null}
        </View>
      </Card>

      {reqs.length ? (
        <Card tone="info" className="gap-2">
          <View className="flex-row items-center gap-2">
            <Snowflake size={18} color={colors.info} />
            <Text variant="label">Tené en cuenta</Text>
          </View>
          {reqs.map((r) => (
            <Text key={r}>• {r}</Text>
          ))}
        </Card>
      ) : null}

      <SectionHeader title="Qué incluye" />
      <View className="gap-2">
        {(m.products ?? []).map((p) => (
          <Card key={p.id} className="gap-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text variant="label" className="flex-1">
                {p.name}
              </Text>
              <Text className="font-bold">{formatQuantity(availableQuantity(p), p.unit)}</Text>
            </View>
            <Text variant="caption">
              {[
                p.category ? label(productCategoryLabels, p.category) : null,
                p.nutritional_group ? label(nutritionalGroupLabels, p.nutritional_group) : null,
                p.condition ? label(productConditionLabels, p.condition) : null,
                p.expiry_date ? `Vence ${formatDate(p.expiry_date)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {p.description ? <Text className="text-sm">{p.description}</Text> : null}
          </Card>
        ))}
        {!m.products?.length ? <Text tone="muted">El donante no cargó el detalle de productos.</Text> : null}
      </View>

      {!nutritionHidden ? (
        <>
          <SectionHeader title="Qué aporta" />
          <Card>
            {nutrition.isPending ? (
              <SkeletonList count={1} />
            ) : nutrition.isError ? (
              <Text tone="muted">No pudimos cargar la información nutricional.</Text>
            ) : (
              <NutritionBars data={nutrition.data} groups={groups.data} />
            )}
          </Card>
        </>
      ) : null}

      <SuggestedRecipes foods={foods} context={{ mermaId: m.id }} />

      <WhatsAppButton context={{ kind: 'merma', titulo: m.title, numero: m.merma_number }} />
    </Screen>
  );
}
