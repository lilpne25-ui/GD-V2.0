import React, { useState, useEffect, useCallback } from 'react';
import type { CambioEstado, CambioTipo, ImpactoCambio } from '../../../shared/types/control-cambios';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type ActividadUI = { id: string; descripcion: string; responsable: string; fechaPlan: string; fechaReal: string; completada: boolean; };
type HistorialUI = { id: string; estadoAnterior: CambioEstado | null; estadoNuevo: CambioEstado; fecha: string; usuario: string; comentario: string; };
type SolicitudUI = {
  id: string; codigo: string; titulo: string; descripcion: string;
  tipo: CambioTipo; impacto: ImpactoCambio; estado: CambioEstado;
  solicitante: string; fechaSolicitud: string; area: string;
  justificacion: string; riesgoNoImplementar: string;
  responsable: string;
  actividades: ActividadUI[];
  historial: HistorialUI[];
};

/* ===================== TIPOS WORKFLOW ===================== */
type WorkflowItem = {
  id: string;
  node_id: string;
  node_name: string | null;
  status: 'borrador' | 'revision' | 'correcciones' | 'aprobado' | 'obsoleto';
  submitted_by: string | null;
  submitted_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type CorreccionItem = {
  id: string;
  workflow_id: string;
  reviewer_name: string | null;
  que_esta_mal: string;
  por_que: string;
  como_corregir: string;
  observaciones: string;
  created_at: string;
};

const ESTADO_ORDER: CambioEstado[] = ['solicitado', 'en_analisis', 'aprobado', 'rechazado', 'en_implementacion', 'verificado', 'cerrado'];
const ESTADO_LABEL: Record<CambioEstado, string> = { solicitado: 'Solicitado', en_analisis: 'En análisis', aprobado: 'Aprobado', rechazado: 'Rechazado', en_implementacion: 'En implementación', verificado: 'Verificado', cerrado: 'Cerrado' };
const ESTADO_CLASS: Record<CambioEstado, string> = { solicitado: 'badge--draft', en_analisis: 'badge--programada', aprobado: 'badge--approved', rechazado: 'badge--overdue', en_implementacion: 'badge--in-progress', verificado: 'badge--approved', cerrado: 'badge--closed' };
const TIPO_LABEL: Record<CambioTipo, string> = { proceso: 'Proceso', producto: 'Producto', documento: 'Documento', sistema: 'Sistema', organizacional: 'Organizacional' };
const IMPACTO_COLOR: Record<ImpactoCambio, string> = { bajo: '#059669', medio: '#d97706', alto: '#dc2626', critico: '#7c3aed' };

const demoSolicitudes: SolicitudUI[] = [
  { id: 'sc-1', codigo: 'SC-2026-001', titulo: 'Actualización del proceso de inspección final', descripcion: 'Incorporar inspección dimensional con CMM en línea para productos críticos, reemplazando medición manual.', tipo: 'proceso', impacto: 'alto', estado: 'en_implementacion', solicitante: 'Jefe de Calidad', fechaSolicitud: '2026-01-10', area: 'Producción / Calidad', justificacion: 'Se detectaron 3 NC por variación dimensional en Q4 2025. La medición manual tiene alta variabilidad.', riesgoNoImplementar: 'Recurrencia de no conformidades dimensionales. Riesgo de reclamo de cliente.', responsable: 'Resp. Ingeniería',
    actividades: [
      { id: 'a1', descripcion: 'Adquirir equipo CMM portátil', responsable: 'Compras', fechaPlan: '2026-01-20', fechaReal: '2026-01-22', completada: true },
      { id: 'a2', descripcion: 'Instalar y calibrar equipo', responsable: 'Mtto / Calidad', fechaPlan: '2026-02-01', fechaReal: '2026-02-03', completada: true },
      { id: 'a3', descripcion: 'Capacitar operadores', responsable: 'Calidad', fechaPlan: '2026-02-10', fechaReal: '', completada: false },
      { id: 'a4', descripcion: 'Actualizar procedimientos e instrucciones', responsable: 'Calidad', fechaPlan: '2026-02-15', fechaReal: '', completada: false },
      { id: 'a5', descripcion: 'Verificar eficacia del cambio', responsable: 'Jefe de Calidad', fechaPlan: '2026-03-01', fechaReal: '', completada: false },
    ],
    historial: [
      { id: 'h1', estadoAnterior: null, estadoNuevo: 'solicitado', fecha: '2026-01-10', usuario: 'Jefe de Calidad', comentario: 'Solicitud creada.' },
      { id: 'h2', estadoAnterior: 'solicitado', estadoNuevo: 'en_analisis', fecha: '2026-01-12', usuario: 'Dir. Operaciones', comentario: 'Se asigna responsable para análisis de factibilidad.' },
      { id: 'h3', estadoAnterior: 'en_analisis', estadoNuevo: 'aprobado', fecha: '2026-01-15', usuario: 'Dirección General', comentario: 'Aprobado. Inversión justificada por reducción de NC.' },
      { id: 'h4', estadoAnterior: 'aprobado', estadoNuevo: 'en_implementacion', fecha: '2026-01-18', usuario: 'Resp. Ingeniería', comentario: 'Inicia plan de implementación.' },
    ],
  },
  { id: 'sc-2', codigo: 'SC-2026-002', titulo: 'Cambio de proveedor de materia prima (acero inoxidable)', descripcion: 'Sustituir al proveedor actual de acero inoxidable 304 por proveedor certificado con mejor tiempo de entrega.', tipo: 'producto', impacto: 'medio', estado: 'en_analisis', solicitante: 'Compras', fechaSolicitud: '2026-02-01', area: 'Compras / Calidad', justificacion: 'Proveedor actual presenta retrasos constantes (promedio 7 días). Nuevo proveedor ofrece stock local.', riesgoNoImplementar: 'Retrasos continuos afectando entregas a clientes.', responsable: 'Jefe de Calidad',
    actividades: [],
    historial: [
      { id: 'h5', estadoAnterior: null, estadoNuevo: 'solicitado', fecha: '2026-02-01', usuario: 'Compras', comentario: 'Solicitud de cambio de proveedor.' },
      { id: 'h6', estadoAnterior: 'solicitado', estadoNuevo: 'en_analisis', fecha: '2026-02-03', usuario: 'Jefe de Calidad', comentario: 'Se solicitan muestras y certificados al nuevo proveedor para evaluación.' },
    ],
  },
  { id: 'sc-3', codigo: 'SC-2025-008', titulo: 'Reestructuración del organigrama del área de calidad', descripcion: 'Crear puesto de Inspector Senior y reasignar funciones para mejorar supervisión.', tipo: 'organizacional', impacto: 'medio', estado: 'cerrado', solicitante: 'Dir. Operaciones', fechaSolicitud: '2025-11-01', area: 'Recursos Humanos / Calidad', justificacion: 'Se requiere supervisión técnica adicional para turno vespertino.', riesgoNoImplementar: 'Baja supervisión en turno vespertino. Incremento de defectos en turno 2.', responsable: 'RH',
    actividades: [
      { id: 'a6', descripcion: 'Definir perfil del puesto', responsable: 'RH', fechaPlan: '2025-11-10', fechaReal: '2025-11-10', completada: true },
      { id: 'a7', descripcion: 'Autorizar presupuesto', responsable: 'Dirección', fechaPlan: '2025-11-15', fechaReal: '2025-11-14', completada: true },
      { id: 'a8', descripcion: 'Selección e inducción', responsable: 'RH', fechaPlan: '2025-12-01', fechaReal: '2025-12-05', completada: true },
      { id: 'a9', descripcion: 'Verificar integración', responsable: 'Jefe de Calidad', fechaPlan: '2026-01-01', fechaReal: '2026-01-03', completada: true },
    ],
    historial: [
      { id: 'h7', estadoAnterior: null, estadoNuevo: 'solicitado', fecha: '2025-11-01', usuario: 'Dir. Operaciones', comentario: '' },
      { id: 'h8', estadoAnterior: 'solicitado', estadoNuevo: 'aprobado', fecha: '2025-11-05', usuario: 'Dirección', comentario: 'Aprobado directamente.' },
      { id: 'h9', estadoAnterior: 'aprobado', estadoNuevo: 'en_implementacion', fecha: '2025-11-06', usuario: 'RH', comentario: '' },
      { id: 'h10', estadoAnterior: 'en_implementacion', estadoNuevo: 'verificado', fecha: '2026-01-03', usuario: 'Jefe de Calidad', comentario: 'Inspector operando correctamente.' },
      { id: 'h11', estadoAnterior: 'verificado', estadoNuevo: 'cerrado', fecha: '2026-01-05', usuario: 'Dir. Operaciones', comentario: 'Cambio implementado exitosamente.' },
    ],
  },
];

type View = 'list' | 'detail';
type MainTab = 'solicitudes' | 'workflow';

const WF_STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  revision: 'En revisión',
  correcciones: 'Correcciones',
  aprobado: 'Aprobado',
  obsoleto: 'Obsoleto',
};
const WF_STATUS_CLASS: Record<string, string> = {
  borrador: 'badge--draft',
  revision: 'badge--programada',
  correcciones: 'badge--overdue',
  aprobado: 'badge--approved',
  obsoleto: 'badge--closed',
};

