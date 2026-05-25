import { dbAll, dbGet, dbRun, generateId } from '../db';
import type {
  CreateRagAnswerInput,
  CreateRagAuditEventInput,
  CreateRagChunkInput,
  CreateRagEmbeddingInput,
  CreateRagQueryInput,
  CreateRagRetrievalInput,
  CreateRagSourceInput,
  CreateRagTaskInput,
  QueryRagSourcesInput,
  RagAnswer,
  RagAnswerStatus,
  RagAuditLog,
  RagAuditStatus,
  RagChunk,
  RagCostUsage,
  RagEmbedding,
  RagFeedback,
  RagFeedbackStatus,
  RagJsonObject,
  RagKnowledgeStats,
  RagQuery,
  RagQueryStatus,
  RagRetrieval,
  RagSource,
  RagSourceStatus,
  RagSourceType,
  RagTask,
  RagTaskStatus,
  RagTaskType,
  SubmitRagFeedbackInput,
} from '../../shared/types/rag';

type RagSourceRow = {
  id: string;
  source_hash: string;
  source_name: string;
  source_type: string;
  record_type_code: string | null;
  record_id: string | null;
  document_node_id: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  version: number;
  status: string;
  metadata_json: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type RagChunkRow = {
  id: string;
  source_id: string;
  chunk_hash: string;
  chunk_index: number;
  content_text: string;
  token_count: number;
  status: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

type RagEmbeddingRow = {
  id: string;
  chunk_id: string;
  provider: string;
  model: string;
  dims: number;
  embedding_hash: string;
  embedding_json: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type RagQueryRow = {
  id: string;
  query_hash: string;
  query_text: string;
  normalized_query: string;
  record_type_code: string | null;
  record_id: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  status: string;
  context_json: string;
  created_at: string;
};

type RagRetrievalRow = {
  id: string;
  query_id: string;
  chunk_id: string;
  score: number;
  rank: number;
  strategy: string;
  metadata_json: string;
  created_at: string;
};

type RagAnswerRow = {
  id: string;
  query_id: string;
  answer_hash: string;
  prompt_cache_key: string;
  provider: string;
  model: string;
  status: string;
  cache_hit: number | boolean;
  answer_json: string;
  evidence_json: string;
  token_usage_json: string;
  estimated_cost_usd: number;
  error_message: string | null;
  created_at: string;
};

type RagFeedbackRow = {
  id: string;
  answer_id: string;
  rating: number | null;
  accepted: number | boolean;
  correction_text: string | null;
  correction_json: string;
  status: string;
  actor_user_id: string | null;
  created_at: string;
};

type RagTaskRow = {
  id: string;
  task_type: string;
  source_id: string | null;
  record_type_code: string | null;
  status: string;
  priority: number;
  attempts: number;
  payload_json: string;
  error_message: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type RagAuditLogRow = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  record_type_code: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  status: string;
  details_json: string;
  error_message: string | null;
  created_at: string;
};

type RagCostUsageRow = {
  daily_cost_usd: number | null;
  monthly_cost_usd: number | null;
  daily_answer_count: number | null;
  monthly_answer_count: number | null;
};

type RagKnowledgeStatsRow = {
  active_sources: number | null;
  active_chunks: number | null;
  active_embeddings: number | null;
  latest_source_at: string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function safeLimit(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

function safeJsonStringify(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback));
  } catch {
    return fallback;
  }
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toBool(value: unknown): boolean {
  return value === true || Number(value) === 1;
}

function mapSource(row: RagSourceRow): RagSource {
  return {
    id: row.id,
    sourceHash: row.source_hash,
    sourceName: row.source_name,
    sourceType: row.source_type as RagSourceType,
    recordTypeCode: row.record_type_code,
    recordId: row.record_id,
    documentNodeId: row.document_node_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes === null ? null : Number(row.file_size_bytes),
    version: Number(row.version || 1),
    status: row.status as RagSourceStatus,
    metadata: safeJsonParse<RagJsonObject>(row.metadata_json, {}),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChunk(row: RagChunkRow): RagChunk {
  return {
    id: row.id,
    sourceId: row.source_id,
    chunkHash: row.chunk_hash,
    chunkIndex: Number(row.chunk_index || 0),
    contentText: row.content_text,
    tokenCount: Number(row.token_count || 0),
    status: row.status as RagSourceStatus,
    metadata: safeJsonParse<RagJsonObject>(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEmbedding(row: RagEmbeddingRow): RagEmbedding {
  const parsed = safeJsonParse<unknown[]>(row.embedding_json, []);
  return {
    id: row.id,
    chunkId: row.chunk_id,
    provider: row.provider,
    model: row.model,
    dims: Number(row.dims || 0),
    embeddingHash: row.embedding_hash,
    embedding: parsed.map(Number).filter(value => Number.isFinite(value)),
    status: row.status as RagSourceStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuery(row: RagQueryRow): RagQuery {
  return {
    id: row.id,
    queryHash: row.query_hash,
    queryText: row.query_text,
    normalizedQuery: row.normalized_query,
    recordTypeCode: row.record_type_code,
    recordId: row.record_id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    status: row.status as RagQueryStatus,
    context: safeJsonParse<RagJsonObject>(row.context_json, {}),
    createdAt: row.created_at,
  };
}

function mapRetrieval(row: RagRetrievalRow): RagRetrieval {
  return {
    id: row.id,
    queryId: row.query_id,
    chunkId: row.chunk_id,
    score: Number(row.score || 0),
    rank: Number(row.rank || 0),
    strategy: row.strategy,
    metadata: safeJsonParse<RagJsonObject>(row.metadata_json, {}),
    createdAt: row.created_at,
  };
}

function mapAnswer(row: RagAnswerRow): RagAnswer {
  return {
    id: row.id,
    queryId: row.query_id,
    answerHash: row.answer_hash,
    promptCacheKey: row.prompt_cache_key,
    provider: row.provider,
    model: row.model,
    status: row.status as RagAnswerStatus,
    cacheHit: toBool(row.cache_hit),
    answer: safeJsonParse<RagJsonObject>(row.answer_json, {}),
    evidence: safeJsonParse<unknown[]>(row.evidence_json, []),
    tokenUsage: safeJsonParse<RagJsonObject>(row.token_usage_json, {}),
    estimatedCostUsd: Number(row.estimated_cost_usd || 0),
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function mapFeedback(row: RagFeedbackRow): RagFeedback {
  return {
    id: row.id,
    answerId: row.answer_id,
    rating: row.rating === null ? null : Number(row.rating),
    accepted: toBool(row.accepted),
    correctionText: row.correction_text,
    correction: safeJsonParse<RagJsonObject>(row.correction_json, {}),
    status: row.status as RagFeedbackStatus,
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
  };
}

function mapTask(row: RagTaskRow): RagTask {
  return {
    id: row.id,
    taskType: row.task_type as RagTaskType,
    sourceId: row.source_id,
    recordTypeCode: row.record_type_code,
    status: row.status as RagTaskStatus,
    priority: Number(row.priority || 100),
    attempts: Number(row.attempts || 0),
    payload: safeJsonParse<RagJsonObject>(row.payload_json, {}),
    errorMessage: row.error_message,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAuditLog(row: RagAuditLogRow): RagAuditLog {
  return {
    id: row.id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    recordTypeCode: row.record_type_code,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    status: row.status as RagAuditStatus,
    details: safeJsonParse<RagJsonObject>(row.details_json, {}),
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export const RagRepo = {
  async createSource(input: CreateRagSourceInput): Promise<string> {
    const id = generateId('ragsrc');
    const sourceHash = normalizeText(input.sourceHash);
    const sourceName = normalizeText(input.sourceName);
    if (!sourceHash) throw new Error('sourceHash es obligatorio.');
    if (!sourceName) throw new Error('sourceName es obligatorio.');

    await dbRun(
      `INSERT INTO dbo.rag_sources (
         id, source_hash, source_name, source_type, record_type_code, record_id,
         document_node_id, file_name, mime_type, file_size_bytes, version, status,
         metadata_json, created_by, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME(), SYSDATETIME())`,
      [
        id,
        sourceHash,
        sourceName,
        input.sourceType,
        normalizeText(input.recordTypeCode) || null,
        normalizeText(input.recordId) || null,
        normalizeText(input.documentNodeId) || null,
        normalizeText(input.fileName) || null,
        normalizeText(input.mimeType) || null,
        input.fileSizeBytes ?? null,
        Number.isFinite(Number(input.version)) ? Math.max(1, Number(input.version)) : 1,
        input.status || 'active',
        safeJsonStringify(input.metadata || {}, '{}'),
        normalizeText(input.createdBy) || null,
      ]
    );

    return id;
  },

  async getSourceById(id: string): Promise<RagSource | null> {
    const row = await dbGet<RagSourceRow>('SELECT * FROM dbo.rag_sources WHERE id = ?', [normalizeText(id)]);
    return row ? mapSource(row) : null;
  },

  async getSourceByHash(sourceHash: string): Promise<RagSource | null> {
    const row = await dbGet<RagSourceRow>(
      `SELECT TOP 1 *
       FROM dbo.rag_sources
       WHERE source_hash = ?
       ORDER BY version DESC, created_at DESC`,
      [normalizeText(sourceHash)]
    );
    return row ? mapSource(row) : null;
  },

  async listSources(input: QueryRagSourcesInput = {}): Promise<RagSource[]> {
    const limit = safeLimit(input.limit, 50, 500);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (input.sourceType) {
      conditions.push('source_type = ?');
      params.push(input.sourceType);
    }
    if (input.recordTypeCode) {
      conditions.push('record_type_code = ?');
      params.push(normalizeText(input.recordTypeCode));
    }
    if (input.status) {
      conditions.push('status = ?');
      params.push(input.status);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbAll<RagSourceRow>(
      `SELECT TOP (${limit}) *
       FROM dbo.rag_sources
       ${whereSql}
       ORDER BY created_at DESC`
      , params
    );

    return rows.map(mapSource);
  },

  async createChunk(input: CreateRagChunkInput): Promise<string> {
    const id = generateId('ragchk');
    const sourceId = normalizeText(input.sourceId);
    const chunkHash = normalizeText(input.chunkHash);
    if (!sourceId) throw new Error('sourceId es obligatorio.');
    if (!chunkHash) throw new Error('chunkHash es obligatorio.');

    await dbRun(
      `INSERT INTO dbo.rag_chunks (
         id, source_id, chunk_hash, chunk_index, content_text, token_count, status,
         metadata_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME(), SYSDATETIME())`,
      [
        id,
        sourceId,
        chunkHash,
        Math.max(0, Number(input.chunkIndex || 0)),
        String(input.contentText || ''),
        Math.max(0, Number(input.tokenCount || 0)),
        input.status || 'active',
        safeJsonStringify(input.metadata || {}, '{}'),
      ]
    );

    return id;
  },

  async listChunksBySource(sourceId: string): Promise<RagChunk[]> {
    const rows = await dbAll<RagChunkRow>(
      `SELECT *
       FROM dbo.rag_chunks
       WHERE source_id = ?
       ORDER BY chunk_index ASC`,
      [normalizeText(sourceId)]
    );
    return rows.map(mapChunk);
  },

  async getChunkById(id: string): Promise<RagChunk | null> {
    const row = await dbGet<RagChunkRow>(
      `SELECT *
       FROM dbo.rag_chunks
       WHERE id = ?`,
      [normalizeText(id)]
    );
    return row ? mapChunk(row) : null;
  },

  async createEmbedding(input: CreateRagEmbeddingInput): Promise<string> {
    const id = generateId('ragemb');
    if (!normalizeText(input.chunkId)) throw new Error('chunkId es obligatorio.');
    if (!normalizeText(input.provider)) throw new Error('provider es obligatorio.');
    if (!normalizeText(input.model)) throw new Error('model es obligatorio.');
    if (!Array.isArray(input.embedding) || input.embedding.length === 0) {
      throw new Error('embedding debe ser un arreglo numerico.');
    }

    await dbRun(
      `INSERT INTO dbo.rag_embeddings (
         id, chunk_id, provider, model, dims, embedding_hash, embedding_json, status,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME(), SYSDATETIME())`,
      [
        id,
        normalizeText(input.chunkId),
        normalizeText(input.provider),
        normalizeText(input.model),
        Math.max(1, Number(input.dims || input.embedding.length)),
        normalizeText(input.embeddingHash),
        safeJsonStringify(input.embedding, '[]'),
        input.status || 'active',
      ]
    );

    return id;
  },

  async listEmbeddingsByChunk(chunkId: string): Promise<RagEmbedding[]> {
    const rows = await dbAll<RagEmbeddingRow>(
      `SELECT *
       FROM dbo.rag_embeddings
       WHERE chunk_id = ?
       ORDER BY created_at DESC`,
      [normalizeText(chunkId)]
    );
    return rows.map(mapEmbedding);
  },

  async createQuery(input: CreateRagQueryInput): Promise<string> {
    const id = generateId('ragqry');
    const queryHash = normalizeText(input.queryHash);
    const queryText = String(input.queryText || '').trim();
    if (!queryHash) throw new Error('queryHash es obligatorio.');
    if (!queryText) throw new Error('queryText es obligatorio.');

    await dbRun(
      `INSERT INTO dbo.rag_queries (
         id, query_hash, query_text, normalized_query, record_type_code, record_id,
         actor_user_id, actor_role, status, context_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME())`,
      [
        id,
        queryHash,
        queryText,
        normalizeText(input.normalizedQuery) || queryText.toLowerCase(),
        normalizeText(input.recordTypeCode) || null,
        normalizeText(input.recordId) || null,
        normalizeText(input.actorUserId) || null,
        normalizeText(input.actorRole) || null,
        input.status || 'completed',
        safeJsonStringify(input.context || {}, '{}'),
      ]
    );

    return id;
  },

  async createRetrieval(input: CreateRagRetrievalInput): Promise<string> {
    const id = generateId('ragret');
    await dbRun(
      `INSERT INTO dbo.rag_retrievals (
         id, query_id, chunk_id, score, [rank], strategy, metadata_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, SYSDATETIME())`,
      [
        id,
        normalizeText(input.queryId),
        normalizeText(input.chunkId),
        Number(input.score || 0),
        Math.max(1, Number(input.rank || 1)),
        normalizeText(input.strategy) || 'baseline',
        safeJsonStringify(input.metadata || {}, '{}'),
      ]
    );
    return id;
  },

  async listRetrievalsByQuery(queryId: string): Promise<RagRetrieval[]> {
    const rows = await dbAll<RagRetrievalRow>(
      `SELECT *
       FROM dbo.rag_retrievals
       WHERE query_id = ?
       ORDER BY [rank] ASC`,
      [normalizeText(queryId)]
    );
    return rows.map(mapRetrieval);
  },

  async createAnswer(input: CreateRagAnswerInput): Promise<string> {
    const id = generateId('ragans');
    await dbRun(
      `INSERT INTO dbo.rag_answers (
         id, query_id, answer_hash, prompt_cache_key, provider, model, status,
         cache_hit, answer_json, evidence_json, token_usage_json, estimated_cost_usd,
         error_message, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME())`,
      [
        id,
        normalizeText(input.queryId),
        normalizeText(input.answerHash),
        normalizeText(input.promptCacheKey),
        normalizeText(input.provider),
        normalizeText(input.model),
        input.status || (input.cacheHit ? 'cache_hit' : 'completed'),
        input.cacheHit ? 1 : 0,
        safeJsonStringify(input.answer || {}, '{}'),
        safeJsonStringify(input.evidence || [], '[]'),
        safeJsonStringify(input.tokenUsage || {}, '{}'),
        Number(input.estimatedCostUsd || 0),
        normalizeText(input.errorMessage) || null,
      ]
    );
    return id;
  },

  async getAnswerById(id: string): Promise<RagAnswer | null> {
    const row = await dbGet<RagAnswerRow>('SELECT * FROM dbo.rag_answers WHERE id = ?', [normalizeText(id)]);
    return row ? mapAnswer(row) : null;
  },

  async getCachedAnswer(promptCacheKey: string): Promise<RagAnswer | null> {
    const row = await dbGet<RagAnswerRow>(
      `SELECT TOP 1 *
       FROM dbo.rag_answers
       WHERE prompt_cache_key = ?
         AND status IN ('completed', 'cache_hit')
       ORDER BY created_at DESC`,
      [normalizeText(promptCacheKey)]
    );
    return row ? mapAnswer(row) : null;
  },

  async submitFeedback(input: SubmitRagFeedbackInput): Promise<string> {
    const id = generateId('ragfb');
    await dbRun(
      `INSERT INTO dbo.rag_feedback (
         id, answer_id, rating, accepted, correction_text, correction_json, status,
         actor_user_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME())`,
      [
        id,
        normalizeText(input.answerId),
        input.rating ?? null,
        input.accepted ? 1 : 0,
        normalizeText(input.correctionText) || null,
        safeJsonStringify(input.correction || {}, '{}'),
        input.status || 'pending',
        normalizeText(input.actorUserId) || null,
      ]
    );
    return id;
  },

  async listFeedbackByAnswer(answerId: string): Promise<RagFeedback[]> {
    const rows = await dbAll<RagFeedbackRow>(
      `SELECT *
       FROM dbo.rag_feedback
       WHERE answer_id = ?
       ORDER BY created_at DESC`,
      [normalizeText(answerId)]
    );
    return rows.map(mapFeedback);
  },

  async createTask(input: CreateRagTaskInput): Promise<string> {
    const id = generateId('ragtask');
    await dbRun(
      `INSERT INTO dbo.rag_tasks (
         id, task_type, source_id, record_type_code, status, priority, attempts,
         payload_json, scheduled_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, COALESCE(TRY_CONVERT(DATETIME2(0), ?), SYSDATETIME()), SYSDATETIME(), SYSDATETIME())`,
      [
        id,
        input.taskType,
        normalizeText(input.sourceId) || null,
        normalizeText(input.recordTypeCode) || null,
        input.status || 'pending',
        Number.isFinite(Number(input.priority)) ? Number(input.priority) : 100,
        safeJsonStringify(input.payload || {}, '{}'),
        normalizeText(input.scheduledAt) || null,
      ]
    );
    return id;
  },

  async getNextPendingTask(): Promise<RagTask | null> {
    const row = await dbGet<RagTaskRow>(
      `SELECT TOP 1 *
       FROM dbo.rag_tasks
       WHERE status = 'pending'
         AND scheduled_at <= SYSDATETIME()
       ORDER BY priority ASC, scheduled_at ASC, created_at ASC`
    );
    return row ? mapTask(row) : null;
  },

  async markTaskRunning(taskId: string): Promise<void> {
    await dbRun(
      `UPDATE dbo.rag_tasks
       SET status = 'running',
           attempts = attempts + 1,
           started_at = COALESCE(started_at, SYSDATETIME()),
           updated_at = SYSDATETIME()
       WHERE id = ?`,
      [normalizeText(taskId)]
    );
  },

  async completeTask(taskId: string): Promise<void> {
    await dbRun(
      `UPDATE dbo.rag_tasks
       SET status = 'completed',
           completed_at = SYSDATETIME(),
           updated_at = SYSDATETIME(),
           error_message = NULL
       WHERE id = ?`,
      [normalizeText(taskId)]
    );
  },

  async failTask(taskId: string, errorMessage: string): Promise<void> {
    await dbRun(
      `UPDATE dbo.rag_tasks
       SET status = 'failed',
           error_message = ?,
           updated_at = SYSDATETIME()
       WHERE id = ?`,
      [normalizeText(errorMessage), normalizeText(taskId)]
    );
  },

  async writeAuditEvent(input: CreateRagAuditEventInput): Promise<string> {
    const id = generateId('ragaud');
    await dbRun(
      `INSERT INTO dbo.rag_audit_log (
         id, event_type, entity_type, entity_id, record_type_code, actor_user_id,
         actor_role, status, details_json, error_message, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME())`,
      [
        id,
        normalizeText(input.eventType),
        normalizeText(input.entityType) || null,
        normalizeText(input.entityId) || null,
        normalizeText(input.recordTypeCode) || null,
        normalizeText(input.actorUserId) || null,
        normalizeText(input.actorRole) || null,
        input.status || 'info',
        safeJsonStringify(input.details || {}, '{}'),
        normalizeText(input.errorMessage) || null,
      ]
    );
    return id;
  },

  async listAuditEvents(limitInput: number = 100): Promise<RagAuditLog[]> {
    const limit = safeLimit(limitInput, 100, 500);
    const rows = await dbAll<RagAuditLogRow>(
      `SELECT TOP (${limit}) *
       FROM dbo.rag_audit_log
       ORDER BY created_at DESC`
    );
    return rows.map(mapAuditLog);
  },

  async countAuditEventsSince(input: {
    eventType: string;
    actorUserId?: string | null;
    sinceIso: string;
  }): Promise<number> {
    const conditions = ['event_type = ?', 'created_at >= TRY_CONVERT(DATETIME2(0), ?)'];
    const params: unknown[] = [normalizeText(input.eventType), normalizeText(input.sinceIso)];

    if (normalizeText(input.actorUserId)) {
      conditions.push('actor_user_id = ?');
      params.push(normalizeText(input.actorUserId));
    }

    const row = await dbGet<{ total: number }>(
      `SELECT COUNT(1) AS total
       FROM dbo.rag_audit_log
       WHERE ${conditions.join(' AND ')}`,
      params
    );
    return Number(row?.total || 0);
  },

  async getCostUsage(): Promise<RagCostUsage> {
    const row = await dbGet<RagCostUsageRow>(
      `SELECT
         COALESCE(SUM(CASE WHEN created_at >= DATEADD(DAY, DATEDIFF(DAY, 0, SYSDATETIME()), 0)
           THEN estimated_cost_usd ELSE 0 END), 0) AS daily_cost_usd,
         COALESCE(SUM(CASE WHEN created_at >= DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)
           THEN estimated_cost_usd ELSE 0 END), 0) AS monthly_cost_usd,
         COALESCE(SUM(CASE WHEN created_at >= DATEADD(DAY, DATEDIFF(DAY, 0, SYSDATETIME()), 0)
           THEN 1 ELSE 0 END), 0) AS daily_answer_count,
         COALESCE(SUM(CASE WHEN created_at >= DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)
           THEN 1 ELSE 0 END), 0) AS monthly_answer_count
       FROM dbo.rag_answers`
    );

    return {
      dailyCostUsd: Number(row?.daily_cost_usd || 0),
      monthlyCostUsd: Number(row?.monthly_cost_usd || 0),
      dailyAnswerCount: Number(row?.daily_answer_count || 0),
      monthlyAnswerCount: Number(row?.monthly_answer_count || 0),
    };
  },

  async getKnowledgeStats(): Promise<RagKnowledgeStats> {
    const row = await dbGet<RagKnowledgeStatsRow>(
      `SELECT
         (SELECT COUNT(1) FROM dbo.rag_sources WHERE status = 'active') AS active_sources,
         (SELECT COUNT(1) FROM dbo.rag_chunks WHERE status = 'active') AS active_chunks,
         (SELECT COUNT(1) FROM dbo.rag_embeddings WHERE status = 'active') AS active_embeddings,
         (SELECT CONVERT(NVARCHAR(30), MAX(updated_at), 126) FROM dbo.rag_sources WHERE status = 'active') AS latest_source_at`
    );

    return {
      activeSources: Number(row?.active_sources || 0),
      activeChunks: Number(row?.active_chunks || 0),
      activeEmbeddings: Number(row?.active_embeddings || 0),
      latestSourceAt: row?.latest_source_at || null,
    };
  },
};
