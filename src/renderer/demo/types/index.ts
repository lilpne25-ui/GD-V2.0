// Tipos del recorrido guiado.
//
// El recorrido se compone de escenas y cada escena de micro-pasos. Cada
// micro-paso es un evento independiente con id estable: la Fase 2 (voz) podra
// hacer "ejecutar accion -> esperar render -> spotlight -> narrar -> avanzar"
// sin depender de tiempos fijos.

/** Estado real de lo que se muestra. Se ensena siempre al usuario. */
export type DemoStatus = 'context' | 'live' | 'next' | 'vision' | 'plan';

/**
 * Origen del dato que se muestra en el paso. Nunca se mezclan:
 *  - REAL: datos o pantallas reales de GD-V2 / informacion de Innovax.
 *  - ANONYMIZED_REAL: derivado de datos reales, sin identificar personas.
 *  - DEMO_EXAMPLE: ejemplo creado para narrar, etiquetado como tal.
 *  - VISION: capacidad futura.
 *  - NO_DATA: capacidad implementada sin datos de demo en esta base.
 */
export type DataSource = 'REAL' | 'ANONYMIZED_REAL' | 'DEMO_EXAMPLE' | 'VISION' | 'NO_DATA';

/**
 * Acciones permitidas durante la demo. TODAS son de solo lectura o de
 * navegacion. Las escrituras no existen en este tipo: no se pueden declarar.
 * La politica en actions/policy.ts lo verifica tambien en tiempo de ejecucion.
 */
export type ReadOnlyActionKind =
  | 'app.navigate'
  | 'app.openNotifications'
  | 'app.closeNotifications'
  | 'doc.reset'
  | 'doc.openFolderPath'
  | 'doc.focusNode'
  | 'doc.setSearch'
  | 'doc.clearSearch'
  | 'doc.openDocumentViewer'
  | 'doc.closeDocumentViewers'
  | 'doc.openAccessDialog'
  | 'doc.closeAccessDialog'
  | 'doc.openReviewInbox'
  | 'doc.closeReviewInbox'
  | 'registros.setTab'
  | 'dynamic.selectType'
  | 'dynamic.resetForm'
  | 'dom.touchField';

export interface DemoAction {
  kind: ReadOnlyActionKind;
  params?: Record<string, unknown>;
  /**
   * 'auto': se ejecuta al entrar al paso.
   * 'presenter': el presentador la dispara con un boton (p. ej. abrir el visor
   * protegido, que en una pantalla compartida por Teams se ve en negro).
   */
  trigger?: 'auto' | 'presenter';
  /** Texto del boton cuando trigger = 'presenter'. */
  label?: string;
}

/** Contenido visual del panel para un paso. */
export type StepVisual =
  | 'intro'
  | 'intro-promise'
  | 'mirror'
  | 'field-origin'
  | 'record-lifecycle'
  | 'fp15'
  | 'fp15-flow'
  | 'closed-loop'
  | 'closed-loop-value'
  | 'roadmap'
  | 'roadmap-close';

/** Origen del valor de un campo del formulario (escena FP-05-C). */
export type FieldOrigin = 'user' | 'system';

export interface MicroStep {
  /** Id estable (kebab-case). La Fase 2 lo usara como clave de audio. */
  id: string;
  title: string;
  /** 1-3 frases, lenguaje de negocio. Es el subtitulo visible y la base de la voz. */
  narrationText: string;
  /**
   * Texto para el sintetizador cuando narrationText contiene codigos o siglas
   * que la voz leeria mal (FP-05-C, GD-V2, ISO 9001...). Solo se usa para el
   * audio: en pantalla siempre se muestra narrationText con el codigo real.
   */
  speechText?: string;
  /** data-demo-id objetivo, en orden de preferencia. Sin target: panel sin spotlight. */
  target?: string[];
  /** Accion de solo lectura previa al spotlight. */
  action?: DemoAction;
  /** Acciones de limpieza al abandonar el paso. */
  cleanup?: DemoAction[];
  status: DemoStatus;
  dataSource: DataSource;
  visual?: StepVisual;
  /** Solo escena FP-05-C: quien aporta el valor del campo iluminado. */
  fieldOrigin?: FieldOrigin;
  /** Mensaje si el objetivo no existe en este entorno (p. ej. bandeja vacia). */
  fallbackText?: string;
  /**
   * false: al terminar la narracion, la demo espera "Siguiente" aunque el
   * avance automatico este activo (el presentador habla o actua). Por defecto true.
   */
  autoAdvance?: boolean;
}

export interface Scene {
  id: string;
  title: string;
  status: DemoStatus;
  /** 'stage': panel central. 'spotlight': panel lateral sobre la app real. */
  layout: 'stage' | 'spotlight';
  /** Seccion de App.tsx a la que se navega (mismo mecanismo que el Sidebar). */
  section?: string;
  /** Acciones de solo lectura al entrar en la escena. */
  onEnter?: DemoAction[];
  /** Limpieza al salir de la escena (cerrar dialogos, limpiar busqueda...). */
  onExit?: DemoAction[];
  steps: MicroStep[];
}

/** Resultado de ejecutar una accion. */
export interface ActionResult {
  ok: boolean;
  /** Motivo mostrado discretamente si no esta disponible en este entorno. */
  reason?: string;
}
