#!/usr/bin/env node
/**
 * Comprobacion previa a la Demo guiada Innovax.
 *
 * SOLO LECTURA: no escribe en la base de datos, no ejecuta migraciones y no
 * imprime secretos (de las variables sensibles solo informa si existen).
 *
 * Uso:
 *   npm run demo:preflight
 *
 * Codigo de salida 0 si todo lo imprescindible esta listo; 1 si algo bloquea.
 * Las credenciales se comprueban con el mecanismo existente:
 *   npm run migrate:passwords -- --dry   (esperado: migradas 0)
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const EXPECTED_MIGRATIONS = [
  '014_dynamic_records_engine.sql',
  '016_seed_record_type_fp05c.sql',
  '017_record_values_allow_scalar_json.sql',
];

const results = [];
const ok = (label, detail) => results.push({ level: 'OK', label, detail });
const warn = (label, detail) => results.push({ level: 'AVISO', label, detail });
const fail = (label, detail) => results.push({ level: 'BLOQUEA', label, detail });

function checkEnv() {
  const roots = String(process.env.SGC_ALLOWED_FILE_ROOTS || '')
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean);

  if (roots.length === 0) {
    warn('SGC_ALLOWED_FILE_ROOTS', 'no definida: la vista previa de documentos quedara bloqueada (deny by default).');
  } else {
    const missing = roots.filter(r => !fs.existsSync(r));
    if (missing.length) warn('SGC_ALLOWED_FILE_ROOTS', `${missing.length} raiz(es) no existen en disco.`);
    else ok('SGC_ALLOWED_FILE_ROOTS', `${roots.length} raiz(es) configuradas y existentes.`);
  }

  const ragOn = ['1', 'true', 'yes', 'si', 'on'].includes(String(process.env.SGC_RAG_ENABLED || '').trim().toLowerCase());
  if (ragOn) {
    warn('SGC_RAG_ENABLED', 'activo. La demo no lo necesita. Si se usa, debe ser con una clave NUEVA (la historica esta comprometida).');
  } else {
    ok('SGC_RAG_ENABLED', 'desactivado: la demo no hara llamadas a proveedores de IA.');
  }
}

async function checkDatabase() {
  let db;
  try {
    db = require('../dist-test/database/db-sqlserver');
  } catch {
    fail('Build de apoyo', 'falta dist-test. Ejecuta: npm run build:test');
    return;
  }

  try {
    const info = await db.dbGet('SELECT @@SERVERNAME AS server, DB_NAME() AS dbname');
    ok('SQL Server', `conectado a ${info.server} / ${info.dbname}`);
  } catch (error) {
    fail('SQL Server', `sin conexion: ${error && error.message ? error.message : error}`);
    return;
  }

  try {
    const rows = await db.dbAll('SELECT filename FROM dbo.schema_migrations');
    const applied = new Set(rows.map(r => r.filename));
    const missing = EXPECTED_MIGRATIONS.filter(m => !applied.has(m));
    if (missing.length) fail('Migraciones', `faltan: ${missing.join(', ')}. Arranca la app una vez para aplicarlas.`);
    else ok('Migraciones', `motor dinamico y FP-05-C aplicados (${applied.size} en total).`);

    if (applied.has('019_credentials_hardening.sql')) ok('Migracion 019', 'aplicada.');
    else warn('Migracion 019', 'pendiente; se aplica sola al arrancar la app.');
  } catch (error) {
    fail('Migraciones', `no se pudo leer schema_migrations: ${error.message}`);
  }

  try {
    const fp = await db.dbGet("SELECT TOP 1 code, name, is_active FROM record_types WHERE UPPER(code) = 'FP-05-C'");
    if (!fp) fail('FP-05-C', 'no existe. Revisa la migracion 016.');
    else if (Number(fp.is_active) !== 1) warn('FP-05-C', 'existe pero esta inactivo.');
    else ok('FP-05-C', `${fp.code} · ${fp.name}`);
  } catch (error) {
    fail('FP-05-C', `consulta fallida: ${error.message}`);
  }

  try {
    const users = await db.dbGet('SELECT COUNT(1) AS n FROM usuarios WHERE activo = 1');
    if (Number(users.n) > 0) ok('Usuarios activos', String(users.n));
    else fail('Usuarios activos', 'ninguno: nadie podra iniciar sesion.');

    const docs = await db.dbGet("SELECT COUNT(1) AS n FROM documento_nodos WHERE node_type = 'file'");
    if (Number(docs.n) > 0) ok('Documentos', `${docs.n} para mostrar en Documentacion.`);
    else warn('Documentos', 'ninguno: el paso 4 mostrara una estructura vacia.');
  } catch (error) {
    warn('Datos de apoyo', `no se pudieron contar: ${error.message}`);
  }
}

(async () => {
  checkEnv();
  await checkDatabase();

  console.log('\nComprobacion previa · Demo guiada Innovax\n');
  for (const r of results) {
    console.log(`  [${r.level.padEnd(7)}] ${r.label.padEnd(24)} ${r.detail}`);
  }

  const blocking = results.filter(r => r.level === 'BLOQUEA').length;
  console.log(`\n${blocking === 0 ? 'LISTO para presentar.' : `${blocking} punto(s) bloquean la demo.`}`);
  console.log('Credenciales: npm run migrate:passwords -- --dry  (esperado: migradas 0)\n');
  process.exit(blocking === 0 ? 0 : 1);
})();
