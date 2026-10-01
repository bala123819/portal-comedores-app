import { DemographicsSummary } from '@/components/familias/DemographicsSummary';
import { ErrorState, Header, Screen, SkeletonList, Text } from '@/components/ui';
import { useDemographics } from '@/features/familias/hooks';

export default function ResumenFamiliasScreen() {
  const q = useDemographics();
  return (
    <Screen header={<Header title="Resumen de familias" back backFallback="/familias" />} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      {q.data ? (
        <>
          <DemographicsSummary data={q.data} />
          <Text variant="caption">
            “Equivalente en adultos” pondera a cada persona según su necesidad nutricional (un bebé cuenta menos, una embarazada más). El Banco lo usa para calcular la cuota mensual.
          </Text>
        </>
      ) : q.isPending ? (
        <SkeletonList count={3} />
      ) : (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      )}
    </Screen>
  );
}
