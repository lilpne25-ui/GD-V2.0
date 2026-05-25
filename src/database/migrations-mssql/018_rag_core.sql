SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/*
  Migration 018 - RAG Core
  Scope:
    - Fuentes documentales versionadas para RAG
    - Chunks, embeddings, queries, retrievals, answers y feedback
    - Cola operativa y auditoria RAG
*/

IF OBJECT_ID('dbo.rag_sources', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_sources (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_sources PRIMARY KEY,
    source_hash NVARCHAR(128) NOT NULL,
    source_name NVARCHAR(255) NOT NULL,
    source_type NVARCHAR(40) NOT NULL,
    record_type_code NVARCHAR(80) NULL,
    record_id NVARCHAR(64) NULL,
    document_node_id NVARCHAR(64) NULL,
    file_name NVARCHAR(255) NULL,
    mime_type NVARCHAR(160) NULL,
    file_size_bytes BIGINT NULL,
    version INT NOT NULL CONSTRAINT DF_rag_sources_version DEFAULT 1,
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_rag_sources_status DEFAULT 'active',
    metadata_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_sources_metadata_json DEFAULT '{}',
    created_by NVARCHAR(64) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_sources_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_sources_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_sources_status CHECK (status IN ('active', 'superseded', 'archived', 'failed')),
    CONSTRAINT CK_rag_sources_source_type CHECK (source_type IN ('fp05', 'fp08', 'document', 'record', 'feedback', 'manual')),
    CONSTRAINT CK_rag_sources_metadata_json CHECK (ISJSON(metadata_json) = 1)
  );
END;

IF OBJECT_ID('dbo.rag_chunks', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_chunks (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_chunks PRIMARY KEY,
    source_id NVARCHAR(64) NOT NULL,
    chunk_hash NVARCHAR(128) NOT NULL,
    chunk_index INT NOT NULL,
    content_text NVARCHAR(MAX) NOT NULL,
    token_count INT NOT NULL CONSTRAINT DF_rag_chunks_token_count DEFAULT 0,
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_rag_chunks_status DEFAULT 'active',
    metadata_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_chunks_metadata_json DEFAULT '{}',
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_chunks_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_chunks_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_chunks_status CHECK (status IN ('active', 'superseded', 'archived', 'failed')),
    CONSTRAINT CK_rag_chunks_metadata_json CHECK (ISJSON(metadata_json) = 1),
    CONSTRAINT FK_rag_chunks_source FOREIGN KEY (source_id) REFERENCES dbo.rag_sources(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.rag_embeddings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_embeddings (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_embeddings PRIMARY KEY,
    chunk_id NVARCHAR(64) NOT NULL,
    provider NVARCHAR(80) NOT NULL,
    model NVARCHAR(160) NOT NULL,
    dims INT NOT NULL,
    embedding_hash NVARCHAR(128) NOT NULL,
    embedding_json NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_rag_embeddings_status DEFAULT 'active',
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_embeddings_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_embeddings_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_embeddings_status CHECK (status IN ('active', 'superseded', 'archived', 'failed')),
    CONSTRAINT CK_rag_embeddings_embedding_json CHECK (ISJSON(embedding_json) = 1),
    CONSTRAINT FK_rag_embeddings_chunk FOREIGN KEY (chunk_id) REFERENCES dbo.rag_chunks(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.rag_queries', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_queries (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_queries PRIMARY KEY,
    query_hash NVARCHAR(128) NOT NULL,
    query_text NVARCHAR(MAX) NOT NULL,
    normalized_query NVARCHAR(MAX) NOT NULL,
    record_type_code NVARCHAR(80) NULL,
    record_id NVARCHAR(64) NULL,
    actor_user_id NVARCHAR(64) NULL,
    actor_role NVARCHAR(255) NULL,
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_rag_queries_status DEFAULT 'completed',
    context_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_queries_context_json DEFAULT '{}',
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_queries_created_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_queries_status CHECK (status IN ('pending', 'completed', 'failed', 'cache_hit')),
    CONSTRAINT CK_rag_queries_context_json CHECK (ISJSON(context_json) = 1)
  );
END;

IF OBJECT_ID('dbo.rag_retrievals', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_retrievals (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_retrievals PRIMARY KEY,
    query_id NVARCHAR(64) NOT NULL,
    chunk_id NVARCHAR(64) NOT NULL,
    score FLOAT NOT NULL CONSTRAINT DF_rag_retrievals_score DEFAULT 0,
    rank INT NOT NULL,
    strategy NVARCHAR(80) NOT NULL,
    metadata_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_retrievals_metadata_json DEFAULT '{}',
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_retrievals_created_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_retrievals_metadata_json CHECK (ISJSON(metadata_json) = 1),
    CONSTRAINT FK_rag_retrievals_query FOREIGN KEY (query_id) REFERENCES dbo.rag_queries(id) ON DELETE CASCADE,
    CONSTRAINT FK_rag_retrievals_chunk FOREIGN KEY (chunk_id) REFERENCES dbo.rag_chunks(id)
  );
END;

IF OBJECT_ID('dbo.rag_answers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_answers (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_answers PRIMARY KEY,
    query_id NVARCHAR(64) NOT NULL,
    answer_hash NVARCHAR(128) NOT NULL,
    prompt_cache_key NVARCHAR(128) NOT NULL,
    provider NVARCHAR(80) NOT NULL,
    model NVARCHAR(160) NOT NULL,
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_rag_answers_status DEFAULT 'completed',
    cache_hit INT NOT NULL CONSTRAINT DF_rag_answers_cache_hit DEFAULT 0,
    answer_json NVARCHAR(MAX) NOT NULL,
    evidence_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_answers_evidence_json DEFAULT '[]',
    token_usage_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_answers_token_usage_json DEFAULT '{}',
    estimated_cost_usd DECIMAL(18, 6) NOT NULL CONSTRAINT DF_rag_answers_estimated_cost_usd DEFAULT 0,
    error_message NVARCHAR(MAX) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_answers_created_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_answers_status CHECK (status IN ('completed', 'failed', 'fallback', 'cache_hit')),
    CONSTRAINT CK_rag_answers_cache_hit CHECK (cache_hit IN (0, 1)),
    CONSTRAINT CK_rag_answers_answer_json CHECK (ISJSON(answer_json) = 1),
    CONSTRAINT CK_rag_answers_evidence_json CHECK (ISJSON(evidence_json) = 1),
    CONSTRAINT CK_rag_answers_token_usage_json CHECK (ISJSON(token_usage_json) = 1),
    CONSTRAINT FK_rag_answers_query FOREIGN KEY (query_id) REFERENCES dbo.rag_queries(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.rag_feedback', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_feedback (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_feedback PRIMARY KEY,
    answer_id NVARCHAR(64) NOT NULL,
    rating INT NULL,
    accepted INT NOT NULL CONSTRAINT DF_rag_feedback_accepted DEFAULT 0,
    correction_text NVARCHAR(MAX) NULL,
    correction_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_feedback_correction_json DEFAULT '{}',
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_rag_feedback_status DEFAULT 'pending',
    actor_user_id NVARCHAR(64) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_feedback_created_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_feedback_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    CONSTRAINT CK_rag_feedback_accepted CHECK (accepted IN (0, 1)),
    CONSTRAINT CK_rag_feedback_status CHECK (status IN ('pending', 'reviewed', 'applied', 'rejected')),
    CONSTRAINT CK_rag_feedback_correction_json CHECK (ISJSON(correction_json) = 1),
    CONSTRAINT FK_rag_feedback_answer FOREIGN KEY (answer_id) REFERENCES dbo.rag_answers(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.rag_tasks', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_tasks (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_tasks PRIMARY KEY,
    task_type NVARCHAR(80) NOT NULL,
    source_id NVARCHAR(64) NULL,
    record_type_code NVARCHAR(80) NULL,
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_rag_tasks_status DEFAULT 'pending',
    priority INT NOT NULL CONSTRAINT DF_rag_tasks_priority DEFAULT 100,
    attempts INT NOT NULL CONSTRAINT DF_rag_tasks_attempts DEFAULT 0,
    payload_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_tasks_payload_json DEFAULT '{}',
    error_message NVARCHAR(MAX) NULL,
    scheduled_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_tasks_scheduled_at DEFAULT SYSDATETIME(),
    started_at DATETIME2(0) NULL,
    completed_at DATETIME2(0) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_tasks_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_tasks_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_tasks_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT CK_rag_tasks_payload_json CHECK (ISJSON(payload_json) = 1),
    CONSTRAINT FK_rag_tasks_source FOREIGN KEY (source_id) REFERENCES dbo.rag_sources(id) ON DELETE SET NULL
  );
END;

IF OBJECT_ID('dbo.rag_audit_log', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.rag_audit_log (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_rag_audit_log PRIMARY KEY,
    event_type NVARCHAR(80) NOT NULL,
    entity_type NVARCHAR(80) NULL,
    entity_id NVARCHAR(64) NULL,
    record_type_code NVARCHAR(80) NULL,
    actor_user_id NVARCHAR(64) NULL,
    actor_role NVARCHAR(255) NULL,
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_rag_audit_log_status DEFAULT 'info',
    details_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_rag_audit_log_details_json DEFAULT '{}',
    error_message NVARCHAR(MAX) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_rag_audit_log_created_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_rag_audit_log_status CHECK (status IN ('info', 'warning', 'error')),
    CONSTRAINT CK_rag_audit_log_details_json CHECK (ISJSON(details_json) = 1)
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_sources') AND name = 'UX_rag_sources_hash_version')
  CREATE UNIQUE INDEX UX_rag_sources_hash_version ON dbo.rag_sources(source_hash, version);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_sources') AND name = 'idx_rag_sources_status')
  CREATE INDEX idx_rag_sources_status ON dbo.rag_sources(status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_sources') AND name = 'idx_rag_sources_created_at')
  CREATE INDEX idx_rag_sources_created_at ON dbo.rag_sources(created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_sources') AND name = 'idx_rag_sources_record_type_code')
  CREATE INDEX idx_rag_sources_record_type_code ON dbo.rag_sources(record_type_code);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_chunks') AND name = 'UX_rag_chunks_source_hash')
  CREATE UNIQUE INDEX UX_rag_chunks_source_hash ON dbo.rag_chunks(source_id, chunk_hash);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_chunks') AND name = 'idx_rag_chunks_source_id')
  CREATE INDEX idx_rag_chunks_source_id ON dbo.rag_chunks(source_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_chunks') AND name = 'idx_rag_chunks_status')
  CREATE INDEX idx_rag_chunks_status ON dbo.rag_chunks(status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_embeddings') AND name = 'UX_rag_embeddings_chunk_model')
  CREATE UNIQUE INDEX UX_rag_embeddings_chunk_model ON dbo.rag_embeddings(chunk_id, provider, model, embedding_hash);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_embeddings') AND name = 'idx_rag_embeddings_chunk_id')
  CREATE INDEX idx_rag_embeddings_chunk_id ON dbo.rag_embeddings(chunk_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_queries') AND name = 'idx_rag_queries_hash')
  CREATE INDEX idx_rag_queries_hash ON dbo.rag_queries(query_hash);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_queries') AND name = 'idx_rag_queries_record_type_code')
  CREATE INDEX idx_rag_queries_record_type_code ON dbo.rag_queries(record_type_code);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_queries') AND name = 'idx_rag_queries_created_at')
  CREATE INDEX idx_rag_queries_created_at ON dbo.rag_queries(created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_retrievals') AND name = 'idx_rag_retrievals_query_rank')
  CREATE INDEX idx_rag_retrievals_query_rank ON dbo.rag_retrievals(query_id, rank);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_answers') AND name = 'idx_rag_answers_prompt_cache_key')
  CREATE INDEX idx_rag_answers_prompt_cache_key ON dbo.rag_answers(prompt_cache_key);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_answers') AND name = 'idx_rag_answers_created_at')
  CREATE INDEX idx_rag_answers_created_at ON dbo.rag_answers(created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_feedback') AND name = 'idx_rag_feedback_answer_id')
  CREATE INDEX idx_rag_feedback_answer_id ON dbo.rag_feedback(answer_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_tasks') AND name = 'idx_rag_tasks_status_scheduled')
  CREATE INDEX idx_rag_tasks_status_scheduled ON dbo.rag_tasks(status, scheduled_at, priority);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_tasks') AND name = 'idx_rag_tasks_source_id')
  CREATE INDEX idx_rag_tasks_source_id ON dbo.rag_tasks(source_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_tasks') AND name = 'idx_rag_tasks_record_type_code')
  CREATE INDEX idx_rag_tasks_record_type_code ON dbo.rag_tasks(record_type_code);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_audit_log') AND name = 'idx_rag_audit_log_created_at')
  CREATE INDEX idx_rag_audit_log_created_at ON dbo.rag_audit_log(created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rag_audit_log') AND name = 'idx_rag_audit_log_record_type_code')
  CREATE INDEX idx_rag_audit_log_record_type_code ON dbo.rag_audit_log(record_type_code);

PRINT 'Migration 018_rag_core.sql aplicada correctamente.';

/*
Smoke SQL sugerido:

SELECT name
FROM sys.tables
WHERE name IN (
  'rag_sources', 'rag_chunks', 'rag_embeddings', 'rag_queries',
  'rag_retrievals', 'rag_answers', 'rag_feedback', 'rag_tasks', 'rag_audit_log'
)
ORDER BY name;

SELECT i.name, OBJECT_NAME(i.object_id) AS table_name
FROM sys.indexes i
WHERE OBJECT_NAME(i.object_id) LIKE 'rag_%'
  AND i.name IS NOT NULL
ORDER BY table_name, i.name;
*/
