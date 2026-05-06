import { dbAll, dbGet, dbRun, dbHasColumn, dbTableExists, generateId } from '../db';
import type { RolUsuario } from '../../shared/types/common';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface DocumentoNodoRow {
  id: string;
  parent_id: string | null;
  name: string;
  node_type: 'folder' | 'file';
  file_name: string | null;
  mime_type: string | null;
  file_data_url: string | null;
  file_disk_path: string | null;
  file_size_bytes: number | null;
  storage_mode: 'dataurl' | 'disk' | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentoFirmaRow {
  id: string;
  node_id: string;
  signer_name: string;
  signer_role: string | null;
  signature_data_url: string;
  pos_x_percent: number;
  pos_y_percent: number;
  created_at: string;
}

export interface DocumentoTrashRow {
  id: string;
  root_node_id: string;
  root_node_name: string | null;
  root_node_type: 'folder' | 'file' | null;
  deleted_by_name: string | null;
  deleted_by_role: string | null;
  deleted_at: string;
  expires_at: string;
  days_left: number;
}

interface DocumentoTrashPayload {
  rootNodeId: string;
  nodes: Array<DocumentoNodoRow & { depth: number }>;
  signatures: DocumentoFirmaRow[];
}

export interface DocumentoOfficeAnalysis {
  nodeId: string;
  fileName: string;
  extension: string;
  mimeType: string;
  parser: 'mammoth' | 'xlsx' | 'unsupported';
  summary: string;
  warnings: string[];
  textPreview?: string;
  sheets?: Array<{
    name: string;
    rows: number;
    columns: number;
    sample: Record<string, string>[];
  }>;
}

interface DocumentoPermisosActor {
  can_add_documents: number;
  can_delete_documents: number;
  can_rename_documents: number;
  can_move_documents: number;
  can_sign_documents: number;
}

interface DocumentoOfficePreview {
  fileName: string;
  extension: string;
  html: string;
}

export interface DocumentoAuditRow {
  id: string;
  event_type: 'add_document' | 'add_folder' | 'delete_node' | 'rename_node' | 'move_node';
  node_id: string | null;
  node_name: string | null;
  node_type: 'folder' | 'file' | null;
  from_parent_id: string | null;
  from_parent_name: string | null;
  to_parent_id: string | null;
  to_parent_name: string | null;
  actor_user_id: string | null;
  actor_user_name: string | null;
  actor_role: string | null;
  details_json: string | null;
  created_at: string;
}

interface DocumentoActorIdentity {
  actorUserId: string | null;
  actorUserName: string;
  actorRole: string;
}

const getStorageBaseDir = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'document-storage');
};

const normalizeExtension = (fileNameOrPath: string): string => {
  const ext = path.extname(fileNameOrPath || '').trim();
  if (!ext) return '';
  return ext.startsWith('.') ? ext : `.${ext}`;
};

const inferOfficeExtension = (fileName: string, mimeType?: string): string => {
  const ext = normalizeExtension(fileName).replace('.', '').toLowerCase();
  if (ext) return ext;

  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('wordprocessingml')) return 'docx';
  if (mime.includes('msword')) return 'doc';
  if (mime.includes('spreadsheetml')) return 'xlsx';
  if (mime.includes('ms-excel')) return 'xls';
  if (mime.includes('presentationml')) return 'pptx';
  if (mime.includes('ms-powerpoint')) return 'ppt';
  return '';
};

const bufferFromDataUrl = (dataUrl: string): Buffer => {
  const raw = String(dataUrl || '');
  const comma = raw.indexOf(',');
  if (comma < 0) throw new Error('Formato data URL inválido.');
  const base64 = raw.substring(comma + 1);
  return Buffer.from(base64, 'base64');
};

