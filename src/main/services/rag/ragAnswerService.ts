import { RagRepo } from '../../../database/repositories/ragRepo';
import type { RagAnswer, RagJsonObject } from '../../../shared/types/rag';
import { DeepSeekChatProvider } from './deepSeekChatProvider';
import { RagAuditService } from './ragAuditService';
import { RagBudgetService } from './ragBudgetService';
import { RagHashService } from './ragHashService';

export interface RagAnswerCacheInput {
  question: string;
  recordTypeCode?: string | null;
  recordId?: string | null;
  contextHashes?: string[];
  model?: string;
  provider?: string;
}

export interface RagFallbackAnswerInput extends RagAnswerCacheInput {
  queryId: string;
  reason: string;
  evidence?: unknown[];
  errorMessage?: string | null;
}

export interface RagGenerateJsonAnswerInput extends RagAnswerCacheInput {
  queryId: string;
  contextText?: string;
  evidence?: unknown[];
  actorUserId?: string | null;
  actorRole?: string | null;
  forceRefresh?: boolean;
}

export interface RagGenerateJsonAnswerResult {
  answerId: string;
  answer: RagAnswer | null;
  cacheHit: boolean;
  fallback: boolean;
}

function normalizeQuestion(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export const RagAnswerService = {
  buildPromptCacheKey(input: RagAnswerCacheInput): string {
    return RagHashService.makePromptCacheKey([
      normalizeQuestion(input.question),
      input.recordTypeCode || null,
      input.recordId || null,
      input.provider || process.env.SGC_RAG_PROVIDER || 'deepseek',
      input.model || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      [...(input.contextHashes || [])].sort(),
    ]);
  },

  async getCachedAnswer(input: RagAnswerCacheInput): Promise<RagAnswer | null> {
    return RagRepo.getCachedAnswer(this.buildPromptCacheKey(input));
  },

  async createFallbackAnswer(input: RagFallbackAnswerInput): Promise<string> {
    const promptCacheKey = this.buildPromptCacheKey(input);
    const answer: RagJsonObject = {
      status: 'fallback',
      summary: 'No se genero respuesta LLM en esta fase.',
      findings: [],
      missingFields: [],
      inconsistencies: [],
      suggestedActions: ['Validar que existan chunks y embeddings antes de activar proveedor externo.'],
      reason: input.reason,
    };

    return RagRepo.createAnswer({
      queryId: input.queryId,
      answerHash: RagHashService.hashJson(answer),
      promptCacheKey,
      provider: input.provider || 'local',
      model: input.model || 'fallback-rag-phase-03',
      status: 'fallback',
      cacheHit: false,
      answer,
      evidence: input.evidence || [],
      tokenUsage: {},
      estimatedCostUsd: 0,
      errorMessage: input.errorMessage || null,
    });
  },

  async generateJsonAnswer(input: RagGenerateJsonAnswerInput): Promise<RagGenerateJsonAnswerResult> {
    const promptCacheKey = this.buildPromptCacheKey(input);

    if (!input.forceRefresh) {
      const cached = await RagRepo.getCachedAnswer(promptCacheKey);
      if (cached) {
        return {
          answerId: cached.id,
          answer: cached,
          cacheHit: true,
          fallback: cached.status === 'fallback',
        };
      }
    }

    const budget = await RagBudgetService.canUseProvider({
      actorUserId: input.actorUserId || null,
      estimatedCostUsd: RagBudgetService.getConfig().estimatedRequestCostUsd,
    });
    if (!budget.allowed) {
      await RagAuditService.warning({
        eventType: 'rag.provider.blocked',
        entityType: 'rag_query',
        entityId: input.queryId,
        recordTypeCode: input.recordTypeCode || null,
        actorUserId: input.actorUserId || null,
        actorRole: input.actorRole || null,
        details: {
          reason: budget.reason,
          dailyCostUsd: budget.usage.dailyCostUsd,
          monthlyCostUsd: budget.usage.monthlyCostUsd,
          dailyBudgetUsd: budget.dailyBudgetUsd,
          monthlyBudgetUsd: budget.monthlyBudgetUsd,
          effectiveOnlyCacheMode: budget.effectiveOnlyCacheMode,
        },
      });

      const fallbackId = await this.createFallbackAnswer({
        ...input,
        reason: budget.reason,
        provider: 'local',
        model: 'budget-fallback',
        evidence: input.evidence,
        errorMessage: budget.reason,
      });
      return {
        answerId: fallbackId,
        answer: await RagRepo.getAnswerById(fallbackId),
        cacheHit: false,
        fallback: true,
      };
    }

    const provider = new DeepSeekChatProvider();
    const result = await provider.analyzeJson({
      question: input.question,
      contextText: input.contextText,
      recordTypeCode: input.recordTypeCode || null,
      recordId: input.recordId || null,
      actorUserId: input.actorUserId || null,
      actorRole: input.actorRole || null,
      evidence: input.evidence || [],
    });
    const estimatedCostUsd = result.ok ? RagBudgetService.estimateCostFromUsage(result.usage) : 0;

    const answerId = await RagRepo.createAnswer({
      queryId: input.queryId,
      answerHash: RagHashService.hashJson(result.answer),
      promptCacheKey,
      provider: result.provider,
      model: result.model,
      status: result.ok ? 'completed' : 'fallback',
      cacheHit: false,
      answer: result.answer,
      evidence: input.evidence || [],
      tokenUsage: result.usage,
      estimatedCostUsd,
      errorMessage: result.errorMessage,
    });

    return {
      answerId,
      answer: await RagRepo.getAnswerById(answerId),
      cacheHit: false,
      fallback: !result.ok,
    };
  },
};
