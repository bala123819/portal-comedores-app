import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { ChefHat, RefreshCw, Send, Sparkles } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { Header, IconButton, OfflineBanner, SegmentedControl, Text } from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { cn } from '@/lib/cn';
import { agents, type AgentTopic, type ChatMessage, type ProposedAction } from '@/services/agents';
import { humanMessage } from '@/services/api/errors';
import { colors } from '@/theme/tokens';

const WELCOME: Record<AgentTopic, string> = {
  general: '¡Hola! Soy el asistente del Banco de Alimentos. ¿En qué te ayudo?',
  recetas: 'Contame qué alimentos tenés y para cuántas personas, y te sugiero recetas.',
  nutricion: 'Preguntame sobre el valor nutricional de lo que recibieron o de una receta.',
};

/** Las acciones propuestas solo navegan: el usuario confirma en la pantalla correspondiente. */
function openAction(a: ProposedAction) {
  if (a.type === 'open_merma') router.push({ pathname: '/merma/[id]', params: { id: a.targetId } });
  else if (a.type === 'open_assignment') router.push({ pathname: '/retiro/[id]', params: { id: a.targetId } });
  else if (a.type === 'open_application') router.push({ pathname: '/postulacion/[id]', params: { id: a.targetId } });
  else router.push({ pathname: '/receta/[id]', params: { id: a.targetId } });
}

function Bubble({ m, onRetry }: { m: ChatMessage; onRetry: () => void }) {
  const mine = m.role === 'user';
  return (
    <View className={cn('max-w-[85%] gap-2', mine ? 'self-end' : 'self-start')}>
      <View className={cn('rounded-xl px-4 py-3', mine ? 'rounded-br-md bg-primary' : 'rounded-bl-md border border-border bg-card')}>
        <Text className={mine ? 'text-primary-foreground' : 'text-foreground'}>{m.text}</Text>
      </View>
      {m.recipes?.map((r) => (
        <Pressable
          key={r.recetaId}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/receta/[id]', params: { id: r.recetaId } })}
          className="flex-row items-center gap-2 rounded-xl border border-border bg-accent px-3 py-2 active:opacity-80"
        >
          <ChefHat size={18} color={colors.accentForeground} />
          <View className="flex-1">
            <Text className="font-semibold text-accent-foreground">{r.nombre}</Text>
            {r.motivo ? <Text variant="caption">{r.motivo}</Text> : null}
          </View>
        </Pressable>
      ))}
      {m.actions?.map((a) => (
        <Pressable
          key={`${a.type}-${a.targetId}`}
          accessibilityRole="button"
          onPress={() => openAction(a)}
          className="min-h-11 items-center justify-center rounded-lg border border-primary px-3 active:opacity-80"
        >
          <Text className="font-semibold text-primary">{a.label}</Text>
        </Pressable>
      ))}
      {m.failed ? (
        <Pressable accessibilityRole="button" onPress={onRetry} className="flex-row items-center gap-1 self-end rounded-md px-2 py-1">
          <RefreshCw size={14} color={colors.destructive} />
          <Text className="text-sm text-destructive">No se envió. Tocá para reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AsistenteScreen() {
  const params = useLocalSearchParams<{ topic?: AgentTopic; mermaId?: string; assignmentId?: string }>();
  const org = useSession((s) => s.organization);
  const insets = useSafeAreaInsets();
  const [topic, setTopic] = useState<AgentTopic>(params.topic ?? 'general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const conversationId = useRef<string | undefined>(undefined);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const context = { organizationId: org?.id, mermaId: params.mermaId, assignmentId: params.assignmentId };

  async function send(message: string, retryOf?: string) {
    const userMsg: ChatMessage = retryOf
      ? { ...messages.find((x) => x.id === retryOf)!, failed: false }
      : { id: randomUUID(), role: 'user', text: message, createdAt: new Date().toISOString() };
    const history = messages.filter((x) => !x.failed).map(({ role, text: t }) => ({ role, text: t }));
    setMessages((all) => (retryOf ? all.map((x) => (x.id === retryOf ? userMsg : x)) : [...all, userMsg]));
    setTyping(true);
    try {
      const reply = await agents.sendMessage({ topic, conversationId: conversationId.current, message, history, context });
      conversationId.current = reply.conversationId ?? conversationId.current;
      setMessages((all) => [
        ...all,
        {
          id: randomUUID(),
          role: 'assistant',
          text: reply.text,
          recipes: reply.recipes,
          actions: reply.actions,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setMessages((all) => all.map((x) => (x.id === userMsg.id ? { ...x, failed: true } : x)));
      if (__DEV__) console.warn('[asistente]', humanMessage(e));
    } finally {
      setTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  const submit = () => {
    const t = text.trim();
    if (!t || typing) return;
    setText('');
    void send(t);
  };

  const data: ChatMessage[] = [
    { id: 'welcome', role: 'assistant', text: WELCOME[topic], createdAt: '' },
    ...messages,
  ];

  return (
    <View className="flex-1 bg-background">
      <Header title="Asistente" subtitle={agents.name === 'simulado' ? 'Modo de prueba' : undefined} back backFallback="/" />
      <OfflineBanner />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="w-full max-w-content flex-1 self-center">
          <View className="px-4 pt-3">
            <SegmentedControl
              value={topic}
              onChange={setTopic}
              options={[
                { label: 'General', value: 'general' },
                { label: 'Recetas', value: 'recetas' },
                { label: 'Nutrición', value: 'nutricion' },
              ]}
            />
          </View>
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(m) => m.id}
            contentContainerClassName="gap-3 p-4"
            renderItem={({ item }) => <Bubble m={item} onRetry={() => void send(item.text, item.id)} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={
              typing ? (
                <View className="flex-row items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-3" accessibilityLabel="El asistente está escribiendo">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text variant="caption">Escribiendo…</Text>
                </View>
              ) : (
                <View className="pt-2">
                  <WhatsAppButton context={{ kind: 'general' }} title="Prefiero hablar por WhatsApp" variant="secondary" />
                </View>
              )
            }
          />
          <View
            className="flex-row items-end gap-2 border-t border-border bg-background px-4 pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribí tu pregunta"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={1000}
              accessibilityLabel="Mensaje para el asistente"
              className="max-h-32 min-h-12 flex-1 rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground"
              onSubmitEditing={submit}
              blurOnSubmit={false}
            />
            <IconButton icon={typing ? Sparkles : Send} label="Enviar" color={colors.primaryForeground} onPress={submit} className="bg-primary" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
