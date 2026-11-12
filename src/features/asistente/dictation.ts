import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule as SpeechModule, ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Dictado para el chat del asistente: la persona habla y el texto aparece en la barra para que lo
 * revise antes de enviarlo. Nunca se envía solo (D-24). Usa el reconocedor del sistema (Google en
 * Android, Siri en iOS, Web Speech API en Chrome/Safari) mediante `expo-speech-recognition`.
 *
 * El módulo nativo no está en Expo Go: ahí (y en navegadores sin la API, como Firefox) `available`
 * es false y el botón del micrófono no se muestra, sin romper la app.
 */

type Module = typeof SpeechModule;

function loadModule(): Module | null {
  try {
    // En nativo, comprobar antes que el módulo exista: si no, importar el paquete tira (Expo Go).
    if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoSpeechRecognition')) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = (require('expo-speech-recognition') as { ExpoSpeechRecognitionModule: Module }).ExpoSpeechRecognitionModule;
    return mod.isRecognitionAvailable() ? mod : null;
  } catch {
    return null;
  }
}

const speech = loadModule();

/** Palabras del dominio para que el reconocedor las prefiera (sobre todo en iOS). */
const CONTEXT = ['comedor', 'merendero', 'Banco de Alimentos', 'merienda', 'lentejas', 'polenta', 'fideos', 'mercadería', 'heladera', 'kilos'];

/** Español rioplatense primero; si el reconocedor no lo tiene, el español más cercano. */
const PREFERRED_LOCALES = ['es-AR', 'es-419', 'es-US', 'es-MX', 'es-ES'];
let chosenLocale: string | null = null;

async function pickLocale(mod: Module): Promise<string> {
  if (chosenLocale) return chosenLocale;
  chosenLocale = 'es-AR';
  // Sólo iOS devuelve la lista completa del reconocedor; en Android la de Google acepta es-AR.
  if (Platform.OS === 'ios') {
    try {
      const { locales } = await mod.getSupportedLocales({});
      const norm = new Set(locales.map((l) => l.replace('_', '-')));
      chosenLocale = PREFERRED_LOCALES.find((l) => norm.has(l)) ?? locales.find((l) => l.startsWith('es')) ?? 'es-AR';
    } catch {
      // Nos quedamos con es-AR.
    }
  }
  return chosenLocale;
}

const ERROR_MESSAGES: Partial<Record<ExpoSpeechRecognitionErrorCode, string>> = {
  'not-allowed': 'Para dictar, permití el uso del micrófono en la configuración del celular.',
  'service-not-allowed': 'El dictado no está disponible en este celular. Revisá que el dictado por voz esté activado.',
  'language-not-supported': 'El dictado en español no está disponible en este celular.',
  network: 'Sin conexión no se puede dictar. Escribí el mensaje o probá de nuevo.',
  'audio-capture': 'No pudimos usar el micrófono. Probá de nuevo.',
  busy: 'El micrófono está ocupado. Probá de nuevo en un momento.',
  interrupted: 'El dictado se cortó (por una llamada o una alarma).',
};

export function dictationErrorMessage(code: ExpoSpeechRecognitionErrorCode): string | null {
  if (code === 'aborted') return null;
  if (code === 'no-speech' || code === 'speech-timeout') {
    return 'No te escuchamos. Tocá el micrófono y hablá cerca del celular.';
  }
  return ERROR_MESSAGES[code] ?? 'No pudimos entender el audio. Probá de nuevo o escribí el mensaje.';
}

export type DictationStatus = 'idle' | 'starting' | 'listening';

/**
 * `onText` recibe todo lo dictado en esta toma (partes ya cerradas + la parte que se está
 * reconociendo), para que la barra lo muestre en vivo. `onError` recibe un mensaje para mostrar.
 */
export function useDictation({ onText, onError }: { onText: (text: string) => void; onError: (message: string) => void }) {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const committed = useRef('');
  const handlers = useRef({ onText, onError });

  useEffect(() => {
    handlers.current = { onText, onError };
  });

  useEffect(() => {
    if (!speech) return;
    const subs = [
      speech.addListener('start', () => setStatus('listening')),
      speech.addListener('end', () => setStatus('idle')),
      speech.addListener('result', (ev) => {
        const piece = ev.results[0]?.transcript?.trim() ?? '';
        if (ev.isFinal) {
          committed.current = join(committed.current, piece);
          handlers.current.onText(committed.current);
        } else {
          handlers.current.onText(join(committed.current, piece));
        }
      }),
      speech.addListener('nomatch', () => {
        if (!committed.current) handlers.current.onError('No te escuchamos. Tocá el micrófono y hablá cerca del celular.');
      }),
      speech.addListener('error', (ev) => {
        const msg = dictationErrorMessage(ev.error);
        if (msg) handlers.current.onError(msg);
        setStatus('idle');
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      speech.abort();
    };
  }, []);

  async function start() {
    if (!speech || status !== 'idle') return;
    setStatus('starting');
    try {
      const perm = await speech.requestPermissionsAsync();
      if (!perm.granted) {
        setStatus('idle');
        handlers.current.onError(ERROR_MESSAGES['not-allowed']!);
        return;
      }
      committed.current = '';
      const lang = await pickLocale(speech);
      speech.start({
        lang,
        interimResults: true,
        // Continuo: sigue escuchando aunque la persona haga pausas, hasta que toque "terminar".
        // Android 12 o anterior no lo soporta: ahí corta solo al terminar la frase.
        continuous: Platform.OS !== 'android' || Number(Platform.Version) >= 33,
        addsPunctuation: true,
        contextualStrings: CONTEXT,
        iosTaskHint: 'dictation',
      });
    } catch {
      setStatus('idle');
      handlers.current.onError('No pudimos activar el dictado. Probá de nuevo o escribí el mensaje.');
    }
  }

  function stop() {
    speech?.stop();
  }

  return { available: !!speech, status, listening: status !== 'idle', start, stop };
}

/**
 * Une dos partes de texto con un espacio si hace falta. Si `b` empieza una oración (al principio o
 * después de . ! ?), le pone mayúscula: el reconocedor suele devolver todo en minúscula.
 */
export function join(a: string, b: string): string {
  if (!b) return a;
  const startsSentence = !a.trim() || /[.!?¡¿]\s*$/.test(a);
  const piece = startsSentence ? b.charAt(0).toLocaleUpperCase('es') + b.slice(1) : b;
  if (!a) return piece;
  return /\s$/.test(a) ? a + piece : `${a} ${piece}`;
}
