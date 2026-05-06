import type {
  RecordField,
  RecordRuleOperator,
  RecordTypeRule,
  RecordTypeRuleCondition,
  RecordTypeRuleEffect,
  RecordRuleExpression,
  RecordRuleEffectMode,
  RecordValueInput,
} from '../../shared/types/registros-dinamicos';

export type RuleCalculationChange = {
  ruleId: string;
  ruleName: string;
  fieldKey: string;
  mode: RecordRuleEffectMode;
  previousValue: RecordValueInput | undefined;
  nextValue: RecordValueInput;
};

export type RuleEvaluationError = {
  ruleId: string;
  ruleName: string;
  message: string;
};

export type RuleEvaluationResult = {
  values: Record<string, RecordValueInput>;
  appliedRuleIds: string[];
  autoCalculatedFieldKeys: string[];
  appliedChanges: RuleCalculationChange[];
  errors: RuleEvaluationError[];
};

type EvaluateRuleSetInput = {
  fields: RecordField[];
  rules: RecordTypeRule[];
  values: Record<string, RecordValueInput>;
};

function normalizeFieldKey(value: unknown): string {
  return String(value ?? '').trim();
}

function isEmptyValue(value: RecordValueInput | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'number') return !Number.isFinite(value);
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function toComparableString(value: RecordValueInput | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function toComparableNumber(value: RecordValueInput | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function cloneValue(value: RecordValueInput | undefined): RecordValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;

  try {
    return JSON.parse(JSON.stringify(value)) as RecordValueInput;
  } catch {
    return value;
  }
}

function areValuesEqual(a: RecordValueInput | undefined, b: RecordValueInput | undefined): boolean {
  if (a === b) return true;

  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isFinite(a) && Number.isFinite(b) && a === b;
  }

  if (typeof a === 'string' || typeof b === 'string') {
    return toComparableString(a) === toComparableString(b);
  }

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function evaluateCondition(
  condition: RecordTypeRuleCondition,
  values: Record<string, RecordValueInput>
): boolean {
  const fieldKey = normalizeFieldKey(condition.fieldKey);
  if (!fieldKey) return false;

  const actual = values[fieldKey];
  const expected = condition.value;

  switch (condition.operator as RecordRuleOperator) {
    case 'eq':
      return areValuesEqual(actual, expected);
    case 'neq':
      return !areValuesEqual(actual, expected);
    case 'gt': {
      const a = toComparableNumber(actual);
      const b = toComparableNumber(expected);
      return a !== null && b !== null && a > b;
    }
    case 'gte': {
      const a = toComparableNumber(actual);
      const b = toComparableNumber(expected);
      return a !== null && b !== null && a >= b;
    }
    case 'lt': {
      const a = toComparableNumber(actual);
      const b = toComparableNumber(expected);
      return a !== null && b !== null && a < b;
    }
    case 'lte': {
      const a = toComparableNumber(actual);
      const b = toComparableNumber(expected);
      return a !== null && b !== null && a <= b;
    }
    case 'in': {
      if (!Array.isArray(expected)) return false;
      return expected.some(item => areValuesEqual(actual, item as RecordValueInput));
    }
    case 'contains': {
      if (typeof actual === 'string') {
        return actual.toLowerCase().includes(toComparableString(expected).toLowerCase());
      }
      if (Array.isArray(actual)) {
        return actual.some(item => areValuesEqual(item as RecordValueInput, expected));
      }
      return false;
    }
    case 'starts_with': {
      if (typeof actual !== 'string') return false;
      return actual.toLowerCase().startsWith(toComparableString(expected).toLowerCase());
    }
    case 'ends_with': {
      if (typeof actual !== 'string') return false;
      return actual.toLowerCase().endsWith(toComparableString(expected).toLowerCase());
    }
    case 'is_empty':
      return isEmptyValue(actual);
    case 'is_not_empty':
      return !isEmptyValue(actual);
    default:
      return false;
  }
}

function evaluateExpression(
  expression: RecordRuleExpression,
  values: Record<string, RecordValueInput>
): RecordValueInput | undefined {
  if (expression.type === 'copy') {
    const key = normalizeFieldKey(expression.fieldKey);
    if (!key) return undefined;
    return cloneValue(values[key]);
  }

  if (expression.type === 'concat') {
    if (typeof expression.template === 'string' && expression.template.trim()) {
      return expression.template.replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, (_all, token: string) => {
        const raw = values[token];
        return toComparableString(raw);
      });
    }

    const keys = Array.isArray(expression.fieldKeys) ? expression.fieldKeys : [];
    return keys.map(key => toComparableString(values[normalizeFieldKey(key)])).join(' ');
  }

  if (expression.type === 'sum') {
    const keys = Array.isArray(expression.fieldKeys) ? expression.fieldKeys : [];
    const total = keys.reduce((acc, key) => {
      const n = toComparableNumber(values[normalizeFieldKey(key)]);
      return acc + (n ?? 0);
    }, 0);

    const precision = Number.isFinite(Number(expression.precision)) ? Math.max(0, Number(expression.precision)) : null;
    if (precision === null) return total;

    const p10 = 10 ** precision;
    return Math.round(total * p10) / p10;
  }

  return undefined;
}

