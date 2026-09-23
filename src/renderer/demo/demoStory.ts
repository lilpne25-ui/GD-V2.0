// Guion de la Demo guiada Innovax.
//
// Datos puros: ningun paso escribe en la base de datos. Los pasos 'spotlight'
// iluminan pantallas reales de GD-V2; los pasos 'stage' muestran una vista
// local, siempre etiquetada con su estado real (hoy / siguiente / vision).

export type DemoStatus = 'context' | 'live' | 'next' | 'vision' | 'plan';

export type DemoVisual =
  | 'sgc-context'
  | 'sgc-mirror'
  | 'dashboard-live'
  | 'docs-live'
  | 'dynamic-live'
  | 'fp15'
  | 'closed-loop'
  | 'roadmap';

/** Un foco del spotlight. `targets` son data-demo-id en orden de preferencia. */
export interface DemoFocus {
  label: string;
  targets: string[];
}

export interface DemoStep {
  id: string;
  status: DemoStatus;
  title: string;
  message: string;
  layout: 'stage' | 'spotlight';
  visual: DemoVisual;
  /** Seccion de App.tsx a la que navegar (mismo mecanismo que el Sidebar). */
  section?: string;
  /** Pestana interna de Registros. */
  registrosTab?: string;
  /** Tipo de registro dinamico a seleccionar (solo lectura). */
  recordTypeCode?: string;
  /** Secuencia de focos: "Siguiente" recorre primero los focos y luego pasa de paso. */
  focus?: DemoFocus[];
  /**
   * Si es false, el autoplay se detiene al llegar: el paso se presenta en vivo.
   * Aplica a los momentos que requieren explicacion o accion del presentador.
   */
  autoAdvance: boolean;
  /** Tiempo de permanencia en autoplay (ms), dentro del rango 7-10 s. */
  dwellMs: number;
}

export const STATUS_META: Record<DemoStatus, { label: string; description: string }> = {
  context: {
    label: 'Contexto Innovax',
    description: 'Situación actual de Innovax. No es una capacidad de GD-V2.',
  },
  live: {
    label: 'Funciona hoy',
    description: 'Pantalla real de GD-V2 conectada a la base de datos.',
  },
  next: {
    label: 'Siguiente implementación',
    description: 'Diseño de la siguiente etapa. Todavía no está construido.',
  },
  vision: {
    label: 'Visión',
    description: 'Dirección del producto. No está construido.',
  },
  plan: {
    label: 'Plan',
    description: 'Ruta propuesta de implementación.',
  },
};

/** Codigos reales de Innovax que el sistema debe reconocer tal cual. */
export const INNOVAX_CODES = ['FP-05-C', 'FP-15-C', 'PR-01-A'];

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'sgc-existe',
    status: 'context',
    title: 'Innovax ya tiene un Sistema de Gestión',
    message:
      'Innovax no parte de cero. Su Lista Maestra ya identifica 197 documentos y contiene códigos, áreas, ' +
      'responsables, accesos, permisos, revisiones y retenciones. GD-V2 no busca sustituir ese sistema: ' +
      'busca convertirlo en operación digital.',
    layout: 'stage',
    visual: 'sgc-context',
    autoAdvance: true,
    dwellMs: 9000,
  },
  {
    id: 'sgc-mirror',
    status: 'next',
    title: 'SGC Mirror: conservar lo que ya funciona',
    message:
      'No pedimos a Innovax que abandone su nomenclatura. El sistema debe reconocer FP-05-C, FP-15-C, ' +
      'PR-01-A y el lenguaje que ya usan.',
    layout: 'stage',
    visual: 'sgc-mirror',
    autoAdvance: false,
    dwellMs: 9000,
  },
  {
    id: 'dashboard',
    status: 'live',
    title: 'Lo que ya ocurre, ya queda registrado',
    message:
      'Esta parte ya consulta el sistema. El panel consolida documentos, carpetas, pendientes, usuarios y ' +
      'actividad para dejar trazabilidad de lo que ocurre.',
    layout: 'spotlight',
    visual: 'dashboard-live',
    section: 'dashboard',
    focus: [
      { label: 'Indicadores', targets: ['dashboard-kpis', 'dashboard-root'] },
      { label: 'Trazabilidad', targets: ['dashboard-audit', 'dashboard-root'] },
    ],
    autoAdvance: true,
    dwellMs: 8000,
  },
  {
    id: 'documentacion',
    status: 'live',
    title: 'Un solo lugar para el control documental',
    message:
      'El primer cambio práctico es dejar de depender de saber dónde está el archivo correcto. Documentos, ' +
      'revisiones, responsables, workflow y actividad viven dentro de un mismo sistema.',
    layout: 'spotlight',
    visual: 'docs-live',
    section: 'documentacion',
    focus: [
      { label: 'Estructura', targets: ['documentacion-tree', 'documentacion-root'] },
      { label: 'Documentos y workflow', targets: ['documentacion-main', 'documentacion-root'] },
    ],
    autoAdvance: true,
    dwellMs: 8000,
  },
  {
    id: 'dynamic-records',
    status: 'live',
    title: 'Un motor, muchos formatos',
    message:
      'FP-05-C ya demuestra la arquitectura: no se programó una pantalla específica para este formato. ' +
      'El formulario se genera desde su definición.',
    layout: 'spotlight',
    visual: 'dynamic-live',
    section: 'registros',
    registrosTab: 'dynamic',
    recordTypeCode: 'FP-05-C',
    focus: [
      { label: 'Tipo FP-05-C', targets: ['dynamic-type-picker', 'dynamic-records-root', 'registros-tabs'] },
      { label: 'Formulario generado', targets: ['dynamic-record-form', 'dynamic-records-root'] },
      { label: 'Importar FP-05', targets: ['dynamic-fp05-import', 'dynamic-records-root'] },
    ],
    autoAdvance: false,
    dwellMs: 9000,
  },
  {
    id: 'fp15',
    status: 'next',
    title: 'FP-15-C · Registro de paros CNC',
    message: 'Ese sigue siendo su FP-15. Pero ahora produce información.',
    layout: 'stage',
    visual: 'fp15',
    autoAdvance: false,
    dwellMs: 10000,
  },
  {
    id: 'closed-loop',
    status: 'vision',
    title: 'Cerrar el ciclo de calidad',
    message:
      'Un problema detectado en planta debe llegar hasta la revisión por la dirección con su evidencia, ' +
      'sin reescribirse en cada paso.',
    layout: 'stage',
    visual: 'closed-loop',
    autoAdvance: false,
    dwellMs: 10000,
  },
  {
    id: 'roadmap',
    status: 'plan',
    title: 'Cómo llegamos de aquí a operación real',
    message: 'Empezamos con procesos concretos, medimos el resultado y escalamos.',
    layout: 'stage',
    visual: 'roadmap',
    autoAdvance: false,
    dwellMs: 10000,
  },
];
