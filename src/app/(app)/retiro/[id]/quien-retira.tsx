import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { Ban, Trash2, UserCheck, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Header,
  IconButton,
  Input,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import {
  useDeclarePicker,
  useEligibleContacts,
  usePickers,
  useRemovePicker,
} from '@/features/asignaciones/hooks';
import type { Picker } from '@/features/asignaciones/types';
import { applyFieldErrors } from '@/services/api/use-action';
import { humanMessage } from '@/services/api/errors';
import { colors } from '@/theme/tokens';

const otherSchema = z.object({
  name: z.string().trim().min(2, 'Escribí nombre y apellido'),
  dni: z.string().trim().regex(/^\d{7,8}$/, 'El DNI tiene 7 u 8 números, sin puntos'),
});
type OtherValues = z.infer<typeof otherSchema>;

export default function QuienRetiraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pickers = usePickers(id);
  const eligible = useEligibleContacts(id);
  const declare = useDeclarePicker(id);
  const remove = useRemovePicker(id);
  const [toRemove, setToRemove] = useState<Picker | null>(null);
  const [showOther, setShowOther] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<OtherValues>({ resolver: zodResolver(otherSchema), defaultValues: { name: '', dni: '' } });

  const declaredIds = new Set((pickers.data ?? []).map((p) => p.organization_contact_id).filter(Boolean));

  const submitOther = handleSubmit((v) =>
    declare.mutate(
      { name: v.name, dni: v.dni, declared_via: 'web' },
      {
        onSuccess: () => {
          reset();
          setShowOther(false);
        },
        onError: (e) => applyFieldErrors(e, setError),
      },
    ),
  );

  return (
    <Screen
      header={<Header title="Quién va a retirar" back backFallback="/retiros" />}
      refreshing={pickers.isRefetching || eligible.isRefetching}
      onRefresh={() => {
        void pickers.refetch();
        void eligible.refetch();
      }}
    >
      <Text tone="muted">
        Avisá quién va a buscar los alimentos. La sucursal controla esta lista en la puerta.
      </Text>

      <SectionHeader title="Van a retirar" />
      {pickers.isPending ? (
        <SkeletonList count={1} />
      ) : pickers.isError ? (
        <ErrorState error={pickers.error} onRetry={() => pickers.refetch()} />
      ) : pickers.data?.length ? (
        <View className="gap-2">
          {pickers.data.map((p) => (
            <Card key={p.id} className="flex-row items-center gap-3">
              <UserCheck size={22} color={colors.primary} />
              <View className="flex-1">
                <Text variant="label">{p.name ?? p.contact?.name ?? 'Persona'}</Text>
                <Text variant="caption">
                  {[p.dni ?? p.contact?.dni ? `DNI ${p.dni ?? p.contact?.dni}` : null, p.is_unlisted ? 'No figura en el padrón' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <IconButton icon={Trash2} label={`Quitar a ${p.name ?? 'esta persona'}`} color={colors.destructive} onPress={() => setToRemove(p)} />
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text tone="muted">Todavía no avisaste quién va.</Text>
        </Card>
      )}

      <SectionHeader title="Personas habilitadas" />
      {eligible.isPending ? (
        <SkeletonList count={2} />
      ) : eligible.isError ? (
        <ErrorState error={eligible.error} onRetry={() => eligible.refetch()} />
      ) : (
        <View className="gap-2">
          {(eligible.data ?? []).map((c) => {
            const contactId = c.organization_contact_id ?? c.id;
            const already = contactId ? declaredIds.has(contactId) : false;
            const canPick = c.eligible !== false;
            return (
              <Card key={contactId ?? c.name} className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Text variant="label" className="flex-1">
                    {c.name}
                  </Text>
                  {already ? <Badge label="Avisado" tone="success" icon={UserCheck} size="sm" /> : null}
                </View>
                {c.dni ? <Text variant="caption">DNI {c.dni}</Text> : null}
                {!canPick ? (
                  <View className="flex-row items-center gap-2">
                    <Ban size={16} color={colors.destructive} />
                    <Text className="flex-1 text-sm">{c.reason ?? 'No está habilitada para este retiro'}</Text>
                  </View>
                ) : !already && contactId ? (
                  <Button
                    title="Va a retirar"
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    loading={declare.isPending && declare.variables?.organization_contact_id === contactId}
                    onPress={() => declare.mutate({ organization_contact_id: contactId, declared_via: 'web' })}
                  />
                ) : null}
              </Card>
            );
          })}
          {!eligible.data?.length ? <Text tone="muted">No hay contactos cargados en la organización.</Text> : null}
        </View>
      )}

      <SectionHeader title="¿Va otra persona?" />
      {showOther ? (
        <Card className="gap-3">
          <Text variant="caption">
            Si va alguien que no está en el padrón, cargá su nombre y DNI. Queda marcado como que no figura.
          </Text>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input label="Nombre y apellido" value={field.value} onChangeText={field.onChange} error={errors.name?.message} autoCapitalize="words" />
            )}
          />
          <Controller
            control={control}
            name="dni"
            render={({ field }) => (
              <Input label="DNI" value={field.value} onChangeText={(t) => field.onChange(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={8} error={errors.dni?.message} />
            )}
          />
          {declare.isError && !(declare.error as { fieldErrors?: unknown }).fieldErrors ? (
            <Text tone="destructive">{humanMessage(declare.error)}</Text>
          ) : null}
          <Button title="Avisar" icon={UserPlus} onPress={submitOther} loading={declare.isPending} />
          <Button title="Cancelar" variant="ghost" onPress={() => setShowOther(false)} />
        </Card>
      ) : (
        <Button title="Agregar otra persona" icon={UserPlus} variant="outline" onPress={() => setShowOther(true)} />
      )}

      <ConfirmDialog
        visible={!!toRemove}
        title="¿Quitar a esta persona?"
        message={`${toRemove?.name ?? 'Esta persona'} ya no va a figurar para retirar.`}
        confirmLabel="Quitar"
        destructive
        loading={remove.isPending}
        onCancel={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.id, { onSuccess: () => setToRemove(null) })}
      />
    </Screen>
  );
}
