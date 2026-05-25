import { RagRepo } from '../../../database/repositories/ragRepo';
import type { RagCostUsage } from '../../../shared/types/rag';

export interface RagBudgetConfig {
  ragEnabled: boolean;
  onlyCacheMode: boolean;
  provider: string;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  estimatedRequestCostUsd: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  inputTokenUsdPer1k: number;
  outputTokenUsdPer1k: number;
}

export interface RagBudgetDecision extends RagBudgetConfig {
  allowed: boolean;
  reason: string;
  estimatedCostUsd: number;
  usageWindowEnforced: boolean;
  effectiveOnlyCacheMode: boolean;
  usage: RagCostUsage;
  rateLimitRemainingMinute: number | null;
  rateLimitRemainingDay: number | null;
}

export interface RagBudgetCheckInput {
  estimatedCostUsd?: number;
  actorUserId?: string | null;
}

const ZERO_USAGE: RagCostUsage = {
  dailyCostUsd: 0,
  monthlyCostUsd: 0,
  dailyAnswerCount: 0,
  monthlyAnswerCount: 0,
};

function startOfDayIso(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
}

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function envMoney(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function envInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function normalizeBudgetInput(input: number | RagBudgetCheckInput | undefined, fallbackCost: number): RagBudgetCheckInput {
  if (typeof input === 'number') return { estimatedCostUsd: input };
  return {
    ...input,
    estimatedCostUsd: input?.estimatedCostUsd ?? fallbackCost,
  };
}

export const RagBudgetService = {
  getConfig(): RagBudgetConfig {
    return {
      ragEnabled: envFlag('SGC_RAG_ENABLED', false),
      onlyCacheMode: envFlag('SGC_RAG_ONLY_CACHE_MODE', false),
      provider: String(process.env.SGC_RAG_PROVIDER || 'deepseek').trim().toLowerCase(),
      dailyBudgetUsd: envMoney('SGC_RAG_DAILY_BUDGET_USD', 1),
      monthlyBudgetUsd: envMoney('SGC_RAG_MONTHLY_BUDGET_USD', 20),
      estimatedRequestCostUsd: envMoney('SGC_RAG_ESTIMATED_REQUEST_COST_USD', 0.01),
      rateLimitPerMinute: envInt('SGC_RAG_RATE_LIMIT_PER_MINUTE', 6),
      rateLimitPerDay: envInt('SGC_RAG_RATE_LIMIT_PER_DAY', 60),
      inputTokenUsdPer1k: envMoney('SGC_RAG_INPUT_TOKEN_USD_PER_1K', 0),
      outputTokenUsdPer1k: envMoney('SGC_RAG_OUTPUT_TOKEN_USD_PER_1K', 0),
    };
  },

  async canUseProvider(input?: number | RagBudgetCheckInput): Promise<RagBudgetDecision> {
    const config = this.getConfig();
    const normalized = normalizeBudgetInput(input, config.estimatedRequestCostUsd);
    const estimatedCost = Math.max(0, Number(normalized.estimatedCostUsd || 0));
    const usage = await RagRepo.getCostUsage().catch(() => ZERO_USAGE);

    const baseDecision: Omit<RagBudgetDecision, 'allowed' | 'reason' | 'usageWindowEnforced' | 'effectiveOnlyCacheMode'> = {
      ...config,
      estimatedCostUsd: estimatedCost,
      usage,
      rateLimitRemainingMinute: null,
      rateLimitRemainingDay: null,
    };

    if (!config.ragEnabled) {
      return {
        ...baseDecision,
        allowed: false,
        reason: 'RAG desactivado por SGC_RAG_ENABLED.',
        usageWindowEnforced: false,
        effectiveOnlyCacheMode: true,
      };
    }

    if (config.onlyCacheMode) {
      return {
        ...baseDecision,
        allowed: false,
        reason: 'Modo solo-cache activo por SGC_RAG_ONLY_CACHE_MODE.',
        usageWindowEnforced: false,
        effectiveOnlyCacheMode: true,
      };
    }

    if ((usage.dailyCostUsd + estimatedCost) > config.dailyBudgetUsd || (usage.monthlyCostUsd + estimatedCost) > config.monthlyBudgetUsd) {
      return {
        ...baseDecision,
        allowed: false,
        reason: 'Costo estimado excede budget configurado.',
        usageWindowEnforced: true,
        effectiveOnlyCacheMode: true,
      };
    }

    const actorUserId = String(normalized.actorUserId || '').trim();
    if (actorUserId) {
      const now = new Date();
      const minuteAgo = new Date(now.getTime() - 60_000).toISOString();
      const dayStart = startOfDayIso(now);
      const [minuteCount, dayCount] = await Promise.all([
        RagRepo.countAuditEventsSince({ eventType: 'rag.deepseek.request', actorUserId, sinceIso: minuteAgo }).catch(() => 0),
        RagRepo.countAuditEventsSince({ eventType: 'rag.deepseek.request', actorUserId, sinceIso: dayStart }).catch(() => 0),
      ]);

      const remainingMinute = Math.max(0, config.rateLimitPerMinute - minuteCount);
      const remainingDay = Math.max(0, config.rateLimitPerDay - dayCount);

      if ((config.rateLimitPerMinute > 0 && minuteCount >= config.rateLimitPerMinute)
        || (config.rateLimitPerDay > 0 && dayCount >= config.rateLimitPerDay)) {
        return {
          ...baseDecision,
          allowed: false,
          reason: 'Rate limit RAG excedido para el usuario.',
          usageWindowEnforced: true,
          effectiveOnlyCacheMode: true,
          rateLimitRemainingMinute: remainingMinute,
          rateLimitRemainingDay: remainingDay,
        };
      }

      baseDecision.rateLimitRemainingMinute = remainingMinute;
      baseDecision.rateLimitRemainingDay = remainingDay;
    }

    return {
      ...baseDecision,
      allowed: true,
      reason: 'Proveedor externo permitido por configuracion base.',
      usageWindowEnforced: true,
      effectiveOnlyCacheMode: false,
    };
  },

  estimateCostFromUsage(usage: Record<string, unknown> | undefined): number {
    const config = this.getConfig();
    const promptTokens = Number(usage?.prompt_tokens || 0);
    const completionTokens = Number(usage?.completion_tokens || 0);
    const calculated =
      (Math.max(0, promptTokens) / 1000) * config.inputTokenUsdPer1k
      + (Math.max(0, completionTokens) / 1000) * config.outputTokenUsdPer1k;

    if (calculated > 0) return Number(calculated.toFixed(6));
    return config.estimatedRequestCostUsd;
  },
};
