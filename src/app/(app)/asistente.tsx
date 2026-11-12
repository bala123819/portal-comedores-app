import { useLocalSearchParams } from 'expo-router';
import { Headset, Info, MessageSquarePlus, TriangleAlert } from 'lucide-react-native';
import { useRef } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { ApprovalCard } from '@/components/asistente/ApprovalCard';
import { AssistantBubble, OutgoingView, TurnView } from '@/components/asistente/ChatBubbles';
import { Composer } from '@/components/asistente/Composer';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { Button, Chip, EmptyState, Header, IconButton, OfflineBanner, Text } from '@/components/ui';
import { useAssistantChat, type OutgoingMessage } from '@/features/asistente/hooks';
import { useSession } from '@/features/auth/store';
import { env } from '@/lib/env';
import { assistantErrorMessage, type ChatTurn } from '@/services/assistant';
import { colors } from '@/theme/tokens';

/**
 * Chat con el asistente del comedor (GoDubi). Un solo chat: consultas, pedidos, familias, avisos
 * al Banco y recetas. Lo que el asistente quiere guardar llega como tarjeta y sólo se guarda al
 * confirmar; después se ve en las pantallas normales. Ver docs/asistente/README.md.
 *
 * Parámetro `prefill`: texto precargado (sin enviar), para los atajos "Hacerlo con el asistente".
 */
const SUGGESTIONS = [
  '¿Qué familias tenemos?',
  '¿Cuántos kilos recibimos este mes?',
  'Receta para 40 personas con arroz y lentejas',
  'Quiero avisar al Banco que se nos rompió la heladera',
];

type Row = { kind: 'turn'; turn: ChatTurn } | { kind: 'out'; item: OutgoingMessage };

function Notice({ tone, icon: Icon, children }: { tone: 'info' | 'warning'; icon: typeof Info; children: React.ReactNode }) {
  return (
    <View
      className={tone === 'info' ? 'mx-4 mt-2 flex-row items-start gap-2 rounded-lg bg-info/10 px-3 py-2' : 'mx-4 mt-2 flex-row items-start gap-2 rounded-lg bg-warning/15 px-3 py-2'}
      accessibilityRole="alert"
    >
      <Icon size={18} color={tone === 'info' ? colors.info : colors.foreground} />
      <View className="flex-1">{children}</View>
    </View>
  );
}

