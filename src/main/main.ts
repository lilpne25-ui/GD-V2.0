// Punto de entrada principal del proceso Electron
import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { runMigrations } from '../database/db';
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

type RepoName =
  | 'DocumentoRepo'
  | 'DocumentoTreeRepo'
  | 'UsuarioRepo'
  | 'AuditoriaRepo'
  | 'NCRepo'
  | 'CAPARepo'
  | 'RiesgoRepo'
  | 'IndicadorRepo'
  | 'ProveedorRepo'
  | 'RevisionDireccionRepo'
  | 'CompetenciaRepo'
  | 'SatisfaccionRepo'
  | 'ControlCambiosRepo'
  | 'WorkflowRepo'
  | 'NotificacionRepo'
  | 'CorreoRepo'
  | 'RegistroDinamicoRepo';

const repoLoaders: Record<RepoName, () => Promise<any>> = {
  DocumentoRepo: () => import('../database/repositories/documentoRepo'),
  DocumentoTreeRepo: () => import('../database/repositories/documentoTreeRepo'),
  UsuarioRepo: () => import('../database/repositories/usuarioRepo'),
  AuditoriaRepo: () => import('../database/repositories/auditoriaRepo'),
  NCRepo: () => import('../database/repositories/ncRepo'),
  CAPARepo: () => import('../database/repositories/capaRepo'),
  RiesgoRepo: () => import('../database/repositories/riesgoRepo'),
  IndicadorRepo: () => import('../database/repositories/indicadorRepo'),
  ProveedorRepo: () => import('../database/repositories/proveedorRepo'),
  RevisionDireccionRepo: () => import('../database/repositories/revisionDireccionRepo'),
  CompetenciaRepo: () => import('../database/repositories/competenciaRepo'),
  SatisfaccionRepo: () => import('../database/repositories/satisfaccionRepo'),
  ControlCambiosRepo: () => import('../database/repositories/controlCambiosRepo'),
  WorkflowRepo: () => import('../database/repositories/workflowRepo'),
  NotificacionRepo: () => import('../database/repositories/notificacionRepo'),
  CorreoRepo: () => import('../database/repositories/correoRepo'),
  RegistroDinamicoRepo: () => import('../database/repositories/registroDinamicoRepo'),
};

const repoCache = new Map<RepoName, any>();

type RegistroDinamicoRepoContract = {
  createRecordInstance(input: CreateRecordInput): Promise<string>;
  updateRecordInstanceDraft(input: UpdateRecordInput): Promise<void>;
  getRecordsByType(input: QueryRecordsInput): Promise<QueryRecordsResult>;
  getRecordAuditHistory(input: GetRecordAuditHistoryInput): Promise<QueryRecordAuditHistoryResult>;
  getRecordTypeById(id: string): Promise<RecordDefinition | null>;
  getRecordTypeByCode(code: string): Promise<RecordDefinition | null>;
  getAvailableTransitions(input: GetRecordTransitionsInput): Promise<RecordTransitionOption[]>;
  transitionRecordState(input: TransitionRecordInput): Promise<void>;
};

const RECORD_STATUS_VALUES: Array<TransitionRecordInput['toStatus']> = [
  'borrador',
  'en_revision',
  'aprobado',
  'rechazado',
  'obsoleto',
];

async function getRepoByName(repoName: RepoName): Promise<any> {
  const cached = repoCache.get(repoName);
  if (cached) return cached;

  const loader = repoLoaders[repoName];
  if (!loader) {
    throw new Error(`Repositorio no encontrado: ${repoName}`);
  }

  const module = await loader();
  const repo = module?.[repoName];
  if (!repo) {
    throw new Error(`Repositorio sin export válido: ${repoName}`);
  }

  repoCache.set(repoName, repo);
  return repo;
}

async function getRegistroDinamicoRepo(): Promise<RegistroDinamicoRepoContract> {
  return await getRepoByName('RegistroDinamicoRepo') as RegistroDinamicoRepoContract;
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredNonEmptyString(value: unknown, fieldName: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`Campo obligatorio inválido: ${fieldName}.`);
  }
  return normalized;
}

