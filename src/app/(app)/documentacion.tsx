import { BadgeCheck, CheckCircle2, CircleAlert, Clock, Download, FileSignature, FileText } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Header,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
  toast,
} from '@/components/ui';
import { useDocuments, useRequirements, useSocialData } from '@/features/documentacion/hooks';
import type { DocumentRequirement, OrganizationDocument, SocialData } from '@/features/org/types';
import { formatDate } from '@/lib/format';
import { label, orgDocumentTypeLabels, requirementStatusLabels, socialDataLabels } from '@/lib/labels';
import { orgApi } from '@/services/api/endpoints';
import { humanMessage, isApiError } from '@/services/api/errors';
import { downloadAndOpen } from '@/services/download';
import { colors, type Tone } from '@/theme/tokens';

/** `status` de `/org/requirements` llega en inglés (`missing`); se aceptan también los nombres en español */
function requirementTone(status?: string | null): { tone: Tone; icon: typeof Clock } {
  if (!status) return { tone: 'muted', icon: Clock };
  if (/aprob|present|vigente|verif|approv|upload|submit|ok/.test(status)) return { tone: 'success', icon: CheckCircle2 };
  if (/venc|rechaz|falt|miss|expir|reject/.test(status)) return { tone: 'destructive', icon: CircleAlert };
  return { tone: 'warning', icon: Clock };
}

function documentBadge(d: OrganizationDocument): { label: string; tone: Tone; icon: typeof Clock } {
  if (d.is_expired) return { label: 'Vencido', tone: 'destructive', icon: CircleAlert };
  if (d.is_verified) return { label: 'Verificado por el Banco', tone: 'success', icon: BadgeCheck };
  return { label: 'Falta que el Banco lo verifique', tone: 'warning', icon: Clock };
}

