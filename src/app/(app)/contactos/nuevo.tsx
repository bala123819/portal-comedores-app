import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { ContactFields } from '@/components/contactos/ContactFields';
import { Button, Card, Header, Screen, Text } from '@/components/ui';
import {
  contactBody,
  contactSchema,
  emptyContact,
  type ContactValues,
} from '@/features/contactos/form';
import { useCreateContact } from '@/features/contactos/hooks';
import { contactErrorMessage } from '@/features/contactos/types';
import { goBack } from '@/lib/navigation';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';

/** `POST /org/contacts`. El DNI no se repite en la organización (422 en `dni`). */
export default function NuevoContactoScreen() {
  const create = useCreateContact(() => goBack('/contactos'));
  const { control, handleSubmit, setError } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: emptyContact(),
  });

  const onSubmit = handleSubmit((v) => {
    const body = contactBody(v);
    // En el alta no se manda `is_primary: false` (es el valor por defecto)
    create.mutate(body.is_primary ? body : { ...body, is_primary: undefined }, {
      onError: (e) => applyFieldErrors(e, setError),
    });
  });

  const showError =
    create.isError &&
    !(
      isApiError(create.error) &&
      (create.error.fieldErrors || create.error.kind === 'unauthorized')
    );

  return (
    <Screen
      header={<Header title="Agregar contacto" back backFallback="/contactos" />}
      footer={
        <Button
          title="Guardar contacto"
          icon={Save}
          size="lg"
          fullWidth
          loading={create.isPending}
          onPress={onSubmit}
        />
      }
    >
      <Card className="gap-4">
        <ContactFields control={control} />
      </Card>
      {showError ? (
        <Card tone="destructive">
          <Text>{contactErrorMessage(create.error) ?? humanMessage(create.error)}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
