import React from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmptyState from './components/EmptyState';
import ToastProvider from './components/Toast';
import SgcIcon from './components/SgcIcon';
import { AuthProvider, useAuth, SessionUser } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import './styles/global.css';
import './components/Sidebar.css';
import './components/Dashboard.css';
import './modules/documentacion/Documentacion.css';

const Documentacion = React.lazy(() => import('./modules/documentacion/Documentacion'));
const Auditorias = React.lazy(() => import('./modules/auditorias/Auditorias'));
const NoConformidades = React.lazy(() => import('./modules/no-conformidades/NoConformidades'));
const CAPA = React.lazy(() => import('./modules/capa/CAPA'));
const Riesgos = React.lazy(() => import('./modules/riesgos/Riesgos'));
const Indicadores = React.lazy(() => import('./modules/indicadores/Indicadores'));
const Proveedores = React.lazy(() => import('./modules/proveedores/Proveedores'));
const RevisionDireccion = React.lazy(() => import('./modules/revision-direccion/RevisionDireccion'));
const Competencias = React.lazy(() => import('./modules/competencias/Competencias'));
const SatisfaccionCliente = React.lazy(() => import('./modules/satisfaccion-cliente/SatisfaccionCliente'));
const ControlCambios = React.lazy(() => import('./modules/control-cambios/ControlCambios'));
const Usuarios = React.lazy(() => import('./modules/usuarios/Usuarios'));
const Registros = React.lazy(() => import('./modules/registros/Registros'));

type NotificacionUI = {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  referencia_id: string | null;
  referencia_tipo: string | null;
  leida: number;
  created_at: string;
};

type SectionInfo = {
  title: string;
  subtitle: string;
};

const SECTION_INFO: Record<string, SectionInfo> = {
  dashboard: {
    title: 'Panel central',
    subtitle: 'Visión general del sistema y actividad reciente',
  },
  documentacion: {
    title: 'Documentación',
    subtitle: 'Control documental, workflow y trazabilidad',
  },
  auditorias: {
    title: 'Auditorías',
    subtitle: 'Seguimiento de programas, hallazgos y evidencias',
  },
  'no-conformidades': {
    title: 'No conformidades',
    subtitle: 'Registro, análisis y control de incidencias',
  },
  capa: {
    title: 'CAPA',
    subtitle: 'Acciones correctivas, preventivas y seguimiento',
  },
  riesgos: {
    title: 'Riesgos',
    subtitle: 'Evaluación, tratamiento y monitoreo de riesgo',
  },
  indicadores: {
    title: 'Indicadores',
    subtitle: 'Medición de desempeño y objetivos del sistema',
  },
  proveedores: {
    title: 'Proveedores',
    subtitle: 'Evaluación, criterios e incidencias del suministro',
  },
  'revision-direccion': {
    title: 'Revisión dirección',
    subtitle: 'Entradas, salidas y seguimiento directivo',
  },
  competencias: {
    title: 'Competencias',
    subtitle: 'Personal, evaluaciones, planes y capacitación',
  },
  satisfaccion: {
    title: 'Satisfacción cliente',
    subtitle: 'Encuestas, preguntas y gestión de quejas',
  },
  'control-cambios': {
    title: 'Control de cambios',
    subtitle: 'Solicitudes, actividades y evidencia de cambios',
  },
  usuarios: {
    title: 'Usuarios',
    subtitle: 'Administración de acceso, perfiles y permisos',
  },
  registros: {
    title: 'Registros',
    subtitle: 'Edición operativa y control de formatos asociados',
  },
};

const NOTI_ICON_MAP: Record<string, import('./components/SgcIcon').SgcIconName> = {
  workflow: 'workflow',
  correccion: 'correction',
  aprobacion: 'approve',
  email: 'email',
};

const renderSection = (section: string) => {
  switch (section) {
    case 'documentacion': return <Documentacion />;
    case 'auditorias': return <Auditorias />;
    case 'no-conformidades': return <NoConformidades />;
    case 'capa': return <CAPA />;
    case 'riesgos': return <Riesgos />;
    case 'indicadores': return <Indicadores />;
    case 'proveedores': return <Proveedores />;
    case 'revision-direccion': return <RevisionDireccion />;
    case 'competencias': return <Competencias />;
    case 'satisfaccion': return <SatisfaccionCliente />;
    case 'control-cambios': return <ControlCambios />;
    case 'usuarios': return <Usuarios />;
    case 'registros': return <Registros />;
    default: return <Dashboard />;
  }
};

const playNotificationSound = (() => {
  let ctx: AudioContext | null = null;
  return () => {
    try {
      if (!ctx) ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext may be unavailable in some environments.
    }
  };
})();

