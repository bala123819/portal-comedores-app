import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Package,
  Scale,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from '@/components/brand/BrandMark';
import { DemographicsSummary } from '@/components/familias/DemographicsSummary';
import { CoverageTotal, groupName } from '@/components/nutricion/CoverageBars';
import { MermaCard } from '@/components/mermas/MermaCard';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { DistributionCard } from '@/components/pedidos/DistributionCard';
import { QuotaCard } from '@/components/pedidos/QuotaCard';
import { AssignmentCard } from '@/components/retiros/AssignmentCard';
import {
  Button,
  Card,
  flattenPages,
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
import { useDemographics } from '@/features/familias/hooks';
import { useInteractionsSummary } from '@/features/interacciones/hooks';
import { useAvailableMermas } from '@/features/mermas/hooks';
import { useUnreadCount } from '@/features/notificaciones/hooks';
import { useOrgProfile, useOrgStats } from '@/features/org/hooks';
import { useDistributions, useQuota } from '@/features/pedidos/hooks';
import { useOrgNutrition } from '@/features/recibido/hooks';
import { currentMonth } from '@/features/recibido/period';
import { features } from '@/lib/features';
import { formatNumber, parseDate } from '@/lib/format';
import { label, organizationStatusLabels } from '@/lib/labels';
import { isOpenAssignment } from '@/lib/status';
import { colors } from '@/theme/tokens';
import type { Organization } from '@/features/org/types';

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
        (parseDate(a.scheduled_pickup_date)?.getTime() ?? 0) -
        (parseDate(b.scheduled_pickup_date)?.getTime() ?? 0),
    );
  const toConfirm = open.filter((a) => a.status === 'asignada');
  const next = open[0];
  const nuevas = flattenPages(mermas.data).slice(0, 3);

  return (
    <>
      {toConfirm.length ? (
        <Card tone="warning" onPress={() => router.push('/retiros')} className="gap-1">
          <Text variant="label">
            {toConfirm.length === 1
              ? 'Tenés 1 retiro para confirmar'
              : `Tenés ${toConfirm.length} retiros para confirmar`}
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
        <Card>
          <Text tone="muted">No tenés retiros pendientes.</Text>
        </Card>
      )}
      <SectionHeader
        title="Nuevos alimentos"
        action={
          <Button
            title="Ver todos"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/disponibles')}
          />
        }
      />
      {mermas.isPending ? (
        <SkeletonList count={2} />
      ) : nuevas.length ? (
        nuevas.map((m) => (
          <MermaCard
            key={m.id}
            merma={m}
            onPress={() => router.push({ pathname: '/merma/[id]', params: { id: m.id } })}
          />
        ))
      ) : (
        <Card>
          <Text tone="muted">Por ahora no hay alimentos disponibles.</Text>
        </Card>
      )}
    </>
  );
}

/** Pedidos de mercadería: cupo del mes y pedidos en curso (módulo `pedidos`) */
function PedidosSection() {
  const quota = useQuota();
  const open = useDistributions('abiertos');
  const items = flattenPages(open.data);
  const ready = items.filter((d) => d.status === 'lista_para_retiro');
  const next = ready[0] ?? items[0];

  return (
    <>
      <SectionHeader
        title="Pedidos de mercadería"
        action={
          <Button
            title="Ver pedidos"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/mercaderia')}
          />
        }
      />
      {ready.length ? (
        <Card tone="accent" onPress={() => router.push('/mercaderia')} className="gap-1">
          <Text variant="label">
            {ready.length === 1
              ? 'Tenés 1 pedido listo para retirar'
              : `Tenés ${ready.length} pedidos listos para retirar`}
          </Text>
          <Text className="text-sm">
            Ya pueden ir a buscarlo. Descargá el remito desde el pedido.
          </Text>
        </Card>
      ) : null}
      {quota.data ? (
        <QuotaCard quota={quota.data} compact />
      ) : quota.isPending ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : null}
      {open.isPending ? (
        <SkeletonList count={1} />
      ) : next ? (
        <DistributionCard
          distribution={next}
          onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: next.id } })}
        />
      ) : (
        <Card className="gap-3">
          <Text tone="muted">No tenés pedidos en curso.</Text>
          <Button
            title="Hacer un pedido"
            icon={ShoppingCart}
            variant="secondary"
            onPress={() => router.push('/pedido/nuevo')}
          />
        </Card>
      )}
    </>
  );
}

/** Cobertura nutricional del mes (módulo `recibido`, /org/nutrition) con los grupos que más faltan */
function NutricionSection() {
  const nutrition = useOrgNutrition(currentMonth());
  const data = nutrition.data;
  const missing = data?.needs_available
    ? [...data.groups]
        .filter((g) => g.coverage_pct != null && g.coverage_pct < 50)
        .sort((a, b) => (a.coverage_pct ?? 0) - (b.coverage_pct ?? 0))
        .slice(0, 2)
    : [];

  if (nutrition.isError) return null;
  return (
    <>
      <SectionHeader
        title="Alimentación de este mes"
        action={
          <Button
            title="Ver panel"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/nutricion')}
          />
        }
      />
      {data ? (
        <Card
          onPress={() => router.push('/nutricion')}
          className="gap-3"
          accessibilityLabel="Ver el panel nutricional"
        >
          <CoverageTotal data={data} />
          {missing.length ? (
            <Text className="text-sm">
              Lo que más falta:{' '}
              {missing
                .map((g) => `${groupName(g).toLowerCase()} (${formatNumber(g.coverage_pct, 0)} %)`)
                .join(' y ')}
              .
            </Text>
          ) : null}
        </Card>
      ) : (
        <Skeleton className="h-28 w-full rounded-xl" />
      )}
    </>
  );
}

