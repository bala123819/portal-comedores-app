import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Text } from '@/components/ui';
import { useMemberSearch } from '@/features/familias/hooks';

/**
 * Avisa si el DNI ya está cargado en otra familia de la organización
 * (`GET /org/families/members/search`). La API igual lo rechaza con 422: esto evita llegar a eso.
 */
export function DniHint({ dni, excludeMemberId }: { dni: string | undefined; excludeMemberId?: string }) {
  const [debounced, setDebounced] = useState(dni ?? '');
  // Debounce: no disparar un pedido por tecla (límite de 60/min).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(dni ?? ''), 600);
    return () => clearTimeout(t);
  }, [dni]);

  const q = useMemberSearch(debounced);
  const m = q.data?.found ? q.data.member : undefined;
  if (!m || m.id === excludeMemberId) return null;

  return (
    <Card tone="warning" className="gap-2">
      <Text className="text-sm">
        {m.first_name} {m.last_name} ya está registrada en la familia {m.family.name}
        {m.family.code ? ` (${m.family.code})` : ''}. Una persona no puede estar en dos familias.
      </Text>
      <View className="flex-row">
        <Button
          title="Ver esa familia"
          variant="outline"
          size="sm"
          onPress={() => router.push({ pathname: '/familia/[id]', params: { id: m.family.id } })}
        />
      </View>
    </Card>
  );
}
