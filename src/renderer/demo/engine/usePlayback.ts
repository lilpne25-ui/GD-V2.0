import React from 'react';
import { createVoiceEngine } from '../narration/voiceEngineFactory';
import type { VoiceEngine, VoiceInfo } from '../narration/VoiceEngine';
import {
  VoiceController,
  decideAfterNarration,
  effectiveMode,
} from '../narration/VoiceController';
import type { EffectiveMode, NarrationOutcome, NarrationStage, PlayMode } from '../narration/VoiceController';

// Reproduccion del recorrido: voz + avance.
//
// Sustituye al autoplay de 8 s de la Fase 1. El orden sigue siendo del motor
// (useDemoEngine); este hook solo decide CUANDO narrar y CUANDO avanzar:
//
//   paso listo (accion hecha + spotlight estable)
//     -> narracion (la voz gobierna la duracion)
//     -> fin real de la voz -> pausa natural
//     -> avanza solo si el modo es automatico y el paso lo permite.
//
// La voz nunca bloquea la demo: si falla, la demo continua en modo manual.

export const VOICE_UNAVAILABLE_TEXT = 'Voz no disponible. Continuando en modo manual.';

export type VoiceStatus = 'idle' | 'initializing' | 'ready' | 'unavailable';

export interface PlaybackInput {
  /** Id del micro-paso actual. */
  stepKey: string;
  /** Accion terminada y spotlight estable (o sin objetivo / aviso de respaldo). */
  uiReady: boolean;
  /** Texto que se pronuncia en este paso. */
  speech: string;
  stepAutoAdvance: boolean;
  envLimited: boolean;
  awaitingPresenter: boolean;
  isLast: boolean;
  next: () => boolean;
}