const ControlCambios: React.FC = () => {
  const [solicitudes] = useState(demoSolicitudes);
  const [view, setView] = useState<View>('list');
  const [selected, setSel] = useState<SolicitudUI | null>(null);
  const [filterEstado, setFE] = useState<CambioEstado | ''>('');
  const [tab, setTab] = useState<'plan' | 'historial'>('plan');
  const [mainTab, setMainTab] = useState<MainTab>('solicitudes');

  /* === Workflow document tracking state === */
  const [wfItems, setWfItems] = useState<WorkflowItem[]>([]);
  const [wfFilterStatus, setWfFilterStatus] = useState('');
  const [wfSelectedItem, setWfSelectedItem] = useState<WorkflowItem | null>(null);
  const [wfCorrections, setWfCorrections] = useState<CorreccionItem[]>([]);
  const [wfDetailView, setWfDetailView] = useState(false);

  const loadWorkflowItems = useCallback(async () => {
    try {
      const items = await (window as any).repo.call('WorkflowRepo', 'listAll', 200) as WorkflowItem[];
      setWfItems(items || []);
    } catch { /* repo not available */ }
  }, []);

  useEffect(() => {
    if (mainTab === 'workflow') void loadWorkflowItems();
  }, [mainTab, loadWorkflowItems]);

  const loadWfCorrections = async (wfId: string) => {
    try {
      const cc = await (window as any).repo.call('WorkflowRepo', 'getCorrections', wfId) as CorreccionItem[];
      setWfCorrections(cc || []);
    } catch { setWfCorrections([]); }
  };

  const openWfDetail = (item: WorkflowItem) => {
    setWfSelectedItem(item);
    setWfDetailView(true);
    void loadWfCorrections(item.id);
  };

  const filteredWf = wfItems.filter(w => !wfFilterStatus || w.status === wfFilterStatus);

  const filtered = solicitudes.filter(s => !filterEstado || s.estado === filterEstado);

  /* helper: step progress */
  const renderWorkflow = (current: CambioEstado) => {
    const steps: CambioEstado[] = ESTADO_ORDER.filter(s => s !== 'rechazado');
    const idx = steps.indexOf(current);
    return (
      <div style={{ display: 'flex', gap: 0, margin: '16px 0' }}>
        {steps.map((s, i) => {
          const done = i <= idx;
          const active = i === idx;
          return (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 4, background: done ? '#2563eb' : '#e5e7eb',
                borderRadius: i === 0 ? '4px 0 0 4px' : i === steps.length - 1 ? '0 4px 4px 0' : 0,
              }} />
              <div style={{
                marginTop: 6, fontSize: 10, fontWeight: active ? 700 : 400,
                color: done ? '#2563eb' : '#9ca3af',
              }}>{ESTADO_LABEL[s]}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mod-control-cambios">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Control de Cambios</h2>
          <p className="mod-subtitle">Gestión de cambios planificados — ISO 9001:2015 (Cláusula 8.5.6)</p>
        </div>
      </div>

      {/* Main tabs: Solicitudes / Workflow docs */}
      <div className="mod-tabs" style={{ marginBottom: 12 }}>
        <button className={`mod-tab ${mainTab === 'solicitudes' ? 'active' : ''}`} onClick={() => setMainTab('solicitudes')}>
          📋 Solicitudes de cambio
        </button>
        <button className={`mod-tab ${mainTab === 'workflow' ? 'active' : ''}`} onClick={() => { setMainTab('workflow'); }}>
          📄 Documentos en Workflow ({wfItems.length})
        </button>
      </div>

      {/* ==================== SOLICITUDES TAB ==================== */}
      {mainTab === 'solicitudes' && (
        <>
      {/* KPIs */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{solicitudes.length}</span><span className="kpi-label">Total solicitudes</span></div>
        <div className="kpi-card kpi--warning"><span className="kpi-value">{solicitudes.filter(s => s.estado === 'en_analisis').length}</span><span className="kpi-label">En análisis</span></div>
        <div className="kpi-card kpi--info"><span className="kpi-value">{solicitudes.filter(s => s.estado === 'en_implementacion').length}</span><span className="kpi-label">En implementación</span></div>
        <div className="kpi-card kpi--success"><span className="kpi-value">{solicitudes.filter(s => s.estado === 'cerrado').length}</span><span className="kpi-label">Cerradas</span></div>
      </div>

      {/* ====== LISTA ====== */}
      {view === 'list' && (
        <>
          <div className="mod-filters">
            <select className="filter-select" aria-label="Filtrar por estado" value={filterEstado} onChange={e => setFE(e.target.value as any)}>
              <option value="">Todos los estados</option>
              {ESTADO_ORDER.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Impacto</th><th>Área</th><th>Fecha</th><th>Estado</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} onClick={() => { setSel(s); setView('detail'); setTab('plan'); }}>
                    <td className="cell-code">{s.codigo}</td>
                    <td>{s.titulo}</td>
                    <td>{TIPO_LABEL[s.tipo]}</td>
                    <td><span style={{ color: IMPACTO_COLOR[s.impacto], fontWeight: 600, textTransform: 'capitalize' }}>{s.impacto}</span></td>
                    <td>{s.area}</td>
                    <td>{s.fechaSolicitud}</td>
                    <td><span className={`badge ${ESTADO_CLASS[s.estado]}`}>{ESTADO_LABEL[s.estado]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ====== DETALLE ====== */}
      {view === 'detail' && selected && (
        <div className="mod-detail">
          <button className="btn btn-link" onClick={() => { setView('list'); setSel(null); }}>← Volver</button>
          <div className="detail-header">
            <div>
              <span className="detail-code">{selected.codigo}</span>
              <h3 className="detail-title">{selected.titulo}</h3>
            </div>
            <span className={`badge badge--lg ${ESTADO_CLASS[selected.estado]}`}>{ESTADO_LABEL[selected.estado]}</span>
          </div>

          {/* Workflow progress bar */}
          {renderWorkflow(selected.estado)}

          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Tipo</span><span>{TIPO_LABEL[selected.tipo]}</span></div>
            <div className="detail-item"><span className="detail-label">Impacto</span><span style={{ color: IMPACTO_COLOR[selected.impacto], fontWeight: 600 }}>{selected.impacto.toUpperCase()}</span></div>
            <div className="detail-item"><span className="detail-label">Solicitante</span><span>{selected.solicitante}</span></div>
            <div className="detail-item"><span className="detail-label">Área</span><span>{selected.area}</span></div>
            <div className="detail-item"><span className="detail-label">Responsable</span><span>{selected.responsable}</span></div>
            <div className="detail-item"><span className="detail-label">Fecha solicitud</span><span>{selected.fechaSolicitud}</span></div>
          </div>

          <div className="info-cards">
            <div className="info-card"><h4>Descripción</h4><p>{selected.descripcion}</p></div>
            <div className="info-card"><h4>Justificación</h4><p>{selected.justificacion}</p></div>
            <div className="info-card"><h4>Riesgo de no implementar</h4><p>{selected.riesgoNoImplementar}</p></div>
          </div>

          {/* Tabs */}
          <div className="mod-tabs">
            <button className={`mod-tab ${tab === 'plan' ? 'active' : ''}`} onClick={() => setTab('plan')}>Plan de implementación ({selected.actividades.length})</button>
            <button className={`mod-tab ${tab === 'historial' ? 'active' : ''}`} onClick={() => setTab('historial')}>Historial ({selected.historial.length})</button>
          </div>

          {tab === 'plan' && (
            selected.actividades.length === 0
              ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: 32 }}>Sin actividades definidas aún.</p>
              : <div className="mod-table-wrap">
                  <table className="mod-table">
                    <thead><tr><th style={{ width: 30 }}></th><th>Actividad</th><th>Responsable</th><th>Fecha plan</th><th>Fecha real</th></tr></thead>
                    <tbody>
                      {selected.actividades.map(a => (
                        <tr key={a.id} style={{ opacity: a.completada ? 0.7 : 1 }}>
                          <td style={{ fontSize: 16 }}>{a.completada ? '✅' : '⬜'}</td>
                          <td style={{ textDecoration: a.completada ? 'line-through' : 'none' }}>{a.descripcion}</td>
                          <td>{a.responsable}</td>
                          <td>{a.fechaPlan}</td>
                          <td>{a.fechaReal || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
                    Avance: {selected.actividades.filter(a => a.completada).length}/{selected.actividades.length} actividades completadas
                    <div style={{ marginTop: 4, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(selected.actividades.filter(a => a.completada).length / selected.actividades.length) * 100}%`, height: '100%', background: '#2563eb', borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
          )}

          {tab === 'historial' && (
            <div style={{ position: 'relative', paddingLeft: 24, marginTop: 12 }}>
              <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#e5e7eb' }} />
              {selected.historial.map(h => (
                <div key={h.id} style={{ position: 'relative', marginBottom: 16, paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: '50%', background: '#2563eb', border: '2px solid #fff' }} />
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{h.fecha} — {h.usuario}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {h.estadoAnterior
                      ? <><span className={`badge badge--sm ${ESTADO_CLASS[h.estadoAnterior]}`}>{ESTADO_LABEL[h.estadoAnterior]}</span> → <span className={`badge badge--sm ${ESTADO_CLASS[h.estadoNuevo]}`}>{ESTADO_LABEL[h.estadoNuevo]}</span></>
                      : <span className={`badge badge--sm ${ESTADO_CLASS[h.estadoNuevo]}`}>{ESTADO_LABEL[h.estadoNuevo]}</span>
                    }
                  </div>
                  {h.comentario && <p style={{ fontSize: 12, color: '#4b5563', marginTop: 4, fontStyle: 'italic' }}>{h.comentario}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* ==================== WORKFLOW TAB ==================== */}
      {mainTab === 'workflow' && !wfDetailView && (
        <>
          {/* Workflow KPIs */}
          <div className="mod-kpis">
            <div className="kpi-card"><span className="kpi-value">{wfItems.length}</span><span className="kpi-label">Total documentos</span></div>
            <div className="kpi-card kpi--warning"><span className="kpi-value">{wfItems.filter(w => w.status === 'revision').length}</span><span className="kpi-label">En revisión</span></div>
            <div className="kpi-card" style={{ borderLeftColor: '#dc2626' }}><span className="kpi-value">{wfItems.filter(w => w.status === 'correcciones').length}</span><span className="kpi-label">Con correcciones</span></div>
            <div className="kpi-card kpi--success"><span className="kpi-value">{wfItems.filter(w => w.status === 'aprobado').length}</span><span className="kpi-label">Aprobados</span></div>
          </div>

          <div className="mod-filters">
            <select className="filter-select" value={wfFilterStatus} aria-label="Filtrar por estado de workflow" onChange={e => setWfFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(WF_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn btn-sm btn-secondary" onClick={() => void loadWorkflowItems()} style={{ marginLeft: 8 }}>🔄 Actualizar</button>
          </div>

          {filteredWf.length === 0 ? (
            <EmptyState icon="workflow" title="No hay documentos en el flujo de trabajo" description="Los documentos enviados a aprobación aparecerán aquí." />
          ) : (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Enviado por</th>
                    <th>Estado</th>
                    <th>Aprobado por</th>
                    <th>Última actualización</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWf.map(w => (
                    <tr key={w.id} onClick={() => openWfDetail(w)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 600 }}>{w.node_name || w.node_id}</td>
                      <td>{w.submitted_by_name || '—'}</td>
                      <td><span className={`badge ${WF_STATUS_CLASS[w.status] || ''}`}>{WF_STATUS_LABEL[w.status] || w.status}</span></td>
                      <td>{w.approved_by_name || '—'}</td>
                      <td>{new Date(w.updated_at).toLocaleString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Workflow detail */}
      {mainTab === 'workflow' && wfDetailView && wfSelectedItem && (
        <div className="mod-detail">
          <button className="btn btn-link" onClick={() => { setWfDetailView(false); setWfSelectedItem(null); }}>← Volver</button>
          <div className="detail-header">
            <div>
              <span className="detail-code">{wfSelectedItem.id}</span>
              <h3 className="detail-title">{wfSelectedItem.node_name || 'Documento'}</h3>
            </div>
            <span className={`badge badge--lg ${WF_STATUS_CLASS[wfSelectedItem.status] || ''}`}>
              {WF_STATUS_LABEL[wfSelectedItem.status] || wfSelectedItem.status}
            </span>
          </div>

          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Enviado por</span><span>{wfSelectedItem.submitted_by_name || '—'}</span></div>
            <div className="detail-item"><span className="detail-label">Creado</span><span>{new Date(wfSelectedItem.created_at).toLocaleString('es-MX')}</span></div>
            <div className="detail-item"><span className="detail-label">Última actualización</span><span>{new Date(wfSelectedItem.updated_at).toLocaleString('es-MX')}</span></div>
            {wfSelectedItem.approved_by_name && (
              <div className="detail-item"><span className="detail-label">Aprobado por</span><span>{wfSelectedItem.approved_by_name}</span></div>
            )}
            {wfSelectedItem.approved_at && (
              <div className="detail-item"><span className="detail-label">Fecha aprobación</span><span>{new Date(wfSelectedItem.approved_at).toLocaleString('es-MX')}</span></div>
            )}
          </div>

          {/* Corrections history */}
          {wfCorrections.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8, color: '#dc2626' }}>🔴 Historial de correcciones ({wfCorrections.length})</h4>
              {wfCorrections.map(c => (
                <div key={c.id} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div><strong style={{ fontSize: 11, color: '#991b1b' }}>¿Qué está mal?</strong><p style={{ margin: '2px 0', fontSize: 13 }}>{c.que_esta_mal}</p></div>
                    <div><strong style={{ fontSize: 11, color: '#991b1b' }}>¿Por qué?</strong><p style={{ margin: '2px 0', fontSize: 13 }}>{c.por_que}</p></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><strong style={{ fontSize: 11, color: '#065f46' }}>¿Cómo corregir?</strong><p style={{ margin: '2px 0', fontSize: 13 }}>{c.como_corregir}</p></div>
                    {c.observaciones && <div><strong style={{ fontSize: 11, color: '#6b7280' }}>Observaciones</strong><p style={{ margin: '2px 0', fontSize: 13 }}>{c.observaciones}</p></div>}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                    Revisado por: {c.reviewer_name || '—'} · {new Date(c.created_at).toLocaleString('es-MX')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {wfCorrections.length === 0 && wfSelectedItem.status !== 'correcciones' && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Sin correcciones registradas para este documento.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ControlCambios;
