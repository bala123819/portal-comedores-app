import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { Button, Card, Header, Input, Screen, SwitchRow, Text, TextArea } from '@/components/ui';
import { useMerma } from '@/features/mermas/hooks';
import { mermaOrigin } from '@/features/mermas/selectors';
import { useCreateApplication } from '@/features/postulaciones/hooks';
import { formatDay, formatTimeRange } from '@/lib/format';
import { humanMessage } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';

/** Campos de `POST /org/applications` (merma_id, message, can_pickup_immediately, preferred_pickup_time, requires_transport_help) */
const schema = z.object({
  message: z.string().max(500, 'Máximo 500 caracteres').optional(),
  can_pickup_immediately: z.boolean(),
  preferred_pickup_time: z
    .string()
    .trim()
    .refine((v) => v === '' || /^([01]?\d|2[0-3]):[0-5]\d$/.test(v), 'Usá el formato hora:minutos, por ejemplo 10:30')
    .optional(),
  requires_transport_help: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function PostularScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const merma = useMerma(id);
  const create = useCreateApplication((applicationId) => {
    router.dismissAll();
    if (applicationId) router.push({ pathname: '/postulacion/[id]', params: { id: applicationId } });
    else router.push({ pathname: '/retiros', params: { tab: 'pedidos' } });
  });

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: '', can_pickup_immediately: false, preferred_pickup_time: '', requires_transport_help: false },
  });

  const onSubmit = handleSubmit((v) => {
    const padded = v.preferred_pickup_time ? v.preferred_pickup_time.padStart(5, '0') : null;
    create.mutate(
      {
        merma_id: id,
        message: v.message?.trim() || null,
        can_pickup_immediately: v.can_pickup_immediately,
        preferred_pickup_time: padded,
        requires_transport_help: v.requires_transport_help,
      },
      { onError: (e) => applyFieldErrors(e, setError) },
    );
  });

  const m = merma.data;
  const generalError =
    create.isError && !(create.error as { fieldErrors?: unknown })?.fieldErrors ? humanMessage(create.error) : null;

  return (
    <Screen
      header={<Header title="Pedir estos alimentos" back backFallback="/disponibles" />}
      footer={
        <Button title="Enviar pedido" icon={Send} size="lg" fullWidth loading={create.isPending} onPress={onSubmit} />
      }
    >
      {m ? (
        <Card tone="accent" className="gap-1">
          <Text variant="label">{m.title}</Text>
          <Text className="text-sm">{mermaOrigin(m)}</Text>
          <Text className="text-sm">
            Retiro {formatDay(m.pickup_date)} {formatTimeRange(m.pickup_time_start, m.pickup_time_end)}
          </Text>
        </Card>
      ) : null}

      <Text tone="muted">
        El Banco revisa los pedidos y te avisa si te asigna los alimentos. Contanos lo que necesiten saber.
      </Text>

      <View className="gap-3">
        <Controller
          control={control}
          name="can_pickup_immediately"
          render={({ field }) => (
            <SwitchRow label="Podemos retirar enseguida" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="requires_transport_help"
          render={({ field }) => (
            <SwitchRow
              label="Necesitamos ayuda con el transporte"
              description="No tenemos cómo trasladar los alimentos"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="preferred_pickup_time"
          render={({ field }) => (
            <Input
              label="¿A qué hora les queda mejor? (opcional)"
              placeholder="Ej: 10:30"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              error={errors.preferred_pickup_time?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <TextArea
              label="Mensaje para el Banco (opcional)"
              placeholder="Ej: tenemos freezer para conservarlo"
              value={field.value}
              onChangeText={field.onChange}
              maxLength={500}
              error={errors.message?.message}
              hint={`${field.value?.length ?? 0}/500`}
            />
          )}
        />
      </View>

      {generalError ? (
        <View className="rounded-lg bg-destructive/10 px-3 py-2" accessibilityRole="alert">
          <Text className="text-destructive">{generalError}</Text>
          <Text variant="caption">Podés volver a intentar: no se va a duplicar el pedido.</Text>
        </View>
      ) : null}
    </Screen>
  );
}
