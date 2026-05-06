// Repositorio de Revisión por la Dirección (2.8)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const RevisionDireccionRepo = {
  async getAll(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM revisiones_direccion WHERE 1=1';
    const params: any[] = [];
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.anio) { sql += ' AND strftime("%Y", fecha) = ?'; params.push(String(filters.anio)); }
    sql += ' ORDER BY fecha DESC';
    return dbAll(sql, params);
  },

  async getById(id: string) { return dbGet('SELECT * FROM revisiones_direccion WHERE id = ?', [id]); },

  async create(data: any): Promise<string> {
    const id = generateId('rd');
    await dbRun(
      `INSERT INTO revisiones_direccion (id, codigo, titulo, fecha, hora_inicio, hora_fin, estado, convocado_por, lugar)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.titulo, data.fecha, data.hora_inicio, data.hora_fin, data.estado || 'programada', data.convocado_por, data.lugar]
    );
    return id;
  },

  async update(id: string, data: any): Promise<void> {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id' && v !== undefined) { sets.push(`${k} = ?`); params.push(v); } }
    sets.push("updated_at = datetime('now')"); params.push(id);
    await dbRun(`UPDATE revisiones_direccion SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string) { await dbRun('DELETE FROM revisiones_direccion WHERE id = ?', [id]); },

  // Entradas
  async getEntradas(revisionId: string) { return dbAll('SELECT * FROM entradas_revision WHERE revision_id = ?', [revisionId]); },

  async addEntrada(data: any): Promise<string> {
    const id = generateId('ent');
    await dbRun('INSERT INTO entradas_revision (id, revision_id, tema, resumen, datos) VALUES (?,?,?,?,?)',
      [id, data.revision_id, data.tema, data.resumen, data.datos]);
    return id;
  },

  // Salidas
  async getSalidas(revisionId: string) { return dbAll('SELECT * FROM salidas_revision WHERE revision_id = ?', [revisionId]); },

  async addSalida(data: any): Promise<string> {
    const id = generateId('sal');
    await dbRun(
      'INSERT INTO salidas_revision (id, revision_id, tipo, descripcion, responsable_id, fecha_compromiso) VALUES (?,?,?,?,?,?)',
      [id, data.revision_id, data.tipo, data.descripcion, data.responsable_id, data.fecha_compromiso]);
    return id;
  },

  async updateSalida(id: string, data: any) {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id') { sets.push(`${k} = ?`); params.push(v); } }
    params.push(id);
    await dbRun(`UPDATE salidas_revision SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  // Asistentes
  async getAsistentes(revisionId: string) { return dbAll('SELECT * FROM asistentes_revision WHERE revision_id = ?', [revisionId]); },

  async addAsistente(data: any): Promise<string> {
    const id = generateId('ast');
    await dbRun('INSERT INTO asistentes_revision (id, revision_id, nombre, cargo, presente) VALUES (?,?,?,?,?)',
      [id, data.revision_id, data.nombre, data.cargo, data.presente ? 1 : 0]);
    return id;
  },
};
