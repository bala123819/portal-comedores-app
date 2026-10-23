import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { Save } from 'lucide-react-native';
import { useEffect } from 'react';
import { useForm, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FamilyFields } from '@/components/familias/FamilyFields';
import { Button, Card, ErrorState, Header, Screen, SkeletonList, Text, toast } from '@/components/ui';
import {
  changedFields,
  emptyFamily,
  familyBody,
  familyErrorMessage,
  familyLock,
  familySchema,
  familyToValues,
  missingRequired,
  type FamilyValues,
} from '@/features/familias/form';
import { useFamily, useFamilyFormConfig, useFamilyTypes, useUpdateFamily } from '@/features/familias/hooks';
import { goBack } from '@/lib/navigation';
import { humanMessage } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';

/** `PUT /org/families/{id}`: sólo se mandan los campos que cambian. */
export default function EditarFamiliaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useFamily(id);
  const f = q.data;
  const types = useFamilyTypes();
  const formConfig = useFamilyFormConfig();
  const cfg = formConfig.data;
  const update = useUpdateFamily(id, () => goBack(`/familia/${id}`));

  const { control, handleSubmit, setError, reset } = useForm<FamilyValues>({
    resolver: zodResolver(familySchema),
    defaultValues: f ? familyToValues(f) : emptyFamily(),
  });
  // La familia puede llegar después del primer render (sin caché).
  useEffect(() => {
    if (f) reset(familyToValues(f));
  }, [f, reset]);

  if (!f) {
    return (
      <Screen header={<Header title="Editar familia" back backFallback="/familias" />}>
        {q.isPending ? <SkeletonList count={2} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      </Screen>
    );
  }

  const lock = familyLock(f);

  const onSubmit = handleSubmit((v) => {
    const missing = missingRequired(cfg, v, []);
    if (missing.length) {
      missing.forEach(([field, message]) => setError(field as Path<FamilyValues>, { type: 'required', message }));
      return;
    }
    const changes = changedFields(familyBody(familyToValues(f), cfg), familyBody(v, cfg));
    if (!Object.keys(changes).length) {
      toast.info('No hay cambios para guardar');
      goBack(`/familia/${id}`);
      return;
    }
    update.mutate(changes, { onError: (e) => applyFieldErrors(e, setError) });
  });

  const showError = update.isError && !(update.error as { fieldErrors?: unknown }).fieldErrors;

  return (
    <Screen
      header={<Header title="Editar familia" subtitle={f.name} back backFallback="/familias" />}
      footer={lock ? undefined : <Button title="Guardar cambios" icon={Save} size="lg" fullWidth loading={update.isPending} onPress={onSubmit} />}
    >
      {lock ? (
        <Card tone="info">
          <Text>{lock}</Text>
        </Card>
      ) : (
        <Card className="gap-3">
          <FamilyFields control={control as unknown as Control<FieldValues>} cfg={cfg} types={types.data} typesLoading={types.isPending} />
        </Card>
      )}
      {showError ? (
        <Card tone="destructive">
          <Text>{familyErrorMessage(update.error) ?? humanMessage(update.error)}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
