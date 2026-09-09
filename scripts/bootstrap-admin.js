#!/usr/bin/env node
/**
 * Bootstrap explicito del primer administrador.
 * Fase 0.5 - Auth & Security Foundation.
 *
 * No existe contrasena por defecto en el sistema. Este script es el unico
 * mecanismo soportado para crear/asignar la credencial inicial.
 *
 * Uso (produccion):
 *   SGC_BOOTSTRAP_ADMIN_LOGIN=admin@empresa.com \
 *   SGC_BOOTSTRAP_ADMIN_PASSWORD='<contrasena-fuerte>' \
 *   npm run bootstrap:admin
 *
 * Uso (desarrollo, siembra masiva de usuarios sin credencial):
 *   NODE_ENV=development SGC_DEV_SEED_PASSWORD='<contrasena>' npm run bootstrap:admin -- --seed-dev
 *
 * Garantias:
 *   - Nunca imprime la contrasena ni el hash.
 *   - Nunca inventa una contrasena: si no se define, aborta.
 *   - Idempotente: reasignar la credencial de un usuario existente es seguro.
 *   - No borra usuarios.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SEED_DEV = process.argv.includes('--seed-dev');

function fail(msg) {
  console.error(`[bootstrap-admin] ${msg}`);
  process.exit(1);
}

async function main() {
  const { hashPassword } = require('../dist-test/main/services/CredentialService');
  const { dbAll, dbGet, dbRun } = require('../dist-test/database/db-sqlserver');

  const upsertHash = async (userId, hash) => {
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
  };

  if (SEED_DEV) {
    // Siembra de desarrollo: SOLO si el entorno es development y la variable
    // esta definida explicitamente. Sin fallback.
    const env = String(process.env.NODE_ENV || '').toLowerCase();
    if (env !== 'development') {
      fail('--seed-dev requiere NODE_ENV=development. Abortado.');
    }
    const devPassword = process.env.SGC_DEV_SEED_PASSWORD;
    if (!devPassword || !String(devPassword).trim()) {
      fail('SGC_DEV_SEED_PASSWORD no esta definida. No se inventa una contrasena. Abortado.');
    }

    const users = await dbAll('SELECT id FROM usuarios');
    let asignadas = 0;
    for (const u of users) {
      await upsertHash(u.id, hashPassword(String(devPassword)));
      asignadas += 1;
    }
    console.log(`[bootstrap-admin] modo desarrollo: credenciales asignadas=${asignadas}`);
    process.exit(0);
  }

  const login = String(process.env.SGC_BOOTSTRAP_ADMIN_LOGIN || '').trim();
  const password = process.env.SGC_BOOTSTRAP_ADMIN_PASSWORD;

  if (!login) {
    fail('SGC_BOOTSTRAP_ADMIN_LOGIN no esta definida. Abortado.');
  }
  if (!password || !String(password).trim()) {
    fail('SGC_BOOTSTRAP_ADMIN_PASSWORD no esta definida. No se inventa una contrasena. Abortado.');
  }
  if (String(password).trim().length < 12) {
    fail('La contrasena de bootstrap debe tener al menos 12 caracteres. Abortado.');
  }

  const user = await dbGet(
    `SELECT TOP 1 id, nombre, activo FROM usuarios
     WHERE lower(trim(email)) = lower(?) OR lower(trim(id)) = lower(?)`,
    [login, login]
  );

  if (!user) {
    fail(`No existe un usuario con login "${login}". Crealo primero desde la aplicacion o una migracion.`);
  }
  if (Number(user.activo) !== 1) {
    fail(`El usuario "${login}" esta inactivo. Activalo antes del bootstrap.`);
  }

  await upsertHash(user.id, hashPassword(String(password)));
  console.log(`[bootstrap-admin] credencial establecida para user_id=${user.id} (hash bcrypt).`);
  process.exit(0);
}

main().catch(err => {
  console.error('[bootstrap-admin] fallo:', err && err.message ? err.message : err);
  process.exit(1);
});