const collectDescendantIds = async (nodeId: string): Promise<Set<string>> => {
  const rows = await dbAll<{ id: string }>(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM documento_nodos WHERE id = ?
       UNION ALL
       SELECT d.id
       FROM documento_nodos d
       INNER JOIN descendants p ON d.parent_id = p.id
     )
     SELECT id FROM descendants`,
    [nodeId]
  );
  return new Set(rows.map((row: { id: string }) => row.id));
};

const getNodeBinary = async (node: DocumentoNodoRow): Promise<Buffer> => {
  if (node.storage_mode === 'disk' && node.file_disk_path) {
    return fs.promises.readFile(node.file_disk_path);
  }
  if (node.file_data_url) {
    return bufferFromDataUrl(node.file_data_url);
  }
  throw new Error('El documento no contiene datos para análisis.');
};

const isAdminActor = (userId?: string, role?: RolUsuario): boolean => {
  const normalizedId = String(userId || '').trim().toLowerCase();
  const normalizedRole = String(role || '').trim().toLowerCase();
  return normalizedId === 'usr-admin' || normalizedRole === 'administrador';
};

async function ensureDocPermissionsTableShape(): Promise<void> {
  const exists = await dbTableExists('usuario_permisos_documentos');
  if (!exists) {
    await dbRun(
      `CREATE TABLE dbo.usuario_permisos_documentos (
        user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
        can_add_documents INT NOT NULL DEFAULT 1,
        can_delete_documents INT NOT NULL DEFAULT 0,
        can_rename_documents INT NOT NULL DEFAULT 0,
        can_move_documents INT NOT NULL DEFAULT 0,
        can_sign_documents INT NOT NULL DEFAULT 0,
        updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_usuario_permisos_documentos_user_doc_tree FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
      )`
    );
  }

  if (!(await dbHasColumn('usuario_permisos_documentos', 'can_rename_documents'))) {
    await dbRun(`ALTER TABLE usuario_permisos_documentos ADD COLUMN can_rename_documents INTEGER NOT NULL DEFAULT 0`);
  }
  if (!(await dbHasColumn('usuario_permisos_documentos', 'can_move_documents'))) {
    await dbRun(`ALTER TABLE usuario_permisos_documentos ADD COLUMN can_move_documents INTEGER NOT NULL DEFAULT 0`);
  }
  if (!(await dbHasColumn('usuario_permisos_documentos', 'can_sign_documents'))) {
    await dbRun(`ALTER TABLE usuario_permisos_documentos ADD COLUMN can_sign_documents INTEGER NOT NULL DEFAULT 0`);
  }
}

async function resolveActorPermissions(userId?: string, role?: RolUsuario): Promise<DocumentoPermisosActor> {
  if (!userId) {
    // Fallback permisivo para compatibilidad con llamadas antiguas sin contexto de usuario.
    return {
      can_add_documents: 1,
      can_delete_documents: 1,
      can_rename_documents: 1,
      can_move_documents: 1,
      can_sign_documents: 1,
    };
  }

  if (isAdminActor(userId, role)) {
    return {
      can_add_documents: 1,
      can_delete_documents: 1,
      can_rename_documents: 1,
      can_move_documents: 1,
      can_sign_documents: 1,
    };
  }

  await ensureDocPermissionsTableShape();
  const row = await dbGet<DocumentoPermisosActor>(
    `SELECT
       COALESCE(can_add_documents, 1) AS can_add_documents,
       COALESCE(can_delete_documents, 0) AS can_delete_documents,
       COALESCE(can_rename_documents, 0) AS can_rename_documents,
       COALESCE(can_move_documents, 0) AS can_move_documents,
       COALESCE(can_sign_documents, 0) AS can_sign_documents
     FROM usuario_permisos_documentos
     WHERE user_id = ?`,
    [userId]
  );

  return row || {
    can_add_documents: 1,
    can_delete_documents: 0,
    can_rename_documents: 0,
    can_move_documents: 0,
    can_sign_documents: 0,
  };
}

async function assertActorPermission(
  permission: keyof DocumentoPermisosActor,
  userId?: string,
  role?: RolUsuario,
  deniedMessage: string = 'No tienes permiso para ejecutar esta acción.'
): Promise<void> {
  const perms = await resolveActorPermissions(userId, role);
  if (Number(perms[permission] || 0) !== 1) {
    throw new Error(deniedMessage);
  }
}

async function ensureDocumentAuditTable(): Promise<void> {
  const exists = await dbTableExists('documento_auditoria');
  if (exists) return;

  await dbRun(
    `CREATE TABLE dbo.documento_auditoria (
      id NVARCHAR(64) NOT NULL PRIMARY KEY,
      event_type NVARCHAR(40) NOT NULL CHECK(event_type IN (
        'add_document',
        'add_folder',
        'delete_node',
        'rename_node',
        'move_node'
      )),
      node_id NVARCHAR(64) NULL,
      node_name NVARCHAR(255) NULL,
      node_type NVARCHAR(20) NULL CHECK(node_type IN ('folder','file')),
      from_parent_id NVARCHAR(64) NULL,
      from_parent_name NVARCHAR(255) NULL,
      to_parent_id NVARCHAR(64) NULL,
      to_parent_name NVARCHAR(255) NULL,
      actor_user_id NVARCHAR(64) NULL,
      actor_user_name NVARCHAR(255) NULL,
      actor_role NVARCHAR(255) NULL,
      details_json NVARCHAR(MAX) NULL,
      created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
    )`
  );
}

async function resolveActorIdentity(actorUserId?: string, actorRole?: RolUsuario): Promise<DocumentoActorIdentity> {
  const normalizedRole = String(actorRole || '').trim() || 'SIN_PUESTO';

  if (!actorUserId) {
    return {
      actorUserId: null,
      actorUserName: 'SISTEMA',
      actorRole: normalizedRole,
    };
  }

  const user = await dbGet<{ nombre: string; rol: string }>(
    `SELECT nombre, rol FROM usuarios WHERE id = ? LIMIT 1`,
    [actorUserId]
  );

  return {
    actorUserId,
    actorUserName: String(user?.nombre || actorUserId),
    actorRole: String(actorRole || user?.rol || 'SIN_PUESTO'),
  };
}

async function getParentName(parentId: string | null | undefined): Promise<string | null> {
  if (!parentId) return null;
  const row = await dbGet<{ name: string }>('SELECT name FROM documento_nodos WHERE id = ?', [parentId]);
  return row?.name || null;
}

async function logDocumentAuditEvent(params: {
  eventType: DocumentoAuditRow['event_type'];
  nodeId?: string | null;
  nodeName?: string | null;
  nodeType?: 'folder' | 'file' | null;
  fromParentId?: string | null;
  toParentId?: string | null;
  actorUserId?: string;
  actorRole?: RolUsuario;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    await ensureDocumentAuditTable();
    const identity = await resolveActorIdentity(params.actorUserId, params.actorRole);
    const fromParentName = await getParentName(params.fromParentId);
    const toParentName = await getParentName(params.toParentId);

    await dbRun(
      `INSERT INTO documento_auditoria (
         id, event_type, node_id, node_name, node_type,
         from_parent_id, from_parent_name,
         to_parent_id, to_parent_name,
         actor_user_id, actor_user_name, actor_role,
         details_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        generateId('dlog'),
        params.eventType,
        params.nodeId || null,
        params.nodeName || null,
        params.nodeType || null,
        params.fromParentId || null,
        fromParentName,
        params.toParentId || null,
        toParentName,
        identity.actorUserId,
        identity.actorUserName,
        identity.actorRole,
        params.details ? JSON.stringify(params.details) : null,
      ]
    );
  } catch {
    // La auditoría no debe bloquear operaciones funcionales de documentos.
  }
}

