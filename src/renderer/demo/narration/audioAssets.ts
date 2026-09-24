// Enlace entre el manifiesto de audio y los archivos empaquetados por webpack.
// Solo para el renderer (usa require.context); las pruebas usan
// AudioAssetVoiceEngine con un resolvedor propio.

import { DEMO_AUDIO_MANIFEST } from '../../assets/demo-audio/manifest';
import { speechKey } from './speechKey';

type AssetContext = { (id: string): string; keys(): string[] };

function loadContext(): AssetContext | null {
  try {
    return (require as unknown as {
      context: (dir: string, deep: boolean, re: RegExp) => AssetContext;
    }).context('../../assets/demo-audio', false, /\.(mp3|ogg|wav)$/);
  } catch {
    return null;
  }
}

const context = loadContext();
const available = new Set(context ? context.keys().map(k => k.replace(/^\.\//, '')) : []);

export const demoAudio = {
  voiceName: DEMO_AUDIO_MANIFEST.voice,
  hasAssets: Object.values(DEMO_AUDIO_MANIFEST.entries).some(file => available.has(file)),
  resolve(text: string): string | null {
    const file = DEMO_AUDIO_MANIFEST.entries[speechKey(text)];
    if (!file || !context || !available.has(file)) return null;
    try {
      return context(`./${file}`);
    } catch {
      return null;
    }
  },
};
