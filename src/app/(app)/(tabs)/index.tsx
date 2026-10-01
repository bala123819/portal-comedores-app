import { router } from 'expo-router';
import {
  Bell,
  ChefHat,
  MapPin,
  MessageSquare,
  Package,
  Scale,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react-native';
import { View } from 'react-native';
import { DemographicsSummary } from '@/components/familias/DemographicsSummary';
import { MermaCard } from '@/components/mermas/MermaCard';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { AssignmentCard } from '@/components/retiros/AssignmentCard';
import {
  Badge,
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
import { useSession } from '@/features/auth/store';
import { displayName } from '@/features/auth/types';
import { useDemographics } from '@/features/familias/hooks';
import { useAvailableMermas } from '@/features/mermas/hooks';
import { useUnreadCount } from '@/features/notificaciones/hooks';
import { useOrgProfile, useOrgStats } from '@/features/org/hooks';
import { features } from '@/lib/features';
import { formatNumber, parseDate } from '@/lib/format';
import { label, organizationStatusLabels } from '@/lib/labels';
import { isOpenAssignment } from '@/lib/status';
import { colors } from '@/theme/tokens';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

/** Sólo con el módulo `mermas` activo (hoy apagado con la API real) */
function MermasSection() {
  const assignments = useAssignments('pending');
  const mermas = useAvailableMermas();
  const open = flattenPages(assignments.data)
    .filter((a) => isOpenAssignment(String(a.status)))
    .sort(
      (a, b) =>
        (parseDate(a.scheduled_pickup_date)?.getTime() ?? 0) - (parseDate(b.scheduled_pickup_date)?.getTime() ?? 0),
    );
  const toConfirm = open.filter((a) => a.status === 'asignada');
  const next = open[0];
  const nuevas = flattenPages(mermas.data).slice(0, 3);

  return (
    <>
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
        <AssignmentCard assignment={next} onPress={() => router.push({ pathname: '/retiro/[id]', params: { id: next.id } })} />
      ) : (
        <Card>
          <Text tone="muted">No tenés retiros pendientes.</Text>
        </Card>
      )}
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
          <Text tone="muted">Por ahora no hay alimentos disponibles.</Text>
        </Card>
      )}
    </>
  );
}

export default function HomeScreen() {
  const me = useSession((s) => s.me);
  const profile = useOrgProfile();
  const stats = useOrgStats();
  const demographics = useDemographics();
  const unread = useUnreadCount();
  const org = profile.data;
  const impacto = stats.data?.impacto;

  const refreshing = profile.isRefetching || stats.isRefetching || demographics.isRefetching;
  const onRefresh = () => {
    void profile.refetch();
    void stats.refetch();
    void demographics.refetch();
    void unread.refetch();
  };

  return (
    <Screen
      header={
        <Header
          title={`${greeting()}${me?.first_name ? `, ${me.first_name}` : ''}`}
          subtitle={org?.name ?? displayName(me)}
          right={<NotificationBell />}
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {unread.data ? (
        <Card tone="accent" onPress={() => router.push('/notificaciones')} className="flex-row items-center gap-3">
          <Bell size={22} color={colors.accentForeground} />
          <Text className="flex-1">
            {unread.data === 1 ? 'Tenés 1 aviso sin leer' : `Tenés ${unread.data} avisos sin leer`}
          </Text>
        </Card>
      ) : null}

      {/* Organización */}
      {profile.isPending ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : org ? (
        <Card onPress={() => router.push('/organizacion')} className="gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="heading" className="flex-1">
              {org.name}
            </Text>
            {org.status ? (
              <Badge label={label(organizationStatusLabels, org.status)} tone={org.status === 'aprobada' ? 'success' : 'warning'} size="sm" />
            ) : null}
          </View>
          {org.address?.full_address ? (
            <View className="flex-row items-center gap-2">
              <MapPin size={16} color={colors.mutedForeground} />
              <Text className="flex-1 text-sm">{org.address.full_address}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* Números: impacto (lo único útil de /org/stats hoy) + personas y cuota del perfil */}
      <SectionHeader title="Tu organización en números" />
      {stats.isPending && profile.isPending ? (
        <View className="flex-row gap-3">
          <Skeleton className="h-28 flex-1 rounded-xl" />
          <Skeleton className="h-28 flex-1 rounded-xl" />
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {org?.total_beneficiaries != null ? (
            <StatCard label="Personas asistidas" value={formatNumber(org.total_beneficiaries)} icon={Users} />
          ) : null}
          {org?.monthly_quota_kg != null ? (
            <StatCard label="Cuota mensual" value={`${formatNumber(org.monthly_quota_kg)} kg`} icon={Scale} />
          ) : null}
          {impacto ? (
            <>
              <StatCard label="Kilos recibidos" value={`${formatNumber(impacto.total_kg_recibidos)} kg`} icon={Package} />
              <StatCard label="Entregas recibidas" value={formatNumber(impacto.total_distribuciones)} icon={Truck} />
            </>
          ) : null}
        </View>
      )}

      {features.mermas ? <MermasSection /> : null}

      {demographics.data ? (
        <>
          <SectionHeader
            title="Familias"
            action={<Button title="Ver familias" variant="ghost" size="sm" onPress={() => router.push('/familias')} />}
          />
          <DemographicsSummary data={demographics.data} compact />
        </>
      ) : null}

      <SectionHeader title="Accesos rápidos" />
      <View className="gap-2">
        <ListItem icon={ChefHat} title="¿Qué cocino hoy?" subtitle="Recetas para la cantidad de personas que asisten" onPress={() => router.push('/sugerir-recetas')} />
        <ListItem icon={Sparkles} title="Asistente" subtitle="Preguntá sobre recetas o nutrición" onPress={() => router.push('/asistente')} />
        <ListItem icon={MessageSquare} title="Ayuda" subtitle="Contacto y preguntas frecuentes" onPress={() => router.push('/ayuda')} />
      </View>
    </Screen>
  );
}
