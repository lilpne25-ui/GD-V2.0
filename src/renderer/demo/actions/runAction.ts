// Ejecutor de acciones de la demo.
//
// Toda accion:
//  - pasa la politica de solo lectura (assertReadOnlyAction);
//  - tiene un tiempo limite: si el modulo o la BD no responden, la demo sigue;
//  - devuelve { ok, reason } en lugar de lanzar.
//
// El tiempo limite es una proteccion, no define el orden del recorrido: el
// orden lo decide el motor de escenas por eventos.

import { assertReadOnlyAction, ProhibitedDemoActionError } from './policy';
import { demoBus } from '../demoBus';
import type { DemoNamespace } from '../demoBus';
import type { ActionResult, DemoAction, ReadOnlyActionKind } from '../types';

const ACTION_TIMEOUT_MS = 8000;

const NAMESPACE_BY_PREFIX: Record<string, DemoNamespace> = {
  app: 'app',
  doc: 'documentacion',
  registros: 'registros',
  dynamic: 'dynamic',
};

export interface ActionContext {
  /** Navegacion principal: el mismo setSection que usa el Sidebar. */
  navigate: (section: string) => void;
}

export const UNAVAILABLE_TEXT = 'No disponible en este entorno. La demo continúa.';

function withTimeout(promise: Promise<boolean>): Promise<boolean> {
  return new Promise(resolve => {
    const timer = window.setTimeout(() => resolve(false), ACTION_TIMEOUT_MS);
    promise.then(
      ok => { window.clearTimeout(timer); resolve(ok); },
      () => { window.clearTimeout(timer); resolve(false); }
    );
  });
}

/**
 * Muestra la validacion real de un campo sin guardar nada: enfoca el control y
 * lo abandona, lo que dispara el onBlur del formulario (marca el campo como
 * tocado y ensena "Este campo es obligatorio"). No hay ninguna llamada al
 * backend.
 */
function touchField(targetId: string): boolean {
  const wrapper = document.querySelector<HTMLElement>(`[data-demo-id="${targetId}"]`);
  const control = wrapper?.querySelector<HTMLElement>('input, textarea, select');
  if (!control || (control as HTMLInputElement).disabled) return false;
  control.focus({ preventScroll: true });
  control.blur();
  return true;
}

export async function runAction(action: DemoAction, ctx: ActionContext): Promise<ActionResult> {
  try {
    assertReadOnlyAction(action.kind);
  } catch (error) {
    // Nunca deberia ocurrir: las escenas se validan en pruebas. Si ocurre, se
    // bloquea la accion y la demo continua.
    console.error('[GuidedDemo]', error instanceof ProhibitedDemoActionError ? error.message : error);
    return { ok: false, reason: 'Acción bloqueada por la política de solo lectura.' };
  }

  const kind: ReadOnlyActionKind = action.kind;
  const params = action.params || {};

  if (kind === 'app.navigate') {
    const section = String(params.section || '');
    if (!section) return { ok: false, reason: UNAVAILABLE_TEXT };
    ctx.navigate(section);
    return { ok: true };
  }

  if (kind === 'dom.touchField') {
    const ok = touchField(String(params.target || ''));
    return ok ? { ok: true } : { ok: false, reason: UNAVAILABLE_TEXT };
  }

  const prefix = kind.slice(0, kind.indexOf('.'));
  const namespace = NAMESPACE_BY_PREFIX[prefix];
  if (!namespace) return { ok: false, reason: UNAVAILABLE_TEXT };

  const ok = await withTimeout(demoBus.execute(namespace, { kind, params }));
  return ok ? { ok: true } : { ok: false, reason: UNAVAILABLE_TEXT };
}

/** Ejecuta acciones en orden. Un fallo no detiene las siguientes. */
export async function runActions(actions: DemoAction[] | undefined, ctx: ActionContext): Promise<ActionResult> {
  let last: ActionResult = { ok: true };
  for (const action of actions || []) {
    const result = await runAction(action, ctx);
    if (!result.ok) last = result;
  }
  return last;
}
