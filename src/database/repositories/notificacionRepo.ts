/**
 * NotificacionRepo – Centro de notificaciones
 *
 * Tipos: info, workflow, correccion, aprobacion, email, sistema
 */
import { dbAll, dbGet, dbRun, generateId } from '../db';

export interface NotificacionRow {
  id: string;
  user_id: string;
  tipo: 'info' | 'workflow' | 'correccion' | 'aprobacion' | 'email' | 'sistema';
  titulo: string;
  mensaje: string;
  referencia_id: string | null;
  referencia_tipo: string | null;
  leida: number;
  created_at: string;
}

export const NotificacionRepo = {
  /**
   * Crear notificación para un usuario.
   */
  async create(data: {
    userId: string;
    tipo: NotificacionRow['tipo'];
    titulo: string;
    mensaje: string;
    referenciaId?: string;
    referenciaTipo?: string;
  }): Promise<string> {
    const id = generateId('noti');
    await dbRun(
      `INSERT INTO notificaciones (id, user_id, tipo, titulo, mensaje, referencia_id, referencia_tipo, leida, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
      [
        id,
        data.userId,
        data.tipo,
        data.titulo,
        data.mensaje,
        data.referenciaId || null,
        data.referenciaTipo || null,
      ]
    );
    return id;
  },

  /**
   * Crear notificación para múltiples usuarios (broadcast).
   */
  async createForMany(userIds: string[], data: {
    tipo: NotificacionRow['tipo'];
    titulo: string;
    mensaje: string;
    referenciaId?: string;
    referenciaTipo?: string;
  }): Promise<void> {
    for (const uid of userIds) {
      await this.create({ userId: uid, ...data });
    }
  },

  /**
   * Crear notificación para todos los usuarios con cierto rol/puesto.
   */
  async createForRole(rolPattern: string, data: {
    tipo: NotificacionRow['tipo'];
    titulo: string;
    mensaje: string;
    referenciaId?: string;
    referenciaTipo?: string;
  }): Promise<void> {
    const users = await dbAll<{ id: string }>(
      `SELECT id FROM usuarios WHERE lower(trim(rol)) LIKE ? AND activo = 1`,
      [`%${rolPattern.toLowerCase().trim()}%`]
    );
    for (const u of users) {
      await this.create({ userId: u.id, ...data });
    }
  },

  /**
   * Listar notificaciones de un usuario.
   */
  async listByUser(userId: string, limit = 50): Promise<NotificacionRow[]> {
    return dbAll<NotificacionRow>(
      `SELECT * FROM notificaciones WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
  },

  /**
   * Contar no leídas de un usuario.
   */
  async countUnread(userId: string): Promise<number> {
    const row = await dbGet<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM notificaciones WHERE user_id = ? AND leida = 0`,
      [userId]
    );
    return row?.cnt || 0;
  },

  /**
   * Marcar notificación como leída.
   */
  async markRead(notificationId: string): Promise<void> {
    await dbRun(
      'UPDATE notificaciones SET leida = 1 WHERE id = ?',
      [notificationId]
    );
  },

  /**
   * Marcar todas las notificaciones de un usuario como leídas.
   */
  async markAllRead(userId: string): Promise<void> {
    await dbRun(
      'UPDATE notificaciones SET leida = 1 WHERE user_id = ? AND leida = 0',
      [userId]
    );
  },

  /**
   * Eliminar notificación.
   */
  async delete(notificationId: string): Promise<void> {
    await dbRun('DELETE FROM notificaciones WHERE id = ?', [notificationId]);
  },

  /**
   * Eliminar todas las leídas de un usuario.
   */
  async deleteAllRead(userId: string): Promise<void> {
    await dbRun('DELETE FROM notificaciones WHERE user_id = ? AND leida = 1', [userId]);
  },
};
