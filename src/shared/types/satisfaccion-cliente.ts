// 2.10 Satisfacción del Cliente (Cláusula 9.1.2)
import { AuditFields } from './common';

export type EncuestaEstado = 'borrador' | 'activa' | 'cerrada';
export type TipoPregunta = 'escala' | 'si_no' | 'opcion_multiple' | 'abierta';
export type QuejaTipo = 'queja' | 'reclamacion' | 'sugerencia' | 'felicitacion';
export type QuejaEstado = 'recibida' | 'en_analisis' | 'en_atencion' | 'cerrada';

export interface Encuesta extends AuditFields {
  id: string;
  codigo: string;               // ENC-2026-001
  titulo: string;
  descripcion: string;
  estado: EncuestaEstado;
  fechaInicio: string;
  fechaFin: string;
  preguntas: PreguntaEncuesta[];
  totalRespuestas: number;
  promedioGeneral: number;      // 0-100 o 0-10
}

export interface PreguntaEncuesta {
  id: string;
  encuestaId: string;
  texto: string;
  tipo: TipoPregunta;
  opciones: string[];           // para opcion_multiple
  escalaMin: number;
  escalaMax: number;
  orden: number;
  obligatoria: boolean;
}

export interface RespuestaEncuesta {
  id: string;
  encuestaId: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  respuestas: RespuestaPregunta[];
  comentarioGeneral: string;
  satisfaccionGlobal: number;   // 0-10
}

export interface RespuestaPregunta {
  preguntaId: string;
  valor: string | number;
}

export interface QuejaCliente extends AuditFields {
  id: string;
  codigo: string;               // QC-2026-001
  tipo: QuejaTipo;
  cliente: string;
  fecha: string;
  descripcion: string;
  producto: string;
  estado: QuejaEstado;
  responsableId: string;
  analisis: string;
  accionTomada: string;
  fechaCierre: string;
  ncId?: string;                // vinculación con NC
  satisfaccionFinal: number | null;
}

export interface SatisfaccionResumen {
  periodo: string;
  encuestasAplicadas: number;
  totalRespuestas: number;
  promedioSatisfaccion: number;
  nps: number;                  // Net Promoter Score
  totalQuejas: number;
  quejasResueltas: number;
}

export interface SatisfaccionFiltros {
  estado?: EncuestaEstado;
  periodo?: string;
  clienteId?: string;
}
