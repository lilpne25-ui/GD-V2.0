// Tipos compartidos para el flujo de documentos (workflow)

export type WorkflowStatus = 'borrador' | 'revision' | 'correcciones' | 'aprobado' | 'obsoleto';

export interface WorkflowDocument {
  id: string;
  nodeId: string;
  nodeName: string | null;
  status: WorkflowStatus;
  submittedBy: string | null;
  submittedByName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  targetFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowCorrection {
  id: string;
  workflowId: string;
  reviewerId: string | null;
  reviewerName: string | null;
  queEstaMal: string;
  porQue: string;
  comoCorregir: string;
  observaciones: string;
  destinatarioId: string | null;
  destinatarioName: string | null;
  createdAt: string;
}

export interface Notificacion {
  id: string;
  userId: string;
  tipo: 'info' | 'workflow' | 'correccion' | 'aprobacion' | 'email' | 'sistema';
  titulo: string;
  mensaje: string;
  referenciaId: string | null;
  referenciaTipo: string | null;
  leida: boolean;
  createdAt: string;
}

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  borrador: 'Borrador',
  revision: 'En Revisión',
  correcciones: 'Correcciones',
  aprobado: 'Aprobado',
  obsoleto: 'Obsoleto',
};

export const WORKFLOW_STATUS_COLORS: Record<WorkflowStatus, string> = {
  borrador: '#6b7280',
  revision: '#f59e0b',
  correcciones: '#ef4444',
  aprobado: '#10b981',
  obsoleto: '#9ca3af',
};

export const ROLES_CAN_SEND_EMAIL = [
  '1 DIRECTOR',
  '1.1 RECURSOS HUMANOS',
  '8 COORDINADOR DEL SGC',
  '4.3 TÉCNICO TI',
];
