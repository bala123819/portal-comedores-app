import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Header, Input, Screen, Text } from '@/components/ui';
import { authApi } from '@/services/api/endpoints';
import type { PasswordBody } from '@/services/api/endpoints/auth';
import { humanMessage } from '@/services/api/errors';
import { applyFieldErrors, useAction } from '@/services/api/use-action';

/** Campos de `PUT /auth/password`: current_password*, new_password* (mín. 8) */
const schema = z
  .object({
    current_password: z.string().min(1, 'Escribí tu contraseña actual'),
    new_password: z.string().min(8, 'Tiene que tener al menos 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' });
type FormValues = z.infer<typeof schema>;

export default function ContrasenaScreen() {
  const change = useAction((body: PasswordBody, key) => authApi.changePassword(body, key), {
    successMessage: 'Cambiaste tu contraseña',
    onSuccess: () => router.back(),
    errorToast: false,
  });
  const { control, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  });
  const submit = handleSubmit((v) =>
    change.mutate(
      { current_password: v.current_password, new_password: v.new_password, new_password_confirmation: v.confirm },
      { onError: (e) => applyFieldErrors(e, setError) },
    ),
  );

  return (
    <Screen
      header={<Header title="Cambiar contraseña" back backFallback="/perfil" />}
      footer={<Button title="Cambiar contraseña" icon={KeyRound} size="lg" fullWidth loading={change.isPending} onPress={submit} />}
    >
      <Controller control={control} name="current_password" render={({ field }) => <Input label="Contraseña actual" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.current_password?.message} autoComplete="current-password" />} />
      <Controller control={control} name="new_password" render={({ field }) => <Input label="Contraseña nueva" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.new_password?.message} hint="Al menos 8 caracteres" autoComplete="new-password" />} />
      <Controller control={control} name="confirm" render={({ field }) => <Input label="Repetí la contraseña nueva" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.confirm?.message} autoComplete="new-password" />} />
      {change.isError && !(change.error as { fieldErrors?: unknown }).fieldErrors ? <Text tone="destructive">{humanMessage(change.error)}</Text> : null}
    </Screen>
  );
}
