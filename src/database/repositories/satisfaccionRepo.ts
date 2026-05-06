// Repositorio de Satisfacción del Cliente (2.10)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const SatisfaccionRepo = {
  // Encuestas
  async getEncuestas(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM encuestas WHERE 1=1';
    const params: any[] = [];
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    sql += ' ORDER BY fecha_inicio DESC';
    return dbAll(sql, params);
  },

  async getEncuestaById(id: string) { return dbGet('SELECT * FROM encuestas WHERE id = ?', [id]); },

  async createEncuesta(data: any): Promise<string> {
    const id = generateId('enc');
    await dbRun('INSERT INTO encuestas (id, codigo, titulo, descripcion, estado, fecha_inicio, fecha_fin) VALUES (?,?,?,?,?,?,?)',
      [id, data.codigo, data.titulo, data.descripcion, data.estado || 'borrador', data.fecha_inicio, data.fecha_fin]);
    return id;
  },

  async updateEncuesta(id: string, data: any) {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id' && v !== undefined) { sets.push(`${k} = ?`); params.push(v); } }
    sets.push("updated_at = datetime('now')"); params.push(id);
    await dbRun(`UPDATE encuestas SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  // Preguntas
  async getPreguntas(encuestaId: string) {
    return dbAll('SELECT * FROM preguntas_encuesta WHERE encuesta_id = ? ORDER BY orden', [encuestaId]);
  },

  async addPregunta(data: any): Promise<string> {
    const id = generateId('preg');
    await dbRun(
      'INSERT INTO preguntas_encuesta (id, encuesta_id, texto, tipo, opciones, escala_min, escala_max, orden, obligatoria) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, data.encuesta_id, data.texto, data.tipo, JSON.stringify(data.opciones || []),
       data.escala_min || 1, data.escala_max || 10, data.orden || 0, data.obligatoria ? 1 : 0]);
    return id;
  },

  // Respuestas
  async getRespuestas(encuestaId: string) {
    return dbAll('SELECT * FROM respuestas_encuesta WHERE encuesta_id = ? ORDER BY fecha DESC', [encuestaId]);
  },

  async addRespuesta(data: any): Promise<string> {
    const id = generateId('resp');
    await dbRun(
      'INSERT INTO respuestas_encuesta (id, encuesta_id, cliente_id, cliente_nombre, comentario_general, satisfaccion_global) VALUES (?,?,?,?,?,?)',
      [id, data.encuesta_id, data.cliente_id, data.cliente_nombre, data.comentario_general, data.satisfaccion_global]);
    return id;
  },

  async addRespuestaPregunta(data: any): Promise<string> {
    const id = generateId('rp');
    await dbRun('INSERT INTO respuestas_pregunta (id, respuesta_encuesta_id, pregunta_id, valor) VALUES (?,?,?,?)',
      [id, data.respuesta_encuesta_id, data.pregunta_id, String(data.valor)]);
    return id;
  },

  // Quejas
  async getQuejas(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM quejas_cliente WHERE 1=1';
    const params: any[] = [];
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.tipo) { sql += ' AND tipo = ?'; params.push(filters.tipo); }
    sql += ' ORDER BY fecha DESC';
    return dbAll(sql, params);
  },

  async getQuejaById(id: string) { return dbGet('SELECT * FROM quejas_cliente WHERE id = ?', [id]); },

  async createQueja(data: any): Promise<string> {
    const id = generateId('qc');
    await dbRun(
      `INSERT INTO quejas_cliente (id, codigo, tipo, cliente, fecha, descripcion, producto, estado, responsable_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.tipo, data.cliente, data.fecha || new Date().toISOString(),
       data.descripcion, data.producto, 'recibida', data.responsable_id]);
    return id;
  },

  async updateQueja(id: string, data: any) {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id' && v !== undefined) { sets.push(`${k} = ?`); params.push(v); } }
    sets.push("updated_at = datetime('now')"); params.push(id);
    await dbRun(`UPDATE quejas_cliente SET ${sets.join(', ')} WHERE id = ?`, params);
  },
};
