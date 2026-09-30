import { CheckCircle2, CircleAlert, Clock, Download, FileSignature, FileText } from 'lucide-react-native';
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
import { useOrgId } from '@/features/org/hooks';
import type { SocialData } from '@/features/org/types';
import { formatDate } from '@/lib/format';
import { label, orgDocumentTypeLabels, requirementStatusLabels, socialDataLabels } from '@/lib/labels';
import { organizationsApi } from '@/services/api/endpoints';
import { humanMessage, isApiError } from '@/services/api/errors';
import { downloadAndOpen } from '@/services/download';
import { colors, type Tone } from '@/theme/tokens';

function requirementTone(status?: string | null): { tone: Tone; icon: typeof Clock } {
  if (!status) return { tone: 'muted', icon: Clock };
  if (/aprob|present|vigente|ok/.test(status)) return { tone: 'success', icon: CheckCircle2 };
  if (/venc|rechaz|falt/.test(status)) return { tone: 'destructive', icon: CircleAlert };
  return { tone: 'warning', icon: Clock };
}

const yesNo = (v?: boolean | null) => (v == null ? null : v ? 'Sí' : 'No');

function socialRows(d: SocialData | undefined): [string, string][] {
  const f = d?.organization_fields;
  if (!f) return [];
  const list = (v?: string[] | null) => (v?.length ? v.map((x) => label(socialDataLabels, x)).join(', ') : null);
  const rows: [string, string | null | undefined][] = [
    ['Nombre de fantasía', f.fantasy_name],
    ['Año de fundación', f.founding_year ? String(f.founding_year) : null],
    ['Personería jurídica', yesNo(f.has_legal_status)],
    ['Entrega viandas', yesNo(f.delivers_viandas)],
    ['Genera ingresos propios', yesNo(f.generates_own_income)],
    ['Fuentes de ingreso', list(f.income_methods)],
    ['Agua', f.water_source ? label(socialDataLabels, f.water_source) : null],
    ['Tiene baño', yesNo(f.has_bathroom)],
    ['Cocinan con', list(f.cooking_sources)],
    ['El lugar es', f.property_ownership ? label(socialDataLabels, f.property_ownership) : null],
    ['Guardan los alimentos en', list(f.storage_methods)],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

export default function DocumentacionScreen() {
  const orgId = useOrgId();
  const requirements = useRequirements(orgId);
  const documents = useDocuments(orgId);
  const social = useSocialData(orgId);
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (key: string, path: string, filename: string) => {
    setDownloading(key);
    try {
      await downloadAndOpen(path, filename);
    } catch (e) {
      toast.error(
        isApiError(e) && e.kind === 'not_found' && key === 'terms'
          ? 'La carta compromiso todavía no fue aceptada.'
          : humanMessage(e),
      );
    } finally {
      setDownloading(null);
    }
  };

  const rows = socialRows(social.data);

  return (
    <Screen header={<Header title="Documentación" back backFallback="/mas" />}>
      <SectionHeader title="Papeles que pide el Banco" />
      {requirements.isPending ? (
        <SkeletonList count={2} />
      ) : requirements.isError ? (
        <ErrorState error={requirements.error} onRetry={() => requirements.refetch()} />
      ) : requirements.data?.length ? (
        <View className="gap-2">
          {requirements.data.map((r, i) => {
            const t = requirementTone(r.status);
            return (
              <Card key={r.id ?? `${r.document_type}-${i}`} className="gap-2">
                <Text variant="label">{r.label || label(orgDocumentTypeLabels, r.document_type)}</Text>
                <View className="flex-row flex-wrap gap-2">
                  <Badge label={r.status ? label(requirementStatusLabels, r.status) : 'Sin estado'} tone={t.tone} icon={t.icon} size="sm" />
                  {r.is_required ? <Badge label="Obligatorio" tone="muted" size="sm" /> : null}
                  {r.has_expiration ? <Badge label="Vence" tone="muted" size="sm" /> : null}
                </View>
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
          {documents.data.map((d) => (
            <Card key={d.id} className="gap-2">
              <View className="flex-row items-center gap-2">
                <FileText size={20} color={colors.mutedForeground} />
                <Text variant="label" className="flex-1">
                  {d.document_name || label(orgDocumentTypeLabels, d.document_type)}
                </Text>
              </View>
              <Text variant="caption">
                {[label(orgDocumentTypeLabels, d.document_type), d.expires_at ? `Vence ${formatDate(d.expires_at)}` : null].filter(Boolean).join(' · ')}
              </Text>
              {orgId ? (
                <Button
                  title="Descargar"
                  icon={Download}
                  variant="outline"
                  size="sm"
                  className="self-start"
                  loading={downloading === d.id}
                  onPress={() => download(d.id, organizationsApi.documentDownloadPath(orgId, d.id), d.document_name || `${d.document_type}.pdf`)}
                />
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <Text tone="muted">No hay documentos presentados.</Text>
      )}

      <SectionHeader title="Carta compromiso" />
      <Card className="gap-2">
        <View className="flex-row items-center gap-2">
          <FileSignature size={20} color={colors.mutedForeground} />
          <Text className="flex-1">Si ya la aceptaron, podés descargar la copia firmada.</Text>
        </View>
        {orgId ? (
          <Button
            title="Descargar carta compromiso"
            icon={Download}
            variant="outline"
            size="sm"
            className="self-start"
            loading={downloading === 'terms'}
            onPress={() => download('terms', organizationsApi.termsPdfPath(orgId), 'carta-compromiso.pdf')}
          />
        ) : null}
      </Card>

      {!social.isError || !isApiError(social.error) || social.error.kind !== 'forbidden' ? (
        <>
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
              <Text variant="caption">Para corregir estos datos, comunicate con el Banco.</Text>
            </Card>
          ) : (
            <Text tone="muted">La ficha social todavía no está cargada.</Text>
          )}
        </>
      ) : null}
    </Screen>
  );
}
