// 2.13 Registros dinamicos (ISO 9001)
import type { PaginatedResult, SortDirection } from './common';

export type RecordFieldType = 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'computed';

export type RecordInstanceStatus = 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'obsoleto';

export type RecordStatus = RecordInstanceStatus | 'anulado';

export type RecordSource = 'dynamic' | 'migration' | 'integration';

export type RecordRuleOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

export type RecordRuleEffectMode = 'replace' | 'append' | 'prepend';

export type RecordRuleExpressionType = 'copy' | 'concat' | 'sum';

export type RecordAuditEntity = 'record_type' | 'record_field' | 'record_instance' | 'record_value' | 'record_workflow';

export type RecordAuditAction = 'create' | 'update' | 'delete' | 'transition' | 'calculate';

export type RecordPrimitiveValue = string | number | boolean | null;

export type RecordObjectValue = Record<string, unknown>;

export type RecordArrayValue = Array<RecordPrimitiveValue | RecordObjectValue>;

export type RecordValueInput = RecordPrimitiveValue | RecordObjectValue | RecordArrayValue;

export interface RecordFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RecordFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
  allowFutureDates?: boolean;
}

export interface RecordFieldRuleCondition {
  fieldKey: string;
  operator: RecordRuleOperator;
  value?: RecordValueInput;
}

export interface RecordFieldRuleEffect {
  setFieldKey: string;
  value: RecordValueInput;
  mode?: RecordRuleEffectMode;
}

export interface RecordFieldRule {
  id: string;
  enabled: boolean;
  when: RecordFieldRuleCondition[];
  then: RecordFieldRuleEffect[];
  stopOnMatch?: boolean;
}

export interface RecordRuleExpression {
  type: RecordRuleExpressionType;
  fieldKey?: string;
  fieldKeys?: string[];
  template?: string;
  precision?: number;
}

export interface RecordTypeRuleCondition {
  fieldKey: string;
  operator: RecordRuleOperator;
  value?: RecordValueInput;
}

export interface RecordTypeRuleEffect {
  setFieldKey: string;
  mode?: RecordRuleEffectMode;
  value?: RecordValueInput;
  valueFromFieldKey?: string;
  expression?: RecordRuleExpression;
}

export interface RecordTypeRule {
  id: string;
  recordTypeId: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  stopOnMatch: boolean;
  when: RecordTypeRuleCondition[];
  then: RecordTypeRuleEffect[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordTypeSettings {
  allowDraftAutosave?: boolean;
  enableWorkflow?: boolean;
  enableAudit?: boolean;
  defaultStatus?: RecordInstanceStatus;
  tags?: string[];
  ui?: {
    icon?: string;
    color?: string;
    listColumns?: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface RecordType {
  id: string;
  code: string;
  name: string;
  description: string;
  processId: string | null;
  settings: RecordTypeSettings;
  isActive: boolean;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordField {
  id: string;
  recordTypeId: string;
  fieldKey: string;
  label: string;
  fieldType: RecordFieldType;
  required: boolean;
  options: RecordFieldOption[];
  defaultValue: RecordValueInput;
  placeholder: string;
  helpText: string;
  validation: RecordFieldValidation;
  rules: RecordFieldRule[];
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecordInstance {
  id: string;
  recordTypeId: string;
  title: string;
  status: RecordInstanceStatus;
  version: number;
  locked: boolean;
  source: RecordSource;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fieldValues?: Record<string, RecordValueInput>;
}

export interface RecordValue {
  id: string;
  recordId: string;
  fieldId: string;
  valueText: string | null;
  valueJson: RecordValueInput | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordWorkflowState {
  id: string;
  recordId: string;
  fromStatus: RecordInstanceStatus | null;
  toStatus: RecordInstanceStatus;
  action: string;
  comments: string;
  metadata: Record<string, unknown>;
  performedBy: string | null;
  performedByName: string | null;
  performedAt: string;
}

export interface RecordAuditLog {
  id: string;
  recordId: string | null;
  recordTypeId: string | null;
  entity: RecordAuditEntity;
  action: RecordAuditAction;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  eventTimestamp: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields: string[] | null;
  details: Record<string, unknown> | null;
}

export interface RecordAuditTimelineChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface RecordAuditTimelineEntry {
  id: string;
  recordId: string | null;
  recordTypeId: string | null;
  entity: RecordAuditEntity;
  action: RecordAuditAction;
  timestamp: string;
  title: string;
  description: string;
  actor: {
    userId: string | null;
    userName: string | null;
    role: string | null;
  };
  changedFields: string[];
  changes: RecordAuditTimelineChange[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
}

export interface GetRecordAuditHistoryInput {
  recordId: string;
  page?: number;
  pageSize?: number;
  actions?: RecordAuditAction | RecordAuditAction[];
}

export interface QueryRecordAuditHistoryResult extends PaginatedResult<RecordAuditTimelineEntry> {}

export interface CreateRecordInput {
  recordTypeId: string;
  title?: string;
  values: Record<string, RecordValueInput>;
  createdBy: string;
  createdByName?: string;
  role?: string;
  source?: RecordSource;
  metadata?: Record<string, unknown>;
}

export interface UpdateRecordInput {
  recordId: string;
  title?: string;
  values: Record<string, RecordValueInput>;
  expectedVersion?: number;
  updatedBy: string;
  updatedByName?: string;
  role?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryRecordsInput {
  recordTypeId?: string;
  recordTypeCode?: string;
  status?: RecordInstanceStatus | RecordInstanceStatus[];
  createdBy?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'status';
  sortDirection?: SortDirection;
  includeValues?: boolean;
}

export interface GetRecordDefinitionInput {
  recordTypeId?: string;
  recordTypeCode?: string;
  includeInactive?: boolean;
}

export interface TransitionRecordInput {
  recordId: string;
  toStatus: RecordInstanceStatus;
  action?: string;
  comments?: string;
  metadata?: Record<string, unknown>;
  performedBy: string;
  performedByName?: string;
  role: string;
}

export interface GetRecordTransitionsInput {
  recordId: string;
  userId: string;
  role: string;
}

export interface RecordTransitionOption {
  fromStatus: RecordInstanceStatus;
  toStatus: RecordInstanceStatus;
  action: string;
  label: string;
  requiresApprover: boolean;
  allowed: boolean;
  reason?: string;
}

export interface QueryRecordsResult extends PaginatedResult<RecordInstance> {}

export interface RecordDefinition {
  recordType: RecordType;
  fields: RecordField[];
}
