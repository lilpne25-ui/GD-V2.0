import { RagRepo } from '../../../database/repositories/ragRepo';
import type { CreateRagAuditEventInput, RagAuditLog, RagAuditStatus } from '../../../shared/types/rag';

const SECRET_KEYS = ['api_key', 'apikey', 'authorization', 'password', 'secret', 'token'];
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

function redactString(value: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, '[REDACTED]'), value);
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, item]) => {
    const lowerKey = key.toLowerCase();
    acc[key] = SECRET_KEYS.some(secretKey => lowerKey.includes(secretKey)) ? '[REDACTED]' : redactValue(item);
    return acc;
  }, {});
}

export const RagAuditService = {
  redactValue,

  async log(input: CreateRagAuditEventInput): Promise<string> {
    return RagRepo.writeAuditEvent({
      ...input,
      details: redactValue(input.details || {}) as Record<string, unknown>,
      errorMessage: input.errorMessage ? redactString(input.errorMessage) : null,
    });
  },

  async info(input: Omit<CreateRagAuditEventInput, 'status'>): Promise<string> {
    return this.log({ ...input, status: 'info' });
  },

  async warning(input: Omit<CreateRagAuditEventInput, 'status'>): Promise<string> {
    return this.log({ ...input, status: 'warning' });
  },

  async error(input: Omit<CreateRagAuditEventInput, 'status'>): Promise<string> {
    return this.log({ ...input, status: 'error' });
  },

  async list(limit = 100): Promise<RagAuditLog[]> {
    return RagRepo.listAuditEvents(limit);
  },

  normalizeStatus(status: string | undefined): RagAuditStatus {
    if (status === 'warning' || status === 'error') return status;
    return 'info';
  },
};
