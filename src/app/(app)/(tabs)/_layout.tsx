import { Tabs } from 'expo-router';
import {
  House,
  Menu,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { features } from '@/lib/features';
import { colors, shadows } from '@/theme/tokens';

/** Ícono de pestaña con "píldora" de fondo cuando está activa (patrón Material 3). */
function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <View
        style={{
          width: 56,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? colors.accent : 'transparent',
        }}
      >
        <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
      </View>
    );
  };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        // Siempre debajo del ícono: en pantallas anchas React Navigation lo pone al costado y la
        // píldora verde del ícono tapaba las primeras letras ("In" de Inicio)
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          ...shadows.bar,
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarItemStyle: { minHeight: 48, borderRadius: 10 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tabIcon(House) }} />
      {/* Mermas/retiros: sólo si el backend los habilita (hoy no, ver docs/bda 1/6 §6). `href: null` oculta la pestaña. */}
      <Tabs.Screen
        name="disponibles"
        options={{
          href: features.mermas ? undefined : null,
          title: 'Disponibles',
          tabBarIcon: tabIcon(ShoppingBasket),
        }}
      />
      <Tabs.Screen
        name="retiros"
        options={{
          href: features.mermas ? undefined : null,
          title: 'Mis retiros',
          tabBarIcon: tabIcon(Truck),
        }}
      />
      {/* Pedidos de mercadería. Con mermas activas pasa al menú "Más" (y al Inicio) para no superar 5 pestañas */}
      <Tabs.Screen
        name="mercaderia"
        options={{
          href: features.pedidos && !features.mermas ? undefined : null,
          title: 'Mercadería',
          tabBarIcon: tabIcon(ShoppingCart),
        }}
      />
      {/* Con mermas activas, Familias pasa al menú "Más" para no superar 5 pestañas */}
      <Tabs.Screen
        name="familias"
        options={{
          href: features.mermas ? null : undefined,
          title: 'Familias',
          tabBarIcon: tabIcon(Users),
        }}
      />
      {/* Recetas sale de la barra: se unificó con el asistente (botón flotante en todas las pantallas). La pantalla sigue en "Más". */}
      <Tabs.Screen name="recetas" options={{ href: null, title: 'Recetas' }} />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: tabIcon(Menu) }} />
    </Tabs>
  );
}
