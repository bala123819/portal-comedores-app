import { Stack } from 'expo-router';
import { features } from '@/lib/features';
import { colors } from '@/theme/tokens';

/**
 * Las pantallas de módulos que el backend no ofrece hoy (docs/bda 1/6 §6) quedan protegidas:
 * no se pueden abrir ni por URL mientras su módulo esté apagado (ver src/lib/features.ts).
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Protected guard={features.mermas}>
        <Stack.Screen name="merma/[id]" />
        <Stack.Screen name="postular/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="postulacion/[id]" />
        <Stack.Screen name="retiro/[id]/index" />
        <Stack.Screen name="retiro/[id]/quien-retira" />
        <Stack.Screen name="retiro/[id]/completar" />
      </Stack.Protected>
      <Stack.Protected guard={features.familiasAlta}>
        <Stack.Screen name="familia/nueva" />
      </Stack.Protected>
      <Stack.Protected guard={features.programas}>
        <Stack.Screen name="jornadas" />
      </Stack.Protected>
      <Stack.Protected guard={features.documentacion}>
        <Stack.Screen name="documentacion" />
      </Stack.Protected>
    </Stack>
  );
}
