// 2.7 Proveedores (Cláusula 8.4)
import { AuditFields } from './common';

export type ProveedorEstatus = 'aprobado' | 'condicional' | 'rechazado' | 'en_evaluacion' | 'suspendido';

export type CriterioEvaluacion = 'calidad' | 'entrega' | 'precio' | 'servicio' | 'documentacion' | 'capacidad';

export interface Proveedor extends AuditFields {
  id: string;
  codigo: string;               // PROV-001
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  productoServicio: string;     // qué suministra
  categoria: string;            // materia prima, servicio, equipo...
  estatus: ProveedorEstatus;
  calificacionActual: number;   // 0-100
  fechaAlta: string;
  fechaUltimaEvaluacion: string;
  fechaProximaEvaluacion: string;
  observaciones: string;
  documentosRequeridos: string[];
  activo: boolean;
}

export interface EvaluacionProveedor extends AuditFields {
  id: string;
  proveedorId: string;
  periodo: string;              // "2026-Q1"
  fecha: string;
  evaluadorId: string;
  calificacionGlobal: number;   // 0-100
  resultado: ProveedorEstatus;
  observaciones: string;
  criterios: CriterioCalificacion[];
}

export interface CriterioCalificacion {
  criterio: CriterioEvaluacion;
  peso: number;                 // % del total (deben sumar 100)
  calificacion: number;         // 0-100
  ponderado: number;            // calificacion × peso / 100
  evidencia: string;
}

export interface IncidenciaProveedor {
  id: string;
  proveedorId: string;
  fecha: string;
  tipo: 'rechazo' | 'retraso' | 'faltante' | 'documentacion' | 'otro';
  descripcion: string;
  impacto: 'bajo' | 'medio' | 'alto';
  accionTomada: string;
  registradoPor: string;
}

export interface ProveedorFiltros {
  estatus?: ProveedorEstatus;
  categoria?: string;
  calificacionMin?: number;
}
