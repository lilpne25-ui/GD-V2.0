// 2.4 Acciones Correctivas y Preventivas — CAPA (Cláusula 10.2, 10.3)
import { AuditFields } from './common';

export type CAPATipo = 'correctiva' | 'preventiva' | 'mejora';

export type CAPAEstado =
  | 'abierta'
  | 'en_implementacion'
  | 'implementada'
  | 'en_verificacion'
  | 'cerrada_eficaz'
  | 'cerrada_no_eficaz'
  | 'cancelada';

export interface CAPA extends AuditFields {
  id: string;
  codigo: string;                  // CAPA-2026-001
  titulo: string;
  descripcion: string;
  tipo: CAPATipo;
  estado: CAPAEstado;
  procesoId: string;
  responsableId: string;
  fechaApertura: string;
  fechaCompromisoImplementacion: string;
  fechaCierre: string;
  // Origen
  ncId?: string;                   // Derivada de NC (2.4.1)
  auditoriaId?: string;
  origenDescripcion: string;
  // Plan de acción (2.4.3)
  planAccion: string;
  recursosNecesarios: string;
  // Seguimiento (2.4.4)
  porcentajeAvance: number;        // 0-100
  // Verificación de eficacia (2.4.5)
  verificacionEficacia: string;
  verificadoPor: string;
  fechaVerificacion: string;
  esEficaz: boolean | null;
  // Cierre formal (2.4.6)
  evidenciaCierre: string;
  cerradoPor: string;
}

// Actividades del plan de acción
export interface CAPAActividad {
  id: string;
  capaId: string;
  descripcion: string;
  responsableId: string;
  fechaCompromiso: string;
  fechaReal: string;
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
  evidencia: string;
  orden: number;
}

// Seguimiento periódico
export interface CAPASeguimiento {
  id: string;
  capaId: string;
  fecha: string;
  descripcion: string;
  porcentajeAvance: number;
  registradoPor: string;
}

// Filtros
export interface CAPAFiltros {
  tipo?: CAPATipo;
  estado?: CAPAEstado;
  procesoId?: string;
  responsableId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  vencidas?: boolean;
}
