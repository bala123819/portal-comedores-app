import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './Button';
import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function BottomSheet({ visible, onClose, title, children, footer }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
        <Pressable
          className="absolute inset-0 bg-foreground/50"
          onPress={onClose}
          accessibilityLabel="Cerrar"
        />
        <View
          className="max-h-[88%] w-full max-w-content self-center rounded-t-xl bg-card"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          accessibilityViewIsModal
        >
          <View className="items-center pt-2">
            <View className="h-1.5 w-12 rounded-full bg-border" />
          </View>
          <View className="flex-row items-center justify-between pl-4 pr-1">
            <Text variant="heading" className="flex-1" accessibilityRole="header">
              {title ?? ''}
            </Text>
            <IconButton icon={X} label="Cerrar" onPress={onClose} />
          </View>
          <ScrollView
            contentContainerClassName="gap-3 px-4 pb-4"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? <View className="gap-2 px-4 pt-2">{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