export default function AsistenteScreen() {
  const params = useLocalSearchParams<{ prefill?: string }>();
  const org = useSession((s) => s.organization);
  const chat = useAssistantChat();
  const listRef = useRef<FlatList<Row>>(null);
  const keepPosition = useRef(false);

  const rows: Row[] = [
    ...chat.turns.map((turn) => ({ kind: 'turn' as const, turn })),
    ...chat.outbox.map((item) => ({ kind: 'out' as const, item })),
  ];
  const empty = !chat.loadingHistory && rows.length === 0;
  const welcome = chat.session?.welcome ?? 'Hola, soy el asistente del comedor. ¿En qué te ayudo?';

  // La organización del asistente hoy es fija: si la app está en otra, lo guardado no se va a ver acá.
  const orgMismatch = chat.mode === 'http' && !!org?.name && org.name.trim() !== env.assistantOrgName;
  const webBlocked = chat.mode === 'http' && Platform.OS === 'web';

  const subtitle = chat.paused
    ? 'Te atiende una persona del Banco'
    : chat.mode === 'mock'
      ? 'Modo de prueba (simulado)'
      : undefined;

  async function loadOlder() {
    keepPosition.current = true;
    await chat.loadOlder();
    setTimeout(() => (keepPosition.current = false), 300);
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Asistente"
        subtitle={subtitle}
        back
        backFallback="/"
        right={
          chat.conversationId ? (
            <IconButton icon={MessageSquarePlus} label="Empezar una conversación nueva" onPress={() => void chat.newConversation()} />
          ) : null
        }
      />
      <OfflineBanner />
      {webBlocked ? (
        <Notice tone="warning" icon={TriangleAlert}>
          <Text className="text-sm">
            El asistente real no funciona desde el navegador (lo bloquea por seguridad). Probalo en el celular o usá el
            modo de prueba.
          </Text>
        </Notice>
      ) : null}
      {orgMismatch ? (
        <Notice tone="info" icon={Info}>
          <Text className="text-sm">
            Por ahora el asistente atiende a <Text className="text-sm font-semibold">{env.assistantOrgName}</Text>. Lo
            que guarde no va a aparecer en {org?.name}.
          </Text>
        </Notice>
      ) : null}
      {chat.paused ? (
        <Notice tone="info" icon={Headset}>
          <Text className="text-sm">Una persona del Banco tomó la conversación y te va a responder por acá.</Text>
        </Notice>
      ) : null}

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="w-full max-w-3xl flex-1 self-center">
          {chat.startError ? (
            <EmptyState
              icon={TriangleAlert}
              title="No pudimos conectar con el asistente"
              message={assistantErrorMessage(chat.startError)}
              actionLabel="Reintentar"
              onAction={chat.retryStart}
            />
          ) : chat.starting || chat.loadingHistory ? (
            <View className="flex-1 items-center justify-center gap-3">
              <ActivityIndicator color={colors.primary} />
              <Text variant="caption">Conectando con el asistente…</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={rows}
              keyExtractor={(r) => (r.kind === 'turn' ? r.turn.id : r.item.clientMessageId)}
              contentContainerClassName="gap-4 p-4"
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                if (!keepPosition.current) listRef.current?.scrollToEnd({ animated: true });
              }}
              ListHeaderComponent={
                <View className="gap-4">
                  {chat.hasOlder ? (
                    <Button
                      title="Ver mensajes anteriores"
                      variant="ghost"
                      size="sm"
                      loading={chat.loadingOlder}
                      onPress={() => void loadOlder()}
                    />
                  ) : null}
                  {empty ? (
                    <View className="gap-3">
                      <AssistantBubble markdown={welcome} />
                      <Text variant="caption" className="pl-1">
                        Probá con:
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {SUGGESTIONS.map((s) => (
                          <Chip key={s} label={s} onPress={() => chat.send(s)} />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              }
              renderItem={({ item: r }) =>
                r.kind === 'turn' ? (
                  <TurnView turn={r.turn} onRetry={(t) => void chat.retryTurn(t)} retrying={chat.retryingTurn === r.turn.id} />
                ) : (
                  <OutgoingView item={r.item} onRetry={chat.retryOutgoing} />
                )
              }
              ListFooterComponent={
                <View className="gap-3">
                  {chat.approvals.map((a) => (
                    <ApprovalCard
                      key={a.id}
                      approval={a}
                      deciding={!!chat.deciding[a.id]}
                      onDecide={(approve) => void chat.decide(a, approve)}
                    />
                  ))}
                  {chat.limitReached ? (
                    <Notice tone="warning" icon={TriangleAlert}>
                      <Text className="text-sm">Esta conversación llegó a su límite de mensajes.</Text>
                      <Button
                        title="Empezar una conversación nueva"
                        size="sm"
                        variant="outline"
                        className="mt-2 self-start"
                        onPress={() => void chat.newConversation()}
                      />
                    </Notice>
                  ) : null}
                  {empty ? <WhatsAppButton context={{ kind: 'general' }} title="Prefiero hablar por WhatsApp" variant="secondary" /> : null}
                </View>
              }
            />
          )}

          <Composer
            key={params.prefill ?? 'chat'}
            initialText={params.prefill ?? ''}
            disabled={!chat.conversationId || chat.limitReached}
            busy={chat.busy}
            attachmentsAllowed={chat.session?.attachmentsAllowed ?? false}
            onSend={chat.send}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
