import React, { useState, useEffect, useRef } from 'react';
import EmptyState from './EmptyState';
import './FileManager.css';

export type DocNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: DocNode[];
};

const initialTree: DocNode = {
  id: 'root',
  name: '4.Aprobado',
  type: 'folder',
  children: [
    { id: '1', name: '1. Manual del Sistema', type: 'folder', children: [
      { id: '1-1', name: 'FP-01 Gestión de Riesgos y Oportunidades', type: 'file' },
      { id: '1-2', name: 'FP-24 Auditoría Interna', type: 'file' },
    ]},
    { id: '2', name: '2. Ventas', type: 'folder', children: [
      { id: '2-1', name: 'FP-07 Proceso de Ventas', type: 'file' },
    ]},
    { id: '3', name: '3. Ing. de Producto', type: 'folder', children: [
      { id: '3-1', name: 'FP-08 Diseño y Desarrollo', type: 'file' },
    ]},
    { id: '4', name: '4. Ing. Manufactura y Sistemas', type: 'folder', children: [
      { id: '4-1', name: 'FP-05 Gestión de Sistemas de TI', type: 'file' },
    ]},
    { id: '5', name: '5. Mecanizado', type: 'folder', children: [
      { id: '5-1', name: 'FP-16 Proceso Mecanizado', type: 'file' },
    ]},
    { id: '6', name: '6. Ensamble', type: 'folder', children: [
      { id: '6-1', name: 'FP-17 Proceso Ensamble', type: 'file' },
    ]},
    { id: '7', name: '7. Post-Venta', type: 'folder', children: [] },
    { id: '8', name: '8. Calidad', type: 'folder', children: [
      { id: '8-1', name: 'FP-06 Proceso Calibración', type: 'file' },
    ]},
    { id: '10', name: '10. Logística', type: 'folder', children: [
      { id: '10-1', name: 'FP-09 Proceso Compras', type: 'file' },
    ]},
    { id: 'A', name: 'A. Dirección', type: 'folder', children: [
      { id: 'A-1', name: 'FP-25 Revisión por la Dirección', type: 'file' },
    ]},
    { id: 'B', name: 'B. Mantenimiento', type: 'folder', children: [
      { id: 'B-1', name: 'FP-04 Proceso de Mantenimiento', type: 'file' },
    ]},
    { id: 'C', name: 'C. Recursos Humanos y SMA', type: 'folder', children: [
      { id: 'C-1', name: 'FP-02 Selección y Contratación', type: 'file' },
    ]},
  ]
};

let idCounter = 100;
function generateId() { return 'n' + (++idCounter); }

