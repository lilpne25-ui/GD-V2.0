// Repositorio interno de credenciales.
// Fase 0.5 - Auth & Security Foundation.
//
// IMPORTANTE: este repositorio NO se expone en repositories/index.ts ni en la
// ALLOWLIST de repo:call. El renderer no puede alcanzarlo. Solo AuthService y
// el proceso de migracion pueden consumirlo.

import { dbAll, dbGet, dbRun } from '../db';
import { hashPassword } from '../../main/services/CredentialService';
import type { CredentialStore, LegacyCredentialRow } from '../../main/services/CredentialService';

interface CredencialRow {
  user_id: string;
  password: string;
}

export const CredencialRepo = {
  /** Devuelve el hash almacenado de un usuario. Uso exclusivo del backend. */
  async getHashByUserId(userId: string): Promise<string | null> {
    const row = await dbGet<CredencialRow>(
      `SELECT user_id, COALESCE([password], '') AS [password]
       FROM usuario_credenciales
       WHERE user_id = ?`,
      [userId]
    );
    return row ? String(row.password || '') : null;
  },

  /** Guarda una contrasena SIEMPRE hasheada con bcrypt. */
  async setPassword(userId: string, plainPassword: string): Promise<void> {
    const value = String(plainPassword ?? '').trim();
    if (!value) {
      throw new Error('La contrasena no puede estar vacia.');
    }
    await this.setPasswordHash(userId, hashPassword(value));
  },

  /** Escribe un hash ya calculado. Rechaza cualquier valor que no sea bcrypt. */
  async setPasswordHash(userId: string, hash: string): Promise<void> {
    await dbRun(
      `MERGE usuario_credenciales AS target
       USING (SELECT ? AS user_id, ? AS [password]) AS source
          ON target.user_id = source.user_id
       WHEN MATCHED THEN
         UPDATE SET [password] = source.[password], updated_at = SYSDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (user_id, [password], updated_at)
         VALUES (source.user_id, source.[password], SYSDATETIME());`,
      [userId, hash]
    );
  },

  /** Elimina la credencial de un usuario. */
  async deleteByUserId(userId: string): Promise<void> {
    await dbRun('DELETE FROM usuario_credenciales WHERE user_id = ?', [userId]);
  },

  /** Almacen para la migracion legacy. */
  asStore(): CredentialStore {
    return {
      listAll: async (): Promise<LegacyCredentialRow[]> =>
        dbAll<LegacyCredentialRow>(
          `SELECT user_id, COALESCE([password], '') AS [password] FROM usuario_credenciales`
        ),
      updateHash: async (userId: string, hash: string): Promise<void> => {
        await CredencialRepo.setPasswordHash(userId, hash);
      },
    };
  },
};
