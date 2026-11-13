import {
  Camera,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Send,
  Square,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, Text, toast } from '@/components/ui';
import {
  MAX_ATTACHMENTS,
  pickPdf,
  pickPhoto,
  type LocalAttachment,
} from '@/features/asistente/attachments';
import { join, useDictation } from '@/features/asistente/dictation';
import { cn } from '@/lib/cn';
import { colors, shadows } from '@/theme/tokens';
import { Appear } from './motion';

/**
 * Barra para escribir: texto, dictado por voz, adjuntos (foto con la cámara, de la galería o PDF;
 * hasta 4) y Enviar. Enviar queda deshabilitado mientras hay un turno en curso (contrato §4: un
 * mensaje a la vez) y mientras se está dictando: lo dictado queda en la barra para revisarlo y
 * corregirlo antes de mandarlo (D-24).
 */
function AttachOption({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-10 flex-row items-center gap-2 rounded-full bg-accent px-4 active:opacity-70 web:hover:bg-primary/15"
    >
      <Icon size={16} color={colors.accentForeground} />
      <Text className="text-sm font-medium text-accent-foreground">{label}</Text>
    </Pressable>
  );
}

export function Composer({
  initialText = '',
  disabled,
  busy,
  attachmentsAllowed,
  onSend,
}: {
  initialText?: string;
  disabled?: boolean;
  busy?: boolean;
  attachmentsAllowed?: boolean;
  /** Devuelve true si el mensaje se aceptó (entonces se limpia la barra). */
  onSend: (text: string, attachments: LocalAttachment[]) => boolean;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Texto que había en la barra al empezar a dictar: lo dictado se agrega a continuación.
  const baseText = useRef('');
  const dictation = useDictation({
    onText: (spoken) => setText(join(baseText.current, spoken)),
    onError: (message) => toast.info(message),
  });

  const canSend = !disabled && !busy && !dictation.listening && text.trim().length > 0;
  const full = attachments.length >= MAX_ATTACHMENTS;

  async function add(fn: () => Promise<LocalAttachment | null>) {
    setMenuOpen(false);
    try {
      const a = await fn();
      if (a) setAttachments((all) => [...all, a].slice(0, MAX_ATTACHMENTS));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos abrir el archivo.');
    }
  }

  function toggleDictation() {
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    setMenuOpen(false);
    baseText.current = text.trimEnd();
    void dictation.start();
  }

  function submit() {
    if (!canSend) return;
    if (onSend(text, attachments)) {
      setText('');
      setAttachments([]);
    }
  }

  return (
    <View className="bg-background" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <View className="w-full max-w-3xl self-center px-4 pt-3">
        {menuOpen ? (
          <Appear className="mb-2 flex-row flex-wrap gap-2">
            <AttachOption
              icon={Camera}
              label="Sacar foto"
              onPress={() => void add(() => pickPhoto('camera'))}
            />
            <AttachOption
              icon={ImageIcon}
              label="Galería"
              onPress={() => void add(() => pickPhoto('library'))}
            />
            <AttachOption icon={FileText} label="PDF" onPress={() => void add(pickPdf)} />
          </Appear>
        ) : null}

        {attachments.length ? (
          <View className="mb-2 flex-row flex-wrap gap-2">
            {attachments.map((a) => (
              <View
                key={a.key}
                className="flex-row items-center gap-1.5 rounded-full bg-accent py-1 pl-3"
              >
                {a.kind === 'pdf' ? (
                  <FileText size={15} color={colors.accentForeground} />
                ) : (
                  <ImageIcon size={15} color={colors.accentForeground} />
                )}
                <Text className="max-w-36 text-sm text-accent-foreground" numberOfLines={1}>
                  {a.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${a.name}`}
                  hitSlop={8}
                  onPress={() => setAttachments((all) => all.filter((x) => x.key !== a.key))}
                  className="h-7 w-7 items-center justify-center"
                >
                  <X size={14} color={colors.accentForeground} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {dictation.listening ? (
          <View className="mb-2 flex-row items-center gap-2" accessibilityLiveRegion="polite">
            {dictation.status === 'starting' ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <View className="h-2.5 w-2.5 rounded-full bg-destructive" />
            )}
            <Text variant="caption" className="flex-1">
              {dictation.status === 'starting'
                ? 'Activando el micrófono…'
                : 'Te escucho… Cuando termines, tocá el cuadrado y revisá el texto antes de enviarlo.'}
            </Text>
          </View>
        ) : null}

        <View
          className={cn(
            'flex-row items-end gap-1 rounded-3xl border bg-card p-1',
            dictation.listening
              ? 'border-destructive'
              : focused
                ? 'border-primary'
                : 'border-input',
          )}
          style={focused && !dictation.listening ? shadows.focus : shadows.sm}
        >
          {attachmentsAllowed ? (
            <IconButton
              icon={menuOpen ? X : Paperclip}
              label={menuOpen ? 'Cerrar adjuntos' : 'Adjuntar foto o PDF'}
              color={full ? colors.input : colors.mutedForeground}
              // No se bloquea mientras el selector está abierto: si la persona lo cierra sin elegir, algunos
              // navegadores no avisan la cancelación y el clip quedaba deshabilitado para siempre (P-38).
              onPress={full ? undefined : () => setMenuOpen((o) => !o)}
            />
          ) : null}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={
              dictation.listening
                ? 'Hablá ahora…'
                : busy
                  ? 'Esperá la respuesta…'
                  : 'Escribí tu mensaje'
            }
            placeholderTextColor={colors.mutedForeground}
            multiline
            // En web el textarea arranca con 2 renglones: así empieza en uno, alineado con los botones
            numberOfLines={Platform.OS === 'web' ? 1 : undefined}
            maxLength={8000}
            editable={!disabled && !dictation.listening}
            accessibilityLabel="Mensaje para el asistente"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyPress={(e) => {
              // En la compu, Enter envía y Shift+Enter hace un salto de línea
              const ev = e.nativeEvent as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                (e as unknown as { preventDefault?: () => void }).preventDefault?.();
                submit();
              }
            }}
            className={cn(
              'max-h-32 min-h-12 flex-1 px-3 py-3 text-base text-foreground',
              !attachmentsAllowed && 'pl-4',
            )}
            style={Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : undefined}
          />
          {dictation.available ? (
            <IconButton
              icon={dictation.listening ? Square : Mic}
              label={dictation.listening ? 'Terminar de dictar' : 'Dictar el mensaje con la voz'}
              color={
                dictation.listening
                  ? colors.primaryForeground
                  : disabled
                    ? colors.input
                    : colors.mutedForeground
              }
              onPress={disabled && !dictation.listening ? undefined : toggleDictation}
              className={cn(dictation.listening && 'bg-destructive')}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            accessibilityState={{ disabled: !canSend }}
            onPress={submit}
            className={cn(
              'h-12 w-12 items-center justify-center rounded-full',
              'bg-primary',
              canSend ? 'active:opacity-80' : 'opacity-60',
            )}
            style={canSend ? shadows.primary : undefined}
          >
            <Send size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
        {Platform.OS === 'web' ? (
          <Text variant="caption" className="mt-1.5 hidden text-center text-xs md:flex">
            Enter para enviar · Shift + Enter para un salto de línea
          </Text>
        ) : null}
      </View>
    </View>
  );
}
