/**
 * Web Push para la PWA: registra la suscripción del navegador en `POST /notifications/subscribe`
 * (endpoint + keys.p256dh + keys.auth). Requiere la clave pública VAPID del Banco
 * (EXPO_PUBLIC_VAPID_PUBLIC_KEY), que la API todavía no expone (G-06).
 */
import { env } from '@/lib/env';
import { newIdempotencyKey } from './api/idempotency';
import { notificationsApi } from './api/endpoints';

export type PushStatus = 'unsupported' | 'unconfigured' | 'denied' | 'subscribed' | 'available';

function supported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function toBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register('/sw.js');
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supported()) return 'unsupported';
  if (!env.vapidPublicKey) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await registration();
  return (await reg.pushManager.getSubscription()) ? 'subscribed' : 'available';
}

export async function enablePush(): Promise<PushStatus> {
  const status = await getPushStatus();
  if (status !== 'available') return status;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = await registration();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey),
  });
  await notificationsApi.subscribe(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: toBase64Url(sub.getKey('p256dh')), auth: toBase64Url(sub.getKey('auth')) },
      device_type: 'web',
      browser: navigator.userAgent.includes('Chrome') ? 'chrome' : navigator.userAgent.includes('Firefox') ? 'firefox' : 'otro',
      os: navigator.userAgent.includes('Android') ? 'Android' : navigator.userAgent.includes('iPhone') ? 'iOS' : 'otro',
    },
    newIdempotencyKey(),
  );
  return 'subscribed';
}

export async function disablePush(): Promise<void> {
  if (!supported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await notificationsApi.unsubscribe(sub.endpoint, newIdempotencyKey());
  await sub.unsubscribe();
}
