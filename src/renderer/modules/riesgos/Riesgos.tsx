import React, { useState } from 'react';
import type { RiesgoTipo, RiesgoEstado, NivelRiesgo, NivelProbabilidad, NivelImpacto } from '../../../shared/types/riesgos';
import { calcularNivelRiesgo } from '../../../shared/types/riesgos';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type AccionUI = { id: string; descripcion: string; responsable: string; fechaCompromiso: string; estado: 'pendiente' | 'en_progreso' | 'completada'; };
type EvaluacionUI = { id: string; fecha: string; probabilidad: number; impacto: number; nivel: NivelRiesgo; observaciones: string; };
type RiesgoUI = {
  id: string; codigo: string; tipo: RiesgoTipo; titulo: string; descripcion: string;
  estado: RiesgoEstado; proceso: string; responsable: string;
  probabilidad: NivelProbabilidad; impacto: NivelImpacto; nivel: NivelRiesgo; valor: number;
  probResidual: NivelProbabilidad | null; impResidual: NivelImpacto | null; nivelResidual: NivelRiesgo | null;
  planMitigacion: string; planContingencia: string;
  oportunidad: string; beneficio: string;
  objetivos: string[];
  fechaUltEval: string; fechaProxEval: string;
  acciones: AccionUI[];
  evaluaciones: EvaluacionUI[];
};

