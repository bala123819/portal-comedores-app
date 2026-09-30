import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { BellRing, KeyRound, LogOut, Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, View } from 'react-native';
import { z } from 'zod';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Header,
  Input,
  ListItem,
  Screen,
  SectionHeader,
  Text,
  toast,
} from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { displayName, roleNames } from '@/features/auth/types';
import { humanize } from '@/lib/labels';
import { authApi } from '@/services/api/endpoints';
import { humanMessage } from '@/services/api/errors';
import { useAction, applyFieldErrors } from '@/services/api/use-action';
import { disablePush, enablePush, getPushStatus, type PushStatus } from '@/services/push';
import type { ProfileBody } from '@/services/api/endpoints/auth';

/** Campos de `PUT /auth/profile` */
const schema = z.object({
  first_name: z.string().trim().min(2, 'Mínimo 2 letras').max(100),
  last_name: z.string().trim().min(2, 'Mínimo 2 letras').max(100),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[\d\s+\-()]{6,20}$/.test(v), 'Solo números, espacios, +, - y paréntesis (6 a 20)')
    .optional(),
});
type FormValues = z.infer<typeof schema>;

const pushText: Record<PushStatus, string> = {
  unsupported: 'Este dispositivo todavía no puede recibir avisos del Banco.',
  unconfigured: 'Los avisos todavía no están disponibles.',
  denied: 'Bloqueaste los avisos. Habilitalos desde la configuración del navegador.',
  subscribed: 'Vas a recibir avisos en este dispositivo.',
  available: 'Activá los avisos para enterarte de alimentos nuevos.',
};

export default function PerfilScreen() {
  const me = useSession((s) => s.me);
  const reloadMe = useSession((s) => s.reloadMe);
  const signOut = useSession((s) => s.signOut);
  const [confirmOut, setConfirmOut] = useState(false);
  const [push, setPush] = useState<PushStatus | null>(null);

  useEffect(() => {
    void getPushStatus().then(setPush);
  }, []);

  const update = useAction((body: ProfileBody, key) => authApi.updateProfile(body, key), {
    successMessage: 'Guardamos tus datos',
    onSuccess: () => void reloadMe(),
    errorToast: false,
  });

  const { control, handleSubmit, setError, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: me?.first_name ?? '', last_name: me?.last_name ?? '', phone: me?.phone ?? '' },
  });

  const save = handleSubmit((v) =>
    update.mutate(
      { first_name: v.first_name, last_name: v.last_name, phone: v.phone || null },
      { onError: (e) => applyFieldErrors(e, setError) },
    ),
  );

  const roles = roleNames(me);

  return (
    <Screen header={<Header title="Mi perfil" back backFallback="/mas" />}>
      <View className="items-center gap-2">
        <Avatar name={displayName(me) || 'Usuario'} uri={me?.avatar_url} size="lg" />
        <Text variant="heading">{displayName(me)}</Text>
        <Text tone="muted">{me?.email}</Text>
        {roles.length ? <Text variant="caption">{roles.map(humanize).join(' · ')}</Text> : null}
      </View>

      <SectionHeader title="Tus datos" />
      <Card className="gap-3">
        <Controller control={control} name="first_name" render={({ field }) => <Input label="Nombre" value={field.value} onChangeText={field.onChange} error={errors.first_name?.message} />} />
        <Controller control={control} name="last_name" render={({ field }) => <Input label="Apellido" value={field.value} onChangeText={field.onChange} error={errors.last_name?.message} />} />
        <Controller control={control} name="phone" render={({ field }) => <Input label="Teléfono" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" error={errors.phone?.message} />} />
        {update.isError && !(update.error as { fieldErrors?: unknown }).fieldErrors ? <Text tone="destructive">{humanMessage(update.error)}</Text> : null}
        <Button title="Guardar cambios" icon={Save} onPress={save} loading={update.isPending} disabled={!isDirty} />
      </Card>

      <SectionHeader title="Seguridad" />
      <ListItem icon={KeyRound} title="Cambiar contraseña" onPress={() => router.push('/perfil/contrasena')} />

      {push ? (
        <>
          <SectionHeader title="Avisos" />
          <Card className="gap-2">
            <Text>{pushText[push]}</Text>
            {Platform.OS === 'web' && (push === 'available' || push === 'subscribed') ? (
              <Button
                title={push === 'subscribed' ? 'Desactivar avisos' : 'Activar avisos'}
                icon={BellRing}
                variant={push === 'subscribed' ? 'outline' : 'secondary'}
                size="sm"
                className="self-start"
                onPress={async () => {
                  try {
                    if (push === 'subscribed') {
                      await disablePush();
                      setPush('available');
                    } else setPush(await enablePush());
                  } catch (e) {
                    toast.error(humanMessage(e));
                  }
                }}
              />
            ) : null}
          </Card>
        </>
      ) : null}

      <Button title="Cerrar sesión" icon={LogOut} variant="ghost" onPress={() => setConfirmOut(true)} />
      <ConfirmDialog
        visible={confirmOut}
        title="¿Cerrar sesión?"
        confirmLabel="Cerrar sesión"
        destructive
        onCancel={() => setConfirmOut(false)}
        onConfirm={() => void signOut()}
      />
    </Screen>
  );
}
