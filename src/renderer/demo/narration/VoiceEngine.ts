// Motor de voz de la Demo guiada.
//
// Usa SOLO la sintesis de voz local del sistema (Web Speech API sobre las
// voces instaladas en Windows). Sin internet, sin cuentas, sin claves y sin
// proveedores externos: las voces remotas (localService === false) se ignoran.
//
// Garantias:
//  - Nunca lanza hacia la demo: cada fallo se traduce en un resultado 'error'
//    y un evento ERROR, y la demo continua en modo manual.
//  - Un watchdog cancela una locucion colgada (onend que nunca llega). No es
//    un temporizador de avance: solo protege contra bloqueos.
//  - cancel()/dispose() detienen la voz inmediatamente: no queda nada hablando
//    al cerrar la demo.

export type VoiceEventType = 'STARTED' | 'PAUSED' | 'RESUMED' | 'FINISHED' | 'CANCELLED' | 'ERROR';

export interface VoiceEvent {
  type: VoiceEventType;
  reason?: string;
}

export interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface VoiceInitResult {
  available: boolean;
  voice: VoiceInfo | null;
  reason?: string;
}

export type SpeakOutcome = 'finished' | 'cancelled' | 'error';

export interface VoiceEngine {
  initialize(): Promise<VoiceInitResult>;
  getAvailableVoices(): VoiceInfo[];
  selectVoice(voices?: VoiceInfo[]): VoiceInfo | null;
  speak(text: string): Promise<SpeakOutcome>;
  pause(): void;
  resume(): void;
  cancel(): void;
  isSpeaking(): boolean;
  isPaused(): boolean;
  waitUntilFinished(): Promise<void>;
  onEvent(listener: (event: VoiceEvent) => void): () => void;
  dispose(): void;
}

// --- Tono -----------------------------------------------------------------------
// Profesional y tranquilo: algo mas lento que el valor por defecto, sin alterar
// el tono de la voz.
export const VOICE_RATE = 0.95;
export const VOICE_PITCH = 1.0;
export const VOICE_VOLUME = 1.0;

// --- Seleccion de voz por capacidad (nunca por un nombre fijo) ----------------

function normLang(lang: string): string {
  return String(lang || '').replace('_', '-').toLowerCase();
}

function looksMexican(voice: VoiceInfo): boolean {
  return /m[eé]xic|mexico|latino|latin america|419/i.test(`${voice.name} ${voice.lang}`);
}

/**
 * Preferencia: es-MX > voz en espanol de Mexico/Latinoamerica > cualquier es-*
 * > voz predeterminada del sistema. Solo voces locales (sin internet).
 */
export function pickVoice(voices: VoiceInfo[]): VoiceInfo | null {
  const local = voices.filter(v => v.localService !== false);
  if (local.length === 0) return null;

  const byDefault = (list: VoiceInfo[]) => list.find(v => v.default) || list[0];

  const esMx = local.filter(v => normLang(v.lang) === 'es-mx');
  if (esMx.length) return byDefault(esMx);

  const spanish = local.filter(v => normLang(v.lang).startsWith('es'));
  const latam = spanish.filter(looksMexican);
  if (latam.length) return byDefault(latam);
  if (spanish.length) return byDefault(spanish);

  return local.find(v => v.default) || null;
}

/** Parte el texto en frases para locuciones cortas (mas estables y pausables). */
export function splitIntoChunks(text: string, maxLength = 220): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxLength) {
      chunks.push(sentence);
      continue;
    }
    // Frase muy larga: se corta por comas o dos puntos.
    let current = '';
    for (const part of sentence.split(/(?<=[,:;])\s+/)) {
      if (current && (current + ' ' + part).length > maxLength) {
        chunks.push(current);
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
    if (current) chunks.push(current);
  }
  return chunks;
}

/** Tiempo maximo razonable de una locucion antes de considerarla colgada. */
export function watchdogMs(chunk: string, rate = VOICE_RATE): number {
  const expected = (chunk.length * 85) / Math.max(0.5, rate);
  return Math.max(8000, Math.round(expected * 3 + 4000));
}

// --- Adaptador de speechSynthesis ---------------------------------------------------

