import React, { useEffect, useMemo, useState } from 'react';
import type { RolUsuario } from '../../../shared/types/common';
import { toast, confirm } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import '../documentacion/Documentacion.css';

type UsuarioUI = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento: string;
  activo: number;
  password: string;
};

type EmailPermUI = {
  can_send_email: number;
  can_receive_email: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_secure: number;
  imap_host: string;
  imap_port: number;
  imap_secure: number;
  pop_host: string;
  pop_port: number;
  pop_secure: number;
};

type ViewMode = 'list' | 'create' | 'edit';

type DocumentoPermisosUI = {
  can_add_documents: number;
  can_delete_documents: number;
  can_rename_documents: number;
  can_move_documents: number;
  can_sign_documents: number;
};

type UsersIconName =
  | 'plus'
  | 'refresh'
  | 'eye'
  | 'eyeOff'
  | 'info'
  | 'lock'
  | 'mail'
  | 'send'
  | 'receive'
  | 'plug';

const PUESTO_NOMBRE_CATALOG: Array<{ puesto: RolUsuario; nombre: string }> = [
  { puesto: '1 DIRECTOR', nombre: 'FERNANDO GABRIEL MORENO JUAREZ' },
  { puesto: '1.1 RECURSOS HUMANOS', nombre: 'RODRIGUEZ PINACHO BRENDA' },
  { puesto: '2 GERENTE DE VENTAS', nombre: 'MONDRAGON AYALA JOSE BERTIN' },
  { puesto: '2.1 INGENIERO DE VENTAS', nombre: 'TRUJILLO CONTRERAS MARCO ANTONIO' },
  { puesto: '2.2 SOPORTE TÉCNICO', nombre: 'VALDES VALDES AGUSTIN' },
  { puesto: '3 COORDINADOR DE INGENIERIA DE PRODUCTO', nombre: 'JIMENEZ INES JOSE JUAN' },
  { puesto: '3.1 INGENIERO DE PRODUCTO', nombre: 'ALMAZAN TORRES EDGAR' },
  { puesto: '3.1 INGENIERO DE PRODUCTO', nombre: 'GOMEZ MEDINA JOSE MANUEL' },
  { puesto: '3.1 INGENIERO DE PRODUCTO', nombre: 'DE JESUS ESTRADA ALEJANDRO' },
  { puesto: '4 COORDINADOR DE INGENIERIA DE MANUFACTURA Y SISTEMAS', nombre: 'AGAPITO DE LA CRUZ LUIS ANTONIO' },
  { puesto: '4.1 INGENIERO DE MANUFACTURA', nombre: 'RAMOS MUNGUIA JESUS' },
  { puesto: '4.1 INGENIERO DE MANUFACTURA', nombre: 'HERNANDEZ VALLE CIRO JESUS' },
  { puesto: '4.1 INGENIERO DE MANUFACTURA', nombre: 'TORRES HERNANDEZ CARLOS' },
  { puesto: '4.2 INGENIERO INDUSTRIAL', nombre: 'ESQUIVEL CRUZ ROBERTO' },
  { puesto: '4.2.2 INGENIERO DE HERRAMIENTAS', nombre: 'GARCÍA SANTIAGO DANIELA' },
  { puesto: '4.3 TÉCNICO TI', nombre: 'VALDES REYES LUDWING MAXIMILIANO' },
  { puesto: '5 COORDINADOR DE MECANIZADO', nombre: 'ALEJO LUGARDO ROBERTO CARLOS' },
  { puesto: '5.1 OPERADOR', nombre: 'AGUILAR SANCHEZ MARTHA' },
  { puesto: '5.1 OPERADOR', nombre: 'GARCIA GONZALEZ JORGE' },
  { puesto: '5.1 OPERADOR', nombre: 'GODINEZ ROMERO ERIK ALAN' },
  { puesto: '5.1 OPERADOR', nombre: 'ASIAIN HERNANDEZ EDWIN ALEJANDRO' },
  { puesto: '5.1 OPERADOR', nombre: 'CASTILLO ACOSTA JOSE SERAFIN' },
  { puesto: '5.1 OPERADOR', nombre: 'ESTRADA MARIN JAVIER' },
  { puesto: '5.1 OPERADOR', nombre: 'SANCHEZ RAMIREZ EDUARDO ALEJANDRO' },
  { puesto: '5.1 OPERADOR', nombre: 'GOMEZ FLORES ODIN RAYMUNDO' },
  { puesto: '5.1 OPERADOR', nombre: 'DOTOR INIESTRA MACARIO' },
  { puesto: '5.1 OPERADOR', nombre: 'ROMAN ALMAZAN CARLOS' },
  { puesto: '5.1 OPERADOR', nombre: 'CORONA DOLORES OSCAR DAVID' },
  { puesto: '5.1 OPERADOR', nombre: 'ORTEGA GOMEZ DIONISO DITIRAM' },
  { puesto: '5.1 OPERADOR', nombre: 'CAMPOS SILVA JESUS EVODIO' },
  { puesto: '5.1 OPERADOR', nombre: 'LOPEZ SANCHEZ MARITZA' },
  { puesto: '6 COORDINADOR DE ENSAMBLE', nombre: 'FLORES ESCOBAR PEDRO' },
  { puesto: '6.1 ENSAMBLADOR', nombre: 'BETANZOS DE ANDA HANNIA' },
  { puesto: '6.2 AUXILIAR ENSAMBLADOR', nombre: 'DURAN GARCIA JAZMIN' },
  { puesto: '7 COORDINADOR DE LOGISTICA', nombre: 'CARDENAS ROMERO RICARDO ALONSO' },
  { puesto: '7.1 AUXILIAR DE LOGISTICA', nombre: 'GOMEZ GUILLERMO GUSTAVO' },
  { puesto: '8 COORDINADOR DEL SGC', nombre: 'VILLADA ESCOBAR SELENA' },
  { puesto: '8.1 METRÓLOGO', nombre: 'ZEPEDA SILVESTRE CARLOS' },
  { puesto: '8.2 AUDITOR DE CALIDAD', nombre: 'CAMPOS SILVA LUIS ENRIQUE' },
  { puesto: '8.3 TÉCNICO DE CALIBRACIÓN', nombre: 'CARDENAS MARTINEZ RICARDO' },
  { puesto: '9 COORDINADOR DE MECATRONICA Y MANTENIMIENTO', nombre: 'GIL SALINAS CHRISTOPHER' },
  { puesto: '9.1 INGENIERO MECATRONICO', nombre: 'CALDERON VILCHIS EDUARDO' },
  { puesto: '9.2 TÉCNICO DE MANTENIMIENTO', nombre: 'XINGU GUTIERREZ SALVADOR' },
  { puesto: '9.2 TÉCNICO DE MANTENIMIENTO', nombre: 'REYES LOPEZ DIEGO' },
];

