import { Controller, useWatch, type Control, type FieldValues } from 'react-hook-form';
import { View } from 'react-native';
import { Chip, Input, Select, Text, TextArea } from '@/components/ui';
import { CONDITIONS, fieldConfig, fieldLabel, options } from '@/features/familias/form';
import type { FamilyFormConfig } from '@/features/familias/types';
import { educationLabels, employmentLabels, genderLabels, relationshipLabels } from '@/lib/labels';
import { DniHint } from './DniHint';

interface Props {
  /** Control de un formulario que tiene los campos de `MemberValues` bajo `prefix` */
  control: Control<FieldValues>;
  /** `''` para el formulario de una persona, `members.0.` para el alta de familia */
  prefix?: string;
  cfg?: FamilyFormConfig;
  /** Al editar: el DNI propio no cuenta como repetido */
  excludeMemberId?: string;
  /** Contacto, descripción de discapacidad, otras condiciones y notas (formulario de una persona) */
  extended?: boolean;
}

/** Campos de un miembro, compartidos por el alta de familia y el alta o edición de una persona. */
export function MemberFields({ control, prefix = '', cfg, excludeMemberId, extended }: Props) {
  const n = (field: string) => `${prefix}${field}`;
  const opts = cfg?.options;
  const employment = fieldConfig(cfg, 'employment_level');
  const education = fieldConfig(cfg, 'education_level');
  const dni = useWatch({ control, name: n('document_number') }) as string | undefined;
  const hasDisability = useWatch({ control, name: n('has_disability') }) as boolean | undefined;

  return (
    <>
      <Controller
        control={control}
        name={n('first_name')}
        render={({ field, fieldState }) => (
          <Input label="Nombre" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name={n('last_name')}
        render={({ field, fieldState }) => (
          <Input label="Apellido" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name={n('document_number')}
        render={({ field, fieldState }) => (
          <Input label="DNI (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" maxLength={30} error={fieldState.error?.message} />
        )}
      />
      <DniHint dni={dni} excludeMemberId={excludeMemberId} />
      <Controller
        control={control}
        name={n('birth_date')}
        render={({ field, fieldState }) => (
          <Input
            label="Fecha de nacimiento (opcional)"
            placeholder="dd/mm/aaaa"
            hint="Con la fecha, el banco calcula la edad y el cupo."
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name={n('relationship')}
        render={({ field, fieldState }) => (
          <Select label="Parentesco" value={field.value} onChange={field.onChange} options={options(opts?.relationships, relationshipLabels)} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name={n('gender')}
        render={({ field, fieldState }) => (
          <Select label="Género" value={field.value} onChange={field.onChange} options={options(opts?.genders, genderLabels)} error={fieldState.error?.message} />
        )}
      />
      {employment.enabled ? (
        <Controller
          control={control}
          name={n('employment_level')}
          render={({ field, fieldState }) => (
            <Select label={fieldLabel('Situación laboral', employment)} value={field.value} onChange={field.onChange} options={options(opts?.employment_levels, employmentLabels)} error={fieldState.error?.message} />
          )}
        />
      ) : null}
      {education.enabled ? (
        <Controller
          control={control}
          name={n('education_level')}
          render={({ field, fieldState }) => (
            <Select label={fieldLabel('Nivel educativo', education)} value={field.value} onChange={field.onChange} options={options(opts?.education_levels, educationLabels)} error={fieldState.error?.message} />
          )}
        />
      ) : null}

      <Text variant="label">Situaciones de salud</Text>
      <View className="flex-row flex-wrap gap-2">
        {CONDITIONS.map(([key, text]) => (
          <Controller
            key={key}
            control={control}
            name={n(key)}
            render={({ field }) => <Chip label={text} selected={!!field.value} onPress={() => field.onChange(!field.value)} />}
          />
        ))}
      </View>
      {extended && hasDisability ? (
        <Controller
          control={control}
          name={n('disability_description')}
          render={({ field, fieldState }) => (
            <Input label="¿Qué discapacidad? (opcional)" value={field.value} onChangeText={field.onChange} maxLength={500} error={fieldState.error?.message} />
          )}
        />
      ) : null}

      {extended ? (
        <>
          <Controller
            control={control}
            name={n('other_conditions')}
            render={({ field, fieldState }) => (
              <Input label="Otras condiciones (opcional)" placeholder="Ej: hipertensión, alergia al maní" value={field.value} onChangeText={field.onChange} maxLength={500} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name={n('phone')}
            render={({ field, fieldState }) => (
              <Input label="Teléfono (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name={n('email')}
            render={({ field, fieldState }) => (
              <Input label="Email (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="email-address" autoCapitalize="none" error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name={n('notes')}
            render={({ field, fieldState }) => (
              <TextArea label="Notas (opcional)" value={field.value} onChangeText={field.onChange} maxLength={2000} error={fieldState.error?.message} />
            )}
          />
        </>
      ) : null}
    </>
  );
}