const demoRiesgos: RiesgoUI[] = [
  { id: 'ro-1', codigo: 'RO-2026-001', tipo: 'riesgo', titulo: 'Falla en equipos de medición críticos', descripcion: 'Riesgo de que equipos de medición calibrados fallen y generen mediciones incorrectas afectando la calidad del producto.', estado: 'en_tratamiento', proceso: 'Calidad', responsable: 'Resp. Calidad', probabilidad: 3, impacto: 4, nivel: 'alto', valor: 12, probResidual: 2, impResidual: 3, nivelResidual: 'medio', planMitigacion: 'Programa de mantenimiento preventivo trimestral. Doble verificación en lotes críticos.', planContingencia: 'Equipos de respaldo disponibles. Proveedor de calibración con tiempo de respuesta < 48hrs.', oportunidad: '', beneficio: '', objetivos: ['Reducir defectos < 1%'], fechaUltEval: '2026-01-15', fechaProxEval: '2026-07-15', acciones: [{ id: 'ra1', descripcion: 'Adquirir equipo de respaldo', responsable: 'Compras', fechaCompromiso: '2026-03-01', estado: 'en_progreso' }, { id: 'ra2', descripcion: 'Implementar doble verificación', responsable: 'Calidad', fechaCompromiso: '2026-02-15', estado: 'completada' }], evaluaciones: [{ id: 'ev1', fecha: '2025-07-15', probabilidad: 4, impacto: 4, nivel: 'critico', observaciones: 'Sin controles preventivos' }, { id: 'ev2', fecha: '2026-01-15', probabilidad: 3, impacto: 4, nivel: 'alto', observaciones: 'Se implementó mantenimiento preventivo' }] },
  { id: 'ro-2', codigo: 'RO-2026-002', tipo: 'riesgo', titulo: 'Rotación de personal operativo', descripcion: 'Alta rotación en área de producción puede afectar productividad y calidad.', estado: 'identificado', proceso: 'RH', responsable: 'Resp. RH', probabilidad: 4, impacto: 3, nivel: 'alto', valor: 12, probResidual: null, impResidual: null, nivelResidual: null, planMitigacion: 'Plan de retención con bonos de permanencia y capacitación continua.', planContingencia: 'Pool de personal temporal calificado.', oportunidad: '', beneficio: '', objetivos: ['Retención > 85%'], fechaUltEval: '2026-01-20', fechaProxEval: '2026-07-20', acciones: [], evaluaciones: [] },
  { id: 'ro-3', codigo: 'RO-2026-003', tipo: 'oportunidad', titulo: 'Automatización de procesos de inspección', descripcion: 'Implementar visión artificial para inspección dimensional.', estado: 'identificado', proceso: 'Producción', responsable: 'Jefe Producción', probabilidad: 3, impacto: 5, nivel: 'alto', valor: 15, probResidual: null, impResidual: null, nivelResidual: null, planMitigacion: '', planContingencia: '', oportunidad: 'Reducir tiempo de inspección en 70% e incrementar confiabilidad.', beneficio: 'Ahorro estimado $150K/año. Reducción de rechazo de cliente.', objetivos: ['Productividad +15%','Reducir defectos < 1%'], fechaUltEval: '2026-01-25', fechaProxEval: '2026-04-25', acciones: [{ id: 'ra3', descripcion: 'Estudio de factibilidad con proveedor', responsable: 'Ing.', fechaCompromiso: '2026-03-15', estado: 'pendiente' }], evaluaciones: [] },
  { id: 'ro-4', codigo: 'RO-2026-004', tipo: 'riesgo', titulo: 'Incumplimiento de proveedor de materia prima', descripcion: 'Proveedor único de acero inoxidable puede retrasar entregas.', estado: 'en_tratamiento', proceso: 'Compras', responsable: 'Compras', probabilidad: 2, impacto: 4, nivel: 'medio', valor: 8, probResidual: 1, impResidual: 3, nivelResidual: 'bajo', planMitigacion: 'Desarrollar segundo proveedor. Mantener inventario de seguridad de 2 semanas.', planContingencia: 'Compra spot a distribuidores locales.', oportunidad: '', beneficio: '', objetivos: ['Entrega a tiempo > 95%'], fechaUltEval: '2026-02-01', fechaProxEval: '2026-08-01', acciones: [{ id: 'ra4', descripcion: 'Evaluar proveedor alterno', responsable: 'Compras', fechaCompromiso: '2026-03-30', estado: 'en_progreso' }], evaluaciones: [] },
  { id: 'ro-5', codigo: 'RO-2025-008', tipo: 'riesgo', titulo: 'Brecha de competencias en metrología', descripcion: 'Solo 2 personas certificadas en metrología avanzada.', estado: 'mitigado', proceso: 'Calidad', responsable: 'Resp. Calidad', probabilidad: 2, impacto: 2, nivel: 'bajo', valor: 4, probResidual: 1, impResidual: 2, nivelResidual: 'bajo', planMitigacion: 'Capacitar a 3 personas más. Plan de certificación anual.', planContingencia: '', oportunidad: '', beneficio: '', objetivos: ['100% personal con competencias requeridas'], fechaUltEval: '2025-12-01', fechaProxEval: '2026-06-01', acciones: [{ id: 'ra5', descripcion: 'Curso de metrología dimensional', responsable: 'RH', fechaCompromiso: '2026-01-31', estado: 'completada' }], evaluaciones: [{ id: 'ev3', fecha: '2025-06-01', probabilidad: 4, impacto: 3, nivel: 'alto', observaciones: 'Solo 1 persona certificada' }, { id: 'ev4', fecha: '2025-12-01', probabilidad: 2, impacto: 2, nivel: 'bajo', observaciones: '3 personas certificadas' }] },
];

const TIPO_LABELS: Record<RiesgoTipo, string> = { riesgo: 'Riesgo', oportunidad: 'Oportunidad' };
const ESTADO_LABELS: Record<RiesgoEstado, string> = { identificado: 'Identificado', en_tratamiento: 'En tratamiento', aceptado: 'Aceptado', mitigado: 'Mitigado', cerrado: 'Cerrado' };
const ESTADO_CLASS: Record<RiesgoEstado, string> = { identificado: 'badge--programada', en_tratamiento: 'badge--in-progress', aceptado: 'badge--review', mitigado: 'badge--approved', cerrado: 'badge--closed' };
const NIVEL_LABELS: Record<NivelRiesgo, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto', critico: 'Crítico' };
const NIVEL_CLASS: Record<NivelRiesgo, string> = { bajo: 'badge--bajo', medio: 'badge--medio', alto: 'badge--alto', critico: 'badge--critico' };

function getNivelForCell(p: number, i: number): NivelRiesgo { return calcularNivelRiesgo(p, i); }

type View = 'list' | 'detail' | 'create' | 'heatmap';

