// Script de preload para exponer APIs seguras a renderer
import { contextBridge, ipcRenderer } from 'electron';
<<<<<<< HEAD
=======
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

type RecordsApi = {
  create: (input: CreateRecordInput) => Promise<string>;
  update: (input: UpdateRecordInput) => Promise<boolean>;
  getByType: (input?: QueryRecordsInput) => Promise<QueryRecordsResult>;
  getDefinition: (input: GetRecordDefinitionInput) => Promise<RecordDefinition | null>;
  getTransitions: (input: GetRecordTransitionsInput) => Promise<RecordTransitionOption[]>;
  getAuditHistory: (input: GetRecordAuditHistoryInput) => Promise<QueryRecordAuditHistoryResult>;
  transition: (input: TransitionRecordInput) => Promise<boolean>;
};

type RagApi = {
  getStatus: () => Promise<RagStatusResult>;
  analyzeRecord: (input: AnalyzeRagRecordInput) => Promise<RagAnalyzeRecordResult>;
  ingestDocumentNode: (input: IngestRagDocumentNodeInput) => Promise<RagIngestDocumentNodeResult>;
  getAnswer: (input: GetRagAnswerInput) => Promise<RagAnswer | null>;
  submitFeedback: (input: SubmitRagFeedbackInput) => Promise<string>;
  getEvidence: (input: GetRagEvidenceInput) => Promise<RagEvidenceResult>;
};
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6

contextBridge.exposeInMainWorld('electronAPI', {
  // Ejemplo: enviar mensaje
  send: (channel: string, data: any) => ipcRenderer.send(channel, data),
  receive: (channel: string, func: (...args: any[]) => void) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
  setContentProtection: (enabled: boolean) => ipcRenderer.invoke('window:set-content-protection', enabled),
  getContentProtection: () => ipcRenderer.invoke('window:get-content-protection'),
  openPath: (filePath: string) => ipcRenderer.invoke('window:open-path', filePath),
  readFileAsDataUrl: (filePath: string, mimeType?: string) => ipcRenderer.invoke('window:read-file-data-url', filePath, mimeType),
  readFileAsBuffer: (filePath: string) => ipcRenderer.invoke('window:read-file-buffer', filePath)
});

// Puente seguro para invocar repositorios desde el renderer
contextBridge.exposeInMainWorld('repo', {
  call: (repo: string, method: string, ...args: any[]) =>
    ipcRenderer.invoke('repo:call', { repo, method, args })
});

<<<<<<< HEAD
// Puente seguro para la autenticación y sesiones
contextBridge.exposeInMainWorld('auth', {
  login: (login: string, password?: string) =>
    ipcRenderer.invoke('auth:login', { login, password }),
  getSession: (sessionId: string) =>
    ipcRenderer.invoke('auth:get-session', { sessionId }),
  logout: (sessionId: string) =>
    ipcRenderer.invoke('auth:logout', { sessionId })
});

// Puente seguro para las métricas del dashboard
contextBridge.exposeInMainWorld('dashboard', {
  getMetrics: () => ipcRenderer.invoke('dashboard:get-metrics')
});


=======
const recordsApi: RecordsApi = {
  create: (input: CreateRecordInput) => ipcRenderer.invoke('records:create', input),
  update: (input: UpdateRecordInput) => ipcRenderer.invoke('records:update', input),
  getByType: (input?: QueryRecordsInput) => ipcRenderer.invoke('records:get-by-type', input || {}),
  getDefinition: (input: GetRecordDefinitionInput) => ipcRenderer.invoke('records:get-definition', input),
  getTransitions: (input: GetRecordTransitionsInput) => ipcRenderer.invoke('records:get-transitions', input),
  getAuditHistory: (input: GetRecordAuditHistoryInput) => ipcRenderer.invoke('records:get-audit-history', input),
  transition: (input: TransitionRecordInput) => ipcRenderer.invoke('records:transition', input),
};

contextBridge.exposeInMainWorld('records', recordsApi);

const ragApi: RagApi = {
  getStatus: () => ipcRenderer.invoke('rag:get-status'),
  analyzeRecord: (input: AnalyzeRagRecordInput) => ipcRenderer.invoke('rag:analyze-record', input),
  ingestDocumentNode: (input: IngestRagDocumentNodeInput) => ipcRenderer.invoke('rag:ingest-document-node', input),
  getAnswer: (input: GetRagAnswerInput) => ipcRenderer.invoke('rag:get-answer', input),
  submitFeedback: (input: SubmitRagFeedbackInput) => ipcRenderer.invoke('rag:submit-feedback', input),
  getEvidence: (input: GetRagEvidenceInput) => ipcRenderer.invoke('rag:get-evidence', input),
};

contextBridge.exposeInMainWorld('rag', ragApi);
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
