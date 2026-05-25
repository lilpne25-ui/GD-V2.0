import { dbAll, dbGet, dbRun, generateId } from '../db';
import { evaluateRecordRules } from './recordRulesEngine';
import * as XLSX from 'xlsx';
import type {
  CreateRecordInput,
  GetRecordAuditHistoryInput,
  GetRecordTransitionsInput,
  QueryRecordAuditHistoryResult,
  QueryRecordsInput,
  QueryRecordsResult,
  RecordAuditAction,
  RecordAuditEntity,
  RecordAuditLog,
  RecordAuditTimelineChange,
  RecordAuditTimelineEntry,
  RecordDefinition,
  RecordField,
  RecordFieldOption,
  RecordFieldRule,
  RecordFieldType,
  RecordFieldValidation,
  RecordInstance,
  RecordInstanceStatus,
  RecordSource,
  RecordType,
  RecordTransitionOption,
  RecordTypeRule,
  RecordTypeRuleCondition,
  RecordTypeRuleEffect,
  RecordTypeSettings,
  RecordValue,
  RecordValueInput,
  RecordWorkflowState,
  UpdateRecordInput,
} from '../../shared/types/registros-dinamicos';

type DbBoolLike = number | boolean | null | undefined;

type DbRecordTypeRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  process_id: string | null;
  settings_json: string;
  is_active: DbBoolLike;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbRecordFieldRow = {
  id: string;
  record_type_id: string;
  field_key: string;
  label: string;
  field_type: RecordFieldType;
  required: DbBoolLike;
  options_json: string;
  default_value: string;
  placeholder: string;
  help_text: string;
  validation_json: string;
  rules_json: string;
  display_order: number;
  is_active: DbBoolLike;
  created_at: string;
  updated_at: string;
};

