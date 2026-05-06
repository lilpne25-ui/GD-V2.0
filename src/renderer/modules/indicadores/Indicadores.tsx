import React, { useState } from 'react';
import type { FrecuenciaMedicion, SemaforoEstado, TendenciaIndicador } from '../../../shared/types/indicadores';
import { calcularSemaforo } from '../../../shared/types/indicadores';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type MedicionUI = { id: string; periodo: string; valor: number; meta: number; semaforo: SemaforoEstado; };
type IndicadorUI = {
  id: string; codigo: string; nombre: string; descripcion: string;
  proceso: string; responsable: string;
  formula: string; unidad: string; frecuencia: FrecuenciaMedicion;
  tendencia: TendenciaIndicador;
  meta: number; limInf: number; limSup: number; lineaBase: number;
  ultimoValor: number; semaforo: SemaforoEstado;
  objetivo: string;
  mediciones: MedicionUI[];
};
type ObjetivoUI = {
  id: string; codigo: string; descripcion: string; meta: string;
  plazo: string; responsable: string; proceso: string;
  estado: 'definido' | 'en_seguimiento' | 'cumplido' | 'no_cumplido';
  avance: number; indicadores: string[];
};

const demoIndicadores: IndicadorUI[] = [
  { id: 'ind-1', codigo: 'IND-CAL-001', nombre: 'Tasa de producto conforme', descripcion: 'Porcentaje de piezas conformes vs total producidas.', proceso: 'Producción', responsable: 'Jefe Producción', formula: '(piezas conformes / total) × 100', unidad: '%', frecuencia: 'mensual', tendencia: 'subir', meta: 99, limInf: 97, limSup: 100, lineaBase: 96.5, ultimoValor: 98.2, semaforo: 'amarillo', objetivo: 'OBJ-2026-001', mediciones: [
    { id: 'm1', periodo: '2026-01', valor: 98.2, meta: 99, semaforo: 'amarillo' },
    { id: 'm2', periodo: '2025-12', valor: 97.8, meta: 99, semaforo: 'amarillo' },
    { id: 'm3', periodo: '2025-11', valor: 99.1, meta: 99, semaforo: 'verde' },
    { id: 'm4', periodo: '2025-10', valor: 96.3, meta: 99, semaforo: 'rojo' },
    { id: 'm5', periodo: '2025-09', valor: 98.7, meta: 99, semaforo: 'amarillo' },
    { id: 'm6', periodo: '2025-08', valor: 99.5, meta: 99, semaforo: 'verde' },
  ]},
  { id: 'ind-2', codigo: 'IND-CAL-002', nombre: 'Entrega a tiempo', descripcion: 'Porcentaje de pedidos entregados en fecha comprometida.', proceso: 'Logística', responsable: 'Resp. Logística', formula: '(pedidos a tiempo / total pedidos) × 100', unidad: '%', frecuencia: 'mensual', tendencia: 'subir', meta: 95, limInf: 90, limSup: 100, lineaBase: 88, ultimoValor: 96.1, semaforo: 'verde', objetivo: 'OBJ-2026-002', mediciones: [
    { id: 'm7', periodo: '2026-01', valor: 96.1, meta: 95, semaforo: 'verde' },
    { id: 'm8', periodo: '2025-12', valor: 93.4, meta: 95, semaforo: 'amarillo' },
    { id: 'm9', periodo: '2025-11', valor: 95.2, meta: 95, semaforo: 'verde' },
  ]},
  { id: 'ind-3', codigo: 'IND-CAL-003', nombre: 'Tasa de rechazo de cliente', descripcion: 'PPM de partes rechazadas por el cliente.', proceso: 'Calidad', responsable: 'Resp. Calidad', formula: '(piezas rechazadas / total enviadas) × 1,000,000', unidad: 'ppm', frecuencia: 'mensual', tendencia: 'bajar', meta: 500, limInf: 0, limSup: 1000, lineaBase: 1200, ultimoValor: 320, semaforo: 'verde', objetivo: 'OBJ-2026-001', mediciones: [
    { id: 'm10', periodo: '2026-01', valor: 320, meta: 500, semaforo: 'verde' },
    { id: 'm11', periodo: '2025-12', valor: 780, meta: 500, semaforo: 'amarillo' },
    { id: 'm12', periodo: '2025-11', valor: 1100, meta: 500, semaforo: 'rojo' },
  ]},
  { id: 'ind-4', codigo: 'IND-SGC-001', nombre: 'Cierre de NC en plazo', descripcion: 'Porcentaje de no conformidades cerradas dentro del plazo establecido.', proceso: 'SGC', responsable: 'Resp. Calidad', formula: '(NC cerradas a tiempo / total NC) × 100', unidad: '%', frecuencia: 'trimestral', tendencia: 'subir', meta: 90, limInf: 80, limSup: 100, lineaBase: 72, ultimoValor: 85, semaforo: 'amarillo', objetivo: 'OBJ-2026-003', mediciones: [
    { id: 'm13', periodo: '2026-Q1', valor: 85, meta: 90, semaforo: 'amarillo' },
    { id: 'm14', periodo: '2025-Q4', valor: 78, meta: 90, semaforo: 'rojo' },
  ]},
  { id: 'ind-5', codigo: 'IND-RH-001', nombre: 'Cumplimiento plan capacitación', descripcion: 'Capacitaciones realizadas vs programadas.', proceso: 'RH', responsable: 'Resp. RH', formula: '(cap. realizadas / cap. programadas) × 100', unidad: '%', frecuencia: 'semestral', tendencia: 'subir', meta: 95, limInf: 85, limSup: 100, lineaBase: 80, ultimoValor: 92, semaforo: 'amarillo', objetivo: 'OBJ-2026-004', mediciones: [
    { id: 'm15', periodo: '2026-S1', valor: 92, meta: 95, semaforo: 'amarillo' },
    { id: 'm16', periodo: '2025-S2', valor: 88, meta: 95, semaforo: 'amarillo' },
  ]},
  { id: 'ind-6', codigo: 'IND-SAT-001', nombre: 'Satisfacción del cliente', descripcion: 'Promedio de encuestas de satisfacción.', proceso: 'Comercial', responsable: 'Resp. Comercial', formula: 'Promedio calificaciones encuesta', unidad: '/10', frecuencia: 'trimestral', tendencia: 'subir', meta: 8.5, limInf: 7, limSup: 10, lineaBase: 7.2, ultimoValor: 8.8, semaforo: 'verde', objetivo: 'OBJ-2026-005', mediciones: [
    { id: 'm17', periodo: '2026-Q1', valor: 8.8, meta: 8.5, semaforo: 'verde' },
    { id: 'm18', periodo: '2025-Q4', valor: 8.1, meta: 8.5, semaforo: 'amarillo' },
  ]},
];

