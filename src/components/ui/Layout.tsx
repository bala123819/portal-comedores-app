import type { Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';
import { goBack } from '@/lib/navigation';
import { colors, shadows } from '@/theme/tokens';
import { IconButton } from './Button';
import { OfflineBanner } from './States';
import { Text } from './Text';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  /** Ruta a la que volver si no hay historial (web / deep link) */
  backFallback?: string;
  right?: ReactNode;
}

export function Header({ title, subtitle, back, backFallback = '/', right }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-border/60 bg-card" style={{ paddingTop: insets.top }}>
      <View className="min-h-16 w-full max-w-content flex-row items-center gap-1 self-center px-2 md:px-6 lg:px-10">
        {back ? (
          <IconButton
            icon={ArrowLeft}
            label="Volver"
            onPress={() => goBack(backFallback as Href)}
          />
        ) : (
          <View className="w-2" />
        )}
        <View className="flex-1 py-2">
          <Text variant="heading" className="text-xl" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View className="flex-row items-center">{right}</View> : null}
      </View>
    </View>
  );
}

export interface ScreenProps extends Omit<ScrollViewProps, 'children'> {
  children: ReactNode;
  header?: ReactNode;
  /** false = el contenido maneja su propio scroll (listas) */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  contentClassName?: string;
  /** Bloque a todo el ancho al principio del scroll (se desplaza con el contenido, sin márgenes) */
  hero?: ReactNode;
}

/**
 * Contenedor de pantalla: header, banner offline, ancho máximo en web/tablet,
 * gutter de 16 px, pull-to-refresh y footer fijo para la acción principal.
 */
export function Screen({
  children,
  header,
  scroll = true,
  refreshing = false,
  onRefresh,
  footer,
  contentClassName,
  hero,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const contentClasses = cn(
    'w-full max-w-content self-center gap-4 p-4 pb-8 md:px-8 lg:px-12',
    contentClassName,
  );
  return (
    <View className="flex-1 bg-background">
      {header}
      <OfflineBanner />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName={hero ? 'w-full' : contentClasses}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              ) : undefined
            }
            {...props}
          >
            {hero ? (
              <>
                {hero}
                <View className={contentClasses}>{children}</View>
              </>
            ) : (
              children
            )}
          </ScrollView>
        ) : (
          <View className={cn('w-full max-w-content flex-1 self-center', contentClassName)}>
            {children}
          </View>
        )}
        {footer ? (
          <View
            className="border-t border-border/60 bg-card"
            style={{ ...shadows.bar, paddingBottom: header ? Math.max(insets.bottom, 12) : 12 }}
          >
            <View className="w-full max-w-content gap-2 self-center px-4 pt-3 md:px-8 lg:px-12">{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="mt-3 flex-row items-center justify-between">
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  );
}
