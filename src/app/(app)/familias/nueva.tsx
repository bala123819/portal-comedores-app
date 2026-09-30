import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Save, Trash2, UserPlus } from 'lucide-react-native';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import {
  Button,
  Card,
  Chip,
  Header,
  IconButton,
  Input,
  Screen,
  SectionHeader,
  Select,
  Text,
  TextArea,
} from '@/components/ui';
import { useCreateFamily, useFamilyTypes } from '@/features/familias/hooks';
import { useOrgId } from '@/features/org/hooks';
import { genderLabels, housingLabels, relationshipLabels } from '@/lib/labels';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';
import type { CreateFamilyBody } from '@/services/api/endpoints/organizations';
import { colors } from '@/theme/tokens';

const options = (map: Record<string, string>) => Object.entries(map).map(([value, label]) => ({ value, label }));

const CONDITIONS = [
  ['is_pregnant', 'Embarazada'],
  ['is_nursing_mother', 'Amamantando'],
  ['is_celiac', 'Celíaco/a'],
  ['is_diabetic', 'Diabético/a'],
  ['is_lactose_intolerant', 'Intolerante a la lactosa'],
  ['has_disability', 'Discapacidad'],
] as const;

const memberSchema = z.object({
  first_name: z.string().trim().min(1, 'Obligatorio').max(100),
  last_name: z.string().trim().min(1, 'Obligatorio').max(100),
  document_number: z.string().trim().max(30).optional(),
  birth_date: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{2}\/\d{2}\/\d{4}$/.test(v), 'Usá el formato día/mes/año')
    .optional(),
  relationship: z.string().optional(),
  gender: z.string().optional(),
  is_pregnant: z.boolean(),
  is_nursing_mother: z.boolean(),
  is_celiac: z.boolean(),
  is_diabetic: z.boolean(),
  is_lactose_intolerant: z.boolean(),
  has_disability: z.boolean(),
});

/** Campos de `POST /organizations/{id}/families` (family_type_id*, name*, members[]) */
const schema = z.object({
  name: z.string().trim().min(2, 'Escribí un nombre para la familia').max(255),
  family_type_id: z.string().min(1, 'Elegí el tipo de familia'),
  phone: z.string().trim().max(50).optional(),
  housing_situation: z.string().optional(),
  notes: z.string().max(2000).optional(),
  members: z.array(memberSchema),
});
type FormValues = z.infer<typeof schema>;
type MemberValues = z.infer<typeof memberSchema>;

const emptyMember = (): MemberValues => ({
  first_name: '',
  last_name: '',
  document_number: '',
  birth_date: '',
  relationship: undefined,
  gender: undefined,
  is_pregnant: false,
  is_nursing_mother: false,
  is_celiac: false,
  is_diabetic: false,
  is_lactose_intolerant: false,
  has_disability: false,
});

