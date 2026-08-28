<<<<<<< HEAD
import React, { useCallback, useRef, useState } from 'react';
=======
import React, { useCallback, useMemo, useRef, useState } from 'react';
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
import './Registros.css';
import { toast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import type { RegistrosMainTab, RegistroTemplate, RegistroTipo, WfCorreccion, WfDocItem } from './types';
import { TEMPLATE_OPTIONS } from './constants';
import WorkflowPanel from './components/WorkflowPanel';
import { openWordStudioPopup } from './wordStudioPopup';
import SheetEditor from './components/SheetEditor';
import DocumentEditor from './components/DocumentEditor';
<<<<<<< HEAD
=======
import DynamicRecordsPanel, { isDynamicRecordsFeatureEnabled } from './components/DynamicRecordsPanel';
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
import { useRegistrosStorage } from './hooks/useRegistrosStorage';
import { colToLabel, useSheetEngine } from './hooks/useSheetEngine';
import { useDocumentacionSave } from './hooks/useDocumentacionSave';

type DocxInteropModule = typeof import('./docxInterop');

let docxInteropModulePromise: Promise<DocxInteropModule> | null = null;
const loadDocxInterop = (): Promise<DocxInteropModule> => {
  if (!docxInteropModulePromise) {
    docxInteropModulePromise = import('./docxInterop');
  }
  return docxInteropModulePromise;
};

const Registros: React.FC = () => {
  const {
    selected,
    selectedId,
    setSelectedId,
    newRegistroName,
    setNewRegistroName,
    newRegistroTipo,
    setNewRegistroTipo,
    newRegistroTemplate,
    setNewRegistroTemplate,
    search,
    setSearch,
    filteredRegistros,
    lastSavedAt,
    updateSelected,
    createRegistro,
    duplicateRegistro,
    deleteRegistro,
  } = useRegistrosStorage();

  const {
    selectedCell,
    setSelectedCell,
    formulaBar,
    setFormulaBar,
    sheetZoom,
    setSheetZoom,
    zoomClass,
    currentCellRef,
    sheetStats,
    addHeader,
    insertHeaderAt,
    updateHeader,
    removeHeader,
    addRow,
    insertRowAt,
    deleteRow,
    updateCell,
    pasteMatrix,
    getCellDisplay,
    applyFormulaBar,
    insertFormulaSnippet,
    moveSelection,
  } = useSheetEngine(selected, updateSelected);

  const {
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
  } = useDocumentacionSave();

  const docxInputRef = useRef<HTMLInputElement | null>(null);
<<<<<<< HEAD
=======
  const dynamicRecordsEnabled = useMemo(() => isDynamicRecordsFeatureEnabled(), []);
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6

  const [regMainTab, setRegMainTab] = useState<RegistrosMainTab>('studio');
  const [wfDocs, setWfDocs] = useState<WfDocItem[]>([]);
  const [wfSelectedDoc, setWfSelectedDoc] = useState<WfDocItem | null>(null);
  const [wfCorrections, setWfCorrections] = useState<WfCorreccion[]>([]);
  const [wfFilterStatus, setWfFilterStatus] = useState('');

  const loadWfDocs = useCallback(async () => {
    try {
      const rawUser = localStorage.getItem('sgc.currentUser');
      const userId = rawUser ? JSON.parse(rawUser).id : 'dev-user';
      const items = await (window as any).repo.call('WorkflowRepo', 'listByUser', userId, 200) as WfDocItem[];
      setWfDocs(items || []);
    } catch {
      // ignore
    }
  }, []);

  const loadWfDocCorrections = async (wfId: string) => {
    try {
      const cc = await (window as any).repo.call('WorkflowRepo', 'getCorrections', wfId) as WfCorreccion[];
      setWfCorrections(cc || []);
    } catch {
      setWfCorrections([]);
    }
  };

  const selectWfDoc = (item: WfDocItem) => {
    setWfSelectedDoc(item);
    void loadWfDocCorrections(item.id);
  };

  const resubmitForReview = async (wfId: string) => {
    try {
      await (window as any).repo.call('WorkflowRepo', 'submitForReview', wfId);
      const rawUser = localStorage.getItem('sgc.currentUser');
      const userName = rawUser ? JSON.parse(rawUser).nombre : 'Usuario';
      await (window as any).repo.call('NotificacionRepo', 'createForRole', {
        rol: 'coordinador del sgc',
        tipo: 'workflow',
        titulo: 'Documento reenviado a revisión',
        mensaje: `${userName} reenvió un documento corregido a revisión.`,
        referenciaId: wfId,
        referenciaTipo: 'workflow',
      });
      void loadWfDocs();
      setWfSelectedDoc(null);
    } catch {
      // ignore
    }
  };

  const filteredWfDocs = wfDocs.filter(w => !wfFilterStatus || w.status === wfFilterStatus);

  const createAndFocusRegistro = () => {
    createRegistro();
    setSelectedCell({ row: 0, col: 0 });
  };

  const exportCsv = () => {
    if (!selected || selected.tipo !== 'hoja') return;

    const esc = (value: string) => `"${(value || '').replace(/"/g, '""')}"`;
    const headerLine = selected.encabezados.map(esc).join(',');
    const rowLines = selected.filas.map(row => row.map(esc).join(','));
    const csv = [headerLine, ...rowLines].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.nombre.replace(/\s+/g, '_').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportDocx = async () => {
    if (!selected || selected.tipo !== 'documento') return;
    try {
      const { exportHtmlAsDocx } = await loadDocxInterop();
      await exportHtmlAsDocx(selected.contenidoHtml || '<p></p>', selected.nombre || 'documento');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar el archivo DOCX.';
      toast.error(message);
    }
  };

  const triggerDocxImport = () => {
    if (!selected || selected.tipo !== 'documento') return;
    docxInputRef.current?.click();
  };

  const onDocxFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected || selected.tipo !== 'documento') return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const isDocx = file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!isDocx) {
      toast.warning('Selecciona un archivo .docx válido.');
      return;
    }

    try {
      const { importDocxAsHtml } = await loadDocxInterop();
      const html = await importDocxAsHtml(file);
      updateSelected(r => ({ ...r, contenidoHtml: html }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo importar el archivo DOCX.';
      toast.error(message);
    }
  };

  const openWordPopup = () => {
    if (!selected || selected.tipo !== 'documento') return;
    openWordStudioPopup({
      registroId: selected.id,
      nombre: selected.nombre,
      contenidoHtml: selected.contenidoHtml,
      defaultHtml: '<h2>Documento nuevo</h2><p>Escribe aquí como en Word: formato, listas, títulos, etc.</p>',
      onSync: (html: string) => {
        updateSelected(r => ({ ...r, contenidoHtml: html }));
      },
    });
  };

  const getWordCount = (html: string): number => {
    const plain = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plain) return 0;
    return plain.split(' ').length;
  };

  return (
    <div className="mod-registros">
      <div className="mod-header">
        <div>
          <h2 className="mod-title">Registros Studio</h2>
          <p className="mod-subtitle">Modo hoja de cálculo con fórmulas y documentos en Word Studio con publicación a Documentación.</p>
        </div>
      </div>

      <div className="mod-tabs reg-main-tabs">
        <button className={`mod-tab ${regMainTab === 'studio' ? 'active' : ''}`} onClick={() => setRegMainTab('studio')}>
          📊 Registros Studio
        </button>
        <button
          className={`mod-tab ${regMainTab === 'workflow' ? 'active' : ''}`}
          onClick={() => { setRegMainTab('workflow'); void loadWfDocs(); }}
        >
          📄 Mis documentos en revisión {wfDocs.filter(w => w.status === 'correcciones').length > 0 ? `(${wfDocs.filter(w => w.status === 'correcciones').length} pendientes)` : ''}
        </button>
<<<<<<< HEAD
=======
        {dynamicRecordsEnabled && (
          <button
            className={`mod-tab ${regMainTab === 'dynamic' ? 'active' : ''}`}
            onClick={() => setRegMainTab('dynamic')}
          >
            🧩 Registros Dinamicos (BETA)
          </button>
        )}
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
      </div>

      {regMainTab === 'workflow' && (
        <WorkflowPanel
          wfFilterStatus={wfFilterStatus}
          onFilterStatusChange={setWfFilterStatus}
          onRefresh={() => void loadWfDocs()}
          docs={filteredWfDocs}
          selectedDoc={wfSelectedDoc}
          onSelectDoc={selectWfDoc}
          corrections={wfCorrections}
          onResubmit={(id) => void resubmitForReview(id)}
        />
      )}

<<<<<<< HEAD
=======
      {dynamicRecordsEnabled && regMainTab === 'dynamic' && (
        <DynamicRecordsPanel />
      )}

>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
      {regMainTab === 'studio' && (
        <div className="reg-layout">
          <aside className="reg-sidebar">
            <div className="reg-sidebar-actions reg-sidebar-actions--triple">
              <input
                className="filter-input"
                placeholder="Nombre del nuevo registro"
                value={newRegistroName}
                onChange={e => setNewRegistroName(e.target.value)}
              />
              <select
                className="filter-select"
                value={newRegistroTipo}
                onChange={e => setNewRegistroTipo(e.target.value as RegistroTipo)}
                title="Tipo de registro"
                aria-label="Tipo de registro"
              >
                <option value="hoja">Tipo Excel</option>
                <option value="documento">Tipo Word</option>
              </select>
              <select
                className="filter-select"
                value={newRegistroTemplate}
                onChange={e => setNewRegistroTemplate(e.target.value as RegistroTemplate)}
                title="Plantilla"
                aria-label="Plantilla"
              >
                {TEMPLATE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <button className="btn btn-primary" onClick={createAndFocusRegistro}>+ Crear</button>
            </div>

            <input
              className="filter-input"
              placeholder="Buscar registro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="reg-list">
              {filteredRegistros.map(r => (
                <button
                  key={r.id}
                  className={`reg-list-item${selectedId === r.id ? ' reg-list-item--active' : ''}`}
                  onClick={() => {
                    setSelectedId(r.id);
                    setSelectedCell({ row: 0, col: 0 });
                  }}
                >
                  <span className="reg-list-name">{r.nombre}</span>
                  <span className="reg-list-meta">
                    {r.tipo === 'hoja' ? '📊 Hoja' : '📝 Documento'} · {new Date(r.updatedAt).toLocaleDateString('es-MX')}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="reg-main">
            {!selected ? (
              <EmptyState icon="document" title="Selecciona un registro" description="Elige o crea un registro del panel lateral para comenzar." />
            ) : (
              <>
                <div className="reg-topbar">
                  <input
                    className="reg-title-input"
                    value={selected.nombre}
                    onChange={e => updateSelected(r => ({ ...r, nombre: e.target.value }))}
                    placeholder="Nombre del registro"
                  />
                  <div className="reg-topbar-actions">
                    <span className="reg-save-indicator" title="Guardado automático activo">
                      Guardado: {new Date(lastSavedAt).toLocaleTimeString('es-MX')}
                    </span>
                    <select
                      className="filter-select"
                      value={selected.tipo}
                      onChange={e => updateSelected(r => ({ ...r, tipo: e.target.value as RegistroTipo }))}
                      title="Tipo actual"
                      aria-label="Tipo actual"
                    >
                      <option value="hoja">Tipo Excel</option>
                      <option value="documento">Tipo Word</option>
                    </select>
                    <button className="btn btn-secondary" onClick={duplicateRegistro}>Duplicar</button>
                    <button className="btn btn-secondary" onClick={selected.tipo === 'hoja' ? exportCsv : () => void exportDocx()}>
                      {selected.tipo === 'hoja' ? 'Exportar CSV' : 'Exportar DOCX'}
                    </button>
                    <button className="btn btn-danger" onClick={deleteRegistro}>Eliminar</button>
                  </div>
                </div>

                {selected.tipo === 'hoja' ? (
                  <SheetEditor
                    selected={selected}
                    selectedCell={selectedCell}
                    formulaBar={formulaBar}
                    sheetZoom={sheetZoom}
                    zoomClass={zoomClass}
                    currentCellRef={currentCellRef}
                    sheetStats={sheetStats}
                    colToLabel={colToLabel}
                    setSheetZoom={setSheetZoom}
                    setFormulaBar={setFormulaBar}
                    setSelectedCell={setSelectedCell}
                    insertRowAt={insertRowAt}
                    insertHeaderAt={insertHeaderAt}
                    applyFormulaBar={applyFormulaBar}
                    insertFormulaSnippet={insertFormulaSnippet}
                    updateHeader={updateHeader}
                    removeHeader={removeHeader}
                    addHeader={addHeader}
                    addRow={addRow}
                    getCellDisplay={getCellDisplay}
                    updateCell={updateCell}
                    pasteMatrix={pasteMatrix}
                    moveSelection={moveSelection}
                    deleteRow={deleteRow}
                  />
                ) : (
                  <DocumentEditor
                    selected={selected}
                    docxInputRef={docxInputRef}
                    onOpenWord={openWordPopup}
                    onImportDocx={triggerDocxImport}
                    onExportDocx={() => void exportDocx()}
                    onDocxFilePicked={onDocxFilePicked}
                    getWordCount={getWordCount}
                    lastLocalSaveAt={lastSavedAt}
                    lastSavedToDocumentacionAt={lastSavedToDocumentacionAt}
                    onOpenSaveDialog={() => void openSaveDialog()}
                    saveDialogOpen={saveDialogOpen}
                    onCloseSaveDialog={() => setSaveDialogOpen(false)}
                    folderOptions={folderOptions}
                    targetFolderId={targetFolderId}
                    onTargetFolderChange={setTargetFolderId}
                    saveFormat={saveFormat}
                    onSaveFormatChange={setSaveFormat}
                    isSaving={isSaving}
                    onConfirmSaveToDocumentacion={() => void saveRegistroToDocumentacion(selected)}
                  />
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Registros;
