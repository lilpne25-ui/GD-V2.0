import { IpcMainInvokeEvent } from 'electron';
import { SessionManager } from '../services/SessionManager';

/**
 * Valida el origen físico del emisor del evento IPC para prevenir ataques anidados o de secuestro de frames.
 */
export function validateIpcSender(event: IpcMainInvokeEvent): boolean {
  if (!event.sender) {
    console.error('Security Alert: IPC request has no sender.');
    return false;
  }

  if (!event.senderFrame) {
    console.error('Security Alert: IPC request has no senderFrame.');
    return false;
  }

  // Prevenir abusos anidados de frames (clickjacking/nested iframes)
  if (event.senderFrame.parent !== null) {
    console.error('Security Alert: Nested frame/iframe IPC abuse attempt detected.');
    return false;
  }

  return true;
}

/**
 * Middleware para asegurar endpoints IPC requiriendo sesión activa en el backend.
 */
export function withAuth<T = any>(
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<T>
) {
  return async (event: IpcMainInvokeEvent, ...args: any[]) => {
    // 1. Validar el origen físico del IPC
    if (!validateIpcSender(event)) {
      throw new Error('Unauthorized: Invalid IPC sender context.');
    }

    // 2. Determinar si es una solicitud de login que requiere bypass
    const payload = args[0] as { repo: string; method: string } | undefined;
    const isLoginBypass = payload && payload.repo === 'UsuarioRepo' && payload.method === 'authenticate';

    if (!isLoginBypass) {
      // Obtener sesión activa por webContentsId
      const session = SessionManager.getInstance().getSession(event.sender.id);
      if (!session) {
        console.error(`Security Alert: Access blocked. No active session for webContentsId: ${event.sender.id}`);
        throw new Error('Unauthorized: Session not found or expired.');
      }

      // Verificar expiración
      const now = new Date();
      if (now > new Date(session.expiresAt)) {
        console.error(`Security Alert: Access blocked. Session expired for webContentsId: ${event.sender.id}`);
        throw new Error('Unauthorized: Session expired.');
      }
    }

    // Continuar al handler real
    return await handler(event, ...args);
  };
}