/** Lo minimo de SpeechSynthesis que usa el motor (permite probarlo sin navegador). */
export interface SynthLike {
  speaking: boolean;
  paused: boolean;
  getVoices(): SynthVoiceLike[];
  speak(utterance: UtteranceLike): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  addEventListener?(type: 'voiceschanged', listener: () => void): void;
  removeEventListener?(type: 'voiceschanged', listener: () => void): void;
}

export interface SynthVoiceLike {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface UtteranceLike {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voice: SynthVoiceLike | null;
  onstart: ((ev?: unknown) => void) | null;
  onend: ((ev?: unknown) => void) | null;
  onerror: ((ev?: { error?: string }) => void) | null;
}

export interface SpeechVoiceEngineOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  /** Espera maxima a que Windows publique las voces (evento voiceschanged). */
  voicesTimeoutMs?: number;
  log?: (message: string) => void;
}

interface Run {
  token: number;
  chunks: string[];
  index: number;
  started: boolean;
  resolve: (outcome: SpeakOutcome) => void;
  promise: Promise<SpeakOutcome>;
  watchdog: ReturnType<typeof setTimeout> | null;
}

export class SpeechVoiceEngine implements VoiceEngine {
  private readonly synth: SynthLike | null;
  private readonly makeUtterance: (text: string) => UtteranceLike;
  private readonly opts: Required<Omit<SpeechVoiceEngineOptions, 'log'>> & { log: (m: string) => void };
  private readonly listeners = new Set<(event: VoiceEvent) => void>();
  private voices: SynthVoiceLike[] = [];
  private selected: SynthVoiceLike | null = null;
  private run: Run | null = null;
  private paused = false;
  private tokenSeq = 0;
  private current: UtteranceLike | null = null;

  constructor(
    synth: SynthLike | null,
    makeUtterance: (text: string) => UtteranceLike,
    options: SpeechVoiceEngineOptions = {}
  ) {
    this.synth = synth;
    this.makeUtterance = makeUtterance;
    this.opts = {
      rate: options.rate ?? VOICE_RATE,
      pitch: options.pitch ?? VOICE_PITCH,
      volume: options.volume ?? VOICE_VOLUME,
      voicesTimeoutMs: options.voicesTimeoutMs ?? 2000,
      log: options.log ?? (() => undefined),
    };
  }

