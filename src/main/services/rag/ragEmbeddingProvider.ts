import { RagHashService } from './ragHashService';

export type RagEmbeddingsProviderName = 'local' | 'openai_compatible' | 'ollama';

export interface RagEmbeddingsProvider {
  name: RagEmbeddingsProviderName;
  model: string;
  dims: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface RagEmbeddingsProviderOptions {
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  dims?: number;
  timeoutMs?: number;
}

const DEFAULT_LOCAL_DIMS = 128;
const DEFAULT_EMBEDDINGS_TIMEOUT_MS = 30000;

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(8, Math.floor(parsed)));
}

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm <= 0) return vector.map(() => 0);
  return vector.map(value => Number((value / norm).toFixed(8)));
}

function hashToVector(text: string, dims: number): number[] {
  const values: number[] = [];
  let salt = 0;

  while (values.length < dims) {
    const hex = RagHashService.hashText(`${text}\n${salt}`);
    for (let index = 0; index < hex.length && values.length < dims; index += 2) {
      const byte = parseInt(hex.slice(index, index + 2), 16);
      values.push(byte / 127.5 - 1);
    }
    salt += 1;
  }

  return normalizeVector(values);
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
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

function assertEmbeddingMatrix(value: unknown, provider: string): number[][] {
  if (!Array.isArray(value)) {
    throw new Error(`Respuesta invalida de embeddings ${provider}: no es arreglo.`);
  }

  return value.map((row, index) => {
    if (!Array.isArray(row)) {
      throw new Error(`Respuesta invalida de embeddings ${provider}: fila ${index} no es arreglo.`);
    }

    const vector = row.map(Number).filter(item => Number.isFinite(item));
    if (!vector.length) {
      throw new Error(`Respuesta invalida de embeddings ${provider}: fila ${index} vacia.`);
    }
    return vector;
  });
}

export function createLocalHashEmbeddingProvider(options: RagEmbeddingsProviderOptions = {}): RagEmbeddingsProvider {
  const dims = parsePositiveInt(options.dims || process.env.SGC_RAG_EMBEDDINGS_DIMS, DEFAULT_LOCAL_DIMS, 2048);
  const model = String(options.model || process.env.SGC_RAG_EMBEDDINGS_MODEL || 'local-hash-v1').trim();

  return {
    name: 'local',
    model,
    dims,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map(text => hashToVector(String(text || ''), dims));
    },
  };
}

export function createOpenAiCompatibleEmbeddingProvider(options: RagEmbeddingsProviderOptions = {}): RagEmbeddingsProvider {
  const baseUrl = String(options.baseUrl || process.env.SGC_RAG_EMBEDDINGS_BASE_URL || '').trim();
  const apiKey = String(options.apiKey || process.env.SGC_RAG_EMBEDDINGS_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  const model = String(options.model || process.env.SGC_RAG_EMBEDDINGS_MODEL || '').trim();
  const dims = Number(options.dims || process.env.SGC_RAG_EMBEDDINGS_DIMS || 0);
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || process.env.SGC_RAG_EMBEDDINGS_TIMEOUT_MS || DEFAULT_EMBEDDINGS_TIMEOUT_MS));

  if (!baseUrl) throw new Error('SGC_RAG_EMBEDDINGS_BASE_URL es obligatorio para openai_compatible.');
  if (!model) throw new Error('SGC_RAG_EMBEDDINGS_MODEL es obligatorio para openai_compatible.');

  return {
    name: 'openai_compatible',
    model,
    dims: Number.isFinite(dims) ? Math.max(0, Math.floor(dims)) : 0,
    async embed(texts: string[]): Promise<number[][]> {
      const response = await withTimeout(fetch(joinUrl(baseUrl, '/v1/embeddings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          input: texts.map(text => String(text || '')),
        }),
      }), timeoutMs, 'Embeddings openai_compatible');

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Embeddings openai_compatible HTTP ${response.status}: ${errorText.slice(0, 300)}`);
      }

      const payload = await response.json() as { data?: Array<{ embedding?: unknown }> };
      const matrix = assertEmbeddingMatrix((payload.data || []).map(item => item.embedding), 'openai_compatible');
      if (matrix.length !== texts.length) {
        throw new Error('Embeddings openai_compatible devolvio cantidad distinta de vectores.');
      }
      return matrix;
    },
  };
}

export function createOllamaEmbeddingProvider(options: RagEmbeddingsProviderOptions = {}): RagEmbeddingsProvider {
  const baseUrl = String(options.baseUrl || process.env.SGC_RAG_EMBEDDINGS_BASE_URL || 'http://localhost:11434').trim();
  const model = String(options.model || process.env.SGC_RAG_EMBEDDINGS_MODEL || '').trim();
  const dims = Number(options.dims || process.env.SGC_RAG_EMBEDDINGS_DIMS || 0);
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || process.env.SGC_RAG_EMBEDDINGS_TIMEOUT_MS || DEFAULT_EMBEDDINGS_TIMEOUT_MS));

  if (!model) throw new Error('SGC_RAG_EMBEDDINGS_MODEL es obligatorio para ollama.');

  return {
    name: 'ollama',
    model,
    dims: Number.isFinite(dims) ? Math.max(0, Math.floor(dims)) : 0,
    async embed(texts: string[]): Promise<number[][]> {
      const response = await withTimeout(fetch(joinUrl(baseUrl, '/api/embed'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: texts.map(text => String(text || '')),
        }),
      }), timeoutMs, 'Embeddings ollama');

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Embeddings ollama HTTP ${response.status}: ${errorText.slice(0, 300)}`);
      }

      const payload = await response.json() as { embeddings?: unknown };
      const matrix = assertEmbeddingMatrix(payload.embeddings, 'ollama');
      if (matrix.length !== texts.length) {
        throw new Error('Embeddings ollama devolvio cantidad distinta de vectores.');
      }
      return matrix;
    },
  };
}

export function createEmbeddingsProvider(options: RagEmbeddingsProviderOptions = {}): RagEmbeddingsProvider {
  const provider = String(options.provider || process.env.SGC_RAG_EMBEDDINGS_PROVIDER || 'local')
    .trim()
    .toLowerCase();

  if (provider === 'local') {
    return createLocalHashEmbeddingProvider(options);
  }

  if (provider === 'openai_compatible') {
    return createOpenAiCompatibleEmbeddingProvider(options);
  }

  if (provider === 'ollama') {
    return createOllamaEmbeddingProvider(options);
  }

  throw new Error(`Proveedor de embeddings no soportado: ${provider || '[vacio]'}.`);
}

export const RagEmbeddingProviderService = {
  createProvider: createEmbeddingsProvider,
  createLocalHashProvider: createLocalHashEmbeddingProvider,
  createOpenAiCompatibleProvider: createOpenAiCompatibleEmbeddingProvider,
  createOllamaProvider: createOllamaEmbeddingProvider,
  normalizeVector,
};
