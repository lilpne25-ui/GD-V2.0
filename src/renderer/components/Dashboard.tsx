import React, { useCallback, useEffect, useState } from 'react';
import SgcIcon from './SgcIcon';
import type { SgcIconName } from './SgcIcon';
import EmptyState from './EmptyState';
import './Dashboard.css';

type DocumentoNodoUI = {
  id: string;
  node_type: 'folder' | 'file';
};

type UsuarioUI = {
  id: string;
  activo: number | boolean;
};

type DocumentoAuditRowUI = {
  id: string;
  event_type: 'add_document' | 'add_folder' | 'delete_node' | 'rename_node' | 'move_node';
  node_id: string | null;
  node_name: string | null;
  from_parent_name: string | null;
  to_parent_name: string | null;
  actor_user_id: string | null;
  actor_user_name: string | null;
  actor_role: string | null;
  created_at: string;
};

const toFlag01 = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric === 1 ? 1 : 0;
  const raw = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'si', 'on'].includes(raw)) return 1;
  if (['0', 'false', 'no', 'off'].includes(raw)) return 0;
  return fallback ? 1 : 0;
};

const auditActionLabel = (eventType: DocumentoAuditRowUI['event_type']): string => {
  if (eventType === 'delete_node') return 'Se eliminó';
  if (eventType === 'rename_node') return 'Se editó';
  if (eventType === 'add_document' || eventType === 'add_folder') return 'Se agregó';
  if (eventType === 'move_node') return 'Se movió';
  return eventType;
};