function fileSize(bytes?: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function fileName(d: OrganizationDocument): string {
  const base = d.document_name || label(orgDocumentTypeLabels, d.document_type);
  return /\.\w{2,4}$/.test(base) || d.mime_type !== 'application/pdf' ? base : `${base}.pdf`;
}

const byOrder = (a: DocumentRequirement, b: DocumentRequirement) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

const yesNo = (v?: boolean | null) => (v == null ? null : v ? 'Sí' : 'No');

function socialRows(d: SocialData | undefined): [string, string][] {
  const f = d?.fields;
  if (!f) return [];
  const list = (v?: string[] | null) => (v?.length ? v.map((x) => label(socialDataLabels, x)).join(', ') : null);
  // Los booleanos sólo se muestran en `true`: en una ficha sin relevar llegan todos en `false`
  const yes = (v?: boolean | null) => (v ? yesNo(v) : null);
  const rows: [string, string | null | undefined][] = [
    ['Nombre de fantasía', f.fantasy_name],
    ['Año de fundación', f.founding_year ? String(f.founding_year) : null],
    ['Personería jurídica', f.has_legal_status ? ['Sí', f.legal_status_type].filter(Boolean).join(' · ') : null],
    ['Entrega viandas', f.delivers_viandas ? ['Sí', f.viandas_notes].filter(Boolean).join(' · ') : null],
    ['Genera ingresos propios', yes(f.generates_own_income)],
    ['Fuentes de ingreso', list(f.income_methods)],
    ['Agua', f.water_source ? label(socialDataLabels, f.water_source) : null],
    ['Tiene baño', yes(f.has_bathroom)],
    ['Cocinan con', list(f.cooking_sources)],
    ['El lugar es', f.property_ownership ? label(socialDataLabels, f.property_ownership) : null],
    ['Guardan los alimentos en', list(f.storage_methods)],
    ['Relevada por', f.interviewed_by],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

export default function DocumentacionScreen() {
  const requirements = useRequirements();
  const documents = useDocuments();
  const social = useSocialData();
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (d: OrganizationDocument) => {
    setDownloading(d.id);
    try {
      await downloadAndOpen(orgApi.documentDownloadPath(d.id), fileName(d));
    } catch (e) {
      toast.error(
        isApiError(e) && e.code === 'DOCUMENT_NOT_FOUND'
          ? 'El Banco todavía no tiene el archivo de este documento. Avisales para que lo vuelvan a subir.'
          : humanMessage(e),
      );
    } finally {
      setDownloading(null);
    }
  };

  const rows = socialRows(social.data);
  const termsAcceptedAt = social.data?.fields?.terms_accepted_at;
  const reqs = [...(requirements.data ?? [])].sort(byOrder);
  const missing = reqs.filter((r) => r.is_required && requirementTone(r.status).tone === 'destructive').length;

  return (
    <Screen
      header={<Header title="Documentación" back backFallback="/mas" />}
      refreshing={requirements.isRefetching || documents.isRefetching}
      onRefresh={() => {
        void requirements.refetch();
        void documents.refetch();
        void social.refetch();
      }}
    >
      <SectionHeader title="Papeles que pide el Banco" />
      {requirements.isPending ? (
        <SkeletonList count={2} />
      ) : requirements.isError ? (
        <ErrorState error={requirements.error} onRetry={() => requirements.refetch()} />
      ) : reqs.length ? (
        <View className="gap-2">
          {missing ? (
            <Card tone="warning">
              <Text className="text-sm">
                {missing === 1 ? 'Falta presentar 1 papel obligatorio.' : `Faltan presentar ${missing} papeles obligatorios.`} Los papeles se
                entregan al Banco de Alimentos; cuando los cargue, aparecen acá.
              </Text>
            </Card>
          ) : null}
          {reqs.map((r, i) => {
            const t = requirementTone(r.status);
            return (
              <Card key={r.id ?? `${r.document_type}-${i}`} className="gap-2">
                <Text variant="label">{r.label || label(orgDocumentTypeLabels, r.document_type)}</Text>
                <View className="flex-row flex-wrap gap-2">
                  <Badge label={r.status ? label(requirementStatusLabels, r.status) : 'Sin estado'} tone={t.tone} icon={t.icon} size="sm" />
                  {r.is_required ? <Badge label="Obligatorio" tone="muted" size="sm" /> : null}
                  {r.has_expiration ? <Badge label="Vence" tone="muted" size="sm" /> : null}
                </View>
                {r.document?.expires_at ? <Text variant="caption">Vence el {formatDate(r.document.expires_at)}</Text> : null}
                {r.notes ? <Text variant="caption">{r.notes}</Text> : null}
              </Card>
            );
          })}
        </View>
      ) : (
        <Text tone="muted">No hay requerimientos cargados.</Text>
      )}

      <SectionHeader title="Documentos presentados" />
      {documents.isPending ? (
        <SkeletonList count={1} />
      ) : documents.isError ? (
        <ErrorState error={documents.error} onRetry={() => documents.refetch()} />
      ) : documents.data?.length ? (
        <View className="gap-2">
          {documents.data.map((d) => {
            const b = documentBadge(d);
            return (
              <Card key={d.id} className="gap-2">
                <View className="flex-row items-center gap-2">
                  <FileText size={20} color={colors.mutedForeground} />
                  <Text variant="label" className="flex-1">
                    {d.document_name || label(orgDocumentTypeLabels, d.document_type)}
                  </Text>
                </View>
                <Badge label={b.label} tone={b.tone} icon={b.icon} size="sm" className="self-start" />
                <Text variant="caption">
                  {[
                    label(orgDocumentTypeLabels, d.document_type),
                    d.expires_at ? `${d.is_expired ? 'Venció' : 'Vence'} el ${formatDate(d.expires_at)}` : null,
                    fileSize(d.file_size),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Button
                  title="Descargar"
                  icon={Download}
                  variant="outline"
                  size="sm"
                  className="self-start"
                  loading={downloading === d.id}
                  onPress={() => download(d)}
                />
              </Card>
            );
          })}
        </View>
      ) : (
        <Text tone="muted">No hay documentos presentados.</Text>
      )}

      <SectionHeader title="Carta compromiso" />
      <Card className="gap-2">
        <View className="flex-row items-center gap-2">
          <FileSignature size={20} color={colors.mutedForeground} />
          <Text className="flex-1">
            {termsAcceptedAt
              ? `La aceptaron el ${formatDate(termsAcceptedAt)}.`
              : social.isPending
                ? 'Consultando…'
                : 'Todavía no figura como aceptada. Consultá con el Banco cómo firmarla.'}
          </Text>
        </View>
      </Card>

      <SectionHeader title="Ficha social" />
      {social.isPending ? (
        <SkeletonList count={1} />
      ) : social.isError ? (
        <ErrorState error={social.error} onRetry={() => social.refetch()} />
      ) : rows.length ? (
        <Card className="gap-3">
          {rows.map(([k, v]) => (
            <View key={k} className="gap-0.5">
              <Text variant="caption">{k}</Text>
              <Text>{v}</Text>
            </View>
          ))}
          <Text variant="caption">La ficha la completa el Banco en la visita. Para corregir algo, comunicate con el Banco.</Text>
        </Card>
      ) : (
        <Text tone="muted">El Banco todavía no cargó la ficha social de la organización.</Text>
      )}
    </Screen>
  );
}
