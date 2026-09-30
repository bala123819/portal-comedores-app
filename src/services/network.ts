import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

let wired = false;

/** Conecta React Query con el estado de red y el foco de la app (una sola vez). */
export function wireNetworkAndFocus() {
  if (wired) return;
  wired = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false);
    }),
  );

  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
  }
}

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  return online;
}
