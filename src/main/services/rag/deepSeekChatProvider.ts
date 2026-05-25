import type { RagJsonObject } from '../../../shared/types/rag';
import { RagAuditService } from './ragAuditService';
import { RagPiiMaskingService } from './ragPiiMaskingService';

export interface DeepSeekChatProviderOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export interface DeepSeekJsonRequest {
  question: string;
  contextText?: string;
  recordTypeCode?: string | null;
  recordId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  evidence?: unknown[];
}

export interface DeepSeekJsonResult {
  ok: boolean;
  provider: 'deepseek';
  model: string;
  answer: RagJsonObject;
  usage: RagJsonObject;
  rawContent: string;
  errorMessage: string | null;
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const DEFAULT_TIMEOUT_MS = 45000;

const EXPECTED_JSON_CONTRACT = {
  summary: 'string',
  findings: [{ title: 'string', severity: 'low|medium|high', detail: 'string' }],
  missingFields: [{ field: 'string', reason: 'string' }],
  inconsistencies: [{ field: 'string', issue: 'string', evidence: 'string' }],
  suggestedActions: ['string'],
  confidence: 0.0,
};

const EXAMPLE_JSON_OUTPUT = {
  summary: 'El registro FP-05 contiene datos suficientes, pero falta responsable de validacion.',
  findings: [{ title: 'Campo incompleto', severity: 'medium', detail: 'No se encontro fecha de entrega.' }],
  missingFields: [{ field: 'fecha_entrega', reason: 'Necesaria para trazabilidad del acta.' }],
  inconsistencies: [],
  suggestedActions: ['Solicitar fecha de entrega antes de aprobar el registro.'],
  confidence: 0.82,
};

function joinUrl(baseUrl: string, suffix: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${suffix.replace(/^\/+/, '')}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} excedio timeout de ${timeoutMs} ms.`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function extractJsonObject(raw: string): RagJsonObject {
  const content = String(raw || '').trim();
  if (!content) throw new Error('DeepSeek devolvio contenido vacio.');

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as RagJsonObject;
  } catch {
    // Continua con extraccion tolerante.
  }

  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const parsed = JSON.parse(content.slice(start, end + 1));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as RagJsonObject;
  }

  throw new Error('DeepSeek no devolvio un objeto JSON valido.');
}

function normalizeUsage(usage: Record<string, unknown> | undefined): RagJsonObject {
  const raw = usage || {};
  const promptCacheHitTokens =
    raw.prompt_cache_hit_tokens
    ?? (raw.prompt_tokens_details as Record<string, unknown> | undefined)?.cached_tokens
    ?? null;
  const promptTokens = Number(raw.prompt_tokens ?? 0);
  const cacheHit = Number(promptCacheHitTokens ?? 0);
  const promptCacheMissTokens =
    raw.prompt_cache_miss_tokens
    ?? (promptTokens > 0 && cacheHit >= 0 ? Math.max(0, promptTokens - cacheHit) : null);

  return {
    ...raw,
    prompt_cache_hit_tokens: promptCacheHitTokens,
    prompt_cache_miss_tokens: promptCacheMissTokens,
  };
}

function buildFallbackAnswer(reason: string): RagJsonObject {
  return {
    summary: 'No se pudo generar analisis con DeepSeek.',
    findings: [],
    missingFields: [],
    inconsistencies: [],
    suggestedActions: ['Reintentar en modo cache o revisar auditoria RAG antes de reenviar al proveedor.'],
    confidence: 0,
    fallback: true,
    reason,
  };
}

export class DeepSeekChatProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: DeepSeekChatProviderOptions = {}) {
    this.baseUrl = String(options.baseUrl || process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).trim();
    this.apiKey = String(options.apiKey || process.env.DEEPSEEK_API_KEY || '').trim();
    this.model = String(options.model || process.env.DEEPSEEK_MODEL || DEFAULT_MODEL).trim();
    this.timeoutMs = Math.max(1000, Number(options.timeoutMs || process.env.DEEPSEEK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  }

  async analyzeJson(input: DeepSeekJsonRequest): Promise<DeepSeekJsonResult> {
    if (!this.apiKey) {
      const errorMessage = 'DEEPSEEK_API_KEY no configurada.';
      await RagAuditService.warning({
        eventType: 'rag.deepseek.missing_api_key',
        entityType: 'provider',
        recordTypeCode: input.recordTypeCode || null,
        actorUserId: input.actorUserId || null,
        actorRole: input.actorRole || null,
        details: { provider: 'deepseek', model: this.model },
        errorMessage,
      });

      return {
        ok: false,
        provider: 'deepseek',
        model: this.model,
        answer: buildFallbackAnswer(errorMessage),
        usage: {},
        rawContent: '',
        errorMessage,
      };
    }

    const maskedQuestion = RagPiiMaskingService.maskText(input.question);
    const maskedContext = RagPiiMaskingService.maskText(input.contextText || '');
    const piiCounts = Object.entries({ ...maskedQuestion.counts, ...maskedContext.counts })
      .reduce<Record<string, number>>((acc, [key]) => {
        acc[key] = (maskedQuestion.counts[key] || 0) + (maskedContext.counts[key] || 0);
        return acc;
      }, {});

    const systemPrompt = [
      'Eres un analista RAG empresarial para registros FP-05/FP-08.',
      'Responde exclusivamente en json valido.',
      'Contrato JSON esperado:',
      JSON.stringify(EXPECTED_JSON_CONTRACT),
      'Ejemplo de salida JSON:',
      JSON.stringify(EXAMPLE_JSON_OUTPUT),
    ].join('\n');

    const userPrompt = [
      'Genera un analisis en json del registro usando solo la evidencia disponible.',
      `recordTypeCode: ${input.recordTypeCode || 'N/A'}`,
      `recordId: ${input.recordId || 'N/A'}`,
      `Pregunta: ${maskedQuestion.text}`,
      'Contexto RAG:',
      maskedContext.text || '[sin contexto]',
    ].join('\n\n');

    try {
      await RagAuditService.info({
        eventType: 'rag.deepseek.request',
        entityType: 'provider',
        recordTypeCode: input.recordTypeCode || null,
        actorUserId: input.actorUserId || null,
        actorRole: input.actorRole || null,
        details: {
          provider: 'deepseek',
          model: this.model,
          contextChars: maskedContext.text.length,
          questionChars: maskedQuestion.text.length,
          piiMasked: maskedQuestion.masked || maskedContext.masked,
          piiCounts,
        },
      });

      const response = await withTimeout(fetch(joinUrl(this.baseUrl, '/v1/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
        }),
      }), this.timeoutMs, 'DeepSeek chat');

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DeepSeek HTTP ${response.status}: ${errorText.slice(0, 500)}`);
      }

      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string | null } }>;
        usage?: Record<string, unknown>;
      };
      const rawContent = String(payload.choices?.[0]?.message?.content || '').trim();
      const answer = extractJsonObject(rawContent);
      const usage = normalizeUsage(payload.usage);

      await RagAuditService.info({
        eventType: 'rag.deepseek.response',
        entityType: 'provider',
        recordTypeCode: input.recordTypeCode || null,
        actorUserId: input.actorUserId || null,
        actorRole: input.actorRole || null,
        details: {
          provider: 'deepseek',
          model: this.model,
          ok: true,
          usage,
        },
      });

      return {
        ok: true,
        provider: 'deepseek',
        model: this.model,
        answer,
        usage,
        rawContent,
        errorMessage: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Error DeepSeek desconocido.');
      await RagAuditService.error({
        eventType: 'rag.deepseek.invalid_response',
        entityType: 'provider',
        recordTypeCode: input.recordTypeCode || null,
        actorUserId: input.actorUserId || null,
        actorRole: input.actorRole || null,
        details: {
          provider: 'deepseek',
          model: this.model,
          baseUrl: this.baseUrl,
          hasContext: Boolean(input.contextText),
          evidenceCount: Array.isArray(input.evidence) ? input.evidence.length : 0,
        },
        errorMessage,
      });

      return {
        ok: false,
        provider: 'deepseek',
        model: this.model,
        answer: buildFallbackAnswer(errorMessage),
        usage: {},
        rawContent: '',
        errorMessage,
      };
    }
  }
}
