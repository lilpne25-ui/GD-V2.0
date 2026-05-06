// Repositorio de Indicadores (2.6)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const IndicadorRepo = {
  async getAll(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM indicadores WHERE 1=1';
    const params: any[] = [];
    if (filters?.proceso_id) { sql += ' AND proceso_id = ?'; params.push(filters.proceso_id); }
    if (filters?.frecuencia) { sql += ' AND frecuencia = ?'; params.push(filters.frecuencia); }
    if (filters?.activo !== undefined) { sql += ' AND activo = ?'; params.push(filters.activo ? 1 : 0); }
    sql += ' ORDER BY codigo ASC';
    return dbAll(sql, params);
  },

  async getById(id: string) { return dbGet('SELECT * FROM indicadores WHERE id = ?', [id]); },

  async create(data: any): Promise<string> {
    const id = generateId('ind');
    await dbRun(
      `INSERT INTO indicadores (id, codigo, nombre, descripcion, proceso_id, responsable_id,
       formula, unidad, fuente_datos, frecuencia, tendencia_deseada, meta,
       limite_inferior, limite_superior, linea_base, tipo_grafico, objetivo_calidad)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.nombre, data.descripcion, data.proceso_id, data.responsable_id,
       data.formula, data.unidad, data.fuente_datos, data.frecuencia, data.tendencia_deseada,
       data.meta, data.limite_inferior, data.limite_superior, data.linea_base,
       data.tipo_grafico, data.objetivo_calidad]
    );
    return id;
  },

  async update(id: string, data: any): Promise<void> {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id' && v !== undefined) { sets.push(`${k} = ?`); params.push(v); } }
    sets.push("updated_at = datetime('now')"); params.push(id);
    await dbRun(`UPDATE indicadores SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string) { await dbRun('DELETE FROM indicadores WHERE id = ?', [id]); },

  // Mediciones
  async getMediciones(indicadorId: string) {
    return dbAll('SELECT * FROM mediciones_indicador WHERE indicador_id = ? ORDER BY periodo DESC', [indicadorId]);
  },

  async addMedicion(data: any): Promise<string> {
    const id = generateId('med');
    await dbRun(
      `INSERT INTO mediciones_indicador (id, indicador_id, periodo, valor, meta, semaforo, observaciones, registrado_por)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.indicador_id, data.periodo, data.valor, data.meta, data.semaforo, data.observaciones, data.registrado_por]
    );
    return id;
  },

  // Objetivos
  async getObjetivos() { return dbAll('SELECT * FROM objetivos_calidad ORDER BY codigo', []); },

  async createObjetivo(data: any): Promise<string> {
    const id = generateId('obj');
    await dbRun(
      `INSERT INTO objetivos_calidad (id, codigo, descripcion, meta, plazo, responsable_id, proceso_id) VALUES (?,?,?,?,?,?,?)`,
      [id, data.codigo, data.descripcion, data.meta, data.plazo, data.responsable_id, data.proceso_id]
    );
    return id;
  },

  async updateObjetivo(id: string, data: any) {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id') { sets.push(`${k} = ?`); params.push(v); } }
    sets.push("updated_at = datetime('now')"); params.push(id);
    await dbRun(`UPDATE objetivos_calidad SET ${sets.join(', ')} WHERE id = ?`, params);
  },
};
