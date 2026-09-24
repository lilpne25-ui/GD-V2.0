import React from 'react';
import { InnovaxLogo } from '../demo/DemoBrand';
import { createVoiceEngine } from '../demo/narration/voiceEngineFactory';
import type { VoiceEngine, VoiceInitResult } from '../demo/narration/VoiceEngine';
import { waitForTarget } from '../demo/spotlight/waitForTarget';
import { WELCOME_SUBTITLE, formatRole, welcomeSpeech, welcomeTitle } from './greeting';
import { welcomeSession } from './welcomeSession';
import './WelcomeGreeting.css';

// Bienvenida tras un login correcto: tarjeta Innovax + saludo con la voz de la
// demo (Dalia). Una vez por sesion (welcomeSession), sin bloquear la
// aplicacion: no es modal, se puede cerrar y desaparece sola.
//
// Secuencia:
//   login -> Dashboard estable -> aparece la tarjeta -> motor de voz listo
//   -> la voz EMPIEZA (evento real) -> se marca el saludo como hecho
//   -> fin de la voz -> pausa breve -> salida suave.
// Si la voz no llega a empezar se reintenta una vez; si aun asi no suena, el
// saludo queda pendiente ("Repetir bienvenida" en los controles de la demo).

interface WelcomeGreetingProps {
  sessionKey: string | null;
  userName: string;
  role: string;
  /** La demo guiada esta abierta: la bienvenida se retira y calla. */
  suppressed: boolean;
}

type Phase = 'hidden' | 'shown' | 'leaving';

/** Tiempo minimo en pantalla (la voz puede alargarlo). */
const MIN_VISIBLE_MS = 4200;
const LEAVE_MS = 420;
/** Espera maxima a que la voz este lista antes de seguir sin ella. */
const VOICE_READY_TIMEOUT_MS = 6000;
/** Tope de una locucion de bienvenida (protege contra un audio colgado). */
const SPEAK_TIMEOUT_MS = 20000;
const ATTEMPTS = 2;

export const WELCOME_FALLBACK_NOTE = 'Voz principal no disponible. Usando voz de respaldo.';
export const WELCOME_NO_VOICE_NOTE = 'Voz no disponible.';

const log = (message: string) => console.info(`[Welcome] ${message}`);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(null); }
    );
  });
}

