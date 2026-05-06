import React from 'react';
import { WF_STATUS_CLASS, WF_STATUS_LABEL } from '../constants';
import type { WfCorreccion, WfDocItem } from '../types';
import EmptyState from '../../../components/EmptyState';

type WorkflowPanelProps = {
  wfFilterStatus: string;
  onFilterStatusChange: (status: string) => void;
  onRefresh: () => void;
  docs: WfDocItem[];
  selectedDoc: WfDocItem | null;
  onSelectDoc: (doc: WfDocItem) => void;
  corrections: WfCorreccion[];
  onResubmit: (wfId: string) => void;
};

const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  wfFilterStatus,
  onFilterStatusChange,
  onRefresh,
  docs,
  selectedDoc,
  onSelectDoc,
  corrections,
  onResubmit,
}) => {
  return (
    <div className="wf-layout">
      <div className="wf-list-card">
        <select
          className="filter-select wf-filter"
          value={wfFilterStatus}
          onChange={e => onFilterStatusChange(e.target.value)}
          aria-label="Filtrar por estado"
          title="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {Object.entries(WF_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <button className="btn btn-sm btn-secondary wf-refresh-btn" onClick={onRefresh}>🔄 Actualizar lista</button>

        <div className="wf-list-scroll">
          {docs.length === 0 && (
            <EmptyState icon="workflow" title="Sin documentos en el flujo" description="No tienes documentos pendientes de revisión." compact />
          )}

          {docs.map(w => (
            <button
              key={w.id}
              onClick={() => onSelectDoc(w)}
              className={`reg-list-item${selectedDoc?.id === w.id ? ' reg-list-item--active' : ''}`}
            >
              <span className="reg-list-name">{w.node_name || 'Documento'}</span>
              <span className="reg-list-meta">
                <span className={`badge badge--sm ${WF_STATUS_CLASS[w.status] || ''} wf-badge-gap`}>
                  {WF_STATUS_LABEL[w.status] || w.status}
                </span>
                {new Date(w.updated_at).toLocaleDateString('es-MX')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="wf-detail-card">
        {!selectedDoc ? (
          <div className="wf-empty wf-empty--large">
            <div className="wf-empty-icon">📄</div>
            <p className="wf-empty-text">Selecciona un documento de la lista para ver su estado y correcciones.</p>
          </div>
        ) : (
          <>
            <div className="wf-header">
              <div>
                <h3 className="wf-title">{selectedDoc.node_name || 'Documento'}</h3>
                <p className="wf-meta">
                  Enviado: {new Date(selectedDoc.created_at).toLocaleString('es-MX')} · Actualizado: {new Date(selectedDoc.updated_at).toLocaleString('es-MX')}
                </p>
              </div>
              <span className={`badge badge--lg ${WF_STATUS_CLASS[selectedDoc.status] || ''}`}>
                {WF_STATUS_LABEL[selectedDoc.status] || selectedDoc.status}
              </span>
            </div>

            {selectedDoc.status === 'correcciones' && (
              <div className="wf-status-box wf-status-box--warning">
                <strong className="wf-status-title wf-status-title--warning">⚠️ Este documento requiere correcciones</strong>
                <p className="wf-status-text wf-status-text--warning">
                  Revisa las correcciones solicitadas abajo, modifica el documento en Documentación y luego reenvíalo a revisión.
                </p>
                <button className="btn btn-primary wf-status-action" onClick={() => onResubmit(selectedDoc.id)}>
                  ✅ Reenviar a revisión
                </button>
              </div>
            )}

            {selectedDoc.status === 'aprobado' && (
              <div className="wf-status-box wf-status-box--success">
                <strong className="wf-status-title wf-status-title--success">✅ Documento aprobado</strong>
                {selectedDoc.approved_by_name && (
                  <p className="wf-status-text wf-status-text--success">
                    Aprobado por: {selectedDoc.approved_by_name}
                    {selectedDoc.approved_at ? ` · ${new Date(selectedDoc.approved_at).toLocaleString('es-MX')}` : ''}
                  </p>
                )}
              </div>
            )}

            {selectedDoc.status === 'borrador' && (
              <div className="wf-status-box wf-status-box--draft">
                <strong className="wf-status-title wf-status-title--draft">📝 Documento en borrador</strong>
                <p className="wf-status-text wf-status-text--draft">
                  Este documento aún no ha sido enviado a revisión. Ve a Documentación para enviarlo.
                </p>
              </div>
            )}

            {selectedDoc.status === 'revision' && (
              <div className="wf-status-box wf-status-box--review">
                <strong className="wf-status-title wf-status-title--review">🔍 En proceso de revisión</strong>
                <p className="wf-status-text wf-status-text--review">
                  El coordinador SGC está revisando tu documento. Recibirás una notificación cuando haya una respuesta.
                </p>
              </div>
            )}

            {corrections.length > 0 && (
              <div className="wf-corrections-wrap">
                <h4 className="wf-corrections-title">🔴 Correcciones solicitadas ({corrections.length})</h4>
                {corrections.map((c, idx) => (
                  <div key={c.id} className="wf-correction-card">
                    <div className="wf-correction-meta">
                      Corrección #{idx + 1} · Revisado por: {c.reviewer_name || '—'} · {new Date(c.created_at).toLocaleString('es-MX')}
                    </div>
                    <div className="wf-correction-grid wf-correction-grid--top">
                      <div className="wf-correction-box wf-correction-box--negative">
                        <strong className="wf-correction-box-title wf-correction-box-title--negative">❌ ¿Qué está mal?</strong>
                        <p className="wf-correction-box-text">{c.que_esta_mal}</p>
                      </div>
                      <div className="wf-correction-box wf-correction-box--negative">
                        <strong className="wf-correction-box-title wf-correction-box-title--negative">❓ ¿Por qué?</strong>
                        <p className="wf-correction-box-text">{c.por_que}</p>
                      </div>
                    </div>
                    <div className="wf-correction-grid">
                      <div className="wf-correction-box wf-correction-box--positive">
                        <strong className="wf-correction-box-title wf-correction-box-title--positive">✅ ¿Cómo corregir?</strong>
                        <p className="wf-correction-box-text">{c.como_corregir}</p>
                      </div>
                      {c.observaciones ? (
                        <div className="wf-correction-box wf-correction-box--neutral">
                          <strong className="wf-correction-box-title wf-correction-box-title--neutral">📝 Observaciones</strong>
                          <p className="wf-correction-box-text">{c.observaciones}</p>
                        </div>
                      ) : <div />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {corrections.length === 0 && (
              <EmptyState icon="checkCircle" title="Sin correcciones registradas" compact />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowPanel;
