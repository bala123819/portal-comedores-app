import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Save, Send, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { authorizationText } from '@/components/contactos/ContactCard';
import { ContactFields } from '@/components/contactos/ContactFields';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
  toast,
} from '@/components/ui';
import { changedFields } from '@/features/familias/form';
import {
  authorizationRequest,
  contactBody,
  contactSchema,
  contactToValues,
  emptyContact,
  type ContactValues,
} from '@/features/contactos/form';
import { useContact, useDeleteContact, useUpdateContact } from '@/features/contactos/hooks';
import {
  contactErrorMessage,
  isAuthorizationActive,
  isContactError,
} from '@/features/contactos/types';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';
import { colors } from '@/theme/tokens';

/**
 * Ficha de un contacto: `PUT /org/contacts/{id}` (sólo lo que cambia) y `DELETE`.
 * Autorizar a retirar lo hace el Banco: desde acá se le pide con una interacción `solicitud`
 * que ya va completa con el nombre y el DNI (reutiliza `/banco/nueva`).
 */
export default function ContactoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useContact(id);
  const c = q.contact;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const { control, handleSubmit, setError, reset } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: c ? contactToValues(c) : emptyContact(),
  });
  useEffect(() => {
    if (c) reset(contactToValues(c));
  }, [c, reset]);

  /** Si otra persona ya lo dio de baja, se vuelve a la lista actualizada */
  const goneAway = (e: unknown) => {
    if (!isContactError(e, 'CONTACT_NOT_FOUND')) return false;
    toast.error(contactErrorMessage(e)!);
    void q.refetch();
    router.back();
    return true;
  };

  const update = useUpdateContact(id, () => setProblem(null));
  const remove = useDeleteContact(id, () => {
    setConfirmDelete(false);
    router.back();
  });

  const header = (
    <Header
      title={c?.name ?? 'Contacto'}
      subtitle={c?.position ?? undefined}
      back
      backFallback="/contactos"
    />
  );

  if (!c) {
    return (
      <Screen header={header}>
        {q.isPending ? (
          <SkeletonList count={2} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <EmptyState
            title="No encontramos a esta persona"
            message="Puede que ya la hayan dado de baja."
          />
        )}
      </Screen>
    );
  }

  const authorizations = c.authorizations ?? [];
  const hasActive = !!c.pickup_authorized && authorizations.some((a) => isAuthorizationActive(a));
  const identityLocked = !!c.pickup_authorized;

  const onSubmit = handleSubmit((v) => {
    const changes = changedFields(contactBody(contactToValues(c)), contactBody(v));
    if (!Object.keys(changes).length) {
      toast.info('No hay cambios para guardar');
      return;
    }
    setProblem(null);
    update.mutate(changes, {
      onError: (e) => {
        if (goneAway(e) || applyFieldErrors(e, setError)) return;
        if (isContactError(e, 'CONTACT_IDENTITY_LOCKED')) {
          // El Banco la autorizó mientras se editaba: se vuelven nombre y DNI a lo guardado
          reset({ ...v, name: c.name, dni: c.dni ?? '' });
          void q.refetch();
        }
        if (!(isApiError(e) && e.kind === 'unauthorized'))
          setProblem(contactErrorMessage(e) ?? humanMessage(e));
      },
    });
  });

  const askAuthorization = () =>
    router.push({
      pathname: '/banco/nueva',
      params: authorizationRequest({ name: c.name, dni: c.dni, position: c.position }),
    });

  return (
    <Screen
      header={header}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      footer={
        <Button
          title="Guardar cambios"
          icon={Save}
          size="lg"
          fullWidth
          loading={update.isPending}
          onPress={onSubmit}
        />
      }
    >
      {c.is_primary ? (
        <View className="flex-row">
          <Badge label="Contacto principal" tone="accent" />
        </View>
      ) : null}

      <SectionHeader title="Retiro de alimentos" />
      <Card tone={hasActive ? 'accent' : 'default'} className="gap-2">
        {c.pickup_authorized ? (
          <>
            <View className="flex-row items-center gap-2">
              <ShieldCheck
                size={18}
                color={hasActive ? colors.accentForeground : colors.mutedForeground}
              />
              <Text variant="label" className="flex-1">
                {hasActive
                  ? 'Autorizada por el Banco a retirar'
                  : 'La autorización del Banco está vencida'}
              </Text>
            </View>
            {authorizations.map((a, i) => (
              <View
                key={`${a.scope_type}-${a.valid_from ?? ''}-${a.valid_until ?? ''}-${i}`}
                className="flex-row items-center gap-2"
              >
                <Text className="flex-1 text-sm">{authorizationText(a)}</Text>
                {!isAuthorizationActive(a) ? (
                  <Badge label="Vencida" tone="warning" size="sm" />
                ) : null}
              </View>
            ))}
            <Text variant="caption">
              Como la autorizó el Banco, el nombre y el DNI no se pueden cambiar.
            </Text>
          </>
        ) : (
          <Text>Todavía no está autorizada a retirar. La autorización la da el Banco.</Text>
        )}
        {!hasActive ? (
          c.dni ? (
            <Button
              title="Pedir autorización al Banco"
              icon={Send}
              variant="outline"
              size="sm"
              className="self-start"
              onPress={askAuthorization}
            />
          ) : (
            <Text variant="caption">
              Para pedir la autorización, cargá su DNI y guardá los cambios.
            </Text>
          )
        ) : null}
      </Card>

      <SectionHeader title="Datos" />
      <Card className="gap-4">
        <ContactFields control={control} identityLocked={identityLocked} />
      </Card>
      {problem ? (
        <Card tone="destructive">
          <Text>{problem}</Text>
        </Card>
      ) : null}

      <Button
        title="Dar de baja"
        icon={Trash2}
        variant="ghost"
        onPress={() => setConfirmDelete(true)}
      />

      <ConfirmDialog
        visible={confirmDelete}
        title={`¿Dar de baja a ${c.name}?`}
        message={
          c.pickup_authorized
            ? 'Deja de figurar en los contactos y ya no va a poder retirar alimentos en nombre de la organización.'
            : 'Deja de figurar en los contactos de la organización.'
        }
        confirmLabel="Dar de baja"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            onError: (e) => {
              setConfirmDelete(false);
              if (goneAway(e) || (isApiError(e) && e.kind === 'unauthorized')) return;
              setProblem(contactErrorMessage(e) ?? humanMessage(e));
            },
          })
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
