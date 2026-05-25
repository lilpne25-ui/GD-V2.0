import { RagHashService } from './ragHashService';

export interface RagChunkingOptions {
  maxChars?: number;
  overlapChars?: number;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface RagChunkDraft {
  chunkHash: string;
  chunkIndex: number;
  contentText: string;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

const DEFAULT_MAX_CHARS = 2200;
const DEFAULT_OVERLAP_CHARS = 240;

function normalizeText(value: string): string {
  return String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function estimateTokens(value: string): number {
  const text = normalizeText(value);
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function findBreakpoint(text: string, targetEnd: number, minEnd: number): number {
  const end = Math.min(text.length, targetEnd);
  const windowStart = Math.max(minEnd, end - 420);
  const candidates = ['\n\n', '\n', '. ', '; ', ', ', ' '];

  for (const candidate of candidates) {
    const idx = text.lastIndexOf(candidate, end);
    if (idx >= windowStart) {
      return Math.min(text.length, idx + candidate.length);
    }
  }

  return end;
}

export const RagChunkingService = {
  normalizeText,
  estimateTokens,

  chunkText(text: string, options: RagChunkingOptions = {}): RagChunkDraft[] {
    const normalized = normalizeText(text);
    if (!normalized) return [];

    const maxChars = Math.max(500, Math.floor(Number(options.maxChars || DEFAULT_MAX_CHARS)));
    const overlapChars = Math.min(
      Math.floor(maxChars / 2),
      Math.max(0, Math.floor(Number(options.overlapChars ?? DEFAULT_OVERLAP_CHARS)))
    );

    const chunks: RagChunkDraft[] = [];
    let cursor = 0;

    while (cursor < normalized.length) {
      const minEnd = Math.min(normalized.length, cursor + Math.floor(maxChars * 0.65));
      const targetEnd = Math.min(normalized.length, cursor + maxChars);
      const end = targetEnd >= normalized.length ? normalized.length : findBreakpoint(normalized, targetEnd, minEnd);
      const contentText = normalized.slice(cursor, end).trim();

      if (contentText) {
        chunks.push({
          chunkHash: RagHashService.hashText(contentText),
          chunkIndex: chunks.length,
          contentText,
          tokenCount: estimateTokens(contentText),
          metadata: {
            ...(options.metadata || {}),
            sourceId: options.sourceId || null,
            charStart: cursor,
            charEnd: end,
            maxChars,
            overlapChars,
          },
        });
      }

      if (end >= normalized.length) break;
      cursor = Math.max(end - overlapChars, cursor + 1);
    }

    return chunks;
  },
};
