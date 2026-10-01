import { Tabs } from 'expo-router';
import { ChefHat, House, Menu, ShoppingBasket, Truck, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { features } from '@/lib/features';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: { minHeight: 48, borderRadius: 10 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <House size={24} color={color} /> }}
      />
      {/* Mermas/retiros: sólo si el backend los habilita (hoy no, ver docs/bda 1/6 §6). `href: null` oculta la pestaña. */}
      <Tabs.Screen
        name="disponibles"
        options={{
          href: features.mermas ? undefined : null,
          title: 'Disponibles',
          tabBarIcon: ({ color }) => <ShoppingBasket size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="retiros"
        options={{
          href: features.mermas ? undefined : null,
          title: 'Mis retiros', tabBarIcon: ({ color }) => <Truck size={24} color={color} /> }}
      />
      {/* Con mermas activas, Familias pasa al menú "Más" para no superar 5 pestañas */}
      <Tabs.Screen
        name="familias"
        options={{
          href: features.mermas ? null : undefined,
          title: 'Familias',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recetas"
        options={{ title: 'Recetas', tabBarIcon: ({ color }) => <ChefHat size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="mas"
        options={{ title: 'Más', tabBarIcon: ({ color }) => <Menu size={24} color={color} /> }}
      />
    </Tabs>
  );
}
