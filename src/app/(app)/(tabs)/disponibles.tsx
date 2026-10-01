import { Redirect, router } from 'expo-router';
import { MapPin, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { features } from '@/lib/features';
import { ScrollView, View } from 'react-native';
import { MermaCard } from '@/components/mermas/MermaCard';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { Chip, Header, InfiniteList, OfflineBanner, Text } from '@/components/ui';
import { useAvailableMermas } from '@/features/mermas/hooks';
import type { AvailableMermasFilters } from '@/features/mermas/types';

type FilterKey = 'todos' | 'urgentes' | 'cerca' | 'alta';

const FILTERS: { key: FilterKey; label: string; value: AvailableMermasFilters; icon?: typeof MapPin }[] = [
  { key: 'todos', label: 'Todos', value: {} },
  { key: 'urgentes', label: 'Urgentes', value: { urgent: true }, icon: TriangleAlert },
  { key: 'cerca', label: 'A menos de 10 km', value: { max_distance: 10 }, icon: MapPin },
  { key: 'alta', label: 'Prioridad alta', value: { priority: 'alta' } },
];

function DisponiblesScreenContent() {
  const [filter, setFilter] = useState<FilterKey>('todos');
  const current = FILTERS.find((f) => f.key === filter)!;
  const query = useAvailableMermas(current.value);

  return (
    <View className="flex-1 bg-background">
      <Header title="Alimentos disponibles" subtitle="Elegí qué podés retirar" right={<NotificationBell />} />
      <OfflineBanner />
      <View className="w-full max-w-content flex-1 self-center">
        <InfiniteList
          query={query}
          header={
            <View className="gap-3 pb-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {FILTERS.map((f) => (
                  <Chip
                    key={f.key}
                    label={f.label}
                    icon={f.icon}
                    selected={filter === f.key}
                    onPress={() => setFilter(f.key)}
                  />
                ))}
              </ScrollView>
              {query.data?.pages[0]?.meta.total ? (
                <Text variant="caption">
                  {query.data.pages[0].meta.total === 1
                    ? 'Hay 1 donación disponible'
                    : `Hay ${query.data.pages[0].meta.total} donaciones disponibles`}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <MermaCard merma={item} onPress={() => router.push({ pathname: '/merma/[id]', params: { id: item.id } })} />
          )}
          emptyTitle={filter === 'todos' ? 'No hay alimentos disponibles' : 'No hay alimentos con ese filtro'}
          emptyMessage={
            filter === 'todos'
              ? 'Cuando un donante publique alimentos te vamos a avisar.'
              : 'Probá con otro filtro para ver más opciones.'
          }
          emptyAction={filter !== 'todos' ? { label: 'Ver todos', onPress: () => setFilter('todos') } : undefined}
        />
      </View>
    </View>
  );
}

/** Módulo de mermas apagado (el backend no lo ofrece hoy): la pestaña está oculta y la URL redirige. */
export default function DisponiblesScreen() {
  if (!features.mermas) return <Redirect href="/" />;
  return <DisponiblesScreenContent />;
}
