import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useReducedMotion } from './motion';

/**
 * "Asistente Mermab": la gota-hoja del agente (guía "Avatar animado del agente — App Mermab").
 * Respira, mece el brote, parpadea y cambia de cara según lo que hace el agente:
 * - `idle` (reposo): esperando una consulta.
 * - `thinking` (pensando): buscando la respuesta; mira hacia arriba y aparecen burbujitas.
 * - `talking` (hablando): escribiendo la respuesta; boca abierta.
 * - `happy` (contento): tarea completada; ojos cerrados de alegría y un destello.
 *
 * Se arma en capas (sombra, cuerpo, brote, extras) para animar cada una con el `Animated` de React
 * Native, que anda igual en web y en el celular. Con "reducir movimiento" queda quieto.
 */
export type AvatarMood = 'idle' | 'thinking' | 'talking' | 'happy';

const C = {
  body: '#3B9B6E',
  sprout: '#34B277',
  dark: '#2A6F4F',
  cheeks: '#F9A91F',
  eyes: '#1E2433',
  shadow: '#DCE8E2',
};

const native = Platform.OS !== 'web';
/** Proporción del dibujo: 100 de ancho por 124 de alto */
const RATIO = 1.24;

function useLoop(make: (v: Animated.Value) => Animated.CompositeAnimation, active: boolean) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(make(v));
    loop.start();
    return () => loop.stop();
    // `make` es estable en la práctica: cada llamada arma la misma secuencia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, v]);
  return v;
}

const swing = (v: Animated.Value, duration: number) =>
  Animated.sequence([
    Animated.timing(v, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: native,
    }),
    Animated.timing(v, {
      toValue: 0,
      duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: native,
    }),
  ]);

/** Parpadeo: ojos cerrados ~140 ms cada 3 a 5 segundos. */
function useBlink(active: boolean) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setClosed(true);
          timer = setTimeout(() => {
            setClosed(false);
            schedule();
          }, 140);
        },
        3000 + Math.random() * 2000,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active]);
  return closed;
}

function Face({ mood, blink }: { mood: AvatarMood; blink: boolean }) {
  // Ojos: en "pensando" miran hacia arriba a la derecha; en "contento", arquitos.
  const look = mood === 'thinking' ? { dx: 1.2, dy: -1.5 } : { dx: 0, dy: 0 };
  const eyes =
    mood === 'happy' ? (
      <G stroke={C.eyes} strokeWidth={2.6} strokeLinecap="round" fill="none">
        <Path d="M35.5 75 Q40 70 44.5 75" />
        <Path d="M55.5 75 Q60 70 64.5 75" />
      </G>
    ) : blink ? (
      <G stroke={C.eyes} strokeWidth={2.6} strokeLinecap="round">
        <Path d="M36 74 L44 74" />
        <Path d="M56 74 L64 74" />
      </G>
    ) : (
      <G>
        <Ellipse cx={40} cy={74} rx={4.2} ry={5.2} fill={C.eyes} />
        <Ellipse cx={60} cy={74} rx={4.2} ry={5.2} fill={C.eyes} />
        <Circle cx={41.3 + look.dx} cy={72 + look.dy} r={1.5} fill="#FFFFFF" />
        <Circle cx={61.3 + look.dx} cy={72 + look.dy} r={1.5} fill="#FFFFFF" />
      </G>
    );

  const mouth =
    mood === 'talking' ? (
      <Ellipse cx={50} cy={86} rx={3} ry={3.6} fill={C.eyes} />
    ) : mood === 'thinking' ? (
      <Path
        d="M45.5 87 Q50 84 54.5 87"
        stroke={C.eyes}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
    ) : mood === 'happy' ? (
      <G>
        <Path d="M43 82 Q50 92 57 82 Z" fill={C.eyes} />
        <Path d="M46.5 86.5 Q50 89.5 53.5 86.5 Q50 85 46.5 86.5 Z" fill="#E5484D" />
      </G>
    ) : (
      <Path
        d="M44 83 Q50 89 56 83"
        stroke={C.eyes}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    );

  return (
    <G>
      {eyes}
      <Circle cx={32.5} cy={82} r={5} fill={C.cheeks} fillOpacity={0.4} />
      <Circle cx={67.5} cy={82} r={5} fill={C.cheeks} fillOpacity={0.4} />
      {mouth}
    </G>
  );
}

