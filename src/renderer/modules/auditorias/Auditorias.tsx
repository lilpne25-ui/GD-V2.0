import React, { useState } from 'react';
import type { AuditoriaEstado, AuditoriaTipo, HallazgoClasificacion } from '../../../shared/types/auditorias';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

/* ===================== DATOS DEMO ===================== */
type AuditoriaUI = {
  id: string; codigo: string; tipo: AuditoriaTipo; estado: AuditoriaEstado;
  objetivo: string; alcance: string; criterios: string;
  fechaProgramada: string; fechaInicio: string; fechaFin: string;
  auditorLider: string; equipo: string[]; procesos: string[];
  conclusiones: string;
  hallazgos: HallazgoUI[];
  checklist: ChecklistUI[];
};
type HallazgoUI = {
  id: string; clasificacion: HallazgoClasificacion; clausula: string;
  descripcion: string; evidencia: string; proceso: string;
};
type ChecklistUI = {
  id: string; clausula: string; pregunta: string;
  cumple: 'si' | 'no' | 'parcial' | 'no_aplica' | null;
  evidencia: string; notas: string;
};

const demoAuditorias: AuditoriaUI[] = [
  {
    id: 'aud-1', codigo: 'AI-2026-001', tipo: 'interna', estado: 'completada',
    objetivo: 'Verificar cumplimiento de cláusulas 4-6 ISO 9001:2015',
    alcance: 'Procesos de Calidad y Producción', criterios: 'ISO 9001:2015, documentación interna',
    fechaProgramada: '2026-01-15', fechaInicio: '2026-01-15', fechaFin: '2026-01-17',
    auditorLider: 'Auditor Líder', equipo: ['Auditor Líder', 'Auditor 2'],
    procesos: ['Sistema de Gestión de Calidad', 'Producción'],
    conclusiones: 'Se identificaron 2 NC menores y 1 oportunidad de mejora. En general, buen nivel de conformidad.',
    hallazgos: [
      { id: 'h1', clasificacion: 'nc_menor', clausula: '7.5.3', descripcion: 'Documentos sin control de distribución actualizado', evidencia: 'Lista de distribución desactualizada', proceso: 'SGC' },
      { id: 'h2', clasificacion: 'nc_menor', clausula: '8.5.1', descripcion: 'Instructivo de trabajo sin firma de aprobación', evidencia: 'IT-PROD-003 sin firmas', proceso: 'Producción' },
      { id: 'h3', clasificacion: 'oportunidad_mejora', clausula: '10.3', descripcion: 'Implementar control visual en piso de producción', evidencia: 'Observación durante recorrido', proceso: 'Producción' },
    ],
    checklist: [
      { id: 'c1', clausula: '4.1', pregunta: '¿Se han determinado las cuestiones externas e internas pertinentes?', cumple: 'si', evidencia: 'Análisis FODA actualizado', notas: '' },
      { id: 'c2', clausula: '5.1', pregunta: '¿La alta dirección demuestra liderazgo y compromiso con el SGC?', cumple: 'si', evidencia: 'Política de calidad comunicada', notas: '' },
      { id: 'c3', clausula: '7.5.3', pregunta: '¿Se controla la distribución de documentos?', cumple: 'no', evidencia: 'Lista desactualizada', notas: 'NC menor generada' },
    ],
  },
  {
    id: 'aud-2', codigo: 'AI-2026-002', tipo: 'interna', estado: 'programada',
    objetivo: 'Auditoría de seguimiento al proceso de Compras',
    alcance: 'Proceso de Compras y Proveedores', criterios: 'ISO 9001:2015 Cláusula 8.4',
    fechaProgramada: '2026-03-20', fechaInicio: '', fechaFin: '',
    auditorLider: 'Auditor Líder', equipo: ['Auditor Líder'],
    procesos: ['Compras'], conclusiones: '', hallazgos: [], checklist: [],
  },
  {
    id: 'aud-3', codigo: 'AE-2026-001', tipo: 'externa', estado: 'programada',
    objetivo: 'Auditoría de certificación ISO 9001:2015',
    alcance: 'Todos los procesos del SGC', criterios: 'ISO 9001:2015',
    fechaProgramada: '2026-06-10', fechaInicio: '', fechaFin: '',
    auditorLider: 'Auditor externo (OC)', equipo: ['Equipo OC'],
    procesos: ['Todos'], conclusiones: '', hallazgos: [], checklist: [],
  },
];

