import { ipcMain } from 'electron';
import { AuthService } from '../services/AuthService';
import { AuthResponse, SessionRecord } from '../../shared';

export function registerAuthIpc(): void {
  // Manejador de Login seguro
  ipcMain.handle('auth:login', async (event, payload: { login: string; password?: string }): Promise<AuthResponse> => {
    const { login, password = '' } = payload || {};
    return await AuthService.authenticate(login, password, event.sender.id);
  });

  // Manejador para obtener/validar sesión activa
  ipcMain.handle('auth:get-session', async (_event, payload: { sessionId: string }): Promise<SessionRecord | null> => {
    const { sessionId } = payload || {};
    if (!sessionId || typeof sessionId !== 'string') return null;
    return AuthService.validateSession(sessionId);
  });

  // Manejador de Logout seguro
  ipcMain.handle('auth:logout', async (_event, payload: { sessionId: string }): Promise<{ success: boolean }> => {
    const { sessionId } = payload || {};
    if (sessionId && typeof sessionId === 'string') {
      AuthService.logout(sessionId);
    }
    return { success: true };
  });
}
