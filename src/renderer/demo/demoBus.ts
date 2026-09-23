// Canal minimo entre la Demo guiada y modulos que guardan su navegacion interna
// en estado local (Registros -> pestana, Dynamic Records -> tipo de registro).
//
// La seccion principal NO pasa por aqui: la demo usa el mismo setSection de
// App.tsx. Esto solo cubre la navegacion interna de modulos lazy.
//
// Semantica de "peticion pendiente": como los modulos se montan de forma
// asincrona (React.lazy), la demo puede pedir una pestana antes de que el
// modulo exista. La peticion queda guardada y el modulo la consume al montarse.
// Sin peticiones pendientes, los modulos se comportan exactamente como antes.

type Channel = 'registros-tab' | 'record-type-code';
type Listener = (value: string) => void;

const pending: Record<Channel, string | null> = {
  'registros-tab': null,
  'record-type-code': null,
};

const listeners: Record<Channel, Set<Listener>> = {
  'registros-tab': new Set(),
  'record-type-code': new Set(),
};

function request(channel: Channel, value: string): void {
  pending[channel] = value;
  listeners[channel].forEach(listener => {
    try {
      listener(value);
    } catch {
      // Un listener defectuoso no debe romper la demo ni el modulo.
    }
  });
}

function consume(channel: Channel): string | null {
  const value = pending[channel];
  pending[channel] = null;
  return value;
}

function subscribe(channel: Channel, listener: Listener): () => void {
  listeners[channel].add(listener);
  return () => {
    listeners[channel].delete(listener);
  };
}

export const demoBus = {
  /** Pide a Registros que muestre una pestana ('studio' | 'workflow' | 'dynamic'). */
  requestRegistrosTab: (tab: string) => request('registros-tab', tab),
  consumeRegistrosTab: () => consume('registros-tab'),
  onRegistrosTab: (listener: Listener) => subscribe('registros-tab', listener),

  /** Pide a Dynamic Records que seleccione un tipo por codigo (p. ej. 'FP-05-C'). Solo lectura. */
  requestRecordTypeCode: (code: string) => request('record-type-code', code),
  consumeRecordTypeCode: () => consume('record-type-code'),
  onRecordTypeCode: (listener: Listener) => subscribe('record-type-code', listener),

  /** Descarta peticiones pendientes al cerrar la demo. */
  clear: () => {
    pending['registros-tab'] = null;
    pending['record-type-code'] = null;
  },
};
