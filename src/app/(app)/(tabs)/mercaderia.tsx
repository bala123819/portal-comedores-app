import { Redirect, router } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { DistributionCard } from '@/components/pedidos/DistributionCard';
import { QuotaCard } from '@/components/pedidos/QuotaCard';
import {
  Button,
  Card,
  Chip,
  Header,
  InfiniteList,
  OfflineBanner,
  Skeleton,
  Text,
} from '@/components/ui';
import { useDistributions, useQuota, useWaitingRequests } from '@/features/pedidos/hooks';
import { ORDER_RULES, type DistributionsFilter } from '@/features/pedidos/types';
import { features } from '@/lib/features';

type Scope = 'abiertos' | 'distribuida' | 'all';

const emptyTitles: Record<Scope, string> = {
  abiertos: 'No tenés pedidos en curso',
  distribuida: 'Todavía no retiraste pedidos',
  all: 'Todavía no hiciste pedidos',
};

function MercaderiaScreenContent() {
  const [scope, setScope] = useState<Scope>('abiertos');
  const query = useDistributions(scope === 'all' ? undefined : (scope as DistributionsFilter));
  const quota = useQuota();
  const waiting = useWaitingRequests();

  const header = (
    <View className="gap-4 pb-3">
      {quota.isPending ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : quota.data ? (
        <QuotaCard quota={quota.data} />
      ) : null}

      {waiting.limitReached ? (
        <Card tone="warning" className="gap-1">
          <Text variant="label">
            Tenés {ORDER_RULES.maxOpenRequests} pedidos esperando respuesta
          </Text>
          <Text className="text-sm">
            Es el máximo que acepta el Banco. Cuando revisen alguno vas a poder hacer otro, o podés
            cancelar uno que ya no necesites.
          </Text>
        </Card>
      ) : null}

      <Button
        title="Hacer un pedido"
        icon={ShoppingCart}
        size="lg"
        fullWidth
        disabled={waiting.limitReached}
        onPress={() => router.push('/pedido/nuevo')}
      />

      <View className="flex-row flex-wrap gap-2">
        <Chip
          label="En curso"
          selected={scope === 'abiertos'}
          onPress={() => setScope('abiertos')}
        />
        <Chip
          label="Entregados"
          selected={scope === 'distribuida'}
          onPress={() => setScope('distribuida')}
        />
        <Chip label="Todos" selected={scope === 'all'} onPress={() => setScope('all')} />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Mercadería"
        subtitle="Pedidos al Banco de Alimentos"
        right={<NotificationBell />}
      />
      <OfflineBanner />
      <View className="w-full max-w-content flex-1 self-center">
        <InfiniteList
          query={query}
          header={header}
          renderItem={({ item }) => (
            <DistributionCard
              distribution={item}
              onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: item.id } })}
            />
          )}
          emptyTitle={emptyTitles[scope]}
          emptyMessage="Elegí productos del catálogo del Banco y mandá tu pedido. El Banco lo revisa y te avisa."
        />
      </View>
    </View>
  );
}

/** Módulo `pedidos` (activo con la API real desde 2026-10-14, ver D-12). */
export default function MercaderiaScreen() {
  if (!features.pedidos) return <Redirect href="/" />;
  return <MercaderiaScreenContent />;
}
