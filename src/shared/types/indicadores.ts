// 2.6 Indicadores y Objetivos de Calidad (Cláusula 6.2, 9.1)
import { AuditFields } from './common';

export type FrecuenciaMedicion = 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'trimestral' | 'semestral' | 'anual';

export type TendenciaIndicador = 'subir' | 'bajar' | 'mantener';

export type SemaforoEstado = 'verde' | 'amarillo' | 'rojo';

export type TipoGrafico = 'linea' | 'barras' | 'gauge' | 'semaforo';

export interface Indicador extends AuditFields {
  id: string;
  codigo: string;               // IND-CAL-001
  nombre: string;
  descripcion: string;
  procesoId: string;
  responsableId: string;
  // Definición (2.6.1)
  formula: string;              // ej: "(piezas conformes / total piezas) × 100"
  unidad: string;               // ej: "%", "ppm", "días"
  fuenteDatos: string;
  frecuencia: FrecuenciaMedicion;
  tendenciaDeseada: TendenciaIndicador;
  // Metas y rangos (2.6.4)
  meta: number;
  limiteInferior: number;
  limiteSuperior: number;
  lineaBase: number;
  // Visualización (2.6.3)
  tipoGrafico: TipoGrafico;
  // Vinculación (2.6.7)
  objetivoCalidad: string;
  activo: boolean;
}

export interface MedicionIndicador {
  id: string;
  indicadorId: string;
  periodo: string;              // "2026-01", "2026-Q1", "2026-S1"
  valor: number;
  meta: number;
  semaforo: SemaforoEstado;
  observaciones: string;
  registradoPor: string;
  fecha: string;
}

export interface ObjetivoCalidad extends AuditFields {
  id: string;
  codigo: string;               // OBJ-2026-001
  descripcion: string;
  meta: string;
  plazo: string;
  responsableId: string;
  procesoId: string;
  estado: 'definido' | 'en_seguimiento' | 'cumplido' | 'no_cumplido';
  avance: number;               // 0-100
  indicadores: string[];        // IDs de indicadores vinculados
}

export interface IndicadorFiltros {
  procesoId?: string;
  frecuencia?: FrecuenciaMedicion;
  semaforo?: SemaforoEstado;
  activo?: boolean;
}

// Utilidad: calcular semáforo
export function calcularSemaforo(
  valor: number, meta: number, limInf: number, limSup: number, tendencia: TendenciaIndicador
): SemaforoEstado {
  if (tendencia === 'subir') {
    if (valor >= meta) return 'verde';
    if (valor >= limInf) return 'amarillo';
    return 'rojo';
  }
  if (tendencia === 'bajar') {
    if (valor <= meta) return 'verde';
    if (valor <= limSup) return 'amarillo';
    return 'rojo';
  }
  // mantener
  if (valor >= limInf && valor <= limSup) return 'verde';
  return 'rojo';
}
