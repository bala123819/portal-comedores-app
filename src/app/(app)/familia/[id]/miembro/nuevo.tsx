import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useForm, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MemberFields } from '@/components/familias/MemberFields';
import { Button, Card, Header, Screen, Text } from '@/components/ui';
import {
  emptyMember,
  familyErrorMessage,
  memberBody,
  memberSchema,
  missingRequired,
  type MemberValues,
} from '@/features/familias/form';
import { useAddMember, useFamily, useFamilyFormConfig } from '@/features/familias/hooks';
import { humanMessage } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';

/** `POST /org/families/{id}/members` */
export default function NuevoMiembroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useFamily(id);
  const formConfig = useFamilyFormConfig();
  const cfg = formConfig.data;
  const add = useAddMember(id, () => router.back());

  const { control, handleSubmit, setError } = useForm<MemberValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: emptyMember(),
  });

  const onSubmit = handleSubmit((v) => {
    const missing = missingRequired(cfg, null, [{ prefix: '', values: v }]);
    if (missing.length) {
      missing.forEach(([field, message]) => setError(field as Path<MemberValues>, { type: 'required', message }));
      return;
    }
    add.mutate(memberBody(v, cfg), { onError: (e) => applyFieldErrors(e, setError) });
  });

  const showError = add.isError && !(add.error as { fieldErrors?: unknown }).fieldErrors;

  return (
    <Screen
      header={<Header title="Agregar persona" subtitle={family.data?.name} back backFallback="/familias" />}
      footer={<Button title="Agregar a la familia" icon={UserPlus} size="lg" fullWidth loading={add.isPending} onPress={onSubmit} />}
    >
      <Card className="gap-3">
        <MemberFields control={control as unknown as Control<FieldValues>} cfg={cfg} extended />
      </Card>
      {showError ? (
        <Card tone="destructive">
          <Text>{familyErrorMessage(add.error) ?? humanMessage(add.error)}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
