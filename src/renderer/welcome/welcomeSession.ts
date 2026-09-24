// Control de la bienvenida: UNA vez por inicio de sesion.
//
//  - markLogin(): lo llama el login al terminar con exito.
//  - shouldShow(sessionKey): true solo si hubo un login y aun no se saludo
//    para esa sesion. Re-renderizados, cambios de modulo o abrir la demo no
//    la repiten.
//  - markShown(sessionKey): se llama cuando la voz EMPEZO de verdad (o cuando
//    no existe ninguna voz y el saludo fue solo visual). Un intento fallido no
//    consume el saludo.
//  - replay(): "Repetir bienvenida" (solo desde los controles de la demo).
//  - reset(): al cerrar sesion; el siguiente login vuelve a saludar.
//  - Restaurar una sesion guardada (reabrir la app) NO es un login: no saluda.
//
// Vive en memoria: no escribe en la base de datos ni en el almacenamiento.

type Listener = () => void;

let pendingLogin = false;
let shownFor: string | null = null;
let replayRequested = false;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      // Un oyente defectuoso no afecta al login.
    }
  });
}

export const welcomeSession = {
  markLogin(): void {
    pendingLogin = true;
    shownFor = null;
    notify();
  },

  shouldShow(sessionKey: string | null | undefined): boolean {
    if (!sessionKey) return false;
    return pendingLogin && shownFor !== sessionKey;
  },

  markShown(sessionKey: string): void {
    pendingLogin = false;
    replayRequested = false;
    shownFor = sessionKey;
  },

  /** Pide repetir el saludo en la sesion actual (prueba de audio del presentador). */
  replay(): void {
    pendingLogin = true;
    shownFor = null;
    replayRequested = true;
    notify();
  },

  /** La repeticion no espera al Dashboard: se pide desde cualquier modulo. */
  isReplay(): boolean {
    return replayRequested;
  },

  reset(): void {
    pendingLogin = false;
    shownFor = null;
    replayRequested = false;
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