export function MermabAvatar({
  size = 32,
  mood = 'idle',
  shadow = true,
}: {
  size?: number;
  mood?: AvatarMood;
  shadow?: boolean;
}) {
  const reduced = useReducedMotion();
  const moving = !reduced;
  const height = size * RATIO;

  const breathe = useLoop((v) => swing(v, mood === 'talking' ? 420 : 1600), moving);
  const sway = useLoop((v) => swing(v, mood === 'thinking' ? 600 : 1300), moving);
  const extra = useLoop((v) => swing(v, 700), moving && (mood === 'thinking' || mood === 'happy'));
  const blink = useBlink(moving && mood !== 'happy');

  const bodyScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, mood === 'talking' ? 1.035 : 1.025],
  });
  const shadowScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-7deg', '7deg'] });
  const extraOpacity = extra.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  const layer = { position: 'absolute' as const, left: 0, top: 0, width: size, height };

  return (
    <View style={{ width: size, height }} aria-hidden>
      {shadow ? (
        <Animated.View style={[layer, { transform: [{ scaleX: shadowScale }] }]}>
          <Svg width={size} height={height} viewBox="0 0 100 124">
            <Ellipse cx={50} cy={118} rx={22} ry={3.5} fill={C.shadow} />
          </Svg>
        </Animated.View>
      ) : null}

      {/* El cuerpo respira desde la base */}
      <Animated.View
        style={[layer, { transformOrigin: '50% 92%', transform: [{ scaleY: bodyScale }] }]}
      >
        <Svg width={size} height={height} viewBox="0 0 100 124">
          <Path
            d="M50 22 C 62 40, 83 58, 83 81 A 33 33 0 0 1 17 81 C 17 58, 38 40, 50 22 Z"
            fill={C.body}
          />
          <Path
            d="M48 31 C 41 44, 29 58, 27.5 72 C 27 77.5, 31.5 78.5, 33.5 74 C 37.5 60, 44 46, 48 31 Z"
            fill="#FFFFFF"
            fillOpacity={0.24}
          />
          <Face mood={mood} blink={blink} />
        </Svg>

        {/* El brote se mece desde donde nace */}
        <Animated.View style={[layer, { transformOrigin: '50% 19%', transform: [{ rotate }] }]}>
          <Svg width={size} height={height} viewBox="0 0 100 124">
            <Path
              d="M50 24 C 49.5 16, 51.5 10, 55.5 5.5"
              stroke={C.dark}
              strokeWidth={2.6}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M54.5 7 C 59.5 0.5, 72 0, 77 4.5 C 70.5 11.5, 60 11.5, 54.5 7 Z"
              fill={C.sprout}
            />
            <Path
              d="M49.5 15 C 44.5 9.5, 36 9, 31.5 11.5 C 35.5 18, 44.5 19.5, 49.5 15 Z"
              fill={C.sprout}
            />
          </Svg>
        </Animated.View>
      </Animated.View>

      {mood === 'thinking' || mood === 'happy' ? (
        <Animated.View style={[layer, { opacity: extraOpacity }]}>
          <Svg width={size} height={height} viewBox="0 0 100 124">
            {mood === 'thinking' ? (
              <G fill={C.dark}>
                <Circle cx={80} cy={36} r={2.4} fillOpacity={0.45} />
                <Circle cx={87} cy={27} r={3.2} fillOpacity={0.65} />
                <Circle cx={95} cy={16} r={4} />
              </G>
            ) : (
              <G fill={C.cheeks}>
                <Path d="M12 38 L14.2 44 L20 46 L14.2 48 L12 54 L9.8 48 L4 46 L9.8 44 Z" />
                <Path d="M89 22 L90.2 25.3 L93.5 26.5 L90.2 27.7 L89 31 L87.8 27.7 L84.5 26.5 L87.8 25.3 Z" />
              </G>
            )}
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
