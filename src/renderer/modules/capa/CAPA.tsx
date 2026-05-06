import React, { useState } from 'react';
import type { CAPATipo, CAPAEstado } from '../../../shared/types/capa';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type ActividadUI = {
  id: string; descripcion: string; responsable: string;
  fechaCompromiso: string; fechaReal: string;
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
};
type SeguimientoUI = { id: string; fecha: string; descripcion: string; avance: number; };
type CAPAUI = {
  id: string; codigo: string; titulo: string; descripcion: string;
  tipo: CAPATipo; estado: CAPAEstado; proceso: string; responsable: string;
  fechaApertura: string; fechaCompromiso: string; fechaCierre: string;
  ncCodigo: string; origenDescripcion: string;
  planAccion: string; recursos: string; avance: number;
  verificacionEficacia: string; esEficaz: boolean | null;
  evidenciaCierre: string;
  actividades: ActividadUI[];
  seguimientos: SeguimientoUI[];
};

const demoCAPAs: CAPAUI[] = [
  {
    id: 'capa-1', codigo: 'CAPA-2026-001', titulo: 'Implementar control automático de distribución de documentos',
    descripcion: 'Acción correctiva derivada de NC-2026-001: documentos sin control de distribución.',
    tipo: 'correctiva', estado: 'en_implementacion', proceso: 'SGC', responsable: 'Resp. Calidad',
    fechaApertura: '2026-01-22', fechaCompromiso: '2026-03-31', fechaCierre: '',
    ncCodigo: 'NC-2026-001', origenDescripcion: 'Documentos sin control de distribución detectados en AI-2026-001.',
    planAccion: '1. Diseñar módulo de distribución en sistema\n2. Configurar alertas automáticas\n3. Capacitar al personal\n4. Verificar eficacia a los 30 días',
    recursos: 'Desarrollador de software, 80 hrs. Capacitación: 2 sesiones.',
    avance: 50,
    verificacionEficacia: '', esEficaz: null, evidenciaCierre: '',
    actividades: [
      { id: 'a1', descripcion: 'Diseñar módulo de distribución', responsable: 'TI', fechaCompromiso: '2026-02-15', fechaReal: '2026-02-14', estado: 'completada' },
      { id: 'a2', descripcion: 'Implementar notificaciones automáticas', responsable: 'TI', fechaCompromiso: '2026-03-01', fechaReal: '', estado: 'en_progreso' },
      { id: 'a3', descripcion: 'Capacitar al personal', responsable: 'Calidad', fechaCompromiso: '2026-03-15', fechaReal: '', estado: 'pendiente' },
      { id: 'a4', descripcion: 'Verificación de eficacia (30 días)', responsable: 'Calidad', fechaCompromiso: '2026-04-15', fechaReal: '', estado: 'pendiente' },
    ],
    seguimientos: [
      { id: 's1', fecha: '2026-02-01', descripcion: 'Se inició diseño del módulo.', avance: 20 },
      { id: 's2', fecha: '2026-02-15', descripcion: 'Módulo diseñado y aprobado. Inicia desarrollo.', avance: 50 },
    ],
  },
  {
    id: 'capa-2', codigo: 'CAPA-2026-002', titulo: 'Reforzar verificación de documentos antes de liberación',
    descripcion: 'Correctiva de NC-2026-002: instructivo sin firma.',
    tipo: 'correctiva', estado: 'abierta', proceso: 'Producción', responsable: 'Jefe Producción',
    fechaApertura: '2026-01-25', fechaCompromiso: '2026-02-28', fechaCierre: '',
    ncCodigo: 'NC-2026-002', origenDescripcion: 'IT-PROD-003 en uso sin firmas.',
    planAccion: 'Crear checklist de liberación de documentos para verificar firmas antes de distribución.',
    recursos: 'Personal de calidad. 2 horas.',
    avance: 0, verificacionEficacia: '', esEficaz: null, evidenciaCierre: '',
    actividades: [], seguimientos: [],
  },
  {
    id: 'capa-3', codigo: 'CAPA-2025-015', titulo: 'Sistema de alertas de calibración',
    descripcion: 'Preventiva: implementar alertas automáticas de vencimiento de calibración.',
    tipo: 'preventiva', estado: 'cerrada_eficaz', proceso: 'Calidad', responsable: 'Resp. Calidad',
    fechaApertura: '2025-12-01', fechaCompromiso: '2026-01-15', fechaCierre: '2026-01-12',
    ncCodigo: 'NC-2025-010', origenDescripcion: 'Calibración vencida en equipo de medición.',
    planAccion: 'Implementar módulo de control de calibración con alertas a 30, 15 y 7 días antes de vencimiento.',
    recursos: 'TI: 40 hrs.',
    avance: 100,
    verificacionEficacia: 'Se verificó durante 30 días que todas las alertas se envían correctamente. No se detectaron equipos con calibración vencida en el período.',
    esEficaz: true,
    evidenciaCierre: 'Registros del sistema de alertas. Reporte de cumplimiento al 100%.',
    actividades: [
      { id: 'a5', descripcion: 'Diseñar módulo de calibración', responsable: 'TI', fechaCompromiso: '2025-12-15', fechaReal: '2025-12-14', estado: 'completada' },
      { id: 'a6', descripcion: 'Implementar alertas', responsable: 'TI', fechaCompromiso: '2026-01-05', fechaReal: '2026-01-04', estado: 'completada' },
      { id: 'a7', descripcion: 'Verificar eficacia 30 días', responsable: 'Calidad', fechaCompromiso: '2026-02-05', fechaReal: '2026-02-05', estado: 'completada' },
    ],
    seguimientos: [
      { id: 's3', fecha: '2025-12-15', descripcion: 'Módulo diseñado.', avance: 30 },
      { id: 's4', fecha: '2026-01-05', descripcion: 'Alertas funcionando.', avance: 80 },
      { id: 's5', fecha: '2026-01-12', descripcion: 'Cerrada. Eficaz.', avance: 100 },
    ],
  },
];

