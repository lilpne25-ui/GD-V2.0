// Motor de voz con audio PREGENERADO.
//
// Prioridad de la narracion:
//   1. Audio premium local (archivo generado con la voz aprobada).
//   2. Voz femenina local del sistema (motor de reserva).
//   3. Modo manual con subtitulos (si ninguna de las dos esta disponible).
//
// El avance lo marca el fin REAL del audio (evento 'ended'). Si el archivo no
// existe o falla, esa misma frase se narra con la voz de reserva: la demo no se
// detiene. Nunca se usa una voz masculina (ver pickVoice).

import type { SpeakOutcome, VoiceEngine, VoiceEvent, VoiceInfo, VoiceInitResult } from './VoiceEngine';

/** Lo minimo de HTMLAudioElement que usa el motor (permite probarlo sin navegador). */
export interface AudioLike {
  src: string;
  currentTime: number;
  duration: number;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  /** El audio empezo a sonar de verdad (evento 'playing'). */
  onplaying?: (() => void) | null;
  play(): Promise<void> | void;
  pause(): void;
}

export interface AudioAssetOptions {
  /** Devuelve la URL del audio para un texto, o null si no hay archivo. */
  resolve: (text: string) => string | null;
  /** Hay al menos un audio disponible. */
  hasAssets: boolean;
  /** Nombre de la voz con que se generaron los audios. */
  voiceName: string;
  makeAudio: (url: string) => AudioLike;
  /** Voz femenina local de reserva (null = sin reserva). */
  fallback: VoiceEngine | null;
  /** Proteccion contra un audio que nunca termina. */
  watchdogMs?: number;
}

interface Playback {
  audio: AudioLike;
  resolve: (outcome: SpeakOutcome) => void;
  promise: Promise<SpeakOutcome>;
  watchdog: ReturnType<typeof setTimeout> | null;
}

export class AudioAssetVoiceEngine implements VoiceEngine {
  private readonly opts: AudioAssetOptions;
  private readonly listeners = new Set<(event: VoiceEvent) => void>();
  private playback: Playback | null = null;
  private usingFallback = false;
  private paused = false;
  private fallbackReady = false;
  private unsubscribeFallback: (() => void) | null = null;

  constructor(options: AudioAssetOptions) {
    this.opts = options;
    if (options.fallback) {
      this.unsubscribeFallback = options.fallback.onEvent(event => this.emit({ ...event, source: 'fallback' }));
    }
  }

  async initialize(): Promise<VoiceInitResult> {
    let fallbackResult: VoiceInitResult | null = null;
    if (this.opts.fallback) {
      try {
        fallbackResult = await this.opts.fallback.initialize();
        this.fallbackReady = fallbackResult.available;
      } catch {
        this.fallbackReady = false;
      }
    }
    if (this.opts.hasAssets) {
      return {
        available: true,
        voice: { name: `${this.opts.voiceName} (audio pregenerado)`, lang: 'es-MX', localService: true, default: false },
      };
    }
    return fallbackResult || { available: false, voice: null, reason: 'sin audio pregenerado ni voz femenina local' };
  }

  getAvailableVoices(): VoiceInfo[] {
    return this.opts.fallback ? this.opts.fallback.getAvailableVoices() : [];
  }

  selectVoice(voices?: VoiceInfo[]): VoiceInfo | null {
    return this.opts.fallback ? this.opts.fallback.selectVoice(voices) : null;
  }

