import { AlertCircle, FileText, Headset, Image as ImageIcon, RefreshCw, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import type { OutgoingMessage } from '@/features/asistente/hooks';
import { cn } from '@/lib/cn';
import type { ChatTurn } from '@/services/assistant';
import { colors } from '@/theme/tokens';
import { Markdown } from './Markdown';

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
            className={cn('flex-row items-center gap-1 rounded-md px-2 py-1', mine ? 'bg-primary-foreground/20' : 'bg-muted')}
          >
            <Icon size={14} color={mine ? colors.primaryForeground : colors.mutedForeground} />
            <Text className={cn('max-w-40 text-xs', mine ? 'text-primary-foreground' : 'text-muted-foreground')} numberOfLines={1}>
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
    <View className="max-w-[85%] gap-1 self-end">
      <View className="gap-2 rounded-2xl rounded-br-md bg-primary px-4 py-3">
        <AttachmentChips items={attachments} mine />
        <Text className="text-primary-foreground">{text}</Text>
      </View>
      {caption}
    </View>
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
    <View className="max-w-[90%] gap-1 self-start">
      {operator ? (
        <View className="flex-row items-center gap-1 pl-1">
          <Headset size={14} color={colors.info} />
          <Text variant="caption" tone="info" className="font-semibold">
            Persona del Banco
          </Text>
        </View>
      ) : null}
      <View
        className={cn(
          'rounded-2xl rounded-bl-md border px-4 py-3',
          operator ? 'border-info/30 bg-info/10' : 'border-border bg-card',
        )}
      >
        <Markdown source={markdown} />
        {typing ? (
          <View className="mt-2 flex-row items-center gap-2" accessibilityLabel="El asistente está escribiendo">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="caption">Escribiendo…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ThinkingBubble({ label = 'Pensando…' }: { label?: string }) {
  return (
    <View
      className="flex-row items-center gap-2 self-start rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <Sparkles size={16} color={colors.primary} />
      <ActivityIndicator size="small" color={colors.primary} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

function RetryRow({ message, onRetry, busy }: { message: string; onRetry: () => void; busy?: boolean }) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <AlertCircle size={16} color={colors.destructive} />
      <Text className="flex-shrink text-sm text-destructive">{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        disabled={busy}
        onPress={onRetry}
        className={cn('min-h-9 flex-row items-center gap-1 rounded-lg border border-destructive/40 px-3', busy && 'opacity-50')}
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
        turn.response ? <AssistantBubble markdown={turn.response} typing /> : <ThinkingBubble />
      ) : null}
      {turn.status === 'completed' && turn.response ? <AssistantBubble markdown={turn.response} /> : null}
      {turn.status === 'waiting' ? (
        <View className="flex-row items-center gap-2 self-start rounded-xl bg-info/10 px-3 py-2">
          <Headset size={16} color={colors.info} />
          <Text className="text-sm text-foreground">Te va a responder una persona del Banco.</Text>
        </View>
      ) : null}
      {turn.status === 'failed' ? (
        <View className="self-start">
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
export function OutgoingView({ item, onRetry }: { item: OutgoingMessage; onRetry: (id: string) => void }) {
  const attachments = item.attachments.map((a) => ({ name: a.name, isPdf: a.kind === 'pdf' }));
  return (
    <View className="gap-3">
      <UserBubble
        text={item.text}
        attachments={attachments}
        caption={
          item.state === 'failed' ? (
            <View className="self-end">
              <RetryRow message={item.error ?? 'No se envió.'} onRetry={() => onRetry(item.clientMessageId)} />
            </View>
          ) : item.state === 'sending' ? (
            <Text variant="caption" className="self-end">
              {item.attachments.length ? 'Subiendo y enviando…' : 'Enviando…'}
            </Text>
          ) : null
        }
      />
      {item.state === 'sent' ? <ThinkingBubble /> : null}
    </View>
  );
}
