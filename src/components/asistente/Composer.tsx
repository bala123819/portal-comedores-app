import { Camera, FileText, Image as ImageIcon, Mic, Paperclip, Send, Square, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton, Text, toast } from '@/components/ui';
import { MAX_ATTACHMENTS, pickPdf, pickPhoto, type LocalAttachment } from '@/features/asistente/attachments';
import { join, useDictation } from '@/features/asistente/dictation';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

/**
 * Barra para escribir: texto, dictado por voz, adjuntos (foto con la cámara, de la galería o PDF;
 * hasta 4) y Enviar. Enviar queda deshabilitado mientras hay un turno en curso (contrato §4: un
 * mensaje a la vez) y mientras se está dictando: lo dictado queda en la barra para revisarlo y
 * corregirlo antes de mandarlo (D-24).
 */
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
  const [picking, setPicking] = useState(false);
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
    setPicking(true);
    try {
      const a = await fn();
      if (a) setAttachments((all) => [...all, a].slice(0, MAX_ATTACHMENTS));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos abrir el archivo.');
    } finally {
      setPicking(false);
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
    <View className="border-t border-border bg-background px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      {menuOpen ? (
        <View className="mb-2 flex-row flex-wrap gap-2">
          <Button title="Sacar foto" icon={Camera} size="sm" variant="outline" onPress={() => void add(() => pickPhoto('camera'))} />
          <Button title="Galería" icon={ImageIcon} size="sm" variant="outline" onPress={() => void add(() => pickPhoto('library'))} />
          <Button title="PDF" icon={FileText} size="sm" variant="outline" onPress={() => void add(pickPdf)} />
        </View>
      ) : null}

      {attachments.length ? (
        <View className="mb-2 flex-row flex-wrap gap-2">
          {attachments.map((a) => (
            <View key={a.key} className="flex-row items-center gap-1 rounded-lg border border-border bg-card py-1 pl-2">
              {a.kind === 'pdf' ? <FileText size={16} color={colors.mutedForeground} /> : <ImageIcon size={16} color={colors.mutedForeground} />}
              <Text className="max-w-36 text-sm" numberOfLines={1}>
                {a.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${a.name}`}
                hitSlop={8}
                onPress={() => setAttachments((all) => all.filter((x) => x.key !== a.key))}
                className="h-7 w-7 items-center justify-center"
              >
                <X size={14} color={colors.mutedForeground} />
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
            {dictation.status === 'starting' ? 'Activando el micrófono…' : 'Te escucho… Cuando termines, tocá el cuadrado y revisá el texto antes de enviarlo.'}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-end gap-2">
        {attachmentsAllowed ? (
          <IconButton
            icon={menuOpen ? X : Paperclip}
            label={menuOpen ? 'Cerrar adjuntos' : 'Adjuntar foto o PDF'}
            color={full || picking ? colors.input : colors.mutedForeground}
            onPress={full || picking ? undefined : () => setMenuOpen((o) => !o)}
          />
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={dictation.listening ? 'Hablá ahora…' : busy ? 'Esperá la respuesta…' : 'Escribí tu mensaje'}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={8000}
          editable={!disabled && !dictation.listening}
          accessibilityLabel="Mensaje para el asistente"
          className={cn(
            'max-h-32 min-h-12 flex-1 rounded-xl border bg-card px-4 py-3 text-base text-foreground',
            dictation.listening ? 'border-destructive' : 'border-input',
          )}
        />
        {dictation.available ? (
          <IconButton
            icon={dictation.listening ? Square : Mic}
            label={dictation.listening ? 'Terminar de dictar' : 'Dictar el mensaje con la voz'}
            color={dictation.listening ? colors.primaryForeground : disabled ? colors.input : colors.mutedForeground}
            onPress={disabled && !dictation.listening ? undefined : toggleDictation}
            className={cn(dictation.listening && 'bg-destructive')}
          />
        ) : null}
        <IconButton
          icon={Send}
          label="Enviar"
          color={colors.primaryForeground}
          onPress={submit}
          className={cn('bg-primary', !canSend && 'opacity-40')}
        />
      </View>
    </View>
  );
}
