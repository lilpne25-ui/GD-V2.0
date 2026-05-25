import { ipcMain } from 'electron';
import { RagRepo } from '../database/repositories/ragRepo';
import type {
  AnalyzeRagRecordInput,
  GetRagAnswerInput,
  GetRagEvidenceInput,
  IngestRagDocumentNodeInput,
  RagAnalyzeRecordResult,
  RagEvidenceResult,
  RagIngestDocumentNodeResult,
  RagJsonObject,
  RagSourceType,
  RagStatusResult,
  SubmitRagFeedbackInput,
} from '../shared/types/rag';
import { RagAnswerService } from './services/rag/ragAnswerService';
import { RagAuditService } from './services/rag/ragAuditService';
import { RagBudgetService } from './services/rag/ragBudgetService';
import { RagChunkingService } from './services/rag/ragChunkingService';
import { createEmbeddingsProvider } from './services/rag/ragEmbeddingProvider';
import { RagHashService } from './services/rag/ragHashService';
import { RagRetrievalService } from './services/rag/ragRetrievalService';
import { RagTextExtractionService } from './services/rag/ragTextExtractionService';

export interface RegisterRagIpcHandlersOptions {
  ensureStartupTasks: () => Promise<void>;
  normalizeIpcError?: (channel: string, error: unknown) => Error;
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value: unknown, fieldName: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`Campo obligatorio invalido: ${fieldName}.`);
  return normalized;
}

function optionalString(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function normalizeRecordTypeCode(value: unknown): string | null {
  const normalized = optionalString(value);
  return normalized ? normalized.toUpperCase() : null;
}

function sourceTypeFromRecordType(recordTypeCode: string | null): RagSourceType {
  if (recordTypeCode?.startsWith('FP-05')) return 'fp05';
  if (recordTypeCode?.startsWith('FP-08')) return 'fp08';
  return 'document';
}

function assertRagEnabled(channel: string): void {
  if (!RagBudgetService.getConfig().ragEnabled) {
    throw new Error(`${channel} bloqueado: SGC_RAG_ENABLED esta desactivado.`);
  }
}

function assertRecordTypeAllowed(recordTypeCode: string | null): void {
  if (recordTypeCode?.startsWith('FP-05') && !envFlag('SGC_RAG_FP05_ENABLED', true)) {
    throw new Error('RAG FP-05 esta desactivado por SGC_RAG_FP05_ENABLED.');
  }

  if (recordTypeCode?.startsWith('FP-08') && !envFlag('SGC_RAG_FP08_ENABLED', false)) {
    throw new Error('RAG FP-08 esta desactivado por SGC_RAG_FP08_ENABLED.');
  }
}

function validateIngestPayload(payload: unknown): IngestRagDocumentNodeInput {
  if (!isObjectLike(payload)) throw new Error('Payload invalido para rag:ingest-document-node.');
  return {
    nodeId: requiredString(payload.nodeId, 'nodeId'),
    recordTypeCode: normalizeRecordTypeCode(payload.recordTypeCode) || undefined,
    actorUserId: requiredString(payload.actorUserId, 'actorUserId'),
    actorRole: requiredString(payload.actorRole, 'actorRole'),
  };
}

function validateAnalyzePayload(payload: unknown): AnalyzeRagRecordInput {
  if (!isObjectLike(payload)) throw new Error('Payload invalido para rag:analyze-record.');
  return {
    recordId: requiredString(payload.recordId, 'recordId'),
    recordTypeId: optionalString(payload.recordTypeId) || undefined,
    recordTypeCode: normalizeRecordTypeCode(payload.recordTypeCode) || undefined,
    actorUserId: requiredString(payload.actorUserId, 'actorUserId'),
    actorRole: requiredString(payload.actorRole, 'actorRole'),
    forceRefresh: Boolean(payload.forceRefresh),
  };
}

function validateGetAnswerPayload(payload: unknown): GetRagAnswerInput {
  if (!isObjectLike(payload)) throw new Error('Payload invalido para rag:get-answer.');
  const answerId = optionalString(payload.answerId);
  const promptCacheKey = optionalString(payload.promptCacheKey);
  if (!answerId && !promptCacheKey) throw new Error('Debes enviar answerId o promptCacheKey.');
  return { answerId: answerId || undefined, promptCacheKey: promptCacheKey || undefined };
}

function validateFeedbackPayload(payload: unknown): SubmitRagFeedbackInput {
  if (!isObjectLike(payload)) throw new Error('Payload invalido para rag:submit-feedback.');
  const rating = payload.rating === undefined || payload.rating === null ? null : Number(payload.rating);
  if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
    throw new Error('rating debe ser un numero entre 1 y 5.');
  }

  return {
    answerId: requiredString(payload.answerId, 'answerId'),
    rating,
    accepted: Boolean(payload.accepted),
    correctionText: optionalString(payload.correctionText),
    correction: isObjectLike(payload.correction) ? payload.correction as RagJsonObject : {},
    status: 'pending',
    actorUserId: optionalString(payload.actorUserId),
  };
}

