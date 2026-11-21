import { useWindowDimensions } from 'react-native';

/**
 * Margen lateral del contenido según el ancho de pantalla.
 * Coincide con las clases `p-[1.3rem] md:px-8 lg:px-12` de `Screen` (breakpoints de Tailwind).
 */
export function useContentPadding() {
  const { width } = useWindowDimensions();
  if (width >= 1024) return 48;
  if (width >= 768) return 32;
  return 21; // 1.3rem
}