const PUESTO_OPTIONS: RolUsuario[] = Array.from(new Set(PUESTO_NOMBRE_CATALOG.map(item => item.puesto)));
const NOMBRE_OPTIONS: string[] = PUESTO_NOMBRE_CATALOG.map(item => item.nombre);

function toFlag01(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const n = Number(value);
  if (Number.isFinite(n)) return n === 1 ? 1 : 0;
  const raw = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'si', 'sí', 'on'].includes(raw)) return 1;
  if (['0', 'false', 'no', 'off'].includes(raw)) return 0;
  return fallback ? 1 : 0;
}

function getDefaultForm(): Omit<UsuarioUI, 'id'> & EmailPermUI {
  return {
    nombre: PUESTO_NOMBRE_CATALOG[0]?.nombre || '',
    email: '',
    rol: PUESTO_NOMBRE_CATALOG[0]?.puesto || '',
    departamento: '',
    activo: 1,
    password: '123456',
    can_send_email: 0,
    can_receive_email: 1,
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_secure: 1,
    imap_host: '',
    imap_port: 993,
    imap_secure: 1,
    pop_host: '',
    pop_port: 995,
    pop_secure: 1,
  };
}

const emptyForm: Omit<UsuarioUI, 'id'> & EmailPermUI = getDefaultForm();

const USERS_ICON_PATHS: Record<UsersIconName, string> = {
  plus: 'M12 5v14M5 12h14',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.88 5.09A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-4.09 5.38M6.7 6.7C3.75 8.3 2 12 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.64-.32',
  info: 'M12 8h.01M11 12h1v4h1',
  lock: 'M8 11V7a4 4 0 1 1 8 0v4M6 11h12v10H6z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  send: 'M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z',
  receive: 'M12 3v12m0 0-4-4m4 4 4-4M5 19h14',
  plug: 'M7 6v6m10-6v6M5 12h14M12 12v9',
};

