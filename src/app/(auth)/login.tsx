import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, LogIn, Mail, Sprout } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { env } from '@/lib/env';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';
import { colors } from '@/theme/tokens';

const schema = z.object({
  email: z.string().trim().min(1, 'Escribí tu email').email('Ese email no parece válido'),
  password: z.string().min(1, 'Escribí tu contraseña'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const signIn = useSession((s) => s.signIn);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      // Clave incorrecta: el servidor responde 422 con el mensaje en `errors.email` (docs/bda 2/6).
      const credentials =
        isApiError(e) &&
        (e.kind === 'unauthorized' ||
          (e.kind === 'validation' && /credencial/i.test(e.fieldErrors?.email?.[0] ?? '')));
      if (credentials) {
        setFormError('El email o la contraseña no son correctos.');
      } else if (!applyFieldErrors(e, setError)) {
        setFormError(humanMessage(e));
      }
    }
  });

  return (
    <Screen contentClassName="flex-grow justify-center gap-6 py-10">
      <View className="items-center gap-3">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
          <Sprout size={40} color={colors.primary} />
        </View>
        <Text variant="display" className="text-center">
          Portal Comedores
        </Text>
        <Text tone="muted" className="text-center">
          Banco de Alimentos · Ingresá con el usuario de tu organización
        </Text>
      </View>

      <Card className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              label="Email"
              icon={Mail}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              placeholder="tu@email.com"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              label="Contraseña"
              icon={Lock}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />
        {formError ? (
          <View className="rounded-lg bg-destructive/10 px-3 py-2" accessibilityRole="alert">
            <Text className="text-destructive">{formError}</Text>
          </View>
        ) : null}
        <Button title="Ingresar" icon={LogIn} size="lg" onPress={onSubmit} loading={isSubmitting} fullWidth />
      </Card>

      <View className="gap-3">
        <Text variant="caption" className="text-center">
          ¿Olvidaste tu contraseña? Pedile al Banco de Alimentos que te la restablezca.
        </Text>
        <WhatsAppButton context={{ kind: 'general' }} title="Pedir ayuda por WhatsApp" variant="secondary" />
        {env.useMocks ? (
          <Card tone="info">
            <Text className="text-sm">
              Modo de prueba: los datos son simulados. Ingresá con cualquier email y contraseña.
            </Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