/**
 * Encabezado de bienvenida: saludo + organización sobre el verde institucional.
 * Reemplaza al Header genérico y a la tarjeta de organización (mismo destino: /organizacion).
 */
function HomeHero({
  title,
  org,
  loading,
}: {
  title: string;
  org: Organization | undefined;
  loading: boolean;
}) {
  return (
    <View className="bg-primary">
      <View className="w-full gap-4 px-[1.3rem] pb-5 pt-3 md:px-8 lg:px-12">
        <View className="flex-row items-center gap-3">
          {/* Mismo alto que las dos líneas de texto: text-sm (20) + text-2xl (32) */}
          <BrandMark size={52} inverted />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-primary-foreground/80">
              Portal Comedores
            </Text>
            <Text
              variant="title"
              className="text-primary-foreground"
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
          </View>
          <NotificationBell color={colors.primaryForeground} className="active:bg-white/15" />
        </View>

        {loading ? (
          <View className="h-20 w-full rounded-2xl bg-white/15" />
        ) : org ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${org.name}. Ver datos de la organización`}
            onPress={() => router.push('/organizacion')}
            className="flex-row items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 active:bg-white/20 web:hover:bg-white/15"
          >
            <View className="flex-1 gap-1.5">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text variant="heading" className="flex-shrink text-primary-foreground">
                  {org.name}
                </Text>
                {org.status ? (
                  <View className="rounded-full bg-white/20 px-2.5 py-0.5">
                    <Text className="text-xs font-bold text-primary-foreground">
                      {label(organizationStatusLabels, org.status)}
                    </Text>
                  </View>
                ) : null}
              </View>
              {org.address?.full_address ? (
                <View className="flex-row items-center gap-1.5">
                  <MapPin size={15} color={colors.primaryForeground} />
                  <Text className="flex-1 text-sm text-primary-foreground/90" numberOfLines={1}>
                    {org.address.full_address}
                  </Text>
                </View>
              ) : null}
            </View>
            <ChevronRight size={20} color={colors.primaryForeground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const me = useSession((s) => s.me);
  const profile = useOrgProfile();
  const stats = useOrgStats();
  const demographics = useDemographics();
  const unread = useUnreadCount();
  const interactions = useInteractionsSummary();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const org = profile.data;
  const impacto = stats.data?.impacto;

  const refreshing = profile.isRefetching || stats.isRefetching || demographics.isRefetching;
  const onRefresh = () => {
    void profile.refetch();
    void stats.refetch();
    void demographics.refetch();
    void unread.refetch();
    void interactions.refetch();
    if (features.pedidos) void qc.invalidateQueries({ queryKey: ['orders'] });
    if (features.recibido) void qc.invalidateQueries({ queryKey: ['received'] });
  };

  return (
    <Screen
      // Sólo la franja de la barra de estado queda fija (en web mide 0); el panel se desplaza.
      header={<View className="bg-primary" style={{ height: insets.top }} />}
      hero={
        <HomeHero
          title={`${greeting()}${me?.first_name ? `, ${me.first_name}` : ''}`}
          org={org}
          loading={profile.isPending}
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {unread.data ? (
        <Card
          tone="accent"
          onPress={() => router.push('/notificaciones')}
          className="flex-row items-center gap-3"
        >
          <Bell size={22} color={colors.accentForeground} />
          <Text className="flex-1">
            {unread.data === 1 ? 'Tenés 1 aviso sin leer' : `Tenés ${unread.data} avisos sin leer`}
          </Text>
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
            <StatCard
              label="Personas asistidas"
              value={formatNumber(org.total_beneficiaries)}
              icon={Users}
            />
          ) : null}
          {org?.monthly_quota_kg != null ? (
            <StatCard
              label="Cuota mensual"
              value={`${formatNumber(org.monthly_quota_kg)} kg`}
              icon={Scale}
            />
          ) : null}
          {impacto ? (
            <>
              <StatCard
                label="Kilos recibidos"
                value={`${formatNumber(impacto.total_kg_recibidos)} kg`}
                icon={Package}
              />
              <StatCard
                label="Entregas recibidas"
                value={formatNumber(impacto.total_distribuciones)}
                icon={Truck}
              />
            </>
          ) : null}
        </View>
      )}

      {features.pedidos ? <PedidosSection /> : null}

      {features.recibido ? <NutricionSection /> : null}

      {features.mermas ? <MermasSection /> : null}

      {demographics.data ? (
        <>
          <SectionHeader
            title="Familias"
            action={
              <Button
                title="Ver familias"
                variant="ghost"
                size="sm"
                onPress={() => router.push('/familias')}
              />
            }
          />
          <DemographicsSummary data={demographics.data} compact />
        </>
      ) : null}

      <SectionHeader title="Accesos rápidos" />
      <View className="flex-row flex-wrap gap-2">
        <ListItem
          className="min-w-72 flex-1 basis-[45%]"
          icon={MessagesSquare}
          title="Escribirle al Banco"
          subtitle={
            interactions.data?.pendientes
              ? `${interactions.data.pendientes} ${interactions.data.pendientes === 1 ? 'mensaje pendiente' : 'mensajes pendientes'} de respuesta`
              : 'Contá un suceso, pedí algo, consultá o reclamá'
          }
          onPress={() => router.push('/banco')}
        />
        <ListItem
          className="min-w-72 flex-1 basis-[45%]"
          icon={MessageSquare}
          title="Ayuda"
          subtitle="Contacto y preguntas frecuentes"
          onPress={() => router.push('/ayuda')}
        />
      </View>
    </Screen>
  );
}