const toIso = (d?: string) => {
  const m = d ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

export default function NuevaFamiliaScreen() {
  const orgId = useOrgId();
  const types = useFamilyTypes();
  const create = useCreateFamily(orgId ?? '', (id) => {
    if (id) router.replace({ pathname: '/familias/[id]', params: { id } });
    else router.back();
  });

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', family_type_id: '', phone: '', notes: '', members: [{ ...emptyMember(), relationship: 'jefe_hogar' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'members' });

  const onSubmit = handleSubmit((v) => {
    const body: CreateFamilyBody = {
      name: v.name.trim(),
      family_type_id: v.family_type_id,
      source: 'manual',
      phone: v.phone?.trim() || null,
      housing_situation: (v.housing_situation as CreateFamilyBody['housing_situation']) || null,
      notes: v.notes?.trim() || null,
      members: v.members.map((m) => ({
        first_name: m.first_name.trim(),
        last_name: m.last_name.trim(),
        document_number: m.document_number?.trim() || null,
        document_type: m.document_number?.trim() ? 'dni' : null,
        birth_date: toIso(m.birth_date),
        relationship: (m.relationship as 'jefe_hogar') || null,
        is_head_of_household: m.relationship === 'jefe_hogar',
        gender: (m.gender as 'no_especificado') || null,
        is_pregnant: m.is_pregnant,
        is_nursing_mother: m.is_nursing_mother,
        is_celiac: m.is_celiac,
        is_diabetic: m.is_diabetic,
        is_lactose_intolerant: m.is_lactose_intolerant,
        has_disability: m.has_disability,
      })),
    };
    create.mutate(body, { onError: (e) => applyFieldErrors(e, setError) });
  });

  const forbidden = create.isError && isApiError(create.error) && create.error.kind === 'forbidden';

  return (
    <Screen
      header={<Header title="Registrar familia" back backFallback="/familias" />}
      footer={<Button title="Guardar familia" icon={Save} size="lg" fullWidth loading={create.isPending} onPress={onSubmit} disabled={!orgId} />}
    >
      <Card className="gap-3">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input label="Nombre de la familia" placeholder="Ej: Familia Rodríguez" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
          )}
        />
        <Controller
          control={control}
          name="family_type_id"
          render={({ field }) => (
            <Select
              label="Tipo de familia"
              value={field.value}
              onChange={field.onChange}
              options={(types.data ?? []).map((t) => ({ value: t.id, label: t.name, description: t.description ?? undefined }))}
              placeholder={types.isPending ? 'Cargando…' : 'Elegí una opción'}
              error={errors.family_type_id?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="housing_situation"
          render={({ field }) => (
            <Select label="Vivienda (opcional)" value={field.value} onChange={field.onChange} options={options(housingLabels)} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input label="Teléfono (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field }) => <TextArea label="Notas (opcional)" value={field.value} onChangeText={field.onChange} maxLength={2000} />}
        />
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
          <Controller
            control={control}
            name={`members.${i}.first_name`}
            render={({ field }) => <Input label="Nombre" value={field.value} onChangeText={field.onChange} error={errors.members?.[i]?.first_name?.message} />}
          />
          <Controller
            control={control}
            name={`members.${i}.last_name`}
            render={({ field }) => <Input label="Apellido" value={field.value} onChangeText={field.onChange} error={errors.members?.[i]?.last_name?.message} />}
          />
          <Controller
            control={control}
            name={`members.${i}.document_number`}
            render={({ field }) => <Input label="DNI (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" maxLength={30} />}
          />
          <Controller
            control={control}
            name={`members.${i}.birth_date`}
            render={({ field }) => (
              <Input label="Fecha de nacimiento (opcional)" placeholder="dd/mm/aaaa" value={field.value} onChangeText={field.onChange} keyboardType="numbers-and-punctuation" maxLength={10} error={errors.members?.[i]?.birth_date?.message} />
            )}
          />
          <Controller
            control={control}
            name={`members.${i}.relationship`}
            render={({ field }) => <Select label="Parentesco" value={field.value} onChange={field.onChange} options={options(relationshipLabels)} />}
          />
          <Controller
            control={control}
            name={`members.${i}.gender`}
            render={({ field }) => <Select label="Género" value={field.value} onChange={field.onChange} options={options(genderLabels)} />}
          />
          <Text variant="label">Situaciones de salud</Text>
          <View className="flex-row flex-wrap gap-2">
            {CONDITIONS.map(([key, text]) => (
              <Controller
                key={key}
                control={control}
                name={`members.${i}.${key}`}
                render={({ field }) => <Chip label={text} selected={field.value} onPress={() => field.onChange(!field.value)} />}
              />
            ))}
          </View>
        </Card>
      ))}
      <Button title="Agregar otra persona" icon={UserPlus} variant="outline" onPress={() => append(emptyMember())} />

      {create.isError && !(create.error as { fieldErrors?: unknown }).fieldErrors ? (
        <Card tone="destructive">
          <Text>{forbidden ? 'Tu usuario no tiene permiso para registrar familias. Pedíselo al Banco de Alimentos.' : humanMessage(create.error)}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