const TIPO_LABELS: Record<CAPATipo, string> = { correctiva: 'Correctiva', preventiva: 'Preventiva', mejora: 'Mejora' };
const TIPO_CLASS: Record<CAPATipo, string> = { correctiva: 'badge--correctiva', preventiva: 'badge--preventiva', mejora: 'badge--mejora' };
const ESTADO_LABELS: Record<CAPAEstado, string> = {
  abierta: 'Abierta', en_implementacion: 'En implementación', implementada: 'Implementada',
  en_verificacion: 'En verificación', cerrada_eficaz: 'Cerrada (Eficaz)',
  cerrada_no_eficaz: 'Cerrada (No eficaz)', cancelada: 'Cancelada',
};
const ESTADO_CLASS: Record<CAPAEstado, string> = {
  abierta: 'badge--open', en_implementacion: 'badge--in-progress', implementada: 'badge--programada',
  en_verificacion: 'badge--review', cerrada_eficaz: 'badge--eficaz',
  cerrada_no_eficaz: 'badge--no-eficaz', cancelada: 'badge--cancelada',
};
const ACT_ESTADO_CLASS: Record<string, string> = {
  pendiente: 'badge--draft', en_progreso: 'badge--in-progress', completada: 'badge--approved', vencida: 'badge--open',
};

type View = 'list' | 'detail' | 'create';

