export interface RagPiiMaskResult {
  text: string;
  masked: boolean;
  counts: Record<string, number>;
}

const PATTERNS: Array<{ key: string; pattern: RegExp; replacement: string }> = [
  { key: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[EMAIL]' },
  { key: 'phone', pattern: /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}\b/g, replacement: '[PHONE]' },
  { key: 'rfc', pattern: /\b[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}\b/gi, replacement: '[RFC]' },
  { key: 'curp', pattern: /\b[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/gi, replacement: '[CURP]' },
  { key: 'api_key', pattern: /\bsk-[A-Za-z0-9_-]{12,}\b/g, replacement: '[API_KEY]' },
];

export const RagPiiMaskingService = {
  maskText(input: string): RagPiiMaskResult {
    let text = String(input || '');
    const counts: Record<string, number> = {};

    for (const item of PATTERNS) {
      const matches = text.match(item.pattern);
      if (matches?.length) {
        counts[item.key] = (counts[item.key] || 0) + matches.length;
        text = text.replace(item.pattern, item.replacement);
      }
    }

    return {
      text,
      masked: Object.keys(counts).length > 0,
      counts,
    };
  },
};
