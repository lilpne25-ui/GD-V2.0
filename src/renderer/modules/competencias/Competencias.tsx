import React, { useState } from 'react';
import type { NivelCompetencia, CompetenciaEstado } from '../../../shared/types/competencias';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type EvalCompUI = { id: string; competencia: string; nivelReq: NivelCompetencia; nivelAct: NivelCompetencia | null; estado: CompetenciaEstado; fechaEval: string; fechaVenc: string; };
type PersonalUI = { id: string; nombre: string; puesto: string; depto: string; cumplimiento: number; brechas: number; evaluaciones: EvalCompUI[]; };
type CapacitacionUI = {
  id: string; codigo: string; titulo: string; tipo: 'interna' | 'externa';
  instructor: string; fecha: string; horas: number; lugar: string;
  estado: 'programada' | 'en_curso' | 'completada' | 'cancelada';
  participantes: { nombre: string; asistio: boolean; calif: number | null }[];
  eficaz: boolean | null;
};

const NIVEL_LABELS: Record<NivelCompetencia, string> = { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado', experto: 'Experto' };
const NIVEL_NUM: Record<NivelCompetencia, number> = { basico: 1, intermedio: 2, avanzado: 3, experto: 4 };
const ESTADO_COMP_CLASS: Record<CompetenciaEstado, string> = { vigente: 'badge--approved', por_vencer: 'badge--review', vencida: 'badge--nc-mayor', no_evaluada: 'badge--draft' };
const ESTADO_CAP_CLASS: Record<string, string> = { programada: 'badge--programada', en_curso: 'badge--in-progress', completada: 'badge--approved', cancelada: 'badge--closed' };

const demoPersonal: PersonalUI[] = [
  { id: 'per-1', nombre: 'Juan Carlos Martínez', puesto: 'Técnico de Calidad', depto: 'Calidad', cumplimiento: 88, brechas: 1,
    evaluaciones: [
      { id: 'ec1', competencia: 'Metrología dimensional', nivelReq: 'avanzado', nivelAct: 'avanzado', estado: 'vigente', fechaEval: '2025-11-15', fechaVenc: '2026-11-15' },
      { id: 'ec2', competencia: 'Norma ISO 9001:2015', nivelReq: 'intermedio', nivelAct: 'intermedio', estado: 'vigente', fechaEval: '2025-10-01', fechaVenc: '2026-10-01' },
      { id: 'ec3', competencia: 'Análisis estadístico (SPC)', nivelReq: 'intermedio', nivelAct: 'basico', estado: 'vigente', fechaEval: '2025-09-01', fechaVenc: '2026-09-01' },
      { id: 'ec4', competencia: 'Auditoría interna', nivelReq: 'basico', nivelAct: 'intermedio', estado: 'vigente', fechaEval: '2025-08-20', fechaVenc: '2026-08-20' },
    ] },
  { id: 'per-2', nombre: 'María Elena Torres', puesto: 'Auditor Interno', depto: 'Calidad', cumplimiento: 100, brechas: 0,
    evaluaciones: [
      { id: 'ec5', competencia: 'Norma ISO 9001:2015', nivelReq: 'avanzado', nivelAct: 'avanzado', estado: 'vigente', fechaEval: '2025-12-01', fechaVenc: '2026-12-01' },
      { id: 'ec6', competencia: 'Auditoría interna ISO 19011', nivelReq: 'avanzado', nivelAct: 'experto', estado: 'vigente', fechaEval: '2025-12-01', fechaVenc: '2026-12-01' },
      { id: 'ec7', competencia: 'Análisis de causa raíz', nivelReq: 'intermedio', nivelAct: 'avanzado', estado: 'vigente', fechaEval: '2025-11-01', fechaVenc: '2026-11-01' },
    ] },
  { id: 'per-3', nombre: 'Roberto Sánchez', puesto: 'Operador CNC', depto: 'Producción', cumplimiento: 67, brechas: 2,
    evaluaciones: [
      { id: 'ec8', competencia: 'Operación de torno CNC', nivelReq: 'avanzado', nivelAct: 'intermedio', estado: 'vigente', fechaEval: '2025-10-15', fechaVenc: '2026-10-15' },
      { id: 'ec9', competencia: 'Lectura de planos', nivelReq: 'intermedio', nivelAct: 'intermedio', estado: 'vigente', fechaEval: '2025-10-15', fechaVenc: '2026-10-15' },
      { id: 'ec10', competencia: 'Metrología básica', nivelReq: 'intermedio', nivelAct: 'basico', estado: 'por_vencer', fechaEval: '2025-04-01', fechaVenc: '2026-04-01' },
    ] },
  { id: 'per-4', nombre: 'Ana Lucía Herrera', puesto: 'Jefe de Logística', depto: 'Logística', cumplimiento: 100, brechas: 0,
    evaluaciones: [
      { id: 'ec11', competencia: 'Gestión de almacén', nivelReq: 'avanzado', nivelAct: 'experto', estado: 'vigente', fechaEval: '2025-12-01', fechaVenc: '2026-12-01' },
      { id: 'ec12', competencia: 'Norma ISO 9001:2015', nivelReq: 'basico', nivelAct: 'intermedio', estado: 'vigente', fechaEval: '2025-12-01', fechaVenc: '2026-12-01' },
    ] },
];

const demoCapacitaciones: CapacitacionUI[] = [
  { id: 'cap-1', codigo: 'CAP-2026-001', titulo: 'Formación de Auditores Internos ISO 19011:2018', tipo: 'externa', instructor: 'Bureau Veritas', fecha: '2026-02-15', horas: 24, lugar: 'Sala de capacitación', estado: 'programada', participantes: [
    { nombre: 'Juan Carlos Martínez', asistio: false, calif: null },
    { nombre: 'Roberto Sánchez', asistio: false, calif: null },
  ], eficaz: null },
  { id: 'cap-2', codigo: 'CAP-2026-002', titulo: 'Control Estadístico de Proceso (SPC)', tipo: 'interna', instructor: 'Lic. Ana Garza', fecha: '2026-03-01', horas: 8, lugar: 'Sala de juntas', estado: 'programada', participantes: [
    { nombre: 'Juan Carlos Martínez', asistio: false, calif: null },
    { nombre: 'Roberto Sánchez', asistio: false, calif: null },
  ], eficaz: null },
  { id: 'cap-3', codigo: 'CAP-2025-010', titulo: 'Metrología Dimensional Avanzada', tipo: 'externa', instructor: 'CENAM', fecha: '2025-11-10', horas: 16, lugar: 'Virtual', estado: 'completada', participantes: [
    { nombre: 'Juan Carlos Martínez', asistio: true, calif: 92 },
    { nombre: 'María Elena Torres', asistio: true, calif: 88 },
  ], eficaz: true },
  { id: 'cap-4', codigo: 'CAP-2025-011', titulo: 'Manejo de Montacargas', tipo: 'interna', instructor: 'Ing. Torres', fecha: '2025-12-05', horas: 4, lugar: 'Planta', estado: 'completada', participantes: [
    { nombre: 'Roberto Sánchez', asistio: true, calif: 85 },
    { nombre: 'Ana Lucía Herrera', asistio: true, calif: 95 },
  ], eficaz: true },
];

type View = 'matriz' | 'capacitaciones' | 'detailPer' | 'detailCap';
type SubTab = 'evaluaciones' | 'brechas';

const Competencias: React.FC = () => {
  const [personal] = useState(demoPersonal);
  const [capacitaciones] = useState(demoCapacitaciones);
  const [view, setView] = useState<View>('matriz');
  const [selectedPer, setSelPer] = useState<PersonalUI | null>(null);
  const [selectedCap, setSelCap] = useState<CapacitacionUI | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('evaluaciones');
  const [filterDepto, setFD] = useState('');

  const filteredPersonal = personal.filter(p => !filterDepto || p.depto === filterDepto);
  const deptos = [...new Set(personal.map(p => p.depto))];

  const kpis = {
    totalPersonal: personal.length,
    cumplimiento100: personal.filter(p => p.cumplimiento >= 100).length,
    conBrechas: personal.filter(p => p.brechas > 0).length,
    capProgramadas: capacitaciones.filter(c => c.estado === 'programada').length,
    capCompletadas: capacitaciones.filter(c => c.estado === 'completada').length,
  };

  const nivelBar = (req: NivelCompetencia, act: NivelCompetencia | null) => {
    const r = NIVEL_NUM[req]; const a = act ? NIVEL_NUM[act] : 0;
    const color = a >= r ? '#059669' : a >= r - 1 ? '#d97706' : '#dc2626';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${(a / 4) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 11, color }}>{act ? NIVEL_LABELS[act] : '—'}</span>
      </div>
    );
  };

  return (
    <div className="mod-competencias">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Competencias y Capacitación</h2>
          <p className="mod-subtitle">Matriz de competencias y plan de formación — ISO 9001:2015 (Cláusula 7.2, 7.3)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${view === 'capacitaciones' || view === 'detailCap' ? 'btn-secondary' : 'btn-warning'}`}
            onClick={() => setView(view === 'capacitaciones' || view === 'detailCap' ? 'matriz' : 'capacitaciones')}>
            {view === 'capacitaciones' || view === 'detailCap' ? '← Matriz' : '📚 Capacitaciones'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{kpis.totalPersonal}</span><span className="kpi-label">Personal</span></div>
        <div className="kpi-card kpi--approved"><span className="kpi-value">{kpis.cumplimiento100}</span><span className="kpi-label">100% competente</span></div>
        <div className="kpi-card kpi--danger"><span className="kpi-value">{kpis.conBrechas}</span><span className="kpi-label">Con brechas</span></div>
        <div className="kpi-card"><span className="kpi-value">{kpis.capProgramadas}</span><span className="kpi-label">Cap. programadas</span></div>
        <div className="kpi-card kpi--approved"><span className="kpi-value">{kpis.capCompletadas}</span><span className="kpi-label">Cap. realizadas</span></div>
      </div>

      {/* ====== MATRIZ DE COMPETENCIAS ====== */}
      {view === 'matriz' && (
        <>
          <div className="mod-filters">
            <select className="filter-select" aria-label="Filtrar por departamento" value={filterDepto} onChange={e => setFD(e.target.value)}>
              <option value="">Todos los departamentos</option>
              {deptos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Nombre</th><th>Puesto</th><th>Departamento</th><th>Cumplimiento</th><th>Brechas</th><th>Estado</th></tr></thead>
              <tbody>
                {filteredPersonal.map(p => (
                  <tr key={p.id} onClick={() => { setSelPer(p); setView('detailPer'); setSubTab('evaluaciones'); }}>
                    <td><strong>{p.nombre}</strong></td>
                    <td>{p.puesto}</td>
                    <td>{p.depto}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, maxWidth: 80, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${p.cumplimiento}%`, height: '100%', background: p.cumplimiento >= 100 ? '#059669' : p.cumplimiento >= 80 ? '#d97706' : '#dc2626', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{p.cumplimiento}%</span>
                      </div>
                    </td>
                    <td className="cell-center">{p.brechas > 0 ? <span className="badge badge--nc-menor">{p.brechas}</span> : <span style={{ color: '#059669' }}>✓</span>}</td>
                    <td>{p.cumplimiento >= 100 ? <span className="badge badge--approved">Competente</span> : <span className="badge badge--review">Brechas</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ====== CAPACITACIONES ====== */}
      {view === 'capacitaciones' && (
        <div className="mod-table-wrap">
          <table className="mod-table">
            <thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Fecha</th><th>Horas</th><th>Instructor</th><th>Estado</th><th>Eficaz</th></tr></thead>
            <tbody>
              {capacitaciones.map(c => (
                <tr key={c.id} onClick={() => { setSelCap(c); setView('detailCap'); }}>
                  <td className="cell-code">{c.codigo}</td>
                  <td>{c.titulo}</td>
                  <td>{c.tipo === 'interna' ? '🏠 Interna' : '🌐 Externa'}</td>
                  <td>{c.fecha}</td>
                  <td className="cell-center">{c.horas}h</td>
                  <td>{c.instructor}</td>
                  <td><span className={`badge ${ESTADO_CAP_CLASS[c.estado]}`}>{c.estado.charAt(0).toUpperCase() + c.estado.slice(1)}</span></td>
                  <td>{c.eficaz === null ? '—' : c.eficaz ? <span className="badge badge--approved">Sí</span> : <span className="badge badge--nc-mayor">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== DETALLE PERSONAL ====== */}
      {view === 'detailPer' && selectedPer && (
        <div className="mod-detail">
          <button className="btn btn-link" onClick={() => { setView('matriz'); setSelPer(null); }}>← Volver</button>
          <div className="detail-header">
            <div>
              <h3 className="detail-title">{selectedPer.nombre}</h3>
              <span style={{ color: '#6b7280', fontSize: 13 }}>{selectedPer.puesto} — {selectedPer.depto}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: selectedPer.cumplimiento >= 100 ? '#059669' : '#d97706' }}>{selectedPer.cumplimiento}%</span>
              {selectedPer.brechas > 0 && <span className="badge badge--nc-menor">{selectedPer.brechas} brechas</span>}
            </div>
          </div>

          <div className="mod-tabs">
            <button className={`mod-tab ${subTab === 'evaluaciones' ? 'mod-tab--active' : ''}`} onClick={() => setSubTab('evaluaciones')}>Evaluaciones ({selectedPer.evaluaciones.length})</button>
            <button className={`mod-tab ${subTab === 'brechas' ? 'mod-tab--active' : ''}`} onClick={() => setSubTab('brechas')}>Brechas ({selectedPer.brechas})</button>
          </div>

          {subTab === 'evaluaciones' && (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead><tr><th>Competencia</th><th>Req.</th><th>Actual</th><th>Nivel</th><th>Estado</th><th>Vencimiento</th></tr></thead>
                <tbody>
                  {selectedPer.evaluaciones.map(ev => {
                    const ok = ev.nivelAct ? NIVEL_NUM[ev.nivelAct] >= NIVEL_NUM[ev.nivelReq] : false;
                    return (
                      <tr key={ev.id}>
                        <td>{ev.competencia}</td>
                        <td>{NIVEL_LABELS[ev.nivelReq]}</td>
                        <td>{nivelBar(ev.nivelReq, ev.nivelAct)}</td>
                        <td>{ok ? <span style={{ color: '#059669' }}>✓ Cumple</span> : <span style={{ color: '#dc2626' }}>✗ Brecha</span>}</td>
                        <td><span className={`badge ${ESTADO_COMP_CLASS[ev.estado]}`}>{ev.estado.replace('_', ' ')}</span></td>
                        <td>{ev.fechaVenc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {subTab === 'brechas' && (
            <div>
              {selectedPer.evaluaciones.filter(ev => ev.nivelAct && NIVEL_NUM[ev.nivelAct] < NIVEL_NUM[ev.nivelReq]).length > 0 ? (
                selectedPer.evaluaciones.filter(ev => ev.nivelAct && NIVEL_NUM[ev.nivelAct] < NIVEL_NUM[ev.nivelReq]).map(ev => (
                  <div key={ev.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{ev.competencia}</strong>
                      <span className="badge badge--nc-menor">Brecha</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>
                      Nivel requerido: <strong>{NIVEL_LABELS[ev.nivelReq]}</strong> → Nivel actual: <strong>{ev.nivelAct ? NIVEL_LABELS[ev.nivelAct] : 'No evaluado'}</strong>
                    </p>
                    <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>Necesita capacitación para cubrir esta brecha.</p>
                  </div>
                ))
              ) : <EmptyState icon="checkCircle" title="Sin brechas de competencia" description="Todas las competencias están cubiertas." />}
            </div>
          )}
        </div>
      )}

      {/* ====== DETALLE CAPACITACIÓN ====== */}
      {view === 'detailCap' && selectedCap && (
        <div className="mod-detail">
          <button className="btn btn-link" onClick={() => { setView('capacitaciones'); setSelCap(null); }}>← Volver</button>
          <div className="detail-header">
            <div>
              <span className="detail-code">{selectedCap.codigo}</span>
              <h3 className="detail-title">{selectedCap.titulo}</h3>
            </div>
            <span className={`badge badge--lg ${ESTADO_CAP_CLASS[selectedCap.estado]}`}>{selectedCap.estado}</span>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Tipo</span><span>{selectedCap.tipo === 'interna' ? 'Interna' : 'Externa'}</span></div>
            <div className="detail-item"><span className="detail-label">Instructor</span><span>{selectedCap.instructor}</span></div>
            <div className="detail-item"><span className="detail-label">Fecha</span><span>{selectedCap.fecha}</span></div>
            <div className="detail-item"><span className="detail-label">Duración</span><span>{selectedCap.horas} horas</span></div>
            <div className="detail-item"><span className="detail-label">Lugar</span><span>{selectedCap.lugar}</span></div>
            <div className="detail-item"><span className="detail-label">Eficaz</span><span>{selectedCap.eficaz === null ? 'Pendiente' : selectedCap.eficaz ? '✓ Sí' : '✗ No'}</span></div>
          </div>

          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>Participantes</h4>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Nombre</th><th>Asistencia</th><th>Calificación</th></tr></thead>
              <tbody>
                {selectedCap.participantes.map((p, i) => (
                  <tr key={i}>
                    <td>{p.nombre}</td>
                    <td>{p.asistio ? <span className="badge badge--approved">Asistió</span> : <span className="badge badge--draft">Pendiente</span>}</td>
                    <td>{p.calif !== null ? <span style={{ fontWeight: 600 }}>{p.calif}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Competencias;
