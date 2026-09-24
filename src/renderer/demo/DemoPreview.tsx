import React from 'react';
import type { MicroStep } from './types';
import type { DemoData } from './data/useDemoData';
import { DemoBrand, SourceTag, StageTag } from './DemoBrand';
import { FP15_EXAMPLE, fp15Duration } from './data/demoData';
import { WF_STATUS_LABEL } from '../modules/documentacion/hooks/useWorkflow';

// Visuales del panel de la demo.
//
// Regla de honestidad: todo dato visible lleva su etiqueta de origen y toda
// capacidad no construida su marca de etapa. Nada de lo que aqui se muestra
// escribe en la base de datos.

type Stagger = React.CSSProperties & { '--i'?: number };
const stagger = (i: number): Stagger => ({ '--i': i });

/** Codigos reales de Innovax que el sistema reconoce tal cual. */
const INNOVAX_CODES = ['FP-05-C', 'FP-15-C', 'PR-01-A'];

// ---------------------------------------------------------------------------
// Escena 1 · Apertura
// ---------------------------------------------------------------------------

const CONTEXT_FLOW = ['197 documentos', 'Procesos', 'Responsables', 'Evidencia'];
const LISTA_MAESTRA_FIELDS = ['Códigos', 'Áreas', 'Responsables', 'Accesos', 'Permisos', 'Revisiones', 'Retenciones'];

const IntroVisual: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="gd-context">
    <div className="gd-context-brand">
      <DemoBrand size="lg" />
    </div>

    <div className="gd-context-hero">
      <div className="gd-context-number" style={stagger(0)}>
        <strong>197</strong>
        <span>documentos</span>
        <SourceTag kind="innovax" detail="Lista Maestra" />
      </div>

      <ol className="gd-context-flow" aria-label="De documentos a evidencia">
        {CONTEXT_FLOW.map((item, i) => (
          <li key={item} className="gd-flow-node" style={stagger(i + 1)}>
            {i > 0 && <span className="gd-flow-arrow" aria-hidden="true">→</span>}
            <span className={`gd-flow-pill${i === 0 ? ' gd-flow-pill--origin' : ''}`}>{item}</span>
          </li>
        ))}
      </ol>
    </div>

    <div className="gd-context-fields">
      <span className="gd-context-fields-label">La Lista Maestra ya contiene</span>
      <ul>
        {LISTA_MAESTRA_FIELDS.map((field, i) => (
          <li key={field} style={stagger(i + 5)}>{field}</li>
        ))}
      </ul>
    </div>

    <button type="button" className="gd-cta" onClick={onNext}>
      Ver cómo lo convertimos en sistema
      <span aria-hidden="true">→</span>
    </button>
  </div>
);

