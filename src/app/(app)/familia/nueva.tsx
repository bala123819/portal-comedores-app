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
import { useCreateFamily, useFamilyFormConfig, useFamilyTypes } from '@/features/familias/hooks';
import type { CreateFamilyInput, FamilyFormConfig } from '@/features/familias/types';
import { educationLabels, employmentLabels, genderLabels, housingLabels, label, relationshipLabels } from '@/lib/labels';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';
import { colors } from '@/theme/tokens';

/** Opciones de una lista según form-config (las define el banco); sin config, las de labels.ts */
const options = (values: string[] | undefined, map: Record<string, string>) =>
  (values ?? Object.keys(map)).map((value) => ({ value, label: label(map, value) }));

type Field = { enabled: boolean; required: boolean };
const fieldConfig = (cfg: FamilyFormConfig | undefined, name: string): Field =>
  cfg?.config.required_fields[name] ?? { enabled: true, required: false };
const fieldLabel = (text: string, f: Field) => (f.required ? text : `${text} (opcional)`);

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
  employment_level: z.string().optional(),
  education_level: z.string().optional(),
  is_pregnant: z.boolean(),
  is_nursing_mother: z.boolean(),
  is_celiac: z.boolean(),
  is_diabetic: z.boolean(),
  is_lactose_intolerant: z.boolean(),
  has_disability: z.boolean(),
});

/** Campos de `POST /org/families` (family_type_id*, name*, members[]) */
const schema = z.object({
  name: z.string().trim().min(2, 'Escribí un nombre para la familia').max(255),
  family_type_id: z.string().min(1, 'Elegí el tipo de familia'),
  phone: z.string().trim().max(50).optional(),
  email: z.union([z.literal(''), z.string().trim().email('Revisá el email')]).optional(),
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
  employment_level: undefined,
  education_level: undefined,
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
  const types = useFamilyTypes();
  const formConfig = useFamilyFormConfig();
  const cfg = formConfig.data;
  const opts = cfg?.options;
  const housing = fieldConfig(cfg, 'housing_situation');
  const email = fieldConfig(cfg, 'email');
  const employment = fieldConfig(cfg, 'employment_level');
  const education = fieldConfig(cfg, 'education_level');
  const create = useCreateFamily((id) => {
    if (id) router.replace({ pathname: '/familia/[id]', params: { id } });
    else router.back();
  });

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', family_type_id: '', phone: '', email: '', notes: '', members: [{ ...emptyMember(), relationship: 'jefe_hogar' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'members' });

  /** Los campos que el banco marca `required` en form-config: la API los exige en el alta. */
  const missingRequired = (v: FormValues) => {
    const missing: [Parameters<typeof setError>[0], string][] = [];
    if (housing.enabled && housing.required && !v.housing_situation) missing.push(['housing_situation', 'Elegí la situación de vivienda']);
    if (email.enabled && email.required && !v.email?.trim()) missing.push(['email', 'Escribí un email']);
    v.members.forEach((m, i) => {
      if (employment.enabled && employment.required && !m.employment_level) missing.push([`members.${i}.employment_level`, 'Elegí la situación laboral']);
      if (education.enabled && education.required && !m.education_level) missing.push([`members.${i}.education_level`, 'Elegí el nivel educativo']);
    });
    missing.forEach(([field, message]) => setError(field, { type: 'required', message }));
    return missing.length > 0;
  };

  const onSubmit = handleSubmit((v) => {
    if (missingRequired(v)) return;
    const body: CreateFamilyInput = {
      name: v.name.trim(),
      family_type_id: v.family_type_id,
      phone: v.phone?.trim() || null,
      email: email.enabled ? v.email?.trim() || null : undefined,
      housing_situation: housing.enabled ? v.housing_situation || null : undefined,
      notes: v.notes?.trim() || null,
      members: v.members.map((m) => ({
        first_name: m.first_name.trim(),
        last_name: m.last_name.trim(),
        document_number: m.document_number?.trim() || null,
        document_type: m.document_number?.trim() ? 'dni' : null,
        birth_date: toIso(m.birth_date),
        relationship: m.relationship || null,
        is_head_of_household: m.relationship === 'jefe_hogar',
        gender: m.gender || null,
        employment_level: employment.enabled ? m.employment_level || null : undefined,
        education_level: education.enabled ? m.education_level || null : undefined,
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
      footer={<Button title="Guardar familia" icon={Save} size="lg" fullWidth loading={create.isPending} onPress={onSubmit} />}
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
        {housing.enabled ? (
          <Controller
            control={control}
            name="housing_situation"
            render={({ field }) => (
              <Select label={fieldLabel('Vivienda', housing)} value={field.value} onChange={field.onChange} options={options(opts?.housing_situations, housingLabels)} error={errors.housing_situation?.message} />
            )}
          />
        ) : null}
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input label="Teléfono (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" error={errors.phone?.message} />
          )}
        />
        {email.enabled ? (
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input label={fieldLabel('Email', email)} value={field.value} onChangeText={field.onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
            )}
          />
        ) : null}
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
            render={({ field }) => <Input label="DNI (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" maxLength={30} error={errors.members?.[i]?.document_number?.message} />}
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
            render={({ field }) => <Select label="Parentesco" value={field.value} onChange={field.onChange} options={options(opts?.relationships, relationshipLabels)} />}
          />
          <Controller
            control={control}
            name={`members.${i}.gender`}
            render={({ field }) => <Select label="Género" value={field.value} onChange={field.onChange} options={options(opts?.genders, genderLabels)} />}
          />
          {employment.enabled ? (
            <Controller
              control={control}
              name={`members.${i}.employment_level`}
              render={({ field }) => (
                <Select label={fieldLabel('Situación laboral', employment)} value={field.value} onChange={field.onChange} options={options(opts?.employment_levels, employmentLabels)} error={errors.members?.[i]?.employment_level?.message} />
              )}
            />
          ) : null}
          {education.enabled ? (
            <Controller
              control={control}
              name={`members.${i}.education_level`}
              render={({ field }) => (
                <Select label={fieldLabel('Nivel educativo', education)} value={field.value} onChange={field.onChange} options={options(opts?.education_levels, educationLabels)} error={errors.members?.[i]?.education_level?.message} />
              )}
            />
          ) : null}
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