  async initialize(): Promise<VoiceInitResult> {
    const synth = this.synth;
    if (!synth) return { available: false, voice: null, reason: 'speechSynthesis no existe en este entorno' };
    try {
      this.voices = synth.getVoices() || [];
      if (this.voices.length === 0) this.voices = await this.waitForVoices(synth);
      const picked = this.selectVoice();
      if (!picked) return { available: false, voice: null, reason: 'no hay voces locales disponibles' };
      this.opts.log(`[GuidedDemo] Voz seleccionada: ${picked.name} (${picked.lang})`);
      return { available: true, voice: picked };
    } catch (error) {
      return { available: false, voice: null, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  getAvailableVoices(): VoiceInfo[] {
    return this.voices.map(v => ({ name: v.name, lang: v.lang, localService: v.localService, default: v.default }));
  }

  selectVoice(voices: VoiceInfo[] = this.getAvailableVoices()): VoiceInfo | null {
    const picked = pickVoice(voices);
    this.selected = picked ? this.voices.find(v => v.name === picked.name && v.lang === picked.lang) || null : null;
    return picked;
  }

  speak(text: string): Promise<SpeakOutcome> {
    this.cancel();
    const synth = this.synth;
    const chunks = splitIntoChunks(text);
    if (!synth || !this.selected || chunks.length === 0) {
      if (chunks.length > 0) this.emit({ type: 'ERROR', reason: 'voz no inicializada' });
      return Promise.resolve(chunks.length === 0 ? 'finished' : 'error');
    }

    let resolve!: (outcome: SpeakOutcome) => void;
    const promise = new Promise<SpeakOutcome>(r => { resolve = r; });
    const run: Run = { token: ++this.tokenSeq, chunks, index: 0, started: false, resolve, promise, watchdog: null };
    this.run = run;
    this.paused = false;
    try {
      // Un sintetizador que quedo en pausa no reproduciria la nueva locucion.
      if (synth.paused) synth.resume();
    } catch {
      // Sin efecto: se intenta hablar igualmente.
    }
    this.speakChunk(run);
    return promise;
  }

  pause(): void {
    if (!this.run || this.paused) return;
    this.paused = true;
    this.clearWatchdog(this.run);
    try {
      this.synth?.pause();
    } catch {
      // Si no se puede pausar, la locucion sigue; la demo ya no avanza sola.
    }
    this.emit({ type: 'PAUSED' });
  }

  resume(): void {
    if (!this.run || !this.paused) return;
    this.paused = false;
    try {
      this.synth?.resume();
    } catch {
      // Ver pause().
    }
    this.armWatchdog(this.run);
    this.emit({ type: 'RESUMED' });
  }

  cancel(): void {
    const run = this.run;
    this.run = null;
    this.paused = false;
    this.current = null;
    try {
      this.synth?.cancel();
    } catch {
      // Nada que detener.
    }
    if (run) {
      this.clearWatchdog(run);
      run.resolve('cancelled');
      this.emit({ type: 'CANCELLED' });
    }
  }

  isSpeaking(): boolean {
    return this.run !== null;
  }

  isPaused(): boolean {
    return this.paused;
  }

  async waitUntilFinished(): Promise<void> {
    if (this.run) await this.run.promise;
  }

  onEvent(listener: (event: VoiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  dispose(): void {
    this.cancel();
    this.listeners.clear();
  }

  // --- Internos -----------------------------------------------------------------

  private waitForVoices(synth: SynthLike): Promise<SynthVoiceLike[]> {
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        synth.removeEventListener?.('voiceschanged', finish);
        resolve(synth.getVoices() || []);
      };
      const timer = setTimeout(finish, this.opts.voicesTimeoutMs);
      synth.addEventListener?.('voiceschanged', finish);
    });
  }

  private speakChunk(run: Run): void {
    const synth = this.synth;
    if (!synth || this.run !== run) return;
    const utterance = this.makeUtterance(run.chunks[run.index]);
    utterance.voice = this.selected;
    utterance.lang = this.selected?.lang || 'es-MX';
    utterance.rate = this.opts.rate;
    utterance.pitch = this.opts.pitch;
    utterance.volume = this.opts.volume;

    utterance.onstart = () => {
      if (this.run !== run || run.started) return;
      run.started = true;
      this.emit({ type: 'STARTED' });
    };
    utterance.onend = () => {
      if (this.run !== run) return;
      this.clearWatchdog(run);
      run.index += 1;
      if (run.index < run.chunks.length) {
        this.speakChunk(run);
        return;
      }
      this.finish(run, 'finished');
    };
    utterance.onerror = event => {
      if (this.run !== run) return;
      const reason = event?.error || 'error';
      // 'interrupted'/'canceled' solo llegan tras cancel(), ya resuelto.
      this.finish(run, 'error', reason);
    };

    // Referencia viva: evita que el recolector descarte la locucion y onend no llegue.
    this.current = utterance;
    this.armWatchdog(run);
    try {
      synth.speak(utterance);
    } catch (error) {
      this.finish(run, 'error', error instanceof Error ? error.message : String(error));
    }
  }

  private finish(run: Run, outcome: SpeakOutcome, reason?: string): void {
    if (this.run !== run) return;
    this.clearWatchdog(run);
    this.run = null;
    this.paused = false;
    this.current = null;
    if (outcome === 'error') {
      try {
        this.synth?.cancel();
      } catch {
        // Nada que detener.
      }
      this.emit({ type: 'ERROR', reason });
    } else {
      this.emit({ type: 'FINISHED' });
    }
    run.resolve(outcome);
  }

  private armWatchdog(run: Run): void {
    this.clearWatchdog(run);
    if (this.paused) return;
    const chunk = run.chunks[run.index] || '';
    run.watchdog = setTimeout(() => {
      // La locucion no termino en un tiempo anormal: se corta y la demo sigue.
      this.finish(run, 'error', 'watchdog');
    }, watchdogMs(chunk, this.opts.rate));
  }

  private clearWatchdog(run: Run): void {
    if (run.watchdog) clearTimeout(run.watchdog);
    run.watchdog = null;
  }

  private emit(event: VoiceEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch {
        // Un oyente defectuoso no detiene la voz.
      }
    });
  }
}
