import { dbAll, dbGet, dbRun, dbHasColumn, dbTableExists, generateId } from '../db';
import type { RolUsuario } from '../../shared/types/common';

export interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento: string;
  activo: number;
  created_at: string;
  updated_at: string;
  password: string;
}

export interface UsuarioAuth {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento: string;
  activo: number;
}

export interface UsuarioDocumentoPermisos {
  user_id: string;
  can_add_documents: number;
  can_delete_documents: number;
  can_rename_documents: number;
  can_move_documents: number;
  can_sign_documents: number;
}

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

async function ensureDocumentoPermisosSchema(): Promise<void> {
  const exists = await dbTableExists('usuario_permisos_documentos');
  if (!exists) {
    await dbRun(
      `CREATE TABLE dbo.usuario_permisos_documentos (
         user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
         can_add_documents INT NOT NULL DEFAULT 1,
         can_delete_documents INT NOT NULL DEFAULT 0,
         can_rename_documents INT NOT NULL DEFAULT 0,
         can_move_documents INT NOT NULL DEFAULT 0,
         can_sign_documents INT NOT NULL DEFAULT 0,
         updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
         CONSTRAINT FK_usuario_permisos_documentos_user FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
       )`
    );
  }

  if (!(await dbHasColumn('usuario_permisos_documentos', 'can_rename_documents'))) {
    await dbRun(`ALTER TABLE usuario_permisos_documentos ADD COLUMN can_rename_documents INTEGER NOT NULL DEFAULT 0`);
  }
  if (!(await dbHasColumn('usuario_permisos_documentos', 'can_move_documents'))) {
    await dbRun(`ALTER TABLE usuario_permisos_documentos ADD COLUMN can_move_documents INTEGER NOT NULL DEFAULT 0`);
  }
  if (!(await dbHasColumn('usuario_permisos_documentos', 'can_sign_documents'))) {
    await dbRun(`ALTER TABLE usuario_permisos_documentos ADD COLUMN can_sign_documents INTEGER NOT NULL DEFAULT 0`);
  }
}

