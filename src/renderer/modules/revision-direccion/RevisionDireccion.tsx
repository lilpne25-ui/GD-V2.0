import React, { useState } from 'react';
import type { RevisionEstado, TemaEntrada } from '../../../shared/types/revision-direccion';
import { TEMA_ENTRADA_LABELS } from '../../../shared/types/revision-direccion';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type EntradaUI = { id: string; tema: TemaEntrada; resumen: string; datos: string; };
type SalidaUI = { id: string; tipo: 'decision' | 'accion' | 'recurso' | 'cambio_sgc'; descripcion: string; responsable: string; fechaCompromiso: string; estado: 'pendiente' | 'en_progreso' | 'completada'; };
type AsistenteUI = { id: string; nombre: string; cargo: string; presente: boolean; };
type RevisionUI = {
  id: string; codigo: string; titulo: string; fecha: string;
  horaInicio: string; horaFin: string; estado: RevisionEstado;
  convocadoPor: string; lugar: string;
  resumenEjecutivo: string;
  entradas: EntradaUI[];
  salidas: SalidaUI[];
  asistentes: AsistenteUI[];
};

const demoRevisiones: RevisionUI[] = [
  {
    id: 'rd-1', codigo: 'RD-2026-001', titulo: 'Revisión por la Dirección — 1er Semestre 2026',
    fecha: '2026-01-30', horaInicio: '09:00', horaFin: '12:30', estado: 'completada',
    convocadoPor: 'Director General', lugar: 'Sala de juntas principal',
    resumenEjecutivo: 'Se revisó el desempeño del SGC del 2do semestre 2025. Se identificaron 3 áreas de mejora principales. El SGC se considera adecuado y eficaz con oportunidades de optimización en el cierre de NC y desempeño de proveedor de empaque.',
    entradas: [
      { id: 'e1', tema: 'estado_acciones_anteriores', resumen: 'De 8 acciones de la revisión anterior, 6 están completadas y 2 en progreso.', datos: '75% completadas a tiempo.' },
      { id: 'e2', tema: 'desempeno_procesos', resumen: 'Producción: 98.2% conformidad. Logística: 96.1% entrega a tiempo. Calidad: 85% cierre NC en plazo.', datos: '5/6 indicadores en meta o cerca.' },
      { id: 'e3', tema: 'no_conformidades', resumen: '12 NC en el período. 8 cerradas, 4 abiertas. 2 NC mayores derivadas de auditoría interna.', datos: 'Reducción del 20% vs período anterior.' },
      { id: 'e4', tema: 'auditorias', resumen: 'Se completaron 3 auditorías internas y 1 auditoría de vigilancia external. Sin NC mayores en auditoría externa.', datos: 'Programa de auditorías cumplido al 100%.' },
      { id: 'e5', tema: 'satisfaccion_cliente', resumen: 'Satisfacción: 8.8/10 (arriba de meta 8.5). 3 quejas recibidas, todas cerradas.', datos: 'NPS: +42' },
      { id: 'e6', tema: 'proveedores', resumen: '1 proveedor condicional (empaque). Los demás aprobados.', datos: 'Promedio general: 87%' },
      { id: 'e7', tema: 'riesgos', resumen: '2 riesgos altos en tratamiento, 1 riesgo mitigado. 1 oportunidad identificada (automatización).', datos: 'Sin riesgos críticos.' },
    ],
    salidas: [
      { id: 's1', tipo: 'accion', descripcion: 'Desarrollar segundo proveedor de empaque para marzo 2026', responsable: 'Compras', fechaCompromiso: '2026-03-31', estado: 'en_progreso' },
      { id: 's2', tipo: 'recurso', descripcion: 'Autorizar presupuesto para sistema de visión artificial (estudio de factibilidad)', responsable: 'Dir. General', fechaCompromiso: '2026-02-28', estado: 'completada' },
      { id: 's3', tipo: 'decision', descripcion: 'Mantener la política de calidad vigente sin cambios', responsable: 'Resp. Calidad', fechaCompromiso: '', estado: 'completada' },
      { id: 's4', tipo: 'accion', descripcion: 'Implementar método estructurado de cierre de NC para mejorar tiempos', responsable: 'Resp. Calidad', fechaCompromiso: '2026-04-30', estado: 'pendiente' },
      { id: 's5', tipo: 'cambio_sgc', descripcion: 'Incorporar control de calibraciones al sistema digital', responsable: 'TI', fechaCompromiso: '2026-06-30', estado: 'pendiente' },
    ],
    asistentes: [
      { id: 'a1', nombre: 'Ing. Carlos Mendoza', cargo: 'Director General', presente: true },
      { id: 'a2', nombre: 'Lic. Ana Garza', cargo: 'Responsable de Calidad', presente: true },
      { id: 'a3', nombre: 'Ing. Roberto Pérez', cargo: 'Jefe de Producción', presente: true },
      { id: 'a4', nombre: 'Ing. Laura Ríos', cargo: 'Jefe de Logística', presente: true },
      { id: 'a5', nombre: 'Lic. Mariana Torres', cargo: 'Responsable de RH', presente: true },
      { id: 'a6', nombre: 'Ing. Pedro Salinas', cargo: 'Resp. de Compras', presente: false },
    ],
  },
  {
    id: 'rd-2', codigo: 'RD-2026-002', titulo: 'Revisión por la Dirección — 2do Semestre 2026',
    fecha: '2026-07-30', horaInicio: '09:00', horaFin: '', estado: 'programada',
    convocadoPor: 'Director General', lugar: 'Sala de juntas principal',
    resumenEjecutivo: '', entradas: [], salidas: [], asistentes: [],
  },
];