const IntroPromiseVisual: React.FC = () => (
  <div className="gd-promise">
    <div className="gd-promise-cols">
      <section style={stagger(0)}>
        <span className="gd-kicker">Se conserva</span>
        <ul>
          <li>Sus procedimientos y formatos</li>
          <li>Su nomenclatura y sus códigos</li>
          <li>Sus responsables y su estructura</li>
        </ul>
      </section>
      <span className="gd-promise-arrow" aria-hidden="true">→</span>
      <section className="gd-promise-gd" style={stagger(1)}>
        <span className="gd-kicker">Se vuelve operativo</span>
        <ul>
          <li>Documentos controlados y trazables</li>
          <li>Revisiones con evidencia</li>
          <li>Formatos convertidos en datos</li>
        </ul>
      </section>
    </div>
    <div className="gd-mirror-codes" aria-label="Nomenclatura de Innovax">
      <span>El sistema habla el idioma de Innovax:</span>
      {INNOVAX_CODES.map(code => <code key={code}>{code}</code>)}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Escena 7 · De documento a regla (siguiente implementacion)
// ---------------------------------------------------------------------------

const MIRROR_RULES: Array<{ from: string; to: string }> = [
  { from: 'Responsable', to: 'Workflow' },
  { from: 'Acceso', to: 'Permisos' },
  { from: 'Revisión', to: 'Versionado' },
  { from: 'Retención', to: 'Política' },
];

const MirrorVisual: React.FC = () => (
  <div className="gd-live">
    <div className="gd-live-head">
      <StageTag>Siguiente etapa · SGC Mirror</StageTag>
    </div>
    <ul className="gd-mirror-rules gd-mirror-rules--compact">
      {MIRROR_RULES.map((rule, i) => (
        <li key={rule.from} style={stagger(i)}>
          <span className="gd-mirror-from">{rule.from}</span>
          <span className="gd-mirror-arrow" aria-hidden="true">→</span>
          <span className="gd-mirror-to">{rule.to}</span>
        </li>
      ))}
    </ul>
  </div>
);

// ---------------------------------------------------------------------------
// Escena 9 · Ciclo de revision (comportamiento real de useWorkflow/WorkflowRepo)
// ---------------------------------------------------------------------------

type WfFocus = 'overview' | 'approve' | 'correct' | 'resubmit';

const APPROVE_EFFECTS = [
  'Estado: ' + WF_STATUS_LABEL.aprobado,
  'Queda quién aprobó y cuándo',
  'Opcional: mover a la carpeta de aprobados',
  'Aviso al autor: «Documento aprobado»',
  'Correo, si el revisor marca la opción',
];

const CORRECT_EFFECTS = [
  'Qué está mal · por qué · cómo corregir',
  'Estado: ' + WF_STATUS_LABEL.correcciones,
  'La observación queda en el historial',
  'Aviso al autor: «Correcciones solicitadas»',
  'Correo al autor con el detalle',
];

const WorkflowBranchVisual: React.FC<{ focus: WfFocus }> = ({ focus }) => {
  const approveOn = focus === 'approve';
  const correctOn = focus === 'correct' || focus === 'resubmit';
  const dim = (on: boolean) => (focus !== 'overview' && !on ? ' is-dim' : '');
  return (
    <div className="gd-wf" aria-label="Ciclo de revisión de documentos">
      <ol className="gd-wf-main">
        <li><span className="gd-wf-state">{WF_STATUS_LABEL.borrador}</span></li>
        <li aria-hidden="true" className="gd-wf-arrow">→</li>
        <li><span className="gd-wf-state gd-wf-state--review">{WF_STATUS_LABEL.revision}</span></li>
        <li aria-hidden="true" className="gd-wf-arrow">→</li>
        <li><span className="gd-wf-state gd-wf-state--decision">Decisión</span></li>
      </ol>
      <div className="gd-wf-branches">
        <section className={'gd-wf-branch gd-wf-branch--approve' + (approveOn ? ' is-on' : '') + dim(approveOn)}>
          <header>✓ Aprobar</header>
          {approveOn
            ? <ul>{APPROVE_EFFECTS.map(e => <li key={e}>{e}</li>)}</ul>
            : <p>{WF_STATUS_LABEL.aprobado} · vigente</p>}
        </section>
        <section className={'gd-wf-branch gd-wf-branch--correct' + (correctOn ? ' is-on' : '') + dim(correctOn)}>
          <header>↩ Solicitar correcciones</header>
          {focus === 'correct'
            ? <ul>{CORRECT_EFFECTS.map(e => <li key={e}>{e}</li>)}</ul>
            : <p>{WF_STATUS_LABEL.correcciones} · vuelve al autor</p>}
          <div className={'gd-wf-loop' + (focus === 'resubmit' ? ' is-on' : '')}>
            <span>Autor corrige</span>
            <span aria-hidden="true">→</span>
            <span>Reenvía</span>
            <span aria-hidden="true">→</span>
            <span>{WF_STATUS_LABEL.revision}</span>
          </div>
          {focus === 'resubmit' && (
            <p className="gd-wf-note">Coordinación recibe un nuevo aviso: «Nuevo documento para revisión».</p>
          )}
        </section>
      </div>
    </div>
  );
};

/** Formato real del correo de correcciones (useWorkflow) con un documento de ejemplo. */
const WorkflowEmailVisual: React.FC = () => (
  <div className="gd-mail">
    <div className="gd-live-head">
      <SourceTag kind="flow-example" detail="formato real del correo" />
    </div>
    <div className="gd-mail-card">
      <dl className="gd-mail-meta">
        <div><dt>De</dt><dd>SGC Innovax · buzón del sistema</dd></div>
        <div><dt>Para</dt><dd>Autor del documento (y destinatarios elegidos)</dd></div>
        <div><dt>Asunto</dt><dd>[SGC] Correcciones requeridas: PR-XX (ejemplo)</dd></div>
      </dl>
      <div className="gd-mail-body">
        <p><b>¿Qué está mal?:</b> la tabla de control de cambios no incluye la revisión actual.</p>
        <p><b>¿Cómo corregir?:</b> agregar la revisión vigente y volver a enviar.</p>
        <p className="gd-mail-by">Revisado por: Coordinación del SGC</p>
      </div>
    </div>
    <p className="gd-wf-note">
      Correcciones: se envía al autor. Aprobación: si el revisor marca la opción.
      Requiere correo válido del usuario y el buzón SMTP configurado.
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Escena 11 · Campos del usuario vs campos del sistema
// ---------------------------------------------------------------------------

/** Mismo criterio que DynamicRecordForm: tokens automaticos (@@actor.name, {{today}}...). */
function isSystemField(field: { defaultValue: unknown; fieldType: string }): boolean {
  if (field.fieldType === 'computed') return true;
  const dv = field.defaultValue;
  return typeof dv === 'string' && (dv.trim().startsWith('@@') || dv.trim().startsWith('{{'));
}

const FieldOriginVisual: React.FC<{ data: DemoData; step: MicroStep }> = ({ data, step }) => {
  const currentKey = (step.target?.[0] || '').replace('dynamic-field-', '');

  // Se construye con la definicion REAL de FP-05-C: un campo es "del sistema"
  // si su valor por defecto es un token automatico (@@actor, @@now).
  if (data.fp05c.state !== 'ready' || !data.fp05c.value) {
    return (
      <p className="gd-origin-single">
        {step.fieldOrigin === 'system' ? 'Lo asigna el sistema' : 'Lo captura el usuario'}
      </p>
    );
  }

  const fields = [...data.fp05c.value.fields]
    .filter(f => f.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const userFields = fields.filter(f => !isSystemField(f));
  const systemFields = fields.filter(f => isSystemField(f));

  const renderGroup = (title: string, items: typeof fields, kind: 'user' | 'system') => (
    <section className={`gd-origin-group gd-origin-group--${kind}`}>
      <span className="gd-kicker">{title}</span>
      <ul>
        {items.map(f => (
          <li key={f.id} className={f.fieldKey === currentKey ? 'is-current' : ''}>{f.label}</li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="gd-origin">
      {renderGroup('Captura el usuario', userFields, 'user')}
      {renderGroup('Asigna el sistema', systemFields, 'system')}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Escena 12 · Ciclo de vida del registro (capacidad sin dato de demo)
// ---------------------------------------------------------------------------

const LIFECYCLE = ['Borrador', 'En revisión', 'Aprobado'];
const LIFECYCLE_ALT = ['Rechazado', 'Obsoleto'];

const RecordLifecycleVisual: React.FC = () => (
  <div className="gd-live">
    <div className="gd-live-head">
      <SourceTag kind="no-data" detail="capacidad implementada · sin registro de demo en esta base" />
    </div>
    <ol className="gd-lifecycle" aria-label="Estados del registro">
      {LIFECYCLE.map((state, i) => (
        <li key={state} style={stagger(i)}>
          {i > 0 && <span className="gd-flow-arrow" aria-hidden="true">→</span>}
          <span className={`gd-state gd-state--${i}`}>{state}</span>
        </li>
      ))}
    </ol>
    <p className="gd-lifecycle-alt">
      También: {LIFECYCLE_ALT.join(' · ')}
    </p>
    <ul className="gd-checklist">
      <li>Solo se edita en borrador</li>
      <li>Cada transición queda registrada con quién y cuándo</li>
      <li>Auditoría de cada cambio: antes y después</li>
    </ul>
  </div>
);

// ---------------------------------------------------------------------------
// Escena 13 · FP-15-C (siguiente implementacion, datos anonimizados)
// ---------------------------------------------------------------------------

const Fp15Visual: React.FC = () => {
  const ex = FP15_EXAMPLE;
  const duration = fp15Duration(ex.inicio, ex.fin);

  const formatRows: Array<[string, string]> = [
    ['Máquina', ex.maquina],
    ['Área generadora', ex.area],
    ['No. parte', ex.parte],
    ['Evento', ex.evento],
    ['Inicio', ex.inicio],
    ['Fin', ex.fin],
    ['5 Porqués', `${ex.porquesCompletos}/${ex.porquesTotal}`],
  ];

  const operativeRows: Array<[string, string]> = [
    ['Duración calculada', duration],
    ['Estado', 'Abierto · análisis en curso'],
    ['Evidencia', 'Foto o documento adjunto'],
    ['Responsable', `Asignado por rol · ${ex.area}`],
    ['Historial', 'Cada cambio queda registrado'],
  ];

  return (
    <div className="gd-fp15">
      <div className="gd-fp15-headline">
        <p>
          Ese seguirá siendo su FP-15.
          <br />
          <strong>La diferencia: también producirá información.</strong>
        </p>
        <SourceTag kind="anonymized" detail="estructura real, datos anonimizados" />
      </div>

      <div className="gd-fp15-compare">
        <section className="gd-fp15-col" aria-label="Formato actual">
          <header>
            <span className="gd-kicker">Formato actual</span>
            <code>FP-15-C</code>
          </header>
          <dl>
            {formatRows.map(([k, v], i) => (
              <div key={k} className="gd-fp15-row" style={stagger(i)}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="gd-fp15-comment">{ex.comentario}</p>
        </section>

        <div className="gd-fp15-arrow" aria-hidden="true">→</div>

        <section className="gd-fp15-col gd-fp15-col--gd" aria-label="Registro operativo GD-V2">
          <header>
            <span className="gd-kicker">Registro operativo GD-V2</span>
          </header>
          <p className="gd-fp15-same">Los mismos datos del formato, más:</p>
          <dl>
            {operativeRows.map(([k, v], i) => (
              <div key={k} className="gd-fp15-row gd-fp15-row--added" style={stagger(i + 3)}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
};

const FP15_FLOW: Array<{ label: string; stage?: boolean }> = [
  { label: 'Datos estructurados' },
  { label: 'Duración' },
  { label: 'Recurrencia' },
  { label: 'Pareto' },
  { label: 'No conformidad', stage: true },
  { label: 'Acción', stage: true },
  { label: 'KPI', stage: true },
];

const Fp15FlowVisual: React.FC = () => (
  <div className="gd-fp15">
    <div className="gd-fp15-headline">
      <p>
        De la captura a la decisión.
        <br />
        <strong>Primero los datos; después, las acciones.</strong>
      </p>
      <SourceTag kind="anonymized" detail="datos anonimizados" />
    </div>
    <div className="gd-fp15-flow" aria-label="Lo que produce un FP-15 digital">
      <span className="gd-fp15-flow-root">FP-15-C</span>
      <span className="gd-fp15-flow-down" aria-hidden="true">↓</span>
      <ul>
        {FP15_FLOW.map((node, i) => (
          <li key={node.label} style={stagger(i)} className={node.stage ? 'is-next' : ''}>
            <span>{node.label}</span>
            {node.stage && <StageTag>Siguiente etapa</StageTag>}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Escena 14 · Ciclo cerrado (vision)
// ---------------------------------------------------------------------------

const LOOP_CHAIN = [
  'Evento',
  'No conformidad',
  'Contención',
  'Causa',
  'Acción',
  'Eficacia',
  'Riesgo',
  'KPI',
  'Revisión por la dirección',
  'Mejora',
];

const ClosedLoopVisual: React.FC = () => (
  <div className="gd-loop gd-loop--single">
    <ol className="gd-loop-chain gd-loop-chain--wide" aria-label="Ciclo cerrado de calidad">
      {LOOP_CHAIN.map((node, i) => (
        <li key={node} style={stagger(i)}>
          <span className="gd-loop-index">{i + 1}</span>
          <span>{node}</span>
        </li>
      ))}
    </ol>
    <p className="gd-vision-note">
      Visión del producto. Este ciclo aún no está implementado; hoy existen los componentes base:
      registros con estados, auditoría, workflow y notificaciones.
    </p>
  </div>
);

const ClosedLoopValueVisual: React.FC = () => (
  <blockquote className="gd-quote">
    <p>
      ISO 9001 no termina al almacenar un documento.
      <br />
      <strong>El valor aparece cuando la evidencia, el problema, la acción y la mejora quedan conectados.</strong>
    </p>
  </blockquote>
);

// ---------------------------------------------------------------------------
// Escena 15 · Plan
// ---------------------------------------------------------------------------

const HORIZONS: Array<{ key: string; title: string; status: 'live' | 'next' | 'vision'; tag: string; items: string[] }> = [
  {
    key: 'hoy',
    title: 'Hoy',
    status: 'live',
    tag: 'Funciona hoy',
    items: ['Control documental', 'Workflow', 'Seguridad', 'Trazabilidad', 'Registros dinámicos', 'FP-05-C'],
  },
  {
    key: 'siguiente',
    title: 'Siguiente',
    status: 'next',
    tag: 'Siguiente implementación',
    items: ['Control documental v2', 'SGC Mirror / procesos', 'FP-15-C', 'NC + acciones', 'Riesgos', 'KPIs'],
  },
  {
    key: 'despues',
    title: 'Después',
    status: 'vision',
    tag: 'Visión',
    items: ['Auditorías', 'Revisión por Dirección', 'Evidence Graph', 'Quality Copilot', 'Integración Global Shop'],
  },
];

const RoadmapVisual: React.FC = () => (
  <ol className="gd-horizons gd-horizons--three">
    {HORIZONS.map((h, i) => (
      <li key={h.key} className={`gd-horizon gd-horizon--${h.status}`} style={stagger(i)}>
        <header>
          <span className="gd-horizon-step">{i + 1}</span>
          <div>
            <strong>{h.title}</strong>
            <small>{h.tag}</small>
          </div>
        </header>
        <ul>
          {h.items.map(item => <li key={item}>{item}</li>)}
        </ul>
      </li>
    ))}
  </ol>
);

const RoadmapCloseVisual: React.FC = () => (
  <div className="gd-closing">
    <div className="gd-closing-brand">
      <DemoBrand size="sm" showTagline={false} />
    </div>
    <p className="gd-closing-message">
      Tu Sistema de Gestión ya existe.
      <br />
      <strong>Nosotros lo hacemos operativo.</strong>
    </p>
    <p className="gd-closing-sub">Empezamos con procesos concretos, medimos el resultado y escalamos.</p>
    <div className="gd-closing-cta" role="note">
      <span>Siguiente paso</span>
      <strong>Definir piloto Innovax</strong>
    </div>
  </div>
);

// ---------------------------------------------------------------------------

interface PreviewProps {
  step: MicroStep;
  data: DemoData;
  onNext: () => void;
}

const DemoPreview: React.FC<PreviewProps> = ({ step, data, onNext }) => {
  switch (step.visual) {
    case 'intro': return <IntroVisual onNext={onNext} />;
    case 'intro-promise': return <IntroPromiseVisual />;
    case 'mirror': return <MirrorVisual />;
    case 'field-origin': return <FieldOriginVisual data={data} step={step} />;
    case 'record-lifecycle': return <RecordLifecycleVisual />;
    case 'fp15': return <Fp15Visual />;
    case 'fp15-flow': return <Fp15FlowVisual />;
    case 'closed-loop': return <ClosedLoopVisual />;
    case 'closed-loop-value': return <ClosedLoopValueVisual />;
    case 'roadmap': return <RoadmapVisual />;
    case 'roadmap-close': return <RoadmapCloseVisual />;
    case 'workflow-branch': return <WorkflowBranchVisual focus={step.workflowFocus || 'overview'} />;
    case 'workflow-email': return <WorkflowEmailVisual />;
    default: return null;
  }
};

export default DemoPreview;
