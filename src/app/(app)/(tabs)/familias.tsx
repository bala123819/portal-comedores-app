import { router } from 'expo-router';
import { Search, UserPlus, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { DemographicsSummary } from '@/components/familias/DemographicsSummary';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { Button, Card, Chip, Header, InfiniteList, Input, OfflineBanner, Text } from '@/components/ui';
import { useDemographics, useFamilies } from '@/features/familias/hooks';
import type { FamilyStatus } from '@/features/familias/types';
import { features } from '@/lib/features';
import { familyStatusLabels, housingLabels, label } from '@/lib/labels';
import { colors } from '@/theme/tokens';

/** Familias de la organización: sólo lectura con la API real (el alta no existe hoy en el backend). */
export default function FamiliasScreen() {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FamilyStatus | undefined>(undefined);
  // Debounce de la búsqueda: no disparar un pedido por tecla (límite de 60/min).
  useEffect(() => {
    const t = setTimeout(() => setSearch(text), 500);
    return () => clearTimeout(t);
  }, [text]);

  const query = useFamilies({ search, status });
  const demographics = useDemographics();

  return (
    <View className="flex-1 bg-background">
      <Header title="Familias" subtitle="Personas que asiste la organización" right={<NotificationBell />} />
      <OfflineBanner />
      <View className="w-full max-w-content flex-1 self-center">
        <InfiniteList
          query={query}
          header={
            <View className="gap-3 pb-3">
              {demographics.data ? <DemographicsSummary data={demographics.data} compact /> : null}
              {features.familiasAlta ? (
                <Button title="Registrar familia" icon={UserPlus} variant="secondary" onPress={() => router.push('/familia/nueva')} />
              ) : null}
              <Button title="Ver resumen completo" variant="outline" size="sm" className="self-start" onPress={() => router.push('/familia/resumen')} />
              <Input icon={Search} placeholder="Buscar por nombre o código" value={text} onChangeText={setText} accessibilityLabel="Buscar familias" returnKeyType="search" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                <Chip label="Todas" selected={!status} onPress={() => setStatus(undefined)} />
                {(['activa', 'inactiva', 'suspendida'] as const).map((s) => (
                  <Chip key={s} label={label(familyStatusLabels, s) + 's'} selected={status === s} onPress={() => setStatus(s)} />
                ))}
              </ScrollView>
            </View>
          }
          renderItem={({ item }) => {
            const members = item.total_members ?? item.members?.length ?? null;
            return (
              <Card onPress={() => router.push({ pathname: '/familia/[id]', params: { id: item.id } })} className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
                  <Users size={22} color={colors.accentForeground} />
                </View>
                <View className="flex-1">
                  <Text variant="label">{item.name}</Text>
                  <Text variant="caption">
                    {[
                      members != null ? `${members} ${members === 1 ? 'persona' : 'personas'}` : null,
                      item.family_type?.name,
                      item.housing_situation ? label(housingLabels, item.housing_situation) : null,
                      item.status && item.status !== 'activa' ? label(familyStatusLabels, item.status) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {item.head_of_household ? <Text variant="caption">Referente: {item.head_of_household.full_name}</Text> : null}
                </View>
              </Card>
            );
          }}
          emptyTitle={search || status ? 'No encontramos familias con ese filtro' : 'No hay familias registradas'}
          emptyMessage={
            search || status
              ? 'Probá con otra búsqueda.'
              : 'Las familias las carga el Banco de Alimentos. Si falta alguna, avisales.'
          }
          emptyAction={search || status ? { label: 'Ver todas', onPress: () => { setText(''); setStatus(undefined); } } : undefined}
        />
      </View>
    </View>
  );
}
