import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

type SqlParams = any[];

let poolPromise: Promise<any> | null = null;
let activeSql: any = sql;

function envNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isTruthy(value: string | undefined, fallback: boolean): boolean {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'si', 'sí', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return fallback;
}

function getSqlConfig(): sql.config {
  const server = process.env.SGC_DB_SERVER || process.env.DB_SERVER || 'localhost';
  const database = process.env.SGC_DB_DATABASE || process.env.DB_DATABASE || 'SGC_Dev';
  const defaultPackagedUser = app.isPackaged ? 'sa' : '';
  const defaultPackagedPassword = app.isPackaged ? 'NuevaContraseña123!' : '';
  const user = process.env.SGC_DB_USER || process.env.DB_USER || defaultPackagedUser;
  const password = process.env.SGC_DB_PASSWORD || process.env.DB_PASSWORD || defaultPackagedPassword;
  const trusted = isTruthy(process.env.SGC_DB_TRUSTED, false) || (!user && !password);
  const encrypt = isTruthy(process.env.SGC_DB_ENCRYPT || process.env.DB_ENCRYPT, false);
  const trustServerCertificate = isTruthy(
    process.env.SGC_DB_TRUST_CERT || process.env.DB_TRUST_SERVER_CERTIFICATE,
    true
  );
  const port = envNumber(process.env.SGC_DB_PORT || process.env.DB_PORT, 1433);

  const base: sql.config = {
    server,
    database,
    port,
    options: {
      encrypt,
      trustServerCertificate,
      enableArithAbort: true,
    },
    pool: {
      max: envNumber(process.env.SGC_DB_POOL_MAX, 10),
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };

  if (trusted) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    activeSql = require('mssql/msnodesqlv8');
    const trustedConfig: any = {
      connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=Yes;`,
      options: {
        trustedConnection: true,
        trustServerCertificate,
      },
      pool: base.pool,
    };
    return trustedConfig as sql.config;
  } else if (user && password) {
    base.user = user;
    base.password = password;
  }

  return base;
}

async function getPool(): Promise<any> {
  if (!poolPromise) {
    const config = getSqlConfig();
    const DriverSql = activeSql;
    const pool = new DriverSql.ConnectionPool(config);
    poolPromise = pool.connect();
  }
  return poolPromise;
}

function replaceQuestionParams(rawSql: string): { sqlText: string; paramCount: number } {
  let paramCount = 0;
  let inSingle = false;
  let inDouble = false;
  let result = '';

  for (let i = 0; i < rawSql.length; i += 1) {
    const ch = rawSql[i];
    const next = rawSql[i + 1];

    if (ch === "'" && !inDouble) {
      if (inSingle && next === "'") {
        result += "''";
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      result += ch;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      result += ch;
      continue;
    }

    if (ch === '?' && !inSingle && !inDouble) {
      paramCount += 1;
      result += `@sgcp${paramCount}`;
      continue;
    }

    result += ch;
  }

  return { sqlText: result, paramCount };
}

function normalizeSqlDialect(source: string): string {
  let sqlText = source;

  sqlText = sqlText.replace(/\bWITH\s+RECURSIVE\b/gi, 'WITH');
  sqlText = sqlText.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'SYSDATETIME()');
  sqlText = sqlText.replace(/datetime\s*\(\s*"now"\s*\)/gi, 'SYSDATETIME()');
  sqlText = sqlText.replace(/\bCOLLATE\s+NOCASE\b/gi, 'COLLATE Latin1_General_CI_AI');
  sqlText = sqlText.replace(/\bdatetime\s*\(\s*([A-Za-z0-9_.]+)\s*\)/gi, '$1');

  const limitMatch = sqlText.match(/\s+LIMIT\s+(@sgcp\d+|\d+)\s*;?\s*$/i);
  if (limitMatch) {
    const limitToken = limitMatch[1];
    sqlText = sqlText.replace(/\s+LIMIT\s+(@sgcp\d+|\d+)\s*;?\s*$/i, '');

    if (!/\bORDER\s+BY\b/i.test(sqlText)) {
      sqlText += ' ORDER BY (SELECT NULL)';
    }

    sqlText += ` OFFSET 0 ROWS FETCH NEXT ${limitToken} ROWS ONLY`;
  }

  return sqlText;
}

function prepareSql(rawSql: string): { sqlText: string; paramCount: number } {
  const replaced = replaceQuestionParams(rawSql);
  const normalized = normalizeSqlDialect(replaced.sqlText);
  return { sqlText: normalized, paramCount: replaced.paramCount };
}

function bindParams(request: sql.Request, params: SqlParams = []): void {
  for (let i = 0; i < params.length; i += 1) {
    request.input(`sgcp${i + 1}`, params[i]);
  }
}

async function executeQuery<T = any>(rawSql: string, params: SqlParams = []): Promise<any> {
  const pool = await getPool();
  const { sqlText, paramCount } = prepareSql(rawSql);

  if (paramCount !== params.length) {
    throw new Error(`Parámetros SQL inconsistentes. Esperados: ${paramCount}, recibidos: ${params.length}.`);
  }

  const request = pool.request();
  bindParams(request, params);
  try {
    return await request.query(sqlText);
  } catch (error: any) {
    const msg = error?.message || String(error);
    throw new Error(`SQL execution failed: ${msg}\nSQL: ${sqlText}\nParams: ${JSON.stringify(params)}`);
  }
}

function getMigrationCandidates(filename: string): string[] {
  return [
    path.join(process.resourcesPath || '', 'migrations-mssql', filename),
    path.join(process.resourcesPath || '', 'migrations', filename),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'migrations-mssql', filename),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'migrations', filename),
    path.join(__dirname, '..', 'database', 'migrations-mssql', filename),
    path.resolve('src', 'database', 'migrations-mssql', filename),
  ];
}

function readMigrationFile(filename: string): string | null {
  const candidates = getMigrationCandidates(filename);
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, 'utf-8');
      }
    } catch {
      // try next
    }
  }
  return null;
}

export async function dbTableExists(tableName: string, schema: string = 'dbo'): Promise<boolean> {
  const row = await dbGet<{ total: number }>(
    `SELECT COUNT(1) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [schema, tableName]
  );
  return Number(row?.total || 0) > 0;
}

export async function dbHasColumn(tableName: string, columnName: string, schema: string = 'dbo'): Promise<boolean> {
  const row = await dbGet<{ total: number }>(
    `SELECT COUNT(1) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [schema, tableName, columnName]
  );
  return Number(row?.total || 0) > 0;
}

export async function runMigrations(): Promise<void> {
  const pool = await getPool();

  await pool.request().batch(`
    SET NOCOUNT ON;
    IF OBJECT_ID('dbo.schema_migrations', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.schema_migrations (
        filename NVARCHAR(255) NOT NULL PRIMARY KEY,
        executed_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
      );
    END;
  `);

  const migrationFiles = [
    '001_users_auth.sql',
    '002_modules_2.sql',
    '003_document_tree.sql',
    '004_users_auth.sql',
    '005_seed_usuarios_puestos.sql',
    '006_document_storage_disk.sql',
    '007_document_signatures.sql',
    '008_user_document_permissions.sql',
    '009_user_document_permissions_fine_grained.sql',
    '010_document_audit_log.sql',
    '011_workflow_notifications.sql',
    '012_user_email_config.sql',
    '013_document_trash.sql',
    '014_dynamic_records_engine.sql',
    '015_record_rules_engine.sql',
    '016_seed_record_type_fp05c.sql',
    '017_record_values_allow_scalar_json.sql',
    '018_rag_core.sql',
  ];

  const appliedRows = await dbAll<{ filename: string }>('SELECT filename FROM dbo.schema_migrations');
  const applied = new Set(appliedRows.map(row => row.filename));

  const executedNow: string[] = [];

  for (const filename of migrationFiles) {
    if (applied.has(filename)) continue;

    const sqlBody = readMigrationFile(filename);
    if (!sqlBody || !sqlBody.trim()) continue;

    try {
      await pool.request().batch(sqlBody);
      await dbRun('INSERT INTO dbo.schema_migrations (filename, executed_at) VALUES (?, SYSDATETIME())', [filename]);
      executedNow.push(filename);
    } catch (error: any) {
      throw new Error(`Falló migración ${filename}: ${error?.message || String(error)}`);
    }
  }

  if (executedNow.length > 0) {
    console.log(`Migraciones SQL Server ejecutadas: ${executedNow.join(', ')}`);
  } else {
    console.log('No hay migraciones SQL Server pendientes.');
  }
}

export async function dbAll<T = any>(rawSql: string, params: SqlParams = []): Promise<T[]> {
  const result = await executeQuery<T>(rawSql, params);
  return (result.recordset || []) as T[];
}

export async function dbGet<T = any>(rawSql: string, params: SqlParams = []): Promise<T | undefined> {
  const rows = await dbAll<T>(rawSql, params);
  return rows[0];
}

export async function dbRun(rawSql: string, params: SqlParams = []): Promise<{ lastID: number; changes: number }> {
  const result = await executeQuery(rawSql, params);
  const changes = Array.isArray(result.rowsAffected)
    ? result.rowsAffected.reduce((acc: number, n: number) => acc + Number(n || 0), 0)
    : 0;
  return { lastID: 0, changes };
}

export function generateId(prefix: string = ''): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${ts}${rand}` : `${ts}${rand}`;
}
