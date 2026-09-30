import { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={{ opacity }}>
      <View className={cn('rounded-md bg-muted', className)} />
    </Animated.View>
  );
}

/** Esqueleto de lista de tarjetas */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-3" accessibilityLabel="Cargando" accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="gap-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </View>
      ))}
    </View>
  );
}
