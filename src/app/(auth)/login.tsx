import { zodResolver } from '@hookform/resolvers/zod';
import {
  CircleAlert,
  Lock,
  LogIn,
  Mail,
  Salad,
  ShoppingCart,
  Sprout,
  Users,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { Button, Card, Input, OfflineBanner, Text } from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { env } from '@/lib/env';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';
import { colors, layout, shadows } from '@/theme/tokens';

const schema = z.object({
  email: z.string().trim().min(1, 'Escribí tu email').email('Ese email no parece válido'),
  password: z.string().min(1, 'Escribí tu contraseña'),
});
type FormValues = z.infer<typeof schema>;

/**
 * Login. En pantallas anchas: panel de marca a la izquierda y formulario a la derecha.
 * En el celular: encabezado verde con el logo y el formulario en una tarjeta superpuesta.
 */
export default function LoginScreen() {
  const signIn = useSession((s) => s.signIn);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  const wide = width >= layout.twoColumnsFrom;

  const form = (
    <View className="gap-4">
      <View className="gap-1">
        <Text variant="title">Ingresá a tu cuenta</Text>
        <Text tone="muted">Usá el usuario de tu organización.</Text>
      </View>
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
        <View
          className="flex-row items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5"
          accessibilityRole="alert"
        >
          <CircleAlert size={18} color={colors.destructive} />
          <Text className="flex-1 text-destructive">{formError}</Text>
        </View>
      ) : null}
      <Button
        title="Ingresar"
        icon={LogIn}
        size="lg"
        onPress={onSubmit}
        loading={isSubmitting}
        fullWidth
        className="mt-1"
      />
    </View>
  );

  const help = (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text variant="caption">¿Necesitás ayuda?</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      <Text variant="caption" className="text-center">
        ¿Olvidaste tu contraseña? Pedile al Banco de Alimentos que te la restablezca.
      </Text>
      <WhatsAppButton
        context={{ kind: 'general' }}
        title="Pedir ayuda por WhatsApp"
        variant="secondary"
      />
      {env.useMocks ? (
        <Card tone="info">
          <Text className="text-sm">
            Modo de prueba: los datos son simulados. Ingresá con cualquier email y contraseña.
          </Text>
        </Card>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <OfflineBanner />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {wide ? (
          <View className="flex-1 flex-row">
            <BrandPanel />
            <ScrollView
              className="flex-1"
              contentContainerClassName="flex-grow items-center justify-center px-12 py-10"
              keyboardShouldPersistTaps="handled"
            >
              <View className="w-full max-w-md gap-8">
                {form}
                {help}
              </View>
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow pb-10"
            keyboardShouldPersistTaps="handled"
          >
            <View
              className="items-center gap-3 rounded-b-3xl bg-primary px-6 pb-16"
              style={{ paddingTop: insets.top + 40 }}
            >
              <Logo />
              <Text variant="display" className="text-center text-primary-foreground">
                Portal Comedores
              </Text>
              <Text className="text-center text-primary-foreground/85">Banco de Alimentos</Text>
            </View>
            <View className="-mt-10 w-full max-w-lg gap-6 self-center px-4">
              <Card className="p-5">{form}</Card>
              {help}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function Logo() {
  return (
    <View
      className="h-20 w-20 items-center justify-center rounded-3xl bg-card"
      style={shadows.lg}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Sprout size={40} color={colors.primary} />
    </View>
  );
}

const highlights = [
  { icon: ShoppingCart, title: 'Pedidos de mercadería', text: 'Catálogo del Banco y cupo del mes.' },
  { icon: Users, title: 'Familias asistidas', text: 'Quiénes asisten y cuántas personas son.' },
  { icon: Salad, title: 'Alimentación y recetas', text: 'Ideas para cocinar con lo que tenés.' },
];

/** Panel izquierdo del login en pantallas anchas: identidad y para qué sirve la app. */
function BrandPanel() {
  return (
    <View className="flex-1 justify-between bg-primary p-12">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-card">
          <Sprout size={24} color={colors.primary} />
        </View>
        <Text variant="heading" className="text-primary-foreground">
          Portal Comedores
        </Text>
      </View>

      <View className="max-w-lg gap-8">
        <View className="gap-3">
          <Text
            className="text-4xl font-bold leading-[48px] tracking-tight text-primary-foreground"
            accessibilityRole="header"
          >
            Todo lo de tu comedor, en un solo lugar.
          </Text>
          <Text className="text-lg text-primary-foreground/85">
            La herramienta del Banco de Alimentos para las organizaciones sociales.
          </Text>
        </View>
        <View className="gap-4">
          {highlights.map(({ icon: Icon, title, text }) => (
            <View key={title} className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Icon size={24} color={colors.primaryForeground} />
              </View>
              <View className="flex-1">
                <Text variant="label" className="text-primary-foreground">
                  {title}
                </Text>
                <Text className="text-sm text-primary-foreground/80">{text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Text className="text-sm text-primary-foreground/70">Banco de Alimentos</Text>
    </View>
  );
}
