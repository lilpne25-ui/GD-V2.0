import { dbAll, dbGet } from '../db';

type RepoFilters = {
  startDate?: string;
  endDate?: string;
  employeeQuery?: string;
  department?: string;
  limit?: number;
};

type SourceMeta = {
  schemaName: string;
  objectName: string;
  objectType: string;
};

type ColumnRow = { column_name: string };

type AttendanceRow = {
  row_date: string;
  employee_id: string;
  employee_name: string;
  department: string;
  position: string;
  supervisor: string;
  shift: string;
  first_in: string;
  lunch_out: string;
  lunch_in: string;
  last_out: string;
  scheduled_start: string;
  worked_minutes: string;
  overtime_minutes: string;
  overtime_double_minutes: string;
  overtime_triple_minutes: string;
  late_minutes: string;
  tolerance_minutes: string;
  justification: string;
  notes: string;
  authorized_by: string;
  late_type: string;
};

type SourceStatus = {
  enabled: boolean;
  source: string;
  schemaName?: string;
  objectName?: string;
  objectType?: string;
  warning?: string;
};

const DEFAULT_SOURCE = 'dbo.vw_asistencia_reportes';

const CANDIDATE_COLUMNS: Record<keyof AttendanceRow, string[]> = {
  row_date: ['work_date', 'fecha', 'date', 'dia'],
  employee_id: ['employee_id', 'empleado_id', 'userid', 'no_empleado', 'num_empleado', 'id_empleado'],
  employee_name: ['employee_name', 'empleado', 'nombre_empleado', 'nombre', 'full_name'],
  department: ['department', 'depto', 'departamento', 'area'],
  position: ['position', 'puesto', 'cargo'],
  supervisor: ['supervisor', 'jefe', 'supervisor_nombre'],
  shift: ['shift', 'turno', 'jornada'],
  first_in: ['first_in', 'entrada', 'hora_entrada', 'check_in', 'entrada_1'],
  lunch_out: ['lunch_out', 'salida_comer', 'salida_comida', 'hora_salida_comer'],
  lunch_in: ['lunch_in', 'entrada_comer', 'entrada_comida', 'hora_entrada_comer'],
  last_out: ['last_out', 'salida', 'hora_salida', 'check_out', 'salida_1'],
  scheduled_start: ['scheduled_start', 'hora_programada', 'hora_entrada_programada', 'jornada_inicio', 'horario_entrada'],
  worked_minutes: ['worked_minutes', 'minutos_trabajados', 'horas_trabajadas_min'],
  overtime_minutes: ['overtime_minutes', 'minutos_extra', 'he_minutos'],
  overtime_double_minutes: ['overtime_double_minutes', 'he_dobles_minutos'],
  overtime_triple_minutes: ['overtime_triple_minutes', 'he_triples_minutos'],
  late_minutes: ['late_minutes', 'minutos_retardo', 'retardo_minutos'],
  tolerance_minutes: ['tolerance_minutes', 'minutos_tolerancia', 'tolerancia_minutos'],
  justification: ['justificacion', 'justification'],
  notes: ['observaciones', 'notes', 'motivo'],
  authorized_by: ['autorizado_por', 'autoriza', 'approved_by'],
  late_type: ['tipo_retardo', 'late_type', 'tipo'],
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeLimit(input: unknown): number {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return 1500;
  return Math.max(50, Math.min(10000, Math.floor(parsed)));
}

function parseSourceName(raw: string): { schemaName: string; objectName: string } | null {
  const value = normalizeText(raw);
  if (!value) return null;

  const chunks = value.split('.').map(part => normalizeText(part)).filter(Boolean);
  const schemaName = chunks.length > 1 ? chunks[0] : 'dbo';
  const objectName = chunks.length > 1 ? chunks[1] : chunks[0];

  const safeToken = /^[A-Za-z0-9_]+$/;
  if (!safeToken.test(schemaName) || !safeToken.test(objectName)) return null;
  return { schemaName, objectName };
}

async function resolveSourceMeta(): Promise<SourceMeta | null> {
  const sourceRaw = process.env.SGC_REPORTS_SOURCE || process.env.SGC_REPORTS_TABLE || DEFAULT_SOURCE;
  const parsed = parseSourceName(sourceRaw);
  if (!parsed) return null;

  const row = await dbGet<SourceMeta>(
    `SELECT TOP 1
       s.name AS schemaName,
       o.name AS objectName,
       o.type AS objectType
     FROM sys.objects o
     INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
     WHERE s.name = ? AND o.name = ? AND o.type IN ('U', 'V')`,
    [parsed.schemaName, parsed.objectName]
  );
  return row || null;
}

async function getObjectColumns(meta: SourceMeta): Promise<Set<string>> {
  const rows = await dbAll<ColumnRow>(
    `SELECT LOWER(c.name) AS column_name
     FROM sys.columns c
     INNER JOIN sys.objects o ON o.object_id = c.object_id
     INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
     WHERE s.name = ? AND o.name = ?`,
    [meta.schemaName, meta.objectName]
  );
  return new Set(rows.map(row => normalizeText(row.column_name).toLowerCase()).filter(Boolean));
}

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const item of candidates) {
    const key = item.toLowerCase();
    if (columns.has(key)) return item;
  }
  return null;
}

function quoteIdentifier(value: string): string {
  return `[${value.replace(/]/g, ']]')}]`;
}

function asTextExpr(columnName: string | null): string {
  if (!columnName) return `CAST('' AS NVARCHAR(255))`;
  return `COALESCE(LTRIM(RTRIM(CONVERT(NVARCHAR(255), ${quoteIdentifier(columnName)}))), '')`;
}