const demoObjetivos: ObjetivoUI[] = [
  { id: 'obj-1', codigo: 'OBJ-2026-001', descripcion: 'Reducir defectos de producto a menos de 1% y rechazo de cliente < 500 ppm', meta: '< 1% defectos, < 500 ppm rechazo', plazo: '2026-12-31', responsable: 'Resp. Calidad', proceso: 'Calidad', estado: 'en_seguimiento', avance: 65, indicadores: ['IND-CAL-001', 'IND-CAL-003'] },
  { id: 'obj-2', codigo: 'OBJ-2026-002', descripcion: 'Entregar 95% de pedidos a tiempo', meta: '≥ 95%', plazo: '2026-12-31', responsable: 'Resp. Logística', proceso: 'Logística', estado: 'cumplido', avance: 100, indicadores: ['IND-CAL-002'] },
  { id: 'obj-3', codigo: 'OBJ-2026-003', descripcion: 'Cerrar el 90% de NC dentro del plazo', meta: '≥ 90%', plazo: '2026-12-31', responsable: 'Resp. Calidad', proceso: 'SGC', estado: 'en_seguimiento', avance: 50, indicadores: ['IND-SGC-001'] },
  { id: 'obj-4', codigo: 'OBJ-2026-004', descripcion: 'Cumplir 95% del plan de capacitación', meta: '≥ 95%', plazo: '2026-12-31', responsable: 'Resp. RH', proceso: 'RH', estado: 'en_seguimiento', avance: 40, indicadores: ['IND-RH-001'] },
  { id: 'obj-5', codigo: 'OBJ-2026-005', descripcion: 'Alcanzar satisfacción del cliente ≥ 8.5/10', meta: '≥ 8.5', plazo: '2026-12-31', responsable: 'Resp. Comercial', proceso: 'Comercial', estado: 'cumplido', avance: 100, indicadores: ['IND-SAT-001'] },
];

