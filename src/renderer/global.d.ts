import type {
  CreateRecordInput,
  GetRecordAuditHistoryInput,
  GetRecordTransitionsInput,
  GetRecordDefinitionInput,
  QueryRecordAuditHistoryResult,
  QueryRecordsInput,
  QueryRecordsResult,
  RecordDefinition,
  RecordTransitionOption,
  TransitionRecordInput,
  UpdateRecordInput,
} from '../shared/types/registros-dinamicos';
import type {
  AnalyzeRagRecordInput,
  GetRagAnswerInput,
  GetRagEvidenceInput,
  IngestRagDocumentNodeInput,
  RagAnalyzeRecordResult,
  RagAnswer,
  RagEvidenceResult,
  RagIngestDocumentNodeResult,
  RagStatusResult,
  SubmitRagFeedbackInput,
} from '../shared/types/rag';

declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, data: unknown) => void;
      receive: (channel: string, func: (...args: unknown[]) => void) => void;
      setContentProtection: (enabled: boolean) => Promise<boolean>;
      getContentProtection: () => Promise<boolean>;
      openPath: (filePath: string) => Promise<boolean>;
      readFileAsDataUrl: (filePath: string, mimeType?: string) => Promise<string | null>;
      readFileAsBuffer: (filePath: string) => Promise<Uint8Array | null>;
    };
    repo: {
      call: (repo: string, method: string, ...args: unknown[]) => Promise<unknown>;
    };
    records: {
      create: (input: CreateRecordInput) => Promise<string>;
      update: (input: UpdateRecordInput) => Promise<boolean>;
      getByType: (input?: QueryRecordsInput) => Promise<QueryRecordsResult>;
      getDefinition: (input: GetRecordDefinitionInput) => Promise<RecordDefinition | null>;
      getTransitions: (input: GetRecordTransitionsInput) => Promise<RecordTransitionOption[]>;
      getAuditHistory: (input: GetRecordAuditHistoryInput) => Promise<QueryRecordAuditHistoryResult>;
      transition: (input: TransitionRecordInput) => Promise<boolean>;
    };
    rag: {
      getStatus: () => Promise<RagStatusResult>;
      analyzeRecord: (input: AnalyzeRagRecordInput) => Promise<RagAnalyzeRecordResult>;
      ingestDocumentNode: (input: IngestRagDocumentNodeInput) => Promise<RagIngestDocumentNodeResult>;
      getAnswer: (input: GetRagAnswerInput) => Promise<RagAnswer | null>;
      submitFeedback: (input: SubmitRagFeedbackInput) => Promise<string>;
      getEvidence: (input: GetRagEvidenceInput) => Promise<RagEvidenceResult>;
    };
  }
}

export {};
