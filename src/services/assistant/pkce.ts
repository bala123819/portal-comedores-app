import * as Crypto from 'expo-crypto';

/**
 * PKCE para la sesión del asistente: `verifier` = 32 bytes al azar en base64url (43 caracteres)
 * y `challenge` = base64url(SHA-256(verifier)). El contrato usa `Buffer`, que no existe en
 * React Native: el base64 se arma a mano.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : '=';
  }
  return out;
}

export const toBase64Url = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = toBase64Url(bytesToBase64(Crypto.getRandomBytes(32)));
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return { verifier, challenge: toBase64Url(digest) };
}
