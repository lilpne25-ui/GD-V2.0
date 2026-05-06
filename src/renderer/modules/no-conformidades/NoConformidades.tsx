import React, { useState } from 'react';
import type { NCEstado, NCOrigen, NCClasificacion, MetodoAnalisis } from '../../../shared/types/no-conformidades';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type NCUI = {
  id: string; codigo: string; titulo: string; descripcion: string;
  origen: NCOrigen; clasificacion: NCClasificacion; estado: NCEstado;
  proceso: string; responsable: string; detectadoPor: string;
  fechaDeteccion: string; fechaLimite: string; fechaCierre: string;
  correccionInmediata: string; correccionResponsable: string; correccionFecha: string;
  metodoAnalisis: MetodoAnalisis; causaRaiz: string;
  porques: string[];
  evidenciaCierre: string; verificadoPor: string;
};

const demoNCs: NCUI[] = [
  { id: 'nc-1', codigo: 'NC-2026-001', titulo: 'Documentos sin control de distribución', descripcion: 'Se detectó que la lista de distribución de documentos no está actualizada, 3 procedimientos carecen de acuse de recibo.', origen: 'auditoria', clasificacion: 'nc_menor', estado: 'en_analisis', proceso: 'SGC', responsable: 'Resp. Calidad', detectadoPor: 'Auditor Líder', fechaDeteccion: '2026-01-17', fechaLimite: '2026-02-28', fechaCierre: '', correccionInmediata: 'Se actualizó la lista de distribución y se recabaron acuses pendientes.', correccionResponsable: 'Resp. Calidad', correccionFecha: '2026-01-20', metodoAnalisis: '5_porques', causaRaiz: 'No existe procedimiento automático para validar distribución de documentos nuevos.', porques: ['¿Por qué no tiene acuse?→No se les entregó copy controlada', '¿Por qué no se entregó?→No se actualizó la lista', '¿Por qué no se actualizó?→No hay responsable definido', '¿Por qué no hay responsable?→No se incluyó en el procedimiento', '¿Por qué no se incluyó?→Falta de revisión del procedimiento'], evidenciaCierre: '', verificadoPor: '' },
  { id: 'nc-2', codigo: 'NC-2026-002', titulo: 'Instructivo sin firma de aprobación', descripcion: 'IT-PROD-003 se encontró en uso sin firmas de revisión y aprobación.', origen: 'auditoria', clasificacion: 'nc_menor', estado: 'correccion_aplicada', proceso: 'Producción', responsable: 'Jefe Producción', detectadoPor: 'Auditor Líder', fechaDeteccion: '2026-01-17', fechaLimite: '2026-02-15', fechaCierre: '', correccionInmediata: 'Se retiró el documento y se firmó correctamente.', correccionResponsable: 'Jefe Producción', correccionFecha: '2026-01-18', metodoAnalisis: '5_porques', causaRaiz: 'Falta de verificación antes de la liberación del documento.', porques: [], evidenciaCierre: '', verificadoPor: '' },
  { id: 'nc-3', codigo: 'NC-2026-003', titulo: 'Producto no conforme entregado a cliente', descripcion: 'Se envió un lote con 2 piezas fuera de tolerancia al cliente ABC.', origen: 'cliente', clasificacion: 'nc_mayor', estado: 'abierta', proceso: 'Producción', responsable: 'Jefe Producción', detectadoPor: 'Cliente ABC', fechaDeteccion: '2026-02-05', fechaLimite: '2026-02-20', fechaCierre: '', correccionInmediata: '', correccionResponsable: '', correccionFecha: '', metodoAnalisis: '5_porques', causaRaiz: '', porques: [], evidenciaCierre: '', verificadoPor: '' },
  { id: 'nc-4', codigo: 'NC-2025-010', titulo: 'Calibración vencida en equipo de medición', descripcion: 'Vernier ID-045 con calibración vencida detectado en inspección de recibo.', origen: 'proceso', clasificacion: 'nc_menor', estado: 'cerrada', proceso: 'Calidad', responsable: 'Resp. Calidad', detectadoPor: 'Inspector', fechaDeteccion: '2025-11-20', fechaLimite: '2025-12-15', fechaCierre: '2025-12-10', correccionInmediata: 'Se retiró el equipo de uso y se envió a calibrar.', correccionResponsable: 'Resp. Calidad', correccionFecha: '2025-11-21', metodoAnalisis: '5_porques', causaRaiz: 'No se tiene un sistema automatizado de alertas de vencimiento de calibración.', porques: ['No se detectó el vencimiento→No hay alertas automáticas','No hay alertas→El control es manual en Excel','El Excel no se revisa→No hay responsable fijo','No hay responsable→No se definió en el procedimiento','No se definió→El procedimiento no contempla alertas'], evidenciaCierre: 'Equipo calibrado. COP-045-2025. Se implementó control en sistema.', verificadoPor: 'Resp. Calidad' },
];