const CAPA: React.FC = () => {
  const [capas, setCapas] = useState(demoCAPAs);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<CAPAUI | null>(null);
  const [tab, setTab] = useState<'info' | 'actividades' | 'seguimiento' | 'eficacia'>('info');
  const [filterEstado, setFilterEstado] = useState<CAPAEstado | ''>('');
  const [filterTipo, setFilterTipo] = useState<CAPATipo | ''>('');
  const [form, setForm] = useState<Partial<CAPAUI>>({});

  const filtered = capas.filter(c => {
    if (filterEstado && c.estado !== filterEstado) return false;
    if (filterTipo && c.tipo !== filterTipo) return false;
    return true;
  });

  const kpis = {
    total: capas.length,
    abiertas: capas.filter(c => !c.estado.startsWith('cerrada') && c.estado !== 'cancelada').length,
    eficaces: capas.filter(c => c.estado === 'cerrada_eficaz').length,
    vencidas: capas.filter(c => c.fechaCompromiso && new Date(c.fechaCompromiso) < new Date() && !c.estado.startsWith('cerrada') && c.estado !== 'cancelada').length,
  };

  const handleCreate = () => {
    const newCapa: CAPAUI = {
      id: 'capa-' + Date.now(), codigo: form.codigo || '', titulo: form.titulo || '',
      descripcion: form.descripcion || '', tipo: (form.tipo as CAPATipo) || 'correctiva',
      estado: 'abierta', proceso: form.proceso || '', responsable: form.responsable || '',
      fechaApertura: new Date().toISOString().split('T')[0],
      fechaCompromiso: form.fechaCompromiso || '', fechaCierre: '',
      ncCodigo: form.ncCodigo || '', origenDescripcion: form.origenDescripcion || '',
      planAccion: form.planAccion || '', recursos: form.recursos || '',
      avance: 0, verificacionEficacia: '', esEficaz: null, evidenciaCierre: '',
      actividades: [], seguimientos: [],
    };
    setCapas([newCapa, ...capas]);
    setForm({});
    setView('list');
  };

  const advanceEstado = (capa: CAPAUI) => {
    const transitions: Record<string, CAPAEstado> = {
      abierta: 'en_implementacion', en_implementacion: 'implementada',
      implementada: 'en_verificacion', en_verificacion: 'cerrada_eficaz',
    };
    const next = transitions[capa.estado];
    if (!next) return;
    const updated = capas.map(c => c.id === capa.id ? {
      ...c, estado: next,
      ...(next.startsWith('cerrada') ? { fechaCierre: new Date().toISOString().split('T')[0], avance: 100 } : {}),
    } : c);
    setCapas(updated);
    setSelected(updated.find(c => c.id === capa.id)!);
  };

  const deleteCapa = (id: string) => {
    setCapas(capas.filter(c => c.id !== id));
    if (selected?.id === id) { setSelected(null); setView('list'); }
  };

  const avanceColor = (avance: number) => avance >= 80 ? 'progress-bar-fill--success' : avance >= 40 ? 'progress-bar-fill--warning' : 'progress-bar-fill--danger';

  return (
    <div className="mod-capa">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">CAPA</h2>
          <p className="mod-subtitle">Acciones Correctivas, Preventivas y de Mejora — ISO 9001:2015 (Cláusula 10.2, 10.3)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setView('create'); }}>+ Nueva CAPA</button>
      </div>

      {/* KPIs (2.4.7) */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{kpis.total}</span><span className="kpi-label">Total</span></div>
        <div className="kpi-card kpi--open"><span className="kpi-value">{kpis.abiertas}</span><span className="kpi-label">Abiertas</span></div>
        <div className="kpi-card kpi--approved"><span className="kpi-value">{kpis.eficaces}</span><span className="kpi-label">Eficaces</span></div>
        <div className="kpi-card kpi--danger"><span className="kpi-value">{kpis.vencidas}</span><span className="kpi-label">Vencidas</span></div>
      </div>

      {view === 'list' && (
        <>
          <div className="mod-filters">
            <select className="filter-select" aria-label="Filtrar por tipo" value={filterTipo} onChange={e => setFilterTipo(e.target.value as any)}>
              <option value="">Todos los tipos</option>
              {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="filter-select" aria-label="Filtrar por estado" value={filterEstado} onChange={e => setFilterEstado(e.target.value as any)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Estado</th><th>NC origen</th><th>Avance</th><th>Compromiso</th><th>Acciones</th></tr></thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(c => (
                  <tr key={c.id} onClick={() => { setSelected(c); setView('detail'); setTab('info'); }}>
                    <td className="cell-code">{c.codigo}</td>
                    <td>{c.titulo}</td>
                    <td><span className={`badge ${TIPO_CLASS[c.tipo]}`}>{TIPO_LABELS[c.tipo]}</span></td>
                    <td><span className={`badge ${ESTADO_CLASS[c.estado]}`}>{ESTADO_LABELS[c.estado]}</span></td>
                    <td className="cell-code">{c.ncCodigo || '—'}</td>
                    <td style={{ minWidth: 80 }}>
                      <div className="progress-bar-wrap"><div className={`progress-bar-fill ${avanceColor(c.avance)}`} style={{ width: `${c.avance}%` }} /></div>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{c.avance}%</span>
                    </td>
                    <td style={{ color: c.fechaCompromiso && new Date(c.fechaCompromiso) < new Date() && !c.estado.startsWith('cerrada') ? '#dc2626' : undefined }}>{c.fechaCompromiso || '—'}</td>
                    <td className="cell-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" title="Ver" onClick={() => { setSelected(c); setView('detail'); setTab('info'); }}>👁</button>
                      <button className="btn-icon btn-icon--danger" title="Eliminar" onClick={() => deleteCapa(c.id)}>🗑</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={8}><EmptyState icon="capa" title="No hay CAPAs registradas" description="Registra una acción correctiva o preventiva para comenzar." compact /></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'create' && (
        <div className="mod-form-card">
          <h3>Nueva CAPA</h3>
          <div className="form-grid">
            <label className="form-group"><span>Código *</span><input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="CAPA-2026-XXX" /></label>
            <label className="form-group"><span>Tipo</span>
              <select value={form.tipo || 'correctiva'} onChange={e => setForm({ ...form, tipo: e.target.value as CAPATipo })}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="form-group form-group--full"><span>Título *</span><input value={form.titulo || ''} onChange={e => setForm({ ...form, titulo: e.target.value })} /></label>
            <label className="form-group"><span>NC origen</span><input value={form.ncCodigo || ''} onChange={e => setForm({ ...form, ncCodigo: e.target.value })} placeholder="NC-2026-XXX" /></label>
            <label className="form-group"><span>Proceso</span><input value={form.proceso || ''} onChange={e => setForm({ ...form, proceso: e.target.value })} /></label>
            <label className="form-group"><span>Responsable</span><input value={form.responsable || ''} onChange={e => setForm({ ...form, responsable: e.target.value })} /></label>
            <label className="form-group"><span>Fecha compromiso</span><input type="date" value={form.fechaCompromiso || ''} onChange={e => setForm({ ...form, fechaCompromiso: e.target.value })} /></label>
            <label className="form-group form-group--full"><span>Plan de acción</span><textarea value={form.planAccion || ''} onChange={e => setForm({ ...form, planAccion: e.target.value })} rows={4} /></label>
            <label className="form-group form-group--full"><span>Recursos necesarios</span><input value={form.recursos || ''} onChange={e => setForm({ ...form, recursos: e.target.value })} /></label>
            <label className="form-group form-group--full"><span>Descripción</span><textarea value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate}>Crear CAPA</button>
            <button className="btn btn-secondary" onClick={() => setView('list')}>Cancelar</button>
          </div>
        </div>
      )}

      {view === 'detail' && selected && (
        <div className="mod-detail">
          <button className="btn btn-link" onClick={() => { setView('list'); setSelected(null); }}>← Volver</button>
          <div className="detail-header">
            <div>
              <span className="detail-code">{selected.codigo}</span>
              <h3 className="detail-title">{selected.titulo}</h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className={`badge badge--lg ${TIPO_CLASS[selected.tipo]}`}>{TIPO_LABELS[selected.tipo]}</span>
              <span className={`badge badge--lg ${ESTADO_CLASS[selected.estado]}`}>{ESTADO_LABELS[selected.estado]}</span>
            </div>
          </div>

          {/* Barra de avance */}
          <div style={{ margin: '12px 0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Avance de implementación</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{selected.avance}%</span>
            </div>
            <div className="progress-bar-wrap" style={{ height: 10 }}>
              <div className={`progress-bar-fill ${avanceColor(selected.avance)}`} style={{ width: `${selected.avance}%` }} />
            </div>
          </div>

          <div className="mod-tabs">
            <button className={`mod-tab ${tab === 'info' ? 'mod-tab--active' : ''}`} onClick={() => setTab('info')}>Información</button>
            <button className={`mod-tab ${tab === 'actividades' ? 'mod-tab--active' : ''}`} onClick={() => setTab('actividades')}>Actividades ({selected.actividades.length})</button>
            <button className={`mod-tab ${tab === 'seguimiento' ? 'mod-tab--active' : ''}`} onClick={() => setTab('seguimiento')}>Seguimiento ({selected.seguimientos.length})</button>
            <button className={`mod-tab ${tab === 'eficacia' ? 'mod-tab--active' : ''}`} onClick={() => setTab('eficacia')}>Eficacia</button>
          </div>

          {tab === 'info' && (
            <>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Proceso</span><span>{selected.proceso}</span></div>
                <div className="detail-item"><span className="detail-label">Responsable</span><span>{selected.responsable}</span></div>
                <div className="detail-item"><span className="detail-label">Apertura</span><span>{selected.fechaApertura}</span></div>
                <div className="detail-item"><span className="detail-label">Compromiso</span><span>{selected.fechaCompromiso || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Cierre</span><span>{selected.fechaCierre || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">NC origen</span><span className="cell-code">{selected.ncCodigo || '—'}</span></div>
              </div>
              <div className="info-cards">
                <div className="info-card"><h4>Origen</h4><p>{selected.origenDescripcion || selected.descripcion}</p></div>
                <div className="info-card"><h4>Plan de acción</h4><p style={{ whiteSpace: 'pre-line' }}>{selected.planAccion || '—'}</p></div>
                <div className="info-card"><h4>Recursos</h4><p>{selected.recursos || '—'}</p></div>
              </div>
            </>
          )}

          {tab === 'actividades' && (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead><tr><th>#</th><th>Actividad</th><th>Responsable</th><th>Compromiso</th><th>Real</th><th>Estado</th></tr></thead>
                <tbody>
                  {selected.actividades.length > 0 ? selected.actividades.map((a, i) => (
                    <tr key={a.id}>
                      <td><span className="activity-number">{i + 1}</span></td>
                      <td>{a.descripcion}</td>
                      <td>{a.responsable}</td>
                      <td>{a.fechaCompromiso}</td>
                      <td>{a.fechaReal || '—'}</td>
                      <td><span className={`badge ${ACT_ESTADO_CLASS[a.estado]}`}>{a.estado === 'en_progreso' ? 'En progreso' : a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}</span></td>
                    </tr>
                  )) : <tr><td colSpan={6}><EmptyState icon="list" title="Sin actividades registradas" compact /></td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'seguimiento' && (
            <div>
              {selected.seguimientos.length > 0 ? selected.seguimientos.map(s => (
                <div key={s.id} className="activity-item">
                  <span className="activity-number" style={{ background: '#d1fae5', color: '#059669' }}>{s.avance}%</span>
                  <div>
                    <strong>{s.fecha}</strong>
                    <p style={{ margin: '2px 0 0', fontSize: 13 }}>{s.descripcion}</p>
                  </div>
                </div>
              )) : <div className="cell-empty" style={{ padding: 32 }}>Sin seguimientos registrados.</div>}
            </div>
          )}

          {tab === 'eficacia' && (
            <div className="info-cards">
              <div className="info-card">
                <h4>Verificación de eficacia</h4>
                <p>{selected.verificacionEficacia || 'Pendiente de verificación.'}</p>
              </div>
              <div className="info-card">
                <h4>¿Es eficaz?</h4>
                <p>{selected.esEficaz === null ? 'Sin evaluar' : selected.esEficaz ? '✓ Sí, eficaz' : '✗ No eficaz'}</p>
              </div>
              {selected.evidenciaCierre && (
                <div className="info-card"><h4>Evidencia de cierre</h4><p>{selected.evidenciaCierre}</p></div>
              )}
            </div>
          )}

          <div className="detail-actions">
            {selected.estado !== 'cancelada' && !selected.estado.startsWith('cerrada') && (
              <button className="btn btn-primary" onClick={() => advanceEstado(selected)}>
                {selected.estado === 'abierta' ? 'Iniciar implementación →' :
                 selected.estado === 'en_implementacion' ? 'Marcar implementada →' :
                 selected.estado === 'implementada' ? 'Enviar a verificación →' :
                 'Cerrar como eficaz ✓'}
              </button>
            )}
            <button className="btn btn-danger" onClick={() => deleteCapa(selected.id)}>Eliminar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CAPA;
