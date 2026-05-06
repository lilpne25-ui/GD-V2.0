// 2.11 Control de Cambios (Cláusula 8.5.6)
import { AuditFields } from './common';

export type CambioTipo = 'proceso' | 'producto' | 'documento' | 'sistema' | 'organizacional';
export type CambioEstado = 'solicitado' | 'en_analisis' | 'aprobado' | 'rechazado' | 'en_implementacion' | 'verificado' | 'cerrado';
export type ImpactoCambio = 'bajo' | 'medio' | 'alto' | 'critico';

export interface SolicitudCambio extends AuditFields {
  id: string;
  codigo: string;               // SC-2026-001
  titulo: string;
  descripcion: string;
  tipo: CambioTipo;
  estado: CambioEstado;
  solicitanteId: string;
  solicitanteNombre: string;
  fecha: string;
  // Análisis de impacto (2.11.2)
  impacto: ImpactoCambio;
  analisisImpacto: string;
  procesosAfectados: string[];
  documentosAfectados: string[];
  riesgosIdentificados: string;
  recursoRequerido: string;
  // Aprobación (2.11.3)
  aprobadoPor: string;
  fechaAprobacion: string;
  justificacionDecision: string;
  // Implementación (2.11.4)
  planImplementacion: string;
  fechaInicioImpl: string;
  fechaFinImpl: string;
  responsableImplId: string;
  // Verificación (2.11.5)
  verificacion: string;
  verificadoPor: string;
  fechaVerificacion: string;
  resultadoVerificacion: 'conforme' | 'no_conforme' | null;
  evidencia: string;
}

export interface ActividadCambio {
  id: string;
  solicitudId: string;
  descripcion: string;
  responsableId: string;
  fechaProgramada: string;
  fechaReal: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  orden: number;
}

export interface HistorialCambioEstado {
  id: string;
  solicitudId: string;
  estadoAnterior: CambioEstado;
  estadoNuevo: CambioEstado;
  fecha: string;
  responsableId: string;
  comentario: string;
}

export interface CambioFiltros {
  tipo?: CambioTipo;
  estado?: CambioEstado;
  impacto?: ImpactoCambio;
  solicitanteId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
