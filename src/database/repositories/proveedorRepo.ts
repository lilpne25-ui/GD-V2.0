// Repositorio de Proveedores (2.7)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export const ProveedorRepo = {
  async getAll(filters?: Record<string, any>) {
    let sql = 'SELECT * FROM proveedores WHERE activo = 1';
    const params: any[] = [];
    if (filters?.estatus) { sql += ' AND estatus = ?'; params.push(filters.estatus); }
    if (filters?.categoria) { sql += ' AND categoria = ?'; params.push(filters.categoria); }
    if (filters?.search) { sql += ' AND (razon_social LIKE ? OR nombre_comercial LIKE ? OR codigo LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s); }
    sql += ' ORDER BY razon_social ASC';
    return dbAll(sql, params);
  },

  async getById(id: string) { return dbGet('SELECT * FROM proveedores WHERE id = ?', [id]); },

  async create(data: any): Promise<string> {
    const id = generateId('prov');
    await dbRun(
      `INSERT INTO proveedores (id, codigo, razon_social, nombre_comercial, rfc, contacto,
       telefono, email, direccion, producto_servicio, categoria, estatus)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.razon_social, data.nombre_comercial, data.rfc, data.contacto,
       data.telefono, data.email, data.direccion, data.producto_servicio, data.categoria,
       data.estatus || 'en_evaluacion']
    );
    return id;
  },

  async update(id: string, data: any): Promise<void> {
    const sets: string[] = []; const params: any[] = [];
    for (const [k, v] of Object.entries(data)) { if (k !== 'id' && v !== undefined) { sets.push(`${k} = ?`); params.push(v); } }
    sets.push("updated_at = datetime('now')"); params.push(id);
    await dbRun(`UPDATE proveedores SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string) { await dbRun("UPDATE proveedores SET activo = 0, updated_at = datetime('now') WHERE id = ?", [id]); },

  // Evaluaciones
  async getEvaluaciones(proveedorId: string) {
    return dbAll('SELECT * FROM evaluaciones_proveedor WHERE proveedor_id = ? ORDER BY fecha DESC', [proveedorId]);
  },

  async addEvaluacion(data: any): Promise<string> {
    const id = generateId('evprov');
    await dbRun(
      `INSERT INTO evaluaciones_proveedor (id, proveedor_id, periodo, fecha, evaluador_id, calificacion_global, resultado, observaciones)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.proveedor_id, data.periodo, data.fecha || new Date().toISOString(), data.evaluador_id,
       data.calificacion_global, data.resultado, data.observaciones]
    );
    return id;
  },

  async getCriterios(evaluacionId: string) {
    return dbAll('SELECT * FROM criterios_evaluacion_prov WHERE evaluacion_id = ?', [evaluacionId]);
  },

  async addCriterio(data: any): Promise<string> {
    const id = generateId('crit');
    await dbRun(
      `INSERT INTO criterios_evaluacion_prov (id, evaluacion_id, criterio, peso, calificacion, ponderado, evidencia)
       VALUES (?,?,?,?,?,?,?)`,
      [id, data.evaluacion_id, data.criterio, data.peso, data.calificacion, data.ponderado, data.evidencia]
    );
    return id;
  },

  // Incidencias
  async getIncidencias(proveedorId: string) {
    return dbAll('SELECT * FROM incidencias_proveedor WHERE proveedor_id = ? ORDER BY fecha DESC', [proveedorId]);
  },

  async addIncidencia(data: any): Promise<string> {
    const id = generateId('inc');
    await dbRun(
      `INSERT INTO incidencias_proveedor (id, proveedor_id, fecha, tipo, descripcion, impacto, accion_tomada, registrado_por)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.proveedor_id, data.fecha || new Date().toISOString(), data.tipo, data.descripcion,
       data.impacto, data.accion_tomada, data.registrado_por]
    );
    return id;
  },
};
