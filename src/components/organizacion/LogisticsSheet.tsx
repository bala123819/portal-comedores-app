import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, type ComponentProps } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { BottomSheet, Button, Input, Select, SwitchRow, Text, TextArea, toast } from '@/components/ui';
import {
  COLD_TYPES,
  logisticsBody,
  logisticsDefaults,
  logisticsSchema,
  VEHICLE_TYPES,
  type LogisticsValues,
} from '@/features/org/form';
import { useUpdateLogistics } from '@/features/org/hooks';
import type { OrgLogistics } from '@/features/org/types';
import { coldCapacityTypeLabels, label, transportVehicleTypeLabels } from '@/lib/labels';
import { humanMessage, isApiError } from '@/services/api/errors';

type TextField = 'transport_notes' | 'operational_contact_name' | 'operational_contact_phone' | 'operational_contact_email';

/** Edición de `PUT /org/logistics` (post 3/14): frío, transporte y contacto operativo */
export function LogisticsSheet({ logistics, onClose }: { logistics: OrgLogistics | undefined; onClose: () => void }) {
  const initial = useMemo(() => logisticsDefaults(logistics), [logistics]);
  const update = useUpdateLogistics(onClose);
  const { control, handleSubmit, setError, formState: { errors } } = useForm<LogisticsValues>({
    resolver: zodResolver(logisticsSchema),
    defaultValues: initial,
  });
  const ownTransport = useWatch({ control, name: 'own_transport_capable' });
  const coldType = useWatch({ control, name: 'cold_capacity_type' });

  const save = handleSubmit((v) => {
    const body = logisticsBody(v, initial);
    if (!Object.keys(body).length) {
      onClose();
      return;
    }
    update.mutate(body, {
      onError: (e) => {
        // Los 422 de este endpoint llegan en inglés (G-20): se marca el campo con un mensaje propio
        if (isApiError(e) && e.fieldErrors) {
          const fields = Object.keys(e.fieldErrors).filter((f): f is keyof LogisticsValues => f in initial);
          fields.forEach((f) => setError(f, { type: 'server', message: 'Revisá este dato' }));
          if (fields.length) return;
        }
        if (!(isApiError(e) && e.kind === 'unauthorized')) toast.error(humanMessage(e));
      },
    });
  });

  const text = (name: TextField, labelText: string, opts: Partial<ComponentProps<typeof Input>> = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input label={labelText} value={field.value} onChangeText={field.onChange} error={errors[name]?.message} {...opts} />
      )}
    />
  );

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title="Capacidad logística"
      footer={<Button title="Guardar cambios" onPress={save} loading={update.isPending} fullWidth />}
    >
      <Text variant="label">Frío</Text>
      <Controller
        control={control}
        name="cold_capacity_type"
        render={({ field }) => (
          <Select
            label="Dónde guardan lo refrigerado"
            value={field.value || null}
            onChange={field.onChange}
            options={COLD_TYPES.map((v) => ({ value: v, label: label(coldCapacityTypeLabels, v) }))}
            error={errors.cold_capacity_type?.message}
          />
        )}
      />
      {coldType !== 'ninguna' ? (
        <Controller
          control={control}
          name="cold_capacity_m3"
          render={({ field }) => (
            <Input
              label="Capacidad de frío (m³)"
              placeholder="Ej: 2,5"
              value={field.value}
              onChangeText={(t) => field.onChange(t.replace(/[^\d.,]/g, ''))}
              keyboardType="decimal-pad"
              hint="Una heladera familiar tiene alrededor de 0,3 m³"
              error={errors.cold_capacity_m3?.message}
            />
          )}
        />
      ) : null}

      <Text variant="label">Transporte</Text>
      <Controller
        control={control}
        name="own_transport_capable"
        render={({ field }) => (
          <SwitchRow
            label="Pueden ir a buscar con su propio transporte"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      {ownTransport ? (
        <Controller
          control={control}
          name="transport_vehicle_type"
          render={({ field }) => (
            <Select
              label="Tipo de vehículo"
              value={field.value || null}
              onChange={field.onChange}
              options={VEHICLE_TYPES.map((v) => ({ value: v, label: label(transportVehicleTypeLabels, v) }))}
              error={errors.transport_vehicle_type?.message}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="transport_notes"
        render={({ field }) => (
          <TextArea
            label="Notas sobre el transporte (opcional)"
            placeholder="Ej: retiramos en remis"
            value={field.value}
            onChangeText={field.onChange}
            maxLength={1000}
            error={errors.transport_notes?.message}
          />
        )}
      />

      <Text variant="label">Contacto operativo</Text>
      <Text variant="caption">La persona con la que el Banco coordina los retiros y entregas.</Text>
      {text('operational_contact_name', 'Nombre y apellido')}
      {text('operational_contact_phone', 'Teléfono', { keyboardType: 'phone-pad' })}
      {text('operational_contact_email', 'Email (opcional)', { keyboardType: 'email-address', autoCapitalize: 'none' })}
    </BottomSheet>
  );
}
