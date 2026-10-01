import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { features } from '@/lib/features';
import { View } from 'react-native';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { ApplicationCard } from '@/components/retiros/ApplicationCard';
import { AssignmentCard } from '@/components/retiros/AssignmentCard';
import { Chip, Header, InfiniteList, OfflineBanner, SegmentedControl } from '@/components/ui';
import { useAssignments } from '@/features/asignaciones/hooks';
import { useApplications } from '@/features/postulaciones/hooks';

type Tab = 'retiros' | 'pedidos';

function RetirosList() {
  const [scope, setScope] = useState<'pending' | 'all'>('pending');
  const query = useAssignments(scope === 'pending' ? 'pending' : undefined);
  return (
    <InfiniteList
      query={query}
      header={
        <View className="flex-row gap-2 pb-3">
          <Chip label="Pendientes" selected={scope === 'pending'} onPress={() => setScope('pending')} />
          <Chip label="Todos" selected={scope === 'all'} onPress={() => setScope('all')} />
        </View>
      }
      renderItem={({ item }) => (
        <AssignmentCard
          assignment={item}
          onPress={() => router.push({ pathname: '/retiro/[id]', params: { id: item.id } })}
        />
      )}
      emptyTitle={scope === 'pending' ? 'No tenés retiros pendientes' : 'Todavía no tuviste retiros'}
      emptyMessage="Cuando el Banco apruebe un pedido tuyo, el retiro aparece acá."
      emptyAction={{ label: 'Ver alimentos disponibles', onPress: () => router.push('/disponibles') }}
    />
  );
}

function PedidosList() {
  const [scope, setScope] = useState<'pendiente' | 'all'>('pendiente');
  const query = useApplications(scope === 'pendiente' ? 'pendiente' : undefined);
  return (
    <InfiniteList
      query={query}
      header={
        <View className="flex-row gap-2 pb-3">
          <Chip label="En revisión" selected={scope === 'pendiente'} onPress={() => setScope('pendiente')} />
          <Chip label="Todos" selected={scope === 'all'} onPress={() => setScope('all')} />
        </View>
      }
      renderItem={({ item }) => (
        <ApplicationCard
          application={item}
          onPress={() => router.push({ pathname: '/postulacion/[id]', params: { id: item.id } })}
        />
      )}
      emptyTitle={scope === 'pendiente' ? 'No tenés pedidos en revisión' : 'Todavía no hiciste pedidos'}
      emptyMessage="Elegí alimentos disponibles y tocá “Quiero retirarlo”."
      emptyAction={{ label: 'Ver alimentos disponibles', onPress: () => router.push('/disponibles') }}
    />
  );
}

function RetirosScreenContent() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'pedidos' ? 'pedidos' : 'retiros');

  return (
    <View className="flex-1 bg-background">
      <Header title="Mis retiros" right={<NotificationBell />} />
      <OfflineBanner />
      <View className="w-full max-w-content flex-1 self-center">
        <View className="px-4 pt-4">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { label: 'Retiros', value: 'retiros' },
              { label: 'Pedidos', value: 'pedidos' },
            ]}
          />
        </View>
        {tab === 'retiros' ? <RetirosList /> : <PedidosList />}
      </View>
    </View>
  );
}

/** Módulo de mermas apagado (el backend no lo ofrece hoy): la pestaña está oculta y la URL redirige. */
export default function RetirosScreen() {
  if (!features.mermas) return <Redirect href="/" />;
  return <RetirosScreenContent />;
}
