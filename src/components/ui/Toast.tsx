import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const useToastStore = create<{ items: ToastItem[]; remove: (id: number) => void }>((set) => ({
  items: [],
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

let counter = 0;
function push(message: string, tone: ToastTone) {
  const id = ++counter;
  useToastStore.setState((s) => ({ items: [...s.items.slice(-2), { id, message, tone }] }));
}

export const toast = {
  success: (message: string) => push(message, 'success'),
  error: (message: string) => push(message, 'error'),
  info: (message: string) => push(message, 'info'),
};

const toneStyle: Record<ToastTone, { cls: string; icon: typeof Info; color: string }> = {
  success: { cls: 'bg-foreground', icon: CheckCircle2, color: colors.success },
  error: { cls: 'bg-destructive', icon: AlertCircle, color: colors.primaryForeground },
  info: { cls: 'bg-foreground', icon: Info, color: colors.accent },
};

function ToastView({ item }: { item: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  useEffect(() => {
    const t = setTimeout(() => remove(item.id), item.tone === 'error' ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [item, remove]);
  const s = toneStyle[item.tone];
  const Icon = s.icon;
  return (
    <Pressable
      onPress={() => remove(item.id)}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      className={cn('w-full flex-row items-center gap-3 rounded-xl px-4 py-3 shadow-lg', s.cls)}
    >
      <Icon size={22} color={s.color} />
      <Text className="flex-1 text-base text-primary-foreground">{item.message}</Text>
    </Pressable>
  );
}

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const insets = useSafeAreaInsets();
  if (!items.length) return null;
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center gap-2 px-4"
      style={{ bottom: insets.bottom + 80 }}
    >
      <View className="w-full max-w-md gap-2">
        {items.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </View>
    </View>
  );
}
