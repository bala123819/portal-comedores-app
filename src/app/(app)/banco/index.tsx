import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  InteractionCard,
  interactionTypeIcons,
} from '@/components/interacciones/InteractionCard';
import { Chip, Header, IconButton, InfiniteList, OfflineBanner, SectionHeader, SegmentedControl, Text } from '@/components/ui';
import { useInteractions, useInteractionsSummary } from '@/features/interacciones/hooks';
import { INTERACTION_TYPES, type InteractionStatus, type InteractionType } from '@/features/interacciones/types';
import { interactionTypeLabels, label } from '@/lib/labels';
import { colors } from '@/theme/tokens';

type StatusFilter = 'todas' | InteractionStatus;

/** Accesos directos para escribirle al Banco con el tipo ya elegido */
function NewMessageShortcuts() {
  return (
    <View className="flex-row flex-wrap gap-2">
      {INTERACTION_TYPES.map((t) => {
        const Icon = interactionTypeIcons[t];
        const name = label(interactionTypeLabels, t);
        return (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityLabel={`Nuevo mensaje: ${name}`}
            onPress={() => router.push({ pathname: '/banco/nueva', params: { tipo: t } })}
            className="min-h-14 min-w-36 flex-1 basis-[45%] flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 active:opacity-80"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-accent">
              <Icon size={18} color={colors.accentForeground} />
            </View>
            <Text variant="label" className="flex-1">
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Comunicación con el Banco (docs/bda/08-interacciones.md): la organización cuenta un suceso,
 * pide algo que no está en el catálogo, consulta o reclama, y ve si el Banco ya lo atendió.
 */
export default function BancoScreen() {
  const [status, setStatus] = useState<StatusFilter>('todas');
  const [type, setType] = useState<InteractionType | undefined>(undefined);

  const query = useInteractions({ status: status === 'todas' ? undefined : status, type });
  const summary = useInteractionsSummary().data;
  const pending = summary?.pendientes ?? 0;
  const attended = summary ? summary.total - summary.pendientes : 0;
  const filtered = status !== 'todas' || !!type;

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Comunicación con el Banco"
        subtitle="Sucesos, solicitudes, consultas y reclamos"
        back
        backFallback="/mas"
        right={<IconButton icon={Plus} label="Nuevo mensaje al Banco" onPress={() => router.push('/banco/nueva')} />}
      />
      <OfflineBanner />
      <View className="w-full max-w-content flex-1 self-center">
        <InfiniteList
          query={query}
          header={
            <View className="gap-3 pb-3">
              <Text variant="heading">¿Qué querés contarle al Banco?</Text>
              <NewMessageShortcuts />

              <SectionHeader title="Tus mensajes" />
              <SegmentedControl<StatusFilter>
                value={status}
                onChange={setStatus}
                options={[
                  { label: 'Todos', value: 'todas' },
                  { label: 'Pendientes', value: 'pendiente', count: pending },
                  { label: 'Atendidos', value: 'atendida' },
                ]}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                <Chip label="Todos los tipos" selected={!type} onPress={() => setType(undefined)} />
                {INTERACTION_TYPES.map((t) => {
                  const total = summary?.by_type[t]?.total;
                  return (
                    <Chip
                      key={t}
                      icon={interactionTypeIcons[t]}
                      label={`${label(interactionTypeLabels, t)}${total ? ` (${total})` : ''}`}
                      selected={type === t}
                      onPress={() => setType(type === t ? undefined : t)}
                    />
                  );
                })}
              </ScrollView>
              {summary && summary.total > 0 && !filtered ? (
                <Text variant="caption">
                  {summary.total === 1 ? '1 mensaje enviado' : `${summary.total} mensajes enviados`}
                  {` · ${attended} ${attended === 1 ? 'atendido' : 'atendidos'}`}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <InteractionCard interaction={item} onPress={() => router.push({ pathname: '/banco/[id]', params: { id: item.id } })} />
          )}
          emptyTitle={filtered ? 'No hay mensajes con ese filtro' : 'Todavía no le escribiste al Banco'}
          emptyMessage={
            filtered
              ? 'Probá con otro estado o tipo.'
              : 'Usá los botones de arriba para contar algo que pasó, pedir lo que necesitan o hacer una consulta.'
          }
          emptyAction={
            filtered
              ? { label: 'Ver todos', onPress: () => { setStatus('todas'); setType(undefined); } }
              : { label: 'Escribirle al Banco', onPress: () => router.push('/banco/nueva') }
          }
        />
      </View>
    </View>
  );
}
