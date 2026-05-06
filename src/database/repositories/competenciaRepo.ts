// Repositorio de Competencias y Capacitación (2.9)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const CompetenciaRepo = {
  // Competencias catálogo
  async getCompetencias() { return dbAll('SELECT * FROM competencias ORDER BY categoria, nombre', []); },

  async createCompetencia(data: any): Promise<string> {
    const id = generateId('comp');
    await dbRun('INSERT INTO competencias (id, nombre, descripcion, categoria, nivel_requerido, vigencia_meses) VALUES (?,?,?,?,?,?)',
      [id, data.nombre, data.descripcion, data.categoria, data.nivel_requerido, data.vigencia_meses]);
    return id;
  },

  // Puestos
  async getPuestos() { return dbAll('SELECT * FROM puestos_competencia ORDER BY puesto', []); },

  async createPuesto(data: any): Promise<string> {
    const id = generateId('puesto');
    await dbRun('INSERT INTO puestos_competencia (id, puesto, proceso_id) VALUES (?,?,?)', [id, data.puesto, data.proceso_id]);
    return id;
  },

  // Personal con competencias
  async getPersonal(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM personal_competencia WHERE 1=1';
    const params: any[] = [];
    if (filters?.departamento) { sql += ' AND departamento = ?'; params.push(filters.departamento); }
    if (filters?.puesto) { sql += ' AND puesto = ?'; params.push(filters.puesto); }
    if (filters?.con_brechas) { sql += ' AND brechas > 0'; }
    sql += ' ORDER BY personal_nombre ASC';
    return dbAll(sql, params);
  },

  async getPersonalById(id: string) { return dbGet('SELECT * FROM personal_competencia WHERE id = ?', [id]); },

  async createPersonal(data: any): Promise<string> {
    const id = generateId('percomp');
    await dbRun('INSERT INTO personal_competencia (id, personal_id, personal_nombre, puesto, departamento) VALUES (?,?,?,?,?)',
      [id, data.personal_id, data.personal_nombre, data.puesto, data.departamento]);
    return id;
  },

  // Evaluaciones individuales
  async getEvaluaciones(personalCompId: string) {
    return dbAll('SELECT * FROM evaluaciones_competencia WHERE personal_comp_id = ? ORDER BY competencia_id', [personalCompId]);
  },

  async addEvaluacion(data: any): Promise<string> {
    const id = generateId('evcomp');
    await dbRun(
      `INSERT INTO evaluaciones_competencia (id, personal_comp_id, competencia_id, nivel_requerido, nivel_actual, estado, fecha_evaluacion, fecha_vencimiento, evidencia, evaluado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, data.personal_comp_id, data.competencia_id, data.nivel_requerido, data.nivel_actual,
       data.estado, data.fecha_evaluacion, data.fecha_vencimiento, data.evidencia, data.evaluado_por]);
    return id;
  },

  async updateEvaluacion(id: string, data: any) {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id') { sets.push(`${k} = ?`); params.push(v); } }
    params.push(id);
    await dbRun(`UPDATE evaluaciones_competencia SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  // Capacitaciones
  async getCapacitaciones(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM capacitaciones WHERE 1=1';
    const params: any[] = [];
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.tipo) { sql += ' AND tipo = ?'; params.push(filters.tipo); }
    sql += ' ORDER BY fecha DESC';
    return dbAll(sql, params);
  },

  async createCapacitacion(data: any): Promise<string> {
    const id = generateId('cap');
    await dbRun(
      `INSERT INTO capacitaciones (id, codigo, titulo, descripcion, tipo, instructor, fecha, duracion_horas, lugar, estado)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.titulo, data.descripcion, data.tipo, data.instructor,
       data.fecha, data.duracion_horas, data.lugar, data.estado || 'programada']);
    return id;
  },

  async updateCapacitacion(id: string, data: any) {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id' && v !== undefined) { sets.push(`${k} = ?`); params.push(v); } }
    sets.push("updated_at = datetime('now')"); params.push(id);
    await dbRun(`UPDATE capacitaciones SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  // Participantes
  async getParticipantes(capacitacionId: string) {
    return dbAll('SELECT * FROM participantes_capacitacion WHERE capacitacion_id = ? ORDER BY nombre', [capacitacionId]);
  },

  async addParticipante(data: any): Promise<string> {
    const id = generateId('part');
    await dbRun('INSERT INTO participantes_capacitacion (id, capacitacion_id, personal_id, nombre, asistio, calificacion, observaciones) VALUES (?,?,?,?,?,?,?)',
      [id, data.capacitacion_id, data.personal_id, data.nombre, data.asistio ? 1 : 0, data.calificacion, data.observaciones]);
    return id;
  },

  // Planes
  async getPlanes() { return dbAll('SELECT * FROM planes_capacitacion ORDER BY anio DESC', []); },

  async createPlan(data: any): Promise<string> {
    const id = generateId('plan');
    await dbRun('INSERT INTO planes_capacitacion (id, anio, titulo, estado) VALUES (?,?,?,?)',
      [id, data.anio, data.titulo, data.estado || 'borrador']);
    return id;
  },
};
