// 2.9 Competencias y Capacitación (Cláusula 7.2, 7.3)
import { AuditFields } from './common';

export type NivelCompetencia = 'basico' | 'intermedio' | 'avanzado' | 'experto';
export type CompetenciaEstado = 'vigente' | 'por_vencer' | 'vencida' | 'no_evaluada';

export interface Competencia {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;            // técnica, normativa, gestión, seguridad
  nivelRequerido: NivelCompetencia;
  vigenciaMeses: number;        // cada cuánto se debe renovar
}

export interface PuestoCompetencia {
  id: string;
  puesto: string;
  procesoId: string;
  competencias: CompetenciaRequerida[];
}

export interface CompetenciaRequerida {
  competenciaId: string;
  competenciaNombre: string;
  nivelRequerido: NivelCompetencia;
  critica: boolean;             // competencia crítica para el puesto
}

export interface PersonalCompetencia extends AuditFields {
  id: string;
  personalId: string;
  personalNombre: string;
  puesto: string;
  departamento: string;
  competencias: EvaluacionCompetencia[];
  brechas: number;              // cantidad de competencias debajo del nivel requerido
  cumplimiento: number;         // 0-100 porcentaje de competencias cubiertas
}

export interface EvaluacionCompetencia {
  id: string;
  competenciaId: string;
  competenciaNombre: string;
  nivelRequerido: NivelCompetencia;
  nivelActual: NivelCompetencia | null;
  estado: CompetenciaEstado;
  fechaEvaluacion: string;
  fechaVencimiento: string;
  evidencia: string;
  evaluadoPor: string;
}

export interface Capacitacion extends AuditFields {
  id: string;
  codigo: string;               // CAP-2026-001
  titulo: string;
  descripcion: string;
  tipo: 'interna' | 'externa';
  instructor: string;
  fecha: string;
  duracionHoras: number;
  lugar: string;
  competenciasRelacionadas: string[];
  estado: 'programada' | 'en_curso' | 'completada' | 'cancelada';
  participantes: ParticipanteCapacitacion[];
  evaluacionEficacia: string;
  eficaz: boolean | null;
}

export interface ParticipanteCapacitacion {
  id: string;
  capacitacionId: string;
  personalId: string;
  nombre: string;
  asistio: boolean;
  calificacion: number | null;  // si aplica evaluación
  observaciones: string;
}

export interface PlanCapacitacion extends AuditFields {
  id: string;
  anio: number;
  titulo: string;
  estado: 'borrador' | 'aprobado' | 'en_ejecucion' | 'cerrado';
  capacitaciones: string[];     // IDs
  avance: number;               // 0-100
  aprobadoPor: string;
  fechaAprobacion: string;
}

export interface CompetenciasFiltros {
  departamento?: string;
  puesto?: string;
  estado?: CompetenciaEstado;
  conBrechas?: boolean;
}
