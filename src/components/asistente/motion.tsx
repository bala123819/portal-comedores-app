import { cssInterop } from 'nativewind';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

// Sin esto NativeWind no le aplica `className` a `Animated.View` (se perdía, por ejemplo, el
// `flex-row` que pone el avatar al costado de la burbuja).
cssInterop(Animated.View, { className: 'style' });

/**
 * Animaciones del chat con el `Animated` de React Native: andan igual en web, en Expo Go y en un
 * build, sin sumar dependencias nativas. Si la persona pidió reducir el movimiento en el sistema,
 * todo aparece quieto.
 */
const native = Platform.OS !== 'web';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Entra con un fundido y un desplazamiento corto (desde abajo, o desde el costado con `from`). */
export function Appear({
  delay = 0,
  from = 'bottom',
  className,
  style,
  children,
  ...props
}: ViewProps & { delay?: number; from?: 'bottom' | 'left' | 'right'; className?: string }) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay]);

  if (reduced) {
    return (
      <View className={className} style={style} {...props}>
        {children}
      </View>
    );
  }
  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const transform =
    from === 'bottom'
      ? [{ translateY: offset }]
      : [{ translateX: from === 'left' ? Animated.multiply(offset, -1) : offset }];
  return (
    <Animated.View
      className={className}
      style={[style, { opacity: progress, transform }]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

/** Tres puntos que saltan de a uno: "el asistente está escribiendo". */
export function TypingDots({ color, className }: { color: string; className?: string }) {
  const reduced = useReducedMotion();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  useEffect(() => {
    if (reduced) return;
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(v, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: native,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 280,
            easing: Easing.in(Easing.quad),
            useNativeDriver: native,
          }),
          Animated.delay((2 - i) * 140 + 200),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots, reduced]);

  return (
    <View className={cn('h-4 flex-row items-center gap-1', className)}>
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: color,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** Un latido suave (para el avatar del asistente mientras piensa). */
export function Pulse({
  active,
  className,
  children,
}: {
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active || reduced) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: native,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduced, v]);

  return (
    <Animated.View
      className={className}
      style={{
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
