import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { UseInfiniteQueryResult, UseQueryResult, InfiniteData } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, useWindowDimensions, View } from 'react-native';
import { useContentPadding } from '@/lib/layout';
import type { Page } from '@/services/api/types';
import { colors, layout } from '@/theme/tokens';
import { SkeletonList } from './Skeleton';
import { EmptyState, ErrorState } from './States';

/**
 * Siempre cuatro estados: cargando (skeleton), error (reintentar), vacío (mensaje + acción) y datos.
 */
export function QueryView<T>({
  query,
  children,
  skeleton,
  empty,
  isEmpty,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
}) {
  if (query.isPending) return <>{skeleton ?? <SkeletonList count={3} />}</>;
  if (query.isError && query.data === undefined)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data as T;
  if (empty && (isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0)) {
    return <>{empty}</>;
  }
  return <>{children(data)}</>;
}

export function flattenPages<T>(data: InfiniteData<Page<T>> | undefined): T[] {
  return data?.pages.flatMap((p) => p.items) ?? [];
}

/** Lista paginada infinita (FlashList + meta de la API) con los cuatro estados. */
export function InfiniteList<T extends { id: string }>({
  query,
  renderItem,
  header,
  emptyTitle,
  emptyMessage,
  emptyAction,
}: {
  query: UseInfiniteQueryResult<InfiniteData<Page<T>>>;
  renderItem: ListRenderItem<T>;
  header?: ReactElement;
  emptyTitle: string;
  emptyMessage?: string;
  emptyAction?: { label: string; onPress: () => void };
}) {
  const items = flattenPages(query.data);
  const contentPadding = useContentPadding();
  // En pantallas anchas las tarjetas van en 2 columnas para no quedar estiradas.
  const { width } = useWindowDimensions();
  const columns = width >= layout.twoColumnsFrom ? 2 : 1;
  const gutter = 6;

  const listEmpty = query.isPending ? (
    <SkeletonList />
  ) : query.isError ? (
    <ErrorState error={query.error} onRetry={() => query.refetch()} />
  ) : (
    <EmptyState
      title={emptyTitle}
      message={emptyMessage}
      actionLabel={emptyAction?.label}
      onAction={emptyAction?.onPress}
    />
  );

  return (
    <FlashList
      key={columns}
      data={items}
      numColumns={columns}
      renderItem={
        columns > 1
          ? (info) => <View style={{ paddingHorizontal: gutter }}>{renderItem(info)}</View>
          : renderItem
      }
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        header && columns > 1 ? <View style={{ paddingHorizontal: gutter }}>{header}</View> : header
      }
      ListEmptyComponent={listEmpty}
      ItemSeparatorComponent={() => <View className="h-3" />}
      contentContainerStyle={{
        padding: 16,
        paddingHorizontal: columns > 1 ? contentPadding - gutter : contentPadding,
        paddingBottom: 32,
      }}
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
          onRefresh={() => void query.refetch()}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    />
  );
}
