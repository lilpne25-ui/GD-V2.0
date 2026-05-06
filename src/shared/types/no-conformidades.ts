// 2.3 No Conformidades (Cláusula 10.2)
import { AuditFields } from './common';

export type NCOrigen = 'auditoria' | 'proceso' | 'producto' | 'cliente' | 'proveedor' | 'otra';
export type NCClasificacion = 'nc_mayor' | 'nc_menor';
export type NCEstado =
  | 'abierta'
  | 'en_analisis'
  | 'correccion_aplicada'
  | 'en_verificacion'
  | 'cerrada'
  | 'cancelada';

export type MetodoAnalisis = '5_porques' | 'ishikawa' | '8d' | 'otro';

export interface NoConformidad extends AuditFields {
  id: string;
  codigo: string;                  // NC-2026-001
  titulo: string;
  descripcion: string;
  origen: NCOrigen;
  clasificacion: NCClasificacion;
  estado: NCEstado;
  procesoId: string;
  responsableId: string;
  detectadoPor: string;
  fechaDeteccion: string;
  fechaLimite: string;
  fechaCierre: string;
  // Corrección inmediata (contención) 2.3.3
  correccionInmediata: string;
  correccionResponsable: string;
  correccionFecha: string;
  // Análisis de causa raíz 2.3.4
  metodoAnalisis: MetodoAnalisis;
  causaRaiz: string;
  analisisDetalle: string;
  // Evidencia de cierre 2.3.6
  evidenciaCierre: string;
  verificadoPor: string;
  fechaVerificacion: string;
  // Vinculaciones
  auditoriaId?: string;            // Si vino de auditoría
  hallazgoId?: string;
  capaId?: string;                 // Vinculación con CAPA (2.3.5)
}

// Análisis 5 Porqués (2.3.4)
export interface Analisis5Porques {
  id: string;
  ncId: string;
  porque1: string;
  porque2: string;
  porque3: string;
  porque4: string;
  porque5: string;
  causaRaizIdentificada: string;
}

// Diagrama Ishikawa (2.3.4)
export interface AnalisisIshikawa {
  id: string;
  ncId: string;
  manoObra: string[];
  maquinaria: string[];
  material: string[];
  metodo: string[];
  medioAmbiente: string[];
  medicion: string[];
  causaRaizIdentificada: string;
}

// Filtros
export interface NCFiltros {
  origen?: NCOrigen;
  clasificacion?: NCClasificacion;
  estado?: NCEstado;
  procesoId?: string;
  responsableId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
