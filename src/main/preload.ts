// Script de preload para exponer APIs seguras a renderer
import { contextBridge, ipcRenderer } from 'electron';
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

type RecordsApi = {
  create: (input: CreateRecordInput) => Promise<string>;
  update: (input: UpdateRecordInput) => Promise<boolean>;
  getByType: (input?: QueryRecordsInput) => Promise<QueryRecordsResult>;
  getDefinition: (input: GetRecordDefinitionInput) => Promise<RecordDefinition | null>;
  getTransitions: (input: GetRecordTransitionsInput) => Promise<RecordTransitionOption[]>;
  getAuditHistory: (input: GetRecordAuditHistoryInput) => Promise<QueryRecordAuditHistoryResult>;
  transition: (input: TransitionRecordInput) => Promise<boolean>;
};

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
