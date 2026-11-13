import { useLocalSearchParams } from 'expo-router';
import {
  ChefHat,
  Headset,
  History,
  Info,
  Megaphone,
  MessageSquarePlus,
  Scale,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { ApprovalCard } from '@/components/asistente/ApprovalCard';
import { AssistantAvatar, OutgoingView, TurnView } from '@/components/asistente/ChatBubbles';
import { ChatHistorySheet, ReadOnlyConversation } from '@/components/asistente/ChatHistory';
import { Composer } from '@/components/asistente/Composer';
import { Appear, TypingDots } from '@/components/asistente/motion';
import { MermabAvatar, type AvatarMood } from '@/components/asistente/MermabAvatar';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { Button, EmptyState, Header, IconButton, OfflineBanner, Text } from '@/components/ui';
import { loadHistory, type SavedConversation } from '@/features/asistente/history';
import { useAssistantChat, type OutgoingMessage } from '@/features/asistente/hooks';
import { useSession } from '@/features/auth/store';
import { cn } from '@/lib/cn';
import { env } from '@/lib/env';
import { assistantErrorMessage, type ChatTurn } from '@/services/assistant';
import { colors, shadows } from '@/theme/tokens';

/**
 * Chat con el asistente del comedor (GoDubi). Un solo chat: consultas, pedidos, familias, avisos
 * al Banco y recetas. Lo que el asistente quiere guardar llega como tarjeta y sólo se guarda al
 * confirmar; después se ve en las pantallas normales. Ver docs/asistente/README.md.
 *
 * Parámetro `prefill`: texto precargado (sin enviar), para los atajos "Hacerlo con el asistente".
 */
const SUGGESTIONS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Users, title: 'Familias', text: '¿Qué familias tenemos?' },
  { icon: Scale, title: 'Lo recibido', text: '¿Cuántos kilos recibimos este mes?' },
  { icon: ChefHat, title: 'Cocina', text: 'Receta para 40 personas con arroz y lentejas' },
  {
    icon: Megaphone,
    title: 'Avisar al Banco',
    text: 'Quiero avisar al Banco que se nos rompió la heladera',
  },
];

/** Columna del chat: centrada y con ancho de lectura, dentro de una lista que ocupa toda la pantalla. */
const COLUMN = 'w-full max-w-3xl self-center';

type Row = { kind: 'turn'; turn: ChatTurn } | { kind: 'out'; item: OutgoingMessage };

function Suggestion({
  icon: Icon,
  title,
  text,
  delay,
  onPress,
}: (typeof SUGGESTIONS)[number] & { delay: number; onPress: () => void }) {
  return (
    <Appear delay={delay} className="w-full md:w-[49%]">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        onPress={onPress}
        className="min-h-20 flex-row items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 active:opacity-80 web:hover:border-primary/40"
        style={shadows.sm}
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent">
          <Icon size={20} color={colors.accentForeground} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="label" className="text-sm text-accent-foreground">
            {title}
          </Text>
          <Text className="text-[15px] leading-5">{text}</Text>
        </View>
      </Pressable>
    </Appear>
  );
}

/** Conversación vacía: saludo grande y sugerencias tocables. */
function Welcome({ text, onPick }: { text: string; onPick: (s: string) => void }) {
  return (
    <View className="gap-6 pb-2 pt-4 md:pt-10">
      <Appear className="items-center gap-3">
        <AssistantAvatar size={84} />
        <Text variant="heading" className="text-center text-2xl">
          ¿En qué te ayudo hoy?
        </Text>
        <Text tone="muted" className="max-w-lg text-center leading-6">
          {text}
        </Text>
      </Appear>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {SUGGESTIONS.map((s, i) => (
          <Suggestion key={s.text} {...s} delay={120 + i * 70} onPress={() => onPick(s.text)} />
        ))}
      </View>
    </View>
  );
}