const ORIGEN_LABELS: Record<NCOrigen, string> = { auditoria: 'Auditoría', proceso: 'Proceso', producto: 'Producto', cliente: 'Cliente', proveedor: 'Proveedor', otra: 'Otra' };
const CLASIF_LABELS: Record<NCClasificacion, string> = { nc_mayor: 'NC Mayor', nc_menor: 'NC Menor' };
const CLASIF_CLASS: Record<NCClasificacion, string> = { nc_mayor: 'badge--nc-mayor', nc_menor: 'badge--nc-menor' };
const ESTADO_LABELS: Record<NCEstado, string> = { abierta: 'Abierta', en_analisis: 'En análisis', correccion_aplicada: 'Corrección aplicada', en_verificacion: 'En verificación', cerrada: 'Cerrada', cancelada: 'Cancelada' };
const ESTADO_CLASS: Record<NCEstado, string> = { abierta: 'badge--open', en_analisis: 'badge--review', correccion_aplicada: 'badge--in-progress', en_verificacion: 'badge--programada', cerrada: 'badge--closed', cancelada: 'badge--cancelada' };

type View = 'list' | 'detail' | 'create';

const NoConformidades: React.FC = () => {
  const [ncs, setNcs] = useState(demoNCs);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<NCUI | null>(null);
  const [tab, setTab] = useState<'info' | 'correccion' | 'analisis'>('info');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<NCEstado | ''>('');
  const [filterClasif, setFilterClasif] = useState<NCClasificacion | ''>('');
  const [form, setForm] = useState<Partial<NCUI>>({});

  const filtered = ncs.filter(nc => {
    if (filterEstado && nc.estado !== filterEstado) return false;
    if (filterClasif && nc.clasificacion !== filterClasif) return false;
    if (search) {
      const s = search.toLowerCase();
      return nc.codigo.toLowerCase().includes(s) || nc.titulo.toLowerCase().includes(s);
    }
    return true;
  });

  const kpis = {
    total: ncs.length,
    abiertas: ncs.filter(n => !['cerrada', 'cancelada'].includes(n.estado)).length,
    cerradas: ncs.filter(n => n.estado === 'cerrada').length,
    mayores: ncs.filter(n => n.clasificacion === 'nc_mayor').length,
    vencidas: ncs.filter(n => n.fechaLimite && new Date(n.fechaLimite) < new Date() && n.estado !== 'cerrada' && n.estado !== 'cancelada').length,
  };

  const handleCreate = () => {
    const newNC: NCUI = {
      id: 'nc-' + Date.now(), codigo: form.codigo || '', titulo: form.titulo || '',
      descripcion: form.descripcion || '', origen: (form.origen as NCOrigen) || 'proceso',
      clasificacion: (form.clasificacion as NCClasificacion) || 'nc_menor',
      estado: 'abierta', proceso: form.proceso || '', responsable: form.responsable || '',
      detectadoPor: form.detectadoPor || '', fechaDeteccion: form.fechaDeteccion || new Date().toISOString().split('T')[0],
      fechaLimite: form.fechaLimite || '', fechaCierre: '',
      correccionInmediata: '', correccionResponsable: '', correccionFecha: '',
      metodoAnalisis: '5_porques', causaRaiz: '', porques: [],
      evidenciaCierre: '', verificadoPor: '',
    };
    setNcs([newNC, ...ncs]);
    setForm({});
    setView('list');
  };

  const advanceEstado = (nc: NCUI) => {
    const transitions: Record<string, NCEstado> = {
      abierta: 'en_analisis', en_analisis: 'correccion_aplicada',
      correccion_aplicada: 'en_verificacion', en_verificacion: 'cerrada',
    };
    const next = transitions[nc.estado];
    if (!next) return;
    const updated = ncs.map(n => n.id === nc.id ? { ...n, estado: next, ...(next === 'cerrada' ? { fechaCierre: new Date().toISOString().split('T')[0] } : {}) } : n);
    setNcs(updated);
    setSelected(updated.find(n => n.id === nc.id)!);
  };

  const deleteNC = (id: string) => {
    setNcs(ncs.filter(n => n.id !== id));
    if (selected?.id === id) { setSelected(null); setView('list'); }
  };

  return (
    <div className="mod-nc">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">No Conformidades</h2>
          <p className="mod-subtitle">Registro y seguimiento — ISO 9001:2015 (Cláusula 10.2)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setView('create'); }}>+ Nueva NC</button>
      </div>

      {/* KPIs (2.3.8) */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{kpis.total}</span><span className="kpi-label">Total</span></div>
        <div className="kpi-card kpi--open"><span className="kpi-value">{kpis.abiertas}</span><span className="kpi-label">Abiertas</span></div>
        <div className="kpi-card kpi--closed"><span className="kpi-value">{kpis.cerradas}</span><span className="kpi-label">Cerradas</span></div>
        <div className="kpi-card kpi--danger"><span className="kpi-value">{kpis.mayores}</span><span className="kpi-label">NC Mayores</span></div>
        <div className="kpi-card kpi--danger"><span className="kpi-value">{kpis.vencidas}</span><span className="kpi-label">Vencidas</span></div>
      </div>

      {view === 'list' && (
        <>
          <div className="mod-filters">
            <input className="filter-input" placeholder="🔍 Buscar por código o título…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="filter-select" aria-label="Filtrar por estado" value={filterEstado} onChange={e => setFilterEstado(e.target.value as any)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="filter-select" aria-label="Filtrar por clasificación" value={filterClasif} onChange={e => setFilterClasif(e.target.value as any)}>
              <option value="">Todas las clasificaciones</option>
              {Object.entries(CLASIF_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead>
                <tr><th>Código</th><th>Título</th><th>Origen</th><th>Clasificación</th><th>Estado</th><th>Fecha det.</th><th>Límite</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(nc => (
                  <tr key={nc.id} onClick={() => { setSelected(nc); setView('detail'); setTab('info'); }}>
                    <td className="cell-code">{nc.codigo}</td>
                    <td>{nc.titulo}</td>
                    <td>{ORIGEN_LABELS[nc.origen]}</td>
                    <td><span className={`badge ${CLASIF_CLASS[nc.clasificacion]}`}>{CLASIF_LABELS[nc.clasificacion]}</span></td>
                    <td><span className={`badge ${ESTADO_CLASS[nc.estado]}`}>{ESTADO_LABELS[nc.estado]}</span></td>
                    <td>{nc.fechaDeteccion}</td>
                    <td style={{ color: nc.fechaLimite && new Date(nc.fechaLimite) < new Date() && nc.estado !== 'cerrada' ? '#dc2626' : undefined, fontWeight: nc.fechaLimite && new Date(nc.fechaLimite) < new Date() && nc.estado !== 'cerrada' ? 700 : undefined }}>{nc.fechaLimite || '—'}</td>
                    <td className="cell-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" title="Ver" onClick={() => { setSelected(nc); setView('detail'); setTab('info'); }}>👁</button>
                      <button className="btn-icon btn-icon--danger" title="Eliminar" onClick={() => deleteNC(nc.id)}>🗑</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={8}><EmptyState icon="checkCircle" title="No hay no conformidades" description="El sistema no registra no conformidades activas." compact /></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'create' && (
        <div className="mod-form-card">
          <h3>Nueva No Conformidad</h3>
          <div className="form-grid">
            <label className="form-group"><span>Código *</span><input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="NC-2026-XXX" /></label>
            <label className="form-group form-group--full"><span>Título *</span><input value={form.titulo || ''} onChange={e => setForm({ ...form, titulo: e.target.value })} /></label>
            <label className="form-group"><span>Origen</span>
              <select value={form.origen || 'proceso'} onChange={e => setForm({ ...form, origen: e.target.value as NCOrigen })}>
                {Object.entries(ORIGEN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="form-group"><span>Clasificación</span>
              <select value={form.clasificacion || 'nc_menor'} onChange={e => setForm({ ...form, clasificacion: e.target.value as NCClasificacion })}>
                {Object.entries(CLASIF_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="form-group"><span>Proceso</span><input value={form.proceso || ''} onChange={e => setForm({ ...form, proceso: e.target.value })} /></label>
            <label className="form-group"><span>Responsable</span><input value={form.responsable || ''} onChange={e => setForm({ ...form, responsable: e.target.value })} /></label>
            <label className="form-group"><span>Detectado por</span><input value={form.detectadoPor || ''} onChange={e => setForm({ ...form, detectadoPor: e.target.value })} /></label>
            <label className="form-group"><span>Fecha detección</span><input type="date" value={form.fechaDeteccion || ''} onChange={e => setForm({ ...form, fechaDeteccion: e.target.value })} /></label>
            <label className="form-group"><span>Fecha límite</span><input type="date" value={form.fechaLimite || ''} onChange={e => setForm({ ...form, fechaLimite: e.target.value })} /></label>
            <label className="form-group form-group--full"><span>Descripción</span><textarea value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate}>Registrar NC</button>
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
              <span className={`badge badge--lg ${CLASIF_CLASS[selected.clasificacion]}`}>{CLASIF_LABELS[selected.clasificacion]}</span>
              <span className={`badge badge--lg ${ESTADO_CLASS[selected.estado]}`}>{ESTADO_LABELS[selected.estado]}</span>
            </div>
          </div>

          <div className="mod-tabs">
            <button className={`mod-tab ${tab === 'info' ? 'mod-tab--active' : ''}`} onClick={() => setTab('info')}>Información</button>
            <button className={`mod-tab ${tab === 'correccion' ? 'mod-tab--active' : ''}`} onClick={() => setTab('correccion')}>Corrección inmediata</button>
            <button className={`mod-tab ${tab === 'analisis' ? 'mod-tab--active' : ''}`} onClick={() => setTab('analisis')}>Análisis causa raíz</button>
          </div>

          {tab === 'info' && (
            <>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Origen</span><span>{ORIGEN_LABELS[selected.origen]}</span></div>
                <div className="detail-item"><span className="detail-label">Proceso</span><span>{selected.proceso}</span></div>
                <div className="detail-item"><span className="detail-label">Responsable</span><span>{selected.responsable}</span></div>
                <div className="detail-item"><span className="detail-label">Detectado por</span><span>{selected.detectadoPor}</span></div>
                <div className="detail-item"><span className="detail-label">Fecha detección</span><span>{selected.fechaDeteccion}</span></div>
                <div className="detail-item"><span className="detail-label">Fecha límite</span><span style={{ color: selected.fechaLimite && new Date(selected.fechaLimite) < new Date() && selected.estado !== 'cerrada' ? '#dc2626' : undefined }}>{selected.fechaLimite || '—'}</span></div>
              </div>
              <div className="detail-desc">
                <span className="detail-label">Descripción</span>
                <p>{selected.descripcion}</p>
              </div>
              {selected.estado === 'cerrada' && selected.evidenciaCierre && (
                <div className="info-cards">
                  <div className="info-card"><h4>Evidencia de cierre</h4><p>{selected.evidenciaCierre}</p></div>
                  <div className="info-card"><h4>Verificado por</h4><p>{selected.verificadoPor}</p></div>
                  <div className="info-card"><h4>Fecha cierre</h4><p>{selected.fechaCierre}</p></div>
                </div>
              )}
            </>
          )}

          {tab === 'correccion' && (
            <div className="info-cards">
              <div className="info-card"><h4>Corrección inmediata (contención)</h4><p>{selected.correccionInmediata || 'No registrada.'}</p></div>
              <div className="info-card"><h4>Responsable</h4><p>{selected.correccionResponsable || '—'}</p></div>
              <div className="info-card"><h4>Fecha</h4><p>{selected.correccionFecha || '—'}</p></div>
            </div>
          )}

          {tab === 'analisis' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <span className="detail-label">Método de análisis</span>
                <span style={{ marginLeft: 8 }}>{selected.metodoAnalisis === '5_porques' ? '5 Porqués' : selected.metodoAnalisis === 'ishikawa' ? 'Ishikawa' : selected.metodoAnalisis}</span>
              </div>
              {selected.porques.length > 0 && (
                <div className="info-card" style={{ marginBottom: 16 }}>
                  <h4>Análisis 5 Porqués</h4>
                  <ol className="activity-list">
                    {selected.porques.map((p, i) => (
                      <li key={i} className="activity-item">
                        <span className="activity-number">{i + 1}</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="info-cards">
                <div className="info-card"><h4>Causa raíz identificada</h4><p>{selected.causaRaiz || 'Pendiente de análisis.'}</p></div>
              </div>
            </>
          )}

          <div className="detail-actions">
            {selected.estado !== 'cerrada' && selected.estado !== 'cancelada' && (
              <button className="btn btn-primary" onClick={() => advanceEstado(selected)}>
                {selected.estado === 'abierta' ? 'Iniciar análisis →' :
                 selected.estado === 'en_analisis' ? 'Registrar corrección →' :
                 selected.estado === 'correccion_aplicada' ? 'Enviar a verificación →' :
                 'Cerrar NC ✓'}
              </button>
            )}
            <button className="btn btn-secondary">Generar CAPA</button>
            <button className="btn btn-danger" onClick={() => deleteNC(selected.id)}>Eliminar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoConformidades;
