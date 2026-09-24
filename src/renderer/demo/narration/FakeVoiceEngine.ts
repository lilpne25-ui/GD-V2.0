// Motor de voz simulado para pruebas y para el arnes visual.
//
// No produce audio. Emite STARTED/FINISHED de forma controlada:
//  - modo 'manual': la prueba decide cuando termina cada locucion (finishCurrent)
//  - modo 'auto': termina solo tras `autoFinishMs` (simula la duracion de la voz)
//  - failNext(): la siguiente locucion termina en ERROR (simula un fallo del TTS)

import type { SpeakOutcome, VoiceEngine, VoiceEvent, VoiceInfo, VoiceInitResult } from './VoiceEngine';
import { pickVoice } from './VoiceEngine';

export interface FakeVoiceOptions {
  voices?: VoiceInfo[];
  mode?: 'manual' | 'auto';
  autoFinishMs?: number;
}

export const FAKE_VOICES: VoiceInfo[] = [
  { name: 'Voz simulada femenina (es-MX)', lang: 'es-MX', localService: true, default: true },
];

export class FakeVoiceEngine implements VoiceEngine {
  readonly spoken: string[] = [];
  readonly events: VoiceEvent[] = [];
  cancelCount = 0;
  private readonly voices: VoiceInfo[];
  private readonly mode: 'manual' | 'auto';
  private readonly autoFinishMs: number;
  private readonly listeners = new Set<(event: VoiceEvent) => void>();
  private pending: { resolve: (o: SpeakOutcome) => void; promise: Promise<SpeakOutcome> } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private remainingMs = 0;
  private startedAt = 0;
  private paused = false;
  private failNextFlag = false;
  private selected: VoiceInfo | null = null;

  constructor(options: FakeVoiceOptions = {}) {
    this.voices = options.voices ?? FAKE_VOICES;
    this.mode = options.mode ?? 'manual';
    this.autoFinishMs = options.autoFinishMs ?? 50;
  }

  async initialize(): Promise<VoiceInitResult> {
    const voice = this.selectVoice();
    return voice ? { available: true, voice } : { available: false, voice: null, reason: 'sin voces' };
  }

  getAvailableVoices(): VoiceInfo[] {
    return [...this.voices];
  }

  selectVoice(voices: VoiceInfo[] = this.voices): VoiceInfo | null {
    this.selected = pickVoice(voices);
    return this.selected;
  }

  speak(text: string): Promise<SpeakOutcome> {
    this.cancel();
    if (!this.selected) return Promise.resolve('error');
    this.spoken.push(text);
    let resolve!: (o: SpeakOutcome) => void;
    const promise = new Promise<SpeakOutcome>(r => { resolve = r; });
    this.pending = { resolve, promise };
    this.emit({ type: 'STARTED' });
    if (this.failNextFlag) {
      this.failNextFlag = false;
      this.settle('error', 'fallo simulado');
    } else if (this.mode === 'auto') {
      this.remainingMs = this.autoFinishMs;
      this.startTimer();
    }
    return promise;
  }

  /** Solo modo manual: termina la locucion en curso. */
  finishCurrent(): void {
    this.settle('finished');
  }

  failNext(): void {
    this.failNextFlag = true;
  }

  pause(): void {
    if (!this.pending || this.paused) return;
    this.paused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.remainingMs = Math.max(0, this.remainingMs - (Date.now() - this.startedAt));
    }
    this.emit({ type: 'PAUSED' });
  }

  resume(): void {
    if (!this.pending || !this.paused) return;
    this.paused = false;
    if (this.mode === 'auto') this.startTimer();
    this.emit({ type: 'RESUMED' });
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.paused = false;
    if (this.pending) {
      this.cancelCount += 1;
      const { resolve } = this.pending;
      this.pending = null;
      resolve('cancelled');
      this.emit({ type: 'CANCELLED' });
    }
  }

  isSpeaking(): boolean {
    return this.pending !== null;
  }

  isPaused(): boolean {
    return this.paused;
  }

  async waitUntilFinished(): Promise<void> {
    if (this.pending) await this.pending.promise;
  }

  onEvent(listener: (event: VoiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  dispose(): void {
    this.cancel();
    this.listeners.clear();
  }

  private startTimer(): void {
    this.startedAt = Date.now();
    this.timer = setTimeout(() => this.settle('finished'), this.remainingMs);
  }

  private settle(outcome: SpeakOutcome, reason?: string): void {
    if (!this.pending) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const { resolve } = this.pending;
    this.pending = null;
    this.paused = false;
    this.emit(outcome === 'error' ? { type: 'ERROR', reason } : { type: 'FINISHED' });
    resolve(outcome);
  }

  private emit(event: VoiceEvent): void {
    this.events.push(event);
    this.listeners.forEach(listener => listener(event));
  }
}
