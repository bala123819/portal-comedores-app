import '../global.css';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/ui';
import { useSession } from '@/features/auth/store';
import { env } from '@/lib/env';
import { mockHandler } from '@/mocks/handler';
import { apiConfig } from '@/services/api/client';
import { wireNetworkAndFocus } from '@/services/network';
import { persister, queryClient, shouldPersistQuery } from '@/services/query-client';
import { colors } from '@/theme/tokens';

if (env.useMocks) apiConfig.setMockHandler(mockHandler);
wireNetworkAndFocus();
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const status = useSession((s) => s.status);
  const hasOrganization = useSession((s) => s.hasOrganization);
  const hydrate = useSession((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          buster: 'v1',
          dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
        }}
      >
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {status === 'loading' ? null : (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Protected guard={status === 'signedIn' && hasOrganization}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={status === 'signedOut'}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Protected guard={status === 'signedIn' && !hasOrganization}>
                <Stack.Screen name="sin-organizacion" />
              </Stack.Protected>
              <Stack.Protected guard={__DEV__}>
                <Stack.Screen name="dev" />
              </Stack.Protected>
            </Stack>
          )}
          <ToastHost />
        </View>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
