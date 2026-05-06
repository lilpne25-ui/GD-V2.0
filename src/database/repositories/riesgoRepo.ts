// Repositorio de Riesgos y Oportunidades (2.5)
import { dbAll, dbGet, dbRun, generateId } from '../db';

function calcularNivel(prob: number, imp: number): string {
  const val = prob * imp;
  if (val <= 4) return 'bajo';
  if (val <= 9) return 'medio';
  if (val <= 16) return 'alto';
  return 'critico';
}

export const RiesgoRepo = {
  async getAll(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM riesgos WHERE 1=1';
    const params: any[] = [];
    if (filters?.tipo) { sql += ' AND tipo = ?'; params.push(filters.tipo); }
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.proceso_id) { sql += ' AND proceso_id = ?'; params.push(filters.proceso_id); }
    if (filters?.nivel_riesgo) { sql += ' AND nivel_riesgo = ?'; params.push(filters.nivel_riesgo); }
    sql += ' ORDER BY valor_riesgo DESC';
    return dbAll(sql, params);
  },

  async getById(id: string) {
    return dbGet('SELECT * FROM riesgos WHERE id = ?', [id]);
  },

  async create(data: any): Promise<string> {
    const id = generateId('ro');
    const prob = data.probabilidad || 1;
    const imp = data.impacto || 1;
    const valor = prob * imp;
    const nivel = calcularNivel(prob, imp);
    await dbRun(
      `INSERT INTO riesgos (id, codigo, tipo, titulo, descripcion, estado, proceso_id,
       responsable_id, probabilidad, impacto, nivel_riesgo, valor_riesgo,
       plan_mitigacion, plan_contingencia, oportunidad_descripcion, beneficio_esperado,
       objetivos_calidad, fecha_ultima_evaluacion, fecha_proxima_evaluacion)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.tipo || 'riesgo', data.titulo, data.descripcion,
       'identificado', data.proceso_id, data.responsable_id,
       prob, imp, nivel, valor,
       data.plan_mitigacion, data.plan_contingencia,
       data.oportunidad_descripcion, data.beneficio_esperado,
       JSON.stringify(data.objetivos_calidad || []),
       new Date().toISOString(), data.fecha_proxima_evaluacion]
    );
    return id;
  },

  async update(id: string, data: any): Promise<void> {
    // Recalcular nivel si cambia probabilidad o impacto
    if (data.probabilidad !== undefined && data.impacto !== undefined) {
      data.valor_riesgo = data.probabilidad * data.impacto;
      data.nivel_riesgo = calcularNivel(data.probabilidad, data.impacto);
    }
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id' && val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      }
    }
    sets.push("updated_at = datetime('now')");
    params.push(id);
    await dbRun(`UPDATE riesgos SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string): Promise<void> {
    await dbRun('DELETE FROM riesgos WHERE id = ?', [id]);
  },

  // Evaluaciones históricas
  async getEvaluaciones(riesgoId: string) {
    return dbAll('SELECT * FROM riesgo_evaluaciones WHERE riesgo_id = ? ORDER BY fecha DESC', [riesgoId]);
  },

  async addEvaluacion(data: any): Promise<string> {
    const id = generateId('rev');
    const valor = data.probabilidad * data.impacto;
    const nivel = calcularNivel(data.probabilidad, data.impacto);
    await dbRun(
      `INSERT INTO riesgo_evaluaciones (id, riesgo_id, probabilidad, impacto,
       valor_riesgo, nivel_riesgo, observaciones, evaluado_por)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.riesgo_id, data.probabilidad, data.impacto, valor, nivel,
       data.observaciones, data.evaluado_por]
    );
    // Actualizar valores en la tabla principal
    await dbRun(
      `UPDATE riesgos SET probabilidad=?, impacto=?, valor_riesgo=?, nivel_riesgo=?,
       fecha_ultima_evaluacion=datetime('now'), updated_at=datetime('now') WHERE id=?`,
      [data.probabilidad, data.impacto, valor, nivel, data.riesgo_id]
    );
    return id;
  },

  // Acciones de tratamiento
  async getAcciones(riesgoId: string) {
    return dbAll('SELECT * FROM riesgo_acciones WHERE riesgo_id = ? ORDER BY fecha_compromiso', [riesgoId]);
  },

  async addAccion(data: any): Promise<string> {
    const id = generateId('rac');
    await dbRun(
      `INSERT INTO riesgo_acciones (id, riesgo_id, descripcion, responsable_id,
       fecha_compromiso, estado) VALUES (?,?,?,?,?,?)`,
      [id, data.riesgo_id, data.descripcion, data.responsable_id,
       data.fecha_compromiso, 'pendiente']
    );
    return id;
  },

  async updateAccion(id: string, data: any): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id') { sets.push(`${key} = ?`); params.push(val); }
    }
    params.push(id);
    await dbRun(`UPDATE riesgo_acciones SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  // Datos para mapa de calor
  async getMapaCalor() {
    return dbAll(`SELECT probabilidad, impacto, nivel_riesgo, COUNT(*) as total,
      GROUP_CONCAT(titulo, '||') as titulos
      FROM riesgos WHERE tipo = 'riesgo' AND estado != 'cerrado'
      GROUP BY probabilidad, impacto`);
  },

  async count(tipo?: string): Promise<number> {
    const sql = tipo
      ? 'SELECT COUNT(*) as total FROM riesgos WHERE tipo = ?'
      : 'SELECT COUNT(*) as total FROM riesgos';
    const row = await dbGet<{ total: number }>(sql, tipo ? [tipo] : []);
    return row?.total || 0;
  },

  async countByNivel() {
    return dbAll("SELECT nivel_riesgo, COUNT(*) as total FROM riesgos WHERE estado != 'cerrado' GROUP BY nivel_riesgo");
  },
};
