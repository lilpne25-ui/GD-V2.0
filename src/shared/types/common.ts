// Tipos comunes del sistema

export type EntityStatus = 'activo' | 'inactivo' | 'eliminado';

export interface AuditFields {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'like' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
  value: any;
}

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  field: string;
  direction: SortDirection;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento: string;
  activo: boolean;
}

// En la operación real, este campo representa el PUESTO (texto libre), no permisos.
export type RolUsuario = string;

export interface Departamento {
  id: string;
  nombre: string;
  responsable: string;
}

export interface Proceso {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'estrategico' | 'operativo' | 'soporte';
  departamentoId: string;
  responsable: string;
}
