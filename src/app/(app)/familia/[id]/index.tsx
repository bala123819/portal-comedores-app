import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Hash, Home, Mail, Pencil, Phone, RotateCcw, Trash2, UserMinus, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Header,
  IconButton,
  InfoRow,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
  toast,
} from '@/components/ui';
import { familyErrorMessage, familyLock, isDeleteBlocked } from '@/features/familias/form';
import { useDeleteFamily, useFamily, useUpdateFamily } from '@/features/familias/hooks';
import type { FamilyMember } from '@/features/familias/types';
import { features } from '@/lib/features';
import { ageFrom, formatDate } from '@/lib/format';
import {
  ageGroupLabels,
  educationLabels,
  employmentLabels,
  familyStatusLabels,
  housingLabels,
  label,
  relationshipLabels,
} from '@/lib/labels';
import { humanMessage, isApiError } from '@/services/api/errors';

function conditions(m: FamilyMember): string[] {
  const out: string[] = [];
  if (m.is_pregnant) out.push('Embarazada');
  if (m.is_nursing_mother) out.push('Amamanta');
  if (m.is_celiac) out.push('Celíaco/a');
  if (m.is_diabetic) out.push('Diabetes');
  if (m.is_lactose_intolerant) out.push('Intolerante a la lactosa');
  if (m.has_disability) out.push(m.disability_description ? `Discapacidad: ${m.disability_description}` : 'Discapacidad');
  if (m.other_conditions) out.push(m.other_conditions);
  return out;
}

const errorText = (e: unknown) => familyErrorMessage(e) ?? humanMessage(e);