async function ensureStorageDir(): Promise<void> {
  await fs.promises.mkdir(getStorageBaseDir(), { recursive: true });
}

async function ensureTrashTable(): Promise<void> {
  const exists = await dbTableExists('documento_papelera');
  if (!exists) {
    await dbRun(
      `CREATE TABLE dbo.documento_papelera (
        id NVARCHAR(64) NOT NULL PRIMARY KEY,
        root_node_id NVARCHAR(64) NOT NULL,
        root_node_name NVARCHAR(255) NULL,
        root_node_type NVARCHAR(20) NULL,
        deleted_by_user_id NVARCHAR(64) NULL,
        deleted_by_name NVARCHAR(255) NULL,
        deleted_by_role NVARCHAR(255) NULL,
        deleted_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        expires_at DATETIME2(0) NOT NULL,
        payload_json NVARCHAR(MAX) NOT NULL
      )`
    );
  }
}

const collectDiskPathsFromPayload = (payload: DocumentoTrashPayload): string[] => {
  const paths = new Set<string>();
  for (const node of payload.nodes || []) {
    if (node.storage_mode === 'disk' && node.file_disk_path) {
      const safePath = String(node.file_disk_path).trim();
      if (safePath) paths.add(safePath);
    }
  }
  return [...paths];
};

async function deleteDiskFilesFromPayloadJson(payloadJson: string): Promise<void> {
  try {
    const payload = JSON.parse(String(payloadJson || '{}')) as DocumentoTrashPayload;
    const diskPaths = collectDiskPathsFromPayload(payload);
    for (const diskPath of diskPaths) {
      try {
        await fs.promises.unlink(diskPath);
      } catch {
        // Ignorar si el archivo ya no existe o no se puede borrar.
      }
    }
  } catch {
    // Ignorar payload inválido para no bloquear purga.
  }
}

async function purgeExpiredTrashInternal(): Promise<number> {
  await ensureTrashTable();
  const expired = await dbAll<{ id: string; payload_json: string }>(
    `SELECT id, payload_json
     FROM documento_papelera
     WHERE expires_at <= SYSDATETIME()`
  );

  for (const item of expired) {
    await deleteDiskFilesFromPayloadJson(item.payload_json);
    await dbRun('DELETE FROM documento_papelera WHERE id = ?', [item.id]);
  }

  return expired.length;
}

async function resolvePortableDiskPath(originalPath: string): Promise<string> {
  const raw = String(originalPath || '').trim();
  if (!raw) return '';

  try {
    await fs.promises.access(raw, fs.constants.F_OK);
    return raw;
  } catch {
    // Continúa con resolución portable.
  }

  const baseName = path.basename(raw);
  if (!baseName) return raw;

  const fallbackPath = path.join(getStorageBaseDir(), baseName);
  try {
    await fs.promises.access(fallbackPath, fs.constants.F_OK);
    return fallbackPath;
  } catch {
    return raw;
  }
}

async function ensureRoot(): Promise<void> {
  await dbRun(
    "IF NOT EXISTS (SELECT 1 FROM documento_nodos WHERE id = 'root') INSERT INTO documento_nodos (id, parent_id, name, node_type) VALUES ('root', NULL, 'Documentos', 'folder')"
  );
}