const auditActionTone = (eventType: DocumentoAuditRowUI['event_type']): string => {
  if (eventType === 'delete_node') return 'danger';
  if (eventType === 'move_node') return 'info';
  if (eventType === 'rename_node') return 'neutral';
  return 'success';
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [documentos, setDocumentos] = useState(0);
  const [carpetas, setCarpetas] = useState(0);
  const [pendientesRevision, setPendientesRevision] = useState(0);
  const [usuariosActivos, setUsuariosActivos] = useState(0);
  const [auditTrail, setAuditTrail] = useState<DocumentoAuditRowUI[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
<<<<<<< HEAD
      const metrics = await (window as any).dashboard.getMetrics();

      setDocumentos(Number(metrics.documentos || 0));
      setCarpetas(Number(metrics.carpetas || 0));
      setPendientesRevision(Number(metrics.pendientesRevision || 0));
      setUsuariosActivos(Number(metrics.usuariosActivos || 0));
      setAuditTrail(Array.isArray(metrics.auditTrail) ? metrics.auditTrail : []);
=======
      const [nodes, pending, users, audit] = await Promise.all([
        (window as any).repo.call('DocumentoTreeRepo', 'getAll') as Promise<DocumentoNodoUI[]>,
        (window as any).repo.call('WorkflowRepo', 'countPending') as Promise<number>,
        (window as any).repo.call('UsuarioRepo', 'getAll') as Promise<UsuarioUI[]>,
        (window as any).repo.call('DocumentoTreeRepo', 'listAuditTrail', 120) as Promise<DocumentoAuditRowUI[]>,
      ]);

      const safeNodes = Array.isArray(nodes) ? nodes : [];
      const fileCount = safeNodes.filter(node => node.node_type === 'file').length;
      const folderCount = safeNodes.filter(node => node.node_type === 'folder').length;
      const activeUsers = (Array.isArray(users) ? users : []).filter(user => toFlag01(user?.activo, 1) === 1).length;

      setDocumentos(fileCount);
      setCarpetas(folderCount);
      setPendientesRevision(Number(pending || 0));
      setUsuariosActivos(activeUsers);
      setAuditTrail(Array.isArray(audit) ? audit : []);
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
    } catch (error) {
      console.error(error);
      setLoadError('No se pudo cargar la informacion del dashboard.');
      setAuditTrail([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const kpis: Array<{ label: string; value: number; helper: string; icon: SgcIconName; color: string }> = [
    {
      label: 'Documentos',
      value: documentos,
      helper: 'Activos en control',
      icon: 'document',
      color: '#1450dc',
    },
    {
      label: 'Carpetas',
      value: carpetas,
      helper: 'Estructura disponible',
      icon: 'folder',
      color: '#0f8dcf',
    },
    {
      label: 'Pendientes',
      value: pendientesRevision,
      helper: 'En revision',
      icon: 'clock',
      color: '#c57a0a',
    },
    {
      label: 'Usuarios',
      value: usuariosActivos,
      helper: 'Cuentas activas',
      icon: 'users',
      color: '#0f8b63',
    },
  ];

  const summaryItems = [
    {
      label: 'Control documental',
      value: `${documentos} documentos y ${carpetas} carpetas disponibles en la estructura actual.`,
    },
    {
      label: 'Flujo de revision',
      value: pendientesRevision > 0
        ? `${pendientesRevision} elemento(s) requieren seguimiento inmediato.`
        : 'No hay pendientes de revisión en este momento.',
    },
    {
      label: 'Cobertura operativa',
      value: `${usuariosActivos} usuario(s) activos con acceso al sistema.`,
    },
  ];

  return (
    <main className="dash">
      <section className="dash-hero">
        <div className="dash-header">
          <span className="dash-eyebrow">Visión general</span>
          <h2 className="dash-title">Panel de control</h2>
          <p className="dash-subtitle">Seguimiento rápido del sistema, la actividad documental y la capacidad operativa.</p>
        </div>
        <div className="dash-hero-actions">
          <span className={`dash-sync-badge${loading ? ' dash-sync-badge--active' : ''}`}>
            {loading ? 'Actualizando datos' : 'Datos sincronizados'}
          </span>
          <button className="btn btn-secondary" type="button" onClick={() => void loadDashboardData()} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar panel'}
          </button>
        </div>
      </section>

      <div className="dash-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dash-card">
              <div className="dash-card-icon-wrap"><div className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%' }} /></div>
              <div className="dash-card-body">
                <span className="skeleton skeleton-text" style={{ width: '40%', height: 28 }} />
                <span className="skeleton skeleton-text" style={{ width: '60%' }} />
                <span className="skeleton skeleton-text skeleton-text--sm" style={{ width: '50%' }} />
              </div>
            </div>
          ))
        ) : (
        kpis.map(kpi => (
          <div key={kpi.label} className="dash-card">
            <div className="dash-card-icon-wrap">
              <SgcIcon name={kpi.icon} size="lg" className="dash-card-icon" color={kpi.color} />
            </div>
            <div className="dash-card-body">
              <span className="dash-card-value">{kpi.value}</span>
              <span className="dash-card-label">{kpi.label}</span>
              <span className="dash-card-helper">{kpi.helper}</span>
            </div>
          </div>
        ))
        )}
      </div>

      <div className="dash-main-grid">
        <section className="dash-section dash-section--summary">
          <div className="dash-section-head">
            <div>
              <span className="dash-section-kicker">Resumen operativo</span>
              <h3 className="dash-section-title">Estado actual</h3>
            </div>
          </div>
          <div className="dash-summary-list">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="dash-summary-item">
                  <span className="skeleton skeleton-text" style={{ width: '30%' }} />
                  <p><span className="skeleton skeleton-text" style={{ width: '80%' }} /></p>
                </div>
              ))
            ) : (
            summaryItems.map(item => (
              <div key={item.label} className="dash-summary-item">
                <span className="dash-summary-label">{item.label}</span>
                <p className="dash-summary-value">{item.value}</p>
              </div>
            ))
            )}
          </div>
        </section>

        <section className="dash-section dash-section--activity">
          <div className="dash-section-head">
            <div>
              <span className="dash-section-kicker">Trazabilidad</span>
              <h3 className="dash-section-title">Historial de documentación</h3>
            </div>
            <button className="btn btn-sm btn-secondary" type="button" onClick={() => void loadDashboardData()} disabled={loading}>
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          {loadError && <div className="dash-error">{loadError}</div>}

          <div className="dash-audit-wrap">
            <table className="mod-table dash-audit-table">
              <thead>
                <tr>
                  <th scope="col">Cuándo</th>
                  <th scope="col">Quién</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Elemento</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Destino</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}><span className="skeleton skeleton-text" style={{ width: `${55 + j * 8}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : auditTrail.length === 0 ? (
                  <tr>
                    <td colSpan={6}><EmptyState icon="clock" title="Sin eventos de trazabilidad" description="La actividad documentada aparecerá aquí automáticamente." compact /></td>
                  </tr>
                ) : (
                  auditTrail.slice(0, 80).map(row => (
                    <tr key={row.id}>
                      <td>{new Date(row.created_at).toLocaleString('es-MX')}</td>
                      <td>
                        <span className="dash-actor-name">{row.actor_user_name || row.actor_user_id || 'Sistema'}</span>
                        <small className="dash-actor-role">{row.actor_role || 'Sin rol'}</small>
                      </td>
                      <td>
                        <span className={`dash-event dash-event--${auditActionTone(row.event_type)}`}>
                          {auditActionLabel(row.event_type)}
                        </span>
                      </td>
                      <td>{row.node_name || row.node_id || 'Sin referencia'}</td>
                      <td>{row.from_parent_name || 'Sin origen'}</td>
                      <td>{row.to_parent_name || 'Sin destino'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Dashboard;
