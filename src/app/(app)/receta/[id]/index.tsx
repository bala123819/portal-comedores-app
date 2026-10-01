import { router, useLocalSearchParams } from 'expo-router';
import { ChefHat, Clock, Info } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Header,
  NumberStepper,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { useReceta } from '@/features/recetas/hooks';
import { humanize } from '@/lib/labels';
import { scaleFactor, scaleQuantity } from '@/lib/recipe-scale';
import { colors } from '@/theme/tokens';

export default function RecetaScreen() {
  const { id, personas: personasParam } = useLocalSearchParams<{ id: string; personas?: string }>();
  const q = useReceta(id);
  // Personas asistidas (el Banco lo recalcula con las familias cargadas)
  const serviceCount = useSession((s) => s.organization?.total_beneficiaries ?? null);
  const r = q.data;
  const [personas, setPersonas] = useState<number | null>(personasParam ? Number(personasParam) : null);

  if (!r) {
    return (
      <Screen header={<Header title="Receta" back backFallback="/recetas" />}>
        {q.isPending ? (
          <SkeletonList count={2} />
        ) : (
          <EmptyState icon={ChefHat} title="No encontramos esta receta" actionLabel="Ver recetas" onAction={() => router.replace('/recetas')} />
        )}
      </Screen>
    );
  }

  const n = personas ?? r.raciones_base;
  const factor = scaleFactor(r.raciones_base, n);

  return (
    <Screen
      header={<Header title="Receta" back backFallback="/recetas" />}
      footer={
        <Button
          title="Cocinar paso a paso"
          icon={ChefHat}
          size="lg"
          fullWidth
          onPress={() => router.push({ pathname: '/receta/[id]/cocinar', params: { id: r.id, personas: String(n) } })}
        />
      }
    >
      <View className="gap-2">
        <Text variant="title">{r.nombre}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Badge label={r.categoria} tone="accent" />
          {r.tiempo ? <Badge label={`${r.tiempo} min`} icon={Clock} tone="muted" /> : null}
          {r.etiquetas.map((e) => (
            <Badge key={e} label={humanize(e)} tone="muted" size="sm" />
          ))}
        </View>
      </View>

      <Card className="gap-3">
        <NumberStepper label="¿Para cuántas personas?" value={n} onChange={setPersonas} min={1} max={2000} step={n >= 50 ? 10 : 1} />
        <View className="flex-row flex-wrap gap-2">
          <Chip label={`Receta original (${r.raciones_base})`} selected={n === r.raciones_base} onPress={() => setPersonas(r.raciones_base)} />
          {serviceCount && serviceCount !== r.raciones_base ? (
            <Chip label={`Mis personas (${serviceCount})`} selected={n === serviceCount} onPress={() => setPersonas(serviceCount)} />
          ) : null}
        </View>
        {factor !== 1 ? (
          <Text variant="caption">Cantidades calculadas para {n} personas y redondeadas para que sea fácil medir.</Text>
        ) : null}
      </Card>

      <SectionHeader title="Ingredientes" />
      <Card className="gap-3">
        {r.ingredientes.map((ing, i) => {
          const s = scaleQuantity(ing.cantidad, ing.unidad, factor);
          return (
            <View key={`${ing.nombre}-${i}`} className="flex-row items-start justify-between gap-3">
              <Text className="flex-1">{ing.nombre}{ing.nota ? ` (${ing.nota})` : ''}</Text>
              <Text className="font-bold">{s.texto}</Text>
            </View>
          );
        })}
      </Card>

      <SectionHeader title="Preparación" />
      <View className="gap-2">
        {r.pasos.map((p, i) => (
          <Card key={i} className="flex-row gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Text className="font-bold text-primary-foreground">{i + 1}</Text>
            </View>
            <Text className="flex-1">{p}</Text>
          </Card>
        ))}
      </View>

      {r.informacion_nutricional?.por_racion ? (
        <>
          <SectionHeader title="Información nutricional por porción" />
          <Card className="gap-2">
            {Object.entries(r.informacion_nutricional.por_racion).map(([k, v]) => (
              <View key={k} className="flex-row justify-between">
                <Text>{humanize(k)}</Text>
                <Text className="font-semibold">{v}</Text>
              </View>
            ))}
            {r.informacion_nutricional.notas ? <Text variant="caption">{r.informacion_nutricional.notas}</Text> : null}
          </Card>
        </>
      ) : null}

      {r.fuente ? (
        <View className="flex-row items-center gap-2">
          <Info size={16} color={colors.mutedForeground} />
          <Text variant="caption" className="flex-1">
            Fuente: {r.fuente}
          </Text>
        </View>
      ) : null}

      <WhatsAppButton context={{ kind: 'receta', nombre: r.nombre }} title="Consultar esta receta por WhatsApp" />
    </Screen>
  );
}
