import { Controller, type Control, type FieldValues } from 'react-hook-form';
import { Input, Select, TextArea } from '@/components/ui';
import { fieldConfig, fieldLabel, options } from '@/features/familias/form';
import type { FamilyFormConfig, FamilyType } from '@/features/familias/types';
import { housingLabels } from '@/lib/labels';

interface Props {
  /** Control de un formulario con los campos de `FamilyValues` */
  control: Control<FieldValues>;
  cfg?: FamilyFormConfig;
  types?: FamilyType[];
  typesLoading?: boolean;
}

/** Datos de la familia, compartidos por el alta y la edición. */
export function FamilyFields({ control, cfg, types, typesLoading }: Props) {
  const housing = fieldConfig(cfg, 'housing_situation');
  const email = fieldConfig(cfg, 'email');

  return (
    <>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input label="Nombre de la familia" placeholder="Ej: Familia Rodríguez" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="family_type_id"
        render={({ field, fieldState }) => (
          <Select
            label="Tipo de familia"
            value={field.value}
            onChange={field.onChange}
            options={(types ?? []).map((t) => ({ value: t.id, label: t.name, description: t.description ?? undefined }))}
            placeholder={typesLoading ? 'Cargando…' : 'Elegí una opción'}
            error={fieldState.error?.message}
          />
        )}
      />
      {housing.enabled ? (
        <Controller
          control={control}
          name="housing_situation"
          render={({ field, fieldState }) => (
            <Select label={fieldLabel('Vivienda', housing)} value={field.value} onChange={field.onChange} options={options(cfg?.options.housing_situations, housingLabels)} error={fieldState.error?.message} />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <Input label="Teléfono (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" error={fieldState.error?.message} />
        )}
      />
      {email.enabled ? (
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input label={fieldLabel('Email', email)} value={field.value} onChangeText={field.onChange} keyboardType="email-address" autoCapitalize="none" error={fieldState.error?.message} />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="special_needs_notes"
        render={({ field, fieldState }) => (
          <TextArea label="Necesidades especiales (opcional)" placeholder="Ej: no tienen heladera, viven lejos" value={field.value} onChangeText={field.onChange} maxLength={2000} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextArea label="Notas (opcional)" value={field.value} onChangeText={field.onChange} maxLength={2000} error={fieldState.error?.message} />
        )}
      />
    </>
  );
}