function validateGetEvidencePayload(payload: unknown): GetRagEvidenceInput {
  if (!isObjectLike(payload)) throw new Error('Payload invalido para rag:get-evidence.');
  const queryId = optionalString(payload.queryId);
  const answerId = optionalString(payload.answerId);
  if (!queryId && !answerId) throw new Error('Debes enviar queryId o answerId.');
  return { queryId: queryId || undefined, answerId: answerId || undefined };
}

async function ingestDocumentNode(input: IngestRagDocumentNodeInput): Promise<RagIngestDocumentNodeResult> {
  const recordTypeCode = normalizeRecordTypeCode(input.recordTypeCode);
  assertRecordTypeAllowed(recordTypeCode);

  const extracted = await RagTextExtractionService.extractFromDocumentNode({
    nodeId: input.nodeId,
    actorRole: input.actorRole,
  });

  const existing = await RagRepo.getSourceByHash(extracted.sourceHash);
  if (existing?.status === 'active') {
    const chunks = await RagRepo.listChunksBySource(existing.id);
    const embeddingCounts = await Promise.all(chunks.map(chunk => RagRepo.listEmbeddingsByChunk(chunk.id)));
    return {
      sourceId: existing.id,
      sourceHash: existing.sourceHash,
      reused: true,
      chunkCount: chunks.length,
      embeddingCount: embeddingCounts.flat().length,
      warnings: extracted.warnings,
      metadata: existing.metadata,
    };
  }

  const sourceId = await RagRepo.createSource({
    sourceHash: extracted.sourceHash,
    sourceName: extracted.fileName,
    sourceType: sourceTypeFromRecordType(recordTypeCode),
    recordTypeCode,
    documentNodeId: input.nodeId,
    fileName: extracted.fileName,
    mimeType: extracted.mimeType,
    fileSizeBytes: extracted.sizeBytes,
    version: existing ? existing.version + 1 : 1,
    status: 'active',
    metadata: {
      ...extracted.metadata,
      extension: extracted.extension,
      warnings: extracted.warnings,
    },
    createdBy: input.actorUserId,
  });

  const chunks = RagChunkingService.chunkText(extracted.text, {
    sourceId,
    metadata: {
      recordTypeCode,
      documentNodeId: input.nodeId,
      fileName: extracted.fileName,
    },
  });
  const uniqueChunks = Array.from(new Map(chunks.map(chunk => [chunk.chunkHash, chunk])).values());

  const chunkIds: string[] = [];
  for (const chunk of uniqueChunks) {
    const chunkId = await RagRepo.createChunk({
      sourceId,
      chunkHash: chunk.chunkHash,
      chunkIndex: chunk.chunkIndex,
      contentText: chunk.contentText,
      tokenCount: chunk.tokenCount,
      metadata: chunk.metadata,
    });
    chunkIds.push(chunkId);
  }

  const provider = createEmbeddingsProvider();
  const embeddings = uniqueChunks.length ? await provider.embed(uniqueChunks.map(chunk => chunk.contentText)) : [];
  let embeddingCount = 0;
  for (let index = 0; index < embeddings.length; index += 1) {
    const embedding = embeddings[index];
    await RagRepo.createEmbedding({
      chunkId: chunkIds[index],
      provider: provider.name,
      model: provider.model,
      dims: provider.dims > 0 ? provider.dims : embedding.length,
      embeddingHash: RagHashService.hashJson(embedding),
      embedding,
    });
    embeddingCount += 1;
  }

  await RagAuditService.info({
    eventType: 'rag.ingest_document_node',
    entityType: 'rag_source',
    entityId: sourceId,
    recordTypeCode,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    details: {
      fileName: extracted.fileName,
      chunkCount: uniqueChunks.length,
      embeddingCount,
      provider: provider.name,
      model: provider.model,
    },
  });

  return {
    sourceId,
    sourceHash: extracted.sourceHash,
    reused: false,
    chunkCount: uniqueChunks.length,
    embeddingCount,
    warnings: extracted.warnings,
    metadata: {
      fileName: extracted.fileName,
      extension: extracted.extension,
      provider: provider.name,
      model: provider.model,
    },
  };
}

