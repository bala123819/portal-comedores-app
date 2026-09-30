import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ChefHat, Search, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { RecipeCard } from '@/components/recetas/RecipeCard';
import { Button, Chip, EmptyState, Header, Input, SkeletonList } from '@/components/ui';
import { useCategorias, useRecetas } from '@/features/recetas/hooks';

export default function RecetasScreen() {
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const recetas = useRecetas({ search, categoria });
  const categorias = useCategorias();

  return (
    <View className="flex-1 bg-background">
      <Header title="Recetas" subtitle="Ideas para cocinar con lo que tenés" />
      <View className="w-full max-w-content flex-1 self-center">
        <FlashList
          data={recetas.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            <View className="gap-3 pb-3">
              <Button
                title="¿Qué cocino con lo que tengo?"
                icon={Sparkles}
                onPress={() => router.push('/sugerir-recetas')}
              />
              <Input
                icon={Search}
                placeholder="Buscar por nombre o ingrediente"
                value={search}
                onChangeText={setSearch}
                accessibilityLabel="Buscar recetas"
                returnKeyType="search"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                <Chip label="Todas" selected={!categoria} onPress={() => setCategoria(null)} />
                {(categorias.data ?? []).map((c) => (
                  <Chip key={c} label={c} selected={categoria === c} onPress={() => setCategoria(c)} />
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            recetas.isPending ? (
              <SkeletonList />
            ) : (
              <EmptyState
                icon={ChefHat}
                title="No encontramos recetas"
                message="Probá con otra palabra o sacá los filtros."
                actionLabel="Ver todas"
                onAction={() => {
                  setSearch('');
                  setCategoria(null);
                }}
              />
            )
          }
          renderItem={({ item }) => (
            <RecipeCard receta={item} onPress={() => router.push({ pathname: '/receta/[id]', params: { id: item.id } })} />
          )}
        />
      </View>
    </View>
  );
}
