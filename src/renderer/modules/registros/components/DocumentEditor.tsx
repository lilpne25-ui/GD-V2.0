import React from 'react';
import type { DocSaveFormat, FolderOption, Registro } from '../types';

type DocumentEditorProps = {
  selected: Registro;
  docxInputRef: React.RefObject<HTMLInputElement>;
  onOpenWord: () => void;
  onImportDocx: () => void;
  onExportDocx: () => void;
  onDocxFilePicked: (event: React.ChangeEvent<HTMLInputElement>) => void;
  getWordCount: (html: string) => number;
  lastLocalSaveAt: string;
  lastSavedToDocumentacionAt: string | null;
  onOpenSaveDialog: () => void;
  saveDialogOpen: boolean;
  onCloseSaveDialog: () => void;
  folderOptions: FolderOption[];
  targetFolderId: string;
  onTargetFolderChange: (folderId: string) => void;
  saveFormat: DocSaveFormat;
  onSaveFormatChange: (format: DocSaveFormat) => void;
  isSaving: boolean;
  onConfirmSaveToDocumentacion: () => void;
};

const extractPreview = (html: string): string => {
  const plain = (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) return 'Sin contenido aún. Haz clic en “Editar en Word Studio” para comenzar.';
  return plain.length > 420 ? `${plain.slice(0, 420)}…` : plain;
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  selected,
  docxInputRef,
  onOpenWord,
  onImportDocx,
  onExportDocx,
  onDocxFilePicked,
  getWordCount,
  lastLocalSaveAt,
  lastSavedToDocumentacionAt,
  onOpenSaveDialog,
  saveDialogOpen,
  onCloseSaveDialog,
  folderOptions,
  targetFolderId,
  onTargetFolderChange,
  saveFormat,
  onSaveFormatChange,
  isSaving,
  onConfirmSaveToDocumentacion,
}) => {
  const preview = extractPreview(selected.contenidoHtml || '');
  const words = getWordCount(selected.contenidoHtml || '');

  return (
    <>
      <div className="reg-doc-hub">
        <div className="reg-doc-cover">
          <h3 className="reg-doc-cover__title">{selected.nombre || 'Documento sin título'}</h3>
          <p className="reg-doc-cover__subtitle">Gestión central del documento: edición en Word Studio, importación/exportación y publicación en Documentación.</p>
          <div className="reg-doc-cover__chips">
            <span className="reg-doc-chip">📄 Tipo Word</span>
            <span className="reg-doc-chip">🔤 {words} palabras</span>
            <span className="reg-doc-chip">🕒 Editado {new Date(selected.updatedAt).toLocaleString('es-MX')}</span>
            {lastSavedToDocumentacionAt && (
              <span className="reg-doc-chip reg-doc-chip--ok">✅ Publicado {new Date(lastSavedToDocumentacionAt).toLocaleString('es-MX')}</span>
            )}
          </div>
        </div>

        <div className="reg-doc-hub__actions">
          <button className="btn btn-primary" onClick={onOpenWord}>📝 Editar en Word Studio</button>
          <button className="btn btn-secondary" onClick={onOpenSaveDialog}>💾 Guardar en Documentación</button>
          <button className="btn btn-secondary" onClick={onImportDocx}>Importar DOCX</button>
          <button className="btn btn-secondary" onClick={onExportDocx}>Exportar DOCX</button>
        </div>

        <input
          ref={docxInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="reg-hidden-input"
          title="Seleccionar archivo DOCX"
          aria-label="Seleccionar archivo DOCX"
          onChange={onDocxFilePicked}
        />

        <div className="reg-doc-preview">
          <div className="reg-doc-preview__label">Vista previa rápida</div>
          <p className="reg-doc-preview__text">{preview}</p>
          <div className="reg-doc-timeline">
            <div className="reg-doc-timeline__item">
              <span className="reg-doc-timeline__dot" />
              <span>Último guardado local: {new Date(lastLocalSaveAt).toLocaleString('es-MX')}</span>
            </div>
            <div className="reg-doc-timeline__item">
              <span className="reg-doc-timeline__dot" />
              <span>Última edición de contenido: {new Date(selected.updatedAt).toLocaleString('es-MX')}</span>
            </div>
            <div className="reg-doc-timeline__item">
              <span className="reg-doc-timeline__dot" />
              <span>Estado publicación: {lastSavedToDocumentacionAt ? 'Publicado en Documentación' : 'Pendiente de publicar'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="reg-statusbar">
        <span>Modo documento (Word Studio)</span>
        <span>Palabras: {words}</span>
        <span>Última actualización: {new Date(selected.updatedAt).toLocaleString('es-MX')}</span>
      </div>

      {saveDialogOpen && (
        <div className="doc-dialog-overlay" role="dialog" aria-modal="true" aria-label="Guardar en Documentación">
          <div className="doc-dialog-card">
            <h4 className="doc-dialog-title">Guardar en Documentación</h4>

            <label className="doc-dialog-label">Carpeta destino</label>
            <select
              className="doc-dialog-input"
              value={targetFolderId}
              onChange={e => onTargetFolderChange(e.target.value)}
              title="Carpeta destino"
              aria-label="Carpeta destino"
            >
              {folderOptions.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.label}</option>
              ))}
            </select>

            <label className="doc-dialog-label">Formato de guardado</label>
            <select
              className="doc-dialog-input"
              value={saveFormat}
              onChange={e => onSaveFormatChange(e.target.value as DocSaveFormat)}
              title="Formato"
              aria-label="Formato"
            >
              <option value="docx">DOCX (recomendado)</option>
              <option value="html">HTML</option>
            </select>

            <div className="doc-dialog-actions">
              <button className="btn btn-secondary" onClick={onCloseSaveDialog} disabled={isSaving}>Cancelar</button>
              <button className="btn btn-primary" onClick={onConfirmSaveToDocumentacion} disabled={isSaving || !targetFolderId}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentEditor;
