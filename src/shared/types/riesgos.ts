// 2.5 Gestión de Riesgos y Oportunidades (Cláusula 6.1)
import { AuditFields } from './common';

export type RiesgoTipo = 'riesgo' | 'oportunidad';

export type NivelProbabilidad = 1 | 2 | 3 | 4 | 5;
export type NivelImpacto = 1 | 2 | 3 | 4 | 5;
export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'critico';

export type RiesgoEstado = 'identificado' | 'en_tratamiento' | 'aceptado' | 'mitigado' | 'cerrado';

export interface Riesgo extends AuditFields {
  id: string;
  codigo: string;                  // RO-2026-001
  tipo: RiesgoTipo;
  titulo: string;
  descripcion: string;
  estado: RiesgoEstado;
  procesoId: string;
  responsableId: string;
  // Evaluación (5.2.1, 5.2.2)
  probabilidad: NivelProbabilidad;
  impacto: NivelImpacto;
  nivelRiesgo: NivelRiesgo;        // Calculado: probabilidad × impacto
  valorRiesgo: number;             // probabilidad * impacto
  // Evaluación residual (post-tratamiento)
  probabilidadResidual: NivelProbabilidad | null;
  impactoResidual: NivelImpacto | null;
  nivelRiesgoResidual: NivelRiesgo | null;
  valorRiesgoResidual: number | null;
  // Planes (2.5.3)
  planMitigacion: string;
  planContingencia: string;
  // Oportunidad (2.5.4)
  oportunidadDescripcion: string;
  beneficioEsperado: string;
  // Vinculación con objetivos (2.5.6)
  objetivosCalidad: string[];
  // Reevaluación (2.5.5)
  fechaUltimaEvaluacion: string;
  fechaProximaEvaluacion: string;
}

// Historial de evaluaciones
export interface RiesgoEvaluacion {
  id: string;
  riesgoId: string;
  fecha: string;
  probabilidad: NivelProbabilidad;
  impacto: NivelImpacto;
  valorRiesgo: number;
  nivelRiesgo: NivelRiesgo;
  observaciones: string;
  evaluadoPor: string;
}

// Acciones de tratamiento
export interface RiesgoAccion {
  id: string;
  riesgoId: string;
  descripcion: string;
  responsableId: string;
  fechaCompromiso: string;
  fechaReal: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  evidencia: string;
}

// Para el mapa de calor
export interface MapaCalorCelda {
  probabilidad: NivelProbabilidad;
  impacto: NivelImpacto;
  riesgos: Riesgo[];
  nivel: NivelRiesgo;
}

// Filtros
export interface RiesgoFiltros {
  tipo?: RiesgoTipo;
  estado?: RiesgoEstado;
  procesoId?: string;
  nivelRiesgo?: NivelRiesgo;
  responsableId?: string;
}

// Utilidad: calcular nivel de riesgo
export function calcularNivelRiesgo(probabilidad: number, impacto: number): NivelRiesgo {
  const valor = probabilidad * impacto;
  if (valor <= 4) return 'bajo';
  if (valor <= 9) return 'medio';
  if (valor <= 16) return 'alto';
  return 'critico';
}
