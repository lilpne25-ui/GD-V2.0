import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SessionRecord, AuthResponse } from '../../shared';

export interface SessionUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  departamento: string;
  activo?: number;
}

interface AuthContextType {
  user: SessionUser | null;
  session: SessionRecord | null;
  initializing: boolean;
  authenticated: boolean;
  error: string | null;
  login: (login: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar sesión leyendo desde almacenamiento local o validando con el backend
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedSessionId = localStorage.getItem('sgc.sessionId');
        if (!savedSessionId) {
          setInitializing(false);
          return;
        }

        // Validar la sesión con el backend en el main process
        const activeSession: SessionRecord | null = await (window as any).auth.getSession(savedSessionId);
        if (activeSession) {
          // Obtener los datos del usuario correspondientes
          const userData = await (window as any).repo.call('UsuarioRepo', 'getById', activeSession.userId);
          if (userData && Number(userData.activo) === 1) {
            setUser({
              id: userData.id,
              nombre: userData.nombre,
              email: userData.email,
              rol: userData.rol,
              departamento: userData.departamento,
            });
            setSession(activeSession);
          } else {
            // Usuario inactivo o inexistente, destruir sesión
            await (window as any).auth.logout(savedSessionId);
            localStorage.removeItem('sgc.sessionId');
            localStorage.removeItem('sgc.session');
            localStorage.removeItem('sgc.currentUser');
            localStorage.removeItem('sgc.currentRole');
          }
        } else {
          // Sesión no válida o expirada
          localStorage.removeItem('sgc.sessionId');
          localStorage.removeItem('sgc.session');
          localStorage.removeItem('sgc.currentUser');
          localStorage.removeItem('sgc.currentRole');
        }
      } catch (err: any) {
        console.error('Error al inicializar la sesión:', err);
        setError(err.message || 'Error al conectar con el servidor.');
      } finally {
        setInitializing(false);
      }
    };

    void initializeAuth();
  }, []);

  const login = async (loginName: string, password?: string): Promise<boolean> => {
    setError(null);
    try {
      const res: AuthResponse = await (window as any).auth.login(loginName, password);
      if (res.success && res.session) {
        const userData = await (window as any).repo.call('UsuarioRepo', 'getById', res.session.userId);
        if (userData && Number(userData.activo) === 1) {
          const mappedUser = {
            id: userData.id,
            nombre: userData.nombre,
            email: userData.email,
            rol: userData.rol,
            departamento: userData.departamento,
          };
          setUser(mappedUser);
          setSession(res.session);

          // Compatibilidad heredada (Fase 0.5).
          //
          // ATENCION: estas claves NO tienen autoridad. Son un espejo puramente
          // visual para modulos que aun leen el usuario/rol desde localStorage
          // (Documentacion, Registros, useDocumentacionSave).
          //
          // La autorizacion se decide siempre en el proceso main:
          //   - withAuth resuelve la sesion por webContents.id;
          //   - withSessionActor sobreescribe rol/usuario en los canales records:*.
          // Manipular estas claves NO concede privilegios.
          //
          // Reducirlas a solo sgc.sessionId esta planificado como P1-2 en
          // docs/security/SECURITY_BACKLOG.md.
          localStorage.setItem('sgc.sessionId', res.session.sessionId);
          localStorage.setItem('sgc.currentRole', userData.rol);
          localStorage.setItem('sgc.currentUser', JSON.stringify({
            id: userData.id,
            nombre: userData.nombre,
            email: userData.email,
            rol: userData.rol,
            departamento: userData.departamento,
            activo: userData.activo === 1,
          }));
          localStorage.setItem('sgc.session', JSON.stringify({
            usuario: mappedUser,
            startedAt: new Date().toISOString(),
          }));
          
          window.dispatchEvent(new Event('storage'));
          return true;
        } else {
          setError('El usuario está inactivo o no existe.');
          return false;
        }
      } else {
        setError(res.error || 'Credenciales incorrectas.');
        return false;
      }
    } catch (err: any) {
      console.error('Error en proceso de login:', err);
      setError(err.message || 'Error de conexión con el servicio de autenticación.');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (session) {
        await (window as any).auth.logout(session.sessionId);
      }
    } catch (err) {
      console.error('Error al notificar logout al backend:', err);
    } finally {
      setUser(null);
      setSession(null);
      localStorage.removeItem('sgc.sessionId');
      localStorage.removeItem('sgc.session');
      localStorage.removeItem('sgc.currentUser');
      localStorage.removeItem('sgc.currentRole');
      window.dispatchEvent(new Event('storage'));
    }
  };

  const authenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        initializing,
        authenticated,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
