import React from 'react';
import '../assets/branding/innovax/innovax-tokens.css';
import './GuidedDemo.css';
import { DEMO_STEPS } from './demoStory';
import type { DemoFocus, DemoStep } from './demoStory';
import { demoBus } from './demoBus';
import { useDemoData } from './useDemoData';
import DemoPreview from './DemoPreview';
import { DemoBrand, StatusBadge } from './DemoBrand';

// Demo guiada Innovax.
//
// Garantias de diseno:
//  - No toca autenticacion ni escribe en la base de datos.
//  - Navega con el mismo setSection que usa el Sidebar (no hay router nuevo).
//  - La capa oscura NUNCA intercepta clics (pointer-events: none): si algo
//    falla, la aplicacion sigue siendo usable debajo.
//  - Si un objetivo del spotlight no aparece, la demo sigue con panel lateral.

interface GuidedDemoProps {
  onNavigate: (section: string) => void;
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type SpotPhase = 'none' | 'searching' | 'found' | 'missing';

/** Feature flag existente de Dynamic Records (ver DynamicRecordsPanel). */
const DYNAMIC_FLAG_KEY = 'SGC_ENABLE_DYNAMIC_RECORDS';
const TARGET_TIMEOUT_MS = 6000;
const POLL_MS = 300;
const SPOT_PADDING = 8;
const VIEWPORT_MARGIN = 6;
const MIN_FOCUS_DWELL_MS = 4000;

function usePrefersReducedMotion(): boolean {
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

/** Primer elemento visible cuyo data-demo-id coincide, en orden de preferencia. */
function findTarget(ids: string[]): HTMLElement | null {
  for (const id of ids) {
    const el = document.querySelector<HTMLElement>(`[data-demo-id="${id}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 2 && r.height > 2) return el;
  }
  return null;
}

/**
 * Hace visible el objetivo desplazando SOLO su contenedor con scroll propio
 * (overflow auto/scroll). No usa scrollIntoView: este desplaza tambien
 * contenedores con overflow hidden y el propio documento, lo que dejaba la
 * barra superior fuera de pantalla incluso despues de cerrar la demo.
 */
function revealTarget(el: HTMLElement, reducedMotion: boolean): void {
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
 * Localiza y sigue un objetivo del spotlight.
 * Reintenta mientras los modulos lazy se montan; recalcula con resize/scroll y
 * cuando el contenido cambia de tamano (p. ej. al terminar de cargar datos).
 */
function useSpotlight(focus: DemoFocus | null, focusKey: string, reducedMotion: boolean) {
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [phase, setPhase] = React.useState<SpotPhase>('none');

  React.useEffect(() => {
    if (!focus || focus.targets.length === 0) {
      setPhase('none');
      setRect(null);
      return undefined;
    }

    let cancelled = false;
    let scrolled = false;
    const startedAt = performance.now();
    setPhase('searching');

    const measure = () => {
      if (cancelled) return;
      const el = findTarget(focus.targets);

      if (!el) {
        if (performance.now() - startedAt > TARGET_TIMEOUT_MS) {
          setPhase('missing');
          setRect(null);
        }
        return;
      }

      if (!scrolled) {
        scrolled = true;
        try {
          revealTarget(el, reducedMotion);
        } catch {
          // Si no se puede desplazar, el spotlight se dibuja donde este.
        }
      }

      const r = el.getBoundingClientRect();
      const next: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
      setRect(prev => (sameRect(prev, next) ? prev : next));
      setPhase('found');
    };

    measure();
    const interval = window.setInterval(measure, POLL_MS);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
    // focusKey identifica paso+foco: `focus` es un objeto nuevo en cada render
    // y usarlo como dependencia reiniciaria la busqueda continuamente.
  }, [focusKey, reducedMotion]);

  return { rect, phase };
}

/** Hueco del spotlight con margen, acotado al viewport. */
function spotBox(rect: Rect): Rect | null {
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

type DockCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const DOCK_MARGIN = 20;
const DOCK_TOP = 72; // debajo de la barra superior de 56 px

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Esquina donde el panel lateral tapa menos el elemento iluminado. */
function chooseDockCorner(spot: Rect | null, panelW: number, panelH: number): DockCorner {
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

function dockStyle(corner: DockCorner): React.CSSProperties {
  const vertical = corner.startsWith('top') ? { top: DOCK_TOP } : { bottom: DOCK_MARGIN };
  const horizontal = corner.endsWith('left') ? { left: DOCK_MARGIN } : { right: DOCK_MARGIN };
  return { ...vertical, ...horizontal };
}

function lastFocusIndex(step: DemoStep): number {
  return Math.max(0, (step.focus?.length ?? 0) - 1);
}

const GuidedDemo: React.FC<GuidedDemoProps> = ({ onNavigate, onClose }) => {
  const reducedMotion = usePrefersReducedMotion();
  const data = useDemoData();

  const [index, setIndex] = React.useState(0);
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [autoplay, setAutoplay] = React.useState(false);
  const [arrivedByAutoplay, setArrivedByAutoplay] = React.useState(false);
  const [autoStoppedHere, setAutoStoppedHere] = React.useState(false);

  const panelRef = React.useRef<HTMLDivElement>(null);
  const onNavigateRef = React.useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const total = DEMO_STEPS.length;
  const step = DEMO_STEPS[index];
  const focus = step.layout === 'spotlight' ? step.focus?.[focusIndex] ?? null : null;
  const { rect, phase } = useSpotlight(focus, `${step.id}:${focusIndex}`, reducedMotion);

  // --- Feature flag de Dynamic Records: se activa solo durante la demo -----
  React.useEffect(() => {
    let previous: string | null = null;
    let changed = false;
    try {
      previous = localStorage.getItem(DYNAMIC_FLAG_KEY);
      if (previous !== '1') {
        localStorage.setItem(DYNAMIC_FLAG_KEY, '1');
        changed = true;
      }
    } catch {
      // localStorage no disponible: Dynamic Records usa su valor por defecto.
    }

    return () => {
      demoBus.clear();
      if (!changed) return;
      try {
        if (previous === null) localStorage.removeItem(DYNAMIC_FLAG_KEY);
        else localStorage.setItem(DYNAMIC_FLAG_KEY, previous);
      } catch {
        // Sin acceso a localStorage no hay nada que restaurar.
      }
    };
  }, []);

  // --- Foco del teclado y scroll del documento: se restauran al cerrar ------
  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.scrollingElement;
    const previousScroll = root ? root.scrollTop : 0;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      try {
        // Garantia adicional: la app queda exactamente como estaba.
        if (root) root.scrollTop = previousScroll;
        previouslyFocused?.focus?.({ preventScroll: true });
      } catch {
        // El elemento pudo desaparecer (p. ej. tras cerrar sesion).
      }
    };
  }, []);

  // --- Tamano real del panel, para colocarlo sin tapar el spotlight --------
  const [panelSize, setPanelSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      setPanelSize(prev => (
        prev.width === el.offsetWidth && prev.height === el.offsetHeight
          ? prev
          : { width: el.offsetWidth, height: el.offsetHeight }
      ));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- Navegacion real de la aplicacion al entrar en cada paso -------------
  React.useEffect(() => {
    const current = DEMO_STEPS[index];
    if (current.section) onNavigateRef.current(current.section);
    if (current.registrosTab) demoBus.requestRegistrosTab(current.registrosTab);
    if (current.recordTypeCode) demoBus.requestRecordTypeCode(current.recordTypeCode);
  }, [index]);

  // --- Movimiento entre pasos y focos --------------------------------------
  const goNext = React.useCallback((viaAutoplay = false) => {
    const current = DEMO_STEPS[index];
    if (current.layout === 'spotlight' && focusIndex < lastFocusIndex(current)) {
      setFocusIndex(focusIndex + 1);
      return;
    }
    if (index < total - 1) {
      setIndex(index + 1);
      setFocusIndex(0);
      setArrivedByAutoplay(viaAutoplay);
      setAutoStoppedHere(false);
      return;
    }
    onClose();
  }, [index, focusIndex, total, onClose]);

  const goPrev = React.useCallback(() => {
    if (focusIndex > 0) {
      setFocusIndex(focusIndex - 1);
      return;
    }
    if (index > 0) {
      const previous = DEMO_STEPS[index - 1];
      setIndex(index - 1);
      setFocusIndex(previous.layout === 'spotlight' ? lastFocusIndex(previous) : 0);
      setArrivedByAutoplay(false);
      setAutoStoppedHere(false);
    }
  }, [index, focusIndex]);

  const goTo = React.useCallback((target: number) => {
    if (target < 0 || target >= total) return;
    setIndex(target);
    setFocusIndex(0);
    setArrivedByAutoplay(false);
    setAutoStoppedHere(false);
  }, [total]);

  const toggleAutoplay = React.useCallback(() => {
    if (!autoplay) {
      // Reanudar sobre un paso "en vivo" cuenta como confirmacion del
      // presentador: el autoplay continuara desde aqui.
      setArrivedByAutoplay(false);
      setAutoStoppedHere(false);
    }
    setAutoplay(!autoplay);
  }, [autoplay]);

  // --- Autoplay -------------------------------------------------------------
  React.useEffect(() => {
    if (!autoplay) return undefined;

    const current = DEMO_STEPS[index];

    // Los pasos que requieren explicacion detienen el autoplay al llegar.
    if (arrivedByAutoplay && !current.autoAdvance) {
      setAutoplay(false);
      setAutoStoppedHere(true);
      return undefined;
    }

    // Tras el ultimo paso no hay nada a lo que avanzar.
    const isLastStop = index === total - 1 && focusIndex >= lastFocusIndex(current);
    if (isLastStop) {
      setAutoplay(false);
      return undefined;
    }

    const focusCount = current.layout === 'spotlight' ? current.focus?.length ?? 0 : 0;
    const delay = focusCount > 1
      ? Math.max(MIN_FOCUS_DWELL_MS, Math.round(current.dwellMs / focusCount))
      : current.dwellMs;

    const timer = window.setTimeout(() => goNext(true), delay);
    return () => window.clearTimeout(timer);
  }, [autoplay, index, focusIndex, arrivedByAutoplay, total, goNext]);

  // --- Atajos de teclado ----------------------------------------------------
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      // Si el presentador esta escribiendo en un formulario real, no se
      // intercepta ninguna tecla.
      const target = event.target as HTMLElement | null;
      const typing = !!target && (
        target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      );
      if (typing) return;

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          goNext(false);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goPrev();
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          toggleAutoplay();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [goNext, goPrev, toggleAutoplay, onClose]);

  const tryRealRag = React.useCallback(() => {
    // No ejecuta ningun analisis: lleva al panel real donde el presentador
    // puede lanzarlo a mano sobre un registro existente.
    setAutoplay(false);
    const dynamicIndex = DEMO_STEPS.findIndex(s => s.id === 'dynamic-records');
    if (dynamicIndex >= 0) goTo(dynamicIndex);
  }, [goTo]);

  // --- Geometria ------------------------------------------------------------
  const spot = step.layout === 'spotlight' && phase === 'found' && rect ? spotBox(rect) : null;
  const mode: 'stage' | 'dock' = step.layout === 'stage' ? 'stage' : 'dock';

  const dockCorner = chooseDockCorner(spot, panelSize.width, panelSize.height);
  const isOpening = step.visual === 'sgc-context';

  const isFirst = index === 0 && focusIndex === 0;
  const isLast = index === total - 1;
  const progress = ((index + 1) / total) * 100;
  const focusCount = step.layout === 'spotlight' ? step.focus?.length ?? 0 : 0;

  return (
    <div
      className={`gd-root gd-root--${mode}${reducedMotion ? ' gd-root--reduced' : ''}`}
      data-demo-overlay="true"
    >
      {spot ? (
        <div
          className="gd-spot"
          aria-hidden="true"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : (
        <div className="gd-dim" aria-hidden="true" />
      )}

      <div
        ref={panelRef}
        className={`gd-panel gd-panel--${mode}`}
        style={mode === 'dock' ? dockStyle(dockCorner) : undefined}
        role="dialog"
        aria-modal="false"
        aria-labelledby="gd-step-title"
        aria-describedby="gd-step-message"
        tabIndex={-1}
      >
        <header className="gd-head">
          {/* En la apertura la composicion grande ya muestra la marca: no se duplica. */}
          {!isOpening && <DemoBrand size="sm" showTagline={false} />}
          <div className="gd-head-meta">
            <StatusBadge status={step.status} />
            <span className="gd-counter">Paso {index + 1} de {total}</span>
            <button type="button" className="gd-icon-btn" onClick={onClose} aria-label="Salir de la demo guiada">
              ×
            </button>
          </div>
        </header>

        <div
          className="gd-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-label="Avance de la demo"
        >
          <span className="gd-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="gd-body" key={step.id}>
          <h2 id="gd-step-title" className="gd-title">{step.title}</h2>
          {step.visual !== 'fp15' && (
            <p id="gd-step-message" className="gd-message">{step.message}</p>
          )}
          {step.visual === 'fp15' && <p id="gd-step-message" className="gd-sr-only">{step.message}</p>}

          {focusCount > 1 && (
            <div className="gd-focus-chips" role="tablist" aria-label="Elementos de esta pantalla">
              {step.focus!.map((f, i) => (
                <button
                  key={f.label}
                  type="button"
                  role="tab"
                  aria-selected={i === focusIndex}
                  className={`gd-focus-chip${i === focusIndex ? ' is-active' : ''}`}
                  onClick={() => setFocusIndex(i)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {step.layout === 'spotlight' && phase === 'searching' && (
            <p className="gd-muted gd-searching">Abriendo la pantalla…</p>
          )}
          {step.layout === 'spotlight' && phase === 'missing' && (
            <p className="gd-env-notice" role="status">
              Esta pantalla aún no muestra el elemento señalado en este entorno. La historia continúa.
            </p>
          )}

          <DemoPreview
            visual={step.visual}
            data={data}
            onNext={() => goNext(false)}
            onTryRealRag={tryRealRag}
          />
        </div>

        <footer className="gd-foot">
          {autoStoppedHere && (
            <p className="gd-autostop" role="status">
              Reproducción en pausa: este paso se presenta en vivo.
            </p>
          )}
          <div className="gd-controls">
            <button type="button" className="gd-btn gd-btn--ghost" onClick={goPrev} disabled={isFirst}>
              ← Anterior
            </button>
            <button
              type="button"
              className="gd-btn gd-btn--ghost"
              onClick={toggleAutoplay}
              aria-pressed={autoplay}
            >
              {autoplay ? '❚❚ Pausar' : '▶ Reproducir'}
            </button>
            <button type="button" className="gd-btn gd-btn--primary" onClick={() => goNext(false)}>
              {isLast ? 'Terminar demo' : 'Siguiente →'}
            </button>
            {/* En el panel lateral compacto se sale con la × de la cabecera. */}
            {mode === 'stage' && (
              <button type="button" className="gd-btn gd-btn--quiet" onClick={onClose}>
                Salir
              </button>
            )}
          </div>
          {mode === 'stage' && (
            <p className="gd-shortcuts" aria-hidden="true">
              <kbd>←</kbd> <kbd>→</kbd> navegar · <kbd>Espacio</kbd> reproducir/pausar · <kbd>Esc</kbd> salir
            </p>
          )}
        </footer>
      </div>

      <div className="gd-sr-only" aria-live="polite">
        {`Paso ${index + 1} de ${total}: ${step.title}`}
      </div>
    </div>
  );
};

export default GuidedDemo;
