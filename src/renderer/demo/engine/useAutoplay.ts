import React from 'react';
import type { StepPhase } from './useDemoEngine';

// Autoplay basico (sin cambios de comportamiento respecto a la version previa).
//
// Es el UNICO lugar con temporizador del recorrido, y solo decide CUANDO
// llamar a next(): el orden lo define el motor. En la Fase 2 este disparador se
// sustituira por "fin de la narracion" sin tocar escenas ni acciones.

const STEP_DWELL_MS = 8000;

interface AutoplayInput {
  phase: StepPhase;
  stepKey: string;
  isFirstStepOfScene: boolean;
  sceneAutoAdvance: boolean;
  isLast: boolean;
  next: () => boolean;
}

export function useAutoplay(input: AutoplayInput) {
  const [enabled, setEnabled] = React.useState(false);
  const [stoppedHere, setStoppedHere] = React.useState(false);
  /** El paso actual se alcanzo por el autoplay (no por el presentador). */
  const arrivedByAutoplayRef = React.useRef(false);
  const nextRef = React.useRef(input.next);
  nextRef.current = input.next;

  React.useEffect(() => {
    if (!enabled) return undefined;
    if (input.phase === 'running') return undefined;

    // Las escenas que se presentan en vivo detienen el autoplay al llegar.
    if (arrivedByAutoplayRef.current && input.isFirstStepOfScene && !input.sceneAutoAdvance) {
      setEnabled(false);
      setStoppedHere(true);
      return undefined;
    }
    // Una accion del presentador (p. ej. abrir el visor) tambien lo detiene.
    if (input.phase === 'awaiting-presenter') {
      setEnabled(false);
      setStoppedHere(true);
      return undefined;
    }
    if (input.isLast) {
      setEnabled(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      arrivedByAutoplayRef.current = true;
      nextRef.current();
    }, STEP_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, input.phase, input.stepKey, input.isFirstStepOfScene, input.sceneAutoAdvance, input.isLast]);

  /** Navegacion manual: el paso siguiente ya no cuenta como llegada automatica. */
  const markManual = React.useCallback(() => {
    arrivedByAutoplayRef.current = false;
    setStoppedHere(false);
  }, []);

  const toggle = React.useCallback(() => {
    if (!enabled) {
      // Reanudar sobre un paso en vivo cuenta como confirmacion del presentador.
      arrivedByAutoplayRef.current = false;
      setStoppedHere(false);
    }
    setEnabled(!enabled);
  }, [enabled]);

  const stop = React.useCallback(() => setEnabled(false), []);

  return { enabled, stoppedHere, toggle, stop, markManual };
}