const SEMAFORO_COLORS: Record<SemaforoEstado, string> = { verde: '#059669', amarillo: '#d97706', rojo: '#dc2626' };
const SEMAFORO_BG: Record<SemaforoEstado, string> = { verde: '#ecfdf5', amarillo: '#fffbeb', rojo: '#fef2f2' };
const FREQ_LABELS: Record<FrecuenciaMedicion, string> = { diario: 'Diario', semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
const OBJ_ESTADO_CLASS: Record<string, string> = { definido: 'badge--draft', en_seguimiento: 'badge--in-progress', cumplido: 'badge--approved', no_cumplido: 'badge--nc-mayor' };

type View = 'dashboard' | 'lista' | 'detail' | 'objetivos' | 'create';

const Indicadores: React.FC = () => {
  const [indicadores] = useState(demoIndicadores);
  const [objetivos] = useState(demoObjetivos);
  const [view, setView] = useState<View>('dashboard');
  const [selected, setSelected] = useState<IndicadorUI | null>(null);
  const [filterSemaforo, setFS] = useState<SemaforoEstado | ''>('');

  const filtered = indicadores.filter(i => !filterSemaforo || i.semaforo === filterSemaforo);
  const kpis = {
    total: indicadores.length,
    verde: indicadores.filter(i => i.semaforo === 'verde').length,
    amarillo: indicadores.filter(i => i.semaforo === 'amarillo').length,
    rojo: indicadores.filter(i => i.semaforo === 'rojo').length,
  };

  /* Mini-bar chart inline */
  const MiniChart: React.FC<{ data: MedicionUI[]; meta: number; max: number }> = ({ data, meta, max }) => {
    const pts = [...data].reverse();
    const chartH = 60;
    const barW = 22;
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: chartH, borderBottom: '1px solid #e5e7eb', position: 'relative', paddingBottom: 2 }}>
        {/* meta line */}
        <div style={{ position: 'absolute', bottom: (meta / max) * chartH, left: 0, right: 0, height: 1, borderTop: '2px dashed #6366f1', zIndex: 1 }} />
        {pts.map(p => {
          const h = Math.max(4, (p.valor / max) * chartH);
          return (
            <div key={p.id} title={`${p.periodo}: ${p.valor}`} style={{
              width: barW, height: h, borderRadius: '3px 3px 0 0',
              background: SEMAFORO_COLORS[p.semaforo], opacity: 0.85,
            }} />
          );
        })}
      </div>
    );
  };

  return (
    <div className="mod-indicadores">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Indicadores y Objetivos de Calidad</h2>
          <p className="mod-subtitle">Seguimiento del desempeño — ISO 9001:2015 (Cláusula 6.2, 9.1)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${view === 'objetivos' ? 'btn-secondary' : 'btn-warning'}`} onClick={() => setView(view === 'objetivos' ? 'dashboard' : 'objetivos')}>
            {view === 'objetivos' ? '← Dashboard' : '🎯 Objetivos'}
          </button>
          <button className={`btn ${view === 'lista' ? 'btn-secondary' : 'btn-outline'}`} onClick={() => setView(view === 'lista' ? 'dashboard' : 'lista')}>
            {view === 'lista' ? '📊 Dashboard' : '📋 Lista'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{kpis.total}</span><span className="kpi-label">Indicadores</span></div>
        <div className="kpi-card" style={{ borderLeft: `3px solid ${SEMAFORO_COLORS.verde}` }}><span className="kpi-value" style={{ color: SEMAFORO_COLORS.verde }}>{kpis.verde}</span><span className="kpi-label">En meta</span></div>
        <div className="kpi-card" style={{ borderLeft: `3px solid ${SEMAFORO_COLORS.amarillo}` }}><span className="kpi-value" style={{ color: SEMAFORO_COLORS.amarillo }}>{kpis.amarillo}</span><span className="kpi-label">Cerca</span></div>
        <div className="kpi-card" style={{ borderLeft: `3px solid ${SEMAFORO_COLORS.rojo}` }}><span className="kpi-value" style={{ color: SEMAFORO_COLORS.rojo }}>{kpis.rojo}</span><span className="kpi-label">Fuera</span></div>
      </div>

      {/* ====== DASHBOARD (tarjetas con gráfico) ====== */}
      {view === 'dashboard' && (
        <div className="info-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {indicadores.map(ind => {
            const maxVal = Math.max(ind.meta * 1.3, ...ind.mediciones.map(m => m.valor));
            return (
              <div key={ind.id} className="info-card" style={{ cursor: 'pointer', borderLeft: `4px solid ${SEMAFORO_COLORS[ind.semaforo]}` }}
                onClick={() => { setSelected(ind); setView('detail'); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{ind.codigo}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: SEMAFORO_BG[ind.semaforo], color: SEMAFORO_COLORS[ind.semaforo], fontWeight: 600 }}>
                    {ind.semaforo === 'verde' ? '✓ En meta' : ind.semaforo === 'amarillo' ? '⚠ Cerca' : '✗ Fuera'}
                  </span>
                </div>
                <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>{ind.nombre}</h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: SEMAFORO_COLORS[ind.semaforo] }}>{ind.ultimoValor}</span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{ind.unidad} / meta: {ind.meta}</span>
                </div>
                <MiniChart data={ind.mediciones} meta={ind.meta} max={maxVal} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                  {[...ind.mediciones].reverse().map(m => <span key={m.id}>{m.periodo.slice(-3)}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== LISTA ====== */}
      {view === 'lista' && (
        <>
          <div className="mod-filters">
            <select className="filter-select" aria-label="Filtrar por semáforo" value={filterSemaforo} onChange={e => setFS(e.target.value as any)}>
              <option value="">Todos los semáforos</option>
              <option value="verde">🟢 Verde</option>
              <option value="amarillo">🟡 Amarillo</option>
              <option value="rojo">🔴 Rojo</option>
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Código</th><th>Indicador</th><th>Proceso</th><th>Valor</th><th>Meta</th><th>Semáforo</th><th>Frecuencia</th></tr></thead>
              <tbody>
                {filtered.map(ind => (
                  <tr key={ind.id} onClick={() => { setSelected(ind); setView('detail'); }}>
                    <td className="cell-code">{ind.codigo}</td>
                    <td>{ind.nombre}</td>
                    <td>{ind.proceso}</td>
                    <td style={{ fontWeight: 700 }}>{ind.ultimoValor} {ind.unidad}</td>
                    <td>{ind.meta} {ind.unidad}</td>
                    <td>
                      <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: SEMAFORO_COLORS[ind.semaforo], verticalAlign: 'middle' }} />
                      <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{ind.semaforo}</span>
                    </td>
                    <td>{FREQ_LABELS[ind.frecuencia]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ====== OBJETIVOS ====== */}
      {view === 'objetivos' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Objetivos de Calidad {new Date().getFullYear()}</h3>
          {objetivos.map(obj => (
            <div key={obj.id} style={{ background: '#fff', border: '1px solid #e2e5ea', borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#6b7280', marginRight: 8 }}>{obj.codigo}</span>
                  <span className={`badge ${OBJ_ESTADO_CLASS[obj.estado]}`}>{obj.estado.replace('_', ' ')}</span>
                </div>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Plazo: {obj.plazo}</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: '4px 0' }}>{obj.descripcion}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0' }}>Meta: {obj.meta} | Responsable: {obj.responsable} | Proceso: {obj.proceso}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${obj.avance}%`, height: '100%', background: obj.avance >= 100 ? '#059669' : '#3b82f6', borderRadius: 4, transition: 'width .3s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{obj.avance}%</span>
              </div>
              {obj.indicadores.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {obj.indicadores.map(ic => <span key={ic} className="tag" style={{ fontSize: 10 }}>{ic}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ====== DETALLE ====== */}
      {view === 'detail' && selected && (
        <div className="mod-detail">
          <button className="btn btn-link" onClick={() => { setView('dashboard'); setSelected(null); }}>← Volver</button>
          <div className="detail-header">
            <div>
              <span className="detail-code">{selected.codigo}</span>
              <h3 className="detail-title">{selected.nombre}</h3>
            </div>
            <span style={{ fontSize: 32, width: 40, height: 40, borderRadius: '50%', background: SEMAFORO_BG[selected.semaforo], color: SEMAFORO_COLORS[selected.semaforo], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>●</span>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Proceso</span><span>{selected.proceso}</span></div>
            <div className="detail-item"><span className="detail-label">Responsable</span><span>{selected.responsable}</span></div>
            <div className="detail-item"><span className="detail-label">Frecuencia</span><span>{FREQ_LABELS[selected.frecuencia]}</span></div>
            <div className="detail-item"><span className="detail-label">Tendencia</span><span>{selected.tendencia === 'subir' ? '↑ Mayor es mejor' : selected.tendencia === 'bajar' ? '↓ Menor es mejor' : '↔ Mantener'}</span></div>
            <div className="detail-item"><span className="detail-label">Meta</span><span style={{ fontWeight: 700 }}>{selected.meta} {selected.unidad}</span></div>
            <div className="detail-item"><span className="detail-label">Último valor</span><span style={{ fontWeight: 700, fontSize: 18, color: SEMAFORO_COLORS[selected.semaforo] }}>{selected.ultimoValor} {selected.unidad}</span></div>
          </div>
          <div className="detail-desc"><span className="detail-label">Fórmula</span><p style={{ fontFamily: 'monospace', background: '#f9fafb', padding: 8, borderRadius: 4 }}>{selected.formula}</p></div>
          <div className="detail-desc"><span className="detail-label">Descripción</span><p>{selected.descripcion}</p></div>

          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>Historial de mediciones</h4>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Período</th><th>Valor</th><th>Meta</th><th>Semáforo</th></tr></thead>
              <tbody>
                {selected.mediciones.map(m => (
                  <tr key={m.id}>
                    <td>{m.periodo}</td>
                    <td style={{ fontWeight: 700 }}>{m.valor} {selected.unidad}</td>
                    <td>{m.meta} {selected.unidad}</td>
                    <td>
                      <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: SEMAFORO_COLORS[m.semaforo] }} />
                      <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{m.semaforo}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="detail-grid" style={{ marginTop: 12 }}>
            <div className="detail-item"><span className="detail-label">Línea base</span><span>{selected.lineaBase} {selected.unidad}</span></div>
            <div className="detail-item"><span className="detail-label">Lím. inferior</span><span>{selected.limInf} {selected.unidad}</span></div>
            <div className="detail-item"><span className="detail-label">Lím. superior</span><span>{selected.limSup} {selected.unidad}</span></div>
            <div className="detail-item"><span className="detail-label">Objetivo vinculado</span><span className="tag">{selected.objetivo}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Indicadores;
