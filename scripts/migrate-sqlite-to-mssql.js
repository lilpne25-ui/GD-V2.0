/* eslint-disable no-console */
const path = require('path');
const sqlite3 = require('sqlite3');
const sql = require('mssql/msnodesqlv8');

const SQLITE_PATH = process.env.SGC_SQLITE_PATH || path.resolve(process.cwd(), 'sgc.db');
const MSSQL_CONNECTION = process.env.SGC_MSSQL_CONN || 'Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=SGC_Dev;Trusted_Connection=Yes;';

const TABLES = [
  'usuarios',
  'usuario_credenciales',
  'usuario_permisos_documentos',
  'usuario_email_config',
  'documento_nodos',
  'documento_firmas',
  'documento_workflow',
  'workflow_correcciones',
  'notificaciones',
];

function sqliteAll(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function upsertRows(pool, tableName, rows) {
  if (!rows.length) return;

  const sourceColumns = Object.keys(rows[0]);
  if (!sourceColumns.length) return;

  const targetColsResult = await pool.request().query(`
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = '${tableName.replace(/'/g, "''")}'
ORDER BY ORDINAL_POSITION;`);

  const targetColumns = new Set((targetColsResult.recordset || []).map((r) => r.COLUMN_NAME));
  const columns = sourceColumns.filter((c) => targetColumns.has(c));

  if (!columns.length) {
    console.warn(`  -> tabla ${tableName}: sin columnas compatibles, se omite.`);
    return;
  }

  const skippedColumns = sourceColumns.filter((c) => !targetColumns.has(c));
  if (skippedColumns.length) {
    console.warn(`  -> tabla ${tableName}: columnas omitidas en destino: ${skippedColumns.join(', ')}`);
  }

  if (!columns.length) return;

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    const request = pool.request();
    const sourceCols = columns.map((c, i) => {
      const p = `v${i + 1}`;
      request.input(p, row[c]);
      return `@${p} AS [${c}]`;
    }).join(', ');

    const pk = columns.includes('id') ? 'id' : (columns.includes('user_id') ? 'user_id' : columns[0]);

    const updateCols = columns
      .filter(c => c !== pk)
      .map(c => `target.[${c}] = source.[${c}]`)
      .join(', ');

    const insertCols = columns.map(c => `[${c}]`).join(', ');
    const insertVals = columns.map(c => `source.[${c}]`).join(', ');

    const mergeSql = `
MERGE dbo.[${tableName}] AS target
USING (SELECT ${sourceCols}) AS source
ON target.[${pk}] = source.[${pk}]
WHEN MATCHED THEN UPDATE SET ${updateCols || `target.[${pk}] = target.[${pk}]`}
WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals});`;

    try {
      await request.query(mergeSql);
      migrated += 1;
    } catch (error) {
      skipped += 1;
      const msg = error?.message || String(error);
      console.warn(`  -> fila omitida en ${tableName}: ${msg}`);
    }
  }

  return { migrated, skipped };
}

(async () => {
  console.log(`SQLite origen: ${SQLITE_PATH}`);
  const sqliteDb = new sqlite3.Database(SQLITE_PATH);
  const mssqlPool = await sql.connect({
    connectionString: MSSQL_CONNECTION,
    options: { trustedConnection: true, trustServerCertificate: true },
  });

  try {
    for (const tableName of TABLES) {
      console.log(`Migrando tabla: ${tableName}`);
      const rows = await sqliteAll(sqliteDb, `SELECT * FROM ${tableName}`);
      const result = await upsertRows(mssqlPool, tableName, rows);
      if (result) {
        console.log(`  -> ${rows.length} fila(s) procesadas | migradas=${result.migrated} | omitidas=${result.skipped}`);
      } else {
        console.log(`  -> ${rows.length} fila(s) procesadas`);
      }
    }

    console.log('Migración de datos completada.');
  } finally {
    await mssqlPool.close();
    sqliteDb.close();
  }
})().catch((error) => {
  console.error('Error en migración SQLite -> SQL Server:', error);
  process.exit(1);
});
