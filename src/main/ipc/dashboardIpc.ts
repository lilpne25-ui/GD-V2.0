import { ipcMain } from 'electron';
import { withAuth } from './authMiddleware';
import { DocumentoTreeRepo } from '../../database/repositories/documentoTreeRepo';
import { WorkflowRepo } from '../../database/repositories/workflowRepo';
import { UsuarioRepo } from '../../database/repositories/usuarioRepo';

// Función auxiliar de tipado para el activo de usuario
const toFlag01 = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric === 1 ? 1 : 0;
  const raw = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'si', 'on'].includes(raw)) return 1;
  if (['0', 'false', 'no', 'off'].includes(raw)) return 0;
  return fallback ? 1 : 0;
};

export function registerDashboardIpc(): void {
  ipcMain.handle('dashboard:get-metrics', withAuth(async () => {
    try {
      // Obtener de forma concurrente todas las métricas requeridas desde la base de datos
      const [nodes, pending, users, audit] = await Promise.all([
        DocumentoTreeRepo.getAll(),
        WorkflowRepo.countPending(),
        UsuarioRepo.getAll(),
        DocumentoTreeRepo.listAuditTrail(120),
      ]);

      const safeNodes = Array.isArray(nodes) ? nodes : [];
      const fileCount = safeNodes.filter(node => node.node_type === 'file').length;
      const folderCount = safeNodes.filter(node => node.node_type === 'folder').length;
      const activeUsers = (Array.isArray(users) ? users : []).filter(user => toFlag01(user?.activo, 1) === 1).length;

      return {
        documentos: fileCount,
        carpetas: folderCount,
        pendientesRevision: Number(pending || 0),
        usuariosActivos: activeUsers,
        auditTrail: Array.isArray(audit) ? audit : [],
      };
    } catch (err: any) {
      console.error('Error al compilar métricas del dashboard:', err);
      throw new Error(err.message || 'No se pudieron recuperar las métricas del dashboard.');
    }
  }));
}
