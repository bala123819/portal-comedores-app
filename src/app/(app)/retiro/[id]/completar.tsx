import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { PackageCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';
import { Button, Card, Chip, ConfirmDialog, Header, Input, Screen, Text, TextArea } from '@/components/ui';
import { useAssignment, useCompleteAssignment, usePickers } from '@/features/asignaciones/hooks';
import { humanMessage } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';

/** Campos de `POST /org/assignments/{id}/complete`: picked_up_by_name*, picked_up_by_dni*, notes */
const schema = z.object({
  picked_up_by_name: z.string().trim().min(2, 'Escribí quién retiró').max(255),
  picked_up_by_dni: z.string().trim().min(1, 'Escribí el DNI').max(20, 'Máximo 20 caracteres'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CompletarRetiroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assignment = useAssignment(id);
  const pickers = usePickers(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const complete = useCompleteAssignment(() => {
    setConfirmOpen(false);
    router.back();
  });

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { picked_up_by_name: '', picked_up_by_dni: '', notes: '' },
  });

  const send = () => {
    const v = getValues();
    complete.mutate(
      {
        id,
        body: {
          picked_up_by_name: v.picked_up_by_name.trim(),
          picked_up_by_dni: v.picked_up_by_dni.trim(),
          notes: v.notes?.trim() || null,
        },
      },
      {
        onError: (e) => {
          if (applyFieldErrors(e, setError)) setConfirmOpen(false);
        },
      },
    );
  };

  const declared = (pickers.data ?? []).filter((p) => p.name || p.contact?.name);

  return (
    <Screen
      header={<Header title="Registrar el retiro" back backFallback="/retiros" />}
      footer={
        <Button
          title="Ya lo retiramos"
          icon={PackageCheck}
          size="lg"
          fullWidth
          onPress={handleSubmit(() => setConfirmOpen(true))}
        />
      }
    >
      {assignment.data?.merma ? (
        <Card tone="accent">
          <Text variant="label">{assignment.data.merma.title}</Text>
        </Card>
      ) : null}
      <Text tone="muted">Contanos quién retiró los alimentos. Se lo informamos al Banco.</Text>

      {declared.length ? (
        <View className="gap-2">
          <Text variant="label">Elegí de los que avisaste</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {declared.map((p) => {
              const name = p.name ?? p.contact?.name ?? '';
              const dni = p.dni ?? p.contact?.dni ?? '';
              return (
                <Chip
                  key={p.id}
                  label={name}
                  onPress={() => {
                    setValue('picked_up_by_name', name, { shouldValidate: true });
                    if (dni) setValue('picked_up_by_dni', dni, { shouldValidate: true });
                  }}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Controller
        control={control}
        name="picked_up_by_name"
        render={({ field }) => (
          <Input label="Nombre y apellido de quien retiró" value={field.value} onChangeText={field.onChange} error={errors.picked_up_by_name?.message} autoCapitalize="words" />
        )}
      />
      <Controller
        control={control}
        name="picked_up_by_dni"
        render={({ field }) => (
          <Input label="DNI" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" maxLength={20} error={errors.picked_up_by_dni?.message} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextArea
            label="Notas (opcional)"
            placeholder="Ej: faltaron 2 cajas de yogur"
            value={field.value}
            onChangeText={field.onChange}
            maxLength={500}
            error={errors.notes?.message}
          />
        )}
      />

      {complete.isError && !(complete.error as { fieldErrors?: unknown }).fieldErrors ? (
        <View className="rounded-lg bg-destructive/10 px-3 py-2" accessibilityRole="alert">
          <Text className="text-destructive">{humanMessage(complete.error)}</Text>
          <Text variant="caption">Podés reintentar: no se va a registrar dos veces.</Text>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmOpen}
        title="¿Confirmás que ya retiraron los alimentos?"
        message="Se registra la entrega y el retiro queda cerrado. No se puede deshacer."
        confirmLabel="Sí, ya lo retiramos"
        loading={complete.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={send}
      />
    </Screen>
  );
}
