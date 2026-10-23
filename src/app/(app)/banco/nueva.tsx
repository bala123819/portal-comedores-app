import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';
import { interactionTypeIcons } from '@/components/interacciones/InteractionCard';
import { Button, Card, Header, Input, Screen, SectionHeader, Text, TextArea, toast } from '@/components/ui';
import { useCreateInteraction } from '@/features/interacciones/hooks';
import {
  INTERACTION_TYPES,
  isInteractionType,
  NOTES_MAX,
  TITLE_MAX,
  type InteractionType,
} from '@/features/interacciones/types';
import { cn } from '@/lib/cn';
import { interactionTypeHints, interactionTypeLabels, label } from '@/lib/labels';
import { goBack } from '@/lib/navigation';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';
import { colors } from '@/theme/tokens';

/** Ejemplos de asunto según el tipo, para que sepan qué escribir */
const TITLE_PLACEHOLDER: Record<InteractionType, string> = {
  suceso: 'Ej.: Se cortó la luz en el comedor',
  solicitud: 'Ej.: Necesitamos leche',
  consulta: 'Ej.: ¿Cuándo es el próximo retiro?',
  reclamo: 'Ej.: La entrega llegó incompleta',
};

const NOTES_PLACEHOLDER: Record<InteractionType, string> = {
  suceso: 'Qué pasó, cuándo y cómo los afecta. Ej.: Perdimos parte de la mercadería fresca.',
  solicitud: 'Qué necesitan, cuánto y para cuándo. Ej.: Para 40 chicos, esta semana.',
  consulta: 'Contá tu duda con el mayor detalle posible.',
  reclamo: 'Qué pasó, en qué entrega o fecha, y qué esperan que se resuelva.',
};

/** Campos de `POST /org/interactions`: interaction_type*, title* (≤255), notes (≤5000) */
const schema = z.object({
  interaction_type: z.enum(INTERACTION_TYPES, { error: 'Elegí qué tipo de mensaje es' }),
  title: z.string().trim().min(3, 'Escribí un asunto corto').max(TITLE_MAX, `Hasta ${TITLE_MAX} caracteres`),
  notes: z.string().max(NOTES_MAX, `Hasta ${NOTES_MAX} caracteres`).optional(),
});
type FormValues = z.infer<typeof schema>;

function TypeOption({
  type,
  selected,
  onPress,
}: {
  type: InteractionType;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = interactionTypeIcons[type];
  const name = label(interactionTypeLabels, type);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}. ${interactionTypeHints[type]}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-xl border p-3 active:opacity-80',
        selected ? 'border-primary bg-accent' : 'border-border bg-card',
      )}
    >
      <View className={cn('h-10 w-10 items-center justify-center rounded-full', selected ? 'bg-primary' : 'bg-accent')}>
        <Icon size={20} color={selected ? colors.primaryForeground : colors.accentForeground} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="label">{name}</Text>
        <Text variant="caption">{interactionTypeHints[type]}</Text>
      </View>
      <View
        className={cn(
          'h-5 w-5 items-center justify-center rounded-full border-2',
          selected ? 'border-primary' : 'border-input',
        )}
      >
        {selected ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
      </View>
    </Pressable>
  );
}

export default function NuevaInteraccionScreen() {
  // `titulo` y `notas` llegan ya completos desde otras pantallas (p. ej. "Pedir autorización al Banco")
  const { tipo, titulo, notas } = useLocalSearchParams<{ tipo?: string; titulo?: string; notas?: string }>();
  const create = useCreateInteraction((created) => {
    if (created?.id) router.replace({ pathname: '/banco/[id]', params: { id: created.id } });
    else goBack('/banco');
  });

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      interaction_type: isInteractionType(tipo) ? tipo : undefined,
      title: titulo?.slice(0, TITLE_MAX) ?? '',
      notes: notas?.slice(0, NOTES_MAX) ?? '',
    },
  });
  const type = useWatch({ control, name: 'interaction_type' });
  const notesLength = useWatch({ control, name: 'notes' })?.length ?? 0;

  const onSubmit = handleSubmit((v) => {
    create.mutate(
      { interaction_type: v.interaction_type, title: v.title.trim(), notes: v.notes?.trim() || null },
      {
        onError: (e) => {
          // 422: el error va al campo; el resto (red, servidor) en un aviso. Reintentar no duplica.
          if (!applyFieldErrors(e, setError) && !(isApiError(e) && e.kind === 'unauthorized')) {
            toast.error(humanMessage(e));
          }
        },
      },
    );
  });

  return (
    <Screen
      header={<Header title="Mensaje al Banco" back backFallback="/banco" />}
      footer={<Button title="Enviar al Banco" icon={Send} size="lg" fullWidth loading={create.isPending} onPress={onSubmit} />}
    >
      <Text tone="muted">
        El Banco recibe un aviso con tu mensaje. Acá vas a poder ver cuándo lo atiende.
      </Text>

      <SectionHeader title="¿Qué tipo de mensaje es?" />
      <Controller
        control={control}
        name="interaction_type"
        render={({ field }) => (
          <View className="gap-2" accessibilityRole="radiogroup">
            {INTERACTION_TYPES.map((t) => (
              <TypeOption key={t} type={t} selected={field.value === t} onPress={() => field.onChange(t)} />
            ))}
            {errors.interaction_type ? (
              <Text variant="caption" tone="destructive" accessibilityLiveRegion="polite">
                {errors.interaction_type.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      <Card className="gap-4">
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <Input
              label="Asunto"
              placeholder={type ? TITLE_PLACEHOLDER[type] : 'Contalo en pocas palabras'}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              maxLength={TITLE_MAX}
              error={errors.title?.message}
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <TextArea
              label="Detalle (opcional)"
              placeholder={type ? NOTES_PLACEHOLDER[type] : 'Sumá lo que el Banco necesite saber'}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              maxLength={NOTES_MAX}
              error={errors.notes?.message}
              hint={notesLength > NOTES_MAX * 0.8 ? `${notesLength} de ${NOTES_MAX} caracteres` : undefined}
            />
          )}
        />
      </Card>

      {type === 'solicitud' ? (
        <Card tone="info" className="gap-1">
          <Text variant="label">¿Es mercadería del catálogo?</Text>
          <Text className="text-sm">
            Usá la solicitud para insumos u otras necesidades que no estén en el catálogo del Banco.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
