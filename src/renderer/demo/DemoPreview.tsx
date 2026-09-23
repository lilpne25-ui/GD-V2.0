import React from 'react';
import type { DemoVisual } from './demoStory';
import { INNOVAX_CODES } from './demoStory';
import type { DemoData } from './useDemoData';
import { DemoBrand, SourceTag, StageTag } from './DemoBrand';
import { FP15_EXAMPLE, fp15Duration } from './demoData';

// Vistas de cada paso de la demo.
//
// Regla de honestidad: todo dato visible lleva una etiqueta de origen
// (SourceTag) y toda capacidad no construida lleva su marca de etapa. Nada de
// lo que aqui se muestra escribe en la base de datos.

type Stagger = React.CSSProperties & { '--i'?: number };
const stagger = (i: number): Stagger => ({ '--i': i });

interface PreviewProps {
  visual: DemoVisual;
  data: DemoData;
  onNext: () => void;
  onTryRealRag: () => void;
}

// ---------------------------------------------------------------------------
// Paso 1 · Contexto Innovax
// ---------------------------------------------------------------------------

const CONTEXT_FLOW = ['197 documentos', 'Procesos', 'Responsables', 'Evidencia'];
const LISTA_MAESTRA_FIELDS = ['Códigos', 'Áreas', 'Responsables', 'Accesos', 'Permisos', 'Revisiones', 'Retenciones'];

