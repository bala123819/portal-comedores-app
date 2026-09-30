import { router } from 'expo-router';
import { UserPlus, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, Header, InfiniteList, OfflineBanner, StatCard, Text } from '@/components/ui';
import { useDemographics, useFamilies } from '@/features/familias/hooks';
import { statsFromObject } from '@/features/nutricion/summary';
import { formatNumber } from '@/lib/format';
import { familyStatusLabels, housingLabels, label } from '@/lib/labels';
import { colors } from '@/theme/tokens';

function Demographics() {
  const q = useDemographics();
  const stats = statsFromObject(q.data).slice(0, 6);
  if (!stats.length) return null;
  return (
    <View className="flex-row flex-wrap gap-3">
      {stats.map((s) => (
        <StatCard key={s.key} label={s.label} value={`${formatNumber(s.value)}${s.unit ? ` ${s.unit}` : ''}`} />
      ))}
    </View>
  );
}

export default function FamiliasScreen() {
  const query = useFamilies();
  return (
    <View className="flex-1 bg-background">
      <Header title="Familias" subtitle="Personas que asiste la organización" back backFallback="/mas" />
      <OfflineBanner />
      <View className="w-full max-w-content flex-1 self-center">
        <InfiniteList
          query={query}
          header={
            <View className="gap-3 pb-3">
              <Demographics />
              <Button title="Registrar familia" icon={UserPlus} variant="secondary" onPress={() => router.push('/familias/nueva')} />
            </View>
          }
          renderItem={({ item }) => {
            const members = item.members?.length ?? item.members_count ?? null;
            return (
              <Card onPress={() => router.push({ pathname: '/familias/[id]', params: { id: item.id } })} className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
                  <Users size={22} color={colors.accentForeground} />
                </View>
                <View className="flex-1">
                  <Text variant="label">{item.name}</Text>
                  <Text variant="caption">
                    {[
                      members != null ? `${members} ${members === 1 ? 'persona' : 'personas'}` : null,
                      item.housing_situation ? label(housingLabels, item.housing_situation) : null,
                      item.status && item.status !== 'activa' ? label(familyStatusLabels, item.status) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </Card>
            );
          }}
          emptyTitle="No hay familias registradas"
          emptyMessage="Registrá las familias que asiste la organización."
          emptyAction={{ label: 'Registrar familia', onPress: () => router.push('/familias/nueva') }}
        />
      </View>
    </View>
  );
}
