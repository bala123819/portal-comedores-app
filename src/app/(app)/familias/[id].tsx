import { useLocalSearchParams } from 'expo-router';
import { CalendarDays, Home, Phone } from 'lucide-react-native';
import { View } from 'react-native';
import {
  Avatar,
  Badge,
  Card,
  ErrorState,
  Header,
  InfoRow,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useFamily } from '@/features/familias/hooks';
import type { FamilyMember } from '@/features/familias/types';
import { ageFrom, formatDate } from '@/lib/format';
import {
  educationLabels,
  employmentLabels,
  familyStatusLabels,
  housingLabels,
  label,
  relationshipLabels,
} from '@/lib/labels';

function conditions(m: FamilyMember): string[] {
  const out: string[] = [];
  if (m.is_pregnant) out.push('Embarazada');
  if (m.is_nursing_mother) out.push('Amamantando');
  if (m.is_celiac) out.push('Celíaco/a');
  if (m.is_diabetic) out.push('Diabético/a');
  if (m.is_lactose_intolerant) out.push('Intolerante a la lactosa');
  if (m.has_disability) out.push(m.disability_description ? `Discapacidad: ${m.disability_description}` : 'Discapacidad');
  return out;
}

export default function FamiliaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useFamily(id);
  const f = q.data;

  if (!f) {
    return (
      <Screen header={<Header title="Familia" back backFallback="/familias" />}>
        {q.isPending ? <SkeletonList count={2} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      </Screen>
    );
  }

  return (
    <Screen header={<Header title={f.name} back backFallback="/familias" />} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <Card className="gap-4">
        {f.status ? <Badge label={label(familyStatusLabels, f.status)} tone={f.status === 'activa' ? 'success' : 'muted'} /> : null}
        <InfoRow icon={Home} label="Vivienda" value={f.housing_situation ? label(housingLabels, f.housing_situation) : null} />
        <InfoRow icon={Phone} label="Teléfono" value={f.phone} />
        <InfoRow icon={CalendarDays} label="Registrada" value={f.registration_date ? formatDate(f.registration_date) : null} />
        {f.special_needs_notes ? <InfoRow label="Necesidades especiales" value={f.special_needs_notes} /> : null}
        {f.notes ? <InfoRow label="Notas" value={f.notes} /> : null}
      </Card>

      <SectionHeader title={`Integrantes (${f.members?.length ?? 0})`} />
      <View className="gap-2">
        {(f.members ?? []).map((m) => {
          const age = ageFrom(m.birth_date);
          const conds = conditions(m);
          const name = `${m.first_name} ${m.last_name}`;
          return (
            <Card key={m.id} className="gap-2">
              <View className="flex-row items-center gap-3">
                <Avatar name={name} size="sm" />
                <View className="flex-1">
                  <Text variant="label">{name}</Text>
                  <Text variant="caption">
                    {[
                      m.relationship ? label(relationshipLabels, m.relationship) : null,
                      age != null ? `${age} años` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
              {m.employment_level || m.education_level ? (
                <Text className="text-sm">
                  {[m.employment_level ? label(employmentLabels, m.employment_level) : null, m.education_level ? label(educationLabels, m.education_level) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
              {conds.length ? (
                <View className="flex-row flex-wrap gap-2">
                  {conds.map((c) => (
                    <Badge key={c} label={c} tone="info" size="sm" />
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })}
        {!f.members?.length ? <Text tone="muted">No hay integrantes cargados.</Text> : null}
      </View>
    </Screen>
  );
}
