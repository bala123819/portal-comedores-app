import { CalendarCheck, CalendarDays, Clock, GraduationCap, MapPin, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Header,
  InfoRow,
  Screen,
  SegmentedControl,
  SkeletonList,
  StatCard,
  StatusBadge,
  Text,
} from '@/components/ui';
import { statsFromObject } from '@/features/nutricion/summary';
import { useOrgId } from '@/features/org/hooks';
import {
  useCollectionCommitments,
  useCollectionSessions,
  useConfirmSession,
  usePrograms,
  useTrainings,
} from '@/features/programas/hooks';
import type { CollectionSession } from '@/features/programas/types';
import { formatDateTime, formatDay, formatNumber } from '@/lib/format';
import { frequencyLabels, label, programTypeLabels } from '@/lib/labels';

function Jornadas() {
  const orgId = useOrgId();
  const year = new Date().getFullYear();
  const sessions = useCollectionSessions(orgId);
  const commitments = useCollectionCommitments(orgId, year);
  const confirm = useConfirmSession();
  const [toConfirm, setToConfirm] = useState<CollectionSession | null>(null);
  const stats = statsFromObject(commitments.data, ['year']);

  return (
    <View className="gap-3">
      {stats.length ? (
        <>
          <Text variant="heading">Compromisos {year}</Text>
          <View className="flex-row flex-wrap gap-3">
            {stats.slice(0, 3).map((s) => (
              <StatCard key={s.key} label={s.label} value={formatNumber(s.value)} />
            ))}
          </View>
        </>
      ) : null}
      <Text variant="heading">Jornadas de recolección</Text>
      {sessions.isPending ? (
        <SkeletonList count={2} />
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
      ) : sessions.data.length ? (
        sessions.data.map((s) => (
          <Card key={s.id} className="gap-3">
            <StatusBadge kind="session" status={s.status} size="sm" />
            <Text variant="label">{s.program?.name ?? 'Jornada de recolección'}</Text>
            <InfoRow icon={CalendarDays} label="Fecha" value={formatDay(s.session_date)} />
            {s.volunteers_count ? <InfoRow icon={UserRound} label="Voluntarios previstos" value={String(s.volunteers_count)} /> : null}
            {s.notes ? <Text className="text-sm">{s.notes}</Text> : null}
            {s.status === 'programada' ? (
              <Button title="Confirmar asistencia" icon={CalendarCheck} variant="secondary" onPress={() => setToConfirm(s)} />
            ) : null}
          </Card>
        ))
      ) : (
        <EmptyState icon={CalendarDays} title="No hay jornadas programadas" message="Cuando el Banco programe una jornada con ustedes, aparece acá." />
      )}
      <ConfirmDialog
        visible={!!toConfirm}
        title="¿Confirmás que van a asistir?"
        message={toConfirm ? `Jornada del ${formatDay(toConfirm.session_date)}. El Banco cuenta con ustedes.` : undefined}
        confirmLabel="Sí, vamos"
        loading={confirm.isPending}
        onCancel={() => setToConfirm(null)}
        onConfirm={() => toConfirm && confirm.mutate(toConfirm.id, { onSuccess: () => setToConfirm(null) })}
      />
    </View>
  );
}

function Talleres() {
  const programs = usePrograms();
  const [programId, setProgramId] = useState<string | null>(null);
  const selected = programId ?? programs.data?.[0]?.id ?? null;
  const trainings = useTrainings(selected);

  if (programs.isPending) return <SkeletonList count={2} />;
  if (programs.isError) return <ErrorState error={programs.error} onRetry={() => programs.refetch()} />;
  if (!programs.data.length)
    return <EmptyState icon={GraduationCap} title="No hay programas" message="Todavía no participan de programas del Banco." />;

  const program = programs.data.find((p) => p.id === selected);
  return (
    <View className="gap-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {programs.data.map((p) => (
          <Chip key={p.id} label={p.name} selected={p.id === selected} onPress={() => setProgramId(p.id)} />
        ))}
      </ScrollView>
      {program ? (
        <Text variant="caption">
          {[program.program_type ? label(programTypeLabels, program.program_type) : null, program.frequency ? label(frequencyLabels, program.frequency) : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      {trainings.isPending ? (
        <SkeletonList count={1} />
      ) : trainings.isError ? (
        <ErrorState error={trainings.error} onRetry={() => trainings.refetch()} />
      ) : trainings.data?.length ? (
        trainings.data.map((t) => (
          <Card key={t.id} className="gap-3">
            <Text variant="label">{t.title}</Text>
            {t.description ? <Text className="text-sm">{t.description}</Text> : null}
            <InfoRow icon={CalendarDays} label="Cuándo" value={formatDateTime(t.scheduled_at)} />
            <InfoRow icon={Clock} label="Duración" value={t.duration_minutes ? `${t.duration_minutes} minutos` : null} />
            <InfoRow icon={MapPin} label="Dónde" value={t.location} />
            <InfoRow icon={UserRound} label="A cargo de" value={t.facilitator_name} />
          </Card>
        ))
      ) : (
        <EmptyState icon={GraduationCap} title="No hay talleres en este programa" />
      )}
    </View>
  );
}

export default function JornadasScreen() {
  const [tab, setTab] = useState<'jornadas' | 'talleres'>('jornadas');
  return (
    <Screen header={<Header title="Jornadas y talleres" back backFallback="/mas" />}>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Jornadas', value: 'jornadas' },
          { label: 'Talleres', value: 'talleres' },
        ]}
      />
      {tab === 'jornadas' ? <Jornadas /> : <Talleres />}
    </Screen>
  );
}
