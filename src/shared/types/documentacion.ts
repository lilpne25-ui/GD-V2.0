// 2.1 Documentación (Cláusulas 7.5, 8.5)
import { AuditFields } from './common';

export type DocumentoEstado = 'borrador' | 'en_revision' | 'aprobado' | 'obsoleto';

export type DocumentoTipo =
  | 'procedimiento'
  | 'instruccion'
  | 'formato'
  | 'registro'
  | 'ficha_proceso'
  | 'manual'
  | 'politica'
  | 'externo';

export type DocumentoOrigen = 'interno' | 'externo';

export interface Documento extends AuditFields {
  id: string;
  codigo: string;               // Código único (ej. PR-CAL-001)
  nombre: string;
  tipo: DocumentoTipo;
  origen: DocumentoOrigen;
  estado: DocumentoEstado;
  version: number;
  versionTexto: string;         // "1.0", "2.1", etc.
  departamentoId: string;
  procesoId: string;
  responsableId: string;
  descripcion: string;
  rutaArchivo: string;
  fechaEmision: string;
  fechaVigencia: string;
  fechaProximaRevision: string;
  tags: string[];
  // Workflow de aprobación
  elaboroId: string;
  elaboroFecha: string;
  revisoId: string;
  revisoFecha: string;
  aproboId: string;
  aproboFecha: string;
}

export interface DocumentoVersion {
  id: string;
  documentoId: string;
  version: number;
  versionTexto: string;
  cambios: string;
  rutaArchivo: string;
  creadoPor: string;
  fecha: string;
}

export interface DocumentoDistribucion {
  id: string;
  documentoId: string;
  destinatario: string;
  tipo: 'controlada' | 'no_controlada';
  fechaEntrega: string;
  acuseRecibo: boolean;
}

// Filtros de búsqueda avanzada (2.1.8)
export interface DocumentoFiltros {
  codigo?: string;
  nombre?: string;
  tipo?: DocumentoTipo;
  estado?: DocumentoEstado;
  departamentoId?: string;
  procesoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  responsableId?: string;
  tags?: string[];
}

// Para el wizard de creación
export interface DocumentoFormData {
  codigo: string;
  nombre: string;
  tipo: DocumentoTipo;
  origen: DocumentoOrigen;
  departamentoId: string;
  procesoId: string;
  responsableId: string;
  descripcion: string;
  fechaVigencia: string;
  fechaProximaRevision: string;
  tags: string[];
}