function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'info' | 'warning';
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <View
      className={cn(
        'mt-2 flex-row items-start gap-2 rounded-xl px-3 py-2',
        tone === 'info' ? 'bg-info/10' : 'bg-warning/15',
      )}
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saved, setSaved] = useState<SavedConversation[]>([]);
  const [viewing, setViewing] = useState<SavedConversation | null>(null);

  async function openHistory() {
    setSaved(await loadHistory());
    setHistoryOpen(true);
  }

  function pickSaved(c: SavedConversation) {
    setHistoryOpen(false);
    setViewing(c.id === chat.conversationId ? null : c);
  }

  async function startNew() {
    setHistoryOpen(false);
    setViewing(null);
    await chat.newConversation();
  }
  const keepPosition = useRef(false);

  const rows: Row[] = [
    ...chat.turns.map((turn) => ({ kind: 'turn' as const, turn })),
    ...chat.outbox.map((item) => ({ kind: 'out' as const, item })),
  ];
  const empty = !chat.loadingHistory && rows.length === 0;
  const welcome = chat.session?.welcome ?? 'Hola, soy el asistente del comedor. ¿En qué te ayudo?';

  // La organización del asistente hoy es fija: si la app está en otra, lo guardado no se va a ver acá.
  const orgMismatch =
    chat.mode === 'http' && !!org?.name && org.name.trim() !== env.assistantOrgName;

  // Cara del avatar de arriba: piensa, "habla" mientras llega la respuesta y festeja un momento al terminar.
  const last = chat.turns[chat.turns.length - 1];
  const talking = last?.status === 'running' && !!last.response;
  const [celebrate, setCelebrate] = useState(false);
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !chat.busy) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2500);
      wasBusy.current = false;
      return () => clearTimeout(t);
    }
    wasBusy.current = chat.busy;
  }, [chat.busy]);
  const mood: AvatarMood = talking
    ? 'talking'
    : chat.busy
      ? 'thinking'
      : celebrate
        ? 'happy'
        : 'idle';

  const subtitle = chat.paused
    ? 'Te atiende una persona del Banco'
    : chat.mode === 'mock'
      ? 'Modo de prueba (simulado)'
      : talking
        ? 'Escribiendo…'
        : chat.busy
          ? 'Pensando…'
          : 'En línea';

  async function loadOlder() {
    keepPosition.current = true;
    await chat.loadOlder();
    setTimeout(() => (keepPosition.current = false), 300);
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Asistente Mermab"
        subtitle={subtitle}
        subtitleDot={chat.mode === 'http' && !chat.paused ? '#34B277' : undefined}
        leading={
          <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
            <MermabAvatar size={30} mood={mood} shadow={false} />
          </View>
        }
        back
        backFallback="/"
        right={
          <>
            {chat.mode === 'http' ? (
              <IconButton
                icon={History}
                label="Chats anteriores"
                onPress={() => void openHistory()}
              />
            ) : null}
            {chat.conversationId ? (
              <IconButton
                icon={MessageSquarePlus}
                label="Empezar una conversación nueva"
                onPress={() => void startNew()}
              />
            ) : null}
          </>
        }
      />
      <OfflineBanner />
      <View className={cn(COLUMN, 'px-4')}>
        {orgMismatch ? (
          <Notice tone="info" icon={Info}>
            <Text className="text-sm">
              Por ahora el asistente atiende a{' '}
              <Text className="text-sm font-semibold">{env.assistantOrgName}</Text>. Lo que guarde
              no va a aparecer en {org?.name}.
            </Text>
          </Notice>
        ) : null}
        {chat.paused ? (
          <Notice tone="info" icon={Headset}>
            <Text className="text-sm">
              Una persona del Banco tomó la conversación y te va a responder por acá.
            </Text>
          </Notice>
        ) : null}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {viewing ? (
          <ReadOnlyConversation conversation={viewing} onBack={() => setViewing(null)} />
        ) : (
          <View className="w-full flex-1">
            {chat.startError ? (
              <EmptyState
                icon={TriangleAlert}
                title="No pudimos conectar con el asistente"
                message={assistantErrorMessage(chat.startError)}
                actionLabel="Reintentar"
                onAction={chat.retryStart}
              />
            ) : chat.starting || chat.loadingHistory ? (
              <View className="flex-1 items-center justify-center gap-4">
                <AssistantAvatar size={72} mood="thinking" />
                <View className="items-center gap-2">
                  <TypingDots color={colors.primary} />
                  <Text variant="caption">Conectando con el asistente…</Text>
                </View>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={rows}
                keyExtractor={(r) => (r.kind === 'turn' ? r.turn.id : r.item.clientMessageId)}
                className="flex-1"
                contentContainerClassName={cn(COLUMN, 'gap-5 px-4 pb-6 pt-4')}
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
                    {empty ? <Welcome text={welcome} onPick={(s) => chat.send(s)} /> : null}
                  </View>
                }
                renderItem={({ item: r }) =>
                  r.kind === 'turn' ? (
                    <TurnView
                      turn={r.turn}
                      onRetry={(t) => void chat.retryTurn(t)}
                      retrying={chat.retryingTurn === r.turn.id}
                    />
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
                        <Text className="text-sm">
                          Esta conversación llegó a su límite de mensajes.
                        </Text>
                        <Button
                          title="Empezar una conversación nueva"
                          size="sm"
                          variant="outline"
                          className="mt-2 self-start"
                          onPress={() => void startNew()}
                        />
                      </Notice>
                    ) : null}
                    {empty ? (
                      <Appear delay={450}>
                        <WhatsAppButton
                          context={{ kind: 'general' }}
                          title="Prefiero hablar por WhatsApp"
                          variant="outline"
                        />
                      </Appear>
                    ) : null}
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
        )}
      </KeyboardAvoidingView>

      <ChatHistorySheet
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={saved}
        currentId={chat.conversationId}
        onPick={pickSaved}
        onNew={() => void startNew()}
      />
    </View>
  );
}
