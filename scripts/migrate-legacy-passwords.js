#!/usr/bin/env node
/**
 * Migracion idempotente de credenciales legacy (texto plano) a bcrypt.
 * Fase 0.5 - Auth & Security Foundation.
 *
 * Uso:
 *   npm run migrate:passwords          -> aplica la migracion
 *   npm run migrate:passwords -- --dry -> solo analiza, no escribe
 *
 * Garantias:
 *   - No imprime contrasenas ni hashes completos.
 *   - Un hash bcrypt existente no se vuelve a hashear.
 *   - Conserva la contrasena funcional del usuario.
 *   - No borra usuarios ni resetea contrasenas.
 *   - Se puede ejecutar multiples veces sin efectos adicionales.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DRY_RUN = process.argv.includes('--dry') || process.argv.includes('--dry-run');

async function main() {
  // Se consume el build de main para reutilizar exactamente la misma logica
  // que usa la aplicacion en runtime.
  const { migrateLegacyCredentials } = require('../dist-test/main/services/CredentialService');
  const { dbAll, dbRun } = require('../dist-test/database/db-sqlserver');

  const store = {
    listAll: async () =>
      dbAll("SELECT user_id, COALESCE([password], '') AS [password] FROM usuario_credenciales"),
    updateHash: async (userId, hash) => {
      if (DRY_RUN) return;
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
  };

  if (DRY_RUN) {
    console.log('[cred-migration] MODO DRY-RUN: no se escribira en la base de datos.');
  }

  const report = await migrateLegacyCredentials(store, msg => console.log(msg));

  console.log('--- Resumen de migracion de credenciales ---');
  console.log(`  analizadas : ${report.analizadas}`);
  console.log(`  migradas   : ${report.migradas}`);
  console.log(`  ya-seguras : ${report.yaSeguras}`);
  console.log(`  vacias     : ${report.vacias}`);
  console.log(`  errores    : ${report.errores}`);

  process.exit(report.errores > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[cred-migration] fallo la migracion:', err && err.message ? err.message : err);
  process.exit(1);
});
