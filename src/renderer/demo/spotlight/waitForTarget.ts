// Espera inteligente de la interfaz: resuelve en cuanto el objetivo existe y es
// visible, sin sondeos fijos como mecanismo principal.
//
//  - MutationObserver: reacciona cuando el modulo real monta o cambia el DOM.
//  - requestAnimationFrame: comprueba tras cada pintado (el objetivo puede
//    existir pero tener tamano 0 hasta el siguiente layout).
//  - Comprobacion de respaldo cada 250 ms: solo por si la ventana esta oculta
//    (sin pintados no hay requestAnimationFrame).
//  - Tiempo maximo: nunca espera indefinidamente; resuelve null y la demo usa
//    su aviso de respaldo.

export function findTarget(ids: string[]): HTMLElement | null {
  for (const id of ids) {
    const el = document.querySelector<HTMLElement>(`[data-demo-id="${id}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 2 && r.height > 2) return el;
  }
  return null;
}

export interface WaitHandle {
  promise: Promise<HTMLElement | null>;
  cancel(): void;
}

export const TARGET_TIMEOUT_MS = 6000;
const SAFETY_CHECK_MS = 250;

export function waitForTarget(ids: string[], timeoutMs = TARGET_TIMEOUT_MS): WaitHandle {
  let settle: (el: HTMLElement | null) => void = () => undefined;
  let observer: MutationObserver | null = null;
  let raf = 0;
  let safety: ReturnType<typeof setInterval> | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let done = false;

  const cleanup = () => {
    observer?.disconnect();
    observer = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (safety) clearInterval(safety);
    safety = null;
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };

  const promise = new Promise<HTMLElement | null>(resolve => {
    settle = el => {
      if (done) return;
      done = true;
      cleanup();
      resolve(el);
    };
  });

  const check = () => {
    if (done) return;
    const el = findTarget(ids);
    if (el) settle(el);
  };

  const scheduleFrame = () => {
    if (done || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      check();
    });
  };

  check();
  if (!done) {
    observer = new MutationObserver(() => {
      check();
      scheduleFrame();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-demo-id', 'class', 'style'] });
    scheduleFrame();
    safety = setInterval(check, SAFETY_CHECK_MS);
    timeout = setTimeout(() => settle(null), timeoutMs);
  }

  return { promise, cancel: () => settle(null) };
}
