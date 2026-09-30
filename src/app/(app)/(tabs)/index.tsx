import { router } from 'expo-router';
import {
  BarChart3,
  ChefHat,
  ClipboardCheck,
  MessageSquare,
  PackageCheck,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react-native';
import { View } from 'react-native';
import { MermaCard } from '@/components/mermas/MermaCard';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { AssignmentCard } from '@/components/retiros/AssignmentCard';
import {
  Button,
  Card,
  flattenPages,
  Header,
  ListItem,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonList,
  StatCard,
  Text,
} from '@/components/ui';
import { useAssignments } from '@/features/asignaciones/hooks';
import { displayName } from '@/features/auth/types';
import { useSession } from '@/features/auth/store';
import { useAvailableMermas } from '@/features/mermas/hooks';
import { statsFromObject } from '@/features/nutricion/summary';
import { useOrgProfile, useOrgStats } from '@/features/org/hooks';
import { formatNumber, parseDate } from '@/lib/format';
import { isOpenAssignment } from '@/lib/status';

const statIcons = [PackageCheck, ClipboardCheck, BarChart3, ShoppingBasket];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

export default function HomeScreen() {
  const me = useSession((s) => s.me);
  const profile = useOrgProfile();
  const stats = useOrgStats();
  const assignments = useAssignments('pending');
  const mermas = useAvailableMermas();

  const open = flattenPages(assignments.data)
    .filter((a) => isOpenAssignment(String(a.status)))
    .sort(
      (a, b) =>
        (parseDate(a.scheduled_pickup_date)?.getTime() ?? 0) -
        (parseDate(b.scheduled_pickup_date)?.getTime() ?? 0),
    );
  const toConfirm = open.filter((a) => a.status === 'asignada');
  const next = open[0];
  const nuevas = flattenPages(mermas.data).slice(0, 3);
  const statList = statsFromObject(stats.data).slice(0, 4);

  const refreshing = profile.isRefetching || stats.isRefetching || assignments.isRefetching || mermas.isRefetching;
  const onRefresh = () => {
    void profile.refetch();
    void stats.refetch();
    void assignments.refetch();
    void mermas.refetch();
  };

  return (
    <Screen
      header={
        <Header
          title={`${greeting()}${me?.first_name ? `, ${me.first_name}` : ''}`}
          subtitle={profile.data?.name ?? displayName(me)}
          right={<NotificationBell />}
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {toConfirm.length ? (
        <Card tone="warning" onPress={() => router.push('/retiros')} className="gap-1">
          <Text variant="label">
            {toConfirm.length === 1 ? 'Tenés 1 retiro para confirmar' : `Tenés ${toConfirm.length} retiros para confirmar`}
          </Text>
          <Text className="text-sm">Confirmá si pueden ir, así el Banco organiza la entrega.</Text>
        </Card>
      ) : null}

      <SectionHeader title="Próximo retiro" />
      {assignments.isPending ? (
        <SkeletonList count={1} />
      ) : next ? (
        <AssignmentCard
          assignment={next}
          onPress={() => router.push({ pathname: '/retiro/[id]', params: { id: next.id } })}
        />
      ) : (
        <Card className="gap-2">
          <Text>No tenés retiros pendientes.</Text>
          <Button title="Ver alimentos disponibles" variant="secondary" onPress={() => router.push('/disponibles')} />
        </Card>
      )}

      {stats.isPending ? (
        <View className="flex-row gap-3">
          <Skeleton className="h-28 flex-1 rounded-xl" />
          <Skeleton className="h-28 flex-1 rounded-xl" />
        </View>
      ) : statList.length ? (
        <>
          <SectionHeader title="Tu organización" />
          <View className="flex-row flex-wrap gap-3">
            {statList.map((s, i) => (
              <StatCard
                key={s.key}
                label={s.label}
                value={`${formatNumber(s.value)}${s.unit ? ` ${s.unit}` : ''}`}
                icon={statIcons[i % statIcons.length]}
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader
        title="Nuevos alimentos"
        action={<Button title="Ver todos" variant="ghost" size="sm" onPress={() => router.push('/disponibles')} />}
      />
      {mermas.isPending ? (
        <SkeletonList count={2} />
      ) : nuevas.length ? (
        nuevas.map((m) => (
          <MermaCard key={m.id} merma={m} onPress={() => router.push({ pathname: '/merma/[id]', params: { id: m.id } })} />
        ))
      ) : (
        <Card>
          <Text tone="muted">Por ahora no hay alimentos disponibles. Te avisamos cuando haya.</Text>
        </Card>
      )}

      <SectionHeader title="Accesos rápidos" />
      <View className="gap-2">
        <ListItem icon={ChefHat} title="¿Qué cocino hoy?" subtitle="Recetas con lo que tenés" onPress={() => router.push('/sugerir-recetas')} />
        <ListItem icon={Sparkles} title="Asistente" subtitle="Preguntá sobre recetas, nutrición o retiros" onPress={() => router.push('/asistente')} />
        <ListItem icon={MessageSquare} title="Ayuda" subtitle="Contacto y preguntas frecuentes" onPress={() => router.push('/ayuda')} />
      </View>
    </Screen>
  );
}
