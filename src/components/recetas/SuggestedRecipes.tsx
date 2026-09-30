import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, SectionHeader, Text } from '@/components/ui';
import { useSugerencias } from '@/features/recetas/hooks';
import type { FoodItem } from '@/lib/recipe-match';
import { RecipeCard } from './RecipeCard';

/** Cruce con lo recibido: recetas del recetario que usan estos alimentos. */
export function SuggestedRecipes({ foods, context }: { foods: FoodItem[]; context?: { mermaId?: string; assignmentId?: string } }) {
  const q = useSugerencias(foods, 3);
  if (!foods.length) return null;
  return (
    <View className="gap-3">
      <SectionHeader title="¿Qué cocinar con esto?" />
      {q.data?.length ? (
        q.data.map((m) => (
          <RecipeCard
            key={m.receta.id}
            receta={m.receta}
            motivo={`Usa ${m.coincidencias.join(', ').toLowerCase()}`}
            onPress={() => router.push({ pathname: '/receta/[id]', params: { id: m.receta.id } })}
          />
        ))
      ) : (
        <Text tone="muted">No encontramos recetas que usen estos alimentos.</Text>
      )}
      <Button
        title="Pedir ideas al asistente"
        icon={Sparkles}
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/sugerir-recetas',
            params: {
              alimentos: foods.map((f) => f.name).join('|'),
              ...(context?.mermaId ? { mermaId: context.mermaId } : {}),
              ...(context?.assignmentId ? { assignmentId: context.assignmentId } : {}),
            },
          })
        }
      />
    </View>
  );
}
