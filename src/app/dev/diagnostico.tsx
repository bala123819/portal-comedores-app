import { CheckCircle2, CircleDashed, Loader, Play, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Header, Input, Screen, Text } from '@/components/ui';
import { extractToken } from '@/features/auth/types';
import { env } from '@/lib/env';
import { maskPersonalData } from '@/lib/mask';
import { apiConfig, request } from '@/services/api/client';
import { humanMessage, isApiError } from '@/services/api/errors';
import { colors } from '@/theme/tokens';

type StepStatus = 'idle' | 'running' | 'ok' | 'fail';
interface Step {
  key: string;
  title: string;
  status: StepStatus;
  detail?: string;
  sample?: unknown;
}

const INITIAL: Step[] = [
  { key: 'health', title: '1. GET /health (sin auth)', status: 'idle' },
  { key: 'login', title: '2. Sesión (login de prueba o token actual)', status: 'idle' },
  { key: 'me', title: '3. GET /auth/me con Bearer', status: 'idle' },
  { key: 'capabilities', title: '4. GET /capabilities con Bearer', status: 'idle' },
  { key: 'org', title: '5. GET /org/profile', status: 'idle' },
  { key: 'families', title: '6. GET /org/families?per_page=1 (data + meta)', status: 'idle' },
  { key: 'notif', title: '7. GET /notifications?per_page=1 (paginación anidada)', status: 'idle' },
];

const icons = { idle: CircleDashed, running: Loader, ok: CheckCircle2, fail: XCircle };
const iconColor = { idle: colors.mutedForeground, running: colors.info, ok: colors.success, fail: colors.destructive };

/** Replica el checklist de verificación de llms.txt adaptado a auth Bearer (Sanctum). */
export default function DiagnosticoScreen() {
  const [steps, setSteps] = useState<Step[]>(INITIAL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [running, setRunning] = useState(false);

  const set = (key: string, patch: Partial<Step>) =>
    setSteps((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  async function run() {
    setRunning(true);
    setSteps(INITIAL);
    const previousToken = apiConfig.getToken();
    let token = previousToken;
    const step = async (key: string, fn: () => Promise<{ detail: string; sample?: unknown }>) => {
      set(key, { status: 'running' });
      try {
        const r = await fn();
        set(key, { status: 'ok', ...r });
        return true;
      } catch (e) {
        const detail = isApiError(e)
          ? `${e.status ?? ''} ${e.kind} — ${e.serverMessage ?? humanMessage(e)}`
          : String(e);
        set(key, { status: 'fail', detail });
        return false;
      }
    };

    try {
      await step('health', async () => {
        const r = await request<unknown>('GET', '/health', { auth: false });
        return { detail: 'La API responde', sample: r.data };
      });
      const logged = await step('login', async () => {
        if (email && password) {
          const r = await request<unknown>('POST', '/auth/login', { body: { email, password }, auth: false });
          token = extractToken(r.data);
          if (!token) throw new Error('La respuesta no trajo token');
          apiConfig.setToken(token);
          return { detail: 'Login OK (token de prueba, no se guarda)', sample: maskPersonalData(r.data) };
        }
        if (!token) throw new Error('No hay sesión: completá email y contraseña de prueba');
        return { detail: 'Usando el token de la sesión actual' };
      });
      if (logged) {
        await step('me', async () => {
          const r = await request<unknown>('GET', '/auth/me');
          return { detail: 'Usuario, roles, permisos y tenant', sample: maskPersonalData(r.data) };
        });
        await step('capabilities', async () => {
          const r = await request<unknown>('GET', '/capabilities');
          return { detail: 'Módulos y acciones habilitados', sample: maskPersonalData(r.data) };
        });
        await step('org', async () => {
          const r = await request<{ organization?: { id?: string; name?: string } }>('GET', '/org/profile');
          if (!r.data.organization?.id) throw new Error('La respuesta no trae organization.id');
          return { detail: `Organización: ${r.data.organization.name ?? '?'}`, sample: maskPersonalData(r.data) };
        });
        await step('families', async () => {
          const r = await request<unknown[]>('GET', '/org/families', { query: { per_page: 1 } });
          if (!r.meta) throw new Error('La respuesta no trae meta');
          return { detail: `data: ${Array.isArray(r.data) ? r.data.length : '?'} ítems · meta.total: ${r.meta.total}`, sample: maskPersonalData(r) };
        });
        await step('notif', async () => {
          const r = await request<{ data?: unknown[]; meta?: { total?: number } }>('GET', '/notifications', { query: { per_page: 1 } });
          if (!Array.isArray(r.data.data)) throw new Error('Se esperaba { data: { data: [...], meta } }');
          return { detail: `avisos: ${r.data.meta?.total ?? '?'}`, sample: maskPersonalData(r.data) };
        });
      }
    } finally {
      apiConfig.setToken(previousToken);
      setRunning(false);
    }
  }

  return (
    <Screen header={<Header title="Diagnóstico de la API" subtitle={env.useMocks ? 'MODO MOCKS' : env.apiUrl} back backFallback="/mas" />}>
      <Card className="gap-3">
        <Text variant="caption">
          Opcional: credenciales de prueba (no se guardan). Si las dejás vacías se usa la sesión actual.
        </Text>
        <Input label="Email de prueba" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Contraseña de prueba" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="Correr verificación" icon={Play} onPress={run} loading={running} />
      </Card>
      {steps.map((s) => {
        const Icon = icons[s.status];
        return (
          <Card key={s.key} className="gap-2">
            <View className="flex-row items-center gap-2">
              <Icon size={20} color={iconColor[s.status]} />
              <Text variant="label" className="flex-1">
                {s.title}
              </Text>
            </View>
            {s.detail ? <Text className="text-sm">{s.detail}</Text> : null}
            {s.sample !== undefined ? (
              <ScrollView horizontal className="rounded-md bg-muted p-2">
                <Text className="font-mono text-xs">{JSON.stringify(s.sample, null, 2).slice(0, 3000)}</Text>
              </ScrollView>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
