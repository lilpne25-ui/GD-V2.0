import { useState } from 'react';
import type { DocSaveFormat, FolderOption, Registro, RolUsuarioLike } from '../types';

type DocxInteropModule = typeof import('../docxInterop');

let docxInteropModulePromise: Promise<DocxInteropModule> | null = null;
const loadDocxInterop = (): Promise<DocxInteropModule> => {
  if (!docxInteropModulePromise) {
    docxInteropModulePromise = import('../docxInterop');
  }
  return docxInteropModulePromise;
};

type DocumentoNodoRow = {
  id: string;
  parent_id: string | null;
  name: string;
  node_type: 'folder' | 'file';
};

const getCurrentRole = (): RolUsuarioLike => {
  const currentRole = localStorage.getItem('sgc.currentRole');
  if (currentRole?.trim()) return currentRole.trim();

  const userRaw = localStorage.getItem('sgc.currentUser');
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw);
      if (typeof user?.rol === 'string' && user.rol.trim()) return user.rol.trim();
    } catch {
      // ignore
    }
  }

  return 'SIN_PUESTO';
};

const getCurrentUserId = (): string | undefined => {
  const userRaw = localStorage.getItem('sgc.currentUser');
  if (!userRaw) return undefined;
  try {
    const user = JSON.parse(userRaw);
    if (typeof user?.id === 'string' && user.id.trim()) return user.id.trim();
  } catch {
    // ignore
  }
  return undefined;
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('No se pudo convertir el contenido para guardarlo en Documentación.'));
  reader.readAsDataURL(blob);
});

const buildFolderOptions = (rows: DocumentoNodoRow[]): FolderOption[] => {
  const byId = new Map(rows.map(row => [row.id, row]));
  const folders = rows.filter(row => row.node_type === 'folder');

  const buildPath = (folderId: string): string => {
    const parts: string[] = [];
    let cursor: DocumentoNodoRow | undefined = byId.get(folderId);
    while (cursor) {
      parts.unshift(cursor.name);
      cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
    }
    return parts.join(' / ');
  };

  return folders
    .map(folder => ({ id: folder.id, label: buildPath(folder.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
};

export const useDocumentacionSave = () => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>([]);
  const [targetFolderId, setTargetFolderId] = useState('root');
  const [saveFormat, setSaveFormat] = useState<DocSaveFormat>('docx');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedToDocumentacionAt, setLastSavedToDocumentacionAt] = useState<string | null>(null);

  const openSaveDialog = async () => {
    try {
      const role = getCurrentRole();
      const rows = await (window as any).repo.call('DocumentoTreeRepo', 'getAll', role) as DocumentoNodoRow[];
      const options = buildFolderOptions(rows || []);
      setFolderOptions(options);
      setTargetFolderId(options[0]?.id || 'root');
      setSaveDialogOpen(true);
    } catch {
      window.alert('No se pudo cargar la estructura de carpetas de Documentación.');
    }
  };

  const saveRegistroToDocumentacion = async (registro: Registro | null): Promise<void> => {
    if (!registro || registro.tipo !== 'documento') return;
    if (!targetFolderId) {
      window.alert('Selecciona una carpeta destino.');
      return;
    }

    setIsSaving(true);
    try {
      const base = (registro.nombre || 'Documento').trim();
      const safeBase = base.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Documento';

      const blob = saveFormat === 'docx'
        ? await (await loadDocxInterop()).buildDocxBlob(registro.contenidoHtml || '<p></p>')
        : new Blob([registro.contenidoHtml || '<p></p>'], { type: 'text/html;charset=utf-8' });

      const fileExt = saveFormat === 'docx' ? 'docx' : 'html';
      const mime = saveFormat === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/html';
      const fileName = `${safeBase}.${fileExt}`;
      const dataUrl = await blobToDataUrl(blob);

      const userId = getCurrentUserId();
      const role = getCurrentRole();

      await (window as any).repo.call(
        'DocumentoTreeRepo',
        'createFile',
        targetFolderId,
        fileName,
        dataUrl,
        fileName,
        mime,
        userId,
        role
      );

      setLastSavedToDocumentacionAt(new Date().toISOString());
      setSaveDialogOpen(false);
      window.alert('Documento guardado en Documentación correctamente.');
    } catch (error: any) {
      window.alert(error?.message || 'No se pudo guardar el documento en Documentación.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveDialogOpen,
    setSaveDialogOpen,
    openSaveDialog,
    folderOptions,
    targetFolderId,
    setTargetFolderId,
    saveFormat,
    setSaveFormat,
    isSaving,
    lastSavedToDocumentacionAt,
    saveRegistroToDocumentacion,
  };
};