async function analyzeRecord(input: AnalyzeRagRecordInput): Promise<RagAnalyzeRecordResult> {
  const recordTypeCode = normalizeRecordTypeCode(input.recordTypeCode);
  assertRecordTypeAllowed(recordTypeCode);

  const question = [
    `Analiza el registro ${recordTypeCode || 'dinamico'} con id ${input.recordId}.`,
    'Devuelve hallazgos, campos faltantes, inconsistencias, acciones sugeridas y evidencia en json.',
  ].join(' ');

  const context = await RagRetrievalService.retrieveContext({
    queryText: question,
    sourceType: sourceTypeFromRecordType(recordTypeCode),
    recordTypeCode: recordTypeCode || undefined,
    recordId: input.recordId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
  });

  const evidence = context.results.map(result => ({
    chunkId: result.chunkId,
    sourceId: result.sourceId,
    score: result.score,
    rank: result.rank,
    strategy: result.strategy,
    tokenCount: result.tokenCount || 0,
  }));

  const answerResult = await RagAnswerService.generateJsonAnswer({
    queryId: context.queryId,
    question,
    contextText: context.contextText,
    recordTypeCode,
    recordId: input.recordId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    forceRefresh: input.forceRefresh,
    evidence,
    contextHashes: context.results.map(result => RagHashService.hashText(result.contentText)),
    provider: 'deepseek',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  });

  return {
    queryId: context.queryId,
    answerId: answerResult.answerId,
    answer: answerResult.answer,
    cacheHit: answerResult.cacheHit,
    fallback: answerResult.fallback,
    retrievalCount: context.results.length,
    contextTokenEstimate: context.results.reduce((sum, result) => sum + Number(result.tokenCount || 0), 0),
    provider: answerResult.answer?.provider || context.provider.name,
    model: answerResult.answer?.model || context.provider.model,
  };
}

async function getEvidence(input: GetRagEvidenceInput): Promise<RagEvidenceResult> {
  const answer = input.answerId ? await RagRepo.getAnswerById(input.answerId) : null;
  const queryId = input.queryId || answer?.queryId || null;
  if (!queryId) {
    return { queryId: null, answer, items: [] };
  }

  const retrievals = await RagRepo.listRetrievalsByQuery(queryId);
  const items = await Promise.all(retrievals.map(async retrieval => ({
    retrieval,
    chunk: await RagRepo.getChunkById(retrieval.chunkId),
  })));

  return { queryId, answer, items };
}

