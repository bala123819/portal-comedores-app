import { ArrowLeft, History, MessageSquare } from 'lucide-react-native';
import { FlatList, Pressable, View } from 'react-native';
import { BottomSheet, Button, Text } from '@/components/ui';
import type { SavedConversation } from '@/features/asistente/history';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { colors } from '@/theme/tokens';
import { AssistantBubble, UserBubble } from './ChatBubbles';

/** Hoja con los chats guardados en el dispositivo (features/asistente/history.ts). */
export function ChatHistorySheet({
  visible,
  onClose,
  conversations,
  currentId,
  onPick,
  onNew,
}: {
  visible: boolean;
  onClose: () => void;
  conversations: SavedConversation[];
  currentId?: string;
  onPick: (c: SavedConversation) => void;
  onNew: () => void;
}) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Chats anteriores"
      footer={<Button title="Empezar un chat nuevo" variant="outline" fullWidth onPress={onNew} />}
    >
      {conversations.length ? (
        <View className="gap-2 pb-2">
          <Text variant="caption">
            Quedan guardados en este dispositivo hasta que cierres sesión.
          </Text>
          {conversations.map((c) => {
            const current = c.id === currentId;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`${c.title}${current ? ', chat actual' : ''}`}
                onPress={() => onPick(c)}
                className={cn(
                  'flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-80 web:hover:border-primary/40',
                  current ? 'border-primary/40 bg-accent' : 'border-border/60 bg-card',
                )}
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <MessageSquare size={18} color={colors.accentForeground} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[15px] font-medium" numberOfLines={2}>
                    {c.title}
                  </Text>
                  <Text variant="caption">
                    {current ? 'Chat actual · ' : ''}
                    {formatDateTime(c.updatedAt)} · {c.turns.length}{' '}
                    {c.turns.length === 1 ? 'mensaje' : 'mensajes'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="items-center gap-2 py-6">
          <History size={28} color={colors.mutedForeground} />
          <Text tone="muted" className="text-center">
            Todavía no hay chats guardados. Lo que hables con el asistente va a quedar acá.
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

/** Un chat anterior, para releerlo: la API ya no lo deja continuar (cada sesión es otra identidad). */
export function ReadOnlyConversation({
  conversation,
  onBack,
}: {
  conversation: SavedConversation;
  onBack: () => void;
}) {
  return (
    <View className="flex-1">
      <View className="w-full max-w-3xl self-center px-4 pt-3">
        <View className="flex-row flex-wrap items-center gap-3 rounded-2xl bg-muted px-4 py-3">
          <History size={18} color={colors.mutedForeground} />
          <Text className="flex-1 text-sm">
            Chat del {formatDateTime(conversation.updatedAt)}. Es sólo para leer: para seguir, volvé
            al chat actual.
          </Text>
          <Button
            title="Volver al chat"
            icon={ArrowLeft}
            size="sm"
            variant="outline"
            onPress={onBack}
          />
        </View>
      </View>
      <FlatList
        data={conversation.turns}
        keyExtractor={(t) => t.id}
        className="flex-1"
        contentContainerClassName="w-full max-w-3xl self-center gap-5 px-4 pb-10 pt-4"
        renderItem={({ item: t }) =>
          t.role === 'user' ? (
            <View className="gap-3">
              <UserBubble text={t.text} />
              {t.response ? <AssistantBubble markdown={t.response} /> : null}
            </View>
          ) : t.text || t.response ? (
            <AssistantBubble markdown={t.response || t.text} operator={t.role === 'operator'} />
          ) : null
        }
      />
    </View>
  );
}
