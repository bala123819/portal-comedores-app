import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, ListChecks } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, Header, ProgressBar, Text } from '@/components/ui';
import { useReceta } from '@/features/recetas/hooks';
import { scaleFactor, scaleQuantity } from '@/lib/recipe-scale';

/** Modo cocina: un paso por pantalla, letra grande, botones grandes. */
export default function CocinarScreen() {
  const { id, personas } = useLocalSearchParams<{ id: string; personas?: string }>();
  const q = useReceta(id);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const r = q.data;
  if (!r) return <Header title="Cocinar" back />;

  const n = personas ? Number(personas) : r.raciones_base;
  const factor = scaleFactor(r.raciones_base, n);
  const total = r.pasos.length;
  const last = step === total - 1;

  return (
    <View className="flex-1 bg-background">
      <Header
        title={r.nombre}
        subtitle={`Para ${n} personas`}
        back
        backFallback="/recetas"
        right={
          <Button title="Ingredientes" icon={ListChecks} variant="ghost" size="sm" onPress={() => setShowIngredients(true)} />
        }
      />
      <View className="w-full max-w-content flex-1 self-center px-4 pt-4">
        <View className="gap-2">
          <Text variant="label" tone="primary">
            Paso {step + 1} de {total}
          </Text>
          <ProgressBar value={(step + 1) / total} />
        </View>
        <ScrollView className="flex-1" contentContainerClassName="py-8">
          <Text variant="large" accessibilityLiveRegion="polite">
            {r.pasos[step]}
          </Text>
        </ScrollView>
        <View className="flex-row gap-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Button
            title="Anterior"
            icon={ArrowLeft}
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={step === 0}
            onPress={() => setStep((s) => Math.max(0, s - 1))}
          />
          {last ? (
            <Button title="¡Listo!" icon={Check} size="lg" className="flex-1" onPress={() => router.back()} />
          ) : (
            <Button
              title="Siguiente"
              iconRight={ArrowRight}
              size="lg"
              className="flex-1"
              onPress={() => setStep((s) => Math.min(total - 1, s + 1))}
            />
          )}
        </View>
      </View>

      <BottomSheet visible={showIngredients} onClose={() => setShowIngredients(false)} title={`Ingredientes para ${n}`}>
        {r.ingredientes.map((ing, i) => (
          <View key={i} className="flex-row justify-between gap-3 rounded-lg bg-muted px-3 py-3">
            <Text className="flex-1 text-lg">{ing.nombre}</Text>
            <Text className="text-lg font-bold">{scaleQuantity(ing.cantidad, ing.unidad, factor).texto}</Text>
          </View>
        ))}
      </BottomSheet>
    </View>
  );
}