/* ====== Iconos SVG minimalistas ====== */
const FolderIcon = () => (
  <svg className="fm-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const FileIcon = () => (
  <svg className="fm-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

const FileManager: React.FC = () => {
  const [tree, setTree] = useState<DocNode>(initialTree);
  const [current, setCurrent] = useState<DocNode>(tree);
  const [breadcrumbs, setBreadcrumbs] = useState<DocNode[]>([tree]);
  const [selected, setSelected] = useState<DocNode | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [ctxMenu, setCtxMenu] = useState<{x: number; y: number; node: DocNode} | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  // Navegación
  function findPath(node: DocNode, id: string, path: DocNode[] = []): DocNode[] {
    if (node.id === id) return [...path, node];
    for (const c of node.children || []) {
      const r = findPath(c, id, [...path, node]);
      if (r.length) return r;
    }
    return [];
  }

  const navigate = (folder: DocNode) => {
    setCurrent(folder);
    setBreadcrumbs(findPath(tree, folder.id));
    setSelected(null);
  };

  // CRUD
  const addNode = (type: 'folder' | 'file') => {
    const node: DocNode = { id: generateId(), name: type === 'folder' ? 'Nueva carpeta' : 'Nuevo documento', type, children: type === 'folder' ? [] : undefined };
    current.children = current.children || [];
    current.children.push(node);
    setTree({ ...tree });
    setRenamingId(node.id);
    setRenameValue(node.name);
  };

  const deleteNode = (node: DocNode) => {
    if (!current.children) return;
    current.children = current.children.filter(c => c.id !== node.id);
    setTree({ ...tree });
    if (selected?.id === node.id) setSelected(null);
  };

  const commitRename = (node: DocNode) => {
    if (renameValue.trim()) node.name = renameValue.trim();
    setRenamingId(null);
    setTree({ ...tree });
  };

  const handleContext = (e: React.MouseEvent, node: DocNode) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, node });
  };

  return (
    <div className="fm">
      {/* Panel lateral: departamentos */}
      <aside className="fm-sidebar">
        <div className="fm-sidebar-header">
          <FolderIcon /> <span>Documentos</span>
        </div>
        <ul className="fm-dept-list">
          {tree.children?.map(dep => (
            <li key={dep.id}>
              <button
                className={`fm-dept-btn${current.id === dep.id ? ' fm-dept-btn--active' : ''}`}
                onClick={() => navigate(dep)}
              >
                <FolderIcon />
                <span className="fm-dept-label">{dep.name}</span>
                <span className="fm-dept-count">{dep.children?.length || 0}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Panel principal */}
      <main className="fm-main">
        {/* Toolbar */}
        <div className="fm-toolbar">
          <div className="fm-toolbar-left">
            <button className="fm-btn fm-btn--primary" onClick={() => addNode('file')}>
              <FileIcon /> Nuevo documento
            </button>
            <button className="fm-btn fm-btn--secondary" onClick={() => addNode('folder')}>
              <FolderIcon /> Nueva carpeta
            </button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <nav className="fm-breadcrumbs">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b.id}>
              {i > 0 && <ChevronRight />}
              <button className="fm-breadcrumb" onClick={() => navigate(b)}>{b.name}</button>
            </React.Fragment>
          ))}
        </nav>

        {/* Tabla de archivos */}
        <div className="fm-table-wrap">
          <table className="fm-table">
            <thead>
              <tr>
                <th className="fm-th">Nombre</th>
                <th className="fm-th fm-th--type">Tipo</th>
                <th className="fm-th fm-th--actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {current.children && current.children.length > 0 ? (
                current.children.map(child => (
                  <tr
                    key={child.id}
                    className={`fm-row${selected?.id === child.id ? ' fm-row--selected' : ''}`}
                    onClick={() => setSelected(child)}
                    onContextMenu={e => handleContext(e, child)}
                    onDoubleClick={() => child.type === 'folder' && navigate(child)}
                  >
                    <td className="fm-td fm-td--name">
                      {child.type === 'folder' ? <FolderIcon /> : <FileIcon />}
                      {renamingId === child.id ? (
                        <input
                          className="fm-rename-input"
                          value={renameValue}
                          autoFocus
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(child)}
                          onKeyDown={e => { if (e.key === 'Enter') commitRename(child); if (e.key === 'Escape') setRenamingId(null); }}
                          title="Renombrar"
                          placeholder="Nombre"
                        />
                      ) : (
                        <span className="fm-name">{child.name}</span>
                      )}
                    </td>
                    <td className="fm-td fm-td--type">{child.type === 'folder' ? 'Carpeta' : 'Documento'}</td>
                    <td className="fm-td fm-td--actions">
                      <button className="fm-action-btn" onClick={e => { e.stopPropagation(); setRenamingId(child.id); setRenameValue(child.name); }} title="Renombrar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="fm-action-btn fm-action-btn--danger" onClick={e => { e.stopPropagation(); deleteNode(child); }} title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                      {child.type === 'folder' && (
                        <button className="fm-action-btn" onClick={e => { e.stopPropagation(); navigate(child); }} title="Abrir">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="fm-td" colSpan={3}><EmptyState icon="folder" title="Esta carpeta está vacía" compact /></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Panel de detalles */}
        {selected && (
          <aside className="fm-detail-panel">
            <h4 className="fm-detail-title">{selected.name}</h4>
            <div className="fm-detail-row"><span className="fm-detail-label">Tipo</span><span>{selected.type === 'folder' ? 'Carpeta' : 'Documento'}</span></div>
            <div className="fm-detail-row"><span className="fm-detail-label">ID</span><span className="fm-detail-mono">{selected.id}</span></div>
            <div className="fm-detail-row"><span className="fm-detail-label">Fecha</span><span>{new Date().toLocaleDateString('es-MX')}</span></div>
            <div className="fm-detail-actions">
              <button className="fm-btn fm-btn--primary fm-btn--sm">Descargar</button>
              <button className="fm-btn fm-btn--secondary fm-btn--sm">Ver</button>
            </div>
          </aside>
        )}
      </main>

      {/* Menú contextual */}
      {ctxMenu && (
        <div className="fm-ctx" ref={ctxRef} data-x={ctxMenu.x} data-y={ctxMenu.y}>
          <button className="fm-ctx-item" onClick={() => { setRenamingId(ctxMenu.node.id); setRenameValue(ctxMenu.node.name); setCtxMenu(null); }}>Renombrar</button>
          <button className="fm-ctx-item" onClick={() => { deleteNode(ctxMenu.node); setCtxMenu(null); }}>Eliminar</button>
          <div className="fm-ctx-divider" />
          <button className="fm-ctx-item" onClick={() => { addNode('folder'); setCtxMenu(null); }}>Nueva carpeta</button>
          <button className="fm-ctx-item" onClick={() => { addNode('file'); setCtxMenu(null); }}>Nuevo documento</button>
        </div>
      )}
    </div>
  );
};

export default FileManager;