export default function FamiliaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useFamily(id);
  const f = q.data;

  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Motivos del 409 al borrar (entregas o programas vigentes): se ofrece pasarla a inactiva */
  const [blocked, setBlocked] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<'activa' | 'inactiva' | null>(null);

  const update = useUpdateFamily(id, () => {
    setConfirmStatus(null);
    setBlocked(null);
  });
  const remove = useDeleteFamily(id, () => {
    setConfirmDelete(false);
    router.replace('/familias');
  });

  if (!f) {
    return (
      <Screen header={<Header title="Familia" back backFallback="/familias" />}>
        {q.isPending ? <SkeletonList count={2} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      </Screen>
    );
  }

  const lock = familyLock(f);
  const editable = features.familiasAlta && !lock;

  const onDelete = () =>
    remove.mutate(undefined, {
      onError: (e) => {
        setConfirmDelete(false);
        if (isDeleteBlocked(e)) {
          const reasons = isApiError(e) ? e.fieldErrors?.reasons : undefined;
          setBlocked(reasons?.length ? `La familia ${reasons.join(" y ")}.` : "La familia tiene entregas o programas vigentes.");
        } else toast.error(errorText(e));
      },
    });

  const onStatus = (status: 'activa' | 'inactiva') =>
    update.mutate({ status }, { onError: (e) => toast.error(errorText(e)) });

  return (
    <Screen
      header={
        <Header
          title={f.name}
          subtitle={f.code ?? undefined}
          back
          backFallback="/familias"
          right={
            editable ? (
              <IconButton icon={Pencil} label="Editar familia" onPress={() => router.push({ pathname: '/familia/[id]/editar', params: { id: f.id } })} />
            ) : undefined
          }
        />
      }
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
    >
      {lock && features.familiasAlta ? (
        <Card tone="info">
          <Text className="text-sm">{lock}</Text>
        </Card>
      ) : null}

      <Card className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          {f.status ? <Badge label={label(familyStatusLabels, f.status)} tone={f.status === 'activa' ? 'success' : 'muted'} /> : null}
          {f.family_type ? <Badge label={f.family_type.name} tone="accent" icon={Users} /> : null}
        </View>
        <InfoRow icon={Hash} label="Código" value={f.code} />
        <InfoRow icon={Home} label="Vivienda" value={f.housing_situation ? label(housingLabels, f.housing_situation) : null} />
        <InfoRow icon={Phone} label="Teléfono" value={f.phone} />
        {f.email ? <InfoRow icon={Mail} label="Email" value={f.email} /> : null}
        <InfoRow icon={CalendarDays} label="Registrada" value={f.registration_date ? formatDate(f.registration_date) : null} />
        {f.special_needs_notes ? <InfoRow label="Necesidades especiales" value={f.special_needs_notes} /> : null}
        {f.notes ? <InfoRow label="Notas" value={f.notes} /> : null}
      </Card>

      <SectionHeader title={`Integrantes (${f.members?.length ?? f.total_members ?? 0})`} />
      <View className="gap-2">
        {(f.members ?? []).map((m) => {
          const age = m.age ?? ageFrom(m.birth_date);
          const conds = conditions(m);
          const name = m.full_name || `${m.first_name} ${m.last_name}`;
          return (
            <Card
              key={m.id}
              className="gap-2"
              onPress={editable ? () => router.push({ pathname: '/familia/[id]/miembro/[memberId]', params: { id: f.id, memberId: m.id } }) : undefined}
            >
              <View className="flex-row items-center gap-3">
                <Avatar name={name} size="sm" />
                <View className="flex-1">
                  <Text variant="label">{name}</Text>
                  <Text variant="caption">
                    {[
                      m.relationship ? label(relationshipLabels, m.relationship) : null,
                      age != null ? `${age} ${age === 1 ? 'año' : 'años'}` : m.age_group ? label(ageGroupLabels, m.age_group) : null,
                      m.document_number ? `DNI ${m.document_number}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {m.is_head_of_household ? <Badge label="Referente" tone="accent" size="sm" /> : null}
                {m.status === 'inactivo' ? <Badge label="Inactivo" tone="muted" size="sm" /> : null}
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

      {editable ? (
        <>
          <Button
            title="Agregar persona"
            icon={UserPlus}
            variant="outline"
            onPress={() => router.push({ pathname: '/familia/[id]/miembro/nuevo', params: { id: f.id } })}
          />
          <SectionHeader title="Estado de la familia" />
          <View className="gap-2">
            {f.status === 'inactiva' ? (
              <Button title="Reactivar familia" icon={RotateCcw} variant="secondary" onPress={() => setConfirmStatus('activa')} />
            ) : (
              <Button title="Pasar a inactiva" icon={UserMinus} variant="outline" onPress={() => setConfirmStatus('inactiva')} />
            )}
            <Button title="Dar de baja la familia" icon={Trash2} variant="ghost" onPress={() => setConfirmDelete(true)} />
          </View>
        </>
      ) : (
        <Text variant="caption" className="text-center">
          Para corregir datos de una familia, comunicate con el Banco de Alimentos.
        </Text>
      )}

      <ConfirmDialog
        visible={confirmStatus !== null}
        title={confirmStatus === 'activa' ? '¿Reactivar la familia?' : '¿Pasar la familia a inactiva?'}
        message={
          confirmStatus === 'activa'
            ? 'Vuelve a contar en el resumen de la organización (personas y beneficiarios).'
            : 'Sigue en el listado como inactiva y deja de contar en el resumen de la organización (personas y beneficiarios). La podés reactivar cuando quieras.'
        }
        confirmLabel={confirmStatus === 'activa' ? 'Reactivar' : 'Pasar a inactiva'}
        loading={update.isPending}
        onConfirm={() => confirmStatus && onStatus(confirmStatus)}
        onCancel={() => setConfirmStatus(null)}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title="¿Dar de baja la familia?"
        message={`Se borra ${f.name} con sus integrantes. Si tiene entregas registradas no se puede borrar: en ese caso, pasala a inactiva.`}
        confirmLabel="Dar de baja"
        destructive
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        visible={blocked !== null}
        title="No se puede borrar"
        message={`${blocked ?? ''} Podés pasarla a inactiva: sigue en el listado y deja de contar en el resumen de la organización.`}
        confirmLabel="Pasar a inactiva"
        loading={update.isPending}
        onConfirm={() => onStatus('inactiva')}
        onCancel={() => setBlocked(null)}
      />
    </Screen>
  );
}
