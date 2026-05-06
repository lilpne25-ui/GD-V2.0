// Repositorio de Documentos (2.1)
import { dbAll, dbGet, dbRun, generateId } from '../db';

export interface DocumentoRow {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  origen: string;
  estado: string;
  version: number;
  version_texto: string;
  departamento_id: string;
  proceso_id: string;
  responsable_id: string;
  descripcion: string;
  ruta_archivo: string;
  fecha_emision: string;
  fecha_vigencia: string;
  fecha_proxima_revision: string;
  tags: string;
  elaboro_id: string;
  elaboro_fecha: string;
  reviso_id: string;
  reviso_fecha: string;
  aprobo_id: string;
  aprobo_fecha: string;
  created_at: string;
  updated_at: string;
}

export const DocumentoRepo = {
  async getAll(filters?: Record<string, any>): Promise<DocumentoRow[]> {
    let sql = 'SELECT * FROM documentos WHERE 1=1';
    const params: any[] = [];
    if (filters?.estado) { sql += ' AND estado = ?'; params.push(filters.estado); }
    if (filters?.tipo) { sql += ' AND tipo = ?'; params.push(filters.tipo); }
    if (filters?.proceso_id) { sql += ' AND proceso_id = ?'; params.push(filters.proceso_id); }
    if (filters?.nombre) { sql += ' AND nombre LIKE ?'; params.push(`%${filters.nombre}%`); }
    sql += ' ORDER BY updated_at DESC';
    return dbAll<DocumentoRow>(sql, params);
  },

  async getById(id: string): Promise<DocumentoRow | undefined> {
    return dbGet<DocumentoRow>('SELECT * FROM documentos WHERE id = ?', [id]);
  },

  async create(data: Partial<DocumentoRow>): Promise<string> {
    const id = generateId('doc');
    await dbRun(
      `INSERT INTO documentos (id, codigo, nombre, tipo, origen, estado, version, version_texto,
       departamento_id, proceso_id, responsable_id, descripcion, fecha_emision, fecha_vigencia,
       fecha_proxima_revision, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.codigo, data.nombre, data.tipo, data.origen || 'interno', 'borrador', 1, '1.0',
       data.departamento_id, data.proceso_id, data.responsable_id, data.descripcion,
       new Date().toISOString(), data.fecha_vigencia, data.fecha_proxima_revision,
       JSON.stringify(data.tags || [])]
    );
    return id;
  },

  async update(id: string, data: Partial<DocumentoRow>): Promise<void> {
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
    await dbRun(`UPDATE documentos SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async delete(id: string): Promise<void> {
    await dbRun('DELETE FROM documentos WHERE id = ?', [id]);
  },

  async updateEstado(id: string, estado: string): Promise<void> {
    await dbRun("UPDATE documentos SET estado = ?, updated_at = datetime('now') WHERE id = ?", [estado, id]);
  },

  async getVersiones(documentoId: string) {
    return dbAll('SELECT * FROM documento_versiones WHERE documento_id = ? ORDER BY version DESC', [documentoId]);
  },

  async addVersion(documentoId: string, cambios: string, creadoPor: string): Promise<void> {
    const doc = await DocumentoRepo.getById(documentoId);
    if (!doc) return;
    const newVersion = doc.version + 1;
    const versionTexto = `${newVersion}.0`;
    await dbRun(
      'INSERT INTO documento_versiones (id, documento_id, version, version_texto, cambios, creado_por) VALUES (?,?,?,?,?,?)',
      [generateId('dv'), documentoId, newVersion, versionTexto, cambios, creadoPor]
    );
    await dbRun("UPDATE documentos SET version = ?, version_texto = ?, updated_at = datetime('now') WHERE id = ?",
      [newVersion, versionTexto, documentoId]);
  },

  async count(estado?: string): Promise<number> {
    const sql = estado
      ? 'SELECT COUNT(*) as total FROM documentos WHERE estado = ?'
      : 'SELECT COUNT(*) as total FROM documentos';
    const row = await dbGet<{ total: number }>(sql, estado ? [estado] : []);
    return row?.total || 0;
  },
};
