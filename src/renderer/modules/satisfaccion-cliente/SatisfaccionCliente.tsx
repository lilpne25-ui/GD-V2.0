import React, { useState } from 'react';
import type { QuejaEstado, QuejaTipo, EncuestaEstado } from '../../../shared/types/satisfaccion-cliente';
import '../documentacion/Documentacion.css';

/* ===================== TIPOS UI ===================== */
type PreguntaUI = { id: string; texto: string; promedio: number; };
type EncuestaUI = {
  id: string; codigo: string; titulo: string; descripcion: string;
  estado: EncuestaEstado; fechaInicio: string; fechaFin: string;
  totalRespuestas: number; promedioGeneral: number; nps: number;
  preguntas: PreguntaUI[];
};
type QuejaUI = {
  id: string; codigo: string; tipo: QuejaTipo; cliente: string;
  fecha: string; descripcion: string; producto: string;
  estado: QuejaEstado; responsable: string;
  analisis: string; accion: string; fechaCierre: string;
  satisfaccionFinal: number | null;
};

const demoEncuestas: EncuestaUI[] = [
  { id: 'enc-1', codigo: 'ENC-2026-001', titulo: 'Encuesta de satisfacción Q1 2026', descripcion: 'Evaluación trimestral de satisfacción de clientes principales.', estado: 'activa', fechaInicio: '2026-01-15', fechaFin: '2026-02-28', totalRespuestas: 18, promedioGeneral: 8.8, nps: 42,
    preguntas: [
      { id: 'q1', texto: 'Calidad del producto recibido', promedio: 9.2 },
      { id: 'q2', texto: 'Cumplimiento de plazos de entrega', promedio: 8.5 },
      { id: 'q3', texto: 'Atención y respuesta a solicitudes', promedio: 8.9 },
      { id: 'q4', texto: 'Documentación y certificados', promedio: 9.1 },
      { id: 'q5', texto: 'Relación calidad-precio', promedio: 8.3 },
      { id: 'q6', texto: 'Satisfacción general', promedio: 8.8 },
    ] },
  { id: 'enc-2', codigo: 'ENC-2025-004', titulo: 'Encuesta de satisfacción Q4 2025', descripcion: 'Evaluación trimestral de cierre de año.', estado: 'cerrada', fechaInicio: '2025-10-01', fechaFin: '2025-11-30', totalRespuestas: 22, promedioGeneral: 8.1, nps: 35,
    preguntas: [
      { id: 'q7', texto: 'Calidad del producto recibido', promedio: 8.4 },
      { id: 'q8', texto: 'Cumplimiento de plazos de entrega', promedio: 7.6 },
      { id: 'q9', texto: 'Atención y respuesta a solicitudes', promedio: 8.3 },
      { id: 'q10', texto: 'Documentación y certificados', promedio: 8.5 },
      { id: 'q11', texto: 'Relación calidad-precio', promedio: 8.0 },
      { id: 'q12', texto: 'Satisfacción general', promedio: 8.1 },
    ] },
];

