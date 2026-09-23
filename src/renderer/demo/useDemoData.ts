import React from 'react';
import type { RecordDefinition } from '../../shared/types/registros-dinamicos';
import type { RagStatusResult } from '../../shared/types/rag';

// Datos REALES que la demo consulta para narrar los pasos "Funciona hoy".
//
// Reglas:
//  - Solo lectura. Ninguna llamada crea, modifica o aprueba nada.
//  - Todos los canales pasan por los mismos IPC protegidos con withAuth que usa
//    la aplicacion: la demo no abre ningun camino nuevo al backend.
//  - Cada consulta tiene timeout propio: si la BD tarda o falla, la demo sigue.

const QUERY_TIMEOUT_MS = 8000;

export type Loadable<T> =
  | { state: 'loading' }
  | { state: 'ready'; value: T }
  | { state: 'unavailable'; reason: string };

export interface DemoMetrics {
  documentos: number;
  carpetas: number;
  pendientesRevision: number;
  usuariosActivos: number;
  eventosAuditoria: number;
}

export interface DemoData {
  metrics: Loadable<DemoMetrics>;
  /** null dentro de 'ready' significa que FP-05-C no esta sembrado en esta base. */
  fp05c: Loadable<RecordDefinition | null>;
  rag: Loadable<RagStatusResult>;
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label}: sin respuesta en ${QUERY_TIMEOUT_MS / 1000} s`)),
      QUERY_TIMEOUT_MS
    );
    promise.then(
      value => { window.clearTimeout(timer); resolve(value); },
      error => { window.clearTimeout(timer); reject(error); }
    );
  });
}

function reasonOf(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '');
  // Mensajes cortos y sin detalles internos: se muestran al cliente.
  if (/unauthorized/i.test(raw)) return 'La sesión no es válida. Vuelve a iniciar sesión.';
  if (/sin respuesta/i.test(raw)) return 'La base de datos no respondió a tiempo.';
  return 'No fue posible consultar la base de datos en este entorno.';
}

async function loadMetrics(): Promise<DemoMetrics> {
  const bridge = (window as unknown as { dashboard?: { getMetrics: () => Promise<any> } }).dashboard;
  if (!bridge?.getMetrics) throw new Error('Canal de métricas no disponible');
  const raw = await withTimeout(bridge.getMetrics(), 'Métricas');
  return {
    documentos: Number(raw?.documentos || 0),
    carpetas: Number(raw?.carpetas || 0),
    pendientesRevision: Number(raw?.pendientesRevision || 0),
    usuariosActivos: Number(raw?.usuariosActivos || 0),
    eventosAuditoria: Array.isArray(raw?.auditTrail) ? raw.auditTrail.length : 0,
  };
}

async function loadFp05c(): Promise<RecordDefinition | null> {
  if (!window.records?.getDefinition) throw new Error('Canal de registros no disponible');
  return withTimeout(window.records.getDefinition({ recordTypeCode: 'FP-05-C' }), 'FP-05-C');
}

async function loadRag(): Promise<RagStatusResult> {
  // rag:get-status solo lee configuracion local y la BD: no llama al proveedor.
  if (!window.rag?.getStatus) throw new Error('Canal RAG no disponible');
  return withTimeout(window.rag.getStatus(), 'RAG');
}

export function useDemoData(): DemoData {
  const [data, setData] = React.useState<DemoData>({
    metrics: { state: 'loading' },
    fp05c: { state: 'loading' },
    rag: { state: 'loading' },
  });

  React.useEffect(() => {
    let alive = true;

    const settle = <K extends keyof DemoData>(key: K, task: () => Promise<any>) => {
      task().then(
        value => { if (alive) setData(prev => ({ ...prev, [key]: { state: 'ready', value } })); },
        error => { if (alive) setData(prev => ({ ...prev, [key]: { state: 'unavailable', reason: reasonOf(error) } })); }
      );
    };

    settle('metrics', loadMetrics);
    settle('fp05c', loadFp05c);
    settle('rag', loadRag);

    return () => { alive = false; };
  }, []);

  return data;
}
