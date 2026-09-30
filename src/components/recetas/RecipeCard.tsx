import { ChefHat, Clock, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, Text } from '@/components/ui';
import type { Receta } from '@/features/recetas/schema';
import { colors } from '@/theme/tokens';

export function RecipeCard({
  receta,
  onPress,
  motivo,
}: {
  receta: Pick<Receta, 'nombre' | 'categoria' | 'raciones_base' | 'tiempo'>;
  onPress: () => void;
  motivo?: string;
}) {
  return (
    <Card onPress={onPress} className="flex-row gap-3" accessibilityLabel={`Receta ${receta.nombre}`}>
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-accent">
        <ChefHat size={24} color={colors.accentForeground} />
      </View>
      <View className="flex-1 gap-1">
        <Text variant="label">{receta.nombre}</Text>
        <Text variant="caption">{receta.categoria}</Text>
        <View className="mt-1 flex-row flex-wrap gap-3">
          <View className="flex-row items-center gap-1">
            <Users size={14} color={colors.mutedForeground} />
            <Text variant="caption">{receta.raciones_base} porciones</Text>
          </View>
          {receta.tiempo ? (
            <View className="flex-row items-center gap-1">
              <Clock size={14} color={colors.mutedForeground} />
              <Text variant="caption">{receta.tiempo} min</Text>
            </View>
          ) : null}
        </View>
        {motivo ? <Text className="mt-1 text-sm text-accent-foreground">{motivo}</Text> : null}
      </View>
    </Card>
  );
}
