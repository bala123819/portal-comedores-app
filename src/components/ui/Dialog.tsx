import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
  footer?: ReactNode;
  dismissable?: boolean;
}

export function Dialog({
  visible,
  onClose,
  title,
  message,
  children,
  footer,
  dismissable = true,
}: DialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'fade'}
      onRequestClose={dismissable ? onClose : undefined}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable
          className="flex-1 items-center justify-center bg-foreground/50 px-4"
          onPress={dismissable ? onClose : undefined}
          accessibilityLabel="Cerrar"
        >
          <Pressable
            className="w-full max-w-md gap-4 rounded-xl bg-card p-5"
            onPress={() => {}}
            accessibilityViewIsModal
          >
            <Text variant="heading" accessibilityRole="header">
              {title}
            </Text>
            {message ? <Text tone="muted">{message}</Text> : null}
            {children}
            {footer ? <View className="gap-2">{footer}</View> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/** Confirmación obligatoria para acciones irreversibles o sensibles. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  destructive,
  loading,
  confirmDisabled,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      visible={visible}
      onClose={onCancel}
      title={title}
      message={message}
      dismissable={!loading}
      footer={
        <>
          <Button
            title={confirmLabel}
            variant={destructive ? 'destructive' : 'primary'}
            onPress={onConfirm}
            loading={loading}
            disabled={confirmDisabled}
            fullWidth
          />
          <Button title={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} fullWidth />
        </>
      }
    >
      {children}
    </Dialog>
  );
}