const UsersIcon: React.FC<{ name: UsersIconName; className?: string }> = ({ name, className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={USERS_ICON_PATHS[name]} />
  </svg>
);

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioUI[]>([]);
  const [selected, setSelected] = useState<UsuarioUI | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [form, setForm] = useState<Omit<UsuarioUI, 'id'> & EmailPermUI>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [passwordDialogUser, setPasswordDialogUser] = useState<UsuarioUI | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [documentPerms, setDocumentPerms] = useState<DocumentoPermisosUI | null>(null);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  const nombreToPuesto = useMemo(() => {
    const map = new Map<string, RolUsuario>();
    PUESTO_NOMBRE_CATALOG.forEach(item => {
      if (!map.has(item.nombre)) map.set(item.nombre, item.puesto);
    });
    return map;
  }, []);

  const puestoToNombres = useMemo(() => {
    const map = new Map<RolUsuario, string[]>();
    PUESTO_NOMBRE_CATALOG.forEach(item => {
      const current = map.get(item.puesto) || [];
      current.push(item.nombre);
      map.set(item.puesto, current);
    });
    return map;
  }, []);

  const loadUsuarios = async (preferredUserId?: string) => {
    setLoading(true);
    setError('');
    try {
      const rows = await (window as any).repo.call('UsuarioRepo', 'getAll') as UsuarioUI[];
      setUsuarios(rows);

      const targetId = preferredUserId || selected?.id;
      if (targetId) {
        const found = rows.find(u => u.id === targetId) || null;
        setSelected(found);
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsuarios();
  }, []);

  useEffect(() => {
    if (!selected) {
      setDocumentPerms(null);
      return;
    }

    let cancelled = false;
    setLoadingPerms(true);

    void (async () => {
      try {
        const perms = await (window as any).repo.call('UsuarioRepo', 'getDocumentPermissions', selected.id) as {
          can_add_documents: number;
          can_delete_documents: number;
          can_rename_documents: number;
          can_move_documents: number;
          can_sign_documents: number;
        };
        if (!cancelled) {
          setDocumentPerms({
            can_add_documents: Number(perms?.can_add_documents || 0),
            can_delete_documents: Number(perms?.can_delete_documents || 0),
            can_rename_documents: Number(perms?.can_rename_documents || 0),
            can_move_documents: Number(perms?.can_move_documents || 0),
            can_sign_documents: Number(perms?.can_sign_documents || 0),
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setDocumentPerms({
            can_add_documents: 1,
            can_delete_documents: 0,
            can_rename_documents: 0,
            can_move_documents: 0,
            can_sign_documents: 0,
          });
        }
      } finally {
        if (!cancelled) setLoadingPerms(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const kpis = useMemo(() => ({
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo === 1).length,
    admins: usuarios.filter(u => u.rol === 'administrador').length,
    soloLectura: usuarios.filter(u => u.rol === 'solo_lectura').length,
  }), [usuarios]);

  const startCreate = () => {
    setForm(getDefaultForm());
    setView('create');
  };

  const startEdit = async (user: UsuarioUI) => {
    let emailPerm: EmailPermUI = { can_send_email: 0, can_receive_email: 1, smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '', smtp_from: '', smtp_secure: 1, imap_host: '', imap_port: 993, imap_secure: 1, pop_host: '', pop_port: 995, pop_secure: 1 };
    try {
      const perm = await (window as any).repo.call('UsuarioRepo', 'getEmailPermission', user.id) as any;
      emailPerm.can_send_email = toFlag01(perm?.can_send_email, 0);
      emailPerm.can_receive_email = toFlag01(perm?.can_receive_email, 1);
    } catch { /* ignore */ }
    try {
      const cfg = await (window as any).repo.call('CorreoRepo', 'getConfig', user.id) as any;
      if (cfg) {
        emailPerm.smtp_host = cfg.smtp_host || '';
        emailPerm.smtp_port = cfg.smtp_port || 465;
        emailPerm.smtp_user = cfg.smtp_user || '';
        emailPerm.smtp_pass = cfg.smtp_pass || '';
        emailPerm.smtp_from = cfg.smtp_from || '';
        emailPerm.smtp_secure = toFlag01(cfg.smtp_secure, 1);
        emailPerm.imap_host = cfg.imap_host || '';
        emailPerm.imap_port = cfg.imap_port || 993;
        emailPerm.imap_secure = toFlag01(cfg.imap_secure, 1);
        emailPerm.pop_host = cfg.pop_host || '';
        emailPerm.pop_port = cfg.pop_port || 995;
        emailPerm.pop_secure = toFlag01(cfg.pop_secure, 1);
        emailPerm.can_send_email = toFlag01(cfg.can_send_email ?? emailPerm.can_send_email, emailPerm.can_send_email);
        emailPerm.can_receive_email = toFlag01(cfg.can_receive_email ?? emailPerm.can_receive_email, emailPerm.can_receive_email);
      }
    } catch { /* ignore */ }
    setSmtpTestResult(null);
    setForm({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      departamento: user.departamento,
      activo: user.activo,
      password: user.password,
      ...emailPerm,
    });
    setSelected(user);
    setView('edit');
  };

  const saveForm = async () => {
    try {
      const smtpData = {
        smtpHost: form.smtp_host,
        smtpPort: form.smtp_port,
        smtpUser: form.smtp_user,
        smtpPass: form.smtp_pass,
        smtpFrom: form.smtp_from,
        smtpSecure: form.smtp_secure,
        imapHost: form.imap_host,
        imapPort: form.imap_port,
        imapSecure: form.imap_secure,
        popHost: form.pop_host,
        popPort: form.pop_port,
        popSecure: form.pop_secure,
        canSendEmail: form.can_send_email,
        canReceiveEmail: form.can_receive_email,
      };
      if (view === 'create') {
        const id = await (window as any).repo.call('UsuarioRepo', 'create', form) as string;
        await (window as any).repo.call('UsuarioRepo', 'setEmailPermission', id, form.can_send_email, form.can_receive_email);
        await (window as any).repo.call('CorreoRepo', 'saveConfig', id, smtpData);
        const persisted = await (window as any).repo.call('CorreoRepo', 'getConfig', id) as any;
        if (!persisted) throw new Error('No se pudo confirmar la configuración SMTP guardada.');
        await loadUsuarios(id);
      } else if (view === 'edit' && selected) {
        await (window as any).repo.call('UsuarioRepo', 'update', selected.id, form);
        await (window as any).repo.call('UsuarioRepo', 'setEmailPermission', selected.id, form.can_send_email, form.can_receive_email);
        await (window as any).repo.call('CorreoRepo', 'saveConfig', selected.id, smtpData);
        const persisted = await (window as any).repo.call('CorreoRepo', 'getConfig', selected.id) as any;
        if (!persisted) throw new Error('No se pudo confirmar la configuración SMTP guardada.');
        await loadUsuarios(selected.id);
      }
      setView('list');
      setForm(getDefaultForm());
    } catch (err) {
      console.error(err);
      const msg = (err as any)?.message || 'No se pudo guardar el usuario. Verifica datos (email único, rol válido, etc.).';
      toast.error(msg);
    }
  };

  const handleNombreChange = (nombre: string) => {
    const autoPuesto = nombreToPuesto.get(nombre);
    setForm(prev => ({
      ...prev,
      nombre,
      rol: autoPuesto || prev.rol,
    }));
  };

  const handlePuestoChange = (puesto: RolUsuario) => {
    const candidatos = puestoToNombres.get(puesto) || [];
    setForm(prev => {
      const nombreActualEsValido = candidatos.includes(prev.nombre);
      const autoNombre = nombreActualEsValido ? prev.nombre : (candidatos[0] || prev.nombre);
      return {
        ...prev,
        rol: puesto,
        nombre: autoNombre,
      };
    });
  };

  const deleteUser = async (user: UsuarioUI) => {
    if (!await confirm({ title: 'Eliminar usuario', message: `¿Eliminar usuario ${user.nombre}?`, variant: 'danger' })) return;
    try {
      await (window as any).repo.call('UsuarioRepo', 'delete', user.id);
      await loadUsuarios();
      if (selected?.id === user.id) setSelected(null);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo eliminar el usuario.');
    }
  };

  const openPasswordDialog = (user: UsuarioUI) => {
    setPasswordDialogUser(user);
    setNewPassword(user.password || '');
  };

  const savePassword = async () => {
    if (!passwordDialogUser) return;
    if (!newPassword.trim()) {
      toast.warning('La contraseña no puede estar vacía.');
      return;
    }

    try {
      await (window as any).repo.call('UsuarioRepo', 'setPassword', passwordDialogUser.id, newPassword.trim());
      await loadUsuarios(passwordDialogUser.id);
      setPasswordDialogUser(null);
      setNewPassword('');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar la contraseña.');
    }
  };

  const activateSession = (user: UsuarioUI) => {
    localStorage.setItem('sgc.currentRole', user.rol);
    localStorage.setItem('sgc.currentUser', JSON.stringify({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      departamento: user.departamento,
      activo: user.activo === 1,
    }));
    localStorage.setItem('sgc.session', JSON.stringify({
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        departamento: user.departamento,
      },
      startedAt: new Date().toISOString(),
    }));

    window.dispatchEvent(new Event('storage'));
    toast.success(`Sesión activa cambiada a: ${user.nombre} (${user.rol})`);
  };

  const saveSelectedPermissions = async () => {
    if (!selected || !documentPerms) return;
    setSavingPerms(true);
    try {
      await (window as any).repo.call(
        'UsuarioRepo',
        'setDocumentPermissions',
        selected.id,
        documentPerms.can_add_documents,
        documentPerms.can_delete_documents,
        documentPerms.can_rename_documents,
        documentPerms.can_move_documents,
        documentPerms.can_sign_documents
      );
      window.dispatchEvent(new Event('storage'));
      toast.success('Permisos de documentos actualizados.');
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron guardar los permisos de documentos.');
    } finally {
      setSavingPerms(false);
    }
  };

  return (
    <div className="mod-usuarios">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Usuarios y Roles</h2>
          <p className="mod-subtitle">Crear, modificar, eliminar usuarios y gestionar permisos/contraseñas</p>
        </div>
        <div className="users-header-actions">
          <button className="btn btn-secondary" type="button" onClick={() => void loadUsuarios()}>
            <UsersIcon name="refresh" className="users-inline-icon" />
            <span>Actualizar</span>
          </button>
          <button className="btn btn-primary" type="button" onClick={startCreate}>
            <UsersIcon name="plus" className="users-inline-icon" />
            <span>Nuevo usuario</span>
          </button>
        </div>
      </div>

      <div className="mod-kpis">
        <div className="kpi-card"><span className="kpi-value">{kpis.total}</span><span className="kpi-label">Total</span></div>
        <div className="kpi-card kpi--approved"><span className="kpi-value">{kpis.activos}</span><span className="kpi-label">Activos</span></div>
        <div className="kpi-card kpi--primary"><span className="kpi-value">{kpis.admins}</span><span className="kpi-label">Admins</span></div>
        <div className="kpi-card kpi--review"><span className="kpi-value">{kpis.soloLectura}</span><span className="kpi-label">Solo lectura</span></div>
      </div>

      {error && <div className="doc-error">{error}</div>}

      {view === 'list' && (
        <div className="users-layout">
          <div className="users-panel">
            <div className="users-panel-head">
              <div>
                <span className="users-panel-kicker">Directorio interno</span>
                <h3 className="users-panel-title">Usuarios registrados</h3>
              </div>
              <span className="users-panel-meta">{usuarios.length} registro(s)</span>
            </div>
            <div className="mod-table-wrap">
            <table className="mod-table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Email</th>
                  <th scope="col">Puesto</th>
                  <th scope="col">Departamento</th>
                  <th scope="col">Estatus</th>
                  <th scope="col">Contraseña</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="cell-empty" colSpan={7}>Cargando usuarios...</td></tr>
                ) : usuarios.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon="users" title="No hay usuarios registrados" compact /></td></tr>
                ) : usuarios.map(user => (
                  <tr key={user.id} className={selected?.id === user.id ? 'row--selected' : ''} onClick={() => setSelected(user)}>
                    <td>{user.nombre}</td>
                    <td>{user.email}</td>
                    <td><span className="badge badge--in-progress">{user.rol}</span></td>
                    <td>{user.departamento || '—'}</td>
                    <td>
                      <span className={`badge ${user.activo === 1 ? 'badge--approved' : 'badge--obsolete'}`}>
                        {user.activo === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <span className="password-cell">
                        <span>{showPasswordFor === user.id ? user.password : '********'}</span>
                        <button
                          className="btn-icon"
                          title={showPasswordFor === user.id ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          aria-label={showPasswordFor === user.id ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPasswordFor(prev => prev === user.id ? null : user.id);
                          }}
                        >
                          <UsersIcon name={showPasswordFor === user.id ? 'eyeOff' : 'eye'} />
                        </button>
                      </span>
                    </td>
                    <td className="cell-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-secondary" onClick={() => startEdit(user)}>Editar</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openPasswordDialog(user)}>Cambiar pass</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => activateSession(user)}>Usar sesión</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteUser(user)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          {selected && (
            <div className="mod-detail users-detail-block">
              <div className="detail-header">
                <div>
                  <span className="detail-code">{selected.id}</span>
                  <h3 className="detail-title">Perfil de {selected.nombre}</h3>
                  <p className="users-detail-subtitle">Resumen operativo del usuario seleccionado, su puesto y sus permisos documentales.</p>
                </div>
                <div className="users-detail-badges">
                  <span className="badge badge--lg badge--in-progress">{selected.rol}</span>
                  <span className={`badge badge--lg ${selected.activo === 1 ? 'badge--approved' : 'badge--obsolete'}`}>
                    {selected.activo === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="permissions-grid">
                <div className="permissions-card">
                  <h4 className="users-card-title">
                    <UsersIcon name="info" className="users-inline-icon" />
                    <span>Información del perfil</span>
                  </h4>
                  <p className="users-card-copy">El puesto sigue funcionando como descriptor operativo del directorio, no como una matriz global de permisos.</p>
                  <ul>
                    <li>El campo "Puesto" es descriptivo.</li>
                    <li>No define permisos ni restricciones de módulos.</li>
                    <li>Se usa para identificar la posición organizacional del usuario.</li>
                  </ul>
                </div>

                <div className="permissions-card">
                  <h4 className="users-card-title">
                    <UsersIcon name="lock" className="users-inline-icon" />
                    <span>Permisos de Documentación</span>
                  </h4>
                  {loadingPerms && <p>Cargando permisos...</p>}
                  {!loadingPerms && documentPerms && (
                    <>
                      <p className="users-permission-summary">
                        Estado actual: agregar <strong>{documentPerms.can_add_documents === 1 ? 'Sí' : 'No'}</strong> ·
                        eliminar <strong>{documentPerms.can_delete_documents === 1 ? 'Sí' : 'No'}</strong> ·
                        renombrar <strong>{documentPerms.can_rename_documents === 1 ? 'Sí' : 'No'}</strong> ·
                        mover <strong>{documentPerms.can_move_documents === 1 ? 'Sí' : 'No'}</strong> ·
                        firmar <strong>{documentPerms.can_sign_documents === 1 ? 'Sí' : 'No'}</strong>
                      </p>
                      <label className="permission-toggle">
                        <input
                          type="checkbox"
                          checked={documentPerms.can_add_documents === 1}
                          onChange={(e) => setDocumentPerms(prev => ({
                            can_add_documents: e.target.checked ? 1 : 0,
                            can_delete_documents: prev?.can_delete_documents ?? 0,
                            can_rename_documents: prev?.can_rename_documents ?? 0,
                            can_move_documents: prev?.can_move_documents ?? 0,
                            can_sign_documents: prev?.can_sign_documents ?? 0,
                          }))}
                        />
                        <span>Puede agregar documentos</span>
                      </label>
                      <label className="permission-toggle">
                        <input
                          type="checkbox"
                          checked={documentPerms.can_delete_documents === 1}
                          onChange={(e) => setDocumentPerms(prev => ({
                            can_add_documents: prev?.can_add_documents ?? 1,
                            can_delete_documents: e.target.checked ? 1 : 0,
                            can_rename_documents: prev?.can_rename_documents ?? 0,
                            can_move_documents: prev?.can_move_documents ?? 0,
                            can_sign_documents: prev?.can_sign_documents ?? 0,
                          }))}
                        />
                        <span>Puede eliminar documentos</span>
                      </label>
                      <label className="permission-toggle">
                        <input
                          type="checkbox"
                          checked={documentPerms.can_rename_documents === 1}
                          onChange={(e) => setDocumentPerms(prev => ({
                            can_add_documents: prev?.can_add_documents ?? 1,
                            can_delete_documents: prev?.can_delete_documents ?? 0,
                            can_rename_documents: e.target.checked ? 1 : 0,
                            can_move_documents: prev?.can_move_documents ?? 0,
                            can_sign_documents: prev?.can_sign_documents ?? 0,
                          }))}
                        />
                        <span>Puede renombrar documentos/carpetas</span>
                      </label>
                      <label className="permission-toggle">
                        <input
                          type="checkbox"
                          checked={documentPerms.can_move_documents === 1}
                          onChange={(e) => setDocumentPerms(prev => ({
                            can_add_documents: prev?.can_add_documents ?? 1,
                            can_delete_documents: prev?.can_delete_documents ?? 0,
                            can_rename_documents: prev?.can_rename_documents ?? 0,
                            can_move_documents: e.target.checked ? 1 : 0,
                            can_sign_documents: prev?.can_sign_documents ?? 0,
                          }))}
                        />
                        <span>Puede mover documentos/carpetas</span>
                      </label>
                      <label className="permission-toggle">
                        <input
                          type="checkbox"
                          checked={documentPerms.can_sign_documents === 1}
                          onChange={(e) => setDocumentPerms(prev => ({
                            can_add_documents: prev?.can_add_documents ?? 1,
                            can_delete_documents: prev?.can_delete_documents ?? 0,
                            can_rename_documents: prev?.can_rename_documents ?? 0,
                            can_move_documents: prev?.can_move_documents ?? 0,
                            can_sign_documents: e.target.checked ? 1 : 0,
                          }))}
                        />
                        <span>Puede firmar/gestionar firmas</span>
                      </label>
                      <div className="permissions-inline-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => void saveSelectedPermissions()} disabled={savingPerms}>
                          {savingPerms ? 'Guardando...' : 'Guardar permisos'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(view === 'create' || view === 'edit') && (
        <div className="mod-form-card">
          <h3>{view === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</h3>
          <div className="form-grid">
            <label className="form-group">
              <span>Nombre *</span>
              <>
                <input
                  list="usuarios-nombres-catalogo"
                  value={form.nombre}
                  onChange={e => handleNombreChange(e.target.value)}
                  placeholder="Escribe o selecciona un nombre"
                />
                <datalist id="usuarios-nombres-catalogo">
                  {NOMBRE_OPTIONS.map(nombre => <option key={nombre} value={nombre} />)}
                </datalist>
              </>
            </label>
            <label className="form-group">
              <span>Email *</span>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="form-group">
              <span>Puesto *</span>
              <select value={form.rol} onChange={e => handlePuestoChange(e.target.value as RolUsuario)}>
                {PUESTO_OPTIONS.map(puesto => <option key={puesto} value={puesto}>{puesto}</option>)}
              </select>
            </label>
            <label className="form-group">
              <span>Departamento</span>
              <input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} />
            </label>
            <label className="form-group">
              <span>Estatus</span>
              <select value={form.activo} onChange={e => setForm({ ...form, activo: Number(e.target.value) })}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
            </label>
            {view === 'create' && (
              <label className="form-group">
                <span>Contraseña inicial *</span>
                <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </label>
            )}
          </div>

          {/* ── Configuración de correo del usuario ── */}
          <div className="users-email-settings">
            <h4 className="users-email-title">
              <UsersIcon name="mail" className="users-inline-icon" />
              <span>Configuración de correo electrónico</span>
            </h4>

            <div className="users-email-switches">
              <label className="permission-toggle">
                <input
                  type="checkbox"
                  checked={form.can_send_email === 1}
                  onChange={e => setForm(prev => ({ ...prev, can_send_email: e.target.checked ? 1 : 0 }))}
                />
                <span>Puede <strong>enviar</strong> correos</span>
              </label>
              <label className="permission-toggle">
                <input
                  type="checkbox"
                  checked={form.can_receive_email === 1}
                  onChange={e => setForm(prev => ({ ...prev, can_receive_email: e.target.checked ? 1 : 0 }))}
                />
                <span>Puede <strong>recibir</strong> correos</span>
              </label>
            </div>

            {/* ─── SMTP ─── */}
            <div className="users-email-block">
              <h5 className="users-email-block-title">
                <UsersIcon name="send" className="users-inline-icon" />
                <span>SMTP (Envío de correo)</span>
              </h5>
              <div className="form-grid users-email-grid">
                <label className="form-group">
                  <span>Servidor SMTP</span>
                  <input
                    value={form.smtp_host}
                    onChange={e => setForm(prev => ({ ...prev, smtp_host: e.target.value }))}
                    placeholder="mail.empresa.com"
                  />
                </label>
                <label className="form-group">
                  <span>Puerto SMTP</span>
                  <input
                    type="number"
                    value={form.smtp_port}
                    onChange={e => setForm(prev => ({ ...prev, smtp_port: Number(e.target.value) }))}
                    placeholder="465"
                  />
                </label>
                <label className="form-group">
                  <span>Usuario SMTP</span>
                  <input
                    value={form.smtp_user}
                    onChange={e => setForm(prev => ({ ...prev, smtp_user: e.target.value }))}
                    placeholder="usuario@empresa.com"
                  />
                </label>
                <label className="form-group">
                  <span>Contraseña SMTP</span>
                  <input
                    type="password"
                    value={form.smtp_pass}
                    onChange={e => setForm(prev => ({ ...prev, smtp_pass: e.target.value }))}
                    placeholder="••••••••"
                  />
                </label>
                <label className="form-group">
                  <span>Remitente (From)</span>
                  <input
                    value={form.smtp_from}
                    onChange={e => setForm(prev => ({ ...prev, smtp_from: e.target.value }))}
                    placeholder="Nombre <correo@empresa.com>"
                  />
                </label>
                <label className="permission-toggle">
                  <input
                    type="checkbox"
                    checked={form.smtp_secure === 1}
                    onChange={e => setForm(prev => ({ ...prev, smtp_secure: e.target.checked ? 1 : 0 }))}
                  />
                  <span>SSL/TLS</span>
                </label>
              </div>
            </div>

            {/* ─── IMAP ─── */}
            <div className="users-email-block">
              <h5 className="users-email-block-title">
                <UsersIcon name="receive" className="users-inline-icon" />
                <span>IMAP (Recepción de correo)</span>
              </h5>
              <div className="form-grid users-email-grid">
                <label className="form-group">
                  <span>Servidor IMAP</span>
                  <input
                    value={form.imap_host}
                    onChange={e => setForm(prev => ({ ...prev, imap_host: e.target.value }))}
                    placeholder="mail.empresa.com"
                  />
                </label>
                <label className="form-group">
                  <span>Puerto IMAP</span>
                  <input
                    type="number"
                    value={form.imap_port}
                    onChange={e => setForm(prev => ({ ...prev, imap_port: Number(e.target.value) }))}
                    placeholder="993"
                  />
                </label>
                <label className="permission-toggle">
                  <input
                    type="checkbox"
                    checked={form.imap_secure === 1}
                    onChange={e => setForm(prev => ({ ...prev, imap_secure: e.target.checked ? 1 : 0 }))}
                  />
                  <span>SSL/TLS</span>
                </label>
              </div>
            </div>

            {/* ─── POP3 ─── */}
            <div className="users-email-block">
              <h5 className="users-email-block-title">
                <UsersIcon name="receive" className="users-inline-icon" />
                <span>POP3 (Recepción alternativa)</span>
              </h5>
              <div className="form-grid users-email-grid">
                <label className="form-group">
                  <span>Servidor POP3</span>
                  <input
                    value={form.pop_host}
                    onChange={e => setForm(prev => ({ ...prev, pop_host: e.target.value }))}
                    placeholder="mail.empresa.com"
                  />
                </label>
                <label className="form-group">
                  <span>Puerto POP3</span>
                  <input
                    type="number"
                    value={form.pop_port}
                    onChange={e => setForm(prev => ({ ...prev, pop_port: Number(e.target.value) }))}
                    placeholder="995"
                  />
                </label>
                <label className="permission-toggle">
                  <input
                    type="checkbox"
                    checked={form.pop_secure === 1}
                    onChange={e => setForm(prev => ({ ...prev, pop_secure: e.target.checked ? 1 : 0 }))}
                  />
                  <span>SSL/TLS</span>
                </label>
              </div>
            </div>

            {view === 'edit' && selected && (
              <div className="users-test-row">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={async () => {
                    setSmtpTestResult(null);
                    try {
                      const smtpData = {
                        smtpHost: form.smtp_host,
                        smtpPort: form.smtp_port,
                        smtpUser: form.smtp_user,
                        smtpPass: form.smtp_pass,
                        smtpFrom: form.smtp_from,
                        smtpSecure: form.smtp_secure,
                        imapHost: form.imap_host,
                        imapPort: form.imap_port,
                        imapSecure: form.imap_secure,
                        popHost: form.pop_host,
                        popPort: form.pop_port,
                        popSecure: form.pop_secure,
                        canSendEmail: form.can_send_email,
                        canReceiveEmail: form.can_receive_email,
                      };
                      await (window as any).repo.call('CorreoRepo', 'saveConfig', selected.id, smtpData);

                      const test = await (window as any).repo.call('CorreoRepo', 'testConnection', selected.id) as { success: boolean; error?: string };
                      if (!test.success) {
                        setSmtpTestResult(`ERROR: ${test.error || 'Error de conexión SMTP'}`);
                        return;
                      }

                      const emailCandidates = [form.email, selected.email, form.smtp_user]
                        .map(v => String(v || '').trim())
                        .filter(Boolean);
                      const to = emailCandidates.find(v => /.+@.+\..+/.test(v)) || '';
                      if (!to) {
                        setSmtpTestResult('ERROR: El usuario no tiene email y tampoco hay usuario SMTP para enviar validación.');
                        return;
                      }

                      const subject = '[SGC] Correo de validación SMTP';
                      const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;">
                        <div style="background:#1d4ed8;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;">
                          <h2 style="margin:0;font-size:17px;">Sistema de Gestión de Calidad</h2>
                        </div>
                        <div style="background:#fff;border:1px solid #dbeafe;border-top:none;padding:18px;border-radius:0 0 8px 8px;">
                          <p style="margin:0 0 10px;color:#0f172a;"><strong>Prueba de configuración SMTP exitosa</strong></p>
                          <p style="margin:0 0 8px;color:#334155;">Usuario: ${selected.nombre}</p>
                          <p style="margin:0 0 8px;color:#334155;">Email validado: ${to}</p>
                          <p style="margin:0;color:#64748b;font-size:12px;">Este correo confirma que la configuración de envío del usuario es válida.</p>
                        </div>
                      </div>`;

                      const send = await (window as any).repo.call('CorreoRepo', 'sendEmail', selected.id, { to, subject, html }) as { success: boolean; error?: string };
                      setSmtpTestResult(send.success
                        ? `OK: Conexión SMTP exitosa. Correo de validación enviado a ${to}`
                        : `ERROR: ${send.error || 'Error al enviar correo de validación'}`);
                    } catch (err: any) {
                      setSmtpTestResult(`ERROR: ${err?.message || 'Error al probar conexión'}`);
                    }
                  }}
                  disabled={!form.smtp_host.trim() || !form.smtp_user.trim()}
                >
                  <UsersIcon name="plug" className="users-inline-icon" />
                  <span>Probar conexión SMTP</span>
                </button>
                {smtpTestResult && (
                  <span className={`users-test-result ${smtpTestResult.startsWith('OK:') ? 'users-test-result--ok' : 'users-test-result--error'}`}>
                    {smtpTestResult}
                  </span>
                )}
              </div>
            )}

            <p className="users-email-hint">
              Configuración de servidores de correo (SMTP/IMAP/POP3) por usuario.
              Cada usuario tiene su propia configuración.
            </p>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={saveForm} disabled={!form.nombre.trim() || !form.email.trim()}>
              {view === 'create' ? 'Crear usuario' : 'Guardar cambios'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setView('list'); setForm(emptyForm); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {passwordDialogUser && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Cambiar contraseña">
          <div className="doc-dialog-card">
            <h4 className="doc-dialog-title">Cambiar contraseña de {passwordDialogUser.nombre}</h4>
            <input
              className="doc-dialog-input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') void savePassword();
                if (e.key === 'Escape') setPasswordDialogUser(null);
              }}
            />
            <div className="doc-dialog-actions">
              <button className="btn btn-secondary" onClick={() => setPasswordDialogUser(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => void savePassword()} disabled={!newPassword.trim()}>
                Guardar contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
