import React from 'react';
import '../assets/branding/innovax/innovax-tokens.css';
import './GuidedDemo.css';
import { DEMO_SCENES } from './steps/scenes';
import { demoBus } from './demoBus';
import { useDemoData } from './data/useDemoData';
import { useDemoEngine } from './engine/useDemoEngine';
import { useAutoplay } from './engine/useAutoplay';
import {
  chooseDockCorner,
  dockStyle,
  spotBox,
  usePrefersReducedMotion,
  useSpotlight,
} from './spotlight/useSpotlight';
import DemoPreview from './DemoPreview';
import { DemoBrand, SOURCE_BY_DATA, SourceTag, StatusBadge } from './DemoBrand';

// Demo guiada Innovax: una capa guiada sobre el software real.
//
// Garantias de diseno:
//  - No toca autenticacion ni escribe en la base de datos: toda accion pasa la
//    politica de solo lectura (actions/policy.ts).
//  - Navega con el mismo setSection que usa el Sidebar (no hay router nuevo).
//  - La capa oscura NUNCA intercepta clics (pointer-events: none): si algo
//    falla, la aplicacion sigue siendo usable debajo.
//  - Si un objetivo no aparece, la demo sigue con un aviso discreto.
//
// Este archivo es solo la vista: el orden lo decide engine/useDemoEngine, el
// spotlight vive en spotlight/ y las escenas en steps/scenes.ts.

interface GuidedDemoProps {
  onNavigate: (section: string) => void;
  onClose: () => void;
}

/** Feature flag existente de Dynamic Records (ver DynamicRecordsPanel). */
const DYNAMIC_FLAG_KEY = 'SGC_ENABLE_DYNAMIC_RECORDS';

const FIELD_ORIGIN_LABEL = {
  user: 'Lo captura el usuario',
  system: 'Lo asigna el sistema',
} as const;