function assertWriteActor(userId: unknown, role: unknown, actionLabel: string): void {
  const normalizedUserId = requiredNonEmptyString(userId, 'userId');
  const normalizedRole = requiredNonEmptyString(role, 'role').toLowerCase();

  if (normalizedRole === 'sin_puesto') {
    throw new Error(`No autorizado para ${actionLabel}: rol no operativo.`);
  }

  if (!normalizedUserId) {
    throw new Error(`No autorizado para ${actionLabel}: usuario inválido.`);
  }
}

function normalizeIpcError(channel: string, error: unknown): Error {
  if (error instanceof Error) {
    return new Error(`[${channel}] ${error.message}`);
  }
  const fallback = String(error || 'Error inesperado en la operación de records.');
  return new Error(`[${channel}] ${fallback}`);
}

function validateCreateRecordPayload(payload: unknown): CreateRecordInput {
  if (!isObjectLike(payload)) {
    throw new Error('Payload inválido para records:create.');
  }

  const recordTypeId = requiredNonEmptyString(payload.recordTypeId, 'recordTypeId');
  const createdBy = requiredNonEmptyString(payload.createdBy, 'createdBy');
  const role = requiredNonEmptyString(payload.role, 'role');
  assertWriteActor(createdBy, role, 'crear registro');

  if (!isObjectLike(payload.values)) {
    throw new Error('Payload inválido: values debe ser un objeto.');
  }

  return {
    ...payload,
    recordTypeId,
    createdBy,
    role,
    values: payload.values,
  } as CreateRecordInput;
}

function validateUpdateRecordPayload(payload: unknown): UpdateRecordInput {
  if (!isObjectLike(payload)) {
    throw new Error('Payload inválido para records:update.');
  }

  const recordId = requiredNonEmptyString(payload.recordId, 'recordId');
  const updatedBy = requiredNonEmptyString(payload.updatedBy, 'updatedBy');
  const role = requiredNonEmptyString(payload.role, 'role');
  assertWriteActor(updatedBy, role, 'actualizar registro');

  if (!isObjectLike(payload.values)) {
    throw new Error('Payload inválido: values debe ser un objeto.');
  }

  return {
    ...payload,
    recordId,
    updatedBy,
    role,
    values: payload.values,
  } as UpdateRecordInput;
}

function validateGetByTypePayload(payload: unknown): QueryRecordsInput {
  if (payload === undefined || payload === null) {
    return {};
  }

  if (!isObjectLike(payload)) {
    throw new Error('Payload inválido para records:get-by-type.');
  }

  return payload as QueryRecordsInput;
}

function validateGetDefinitionPayload(payload: unknown): GetRecordDefinitionInput {
  if (!isObjectLike(payload)) {
    throw new Error('Payload inválido para records:get-definition.');
  }

  const input = payload as GetRecordDefinitionInput;
  const recordTypeId = String(input.recordTypeId || '').trim();
  const recordTypeCode = String(input.recordTypeCode || '').trim();

  if (!recordTypeId && !recordTypeCode) {
    throw new Error('Debes enviar recordTypeId o recordTypeCode en records:get-definition.');
  }

  return {
    ...input,
    recordTypeId: recordTypeId || undefined,
    recordTypeCode: recordTypeCode || undefined,
  };
}

function validateTransitionPayload(payload: unknown): TransitionRecordInput {
  if (!isObjectLike(payload)) {
    throw new Error('Payload inválido para records:transition.');
  }

  const recordId = requiredNonEmptyString(payload.recordId, 'recordId');
  const toStatus = requiredNonEmptyString(payload.toStatus, 'toStatus');
  const performedBy = requiredNonEmptyString(payload.performedBy, 'performedBy');
  const role = requiredNonEmptyString(payload.role, 'role');
  assertWriteActor(performedBy, role, 'transicionar registro');

  if (!RECORD_STATUS_VALUES.includes(toStatus as TransitionRecordInput['toStatus'])) {
    throw new Error('toStatus inválido para records:transition.');
  }

  return {
    ...payload,
    recordId,
    toStatus: toStatus as TransitionRecordInput['toStatus'],
    performedBy,
    role,
  } as TransitionRecordInput;
}

function validateGetTransitionsPayload(payload: unknown): GetRecordTransitionsInput {
  if (!isObjectLike(payload)) {
    throw new Error('Payload inválido para records:get-transitions.');
  }

  const recordId = requiredNonEmptyString(payload.recordId, 'recordId');
  const userId = requiredNonEmptyString(payload.userId, 'userId');
  const role = requiredNonEmptyString(payload.role, 'role');

  return {
    recordId,
    userId,
    role,
  };
}

