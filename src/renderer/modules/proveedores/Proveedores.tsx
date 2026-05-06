import React, { useState } from 'react';
import type { ProveedorEstatus, CriterioEvaluacion } from '../../../shared/types/proveedores';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type IncidenciaUI = { id: string; fecha: string; tipo: string; descripcion: string; impacto: string; accion: string; };
type EvalUI = { id: string; periodo: string; fecha: string; calificacion: number; resultado: ProveedorEstatus; criterios: { criterio: CriterioEvaluacion; peso: number; calif: number; pond: number }[]; };
type ProveedorUI = {
  id: string; codigo: string; razonSocial: string; nombreComercial: string;
  rfc: string; contacto: string; telefono: string; email: string;
  productoServicio: string; categoria: string;
  estatus: ProveedorEstatus; calificacion: number;
  fechaAlta: string; fechaUltEval: string; fechaProxEval: string;
  incidencias: IncidenciaUI[];
  evaluaciones: EvalUI[];
};

const demoProveedores: ProveedorUI[] = [
  { id: 'p1', codigo: 'PROV-001', razonSocial: 'Aceros Nacionales S.A. de C.V.', nombreComercial: 'ANSA', rfc: 'ANS920101XXX', contacto: 'Ing. Ramírez', telefono: '(81) 1234-5678', email: 'ventas@ansa.mx', productoServicio: 'Acero inoxidable 304, 316', categoria: 'Materia prima', estatus: 'aprobado', calificacion: 92, fechaAlta: '2023-03-15', fechaUltEval: '2025-12-01', fechaProxEval: '2026-06-01',
    evaluaciones: [
      { id: 'ev1', periodo: '2025-S2', fecha: '2025-12-01', calificacion: 92, resultado: 'aprobado', criterios: [
        { criterio: 'calidad', peso: 30, calif: 95, pond: 28.5 }, { criterio: 'entrega', peso: 25, calif: 88, pond: 22 },
        { criterio: 'precio', peso: 20, calif: 90, pond: 18 }, { criterio: 'servicio', peso: 15, calif: 95, pond: 14.25 },
        { criterio: 'documentacion', peso: 10, calif: 92, pond: 9.2 },
      ]},
      { id: 'ev2', periodo: '2025-S1', fecha: '2025-06-01', calificacion: 88, resultado: 'aprobado', criterios: [
        { criterio: 'calidad', peso: 30, calif: 90, pond: 27 }, { criterio: 'entrega', peso: 25, calif: 82, pond: 20.5 },
        { criterio: 'precio', peso: 20, calif: 88, pond: 17.6 }, { criterio: 'servicio', peso: 15, calif: 92, pond: 13.8 },
        { criterio: 'documentacion', peso: 10, calif: 90, pond: 9 },
      ]},
    ],
    incidencias: [{ id: 'i1', fecha: '2025-09-15', tipo: 'retraso', descripcion: 'Entrega 3 días tarde del OC-4521', impacto: 'medio', accion: 'Se solicitó plan de acción al proveedor.' }],
  },
  { id: 'p2', codigo: 'PROV-002', razonSocial: 'Calibraciones del Norte S.A.', nombreComercial: 'CalNorte', rfc: 'CNO180501XXX', contacto: 'Lic. Garza', telefono: '(81) 2345-6789', email: 'info@calnorte.mx', productoServicio: 'Servicios de calibración', categoria: 'Servicio', estatus: 'aprobado', calificacion: 95, fechaAlta: '2022-01-10', fechaUltEval: '2025-12-15', fechaProxEval: '2026-06-15', evaluaciones: [
    { id: 'ev3', periodo: '2025-S2', fecha: '2025-12-15', calificacion: 95, resultado: 'aprobado', criterios: [
      { criterio: 'calidad', peso: 35, calif: 98, pond: 34.3 }, { criterio: 'entrega', peso: 25, calif: 92, pond: 23 },
      { criterio: 'precio', peso: 15, calif: 88, pond: 13.2 }, { criterio: 'servicio', peso: 15, calif: 96, pond: 14.4 },
      { criterio: 'documentacion', peso: 10, calif: 100, pond: 10 },
    ]},
  ], incidencias: [] },
  { id: 'p3', codigo: 'PROV-003', razonSocial: 'Empaques y Embalajes del Golfo', nombreComercial: 'EEG', rfc: 'EEG200301XXX', contacto: 'Sr. López', telefono: '(229) 111-2233', email: 'ventas@eeg.com', productoServicio: 'Material de empaque y embalaje', categoria: 'Materia prima', estatus: 'condicional', calificacion: 68, fechaAlta: '2024-06-01', fechaUltEval: '2025-11-01', fechaProxEval: '2026-02-01', evaluaciones: [
    { id: 'ev4', periodo: '2025-S2', fecha: '2025-11-01', calificacion: 68, resultado: 'condicional', criterios: [
      { criterio: 'calidad', peso: 30, calif: 70, pond: 21 }, { criterio: 'entrega', peso: 25, calif: 60, pond: 15 },
      { criterio: 'precio', peso: 20, calif: 75, pond: 15 }, { criterio: 'servicio', peso: 15, calif: 65, pond: 9.75 },
      { criterio: 'documentacion', peso: 10, calif: 72, pond: 7.2 },
    ]},
  ], incidencias: [
    { id: 'i2', fecha: '2025-10-20', tipo: 'rechazo', descripcion: 'Lote de cajas con dimensiones fuera de especificación', impacto: 'alto', accion: 'Devolución del lote. Se solicitó re-inspección.' },
    { id: 'i3', fecha: '2025-08-05', tipo: 'faltante', descripcion: 'Entrega incompleta OC-3890, faltaron 200 pzas', impacto: 'medio', accion: 'Entrega complementaria en 48 hrs.' },
  ] },
  { id: 'p4', codigo: 'PROV-004', razonSocial: 'Transportes Rápidos del Bajío', nombreComercial: 'TRB', rfc: 'TRB150801XXX', contacto: 'Ing. Torres', telefono: '(477) 333-4455', email: 'logistica@trb.mx', productoServicio: 'Transporte y distribución', categoria: 'Servicio', estatus: 'en_evaluacion', calificacion: 0, fechaAlta: '2026-01-15', fechaUltEval: '', fechaProxEval: '2026-04-15', evaluaciones: [], incidencias: [] },
];

