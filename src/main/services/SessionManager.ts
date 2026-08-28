import crypto from 'crypto';
import { SessionRecord } from '../../shared';

export class SessionManager {
  private static instance: SessionManager | null = null;
  private sessions = new Map<string, SessionRecord>();

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public createSession(
    userId: string,
    role: string,
    permissions: string[],
    webContentsId: number,
    securityVersion: string
  ): SessionRecord {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 horas de validez por defecto

    const session: SessionRecord = {
      sessionId,
      userId,
      role,
      permissions,
      webContentsId,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      lastActivityAt: now.toISOString(),
      securityVersion,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  public getSession(sessionIdOrWebContentsId: string | number): SessionRecord | null {
    let session: SessionRecord | undefined;
    if (typeof sessionIdOrWebContentsId === 'number') {
      session = Array.from(this.sessions.values()).find(s => s.webContentsId === sessionIdOrWebContentsId);
    } else {
      session = this.sessions.get(sessionIdOrWebContentsId);
    }
    
    if (!session) return null;

    // Verificar si la sesión ya expiró
    const now = new Date();
    const expires = new Date(session.expiresAt);
    if (now > expires) {
      this.destroySession(session.sessionId);
      return null;
    }

    // Actualizar la marca de tiempo de última actividad
    session.lastActivityAt = now.toISOString();
    this.sessions.set(session.sessionId, session);
    return session;
  }

  public destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public destroySessionByWebContents(webContentsId: number): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.webContentsId === webContentsId) {
        this.sessions.delete(sessionId);
      }
    }
  }

  public getActiveSessions(): SessionRecord[] {
    return Array.from(this.sessions.values());
  }
}
