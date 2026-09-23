// Controlador de narracion de un micro-paso.
//
// Secuencia (la voz gobierna la duracion, no un temporizador fijo):
//   UI estable -> pausa visual breve -> narracion -> fin REAL de la voz
//   -> pausa natural breve -> resultado
// Las pausas breves son secundarias (cientos de ms). Sin voz y con avance
// automatico, se espera un tiempo de lectura proporcional al texto.
//
// Todo es cancelable y pausable: "Siguiente", "Anterior", "Pausa" y "Salir"
// cortan la narracion en el acto.

import type { VoiceEngine } from './VoiceEngine';

export type PlayMode = 'MANUAL' | 'AUTO_NARRATED';

/**
 * Modo efectivo del recorrido:
 *  - MANUAL: el presentador avanza; si la voz esta activa, narra cada paso.
 *  - VOICE_SYNC: avance automatico al terminar la voz.
 *  - AUTOPLAY: avance automatico sin voz (tiempo de lectura).
 */
export type EffectiveMode = 'MANUAL' | 'VOICE_SYNC' | 'AUTOPLAY';

export function effectiveMode(mode: PlayMode, voiceActive: boolean): EffectiveMode {
  if (mode === 'MANUAL') return 'MANUAL';
  return voiceActive ? 'VOICE_SYNC' : 'AUTOPLAY';
}

export type NarrationOutcome = 'finished' | 'silent' | 'cancelled' | 'error';
export type NarrationStage = 'waiting' | 'speaking' | 'reading' | 'after' | 'done';

export interface NarrationTiming {
  /** Tras estabilizarse el spotlight, antes de hablar (300-600 ms). */
  preDelayMs: number;
  /** Tras terminar la voz, antes de avanzar (400-800 ms). */
  postDelayMs: number;
}

export const NARRATION_TIMING: NarrationTiming = { preDelayMs: 450, postDelayMs: 650 };

/** Tiempo de lectura de un texto cuando no hay voz (modo AUTOPLAY). */
export function readingTimeMs(text: string): number {
  const chars = String(text || '').length;
  return Math.min(14000, Math.max(3500, Math.round(chars * 60)));
}

export interface NarrationRequest {
  /** Texto que se pronuncia (speechText o narrationText). */
  text: string;
  /** La voz esta activa y disponible. */
  voice: boolean;
  /** Sin voz: esperar el tiempo de lectura (solo con avance automatico). */
  silentDwell: boolean;
  onStage?: (stage: NarrationStage) => void;
}

/** Espera cancelable y pausable. */
class PausableDelay {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private remaining: number;
  private startedAt = 0;
  private settled = false;
  readonly promise: Promise<boolean>;
  private resolveFn!: (completed: boolean) => void;

  constructor(ms: number, paused: boolean) {
    this.remaining = Math.max(0, ms);
    this.promise = new Promise<boolean>(resolve => { this.resolveFn = resolve; });
    if (!paused) this.start();
  }

  pause(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt));
  }

  resume(): void {
    if (this.timer || this.settled) return;
    this.start();
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.settle(false);
  }

  private start(): void {
    this.startedAt = Date.now();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.settle(true);
    }, this.remaining);
  }

  private settle(completed: boolean): void {
    if (this.settled) return;
    this.settled = true;
    this.resolveFn(completed);
  }
}

interface ActiveRun {
  cancelled: boolean;
  delay: PausableDelay | null;
}

export class VoiceController {
  private readonly voice: VoiceEngine | null;
  private readonly timing: NarrationTiming;
  private active: ActiveRun | null = null;
  private paused = false;

  constructor(voice: VoiceEngine | null, timing: NarrationTiming = NARRATION_TIMING) {
    this.voice = voice;
    this.timing = timing;
  }

  /** Narra un paso. Cancela cualquier narracion anterior. */
  async run(request: NarrationRequest): Promise<NarrationOutcome> {
    this.cancel();
    const run: ActiveRun = { cancelled: false, delay: null };
    this.active = run;
    this.paused = false;
    const stage = (s: NarrationStage) => {
      if (!run.cancelled) request.onStage?.(s);
    };

    stage('waiting');
    if (!(await this.wait(run, this.timing.preDelayMs))) return 'cancelled';

    let outcome: NarrationOutcome;
    if (request.voice && this.voice) {
      stage('speaking');
      const spoken = await this.voice.speak(request.text);
      if (run.cancelled || spoken === 'cancelled') return 'cancelled';
      if (spoken === 'error') {
        stage('done');
        this.finish(run);
        return 'error';
      }
      outcome = 'finished';
    } else {
      if (request.silentDwell) {
        stage('reading');
        if (!(await this.wait(run, readingTimeMs(request.text)))) return 'cancelled';
      }
      outcome = 'silent';
    }

    stage('after');
    if (!(await this.wait(run, this.timing.postDelayMs))) return 'cancelled';
    stage('done');
    this.finish(run);
    return outcome;
  }

  pause(): void {
    this.paused = true;
    this.active?.delay?.pause();
    this.voice?.pause();
  }

  resume(): void {
    this.paused = false;
    this.active?.delay?.resume();
    this.voice?.resume();
  }

  isPaused(): boolean {
    return this.paused;
  }

  /** Corta la narracion en curso y cualquier espera pendiente. */
  cancel(): void {
    const run = this.active;
    this.active = null;
    this.paused = false;
    if (run) {
      run.cancelled = true;
      run.delay?.cancel();
    }
    this.voice?.cancel();
  }

  dispose(): void {
    this.cancel();
  }

  private async wait(run: ActiveRun, ms: number): Promise<boolean> {
    if (run.cancelled) return false;
    const delay = new PausableDelay(ms, this.paused);
    run.delay = delay;
    const completed = await delay.promise;
    if (run.delay === delay) run.delay = null;
    return completed && !run.cancelled;
  }

  private finish(run: ActiveRun): void {
    if (this.active === run) this.active = null;
  }
}

// --- Decision tras la narracion -------------------------------------------------------

export interface AdvanceInput {
  mode: PlayMode;
  outcome: NarrationOutcome;
  /** El paso permite avance automatico (MicroStep.autoAdvance !== false). */
  stepAutoAdvance: boolean;
  /** El entorno no mostro el objetivo o la accion no estuvo disponible. */
  envLimited: boolean;
  /** El paso espera una accion del presentador (p. ej. abrir el visor). */
  awaitingPresenter: boolean;
  isLast: boolean;
}

export type AdvanceDecision = 'advance' | 'wait' | 'manual-fallback';

/**
 * Que hacer cuando termina la narracion de un paso. Solo avanza si todo lo
 * permite; ante cualquier duda, espera al presentador.
 */
export function decideAfterNarration(input: AdvanceInput): AdvanceDecision {
  if (input.outcome === 'cancelled') return 'wait';
  if (input.outcome === 'error') return 'manual-fallback';
  if (input.mode !== 'AUTO_NARRATED') return 'wait';
  if (input.isLast || !input.stepAutoAdvance || input.envLimited || input.awaitingPresenter) return 'wait';
  return 'advance';
}

/**
 * Texto que se pronuncia: speechText si existe (codigos legibles) y, si el
 * entorno no muestra el objetivo, el aviso honesto de respaldo.
 */
export function speechFor(step: { narrationText: string; speechText?: string; fallbackText?: string }, envLimited: boolean): string {
  const base = step.speechText || step.narrationText;
  if (envLimited && step.fallbackText) return `${base} ${step.fallbackText}`;
  return base;
}
