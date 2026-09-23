import React from 'react';
import type { ActionResult, DemoAction, MicroStep, Scene } from '../types';
import { runAction } from '../actions/runAction';
import type { ActionContext } from '../actions/runAction';

// Motor del recorrido guiado.
//
// El orden lo deciden eventos, no temporizadores:
//   next() -> limpieza del paso anterior -> (si cambia la escena) onExit,
//   navegacion y onEnter -> accion del paso -> listo para spotlight.
// La Fase 2 conectara "fin del audio" a next(); hoy lo disparan el
// presentador (teclado / botones) o el autoplay existente.

export type StepPhase =
  /** Ejecutando acciones previas: el spotlight espera. */
  | 'running'
  /** Paso listo para iluminar y narrar. */
  | 'ready'
  /** La accion necesita que el presentador la dispare (boton del panel). */
  | 'awaiting-presenter'
  /** La accion no pudo completarse en este entorno; la demo sigue. */
  | 'unavailable';

export interface Position {
  scene: number;
  step: number;
}

/** Limpieza total al cerrar la demo: deja la aplicacion como estaba. */
export const EXIT_CLEANUP: DemoAction[] = [
  { kind: 'doc.reset' },
  { kind: 'app.closeNotifications' },
  { kind: 'dynamic.resetForm' },
];

export function useDemoEngine(scenes: Scene[], ctx: ActionContext) {
  const [pos, setPos] = React.useState<Position>({ scene: 0, step: 0 });
  const [phase, setPhase] = React.useState<StepPhase>('running');
  const [reason, setReason] = React.useState<string | undefined>(undefined);

  const ctxRef = React.useRef(ctx);
  ctxRef.current = ctx;
  const prevPosRef = React.useRef<Position | null>(null);
  const seqRef = React.useRef(0);

  const scene = scenes[pos.scene];
  const step: MicroStep = scene.steps[pos.step];

  const totalSteps = React.useMemo(
    () => scenes.reduce((sum, s) => sum + s.steps.length, 0),
    [scenes]
  );
  const globalIndex = React.useMemo(() => {
    let n = 0;
    for (let i = 0; i < pos.scene; i += 1) n += scenes[i].steps.length;
    return n + pos.step;
  }, [scenes, pos]);

  // --- Entrada a cada paso ----------------------------------------------------
  React.useEffect(() => {
    const seq = ++seqRef.current;
    const previous = prevPosRef.current;
    prevPosRef.current = pos;
    const run = (action: DemoAction) => runAction(action, ctxRef.current);
    const isStale = () => seq !== seqRef.current;

    setPhase('running');
    setReason(undefined);

    void (async () => {
      // 1. Limpieza del paso anterior.
      if (previous) {
        const prevScene = scenes[previous.scene];
        const prevStep = prevScene.steps[previous.step];
        for (const action of prevStep.cleanup || []) await run(action);

        // 2. Cambio de escena: limpieza de la anterior.
        if (previous.scene !== pos.scene) {
          for (const action of prevScene.onExit || []) await run(action);
        }
      }
      if (isStale()) return;

      // 3. Entrada a una escena nueva: navegar y preparar el modulo.
      if (!previous || previous.scene !== pos.scene) {
        if (scene.section) await run({ kind: 'app.navigate', params: { section: scene.section } });
        for (const action of scene.onEnter || []) await run(action);
      }
      if (isStale()) return;

      // 4. Accion del paso.
      const action = step.action;
      if (!action) {
        setPhase('ready');
        return;
      }
      if ((action.trigger || 'auto') === 'presenter') {
        setPhase('awaiting-presenter');
        return;
      }
      const result: ActionResult = await run(action);
      if (isStale()) return;
      setPhase(result.ok ? 'ready' : 'unavailable');
      setReason(result.ok ? undefined : result.reason);
    })();
    // Solo la posicion dispara la entrada a un paso: escenas y paso se leen
    // de la posicion; ctx se lee por referencia.
  }, [pos]);

  // --- Navegacion ---------------------------------------------------------------
  const isFirst = pos.scene === 0 && pos.step === 0;
  const isLast = pos.scene === scenes.length - 1 && pos.step === scene.steps.length - 1;

  const next = React.useCallback((): boolean => {
    if (pos.step < scenes[pos.scene].steps.length - 1) {
      setPos({ scene: pos.scene, step: pos.step + 1 });
      return true;
    }
    if (pos.scene < scenes.length - 1) {
      setPos({ scene: pos.scene + 1, step: 0 });
      return true;
    }
    return false;
  }, [pos, scenes]);

  const prev = React.useCallback((): boolean => {
    if (pos.step > 0) {
      setPos({ scene: pos.scene, step: pos.step - 1 });
      return true;
    }
    if (pos.scene > 0) {
      const target = pos.scene - 1;
      setPos({ scene: target, step: scenes[target].steps.length - 1 });
      return true;
    }
    return false;
  }, [pos, scenes]);

  const goTo = React.useCallback((sceneIndex: number, stepIndex = 0) => {
    if (sceneIndex < 0 || sceneIndex >= scenes.length) return;
    const safeStep = Math.max(0, Math.min(stepIndex, scenes[sceneIndex].steps.length - 1));
    setPos({ scene: sceneIndex, step: safeStep });
  }, [scenes]);

  /** El presentador dispara la accion del paso (p. ej. abrir el visor protegido). */
  const runPresenterAction = React.useCallback(async () => {
    const action = step.action;
    if (!action) return;
    const seq = seqRef.current;
    setPhase('running');
    const result = await runAction(action, ctxRef.current);
    if (seq !== seqRef.current) return;
    setPhase(result.ok ? 'ready' : 'unavailable');
    setReason(result.ok ? undefined : result.reason);
  }, [step]);

  /**
   * Limpieza al cerrar. Despacha todas las acciones sin esperar: las que van a
   * modulos montados se ejecutan; las demas se descartan con demoBus.clear().
   */
  const cleanupAll = React.useCallback(() => {
    const current = scenes[prevPosRef.current?.scene ?? pos.scene];
    const actions: DemoAction[] = [
      ...(step.cleanup || []),
      ...(current.onExit || []),
      ...EXIT_CLEANUP,
    ];
    actions.forEach(action => { void runAction(action, ctxRef.current); });
  }, [scenes, pos, step]);

  return {
    pos,
    scene,
    step,
    phase,
    reason,
    totalSteps,
    globalIndex,
    isFirst,
    isLast,
    next,
    prev,
    goTo,
    runPresenterAction,
    cleanupAll,
  };
}
