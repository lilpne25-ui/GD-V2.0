// Repositorio de No Conformidades (2.3)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const NCRepo = {
  async getAll(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM no_conformidades WHERE 1=1';
    const params: any[] = [];
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.clasificacion) { sql += ' AND clasificacion = ?'; params.push(filters.clasificacion); }
    if (filters?.origen) { sql += ' AND origen = ?'; params.push(filters.origen); }
    if (filters?.proceso_id) { sql += ' AND proceso_id = ?'; params.push(filters.proceso_id); }
    sql += ' ORDER BY fecha_deteccion DESC';
    return dbAll(sql, params);
  },

  async getById(id: string) {
    return dbGet('SELECT * FROM no_conformidades WHERE id = ?', [id]);
  },

  async create(data: any): Promise<string> {
    const id = generateId('nc');
    await dbRun(
      `INSERT INTO no_conformidades (id, codigo, titulo, descripcion, origen, clasificacion, estado,
       proceso_id, responsable_id, detectado_por, fecha_deteccion, fecha_limite)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.titulo, data.descripcion, data.origen, data.clasificacion,
       'abierta', data.proceso_id, data.responsable_id, data.detectado_por,
       data.fecha_deteccion || new Date().toISOString(), data.fecha_limite]
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
    await dbRun(`UPDATE no_conformidades SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string): Promise<void> {
    await dbRun('DELETE FROM no_conformidades WHERE id = ?', [id]);
  },

  // Análisis 5 Porqués
  async save5Porques(ncId: string, data: any): Promise<void> {
    const existing = await dbGet('SELECT id FROM analisis_5porques WHERE nc_id = ?', [ncId]);
    if (existing) {
      await dbRun(
        `UPDATE analisis_5porques SET porque1=?, porque2=?, porque3=?, porque4=?, porque5=?,
         causa_raiz_identificada=? WHERE nc_id=?`,
        [data.porque1, data.porque2, data.porque3, data.porque4, data.porque5,
         data.causa_raiz_identificada, ncId]
      );
    } else {
      await dbRun(
        `INSERT INTO analisis_5porques (id, nc_id, porque1, porque2, porque3, porque4, porque5,
         causa_raiz_identificada) VALUES (?,?,?,?,?,?,?,?)`,
        [generateId('5p'), ncId, data.porque1, data.porque2, data.porque3,
         data.porque4, data.porque5, data.causa_raiz_identificada]
      );
    }
  },

  async get5Porques(ncId: string) {
    return dbGet('SELECT * FROM analisis_5porques WHERE nc_id = ?', [ncId]);
  },

  // Análisis Ishikawa
  async saveIshikawa(ncId: string, data: any): Promise<void> {
    const existing = await dbGet('SELECT id FROM analisis_ishikawa WHERE nc_id = ?', [ncId]);
    if (existing) {
      await dbRun(
        `UPDATE analisis_ishikawa SET mano_obra=?, maquinaria=?, material=?, metodo=?,
         medio_ambiente=?, medicion=?, causa_raiz_identificada=? WHERE nc_id=?`,
        [JSON.stringify(data.mano_obra), JSON.stringify(data.maquinaria),
         JSON.stringify(data.material), JSON.stringify(data.metodo),
         JSON.stringify(data.medio_ambiente), JSON.stringify(data.medicion),
         data.causa_raiz_identificada, ncId]
      );
    } else {
      await dbRun(
        `INSERT INTO analisis_ishikawa (id, nc_id, mano_obra, maquinaria, material, metodo,
         medio_ambiente, medicion, causa_raiz_identificada) VALUES (?,?,?,?,?,?,?,?,?)`,
        [generateId('ish'), ncId, JSON.stringify(data.mano_obra), JSON.stringify(data.maquinaria),
         JSON.stringify(data.material), JSON.stringify(data.metodo),
         JSON.stringify(data.medio_ambiente), JSON.stringify(data.medicion),
         data.causa_raiz_identificada]
      );
    }
  },

  async count(estado?: string): Promise<number> {
    const sql = estado
      ? 'SELECT COUNT(*) as total FROM no_conformidades WHERE estado = ?'
      : 'SELECT COUNT(*) as total FROM no_conformidades';
    const row = await dbGet<{ total: number }>(sql, estado ? [estado] : []);
    return row?.total || 0;
  },

  async countByOrigen() {
    return dbAll('SELECT origen, COUNT(*) as total FROM no_conformidades GROUP BY origen');
  },

  async countByProceso() {
    return dbAll(`SELECT p.nombre as proceso, COUNT(*) as total FROM no_conformidades nc
      LEFT JOIN procesos p ON nc.proceso_id = p.id GROUP BY nc.proceso_id`);
  },
};
