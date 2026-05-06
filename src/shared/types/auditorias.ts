// 2.2 Auditorías (Cláusula 9.2)
import { AuditFields } from './common';

export type AuditoriaTipo = 'interna' | 'externa';
export type AuditoriaEstado = 'programada' | 'en_ejecucion' | 'completada' | 'cancelada';

export type HallazgoClasificacion =
  | 'nc_mayor'
  | 'nc_menor'
  | 'observacion'
  | 'oportunidad_mejora'
  | 'fortaleza';

export interface ProgramaAuditoria extends AuditFields {
  id: string;
  anio: number;
  nombre: string;
  objetivo: string;
  alcance: string;
  estado: 'activo' | 'cerrado';
}

export interface Auditoria extends AuditFields {
  id: string;
  programaId: string;
  codigo: string;
  tipo: AuditoriaTipo;
  estado: AuditoriaEstado;
  objetivo: string;
  alcance: string;
  criterios: string;
  fechaProgramada: string;
  fechaInicio: string;
  fechaFin: string;
  procesosAuditados: string[];     // IDs de procesos
  auditorLiderId: string;
  equipoAuditor: string[];         // IDs de auditores
  observadores: string[];          // IDs
  reunionApertura: string;
  reunionCierre: string;
  conclusiones: string;
  informeGenerado: boolean;
}

export interface AuditorCompetencia {
  id: string;
  auditorId: string;
  formacion: string;
  experienciaAnios: number;
  certificaciones: string[];
  procesosHabilitados: string[];
  imparcialidadDeclarada: boolean;
  fechaUltimaEvaluacion: string;
}

export interface ChecklistItem {
  id: string;
  auditoriaId: string;
  clausula: string;
  procesoId: string;
  pregunta: string;
  cumple: 'si' | 'no' | 'parcial' | 'no_aplica' | null;
  evidenciaObjetiva: string;
  notasCampo: string;
  orden: number;
}

export interface Hallazgo extends AuditFields {
  id: string;
  auditoriaId: string;
  checklistItemId: string;
  clasificacion: HallazgoClasificacion;
  clausulaReferencia: string;
  descripcion: string;
  evidencia: string;
  procesoId: string;
  responsableId: string;
  ncId?: string;                   // Vinculación con NC (2.2.9)
  capaId?: string;                 // Vinculación con CAPA
}

// Filtros
export interface AuditoriaFiltros {
  programaId?: string;
  tipo?: AuditoriaTipo;
  estado?: AuditoriaEstado;
  procesoId?: string;
  auditorId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