const ESTADO_LABELS: Record<AuditoriaEstado, string> = {
  programada: 'Programada', en_ejecucion: 'En ejecución', completada: 'Completada', cancelada: 'Cancelada',
};
const ESTADO_CLASS: Record<AuditoriaEstado, string> = {
  programada: 'badge--programada', en_ejecucion: 'badge--en-ejecucion', completada: 'badge--completada', cancelada: 'badge--cancelada',
};
const HAL_LABELS: Record<HallazgoClasificacion, string> = {
  nc_mayor: 'NC Mayor', nc_menor: 'NC Menor', observacion: 'Observación', oportunidad_mejora: 'Oportunidad de Mejora', fortaleza: 'Fortaleza',
};
const HAL_CLASS: Record<HallazgoClasificacion, string> = {
  nc_mayor: 'badge--nc-mayor', nc_menor: 'badge--nc-menor', observacion: 'badge--observacion', oportunidad_mejora: 'badge--oportunidad', fortaleza: 'badge--fortaleza',
};

type View = 'list' | 'detail' | 'create' | 'checklist';

const Auditorias: React.FC = () => {
  const [auditorias, setAuditorias] = useState(demoAuditorias);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<AuditoriaUI | null>(null);
  const [tab, setTab] = useState<'info' | 'checklist' | 'hallazgos'>('info');
  const [filterEstado, setFilterEstado] = useState<AuditoriaEstado | ''>('');
  const [form, setForm] = useState<Partial<AuditoriaUI>>({});

  const filtered = auditorias.filter(a => !filterEstado || a.estado === filterEstado);

  const kpis = {
    total: auditorias.length,
    programadas: auditorias.filter(a => a.estado === 'programada').length,
    enEjecucion: auditorias.filter(a => a.estado === 'en_ejecucion').length,
    completadas: auditorias.filter(a => a.estado === 'completada').length,
    hallazgos: auditorias.reduce((sum, a) => sum + a.hallazgos.length, 0),
  };

  const handleCreate = () => {
    const newAud: AuditoriaUI = {
      id: 'aud-' + Date.now(), codigo: form.codigo || '', tipo: form.tipo || 'interna',
      estado: 'programada', objetivo: form.objetivo || '', alcance: form.alcance || '',
      criterios: form.criterios || '', fechaProgramada: form.fechaProgramada || '',
      fechaInicio: '', fechaFin: '', auditorLider: form.auditorLider || '',
      equipo: [], procesos: [], conclusiones: '', hallazgos: [], checklist: [],
    };
    setAuditorias([newAud, ...auditorias]);
    setForm({});
    setView('list');
  };

  const advanceEstado = (aud: AuditoriaUI) => {
    const updated = auditorias.map(a => {
      if (a.id !== aud.id) return a;
      if (a.estado === 'programada') return { ...a, estado: 'en_ejecucion' as AuditoriaEstado, fechaInicio: new Date().toISOString().split('T')[0] };
      if (a.estado === 'en_ejecucion') return { ...a, estado: 'completada' as AuditoriaEstado, fechaFin: new Date().toISOString().split('T')[0] };
      return a;
    });
    setAuditorias(updated);
    const upd = updated.find(a => a.id === aud.id)!;
    setSelected(upd);
  };

  const deleteAud = (id: string) => {
    setAuditorias(auditorias.filter(a => a.id !== id));
    if (selected?.id === id) { setSelected(null); setView('list'); }
  };

  return (
    <div className="mod-auditorias">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Auditorías</h2>
          <p className="mod-subtitle">Programa de auditorías — ISO 9001:2015 (Cláusula 9.2)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setView('create'); }}>+ Nueva auditoría</button>
      </div>

      {/* KPIs (2.2.11) */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{kpis.total}</span><span className="kpi-label">Total</span></div>
        <div className="kpi-card kpi--primary"><span className="kpi-value">{kpis.programadas}</span><span className="kpi-label">Programadas</span></div>
        <div className="kpi-card kpi--review"><span className="kpi-value">{kpis.enEjecucion}</span><span className="kpi-label">En ejecución</span></div>
        <div className="kpi-card kpi--approved"><span className="kpi-value">{kpis.completadas}</span><span className="kpi-label">Completadas</span></div>
        <div className="kpi-card kpi--danger"><span className="kpi-value">{kpis.hallazgos}</span><span className="kpi-label">Hallazgos</span></div>
      </div>

      {view === 'list' && (
        <>
          <div className="mod-filters">
            <select className="filter-select" aria-label="Filtrar por estado" value={filterEstado} onChange={e => setFilterEstado(e.target.value as any)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead>
                <tr><th>Código</th><th>Objetivo</th><th>Tipo</th><th>Estado</th><th>Fecha prog.</th><th>Auditor líder</th><th>Hallazgos</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(a => (
                  <tr key={a.id} onClick={() => { setSelected(a); setView('detail'); setTab('info'); }}>
                    <td className="cell-code">{a.codigo}</td>
                    <td>{a.objetivo}</td>
                    <td>{a.tipo === 'interna' ? 'Interna' : 'Externa'}</td>
                    <td><span className={`badge ${ESTADO_CLASS[a.estado]}`}>{ESTADO_LABELS[a.estado]}</span></td>
                    <td>{a.fechaProgramada}</td>
                    <td>{a.auditorLider}</td>
                    <td className="cell-center">{a.hallazgos.length}</td>
                    <td className="cell-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" title="Ver" onClick={() => { setSelected(a); setView('detail'); setTab('info'); }}>👁</button>
                      <button className="btn-icon btn-icon--danger" title="Eliminar" onClick={() => deleteAud(a.id)}>🗑</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8}><EmptyState icon="audit" title="No hay auditorías registradas" description="Programa tu primera auditoría para comenzar." compact /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'create' && (
        <div className="mod-form-card">
          <h3>Nueva auditoría</h3>
          <div className="form-grid">
            <label className="form-group"><span>Código *</span><input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="AI-2026-XXX" /></label>
            <label className="form-group"><span>Tipo</span>
              <select value={form.tipo || 'interna'} onChange={e => setForm({ ...form, tipo: e.target.value as AuditoriaTipo })}>
                <option value="interna">Interna</option><option value="externa">Externa</option>
              </select>
            </label>
            <label className="form-group form-group--full"><span>Objetivo *</span><input value={form.objetivo || ''} onChange={e => setForm({ ...form, objetivo: e.target.value })} /></label>
            <label className="form-group"><span>Alcance</span><input value={form.alcance || ''} onChange={e => setForm({ ...form, alcance: e.target.value })} /></label>
            <label className="form-group"><span>Criterios</span><input value={form.criterios || ''} onChange={e => setForm({ ...form, criterios: e.target.value })} /></label>
            <label className="form-group"><span>Fecha programada</span><input type="date" value={form.fechaProgramada || ''} onChange={e => setForm({ ...form, fechaProgramada: e.target.value })} /></label>
            <label className="form-group"><span>Auditor líder</span><input value={form.auditorLider || ''} onChange={e => setForm({ ...form, auditorLider: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate}>Crear auditoría</button>
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
              <h3 className="detail-title">{selected.objetivo}</h3>
            </div>
            <span className={`badge badge--lg ${ESTADO_CLASS[selected.estado]}`}>{ESTADO_LABELS[selected.estado]}</span>
          </div>

          {/* Tabs */}
          <div className="mod-tabs">
            <button className={`mod-tab ${tab === 'info' ? 'mod-tab--active' : ''}`} onClick={() => setTab('info')}>Información</button>
            <button className={`mod-tab ${tab === 'checklist' ? 'mod-tab--active' : ''}`} onClick={() => setTab('checklist')}>Checklist ({selected.checklist.length})</button>
            <button className={`mod-tab ${tab === 'hallazgos' ? 'mod-tab--active' : ''}`} onClick={() => setTab('hallazgos')}>Hallazgos ({selected.hallazgos.length})</button>
          </div>

          {tab === 'info' && (
            <>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Tipo</span><span>{selected.tipo === 'interna' ? 'Interna' : 'Externa'}</span></div>
                <div className="detail-item"><span className="detail-label">Fecha prog.</span><span>{selected.fechaProgramada}</span></div>
                <div className="detail-item"><span className="detail-label">Inicio</span><span>{selected.fechaInicio || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Fin</span><span>{selected.fechaFin || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Auditor líder</span><span>{selected.auditorLider}</span></div>
                <div className="detail-item"><span className="detail-label">Procesos</span><span>{selected.procesos.join(', ') || '—'}</span></div>
              </div>
              <div className="info-cards">
                <div className="info-card"><h4>Alcance</h4><p>{selected.alcance || '—'}</p></div>
                <div className="info-card"><h4>Criterios</h4><p>{selected.criterios || '—'}</p></div>
                {selected.conclusiones && <div className="info-card"><h4>Conclusiones</h4><p>{selected.conclusiones}</p></div>}
              </div>
            </>
          )}

          {tab === 'checklist' && (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead><tr><th>Cláusula</th><th>Pregunta</th><th>Cumple</th><th>Evidencia</th></tr></thead>
                <tbody>
                  {selected.checklist.length > 0 ? selected.checklist.map(c => (
                    <tr key={c.id}>
                      <td className="cell-code">{c.clausula}</td>
                      <td>{c.pregunta}</td>
                      <td><span className={`badge ${c.cumple === 'si' ? 'badge--approved' : c.cumple === 'no' ? 'badge--nc-mayor' : c.cumple === 'parcial' ? 'badge--review' : 'badge--draft'}`}>
                        {c.cumple === 'si' ? 'Sí' : c.cumple === 'no' ? 'No' : c.cumple === 'parcial' ? 'Parcial' : c.cumple === 'no_aplica' ? 'N/A' : '—'}
                      </span></td>
                      <td>{c.evidencia || '—'}</td>
                    </tr>
                  )) : <tr><td colSpan={4}><EmptyState icon="clipboard" title="Sin checklist registrado" compact /></td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'hallazgos' && (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead><tr><th>Clasificación</th><th>Cláusula</th><th>Descripción</th><th>Proceso</th></tr></thead>
                <tbody>
                  {selected.hallazgos.length > 0 ? selected.hallazgos.map(h => (
                    <tr key={h.id}>
                      <td><span className={`badge ${HAL_CLASS[h.clasificacion]}`}>{HAL_LABELS[h.clasificacion]}</span></td>
                      <td className="cell-code">{h.clausula}</td>
                      <td>{h.descripcion}</td>
                      <td>{h.proceso}</td>
                    </tr>
                  )) : <tr><td colSpan={4}><EmptyState icon="search" title="Sin hallazgos" compact /></td></tr>}
                </tbody>
              </table>
            </div>
          )}

          <div className="detail-actions">
            {selected.estado === 'programada' && <button className="btn btn-warning" onClick={() => advanceEstado(selected)}>Iniciar auditoría →</button>}
            {selected.estado === 'en_ejecucion' && <button className="btn btn-success" onClick={() => advanceEstado(selected)}>Completar auditoría ✓</button>}
            <button className="btn btn-secondary">Generar informe</button>
            <button className="btn btn-danger" onClick={() => deleteAud(selected.id)}>Eliminar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auditorias;