const AppContent: React.FC = () => {
  const { user, authenticated, logout } = useAuth();
  const [section, setSection] = React.useState('dashboard');
  const [notifications, setNotifications] = React.useState<NotificacionUI[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotiPanel, setShowNotiPanel] = React.useState(false);
  const notiPanelRef = React.useRef<HTMLDivElement>(null);
  const prevUnreadRef = React.useRef<number>(0);

  const effectiveUser = user!;
  const currentSection = SECTION_INFO[section] ?? SECTION_INFO.dashboard;
  const userInitials = effectiveUser?.nombre
    ? effectiveUser.nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() || '')
        .join('')
    : 'SG';


  const loadNotifications = React.useCallback(async () => {
    if (!effectiveUser?.id) return;
    try {
      const items = await (window as any).repo.call('NotificacionRepo', 'listByUser', effectiveUser.id, 30) as NotificacionUI[];
      setNotifications(items || []);
      const cnt = (await (window as any).repo.call('NotificacionRepo', 'countUnread', effectiveUser.id) as number) || 0;
      if (cnt > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        playNotificationSound();
      }
      prevUnreadRef.current = cnt;
      setUnreadCount(cnt);
    } catch {
      // Repo may not exist yet during initial migration.
    }
  }, [effectiveUser?.id]);

  React.useEffect(() => {
    void loadNotifications();
    const intervalId = setInterval(() => void loadNotifications(), 8000);
    return () => clearInterval(intervalId);
  }, [loadNotifications]);

  React.useEffect(() => {
    if (!showNotiPanel) return;
    const handler = (event: MouseEvent) => {
      if (notiPanelRef.current && !notiPanelRef.current.contains(event.target as Node)) {
        setShowNotiPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotiPanel]);

  const markNotificationRead = async (id: string) => {
    try {
      await (window as any).repo.call('NotificacionRepo', 'markRead', id);
      void loadNotifications();
    } catch {
      // Ignore transient UI errors here.
    }
  };

  const markAllRead = async () => {
    try {
      await (window as any).repo.call('NotificacionRepo', 'markAllRead', effectiveUser.id);
      void loadNotifications();
    } catch {
      // Ignore transient UI errors here.
    }
  };

  const openDocumentFromNotification = async (notification: NotificacionUI) => {
    try {
      if (notification.leida === 0) {
        await markNotificationRead(notification.id);
      }

      let nodeId: string | null = null;
      const refType = String(notification.referencia_tipo || '').trim().toLowerCase();
      const refId = String(notification.referencia_id || '').trim();

      if (refType === 'workflow' && refId) {
        const workflow = await (window as any).repo.call('WorkflowRepo', 'getById', refId) as any;
        nodeId = String(workflow?.node_id || '').trim() || null;
      } else if ((refType === 'documento' || refType === 'documento_nodo') && refId) {
        nodeId = refId;
      }

      setSection('documentacion');
      setShowNotiPanel(false);

      if (nodeId) {
        localStorage.setItem('sgc.openDocumentNodeId', nodeId);
        localStorage.setItem('sgc.openDocumentNodeAt', new Date().toISOString());
        window.dispatchEvent(new Event('storage'));
      }
    } catch {
      setSection('documentacion');
      setShowNotiPanel(false);
    }
  };

  const handleLogout = () => {
    void logout();
    setSection('dashboard');
  };

  const notiTypeIcon = (tipo: string): import('./components/SgcIcon').SgcIconName => {
    return NOTI_ICON_MAP[tipo] || 'info';
  };

  if (!authenticated) {
    return (
      <PublicOnlyRoute>
        <Login onLoginSuccess={() => {}} />
      </PublicOnlyRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
        <Sidebar active={section} onSelect={setSection} />
        <div className="app-main">
          <header className="app-topbar">
            <div className="app-context">
              <h1 className="app-context-title">{currentSection.title}</h1>
            </div>

            <div className="app-topbar-actions">
              <div className="app-user-chip" aria-label={`Sesión activa de ${effectiveUser.nombre}`}>
                <span className="app-user-avatar">{userInitials || 'SG'}</span>
                <div className="app-user-meta">
                  <strong>{effectiveUser.nombre}</strong>
                  <span>{effectiveUser.rol}</span>
                </div>
              </div>

              <div className="noti-bell-wrap" ref={notiPanelRef}>
                <button
                  type="button"
                  className="noti-bell-btn"
                  title="Notificaciones"
                  aria-label="Abrir centro de notificaciones"
                  aria-haspopup="dialog"
                  aria-expanded={showNotiPanel ? "true" : "false"}
                  onClick={() => setShowNotiPanel(prev => !prev)}
                >
                  <SgcIcon name="bell" size="md" className="noti-bell-icon" />
                  {unreadCount > 0 && <span className="noti-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </button>

                {showNotiPanel && (
                  <div className="noti-panel" role="dialog" aria-label="Centro de notificaciones">
                    <div className="noti-panel-header">
                      <div className="noti-panel-title-wrap">
                        <strong>Notificaciones</strong>
                        <span>{unreadCount > 0 ? `${unreadCount} por revisar` : 'Todo al dia'}</span>
                      </div>
                      {unreadCount > 0 && (
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => void markAllRead()}>
                          Marcar todas como leidas
                        </button>
                      )}
                    </div>
                    <div className="noti-panel-list">
                      {notifications.length === 0 ? (
                        <EmptyState icon="bell" title="Sin notificaciones" description="Estás al día." compact />
                      ) : notifications.map(notification => (
                        <button
                          key={notification.id}
                          type="button"
                          className={`noti-item ${notification.leida === 0 ? 'noti-item--unread' : ''}`}
                          onClick={() => { void openDocumentFromNotification(notification); }}
                        >
                          <span className="noti-icon">
                            <SgcIcon name={notiTypeIcon(notification.tipo)} size="md" />
                          </span>
                          <div className="noti-body">
                            <div className="noti-title">{notification.titulo}</div>
                            <div className="noti-msg">{notification.mensaje}</div>
                            <div className="noti-time">{new Date(notification.created_at).toLocaleString('es-MX')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </header>
          <div id="main-content" className="app-content" role="main">
            <React.Suspense fallback={<div style={{ padding: '12px 4px', color: '#64748b' }}>Cargando módulo...</div>}>
              {renderSection(section)}
            </React.Suspense>
          </div>
        </div>
        <ToastProvider />
      </div>
    </ProtectedRoute>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