  speak(text: string): Promise<SpeakOutcome> {
    this.cancel();
    const url = this.opts.resolve(text);
    if (!url) return this.speakWithFallback(text);

    let resolve!: (outcome: SpeakOutcome) => void;
    const promise = new Promise<SpeakOutcome>(r => { resolve = r; });
    const audio = this.opts.makeAudio(url);
    const playback: Playback = { audio, resolve, promise, watchdog: null };
    this.playback = playback;
    this.paused = false;

    const settle = (outcome: SpeakOutcome) => {
      if (this.playback !== playback) return;
      if (playback.watchdog) clearTimeout(playback.watchdog);
      this.playback = null;
      this.emit({ type: outcome === 'finished' ? 'FINISHED' : 'ERROR', source: 'primary' });
      resolve(outcome);
    };
    const failOver = () => {
      // El archivo no se pudo reproducir: la misma frase con la voz de reserva.
      if (this.playback !== playback) return;
      if (playback.watchdog) clearTimeout(playback.watchdog);
      this.playback = null;
      void this.speakWithFallback(text).then(resolve);
    };

    let started = false;
    const markStarted = () => {
      if (started || this.playback !== playback) return;
      started = true;
      this.emit({ type: 'STARTED', source: 'primary' });
    };
    audio.onplaying = markStarted;
    audio.onended = () => {
      markStarted();
      settle('finished');
    };
    audio.onerror = failOver;
    playback.watchdog = setTimeout(() => settle('error'), this.opts.watchdogMs ?? 90000);
    try {
      const playing = audio.play();
      if (playing && typeof (playing as Promise<void>).then === 'function') {
        (playing as Promise<void>).then(markStarted, failOver);
      } else if (!('onplaying' in audio)) {
        markStarted();
      }
    } catch {
      failOver();
    }
    return promise;
  }

  pause(): void {
    if (this.usingFallback) {
      this.opts.fallback?.pause();
      return;
    }
    if (!this.playback || this.paused) return;
    this.paused = true;
    if (this.playback.watchdog) clearTimeout(this.playback.watchdog);
    this.playback.watchdog = null;
    try { this.playback.audio.pause(); } catch { /* sin efecto */ }
    this.emit({ type: 'PAUSED' });
  }

  resume(): void {
    if (this.usingFallback) {
      this.opts.fallback?.resume();
      return;
    }
    if (!this.playback || !this.paused) return;
    this.paused = false;
    const playback = this.playback;
    playback.watchdog = setTimeout(() => {
      if (this.playback !== playback) return;
      this.playback = null;
      playback.resolve('error');
    }, this.opts.watchdogMs ?? 90000);
    try { void playback.audio.play(); } catch { /* sin efecto */ }
    this.emit({ type: 'RESUMED' });
  }

  cancel(): void {
    const playback = this.playback;
    this.playback = null;
    this.paused = false;
    if (playback) {
      if (playback.watchdog) clearTimeout(playback.watchdog);
      try {
        playback.audio.pause();
        playback.audio.currentTime = 0;
      } catch {
        // Nada que detener.
      }
      playback.resolve('cancelled');
      this.emit({ type: 'CANCELLED' });
    }
    if (this.usingFallback) this.opts.fallback?.cancel();
    this.usingFallback = false;
  }

  isSpeaking(): boolean {
    return this.playback !== null || (this.usingFallback && !!this.opts.fallback?.isSpeaking());
  }

  isPaused(): boolean {
    return this.usingFallback ? !!this.opts.fallback?.isPaused() : this.paused;
  }

  async waitUntilFinished(): Promise<void> {
    if (this.playback) await this.playback.promise;
    else if (this.usingFallback) await this.opts.fallback?.waitUntilFinished();
  }

  onEvent(listener: (event: VoiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  dispose(): void {
    this.cancel();
    this.unsubscribeFallback?.();
    this.opts.fallback?.dispose();
    this.listeners.clear();
  }

  private async speakWithFallback(text: string): Promise<SpeakOutcome> {
    if (!this.opts.fallback || !this.fallbackReady) {
      this.emit({ type: 'ERROR', reason: 'sin audio para este texto y sin voz de reserva' });
      return 'error';
    }
    this.usingFallback = true;
    const outcome = await this.opts.fallback.speak(text);
    this.usingFallback = false;
    return outcome;
  }

  private emit(event: VoiceEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch {
        // Un oyente defectuoso no detiene la narracion.
      }
    });
  }
}
