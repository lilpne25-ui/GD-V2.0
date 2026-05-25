import { RagRepo } from '../../../database/repositories/ragRepo';
import type { RagChunk, RagSourceType } from '../../../shared/types/rag';
import { createEmbeddingsProvider, RagEmbeddingsProvider } from './ragEmbeddingProvider';
import { RagHashService } from './ragHashService';
import { RagRankedChunk, RagVectorCandidate, RagVectorIndexService } from './ragVectorIndexService';

export interface RagRetrieveContextInput {
  queryText: string;
  sourceType?: RagSourceType;
  recordTypeCode?: string;
  recordId?: string;
  actorUserId?: string;
  actorRole?: string;
  topK?: number;
  sourceLimit?: number;
  timeoutMs?: number;
  embeddingsProvider?: RagEmbeddingsProvider;
}

export interface RagRetrievedContext {
  queryId: string;
  queryHash: string;
  strategy: string;
  results: RagRankedChunk[];
  contextText: string;
  provider: {
    name: string;
    model: string;
    dims: number;
  };
}

const DEFAULT_TIMEOUT_MS = 30000;

function normalizeText(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

async function resolveChunkEmbedding(chunk: RagChunk, provider: RagEmbeddingsProvider): Promise<number[]> {
  const existing = await RagRepo.listEmbeddingsByChunk(chunk.id);
  const active = existing.find(embedding =>
    embedding.status === 'active'
    && embedding.provider === provider.name
    && embedding.model === provider.model
    && (provider.dims <= 0 || embedding.dims === provider.dims)
  );

  if (active) return active.embedding;

  const [embedding] = await provider.embed([chunk.contentText]);
  const embeddingHash = RagHashService.hashJson(embedding);

  try {
    await RagRepo.createEmbedding({
      chunkId: chunk.id,
      provider: provider.name,
      model: provider.model,
      dims: provider.dims > 0 ? provider.dims : embedding.length,
      embeddingHash,
      embedding,
    });
  } catch {
    // Otro proceso pudo haber creado el mismo embedding; para retrieval basta usar el vector calculado.
  }

  return embedding;
}

function buildContextText(results: RagRankedChunk[]): string {
  return results
    .map(result => [
      `[${result.rank}] source=${result.sourceId} chunk=${result.chunkId} score=${result.score.toFixed(4)}`,
      result.contentText,
    ].join('\n'))
    .join('\n\n---\n\n');
}

export const RagRetrievalService = {
  async retrieveContext(input: RagRetrieveContextInput): Promise<RagRetrievedContext> {
    const queryText = normalizeText(input.queryText);
    if (!queryText) throw new Error('queryText es obligatorio para retrieval RAG.');

    const timeoutMs = Math.max(1000, Number(input.timeoutMs || DEFAULT_TIMEOUT_MS));

    return withTimeout((async () => {
      const provider = input.embeddingsProvider || createEmbeddingsProvider();
      const [queryEmbedding] = await provider.embed([queryText]);
      const queryHash = RagHashService.hashJson({
        queryText,
        sourceType: input.sourceType || null,
        recordTypeCode: input.recordTypeCode || null,
        recordId: input.recordId || null,
        provider: provider.name,
        model: provider.model,
      });

      const queryId = await RagRepo.createQuery({
        queryHash,
        queryText,
        normalizedQuery: queryText.toLowerCase(),
        recordTypeCode: input.recordTypeCode || null,
        recordId: input.recordId || null,
        actorUserId: input.actorUserId || null,
        actorRole: input.actorRole || null,
        status: 'completed',
        context: {
          sourceType: input.sourceType || null,
          provider: provider.name,
          model: provider.model,
          topK: input.topK || Number(process.env.SGC_RAG_TOP_K || 8),
        },
      });

      const sources = await RagRepo.listSources({
        sourceType: input.sourceType,
        recordTypeCode: input.recordTypeCode,
        status: 'active',
        limit: input.sourceLimit || 100,
      });

      const chunks = (await Promise.all(sources.map(source => RagRepo.listChunksBySource(source.id))))
        .flat()
        .filter(chunk => chunk.status === 'active');

      const candidates: RagVectorCandidate[] = await Promise.all(chunks.map(async chunk => ({
        chunkId: chunk.id,
        sourceId: chunk.sourceId,
        contentText: chunk.contentText,
        tokenCount: chunk.tokenCount,
        embedding: await resolveChunkEmbedding(chunk, provider),
        metadata: chunk.metadata,
      })));

      let results = RagVectorIndexService.rankByVector(queryEmbedding, candidates, { topK: input.topK });
      if (!results.length) {
        results = RagVectorIndexService.rankByLexical(queryText, candidates, { topK: input.topK });
      }

      await Promise.all(results.map(result => RagRepo.createRetrieval({
        queryId,
        chunkId: result.chunkId,
        score: result.score,
        rank: result.rank,
        strategy: result.strategy,
        metadata: {
          sourceId: result.sourceId,
          tokenCount: result.tokenCount || 0,
          provider: provider.name,
          model: provider.model,
        },
      })));

      return {
        queryId,
        queryHash,
        strategy: results[0]?.strategy || 'cosine_node',
        results,
        contextText: buildContextText(results),
        provider: {
          name: provider.name,
          model: provider.model,
          dims: provider.dims,
        },
      };
    })(), timeoutMs, 'Retrieval RAG');
  },
};