function validateGetAuditHistoryPayload(payload: unknown): GetRecordAuditHistoryInput {
  if (!isObjectLike(payload)) {
    throw new Error('Payload invalido para records:get-audit-history.');
  }

  const recordId = requiredNonEmptyString(payload.recordId, 'recordId');
  const rawPage = Number(payload.page);
  const rawPageSize = Number(payload.pageSize);

  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const pageSize = Number.isFinite(rawPageSize) ? Math.min(200, Math.max(1, Math.floor(rawPageSize))) : 30;

  let actions: GetRecordAuditHistoryInput['actions'];
  if (Array.isArray(payload.actions)) {
    actions = payload.actions.map(item => String(item || '').trim().toLowerCase()).filter(Boolean) as GetRecordAuditHistoryInput['actions'];
  } else if (payload.actions !== undefined && payload.actions !== null) {
    const single = String(payload.actions || '').trim().toLowerCase();
    if (single) {
      actions = single as GetRecordAuditHistoryInput['actions'];
    }
  }

  return {
    recordId,
    page,
    pageSize,
    actions,
  };
}

function loadEnvironment(): void {
  const candidates = app.isPackaged
    ? [
        path.join(app.getPath('userData'), '.env'),
        path.join(process.resourcesPath, '.env'),
      ]
    : [
        path.resolve(process.cwd(), '.env'),
      ];

  for (const envPath of candidates) {
    try {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
      }
    } catch {
      // Ignorar errores de carga de .env para no bloquear arranque.
    }
  }
}

loadEnvironment();

function envNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function envBool01(value: string | undefined, fallback: number): number {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'si', 'sí', 'on'].includes(raw)) return 1;
  if (['0', 'false', 'no', 'off'].includes(raw)) return 0;
  return fallback;
}

function envMiB(value: string | undefined, fallbackMiB: number, minMiB: number, maxMiB: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallbackMiB;
  return Math.min(maxMiB, Math.max(minMiB, n));
}

const previewMaxDataUrlBytes = Math.floor(envMiB(process.env.SGC_PREVIEW_MAX_DATA_URL_MB, 24, 8, 128) * 1024 * 1024);
const previewMaxBufferBytes = Math.floor(envMiB(process.env.SGC_PREVIEW_MAX_BUFFER_MB, 48, 12, 192) * 1024 * 1024);

let mainWindow: BrowserWindow | null = null;
let contentProtectionEnabled = false;
let startupTasksPromise: Promise<void> | null = null;

async function runStartupTasks(): Promise<void> {
  // Ejecutar migraciones en background para no bloquear first paint.
  try {
    await runMigrations();
  } catch (err) {
    console.error('Error ejecutando migraciones:', err);
  }

  // Seed de correo diferido (no bloquea apertura de ventana).
  try {
    const CorreoRepo = await getRepoByName('CorreoRepo');
    const UsuarioRepo = await getRepoByName('UsuarioRepo');
    const seedUserId = process.env.SGC_EMAIL_USER_ID || 'org-016';
    const hasExplicitSeedSmtp = Boolean(
      String(process.env.SGC_SMTP_HOST || '').trim() &&
      String(process.env.SGC_SMTP_USER || '').trim()
    );

    // En producción solo aplicar seed SMTP si se definió explícitamente por entorno.
    // En desarrollo sí permitimos seed para acelerar pruebas locales.
    if (!app.isPackaged || hasExplicitSeedSmtp) {
      const seedUser = await UsuarioRepo.getById(seedUserId);
      if (seedUser) {
        await CorreoRepo.ensureSeedData({
          userId: seedUserId,
          smtpHost: process.env.SGC_SMTP_HOST || '',
          smtpPort: envNumber(process.env.SGC_SMTP_PORT, 465),
          smtpUser: process.env.SGC_SMTP_USER || '',
          smtpPass: process.env.SGC_SMTP_PASS || '',
          smtpFrom: process.env.SGC_SMTP_FROM || '',
          smtpSecure: envBool01(process.env.SGC_SMTP_SECURE, 1),
          imapHost: process.env.SGC_IMAP_HOST || process.env.SGC_SMTP_HOST || '',
          imapPort: envNumber(process.env.SGC_IMAP_PORT, 993),
          imapSecure: envBool01(process.env.SGC_IMAP_SECURE, 1),
          popHost: process.env.SGC_POP_HOST || process.env.SGC_SMTP_HOST || '',
          popPort: envNumber(process.env.SGC_POP_PORT, 995),
          popSecure: envBool01(process.env.SGC_POP_SECURE, 1),
          canSendEmail: envBool01(process.env.SGC_CAN_SEND_EMAIL, 1),
          canReceiveEmail: envBool01(process.env.SGC_CAN_RECEIVE_EMAIL, 1),
          forceApply: envBool01(process.env.SGC_EMAIL_FORCE_APPLY, app.isPackaged ? 0 : 1) === 1,
        });
      } else {
        console.warn(`Seed SMTP omitido: usuario no encontrado (${seedUserId}).`);
      }
    }

    await CorreoRepo.ensureConfigForAllUsers();
  } catch (err) {
    console.error('Error seed correo:', err);
  }
}

