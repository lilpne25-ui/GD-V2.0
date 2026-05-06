/**
 * WorkflowRepo – Gestión del flujo de documentos
 *
 * Estados:
 *   borrador  → El usuario genera/sube un documento
 *   revision  → El documento se envía a revisión (notifica a Coordinadora SGC)
 *   correcciones → La coordinadora solicita correcciones (con feedback detallado)
 *   aprobado  → La coordinadora aprueba y ubica en carpeta destino
 *   obsoleto  → Documento marcado como obsoleto
 */
import { dbAll, dbGet, dbRun, generateId } from '../db';

export interface WorkflowRow {
  id: string;
  node_id: string;
  node_name: string | null;
  status: 'borrador' | 'revision' | 'correcciones' | 'aprobado' | 'obsoleto';
  submitted_by: string | null;
  submitted_by_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  target_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorreccionRow {
  id: string;
  workflow_id: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  que_esta_mal: string;
  por_que: string;
  como_corregir: string;
  observaciones: string;
  destinatario_id: string | null;
  destinatario_name: string | null;
  created_at: string;
}

export const WorkflowRepo = {
  /**
   * Crear un registro de workflow cuando el usuario sube/genera un documento.
   * Estado inicial: 'borrador'
   */
  async create(data: {
    nodeId: string;
    nodeName: string;
    submittedBy: string;
    submittedByName: string;
  }): Promise<string> {
    const id = generateId('wf');
    await dbRun(
      `INSERT INTO documento_workflow (id, node_id, node_name, status, submitted_by, submitted_by_name, created_at, updated_at)
       VALUES (?, ?, ?, 'borrador', ?, ?, datetime('now'), datetime('now'))`,
      [id, data.nodeId, data.nodeName, data.submittedBy, data.submittedByName]
    );
    return id;
  },

  /**
   * Enviar documento a revisión (borrador → revision).
   * Automáticamente asigna a todos los Coordinadores SGC.
   */
  async submitForReview(workflowId: string): Promise<void> {
    await dbRun(
      `UPDATE documento_workflow
       SET status = 'revision', updated_at = datetime('now')
       WHERE id = ? AND status IN ('borrador', 'correcciones')`,
      [workflowId]
    );
  },

  /**
   * Aprobar documento (revision → aprobado).
   * La coordinadora elige carpeta destino.
   */
  async approve(workflowId: string, data: {
    approvedBy: string;
    approvedByName: string;
    targetFolderId?: string;
  }): Promise<void> {
    await dbRun(
      `UPDATE documento_workflow
       SET status = 'aprobado',
           approved_by = ?,
           approved_by_name = ?,
           approved_at = datetime('now'),
           target_folder_id = ?,
           updated_at = datetime('now')
       WHERE id = ? AND status = 'revision'`,
      [data.approvedBy, data.approvedByName, data.targetFolderId || null, workflowId]
    );
  },

  /**
   * Solicitar correcciones (revision → correcciones).
   * Crea un registro de corrección con feedback detallado.
   */
  async requestCorrection(workflowId: string, data: {
    reviewerId: string;
    reviewerName: string;
    queEstaMal: string;
    porQue: string;
    comoCorregir: string;
    observaciones: string;
    destinatarioId: string;
    destinatarioName: string;
  }): Promise<string> {
    const corrId = generateId('corr');

    await dbRun(
      `UPDATE documento_workflow
       SET status = 'correcciones', updated_at = datetime('now')
       WHERE id = ? AND status = 'revision'`,
      [workflowId]
    );

    await dbRun(
      `INSERT INTO workflow_correcciones
         (id, workflow_id, reviewer_id, reviewer_name, que_esta_mal, por_que, como_corregir, observaciones, destinatario_id, destinatario_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        corrId,
        workflowId,
        data.reviewerId,
        data.reviewerName,
        data.queEstaMal,
        data.porQue,
        data.comoCorregir,
        data.observaciones,
        data.destinatarioId,
        data.destinatarioName,
      ]
    );

    return corrId;
  },

  /**
   * Marcar documento como obsoleto.
   */
  async markObsolete(workflowId: string): Promise<void> {
    await dbRun(
      `UPDATE documento_workflow SET status = 'obsoleto', updated_at = datetime('now') WHERE id = ?`,
      [workflowId]
    );
  },

  /**
   * Obtener workflow por ID.
   */
  async getById(id: string): Promise<WorkflowRow | undefined> {
    return dbGet<WorkflowRow>('SELECT * FROM documento_workflow WHERE id = ?', [id]);
  },

  /**
   * Obtener workflow activo de un nodo (documento).
   */
  async getByNodeId(nodeId: string): Promise<WorkflowRow | undefined> {
    return dbGet<WorkflowRow>(
      `SELECT * FROM documento_workflow WHERE node_id = ? ORDER BY created_at DESC LIMIT 1`,
      [nodeId]
    );
  },

  /**
   * Listar documentos por estado (para la bandeja de la Coordinadora SGC).
   */
  async listByStatus(status: string, limit = 100): Promise<WorkflowRow[]> {
    return dbAll<WorkflowRow>(
      'SELECT * FROM documento_workflow WHERE status = ? ORDER BY updated_at DESC LIMIT ?',
      [status, limit]
    );
  },

  /**
   * Listar todos los workflows recientes.
   */
  async listAll(limit = 200): Promise<WorkflowRow[]> {
    return dbAll<WorkflowRow>(
      'SELECT * FROM documento_workflow ORDER BY updated_at DESC LIMIT ?',
      [limit]
    );
  },

  /**
   * Listar workflows del usuario (sus documentos).
   */
  async listByUser(userId: string, limit = 100): Promise<WorkflowRow[]> {
    return dbAll<WorkflowRow>(
      'SELECT * FROM documento_workflow WHERE submitted_by = ? ORDER BY updated_at DESC LIMIT ?',
      [userId, limit]
    );
  },

  /**
   * Obtener correcciones de un workflow.
   */
  async getCorrections(workflowId: string): Promise<CorreccionRow[]> {
    return dbAll<CorreccionRow>(
      'SELECT * FROM workflow_correcciones WHERE workflow_id = ? ORDER BY created_at DESC',
      [workflowId]
    );
  },

  /**
   * Contar documentos pendientes de revisión (para badge).
   */
  async countPending(): Promise<number> {
    const row = await dbGet<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM documento_workflow WHERE status = 'revision'`
    );
    return row?.cnt || 0;
  },
};
