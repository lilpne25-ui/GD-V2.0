// 2.8 Revisión por la Dirección (Cláusula 9.3)
import { AuditFields } from './common';

export type RevisionEstado = 'programada' | 'en_curso' | 'completada' | 'cancelada';

export interface RevisionDireccion extends AuditFields {
  id: string;
  codigo: string;               // RD-2026-001
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: RevisionEstado;
  convocadoPor: string;
  lugar: string;
  // Entradas (9.3.2)
  entradas: EntradaRevision[];
  // Acta
  resumenEjecutivo: string;
  // Salidas (9.3.3)
  salidas: SalidaRevision[];
  asistentes: AsistenteRevision[];
}

export interface EntradaRevision {
  id: string;
  revisionId: string;
  tema: TemaEntrada;
  resumen: string;
  datos: string;                // datos/estadísticas relevantes
}

export type TemaEntrada =
  | 'estado_acciones_anteriores'
  | 'cambios_contexto'
  | 'desempeno_procesos'
  | 'no_conformidades'
  | 'auditorias'
  | 'satisfaccion_cliente'
  | 'proveedores'
  | 'indicadores'
  | 'riesgos'
  | 'recursos'
  | 'mejora_continua'
  | 'otro';

export const TEMA_ENTRADA_LABELS: Record<TemaEntrada, string> = {
  estado_acciones_anteriores: 'Estado de acciones de revisiones anteriores',
  cambios_contexto: 'Cambios en cuestiones externas e internas',
  desempeno_procesos: 'Desempeño y eficacia del SGC',
  no_conformidades: 'No conformidades y acciones correctivas',
  auditorias: 'Resultados de auditorías',
  satisfaccion_cliente: 'Retroalimentación del cliente',
  proveedores: 'Desempeño de proveedores',
  indicadores: 'Seguimiento de indicadores',
  riesgos: 'Riesgos y oportunidades',
  recursos: 'Adecuación de recursos',
  mejora_continua: 'Oportunidades de mejora',
  otro: 'Otro',
};

export interface SalidaRevision {
  id: string;
  revisionId: string;
  tipo: 'decision' | 'accion' | 'recurso' | 'cambio_sgc';
  descripcion: string;
  responsableId: string;
  fechaCompromiso: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
}

export interface AsistenteRevision {
  id: string;
  revisionId: string;
  nombre: string;
  cargo: string;
  presente: boolean;
}

export interface RevisionFiltros {
  estado?: RevisionEstado;
  anio?: number;
}
