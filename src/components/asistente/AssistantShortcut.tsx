import { router } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { colors } from '@/theme/tokens';

/**
 * Atajo discreto "Hacerlo con el asistente" (contrato §5) para los formularios de carga.
 * Abre el chat con un texto precargado, SIN enviarlo. El formulario sigue siendo el camino
 * principal: las dos formas guardan en el mismo backend (D-23).
 */
export function AssistantShortcut({ prefill, hint }: { prefill: string; hint: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Hacerlo con el asistente"
      accessibilityHint={hint}
      onPress={() => router.push({ pathname: '/asistente', params: { prefill } })}
      className="flex-row items-center gap-3 rounded-xl border border-primary/20 bg-accent px-3 py-2.5 active:opacity-80"
    >
      <Sparkles size={18} color={colors.accentForeground} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-accent-foreground">Hacerlo con el asistente</Text>
        <Text variant="caption">{hint}</Text>
      </View>
      <ChevronRight size={18} color={colors.accentForeground} />
    </Pressable>
  );
}