async function getRagStatus(): Promise<RagStatusResult> {
  const config = RagBudgetService.getConfig();
  const [usage, knowledgeStats] = await Promise.all([
    RagRepo.getCostUsage().catch(() => ({
      dailyCostUsd: 0,
      monthlyCostUsd: 0,
      dailyAnswerCount: 0,
      monthlyAnswerCount: 0,
    })),
    RagRepo.getKnowledgeStats().catch(() => ({
      activeSources: 0,
      activeChunks: 0,
      activeEmbeddings: 0,
      latestSourceAt: null,
    })),
  ]);

  const budgetExceeded = usage.dailyCostUsd >= config.dailyBudgetUsd || usage.monthlyCostUsd >= config.monthlyBudgetUsd;

  return {
    ragEnabled: config.ragEnabled,
    fp05Enabled: envFlag('SGC_RAG_FP05_ENABLED', true),
    fp08Enabled: envFlag('SGC_RAG_FP08_ENABLED', false),
    onlyCacheMode: config.onlyCacheMode,
    effectiveOnlyCacheMode: config.onlyCacheMode || budgetExceeded,
    provider: config.provider,
    model: String(process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'),
    embeddingsProvider: String(process.env.SGC_RAG_EMBEDDINGS_PROVIDER || 'local'),
    topK: Math.max(1, Number(process.env.SGC_RAG_TOP_K || 8)),
    contextTokenBudget: Math.max(1000, Number(process.env.SGC_RAG_CONTEXT_TOKEN_BUDGET || 6000)),
    dailyBudgetUsd: config.dailyBudgetUsd,
    monthlyBudgetUsd: config.monthlyBudgetUsd,
    dailyCostUsd: usage.dailyCostUsd,
    monthlyCostUsd: usage.monthlyCostUsd,
    knowledgeVersion: knowledgeStats.latestSourceAt || 'sin-conocimiento',
    knowledgeStats,
  };
}

export function registerRagIpcHandlers(options: RegisterRagIpcHandlersOptions): void {
  const normalizeError = options.normalizeIpcError || ((channel: string, error: unknown) => {
    if (error instanceof Error) return new Error(`[${channel}] ${error.message}`);
    return new Error(`[${channel}] ${String(error || 'Error inesperado RAG.')}`);
  });

  ipcMain.handle('rag:get-status', async () => {
    await options.ensureStartupTasks();
    try {
      return await getRagStatus();
    } catch (error) {
      throw normalizeError('rag:get-status', error);
    }
  });

  ipcMain.handle('rag:ingest-document-node', async (_event, payload: unknown) => {
    await options.ensureStartupTasks();
    try {
      assertRagEnabled('rag:ingest-document-node');
      return await ingestDocumentNode(validateIngestPayload(payload));
    } catch (error) {
      throw normalizeError('rag:ingest-document-node', error);
    }
  });

  ipcMain.handle('rag:analyze-record', async (_event, payload: unknown) => {
    await options.ensureStartupTasks();
    try {
      assertRagEnabled('rag:analyze-record');
      return await analyzeRecord(validateAnalyzePayload(payload));
    } catch (error) {
      throw normalizeError('rag:analyze-record', error);
    }
  });

  ipcMain.handle('rag:get-answer', async (_event, payload: unknown) => {
    await options.ensureStartupTasks();
    try {
      const input = validateGetAnswerPayload(payload);
      if (input.answerId) return await RagRepo.getAnswerById(input.answerId);
      return await RagRepo.getCachedAnswer(String(input.promptCacheKey || ''));
    } catch (error) {
      throw normalizeError('rag:get-answer', error);
    }
  });

  ipcMain.handle('rag:submit-feedback', async (_event, payload: unknown) => {
    await options.ensureStartupTasks();
    try {
      return await RagRepo.submitFeedback(validateFeedbackPayload(payload));
    } catch (error) {
      throw normalizeError('rag:submit-feedback', error);
    }
  });

  ipcMain.handle('rag:get-evidence', async (_event, payload: unknown) => {
    await options.ensureStartupTasks();
    try {
      return await getEvidence(validateGetEvidencePayload(payload));
    } catch (error) {
      throw normalizeError('rag:get-evidence', error);
    }
  });
}
