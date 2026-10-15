import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ArrowRight, PackageSearch, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { CatalogItem } from '@/components/pedidos/CatalogItem';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  flattenPages,
  Header,
  Input,
  Screen,
  SkeletonList,
  Text,
  toast,
} from '@/components/ui';
import { cartKg, cartLines, useCart } from '@/features/pedidos/cart';
import { useCatalog } from '@/features/pedidos/hooks';
import { ORDER_RULES, type CatalogProduct } from '@/features/pedidos/types';
import { formatNumber } from '@/lib/format';
import { colors } from '@/theme/tokens';

/**
 * Paso 1 del pedido: elegir productos del catálogo del Banco (`GET /org/catalog`).
 * El catálogo no muestra stock, sólo si hay (`disponible`) o quedan pocas (`poco_stock`).
 */
export default function NuevoPedidoScreen() {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  // Debounce de la búsqueda: no disparar un pedido por tecla (límite de 60/min).
  useEffect(() => {
    const t = setTimeout(() => setSearch(text), 500);
    return () => clearTimeout(t);
  }, [text]);

  const query = useCatalog({ search });
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);

  const products = flattenPages(query.data);
  // Categorías a partir de lo cargado: la API no tiene un listado de categorías para este rol.
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) if (p.category) map.set(p.category.id, p.category.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);
  const visible = category ? products.filter((p) => p.category?.id === category) : products;

  const selected = cartLines(lines);
  const kg = cartKg(selected);

  const onChange = (product: CatalogProduct, quantity: number) => {
    if (!setQuantity(product, quantity)) {
      toast.error(`Un pedido puede tener hasta ${ORDER_RULES.maxItems} productos distintos.`);
    }
  };

  const header = (
    <View className="gap-3 pb-3">
      <Text tone="muted">
        Elegí los productos y la cantidad. El Banco revisa el pedido y decide las cantidades al
        aprobarlo.
      </Text>
      <Input
        icon={Search}
        placeholder="Buscar producto"
        value={text}
        onChangeText={setText}
        accessibilityLabel="Buscar producto"
        returnKeyType="search"
      />
      {categories.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          <Chip label="Todo" selected={!category} onPress={() => setCategory(null)} />
          {categories.map(([id, name]) => (
            <Chip
              key={id}
              label={name}
              selected={category === id}
              onPress={() => setCategory(id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const listEmpty = query.isPending ? (
    <SkeletonList />
  ) : query.isError ? (
    <ErrorState error={query.error} onRetry={() => query.refetch()} />
  ) : (
    <EmptyState
      icon={PackageSearch}
      title={
        search || category
          ? 'No encontramos ese producto'
          : 'Por ahora el Banco no tiene productos para pedir'
      }
      message={
        search || category
          ? 'Si no está en el catálogo es porque el Banco no lo tiene. Probá con otro nombre.'
          : 'Volvé a mirar en unos días.'
      }
      actionLabel={search || category ? 'Ver todo el catálogo' : undefined}
      onAction={() => {
        setText('');
        setCategory(null);
      }}
    />
  );

  return (
    <Screen
      scroll={false}
      header={
        <Header
          title="Hacer un pedido"
          subtitle="Catálogo del Banco"
          back
          backFallback="/mercaderia"
        />
      }
      footer={
        <View className="gap-2">
          {selected.length ? (
            <Text variant="caption" className="text-center">
              {selected.length === 1 ? '1 producto' : `${selected.length} productos`} · unos{' '}
              {formatNumber(kg)} kg
            </Text>
          ) : null}
          <Button
            title={selected.length ? 'Revisar pedido' : 'Agregá al menos un producto'}
            iconRight={selected.length ? ArrowRight : undefined}
            size="lg"
            fullWidth
            disabled={!selected.length}
            onPress={() => router.push('/pedido/confirmar')}
          />
        </View>
      }
    >
      <FlashList
        data={visible}
        extraData={lines}
        keyExtractor={(p) => p.product_id}
        renderItem={({ item }) => (
          <CatalogItem
            product={item}
            quantity={lines[item.product_id]?.quantity ?? 0}
            onChange={onChange}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </Screen>
  );
}
