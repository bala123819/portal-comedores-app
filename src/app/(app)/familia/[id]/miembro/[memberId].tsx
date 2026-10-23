import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { RotateCcw, Save, Trash2, UserMinus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useForm, type Control, type FieldValues, type Path } from 'react-hook-form';
import { View } from 'react-native';
import { MemberFields } from '@/components/familias/MemberFields';
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
import {
  changedFields,
  emptyMember,
  familyErrorMessage,
  familyLock,
  memberBody,
  memberSchema,
  memberToValues,
  missingRequired,
  type MemberValues,
} from '@/features/familias/form';
import { useFamily, useFamilyFormConfig, useRemoveMember, useUpdateMember } from '@/features/familias/hooks';
import { goBack } from '@/lib/navigation';
import { humanMessage } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';

/**
 * `PUT /org/families/{id}/members/{memberId}` (sólo los campos que cambian) y `DELETE`.
 * Embarazo, lactancia, fecha de nacimiento y pasar a inactivo recalculan el cupo de la organización.
 */
export default function MiembroScreen() {
  const { id, memberId } = useLocalSearchParams<{ id: string; memberId: string }>();
  const q = useFamily(id);
  const f = q.data;
  const m = f?.members?.find((x) => x.id === memberId);
  const formConfig = useFamilyFormConfig();
  const cfg = formConfig.data;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<'activo' | 'inactivo' | null>(null);

  const update = useUpdateMember(id, memberId, () => {
    if (confirmStatus) setConfirmStatus(null);
    else goBack(`/familia/${id}`);
  });
  const remove = useRemoveMember(id, memberId, () => {
    setConfirmRemove(false);
    goBack(`/familia/${id}`);
  });

  const { control, handleSubmit, setError, reset } = useForm<MemberValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: m ? memberToValues(m) : emptyMember(),
  });
  useEffect(() => {
    if (m) reset(memberToValues(m));
  }, [m, reset]);

  const header = <Header title={m ? m.full_name || `${m.first_name} ${m.last_name}` : 'Persona'} subtitle={f?.name} back backFallback="/familias" />;

  if (!f) {
    return <Screen header={header}>{q.isPending ? <SkeletonList count={2} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}</Screen>;
  }
  if (!m) {
    return (
      <Screen header={header}>
        <EmptyState title="No encontramos a esta persona" message="Puede que ya la hayan quitado de la familia." />
      </Screen>
    );
  }

  const lock = familyLock(f);
  const errorText = (e: unknown) => familyErrorMessage(e) ?? humanMessage(e);

  const onSubmit = handleSubmit((v) => {
    const missing = missingRequired(cfg, null, [{ prefix: '', values: v }]);
    if (missing.length) {
      missing.forEach(([field, message]) => setError(field as Path<MemberValues>, { type: 'required', message }));
      return;
    }
    const changes = changedFields(memberBody(memberToValues(m), cfg), memberBody(v, cfg));
    if (!Object.keys(changes).length) {
      toast.info('No hay cambios para guardar');
      goBack(`/familia/${id}`);
      return;
    }
    update.mutate(changes, { onError: (e) => applyFieldErrors(e, setError) });
  });

  const showError = update.isError && !confirmStatus && !(update.error as { fieldErrors?: unknown }).fieldErrors;

  return (
    <Screen
      header={header}
      footer={lock ? undefined : <Button title="Guardar cambios" icon={Save} size="lg" fullWidth loading={update.isPending && !confirmStatus} onPress={onSubmit} />}
    >
      {m.status === 'inactivo' ? (
        <View className="flex-row">
          <Badge label="Inactivo: no cuenta para el cupo" tone="muted" />
        </View>
      ) : null}
      {lock ? (
        <Card tone="info">
          <Text>{lock}</Text>
        </Card>
      ) : (
        <>
          <Card className="gap-3">
            <MemberFields control={control as unknown as Control<FieldValues>} cfg={cfg} excludeMemberId={m.id} extended />
          </Card>
          {showError ? (
            <Card tone="destructive">
              <Text>{errorText(update.error)}</Text>
            </Card>
          ) : null}

          <SectionHeader title="Estado de la persona" />
          <View className="gap-2">
            {m.status === 'inactivo' ? (
              <Button title="Reactivar" icon={RotateCcw} variant="secondary" onPress={() => setConfirmStatus('activo')} />
            ) : (
              <Button title="Pasar a inactivo" icon={UserMinus} variant="outline" onPress={() => setConfirmStatus('inactivo')} />
            )}
            <Button title="Quitar de la familia" icon={Trash2} variant="ghost" onPress={() => setConfirmRemove(true)} />
          </View>
        </>
      )}

      <ConfirmDialog
        visible={confirmStatus !== null}
        title={confirmStatus === 'activo' ? '¿Reactivar a esta persona?' : '¿Pasar a inactivo?'}
        message={
          confirmStatus === 'activo'
            ? 'Vuelve a contar para el cupo de la organización.'
            : 'Sigue en la familia pero deja de contar para el cupo (por ejemplo, si se mudó por un tiempo).'
        }
        confirmLabel={confirmStatus === 'activo' ? 'Reactivar' : 'Pasar a inactivo'}
        loading={update.isPending}
        onConfirm={() =>
          confirmStatus &&
          update.mutate(
            { status: confirmStatus },
            {
              onError: (e) => {
                setConfirmStatus(null);
                toast.error(errorText(e));
              },
            },
          )
        }
        onCancel={() => setConfirmStatus(null)}
      />
      <ConfirmDialog
        visible={confirmRemove}
        title="¿Quitar a esta persona de la familia?"
        message="Se borra de la familia y se recalcula el cupo de la organización."
        confirmLabel="Quitar"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            onError: (e) => {
              setConfirmRemove(false);
              toast.error(errorText(e));
            },
          })
        }
        onCancel={() => setConfirmRemove(false)}
      />
    </Screen>
  );
}