function applyValueMode(
  previousValue: RecordValueInput | undefined,
  resolvedValue: RecordValueInput,
  mode: RecordRuleEffectMode
): RecordValueInput {
  if (mode === 'replace') return resolvedValue;

  const prev = toComparableString(previousValue);
  const next = toComparableString(resolvedValue);

  if (mode === 'append') {
    return `${prev}${next}`;
  }

  if (mode === 'prepend') {
    return `${next}${prev}`;
  }

  return resolvedValue;
}

function resolveEffectValue(
  effect: RecordTypeRuleEffect,
  values: Record<string, RecordValueInput>
): RecordValueInput | undefined {
  if (effect.expression) {
    return evaluateExpression(effect.expression, values);
  }

  const fromKey = normalizeFieldKey(effect.valueFromFieldKey);
  if (fromKey) {
    return cloneValue(values[fromKey]);
  }

  if (effect.value !== undefined) {
    return cloneValue(effect.value);
  }

  return undefined;
}

export function evaluateRecordRules(input: EvaluateRuleSetInput): RuleEvaluationResult {
  const allowedFieldKeys = new Set(
    input.fields
      .filter(field => field.isActive)
      .map(field => normalizeFieldKey(field.fieldKey))
      .filter(Boolean)
  );

  const values: Record<string, RecordValueInput> = {};
  Object.entries(input.values || {}).forEach(([fieldKey, value]) => {
    const key = normalizeFieldKey(fieldKey);
    if (key) values[key] = cloneValue(value) as RecordValueInput;
  });

  const sortedRules = [...(input.rules || [])]
    .filter(rule => rule.enabled)
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));

  const appliedRuleIds: string[] = [];
  const changes: RuleCalculationChange[] = [];
  const errors: RuleEvaluationError[] = [];

  for (const rule of sortedRules) {
    try {
      const conditions = Array.isArray(rule.when) ? rule.when : [];
      const matched = conditions.every(condition => evaluateCondition(condition, values));
      if (!matched) continue;

      let ruleProducedChange = false;
      const effects = Array.isArray(rule.then) ? rule.then : [];

      for (const effect of effects) {
        const fieldKey = normalizeFieldKey(effect.setFieldKey);
        if (!fieldKey || !allowedFieldKeys.has(fieldKey)) {
          continue;
        }

        const mode = effect.mode || 'replace';
        const resolved = resolveEffectValue(effect, values);
        if (resolved === undefined) continue;

        const previousValue = cloneValue(values[fieldKey]);
        const nextValue = applyValueMode(previousValue, resolved, mode);

        if (areValuesEqual(previousValue, nextValue)) {
          continue;
        }

        values[fieldKey] = nextValue;
        changes.push({
          ruleId: rule.id,
          ruleName: rule.name,
          fieldKey,
          mode,
          previousValue,
          nextValue: cloneValue(nextValue) as RecordValueInput,
        });
        ruleProducedChange = true;
      }

      if (ruleProducedChange) {
        appliedRuleIds.push(rule.id);
      }

      if (rule.stopOnMatch && ruleProducedChange) {
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Regla invalida.';
      errors.push({
        ruleId: rule.id,
        ruleName: rule.name,
        message,
      });
    }
  }

  const autoCalculatedFieldKeys = Array.from(new Set(changes.map(change => change.fieldKey)));

  return {
    values,
    appliedRuleIds,
    autoCalculatedFieldKeys,
    appliedChanges: changes,
    errors,
  };
}