export function usePlayback(input: PlaybackInput) {
  const [started, setStarted] = React.useState(false);
  const [mode, setModeState] = React.useState<PlayMode>('AUTO_NARRATED');
  const [paused, setPaused] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [voiceStatus, setVoiceStatus] = React.useState<VoiceStatus>('idle');
  const [voice, setVoice] = React.useState<VoiceInfo | null>(null);
  const [stage, setStage] = React.useState<NarrationStage | 'idle'>('idle');
  const [awaitingNext, setAwaitingNext] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [replayTick, setReplayTick] = React.useState(0);

  const engineRef = React.useRef<VoiceEngine | null>(null);
  const controllerRef = React.useRef<VoiceController | null>(null);
  const inputRef = React.useRef(input);
  inputRef.current = input;
  const modeRef = React.useRef(mode);
  modeRef.current = mode;
  const lastOutcomeRef = React.useRef<NarrationOutcome | null>(null);
  const narratedRef = React.useRef<string | null>(null);

  const voiceActive = voiceEnabled && voiceStatus === 'ready';
  /** Lo que muestra el boton: activada salvo que el usuario la apague o no exista. */
  const voiceOn = voiceEnabled && voiceStatus !== 'unavailable';

  const ensureController = React.useCallback((): VoiceController => {
    if (!engineRef.current) {
      try {
        engineRef.current = createVoiceEngine();
      } catch {
        engineRef.current = null;
      }
    }
    if (!controllerRef.current) controllerRef.current = new VoiceController(engineRef.current);
    return controllerRef.current;
  }, []);

  const fallBackToManual = React.useCallback(() => {
    controllerRef.current?.cancel();
    setVoiceStatus('unavailable');
    setModeState('MANUAL');
    setNotice(VOICE_UNAVAILABLE_TEXT);
  }, []);

  const initializeVoice = React.useCallback(async (): Promise<boolean> => {
    ensureController();
    const engine = engineRef.current;
    if (!engine) {
      fallBackToManual();
      return false;
    }
    setVoiceStatus('initializing');
    try {
      const result = await engine.initialize();
      if (result.available) {
        setVoice(result.voice);
        setVoiceStatus('ready');
        setNotice(null);
        return true;
      }
      console.info(`[GuidedDemo] Voz no disponible: ${result.reason || 'sin detalle'}`);
    } catch (error) {
      console.info('[GuidedDemo] Voz no disponible:', error);
    }
    fallBackToManual();
    return false;
  }, [ensureController, fallBackToManual]);

  /** "Iniciar recorrido": prepara la voz (con la interaccion del usuario) y arranca. */
  const start = React.useCallback(async () => {
    if (started) return;
    if (voiceEnabled) await initializeVoice();
    else ensureController();
    setStarted(true);
  }, [started, voiceEnabled, initializeVoice, ensureController]);

  const handleOutcome = React.useCallback((outcome: NarrationOutcome) => {
    lastOutcomeRef.current = outcome;
    const i = inputRef.current;
    const decision = decideAfterNarration({
      mode: modeRef.current,
      outcome,
      stepAutoAdvance: i.stepAutoAdvance,
      envLimited: i.envLimited,
      awaitingPresenter: i.awaitingPresenter,
      isLast: i.isLast,
    });
    if (decision === 'advance') {
      i.next();
      return;
    }
    if (decision === 'manual-fallback') fallBackToManual();
    if (outcome !== 'cancelled') setAwaitingNext(true);
  }, [fallBackToManual]);

  // Cambio de paso (Siguiente, Anterior, salto): corta la voz del paso anterior.
  // Va antes del efecto de narracion para que el reinicio no pise el nuevo estado.
  React.useEffect(() => {
    setPaused(false);
    setAwaitingNext(false);
    setStage('idle');
    return () => {
      narratedRef.current = null;
      controllerRef.current?.cancel();
    };
  }, [input.stepKey]);

  // --- Narracion de cada paso ---------------------------------------------------
  const runKey = `${input.stepKey}|${voiceActive ? 'voz' : 'sin-voz'}|${replayTick}`;
  React.useEffect(() => {
    if (!started || !input.uiReady) return;
    if (narratedRef.current === runKey) return;
    narratedRef.current = runKey;
    lastOutcomeRef.current = null;
    setAwaitingNext(false);
    const controller = ensureController();
    void controller.run({
      text: inputRef.current.speech,
      voice: voiceActive,
      silentDwell: modeRef.current === 'AUTO_NARRATED',
      onStage: s => { if (narratedRef.current === runKey) setStage(s); },
    }).then(outcome => {
      if (narratedRef.current !== runKey) return;
      handleOutcome(outcome);
    });
  }, [started, input.uiReady, runKey, voiceActive, ensureController, handleOutcome]);

  // Al cerrar la demo, la app o volver al login: nada sigue hablando.
  React.useEffect(() => {
    const stopAll = () => controllerRef.current?.cancel();
    window.addEventListener('pagehide', stopAll);
    window.addEventListener('beforeunload', stopAll);
    return () => {
      window.removeEventListener('pagehide', stopAll);
      window.removeEventListener('beforeunload', stopAll);
      narratedRef.current = null;
      controllerRef.current?.dispose();
      engineRef.current?.dispose();
      controllerRef.current = null;
      engineRef.current = null;
    };
  }, []);

  // --- Controles del presentador -----------------------------------------------
  const togglePause = React.useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (paused) {
      controller.resume();
      setPaused(false);
    } else {
      controller.pause();
      setPaused(true);
    }
  }, [paused]);

  const setMode = React.useCallback((next: PlayMode) => {
    setModeState(next);
    modeRef.current = next;
    // Si el paso ya termino de narrarse, el cambio a automatico continua.
    if (next === 'AUTO_NARRATED' && awaitingNext && !paused && lastOutcomeRef.current
      && lastOutcomeRef.current !== 'cancelled' && lastOutcomeRef.current !== 'error') {
      setAwaitingNext(false);
      handleOutcome(lastOutcomeRef.current);
    }
  }, [awaitingNext, paused, handleOutcome]);

  const toggleVoice = React.useCallback(async () => {
    if (voiceOn) {
      setVoiceEnabled(false);
      return;
    }
    setVoiceEnabled(true);
    // Antes de iniciar, la voz se prepara al pulsar "Iniciar recorrido".
    if (started && voiceStatus !== 'ready') await initializeVoice();
    else if (voiceStatus === 'unavailable') setVoiceStatus('idle');
  }, [voiceOn, started, voiceStatus, initializeVoice]);

  /** Vuelve a narrar el paso actual desde el principio. */
  const replay = React.useCallback(() => {
    setPaused(false);
    setReplayTick(t => t + 1);
  }, []);

  const current: EffectiveMode = effectiveMode(mode, voiceActive);

  return {
    started,
    start,
    mode,
    effectiveMode: current,
    setMode,
    paused,
    togglePause,
    voiceEnabled,
    voiceActive,
    voiceOn,
    voiceStatus,
    voice,
    toggleVoice,
    replay,
    stage,
    awaitingNext,
    notice,
  };
}