export const UsuarioRepo = {
<<<<<<< HEAD
  async getByLogin(login: string): Promise<UsuarioRow | null> {
    const cleanLogin = String(login || '').trim();
=======
  async authenticate(emailOrUser: string, password: string): Promise<UsuarioAuth | null> {
    const login = String(emailOrUser || '').trim();
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
    const user = await dbGet<UsuarioRow>(
      `SELECT u.id, u.nombre, u.email, u.rol, u.departamento, u.activo, u.created_at, u.updated_at,
              COALESCE(uc.password, '') AS password
       FROM usuarios u
       LEFT JOIN usuario_credenciales uc ON uc.user_id = u.id
       WHERE lower(trim(u.email)) = lower(?)
          OR lower(trim(u.nombre)) = lower(?)
          OR lower(trim(u.id)) = lower(?)
          OR lower(trim(
               CASE
                 WHEN CHARINDEX('@', u.email) > 0 THEN LEFT(u.email, CHARINDEX('@', u.email) - 1)
                 ELSE u.email
               END
             )) = lower(?)
       ORDER BY u.updated_at DESC
       LIMIT 1`,
<<<<<<< HEAD
      [cleanLogin, cleanLogin, cleanLogin, cleanLogin]
    );
    return user || null;
  },

  async authenticate(emailOrUser: string, password: string, webContentsId?: number): Promise<UsuarioAuth | null> {
    // Delegar validación a AuthService para cumplir con la opacidad del hash y la gestión de sesiones
    const { AuthService } = require('../../main/services/AuthService');
    const res = await AuthService.authenticate(emailOrUser, password, webContentsId || 0);
    if (res.success && res.session) {
      const user = await this.getById(res.session.userId);
      return user ? {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        departamento: user.departamento,
        activo: user.activo,
      } : null;
    }
    return null;
  },

=======
      [login, login, login, login]
    );

    if (!user) return null;
    if (Number(user.activo) !== 1) return null;
    const provided = String(password || '');
    const providedTrimmed = provided.trim();
    const stored = String(user.password || '');
    const storedTrimmed = stored.trim();

    if (stored !== provided && storedTrimmed !== providedTrimmed) return null;

    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      departamento: user.departamento,
      activo: user.activo,
    };
  },
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6

  async getAll(): Promise<UsuarioRow[]> {
    return dbAll<UsuarioRow>(
      `SELECT u.id, u.nombre, u.email, u.rol, u.departamento, u.activo, u.created_at, u.updated_at,
              COALESCE(uc.password, '') AS password
       FROM usuarios u
       LEFT JOIN usuario_credenciales uc ON uc.user_id = u.id
       ORDER BY u.nombre COLLATE NOCASE ASC`
    );
  },

  async getById(id: string): Promise<UsuarioRow | undefined> {
    return dbGet<UsuarioRow>(
      `SELECT u.id, u.nombre, u.email, u.rol, u.departamento, u.activo, u.created_at, u.updated_at,
              COALESCE(uc.password, '') AS password
       FROM usuarios u
       LEFT JOIN usuario_credenciales uc ON uc.user_id = u.id
       WHERE u.id = ?`,
      [id]
    );
  },

  async create(data: Partial<UsuarioRow>): Promise<string> {
    const id = generateId('usr');
    await dbRun(
      `INSERT INTO usuarios (id, nombre, email, rol, departamento, activo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        id,
        data.nombre || '',
        data.email || '',
        data.rol || 'operativo',
        data.departamento || '',
        data.activo ?? 1,
      ]
    );

    await dbRun(
      `MERGE usuario_credenciales AS target
       USING (SELECT ? AS user_id, ? AS [password]) AS source
          ON target.user_id = source.user_id
       WHEN MATCHED THEN
         UPDATE SET [password] = source.[password], updated_at = SYSDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (user_id, [password], updated_at)
         VALUES (source.user_id, source.[password], SYSDATETIME());`,
      [id, data.password || '123456']
    );

    return id;
  },

  async update(id: string, data: Partial<UsuarioRow>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.nombre !== undefined) { fields.push('nombre = ?'); params.push(data.nombre); }
    if (data.email !== undefined) { fields.push('email = ?'); params.push(data.email); }
    if (data.rol !== undefined) { fields.push('rol = ?'); params.push(data.rol); }
    if (data.departamento !== undefined) { fields.push('departamento = ?'); params.push(data.departamento); }
    if (data.activo !== undefined) { fields.push('activo = ?'); params.push(data.activo); }

    fields.push("updated_at = datetime('now')");
    params.push(id);

    await dbRun(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string): Promise<void> {
    await dbRun('DELETE FROM usuarios WHERE id = ?', [id]);
  },

  async setPassword(id: string, password: string): Promise<void> {
    await dbRun(
      `MERGE usuario_credenciales AS target
       USING (SELECT ? AS user_id, ? AS [password]) AS source
          ON target.user_id = source.user_id
       WHEN MATCHED THEN
         UPDATE SET [password] = source.[password], updated_at = SYSDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (user_id, [password], updated_at)
         VALUES (source.user_id, source.[password], SYSDATETIME());`,
      [id, password]
    );
  },

  async getDocumentPermissions(userId: string): Promise<UsuarioDocumentoPermisos> {
    await ensureDocumentoPermisosSchema();

    await dbRun(
      `IF NOT EXISTS (SELECT 1 FROM usuario_permisos_documentos WHERE user_id = ?)
       BEGIN
         INSERT INTO usuario_permisos_documentos (
           user_id,
           can_add_documents,
           can_delete_documents,
           can_rename_documents,
           can_move_documents,
           can_sign_documents,
           updated_at
         )
         SELECT ?, 1,
                CASE
                  WHEN EXISTS(
                    SELECT 1 FROM usuarios
                    WHERE id = ? AND (lower(trim(id)) = 'usr-admin' OR lower(trim(rol)) = 'administrador')
                  ) THEN 1
                  ELSE 0
                END,
                CASE
                  WHEN EXISTS(
                    SELECT 1 FROM usuarios
                    WHERE id = ? AND (lower(trim(id)) = 'usr-admin' OR lower(trim(rol)) = 'administrador')
                  ) THEN 1
                  ELSE 0
                END,
                CASE
                  WHEN EXISTS(
                    SELECT 1 FROM usuarios
                    WHERE id = ? AND (lower(trim(id)) = 'usr-admin' OR lower(trim(rol)) = 'administrador')
                  ) THEN 1
                  ELSE 0
                END,
                1,
                SYSDATETIME();
       END`,
      [userId, userId, userId, userId, userId]
    );

    const row = await dbGet<UsuarioDocumentoPermisos>(
      `SELECT user_id, can_add_documents, can_delete_documents, can_rename_documents, can_move_documents, can_sign_documents
       FROM usuario_permisos_documentos
       WHERE user_id = ?`,
      [userId]
    );

    return row || {
      user_id: userId,
      can_add_documents: 1,
      can_delete_documents: 0,
      can_rename_documents: 0,
      can_move_documents: 0,
      can_sign_documents: 0,
    };
  },

  async setDocumentPermissions(
    userId: string,
    canAddDocuments: number,
    canDeleteDocuments: number,
    canRenameDocuments: number,
    canMoveDocuments: number,
    canSignDocuments: number
  ): Promise<void> {
    await ensureDocumentoPermisosSchema();

    await dbRun(
      `MERGE usuario_permisos_documentos AS target
       USING (
         SELECT ? AS user_id,
                ? AS can_add_documents,
                ? AS can_delete_documents,
                ? AS can_rename_documents,
                ? AS can_move_documents,
                ? AS can_sign_documents
       ) AS source
         ON target.user_id = source.user_id
       WHEN MATCHED THEN
         UPDATE SET can_add_documents = source.can_add_documents,
                    can_delete_documents = source.can_delete_documents,
                    can_rename_documents = source.can_rename_documents,
                    can_move_documents = source.can_move_documents,
                    can_sign_documents = source.can_sign_documents,
                    updated_at = SYSDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (user_id, can_add_documents, can_delete_documents, can_rename_documents, can_move_documents, can_sign_documents, updated_at)
         VALUES (source.user_id, source.can_add_documents, source.can_delete_documents, source.can_rename_documents, source.can_move_documents, source.can_sign_documents, SYSDATETIME());`,
      [
        userId,
        canAddDocuments ? 1 : 0,
        canDeleteDocuments ? 1 : 0,
        canRenameDocuments ? 1 : 0,
        canMoveDocuments ? 1 : 0,
        canSignDocuments ? 1 : 0,
      ]
    );
  },

  /* ── Email permission helpers ── */

  /**
   * Obtener la capacidad de correo de un usuario.
   * Retorna { can_send_email, can_receive_email } (defaults 0/1).
   */
  async getEmailPermission(userId: string): Promise<{ can_send_email: number; can_receive_email: number }> {
    const exists = await dbTableExists('usuario_email_config');
    if (!exists) {
      await dbRun(
        `CREATE TABLE dbo.usuario_email_config (
           user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
           smtp_host NVARCHAR(255) NOT NULL DEFAULT '',
           smtp_port INT NOT NULL DEFAULT 587,
           smtp_user NVARCHAR(255) NOT NULL DEFAULT '',
           smtp_pass NVARCHAR(255) NOT NULL DEFAULT '',
           smtp_from NVARCHAR(255) NOT NULL DEFAULT '',
           smtp_secure INT NOT NULL DEFAULT 1,
           can_send_email INT NOT NULL DEFAULT 0,
           can_receive_email INT NOT NULL DEFAULT 1,
           updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
           CONSTRAINT FK_usuario_email_config_user FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
         )`
      );
    }

    if (!(await dbHasColumn('usuario_email_config', 'can_receive_email'))) {
      await dbRun(`ALTER TABLE usuario_email_config ADD COLUMN can_receive_email INTEGER DEFAULT 1`);
    }

    const row = await dbGet<{ can_send_email: number; can_receive_email: number }>(
      'SELECT can_send_email, can_receive_email FROM usuario_email_config WHERE user_id = ?',
      [userId]
    );
    if (!row) return { can_send_email: 0, can_receive_email: 1 };
    return {
      can_send_email: toFlag01(row.can_send_email, 0),
      can_receive_email: toFlag01(row.can_receive_email, 1),
    };
  },

  /**
   * Establecer la capacidad de correo al crear/editar un usuario.
   */
  async setEmailPermission(userId: string, canSend: number, canReceive: number): Promise<void> {
    const exists = await dbTableExists('usuario_email_config');
    if (!exists) {
      await dbRun(
        `CREATE TABLE dbo.usuario_email_config (
           user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
           smtp_host NVARCHAR(255) NOT NULL DEFAULT '',
           smtp_port INT NOT NULL DEFAULT 587,
           smtp_user NVARCHAR(255) NOT NULL DEFAULT '',
           smtp_pass NVARCHAR(255) NOT NULL DEFAULT '',
           smtp_from NVARCHAR(255) NOT NULL DEFAULT '',
           smtp_secure INT NOT NULL DEFAULT 1,
           can_send_email INT NOT NULL DEFAULT 0,
           can_receive_email INT NOT NULL DEFAULT 1,
           updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
           CONSTRAINT FK_usuario_email_config_user_2 FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
         )`
      );
    }

    if (!(await dbHasColumn('usuario_email_config', 'can_receive_email'))) {
      await dbRun(`ALTER TABLE usuario_email_config ADD COLUMN can_receive_email INTEGER DEFAULT 1`);
    }

    await dbRun(
      `MERGE usuario_email_config AS target
       USING (SELECT ? AS user_id, ? AS can_send_email, ? AS can_receive_email) AS source
          ON target.user_id = source.user_id
       WHEN MATCHED THEN
         UPDATE SET can_send_email = source.can_send_email,
                    can_receive_email = source.can_receive_email,
                    updated_at = SYSDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (user_id, can_send_email, can_receive_email, updated_at)
         VALUES (source.user_id, source.can_send_email, source.can_receive_email, SYSDATETIME());`,
      [userId, canSend ? 1 : 0, canReceive ? 1 : 0]
    );
  },

};
