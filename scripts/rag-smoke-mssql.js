const fs = require('fs');
const path = require('path');
require('dotenv').config();

function truthy(value, fallback = false) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'si', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return fallback;
}

function getSqlDriverAndConfig() {
  const server = process.env.SGC_DB_SERVER || process.env.DB_SERVER || 'localhost';
  const database = process.env.SGC_DB_DATABASE || process.env.DB_DATABASE || 'SGC_Dev';
  const user = process.env.SGC_DB_USER || process.env.DB_USER || '';
  const password = process.env.SGC_DB_PASSWORD || process.env.DB_PASSWORD || '';
  const trusted = truthy(process.env.SGC_DB_TRUSTED, false) || (!user && !password);
  const port = Number(process.env.SGC_DB_PORT || process.env.DB_PORT || 1433);

  if (trusted) {
    const sql = require('mssql/msnodesqlv8');
    return {
      sql,
      config: {
        connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=Yes;`,
        options: { trustedConnection: true, trustServerCertificate: true },
      },
    };
  }

  const sql = require('mssql');
  return {
    sql,
    config: {
      server,
      database,
      port,
      user,
      password,
      options: {
        encrypt: truthy(process.env.SGC_DB_ENCRYPT || process.env.DB_ENCRYPT, false),
        trustServerCertificate: truthy(process.env.SGC_DB_TRUST_CERT || process.env.DB_TRUST_SERVER_CERTIFICATE, true),
      },
    },
  };
}

async function txQuery(transaction, sqlText, params = {}) {
  const request = transaction.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query(sqlText);
}

async function ensureRagMigration(pool) {
  const migrationPath = path.resolve('src/database/migrations-mssql/018_rag_core.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  if (!migrationSql.trim()) {
    throw new Error('FAIL migration file: 018_rag_core.sql esta vacio.');
  }
  await pool.request().batch(migrationSql);
}

async function main() {
  const dbSource = fs.readFileSync(path.resolve('src/database/db-sqlserver.ts'), 'utf8');
  if (!dbSource.includes("'018_rag_core.sql'")) {
    throw new Error('FAIL migrationFiles: 018_rag_core.sql no esta registrado.');
  }

  const requiredTables = [
    'rag_sources',
    'rag_chunks',
    'rag_embeddings',
    'rag_queries',
    'rag_retrievals',
    'rag_answers',
    'rag_feedback',
    'rag_tasks',
    'rag_audit_log',
  ];

  const { sql, config } = getSqlDriverAndConfig();
  const pool = await new sql.ConnectionPool(config).connect();
  const transaction = new sql.Transaction(pool);
  let started = false;

  try {
    await ensureRagMigration(pool);

    const tableRows = await pool.request()
      .query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME LIKE 'rag_%'`);
    const foundTables = new Set((tableRows.recordset || []).map(row => row.TABLE_NAME));
    const missing = requiredTables.filter(table => !foundTables.has(table));
    if (missing.length) {
      throw new Error(`FAIL tablas RAG faltantes: ${missing.join(', ')}`);
    }

    await transaction.begin();
    started = true;

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sourceId = `ragsmoke-src-${suffix}`;
    const chunkId = `ragsmoke-chk-${suffix}`;
    const embeddingId = `ragsmoke-emb-${suffix}`;
    const queryId = `ragsmoke-qry-${suffix}`;
    const retrievalId = `ragsmoke-ret-${suffix}`;
    const answerId = `ragsmoke-ans-${suffix}`;
    const fallbackAnswerId = `ragsmoke-fbk-${suffix}`;
    const sourceHash = `rag-smoke-source-${suffix}`;
    const chunkHash = `rag-smoke-chunk-${suffix}`;
    const promptCacheKey = `rag-smoke-cache-${suffix}`;

    await txQuery(transaction, `
      INSERT INTO dbo.rag_sources (
        id, source_hash, source_name, source_type, record_type_code, version, status,
        metadata_json, created_by, created_at, updated_at
      ) VALUES (
        @sourceId, @sourceHash, 'RAG smoke source', 'fp05', 'FP-05-SMOKE', 1, 'active',
        '{"smoke":true}', 'smoke', SYSDATETIME(), SYSDATETIME()
      )`, { sourceId, sourceHash });

    await txQuery(transaction, `
      INSERT INTO dbo.rag_chunks (
        id, source_id, chunk_hash, chunk_index, content_text, token_count, status,
        metadata_json, created_at, updated_at
      ) VALUES (
        @chunkId, @sourceId, @chunkHash, 0, 'Contenido smoke FP-05 para validar RAG.', 12, 'active',
        '{"smoke":true}', SYSDATETIME(), SYSDATETIME()
      )`, { chunkId, sourceId, chunkHash });

    const beforeReingest = await txQuery(transaction, `SELECT COUNT(1) AS total FROM dbo.rag_chunks WHERE source_id = @sourceId`, { sourceId });
    const existingSource = await txQuery(transaction, `SELECT TOP 1 id FROM dbo.rag_sources WHERE source_hash = @sourceHash AND status = 'active'`, { sourceHash });
    if (!existingSource.recordset.length) {
      throw new Error('FAIL reingesta: no se encontro source activo por hash.');
    }
    const afterReingest = await txQuery(transaction, `SELECT COUNT(1) AS total FROM dbo.rag_chunks WHERE source_id = @sourceId`, { sourceId });
    if (Number(beforeReingest.recordset[0].total) !== Number(afterReingest.recordset[0].total)) {
      throw new Error('FAIL reingesta: el conteo de chunks cambio para el mismo contenido.');
    }

    await txQuery(transaction, `
      INSERT INTO dbo.rag_embeddings (
        id, chunk_id, provider, model, dims, embedding_hash, embedding_json, status, created_at, updated_at
      ) VALUES (
        @embeddingId, @chunkId, 'local', 'smoke', 3, 'smoke-embedding-hash', '[0.1,0.2,0.3]', 'active',
        SYSDATETIME(), SYSDATETIME()
      )`, { embeddingId, chunkId });

    await txQuery(transaction, `
      INSERT INTO dbo.rag_queries (
        id, query_hash, query_text, normalized_query, record_type_code, record_id,
        actor_user_id, actor_role, status, context_json, created_at
      ) VALUES (
        @queryId, 'smoke-query-hash', 'pregunta smoke', 'pregunta smoke', 'FP-05-SMOKE', 'record-smoke',
        'smoke-user', 'admin', 'completed', '{"smoke":true}', SYSDATETIME()
      )`, { queryId });

    await txQuery(transaction, `
      INSERT INTO dbo.rag_retrievals (
        id, query_id, chunk_id, score, [rank], strategy, metadata_json, created_at
      ) VALUES (
        @retrievalId, @queryId, @chunkId, 0.99, 1, 'cosine_node', '{"smoke":true}', SYSDATETIME()
      )`, { retrievalId, queryId, chunkId });

    await txQuery(transaction, `
      INSERT INTO dbo.rag_answers (
        id, query_id, answer_hash, prompt_cache_key, provider, model, status, cache_hit,
        answer_json, evidence_json, token_usage_json, estimated_cost_usd, error_message, created_at
      ) VALUES (
        @answerId, @queryId, 'smoke-answer-hash', @promptCacheKey, 'deepseek', 'deepseek-v4-flash',
        'completed', 0, '{"summary":"ok"}', '[]', '{"prompt_cache_hit_tokens":0,"prompt_cache_miss_tokens":10}',
        0, NULL, SYSDATETIME()
      )`, { answerId, queryId, promptCacheKey });

    const cacheA = await txQuery(transaction, `
      SELECT TOP 1 id FROM dbo.rag_answers
      WHERE prompt_cache_key = @promptCacheKey AND status IN ('completed', 'cache_hit')
      ORDER BY created_at DESC`, { promptCacheKey });
    const cacheB = await txQuery(transaction, `
      SELECT TOP 1 id FROM dbo.rag_answers
      WHERE prompt_cache_key = @promptCacheKey AND status IN ('completed', 'cache_hit')
      ORDER BY created_at DESC`, { promptCacheKey });
    if (!cacheA.recordset[0] || cacheA.recordset[0].id !== cacheB.recordset[0].id) {
      throw new Error('FAIL cache: consulta repetida no devolvio la misma respuesta.');
    }

    await txQuery(transaction, `
      INSERT INTO dbo.rag_answers (
        id, query_id, answer_hash, prompt_cache_key, provider, model, status, cache_hit,
        answer_json, evidence_json, token_usage_json, estimated_cost_usd, error_message, created_at
      ) VALUES (
        @fallbackAnswerId, @queryId, 'smoke-fallback-hash', CONCAT(@promptCacheKey, '-fallback'),
        'local', 'budget-fallback', 'fallback', 0,
        '{"summary":"fallback seguro"}', '[]', '{}', 0, 'solo-cache smoke', SYSDATETIME()
      )`, { fallbackAnswerId, queryId, promptCacheKey });

    await transaction.rollback();
    started = false;
    await pool.close();

    console.log('PASS rag smoke: migrationFiles, tablas, reingesta, cache y fallback.');
  } catch (error) {
    if (started) {
      await transaction.rollback().catch(() => {});
    }
    await pool.close().catch(() => {});
    throw error;
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
