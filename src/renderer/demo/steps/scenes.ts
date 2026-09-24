// Recorrido guiado Innovax: 15 escenas y sus micro-pasos.
//
// Reglas:
//  - Cada micro-paso es un evento independiente con id estable.
//  - narrationText: 1-3 frases de negocio; es lo que se narrara en la Fase 2.
//  - Toda accion es de solo lectura (ver actions/policy.ts).
//  - status y dataSource dicen la verdad sobre lo que se ve.
//  - Sin numerales ISO en el discurso: la norma guia el producto, no la demo.

import type { Scene } from '../types';
import {
  DEMO_APPROVED_FOLDER,
  DEMO_MASTER_LIST,
  DEMO_PROCEDURE_FOLDER,
  DEMO_SEARCH_CODE,
} from '../data/safeDocuments';

export const DEMO_SCENES: Scene[] = [
  // 1 · INNOVAX YA TIENE UN SGC ---------------------------------------------
  {
    id: 'intro',
    title: 'Innovax ya tiene su Sistema de Gestión',
    status: 'context',
    layout: 'stage',
    steps: [
      {
        id: 'intro-innovax',
        title: 'Innovax ya tiene su Sistema de Gestión',
        narrationText:
          'Innovax ya tiene su Sistema de Gestión: ' +
          'procedimientos, formatos, responsables y una Lista Maestra. ' +
          'GD-V2 parte de lo que ya existe.',
        speechText:
          'Innovax ya tiene su Sistema de Gestión: ' +
          'procedimientos, formatos, responsables y una Lista Maestra. ' +
          'G D V 2 parte de lo que ya existe.',
        status: 'context',
        dataSource: 'REAL',
        visual: 'intro',
      },
      {
        id: 'intro-promise',
        title: 'No lo reemplazamos: lo hacemos operativo',
        narrationText:
          'No venimos a sustituir su sistema ni su nomenclatura. Venimos a convertir lo que ya tienen en una operación digital y trazable.',
        status: 'context',
        dataSource: 'REAL',
        visual: 'intro-promise',
      },
    ],
  },

  // 2 · CONTROL Y SEGURIDAD --------------------------------------------------
  {
    id: 'session',
    title: 'Cada persona opera con su propia sesión',
    status: 'live',
    layout: 'spotlight',
    section: 'dashboard',
    steps: [
      {
        id: 'session-identity',
        title: 'Identidad y puesto',
        narrationText:
          'Cada persona entra con su propia sesión. ' +
          'El sistema sabe quién está operando y con qué puesto, y con esa identidad deja trazabilidad.',
        target: ['app-user-chip'],
        status: 'live',
        dataSource: 'REAL',
      },
    ],
  },

  // 3 · VISIBILIDAD ----------------------------------------------------------
  {
    id: 'dashboard',
    title: 'Visibilidad del sistema',
    status: 'live',
    layout: 'spotlight',
    section: 'dashboard',
    steps: [
      {
        id: 'dash-documents',
        title: 'Documentos',
        narrationText:
          'Este panel muestra el estado actual del sistema. ' +
          'Aquí vemos los documentos controlados que existen hoy, leídos directamente de la base de datos.',
        target: ['dashboard-kpi-documentos', 'dashboard-kpis'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'dash-folders',
        title: 'Carpetas',
        narrationText:
          'Las carpetas reflejan cómo Innovax organiza su información, por etapa y por área.',
        target: ['dashboard-kpi-carpetas', 'dashboard-kpis'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'dash-pending',
        title: 'Pendientes de revisión',
        narrationText:
          'Aquí están los documentos que esperan revisión. ' +
          'Es la primera señal de dónde se detiene el flujo.',
        target: ['dashboard-kpi-pendientes', 'dashboard-kpis'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'dash-users',
        title: 'Usuarios activos',
        narrationText:
          'Y aquí, cuántas personas pueden operar hoy el sistema, cada una con su propia sesión.',
        target: ['dashboard-kpi-usuarios', 'dashboard-kpis'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'dash-summary',
        title: 'Resumen operativo',
        narrationText:
          'El resumen traduce esas cifras a estado operativo, para que Dirección y Calidad lo lean de un vistazo.',
        target: ['dashboard-summary', 'dashboard-root'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'dash-activity',
        title: 'Bitácora de actividad',
        narrationText:
          'El sistema no solo guarda información: ' +
          'registra la actividad. ' +
          'Se sabe qué pasó, cuándo, quién lo hizo y sobre qué documento.',
        target: ['dashboard-audit', 'dashboard-root'],
        status: 'live',
        dataSource: 'REAL',
      },
    ],
  },

  // 4 · DOCUMENTACION REAL ---------------------------------------------------
  {
    id: 'documents',
    title: 'La documentación real de Innovax',
    status: 'live',
    layout: 'spotlight',
    section: 'documentacion',
    onEnter: [{ kind: 'doc.reset' }],
    steps: [
      {
        id: 'docs-tree',
        title: 'Estructura documental',
        narrationText:
          'Desde aquí, Calidad consulta la documentación vigente de Innovax, con la misma estructura que ya utilizan.',
        target: ['documentacion-tree', 'documentacion-root'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'docs-lifecycle',
        title: 'Ciclo de vida del documento',
        narrationText:
          'Las carpetas siguen el ciclo de vida del documento: ' +
          'en proceso, en revisión y aprobado.',
        action: { kind: 'doc.openFolderPath', params: { path: DEMO_APPROVED_FOLDER } },
        target: ['doc-tree-focus', 'documentacion-tree'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'docs-areas',
        title: 'Organización por área',
        narrationText:
          'Dentro de lo aprobado, la información se organiza por área: Dirección, Calidad, Ventas, Mecanizado, Ensamble y más.',
        target: ['doc-grid', 'documentacion-main'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'docs-procedure',
        title: 'Un procedimiento y sus formatos',
        narrationText:
          'Aquí vive el procedimiento de información documentada, junto con sus formatos y listas maestras.',
        action: { kind: 'doc.openFolderPath', params: { path: DEMO_PROCEDURE_FOLDER } },
        target: ['doc-grid', 'documentacion-main'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'docs-counters',
        title: 'Dónde estamos',
        narrationText: 'Los contadores confirman en qué carpeta estamos y cuántos documentos contiene.',
        target: ['doc-overview', 'documentacion-main'],
        status: 'live',
        dataSource: 'REAL',
      },
    ],
  },

  // 5 · BUSQUEDA -------------------------------------------------------------
  {
    id: 'search',
    title: 'Localizar un documento por su código',
    status: 'live',
    layout: 'spotlight',
    section: 'documentacion',
    steps: [
      {
        id: 'search-code',
        title: 'Buscar por código',
        narrationText:
          'Ahora buscamos por código. ' +
          'La búsqueda filtra los documentos de la carpeta en la que estamos.',
        action: { kind: 'doc.setSearch', params: { text: DEMO_SEARCH_CODE } },
        target: ['doc-search', 'documentacion-main'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'search-results',
        title: 'Resultado inmediato',
        narrationText:
          'En segundos aparecen la Lista Maestra y sus formatos relacionados, sin recorrer carpetas a mano.',
        target: ['doc-grid', 'documentacion-main'],
        status: 'live',
        dataSource: 'REAL',
      },
    ],
  },

  // 6 · LISTA MAESTRA ----------------------------------------------------------
  {
    id: 'master-list',
    title: 'La Lista Maestra, dentro del sistema',
    status: 'live',
    layout: 'spotlight',
    section: 'documentacion',
    onExit: [{ kind: 'doc.closeDocumentViewers' }],
    steps: [
      {
        id: 'master-row',
        title: 'Información que Innovax ya usa',
        narrationText:
          'Esta es la Lista Maestra de documentos internos que Innovax ya utiliza. ' +
          'La diferencia es que ahora el sistema sabe dónde está y en qué flujo participa.',
        action: { kind: 'doc.focusNode', params: { name: DEMO_MASTER_LIST } },
        target: ['doc-node-focus', 'doc-grid'],
        status: 'live',
        dataSource: 'REAL',
        fallbackText: 'El documento no está disponible en este entorno. La demo continúa.',
      },
      {
        id: 'master-viewer',
        title: 'Visor protegido',
        narrationText:
          'Aquí podemos consultar directamente la Lista Maestra en un visor protegido. ' +
          'La marca de agua identifica a quien consulta, su puesto y la hora.',
        action: {
          kind: 'doc.openDocumentViewer',
          params: { name: DEMO_MASTER_LIST },
          trigger: 'presenter',
          label: 'Abrir en el visor protegido',
        },
        target: ['doc-node-focus', 'doc-grid'],
        status: 'live',
        dataSource: 'REAL',
        fallbackText: 'El visor no pudo abrirse en este entorno. La demo continúa.',
        autoAdvance: false,
      },
      {
        id: 'master-protection',
        title: 'Consulta sin fuga',
        narrationText:
          'Mientras un documento está abierto, la aplicación bloquea las capturas de pantalla. ' +
          'La información vigente se consulta, pero no se fuga.',
        target: ['doc-node-focus', 'doc-grid'],
        status: 'live',
        dataSource: 'REAL',
      },
    ],
  },

  // 7 · DE DOCUMENTO A REGLA (siguiente implementacion) ------------------------
  {
    id: 'mirror',
    title: 'De documento a regla',
    status: 'next',
    layout: 'spotlight',
    section: 'documentacion',
    steps: [
      {
        id: 'mirror-attributes',
        title: 'Lo que hoy es texto',
        narrationText:
          'La Lista Maestra ya define para cada documento su responsable, su acceso, su revisión y su retención. Hoy eso es texto.',
        target: ['doc-node-focus', 'doc-grid'],
        status: 'next',
        dataSource: 'DEMO_EXAMPLE',
      },
      {
        id: 'mirror-rules',
        title: 'Lo que será regla',
        narrationText:
          'En la siguiente etapa, esos atributos controlarán el sistema: ' +
          'el responsable disparará el workflow, el acceso definirá permisos, la revisión controlará versiones y la retención aplicará la política.',
        speechText:
          'En la siguiente etapa, esos atributos controlarán el sistema: ' +
          'el responsable disparará el flujo de revisión, el acceso definirá permisos, la revisión controlará versiones y la retención aplicará la política.',
        target: ['doc-node-focus', 'doc-grid'],
        status: 'next',
        dataSource: 'DEMO_EXAMPLE',
        visual: 'mirror',
      },
    ],
  },

  // 8 · PERMISOS ---------------------------------------------------------------
  {
    id: 'permissions',
    title: 'Qué puede hacer cada usuario',
    status: 'live',
    layout: 'spotlight',
    section: 'documentacion',
    onExit: [{ kind: 'doc.closeAccessDialog' }],
    steps: [
      {
        id: 'perm-identity',
        title: 'Puesto y usuario',
        narrationText: 'Cada usuario tiene un puesto y un conjunto de permisos propios.',
        action: { kind: 'doc.openAccessDialog' },
        target: ['doc-access-dialog'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'perm-actions',
        title: 'Acciones permitidas',
        narrationText:
          'Agregar, eliminar, renombrar, mover y firmar se configuran por usuario. ' +
          'El SGC deja de depender de quién conoce la carpeta.',
        speechText:
          'Agregar, eliminar, renombrar, mover y firmar se configuran por usuario. ' +
          'El sistema de gestión deja de depender de quién conoce la carpeta.',
        target: ['doc-access-perms', 'doc-access-dialog'],
        status: 'live',
        dataSource: 'REAL',
      },
    ],
  },

  // 9 · WORKFLOW DE REVISION -----------------------------------------------------
  // Ciclo real (useWorkflow + WorkflowRepo): borrador -> revision -> aprobado |
  // correcciones -> (el autor corrige y reenvia) -> revision. Las decisiones se
  // muestran en los dialogos REALES abiertos como vista previa (no escriben).
  {
    id: 'review',
    title: 'Revisión y aprobación',
    status: 'live',
    layout: 'spotlight',
    section: 'documentacion',
    onExit: [{ kind: 'doc.closeDecisionPreview' }, { kind: 'doc.closeReviewInbox' }],
    steps: [
      {
        id: 'review-submit',
        title: 'Enviar a revisión',
        narrationText:
          'Cuando un documento termina su edición, su autor lo envía a revisión. ' +
          'En ese momento, Coordinación del SGC recibe un aviso dentro del sistema.',
        speechText:
          'Cuando un documento termina su edición, su autor lo envía a revisión. ' +
          'En ese momento, la coordinación del sistema de gestión recibe un aviso dentro del sistema.',
        target: ['doc-review-btn', 'documentacion-main'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'review-inbox',
        title: 'Bandeja de revisión',
        narrationText:
          'El documento llega a esta bandeja de revisión, con quién lo envió y cuándo.',
        action: { kind: 'doc.openReviewInbox' },
        target: ['doc-review-dialog'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'review-authority',
        title: 'Quién decide',
        narrationText:
          'La bandeja indica quién puede aprobar o pedir correcciones: Coordinación del SGC, Dirección o Administración.',
        speechText:
          'La bandeja indica quién puede aprobar o pedir correcciones: ' +
          'la coordinación del sistema de gestión, Dirección o Administración.',
        target: ['doc-review-rule', 'doc-review-dialog'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'review-branches',
        title: 'Dos caminos',
        narrationText: 'Desde aquí existen dos caminos: aprobar, o solicitar correcciones.',
        action: { kind: 'doc.openReviewInbox' },
        target: ['doc-review-dialog'],
        status: 'live',
        dataSource: 'REAL',
        visual: 'workflow-branch',
        workflowFocus: 'overview',
      },
      {
        id: 'review-approve',
        title: 'Aprobar',
        narrationText:
          'Si el documento cumple con lo requerido, el responsable autorizado lo aprueba. ' +
          'Al hacerlo puede moverlo a la carpeta de aprobados y avisar por correo.',
        action: { kind: 'doc.openDecisionPreview', params: { branch: 'aprobar' } },
        target: ['doc-approve-preview'],
        status: 'live',
        dataSource: 'REAL_UI_EXAMPLE',
        visual: 'workflow-branch',
        workflowFocus: 'approve',
      },
      {
        id: 'review-approve-result',
        title: 'Resultado: aprobado',
        narrationText:
          'Al confirmar, el documento queda Aprobado, con el nombre de quien aprobó y la fecha. ' +
          'Su autor recibe el aviso: documento aprobado.',
        action: { kind: 'doc.openDecisionPreview', params: { branch: 'aprobar' } },
        target: ['doc-approve-confirm', 'doc-approve-preview'],
        status: 'live',
        dataSource: 'REAL_UI_EXAMPLE',
        visual: 'workflow-branch',
        workflowFocus: 'approve',
      },
      {
        id: 'review-correct',
        title: 'Solicitar correcciones',
        narrationText:
          'Si necesita cambios, no se pierde el seguimiento. ' +
          'El revisor indica qué está mal, por qué, y cómo debe corregirse.',
        action: { kind: 'doc.openDecisionPreview', params: { branch: 'correcciones' } },
        target: ['doc-correction-fields', 'doc-correction-preview'],
        status: 'live',
        dataSource: 'REAL_UI_EXAMPLE',
        visual: 'workflow-branch',
        workflowFocus: 'correct',
      },
      {
        id: 'review-correct-result',
        title: 'Resultado: correcciones',
        narrationText:
          'El documento pasa a Correcciones y la observación queda en su historial. ' +
          'Su autor recibe el aviso y un correo con el detalle.',
        action: { kind: 'doc.openDecisionPreview', params: { branch: 'correcciones' } },
        target: ['doc-correction-send', 'doc-correction-preview'],
        status: 'live',
        dataSource: 'REAL_UI_EXAMPLE',
        visual: 'workflow-branch',
        workflowFocus: 'correct',
      },
      {
        id: 'review-resubmit',
        title: 'Corregir y reenviar',
        narrationText:
          'El autor corrige y vuelve a enviarlo. ' +
          'El documento regresa a revisión, y Coordinación recibe un nuevo aviso.',
        action: { kind: 'doc.openDecisionPreview', params: { branch: 'correcciones' } },
        target: ['doc-correction-preview'],
        status: 'live',
        dataSource: 'REAL_UI_EXAMPLE',
        visual: 'workflow-branch',
        workflowFocus: 'resubmit',
      },
      {
        id: 'review-email',
        title: 'También por correo',
        narrationText:
          'Además del aviso interno, el sistema puede enviar la notificación por correo. ' +
          'Así, la revisión deja de depender de correos aislados que después nadie puede rastrear.',
        action: { kind: 'doc.openDecisionPreview', params: { branch: 'correcciones' } },
        target: ['doc-correction-email', 'doc-correction-preview'],
        status: 'live',
        dataSource: 'REAL_UI_EXAMPLE',
        visual: 'workflow-email',
        autoAdvance: false,
      },
    ],
  },

  // 10 · CORRECCIONES Y NOTIFICACIONES --------------------------------------------
  {
    id: 'notifications',
    title: 'La conversación alrededor del documento',
    status: 'live',
    layout: 'spotlight',
    section: 'documentacion',
    onExit: [{ kind: 'app.closeNotifications' }],
    steps: [
      {
        id: 'notif-bell',
        title: 'Avisos a quien debe actuar',
        narrationText:
          'Cada envío, aprobación o corrección genera un aviso para la persona que debe actuar.',
        target: ['noti-bell'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'notif-panel',
        title: 'Historial de avisos',
        narrationText:
          'Aquí queda el rastro del flujo: qué se aprobó y dónde se pidieron correcciones. ' +
          'Las observaciones no se pierden en mensajes externos.',
        action: { kind: 'app.openNotifications' },
        target: ['noti-panel', 'noti-bell'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'notif-correction',
        title: 'Correcciones con contexto',
        narrationText:
          'Una solicitud de corrección conserva qué está mal, por qué y cómo corregirlo, junto al documento.',
        target: ['noti-item-correction', 'noti-panel'],
        status: 'live',
        dataSource: 'REAL',
      },
    ],
  },

  // 11 · CAPTURA OPERATIVA: FP-05-C -------------------------------------------------
  {
    id: 'fp05',
    title: 'Un formato que se convierte en captura',
    status: 'live',
    layout: 'spotlight',
    section: 'registros',
    onEnter: [
      { kind: 'registros.setTab', params: { tab: 'dynamic' } },
      { kind: 'dynamic.selectType', params: { code: 'FP-05-C' } },
    ],
    onExit: [{ kind: 'dynamic.resetForm' }],
    steps: [
      {
        id: 'fp05-type',
        title: 'Tipo de registro FP-05-C',
        narrationText:
          'Un formato del sistema de gestión deja de ser un archivo muerto y se convierte en una captura estructurada.',
        target: ['dynamic-type-picker', 'dynamic-records-root'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'fp05-definition',
        title: 'El formulario nace de su definición',
        narrationText:
          'No programamos una pantalla especial para FP-05-C: ' +
          'el formulario nace de su definición.',
        speechText:
          'No programamos una pantalla especial para el efe, pe, cero cinco, ce: ' +
          'el formulario nace de su definición.',
        target: ['dynamic-record-form', 'dynamic-records-root'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'fp05-equipment',
        title: 'Equipo',
        narrationText:
          'Equipo: ' +
          'el usuario lo elige de una lista definida, no lo escribe a mano.',
        target: ['dynamic-field-equipo', 'dynamic-record-form'],
        status: 'live',
        dataSource: 'REAL',
        fieldOrigin: 'user',
        visual: 'field-origin',
      },
      {
        id: 'fp05-kind',
        title: 'Preventivo o correctivo',
        narrationText:
          'Preventivo o correctivo: ' +
          'una clasificación que después permite medir.',
        target: ['dynamic-field-tipo', 'dynamic-record-form'],
        status: 'live',
        dataSource: 'REAL',
        fieldOrigin: 'user',
        visual: 'field-origin',
      },
      {
        id: 'fp05-activity',
        title: 'Actividad realizada',
        narrationText:
          'La actividad la captura quien hizo el trabajo, con el detalle técnico.',
        target: ['dynamic-field-actividad', 'dynamic-record-form'],
        status: 'live',
        dataSource: 'REAL',
        fieldOrigin: 'user',
        visual: 'field-origin',
      },
      {
        id: 'fp05-owner',
        title: 'Responsable automático',
        narrationText:
          'El responsable lo asigna el sistema a partir de la sesión. ' +
          'Nadie tiene que escribirlo.',
        target: ['dynamic-field-responsable', 'dynamic-record-form'],
        status: 'live',
        dataSource: 'REAL',
        fieldOrigin: 'system',
        visual: 'field-origin',
      },
      {
        id: 'fp05-date',
        title: 'Fecha automática',
        narrationText:
          'La fecha también la pone el sistema. ' +
          'No depende de que alguien la recuerde.',
        target: ['dynamic-field-fecha', 'dynamic-record-form'],
        status: 'live',
        dataSource: 'REAL',
        fieldOrigin: 'system',
        visual: 'field-origin',
      },
      {
        id: 'fp05-validation',
        title: 'Validación antes de guardar',
        narrationText:
          'Si falta información obligatoria, el formulario lo señala antes de guardar. Nada incompleto llega como evidencia.',
        action: { kind: 'dom.touchField', params: { target: 'dynamic-field-actividad' } },
        target: ['dynamic-field-actividad', 'dynamic-record-form'],
        status: 'live',
        dataSource: 'REAL',
      },
      {
        id: 'fp05-import',
        title: 'Desde Excel',
        narrationText:
          'Los formatos que hoy viven en Excel pueden importarse como definición y registros. En la demo no ejecutamos importaciones.',
        target: ['dynamic-fp05-import', 'dynamic-records-root'],
        status: 'live',
        dataSource: 'REAL',
      },
    ],
  },

  // 12 · EVIDENCIA ESTRUCTURADA: ESTADOS DEL REGISTRO ------------------------------
  {
    id: 'record-states',
    title: 'Estados y trazabilidad del registro',
    status: 'live',
    layout: 'spotlight',
    section: 'registros',
    steps: [
      {
        id: 'record-lifecycle',
        title: 'Ciclo de vida del registro',
        narrationText:
          'Cada registro recorre un ciclo de vida: ' +
          'borrador, en revisión, aprobado, rechazado u obsoleto. ' +
          'Esta base todavía no tiene registros de demostración, por eso lo mostramos como capacidad.',
        target: ['dynamic-record-list', 'dynamic-records-root'],
        status: 'live',
        dataSource: 'NO_DATA',
        visual: 'record-lifecycle',
      },
      {
        id: 'record-protection',
        title: 'Evidencia protegida',
        narrationText:
          'Todo registro nace como borrador y solo se edita en ese estado. ' +
          'Después queda protegido y cada cambio se audita con su antes y su después.',
        target: ['dynamic-submit', 'dynamic-record-form'],
        status: 'live',
        dataSource: 'NO_DATA',
        visual: 'record-lifecycle',
        autoAdvance: false,
      },
    ],
  },

  // 13 · FP-15-C (siguiente implementacion) ------------------------------------------
  {
    id: 'fp15',
    title: 'FP-15-C · Registro de paros CNC',
    status: 'next',
    layout: 'stage',
    steps: [
      {
        id: 'fp15-format',
        title: 'Ese seguirá siendo su FP-15',
        narrationText:
          'Ese seguirá siendo su FP-15. ' +
          'La diferencia es que también producirá información.',
        speechText:
          'Ese seguirá siendo su efe pe quince. ' +
          'La diferencia es que también producirá información.',
        status: 'next',
        dataSource: 'ANONYMIZED_REAL',
        visual: 'fp15',
      },
      {
        id: 'fp15-data',
        title: 'De captura a decisión',
        narrationText:
          'En la siguiente etapa, cada paro calculará su duración y alimentará la recurrencia y el Pareto. ' +
          'Después se conectarán la no conformidad, la acción y el indicador.',
        status: 'next',
        dataSource: 'ANONYMIZED_REAL',
        visual: 'fp15-flow',
        autoAdvance: false,
      },
    ],
  },

  // 14 · CICLO CERRADO (vision) ---------------------------------------------------------
  {
    id: 'closed-loop',
    title: 'Cerrar el ciclo de calidad',
    status: 'vision',
    layout: 'stage',
    steps: [
      {
        id: 'loop-chain',
        title: 'Del evento a la mejora',
        narrationText:
          'La visión es que un evento en planta llegue hasta la mejora sin reescribirse en cada paso: ' +
          'no conformidad, contención, causa, acción, eficacia, riesgo, indicador y revisión por la dirección.',
        status: 'vision',
        dataSource: 'VISION',
        visual: 'closed-loop',
      },
      {
        id: 'loop-value',
        title: 'Evidencia conectada',
        narrationText:
          'ISO 9001 no termina al almacenar un documento. ' +
          'El valor aparece cuando la evidencia, el problema, la acción y la mejora quedan conectados.',
        speechText:
          'La norma iso nueve mil uno no termina al almacenar un documento. ' +
          'El valor aparece cuando la evidencia, el problema, la acción y la mejora quedan conectados.',
        status: 'vision',
        dataSource: 'VISION',
        visual: 'closed-loop-value',
        autoAdvance: false,
      },
    ],
  },

  // 15 · PLAN DE EVOLUCION ----------------------------------------------------------------
  {
    id: 'plan',
    title: 'Cómo llegamos de aquí a operación real',
    status: 'plan',
    layout: 'stage',
    steps: [
      {
        id: 'plan-horizons',
        title: 'Hoy, siguiente y después',
        narrationText:
          'Hoy ya hay control documental, workflow, seguridad, trazabilidad y registros dinámicos. ' +
          'Después vienen procesos, FP-15, acciones, riesgos e indicadores, y finalmente auditorías, revisión por la dirección e integración.',
        speechText:
          'Hoy ya hay control documental, flujo de revisión, seguridad, trazabilidad y registros dinámicos. ' +
          'Después vienen procesos, efe pe quince, acciones, riesgos e indicadores, y finalmente auditorías, revisión por la dirección e integración.',
        status: 'plan',
        dataSource: 'VISION',
        visual: 'roadmap',
      },
      {
        id: 'plan-close',
        title: 'Tu Sistema de Gestión ya existe',
        narrationText:
          'Tu Sistema de Gestión ya existe. ' +
          'Nosotros lo hacemos operativo. ' +
          'El siguiente paso es definir juntos el piloto de Innovax.',
        status: 'plan',
        dataSource: 'VISION',
        visual: 'roadmap-close',
        autoAdvance: false,
      },
    ],
  },
];
