import { router } from 'expo-router';
import {
  Bell,
  Building2,
  CalendarDays,
  FileText,
  HeartHandshake,
  LifeBuoy,
  LogOut,
  Salad,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Card, ConfirmDialog, Header, ListItem, Screen, SectionHeader, Text } from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { displayName } from '@/features/auth/types';
import { env } from '@/lib/env';
import { colors } from '@/theme/tokens';

export default function MasScreen() {
  const me = useSession((s) => s.me);
  const org = useSession((s) => s.organization);
  const signOut = useSession((s) => s.signOut);
  const [confirmOut, setConfirmOut] = useState(false);
  const [leaving, setLeaving] = useState(false);

  return (
    <Screen header={<Header title="Más" />}>
      <Card onPress={() => router.push('/perfil')} className="flex-row items-center gap-3">
        <Avatar name={displayName(me) || 'Usuario'} uri={me?.avatar_url} />
        <View className="flex-1">
          <Text variant="label">{displayName(me)}</Text>
          <Text variant="caption">{org?.name ?? me?.email}</Text>
        </View>
      </Card>

      <SectionHeader title="Mi organización" />
      <View className="gap-2">
        <ListItem icon={Building2} title="Datos de la organización" subtitle="Dirección y contactos que retiran" onPress={() => router.push('/organizacion')} />
        <ListItem icon={Users} title="Familias" subtitle="Personas que asiste la organización" onPress={() => router.push('/familias')} />
        <ListItem icon={CalendarDays} title="Jornadas y talleres" subtitle="Recolecciones y capacitaciones" onPress={() => router.push('/jornadas')} />
        <ListItem icon={FileText} title="Documentación" subtitle="Papeles y ficha social" onPress={() => router.push('/documentacion')} />
      </View>

      <SectionHeader title="Alimentación" />
      <View className="gap-2">
        <ListItem icon={Salad} title="Nutrición" subtitle="Qué aporta lo que reciben" onPress={() => router.push('/nutricion')} />
        <ListItem icon={Sparkles} title="Asistente" subtitle="Recetas, nutrición y dudas" onPress={() => router.push('/asistente')} />
      </View>

      <SectionHeader title="Cuenta" />
      <View className="gap-2">
        <ListItem icon={Bell} title="Notificaciones" onPress={() => router.push('/notificaciones')} />
        <ListItem icon={UserRound} title="Mi perfil" subtitle="Datos y contraseña" onPress={() => router.push('/perfil')} />
        <ListItem icon={LifeBuoy} title="Ayuda y contacto" onPress={() => router.push('/ayuda')} />
        <ListItem icon={LogOut} iconTone="destructive" title="Cerrar sesión" onPress={() => setConfirmOut(true)} chevron={false} />
      </View>

      {__DEV__ ? (
        <>
          <SectionHeader title="Desarrollo" />
          <View className="gap-2">
            <ListItem icon={Stethoscope} title="Diagnóstico de la API" onPress={() => router.push('/dev/diagnostico')} />
            <ListItem icon={Wrench} title="Componentes (UI)" onPress={() => router.push('/dev/ui')} />
          </View>
        </>
      ) : null}

      <View className="items-center gap-1 pt-4">
        <HeartHandshake size={20} color={colors.mutedForeground} />
        <Text variant="caption">Portal Comedores · Banco de Alimentos</Text>
        {env.useMocks ? <Text variant="caption">Modo de prueba (datos simulados)</Text> : null}
      </View>

      <ConfirmDialog
        visible={confirmOut}
        title="¿Cerrar sesión?"
        message="Vas a tener que volver a ingresar con tu email y contraseña."
        confirmLabel="Cerrar sesión"
        destructive
        loading={leaving}
        onCancel={() => setConfirmOut(false)}
        onConfirm={async () => {
          setLeaving(true);
          await signOut();
        }}
      />
    </Screen>
  );
}
