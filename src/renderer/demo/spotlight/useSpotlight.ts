import React from 'react';
import { findTarget, TARGET_TIMEOUT_MS, waitForTarget } from './waitForTarget';

export { findTarget };

// Spotlight de la demo: localiza un elemento real por data-demo-id, lo hace
// visible sin desplazar el documento y dibuja el hueco iluminado.
//
// Tolerancia: reintenta mientras los modulos lazy se montan; si el objetivo no
// aparece a tiempo devuelve 'missing' y la demo sigue con un aviso discreto.

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type SpotPhase = 'none' | 'searching' | 'found' | 'missing';

/** Seguimiento de la posicion una vez encontrado (layout, scroll, datos que cargan). */
const TRACK_MS = 200;
const SPOT_PADDING = 8;
const VIEWPORT_MARGIN = 6;

export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = React.useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  );

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

/**
 * Hace visible el objetivo desplazando SOLO su contenedor con scroll propio
 * (overflow auto/scroll). No usa scrollIntoView: este desplaza tambien
 * contenedores con overflow hidden y el propio documento, lo que dejaba la
 * barra superior fuera de pantalla incluso despues de cerrar la demo.
 */
export function revealTarget(el: HTMLElement, reducedMotion: boolean): void {
  const target = el.getBoundingClientRect();
  const topSafe = 72; // debajo de la barra superior
  if (target.top >= topSafe && target.bottom <= window.innerHeight - 16) return;

  const root = document.scrollingElement;
  let node = el.parentElement;
  while (node && node !== document.body && node !== root) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      const box = node.getBoundingClientRect();
      const fits = target.height < box.height * 0.7;
      const delta = fits
        ? (target.top + target.height / 2) - (box.top + box.height / 2)
        : target.top - box.top - 12;
      node.scrollBy({ top: delta, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    node = node.parentElement;
  }
}

function sameRect(a: Rect | null, b: Rect): boolean {
  return !!a
    && Math.abs(a.top - b.top) < 1
    && Math.abs(a.left - b.left) < 1
    && Math.abs(a.width - b.width) < 1
    && Math.abs(a.height - b.height) < 1;
}

/**
 * Localiza y sigue un objetivo. `targets` null significa "sin spotlight"
 * (paso de panel, o accion todavia en curso). `key` identifica el paso: el
 * array de targets es nuevo en cada render y no sirve como dependencia.
 *
 * `settled` pasa a true cuando la posicion deja de moverse (tras el scroll y
 * la transicion): es la senal para empezar a narrar.
 */
export function useSpotlight(targets: string[] | null, key: string, reducedMotion: boolean) {
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [phase, setPhase] = React.useState<SpotPhase>('none');
  const [settled, setSettled] = React.useState(false);
  const targetsRef = React.useRef(targets);
  targetsRef.current = targets;

  React.useEffect(() => {
    const ids = targetsRef.current;
    setSettled(false);
    if (!ids || ids.length === 0) {
      setPhase('none');
      setRect(null);
      return undefined;
    }

    let cancelled = false;
    let tracker: ReturnType<typeof setInterval> | null = null;
    let last: Rect | null = null;
    setPhase('searching');

    const measure = () => {
      if (cancelled) return;
      const el = findTarget(ids);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const next: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
      if (sameRect(last, next)) setSettled(true);
      last = next;
      setRect(prev => (sameRect(prev, next) ? prev : next));
    };

    const handle = waitForTarget(ids, TARGET_TIMEOUT_MS);
    void handle.promise.then(el => {
      if (cancelled) return;
      if (!el) {
        setPhase('missing');
        setRect(null);
        return;
      }
      try {
        revealTarget(el, reducedMotion);
      } catch {
        // Si no se puede desplazar, el spotlight se dibuja donde este.
      }
      setPhase('found');
      measure();
      tracker = setInterval(measure, TRACK_MS);
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', measure, true);
    });

    return () => {
      cancelled = true;
      handle.cancel();
      if (tracker) clearInterval(tracker);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [key, reducedMotion]);

  return { rect, phase, settled };
}

/** Hueco del spotlight con margen, acotado al viewport. */
export function spotBox(rect: Rect): Rect | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(VIEWPORT_MARGIN, rect.top - SPOT_PADDING);
  const left = Math.max(VIEWPORT_MARGIN, rect.left - SPOT_PADDING);
  const bottom = Math.min(vh - VIEWPORT_MARGIN, rect.top + rect.height + SPOT_PADDING);
  const right = Math.min(vw - VIEWPORT_MARGIN, rect.left + rect.width + SPOT_PADDING);
  const width = right - left;
  const height = bottom - top;
  if (width < 12 || height < 12) return null;
  return { top, left, width, height };
}

// --- Colocacion del panel lateral ------------------------------------------

export type DockCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const DOCK_MARGIN = 20;
const DOCK_TOP = 72; // debajo de la barra superior de 56 px

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Esquina donde el panel lateral tapa menos el elemento iluminado. */
export function chooseDockCorner(spot: Rect | null, panelW: number, panelH: number): DockCorner {
  if (!spot || panelW === 0 || panelH === 0) return 'bottom-right';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = vw - DOCK_MARGIN - panelW;
  const bottom = vh - DOCK_MARGIN - panelH;
  const candidates: Array<[DockCorner, Rect]> = [
    ['bottom-right', { left: right, top: bottom, width: panelW, height: panelH }],
    ['bottom-left', { left: DOCK_MARGIN, top: bottom, width: panelW, height: panelH }],
    ['top-right', { left: right, top: DOCK_TOP, width: panelW, height: panelH }],
    ['top-left', { left: DOCK_MARGIN, top: DOCK_TOP, width: panelW, height: panelH }],
  ];
  let best = candidates[0];
  let bestArea = overlapArea(best[1], spot);
  for (const candidate of candidates.slice(1)) {
    const area = overlapArea(candidate[1], spot);
    if (area < bestArea) {
      best = candidate;
      bestArea = area;
    }
  }
  return best[0];
}

export function dockStyle(corner: DockCorner): React.CSSProperties {
  const vertical = corner.startsWith('top') ? { top: DOCK_TOP } : { bottom: DOCK_MARGIN };
  const horizontal = corner.endsWith('left') ? { left: DOCK_MARGIN } : { right: DOCK_MARGIN };
  return { ...vertical, ...horizontal };
}
