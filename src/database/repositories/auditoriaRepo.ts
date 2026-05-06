// Repositorio de Auditorías (2.2)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const AuditoriaRepo = {
  // --- Programas ---
  async getProgramas() {
    return dbAll('SELECT * FROM programas_auditoria ORDER BY anio DESC');
  },
  async createPrograma(data: any): Promise<string> {
    const id = generateId('prog');
    await dbRun(
      'INSERT INTO programas_auditoria (id, anio, nombre, objetivo, alcance) VALUES (?,?,?,?,?)',
      [id, data.anio, data.nombre, data.objetivo, data.alcance]
    );
    return id;
  },

  // --- Auditorías ---
  async getAll(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM auditorias WHERE 1=1';
    const params: any[] = [];
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.tipo) { sql += ' AND tipo = ?'; params.push(filters.tipo); }
    if (filters?.programa_id) { sql += ' AND programa_id = ?'; params.push(filters.programa_id); }
    sql += ' ORDER BY fecha_programada DESC';
    return dbAll(sql, params);
  },

  async getById(id: string) {
    return dbGet('SELECT * FROM auditorias WHERE id = ?', [id]);
  },

  async create(data: any): Promise<string> {
    const id = generateId('aud');
    await dbRun(
      `INSERT INTO auditorias (id, programa_id, codigo, tipo, estado, objetivo, alcance, criterios,
       fecha_programada, auditor_lider_id, equipo_auditor, procesos_auditados)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.programa_id, data.codigo, data.tipo || 'interna', 'programada',
       data.objetivo, data.alcance, data.criterios, data.fecha_programada,
       data.auditor_lider_id, JSON.stringify(data.equipo_auditor || []),
       JSON.stringify(data.procesos_auditados || [])]
    );
    return id;
  },

  async update(id: string, data: any): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id' && val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(typeof val === 'object' ? JSON.stringify(val) : val);
      }
    }
    sets.push("updated_at = datetime('now')");
    params.push(id);
    await dbRun(`UPDATE auditorias SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string): Promise<void> {
    await dbRun('DELETE FROM auditorias WHERE id = ?', [id]);
  },

  // --- Checklist ---
  async getChecklist(auditoriaId: string) {
    return dbAll('SELECT * FROM checklist_items WHERE auditoria_id = ? ORDER BY orden', [auditoriaId]);
  },

  async addChecklistItem(data: any): Promise<string> {
    const id = generateId('chk');
    await dbRun(
      'INSERT INTO checklist_items (id, auditoria_id, clausula, proceso_id, pregunta, orden) VALUES (?,?,?,?,?,?)',
      [id, data.auditoria_id, data.clausula, data.proceso_id, data.pregunta, data.orden || 0]
    );
    return id;
  },

  async updateChecklistItem(id: string, data: any): Promise<void> {
    await dbRun(
      'UPDATE checklist_items SET cumple = ?, evidencia_objetiva = ?, notas_campo = ? WHERE id = ?',
      [data.cumple, data.evidencia_objetiva, data.notas_campo, id]
    );
  },

  // --- Hallazgos ---
  async getHallazgos(auditoriaId: string) {
    return dbAll('SELECT * FROM hallazgos WHERE auditoria_id = ? ORDER BY created_at DESC', [auditoriaId]);
  },

  async addHallazgo(data: any): Promise<string> {
    const id = generateId('hal');
    await dbRun(
      `INSERT INTO hallazgos (id, auditoria_id, checklist_item_id, clasificacion,
       clausula_referencia, descripcion, evidencia, proceso_id, responsable_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, data.auditoria_id, data.checklist_item_id, data.clasificacion,
       data.clausula_referencia, data.descripcion, data.evidencia,
       data.proceso_id, data.responsable_id]
    );
    return id;
  },

  async count(estado?: string): Promise<number> {
    const sql = estado
      ? 'SELECT COUNT(*) as total FROM auditorias WHERE estado = ?'
      : 'SELECT COUNT(*) as total FROM auditorias';
    const row = await dbGet<{ total: number }>(sql, estado ? [estado] : []);
    return row?.total || 0;
  },
};