const demoQuejas: QuejaUI[] = [
  { id: 'qc-1', codigo: 'QC-2026-001', tipo: 'queja', cliente: 'Industrias del Norte S.A.', fecha: '2026-01-18', descripcion: 'Piezas con acabado superficial fuera de especificación en OC-5320.', producto: 'Eje de transmisión REF-450', estado: 'en_atencion', responsable: 'Resp. Calidad', analisis: 'Desgaste en herramienta de acabado no detectado en inspección en proceso.', accion: 'Se reemplazó el lote afectado. Se implementó inspección cada 50 piezas.', fechaCierre: '', satisfaccionFinal: null },
  { id: 'qc-2', codigo: 'QC-2026-002', tipo: 'reclamacion', cliente: 'AutoPartes MX', fecha: '2026-01-25', descripcion: 'Entrega parcial — faltaron 50 piezas del pedido OC-5335.', producto: 'Buje de ajuste REF-220', estado: 'cerrada', responsable: 'Logística', analisis: 'Error en conteo al momento de empacar.', accion: 'Se envió el complemento en 24 hrs. Se implementó doble conteo.', fechaCierre: '2026-01-28', satisfaccionFinal: 8 },
  { id: 'qc-3', codigo: 'QC-2025-015', tipo: 'sugerencia', cliente: 'Grupo Mecánico Central', fecha: '2025-12-10', descripcion: 'Sugieren incluir certificado de material con cada envío.', producto: 'General', estado: 'cerrada', responsable: 'Calidad', analisis: 'Actualmente se envía bajo solicitud.', accion: 'Se incorporó certificado de material como parte de la documentación estándar de envío.', fechaCierre: '2025-12-20', satisfaccionFinal: 10 },
  { id: 'qc-4', codigo: 'QC-2025-014', tipo: 'felicitacion', cliente: 'Maquinados Precisión', fecha: '2025-11-28', descripcion: 'Felicitación por la calidad del lote OC-5280 y la atención del equipo comercial.', producto: 'Flecha de precisión REF-380', estado: 'cerrada', responsable: 'Comercial', analisis: '', accion: 'Se compartió con el equipo.', fechaCierre: '2025-11-28', satisfaccionFinal: 10 },
];

const ENCUESTA_ESTADO_CLASS: Record<EncuestaEstado, string> = { borrador: 'badge--draft', activa: 'badge--approved', cerrada: 'badge--closed' };
const QUEJA_ESTADO_CLASS: Record<QuejaEstado, string> = { recibida: 'badge--draft', en_analisis: 'badge--programada', en_atencion: 'badge--in-progress', cerrada: 'badge--approved' };
const QUEJA_TIPO_ICONS: Record<QuejaTipo, string> = { queja: '⚠️', reclamacion: '🔴', sugerencia: '💡', felicitacion: '⭐' };
const QUEJA_LABELS: Record<QuejaTipo, string> = { queja: 'Queja', reclamacion: 'Reclamación', sugerencia: 'Sugerencia', felicitacion: 'Felicitación' };

type View = 'encuestas' | 'quejas' | 'detailEnc' | 'detailQueja';