function ensureStartupTasks(): Promise<void> {
  if (!startupTasksPromise) {
    startupTasksPromise = runStartupTasks();
  }
  return startupTasksPromise;
}

function toggleCaptureShortcuts(enabled: boolean) {
  const shortcuts = [
    'PrintScreen',
    'CommandOrControl+PrintScreen',
    'Alt+PrintScreen',
    'Super+Shift+S',
    'CommandOrControl+Shift+S',
  ];

  if (enabled) {
    shortcuts.forEach(shortcut => {
      if (!globalShortcut.isRegistered(shortcut)) {
        try {
          globalShortcut.register(shortcut, () => {
            // Intencionalmente vacío: consumir atajo durante modo protegido.
          });
        } catch {
          // Ignorar atajos no soportados por plataforma/teclado.
        }
      }
    });
    return;
  }

  shortcuts.forEach(shortcut => {
    if (globalShortcut.isRegistered(shortcut)) {
      globalShortcut.unregister(shortcut);
    }
  });
}

function setWindowContentProtection(enabled: boolean) {
  contentProtectionEnabled = Boolean(enabled);
  BrowserWindow.getAllWindows().forEach(win => {
    win.setContentProtection(contentProtectionEnabled);
  });
  toggleCaptureShortcuts(contentProtectionEnabled);
}

function createWindow() {
  const isDev = !app.isPackaged;

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: __dirname + '/preload.js',
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev,
      spellcheck: false,
    }
  });

  const resolvedRendererTarget = process.env.RENDERER_URL ?? (isDev ? 'http://localhost:3002' : '');
  const localIndexPath = path.join(__dirname, 'index.html');

  let reloadAttempts = 0;
  const maxReloadAttempts = 10;

  const openRenderer = () => {
    if (resolvedRendererTarget) {
      void win.loadURL(resolvedRendererTarget).catch(() => {
        // El evento did-fail-load realizará reintentos/fallback.
      });
      return;
    }
    void win.loadFile(localIndexPath);
  };

  win.webContents.on('did-fail-load', () => {
    const shouldRetryDevServer =
      resolvedRendererTarget.startsWith('http://') || resolvedRendererTarget.startsWith('https://');

    if (shouldRetryDevServer && reloadAttempts < maxReloadAttempts) {
      reloadAttempts += 1;
      setTimeout(() => {
        if (!win.isDestroyed()) {
          void win.loadURL(resolvedRendererTarget);
        }
      }, 700);
      return;
    }

    if (!win.isDestroyed()) {
      void win.loadFile(localIndexPath);
    }
  });

  openRenderer();
  mainWindow = win;
  win.setContentProtection(contentProtectionEnabled);

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

