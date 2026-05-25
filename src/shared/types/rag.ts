export type RagSourceType = 'fp05' | 'fp08' | 'document' | 'record' | 'feedback' | 'manual';

export type RagSourceStatus = 'active' | 'superseded' | 'archived' | 'failed';

export type RagQueryStatus = 'pending' | 'completed' | 'failed' | 'cache_hit';

export type RagAnswerStatus = 'completed' | 'failed' | 'fallback' | 'cache_hit';

export type RagFeedbackStatus = 'pending' | 'reviewed' | 'applied' | 'rejected';

export type RagTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type RagAuditStatus = 'info' | 'warning' | 'error';

export type RagTaskType =
  | 'ingest_document'
  | 'embed_source'
  | 'reindex_source'
  | 'analyze_record'
  | 'consolidate_feedback';

export type RagJsonObject = Record<string, unknown>;

export interface RagSource {
  id: string;
  sourceHash: string;
  sourceName: string;
  sourceType: RagSourceType;
  recordTypeCode: string | null;
  recordId: string | null;
  documentNodeId: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  version: number;
  status: RagSourceStatus;
  metadata: RagJsonObject;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RagChunk {
  id: string;
  sourceId: string;
  chunkHash: string;
  chunkIndex: number;
  contentText: string;
  tokenCount: number;
  status: RagSourceStatus;
  metadata: RagJsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface RagEmbedding {
  id: string;
  chunkId: string;
  provider: string;
  model: string;
  dims: number;
  embeddingHash: string;
  embedding: number[];
  status: RagSourceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RagQuery {
  id: string;
  queryHash: string;
  queryText: string;
  normalizedQuery: string;
  recordTypeCode: string | null;
  recordId: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  status: RagQueryStatus;
  context: RagJsonObject;
  createdAt: string;
}

export interface RagRetrieval {
  id: string;
  queryId: string;
  chunkId: string;
  score: number;
  rank: number;
  strategy: string;
  metadata: RagJsonObject;
  createdAt: string;
}

export interface RagAnswer {
  id: string;
  queryId: string;
  answerHash: string;
  promptCacheKey: string;
  provider: string;
  model: string;
  status: RagAnswerStatus;
  cacheHit: boolean;
  answer: RagJsonObject;
  evidence: unknown[];
  tokenUsage: RagJsonObject;
  estimatedCostUsd: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface RagFeedback {
  id: string;
  answerId: string;
  rating: number | null;
  accepted: boolean;
  correctionText: string | null;
  correction: RagJsonObject;
  status: RagFeedbackStatus;
  actorUserId: string | null;
  createdAt: string;
}

export interface RagTask {
  id: string;
  taskType: RagTaskType;
  sourceId: string | null;
  recordTypeCode: string | null;
  status: RagTaskStatus;
  priority: number;
  attempts: number;
  payload: RagJsonObject;
  errorMessage: string | null;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RagAuditLog {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  recordTypeCode: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  status: RagAuditStatus;
  details: RagJsonObject;
  errorMessage: string | null;
  createdAt: string;
}

export interface CreateRagSourceInput {
  sourceHash: string;
  sourceName: string;
  sourceType: RagSourceType;
  recordTypeCode?: string | null;
  recordId?: string | null;
  documentNodeId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  version?: number;
  status?: RagSourceStatus;
  metadata?: RagJsonObject;
  createdBy?: string | null;
}

export interface CreateRagChunkInput {
  sourceId: string;
  chunkHash: string;
  chunkIndex: number;
  contentText: string;
  tokenCount?: number;
  status?: RagSourceStatus;
  metadata?: RagJsonObject;
}

export interface CreateRagEmbeddingInput {
  chunkId: string;
  provider: string;
  model: string;
  dims: number;
  embeddingHash: string;
  embedding: number[];
  status?: RagSourceStatus;
}

export interface CreateRagQueryInput {
  queryHash: string;
  queryText: string;
  normalizedQuery?: string;
  recordTypeCode?: string | null;
  recordId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  status?: RagQueryStatus;
  context?: RagJsonObject;
}

export interface CreateRagRetrievalInput {
  queryId: string;
  chunkId: string;
  score: number;
  rank: number;
  strategy: string;
  metadata?: RagJsonObject;
}

export interface CreateRagAnswerInput {
  queryId: string;
  answerHash: string;
  promptCacheKey: string;
  provider: string;
  model: string;
  status?: RagAnswerStatus;
  cacheHit?: boolean;
  answer: RagJsonObject;
  evidence?: unknown[];
  tokenUsage?: RagJsonObject;
  estimatedCostUsd?: number;
  errorMessage?: string | null;
}

export interface SubmitRagFeedbackInput {
  answerId: string;
  rating?: number | null;
  accepted?: boolean;
  correctionText?: string | null;
  correction?: RagJsonObject;
  status?: RagFeedbackStatus;
  actorUserId?: string | null;
}

export interface CreateRagTaskInput {
  taskType: RagTaskType;
  sourceId?: string | null;
  recordTypeCode?: string | null;
  status?: RagTaskStatus;
  priority?: number;
  payload?: RagJsonObject;
  scheduledAt?: string;
}

export interface CreateRagAuditEventInput {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  recordTypeCode?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  status?: RagAuditStatus;
  details?: RagJsonObject;
  errorMessage?: string | null;
}

export interface QueryRagSourcesInput {
  sourceType?: RagSourceType;
  recordTypeCode?: string;
  status?: RagSourceStatus;
  limit?: number;
}

export interface AnalyzeRagRecordInput {
  recordId: string;
  recordTypeId?: string;
  recordTypeCode?: string;
  actorUserId: string;
  actorRole: string;
  forceRefresh?: boolean;
}

export interface IngestRagDocumentNodeInput {
  nodeId: string;
  recordTypeCode?: string;
  actorUserId: string;
  actorRole: string;
}

export interface GetRagAnswerInput {
  answerId?: string;
  promptCacheKey?: string;
}

export interface GetRagEvidenceInput {
  queryId?: string;
  answerId?: string;
}

export interface RagIngestDocumentNodeResult {
  sourceId: string;
  sourceHash: string;
  reused: boolean;
  chunkCount: number;
  embeddingCount: number;
  warnings: string[];
  metadata: RagJsonObject;
}

export interface RagAnalyzeRecordResult {
  queryId: string;
  answerId: string;
  answer: RagAnswer | null;
  cacheHit: boolean;
  fallback: boolean;
  retrievalCount: number;
  contextTokenEstimate: number;
  provider: string;
  model: string;
}

export interface RagChunkEvidence {
  retrieval: RagRetrieval;
  chunk: RagChunk | null;
}

export interface RagEvidenceResult {
  queryId: string | null;
  answer: RagAnswer | null;
  items: RagChunkEvidence[];
}

export interface RagCostUsage {
  dailyCostUsd: number;
  monthlyCostUsd: number;
  dailyAnswerCount: number;
  monthlyAnswerCount: number;
}

export interface RagKnowledgeStats {
  activeSources: number;
  activeChunks: number;
  activeEmbeddings: number;
  latestSourceAt: string | null;
}

export interface RagStatusResult {
  ragEnabled: boolean;
  fp05Enabled: boolean;
  fp08Enabled: boolean;
  onlyCacheMode: boolean;
  effectiveOnlyCacheMode: boolean;
  provider: string;
  model: string;
  embeddingsProvider: string;
  topK: number;
  contextTokenBudget: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  dailyCostUsd: number;
  monthlyCostUsd: number;
  knowledgeVersion: string;
  knowledgeStats: RagKnowledgeStats;
}