const WelcomeGreeting: React.FC<WelcomeGreetingProps> = ({ sessionKey, userName, role, suppressed }) => {
  const [phase, setPhase] = React.useState<Phase>('hidden');
  const [speaking, setSpeaking] = React.useState(false);
  const [preparing, setPreparing] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [hour, setHour] = React.useState(() => new Date().getHours());
  const engineRef = React.useRef<VoiceEngine | null>(null);
  const timersRef = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const closedRef = React.useRef(false);
  const runningRef = React.useRef(false);
  const sessionKeyRef = React.useRef(sessionKey);
  sessionKeyRef.current = sessionKey;

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const stopVoice = React.useCallback(() => {
    engineRef.current?.dispose();
    engineRef.current = null;
    setSpeaking(false);
  }, []);

  const close = React.useCallback(() => {
    closedRef.current = true;
    // Cerrada (por el usuario, la demo o el fin del saludo): no vuelve a aparecer.
    if (sessionKeyRef.current && welcomeSession.shouldShow(sessionKeyRef.current)) {
      welcomeSession.markShown(sessionKeyRef.current);
    }
    stopVoice();
    clearTimers();
    setPreparing(false);
    setPhase(prev => (prev === 'hidden' ? prev : 'leaving'));
    timersRef.current.push(setTimeout(() => setPhase('hidden'), LEAVE_MS));
  }, [stopVoice]);

  React.useEffect(() => {
    let cancelled = false;
    let targetWait: { cancel(): void } | null = null;
    const wait = (ms: number) => new Promise<void>(resolve => {
      timersRef.current.push(setTimeout(resolve, ms));
    });

    const run = async () => {
      if (!sessionKey || !welcomeSession.shouldShow(sessionKey) || runningRef.current) return;
      runningRef.current = true;
      try {
        const replay = welcomeSession.isReplay();
        log(replay ? 'repeticion solicitada' : 'login detectado');

        // La interfaz primero: el Dashboard y sus tarjetas ya pintados.
        if (!replay) {
          const handle = waitForTarget(['dashboard-kpis', 'dashboard-root'], 5000);
          targetWait = handle;
          await handle.promise;
          log('dashboard estable');
        }
        await wait(250);
        if (cancelled || !welcomeSession.shouldShow(sessionKey)) return;

        const now = new Date().getHours();
        const text = welcomeSpeech(now);
        closedRef.current = false;
        setHour(now);
        setNote(null);
        setPhase('shown');
        log(`tarjeta visible: "${text}"`);
        const shownAt = Date.now();
        let started = false;
        // Solo si la voz tarda: nunca mientras ya esta hablando.
        timersRef.current.push(setTimeout(() => { if (!started) setPreparing(true); }, 700));

        let spoke = false;
        let noVoice = false;
        for (let attempt = 1; attempt <= ATTEMPTS && !started; attempt++) {
          if (cancelled || closedRef.current) return;
          const engine = createVoiceEngine();
          engineRef.current = engine;
          const off = engine.onEvent(event => {
            if (event.type !== 'STARTED' || started) return;
            started = true;
            // Solo ahora cuenta como saludo hecho.
            welcomeSession.markShown(sessionKey);
            setPreparing(false);
            setSpeaking(true);
            if (event.source === 'fallback') setNote(WELCOME_FALLBACK_NOTE);
            log(`voz iniciada (${event.source === 'fallback' ? 'voz de respaldo' : 'voz principal'})`);
          });
          const init: VoiceInitResult | null = await withTimeout(engine.initialize(), VOICE_READY_TIMEOUT_MS);
          if (cancelled || closedRef.current) { off(); return; }
          log(`intento ${attempt}: ${init?.available ? `voz lista (${init.voice?.name})` : `sin voz (${init?.reason || 'tiempo agotado'})`}`);
          if (!init?.available) {
            off();
            engine.dispose();
            if (init) { noVoice = true; break; }
            continue;
          }
          const outcome = await withTimeout(engine.speak(text), SPEAK_TIMEOUT_MS);
          off();
          if (outcome === null) engine.cancel();
          log(`intento ${attempt}: fin de la voz -> ${outcome || 'tiempo agotado'}`);
          setSpeaking(false);
          if (cancelled || closedRef.current) return;
          spoke = started && outcome === 'finished';
          if (!started) {
            engine.dispose();
            await wait(700);
          }
        }
        setPreparing(false);
        if (!started) {
          if (noVoice) {
            // Sin ninguna voz femenina: el saludo es solo visual.
            welcomeSession.markShown(sessionKey);
            setNote(WELCOME_NO_VOICE_NOTE);
            log('sin voz disponible: saludo solo visual');
          } else {
            log('la voz no inicio: el saludo queda pendiente (Repetir bienvenida)');
          }
        }
        const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
        await wait(remaining + (spoke ? 700 : 0));
        if (!cancelled && !closedRef.current) {
          closedRef.current = true;
          stopVoice();
          setPhase('leaving');
          timersRef.current.push(setTimeout(() => setPhase('hidden'), LEAVE_MS));
          log('bienvenida terminada');
        }
      } finally {
        runningRef.current = false;
      }
    };

    const unsubscribe = welcomeSession.subscribe(() => { void run(); });
    void run();
    return () => {
      cancelled = true;
      unsubscribe();
      targetWait?.cancel();
      clearTimers();
      engineRef.current?.dispose();
      engineRef.current = null;
      runningRef.current = false;
    };
  }, [sessionKey, stopVoice]);

  // Si se abre la demo guiada, la bienvenida se retira sin seguir hablando.
  React.useEffect(() => {
    if (suppressed && phase === 'shown') close();
  }, [suppressed, phase, close]);

  if (phase === 'hidden') return null;

  return (
    <aside
      className={`welcome-card${phase === 'leaving' ? ' welcome-card--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Bienvenida"
      data-demo-id="welcome-card"
    >
      <span className="welcome-accent" aria-hidden="true" />
      <div className="welcome-body">
        <InnovaxLogo size="md" />
        <div className="welcome-copy">
          <strong className="welcome-title">{welcomeTitle(hour)}</strong>
          <span className="welcome-subtitle">{WELCOME_SUBTITLE}</span>
          {(userName || role) && (
            <span className="welcome-user">
              {userName}
              {role ? <em>{formatRole(role)}</em> : null}
            </span>
          )}
        </div>
        <button type="button" className="welcome-close" onClick={close} aria-label="Cerrar bienvenida">
          ×
        </button>
      </div>
      <div className="welcome-foot">
        <span className={`welcome-voice${speaking ? ' is-speaking' : ''}`} aria-hidden="true" />
        <span>{preparing ? 'Preparando experiencia…' : note || 'GD-V2 · Quality Operating System'}</span>
      </div>
    </aside>
  );
};

export default WelcomeGreeting;