// Registrar puente IPC genérico para repositorios
function registerIpcHandlers() {
  ipcMain.handle('repo:call', async (_event, payload: { repo: string; method: string; args?: any[] }) => {
    await ensureStartupTasks();

    const { repo, method, args = [] } = payload || {};
    const typedRepo = repo as RepoName;
    const repoModule = await getRepoByName(typedRepo);
    const fn = repoModule?.[method];
    if (typeof fn !== 'function') throw new Error(`Método no válido en ${repo}: ${method}`);
    return await fn.apply(repoModule, args);
  });

  ipcMain.handle('records:create', async (_event, payload: unknown) => {
    await ensureStartupTasks();
    try {
      const input = validateCreateRecordPayload(payload);
      const repo = await getRegistroDinamicoRepo();
      return await repo.createRecordInstance(input);
    } catch (error) {
      throw normalizeIpcError('records:create', error);
    }
  });

  ipcMain.handle('records:update', async (_event, payload: unknown) => {
    await ensureStartupTasks();
    try {
      const input = validateUpdateRecordPayload(payload);
      const repo = await getRegistroDinamicoRepo();
      await repo.updateRecordInstanceDraft(input);
      return true;
    } catch (error) {
      throw normalizeIpcError('records:update', error);
    }
  });

  ipcMain.handle('records:get-by-type', async (_event, payload: unknown) => {
    await ensureStartupTasks();
    try {
      const input = validateGetByTypePayload(payload);
      const repo = await getRegistroDinamicoRepo();
      return await repo.getRecordsByType(input);
    } catch (error) {
      throw normalizeIpcError('records:get-by-type', error);
    }
  });

  ipcMain.handle('records:get-definition', async (_event, payload: unknown) => {
    await ensureStartupTasks();
    try {
      const input = validateGetDefinitionPayload(payload);
      const repo = await getRegistroDinamicoRepo();

      if (input.recordTypeId) {
        return await repo.getRecordTypeById(input.recordTypeId);
      }

      return await repo.getRecordTypeByCode(String(input.recordTypeCode || ''));
    } catch (error) {
      throw normalizeIpcError('records:get-definition', error);
    }
  });

  ipcMain.handle('records:get-transitions', async (_event, payload: unknown) => {
    await ensureStartupTasks();
    try {
      const input = validateGetTransitionsPayload(payload);
      const repo = await getRegistroDinamicoRepo();
      return await repo.getAvailableTransitions(input);
    } catch (error) {
      throw normalizeIpcError('records:get-transitions', error);
    }
  });

  ipcMain.handle('records:get-audit-history', async (_event, payload: unknown) => {
    await ensureStartupTasks();
    try {
      const input = validateGetAuditHistoryPayload(payload);
      const repo = await getRegistroDinamicoRepo();
      return await repo.getRecordAuditHistory(input);
    } catch (error) {
      throw normalizeIpcError('records:get-audit-history', error);
    }
  });

  ipcMain.handle('records:transition', async (_event, payload: unknown) => {
    await ensureStartupTasks();
    try {
      const input = validateTransitionPayload(payload);
      const repo = await getRegistroDinamicoRepo();
      await repo.transitionRecordState(input);
      return true;
    } catch (error) {
      throw normalizeIpcError('records:transition', error);
    }
  });

  ipcMain.handle('window:set-content-protection', (event, enabled: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (!win) return false;

    setWindowContentProtection(Boolean(enabled));
    win.setContentProtection(contentProtectionEnabled);
    return true;
  });

  ipcMain.handle('window:get-content-protection', () => contentProtectionEnabled);

  ipcMain.handle('window:open-path', async (_event, filePath: string) => {
    if (!filePath || typeof filePath !== 'string') return false;
    const result = await shell.openPath(filePath);
    return result === '';
  });

  ipcMain.handle('window:read-file-data-url', async (_event, filePath: string, mimeType?: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) return null;

      // Límite de seguridad para evitar colapso por memoria al previsualizar.
      if (stat.size > previewMaxDataUrlBytes) {
        throw new Error('El archivo es demasiado grande para visualización interna segura.');
      }

      const buffer = await fs.promises.readFile(filePath);
      const safeMime = typeof mimeType === 'string' && mimeType.trim()
        ? mimeType.trim()
        : 'application/octet-stream';
      return `data:${safeMime};base64,${buffer.toString('base64')}`;
    } catch (error: any) {
      throw new Error(error?.message || 'No se pudo leer el archivo local para el visor interno.');
    }
  });

  ipcMain.handle('window:read-file-buffer', async (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) return null;

      if (stat.size > previewMaxBufferBytes) {
        throw new Error('El archivo es demasiado grande para visualización interna segura.');
      }

      const buffer = await fs.promises.readFile(filePath);
      return Uint8Array.from(buffer);
    } catch (error: any) {
      throw new Error(error?.message || 'No se pudo leer el archivo local para el visor interno.');
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  void ensureStartupTasks();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