const ESTADO_LABELS: Record<RevisionEstado, string> = { programada: 'Programada', en_curso: 'En curso', completada: 'Completada', cancelada: 'Cancelada' };
const ESTADO_CLASS: Record<RevisionEstado, string> = { programada: 'badge--programada', en_curso: 'badge--in-progress', completada: 'badge--approved', cancelada: 'badge--closed' };
const SALIDA_TIPO: Record<string, string> = { decision: '📋 Decisión', accion: '⚡ Acción', recurso: '💰 Recurso', cambio_sgc: '🔄 Cambio SGC' };
const SALIDA_ESTADO_CLASS: Record<string, string> = { pendiente: 'badge--draft', en_progreso: 'badge--in-progress', completada: 'badge--approved' };

type View = 'list' | 'detail' | 'create';

const RevisionDireccion: React.FC = () => {
  const [revisiones] = useState(demoRevisiones);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<RevisionUI | null>(null);
  const [tab, setTab] = useState<'resumen' | 'entradas' | 'salidas' | 'asistentes'>('resumen');

  return (
    <div className="mod-revision-direccion">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Revisión por la Dirección</h2>
          <p className="mod-subtitle">Entradas, salidas y seguimiento — ISO 9001:2015 (Cláusula 9.3)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setView('create')}>+ Nueva revisión</button>
      </div>

      {/* KPIs */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{revisiones.length}</span><span className="kpi-label">Total</span></div>
        <div className="kpi-card kpi--approved"><span className="kpi-value">{revisiones.filter(r => r.estado === 'completada').length}</span><span className="kpi-label">Completadas</span></div>
        <div className="kpi-card"><span className="kpi-value">{revisiones.filter(r => r.estado === 'programada').length}</span><span className="kpi-label">Programadas</span></div>
        <div className="kpi-card kpi--open"><span className="kpi-value">{revisiones.reduce((a, r) => a + r.salidas.filter(s => s.estado !== 'completada').length, 0)}</span><span className="kpi-label">Compromisos abiertos</span></div>
      </div>

      {view === 'list' && (
        <div>
          {revisiones.map(rev => (
            <div key={rev.id} style={{ background: '#fff', border: '1px solid #e2e5ea', borderRadius: 8, padding: 16, marginBottom: 12, cursor: 'pointer' }}
              onClick={() => { setSelected(rev); setView('detail'); setTab('resumen'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, color: '#6b7280', marginRight: 8 }}>{rev.codigo}</span>
                  <span className={`badge ${ESTADO_CLASS[rev.estado]}`}>{ESTADO_LABELS[rev.estado]}</span>
                </div>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{rev.fecha}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>{rev.titulo}</h3>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                <span>📅 {rev.fecha} {rev.horaInicio && `${rev.horaInicio}-${rev.horaFin || '...'}`}</span>
                <span>📍 {rev.lugar}</span>
                <span>👥 {rev.asistentes.length} asistentes</span>
                <span>📤 {rev.salidas.length} salidas</span>
              </div>
              {rev.resumenEjecutivo && <p style={{ fontSize: 12, color: '#374151', marginTop: 8, lineHeight: 1.4 }}>{rev.resumenEjecutivo.slice(0, 150)}...</p>}
            </div>
          ))}
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
            <span className={`badge badge--lg ${ESTADO_CLASS[selected.estado]}`}>{ESTADO_LABELS[selected.estado]}</span>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Fecha</span><span>{selected.fecha}</span></div>
            <div className="detail-item"><span className="detail-label">Horario</span><span>{selected.horaInicio} — {selected.horaFin || '...'}</span></div>
            <div className="detail-item"><span className="detail-label">Lugar</span><span>{selected.lugar}</span></div>
            <div className="detail-item"><span className="detail-label">Convocado por</span><span>{selected.convocadoPor}</span></div>
          </div>

          <div className="mod-tabs">
            <button className={`mod-tab ${tab === 'resumen' ? 'mod-tab--active' : ''}`} onClick={() => setTab('resumen')}>Resumen</button>
            <button className={`mod-tab ${tab === 'entradas' ? 'mod-tab--active' : ''}`} onClick={() => setTab('entradas')}>Entradas ({selected.entradas.length})</button>
            <button className={`mod-tab ${tab === 'salidas' ? 'mod-tab--active' : ''}`} onClick={() => setTab('salidas')}>Salidas ({selected.salidas.length})</button>
            <button className={`mod-tab ${tab === 'asistentes' ? 'mod-tab--active' : ''}`} onClick={() => setTab('asistentes')}>Asistentes ({selected.asistentes.length})</button>
          </div>

          {tab === 'resumen' && (
            <div className="detail-desc">
              <span className="detail-label">Resumen Ejecutivo</span>
              <p style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{selected.resumenEjecutivo || 'Pendiente de completar.'}</p>
            </div>
          )}

          {tab === 'entradas' && (
            <div>
              {selected.entradas.length > 0 ? selected.entradas.map(ent => (
                <div key={ent.id} style={{ background: '#f9fafb', border: '1px solid #e2e5ea', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{TEMA_ENTRADA_LABELS[ent.tema]}</div>
                  <p style={{ fontSize: 13, margin: '4px 0', lineHeight: 1.5 }}>{ent.resumen}</p>
                  {ent.datos && <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0', fontStyle: 'italic' }}>📊 {ent.datos}</p>}
                </div>
              )) : <div className="cell-empty" style={{ padding: 32 }}>Sin entradas registradas.</div>}
            </div>
          )}

          {tab === 'salidas' && (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead><tr><th>Tipo</th><th>Descripción</th><th>Responsable</th><th>Compromiso</th><th>Estado</th></tr></thead>
                <tbody>
                  {selected.salidas.length > 0 ? selected.salidas.map(sal => (
                    <tr key={sal.id}>
                      <td>{SALIDA_TIPO[sal.tipo]}</td>
                      <td>{sal.descripcion}</td>
                      <td>{sal.responsable}</td>
                      <td>{sal.fechaCompromiso || '—'}</td>
                      <td><span className={`badge ${SALIDA_ESTADO_CLASS[sal.estado]}`}>{sal.estado === 'en_progreso' ? 'En progreso' : sal.estado.charAt(0).toUpperCase() + sal.estado.slice(1)}</span></td>
                    </tr>
                  )) : <tr><td colSpan={5}><EmptyState icon="list" title="Sin salidas registradas" compact /></td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'asistentes' && (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead><tr><th>Nombre</th><th>Cargo</th><th>Asistencia</th></tr></thead>
                <tbody>
                  {selected.asistentes.map(ast => (
                    <tr key={ast.id}>
                      <td>{ast.nombre}</td>
                      <td>{ast.cargo}</td>
                      <td>{ast.presente ? <span className="badge badge--approved">Presente</span> : <span className="badge badge--closed">Ausente</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className="mod-form-card">
          <h3>Programar nueva revisión</h3>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>La revisión incluirá automáticamente los datos consolidados de todos los módulos como entradas (9.3.2).</p>
          <div className="form-grid">
            <label className="form-group form-group--full"><span>Título</span><input placeholder="Revisión por la Dirección — Período" /></label>
            <label className="form-group"><span>Fecha</span><input type="date" /></label>
            <label className="form-group"><span>Hora inicio</span><input type="time" defaultValue="09:00" /></label>
            <label className="form-group"><span>Hora fin</span><input type="time" defaultValue="12:00" /></label>
            <label className="form-group"><span>Lugar</span><input placeholder="Sala de juntas" /></label>
            <label className="form-group"><span>Convocado por</span><input placeholder="Director General" /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={() => setView('list')}>Programar</button>
            <button className="btn btn-secondary" onClick={() => setView('list')}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionDireccion;
