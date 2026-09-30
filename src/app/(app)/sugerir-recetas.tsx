import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Sparkles, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { RecipeCard } from '@/components/recetas/RecipeCard';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Input,
  NumberStepper,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { recetasRepository } from '@/features/recetas/repository';
import { agents } from '@/services/agents';
import { colors } from '@/theme/tokens';

/** Agente de recetas: qué alimentos tengo + para cuántas personas → recetas del recetario. */
export default function SugerirRecetasScreen() {
  const params = useLocalSearchParams<{ alimentos?: string; mermaId?: string; assignmentId?: string }>();
  const org = useSession((s) => s.organization);
  const [foods, setFoods] = useState<string[]>(params.alimentos ? params.alimentos.split('|').filter(Boolean) : []);
  const [draft, setDraft] = useState('');
  const [servings, setServings] = useState(org?.service_count ?? 20);

  const suggest = useMutation({
    mutationFn: async () => {
      const cards = await agents.suggestRecipes({
        foods: foods.map((name) => ({ name })),
        servings,
        context: { organizationId: org?.id, mermaId: params.mermaId, assignmentId: params.assignmentId },
      });
      const recetas = await Promise.all(cards.map((c) => recetasRepository.get(c.recetaId)));
      return cards.map((c, i) => ({ card: c, receta: recetas[i] }));
    },
  });

  const add = () => {
    const v = draft.trim();
    if (v && !foods.includes(v)) setFoods((f) => [...f, v]);
    setDraft('');
  };

  return (
    <Screen
      header={<Header title="¿Qué cocino?" subtitle="Ideas con lo que tenés" back backFallback="/recetas" />}
      footer={
        <Button
          title="Buscar recetas"
          icon={Sparkles}
          size="lg"
          fullWidth
          disabled={!foods.length}
          loading={suggest.isPending}
          onPress={() => suggest.mutate()}
        />
      }
    >
      <Text tone="muted">Contanos qué alimentos tienen y para cuántas personas cocinan.</Text>

      <View className="gap-2">
        <Text variant="label">Alimentos</Text>
        <View className="flex-row flex-wrap gap-2">
          {foods.map((f) => (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${f}`}
              onPress={() => setFoods((all) => all.filter((x) => x !== f))}
              className="min-h-10 flex-row items-center gap-1.5 rounded-full bg-accent px-3"
            >
              <Text className="text-sm font-semibold text-accent-foreground">{f}</Text>
              <X size={16} color={colors.accentForeground} />
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-end gap-2">
          <Input
            containerClassName="flex-1"
            placeholder="Ej: lentejas"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            returnKeyType="done"
            accessibilityLabel="Agregar alimento"
          />
          <Button title="Agregar" icon={Plus} variant="secondary" onPress={add} disabled={!draft.trim()} />
        </View>
      </View>

      <NumberStepper label="¿Para cuántas personas?" value={servings} onChange={setServings} step={servings >= 50 ? 10 : 1} max={2000} />

      {suggest.isPending ? (
        <SkeletonList count={2} />
      ) : suggest.isError ? (
        <ErrorState error={suggest.error} onRetry={() => suggest.mutate()} title="No pudimos buscar recetas" />
      ) : suggest.data ? (
        suggest.data.length ? (
          <>
            <SectionHeader title="Te sugerimos" />
            {suggest.data.map(({ card, receta }) =>
              receta ? (
                <RecipeCard
                  key={card.recetaId}
                  receta={receta}
                  motivo={card.motivo}
                  onPress={() => router.push({ pathname: '/receta/[id]', params: { id: receta.id, personas: String(servings) } })}
                />
              ) : (
                <Card key={card.recetaId}>
                  <Text variant="label">{card.nombre}</Text>
                  {card.motivo ? <Text variant="caption">{card.motivo}</Text> : null}
                </Card>
              ),
            )}
          </>
        ) : (
          <EmptyState title="No encontramos recetas con esos alimentos" message="Probá agregando otros alimentos o buscá en el recetario." actionLabel="Ver recetario" onAction={() => router.push('/recetas')} />
        )
      ) : null}

      {agents.name === 'simulado' ? (
        <Text variant="caption" className="text-center">
          Asistente en modo de prueba: las sugerencias salen del recetario local.
        </Text>
      ) : null}
    </Screen>
  );
}
