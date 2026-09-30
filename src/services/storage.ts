/**
 * Storage nativo: secretos (token) en expo-secure-store; el resto en AsyncStorage.
 * La versión web está en `storage.web.ts` con la misma interfaz.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  async getSecure(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setSecure(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async removeSecure(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

export const STORAGE_KEYS = {
  token: 'pc.token',
  tokenIssuedAt: 'pc.tokenIssuedAt',
  queryCache: 'pc.queryCache',
  prefs: 'pc.prefs',
} as const;
