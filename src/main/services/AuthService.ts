import bcrypt from 'bcryptjs';
import { UsuarioRepo } from '../../database/repositories/usuarioRepo';
import { SessionManager } from './SessionManager';
import { AuthResponse, SessionRecord } from '../../shared';

export const AuthService = {
  /**
   * Autentica a un usuario validando su contraseña mediante Bcrypt y crea una sesión.
   * Regla de Seguridad: El hash de la contraseña nunca se expone fuera de este servicio.
   */
  async authenticate(
    login: string,
    password: string,
    webContentsId: number
  ): Promise<AuthResponse> {
    try {
      const cleanLogin = String(login || '').trim();
      const user = await UsuarioRepo.getByLogin(cleanLogin);

      if (!user) {
        return {
          success: false,
          errorCode: 'CREDENTIALS_INVALID',
          error: 'Credenciales incorrectas.',
        };
      }

      if (Number(user.activo) !== 1) {
        return {
          success: false,
          errorCode: 'USER_DISABLED',
          error: 'El usuario se encuentra inactivo.',
        };
      }

      // Validación backend mediante Bcrypt
      const hash = user.password || '';
      const isMatch = bcrypt.compareSync(password, hash);

      if (!isMatch) {
        return {
          success: false,
          errorCode: 'CREDENTIALS_INVALID',
          error: 'Credenciales incorrectas.',
        };
      }

      // Crear sesión opaca en memoria
      const sessionManager = SessionManager.getInstance();
      
      // En este sistema los permisos se pueden expandir dinámicamente si es necesario.
      const permissions: string[] = []; 
      
      const session = sessionManager.createSession(
        user.id,
        user.rol,
        permissions,
        webContentsId,
        'v1'
      );

      return {
        success: true,
        session,
      };
    } catch (error: any) {
      console.error('Error en AuthService.authenticate:', error);
      return {
        success: false,
        errorCode: 'GENERIC_ERROR',
        error: error?.message || 'Ocurrió un error en el servidor de autenticación.',
      };
    }
  },

  /**
   * Valida si existe una sesión activa y actualiza su actividad.
   */
  validateSession(sessionId: string): SessionRecord | null {
    return SessionManager.getInstance().getSession(sessionId);
  },

  /**
   * Destruye una sesión activa por su ID.
   */
  logout(sessionId: string): void {
    SessionManager.getInstance().destroySession(sessionId);
  },

  /**
   * Destruye todas las sesiones asociadas a una ventana (webContentsId).
   */
  logoutWebContents(webContentsId: number): void {
    SessionManager.getInstance().destroySessionByWebContents(webContentsId);
  }
};
