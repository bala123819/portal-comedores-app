import { router } from 'expo-router';
import { Salad } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { ReceivedCard } from '@/components/recibido/ReceivedCard';
import { ReceivedSummaryCard } from '@/components/recibido/ReceivedSummaryCard';
import { Button, Chip, Header, InfiniteList, OfflineBanner, Skeleton, Text } from '@/components/ui';
import { useReceived } from '@/features/recibido/hooks';
import { periodRange, RECEIVED_PERIODS, type ReceivedPeriodKey } from '@/features/recibido/period';
import type { ReceivedItem, ReceivedKind } from '@/features/recibido/types';
import { features } from '@/lib/features';

type KindScope = 'all' | ReceivedKind;

/** A dónde lleva cada entrega: el pedido al detalle del pedido; la merma al retiro (si el módulo está activo). */
function openItem(item: ReceivedItem): (() => void) | undefined {
  if (item.kind === 'distribution' && features.pedidos) {
    return () => router.push({ pathname: '/pedido/[id]', params: { id: item.id } });
  }
  if (item.kind === 'merma' && features.mermas) {
    return () => router.push({ pathname: '/retiro/[id]', params: { id: item.id } });
  }
  return undefined;
}

/**
 * Lo recibido (`GET /org/received`): pedidos entregados y mermas retiradas en un período, con el
 * resumen del período entero (docs/bda/11-recibido-nutricion.md).
 */
export default function RecibidoScreen() {
  const [period, setPeriod] = useState<ReceivedPeriodKey>('90d');
  const [kind, setKind] = useState<KindScope>('all');
  const query = useReceived({ ...periodRange(period), kind: kind === 'all' ? undefined : kind });
  const summary = query.data?.pages[0]?.summary;
  // Con un origen elegido, el resumen sólo trae ese origen: el filtro se sigue mostrando para poder volver
  const showKindFilter =
    kind !== 'all' || ((summary?.by_kind?.merma?.count ?? 0) > 0 && (summary?.by_kind?.distribution?.count ?? 0) > 0);

  const header = (
    <View className="gap-4 pb-3">
      <View className="flex-row flex-wrap gap-2" accessibilityLabel="Período">
        {RECEIVED_PERIODS.map((p) => (
          <Chip key={p.key} label={p.label} selected={period === p.key} onPress={() => setPeriod(p.key)} />
        ))}
      </View>

      {query.isPending ? (
        <Skeleton className="h-36 w-full rounded-xl" />
      ) : summary && summary.total_count > 0 ? (
        <ReceivedSummaryCard summary={summary} />
      ) : null}

      {/* El filtro por origen sólo tiene sentido si hay de los dos tipos */}
      {showKindFilter ? (
        <View className="flex-row flex-wrap gap-2" accessibilityLabel="Origen">
          <Chip label="Todo" selected={kind === 'all'} onPress={() => setKind('all')} />
          <Chip label="Pedidos al Banco" selected={kind === 'distribution'} onPress={() => setKind('distribution')} />
          <Chip label="Rescates de merma" selected={kind === 'merma'} onPress={() => setKind('merma')} />
        </View>
      ) : null}

      <Button
        title="Ver el panel nutricional"
        icon={Salad}
        variant="secondary"
        fullWidth
        onPress={() => router.push('/nutricion')}
      />

      {query.data && summary && summary.total_count > 0 ? (
        <Text variant="label">Entregas</Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <Header title="Lo recibido" subtitle="Lo que llegó del Banco de Alimentos" back backFallback="/mas" />
      <OfflineBanner />
      <View className="w-full max-w-content flex-1 self-center">
        <InfiniteList
          query={query}
          header={header}
          renderItem={({ item }) => <ReceivedCard item={item} onPress={openItem(item)} />}
          emptyTitle="No recibieron nada en este período"
          emptyMessage="Acá aparecen los pedidos que retiraron del Banco. Probá con un período más largo."
          emptyAction={
            features.pedidos ? { label: 'Hacer un pedido', onPress: () => router.push('/pedido/nuevo') } : undefined
          }
        />
      </View>
    </View>
  );
}
