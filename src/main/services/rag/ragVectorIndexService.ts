export interface RagVectorCandidate {
  chunkId: string;
  sourceId: string;
  contentText: string;
  tokenCount?: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface RagRankedChunk extends RagVectorCandidate {
  score: number;
  rank: number;
  strategy: 'cosine_node' | 'lexical_node';
}

export interface RagVectorRankOptions {
  topK?: number;
  minScore?: number;
}

function sanitizeVector(vector: number[] | undefined): number[] {
  if (!Array.isArray(vector)) return [];
  return vector.map(Number).filter(value => Number.isFinite(value));
}

function normalizeTerms(value: string): string[] {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length >= 3);
}

export function cosineSimilarity(leftInput: number[], rightInput: number[]): number {
  const left = sanitizeVector(leftInput);
  const right = sanitizeVector(rightInput);
  const dims = Math.min(left.length, right.length);
  if (dims === 0) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < dims; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm <= 0 || rightNorm <= 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function lexicalScore(queryText: string, candidateText: string): number {
  const queryTerms = Array.from(new Set(normalizeTerms(queryText)));
  if (!queryTerms.length) return 0;

  const candidateTerms = new Set(normalizeTerms(candidateText));
  const hits = queryTerms.filter(term => candidateTerms.has(term)).length;
  return hits / queryTerms.length;
}

export const RagVectorIndexService = {
  cosineSimilarity,
  lexicalScore,

  rankByVector(queryEmbedding: number[], candidates: RagVectorCandidate[], options: RagVectorRankOptions = {}): RagRankedChunk[] {
    const topK = Math.max(1, Math.min(50, Math.floor(Number(options.topK || process.env.SGC_RAG_TOP_K || 8))));
    const minScore = Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : -1;

    return candidates
      .map(candidate => ({
        ...candidate,
        score: cosineSimilarity(queryEmbedding, candidate.embedding || []),
        rank: 0,
        strategy: 'cosine_node' as const,
      }))
      .filter(candidate => candidate.score >= minScore)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
      .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  },

  rankByLexical(queryText: string, candidates: RagVectorCandidate[], options: RagVectorRankOptions = {}): RagRankedChunk[] {
    const topK = Math.max(1, Math.min(50, Math.floor(Number(options.topK || process.env.SGC_RAG_TOP_K || 8))));
    const minScore = Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : 0;

    return candidates
      .map(candidate => ({
        ...candidate,
        score: lexicalScore(queryText, candidate.contentText),
        rank: 0,
        strategy: 'lexical_node' as const,
      }))
      .filter(candidate => candidate.score >= minScore)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
      .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  },
};
