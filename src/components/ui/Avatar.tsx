import { Image } from 'expo-image';
import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { Text } from './Text';

const sizes = { sm: 36, md: 48, lg: 64 } as const;

export function Avatar({
  name,
  uri,
  size = 'md',
  className,
}: {
  name: string;
  uri?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const px = sizes[size];
  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-full bg-accent', className)}
      style={{ width: px, height: px }}
      accessibilityLabel={name}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: px, height: px, borderRadius: px / 2 }} contentFit="cover" />
      ) : (
        <Text className={cn('font-bold text-accent-foreground', size === 'lg' ? 'text-xl' : 'text-base')}>
          {initials(name) || '?'}
        </Text>
      )}
    </View>
  );
}