const GuidedDemo: React.FC<GuidedDemoProps> = ({ onNavigate, onClose }) => {
  const reducedMotion = usePrefersReducedMotion();
  const data = useDemoData();
  const engine = useDemoEngine(DEMO_SCENES, { navigate: onNavigate });
  const { scene, step, phase, pos } = engine;

  const autoplay = useAutoplay({
    phase,
    stepKey: step.id,
    isFirstStepOfScene: pos.step === 0,
    sceneAutoAdvance: scene.autoAdvance,
    isLast: engine.isLast,
    next: engine.next,
  });

  const panelRef = React.useRef<HTMLDivElement>(null);

  // Mientras las acciones previas se ejecutan, el spotlight espera.
  const targets = scene.layout === 'spotlight' && phase !== 'running' ? step.target ?? null : null;
  const { rect, phase: spotPhase } = useSpotlight(
    targets,
    `${step.id}:${phase === 'running' ? 'running' : 'ready'}`,
    reducedMotion
  );

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
      if (!changed) return;
      try {
        if (previous === null) localStorage.removeItem(DYNAMIC_FLAG_KEY);
        else localStorage.setItem(DYNAMIC_FLAG_KEY, previous);
      } catch {
        // Sin acceso a localStorage no hay nada que restaurar.
      }
    };
  }, []);

  // --- Limpieza al cerrar: dialogos, busqueda, visores y comandos en cola ---
  const cleanupRef = React.useRef(engine.cleanupAll);
  cleanupRef.current = engine.cleanupAll;
  React.useEffect(() => () => {
    cleanupRef.current();
    demoBus.clear();
  }, []);

  // --- Foco del teclado y scroll del documento: se restauran al cerrar ------
  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.scrollingElement;
    const previousScroll = root ? root.scrollTop : 0;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      try {
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

  // --- Navegacion manual ------------------------------------------------------
  const goNext = React.useCallback(() => {
    autoplay.markManual();
    if (!engine.next()) onClose();
  }, [autoplay, engine, onClose]);

  const goPrev = React.useCallback(() => {
    autoplay.markManual();
    engine.prev();
  }, [autoplay, engine]);

  const goToScene = React.useCallback((index: number) => {
    autoplay.stop();
    autoplay.markManual();
    engine.goTo(index, 0);
  }, [autoplay, engine]);

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
          goNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goPrev();
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          autoplay.toggle();
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
  }, [goNext, goPrev, autoplay, onClose]);

  // --- Geometria ------------------------------------------------------------
  const spot = scene.layout === 'spotlight' && spotPhase === 'found' && rect ? spotBox(rect) : null;
  const mode: 'stage' | 'dock' = scene.layout === 'stage' ? 'stage' : 'dock';
  const dockCorner = chooseDockCorner(spot, panelSize.width, panelSize.height);
  const isOpening = step.visual === 'intro';

  const progress = ((engine.globalIndex + 1) / engine.totalSteps) * 100;
  const sceneCount = DEMO_SCENES.length;
  // Estos visuales ya llevan su propia etiqueta de origen (el plan marca el
  // estado de cada horizonte).
  const visualHasSource = ['fp15', 'fp15-flow', 'record-lifecycle', 'roadmap', 'roadmap-close']
    .includes(step.visual || '');
  const showSource = !isOpening && !visualHasSource && step.dataSource !== 'REAL';
  // Estos visuales repiten la narracion en grande: el texto queda para lectores de pantalla.
  const visualRepeatsNarration = ['fp15', 'closed-loop-value', 'roadmap-close'].includes(step.visual || '');

  const presenterAction = step.action?.trigger === 'presenter' ? step.action : undefined;

  let notice: string | null = null;
  if (phase === 'unavailable') {
    notice = step.fallbackText || engine.reason || 'No disponible en este entorno. La demo continúa.';
  } else if (targets && spotPhase === 'missing') {
    notice = step.fallbackText || 'No disponible en este entorno. La demo continúa.';
  }

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
            <span className="gd-counter" title={`Paso ${engine.globalIndex + 1} de ${engine.totalSteps}`}>
              Escena {pos.scene + 1} de {sceneCount} · {pos.step + 1}/{scene.steps.length}
            </span>
            <button type="button" className="gd-icon-btn" onClick={onClose} aria-label="Salir de la demo guiada">
              ×
            </button>
          </div>
        </header>

        <div
          className="gd-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={engine.totalSteps}
          aria-valuenow={engine.globalIndex + 1}
          aria-label="Avance de la demo"
        >
          <span className="gd-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="gd-body" key={step.id}>
          <span className="gd-scene-title">{scene.title}</span>
          <h2 id="gd-step-title" className="gd-title">{step.title}</h2>
          <p id="gd-step-message" className={visualRepeatsNarration ? 'gd-sr-only' : 'gd-message'}>
            {step.narrationText}
          </p>

          {(showSource || step.fieldOrigin) && (
            <div className="gd-step-tags">
              {showSource && <SourceTag kind={SOURCE_BY_DATA[step.dataSource]} />}
              {step.fieldOrigin && (
                <span className={`gd-origin-badge gd-origin-badge--${step.fieldOrigin}`}>
                  {FIELD_ORIGIN_LABEL[step.fieldOrigin]}
                </span>
              )}
            </div>
          )}

          {phase === 'running' && scene.layout === 'spotlight' && (
            <p className="gd-muted gd-searching">Abriendo la pantalla…</p>
          )}
          {phase !== 'running' && targets && spotPhase === 'searching' && (
            <p className="gd-muted gd-searching">Localizando el elemento…</p>
          )}
          {notice && <p className="gd-env-notice" role="status">{notice}</p>}

          {presenterAction && phase === 'awaiting-presenter' && (
            <button
              type="button"
              className="gd-btn gd-btn--primary gd-presenter-btn"
              onClick={() => { void engine.runPresenterAction(); }}
            >
              {presenterAction.label || 'Mostrar en vivo'}
            </button>
          )}

          <DemoPreview step={step} data={data} onNext={goNext} />
        </div>

        <footer className="gd-foot">
          {autoplay.stoppedHere && (
            <p className="gd-autostop" role="status">
              Reproducción en pausa: este paso se presenta en vivo.
            </p>
          )}
          <div className="gd-controls">
            <button type="button" className="gd-btn gd-btn--ghost" onClick={goPrev} disabled={engine.isFirst}>
              ← Anterior
            </button>
            <button
              type="button"
              className="gd-btn gd-btn--ghost"
              onClick={autoplay.toggle}
              aria-pressed={autoplay.enabled}
            >
              {autoplay.enabled ? '❚❚ Pausar' : '▶ Reproducir'}
            </button>
            <button type="button" className="gd-btn gd-btn--primary" onClick={goNext}>
              {engine.isLast ? 'Terminar demo' : 'Siguiente →'}
            </button>
            {/* En el panel lateral compacto se sale con la × de la cabecera. */}
            {mode === 'stage' && (
              <button type="button" className="gd-btn gd-btn--quiet" onClick={onClose}>
                Salir
              </button>
            )}
          </div>
          {mode === 'stage' && (
            <>
              <nav className="gd-scene-nav" aria-label="Escenas de la demo">
                {DEMO_SCENES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`gd-scene-dot${i === pos.scene ? ' is-active' : ''}`}
                    aria-label={`Escena ${i + 1}: ${s.title}`}
                    aria-current={i === pos.scene ? 'step' : undefined}
                    title={s.title}
                    onClick={() => goToScene(i)}
                  />
                ))}
              </nav>
              <p className="gd-shortcuts" aria-hidden="true">
                <kbd>←</kbd> <kbd>→</kbd> navegar · <kbd>Espacio</kbd> reproducir/pausar · <kbd>Esc</kbd> salir
              </p>
            </>
          )}
        </footer>
      </div>

      <div className="gd-sr-only" aria-live="polite">
        {`Escena ${pos.scene + 1} de ${sceneCount}: ${step.title}`}
      </div>
    </div>
  );
};

export default GuidedDemo;
