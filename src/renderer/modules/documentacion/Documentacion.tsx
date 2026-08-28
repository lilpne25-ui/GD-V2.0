import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RolUsuario } from '../../../shared/types/common';
import { toast, confirm } from '../../components/Toast';
import SgcIcon from '../../components/SgcIcon';
import { SGC_ICONS } from '../../components/SgcIcon';
import EmptyState from '../../components/EmptyState';
import type { SgcIconName } from '../../components/SgcIcon';
import './Documentacion.css';
import { useDocumentTree } from './hooks/useDocumentTree';
import { useDocumentPermissions } from './hooks/useDocumentPermissions';
import { useWorkflow, WF_STATUS_LABEL } from './hooks/useWorkflow';

type DocNodeType = 'folder' | 'file';

type DocNode = {
  id: string;
  name: string;
  type: DocNodeType;
  createdAt: string;
  children: DocNode[];
  fileUrl?: string;
  fileDiskPath?: string;
  storageMode?: 'dataurl' | 'disk';
  fileSizeBytes?: number;
  fileName?: string;
  mimeType?: string;
};

type DocumentoNodoRow = {
  id: string;
  parent_id: string | null;
  name: string;
  node_type: DocNodeType;
  file_name: string | null;
  mime_type: string | null;
  file_data_url: string | null;
  file_disk_path: string | null;
  file_size_bytes: number | null;
  storage_mode: 'dataurl' | 'disk' | null;
  created_at: string;
  updated_at: string;
};

type DocumentoFirmaRow = {
  id: string;
  node_id: string;
  signer_name: string;
  signer_role: string | null;
  signature_data_url: string;
  pos_x_percent: number;
  pos_y_percent: number;
  created_at: string;
};

type DocumentoPermisos = {
  can_add_documents: number;
  can_delete_documents: number;
  can_rename_documents: number;
  can_move_documents: number;
  can_sign_documents: number;
};

type DocumentoOfficePreview = {
  fileName: string;
  extension: string;
  html: string;
};

<<<<<<< HEAD
=======
type DocumentoDownloadPayload = {
  fileName: string;
  mimeType: string;
  base64: string;
  sizeBytes: number;
};

>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
type DocumentoTrashRow = {
  id: string;
  root_node_id: string;
  root_node_name: string | null;
  root_node_type: 'folder' | 'file' | null;
  deleted_by_name: string | null;
  deleted_by_role: string | null;
  deleted_at: string;
  expires_at: string;
  days_left: number;
};

type NameDialogMode = 'create-folder' | 'rename';
type ViewMode = 'grid' | 'list';
type SortMode = 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'type';
type DocUiIconName = SgcIconName;

const OFFICE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const OFFICE_MIME_HINTS = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_FILE_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB por archivo
const MAX_BATCH_UPLOAD_BYTES = 140 * 1024 * 1024; // 140 MB por carga
const MAX_DATAURL_FALLBACK_BYTES = 25 * 1024 * 1024; // si no hay ruta nativa, fallback seguro

const DocUiIcon: React.FC<{ name: DocUiIconName; className?: string; filled?: boolean }> = ({ name, className, filled = false }) => (
  <SgcIcon name={name} size="md" className={className} filled={filled} />
);

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const toFileUri = (diskPath: string): string => {
  const normalized = diskPath.replace(/\\/g, '/');
  const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return encodeURI(`file://${withSlash}`);
};

<<<<<<< HEAD
=======
const decodeBase64ToBytes = (rawBase64: string): Uint8Array => {
  const binary = window.atob(rawBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const bytesToBlobPart = (bytes: Uint8Array): BlobPart => {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

const triggerBlobDownload = (blob: Blob, fileName: string): void => {
  const safeName = (fileName || 'documento').trim() || 'documento';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
const parseRoleFromUnknown = (value: unknown): RolUsuario | null => {
  if (typeof value !== 'string') return null;
  const role = value.trim();
  if (!role) return null;
  return role;
};

const parseUserNameFromUnknown = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (!name) return null;
  return name;
};

const getRoleFromSession = (): RolUsuario => {
  const fromCurrentRole = parseRoleFromUnknown(localStorage.getItem('sgc.currentRole'));
  if (fromCurrentRole) return fromCurrentRole;

  const sessionRaw = localStorage.getItem('sgc.session');
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      const fromSession = parseRoleFromUnknown(session?.usuario?.rol || session?.user?.rol || session?.rol);
      if (fromSession) return fromSession;
    } catch {
      // Ignorar sesión malformada
    }
  }

  const userRaw = localStorage.getItem('sgc.currentUser');
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw);
      const fromUser = parseRoleFromUnknown(user?.rol);
      if (fromUser) return fromUser;
    } catch {
      // Ignorar usuario malformado
    }
  }

  return 'SIN_PUESTO';
};

const getUserNameFromSession = (): string => {
  const sessionRaw = localStorage.getItem('sgc.session');
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      const fromSession = parseUserNameFromUnknown(session?.usuario?.nombre || session?.user?.nombre || session?.nombre);
      if (fromSession) return fromSession;
    } catch {
      // Ignorar sesión malformada
    }
  }

  const userRaw = localStorage.getItem('sgc.currentUser');
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw);
      const fromUser = parseUserNameFromUnknown(user?.nombre);
      if (fromUser) return fromUser;
    } catch {
      // Ignorar usuario malformado
    }
  }

  return 'USUARIO DESCONOCIDO';
};

const getUserIdFromSession = (): string | null => {
  const sessionRaw = localStorage.getItem('sgc.session');
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      const value = session?.usuario?.id || session?.user?.id || session?.id;
      if (typeof value === 'string' && value.trim()) return value.trim();
    } catch {
      // Ignorar sesión malformada
    }
  }

  const userRaw = localStorage.getItem('sgc.currentUser');
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw);
      const value = user?.id;
      if (typeof value === 'string' && value.trim()) return value.trim();
    } catch {
      // Ignorar usuario malformado
    }
  }

  return null;
};

const initialTree: DocNode = {
  id: 'root',
  name: 'Documentos',
  type: 'folder',
  createdAt: new Date().toISOString(),
  children: [],
};

const findNodeById = (node: DocNode, id: string): DocNode | null => {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
};

const updateNodeById = (node: DocNode, id: string, updater: (n: DocNode) => DocNode): DocNode => {
  if (node.id === id) return updater(node);
  return { ...node, children: node.children.map(child => updateNodeById(child, id, updater)) };
};

const removeNodeById = (node: DocNode, id: string): DocNode => {
  return {
    ...node,
    children: node.children
      .filter(child => child.id !== id)
      .map(child => removeNodeById(child, id)),
  };
};

const findPath = (node: DocNode, id: string, path: DocNode[] = []): DocNode[] => {
  if (node.id === id) return [...path, node];
  for (const child of node.children) {
    const result = findPath(child, id, [...path, node]);
    if (result.length) return result;
  }
  return [];
};

const collectDescendantIds = (node: DocNode): Set<string> => {
  const ids = new Set<string>();
  const walk = (current: DocNode) => {
    ids.add(current.id);
    current.children.forEach(child => walk(child));
  };
  walk(node);
  return ids;
};

