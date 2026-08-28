export type RegistroTipo = 'hoja' | 'documento';

export type Registro = {
  id: string;
  nombre: string;
  tipo: RegistroTipo;
  encabezados: string[];
  filas: string[][];
  contenidoHtml: string;
  updatedAt: string;
};

export type SelectedCell = { row: number; col: number };
export type RegistroTemplate = 'blank' | 'bitacora' | 'asistencia' | 'inspeccion';

export type WfDocItem = {
  id: string;
  node_id: string;
  node_name: string | null;
  status: 'borrador' | 'revision' | 'correcciones' | 'aprobado' | 'obsoleto';
  submitted_by: string | null;
  submitted_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WfCorreccion = {
  id: string;
  workflow_id: string;
  reviewer_name: string | null;
  que_esta_mal: string;
  por_que: string;
  como_corregir: string;
  observaciones: string;
  created_at: string;
};

<<<<<<< HEAD
export type RegistrosMainTab = 'studio' | 'workflow';
=======
export type RegistrosMainTab = 'studio' | 'workflow' | 'dynamic';
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6

export type FolderOption = {
  id: string;
  label: string;
};

export type DocSaveFormat = 'docx' | 'html';

export type RolUsuarioLike = string;
