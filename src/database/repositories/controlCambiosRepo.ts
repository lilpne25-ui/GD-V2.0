// Repositorio de Control de Cambios (2.11)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const ControlCambiosRepo = {
  async getAll(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM solicitudes_cambio WHERE 1=1';
    const params: any[] = [];
    if (filters?.tipo) { sql += ' AND tipo = ?'; params.push(filters.tipo); }
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.impacto) { sql += ' AND impacto = ?'; params.push(filters.impacto); }
    if (filters?.solicitante_id) { sql += ' AND solicitante_id = ?'; params.push(filters.solicitante_id); }
    sql += ' ORDER BY fecha DESC';
    return dbAll(sql, params);
  },

  async getById(id: string) { return dbGet('SELECT * FROM solicitudes_cambio WHERE id = ?', [id]); },

  async create(data: any): Promise<string> {
    const id = generateId('sc');
    await dbRun(
      `INSERT INTO solicitudes_cambio (id, codigo, titulo, descripcion, tipo, estado, solicitante_id,
       solicitante_nombre, impacto, analisis_impacto, procesos_afectados, documentos_afectados,
       riesgos_identificados, recurso_requerido)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.titulo, data.descripcion, data.tipo, 'solicitado',
       data.solicitante_id, data.solicitante_nombre, data.impacto || 'bajo',
       data.analisis_impacto, JSON.stringify(data.procesos_afectados || []),
       JSON.stringify(data.documentos_afectados || []), data.riesgos_identificados, data.recurso_requerido]
    );
    // Registrar historial
    await dbRun('INSERT INTO historial_cambio_estado (id, solicitud_id, estado_anterior, estado_nuevo, responsable_id, comentario) VALUES (?,?,?,?,?,?)',
      [generateId('hce'), id, '', 'solicitado', data.solicitante_id, 'Solicitud creada']);
    return id;
  },

  async update(id: string, data: any): Promise<void> {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id' && v !== undefined) { sets.push(`${k} = ?`); params.push(v); } }
    sets.push("updated_at = datetime('now')"); params.push(id);
    await dbRun(`UPDATE solicitudes_cambio SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async cambiarEstado(id: string, estadoNuevo: string, responsableId: string, comentario: string) {
    const current = await dbGet<any>('SELECT estado FROM solicitudes_cambio WHERE id = ?', [id]);
    if (current) {
      await dbRun("UPDATE solicitudes_cambio SET estado = ?, updated_at = datetime('now') WHERE id = ?", [estadoNuevo, id]);
      await dbRun('INSERT INTO historial_cambio_estado (id, solicitud_id, estado_anterior, estado_nuevo, responsable_id, comentario) VALUES (?,?,?,?,?,?)',
        [generateId('hce'), id, current.estado, estadoNuevo, responsableId, comentario]);
    }
  },

  // Actividades
  async getActividades(solicitudId: string) {
    return dbAll('SELECT * FROM actividades_cambio WHERE solicitud_id = ? ORDER BY orden', [solicitudId]);
  },

  async addActividad(data: any): Promise<string> {
    const id = generateId('actc');
    await dbRun('INSERT INTO actividades_cambio (id, solicitud_id, descripcion, responsable_id, fecha_programada, estado, orden) VALUES (?,?,?,?,?,?,?)',
      [id, data.solicitud_id, data.descripcion, data.responsable_id, data.fecha_programada, 'pendiente', data.orden || 0]);
    return id;
  },

  async updateActividad(id: string, data: any) {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id') { sets.push(`${k} = ?`); params.push(v); } }
    params.push(id);
    await dbRun(`UPDATE actividades_cambio SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  // Historial
  async getHistorial(solicitudId: string) {
    return dbAll('SELECT * FROM historial_cambio_estado WHERE solicitud_id = ? ORDER BY fecha ASC', [solicitudId]);
  },
};