const ESTATUS_LABELS: Record<ProveedorEstatus, string> = { aprobado: 'Aprobado', condicional: 'Condicional', rechazado: 'Rechazado', en_evaluacion: 'En evaluación', suspendido: 'Suspendido' };
const ESTATUS_CLASS: Record<ProveedorEstatus, string> = { aprobado: 'badge--approved', condicional: 'badge--review', rechazado: 'badge--nc-mayor', en_evaluacion: 'badge--draft', suspendido: 'badge--closed' };
const CRITERIO_LABELS: Record<CriterioEvaluacion, string> = { calidad: 'Calidad', entrega: 'Entrega', precio: 'Precio', servicio: 'Servicio', documentacion: 'Documentación', capacidad: 'Capacidad' };

type View = 'list' | 'detail' | 'create' | 'eval';

const Proveedores: React.FC = () => {
  const [proveedores, setProveedores] = useState(demoProveedores);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<ProveedorUI | null>(null);
  const [tab, setTab] = useState<'info' | 'evaluaciones' | 'incidencias'>('info');
  const [filterEstatus, setFE] = useState<ProveedorEstatus | ''>('');
  const [form, setForm] = useState<Partial<ProveedorUI>>({});

  const filtered = proveedores.filter(p => !filterEstatus || p.estatus === filterEstatus);
  const kpis = {
    total: proveedores.length,
    aprobados: proveedores.filter(p => p.estatus === 'aprobado').length,
    condicionales: proveedores.filter(p => p.estatus === 'condicional').length,
    enEval: proveedores.filter(p => p.estatus === 'en_evaluacion').length,
  };

  const calColor = (c: number) => c >= 80 ? '#059669' : c >= 60 ? '#d97706' : '#dc2626';

  const handleCreate = () => {
    const newP: ProveedorUI = {
      id: 'p-' + Date.now(), codigo: form.codigo || '', razonSocial: form.razonSocial || '',
      nombreComercial: form.nombreComercial || '', rfc: form.rfc || '',
      contacto: form.contacto || '', telefono: form.telefono || '', email: form.email || '',
      productoServicio: form.productoServicio || '', categoria: form.categoria || '',
      estatus: 'en_evaluacion', calificacion: 0,
      fechaAlta: new Date().toISOString().split('T')[0], fechaUltEval: '', fechaProxEval: '',
      evaluaciones: [], incidencias: [],
    };
    setProveedores([newP, ...proveedores]); setForm({}); setView('list');
  };

  return (
    <div className="mod-proveedores">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Gestión de Proveedores</h2>
          <p className="mod-subtitle">Evaluación y reevaluación — ISO 9001:2015 (Cláusula 8.4)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setView('create'); }}>+ Nuevo proveedor</button>
      </div>

      {/* KPIs */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{kpis.total}</span><span className="kpi-label">Total</span></div>
        <div className="kpi-card kpi--approved"><span className="kpi-value">{kpis.aprobados}</span><span className="kpi-label">Aprobados</span></div>
        <div className="kpi-card kpi--review"><span className="kpi-value">{kpis.condicionales}</span><span className="kpi-label">Condicionales</span></div>
        <div className="kpi-card"><span className="kpi-value">{kpis.enEval}</span><span className="kpi-label">En evaluación</span></div>
      </div>

      {view === 'list' && (
        <>
          <div className="mod-filters">
            <select className="filter-select" aria-label="Filtrar por estatus" value={filterEstatus} onChange={e => setFE(e.target.value as any)}>
              <option value="">Todos los estatus</option>
              {Object.entries(ESTATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Código</th><th>Razón Social</th><th>Categoría</th><th>Calificación</th><th>Estatus</th><th>Últ. Evaluación</th><th>Incidencias</th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => { setSelected(p); setView('detail'); setTab('info'); }}>
                    <td className="cell-code">{p.codigo}</td>
                    <td><strong>{p.razonSocial}</strong>{p.nombreComercial ? <span style={{ color: '#6b7280', marginLeft: 4 }}>({p.nombreComercial})</span> : null}</td>
                    <td>{p.categoria}</td>
                    <td>
                      {p.calificacion > 0 ? (
                        <span style={{ fontWeight: 700, color: calColor(p.calificacion) }}>{p.calificacion}%</span>
                      ) : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td><span className={`badge ${ESTATUS_CLASS[p.estatus]}`}>{ESTATUS_LABELS[p.estatus]}</span></td>
                    <td>{p.fechaUltEval || '—'}</td>
                    <td className="cell-center">{p.incidencias.length > 0 ? <span className="badge badge--nc-menor">{p.incidencias.length}</span> : '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'create' && (
        <div className="mod-form-card">
          <h3>Nuevo proveedor</h3>
          <div className="form-grid">
            <label className="form-group"><span>Código *</span><input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="PROV-XXX" /></label>
            <label className="form-group"><span>Categoría</span>
              <select value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                <option value="">Seleccionar</option>
                <option value="Materia prima">Materia prima</option>
                <option value="Servicio">Servicio</option>
                <option value="Equipo">Equipo</option>
                <option value="Otro">Otro</option>
              </select>
            </label>
            <label className="form-group form-group--full"><span>Razón Social *</span><input value={form.razonSocial || ''} onChange={e => setForm({ ...form, razonSocial: e.target.value })} /></label>
            <label className="form-group"><span>Nombre Comercial</span><input value={form.nombreComercial || ''} onChange={e => setForm({ ...form, nombreComercial: e.target.value })} /></label>
            <label className="form-group"><span>RFC</span><input value={form.rfc || ''} onChange={e => setForm({ ...form, rfc: e.target.value })} /></label>
            <label className="form-group"><span>Contacto</span><input value={form.contacto || ''} onChange={e => setForm({ ...form, contacto: e.target.value })} /></label>
            <label className="form-group"><span>Teléfono</span><input value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} /></label>
            <label className="form-group"><span>Email</span><input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label className="form-group form-group--full"><span>Producto / Servicio</span><input value={form.productoServicio || ''} onChange={e => setForm({ ...form, productoServicio: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate}>Registrar</button>
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
              <h3 className="detail-title">{selected.razonSocial}</h3>
              {selected.nombreComercial && <span style={{ color: '#6b7280', fontSize: 13 }}>({selected.nombreComercial})</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selected.calificacion > 0 && <span style={{ fontSize: 28, fontWeight: 700, color: calColor(selected.calificacion) }}>{selected.calificacion}%</span>}
              <span className={`badge badge--lg ${ESTATUS_CLASS[selected.estatus]}`}>{ESTATUS_LABELS[selected.estatus]}</span>
            </div>
          </div>

          <div className="mod-tabs">
            <button className={`mod-tab ${tab === 'info' ? 'mod-tab--active' : ''}`} onClick={() => setTab('info')}>Datos generales</button>
            <button className={`mod-tab ${tab === 'evaluaciones' ? 'mod-tab--active' : ''}`} onClick={() => setTab('evaluaciones')}>Evaluaciones ({selected.evaluaciones.length})</button>
            <button className={`mod-tab ${tab === 'incidencias' ? 'mod-tab--active' : ''}`} onClick={() => setTab('incidencias')}>Incidencias ({selected.incidencias.length})</button>
          </div>

          {tab === 'info' && (
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-label">RFC</span><span>{selected.rfc}</span></div>
              <div className="detail-item"><span className="detail-label">Contacto</span><span>{selected.contacto}</span></div>
              <div className="detail-item"><span className="detail-label">Teléfono</span><span>{selected.telefono}</span></div>
              <div className="detail-item"><span className="detail-label">Email</span><span>{selected.email}</span></div>
              <div className="detail-item"><span className="detail-label">Producto/Servicio</span><span>{selected.productoServicio}</span></div>
              <div className="detail-item"><span className="detail-label">Categoría</span><span>{selected.categoria}</span></div>
              <div className="detail-item"><span className="detail-label">Fecha alta</span><span>{selected.fechaAlta}</span></div>
              <div className="detail-item"><span className="detail-label">Últ. evaluación</span><span>{selected.fechaUltEval || '—'}</span></div>
              <div className="detail-item"><span className="detail-label">Próx. evaluación</span><span>{selected.fechaProxEval || '—'}</span></div>
            </div>
          )}

          {tab === 'evaluaciones' && (
            <div>
              {selected.evaluaciones.length > 0 ? selected.evaluaciones.map(ev => (
                <div key={ev.id} style={{ background: '#fff', border: '1px solid #e2e5ea', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{ev.periodo}</span>
                      <span style={{ color: '#6b7280', marginLeft: 8, fontSize: 12 }}>{ev.fecha}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: calColor(ev.calificacion) }}>{ev.calificacion}%</span>
                      <span className={`badge ${ESTATUS_CLASS[ev.resultado]}`}>{ESTATUS_LABELS[ev.resultado]}</span>
                    </div>
                  </div>
                  <table className="mod-table" style={{ marginBottom: 0 }}>
                    <thead><tr><th>Criterio</th><th>Peso</th><th>Calificación</th><th>Ponderado</th></tr></thead>
                    <tbody>
                      {ev.criterios.map(c => (
                        <tr key={c.criterio}>
                          <td>{CRITERIO_LABELS[c.criterio]}</td>
                          <td className="cell-center">{c.peso}%</td>
                          <td className="cell-center" style={{ color: calColor(c.calif) }}>{c.calif}</td>
                          <td className="cell-center" style={{ fontWeight: 600 }}>{c.pond.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )) : <div className="cell-empty" style={{ padding: 32 }}>Sin evaluaciones registradas.</div>}
            </div>
          )}

          {tab === 'incidencias' && (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Impacto</th><th>Acción</th></tr></thead>
                <tbody>
                  {selected.incidencias.length > 0 ? selected.incidencias.map(inc => (
                    <tr key={inc.id}>
                      <td>{inc.fecha}</td>
                      <td className="cell-code" style={{ textTransform: 'capitalize' }}>{inc.tipo}</td>
                      <td>{inc.descripcion}</td>
                      <td><span className={`badge ${inc.impacto === 'alto' ? 'badge--nc-mayor' : inc.impacto === 'medio' ? 'badge--review' : 'badge--draft'}`}>{inc.impacto}</span></td>
                      <td style={{ fontSize: 12 }}>{inc.accion}</td>
                    </tr>
                  )) : <tr><td colSpan={5}><EmptyState icon="checkCircle" title="Sin incidencias registradas" compact /></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Proveedores;
