import { router, usePathname, useSegments } from 'expo-router';
import {
  Ban,
  Camera,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { colors, shadows } from '@/theme/tokens';
import { MermabAvatar } from './MermabAvatar';
import { Appear, useReducedMotion } from './motion';

/**
 * Botón flotante del asistente, abajo a la derecha en todas las pantallas de la app. Al tocarlo
 * se abre una hoja corta con el acceso al chat; lo que puede y no puede hacer queda en un
 * desplegable, para quien quiera leerlo.
 *
 * No aparece en el chat mismo ni en los formularios con botón abajo (taparía "Guardar"/"Enviar").
 */
const HIDDEN = [
  /^\/asistente/,
  /\/(nueva|nuevo|editar|confirmar|contrasena|completar|quien-retira|cocinar)$/,
  /^\/familia\/[^/]+\/miembro\//,
  /^\/contactos\/[^/]+$/,
  /^\/postular\//,
];

/** Alto de la barra de pestañas (ver (tabs)/_layout.tsx): el botón va por encima */
const TAB_BAR = 70;
const SIZE = 64;
const native = Platform.OS !== 'web';

const CAN: { icon: LucideIcon; text: string }[] = [
  {
    icon: Users,
    text: 'Contarte qué familias tienen y quiénes tienen celiaquía, diabetes o embarazo.',
  },
  {
    icon: ShoppingCart,
    text: 'Armar un pedido de mercadería: le decís qué necesitan y para cuándo.',
  },
  {
    icon: Users,
    text: 'Cargar una familia nueva contándosela con tus palabras, o sumar integrantes.',
  },
  {
    icon: Megaphone,
    text: 'Avisarle algo al Banco: un problema, una necesidad, una consulta o un reclamo.',
  },
  {
    icon: ChefHat,
    text: 'Recetas y menús para la cantidad de personas que tengan, adaptados a quienes comen.',
  },
  { icon: Camera, text: 'Mirar una foto de la alacena o la heladera y decirte qué podés cocinar.' },
];

const CANT: { icon: LucideIcon; text: string }[] = [
  {
    icon: ShieldCheck,
    text: 'No guarda nada sin que lo confirmes: pedidos y familias llegan como tarjeta para revisar.',
  },
  { icon: Stethoscope, text: 'No da indicaciones médicas: para eso, un profesional de la salud.' },
  { icon: Ban, text: 'No sube documentos ni cambia los datos de la organización.' },
  { icon: MessageCircle, text: 'No reemplaza al Banco: los avisos los responde una persona.' },
];

function Item({ icon: Icon, text, tone }: { icon: LucideIcon; text: string; tone: 'yes' | 'no' }) {
  return (
    <View className="flex-row items-start gap-3">
      <View
        className={cn(
          'h-8 w-8 items-center justify-center rounded-lg',
          tone === 'yes' ? 'bg-accent' : 'bg-muted',
        )}
      >
        <Icon size={16} color={tone === 'yes' ? colors.accentForeground : colors.mutedForeground} />
      </View>
      <Text className="flex-1 text-[15px] leading-6">{text}</Text>
    </View>
  );
}

/** Aro que se expande y se desvanece alrededor del botón, para que se note sin molestar. */
function Halo() {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.delay(2200),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);
  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        backgroundColor: colors.primary,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
      }}
    />
  );
}

export function AgentFab() {
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);

  if (HIDDEN.some((r) => r.test(pathname))) return null;

  const onTabs = segments.includes('(tabs)');
  const bottom = (onTabs ? TAB_BAR : 0) + Math.max(insets.bottom, onTabs ? 0 : 12) + 20;

  function close() {
    setOpen(false);
    setDetails(false);
  }

  function openChat() {
    close();
    router.push('/asistente');
  }

  return (
    <>
      <Appear
        from="right"
        className="absolute right-5 flex-row items-center gap-3 md:right-10 lg:right-12"
        style={{ bottom }}
        pointerEvents="box-none"
      >
        {/* Etiqueta al costado, sólo donde hay lugar */}
        <Pressable
          onPress={() => setOpen(true)}
          aria-hidden
          className="hidden rounded-full border border-border/60 bg-card px-4 py-2 md:flex"
          style={shadows.md}
        >
          <Text className="text-sm font-semibold text-accent-foreground">¿Te ayudo?</Text>
        </Pressable>

        <View className="items-center justify-center">
          <Halo />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Asistente Mermab: qué te puede ayudar a hacer"
            onPress={() => setOpen(true)}
            className="items-center justify-center rounded-full bg-primary active:opacity-90 web:hover:opacity-95"
            style={[{ width: SIZE, height: SIZE }, shadows.primary]}
          >
            <View className="h-[54px] w-[54px] items-center justify-center rounded-full bg-accent">
              <MermabAvatar size={38} shadow={false} />
            </View>
          </Pressable>
        </View>
      </Appear>

      <BottomSheet
        visible={open}
        onClose={close}
        footer={
          <Button
            title="Hablar con el asistente"
            icon={MessageCircle}
            size="lg"
            fullWidth
            onPress={openChat}
          />
        }
      >
        <View className="w-full max-w-xl gap-5 self-center pb-2">
          <View className="flex-row items-center gap-4">
            <MermabAvatar size={60} mood="happy" />
            <View className="flex-1 gap-1">
              <Text variant="heading" className="text-xl">
                Asistente Mermab
              </Text>
              <Text tone="muted" className="leading-6">
                Pedidos, familias, avisos al Banco y recetas, escribiendo como le hablarías a una
                persona.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: details }}
            accessibilityLabel={
              details ? 'Ocultar qué puede hacer y qué no' : 'Ver qué puede hacer y qué no'
            }
            onPress={() => setDetails((d) => !d)}
            className="min-h-12 flex-row items-center justify-between rounded-2xl bg-muted px-4 active:opacity-80"
          >
            <Text className="font-medium">¿Qué puede hacer y qué no?</Text>
            {details ? (
              <ChevronUp size={20} color={colors.mutedForeground} />
            ) : (
              <ChevronDown size={20} color={colors.mutedForeground} />
            )}
          </Pressable>

          {details ? (
            <Appear className="gap-5">
              <View className="gap-3">
                <Text variant="label" className="text-accent-foreground">
                  Puede ayudarte a
                </Text>
                {CAN.map((c) => (
                  <Item key={c.text} {...c} tone="yes" />
                ))}
              </View>
              <View className="gap-3">
                <Text variant="label" tone="muted">
                  Lo que no hace
                </Text>
                {CANT.map((c) => (
                  <Item key={c.text} {...c} tone="no" />
                ))}
              </View>
            </Appear>
          ) : null}
        </View>
      </BottomSheet>
    </>
  );
}