const Riesgos: React.FC = () => {
  const [riesgos, setRiesgos] = useState(demoRiesgos);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<RiesgoUI | null>(null);
  const [tab, setTab] = useState<'info' | 'planes' | 'acciones' | 'historial'>('info');
  const [filterTipo, setFilterTipo] = useState<RiesgoTipo | ''>('');
  const [filterNivel, setFilterNivel] = useState<NivelRiesgo | ''>('');
  const [form, setForm] = useState<Partial<RiesgoUI>>({});

  const filtered = riesgos.filter(r => {
    if (filterTipo && r.tipo !== filterTipo) return false;
    if (filterNivel && r.nivel !== filterNivel) return false;
    return true;
  });

  const soloRiesgos = riesgos.filter(r => r.tipo === 'riesgo');
  const kpis = {
    total: riesgos.length,
    riesgosActivos: soloRiesgos.filter(r => r.estado !== 'cerrado').length,
    criticos: soloRiesgos.filter(r => r.nivel === 'critico').length,
    altos: soloRiesgos.filter(r => r.nivel === 'alto').length,
    oportunidades: riesgos.filter(r => r.tipo === 'oportunidad').length,
  };

  const handleCreate = () => {
    const prob = (Number(form.probabilidad) || 3) as NivelProbabilidad;
    const imp = (Number(form.impacto) || 3) as NivelImpacto;
    const nivel = calcularNivelRiesgo(prob, imp);
    const newR: RiesgoUI = {
      id: 'ro-' + Date.now(), codigo: form.codigo || '', tipo: form.tipo || 'riesgo',
      titulo: form.titulo || '', descripcion: form.descripcion || '',
      estado: 'identificado', proceso: form.proceso || '', responsable: form.responsable || '',
      probabilidad: prob, impacto: imp, nivel, valor: prob * imp,
      probResidual: null, impResidual: null, nivelResidual: null,
      planMitigacion: form.planMitigacion || '', planContingencia: form.planContingencia || '',
      oportunidad: form.oportunidad || '', beneficio: form.beneficio || '',
      objetivos: [], fechaUltEval: new Date().toISOString().split('T')[0],
      fechaProxEval: form.fechaProxEval || '', acciones: [], evaluaciones: [],
    };
    setRiesgos([newR, ...riesgos]);
    setForm({});
    setView('list');
  };

  const deleteRiesgo = (id: string) => {
    setRiesgos(riesgos.filter(r => r.id !== id));
    if (selected?.id === id) { setSelected(null); setView('list'); }
  };

  // Mapa de calor data
  const heatmapData = () => {
    const grid: Record<string, RiesgoUI[]> = {};
    soloRiesgos.filter(r => r.estado !== 'cerrado').forEach(r => {
      const key = `${r.probabilidad}-${r.impacto}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(r);
    });
    return grid;
  };

  return (
    <div className="mod-riesgos">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Riesgos y Oportunidades</h2>
          <p className="mod-subtitle">Gestión por proceso — ISO 9001:2015 (Cláusula 6.1)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${view === 'heatmap' ? 'btn-secondary' : 'btn-warning'}`} onClick={() => setView(view === 'heatmap' ? 'list' : 'heatmap')}>
            {view === 'heatmap' ? '← Lista' : '🔥 Mapa de calor'}
          </button>
          <button className="btn btn-primary" onClick={() => { setForm({}); setView('create'); }}>+ Nuevo riesgo</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{kpis.total}</span><span className="kpi-label">Total</span></div>
        <div className="kpi-card kpi--open"><span className="kpi-value">{kpis.riesgosActivos}</span><span className="kpi-label">Activos</span></div>
        <div className="kpi-card kpi--danger"><span className="kpi-value">{kpis.criticos}</span><span className="kpi-label">Críticos</span></div>
        <div className="kpi-card kpi--review"><span className="kpi-value">{kpis.altos}</span><span className="kpi-label">Altos</span></div>
        <div className="kpi-card kpi--approved"><span className="kpi-value">{kpis.oportunidades}</span><span className="kpi-label">Oportunidades</span></div>
      </div>

      {/* ====== MAPA DE CALOR (2.5.2) ====== */}
      {view === 'heatmap' && (() => {
        const grid = heatmapData();
        return (
          <div style={{ background: '#fff', border: '1px solid #e2e5ea', borderRadius: 8, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Mapa de calor — Matriz de riesgos</h3>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', marginBottom: 4 }}>
                  <div style={{ width: 40 }} />
                  {[1,2,3,4,5].map(i => <div key={i} className="heatmap-axis-label" style={{ width: 70, textAlign: 'center' }}>{i}</div>)}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', marginBottom: 4 }}>→ Impacto</div>
                {[5,4,3,2,1].map(p => (
                  <div key={p} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    <div className="heatmap-label" style={{ width: 36 }}>{p}</div>
                    {[1,2,3,4,5].map(i => {
                      const key = `${p}-${i}`;
                      const items = grid[key] || [];
                      const nivel = getNivelForCell(p, i);
                      return (
                        <div key={i} className={`heatmap-cell heatmap-cell--${items.length > 0 ? nivel : 'empty'}`}
                          style={{ width: 66, height: 50 }}
                          title={items.map(r => r.titulo).join('\n') || `${p}×${i} = ${p*i}`}>
                          {items.length > 0 ? items.length : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div style={{ marginLeft: 40, fontSize: 11, color: '#6b7280' }}>↑ Probabilidad</div>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Leyenda</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(['critico', 'alto', 'medio', 'bajo'] as NivelRiesgo[]).map(n => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={`heatmap-cell heatmap-cell--${n}`} style={{ width: 20, height: 20, fontSize: 0, minHeight: 'auto' }} />
                      <span style={{ fontSize: 12 }}>{NIVEL_LABELS[n]} ({n === 'critico' ? '≥17' : n === 'alto' ? '10-16' : n === 'medio' ? '5-9' : '1-4'})</span>
                    </div>
                  ))}
                </div>
                <h4 style={{ fontSize: 13, fontWeight: 600, margin: '16px 0 8px' }}>Riesgos activos</h4>
                {soloRiesgos.filter(r => r.estado !== 'cerrado').map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4, cursor: 'pointer' }}
                    onClick={() => { setSelected(r); setView('detail'); setTab('info'); }}>
                    <span className={`badge ${NIVEL_CLASS[r.nivel]}`}>{r.valor}</span>
                    <span>{r.codigo} — {r.titulo}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {view === 'list' && (
        <>
          <div className="mod-filters">
            <select className="filter-select" aria-label="Filtrar por tipo" value={filterTipo} onChange={e => setFilterTipo(e.target.value as any)}>
              <option value="">Riesgos y Oportunidades</option>
              {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="filter-select" aria-label="Filtrar por nivel" value={filterNivel} onChange={e => setFilterNivel(e.target.value as any)}>
              <option value="">Todos los niveles</option>
              {Object.entries(NIVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>P</th><th>I</th><th>Nivel</th><th>Estado</th><th>Proceso</th><th>Acciones</th></tr></thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(r => (
                  <tr key={r.id} onClick={() => { setSelected(r); setView('detail'); setTab('info'); }}>
                    <td className="cell-code">{r.codigo}</td>
                    <td>{r.titulo}</td>
                    <td>{r.tipo === 'oportunidad' ? '🟢 Oportunidad' : '🔴 Riesgo'}</td>
                    <td className="cell-center">{r.probabilidad}</td>
                    <td className="cell-center">{r.impacto}</td>
                    <td><span className={`badge ${NIVEL_CLASS[r.nivel]}`}>{r.valor} — {NIVEL_LABELS[r.nivel]}</span></td>
                    <td><span className={`badge ${ESTADO_CLASS[r.estado]}`}>{ESTADO_LABELS[r.estado]}</span></td>
                    <td>{r.proceso}</td>
                    <td className="cell-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" title="Ver" onClick={() => { setSelected(r); setView('detail'); setTab('info'); }}>👁</button>
                      <button className="btn-icon btn-icon--danger" title="Eliminar" onClick={() => deleteRiesgo(r.id)}>🗑</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={9}><EmptyState icon="risk" title="No hay riesgos u oportunidades" description="Identifica riesgos y oportunidades del sistema." compact /></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'create' && (
        <div className="mod-form-card">
          <h3>Nuevo riesgo/oportunidad</h3>
          <div className="form-grid">
            <label className="form-group"><span>Código *</span><input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="RO-2026-XXX" /></label>
            <label className="form-group"><span>Tipo</span>
              <select value={form.tipo || 'riesgo'} onChange={e => setForm({ ...form, tipo: e.target.value as RiesgoTipo })}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="form-group form-group--full"><span>Título *</span><input value={form.titulo || ''} onChange={e => setForm({ ...form, titulo: e.target.value })} /></label>
            <label className="form-group"><span>Proceso</span><input value={form.proceso || ''} onChange={e => setForm({ ...form, proceso: e.target.value })} /></label>
            <label className="form-group"><span>Responsable</span><input value={form.responsable || ''} onChange={e => setForm({ ...form, responsable: e.target.value })} /></label>
            <label className="form-group"><span>Probabilidad (1-5)</span>
              <select value={form.probabilidad || 3} onChange={e => setForm({ ...form, probabilidad: Number(e.target.value) as NivelProbabilidad })}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="form-group"><span>Impacto (1-5)</span>
              <select value={form.impacto || 3} onChange={e => setForm({ ...form, impacto: Number(e.target.value) as NivelImpacto })}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="form-group form-group--full"><span>Descripción</span><textarea value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} /></label>
            <label className="form-group"><span>Plan de mitigación</span><textarea value={form.planMitigacion || ''} onChange={e => setForm({ ...form, planMitigacion: e.target.value })} rows={2} /></label>
            <label className="form-group"><span>Plan de contingencia</span><textarea value={form.planContingencia || ''} onChange={e => setForm({ ...form, planContingencia: e.target.value })} rows={2} /></label>
            <label className="form-group"><span>Próxima evaluación</span><input type="date" value={form.fechaProxEval || ''} onChange={e => setForm({ ...form, fechaProxEval: e.target.value })} /></label>
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
              <h3 className="detail-title">{selected.titulo}</h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className={`badge badge--lg ${NIVEL_CLASS[selected.nivel]}`}>{selected.valor} — {NIVEL_LABELS[selected.nivel]}</span>
              <span className={`badge badge--lg ${ESTADO_CLASS[selected.estado]}`}>{ESTADO_LABELS[selected.estado]}</span>
            </div>
          </div>

          <div className="mod-tabs">
            <button className={`mod-tab ${tab === 'info' ? 'mod-tab--active' : ''}`} onClick={() => setTab('info')}>Evaluación</button>
            <button className={`mod-tab ${tab === 'planes' ? 'mod-tab--active' : ''}`} onClick={() => setTab('planes')}>Planes</button>
            <button className={`mod-tab ${tab === 'acciones' ? 'mod-tab--active' : ''}`} onClick={() => setTab('acciones')}>Acciones ({selected.acciones.length})</button>
            <button className={`mod-tab ${tab === 'historial' ? 'mod-tab--active' : ''}`} onClick={() => setTab('historial')}>Historial ({selected.evaluaciones.length})</button>
          </div>

          {tab === 'info' && (
            <>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Tipo</span><span>{selected.tipo === 'oportunidad' ? '🟢 Oportunidad' : '🔴 Riesgo'}</span></div>
                <div className="detail-item"><span className="detail-label">Proceso</span><span>{selected.proceso}</span></div>
                <div className="detail-item"><span className="detail-label">Responsable</span><span>{selected.responsable}</span></div>
                <div className="detail-item"><span className="detail-label">Probabilidad</span><span style={{ fontWeight: 700, fontSize: 18 }}>{selected.probabilidad}</span></div>
                <div className="detail-item"><span className="detail-label">Impacto</span><span style={{ fontWeight: 700, fontSize: 18 }}>{selected.impacto}</span></div>
                <div className="detail-item"><span className="detail-label">Valor (P×I)</span><span className={`badge badge--lg ${NIVEL_CLASS[selected.nivel]}`}>{selected.valor}</span></div>
              </div>
              {selected.probResidual !== null && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                  <h4 style={{ fontSize: 12, color: '#059669', marginBottom: 8 }}>EVALUACIÓN RESIDUAL (post-tratamiento)</h4>
                  <div className="detail-grid">
                    <div className="detail-item"><span className="detail-label">Prob. residual</span><span>{selected.probResidual}</span></div>
                    <div className="detail-item"><span className="detail-label">Imp. residual</span><span>{selected.impResidual}</span></div>
                    <div className="detail-item"><span className="detail-label">Nivel residual</span><span className={`badge ${NIVEL_CLASS[selected.nivelResidual!]}`}>{selected.probResidual! * selected.impResidual!} — {NIVEL_LABELS[selected.nivelResidual!]}</span></div>
                  </div>
                </div>
              )}
              <div className="detail-desc"><span className="detail-label">Descripción</span><p>{selected.descripcion}</p></div>
              {selected.tipo === 'oportunidad' && selected.oportunidad && (
                <div className="info-cards">
                  <div className="info-card"><h4>Oportunidad</h4><p>{selected.oportunidad}</p></div>
                  <div className="info-card"><h4>Beneficio esperado</h4><p>{selected.beneficio}</p></div>
                </div>
              )}
              {selected.objetivos.length > 0 && (
                <div className="detail-tags" style={{ marginTop: 8 }}>
                  <span className="detail-label" style={{ marginRight: 8 }}>Objetivos vinculados:</span>
                  {selected.objetivos.map(o => <span key={o} className="tag">{o}</span>)}
                </div>
              )}
              <div className="detail-grid" style={{ marginTop: 12 }}>
                <div className="detail-item"><span className="detail-label">Últ. evaluación</span><span>{selected.fechaUltEval}</span></div>
                <div className="detail-item"><span className="detail-label">Próx. evaluación</span><span>{selected.fechaProxEval}</span></div>
              </div>
            </>
          )}

          {tab === 'planes' && (
            <div className="info-cards">
              <div className="info-card"><h4>Plan de mitigación</h4><p style={{ whiteSpace: 'pre-line' }}>{selected.planMitigacion || 'No definido.'}</p></div>
              <div className="info-card"><h4>Plan de contingencia</h4><p style={{ whiteSpace: 'pre-line' }}>{selected.planContingencia || 'No definido.'}</p></div>
            </div>
          )}

          {tab === 'acciones' && (
            <div className="mod-table-wrap">
              <table className="mod-table">
                <thead><tr><th>Acción</th><th>Responsable</th><th>Compromiso</th><th>Estado</th></tr></thead>
                <tbody>
                  {selected.acciones.length > 0 ? selected.acciones.map(a => (
                    <tr key={a.id}>
                      <td>{a.descripcion}</td>
                      <td>{a.responsable}</td>
                      <td>{a.fechaCompromiso}</td>
                      <td><span className={`badge ${a.estado === 'completada' ? 'badge--approved' : a.estado === 'en_progreso' ? 'badge--in-progress' : 'badge--draft'}`}>
                        {a.estado === 'en_progreso' ? 'En progreso' : a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}
                      </span></td>
                    </tr>
                  )) : <tr><td colSpan={4}><EmptyState icon="list" title="Sin acciones registradas" compact /></td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'historial' && (
            <div>
              {selected.evaluaciones.length > 0 ? selected.evaluaciones.map(ev => (
                <div key={ev.id} className="activity-item">
                  <span className={`badge ${NIVEL_CLASS[ev.nivel]}`} style={{ minWidth: 32, textAlign: 'center' }}>{ev.probabilidad * ev.impacto}</span>
                  <div>
                    <strong>{ev.fecha}</strong> — P:{ev.probabilidad} × I:{ev.impacto} = <strong>{ev.probabilidad * ev.impacto}</strong> ({NIVEL_LABELS[ev.nivel]})
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{ev.observaciones}</p>
                  </div>
                </div>
              )) : <div className="cell-empty" style={{ padding: 32 }}>Sin evaluaciones previas.</div>}
            </div>
          )}

          <div className="detail-actions">
            <button className="btn btn-secondary">Reevaluar</button>
            <button className="btn btn-danger" onClick={() => deleteRiesgo(selected.id)}>Eliminar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Riesgos;
