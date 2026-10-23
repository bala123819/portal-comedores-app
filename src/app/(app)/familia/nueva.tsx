import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Save, Trash2, UserPlus } from 'lucide-react-native';
import { useFieldArray, useForm, type Control, type FieldValues, type Path } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { FamilyFields } from '@/components/familias/FamilyFields';
import { MemberFields } from '@/components/familias/MemberFields';
import { Button, Card, Header, IconButton, Screen, SectionHeader, Text } from '@/components/ui';
import {
  emptyFamily,
  emptyMember,
  familyBody,
  familyErrorMessage,
  familySchema,
  memberBody,
  memberSchema,
  missingRequired,
} from '@/features/familias/form';
import { useCreateFamily, useFamilyFormConfig, useFamilyTypes } from '@/features/familias/hooks';
import type { CreateFamilyInput } from '@/features/familias/types';
import { goBack } from '@/lib/navigation';
import { humanMessage } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';
import { colors } from '@/theme/tokens';

/** `POST /org/families`: la familia con sus miembros en un solo request (family_type_id*, name*) */
const schema = familySchema.extend({ members: z.array(memberSchema) });
type FormValues = z.infer<typeof schema>;

export default function NuevaFamiliaScreen() {
  const types = useFamilyTypes();
  const formConfig = useFamilyFormConfig();
  const cfg = formConfig.data;
  const create = useCreateFamily((id) => {
    if (id) router.replace({ pathname: '/familia/[id]', params: { id } });
    else goBack('/familias');
  });

  const { control, handleSubmit, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...emptyFamily(), members: [{ ...emptyMember(), relationship: 'jefe_hogar' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'members' });
  const anyControl = control as unknown as Control<FieldValues>;

  const onSubmit = handleSubmit((v) => {
    const missing = missingRequired(
      cfg,
      v,
      v.members.map((m, i) => ({ prefix: `members.${i}.`, values: m })),
    );
    if (missing.length) {
      missing.forEach(([field, message]) => setError(field as Path<FormValues>, { type: 'required', message }));
      return;
    }
    const body: CreateFamilyInput = {
      ...familyBody(v, cfg),
      members: v.members.map((m) => memberBody(m, cfg)),
    };
    create.mutate(body, { onError: (e) => applyFieldErrors(e, setError) });
  });

  const showError = create.isError && !(create.error as { fieldErrors?: unknown }).fieldErrors;

  return (
    <Screen
      header={<Header title="Registrar familia" back backFallback="/familias" />}
      footer={<Button title="Guardar familia" icon={Save} size="lg" fullWidth loading={create.isPending} onPress={onSubmit} />}
    >
      <Card className="gap-3">
        <FamilyFields control={anyControl} cfg={cfg} types={types.data} typesLoading={types.isPending} />
      </Card>

      <SectionHeader title={`Integrantes (${fields.length})`} />
      {fields.map((f, i) => (
        <Card key={f.id} className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text variant="label">Persona {i + 1}</Text>
            {fields.length > 1 ? (
              <IconButton icon={Trash2} label={`Quitar persona ${i + 1}`} color={colors.destructive} onPress={() => remove(i)} />
            ) : null}
          </View>
          <MemberFields control={anyControl} prefix={`members.${i}.`} cfg={cfg} />
        </Card>
      ))}
      <Button title="Agregar otra persona" icon={UserPlus} variant="outline" onPress={() => append(emptyMember())} />

      {showError ? (
        <Card tone="destructive">
          <Text>{familyErrorMessage(create.error) ?? humanMessage(create.error)}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
