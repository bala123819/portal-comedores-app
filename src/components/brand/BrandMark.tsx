import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Isotipo del Banco de Alimentos / Mermab (vectorial), el mismo del favicon publicado por el Banco
 * en GoDubi (orden 1149). Se dibuja con `react-native-svg`, así se ve nítido en cualquier tamaño.
 * `inverted`: versión blanca para poner sobre el verde.
 */
export function BrandMark({ size = 40, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? '#FFFFFF' : '#4A9D6E';
  const fg = inverted ? '#4A9D6E' : '#FFFFFF';
  return (
    // Decorativo: oculto para los lectores de pantalla (aria-hidden anda en web, iOS y Android)
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Rect width={32} height={32} rx={8} fill={bg} />
        <Path
          d="M16 6L8 10v4c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12v-4l-8-4z"
          fill={fg}
          fillOpacity={0.9}
        />
        <Path
          d="M16 9l-5 2.5v2.5c0 3.47 2.4 6.71 5 7.5 2.6-.79 5-4.03 5-7.5v-2.5L16 9z"
          fill={bg}
        />
        <Circle cx={16} cy={15} r={2.5} fill={fg} />
      </Svg>
    </View>
  );
}