function asDateExpr(columnName: string | null): string {
  if (!columnName) return `CAST('' AS NVARCHAR(10))`;
  return `COALESCE(CONVERT(NVARCHAR(10), TRY_CONVERT(date, ${quoteIdentifier(columnName)}), 23), '')`;
}

function buildColumnMap(existingColumns: Set<string>): Record<keyof AttendanceRow, string | null> {
  const output = {} as Record<keyof AttendanceRow, string | null>;
  (Object.keys(CANDIDATE_COLUMNS) as Array<keyof AttendanceRow>).forEach(key => {
    output[key] = pickColumn(existingColumns, CANDIDATE_COLUMNS[key]);
  });
  return output;
}

export const ReportesRepo = {
  async getSourceStatus(): Promise<SourceStatus> {
    const sourceRaw = process.env.SGC_REPORTS_SOURCE || process.env.SGC_REPORTS_TABLE || DEFAULT_SOURCE;
    const parsed = parseSourceName(sourceRaw);
    if (!parsed) {
      return {
        enabled: false,
        source: sourceRaw,
        warning: 'SGC_REPORTS_SOURCE tiene formato inválido. Usa schema.objeto, ejemplo: dbo.vw_asistencia_reportes',
      };
    }

    const meta = await resolveSourceMeta();
    if (!meta) {
      return {
        enabled: false,
        source: sourceRaw,
        schemaName: parsed.schemaName,
        objectName: parsed.objectName,
        warning: `No se encontró la fuente ${parsed.schemaName}.${parsed.objectName} en SQL Server.`,
      };
    }

    return {
      enabled: true,
      source: sourceRaw,
      schemaName: meta.schemaName,
      objectName: meta.objectName,
      objectType: meta.objectType,
    };
  },

  async getRows(filters: RepoFilters = {}): Promise<AttendanceRow[]> {
    const meta = await resolveSourceMeta();
    if (!meta) return [];

    const existingColumns = await getObjectColumns(meta);
    const mapped = buildColumnMap(existingColumns);
    const limit = normalizeLimit(filters.limit);

    const where: string[] = ['1 = 1'];
    const params: any[] = [];
    const dateColumn = mapped.row_date;
    const employeeIdColumn = mapped.employee_id;
    const employeeNameColumn = mapped.employee_name;
    const departmentColumn = mapped.department;

    const startDate = normalizeText(filters.startDate);
    const endDate = normalizeText(filters.endDate);
    const employeeQuery = normalizeText(filters.employeeQuery);
    const department = normalizeText(filters.department);

    if (dateColumn && startDate) {
      where.push(`TRY_CONVERT(date, ${quoteIdentifier(dateColumn)}) >= TRY_CONVERT(date, ?)`);
      params.push(startDate);
    }
    if (dateColumn && endDate) {
      where.push(`TRY_CONVERT(date, ${quoteIdentifier(dateColumn)}) <= TRY_CONVERT(date, ?)`);
      params.push(endDate);
    }
    if (employeeQuery) {
      const orParts: string[] = [];
      if (employeeIdColumn) orParts.push(`${quoteIdentifier(employeeIdColumn)} LIKE ?`);
      if (employeeNameColumn) orParts.push(`${quoteIdentifier(employeeNameColumn)} LIKE ?`);
      if (orParts.length) {
        where.push(`(${orParts.join(' OR ')})`);
        if (employeeIdColumn) params.push(`%${employeeQuery}%`);
        if (employeeNameColumn) params.push(`%${employeeQuery}%`);
      }
    }
    if (department && departmentColumn) {
      where.push(`${quoteIdentifier(departmentColumn)} = ?`);
      params.push(department);
    }

    const orderExpr = dateColumn
      ? `TRY_CONVERT(date, ${quoteIdentifier(dateColumn)}) DESC`
      : '1 DESC';

    const sql = `
      SELECT
        ${asDateExpr(mapped.row_date)} AS row_date,
        ${asTextExpr(mapped.employee_id)} AS employee_id,
        ${asTextExpr(mapped.employee_name)} AS employee_name,
        ${asTextExpr(mapped.department)} AS department,
        ${asTextExpr(mapped.position)} AS position,
        ${asTextExpr(mapped.supervisor)} AS supervisor,
        ${asTextExpr(mapped.shift)} AS shift,
        ${asTextExpr(mapped.first_in)} AS first_in,
        ${asTextExpr(mapped.lunch_out)} AS lunch_out,
        ${asTextExpr(mapped.lunch_in)} AS lunch_in,
        ${asTextExpr(mapped.last_out)} AS last_out,
        ${asTextExpr(mapped.scheduled_start)} AS scheduled_start,
        ${asTextExpr(mapped.worked_minutes)} AS worked_minutes,
        ${asTextExpr(mapped.overtime_minutes)} AS overtime_minutes,
        ${asTextExpr(mapped.overtime_double_minutes)} AS overtime_double_minutes,
        ${asTextExpr(mapped.overtime_triple_minutes)} AS overtime_triple_minutes,
        ${asTextExpr(mapped.late_minutes)} AS late_minutes,
        ${asTextExpr(mapped.tolerance_minutes)} AS tolerance_minutes,
        ${asTextExpr(mapped.justification)} AS justification,
        ${asTextExpr(mapped.notes)} AS notes,
        ${asTextExpr(mapped.authorized_by)} AS authorized_by,
        ${asTextExpr(mapped.late_type)} AS late_type
      FROM ${quoteIdentifier(meta.schemaName)}.${quoteIdentifier(meta.objectName)}
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderExpr}, employee_name ASC
      LIMIT ?
    `;

    const rows = await dbAll<AttendanceRow>(sql, [...params, limit]);
    return rows || [];
  },
};