type DbRecordInstanceRow = {
  id: string;
  record_type_id: string;
  title: string;
  status: string;
  version: number;
  locked: DbBoolLike;
  source: string;
  created_by: string | null;
  created_by_name: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbRecordValueRow = {
  id: string;
  record_id: string;
  field_id: string;
  field_key: string;
  value_text: string | null;
  value_json: string | null;
  created_at: string;
  updated_at: string;
};

type DbRecordRuleRow = {
  id: string;
  record_type_id: string;
  rule_name: string;
  description: string;
  enabled: DbBoolLike;
  priority: number;
  stop_on_match: DbBoolLike;
  conditions_json: string;
  effects_json: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbRecordAuditRow = {
  id: string;
  record_id: string | null;
  record_type_id: string | null;
  entity: string;
  action: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  event_timestamp: string;
  before_json: string | null;
  after_json: string | null;
  changed_fields_json: string | null;
  details_json: string | null;
};

type DbCountRow = {
  total: number;
};

type CreateRecordFieldInput = {
  id?: string;
  fieldKey: string;
  label: string;
  fieldType: RecordFieldType;
  required?: boolean;
  options?: RecordFieldOption[];
  defaultValue?: RecordValueInput;
  placeholder?: string;
  helpText?: string;
  validation?: RecordFieldValidation;
  rules?: RecordFieldRule[];
  displayOrder?: number;
  isActive?: boolean;
};

export type CreateRecordTypeInput = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  processId?: string | null;
  settings?: RecordTypeSettings;
  fields?: CreateRecordFieldInput[];
  isActive?: boolean;
  version?: number;
  actorUserId?: string;
  actorUserName?: string;
  actorRole?: string;
};

export type UpsertRecordRuleInput = {
  id?: string;
  recordTypeId: string;
  name: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  stopOnMatch?: boolean;
  when: RecordTypeRuleCondition[];
  then: RecordTypeRuleEffect[];
  actorUserId?: string;
  actorUserName?: string;
  actorRole?: string;
};

export type TransitionRecordStateInput = {
  recordId: string;
  toStatus: RecordInstanceStatus;
  action?: string;
  comments?: string;
  metadata?: Record<string, unknown>;
  performedBy: string;
  performedByName?: string;
  role: string;
};

export type RecordInstanceDetail = {
  instance: RecordInstance;
  definition: RecordDefinition;
  values: RecordValue[];
  workflow: RecordWorkflowState[];
};

export type ImportRecordTypeFromExcelInput = {
  fileName: string;
  workbookBase64: string;
  sheetName?: string;
  recordTypeCode?: string;
  recordTypeName?: string;
  description?: string;
  actorUserId?: string;
  actorUserName?: string;
  actorRole?: string;
  seedRows?: boolean;
  seedRowsLimit?: number;
};

export type ImportRecordTypeFromExcelResult = {
  recordTypeId: string;
  recordTypeCode: string;
  recordTypeName: string;
  sheetName: string;
  headerRowNumber: number;
  fieldsCreated: number;
  recordsSeeded: number;
  skippedRows: number;
  warnings: string[];
};

type ValueUpsertRow = {
  fieldKey: string;
  valueText: string | null;
  valueJson: string;
};

type RulesAuditPayload = {
  shouldWrite: number;
  changedFieldsJson: string;
  beforeJson: string;
  afterJson: string;
  detailsJson: string;
  autoFieldKeys: string[];
};

type AutoValueOperation = 'create' | 'update';

type AutoValueContext = {
  operation: AutoValueOperation;
  userId: string;
  userName: string;
  now: Date;
};

type RecordDefinitionCacheEntry = {
  definition: RecordDefinition;
  codeKey: string;
  expiresAt: number;
};

const RECORD_DEFINITION_CACHE_TTL_INPUT = Number(process.env.SGC_RECORD_DEFINITION_CACHE_TTL_MS || 120000);
const RECORD_DEFINITION_CACHE_MAX_INPUT = Number(process.env.SGC_RECORD_DEFINITION_CACHE_MAX || 200);

const RECORD_DEFINITION_CACHE_TTL_MS = Number.isFinite(RECORD_DEFINITION_CACHE_TTL_INPUT)
  ? Math.max(5000, RECORD_DEFINITION_CACHE_TTL_INPUT)
  : 120000;

const RECORD_DEFINITION_CACHE_MAX = Number.isFinite(RECORD_DEFINITION_CACHE_MAX_INPUT)
  ? Math.max(10, Math.floor(RECORD_DEFINITION_CACHE_MAX_INPUT))
  : 200;

const QUERY_MAX_PAGE_SIZE = 100;
const QUERY_MAX_SEARCH_LENGTH = 120;
const USER_FK_CACHE_TTL_INPUT = Number(process.env.SGC_USER_FK_CACHE_TTL_MS || 300000);
const USER_FK_CACHE_TTL_MS = Number.isFinite(USER_FK_CACHE_TTL_INPUT)
  ? Math.max(10000, USER_FK_CACHE_TTL_INPUT)
  : 300000;

const recordDefinitionCacheById = new Map<string, RecordDefinitionCacheEntry>();
const recordDefinitionCodeToId = new Map<string, string>();
const userFkCacheById = new Map<string, { value: string | null; expiresAt: number }>();

const RECORD_STATUS: RecordInstanceStatus[] = ['borrador', 'en_revision', 'aprobado', 'rechazado', 'obsoleto'];

const RECORD_AUDIT_ACTIONS: RecordAuditAction[] = ['create', 'update', 'delete', 'transition', 'calculate'];

const RECORD_AUDIT_ENTITIES: RecordAuditEntity[] = [
  'record_type',
  'record_field',
  'record_instance',
  'record_value',
  'record_workflow',
];

const DEF_ADMIN_ROLE_TOKENS = [
  'administrador',
  'admin',
  'coordinador del sgc',
  'coordinador sgc',
  'responsable de calidad',
  'responsable_calidad',
];

const READ_ONLY_ROLE_TOKENS = ['consulta', 'lector', 'viewer'];

const TRANSITION_MATRIX: Record<RecordInstanceStatus, RecordInstanceStatus[]> = {
  borrador: ['en_revision', 'obsoleto'],
  en_revision: ['aprobado', 'rechazado', 'borrador'],
  aprobado: ['obsoleto'],
  rechazado: ['borrador', 'obsoleto'],
  obsoleto: [],
};

const APPROVER_TRANSITIONS = new Set<RecordInstanceStatus>(['aprobado', 'rechazado', 'obsoleto']);

const TRANSITION_ACTION_MAP: Record<RecordInstanceStatus, string> = {
  borrador: 'return_to_draft',
  en_revision: 'submit_for_review',
  aprobado: 'approve',
  rechazado: 'reject',
  obsoleto: 'archive',
};

const TRANSITION_LABEL_MAP: Record<RecordInstanceStatus, string> = {
  borrador: 'Volver a borrador',
  en_revision: 'Enviar a revision',
  aprobado: 'Aprobar',
  rechazado: 'Rechazar',
  obsoleto: 'Marcar obsoleto',
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

const MAX_EXCEL_IMPORT_COLUMNS = 120;
const MAX_EXCEL_IMPORT_ROWS = 300;
const DEFAULT_EXCEL_IMPORT_ROWS = 200;

type ExcelCellPrimitive = string | number | boolean | Date | null | undefined;
type ExcelRow = ExcelCellPrimitive[];

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

function normalizeExcelCellText(value: ExcelCellPrimitive): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  return String(value).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function isNumericLikeText(value: string): boolean {
  const normalized = value.replace(/\s+/g, '').replace(/,/g, '');
  if (!normalized) return false;
  return /^-?\d+(\.\d+)?$/.test(normalized);
}

function parseNumberFromText(value: string): number | null {
  const normalized = value.replace(/\s+/g, '').replace(/,/g, '');
  if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateToIso(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const dmyMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const yearRaw = Number(dmyMatch[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day) {
      return candidate.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeBooleanFromText(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['1', 'true', 'si', 'yes', 'ok', 'x'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n/a'].includes(normalized)) return false;
  return null;
}

function rowHasValues(row: ExcelRow, columnIndexes?: number[]): boolean {
  if (!row || !Array.isArray(row)) return false;
  const indexes = columnIndexes && columnIndexes.length ? columnIndexes : row.map((_, idx) => idx);
  return indexes.some(index => normalizeExcelCellText(row[index]).length > 0);
}

function normalizeFieldKey(label: string, index: number): string {
  const normalized = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const base = normalized || `campo_${index + 1}`;
  return /^[a-z_]/.test(base) ? base : `f_${base}`;
}

function normalizeRecordTypeCodeFromName(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const sliced = normalized.slice(0, 80);
  return sliced || `FP_05_${Date.now()}`;
}

function detectHeaderRowIndex(rows: ExcelRow[]): number {
  const scanLimit = Math.min(rows.length, 80);
  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || !row.length) continue;

    const normalizedCells = row
      .slice(0, MAX_EXCEL_IMPORT_COLUMNS)
      .map(cell => normalizeExcelCellText(cell))
      .filter(Boolean);

    if (normalizedCells.length < 2) continue;

    const alphaLike = normalizedCells.filter(cell => /[A-Za-z\u00C0-\u024F]/.test(cell)).length;
    const numericLike = normalizedCells.filter(cell => isNumericLikeText(cell)).length;
    const score = (normalizedCells.length * 10) + (alphaLike * 3) - (numericLike * 2) - (rowIndex * 0.05);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  if (bestIndex >= 0) return bestIndex;

  const fallbackIndex = rows.findIndex(row => rowHasValues(row));
  return fallbackIndex >= 0 ? fallbackIndex : 0;
}

function inferFieldTypeFromSamples(samples: string[]): { fieldType: RecordFieldType; options: RecordFieldOption[] } {
  const filtered = samples.map(value => value.trim()).filter(Boolean);
  if (!filtered.length) {
    return { fieldType: 'text', options: [] };
  }

  const boolCount = filtered.filter(value => normalizeBooleanFromText(value) !== null).length;
  if (boolCount === filtered.length) {
    return { fieldType: 'checkbox', options: [] };
  }

  const numericCount = filtered.filter(value => parseNumberFromText(value) !== null).length;
  if (numericCount === filtered.length) {
    return { fieldType: 'number', options: [] };
  }

  const dateCount = filtered.filter(value => parseDateToIso(value) !== null).length;
  if (dateCount === filtered.length) {
    return { fieldType: 'date', options: [] };
  }

  const distinctValues = Array.from(new Set(filtered));
  const distinctCount = distinctValues.length;
  if (distinctCount >= 2 && distinctCount <= 8 && distinctCount <= Math.max(2, Math.floor(filtered.length * 0.6))) {
    return {
      fieldType: 'select',
      options: distinctValues.slice(0, 25).map(value => ({ value, label: value })),
    };
  }

  const maxLength = filtered.reduce((acc, value) => Math.max(acc, value.length), 0);
  if (maxLength >= 120) {
    return { fieldType: 'textarea', options: [] };
  }

  return { fieldType: 'text', options: [] };
}

function coerceExcelValueByFieldType(fieldType: RecordFieldType, rawValue: ExcelCellPrimitive): RecordValueInput | undefined {
  const text = normalizeExcelCellText(rawValue);
  if (!text) return undefined;

  if (fieldType === 'checkbox') {
    const boolValue = normalizeBooleanFromText(text);
    return boolValue === null ? text : boolValue;
  }

  if (fieldType === 'number') {
    const numeric = parseNumberFromText(text);
    return numeric === null ? text : numeric;
  }

  if (fieldType === 'date') {
    const iso = parseDateToIso(text);
    return iso || text;
  }

  return text;
}

async function resolveAvailableRecordTypeCode(baseCode: string): Promise<string> {
  const normalizedBase = normalizeRecordTypeCodeFromName(baseCode);
  let candidate = normalizedBase;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const existing = await loadRecordDefinitionByCode(candidate);
    if (!existing) return candidate;

    const suffix = `_${attempt + 2}`;
    candidate = `${normalizedBase.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
  }

  throw new Error('No se pudo generar un codigo unico para el tipo de registro importado.');
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'Error desconocido.');
}

async function resolveUserIdForForeignKey(userId: string | null | undefined): Promise<string | null> {
  const uid = normalizeText(userId);
  if (!uid) return null;

  const cacheKey = uid.toLowerCase();
  const cached = userFkCacheById.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const row = await dbGet<{ id: string }>(
      `SELECT TOP 1 id
       FROM dbo.usuarios
       WHERE id = ?`,
      [uid]
    );

    const value = normalizeText(row?.id) || null;
    userFkCacheById.set(cacheKey, {
      value,
      expiresAt: Date.now() + USER_FK_CACHE_TTL_MS,
    });
    return value;
  } catch {
    // Mantener compatibilidad con esquemas no estandar donde la verificacion no aplica.
    return uid;
  }
}

function normalizeRecordTypeCodeKey(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizeRole(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function toBool(value: DbBoolLike): boolean {
  if (typeof value === 'boolean') return value;
  const n = Number(value);
  if (Number.isFinite(n)) return n === 1;
  const raw = String(value || '').trim().toLowerCase();
  return raw === 'true';
}

function safeJsonStringify(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback));
  } catch {
    return fallback;
  }
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseStoredValue(valueJson: string | null, valueText: string | null): RecordValueInput {
  if (valueJson && valueJson.trim()) {
    try {
      return JSON.parse(valueJson) as RecordValueInput;
    } catch {
      // fallback a texto plano
    }
  }
  return valueText ?? '';
}

function isApproverRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return DEF_ADMIN_ROLE_TOKENS.some(token => normalized.includes(token));
}

function isReadOnlyRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return READ_ONLY_ROLE_TOKENS.some(token => normalized.includes(token));
}

function assertWriteContext(userId: string | null | undefined, role: string | null | undefined, actionLabel: string): void {
  const uid = normalizeText(userId);
  const r = normalizeText(role);
  if (!uid) throw new Error(`No se puede ${actionLabel}: userId es obligatorio.`);
  if (!r) throw new Error(`No se puede ${actionLabel}: role es obligatorio.`);
  if (normalizeRole(r) === 'sin_puesto') {
    throw new Error(`No se puede ${actionLabel}: el usuario no tiene rol operativo.`);
  }
  if (isReadOnlyRole(r)) {
    throw new Error(`No se puede ${actionLabel}: rol sin permisos de escritura.`);
  }
}

function assertDefinitionPermission(userId: string | null | undefined, role: string | null | undefined): void {
  assertWriteContext(userId, role, 'gestionar definiciones de registros');
  if (!isApproverRole(role) && normalizeText(userId).toLowerCase() !== 'usr-admin') {
    throw new Error('No tienes permiso para crear o modificar tipos de registro.');
  }
}

function assertTransitionAllowed(
  fromStatus: RecordInstanceStatus,
  toStatus: RecordInstanceStatus,
  role: string,
  actorUserId: string,
  ownerUserId: string | null
): void {
  if (fromStatus === toStatus) {
    throw new Error('La transicion de estado no puede mantener el mismo estado.');
  }

  const allowed = TRANSITION_MATRIX[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new Error(`Transicion no permitida: ${fromStatus} -> ${toStatus}.`);
  }

  if (APPROVER_TRANSITIONS.has(toStatus) && !isApproverRole(role)) {
    throw new Error('No tienes permisos para ejecutar esta transicion de estado.');
  }

  if (!isApproverRole(role) && ownerUserId && normalizeText(ownerUserId) !== normalizeText(actorUserId)) {
    throw new Error('Solo el propietario o un rol aprobador puede transicionar este registro.');
  }
}

function canTransition(
  fromStatus: RecordInstanceStatus,
  toStatus: RecordInstanceStatus,
  role: string,
  actorUserId: string,
  ownerUserId: string | null
): { allowed: boolean; reason?: string } {
  try {
    assertTransitionAllowed(fromStatus, toStatus, role, actorUserId, ownerUserId);
    return { allowed: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Transicion no permitida.';
    return { allowed: false, reason };
  }
}

function normalizeStatus(value: string): RecordInstanceStatus {
  const raw = normalizeText(value).toLowerCase();
  if ((RECORD_STATUS as string[]).includes(raw)) return raw as RecordInstanceStatus;
  return 'borrador';
}

function formatIsoLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveAutoTokenValue(tokenRaw: string, context: AutoValueContext): string | null {
  const token = normalizeText(tokenRaw).toLowerCase();
  if (!token) return null;

  if (token === '@@actor.id' || token === '{{current_user_id}}' || token === '{{usuario_actual_id}}') {
    return context.userId;
  }

  if (token === '@@actor.name' || token === '{{current_user_name}}' || token === '{{usuario_actual_nombre}}') {
    return context.userName;
  }

  if (token === '@@now.date' || token === '{{today}}' || token === '{{current_date}}' || token === '{{fecha_hoy}}') {
    return formatIsoLocalDate(context.now);
  }

  if (token === '@@now.iso' || token === '{{now_iso}}') {
    return context.now.toISOString();
  }

  return null;
}

function resolveRecordValueAutoToken(
  value: RecordValueInput | undefined,
  context: AutoValueContext
): RecordValueInput | undefined {
  if (typeof value !== 'string') return cloneRecordValue(value);

  const resolved = resolveAutoTokenValue(value, context);
  if (resolved !== null) return resolved;

  return value;
}

function resolveFieldAutoDefault(field: RecordField, context: AutoValueContext): RecordValueInput | undefined {
  if (typeof field.defaultValue !== 'string') return undefined;
  const resolved = resolveAutoTokenValue(field.defaultValue, context);
  if (resolved === null) return undefined;
  return resolved;
}

function applyAutoContextValues(
  fields: RecordField[],
  targetValues: Record<string, RecordValueInput>,
  context: AutoValueContext
): string[] {
  if (context.operation !== 'create') {
    return [];
  }

  const appliedKeys: string[] = [];
  fields.forEach(field => {
    const resolved = resolveFieldAutoDefault(field, context);
    if (resolved === undefined) return;

    targetValues[field.fieldKey] = resolved;
    appliedKeys.push(field.fieldKey);
  });

  return uniqueFieldKeys(appliedKeys);
}

function normalizeAuditAction(value: string): RecordAuditAction {
  const raw = normalizeText(value).toLowerCase();
  if ((RECORD_AUDIT_ACTIONS as string[]).includes(raw)) return raw as RecordAuditAction;
  return 'update';
}

function normalizeAuditEntity(value: string): RecordAuditEntity {
  const raw = normalizeText(value).toLowerCase();
  if ((RECORD_AUDIT_ENTITIES as string[]).includes(raw)) return raw as RecordAuditEntity;
  return 'record_instance';
}

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseAuditObject(raw: string | null | undefined): Record<string, unknown> | null {
  const parsed = safeJsonParse<unknown>(raw, null);
  return asObjectRecord(parsed);
}

function parseAuditChangedFields(raw: string | null | undefined): string[] {
  const parsed = safeJsonParse<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(item => normalizeText(item))
    .filter(Boolean);
}

function getStatusLabel(status: RecordInstanceStatus | string | undefined): string {
  const normalized = normalizeStatus(String(status || 'borrador'));
  switch (normalized) {
    case 'borrador':
      return 'Borrador';
    case 'en_revision':
      return 'En revision';
    case 'aprobado':
      return 'Aprobado';
    case 'rechazado':
      return 'Rechazado';
    case 'obsoleto':
      return 'Obsoleto';
    default:
      return 'Borrador';
  }
}

function extractTimelineChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  changedFields: string[]
): RecordAuditTimelineChange[] {
  const beforeObj = before || {};
  const afterObj = after || {};

  const keys = changedFields.length > 0
    ? changedFields
    : Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));

  return keys.map(field => ({
    field,
    before: beforeObj[field],
    after: afterObj[field],
  }));
}

function buildAuditTitle(action: RecordAuditAction): string {
  switch (action) {
    case 'create':
      return 'Registro creado';
    case 'update':
      return 'Registro actualizado';
    case 'delete':
      return 'Registro eliminado (soft delete)';
    case 'transition':
      return 'Transicion de estado';
    case 'calculate':
      return 'Campos calculados por regla';
    default:
      return 'Evento de auditoria';
  }
}

function buildAuditDescription(log: RecordAuditLog): string {
  if (log.action === 'transition') {
    const beforeStatus = normalizeText(log.before?.status);
    const afterStatus = normalizeText(log.after?.status);
    if (beforeStatus || afterStatus) {
      return `${getStatusLabel(beforeStatus)} -> ${getStatusLabel(afterStatus)}`;
    }
    return 'Cambio de estado registrado en workflow.';
  }

  if (log.action === 'delete') {
    const reason = normalizeText(log.details?.reason);
    return reason ? `Soft delete: ${reason}` : 'Registro marcado como obsoleto.';
  }

  if (log.action === 'calculate') {
    const fields = Array.isArray(log.details?.autoFieldKeys)
      ? (log.details?.autoFieldKeys as unknown[])
          .map(item => normalizeText(item))
          .filter(Boolean)
      : [];
    return fields.length > 0
      ? `Campos auto-calculados: ${fields.join(', ')}`
      : 'Actualizacion automatica por reglas.';
  }

  const comments = normalizeText(log.details?.comments);
  if (comments) return comments;

  return log.action === 'create'
    ? 'Se genero una nueva instancia de registro.'
    : 'Cambios registrados en la instancia.';
}

function mapRecordAuditLog(row: DbRecordAuditRow): RecordAuditLog {
  const before = parseAuditObject(row.before_json);
  const after = parseAuditObject(row.after_json);
  const details = parseAuditObject(row.details_json);
  const changedFields = parseAuditChangedFields(row.changed_fields_json);

  return {
    id: row.id,
    recordId: row.record_id,
    recordTypeId: row.record_type_id,
    entity: normalizeAuditEntity(row.entity),
    action: normalizeAuditAction(row.action),
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    eventTimestamp: row.event_timestamp,
    before,
    after,
    changedFields: changedFields.length > 0 ? changedFields : null,
    details,
  };
}

function mapAuditTimelineEntry(log: RecordAuditLog): RecordAuditTimelineEntry {
  const changedFields = log.changedFields || [];

  return {
    id: log.id,
    recordId: log.recordId,
    recordTypeId: log.recordTypeId,
    entity: log.entity,
    action: log.action,
    timestamp: log.eventTimestamp,
    title: buildAuditTitle(log.action),
    description: buildAuditDescription(log),
    actor: {
      userId: log.userId,
      userName: log.userName,
      role: log.userRole,
    },
    changedFields,
    changes: extractTimelineChanges(log.before, log.after, changedFields),
    before: log.before,
    after: log.after,
    details: log.details,
  };
}

function valueToStorage(value: RecordValueInput): { valueText: string | null; valueJson: string } {
  if (value === null) {
    return { valueText: null, valueJson: 'null' };
  }

  if (typeof value === 'string') {
    return { valueText: value, valueJson: JSON.stringify(value) };
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return { valueText: String(value), valueJson: JSON.stringify(value) };
  }

  return { valueText: null, valueJson: JSON.stringify(value) };
}

function mapRecordType(row: DbRecordTypeRow): RecordType {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    processId: row.process_id,
    settings: safeJsonParse<RecordTypeSettings>(row.settings_json, {}),
    isActive: toBool(row.is_active),
    version: Number(row.version || 1),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecordField(row: DbRecordFieldRow): RecordField {
  const options = safeJsonParse<RecordFieldOption[]>(row.options_json, []);
  const validation = safeJsonParse<RecordFieldValidation>(row.validation_json, {});
  const rules = safeJsonParse<RecordFieldRule[]>(row.rules_json, []);

  return {
    id: row.id,
    recordTypeId: row.record_type_id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    required: toBool(row.required),
    options,
    defaultValue: parseStoredValue(row.default_value, row.default_value),
    placeholder: row.placeholder || '',
    helpText: row.help_text || '',
    validation,
    rules,
    displayOrder: Number(row.display_order || 0),
    isActive: toBool(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecordTypeRule(row: DbRecordRuleRow): RecordTypeRule {
  return {
    id: row.id,
    recordTypeId: row.record_type_id,
    name: row.rule_name,
    description: row.description || '',
    enabled: toBool(row.enabled),
    priority: Number(row.priority || 100),
    stopOnMatch: toBool(row.stop_on_match),
    when: safeJsonParse<RecordTypeRuleCondition[]>(row.conditions_json, []),
    then: safeJsonParse<RecordTypeRuleEffect[]>(row.effects_json, []),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cloneRecordValue(value: RecordValueInput | undefined): RecordValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;

  try {
    return JSON.parse(JSON.stringify(value)) as RecordValueInput;
  } catch {
    return value;
  }
}

function areRecordValuesEqual(a: RecordValueInput | undefined, b: RecordValueInput | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return a === b;

  if ((typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean')
    && (typeof b === 'string' || typeof b === 'number' || typeof b === 'boolean')) {
    return String(a) === String(b);
  }

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function fieldDefaultValue(field: RecordField): RecordValueInput | undefined {
  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
    return cloneRecordValue(field.defaultValue);
  }

  if (field.fieldType === 'checkbox') return false;
  return undefined;
}

function uniqueFieldKeys(keys: string[]): string[] {
  return Array.from(new Set(keys.map(key => normalizeText(key)).filter(Boolean)));
}

function buildRulesAuditPayload(
  beforeValues: Record<string, RecordValueInput>,
  afterValues: Record<string, RecordValueInput>,
  recordTypeRules: RecordTypeRule[]
): RulesAuditPayload {
  const changedKeys = uniqueFieldKeys(
    Object.keys(afterValues).filter(key => !areRecordValuesEqual(beforeValues[key], afterValues[key]))
  );

  if (changedKeys.length === 0) {
    return {
      shouldWrite: 0,
      changedFieldsJson: '[]',
      beforeJson: '{}',
      afterJson: '{}',
      detailsJson: '{}',
      autoFieldKeys: [],
    };
  }

  const beforeSnapshot: Record<string, RecordValueInput | null> = {};
  const afterSnapshot: Record<string, RecordValueInput | null> = {};

  changedKeys.forEach(key => {
    beforeSnapshot[key] = beforeValues[key] === undefined ? null : (cloneRecordValue(beforeValues[key]) as RecordValueInput);
    afterSnapshot[key] = afterValues[key] === undefined ? null : (cloneRecordValue(afterValues[key]) as RecordValueInput);
  });

  return {
    shouldWrite: 1,
    changedFieldsJson: safeJsonStringify(changedKeys, '[]'),
    beforeJson: safeJsonStringify(beforeSnapshot, '{}'),
    afterJson: safeJsonStringify(afterSnapshot, '{}'),
    detailsJson: safeJsonStringify({
      engine: 'record-rules-v1',
      ruleCount: recordTypeRules.length,
      changedFields: changedKeys,
    }, '{}'),
    autoFieldKeys: changedKeys,
  };
}

function mapRecordInstance(row: DbRecordInstanceRow): RecordInstance {
  return {
    id: row.id,
    recordTypeId: row.record_type_id,
    title: row.title || '',
    status: normalizeStatus(row.status),
    version: Number(row.version || 1),
    locked: toBool(row.locked),
    source: (normalizeText(row.source) || 'dynamic') as RecordSource,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by_name,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeFieldInput(fields: CreateRecordFieldInput[]): Array<{
  id: string;
  fieldKey: string;
  label: string;
  fieldType: RecordFieldType;
  required: number;
  options: RecordFieldOption[];
  defaultValue: string;
  placeholder: string;
  helpText: string;
  validation: RecordFieldValidation;
  rules: RecordFieldRule[];
  displayOrder: number;
  isActive: number;
}> {
  const seen = new Set<string>();

  return fields.map((field, index) => {
    const fieldKey = normalizeText(field.fieldKey);
    if (!fieldKey) throw new Error(`El campo #${index + 1} no tiene fieldKey.`);

    const fieldType = field.fieldType;
    if (!(fieldType && (['text', 'textarea', 'select', 'number', 'date', 'checkbox', 'computed'] as string[]).includes(fieldType))) {
      throw new Error(`Tipo de campo invalido para ${fieldKey}.`);
    }

    const dedupeKey = fieldKey.toLowerCase();
    if (seen.has(dedupeKey)) {
      throw new Error(`fieldKey duplicado detectado: ${fieldKey}.`);
    }
    seen.add(dedupeKey);

    const defaultRaw = field.defaultValue ?? '';
    const defaultValue = typeof defaultRaw === 'string' ? defaultRaw : JSON.stringify(defaultRaw);

    return {
      id: normalizeText(field.id) || generateId('rf'),
      fieldKey,
      label: normalizeText(field.label) || fieldKey,
      fieldType,
      required: field.required ? 1 : 0,
      options: field.options || [],
      defaultValue,
      placeholder: normalizeText(field.placeholder),
      helpText: normalizeText(field.helpText),
      validation: field.validation || {},
      rules: field.rules || [],
      displayOrder: Number.isFinite(Number(field.displayOrder)) ? Number(field.displayOrder) : index,
      isActive: field.isActive === false ? 0 : 1,
    };
  });
}

function buildValueRows(values: Record<string, RecordValueInput>): ValueUpsertRow[] {
  return Object.entries(values || {})
    .map(([fieldKey, value]) => {
      const key = normalizeText(fieldKey);
      if (!key) return null;
      const stored = valueToStorage(value);
      return {
        fieldKey: key,
        valueText: stored.valueText,
        valueJson: stored.valueJson,
      };
    })
    .filter((row): row is ValueUpsertRow => Boolean(row));
}

function escapeLike(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function trimDefinitionCacheToLimit(): void {
  while (recordDefinitionCacheById.size > RECORD_DEFINITION_CACHE_MAX) {
    const first = recordDefinitionCacheById.entries().next();
    if (first.done) break;
    const [recordTypeId, entry] = first.value;
    recordDefinitionCacheById.delete(recordTypeId);
    if (entry.codeKey) {
      const currentId = recordDefinitionCodeToId.get(entry.codeKey);
      if (currentId === recordTypeId) {
        recordDefinitionCodeToId.delete(entry.codeKey);
      }
    }
  }
}

function setDefinitionCache(definition: RecordDefinition): void {
  const recordTypeId = normalizeText(definition.recordType.id);
  const codeKey = normalizeRecordTypeCodeKey(definition.recordType.code);
  if (!recordTypeId || !codeKey) return;

  recordDefinitionCacheById.set(recordTypeId, {
    definition,
    codeKey,
    expiresAt: Date.now() + RECORD_DEFINITION_CACHE_TTL_MS,
  });

  recordDefinitionCodeToId.set(codeKey, recordTypeId);
  trimDefinitionCacheToLimit();
}

function getDefinitionCacheById(recordTypeId: string): RecordDefinition | null {
  const rid = normalizeText(recordTypeId);
  if (!rid) return null;

  const cached = recordDefinitionCacheById.get(rid);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    recordDefinitionCacheById.delete(rid);
    const mappedId = recordDefinitionCodeToId.get(cached.codeKey);
    if (mappedId === rid) {
      recordDefinitionCodeToId.delete(cached.codeKey);
    }
    return null;
  }

  return cached.definition;
}

function getDefinitionCacheByCode(recordTypeCode: string): RecordDefinition | null {
  const codeKey = normalizeRecordTypeCodeKey(recordTypeCode);
  if (!codeKey) return null;

  const mappedId = recordDefinitionCodeToId.get(codeKey);
  if (!mappedId) return null;
  return getDefinitionCacheById(mappedId);
}

function invalidateDefinitionCache(recordTypeId?: string, recordTypeCode?: string): void {
  const rid = normalizeText(recordTypeId);
  const codeKey = normalizeRecordTypeCodeKey(recordTypeCode);

  if (!rid && !codeKey) {
    recordDefinitionCacheById.clear();
    recordDefinitionCodeToId.clear();
    return;
  }

  if (rid) {
    const cached = recordDefinitionCacheById.get(rid);
    if (cached?.codeKey) {
      const mappedId = recordDefinitionCodeToId.get(cached.codeKey);
      if (mappedId === rid) {
        recordDefinitionCodeToId.delete(cached.codeKey);
      }
    }
    recordDefinitionCacheById.delete(rid);
  }

  if (codeKey) {
    const mappedId = recordDefinitionCodeToId.get(codeKey);
    if (mappedId) {
      recordDefinitionCacheById.delete(mappedId);
    }
    recordDefinitionCodeToId.delete(codeKey);
  }
}

async function loadFieldsForType(recordTypeId: string): Promise<RecordField[]> {
  const fieldRows = await dbAll<DbRecordFieldRow>(
    `SELECT id, record_type_id, field_key, label, field_type, required,
            options_json, default_value, placeholder, help_text,
            validation_json, rules_json, display_order, is_active,
            created_at, updated_at
     FROM dbo.record_fields
     WHERE record_type_id = ?
     ORDER BY display_order ASC, created_at ASC`,
    [recordTypeId]
  );

  return fieldRows.map(mapRecordField);
}

async function loadRecordDefinition(recordTypeId: string): Promise<RecordDefinition | null> {
  const rid = normalizeText(recordTypeId);
  if (!rid) return null;

  const cached = getDefinitionCacheById(rid);
  if (cached) return cached;

  const row = await dbGet<DbRecordTypeRow>(
    `SELECT id, code, name, description, process_id, settings_json, is_active, version,
            created_by, updated_by, created_at, updated_at
     FROM dbo.record_types
     WHERE id = ?`,
    [rid]
  );
  if (!row) {
    invalidateDefinitionCache(rid);
    return null;
  }

  const definition: RecordDefinition = {
    recordType: mapRecordType(row),
    fields: await loadFieldsForType(rid),
  };

  setDefinitionCache(definition);
  return definition;
}

async function loadRecordDefinitionByCode(recordTypeCode: string): Promise<RecordDefinition | null> {
  const code = normalizeText(recordTypeCode);
  if (!code) return null;

  const cached = getDefinitionCacheByCode(code);
  if (cached) return cached;

  const row = await dbGet<DbRecordTypeRow>(
    `SELECT id, code, name, description, process_id, settings_json, is_active, version,
            created_by, updated_by, created_at, updated_at
     FROM dbo.record_types
     WHERE LOWER(code) = LOWER(?)`,
    [code]
  );

  if (!row) {
    invalidateDefinitionCache(undefined, code);
    return null;
  }

  return loadRecordDefinition(row.id);
}

async function loadActiveRulesForType(recordTypeId: string): Promise<RecordTypeRule[]> {
  try {
    const rows = await dbAll<DbRecordRuleRow>(
      `SELECT id, record_type_id, rule_name, description, enabled, priority,
              stop_on_match, conditions_json, effects_json,
              created_by, updated_by, created_at, updated_at
       FROM dbo.record_rules
       WHERE record_type_id = ?
         AND enabled = 1
       ORDER BY priority ASC, created_at ASC`,
      [recordTypeId]
    );

    return rows.map(mapRecordTypeRule);
  } catch {
    // Tabla no disponible o esquema antiguo: no bloquear guardado legacy.
    return [];
  }
}

async function loadRecordValuesMap(recordId: string): Promise<Record<string, RecordValueInput>> {
  const rows = await dbAll<DbRecordValueRow>(
    `SELECT rv.id, rv.record_id, rv.field_id, rf.field_key, rv.value_text, rv.value_json, rv.created_at, rv.updated_at
     FROM dbo.record_values rv
     INNER JOIN dbo.record_fields rf ON rf.id = rv.field_id
     WHERE rv.record_id = ?`,
    [recordId]
  );

  const values: Record<string, RecordValueInput> = {};
  rows.forEach(row => {
    values[row.field_key] = parseStoredValue(row.value_json, row.value_text);
  });

  return values;
}

export const RegistroDinamicoRepo = {
  async createRecordType(input: CreateRecordTypeInput): Promise<string> {
    const code = normalizeText(input.code);
    const name = normalizeText(input.name);
    const processId = normalizeText(input.processId) || null;
    const actorUserId = normalizeText(input.actorUserId);
    const actorRole = normalizeText(input.actorRole);
    const actorUserName = normalizeText(input.actorUserName) || actorUserId;

    if (!code) throw new Error('code es obligatorio para crear un tipo de registro.');
    if (!name) throw new Error('name es obligatorio para crear un tipo de registro.');

    assertDefinitionPermission(actorUserId, actorRole);

    const actorUserIdFk = await resolveUserIdForForeignKey(actorUserId);

    const recordTypeId = normalizeText(input.id) || generateId('rt');
    const fields = sanitizeFieldInput(input.fields || []);

    const settingsJson = safeJsonStringify(input.settings || {}, '{}');
    const fieldsJson = safeJsonStringify(fields, '[]');
    const isActive = input.isActive === false ? 0 : 1;
    const version = Number.isFinite(Number(input.version)) ? Math.max(1, Number(input.version)) : 1;

    const auditAfter = safeJsonStringify({
      id: recordTypeId,
      code,
      name,
      processId,
      fieldCount: fields.length,
    }, '{}');

    const changedFieldsJson = safeJsonStringify(['code', 'name', 'description', 'fields', 'settings'], '[]');
    const detailsJson = safeJsonStringify({
      action: 'create_record_type',
      fieldCount: fields.length,
    }, '{}');

    await dbRun(
      `BEGIN TRY
         BEGIN TRANSACTION;

         IF EXISTS (SELECT 1 FROM dbo.record_types WHERE LOWER(code) = LOWER(?))
         BEGIN
           THROW 51000, 'Ya existe un tipo de registro con el mismo codigo.', 1;
         END;

         INSERT INTO dbo.record_types (
           id, code, name, description, process_id, settings_json, is_active, version,
           created_by, updated_by, created_at, updated_at
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME(), SYSDATETIME()
         );

         INSERT INTO dbo.record_fields (
           id, record_type_id, field_key, label, field_type, required,
           options_json, default_value, placeholder, help_text,
           validation_json, rules_json, display_order, is_active,
           created_at, updated_at
         )
         SELECT
           src.id,
           ?,
           src.field_key,
           src.label,
           src.field_type,
           src.required,
           src.options_json,
           src.default_value,
           src.placeholder,
           src.help_text,
           src.validation_json,
           src.rules_json,
           src.display_order,
           src.is_active,
           SYSDATETIME(),
           SYSDATETIME()
         FROM OPENJSON(?) WITH (
           id NVARCHAR(64) '$.id',
           field_key NVARCHAR(100) '$.fieldKey',
           label NVARCHAR(255) '$.label',
           field_type NVARCHAR(40) '$.fieldType',
           required INT '$.required',
           options_json NVARCHAR(MAX) '$.options' AS JSON,
           default_value NVARCHAR(MAX) '$.defaultValue',
           placeholder NVARCHAR(255) '$.placeholder',
           help_text NVARCHAR(MAX) '$.helpText',
           validation_json NVARCHAR(MAX) '$.validation' AS JSON,
           rules_json NVARCHAR(MAX) '$.rules' AS JSON,
           display_order INT '$.displayOrder',
           is_active INT '$.isActive'
         ) AS src
         WHERE src.field_key IS NOT NULL AND LTRIM(RTRIM(src.field_key)) <> '';

         INSERT INTO dbo.record_audit_log (
           id, record_id, record_type_id, entity, action, user_id, user_name, user_role,
           event_timestamp, before_json, after_json, changed_fields_json, details_json
         ) VALUES (
           ?, NULL, ?, 'record_type', 'create', ?, ?, ?,
           SYSDATETIME(), NULL, ?, ?, ?
         );

         COMMIT TRANSACTION;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      [
        code,
        recordTypeId,
        code,
        name,
        normalizeText(input.description),
        processId,
        settingsJson,
        isActive,
        version,
        actorUserIdFk,
        actorUserIdFk,
        recordTypeId,
        fieldsJson,
        generateId('raud'),
        recordTypeId,
        actorUserIdFk,
        actorUserName,
        actorRole,
        auditAfter,
        changedFieldsJson,
        detailsJson,
      ]
    );

    return recordTypeId;
  },

  async importRecordTypeFromExcel(input: ImportRecordTypeFromExcelInput): Promise<ImportRecordTypeFromExcelResult> {
    const fileName = normalizeText(input.fileName);
    const workbookBase64 = normalizeText(input.workbookBase64);
    const actorUserId = normalizeText(input.actorUserId);
    const actorRole = normalizeText(input.actorRole) || 'admin';
    const actorUserName = normalizeText(input.actorUserName) || actorUserId || 'Importador SGC';

    if (!fileName) {
      throw new Error('fileName es obligatorio para importar Excel.');
    }

    if (!workbookBase64) {
      throw new Error('workbookBase64 es obligatorio para importar Excel.');
    }

    assertDefinitionPermission(actorUserId, actorRole);

    const fileBaseName = stripFileExtension(fileName);
    if (!/^FP-05/i.test(fileBaseName)) {
      throw new Error('La importacion MVP actual solo acepta archivos FP-05.');
    }

    let workbookBuffer: Buffer;
    try {
      workbookBuffer = Buffer.from(workbookBase64, 'base64');
    } catch {
      throw new Error('No se pudo decodificar el contenido base64 del Excel.');
    }

    if (!workbookBuffer.length) {
      throw new Error('El Excel recibido esta vacio.');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(workbookBuffer, { type: 'buffer', cellDates: false, raw: false });
    } catch {
      throw new Error('No se pudo leer el workbook. Verifica que sea un archivo .xlsx valido.');
    }

    if (!workbook.SheetNames.length) {
      throw new Error('El workbook no contiene hojas para importar.');
    }

    const requestedSheetName = normalizeText(input.sheetName);
    const selectedSheetName = requestedSheetName && workbook.SheetNames.includes(requestedSheetName)
      ? requestedSheetName
      : workbook.SheetNames[0];

    const sheet = workbook.Sheets[selectedSheetName];
    if (!sheet) {
      throw new Error(`No se encontro la hoja "${selectedSheetName}" en el workbook.`);
    }

    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    }) as ExcelRow[];

    if (!rawRows.length) {
      throw new Error('La hoja seleccionada no contiene datos.');
    }

    const headerRowIndex = detectHeaderRowIndex(rawRows);
    const headerRow = rawRows[headerRowIndex] || [];
    const warnings: string[] = [];

    const fieldsWithColumn: Array<{ columnIndex: number; field: CreateRecordFieldInput }> = [];
    const usedFieldKeys = new Set<string>();
    const inspectedColumnCount = Math.min(
      MAX_EXCEL_IMPORT_COLUMNS,
      Math.max(headerRow.length, ...rawRows.slice(headerRowIndex, headerRowIndex + 30).map(row => row?.length || 0))
    );

    for (let columnIndex = 0; columnIndex < inspectedColumnCount; columnIndex += 1) {
      const label = normalizeExcelCellText(headerRow[columnIndex]);
      if (!label) continue;

      let fieldKeyBase = normalizeFieldKey(label, columnIndex);
      let fieldKey = fieldKeyBase;
      let suffix = 2;
      while (usedFieldKeys.has(fieldKey.toLowerCase())) {
        fieldKey = `${fieldKeyBase}_${suffix}`;
        suffix += 1;
      }

      if (fieldKey !== fieldKeyBase) {
        warnings.push(`Campo duplicado detectado. Ajustado a "${fieldKey}".`);
      }
      usedFieldKeys.add(fieldKey.toLowerCase());

      const samples: string[] = [];
      for (let rowIndex = headerRowIndex + 1; rowIndex < rawRows.length && samples.length < 80; rowIndex += 1) {
        const text = normalizeExcelCellText(rawRows[rowIndex]?.[columnIndex]);
        if (text) samples.push(text);
      }

      const inferred = inferFieldTypeFromSamples(samples);
      fieldsWithColumn.push({
        columnIndex,
        field: {
          fieldKey,
          label,
          fieldType: inferred.fieldType,
          required: false,
          options: inferred.options,
          displayOrder: fieldsWithColumn.length,
          helpText: `Importado desde ${fileName}`,
        },
      });
    }

    if (!fieldsWithColumn.length) {
      throw new Error('No se detectaron encabezados validos para construir campos dinamicos.');
    }

    const preferredCode = normalizeText(input.recordTypeCode) || fileBaseName;
    const recordTypeCode = await resolveAvailableRecordTypeCode(preferredCode);
    const recordTypeName = normalizeText(input.recordTypeName) || fileBaseName;
    const description = normalizeText(input.description) || `Tipo importado desde ${fileName}`;

    const recordTypeId = await RegistroDinamicoRepo.createRecordType({
      code: recordTypeCode,
      name: recordTypeName,
      description,
      actorUserId,
      actorUserName,
      actorRole,
      settings: {
        allowDraftAutosave: true,
        enableWorkflow: true,
        enableAudit: true,
        defaultStatus: 'borrador',
        tags: ['fp-05', 'excel-import'],
        metadata: {
          sourceFileName: fileName,
          sourceSheetName: selectedSheetName,
          headerRowNumber: headerRowIndex + 1,
        },
      },
      fields: fieldsWithColumn.map(item => item.field),
    });

    const seedRows = input.seedRows !== false;
    const rawSeedLimit = Number(input.seedRowsLimit);
    const seedLimit = Number.isFinite(rawSeedLimit)
      ? Math.max(0, Math.min(MAX_EXCEL_IMPORT_ROWS, Math.floor(rawSeedLimit)))
      : DEFAULT_EXCEL_IMPORT_ROWS;

    const columnIndexes = fieldsWithColumn.map(item => item.columnIndex);
    const candidateRows = rawRows
      .slice(headerRowIndex + 1)
      .filter(row => rowHasValues(row, columnIndexes));

    let recordsSeeded = 0;
    let skippedRows = 0;

    if (seedRows && seedLimit > 0) {
      for (let rowOffset = 0; rowOffset < candidateRows.length; rowOffset += 1) {
        if (recordsSeeded >= seedLimit) break;

        const row = candidateRows[rowOffset];
        const values: Record<string, RecordValueInput> = {};

        fieldsWithColumn.forEach(item => {
          const coerced = coerceExcelValueByFieldType(item.field.fieldType, row?.[item.columnIndex]);
          if (coerced === undefined) return;
          values[item.field.fieldKey] = coerced;
        });

        if (!Object.keys(values).length) {
          skippedRows += 1;
          continue;
        }

        const rowNumber = headerRowIndex + 2 + rowOffset;
        const title = `${recordTypeName} #${recordsSeeded + 1}`;

        try {
          await RegistroDinamicoRepo.createRecordInstance({
            recordTypeId,
            title,
            values,
            createdBy: actorUserId,
            createdByName: actorUserName,
            role: actorRole,
            source: 'migration',
            metadata: {
              importedFromExcel: true,
              sourceFileName: fileName,
              sourceSheetName: selectedSheetName,
              sourceRowNumber: rowNumber,
            },
          });
          recordsSeeded += 1;
        } catch (error) {
          skippedRows += 1;
          if (warnings.length < 20) {
            warnings.push(`Fila ${rowNumber} omitida: ${errorMessage(error)}`);
          }
        }
      }
    }

    if (seedRows && candidateRows.length > seedLimit) {
      warnings.push(`Se aplico limite de importacion de ${seedLimit} filas.`);
      skippedRows += Math.max(0, candidateRows.length - seedLimit);
    }

    return {
      recordTypeId,
      recordTypeCode,
      recordTypeName,
      sheetName: selectedSheetName,
      headerRowNumber: headerRowIndex + 1,
      fieldsCreated: fieldsWithColumn.length,
      recordsSeeded,
      skippedRows,
      warnings,
    };
  },

  async getRecordTypeById(id: string): Promise<RecordDefinition | null> {
    const recordTypeId = normalizeText(id);
    if (!recordTypeId) return null;
    return loadRecordDefinition(recordTypeId);
  },

  async getRecordTypeByCode(code: string): Promise<RecordDefinition | null> {
    const typeCode = normalizeText(code);
    if (!typeCode) return null;
    return loadRecordDefinitionByCode(typeCode);
  },

  async listRecordTypes(includeInactive: boolean = false): Promise<RecordType[]> {
    const rows = await dbAll<DbRecordTypeRow>(
      `SELECT id, code, name, description, process_id, settings_json, is_active, version,
              created_by, updated_by, created_at, updated_at
       FROM dbo.record_types
       WHERE (? = 1 OR is_active = 1)
       ORDER BY code ASC`,
      [includeInactive ? 1 : 0]
    );

    return rows.map(mapRecordType);
  },

  async listRecordRules(recordTypeId: string, includeDisabled: boolean = false): Promise<RecordTypeRule[]> {
    const rid = normalizeText(recordTypeId);
    if (!rid) return [];

    try {
      const rows = await dbAll<DbRecordRuleRow>(
        `SELECT id, record_type_id, rule_name, description, enabled, priority,
                stop_on_match, conditions_json, effects_json,
                created_by, updated_by, created_at, updated_at
         FROM dbo.record_rules
         WHERE record_type_id = ?
           AND (? = 1 OR enabled = 1)
         ORDER BY priority ASC, created_at ASC`,
        [rid, includeDisabled ? 1 : 0]
      );

      return rows.map(mapRecordTypeRule);
    } catch {
      return [];
    }
  },

  async getAvailableTransitions(input: GetRecordTransitionsInput): Promise<RecordTransitionOption[]> {
    const recordId = normalizeText(input.recordId);
    const actorUserId = normalizeText(input.userId);
    const role = normalizeText(input.role);

    if (!recordId) throw new Error('recordId es obligatorio para consultar transiciones.');
    if (!actorUserId) throw new Error('userId es obligatorio para consultar transiciones.');
    if (!role) throw new Error('role es obligatorio para consultar transiciones.');

    const current = await dbGet<DbRecordInstanceRow>(
      `SELECT id, record_type_id, title, status, version, locked, source,
              created_by, created_by_name, updated_by, updated_by_name,
              approved_by, approved_by_name, approved_at, created_at, updated_at
       FROM dbo.record_instances
       WHERE id = ?`,
      [recordId]
    );

    if (!current) {
      throw new Error('No se encontro el registro para consultar transiciones.');
    }

    const fromStatus = normalizeStatus(current.status);
    const candidateStatus = TRANSITION_MATRIX[fromStatus] || [];

    return candidateStatus.map(toStatus => {
      const permission = canTransition(fromStatus, toStatus, role, actorUserId, current.created_by);
      return {
        fromStatus,
        toStatus,
        action: TRANSITION_ACTION_MAP[toStatus] || `transition_${toStatus}`,
        label: TRANSITION_LABEL_MAP[toStatus] || `Transicionar a ${toStatus}`,
        requiresApprover: APPROVER_TRANSITIONS.has(toStatus),
        allowed: permission.allowed,
        reason: permission.allowed ? undefined : permission.reason,
      };
    });
  },

  async upsertRecordRule(input: UpsertRecordRuleInput): Promise<string> {
    const recordTypeId = normalizeText(input.recordTypeId);
    const name = normalizeText(input.name);
    const description = normalizeText(input.description);
    const actorUserId = normalizeText(input.actorUserId);
    const actorRole = normalizeText(input.actorRole);
    const actorUserName = normalizeText(input.actorUserName) || actorUserId;

    if (!recordTypeId) throw new Error('recordTypeId es obligatorio para configurar reglas.');
    if (!name) throw new Error('name es obligatorio para configurar reglas.');

    assertDefinitionPermission(actorUserId, actorRole);

    const actorUserIdFk = await resolveUserIdForForeignKey(actorUserId);

    const ruleId = normalizeText(input.id) || generateId('rr');
    const enabled = input.enabled === false ? 0 : 1;
    const priority = Number.isFinite(Number(input.priority)) ? Number(input.priority) : 100;
    const stopOnMatch = input.stopOnMatch ? 1 : 0;
    const when = Array.isArray(input.when) ? input.when : [];
    const then = Array.isArray(input.then) ? input.then : [];

    if (then.length === 0) {
      throw new Error('La regla debe incluir al menos una accion en then.');
    }

    const whenJson = safeJsonStringify(when, '[]');
    const thenJson = safeJsonStringify(then, '[]');

    const existingRule = await dbGet<{ id: string }>(
      `SELECT id FROM dbo.record_rules WHERE id = ?`,
      [ruleId]
    );
    const action = existingRule ? 'update' : 'create';

    const changedFieldsJson = safeJsonStringify([
      'rule_name',
      'description',
      'enabled',
      'priority',
      'stop_on_match',
      'conditions_json',
      'effects_json',
    ], '[]');

    const afterJson = safeJsonStringify({
      id: ruleId,
      recordTypeId,
      name,
      enabled: enabled === 1,
      priority,
      stopOnMatch: stopOnMatch === 1,
      conditions: when,
      effects: then,
    }, '{}');

    const detailsJson = safeJsonStringify({
      action: `${action}_record_rule`,
      by: actorUserId,
    }, '{}');

    await dbRun(
      `BEGIN TRY
         BEGIN TRANSACTION;

         IF NOT EXISTS (SELECT 1 FROM dbo.record_types WHERE id = ?)
         BEGIN
           THROW 51000, 'No existe el tipo de registro para la regla.', 1;
         END;

         IF EXISTS (
           SELECT 1
           FROM dbo.record_rules
           WHERE record_type_id = ?
             AND LOWER(rule_name) = LOWER(?)
             AND id <> ?
         )
         BEGIN
           THROW 51000, 'Ya existe otra regla con el mismo nombre para este tipo.', 1;
         END;

         IF EXISTS (SELECT 1 FROM dbo.record_rules WHERE id = ?)
         BEGIN
           UPDATE dbo.record_rules
              SET record_type_id = ?,
                  rule_name = ?,
                  description = ?,
                  enabled = ?,
                  priority = ?,
                  stop_on_match = ?,
                  conditions_json = ?,
                  effects_json = ?,
                  updated_by = ?,
                  updated_at = SYSDATETIME()
            WHERE id = ?;
         END;
         ELSE
         BEGIN
           INSERT INTO dbo.record_rules (
             id, record_type_id, rule_name, description, enabled, priority, stop_on_match,
             conditions_json, effects_json, created_by, updated_by, created_at, updated_at
           ) VALUES (
             ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, SYSDATETIME(), SYSDATETIME()
           );
         END;

         INSERT INTO dbo.record_audit_log (
           id, record_id, record_type_id, entity, action, user_id, user_name, user_role,
           event_timestamp, before_json, after_json, changed_fields_json, details_json
         ) VALUES (
           ?, NULL, ?, 'record_type', ?, ?, ?, ?,
           SYSDATETIME(), NULL, ?, ?, ?
         );

         COMMIT TRANSACTION;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      [
        recordTypeId,
        recordTypeId,
        name,
        ruleId,
        ruleId,
        recordTypeId,
        name,
        description,
        enabled,
        priority,
        stopOnMatch,
        whenJson,
        thenJson,
        actorUserIdFk,
        ruleId,
        ruleId,
        recordTypeId,
        name,
        description,
        enabled,
        priority,
        stopOnMatch,
        whenJson,
        thenJson,
        actorUserIdFk,
        actorUserIdFk,
        generateId('raud'),
        recordTypeId,
        action,
        actorUserIdFk,
        actorUserName,
        actorRole,
        afterJson,
        changedFieldsJson,
        detailsJson,
      ]
    );

    return ruleId;
  },

  async createRecordInstance(input: CreateRecordInput): Promise<string> {
    const recordTypeId = normalizeText(input.recordTypeId);
    const createdBy = normalizeText(input.createdBy);
    const createdByName = normalizeText(input.createdByName) || createdBy;
    const role = normalizeText(input.role);
    const title = normalizeText(input.title) || `Registro ${new Date().toISOString()}`;
    const source = (normalizeText(input.source) || 'dynamic') as RecordSource;

    if (!recordTypeId) throw new Error('recordTypeId es obligatorio.');

    assertWriteContext(createdBy, role, 'crear un registro dinamico');

    const createdByFk = await resolveUserIdForForeignKey(createdBy);

    const definition = await loadRecordDefinition(recordTypeId);
    if (!definition || !definition.recordType.isActive) {
      throw new Error('El tipo de registro no existe o esta inactivo.');
    }

    const activeFields = definition.fields.filter(field => field.isActive);
    const rules = await loadActiveRulesForType(recordTypeId);
    const autoValueContext: AutoValueContext = {
      operation: 'create',
      userId: createdBy,
      userName: createdByName,
      now: new Date(),
    };

    const inputValues: Record<string, RecordValueInput> = {};
    Object.entries(input.values || {}).forEach(([fieldKey, value]) => {
      const key = normalizeText(fieldKey);
      if (!key) return;
      inputValues[key] = resolveRecordValueAutoToken(value, autoValueContext) as RecordValueInput;
    });

    const valuesBeforeRules: Record<string, RecordValueInput> = {};
    activeFields.forEach(field => {
      const defaultValue = fieldDefaultValue(field);
      if (defaultValue !== undefined) {
        valuesBeforeRules[field.fieldKey] = defaultValue;
      }
    });
    Object.assign(valuesBeforeRules, inputValues);
    const contextAutoFieldKeys = applyAutoContextValues(activeFields, valuesBeforeRules, autoValueContext);

    const ruleResult = evaluateRecordRules({
      fields: activeFields,
      rules,
      values: valuesBeforeRules,
    });

    const valuesToPersist: Record<string, RecordValueInput> = { ...inputValues };
    contextAutoFieldKeys.forEach(fieldKey => {
      if (valuesBeforeRules[fieldKey] === undefined) return;
      valuesToPersist[fieldKey] = cloneRecordValue(valuesBeforeRules[fieldKey]) as RecordValueInput;
    });
    ruleResult.autoCalculatedFieldKeys.forEach(fieldKey => {
      if (ruleResult.values[fieldKey] === undefined) return;
      valuesToPersist[fieldKey] = cloneRecordValue(ruleResult.values[fieldKey]) as RecordValueInput;
    });

    const rulesAudit = buildRulesAuditPayload(valuesBeforeRules, ruleResult.values, rules);

    const recordId = generateId('ri');
    const valuesRows = buildValueRows(valuesToPersist);
    const valuesJson = safeJsonStringify(valuesRows, '[]');

    const changedFieldKeys = uniqueFieldKeys([
      ...Object.keys(valuesToPersist),
      ...contextAutoFieldKeys,
      ...rulesAudit.autoFieldKeys,
    ]);

    const auditAfter = safeJsonStringify({
      id: recordId,
      recordTypeId,
      title,
      values: changedFieldKeys,
      autoCalculatedFields: rulesAudit.autoFieldKeys,
    }, '{}');

    const changedFieldsJson = safeJsonStringify(changedFieldKeys, '[]');
    const detailsJson = safeJsonStringify({
      source,
      metadata: input.metadata || {},
      autoValue: {
        fields: contextAutoFieldKeys,
      },
      rules: {
        configured: rules.length,
        applied: ruleResult.appliedRuleIds.length,
        errors: ruleResult.errors,
      },
    }, '{}');

    await dbRun(
      `BEGIN TRY
         BEGIN TRANSACTION;

         IF NOT EXISTS (SELECT 1 FROM dbo.record_types WHERE id = ? AND is_active = 1)
         BEGIN
           THROW 51000, 'El tipo de registro no existe o esta inactivo.', 1;
         END;

         DECLARE @defaultStatus NVARCHAR(40) = (
           SELECT JSON_VALUE(settings_json, '$.defaultStatus')
           FROM dbo.record_types
           WHERE id = ?
         );

         IF @defaultStatus IS NULL OR @defaultStatus NOT IN ('borrador', 'en_revision', 'aprobado', 'rechazado', 'obsoleto')
         BEGIN
           SET @defaultStatus = 'borrador';
         END;

         INSERT INTO dbo.record_instances (
           id, record_type_id, title, status, version, locked, source,
           created_by, created_by_name, updated_by, updated_by_name,
           approved_by, approved_by_name, approved_at, created_at, updated_at
         ) VALUES (
           ?, ?, ?, @defaultStatus, 1,
           CASE WHEN @defaultStatus = 'aprobado' THEN 1 ELSE 0 END,
           ?, ?, ?, ?, ?, NULL, NULL, NULL, SYSDATETIME(), SYSDATETIME()
         );

         DECLARE @payload TABLE (
           field_key NVARCHAR(100) NOT NULL,
           value_text NVARCHAR(MAX) NULL,
           value_json NVARCHAR(MAX) NOT NULL
         );

         INSERT INTO @payload (field_key, value_text, value_json)
         SELECT src.field_key, src.value_text, src.value_json
         FROM OPENJSON(?) WITH (
           field_key NVARCHAR(100) '$.fieldKey',
           value_text NVARCHAR(MAX) '$.valueText',
           value_json NVARCHAR(MAX) '$.valueJson'
         ) AS src
         WHERE src.field_key IS NOT NULL AND LTRIM(RTRIM(src.field_key)) <> '';

         IF EXISTS (
           SELECT 1
           FROM @payload p
           LEFT JOIN dbo.record_fields f
             ON f.record_type_id = ?
            AND f.field_key = p.field_key
            AND f.is_active = 1
           WHERE f.id IS NULL
         )
         BEGIN
           THROW 51000, 'Se enviaron campos que no pertenecen al tipo de registro.', 1;
         END;

         ;WITH source_values AS (
           SELECT
             f.id AS field_id,
             p.value_text,
             p.value_json
           FROM @payload p
           INNER JOIN dbo.record_fields f
             ON f.record_type_id = ?
            AND f.field_key = p.field_key
            AND f.is_active = 1
         )
         UPDATE target
            SET value_text = source_values.value_text,
                value_json = source_values.value_json,
                updated_at = SYSDATETIME()
           FROM dbo.record_values target
           INNER JOIN source_values ON source_values.field_id = target.field_id
          WHERE target.record_id = ?;

         ;WITH source_values AS (
           SELECT
             f.id AS field_id,
             p.value_text,
             p.value_json
           FROM @payload p
           INNER JOIN dbo.record_fields f
             ON f.record_type_id = ?
            AND f.field_key = p.field_key
            AND f.is_active = 1
         )
         INSERT INTO dbo.record_values (id, record_id, field_id, value_text, value_json, created_at, updated_at)
         SELECT
           CONCAT('rv-', LOWER(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''))),
           ?,
           source_values.field_id,
           source_values.value_text,
           source_values.value_json,
           SYSDATETIME(),
           SYSDATETIME()
         FROM source_values
         WHERE NOT EXISTS (
           SELECT 1
           FROM dbo.record_values target
           WHERE target.record_id = ?
             AND target.field_id = source_values.field_id
         );

         INSERT INTO dbo.record_workflow (
           id, record_id, from_status, to_status, action, comments, metadata_json,
           performed_by, performed_by_name, performed_at
         ) VALUES (
           ?, ?, NULL, @defaultStatus, 'create', 'Creacion inicial de registro.', '{}',
           ?, ?, SYSDATETIME()
         );

         INSERT INTO dbo.record_audit_log (
           id, record_id, record_type_id, entity, action, user_id, user_name, user_role,
           event_timestamp, before_json, after_json, changed_fields_json, details_json
         ) VALUES (
           ?, ?, ?, 'record_instance', 'create', ?, ?, ?,
           SYSDATETIME(), NULL, ?, ?, ?
         );

         IF ? = 1
         BEGIN
           INSERT INTO dbo.record_audit_log (
             id, record_id, record_type_id, entity, action, user_id, user_name, user_role,
             event_timestamp, before_json, after_json, changed_fields_json, details_json
           ) VALUES (
             ?, ?, ?, 'record_value', 'calculate', ?, ?, ?,
             SYSDATETIME(), ?, ?, ?, ?
           );
         END;

         COMMIT TRANSACTION;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      [
        recordTypeId,
        recordTypeId,
        recordId,
        recordTypeId,
        title,
        source,
        createdByFk,
        createdByName,
        createdByFk,
        createdByName,
        valuesJson,
        recordTypeId,
        recordTypeId,
        recordId,
        recordTypeId,
        recordId,
        recordId,
        generateId('rwf'),
        recordId,
        createdByFk,
        createdByName,
        generateId('raud'),
        recordId,
        recordTypeId,
        createdByFk,
        createdByName,
        role,
        auditAfter,
        changedFieldsJson,
        detailsJson,
        rulesAudit.shouldWrite,
        generateId('raud'),
        recordId,
        recordTypeId,
        createdByFk,
        createdByName,
        role,
        rulesAudit.beforeJson,
        rulesAudit.afterJson,
        rulesAudit.changedFieldsJson,
        rulesAudit.detailsJson,
      ]
    );

    return recordId;
  },

  async updateRecordInstanceDraft(input: UpdateRecordInput): Promise<void> {
    const recordId = normalizeText(input.recordId);
    const updatedBy = normalizeText(input.updatedBy);
    const updatedByName = normalizeText(input.updatedByName) || updatedBy;
    const role = normalizeText(input.role);

    if (!recordId) throw new Error('recordId es obligatorio para actualizar.');

    assertWriteContext(updatedBy, role, 'actualizar un registro dinamico');

    const updatedByFk = await resolveUserIdForForeignKey(updatedBy);

    const current = await dbGet<DbRecordInstanceRow>(
      `SELECT id, record_type_id, title, status, version, locked, source,
              created_by, created_by_name, updated_by, updated_by_name,
              approved_by, approved_by_name, approved_at, created_at, updated_at
       FROM dbo.record_instances
       WHERE id = ?`,
      [recordId]
    );

    if (!current) {
      throw new Error('No se encontro el registro solicitado.');
    }

    const currentStatus = normalizeStatus(current.status);
    if (currentStatus !== 'borrador' || toBool(current.locked)) {
      throw new Error('Solo se pueden editar registros en estado borrador y no bloqueados.');
    }

    if (!isApproverRole(role) && current.created_by && normalizeText(current.created_by) !== updatedBy) {
      throw new Error('Solo el propietario del registro o un rol aprobador puede editar este registro.');
    }

    if (input.expectedVersion !== undefined && Number(input.expectedVersion) !== Number(current.version || 1)) {
      throw new Error('Conflicto de version detectado. Recarga el registro antes de guardar.');
    }

    const activeFields = (await loadFieldsForType(current.record_type_id)).filter(field => field.isActive);
    const rules = await loadActiveRulesForType(current.record_type_id);
    const autoValueContext: AutoValueContext = {
      operation: 'update',
      userId: updatedBy,
      userName: updatedByName,
      now: new Date(),
    };

    const inputValues: Record<string, RecordValueInput> = {};
    Object.entries(input.values || {}).forEach(([fieldKey, value]) => {
      const key = normalizeText(fieldKey);
      if (!key) return;
      inputValues[key] = resolveRecordValueAutoToken(value, autoValueContext) as RecordValueInput;
    });

    const currentValues = await loadRecordValuesMap(recordId);
    const valuesBeforeRules: Record<string, RecordValueInput> = {
      ...currentValues,
      ...inputValues,
    };
    const contextAutoFieldKeys = applyAutoContextValues(activeFields, valuesBeforeRules, autoValueContext);

    const ruleResult = evaluateRecordRules({
      fields: activeFields,
      rules,
      values: valuesBeforeRules,
    });

    const valuesToPersist: Record<string, RecordValueInput> = { ...inputValues };
    contextAutoFieldKeys.forEach(fieldKey => {
      if (valuesBeforeRules[fieldKey] === undefined) return;
      valuesToPersist[fieldKey] = cloneRecordValue(valuesBeforeRules[fieldKey]) as RecordValueInput;
    });
    ruleResult.autoCalculatedFieldKeys.forEach(fieldKey => {
      if (ruleResult.values[fieldKey] === undefined) return;
      valuesToPersist[fieldKey] = cloneRecordValue(ruleResult.values[fieldKey]) as RecordValueInput;
    });

    const rulesAudit = buildRulesAuditPayload(valuesBeforeRules, ruleResult.values, rules);

    const valuesRows = buildValueRows(valuesToPersist);
    const valuesJson = safeJsonStringify(valuesRows, '[]');
    const nextTitle = input.title !== undefined ? normalizeText(input.title) : null;

    const beforeJson = safeJsonStringify({
      title: current.title,
      status: currentStatus,
      version: Number(current.version || 1),
    }, '{}');

    const afterJson = safeJsonStringify({
      title: nextTitle !== null ? nextTitle : current.title,
      status: currentStatus,
      version: Number(current.version || 1) + 1,
    }, '{}');

    const changedFields = uniqueFieldKeys([
      ...(nextTitle !== null ? ['title'] : []),
      ...Object.keys(valuesToPersist),
      ...contextAutoFieldKeys,
      ...rulesAudit.autoFieldKeys,
    ]);

    const changedFieldsJson = safeJsonStringify(changedFields, '[]');
    const detailsJson = safeJsonStringify({
      action: 'update_record_instance_draft',
      comment: normalizeText(input.comment),
      metadata: input.metadata || {},
      autoValue: {
        fields: contextAutoFieldKeys,
      },
      rules: {
        configured: rules.length,
        applied: ruleResult.appliedRuleIds.length,
        errors: ruleResult.errors,
      },
    }, '{}');

    await dbRun(
      `BEGIN TRY
         BEGIN TRANSACTION;

         UPDATE dbo.record_instances
            SET title = COALESCE(?, title),
                version = version + 1,
                updated_by = ?,
                updated_by_name = ?,
                updated_at = SYSDATETIME()
          WHERE id = ?
            AND status = 'borrador'
            AND locked = 0
            AND version = ?;

         IF @@ROWCOUNT = 0
         BEGIN
           THROW 51000, 'El registro cambio de estado o version durante la edicion.', 1;
         END;

         DECLARE @payload TABLE (
           field_key NVARCHAR(100) NOT NULL,
           value_text NVARCHAR(MAX) NULL,
           value_json NVARCHAR(MAX) NOT NULL
         );

         INSERT INTO @payload (field_key, value_text, value_json)
         SELECT src.field_key, src.value_text, src.value_json
         FROM OPENJSON(?) WITH (
           field_key NVARCHAR(100) '$.fieldKey',
           value_text NVARCHAR(MAX) '$.valueText',
           value_json NVARCHAR(MAX) '$.valueJson'
         ) AS src
         WHERE src.field_key IS NOT NULL AND LTRIM(RTRIM(src.field_key)) <> '';

         IF EXISTS (
           SELECT 1
           FROM @payload p
           LEFT JOIN dbo.record_fields f
             ON f.record_type_id = ?
            AND f.field_key = p.field_key
            AND f.is_active = 1
           WHERE f.id IS NULL
         )
         BEGIN
           THROW 51000, 'Se enviaron campos que no pertenecen al tipo de registro.', 1;
         END;

         ;WITH source_values AS (
           SELECT
             f.id AS field_id,
             p.value_text,
             p.value_json
           FROM @payload p
           INNER JOIN dbo.record_fields f
             ON f.record_type_id = ?
            AND f.field_key = p.field_key
            AND f.is_active = 1
         )
         UPDATE target
            SET value_text = source_values.value_text,
                value_json = source_values.value_json,
                updated_at = SYSDATETIME()
           FROM dbo.record_values target
           INNER JOIN source_values ON source_values.field_id = target.field_id
          WHERE target.record_id = ?;

         ;WITH source_values AS (
           SELECT
             f.id AS field_id,
             p.value_text,
             p.value_json
           FROM @payload p
           INNER JOIN dbo.record_fields f
             ON f.record_type_id = ?
            AND f.field_key = p.field_key
            AND f.is_active = 1
         )
         INSERT INTO dbo.record_values (id, record_id, field_id, value_text, value_json, created_at, updated_at)
         SELECT
           CONCAT('rv-', LOWER(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''))),
           ?,
           source_values.field_id,
           source_values.value_text,
           source_values.value_json,
           SYSDATETIME(),
           SYSDATETIME()
         FROM source_values
         WHERE NOT EXISTS (
           SELECT 1
           FROM dbo.record_values target
           WHERE target.record_id = ?
             AND target.field_id = source_values.field_id
         );

         INSERT INTO dbo.record_audit_log (
           id, record_id, record_type_id, entity, action, user_id, user_name, user_role,
           event_timestamp, before_json, after_json, changed_fields_json, details_json
         ) VALUES (
           ?, ?, ?, 'record_instance', 'update', ?, ?, ?,
           SYSDATETIME(), ?, ?, ?, ?
         );

         IF ? = 1
         BEGIN
           INSERT INTO dbo.record_audit_log (
             id, record_id, record_type_id, entity, action, user_id, user_name, user_role,
             event_timestamp, before_json, after_json, changed_fields_json, details_json
           ) VALUES (
             ?, ?, ?, 'record_value', 'calculate', ?, ?, ?,
             SYSDATETIME(), ?, ?, ?, ?
           );
         END;

         COMMIT TRANSACTION;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      [
        nextTitle,
        updatedByFk,
        updatedByName,
        recordId,
        Number(current.version || 1),
        valuesJson,
        current.record_type_id,
        current.record_type_id,
        recordId,
        current.record_type_id,
        recordId,
        recordId,
        generateId('raud'),
        recordId,
        current.record_type_id,
        updatedByFk,
        updatedByName,
        role,
        beforeJson,
        afterJson,
        changedFieldsJson,
        detailsJson,
        rulesAudit.shouldWrite,
        generateId('raud'),
        recordId,
        current.record_type_id,
        updatedByFk,
        updatedByName,
        role,
        rulesAudit.beforeJson,
        rulesAudit.afterJson,
        rulesAudit.changedFieldsJson,
        rulesAudit.detailsJson,
      ]
    );
  },

  async getRecordsByType(input: QueryRecordsInput): Promise<QueryRecordsResult> {
    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(QUERY_MAX_PAGE_SIZE, Math.max(1, Number(input.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    const recordTypeId = normalizeText(input.recordTypeId) || null;
    const recordTypeCode = normalizeText(input.recordTypeCode) || null;
    const createdBy = normalizeText(input.createdBy) || null;
    const dateFrom = normalizeText(input.dateFrom) || null;
    const dateTo = normalizeText(input.dateTo) || null;
    const searchRaw = normalizeText(input.search).slice(0, QUERY_MAX_SEARCH_LENGTH);
    const searchPattern = searchRaw ? `%${escapeLike(searchRaw)}%` : null;

    const normalizedStatusList = Array.isArray(input.status)
      ? input.status.map(s => normalizeStatus(String(s)))
      : (input.status ? [normalizeStatus(String(input.status))] : []);

    const statusList = Array.from(new Set(normalizedStatusList)).slice(0, RECORD_STATUS.length);

    const hasStatusFilter = statusList.length > 0 ? 1 : 0;
    const statusJson = safeJsonStringify(statusList, '[]');

    const sortMap: Record<string, string> = {
      createdAt: 'ri.created_at',
      updatedAt: 'ri.updated_at',
      title: 'ri.title',
      status: 'ri.status',
    };

    const sortByKey = normalizeText(input.sortBy) || 'updatedAt';
    const sortBySql = sortMap[sortByKey] || sortMap.updatedAt;
    const sortDirection = normalizeText(input.sortDirection).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const totalRow = await dbGet<DbCountRow>(
      `SELECT COUNT(1) AS total
       FROM dbo.record_instances ri
       INNER JOIN dbo.record_types rt ON rt.id = ri.record_type_id
       WHERE (? IS NULL OR ri.record_type_id = ?)
         AND (? IS NULL OR LOWER(rt.code) = LOWER(?))
         AND (? IS NULL OR ri.created_by = ?)
         AND (? IS NULL OR ri.created_at >= ?)
         AND (? IS NULL OR ri.created_at <= ?)
         AND (? = 0 OR ri.status IN (SELECT [value] FROM OPENJSON(?)))
         AND (? IS NULL OR ri.title LIKE ? ESCAPE '\\')`,
      [
        recordTypeId, recordTypeId,
        recordTypeCode, recordTypeCode,
        createdBy, createdBy,
        dateFrom, dateFrom,
        dateTo, dateTo,
        hasStatusFilter, statusJson,
        searchPattern, searchPattern,
      ]
    );

    const rows = await dbAll<DbRecordInstanceRow>(
      `SELECT ri.id, ri.record_type_id, ri.title, ri.status, ri.version, ri.locked, ri.source,
              ri.created_by, ri.created_by_name, ri.updated_by, ri.updated_by_name,
              ri.approved_by, ri.approved_by_name, ri.approved_at, ri.created_at, ri.updated_at
       FROM dbo.record_instances ri
       INNER JOIN dbo.record_types rt ON rt.id = ri.record_type_id
       WHERE (? IS NULL OR ri.record_type_id = ?)
         AND (? IS NULL OR LOWER(rt.code) = LOWER(?))
         AND (? IS NULL OR ri.created_by = ?)
         AND (? IS NULL OR ri.created_at >= ?)
         AND (? IS NULL OR ri.created_at <= ?)
         AND (? = 0 OR ri.status IN (SELECT [value] FROM OPENJSON(?)))
         AND (? IS NULL OR ri.title LIKE ? ESCAPE '\\')
       ORDER BY ${sortBySql} ${sortDirection}
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [
        recordTypeId, recordTypeId,
        recordTypeCode, recordTypeCode,
        createdBy, createdBy,
        dateFrom, dateFrom,
        dateTo, dateTo,
        hasStatusFilter, statusJson,
        searchPattern, searchPattern,
        offset, pageSize,
      ]
    );

    const instances = rows.map(mapRecordInstance);

    if (input.includeValues && instances.length > 0) {
      const idsJson = safeJsonStringify(instances.map(item => item.id), '[]');
      const valueRows = await dbAll<DbRecordValueRow>(
        `SELECT rv.id, rv.record_id, rv.field_id, rf.field_key, rv.value_text, rv.value_json, rv.created_at, rv.updated_at
         FROM dbo.record_values rv
         INNER JOIN dbo.record_fields rf ON rf.id = rv.field_id
         WHERE rv.record_id IN (SELECT [value] FROM OPENJSON(?))`,
        [idsJson]
      );

      const byRecord = new Map<string, Record<string, RecordValueInput>>();
      valueRows.forEach(row => {
        if (!byRecord.has(row.record_id)) byRecord.set(row.record_id, {});
        const current = byRecord.get(row.record_id);
        if (!current) return;
        current[row.field_key] = parseStoredValue(row.value_json, row.value_text);
      });

      instances.forEach(instance => {
        instance.fieldValues = byRecord.get(instance.id) || {};
      });
    }

    const total = Number(totalRow?.total || 0);
    return {
      data: instances,
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
    };
  },

  async getRecordInstanceDetail(recordId: string): Promise<RecordInstanceDetail | null> {
    const rid = normalizeText(recordId);
    if (!rid) return null;

    const instanceRow = await dbGet<DbRecordInstanceRow>(
      `SELECT id, record_type_id, title, status, version, locked, source,
              created_by, created_by_name, updated_by, updated_by_name,
              approved_by, approved_by_name, approved_at, created_at, updated_at
       FROM dbo.record_instances
       WHERE id = ?`,
      [rid]
    );

    if (!instanceRow) return null;

    const definition = await loadRecordDefinition(instanceRow.record_type_id);
    if (!definition) {
      throw new Error('No se pudo resolver la definicion del tipo de registro.');
    }

    const valuesRows = await dbAll<DbRecordValueRow>(
      `SELECT rv.id, rv.record_id, rv.field_id, rf.field_key, rv.value_text, rv.value_json, rv.created_at, rv.updated_at
       FROM dbo.record_values rv
       INNER JOIN dbo.record_fields rf ON rf.id = rv.field_id
       WHERE rv.record_id = ?
       ORDER BY rf.display_order ASC, rv.created_at ASC`,
      [rid]
    );

    const values: RecordValue[] = valuesRows.map(row => ({
      id: row.id,
      recordId: row.record_id,
      fieldId: row.field_id,
      valueText: row.value_text,
      valueJson: row.value_json ? safeJsonParse<RecordValueInput>(row.value_json, row.value_text ?? '') : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const fieldValues: Record<string, RecordValueInput> = {};
    valuesRows.forEach(row => {
      fieldValues[row.field_key] = parseStoredValue(row.value_json, row.value_text);
    });

    const workflowRows = await dbAll<{
      id: string;
      record_id: string;
      from_status: string | null;
      to_status: string;
      action: string;
      comments: string;
      metadata_json: string;
      performed_by: string | null;
      performed_by_name: string | null;
      performed_at: string;
    }>(
      `SELECT id, record_id, from_status, to_status, action, comments,
              metadata_json, performed_by, performed_by_name, performed_at
       FROM dbo.record_workflow
       WHERE record_id = ?
       ORDER BY performed_at DESC`,
      [rid]
    );

    const workflow: RecordWorkflowState[] = workflowRows.map(row => ({
      id: row.id,
      recordId: row.record_id,
      fromStatus: row.from_status ? normalizeStatus(row.from_status) : null,
      toStatus: normalizeStatus(row.to_status),
      action: row.action,
      comments: row.comments || '',
      metadata: safeJsonParse<Record<string, unknown>>(row.metadata_json, {}),
      performedBy: row.performed_by,
      performedByName: row.performed_by_name,
      performedAt: row.performed_at,
    }));

    const instance = mapRecordInstance(instanceRow);
    instance.fieldValues = fieldValues;

    return {
      instance,
      definition,
      values,
      workflow,
    };
  },

  async getRecordAuditHistory(input: GetRecordAuditHistoryInput): Promise<QueryRecordAuditHistoryResult> {
    const recordId = normalizeText(input.recordId);
    if (!recordId) {
      throw new Error('recordId es obligatorio para consultar auditoria.');
    }

    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(input.pageSize || 30)));
    const offset = (page - 1) * pageSize;

    const actionInput = Array.isArray(input.actions)
      ? input.actions
      : (input.actions ? [input.actions] : []);

    const actions = actionInput
      .map(action => normalizeAuditAction(String(action)))
      .filter((action, index, arr) => arr.indexOf(action) === index);

    const hasActionFilter = actions.length > 0 ? 1 : 0;
    const actionsJson = safeJsonStringify(actions, '[]');

    const totalRow = await dbGet<DbCountRow>(
      `SELECT COUNT(1) AS total
       FROM dbo.record_audit_log
       WHERE record_id = ?
         AND (? = 0 OR action IN (SELECT [value] FROM OPENJSON(?)))`,
      [recordId, hasActionFilter, actionsJson]
    );

    const rows = await dbAll<DbRecordAuditRow>(
      `SELECT id, record_id, record_type_id, entity, action,
              user_id, user_name, user_role,
              event_timestamp, before_json, after_json, changed_fields_json, details_json
       FROM dbo.record_audit_log
       WHERE record_id = ?
         AND (? = 0 OR action IN (SELECT [value] FROM OPENJSON(?)))
       ORDER BY event_timestamp DESC
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [recordId, hasActionFilter, actionsJson, offset, pageSize]
    );

    const timeline = rows
      .map(mapRecordAuditLog)
      .map(mapAuditTimelineEntry);

    const total = Number(totalRow?.total || 0);
    return {
      data: timeline,
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
    };
  },

  async transitionRecordState(input: TransitionRecordStateInput): Promise<void> {
    const recordId = normalizeText(input.recordId);
    const toStatus = normalizeStatus(input.toStatus);
    const performedBy = normalizeText(input.performedBy);
    const performedByName = normalizeText(input.performedByName) || performedBy;
    const role = normalizeText(input.role);

    if (!recordId) throw new Error('recordId es obligatorio para transicionar estado.');

    assertWriteContext(performedBy, role, 'transicionar estado del registro');

    const performedByFk = await resolveUserIdForForeignKey(performedBy);

    const current = await dbGet<DbRecordInstanceRow>(
      `SELECT id, record_type_id, title, status, version, locked, source,
              created_by, created_by_name, updated_by, updated_by_name,
              approved_by, approved_by_name, approved_at, created_at, updated_at
       FROM dbo.record_instances
       WHERE id = ?`,
      [recordId]
    );

    if (!current) {
      throw new Error('No se encontro el registro para transicion.');
    }

    const fromStatus = normalizeStatus(current.status);
    assertTransitionAllowed(fromStatus, toStatus, role, performedBy, current.created_by);

    const action = normalizeText(input.action) || `transition_${toStatus}`;
    const comments = normalizeText(input.comments);
    const metadataJson = safeJsonStringify(input.metadata || {}, '{}');

    const beforeJson = safeJsonStringify({
      status: fromStatus,
      version: Number(current.version || 1),
      locked: toBool(current.locked),
    }, '{}');

    const afterJson = safeJsonStringify({
      status: toStatus,
      version: Number(current.version || 1) + 1,
      locked: toStatus === 'aprobado' ? true : (toStatus === 'borrador' || toStatus === 'en_revision' || toStatus === 'rechazado' ? false : toBool(current.locked)),
    }, '{}');

    const changedFieldsJson = safeJsonStringify(['status', 'version', 'locked'], '[]');
    const detailsJson = safeJsonStringify({ action, comments }, '{}');
    const deleteDetailsJson = safeJsonStringify({
      reason: comments || 'Marcado obsoleto desde workflow.',
      action,
      softDelete: true,
    }, '{}');

    await dbRun(
      `BEGIN TRY
         BEGIN TRANSACTION;

         UPDATE dbo.record_instances
            SET status = ?,
                locked = CASE
                  WHEN ? = 'aprobado' THEN 1
                  WHEN ? IN ('borrador', 'en_revision', 'rechazado') THEN 0
                  ELSE locked
                END,
                approved_by = CASE WHEN ? = 'aprobado' THEN ? ELSE approved_by END,
                approved_by_name = CASE WHEN ? = 'aprobado' THEN ? ELSE approved_by_name END,
                approved_at = CASE WHEN ? = 'aprobado' THEN SYSDATETIME() ELSE approved_at END,
                updated_by = ?,
                updated_by_name = ?,
                updated_at = SYSDATETIME(),
                version = version + 1
          WHERE id = ?
            AND status = ?;

         IF @@ROWCOUNT = 0
         BEGIN
           THROW 51000, 'El registro cambio de estado durante la transicion.', 1;
         END;

         INSERT INTO dbo.record_workflow (
           id, record_id, from_status, to_status, action, comments, metadata_json,
           performed_by, performed_by_name, performed_at
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, SYSDATETIME()
         );

         INSERT INTO dbo.record_audit_log (
           id, record_id, record_type_id, entity, action, user_id, user_name, user_role,
           event_timestamp, before_json, after_json, changed_fields_json, details_json
         ) VALUES (
           ?, ?, ?, 'record_workflow', 'transition', ?, ?, ?,
           SYSDATETIME(), ?, ?, ?, ?
         );

         IF ? = 'obsoleto'
         BEGIN
           INSERT INTO dbo.record_audit_log (
             id, record_id, record_type_id, entity, action, user_id, user_name, user_role,
             event_timestamp, before_json, after_json, changed_fields_json, details_json
           ) VALUES (
             ?, ?, ?, 'record_instance', 'delete', ?, ?, ?,
             SYSDATETIME(), ?, ?, ?, ?
           );
         END;

         COMMIT TRANSACTION;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      [
        toStatus,
        toStatus,
        toStatus,
        toStatus,
        performedByFk,
        toStatus,
        performedByName,
        toStatus,
        performedByFk,
        performedByName,
        recordId,
        fromStatus,
        generateId('rwf'),
        recordId,
        fromStatus,
        toStatus,
        action,
        comments,
        metadataJson,
        performedByFk,
        performedByName,
        generateId('raud'),
        recordId,
        current.record_type_id,
        performedByFk,
        performedByName,
        role,
        beforeJson,
        afterJson,
        changedFieldsJson,
        detailsJson,
        toStatus,
        generateId('raud'),
        recordId,
        current.record_type_id,
        performedByFk,
        performedByName,
        role,
        beforeJson,
        afterJson,
        changedFieldsJson,
        deleteDetailsJson,
      ]
    );
  },
};