const SatisfaccionCliente: React.FC = () => {
  const [encuestas] = useState(demoEncuestas);
  const [quejas] = useState(demoQuejas);
  const [view, setView] = useState<View>('encuestas');
  const [selectedEnc, setSelEnc] = useState<EncuestaUI | null>(null);
  const [selectedQueja, setSelQueja] = useState<QuejaUI | null>(null);
  const [filterTipoQ, setFTQ] = useState<QuejaTipo | ''>('');

  const kpis = {
    promedioSat: encuestas[0]?.promedioGeneral || 0,
    nps: encuestas[0]?.nps || 0,
    totalQuejas: quejas.filter(q => q.tipo === 'queja' || q.tipo === 'reclamacion').length,
    quejasAbiertas: quejas.filter(q => q.estado !== 'cerrada' && (q.tipo === 'queja' || q.tipo === 'reclamacion')).length,
  };

  const satColor = (v: number) => v >= 8.5 ? '#059669' : v >= 7 ? '#d97706' : '#dc2626';

  return (
    <div className="mod-satisfaccion">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Satisfacción del Cliente</h2>
          <p className="mod-subtitle">Encuestas, quejas y retroalimentación — ISO 9001:2015 (Cláusula 9.1.2)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${view === 'quejas' || view === 'detailQueja' ? 'btn-secondary' : 'btn-warning'}`}
            onClick={() => setView(view === 'quejas' || view === 'detailQueja' ? 'encuestas' : 'quejas')}>
            {view === 'quejas' || view === 'detailQueja' ? '📊 Encuestas' : '📝 Quejas'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mod-kpis">
        <div className="kpi-card" style={{ borderLeft: `3px solid ${satColor(kpis.promedioSat)}` }}>
          <span className="kpi-value" style={{ color: satColor(kpis.promedioSat) }}>{kpis.promedioSat}</span><span className="kpi-label">Satisfacción /10</span>
        </div>
        <div className="kpi-card"><span className="kpi-value" style={{ color: kpis.nps >= 50 ? '#059669' : kpis.nps >= 0 ? '#d97706' : '#dc2626' }}>+{kpis.nps}</span><span className="kpi-label">NPS</span></div>
        <div className="kpi-card"><span className="kpi-value">{kpis.totalQuejas}</span><span className="kpi-label">Quejas/Reclam.</span></div>
        <div className="kpi-card kpi--danger"><span className="kpi-value">{kpis.quejasAbiertas}</span><span className="kpi-label">Abiertas</span></div>
      </div>

      {/* ====== ENCUESTAS ====== */}
      {view === 'encuestas' && (
        <div>
          {encuestas.map(enc => (
            <div key={enc.id} style={{ background: '#fff', border: '1px solid #e2e5ea', borderRadius: 8, padding: 16, marginBottom: 12, cursor: 'pointer' }}
              onClick={() => { setSelEnc(enc); setView('detailEnc'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, color: '#6b7280', marginRight: 8 }}>{enc.codigo}</span>
                  <span className={`badge ${ENCUESTA_ESTADO_CLASS[enc.estado]}`}>{enc.estado}</span>
                </div>
                <span style={{ fontSize: 28, fontWeight: 700, color: satColor(enc.promedioGeneral) }}>{enc.promedioGeneral}/10</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>{enc.titulo}</h3>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                <span>{enc.fechaInicio} — {enc.fechaFin}</span>
                <span>{enc.totalRespuestas} respuestas</span>
                <span>NPS: +{enc.nps}</span>
              </div>
              {/* Mini bar chart for questions */}
              <div style={{ marginTop: 10, display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
                {enc.preguntas.map(p => (
                  <div key={p.id} title={`${p.texto}: ${p.promedio}`} style={{
                    flex: 1, height: `${(p.promedio / 10) * 100}%`, background: satColor(p.promedio),
                    borderRadius: '3px 3px 0 0', opacity: 0.8, minHeight: 8,
                  }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====== DETALLE ENCUESTA ====== */}
      {view === 'detailEnc' && selectedEnc && (
        <div className="mod-detail">
          <button className="btn btn-link" onClick={() => { setView('encuestas'); setSelEnc(null); }}>← Volver</button>
          <div className="detail-header">
            <div>
              <span className="detail-code">{selectedEnc.codigo}</span>
              <h3 className="detail-title">{selectedEnc.titulo}</h3>
            </div>
            <span style={{ fontSize: 32, fontWeight: 700, color: satColor(selectedEnc.promedioGeneral) }}>{selectedEnc.promedioGeneral}/10</span>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Estado</span><span className={`badge ${ENCUESTA_ESTADO_CLASS[selectedEnc.estado]}`}>{selectedEnc.estado}</span></div>
            <div className="detail-item"><span className="detail-label">Período</span><span>{selectedEnc.fechaInicio} — {selectedEnc.fechaFin}</span></div>
            <div className="detail-item"><span className="detail-label">Respuestas</span><span style={{ fontWeight: 700 }}>{selectedEnc.totalRespuestas}</span></div>
            <div className="detail-item"><span className="detail-label">NPS</span><span style={{ fontWeight: 700 }}>+{selectedEnc.nps}</span></div>
          </div>
          <div className="detail-desc"><span className="detail-label">Descripción</span><p>{selectedEnc.descripcion}</p></div>

          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>Resultados por pregunta</h4>
          {selectedEnc.preguntas.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, background: '#f9fafb', borderRadius: 6, padding: '8px 12px' }}>
              <span style={{ flex: 1, fontSize: 13 }}>{p.texto}</span>
              <div style={{ width: 120, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(p.promedio / 10) * 100}%`, height: '100%', background: satColor(p.promedio), borderRadius: 4 }} />
              </div>
              <span style={{ fontWeight: 700, width: 40, textAlign: 'right', color: satColor(p.promedio) }}>{p.promedio}</span>
            </div>
          ))}
        </div>
      )}

      {/* ====== QUEJAS ====== */}
      {view === 'quejas' && (
        <>
          <div className="mod-filters">
            <select className="filter-select" aria-label="Filtrar por tipo" value={filterTipoQ} onChange={e => setFTQ(e.target.value as any)}>
              <option value="">Todos los tipos</option>
              {Object.entries(QUEJA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead><tr><th>Código</th><th>Tipo</th><th>Cliente</th><th>Fecha</th><th>Descripción</th><th>Estado</th></tr></thead>
              <tbody>
                {quejas.filter(q => !filterTipoQ || q.tipo === filterTipoQ).map(q => (
                  <tr key={q.id} onClick={() => { setSelQueja(q); setView('detailQueja'); }}>
                    <td className="cell-code">{q.codigo}</td>
                    <td>{QUEJA_TIPO_ICONS[q.tipo]} {QUEJA_LABELS[q.tipo]}</td>
                    <td>{q.cliente}</td>
                    <td>{q.fecha}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.descripcion}</td>
                    <td><span className={`badge ${QUEJA_ESTADO_CLASS[q.estado]}`}>{q.estado === 'en_analisis' ? 'En análisis' : q.estado === 'en_atencion' ? 'En atención' : q.estado.charAt(0).toUpperCase() + q.estado.slice(1)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ====== DETALLE QUEJA ====== */}
      {view === 'detailQueja' && selectedQueja && (
        <div className="mod-detail">
          <button className="btn btn-link" onClick={() => { setView('quejas'); setSelQueja(null); }}>← Volver</button>
          <div className="detail-header">
            <div>
              <span className="detail-code">{selectedQueja.codigo}</span>
              <h3 className="detail-title">{QUEJA_TIPO_ICONS[selectedQueja.tipo]} {selectedQueja.descripcion}</h3>
            </div>
            <span className={`badge badge--lg ${QUEJA_ESTADO_CLASS[selectedQueja.estado]}`}>{selectedQueja.estado}</span>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Tipo</span><span>{QUEJA_LABELS[selectedQueja.tipo]}</span></div>
            <div className="detail-item"><span className="detail-label">Cliente</span><span>{selectedQueja.cliente}</span></div>
            <div className="detail-item"><span className="detail-label">Producto</span><span>{selectedQueja.producto}</span></div>
            <div className="detail-item"><span className="detail-label">Fecha</span><span>{selectedQueja.fecha}</span></div>
            <div className="detail-item"><span className="detail-label">Responsable</span><span>{selectedQueja.responsable}</span></div>
            {selectedQueja.fechaCierre && <div className="detail-item"><span className="detail-label">Cierre</span><span>{selectedQueja.fechaCierre}</span></div>}
          </div>
          <div className="info-cards">
            <div className="info-card"><h4>Análisis</h4><p>{selectedQueja.analisis || 'Pendiente.'}</p></div>
            <div className="info-card"><h4>Acción tomada</h4><p>{selectedQueja.accion || 'Pendiente.'}</p></div>
          </div>
          {selectedQueja.satisfaccionFinal !== null && (
            <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14, marginTop: 12 }}>
              <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>SATISFACCIÓN POST-ATENCIÓN:</span>
              <span style={{ fontSize: 22, fontWeight: 700, marginLeft: 12, color: satColor(selectedQueja.satisfaccionFinal) }}>{selectedQueja.satisfaccionFinal}/10</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SatisfaccionCliente;
