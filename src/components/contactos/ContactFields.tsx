import { Lock } from 'lucide-react-native';
import { Controller, type Control } from 'react-hook-form';
import { Input, SwitchRow } from '@/components/ui';
import type { ContactValues } from '@/features/contactos/form';

/**
 * Campos del contacto. Con `identityLocked` (el Banco la autorizó a retirar) nombre y DNI quedan
 * fijos: la API respondería 409 `CONTACT_IDENTITY_LOCKED`. Teléfono, cargo y email se pueden editar.
 *
 * Los errores se leen del `fieldState` de cada campo (no de `formState.errors` por props): `setError`
 * con el 422 del servidor muta el mismo objeto y el React Compiler no volvería a dibujar el componente.
 */
export function ContactFields({
  control,
  identityLocked = false,
}: {
  control: Control<ContactValues>;
  identityLocked?: boolean;
}) {
  const lockedHint = identityLocked ? 'Fijo: el Banco la autorizó a retirar' : undefined;
  return (
    <>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="Nombre y apellido"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            editable={!identityLocked}
            icon={identityLocked ? Lock : undefined}
            className={identityLocked ? 'opacity-60' : undefined}
            autoCapitalize="words"
            maxLength={255}
            error={fieldState.error?.message}
            hint={lockedHint}
          />
        )}
      />
      <Controller
        control={control}
        name="dni"
        render={({ field, fieldState }) => (
          <Input
            label="DNI (opcional)"
            value={field.value}
            onChangeText={(t) => field.onChange(t.replace(/\D/g, ''))}
            onBlur={field.onBlur}
            editable={!identityLocked}
            icon={identityLocked ? Lock : undefined}
            className={identityLocked ? 'opacity-60' : undefined}
            keyboardType="number-pad"
            maxLength={8}
            error={fieldState.error?.message}
            hint={lockedHint ?? 'Hace falta para que el Banco la autorice a retirar'}
          />
        )}
      />
      <Controller
        control={control}
        name="position"
        render={({ field, fieldState }) => (
          <Input
            label="Cargo (opcional)"
            placeholder="Ej.: cocinera, voluntario"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={100}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <Input
            label="Teléfono (opcional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="phone-pad"
            maxLength={50}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            label="Email (opcional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="is_primary"
        render={({ field }) => (
          <SwitchRow
            label="Contacto principal"
            description="Hay uno solo: si marcás a esta persona, deja de serlo quien lo era."
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </>
  );
}
