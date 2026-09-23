// Creacion del motor de voz.
//
// En la aplicacion: sintesis local del sistema (window.speechSynthesis). Si no
// existe, el motor informa "no disponible" y la demo sigue en modo manual.
// El arnes de pruebas puede sustituirlo por FakeVoiceEngine con
// setVoiceEngineFactory(); la aplicacion nunca lo hace.

import { SpeechVoiceEngine } from './VoiceEngine';
import type { SynthLike, UtteranceLike, VoiceEngine } from './VoiceEngine';

type Factory = () => VoiceEngine;

function createSystemVoiceEngine(): VoiceEngine {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window
    ? (window.speechSynthesis as unknown as SynthLike)
    : null;
  const makeUtterance = (text: string) =>
    new SpeechSynthesisUtterance(text) as unknown as UtteranceLike;
  return new SpeechVoiceEngine(synth, makeUtterance, {
    log: message => console.info(message),
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
