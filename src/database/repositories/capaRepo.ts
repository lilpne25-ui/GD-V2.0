// Repositorio de CAPA (2.4)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const CAPARepo = {
  async getAll(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM capas WHERE 1=1';
    const params: any[] = [];
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.tipo) { sql += ' AND tipo = ?'; params.push(filters.tipo); }
    if (filters?.proceso_id) { sql += ' AND proceso_id = ?'; params.push(filters.proceso_id); }
    if (filters?.vencidas) {
      sql += " AND fecha_compromiso_implementacion < datetime('now') AND estado NOT IN ('cerrada_eficaz','cerrada_no_eficaz','cancelada')";
    }
    sql += ' ORDER BY fecha_apertura DESC';
    return dbAll(sql, params);
  },

  async getById(id: string) {
    return dbGet('SELECT * FROM capas WHERE id = ?', [id]);
  },

  async create(data: any): Promise<string> {
    const id = generateId('capa');
    await dbRun(
      `INSERT INTO capas (id, codigo, titulo, descripcion, tipo, estado, proceso_id,
       responsable_id, fecha_apertura, fecha_compromiso_implementacion, nc_id,
       auditoria_id, origen_descripcion, plan_accion, recursos_necesarios)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.titulo, data.descripcion, data.tipo, 'abierta',
       data.proceso_id, data.responsable_id, data.fecha_apertura || new Date().toISOString(),
       data.fecha_compromiso_implementacion, data.nc_id, data.auditoria_id,
       data.origen_descripcion, data.plan_accion, data.recursos_necesarios]
    );
    return id;
  },

  async update(id: string, data: any): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id' && val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }
    sets.push("updated_at = datetime('now')");
    params.push(id);
    await dbRun(`UPDATE capas SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string): Promise<void> {
    await dbRun('DELETE FROM capas WHERE id = ?', [id]);
  },

  // Actividades del plan de acción
  async getActividades(capaId: string) {
    return dbAll('SELECT * FROM capa_actividades WHERE capa_id = ? ORDER BY orden', [capaId]);
  },

  async addActividad(data: any): Promise<string> {
    const id = generateId('act');
    await dbRun(
      `INSERT INTO capa_actividades (id, capa_id, descripcion, responsable_id,
       fecha_compromiso, estado, orden) VALUES (?,?,?,?,?,?,?)`,
      [id, data.capa_id, data.descripcion, data.responsable_id,
       data.fecha_compromiso, 'pendiente', data.orden || 0]
    );
    return id;
  },

  async updateActividad(id: string, data: any): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id') { sets.push(`${key} = ?`); params.push(val); }
    }
    params.push(id);
    await dbRun(`UPDATE capa_actividades SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  // Seguimientos
  async getSeguimientos(capaId: string) {
    return dbAll('SELECT * FROM capa_seguimientos WHERE capa_id = ? ORDER BY fecha DESC', [capaId]);
  },

  async addSeguimiento(data: any): Promise<string> {
    const id = generateId('seg');
    await dbRun(
      `INSERT INTO capa_seguimientos (id, capa_id, descripcion, porcentaje_avance, registrado_por)
       VALUES (?,?,?,?,?)`,
      [id, data.capa_id, data.descripcion, data.porcentaje_avance, data.registrado_por]
    );
    // Actualizar avance en la CAPA principal
    await dbRun("UPDATE capas SET porcentaje_avance = ?, updated_at = datetime('now') WHERE id = ?",
      [data.porcentaje_avance, data.capa_id]);
    return id;
  },

  async count(estado?: string): Promise<number> {
    const sql = estado
      ? 'SELECT COUNT(*) as total FROM capas WHERE estado = ?'
      : 'SELECT COUNT(*) as total FROM capas';
    const row = await dbGet<{ total: number }>(sql, estado ? [estado] : []);
    return row?.total || 0;
  },

  async countVencidas(): Promise<number> {
    const row = await dbGet<{ total: number }>(
      `SELECT COUNT(*) as total FROM capas
       WHERE fecha_compromiso_implementacion < datetime('now')
       AND estado NOT IN ('cerrada_eficaz','cerrada_no_eficaz','cancelada')`
    );
    return row?.total || 0;
  },
};
