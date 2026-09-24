// Creacion del motor de voz.
//
// En la aplicacion: sintesis local del sistema (window.speechSynthesis). Si no
// existe, el motor informa "no disponible" y la demo sigue en modo manual.
// El arnes de pruebas puede sustituirlo por FakeVoiceEngine con
// setVoiceEngineFactory(); la aplicacion nunca lo hace.

import { SpeechVoiceEngine } from './VoiceEngine';
import type { SynthLike, UtteranceLike, VoiceEngine } from './VoiceEngine';
import { AudioAssetVoiceEngine } from './AudioAssetVoiceEngine';
import type { AudioLike } from './AudioAssetVoiceEngine';
import { demoAudio } from './audioAssets';

type Factory = () => VoiceEngine;

/**
 * Voz femenina elegida tras la audicion. Opcional: si no se fija o no existe
 * en la PC, se elige por capacidad (femenina es-MX > latam > es-*).
 */
export const PREFERRED_VOICE_KEY = 'SGC_DEMO_VOICE';

function preferredVoice(): string | null {
  try {
    return localStorage.getItem(PREFERRED_VOICE_KEY);
  } catch {
    return null;
  }
}

/** Voz femenina local del sistema (reserva del audio premium). */
function createLocalVoiceEngine(): VoiceEngine {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window
    ? (window.speechSynthesis as unknown as SynthLike)
    : null;
  const makeUtterance = (text: string) =>
    new SpeechSynthesisUtterance(text) as unknown as UtteranceLike;
  return new SpeechVoiceEngine(synth, makeUtterance, {
    preferredVoice: preferredVoice(),
    log: message => console.info(message),
  });
}

/**
 * Narracion de la demo: audio premium pregenerado (si existe) con reserva a la
 * voz femenina local, y modo manual si no hay ninguna de las dos.
 */
function createSystemVoiceEngine(): VoiceEngine {
  const fallback = createLocalVoiceEngine();
  return new AudioAssetVoiceEngine({
    resolve: text => demoAudio.resolve(text),
    hasAssets: demoAudio.hasAssets,
    voiceName: demoAudio.voiceName || 'Voz Innovax',
    makeAudio: url => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      return audio as unknown as AudioLike;
    },
    fallback,
  });
}

let factory: Factory = createSystemVoiceEngine;

export function createVoiceEngine(): VoiceEngine {
  return factory();
}

/** Solo para el arnes visual y pruebas. */
export function setVoiceEngineFactory(next: Factory | null): void {
  factory = next || createSystemVoiceEngine;
}
