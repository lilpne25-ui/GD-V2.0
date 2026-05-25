import { createHash } from 'crypto';

export type RagHashAlgorithm = 'sha256' | 'sha1';

function normalizeTextForHash(value: string): string {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

export const RagHashService = {
  hashText(value: string, algorithm: RagHashAlgorithm = 'sha256'): string {
    return createHash(algorithm).update(normalizeTextForHash(value), 'utf8').digest('hex');
  },

  hashBuffer(value: Buffer, algorithm: RagHashAlgorithm = 'sha256'): string {
    return createHash(algorithm).update(value).digest('hex');
  },

  hashJson(value: unknown, algorithm: RagHashAlgorithm = 'sha256'): string {
    return this.hashText(JSON.stringify(value ?? null), algorithm);
  },

  makePromptCacheKey(parts: unknown[]): string {
    return this.hashJson(parts, 'sha256');
  },
};