const mapRowsToTree = (rows: DocumentoNodoRow[]): DocNode => {
  const map = new Map<string, DocNode>();

  rows.forEach(row => {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.node_type,
      createdAt: row.created_at,
      children: [],
      fileUrl: row.file_data_url || undefined,
      fileDiskPath: row.file_disk_path || undefined,
      storageMode: row.storage_mode || (row.file_disk_path ? 'disk' : (row.file_data_url ? 'dataurl' : undefined)),
      fileSizeBytes: typeof row.file_size_bytes === 'number' ? row.file_size_bytes : undefined,
      fileName: row.file_name || undefined,
      mimeType: row.mime_type || undefined,
    });
  });

  let root = map.get('root');
  if (!root) {
    root = { id: 'root', name: 'Documentos', type: 'folder', createdAt: new Date().toISOString(), children: [] };
    map.set('root', root);
  }

  rows.forEach(row => {
    if (!row.parent_id) return;
    const parent = map.get(row.parent_id);
    const child = map.get(row.id);
    if (parent && child) parent.children.push(child);
  });

  const sortTree = (node: DocNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });
    node.children.forEach(sortTree);
  };
  sortTree(root);
  return root;
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}`));
    reader.readAsDataURL(file);
  });
};

const FAV_STORAGE_KEY = 'sgc.docs.favorites';

const getInitialFavorites = (): Set<string> => {
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set<string>(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set<string>();
  }
};

const Documentacion: React.FC = () => {
  const {
    tree,
    currentFolderId,
    setCurrentFolderId,
    selectedNodeId,
    setSelectedNodeId,
    uploadTargetFolderId,
    setUploadTargetFolderId,
    expandedFolders,
    setExpandedFolders,
    isLoadingTree,
    treeError,
    refreshTree,
  } = useDocumentTree<DocNode, DocumentoNodoRow>({
    initialTree,
    defaultFolderId: 'root',
    callTreeRepo: async (method: string, ...args: any[]) => callTreeRepo(method, ...args),
    mapRowsToTree,
    findNodeById,
    treeLoadErrorMessage: 'No se pudo cargar la estructura de carpetas desde la base de datos.',
  });
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocNode | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewWithGoogle, setPreviewWithGoogle] = useState(false);
  const [previewMasked, setPreviewMasked] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDialogMode, setNameDialogMode] = useState<NameDialogMode>('create-folder');
  const [nameDialogTargetId, setNameDialogTargetId] = useState('root');
  const [nameDialogValue, setNameDialogValue] = useState('');
  const {
    documentPerms,
    loadingPerms,
    refreshDocumentPermissions,
  } = useDocumentPermissions();
  const [actionMenuNodeId, setActionMenuNodeId] = useState<string | null>(null);
  const [ctxMenuPos, setCtxMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRole, setCurrentRole] = useState<RolUsuario>(() => getRoleFromSession());
  const [currentUserName, setCurrentUserName] = useState<string>(() => getUserNameFromSession());
  const [currentUserId, setCurrentUserId] = useState<string>(() => getUserIdFromSession() || 'SIN_ID');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('name-asc');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => getInitialFavorites());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveNodeId, setMoveNodeId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [watermarkTick, setWatermarkTick] = useState(0);
  const [showTrashDialog, setShowTrashDialog] = useState(false);
  const [trashItems, setTrashItems] = useState<DocumentoTrashRow[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [showAccessInfoDialog, setShowAccessInfoDialog] = useState(false);
  const [pendingExternalOpenNodeId, setPendingExternalOpenNodeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activePreviewWindowsRef = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Historial de navegación (Alt+← / Alt+→)
  const [folderHistory, setFolderHistory] = useState<string[]>(['root']);
  const [historyIndex, setHistoryIndex] = useState(0);
  // ── Multi-selección (Ctrl+clic, Shift+clic, Ctrl+A)
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  // ── Refs para evitar stale-closures en el handler de teclado
  const kbStateRef = useRef({
    currentFolderId: 'root' as string,
    currentChildren: [] as DocNode[],
    selectedNodeId: null as string | null,
    selectedNodeIds: new Set<string>(),
    folderHistory: ['root'] as string[],
    historyIndex: 0,
    documentPerms: { can_add_documents: 1, can_delete_documents: 0,
      can_rename_documents: 0, can_move_documents: 0, can_sign_documents: 0 } as DocumentoPermisos,
    nameDialogOpen: false,
    moveDialogOpen: false,
    tree: initialTree as DocNode,
  });
  const kbFnRef = useRef<{
    openNode: (n: DocNode) => void;
    openRenameDialog: (id: string) => void;
    deleteNode: (id: string) => void;
    refreshCurrentFolder: () => void;
  }>({
    openNode: () => {},
    openRenameDialog: () => {},
    deleteNode: () => {},
    refreshCurrentFolder: () => {},
  });

  async function callTreeRepo(method: string, ...args: any[]) {
    const userId = getUserIdFromSession() || undefined;
    return (window as any).repo.call('DocumentoTreeRepo', method, ...args, userId, currentRole);
  }

  const {
    workflowMap,
    setWorkflowMap,
    showWorkflowPanel,
    setShowWorkflowPanel,
    pendingReview,
    wfApproveDialog,
    setWfApproveDialog,
    wfApproveTargetFolder,
    setWfApproveTargetFolder,
    wfApproveSendEmail,
    setWfApproveSendEmail,
    wfApproveDestinatarioIds,
    setWfApproveDestinatarioIds,
    wfCorrectionDialog,
    setWfCorrectionDialog,
    wfCorr,
    setWfCorr,
    wfCorrectionHistory,
    allUsuarios,
    loadWorkflowForNodes,
    loadPendingReview,
    loadAllUsuarios,
    submitForReview,
    approveWorkflow,
    requestCorrection,
    loadCorrectionHistory,
  } = useWorkflow({
    currentUserId,
    currentUserName,
    currentRole,
    callTreeRepo,
    refreshTree,
  });

  // ── Navegar con historial ──────────────────────────────────────────
  const navigateTo = (folderId: string) => {
    const { historyIndex: idx, folderHistory: hist } = kbStateRef.current;
    setCurrentFolderId(folderId);
    setExpandedFolders(prev => new Set([...prev, folderId]));
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
    setFolderHistory([...hist.slice(0, idx + 1), folderId]);
    setHistoryIndex(idx + 1);
  };

  const historyBack = () => {
    const { historyIndex: idx, folderHistory: hist } = kbStateRef.current;
    if (idx <= 0) return;
    const ni = idx - 1;
    setHistoryIndex(ni);
    setCurrentFolderId(hist[ni]);
    setExpandedFolders(prev => new Set([...prev, hist[ni]]));
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
  };

  const historyForward = () => {
    const { historyIndex: idx, folderHistory: hist } = kbStateRef.current;
    if (idx >= hist.length - 1) return;
    const ni = idx + 1;
    setHistoryIndex(ni);
    setCurrentFolderId(hist[ni]);
    setExpandedFolders(prev => new Set([...prev, hist[ni]]));
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
  };

  const goUp = () => {
    const { tree: t, currentFolderId: cfi } = kbStateRef.current;
    const path = findPath(t, cfi);
    if (path.length >= 2) navigateTo(path[path.length - 2].id);
  };
  // ──────────────────────────────────────────────────────────────────

  const currentFolder = useMemo(() => {
    const node = findNodeById(tree, currentFolderId);
    if (node && node.type === 'folder') return node;
    return tree;
  }, [tree, currentFolderId]);

  const currentChildren = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = !s
      ? currentFolder.children
      : currentFolder.children.filter(child => child.name.toLowerCase().includes(s));

    const next = [...filtered];
    next.sort((a, b) => {
      if (sortMode === 'type') {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      }
      if (sortMode === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortMode === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      const compare = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      return sortMode === 'name-desc' ? -compare : compare;
    });
    return next;
  }, [currentFolder.children, search, sortMode]);

  const quickFavorites = useMemo(() => {
    return Array.from(favoriteIds)
      .map(id => findNodeById(tree, id))
      .filter((node): node is DocNode => Boolean(node));
  }, [favoriteIds, tree]);

  const pathToCurrent = useMemo(() => findPath(tree, currentFolder.id), [tree, currentFolder.id]);
  const currentFolderSummary = useMemo(() => {
    const folders = currentChildren.filter(child => child.type === 'folder').length;
    const files = currentChildren.filter(child => child.type === 'file').length;
    return {
      folders,
      files,
      selected: selectedNodeIds.size || (selectedNodeId ? 1 : 0),
      favorites: quickFavorites.length,
    };
  }, [currentChildren, quickFavorites.length, selectedNodeId, selectedNodeIds]);

  const moveTargetOptions = useMemo(() => {
    const selected = moveNodeId ? findNodeById(tree, moveNodeId) : null;
    const blockedIds = selected ? collectDescendantIds(selected) : new Set<string>();
    const result: Array<{ id: string; label: string }> = [];

    const walk = (node: DocNode, prefix: string) => {
      if (node.type === 'folder' && !blockedIds.has(node.id)) {
        result.push({ id: node.id, label: prefix ? `${prefix} / ${node.name}` : node.name });
      }
      node.children
        .filter(child => child.type === 'folder')
        .forEach(child => walk(child, prefix ? `${prefix} / ${node.name}` : node.name));
    };

    walk(tree, '');
    return result;
  }, [tree, moveNodeId]);

  const watermarkText = useMemo(() => {
    if (!previewDoc) return '';
    return `CONFIDENCIAL · ${currentUserName} · ${currentRole} · ${previewDoc.id} · ${new Date().toLocaleString('es-MX')}`;
  }, [previewDoc, currentUserName, currentRole, watermarkTick]);

  const watermarkTiles = useMemo(() => Array.from({ length: 14 }, (_, index) => index + 1), []);
  const watermarkPhaseClass = useMemo(
    () => `preview-watermark-layer--phase-${watermarkTick % 3}`,
    [watermarkTick]
  );

  const setContentProtection = async (enabled: boolean): Promise<boolean> => {
    try {
      const api = (window as any).electronAPI;
      if (!api?.setContentProtection) return false;

      const changed = await api.setContentProtection(enabled);
      if (!changed) return false;

      if (api.getContentProtection) {
        const current = await api.getContentProtection();
        return Boolean(current) === Boolean(enabled);
      }

      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    void refreshTree('root');
    void refreshDocumentPermissions(currentUserId);
    void loadPendingReview();
    void loadAllUsuarios();
    return () => {
      void setContentProtection(false);
    };
  }, []);

  useEffect(() => {
    const syncExternalOpen = () => {
      const nodeId = String(localStorage.getItem('sgc.openDocumentNodeId') || '').trim();
      if (!nodeId) return;
      setPendingExternalOpenNodeId(nodeId);
    };

    syncExternalOpen();
    window.addEventListener('storage', syncExternalOpen);
    window.addEventListener('focus', syncExternalOpen);
    return () => {
      window.removeEventListener('storage', syncExternalOpen);
      window.removeEventListener('focus', syncExternalOpen);
    };
  }, []);

  useEffect(() => {
    if (!pendingExternalOpenNodeId || isLoadingTree) return;

    void (async () => {
      const opened = await openNodeByIdFromExternal(pendingExternalOpenNodeId, true);
      if (!opened) {
        toast.warning('No se encontró el documento solicitado (puede haber sido movido o eliminado).');
      }
      localStorage.removeItem('sgc.openDocumentNodeId');
      localStorage.removeItem('sgc.openDocumentNodeAt');
      setPendingExternalOpenNodeId(null);
    })();
  }, [pendingExternalOpenNodeId, tree, isLoadingTree]);

  useEffect(() => {
    const syncRole = () => {
      const nextUserId = getUserIdFromSession();
      setCurrentRole(getRoleFromSession());
      setCurrentUserName(getUserNameFromSession());
      setCurrentUserId(nextUserId || 'SIN_ID');
      void refreshDocumentPermissions(nextUserId);
    };

    window.addEventListener('storage', syncRole);
    window.addEventListener('focus', syncRole);

    return () => {
      window.removeEventListener('storage', syncRole);
      window.removeEventListener('focus', syncRole);
    };
  }, []);

  useEffect(() => {
    void refreshTree(currentFolderId);
  }, [currentRole]);

  useEffect(() => {
    if (wfApproveDialog || wfCorrectionDialog) {
      void loadAllUsuarios();
    }
  }, [wfApproveDialog, wfCorrectionDialog]);

  useEffect(() => {
    if (!previewDoc) return;
    if (!findNodeById(tree, previewDoc.id)) {
      void closePreview();
    }
  }, [tree, previewDoc]);

  useEffect(() => {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(Array.from(favoriteIds)));
  }, [favoriteIds]);

  useEffect(() => {
    const onClickOutside = () => { setActionMenuNodeId(null); setCtxMenuPos(null); };
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  // Load workflow status for current children
  useEffect(() => {
    if (currentChildren.length > 0) {
      void loadWorkflowForNodes(currentChildren);
    }
  }, [currentFolderId, tree]);

  // Actualiza los refs de estado en cada render (sin deps = siempre fresco)
  useEffect(() => {
    kbStateRef.current = {
      currentFolderId, currentChildren, selectedNodeId, selectedNodeIds,
      folderHistory, historyIndex, documentPerms, nameDialogOpen, moveDialogOpen, tree,
    };
  });

  useEffect(() => {
    kbFnRef.current = {
      openNode,
      openRenameDialog,
      deleteNode,
      refreshCurrentFolder: () => void refreshTree(currentFolderId),
    };
  });

  // ── Handler de teclado estilo Windows Explorer (registrado una sola vez) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = kbStateRef.current;
      const fn = kbFnRef.current;
      const tag = (e.target as HTMLElement)?.tagName || '';
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
      const isDialog = s.nameDialogOpen || s.moveDialogOpen;

      // Escape — cierra menú contextual (siempre)
      if (e.key === 'Escape') {
        setActionMenuNodeId(null);
        setCtxMenuPos(null);
        return;
      }

      if (isDialog || isInput) return;

      // F5 — actualizar vista
      if (e.key === 'F5') {
        e.preventDefault();
        fn.refreshCurrentFolder();
        return;
      }

      // F2 — renombrar seleccionado
      if (e.key === 'F2' && s.selectedNodeId) {
        e.preventDefault();
        fn.openRenameDialog(s.selectedNodeId);
        return;
      }

      // Supr — eliminar seleccionado
      if (e.key === 'Delete' && s.selectedNodeId) {
        e.preventDefault();
        fn.deleteNode(s.selectedNodeId);
        return;
      }

      // Alt + ← — atrás en historial
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        historyBack();
        return;
      }

      // Alt + → — adelante en historial
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        historyForward();
        return;
      }

      // Alt + ↑ / Backspace — subir un nivel
      if ((e.altKey && e.key === 'ArrowUp') || e.key === 'Backspace') {
        e.preventDefault();
        goUp();
        return;
      }

      // Ctrl + A — seleccionar todo
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedNodeIds(new Set(s.currentChildren.map(c => c.id)));
        const last = s.currentChildren[s.currentChildren.length - 1];
        if (last) setSelectedNodeId(last.id);
        return;
      }

      // Ctrl + Espacio — toggle elemento actual
      if ((e.ctrlKey || e.metaKey) && e.key === ' ' && s.selectedNodeId) {
        e.preventDefault();
        const nid = s.selectedNodeId;
        setSelectedNodeIds(prev => {
          const next = new Set(prev);
          if (next.has(nid)) next.delete(nid); else next.add(nid);
          return next;
        });
        return;
      }

      // Enter — abrir el elemento seleccionado
      if (e.key === 'Enter' && s.selectedNodeId) {
        e.preventDefault();
        const node = findNodeById(s.tree, s.selectedNodeId);
        if (node) fn.openNode(node);
        return;
      }

      // ↑ / ↓ — navegar entre elementos de la carpeta actual
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.altKey) {
        e.preventDefault();
        const items = s.currentChildren;
        if (!items.length) return;
        const ci = items.findIndex(c => c.id === s.selectedNodeId);
        let ni: number;
        if (e.key === 'ArrowDown') ni = ci < 0 ? 0 : Math.min(ci + 1, items.length - 1);
        else ni = ci < 0 ? 0 : Math.max(ci - 1, 0);
        const nextId = items[ni].id;
        setSelectedNodeId(nextId);
        setSelectedNodeIds(new Set([nextId]));
        document.querySelector(`[data-node-id="${nextId}"]`)?.scrollIntoView({ block: 'nearest' });
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!moveDialogOpen) return;
    const valid = moveTargetOptions.some(option => option.id === moveTargetId);
    if (!valid) {
      setMoveTargetId(moveTargetOptions[0]?.id || '');
    }
  }, [moveDialogOpen, moveTargetId, moveTargetOptions]);

  useEffect(() => {
    if (!previewDoc) {
      setPreviewMasked(false);
      return;
    }

    const onBlur = () => setPreviewMasked(true);
    const onFocus = () => setPreviewMasked(false);
    const onVisibility = () => {
      setPreviewMasked(document.hidden);
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const guard = window.setInterval(() => {
      void setContentProtection(true);
    }, 1200);

    const watermarkTimer = window.setInterval(() => {
      setWatermarkTick(prev => prev + 1);
    }, 7000);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(guard);
      window.clearInterval(watermarkTimer);
    };
  }, [previewDoc]);

  const openUploadFor = (folderId: string) => {
    if (documentPerms.can_add_documents !== 1) {
      toast.warning('Tu usuario no tiene permiso para agregar documentos.');
      return;
    }
    setUploadTargetFolderId(folderId);
    fileInputRef.current?.click();
  };

  const openNodeByIdFromExternal = async (nodeId: string, openFile: boolean = true): Promise<boolean> => {
    const targetId = String(nodeId || '').trim();
    if (!targetId) return false;

    const target = findNodeById(tree, targetId);
    if (!target) return false;

    const path = findPath(tree, targetId);
    if (path.length === 0) return false;

    const folderPathIds = path
      .filter(node => node.type === 'folder')
      .map(node => node.id);

    setExpandedFolders(prev => {
      const next = new Set(prev);
      folderPathIds.forEach(id => next.add(id));
      return next;
    });

    if (target.type === 'folder') {
      navigateTo(target.id);
      setSelectedNodeId(target.id);
      setSelectedNodeIds(new Set([target.id]));
      return true;
    }

    const parentFolder = path[path.length - 2];
    if (parentFolder?.id) {
      navigateTo(parentFolder.id);
    }
    setSelectedNodeId(target.id);
    setSelectedNodeIds(new Set([target.id]));

    if (openFile) {
      await viewDocumentFile(target);
    }
    return true;
  };

  const loadTrash = async () => {
    setLoadingTrash(true);
    try {
      const items = await callTreeRepo('listTrash', 200) as DocumentoTrashRow[];
      setTrashItems(items || []);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar la papelera.');
      setTrashItems([]);
    } finally {
      setLoadingTrash(false);
    }
  };

  const restoreTrashItem = async (trashId: string) => {
    try {
      const restoredRootId = await callTreeRepo('restoreTrashItem', trashId) as string;
      await refreshTree(currentFolderId);
      await loadTrash();
      const opened = await openNodeByIdFromExternal(restoredRootId, true);
      if (!opened) {
        toast.info('Elemento restaurado. Si no aparece de inmediato, usa Refresh.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo restaurar el elemento de la papelera.');
    }
  };

  const deleteTrashItem = async (trashId: string) => {
    if (!await confirm({ title: 'Eliminar definitivamente', message: 'Este elemento se eliminará definitivamente y no podrá recuperarse. ¿Continuar?', variant: 'danger' })) return;
    try {
      await callTreeRepo('deleteTrashItem', trashId);
      await loadTrash();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar el elemento de la papelera.');
    }
  };

  const openCreateFolderDialog = (parentId: string) => {
    if (documentPerms.can_add_documents !== 1) {
      toast.warning('Tu usuario no tiene permiso para crear carpetas.');
      return;
    }
    setNameDialogMode('create-folder');
    setNameDialogTargetId(parentId);
    setNameDialogValue('');
    setNameDialogOpen(true);
  };

  const openRenameDialog = (id: string) => {
    if (documentPerms.can_rename_documents !== 1) {
      toast.warning('Tu usuario no tiene permiso para renombrar elementos.');
      return;
    }
    const node = findNodeById(tree, id);
    if (!node) return;
    setNameDialogMode('rename');
    setNameDialogTargetId(id);
    setNameDialogValue(node.name);
    setNameDialogOpen(true);
  };

  const submitNameDialog = async () => {
    const value = nameDialogValue.trim();
    if (!value) return;

    try {
      if (nameDialogMode === 'create-folder') {
        if (documentPerms.can_add_documents !== 1) {
          toast.warning('Tu usuario no tiene permiso para crear carpetas.');
          return;
        }
        await callTreeRepo('createFolder', nameDialogTargetId, value);
        setExpandedFolders(prev => new Set([...prev, nameDialogTargetId]));
        await refreshTree(nameDialogTargetId);
      } else {
        if (documentPerms.can_rename_documents !== 1) {
          toast.warning('Tu usuario no tiene permiso para renombrar elementos.');
          return;
        }
        await callTreeRepo('renameNode', nameDialogTargetId, value);
        await refreshTree(currentFolderId);
      }
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar el cambio.');
    }

    setNameDialogOpen(false);
    setNameDialogValue('');
  };

  const deleteNode = (id: string) => {
    if (id === 'root') return;
    if (documentPerms.can_delete_documents !== 1) {
      toast.warning('Tu usuario no tiene permiso para eliminar documentos o carpetas.');
      return;
    }
    void (async () => {
      try {
        await callTreeRepo('deleteNode', id);
        await refreshTree(currentFolderId);
      } catch (err: any) {
        toast.error(err?.message || 'No se pudo eliminar el elemento.');
      }
    })();
  };

  const uploadFilesToFolder = async (folderId: string, files: File[]) => {
    if (!files.length) return;
    if (documentPerms.can_add_documents !== 1) {
      toast.warning('Tu usuario no tiene permiso para agregar documentos.');
      return;
    }

    const oversized = files.filter(file => file.size > MAX_FILE_UPLOAD_BYTES);
    const allowedByFileSize = files.filter(file => file.size <= MAX_FILE_UPLOAD_BYTES);

    if (oversized.length > 0) {
      const names = oversized.slice(0, 5).map(file => `• ${file.name} (${formatBytes(file.size)})`).join('\n');
      toast.warning(
        `Se omitieron ${oversized.length} archivo(s) por exceder ${formatBytes(MAX_FILE_UPLOAD_BYTES)} por archivo.`
      );
    }

    if (!allowedByFileSize.length) return;

    const batchBytes = allowedByFileSize.reduce((acc, file) => acc + file.size, 0);
    if (batchBytes > MAX_BATCH_UPLOAD_BYTES) {
      toast.warning(
        `La carga total (${formatBytes(batchBytes)}) excede el límite seguro de ${formatBytes(MAX_BATCH_UPLOAD_BYTES)}. Carga menos archivos a la vez.`
      );
      return;
    }

    try {
      for (const file of allowedByFileSize) {
        const nativePath = String((file as any)?.path || '').trim();
        if (nativePath) {
          await callTreeRepo('createFileFromPath', folderId, file.name, nativePath, file.name, file.type || '', file.size);
          continue;
        }

        if (file.size > MAX_DATAURL_FALLBACK_BYTES) {
          toast.warning(
            `No se puede cargar "${file.name}" sin ruta de disco nativa porque excede ${formatBytes(MAX_DATAURL_FALLBACK_BYTES)}.`
          );
          continue;
        }

        const dataUrl = await readFileAsDataUrl(file);
        await callTreeRepo('createFile', folderId, file.name, dataUrl, file.name, file.type || '');
      }
      await refreshTree(folderId);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron guardar uno o más archivos en la base de datos.');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    void uploadFilesToFolder(uploadTargetFolderId, files);
    event.target.value = '';
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openPreviewInWindow = async (
    doc: DocNode,
    sourceUrl: string,
    withGoogle: boolean,
    existingSignatures: DocumentoFirmaRow[],
    objectUrlToRevoke?: string,
    inlineHtml?: string,
    allowSignatures: boolean = true
  ) => {
    const isProtected = await setContentProtection(true);
    if (!isProtected) {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      toast.error('No se pudo activar el modo protegido. Reinicia la app e inténtalo de nuevo.');
      return;
    }

    activePreviewWindowsRef.current += 1;

    const popup = window.open('', `sgc-doc-view-${doc.id}-${Date.now()}`, 'width=1280,height=860,resizable=yes,scrollbars=yes');
    if (!popup) {
      activePreviewWindowsRef.current = Math.max(0, activePreviewWindowsRef.current - 1);
      if (activePreviewWindowsRef.current === 0) {
        await setContentProtection(false);
      }
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      toast.error('No se pudo abrir la ventana de visualización. Revisa el bloqueo de ventanas emergentes.');
      return;
    }

    const sourceName = doc.fileName || doc.name || doc.id;
    const sourceNameLower = sourceName.toLowerCase();
    const isPdf = (doc.mimeType || '').toLowerCase().includes('pdf') || sourceNameLower.endsWith('.pdf');
    const frameSrc = isPdf
      ? `${sourceUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`
      : sourceUrl;
    const watermark = `CONFIDENCIAL · ${currentUserName} · ${currentRole} · ${doc.id} · ${new Date().toLocaleString('es-MX')}`;
    const defaultSigner = `${currentUserName} (${currentRole})`;
    const popupHtml = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${sourceName}</title>
  <style>
    body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #0b1220; color: #e2e8f0; }
    .topbar { height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; background: #111827; border-bottom: 1px solid #334155; }
    .title { font-size: 14px; font-weight: 700; }
    .meta { font-size: 12px; color: #93c5fd; }
    .viewer-wrap { position: fixed; inset: 52px 0 0 0; }
    iframe { width: 100%; height: 100%; border: 0; background: #0f172a; }
    .wm { position: absolute; inset: 0; pointer-events: none; display: grid; place-items: center; opacity: 0.08; font-size: 22px; transform: rotate(-22deg); white-space: nowrap; color: #f8fafc; }
    .sig-layer { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
    .sig-stamp {
      position: absolute;
      right: 24px;
      bottom: 24px;
      pointer-events: none;
      border: 2px solid rgba(220, 38, 38, 0.55);
      color: rgba(220, 38, 38, 0.9);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.35;
      transform: rotate(-7deg);
      text-shadow: 0 0 1px rgba(0, 0, 0, 0.45);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.18) inset;
      max-width: 320px;
      white-space: pre-line;
    }
    .topbar-actions { display: inline-flex; align-items: center; gap: 8px; }
    .sig-dialog {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 20;
    }
    .sig-dialog.open { display: flex; }
    .sig-card {
      width: min(92vw, 620px);
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 20px 42px rgba(0, 0, 0, 0.45);
    }
    .sig-card h4 { margin: 0 0 8px; font-size: 16px; }
    .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
    .sig-row input {
      width: 100%;
      border: 1px solid #475569;
      border-radius: 6px;
      background: #111827;
      color: #f8fafc;
      padding: 8px 10px;
      font-size: 13px;
    }
    .sig-canvas-wrap {
      border: 1px solid #475569;
      border-radius: 8px;
      background: #fff;
      padding: 8px;
      margin-bottom: 10px;
    }
    #signatureCanvas {
      width: 100%;
      height: 180px;
      touch-action: none;
      background: #fff;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      display: block;
    }
    .sig-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .btn { border: 1px solid #475569; background: #1e293b; color: #f8fafc; border-radius: 6px; padding: 7px 12px; cursor: pointer; }
    .btn:hover { background: #334155; }
    .btn-secondary { border-color: #1d4ed8; background: #1e3a8a; }
    .btn-secondary:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <div class="title">${sourceName}</div>
      <div class="meta">${withGoogle ? 'Google Viewer' : 'Visor interno'} · Protección activa</div>
    </div>
    <div class="topbar-actions">
      ${allowSignatures ? '<button id="btnAddSignature" class="btn btn-secondary">Agregar firma</button><button id="btnClearSignatures" class="btn">Limpiar firmas</button>' : ''}
      <button class="btn" onclick="window.close()">Cerrar</button>
    </div>
  </div>
  <div class="viewer-wrap">
    <div class="wm">${watermark}</div>
    <div id="sigLayer" class="sig-layer"></div>
    <iframe id="docFrame" title="Visor de documento"></iframe>
  </div>

  <div id="signatureDialog" class="sig-dialog" role="dialog" aria-modal="true" aria-label="Agregar firma">
    <div class="sig-card">
      <h4>Agregar firma</h4>
      <div class="sig-row">
        <input id="sigSignerName" placeholder="Nombre" />
        <input id="sigSignerRole" placeholder="Puesto / Rol" />
      </div>
      <div class="sig-canvas-wrap">
        <canvas id="signatureCanvas" width="560" height="180"></canvas>
      </div>
      <div class="sig-actions">
        <button id="btnSigCancel" class="btn">Cancelar</button>
        <button id="btnSigClear" class="btn">Limpiar trazo</button>
        <button id="btnSigSave" class="btn btn-secondary">Guardar firma</button>
      </div>
    </div>
  </div>

  <script>
    (function () {
      const defaultSigner = ${JSON.stringify(defaultSigner)};
      const defaultRole = ${JSON.stringify(currentRole)};
      const actorUserId = ${JSON.stringify(currentUserId)};
      const allowSignatures = ${JSON.stringify(allowSignatures)};
      const inlineHtmlPayload = ${JSON.stringify(inlineHtml || '')};
      const frameSrcPayload = ${JSON.stringify(frameSrc)};
      const nodeId = ${JSON.stringify(doc.id)};
      const existingSignatures = ${JSON.stringify(existingSignatures)};
      const docName = ${JSON.stringify(sourceName)};
      const sigLayer = document.getElementById('sigLayer');
      const docFrame = document.getElementById('docFrame');
      const addBtn = document.getElementById('btnAddSignature');
      const clearBtn = document.getElementById('btnClearSignatures');
      const sigDialog = document.getElementById('signatureDialog');
      const sigSignerName = document.getElementById('sigSignerName');
      const sigSignerRole = document.getElementById('sigSignerRole');
      const btnSigCancel = document.getElementById('btnSigCancel');
      const btnSigClear = document.getElementById('btnSigClear');
      const btnSigSave = document.getElementById('btnSigSave');
      const canvas = document.getElementById('signatureCanvas');
      const ctx = canvas.getContext('2d');

      if (docFrame) {
        if (inlineHtmlPayload) {
          docFrame.setAttribute('srcdoc', inlineHtmlPayload);
        } else if (frameSrcPayload) {
          docFrame.setAttribute('src', frameSrcPayload);
        }
      }

      sigSignerName.value = defaultSigner;
      sigSignerRole.value = defaultRole;

      let isDrawing = false;
      let hasStroke = false;

      function getPoint(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        return { x, y };
      }

      function clearCanvas() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        hasStroke = false;
      }

      function beginDraw(e) {
        e.preventDefault();
        const p = getPoint(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        isDrawing = true;
      }

      function drawMove(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const p = getPoint(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        hasStroke = true;
      }

      function endDraw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        isDrawing = false;
      }

      canvas.addEventListener('pointerdown', beginDraw);
      canvas.addEventListener('pointermove', drawMove);
      canvas.addEventListener('pointerup', endDraw);
      canvas.addEventListener('pointerleave', endDraw);
      canvas.addEventListener('pointercancel', endDraw);

      clearCanvas();

      function addSignatureStamp(payload) {
        const stamp = document.createElement('div');
        stamp.className = 'sig-stamp';
        if (payload.id) stamp.dataset.signatureId = payload.id;

        const timestamp = payload.createdAt || new Date().toLocaleString('es-MX');
        const signer = (payload.signerName || defaultSigner || 'Firma').trim();
        const role = (payload.signerRole || '').trim();

        stamp.innerHTML =
          '<div style="margin-bottom:4px;">FIRMADO</div>' +
          '<img src="' + payload.signatureDataUrl + '" style="display:block;max-width:210px;max-height:78px;object-fit:contain;margin-bottom:4px;" />' +
          '<div>' + signer + (role ? ' · ' + role : '') + '</div>' +
          '<div style="font-size:11px;opacity:.9;">' + timestamp + '</div>' +
          '<div style="font-size:11px;opacity:.9;">' + docName + '</div>';

        const x = Number.isFinite(Number(payload.posXPercent)) ? Number(payload.posXPercent) : 76;
        const y = Number.isFinite(Number(payload.posYPercent)) ? Number(payload.posYPercent) : 78;
        stamp.style.left = x + '%';
        stamp.style.top = y + '%';
        stamp.style.right = 'auto';
        stamp.style.bottom = 'auto';
        stamp.style.transform = 'translate(-50%, -50%) rotate(' + (-7 + Math.floor(Math.random() * 5)) + 'deg)';

        sigLayer.appendChild(stamp);
      }

      function openSignatureDialog() {
        sigDialog.classList.add('open');
        clearCanvas();
      }

      function closeSignatureDialog() {
        sigDialog.classList.remove('open');
      }

      existingSignatures.forEach(sig => {
        addSignatureStamp({
          id: sig.id,
          signerName: sig.signer_name,
          signerRole: sig.signer_role || '',
          signatureDataUrl: sig.signature_data_url,
          posXPercent: sig.pos_x_percent,
          posYPercent: sig.pos_y_percent,
          createdAt: new Date(sig.created_at).toLocaleString('es-MX'),
        });
      });

      if (allowSignatures && addBtn) {
        addBtn.addEventListener('click', function () {
          openSignatureDialog();
        });
      }

      btnSigCancel.addEventListener('click', closeSignatureDialog);

      btnSigClear.addEventListener('click', function () {
        clearCanvas();
      });

      btnSigSave.addEventListener('click', async function () {
        if (!allowSignatures) {
          window.alert('Tu usuario no tiene permiso para firmar documentos.');
          return;
        }
        const signerName = (sigSignerName.value || defaultSigner).trim() || defaultSigner;
        const signerRole = (sigSignerRole.value || defaultRole).trim();

        if (!hasStroke) {
          window.alert('Traza tu firma en el recuadro antes de guardar.');
          return;
        }

        const signatureDataUrl = canvas.toDataURL('image/png');
        const posXPercent = 76;
        const posYPercent = 78;

        try {
          const signatureId = await window.opener.repo.call(
            'DocumentoTreeRepo',
            'addSignature',
            nodeId,
            signerName,
            signerRole,
            signatureDataUrl,
            posXPercent,
            posYPercent,
            actorUserId,
            defaultRole
          );

          addSignatureStamp({
            id: signatureId,
            signerName,
            signerRole,
            signatureDataUrl,
            posXPercent,
            posYPercent,
            createdAt: new Date().toLocaleString('es-MX'),
          });

          closeSignatureDialog();
        } catch (err) {
          console.error(err);
          window.alert('No se pudo guardar la firma en la base de datos.');
        }
      });

      if (allowSignatures && clearBtn) {
        clearBtn.addEventListener('click', async function () {
          if (!window.confirm('¿Eliminar todas las firmas guardadas de este documento?')) return;
          try {
            await window.opener.repo.call('DocumentoTreeRepo', 'clearSignatures', nodeId, actorUserId, defaultRole);
            sigLayer.innerHTML = '';
          } catch (err) {
            console.error(err);
            window.alert('No se pudieron eliminar las firmas de este documento.');
          }
        });
      }
    })();
  </script>
</body>
</html>`;

    popup.document.open();
    popup.document.write(popupHtml);
    popup.document.close();

    const cleanup = window.setInterval(async () => {
      if (!popup.closed) return;
      window.clearInterval(cleanup);
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      activePreviewWindowsRef.current = Math.max(0, activePreviewWindowsRef.current - 1);
      if (activePreviewWindowsRef.current === 0) {
        await setContentProtection(false);
      }
    }, 700);
  };

  const viewDocumentFile = async (doc: DocNode) => {
    let objectUrlToRevoke: string | undefined;
    let inlineHtml: string | undefined;
    let sourceUrl = doc.storageMode === 'disk'
      ? (doc.fileDiskPath ? toFileUri(doc.fileDiskPath) : '')
      : (doc.fileUrl || '');

    if (doc.storageMode === 'disk' && doc.fileDiskPath) {
      try {
        const rawBuffer = (window as any).electronAPI?.readFileAsBuffer
          ? await (window as any).electronAPI.readFileAsBuffer(doc.fileDiskPath)
          : null;

        if (!rawBuffer) {
          toast.error('No se pudo preparar el archivo local para visualización interna.');
          return;
        }

        const bytes = rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);
<<<<<<< HEAD
        const blob = new Blob([bytes], { type: doc.mimeType || 'application/octet-stream' });
=======
        const blob = new Blob([bytesToBlobPart(bytes)], { type: doc.mimeType || 'application/octet-stream' });
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
        const objectUrl = URL.createObjectURL(blob);
        objectUrlToRevoke = objectUrl;
        sourceUrl = objectUrl;
      } catch (err: any) {
        toast.error(err?.message || 'No se pudo abrir el archivo en el visor interno.');
        return;
      }
    }

    if (!sourceUrl) {
      toast.warning('Este documento no tiene archivo cargado todavía.');
      return;
    }

    const sourceName = (doc.fileName || doc.name || sourceUrl || '').toLowerCase();
    const ext = sourceName.split('.').pop()?.split('?')[0] || '';
    const mimeLower = String(doc.mimeType || '').toLowerCase();
    const isOfficeByExt = OFFICE_EXTENSIONS.includes(ext);
    const isOfficeByMime = OFFICE_MIME_HINTS.some(mime => mimeLower.includes(mime));
    const isOffice = isOfficeByExt || isOfficeByMime;
    if (isOffice) {
      try {
        const preview = await callTreeRepo('getOfficePreview', doc.id) as DocumentoOfficePreview;
        inlineHtml = preview.html;
      } catch (err: any) {
        toast.error(err?.message || 'No se pudo generar visualización interna del documento Office.');
        return;
      }
    }

    const isPublicUrl = /^https?:\/\//i.test(sourceUrl);

    const googleViewerUrl = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(sourceUrl)}`;
    const existingSignatures = await callTreeRepo('listSignatures', doc.id) as DocumentoFirmaRow[];
    await openPreviewInWindow(
      doc,
      isPublicUrl ? googleViewerUrl : sourceUrl,
      isPublicUrl,
      existingSignatures,
      objectUrlToRevoke,
      inlineHtml,
      documentPerms.can_sign_documents === 1
    );
  };

  const closePreview = async () => {
    setPreviewDoc(null);
    setPreviewUrl('');
    setPreviewWithGoogle(false);
    setPreviewMasked(false);
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }
    await setContentProtection(false);
  };

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

<<<<<<< HEAD
  const exportDocument = (doc: DocNode) => {
    const sourceUrl = doc.storageMode === 'disk'
      ? (doc.fileDiskPath ? toFileUri(doc.fileDiskPath) : '')
      : (doc.fileUrl || '');

    if (!sourceUrl) return;
=======
  const exportDocument = async (doc: DocNode) => {
    try {
      const payload = await callTreeRepo('getFileDownloadPayload', doc.id) as DocumentoDownloadPayload;
      const bytes = decodeBase64ToBytes(String(payload?.base64 || ''));
      if (!bytes.length) {
        throw new Error('El archivo no contiene datos descargables.');
      }

      const blob = new Blob([bytesToBlobPart(bytes)], { type: payload?.mimeType || doc.mimeType || 'application/octet-stream' });
      const fileName = payload?.fileName || doc.fileName || doc.name || doc.id;
      triggerBlobDownload(blob, fileName);
      return;
    } catch {
      // Fallback para compatibilidad temporal con rutas existentes.
    }

    const sourceUrl = doc.storageMode === 'disk'
      ? (doc.fileDiskPath ? toFileUri(doc.fileDiskPath) : '')
      : (doc.fileUrl || '');
    if (!sourceUrl) {
      toast.error('No se pudo preparar la descarga del documento.');
      return;
    }

>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
    const fileNameBase = (doc.fileName || doc.name || doc.id).replace(/\s+/g, '-');
    const anchor = document.createElement('a');
    anchor.href = sourceUrl;
    anchor.download = fileNameBase;
<<<<<<< HEAD

=======
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolderTree = (node: DocNode, level = 0): React.ReactNode => {
    const folderChildren = node.children.filter(child => child.type === 'folder');
    const expanded = expandedFolders.has(node.id);
    const canCreateFolder = !loadingPerms && documentPerms.can_add_documents === 1;

    return (
      <li key={node.id}>
        <div
          className={`doc-tree-item doc-tree-level-${Math.min(level, 8)}${currentFolderId === node.id ? ' doc-tree-item--active' : ''}${dropTargetFolderId === node.id ? ' doc-tree-item--drop-target' : ''}`}
          onDragOver={(e) => {
            if (documentPerms.can_move_documents !== 1) return;
            e.preventDefault();
            setDropTargetFolderId(node.id);
          }}
          onDragLeave={() => {
            if (dropTargetFolderId === node.id) setDropTargetFolderId(null);
          }}
          onDrop={(e) => {
            void handleInternalNodeDrop(e, node.id);
          }}
        >
          <button
            className="doc-tree-toggle"
            title={expanded ? 'Contraer' : 'Expandir'}
            onClick={() => toggleFolder(node.id)}
            disabled={folderChildren.length === 0}
          >
            {folderChildren.length === 0 ? '•' : (
              <DocUiIcon
                name={expanded ? 'arrowUp' : 'arrowRight'}
                className={`doc-tree-toggle-icon ${expanded ? 'doc-tree-toggle-icon--expanded' : ''}`}
              />
            )}
          </button>
          <button
            className="doc-tree-name"
            onClick={() => {
              navigateTo(node.id);
              setSelectedNodeId(node.id);
            }}
          >
            <span className="doc-tree-name-content">
              <DocUiIcon name="folder" className="doc-tree-node-icon" />
              <span>{node.name}</span>
            </span>
          </button>
          <button
            className="doc-tree-mini"
            title="Subcarpeta"
            aria-label="Crear subcarpeta"
            disabled={!canCreateFolder}
            onClick={() => openCreateFolderDialog(node.id)}
          >
            <DocUiIcon name="plus" className="doc-tree-mini-icon" />
          </button>
        </div>
        {expanded && folderChildren.length > 0 && (
          <ul className="doc-tree-list">
            {folderChildren.map(child => renderFolderTree(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  const openNode = (item: DocNode) => {
    if (item.type === 'folder') {
      navigateTo(item.id);
      return;
    }
    void viewDocumentFile(item);
  };

  const moveNodeToFolder = async (nodeId: string, targetFolderId: string) => {
    if (documentPerms.can_move_documents !== 1) {
      toast.warning('Tu usuario no tiene permiso para mover elementos.');
      return;
    }
    if (!nodeId || !targetFolderId || nodeId === targetFolderId) return;
    try {
      await callTreeRepo('moveNode', nodeId, targetFolderId);
      await refreshTree(targetFolderId);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo mover el elemento.');
    }
  };

  const openMoveDialog = (nodeId: string) => {
    if (documentPerms.can_move_documents !== 1) {
      toast.warning('Tu usuario no tiene permiso para mover elementos.');
      return;
    }
    if (!nodeId || nodeId === 'root') return;
    setMoveNodeId(nodeId);
    setMoveTargetId(currentFolder.id);
    setMoveDialogOpen(true);
  };

  const submitMoveNode = async () => {
    if (documentPerms.can_move_documents !== 1) {
      toast.warning('Tu usuario no tiene permiso para mover elementos.');
      return;
    }
    if (!moveNodeId || !moveTargetId) return;
    try {
      await moveNodeToFolder(moveNodeId, moveTargetId);
      setMoveDialogOpen(false);
      setMoveNodeId(null);
      setMoveTargetId('');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo mover el elemento.');
    }
  };

  const handleInternalNodeDrop = async (event: React.DragEvent, targetFolderId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0) {
      setDropTargetFolderId(null);
      setDragActive(false);
      await uploadFilesToFolder(targetFolderId, files);
      return;
    }

    const draggedNodeId = event.dataTransfer.getData('application/x-sgc-node-id') || dragNodeId;
    if (!draggedNodeId) {
      setDropTargetFolderId(null);
      return;
    }

    setDropTargetFolderId(null);
    setDragNodeId(null);
    await moveNodeToFolder(draggedNodeId, targetFolderId);
  };

  /* ============ RENDER ============ */
  return (
    <div className="mod-documentacion">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden-file-input"
        multiple
        aria-label="Seleccionar archivo de documento"
        title="Seleccionar archivo de documento"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Documentación</h2>
          <p className="mod-subtitle">Control documental, carpetas y trazabilidad</p>
        </div>
        <div className="doc-header-actions">
          <div className="doc-actions-secondary">
            <button
              className="doc-icon-btn"
              type="button"
              onClick={() => setShowAccessInfoDialog(true)}
              title="Ver puesto, usuario y permisos"
              aria-label="Ver información de acceso"
            >
              <DocUiIcon name="info" />
            </button>
            <button
              className="doc-icon-btn"
              type="button"
              onClick={() => void refreshTree(currentFolderId)}
              disabled={isLoadingTree}
              title="Actualizar árbol"
              aria-label="Actualizar"
            >
              <DocUiIcon name="refresh" />
            </button>
            <button
              className="doc-icon-btn"
              type="button"
              onClick={() => { void loadPendingReview(); setShowWorkflowPanel(true); }}
              title="Bandeja de revisión"
              aria-label="Bandeja de revisión"
            >
              <DocUiIcon name="workflow" />
              {pendingReview.length > 0 && <span className="doc-icon-btn-badge">{pendingReview.length}</span>}
            </button>
            <button
              className="doc-icon-btn"
              type="button"
              onClick={() => { void loadTrash(); setShowTrashDialog(true); }}
              disabled={loadingPerms || documentPerms.can_delete_documents !== 1}
              title={documentPerms.can_delete_documents === 1 ? 'Papelera' : 'Sin permiso para gestionar papelera'}
              aria-label="Papelera"
            >
              <DocUiIcon name="trash" />
              {trashItems.length > 0 && <span className="doc-icon-btn-badge">{trashItems.length}</span>}
            </button>
          </div>
          <div className="doc-actions-primary">
            <button
              className="btn btn-secondary"
              onClick={() => openCreateFolderDialog(currentFolder.id)}
              disabled={loadingPerms || documentPerms.can_add_documents !== 1}
              title={documentPerms.can_add_documents === 1 ? 'Crear carpeta' : 'Sin permiso para crear carpetas'}
            >
              <DocUiIcon name="plus" className="doc-inline-icon" />
              <span>Nueva carpeta</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => openUploadFor(currentFolder.id)}
              disabled={loadingPerms || documentPerms.can_add_documents !== 1}
              title={documentPerms.can_add_documents === 1 ? 'Subir documentos' : 'Sin permiso para subir documentos'}
            >
              <DocUiIcon name="upload" className="doc-inline-icon" />
              <span>Subir documentos</span>
            </button>
          </div>
        </div>
      </div>

      <div className="doc-overview-strip">
        <div className="doc-overview-card">
          <span className="doc-overview-label">Carpeta actual</span>
          <strong className="doc-overview-value">{currentFolder.name}</strong>
        </div>
        <div className="doc-overview-card">
          <span className="doc-overview-label">Carpetas visibles</span>
          <strong className="doc-overview-value">{currentFolderSummary.folders}</strong>
        </div>
        <div className="doc-overview-card">
          <span className="doc-overview-label">Archivos visibles</span>
          <strong className="doc-overview-value">{currentFolderSummary.files}</strong>
        </div>
        <div className="doc-overview-card">
          <span className="doc-overview-label">Seleccion</span>
          <strong className="doc-overview-value">{currentFolderSummary.selected}</strong>
        </div>
        <div className="doc-overview-card">
          <span className="doc-overview-label">Favoritos</span>
          <strong className="doc-overview-value">{currentFolderSummary.favorites}</strong>
        </div>
      </div>

      {showAccessInfoDialog && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Información de acceso a Documentación">
          <div className="doc-dialog-card doc-dialog-card--access-info">
            <h4 className="doc-dialog-title">
              <DocUiIcon name="info" className="doc-inline-icon" />
              <span>Informacion de acceso</span>
            </h4>
            <div className="access-info-grid">
              <div className="access-info-item">
                <span className="access-info-label">Puesto</span>
                <strong className="access-info-value">{currentRole}</strong>
              </div>
              <div className="access-info-item">
                <span className="access-info-label">Usuario ID</span>
                <strong className="access-info-value">{currentUserId}</strong>
              </div>
            </div>

            <div className="access-info-perms">
              <span className="access-info-label">Permisos efectivos</span>
              {loadingPerms ? (
                <p className="access-info-loading">Cargando permisos...</p>
              ) : (
                <ul className="access-info-perm-list">
                  <li>Agregar documentos: <strong>{documentPerms.can_add_documents === 1 ? 'Sí' : 'No'}</strong></li>
                  <li>Eliminar documentos: <strong>{documentPerms.can_delete_documents === 1 ? 'Sí' : 'No'}</strong></li>
                  <li>Renombrar documentos: <strong>{documentPerms.can_rename_documents === 1 ? 'Sí' : 'No'}</strong></li>
                  <li>Mover documentos: <strong>{documentPerms.can_move_documents === 1 ? 'Sí' : 'No'}</strong></li>
                  <li>Firmar documentos: <strong>{documentPerms.can_sign_documents === 1 ? 'Sí' : 'No'}</strong></li>
                </ul>
              )}
            </div>

            <div className="doc-dialog-actions">
              <button className="btn btn-primary" onClick={() => setShowAccessInfoDialog(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      <div className="doc-layout">
        <aside className="doc-sidebar">
          <div className="doc-sidebar-title">Estructura</div>
          <ul className="doc-tree-list">{renderFolderTree(tree)}</ul>
        </aside>

        <section className="doc-main">
          <div className="doc-toolbar">
            <div className="doc-breadcrumbs">
              <button
                className="doc-nav-btn"
                title="Atrás  (Alt+←)"
                disabled={historyIndex <= 0}
                onClick={() => historyBack()}
              >
                <DocUiIcon name="arrowLeft" className="doc-inline-icon" />
              </button>
              <button
                className="doc-nav-btn"
                title="Adelante  (Alt+→)"
                disabled={historyIndex >= folderHistory.length - 1}
                onClick={() => historyForward()}
              >
                <DocUiIcon name="arrowRight" className="doc-inline-icon" />
              </button>
              <button
                className="doc-nav-btn"
                title="Subir nivel  (Alt+↑  o  Backspace)"
                disabled={currentFolderId === 'root'}
                onClick={() => goUp()}
              >
                <DocUiIcon name="arrowUp" className="doc-inline-icon" />
              </button>
              <span className="doc-crumb-sep doc-crumb-sep--dim">|</span>
              {pathToCurrent.map((node, idx) => (
                <React.Fragment key={node.id}>
                  {idx > 0 && <span className="doc-crumb-sep">/</span>}
                  <button className="doc-crumb" onClick={() => navigateTo(node.id)}>{node.name}</button>
                </React.Fragment>
              ))}
            </div>
            <div className="doc-toolbar-right">
              <input
                className="filter-input"
                placeholder="Buscar en esta carpeta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search.trim() && (
                <button className="btn btn-sm btn-secondary" onClick={() => setSearch('')}>Limpiar</button>
              )}
              <select
                className="filter-select"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                title="Ordenar elementos"
                aria-label="Ordenar elementos"
              >
                <option value="name-asc">Nombre A-Z</option>
                <option value="name-desc">Nombre Z-A</option>
                <option value="newest">Más nuevos</option>
                <option value="oldest">Más antiguos</option>
                <option value="type">Tipo (carpetas/archivos)</option>
              </select>
              <div className="doc-view-toggle" role="group" aria-label="Cambiar vista">
                <button
                  className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('grid')}
                >
                  Cuadrícula
                </button>
                <button
                  className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('list')}
                >
                  Lista
                </button>
              </div>
            </div>
          </div>

          {quickFavorites.length > 0 && (
            <div className="doc-quick-row">
              {quickFavorites.length > 0 && (
                <div className="doc-quick-block">
                  <span className="doc-quick-label">
                    <DocUiIcon name="starFilled" className="doc-inline-icon" filled />
                    <span>Favoritos</span>
                  </span>
                  <div className="doc-quick-items">
                    {quickFavorites.map(node => (
                      <button key={`fav-${node.id}`} className="doc-quick-chip" onClick={() => openNode(node)}>
                        <DocUiIcon name={node.type === 'folder' ? 'folder' : 'file'} className="doc-quick-chip-icon" />
                        <span>{node.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {treeError && <div className="doc-error">{treeError}</div>}

          <div
            ref={gridRef}
            className={`doc-grid ${viewMode === 'list' ? 'doc-grid--list' : ''} ${dragActive ? 'doc-grid--drag' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragActive(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const draggedNodeId = e.dataTransfer.getData('application/x-sgc-node-id') || dragNodeId;
              if (draggedNodeId) {
                setDragNodeId(null);
                setDropTargetFolderId(null);
                void moveNodeToFolder(draggedNodeId, currentFolder.id);
                return;
              }
              const files = Array.from(e.dataTransfer.files || []);
              void uploadFilesToFolder(currentFolder.id, files);
            }}
          >
            {dragActive && <div className="doc-drop-hint">Suelta tus archivos aquí para cargarlos en esta carpeta</div>}
            {isLoadingTree && <div className="cell-empty">Cargando estructura...</div>}

            {!isLoadingTree && currentChildren.length === 0 && (
              <EmptyState icon="folder" title="Esta carpeta está vacía" description="Crea subcarpetas o sube documentos para comenzar." />
            )}

            {!isLoadingTree && currentChildren.length > 0 && currentChildren.map(item => (
              <article
                key={item.id}
                data-node-id={item.id}
                className={`doc-card${(selectedNodeIds.has(item.id) || selectedNodeId === item.id) ? ' doc-card--selected' : ''}${dropTargetFolderId === item.id && item.type === 'folder' ? ' doc-card--drop-target' : ''}`}
                draggable={item.id !== 'root' && documentPerms.can_move_documents === 1}
                onDragStart={(e) => {
                  setDragNodeId(item.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('application/x-sgc-node-id', item.id);
                }}
                onDragEnd={() => {
                  setDragNodeId(null);
                  setDropTargetFolderId(null);
                }}
                onClick={(e) => {
                  /* Clic izquierdo: solo selecciona */
                  e.stopPropagation();
                  setSelectedNodeId(item.id);
                  setActionMenuNodeId(null);
                  setCtxMenuPos(null);
                }}
                onDoubleClick={(e) => {
                  /* Doble clic: abre carpeta o documento */
                  e.stopPropagation();
                  setActionMenuNodeId(null);
                  setCtxMenuPos(null);
                  openNode(item);
                }}
                onContextMenu={(e) => {
                  /* Clic derecho: abre menú de funciones estilo Windows 11 */
                  e.preventDefault();
                  e.stopPropagation();
                  (e.nativeEvent as Event).stopImmediatePropagation();
                  const menuW = 272; const menuH = 380;
                  const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
                  const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
                  setSelectedNodeId(item.id);
                  setActionMenuNodeId(item.id);
                  setCtxMenuPos({ x: Math.max(4, x), y: Math.max(4, y) });
                }}
                onDragOver={(e) => {
                  if (item.type !== 'folder') return;
                  e.preventDefault();
                  setDropTargetFolderId(item.id);
                }}
                onDragLeave={() => {
                  if (dropTargetFolderId === item.id) setDropTargetFolderId(null);
                }}
                onDrop={(e) => {
                  if (item.type !== 'folder') return;
                  void handleInternalNodeDrop(e, item.id);
                }}
              >
                <div className="doc-card-top">
                  <div className="doc-card-title">
                    <span className="doc-card-title-main">
                      <DocUiIcon name={item.type === 'folder' ? 'folder' : 'file'} className="doc-inline-icon" />
                      <span>{item.name}</span>
                    </span>
                    <span className="doc-card-type">{item.type === 'folder' ? 'Carpeta' : 'Documento'}</span>
                  </div>
                  <button
                    className={`btn-icon ${favoriteIds.has(item.id) ? 'doc-favorite-on' : ''}`}
                    title={favoriteIds.has(item.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                  >
                    <DocUiIcon
                      name={favoriteIds.has(item.id) ? 'starFilled' : 'star'}
                      className="doc-inline-icon"
                      filled={favoriteIds.has(item.id)}
                    />
                  </button>
                </div>
                <div className="doc-card-meta">
                  {item.type === 'folder'
                    ? `${item.children.length} elementos`
                    : `${item.mimeType || 'Documento'}${item.fileSizeBytes ? ` · ${formatBytes(item.fileSizeBytes)}` : ''}`}
                  {' · '}
                  {new Date(item.createdAt).toLocaleDateString('es-MX')}
                </div>
                {item.type === 'file' && workflowMap[item.id] && (
                  <div className="doc-card-wf-badge">
                    <span className={`wf-badge wf-badge--${workflowMap[item.id].status}`}>
                      {WF_STATUS_LABEL[workflowMap[item.id].status] || workflowMap[item.id].status}
                    </span>
                  </div>
                )}
                <div className="doc-card-hints">
                  <span className="doc-card-hint">Clic para acciones · Doble clic para abrir</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {nameDialogOpen && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Gestionar nombre">
          <div className="doc-dialog-card">
            <h4 className="doc-dialog-title">{nameDialogMode === 'create-folder' ? 'Nueva carpeta' : 'Renombrar elemento'}</h4>
            <input
              className="doc-dialog-input"
              value={nameDialogValue}
              onChange={e => setNameDialogValue(e.target.value)}
              placeholder={nameDialogMode === 'create-folder' ? 'Nombre de la carpeta' : 'Nuevo nombre'}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') submitNameDialog();
                if (e.key === 'Escape') setNameDialogOpen(false);
              }}
            />
            <div className="doc-dialog-actions">
              <button className="btn btn-secondary" onClick={() => setNameDialogOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => void submitNameDialog()} disabled={!nameDialogValue.trim()}>
                {nameDialogMode === 'create-folder' ? 'Crear carpeta' : 'Guardar nombre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {moveDialogOpen && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Mover elemento">
          <div className="doc-dialog-card">
            <h4 className="doc-dialog-title">Mover elemento</h4>
            <select
              className="doc-dialog-input"
              value={moveTargetId}
              onChange={e => setMoveTargetId(e.target.value)}
              aria-label="Carpeta destino"
              title="Carpeta destino"
            >
              <option value="">Selecciona carpeta destino...</option>
              {moveTargetOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <div className="doc-dialog-actions">
              <button className="btn btn-secondary" onClick={() => setMoveDialogOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => void submitMoveNode()} disabled={!moveTargetId || !moveNodeId}>
                Mover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Menú contextual estilo Windows 11 ===== */}
      {(() => {
        if (!actionMenuNodeId || !ctxMenuPos) return null;
        const node = findNodeById(tree, actionMenuNodeId);
        if (!node) return null;
        const isFolder = node.type === 'folder';
        const isFav = favoriteIds.has(node.id);
        const closeMenu = () => { setActionMenuNodeId(null); setCtxMenuPos(null); };
        return (
          <div
            className="win11-ctx-menu"
            style={{ left: ctxMenuPos.x, top: ctxMenuPos.y }}
            role="menu"
            aria-label="Opciones de elemento"
            onClick={(e) => { e.stopPropagation(); (e.nativeEvent as Event).stopImmediatePropagation(); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            {/* Barra de iconos superior */}
            <div className="win11-ctx-toolbar" role="group" aria-label="Acciones rápidas">
              <button
                className="win11-ctx-tool"
                role="menuitem"
                title="Cambiar nombre"
                disabled={documentPerms.can_rename_documents !== 1}
                onClick={() => { openRenameDialog(node.id); closeMenu(); }}
              >
                <span className="win11-ctx-tool-icon"><DocUiIcon name="edit" /></span>
                <span className="win11-ctx-tool-label">Cambiar{' '}nombre</span>
              </button>
              <div className="win11-ctx-tool-vsep" />
              <button
                className="win11-ctx-tool win11-ctx-tool--danger"
                role="menuitem"
                title="Eliminar"
                disabled={documentPerms.can_delete_documents !== 1}
                onClick={() => { deleteNode(node.id); closeMenu(); }}
              >
                <span className="win11-ctx-tool-icon"><DocUiIcon name="delete" /></span>
                <span className="win11-ctx-tool-label">Eliminar</span>
              </button>
            </div>

            <div className="win11-ctx-divider" />

            {/* Acciones primarias */}
            {isFolder ? (
              <>
                <button className="win11-ctx-item" role="menuitem"
                  onClick={() => { navigateTo(node.id); closeMenu(); }}
                >
                  <span className="win11-ctx-icon"><DocUiIcon name="open" /></span>
                  <span className="win11-ctx-label">Abrir</span>
                  <span className="win11-ctx-shortcut">Intro</span>
                </button>
                <button className="win11-ctx-item" role="menuitem"
                  onClick={() => { openCreateFolderDialog(node.id); closeMenu(); }}
                >
                  <span className="win11-ctx-icon"><DocUiIcon name="folder" /></span>
                  <span className="win11-ctx-label">Nueva subcarpeta</span>
                </button>
                {documentPerms.can_add_documents === 1 && (
                  <button className="win11-ctx-item" role="menuitem"
                    onClick={() => { openUploadFor(node.id); closeMenu(); }}
                  >
                    <span className="win11-ctx-icon"><DocUiIcon name="upload" /></span>
                    <span className="win11-ctx-label">Subir documento aquí</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="win11-ctx-item" role="menuitem"
                  onClick={() => { void viewDocumentFile(node); closeMenu(); }}
                >
                  <span className="win11-ctx-icon"><DocUiIcon name="open" /></span>
                  <span className="win11-ctx-label">Visualizar</span>
                  <span className="win11-ctx-shortcut">Intro</span>
                </button>
                <button className="win11-ctx-item" role="menuitem"
<<<<<<< HEAD
                  onClick={() => { exportDocument(node); closeMenu(); }}
=======
                  onClick={() => { void exportDocument(node); closeMenu(); }}
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
                >
                  <span className="win11-ctx-icon"><DocUiIcon name="download" /></span>
                  <span className="win11-ctx-label">Exportar / Descargar</span>
                </button>

                {/* ── Workflow actions ── */}
                <div className="win11-ctx-divider" />
                {(() => {
                  const wf = workflowMap[node.id];
                  const wfStatus = wf?.status;
                  const isCoordinadorSGC = currentRole.toLowerCase().includes('coordinador del sgc')
                    || currentRole.toLowerCase().includes('director')
                    || currentRole.toUpperCase() === 'ADMIN';
                  return (
                    <>
                      {/* Anyone can submit if borrador/correcciones or no workflow */}
                      {(!wfStatus || wfStatus === 'borrador' || wfStatus === 'correcciones') && (
                        <button className="win11-ctx-item" role="menuitem"
                          onClick={() => { void submitForReview(node.id, node.name); closeMenu(); }}
                        >
                          <span className="win11-ctx-icon"><DocUiIcon name="send" /></span>
                          <span className="win11-ctx-label">Enviar a revisión</span>
                        </button>
                      )}
                      {/* Coordinator can approve or request corrections when in revision */}
                      {wfStatus === 'revision' && isCoordinadorSGC && (
                        <>
                          <button className="win11-ctx-item" role="menuitem"
                            onClick={() => {
                              setWfApproveDialog({ workflowId: wf!.id, nodeId: node.id, nodeName: node.name });
                              setWfApproveTargetFolder('');
                              setWfApproveSendEmail(false);
                              setWfApproveDestinatarioIds([]);
                              closeMenu();
                            }}
                          >
                            <span className="win11-ctx-icon"><DocUiIcon name="approve" /></span>
                            <span className="win11-ctx-label">Aprobar documento</span>
                          </button>
                          <button className="win11-ctx-item" role="menuitem"
                            onClick={() => {
                              setWfCorrectionDialog({ workflowId: wf!.id, nodeId: node.id, nodeName: node.name });
                              setWfCorr({ queEstaMal: '', porQue: '', comoCorregir: '', observaciones: '', destinatarioIds: [] });
                              void loadCorrectionHistory(wf!.id);
                              closeMenu();
                            }}
                          >
                            <span className="win11-ctx-icon"><DocUiIcon name="correction" /></span>
                            <span className="win11-ctx-label">Solicitar correcciones</span>
                          </button>
                        </>
                      )}
                      {wfStatus && (
                        <div className="win11-ctx-item win11-ctx-item--info" style={{ cursor: 'default', opacity: 0.7 }}>
                          <span className="win11-ctx-icon"><DocUiIcon name="status" /></span>
                          <span className="win11-ctx-label">Estado: {WF_STATUS_LABEL[wfStatus] || wfStatus}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            <div className="win11-ctx-divider" />

            <button className="win11-ctx-item" role="menuitem"
              onClick={() => { toggleFavorite(node.id); closeMenu(); }}
            >
              <span className="win11-ctx-icon">
                <DocUiIcon name={isFav ? 'starFilled' : 'star'} filled={isFav} />
              </span>
              <span className="win11-ctx-label">{isFav ? 'Quitar de favoritos' : 'Anclar a favoritos'}</span>
            </button>

            <div className="win11-ctx-divider" />

            <button
              className="win11-ctx-item"
              role="menuitem"
              disabled={documentPerms.can_move_documents !== 1}
              title={documentPerms.can_move_documents !== 1 ? 'Sin permiso para mover' : undefined}
              onClick={() => { openMoveDialog(node.id); closeMenu(); }}
            >
              <span className="win11-ctx-icon"><DocUiIcon name="move" /></span>
              <span className="win11-ctx-label">Mover a...</span>
            </button>

            <div className="win11-ctx-divider" />

            <button className="win11-ctx-item" role="menuitem"
              onClick={() => {
                const path = findPath(tree, node.id).map(n => n.name).join(' > ');
                void navigator.clipboard.writeText(path);
                closeMenu();
              }}
            >
              <span className="win11-ctx-icon"><DocUiIcon name="copy" /></span>
              <span className="win11-ctx-label">Copiar ruta de acceso</span>
              <span className="win11-ctx-shortcut">Ctrl+Mayús+C</span>
            </button>

          </div>
        );
      })()}

      {previewDoc && (
        <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Vista protegida del documento">
          <div className="preview-card">
            <div className="preview-header">
              <div>
                <h4 className="preview-title">Visualización protegida</h4>
                <p className="preview-subtitle">
                  {previewDoc.fileName || previewDoc.name}
                  {previewWithGoogle ? ' · Google Viewer' : ' · Visor local'}
                </p>
                <div className="preview-chip-row">
                  <span className="preview-chip preview-chip--secure">
                    <DocUiIcon name="shield" className="preview-chip-icon" />
                    <span>Proteccion activa</span>
                  </span>
                  <span className="preview-chip">
                    <DocUiIcon name="user" className="preview-chip-icon" />
                    <span>{currentUserName}</span>
                  </span>
                  <span className="preview-chip">
                    <DocUiIcon name="role" className="preview-chip-icon" />
                    <span>{currentRole}</span>
                  </span>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => void closePreview()}>Cerrar</button>
            </div>
            <div
              className="preview-body"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <div className={`preview-watermark-layer ${watermarkPhaseClass}`} aria-hidden="true">
                {watermarkTiles.map((tileIndex) => (
                  <span
                    key={`wm-${tileIndex}`}
                    className={`preview-watermark-tile preview-watermark-tile--${tileIndex}`}
                  >
                    {watermarkText}
                  </span>
                ))}
              </div>
              <iframe
                title="Vista previa del documento"
                src={previewUrl || previewDoc.fileUrl || (previewDoc.fileDiskPath ? toFileUri(previewDoc.fileDiskPath) : '')}
                className="preview-iframe"
              />
              {previewMasked && (
                <div className="preview-mask">
                  <p>Contenido protegido. Vuelve a la ventana para continuar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTrashDialog && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Papelera de documentos">
          <div className="doc-dialog-card" style={{ maxWidth: 860, minHeight: 340 }}>
            <h4 className="doc-dialog-title">
              <DocUiIcon name="trash" className="doc-inline-icon" />
              <span>Papelera de Documentacion</span>
            </h4>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Los elementos eliminados se conservan por 30 días antes de borrarse definitivamente.
            </p>

            {loadingTrash ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', paddingTop: 24 }}>Cargando papelera...</p>
            ) : trashItems.length === 0 ? (
              <EmptyState icon="trash" title="La papelera está vacía" description="Los elementos eliminados aparecerán aquí por 30 días." />
            ) : (
              <div style={{ maxHeight: 340, overflow: 'auto' }}>
                <table className="mod-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Elemento</th>
                      <th>Eliminado por</th>
                      <th>Fecha eliminación</th>
                      <th>Expira</th>
                      <th>Días restantes</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trashItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span className="doc-table-node">
                            <DocUiIcon name={item.root_node_type === 'folder' ? 'folder' : 'file'} className="doc-inline-icon" />
                            <span>{item.root_node_name || item.root_node_id}</span>
                          </span>
                        </td>
                        <td>{item.deleted_by_name || 'Sistema'} {item.deleted_by_role ? `(${item.deleted_by_role})` : ''}</td>
                        <td>{new Date(item.deleted_at).toLocaleString('es-MX')}</td>
                        <td>{new Date(item.expires_at).toLocaleString('es-MX')}</td>
                        <td>{Math.max(0, Number(item.days_left || 0))}</td>
                        <td style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-primary" onClick={() => void restoreTrashItem(item.id)}>
                            <DocUiIcon name="restore" className="doc-inline-icon" />
                            <span>Restaurar</span>
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => void deleteTrashItem(item.id)}>
                            <DocUiIcon name="delete" className="doc-inline-icon" />
                            <span>Borrar definitivo</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="doc-dialog-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowTrashDialog(false)}>Cerrar</button>
              <button className="btn btn-sm btn-secondary" onClick={() => void loadTrash()}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Workflow Panel (documentos pendientes de revisión) ===== */}
      {showWorkflowPanel && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Documentos en workflow">
          <div className="doc-dialog-card" style={{ maxWidth: 700, minHeight: 340 }}>
            <h4 className="doc-dialog-title">
              <DocUiIcon name="workflow" className="doc-inline-icon" />
              <span>Bandeja de Revision de Documentos</span>
            </h4>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Documentos enviados a revisión por los usuarios. Solo la Coordinadora SGC, Director o Admin pueden aprobar o solicitar correcciones.
            </p>
            {pendingReview.length === 0 ? (
              <EmptyState icon="checkCircle" title="Sin documentos pendientes" description="Todos los documentos están al día." />
            ) : (
              <div style={{ maxHeight: 320, overflow: 'auto' }}>
                <table className="mod-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Enviado por</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReview.map(wf => (
                      <tr key={wf.id}>
                        <td>{wf.node_name || wf.node_id}</td>
                        <td>{wf.submitted_by_name || '—'}</td>
                        <td>{new Date(wf.created_at).toLocaleString('es-MX')}</td>
                        <td style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => {
                            void openNodeByIdFromExternal(wf.node_id, true);
                            setShowWorkflowPanel(false);
                          }}>
                            <DocUiIcon name="open" className="doc-inline-icon" />
                            <span>Abrir</span>
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => {
                            setWfApproveDialog({ workflowId: wf.id, nodeId: wf.node_id, nodeName: wf.node_name || '' });
                            setWfApproveTargetFolder('');
                            setWfApproveSendEmail(false);
                            setWfApproveDestinatarioIds([]);
                            setShowWorkflowPanel(false);
                          }}>
                            <DocUiIcon name="approve" className="doc-inline-icon" />
                            <span>Aprobar</span>
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => {
                            setWfCorrectionDialog({ workflowId: wf.id, nodeId: wf.node_id, nodeName: wf.node_name || '' });
                            setWfCorr({ queEstaMal: '', porQue: '', comoCorregir: '', observaciones: '', destinatarioIds: [] });
                            void loadCorrectionHistory(wf.id);
                            setShowWorkflowPanel(false);
                          }}>
                            <DocUiIcon name="correction" className="doc-inline-icon" />
                            <span>Corregir</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="doc-dialog-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowWorkflowPanel(false)}>Cerrar</button>
              <button className="btn btn-sm btn-secondary" onClick={() => void loadPendingReview()}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Aprobar documento dialog ===== */}
      {wfApproveDialog && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Aprobar documento">
          <div className="doc-dialog-card" style={{ maxWidth: 500 }}>
            <h4 className="doc-dialog-title">
              <DocUiIcon name="approve" className="doc-inline-icon" />
              <span>Aprobar documento</span>
            </h4>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>{wfApproveDialog.nodeName}</strong>
            </p>
            <label className="form-group" style={{ marginBottom: 12 }}>
              <span>Carpeta destino (opcional: mover al aprobar)</span>
              <select
                className="doc-dialog-input"
                value={wfApproveTargetFolder}
                onChange={(e) => setWfApproveTargetFolder(e.target.value)}
              >
                <option value="">Dejar en su ubicación actual</option>
                {moveTargetOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="permission-toggle" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={wfApproveSendEmail}
                onChange={e => setWfApproveSendEmail(e.target.checked)}
              />
              <span>Enviar correo al solicitante (automático) y destinatarios adicionales</span>
            </label>
            {wfApproveSendEmail && (
              <label className="form-group" style={{ marginBottom: 12 }}>
                <span>Destinatarios adicionales (opcional, selección múltiple)</span>
                <select
                  className="doc-dialog-input"
                  multiple
                  size={5}
                  value={wfApproveDestinatarioIds}
                  onChange={e => setWfApproveDestinatarioIds(Array.from(e.target.selectedOptions).map(o => o.value))}
                >
                  {allUsuarios
                    .filter(u => Number((u as any).activo ?? 1) === 1)
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                    ))}
                </select>
              </label>
            )}
            <div className="doc-dialog-actions">
              <button className="btn btn-secondary" onClick={() => setWfApproveDialog(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => void approveWorkflow()}>
                <DocUiIcon name="approve" className="doc-inline-icon" />
                <span>Confirmar aprobacion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Solicitar correcciones dialog ===== */}
      {wfCorrectionDialog && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Solicitar correcciones">
          <div className="doc-dialog-card doc-dialog-card--correction">
            <div className="wf-corr-header">
              <h4 className="doc-dialog-title">
                <DocUiIcon name="correction" className="doc-inline-icon" />
                <span>Solicitar correcciones</span>
              </h4>
              <p className="wf-corr-doc-name" title={wfCorrectionDialog.nodeName}>
                Documento: <strong>{wfCorrectionDialog.nodeName}</strong>
              </p>
            </div>

            <div className="wf-corr-grid">
              <label className="form-group wf-corr-field">
                <span>¿Qué está mal? *</span>
                <textarea
                  className="doc-dialog-input wf-corr-textarea"
                  rows={3}
                  value={wfCorr.queEstaMal}
                  onChange={e => setWfCorr(prev => ({ ...prev, queEstaMal: e.target.value }))}
                  placeholder="Describe el problema encontrado..."
                />
              </label>
              <label className="form-group wf-corr-field">
                <span>¿Por qué está mal?</span>
                <textarea
                  className="doc-dialog-input wf-corr-textarea"
                  rows={3}
                  value={wfCorr.porQue}
                  onChange={e => setWfCorr(prev => ({ ...prev, porQue: e.target.value }))}
                  placeholder="Razón o referencia normativa..."
                />
              </label>
              <label className="form-group wf-corr-field">
                <span>¿Cómo se debe corregir? *</span>
                <textarea
                  className="doc-dialog-input wf-corr-textarea"
                  rows={3}
                  value={wfCorr.comoCorregir}
                  onChange={e => setWfCorr(prev => ({ ...prev, comoCorregir: e.target.value }))}
                  placeholder="Instrucciones para la corrección..."
                />
              </label>
              <label className="form-group wf-corr-field">
                <span>Observaciones adicionales</span>
                <textarea
                  className="doc-dialog-input wf-corr-textarea"
                  rows={3}
                  value={wfCorr.observaciones}
                  onChange={e => setWfCorr(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Notas opcionales..."
                />
              </label>

              <label className="form-group wf-corr-field wf-corr-field--full">
                <span>Enviar correo a (destinatarios adicionales, opcional)</span>
                <select
                  className="doc-dialog-input wf-corr-recipient-select"
                  multiple
                  size={5}
                  value={wfCorr.destinatarioIds}
                  onChange={e => setWfCorr(prev => ({ ...prev, destinatarioIds: Array.from(e.target.selectedOptions).map(o => o.value) }))}
                >
                  {allUsuarios.filter(u => Number((u as any).activo ?? 1) === 1).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                  ))}
                </select>
                <small className="wf-corr-hint">
                  Se enviará correo automáticamente al usuario que envió el documento a revisión. Aquí puedes agregar destinatarios extra.
                </small>
              </label>
            </div>

            {wfCorrectionHistory.length > 0 && (
              <div className="wf-corr-history-wrap">
                <strong className="wf-corr-history-title">Historial de correcciones anteriores</strong>
                <div className="wf-corr-history-list">
                  {wfCorrectionHistory.map(c => (
                    <div key={c.id} className="wf-corr-history-item">
                      <div><strong>{c.reviewer_name}</strong> — {new Date(c.created_at).toLocaleString('es-MX')}</div>
                      <div>Problema: {c.que_esta_mal}</div>
                      <div>Cómo corregir: {c.como_corregir}</div>
                      {c.destinatario_name && <div>Enviado a: {c.destinatario_name}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="doc-dialog-actions wf-corr-actions">
              <button className="btn btn-secondary" onClick={() => setWfCorrectionDialog(null)}>Cancelar</button>
              <button
                className="btn btn-danger"
                onClick={() => void requestCorrection()}
                disabled={!wfCorr.queEstaMal.trim() || !wfCorr.comoCorregir.trim()}
              >
                <DocUiIcon name="correction" className="doc-inline-icon" />
                <span>Enviar correcciones</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documentacion;
