import { AlertCircle, FileText, Headset, Image as ImageIcon, RefreshCw } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import type { OutgoingMessage } from '@/features/asistente/hooks';
import { cn } from '@/lib/cn';
import type { ChatTurn } from '@/services/assistant';
import { colors, shadows } from '@/theme/tokens';
import { Markdown } from './Markdown';
import { Appear, TypingDots } from './motion';
import { MermabAvatar, type AvatarMood } from './MermabAvatar';

type AttachmentLike = { name: string; isPdf: boolean };

function AttachmentChips({ items, mine }: { items: AttachmentLike[]; mine: boolean }) {
  if (!items.length) return null;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {items.map((a, i) => {
        const Icon = a.isPdf ? FileText : ImageIcon;
        return (
          <View
            key={`${a.name}-${i}`}
            className={cn(
              'flex-row items-center gap-1 rounded-md px-2 py-1',
              mine ? 'bg-primary-foreground/20' : 'bg-muted',
            )}
          >
            <Icon size={14} color={mine ? colors.primaryForeground : colors.mutedForeground} />
            <Text
              className={cn(
                'max-w-40 text-xs',
                mine ? 'text-primary-foreground' : 'text-muted-foreground',
              )}
              numberOfLines={1}
            >
              {a.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function UserBubble({
  text,
  attachments = [],
  caption,
}: {
  text: string;
  attachments?: AttachmentLike[];
  caption?: React.ReactNode;
}) {
  return (
    <View className="max-w-[85%] gap-1 self-end md:max-w-[70%]">
      <View
        className="gap-2 rounded-3xl rounded-br-lg bg-primary px-4 py-3"
        style={shadows.primary}
      >
        <AttachmentChips items={attachments} mine />
        <Text className="text-[15px] leading-6 text-primary-foreground">{text}</Text>
      </View>
      {caption}
    </View>
  );
}

/** El agente es la gota-hoja animada; la persona del Banco, un círculo con auriculares. */
export function AssistantAvatar({
  operator,
  mood = 'idle',
  size = 32,
}: {
  operator?: boolean;
  mood?: AvatarMood;
  size?: number;
}) {
  if (!operator) return <MermabAvatar size={size} mood={mood} />;
  return (
    <View
      className="items-center justify-center rounded-full bg-info"
      style={[{ width: size, height: size }, shadows.sm]}
      aria-hidden
    >
      <Headset size={size * 0.5} color={colors.primaryForeground} />
    </View>
  );
}

/** Fila de una respuesta: avatar a la izquierda, a la altura del comienzo de la burbuja. */
function AssistantRow({
  operator,
  mood,
  children,
}: {
  operator?: boolean;
  mood?: AvatarMood;
  children: React.ReactNode;
}) {
  return (
    <Appear
      from="left"
      className="max-w-[92%] flex-row items-start gap-2.5 self-start md:max-w-[80%]"
    >
      <View className="pt-1">
        <AssistantAvatar operator={operator} mood={mood} size={operator ? 32 : 30} />
      </View>
      <View className="flex-shrink gap-1">{children}</View>
    </Appear>
  );
}

export function AssistantBubble({
  markdown,
  typing,
  operator,
}: {
  markdown: string;
  typing?: boolean;
  operator?: boolean;
}) {
  return (
    <AssistantRow operator={operator} mood={typing ? 'talking' : 'idle'}>
      {operator ? (
        <Text variant="caption" tone="info" className="pl-1 font-semibold">
          Persona del Banco
        </Text>
      ) : null}
      <View
        className={cn(
          'rounded-3xl rounded-bl-lg border px-4 py-3',
          operator ? 'border-info/30 bg-info/10' : 'border-border/60 bg-card',
        )}
        style={shadows.md}
      >
        <Markdown source={markdown} />
        {typing ? (
          <View className="mt-2" accessibilityLabel="El asistente está escribiendo">
            <TypingDots color={colors.primary} />
          </View>
        ) : null}
      </View>
    </AssistantRow>
  );
}

export function ThinkingBubble({ label = 'Pensando…' }: { label?: string }) {
  return (
    <AssistantRow mood="thinking">
      <View
        className="flex-row items-center gap-3 self-start rounded-3xl rounded-bl-lg bg-accent px-4 py-3.5"
        accessibilityLabel={label}
        accessibilityLiveRegion="polite"
      >
        <Text className="text-[15px] font-medium text-accent-foreground">{label}</Text>
        <TypingDots color={colors.accentForeground} />
      </View>
    </AssistantRow>
  );
}

function RetryRow({
  message,
  onRetry,
  busy,
}: {
  message: string;
  onRetry: () => void;
  busy?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <AlertCircle size={16} color={colors.destructive} />
      <Text className="flex-shrink text-sm text-destructive">{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        disabled={busy}
        onPress={onRetry}
        className={cn(
          'min-h-9 flex-row items-center gap-1 rounded-lg border border-destructive/40 px-3',
          busy && 'opacity-50',
        )}
      >
        <RefreshCw size={14} color={colors.destructive} />
        <Text className="text-sm font-semibold text-destructive">Reintentar</Text>
      </Pressable>
    </View>
  );
}

const turnAttachments = (t: ChatTurn): AttachmentLike[] =>
  t.attachments.map((a) => ({ name: a.filename, isPdf: a.mimeType === 'application/pdf' }));

/** Un turno del historial: el mensaje de la persona y, debajo, la respuesta del asistente. */
export function TurnView({
  turn,
  onRetry,
  retrying,
}: {
  turn: ChatTurn;
  onRetry: (t: ChatTurn) => void;
  retrying: boolean;
}) {
  if (turn.role === 'operator') {
    return <AssistantBubble markdown={turn.text || turn.response || ''} operator />;
  }
  if (turn.role === 'assistant') {
    return turn.response ? <AssistantBubble markdown={turn.response} /> : null;
  }
  return (
    <View className="gap-3">
      <UserBubble text={turn.text} attachments={turnAttachments(turn)} />
      {turn.status === 'pending' ? <ThinkingBubble /> : null}
      {turn.status === 'running' ? (
        turn.response ? (
          <AssistantBubble markdown={turn.response} typing />
        ) : (
          <ThinkingBubble />
        )
      ) : null}
      {turn.status === 'completed' && turn.response ? (
        <AssistantBubble markdown={turn.response} />
      ) : null}
      {turn.status === 'waiting' ? (
        <View className="ml-10 flex-row items-center gap-2 self-start rounded-xl bg-info/10 px-3 py-2">
          <Headset size={16} color={colors.info} />
          <Text className="text-sm text-foreground">Te va a responder una persona del Banco.</Text>
        </View>
      ) : null}
      {turn.status === 'failed' ? (
        <View className="ml-10 self-start">
          <RetryRow
            message="El asistente no pudo responder."
            onRetry={() => onRetry(turn)}
            busy={retrying}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Mensaje recién mandado que todavía no aparece en el historial del servidor. */
export function OutgoingView({
  item,
  onRetry,
}: {
  item: OutgoingMessage;
  onRetry: (id: string) => void;
}) {
  const attachments = item.attachments.map((a) => ({ name: a.name, isPdf: a.kind === 'pdf' }));
  return (
    <View className="gap-3">
      <Appear from="right">
        <UserBubble
          text={item.text}
          attachments={attachments}
          caption={
            item.state === 'failed' ? (
              <View className="self-end">
                <RetryRow
                  message={item.error ?? 'No se envió.'}
                  onRetry={() => onRetry(item.clientMessageId)}
                />
              </View>
            ) : item.state === 'sending' ? (
              <Text variant="caption" className="self-end">
                {item.attachments.length ? 'Subiendo y enviando…' : 'Enviando…'}
              </Text>
            ) : null
          }
        />
      </Appear>
      {item.state === 'sent' ? <ThinkingBubble /> : null}
    </View>
  );
}