export const DocumentoTreeRepo = {
  async getAll(actorRole?: RolUsuario): Promise<DocumentoNodoRow[]> {
    void actorRole;
    await ensureRoot();
    await ensureStorageDir();
    await purgeExpiredTrashInternal();

    const rows = await dbAll<DocumentoNodoRow>(
      `SELECT id, parent_id, name, node_type, file_name, mime_type, file_data_url,
              file_disk_path, file_size_bytes, storage_mode, created_at, updated_at
       FROM documento_nodos
       ORDER BY node_type DESC, name COLLATE NOCASE ASC`
    );

    for (const row of rows) {
      if (row.storage_mode !== 'disk' || !row.file_disk_path) continue;
      const resolvedPath = await resolvePortableDiskPath(row.file_disk_path);
      if (!resolvedPath || resolvedPath === row.file_disk_path) continue;

      await dbRun(
        `UPDATE documento_nodos
         SET file_disk_path = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [resolvedPath, row.id]
      );
      row.file_disk_path = resolvedPath;
    }

    return rows;
  },

  async createFolder(parentId: string, name: string, actorUserId?: string, actorRole?: RolUsuario): Promise<string> {
    await assertActorPermission('can_add_documents', actorUserId, actorRole, 'No tienes permiso para crear carpetas.');
    await ensureRoot();
    const id = generateId('dn');
    await dbRun(
      `INSERT INTO documento_nodos (id, parent_id, name, node_type, updated_at)
       VALUES (?, ?, ?, 'folder', datetime('now'))`,
      [id, parentId, name]
    );

    await logDocumentAuditEvent({
      eventType: 'add_folder',
      nodeId: id,
      nodeName: name,
      nodeType: 'folder',
      toParentId: parentId,
      actorUserId,
      actorRole,
    });
    return id;
  },

  async createFile(parentId: string, name: string, fileDataUrl: string, fileName?: string, mimeType?: string, actorUserId?: string, actorRole?: RolUsuario): Promise<string> {
    await assertActorPermission('can_add_documents', actorUserId, actorRole, 'No tienes permiso para agregar documentos.');
    await ensureRoot();
    const id = generateId('df');
    await dbRun(
      `INSERT INTO documento_nodos (id, parent_id, name, node_type, file_name, mime_type, file_data_url, storage_mode, updated_at)
       VALUES (?, ?, ?, 'file', ?, ?, ?, 'dataurl', datetime('now'))`,
      [id, parentId, name, fileName || name, mimeType || '', fileDataUrl]
    );

    await logDocumentAuditEvent({
      eventType: 'add_document',
      nodeId: id,
      nodeName: name,
      nodeType: 'file',
      toParentId: parentId,
      actorUserId,
      actorRole,
      details: {
        storage_mode: 'dataurl',
        file_name: fileName || name,
        mime_type: mimeType || '',
      },
    });
    return id;
  },

  async createFileFromPath(
    parentId: string,
    name: string,
    sourcePath: string,
    fileName?: string,
    mimeType?: string,
    fileSizeBytes?: number,
    actorUserId?: string,
    actorRole?: RolUsuario
  ): Promise<string> {
    await assertActorPermission('can_add_documents', actorUserId, actorRole, 'No tienes permiso para agregar documentos.');
    await ensureRoot();
    await ensureStorageDir();

    const id = generateId('df');
    const effectiveName = fileName || name;
    const ext = normalizeExtension(effectiveName || sourcePath);
    const targetPath = path.join(getStorageBaseDir(), `${id}${ext}`);

    await fs.promises.copyFile(sourcePath, targetPath);

    await dbRun(
      `INSERT INTO documento_nodos (
          id, parent_id, name, node_type, file_name, mime_type, file_disk_path, file_size_bytes, storage_mode, updated_at
        ) VALUES (?, ?, ?, 'file', ?, ?, ?, ?, 'disk', datetime('now'))`,
      [id, parentId, name, effectiveName, mimeType || '', targetPath, Number(fileSizeBytes || 0)]
    );

    await logDocumentAuditEvent({
      eventType: 'add_document',
      nodeId: id,
      nodeName: name,
      nodeType: 'file',
      toParentId: parentId,
      actorUserId,
      actorRole,
      details: {
        storage_mode: 'disk',
        file_name: effectiveName,
        mime_type: mimeType || '',
        file_size_bytes: Number(fileSizeBytes || 0),
      },
    });
    return id;
  },

  async renameNode(id: string, name: string, actorUserId?: string, actorRole?: RolUsuario): Promise<void> {
    await assertActorPermission('can_rename_documents', actorUserId, actorRole, 'No tienes permiso para renombrar documentos o carpetas.');
    const prev = await DocumentoTreeRepo.getById(id);
    await dbRun(
      `UPDATE documento_nodos
       SET name = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name, id]
    );

    await logDocumentAuditEvent({
      eventType: 'rename_node',
      nodeId: id,
      nodeName: name,
      nodeType: prev?.node_type || null,
      fromParentId: prev?.parent_id || null,
      toParentId: prev?.parent_id || null,
      actorUserId,
      actorRole,
      details: {
        old_name: prev?.name || null,
        new_name: name,
      },
    });
  },

  async moveNode(nodeId: string, destinationFolderId: string, actorUserId?: string, actorRole?: RolUsuario): Promise<void> {
    await assertActorPermission('can_move_documents', actorUserId, actorRole, 'No tienes permiso para mover documentos o carpetas.');
    if (!nodeId || nodeId === 'root') {
      throw new Error('No se puede mover la carpeta raíz.');
    }
    if (!destinationFolderId) {
      throw new Error('Debe seleccionar una carpeta destino válida.');
    }

    const [node, destination] = await Promise.all([
      DocumentoTreeRepo.getById(nodeId),
      DocumentoTreeRepo.getById(destinationFolderId),
    ]);

    if (!node) throw new Error('El nodo a mover no existe.');
    if (!destination) throw new Error('La carpeta destino no existe.');
    if (destination.node_type !== 'folder') throw new Error('Solo se puede mover a una carpeta destino.');
    if (node.parent_id === destinationFolderId) return;

    const descendants = await collectDescendantIds(nodeId);
    if (descendants.has(destinationFolderId)) {
      throw new Error('No se puede mover una carpeta dentro de sí misma o una subcarpeta.');
    }

    await dbRun(
      `UPDATE documento_nodos
       SET parent_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [destinationFolderId, nodeId]
    );

    await logDocumentAuditEvent({
      eventType: 'move_node',
      nodeId: nodeId,
      nodeName: node.name,
      nodeType: node.node_type,
      fromParentId: node.parent_id,
      toParentId: destinationFolderId,
      actorUserId,
      actorRole,
    });
  },

  async deleteNode(id: string, actorUserId?: string, actorRole?: RolUsuario): Promise<void> {
    await assertActorPermission('can_delete_documents', actorUserId, actorRole, 'No tienes permiso para eliminar documentos o carpetas.');
    if (id === 'root') return;

    await ensureTrashTable();
    await purgeExpiredTrashInternal();

    const targetNode = await DocumentoTreeRepo.getById(id);
    const descendantRows = await dbAll<(DocumentoNodoRow & { depth: number })>(
      `WITH RECURSIVE descendants AS (
         SELECT
           id, parent_id, name, node_type, file_name, mime_type, file_data_url,
           file_disk_path, file_size_bytes, storage_mode, created_at, updated_at,
           0 AS depth
         FROM documento_nodos
         WHERE id = ?
         UNION ALL
         SELECT
           d.id, d.parent_id, d.name, d.node_type, d.file_name, d.mime_type, d.file_data_url,
           d.file_disk_path, d.file_size_bytes, d.storage_mode, d.created_at, d.updated_at,
           p.depth + 1
         FROM documento_nodos d
         INNER JOIN descendants p ON d.parent_id = p.id
       )
       SELECT
         id, parent_id, name, node_type, file_name, mime_type, file_data_url,
         file_disk_path, file_size_bytes, storage_mode, created_at, updated_at, depth
       FROM descendants`,
      [id]
    );

    if (descendantRows.length === 0) {
      throw new Error('El elemento a eliminar no existe.');
    }

    const descendantCount = descendantRows.length;
    const descendantIdsByDepth = [...descendantRows]
      .sort((a, b) => b.depth - a.depth)
      .map((row) => row.id);

    const signatures = await dbAll<DocumentoFirmaRow>(
      `SELECT id, node_id, signer_name, signer_role, signature_data_url, pos_x_percent, pos_y_percent, created_at
       FROM documento_firmas
       WHERE node_id IN (${descendantIdsByDepth.map(() => '?').join(', ')})`,
      descendantIdsByDepth
    );

    const identity = await resolveActorIdentity(actorUserId, actorRole);
    const expiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString();
    const trashId = generateId('trash');
    const payload: DocumentoTrashPayload = {
      rootNodeId: id,
      nodes: descendantRows,
      signatures,
    };

    await dbRun(
      `INSERT INTO documento_papelera (
         id, root_node_id, root_node_name, root_node_type,
         deleted_by_user_id, deleted_by_name, deleted_by_role,
         deleted_at, expires_at, payload_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, SYSDATETIME(), ?, ?)`,
      [
        trashId,
        id,
        targetNode?.name || null,
        targetNode?.node_type || null,
        identity.actorUserId,
        identity.actorUserName,
        identity.actorRole,
        expiresAt,
        JSON.stringify(payload),
      ]
    );

    await logDocumentAuditEvent({
      eventType: 'delete_node',
      nodeId: id,
      nodeName: targetNode?.name || null,
      nodeType: targetNode?.node_type || null,
      fromParentId: targetNode?.parent_id || null,
      actorUserId,
      actorRole,
      details: {
        descendant_count: descendantCount,
      },
    });

    for (const nodeId of descendantIdsByDepth) {
      await dbRun('DELETE FROM documento_firmas WHERE node_id = ?', [nodeId]);
      await dbRun('DELETE FROM documento_nodos WHERE id = ?', [nodeId]);
    }
  },

  async listTrash(limit: number = 120, actorUserId?: string, actorRole?: RolUsuario): Promise<DocumentoTrashRow[]> {
    await assertActorPermission('can_delete_documents', actorUserId, actorRole, 'No tienes permiso para consultar la papelera.');
    await purgeExpiredTrashInternal();

    const safeLimit = Math.max(1, Math.min(Number(limit || 120), 500));
    const rows = await dbAll<DocumentoTrashRow>(
      `SELECT
         id,
         root_node_id,
         root_node_name,
         root_node_type,
         deleted_by_name,
         deleted_by_role,
         deleted_at,
         expires_at,
         DATEDIFF(DAY, SYSDATETIME(), expires_at) AS days_left
       FROM documento_papelera
       ORDER BY deleted_at DESC
       LIMIT ?`,
      [safeLimit]
    );

    return rows.map((row: DocumentoTrashRow) => ({
      ...row,
      days_left: Number.isFinite(Number(row.days_left)) ? Number(row.days_left) : 0,
    }));
  },

  async purgeExpiredTrash(actorUserId?: string, actorRole?: RolUsuario): Promise<number> {
    await assertActorPermission('can_delete_documents', actorUserId, actorRole, 'No tienes permiso para depurar la papelera.');
    return purgeExpiredTrashInternal();
  },

  async deleteTrashItem(trashId: string, actorUserId?: string, actorRole?: RolUsuario): Promise<void> {
    await assertActorPermission('can_delete_documents', actorUserId, actorRole, 'No tienes permiso para eliminar elementos de la papelera.');
    await ensureTrashTable();
    const item = await dbGet<{ payload_json: string }>(
      'SELECT payload_json FROM documento_papelera WHERE id = ?',
      [trashId]
    );
    if (!item) return;

    await deleteDiskFilesFromPayloadJson(item.payload_json);
    await dbRun('DELETE FROM documento_papelera WHERE id = ?', [trashId]);
  },

  async restoreTrashItem(trashId: string, actorUserId?: string, actorRole?: RolUsuario): Promise<string> {
    await assertActorPermission('can_delete_documents', actorUserId, actorRole, 'No tienes permiso para restaurar elementos de la papelera.');
    await ensureRoot();
    await ensureStorageDir();
    await ensureTrashTable();
    await purgeExpiredTrashInternal();

    const trashItem = await dbGet<{
      id: string;
      root_node_id: string;
      payload_json: string;
    }>(
      'SELECT id, root_node_id, payload_json FROM documento_papelera WHERE id = ?',
      [trashId]
    );

    if (!trashItem) {
      throw new Error('El elemento de papelera ya no existe o expiró.');
    }

    let payload: DocumentoTrashPayload;
    try {
      payload = JSON.parse(String(trashItem.payload_json || '{}')) as DocumentoTrashPayload;
    } catch {
      throw new Error('No se pudo leer el respaldo del elemento en papelera.');
    }

    const payloadNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
    if (!payloadNodes.length) {
      throw new Error('El respaldo de papelera no contiene nodos para restaurar.');
    }

    const idMap = new Map<string, string>();
    const nodeRowsByDepth = [...payloadNodes].sort((a, b) => Number(a.depth || 0) - Number(b.depth || 0));

    for (const node of nodeRowsByDepth) {
      const exists = await dbGet<{ id: string }>('SELECT id FROM documento_nodos WHERE id = ?', [node.id]);
      if (!exists) {
        idMap.set(node.id, node.id);
        continue;
      }

      const newId = generateId(node.node_type === 'folder' ? 'dn' : 'df');
      idMap.set(node.id, newId);
    }

    for (const node of nodeRowsByDepth) {
      const mappedNodeId = idMap.get(node.id) || node.id;
      const parentOriginal = node.parent_id;
      const mappedParent = parentOriginal
        ? (idMap.get(parentOriginal) || parentOriginal)
        : null;

      let finalParentId = mappedParent;
      if (mappedNodeId !== 'root') {
        if (!finalParentId) {
          finalParentId = 'root';
        } else {
          const parentExists = await dbGet<{ id: string }>('SELECT id FROM documento_nodos WHERE id = ?', [finalParentId]);
          if (!parentExists) finalParentId = 'root';
        }
      }

      await dbRun(
        `INSERT INTO documento_nodos (
           id, parent_id, name, node_type,
           file_name, mime_type, file_data_url, file_disk_path, file_size_bytes, storage_mode,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mappedNodeId,
          finalParentId,
          node.name,
          node.node_type,
          node.file_name || null,
          node.mime_type || null,
          node.file_data_url || null,
          node.file_disk_path || null,
          node.file_size_bytes ?? null,
          node.storage_mode || null,
          node.created_at || new Date().toISOString(),
          node.updated_at || new Date().toISOString(),
        ]
      );
    }

    const payloadSignatures = Array.isArray(payload.signatures) ? payload.signatures : [];
    for (const signature of payloadSignatures) {
      const mappedNodeId = idMap.get(signature.node_id) || signature.node_id;
      const nodeExists = await dbGet<{ id: string }>('SELECT id FROM documento_nodos WHERE id = ?', [mappedNodeId]);
      if (!nodeExists) continue;

      let signatureId = signature.id;
      const signatureExists = await dbGet<{ id: string }>('SELECT id FROM documento_firmas WHERE id = ?', [signatureId]);
      if (signatureExists) signatureId = generateId('sig');

      await dbRun(
        `INSERT INTO documento_firmas (
           id, node_id, signer_name, signer_role, signature_data_url, pos_x_percent, pos_y_percent, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          signatureId,
          mappedNodeId,
          signature.signer_name,
          signature.signer_role || null,
          signature.signature_data_url,
          Number(signature.pos_x_percent || 76),
          Number(signature.pos_y_percent || 78),
          signature.created_at || new Date().toISOString(),
        ]
      );
    }

    await dbRun('DELETE FROM documento_papelera WHERE id = ?', [trashItem.id]);
    return idMap.get(trashItem.root_node_id) || trashItem.root_node_id;
  },

  async listAuditTrail(limit: number = 120): Promise<DocumentoAuditRow[]> {
    await ensureDocumentAuditTable();
    const safeLimit = Math.max(1, Math.min(Number(limit || 120), 500));
    return dbAll<DocumentoAuditRow>(
      `SELECT
         id, event_type, node_id, node_name, node_type,
         from_parent_id, from_parent_name,
         to_parent_id, to_parent_name,
         actor_user_id, actor_user_name, actor_role,
         details_json, created_at
       FROM documento_auditoria
       ORDER BY datetime(created_at) DESC
       LIMIT ?`,
      [safeLimit]
    );
  },

  async getById(id: string, actorRole?: RolUsuario): Promise<DocumentoNodoRow | undefined> {
    void actorRole;
    return dbGet<DocumentoNodoRow>(
      `SELECT id, parent_id, name, node_type, file_name, mime_type, file_data_url,
              file_disk_path, file_size_bytes, storage_mode, created_at, updated_at
       FROM documento_nodos
       WHERE id = ?`,
      [id]
    );
  },

  async listSignatures(nodeId: string, actorRole?: RolUsuario): Promise<DocumentoFirmaRow[]> {
    void actorRole;
    return dbAll<DocumentoFirmaRow>(
      `SELECT id, node_id, signer_name, signer_role, signature_data_url, pos_x_percent, pos_y_percent, created_at
       FROM documento_firmas
       WHERE node_id = ?
       ORDER BY datetime(created_at) ASC`,
      [nodeId]
    );
  },

  async addSignature(
    nodeId: string,
    signerName: string,
    signerRole: string,
    signatureDataUrl: string,
    posXPercent: number = 76,
    posYPercent: number = 78,
    actorUserId?: string,
    actorRole?: RolUsuario
  ): Promise<string> {
    await assertActorPermission('can_sign_documents', actorUserId, actorRole, 'No tienes permiso para firmar documentos.');
    const id = generateId('sig');
    await dbRun(
      `INSERT INTO documento_firmas (
         id, node_id, signer_name, signer_role, signature_data_url, pos_x_percent, pos_y_percent, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        nodeId,
        signerName || 'Sin nombre',
        signerRole || null,
        signatureDataUrl,
        Number.isFinite(posXPercent) ? posXPercent : 76,
        Number.isFinite(posYPercent) ? posYPercent : 78,
      ]
    );
    return id;
  },

  async clearSignatures(nodeId: string, actorUserId?: string, actorRole?: RolUsuario): Promise<void> {
    await assertActorPermission('can_sign_documents', actorUserId, actorRole, 'No tienes permiso para gestionar firmas.');
    await dbRun('DELETE FROM documento_firmas WHERE node_id = ?', [nodeId]);
  },

  async getOfficePreview(nodeId: string, actorUserId?: string, actorRole?: RolUsuario): Promise<DocumentoOfficePreview> {
    void actorUserId;
    void actorRole;
    const node = await DocumentoTreeRepo.getById(nodeId);
    if (!node || node.node_type !== 'file') {
      throw new Error('El documento seleccionado no existe o no es un archivo.');
    }

    const fileName = String(node.file_name || node.name || 'documento');
    const extension = inferOfficeExtension(fileName, node.mime_type || undefined);
    const binary = await getNodeBinary(node);

    if (extension === 'docx') {
      const parsed = await mammoth.convertToHtml({ buffer: binary });
      const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/><style>body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;background:#fff;margin:0;padding:20px;line-height:1.5}table{border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:6px 8px}</style></head><body>${parsed.value || '<p>(Sin contenido)</p>'}</body></html>`;
      return { fileName, extension, html };
    }

    if (extension === 'xlsx' || extension === 'xls') {
      const wb = XLSX.read(binary, { type: 'buffer', dense: true });
      const sections = wb.SheetNames.map(sheetName => {
        const ws = wb.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
          header: 1,
          defval: '',
          raw: false,
        });
        const rows = matrix.slice(0, 120);
        const htmlRows = rows.map(row => `<tr>${row.map(cell => `<td>${String(cell ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))}</td>`).join('')}</tr>`).join('');
        return `<section style="margin-bottom:22px"><h3 style="margin:0 0 8px">${sheetName}</h3><table style="width:100%;border-collapse:collapse">${htmlRows}</table></section>`;
      }).join('');

      const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/><style>body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;background:#fff;margin:0;padding:20px;line-height:1.45}td,th{border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;vertical-align:top}table{border-collapse:collapse}</style></head><body>${sections || '<p>(Sin contenido legible)</p>'}</body></html>`;
      return { fileName, extension, html };
    }

    if (extension === 'doc' || extension === 'ppt' || extension === 'pptx') {
      const sizeKb = Math.max(1, Math.round(binary.length / 1024));
      const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/><style>body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;background:#fff;margin:0;padding:28px;line-height:1.5} .card{max-width:860px;border:1px solid #cbd5e1;border-radius:12px;padding:18px;background:#f8fafc} h2{margin:0 0 8px;font-size:20px} p{margin:6px 0} .meta{font-size:12px;color:#475569}</style></head><body><div class="card"><h2>Vista interna Office</h2><p>El archivo <strong>${fileName}</strong> (${extension.toUpperCase()}) fue cargado en modo interno.</p><p>Este formato aún no tiene renderizado completo en el visor embebido de la app.</p><p>Recomendación: convierte a <strong>DOCX</strong> o <strong>XLSX</strong> para visualización interna completa.</p><p class="meta">Tamaño aproximado: ${sizeKb} KB</p></div></body></html>`;
      return { fileName, extension, html };
    }

    throw new Error('Visualización interna Office soporta DOCX, XLSX y XLS.');
  },

  async analyzeOfficeNode(nodeId: string, actorRole?: RolUsuario): Promise<DocumentoOfficeAnalysis> {
    void actorRole;
    const node = await DocumentoTreeRepo.getById(nodeId);
    if (!node || node.node_type !== 'file') {
      throw new Error('El documento seleccionado no existe o no es un archivo.');
    }

    const fileName = String(node.file_name || node.name || 'documento');
    const extension = normalizeExtension(fileName).replace('.', '').toLowerCase();
    const mimeType = String(node.mime_type || '');

    if (!['doc', 'docx', 'xls', 'xlsx'].includes(extension)) {
      return {
        nodeId,
        fileName,
        extension,
        mimeType,
        parser: 'unsupported',
        summary: 'Formato no soportado para análisis automático.',
        warnings: ['Actualmente el análisis automático cubre DOCX/XLSX y lectura limitada de XLS heredado.'],
      };
    }

    const binary = await getNodeBinary(node);

    if (extension === 'doc' || extension === 'docx') {
      if (extension === 'doc') {
        return {
          nodeId,
          fileName,
          extension,
          mimeType,
          parser: 'unsupported',
          summary: 'Se detectó un archivo .doc (Word 97-2003).',
          warnings: ['Para extraer contenido con precisión, conviértelo a .docx.'],
        };
      }

      const parsed = await mammoth.extractRawText({ buffer: binary });
      const text = String(parsed.value || '').replace(/\s+/g, ' ').trim();
      return {
        nodeId,
        fileName,
        extension,
        mimeType,
        parser: 'mammoth',
        summary: `Documento Word analizado. Caracteres detectados: ${text.length}.`,
        warnings: parsed.messages.map(message => message.message),
        textPreview: text.slice(0, 1800),
      };
    }

    const workbook = XLSX.read(binary, { type: 'buffer', dense: true });
    const sheets = workbook.SheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
        header: 1,
        defval: '',
        raw: false,
      });

      const headerRow = (matrix[0] || []).map((cell, index) => {
        const base = String(cell || '').trim();
        return base || `col_${index + 1}`;
      });

      const dataRows = matrix.slice(1, 6).map(row => {
        const record: Record<string, string> = {};
        headerRow.forEach((header, index) => {
          const value = row[index];
          record[header] = value == null ? '' : String(value);
        });
        return record;
      });

      const columnCount = matrix.reduce((max, row) => Math.max(max, row.length), 0);
      return {
        name: sheetName,
        rows: Math.max(matrix.length - 1, 0),
        columns: columnCount,
        sample: dataRows,
      };
    });

    return {
      nodeId,
      fileName,
      extension,
      mimeType,
      parser: 'xlsx',
      summary: `Libro analizado con ${sheets.length} hoja(s).`,
      warnings: [],
      sheets,
    };
  },
};
