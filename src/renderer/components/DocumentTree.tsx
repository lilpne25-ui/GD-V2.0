import React, { useState } from 'react';
import './DocumentTree.css';

// Tipo de nodo para la jerarquía documental
export type DocNode = {
  id: string;
  name: string;
  children?: DocNode[];
  isEditing?: boolean;
};

// Estructura inicial basada en tu jerarquía
const initialTree: DocNode = {
  id: 'root',
  name: '[4.Aprobado]',
  children: [
    {
      id: '1',
      name: '1.-MANUAL DEL SISTEMA',
      children: [
        { id: '1-1', name: 'FP-01 FICHA DE PROCESO GESTIÓN DE RIESGOS Y OPORTUNIDADES' },
        { id: '1-2', name: 'FP-24 FICHA DE PROCESO AUDITORÍA INTERNA' },
      ],
    },
    {
      id: '2',
      name: '2.-VENTAS',
      children: [
        { id: '2-1', name: 'FP-07 FICHA DE PROCESO VENTAS' },
      ],
    },
    {
      id: '3',
      name: '3.-ING DE PRODUCTO',
      children: [
        { id: '3-1', name: 'FP-07 FICHA DE PROCESO VENTAS' },
      ],
    },
    {
      id: '4',
      name: '4.-ING.MANUFACTURA Y SISTEMAS PRODUCTIVOS',
      children: [
        { id: '4-1', name: 'FP-05-FICHA DE PROCESO GESTION DE SISTEMAS DE TI' },
      ],
    },
    {
      id: '5',
      name: '5.-MECANIZADO',
      children: [
        { id: '5-1', name: 'FP-16-FICHA  PROCESO MECANIZADO' },
      ],
    },
    {
      id: '6',
      name: '6.-ENSAMBLE',
      children: [
        { id: '6-1', name: 'FP-17 FICHA  PROCESO ENSAMBLE' },
      ],
    },
    {
      id: '7',
      name: '7.-POST-VENTA',
      children: [],
    },
    {
      id: '8',
      name: '8.-CALIDAD',
      children: [
        { id: '8-1', name: 'FP-06-FICHA DE PROCESO CALIBRACION' },
      ],
    },
    {
      id: '10',
      name: '10.-LOGISTICA',
      children: [
        { id: '10-1', name: 'FP-09 FICHA DE PROCESO COMPRAS' },
      ],
    },
    {
      id: 'A',
      name: 'A.-DIRECCION',
      children: [
        { id: 'A-1', name: 'FP-25 FICHA DE PROCESO REVISION POR LA DIRECCION' },
      ],
    },
    {
      id: 'B',
      name: 'B.-MANTENIMIENTO',
      children: [
        { id: 'B-1', name: 'FP-04 FICHA DE PROCESO DE MANTENIMIENTO' },
      ],
    },
    {
      id: 'C',
      name: 'C.-RECURSOS HUMANOS Y SMA',
      children: [
        { id: 'C-1', name: 'FP-02 PROCESO DE SELECCIÓN Y CONTRATACIÓN' },
      ],
    },
  ],
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

const DocumentTree: React.FC = () => {
  const [tree, setTree] = useState<DocNode>(initialTree);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Recursivo: renderiza cada nodo y sus hijos
  const renderNode = (node: DocNode, parent?: DocNode) => (
    <li key={node.id} className={selectedId === node.id ? 'selected' : ''}>
      {node.isEditing ? (
        <input
          autoFocus
          aria-label="Renombrar elemento"
          defaultValue={node.name}
          onBlur={e => handleRename(node, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename(node, (e.target as HTMLInputElement).value);
          }}
        />
      ) : (
        <span onClick={() => setSelectedId(node.id)}>{node.name}</span>
      )}
      <div className="tree-actions">
        <button title="Agregar subcarpeta" onClick={() => handleAdd(node, false)}>+ Carpeta</button>
        <button title="Agregar documento" onClick={() => handleAdd(node, true)}>+ Doc</button>
        <button title="Renombrar" onClick={() => handleEdit(node)}></button>
        {parent && <button title="Eliminar" onClick={() => handleDelete(node, parent)}>-</button>}
      </div>
      {node.children && node.children.length > 0 && (
        <ul>{node.children.map(child => renderNode(child, node))}</ul>
      )}
    </li>
  );

  // Agregar subcarpeta o documento
  const handleAdd = (node: DocNode, isDoc: boolean) => {
    const newNode: DocNode = {
      id: generateId(),
      name: isDoc ? 'Nuevo Documento' : 'Nueva Carpeta',
      children: isDoc ? undefined : [],
      isEditing: true,
    };
    node.children = node.children || [];
    node.children.push(newNode);
    setTree({ ...tree });
  };

  // Renombrar nodo
  const handleEdit = (node: DocNode) => {
    node.isEditing = true;
    setTree({ ...tree });
  };
  const handleRename = (node: DocNode, newName: string) => {
    node.name = newName;
    node.isEditing = false;
    setTree({ ...tree });
  };

  // Eliminar nodo
  const handleDelete = (node: DocNode, parent: DocNode) => {
    parent.children = (parent.children || []).filter(child => child.id !== node.id);
    setTree({ ...tree });
  };

  return (
    <div className="document-tree-container">
      <h2>Documentación</h2>
      <ul className="document-tree">
        {renderNode(tree)}
      </ul>
    </div>
  );
};

export default DocumentTree;