const ContextVisual: React.FC<{ onNext: () => void }> = ({ onNext }) => (
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

// ---------------------------------------------------------------------------
// Paso 2 · SGC Mirror
// ---------------------------------------------------------------------------

// Valores ilustrativos: no provienen de la Lista Maestra real.
const MIRROR_METADATA: Array<{ field: string; value: string }> = [
  { field: 'Código', value: 'PR-01-A' },
  { field: 'Área', value: 'Calidad' },
  { field: 'Responsable', value: 'Coordinación del SGC' },
  { field: 'Acceso', value: 'Consulta: todas las áreas' },
  { field: 'Permiso', value: 'Edición: Calidad' },
  { field: 'Retención', value: 'Según Lista Maestra' },
  { field: 'Revisión', value: 'Rev. 03' },
];

const MIRROR_RULES: Array<{ from: string; to: string; detail: string }> = [
  { from: 'Responsable', to: 'Workflow', detail: 'Quién revisa y aprueba cada cambio' },
  { from: 'Acceso', to: 'Permisos', detail: 'Quién puede ver cada documento' },
  { from: 'Revisión', to: 'Versionado', detail: 'Rev. vigente y su historial' },
  { from: 'Retención', to: 'Política', detail: 'Cuánto tiempo se conserva la evidencia' },
];

const MirrorVisual: React.FC = () => (
  <div className="gd-mirror">
    <section className="gd-mirror-card" aria-label="Metadata actual">
      <header>
        <span className="gd-kicker">Metadata actual</span>
        <SourceTag kind="example" />
      </header>
      <dl className="gd-mirror-table">
        {MIRROR_METADATA.map((row, i) => (
          <div key={row.field} className="gd-mirror-row" style={stagger(i)}>
            <dt>{row.field}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>

    <div className="gd-mirror-bridge" aria-hidden="true">
      <span className="gd-mirror-bridge-line" />
      <span className="gd-mirror-bridge-label">se convierte en</span>
      <span className="gd-mirror-bridge-arrow">↓</span>
    </div>

    <section className="gd-mirror-card gd-mirror-card--rules" aria-label="Reglas ejecutables">
      <header>
        <span className="gd-kicker">Reglas ejecutables</span>
      </header>
      <ul className="gd-mirror-rules">
        {MIRROR_RULES.map((rule, i) => (
          <li key={rule.from} style={stagger(i + 4)}>
            <span className="gd-mirror-from">{rule.from}</span>
            <span className="gd-mirror-arrow" aria-hidden="true">→</span>
            <span className="gd-mirror-to">{rule.to}</span>
            <small>{rule.detail}</small>
          </li>
        ))}
      </ul>
    </section>

    <div className="gd-mirror-codes" aria-label="Nomenclatura de Innovax">
      <span>El sistema habla el idioma de Innovax:</span>
      {INNOVAX_CODES.map(code => (
        <code key={code}>{code}</code>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Pasos 3-5 · Pantallas reales (panel lateral del spotlight)
// ---------------------------------------------------------------------------

const EnvNotice: React.FC<{ reason: string }> = ({ reason }) => (
  <p className="gd-env-notice" role="status">
    <strong>Aviso de entorno.</strong> {reason} La demo continúa con normalidad.
  </p>
);

const fmt = (n: number) => n.toLocaleString('es-MX');

// Los valores reales ya se ven iluminados en la pantalla del Dashboard: el
// panel solo confirma su origen en una linea, sin duplicarlos en tarjetas.
const DashboardLive: React.FC<{ data: DemoData }> = ({ data }) => {
  const { metrics } = data;
  if (metrics.state === 'loading') return <p className="gd-muted">Consultando la base de datos…</p>;
  if (metrics.state === 'unavailable') return <EnvNotice reason={metrics.reason} />;
  const m = metrics.value;
  return (
    <div className="gd-live">
      <SourceTag kind="system" detail="consultado ahora" />
      <p className="gd-live-line">
        <strong>{fmt(m.documentos)}</strong> documentos · <strong>{fmt(m.carpetas)}</strong> carpetas ·{' '}
        <strong>{fmt(m.pendientesRevision)}</strong> pendientes · <strong>{fmt(m.usuariosActivos)}</strong> usuarios activos
      </p>
      <p className="gd-muted">
        {m.eventosAuditoria > 0
          ? `${fmt(m.eventosAuditoria)} eventos recientes en la bitácora de trazabilidad.`
          : 'La bitácora de trazabilidad registrará cada acción sobre los documentos.'}
      </p>
    </div>
  );
};

const DocsLive: React.FC<{ data: DemoData }> = ({ data }) => {
  const { metrics } = data;
  return (
    <div className="gd-live">
      <ul className="gd-checklist">
        <li>Estructura de carpetas por proceso</li>
        <li>Revisión y aprobación con workflow</li>
        <li>Responsable y actividad de cada documento</li>
      </ul>
      {metrics.state === 'ready' && (
        <>
          <SourceTag kind="system" />
          <p className="gd-live-line">
            <strong>{fmt(metrics.value.documentos)}</strong> documentos controlados ·{' '}
            <strong>{fmt(metrics.value.pendientesRevision)}</strong> en revisión
          </p>
        </>
      )}
      {metrics.state === 'unavailable' && <EnvNotice reason={metrics.reason} />}
      <p className="gd-hint">
        Puedes abrir un documento real para mostrarlo. La demo no aprueba, borra ni modifica nada.
      </p>
    </div>
  );
};

function describeField(field: { fieldType: string; defaultValue: unknown; options: unknown[] }): string {
  const def = typeof field.defaultValue === 'string' ? field.defaultValue : '';
  if (def.startsWith('@@actor')) return 'Automático · usuario activo';
  if (def.startsWith('@@now')) return 'Automático · fecha actual';
  switch (field.fieldType) {
    case 'select': return `Lista · ${field.options.length} opciones`;
    case 'textarea': return 'Texto largo';
    case 'date': return 'Fecha';
    case 'number': return 'Número';
    case 'checkbox': return 'Sí / No';
    case 'computed': return 'Calculado';
    default: return 'Texto';
  }
}

const DynamicLive: React.FC<{ data: DemoData }> = ({ data }) => {
  const { fp05c } = data;
  if (fp05c.state === 'loading') return <p className="gd-muted">Leyendo la definición de FP-05-C…</p>;
  if (fp05c.state === 'unavailable') return <EnvNotice reason={fp05c.reason} />;
  if (!fp05c.value) {
    return (
      <p className="gd-env-notice" role="status">
        <strong>FP-05-C no está sembrado en esta base.</strong> Se instala con la migración 016 al arrancar la
        aplicación. La demo continúa con normalidad.
      </p>
    );
  }

  const def = fp05c.value;
  const fields = [...def.fields].filter(f => f.isActive).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="gd-live">
      <div className="gd-live-head">
        <SourceTag kind="system" detail={`${def.recordType.code} · v${def.recordType.version}`} />
        <span className="gd-config-badge">Configurado por datos</span>
      </div>
      <ul className="gd-fields">
        {fields.map((field, i) => (
          <li key={field.id} style={stagger(i)}>
            <strong>{field.label}</strong>
            <span>{describeField(field)}</span>
          </li>
        ))}
      </ul>
      <p className="gd-hint">
        “Importar FP-05” convierte un Excel en definición + registros sin crear otra aplicación. La demo no ejecuta
        ninguna importación.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Paso 6 · FP-15-C
// ---------------------------------------------------------------------------

const FP15_FLOW: Array<{ label: string; stage?: string }> = [
  { label: 'Pareto' },
  { label: 'Recurrencia' },
  { label: 'No conformidad', stage: 'Siguiente etapa' },
  { label: 'CAPA', stage: 'Siguiente etapa' },
  { label: 'Riesgo', stage: 'Siguiente etapa' },
  { label: 'KPI' },
];

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

  const operativeRows: Array<[string, string, boolean?]> = [
    ['Duración calculada', duration, true],
    ['Estado', 'Abierto · análisis en curso', true],
    ['Evidencia', 'Foto o documento adjunto', true],
    ['Responsable', `Asignado por rol · ${ex.area}`, true],
    ['Historial', 'Cada cambio queda registrado', true],
    ['Recurrencia', 'Se calcula al acumular registros', true],
  ];

  return (
    <div className="gd-fp15">
      <div className="gd-fp15-headline">
        <p>
          Ese sigue siendo su FP-15.
          <br />
          <strong>Pero ahora produce información.</strong>
        </p>
        <SourceTag kind="example" detail="datos anonimizados" />
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

      <div className="gd-fp15-flow" aria-label="Lo que produce un FP-15 digital">
        <span className="gd-fp15-flow-root">FP-15</span>
        <span className="gd-fp15-flow-down" aria-hidden="true">↓</span>
        <span className="gd-fp15-flow-data">Datos</span>
        <ul>
          {FP15_FLOW.map((node, i) => (
            <li key={node.label} style={stagger(i + 8)} className={node.stage ? 'is-next' : ''}>
              <span>{node.label}</span>
              {node.stage && <StageTag>{node.stage}</StageTag>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Paso 7 · Ciclo cerrado + inteligencia sobre evidencia
// ---------------------------------------------------------------------------

const LOOP_SOURCES = ['Paro', 'Inspección', 'Queja', 'Proveedor'];
const LOOP_CHAIN = [
  'No conformidad',
  'Contención',
  'Análisis de causa',
  'CAPA',
  'Efectividad',
  'Riesgo',
  'KPI',
  'Revisión por la dirección',
];

const ClosedLoopVisual: React.FC<{ data: DemoData; onTryRealRag: () => void }> = ({ data, onTryRealRag }) => {
  const rag = data.rag;
  const ragOn = rag.state === 'ready' && rag.value.ragEnabled;

  return (
    <div className="gd-loop">
      <div className="gd-loop-diagram" aria-label="Ciclo cerrado de calidad">
        <ul className="gd-loop-sources">
          {LOOP_SOURCES.map((src, i) => (
            <li key={src} style={stagger(i)}>{src}</li>
          ))}
        </ul>
        <span className="gd-loop-down" aria-hidden="true">↓</span>
        <ol className="gd-loop-chain">
          {LOOP_CHAIN.map((node, i) => (
            <li key={node} style={stagger(i + 4)}>
              <span className="gd-loop-index">{i + 1}</span>
              <span>{node}</span>
            </li>
          ))}
        </ol>
      </div>

      <section className="gd-intel" aria-label="Inteligencia sobre evidencia">
        <header>
          <span className="gd-kicker">Inteligencia sobre evidencia</span>
        </header>
        <p className="gd-intel-question">“¿Por qué aumentaron los paros asociados a falta de material?”</p>
        <p className="gd-intel-answer">
          Se detectan eventos recurrentes relacionados con disponibilidad de material. La experiencia objetivo es que
          GD-V2 pueda relacionar esos eventos con registros, análisis y acciones, citando siempre su evidencia.
        </p>
        <div className="gd-intel-foot">
          <SourceTag kind="example" detail="respuesta fija, sin IA" />
          {rag.state === 'ready' && (
            ragOn ? (
              <button type="button" className="gd-link-btn" onClick={onTryRealRag}>
                Probar análisis real sobre un registro →
              </button>
            ) : (
              <span className="gd-muted">Análisis con IA desactivado en este entorno. La demo no depende de él.</span>
            )
          )}
        </div>
      </section>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Paso 8 · Plan
// ---------------------------------------------------------------------------

const HORIZONS: Array<{ key: string; title: string; status: 'live' | 'next' | 'pilot' | 'vision'; items: string[] }> = [
  {
    key: 'hoy',
    title: 'Hoy',
    status: 'live',
    items: [
      'Aplicación de escritorio',
      'SQL Server',
      'Seguridad endurecida',
      'Documentación y workflow',
      'Registros',
      'Motor dinámico',
      'FP-05-C',
    ],
  },
  {
    key: 'siguiente',
    title: 'Siguiente',
    status: 'next',
    items: ['SGC Mirror', 'Lista Maestra', 'Policy Engine', 'Revisión, retención y accesos'],
  },
  {
    key: 'piloto',
    title: 'Piloto operativo',
    status: 'pilot',
    items: ['FP-15-C', 'Pareto y recurrencia', 'NC / CAPA', 'Riesgos', 'Indicadores'],
  },
  {
    key: 'escala',
    title: 'Escala',
    status: 'vision',
    items: [
      'Evidence Graph / Audit Room',
      'Migration Factory',
      'Quality Copilot',
      'Conectores GSS / ERP',
      'Más procesos y áreas',
    ],
  },
];

const HORIZON_TAG: Record<'live' | 'next' | 'pilot' | 'vision', string> = {
  live: 'Funciona hoy',
  next: 'Siguiente implementación',
  pilot: 'Siguiente implementación',
  vision: 'Visión',
};

const RoadmapVisual: React.FC = () => (
  <div className="gd-roadmap">
    <ol className="gd-horizons">
      {HORIZONS.map((h, i) => (
        <li key={h.key} className={`gd-horizon gd-horizon--${h.status}`} style={stagger(i)}>
          <header>
            <span className="gd-horizon-step">{i + 1}</span>
            <div>
              <strong>{h.title}</strong>
              <small>{HORIZON_TAG[h.status]}</small>
            </div>
          </header>
          <ul>
            {h.items.map(item => <li key={item}>{item}</li>)}
          </ul>
        </li>
      ))}
    </ol>

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
  </div>
);

// ---------------------------------------------------------------------------

const DemoPreview: React.FC<PreviewProps> = ({ visual, data, onNext, onTryRealRag }) => {
  switch (visual) {
    case 'sgc-context': return <ContextVisual onNext={onNext} />;
    case 'sgc-mirror': return <MirrorVisual />;
    case 'dashboard-live': return <DashboardLive data={data} />;
    case 'docs-live': return <DocsLive data={data} />;
    case 'dynamic-live': return <DynamicLive data={data} />;
    case 'fp15': return <Fp15Visual />;
    case 'closed-loop': return <ClosedLoopVisual data={data} onTryRealRag={onTryRealRag} />;
    case 'roadmap': return <RoadmapVisual />;
    default: return null;
  }
};

export default DemoPreview;
