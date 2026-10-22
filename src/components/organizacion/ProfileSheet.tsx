import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { BottomSheet, Button, Chip, Input, SegmentedControl, SwitchRow, Text, TextArea, toast } from '@/components/ui';
import { maskTime, profileBody, profileDefaults, profileFieldMap, profileSchema, type ProfileValues } from '@/features/org/form';
import { useUpdateProfile } from '@/features/org/hooks';
import { PICKUP_DAYS, type Organization } from '@/features/org/types';
import { label, pickupDayLabels, pickupPreferenceLabels } from '@/lib/labels';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';

/**
 * Edición de `PUT /org/profile` (post 3/14): sólo lo que la organización puede cambiar.
 * Nombre, CUIT, tipo, vehículo propio y cuota los maneja el Banco (422 `FIELD_NOT_EDITABLE`).
 */
export function ProfileSheet({ org, onClose }: { org: Organization; onClose: () => void }) {
  const initial = useMemo(() => profileDefaults(org), [org]);
  const update = useUpdateProfile(onClose);
  const { control, handleSubmit, setError, formState: { errors } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });

  const save = handleSubmit((v) => {
    const body = profileBody(v, initial);
    if (!Object.keys(body).length) {
      onClose();
      return;
    }
    update.mutate(body, {
      onError: (e) => {
        if (applyFieldErrors(e, setError, profileFieldMap)) return;
        if (!(isApiError(e) && e.kind === 'unauthorized')) toast.error(humanMessage(e));
      },
    });
  });

  const text = (name: 'phone' | 'email', labelText: string, keyboardType: 'phone-pad' | 'email-address') => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          label={labelText}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          keyboardType={keyboardType}
          autoCapitalize="none"
          error={errors[name]?.message}
        />
      )}
    />
  );
  const time = (name: 'preferred_pickup_time_start' | 'preferred_pickup_time_end', labelText: string) => (
    <View className="flex-1">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            label={labelText}
            placeholder="09:00"
            value={field.value}
            onChangeText={(t) => field.onChange(maskTime(t))}
            keyboardType="number-pad"
            maxLength={5}
            error={errors[name]?.message}
          />
        )}
      />
    </View>
  );

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title="Datos de la organización"
      footer={<Button title="Guardar cambios" onPress={save} loading={update.isPending} fullWidth />}
    >
      <Text variant="label">Contacto</Text>
      {text('phone', 'Teléfono', 'phone-pad')}
      {text('email', 'Email', 'email-address')}
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextArea
            label="Qué hacen"
            placeholder="Ej: almuerzo de lunes a viernes para 40 chicos"
            value={field.value}
            onChangeText={field.onChange}
            maxLength={1000}
            error={errors.description?.message}
          />
        )}
      />

      <Text variant="label">Retiro de alimentos</Text>
      <Controller
        control={control}
        name="pickup_preference"
        render={({ field }) => (
          <SegmentedControl
            value={field.value}
            onChange={field.onChange}
            options={(['pickup', 'delivery'] as const).map((v) => ({ value: v, label: label(pickupPreferenceLabels, v) }))}
          />
        )}
      />
      <Controller
        control={control}
        name="preferred_pickup_days"
        render={({ field }) => (
          <View className="gap-1.5">
            <Text variant="caption">Días que prefieren</Text>
            <View className="flex-row flex-wrap gap-2">
              {PICKUP_DAYS.map((d) => {
                const selected = field.value.includes(d);
                return (
                  <Chip
                    key={d}
                    label={label(pickupDayLabels, d)}
                    selected={selected}
                    onPress={() => field.onChange(selected ? field.value.filter((x) => x !== d) : [...field.value, d])}
                  />
                );
              })}
            </View>
            {errors.preferred_pickup_days ? (
              <Text variant="caption" tone="destructive">
                {errors.preferred_pickup_days.message ?? errors.preferred_pickup_days.root?.message}
              </Text>
            ) : null}
          </View>
        )}
      />
      <View className="flex-row gap-3">
        {time('preferred_pickup_time_start', 'Desde')}
        {time('preferred_pickup_time_end', 'Hasta')}
      </View>
      <Controller
        control={control}
        name="has_refrigeration"
        render={({ field }) => <SwitchRow label="Tienen heladera o freezer" value={field.value} onChange={field.onChange} />}
      />
      <Controller
        control={control}
        name="vehicle_capacity_kg"
        render={({ field }) => (
          <Input
            label="Capacidad del vehículo (kg)"
            placeholder="Ej: 300"
            value={field.value}
            onChangeText={(t) => field.onChange(t.replace(/[^\d.,]/g, ''))}
            keyboardType="decimal-pad"
            hint="Cuántos kilos pueden llevar en cada retiro"
            error={errors.vehicle_capacity_kg?.message}
          />
        )}
      />
      <Text variant="caption">Nombre, CUIT, tipo de organización y si tienen vehículo propio los cambia el Banco.</Text>
    </BottomSheet>
  );
}
