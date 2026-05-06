-- ========================================
-- Migración 002: Módulos 2.6 - 2.11
-- SGC Desktop App — ISO 9001:2015
-- ========================================

-- 2.6 Indicadores y Objetivos de Calidad
CREATE TABLE IF NOT EXISTS indicadores (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  proceso_id TEXT,
  responsable_id TEXT,
  formula TEXT DEFAULT '',
  unidad TEXT DEFAULT '%',
  fuente_datos TEXT DEFAULT '',
  frecuencia TEXT DEFAULT 'mensual',
  tendencia_deseada TEXT DEFAULT 'subir',
  meta REAL DEFAULT 0,
  limite_inferior REAL DEFAULT 0,
  limite_superior REAL DEFAULT 100,
  linea_base REAL DEFAULT 0,
  tipo_grafico TEXT DEFAULT 'linea',
  objetivo_calidad TEXT DEFAULT '',
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS mediciones_indicador (
  id TEXT PRIMARY KEY,
  indicador_id TEXT NOT NULL REFERENCES indicadores(id),
  periodo TEXT NOT NULL,
  valor REAL NOT NULL,
  meta REAL DEFAULT 0,
  semaforo TEXT DEFAULT 'verde',
  observaciones TEXT DEFAULT '',
  registrado_por TEXT DEFAULT '',
  fecha TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS objetivos_calidad (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  meta TEXT DEFAULT '',
  plazo TEXT DEFAULT '',
  responsable_id TEXT,
  proceso_id TEXT,
  estado TEXT DEFAULT 'definido',
  avance REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

-- 2.7 Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT DEFAULT '',
  rfc TEXT DEFAULT '',
  contacto TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  email TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  producto_servicio TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  estatus TEXT DEFAULT 'en_evaluacion',
  calificacion_actual REAL DEFAULT 0,
  fecha_alta TEXT DEFAULT (datetime('now')),
  fecha_ultima_evaluacion TEXT,
  fecha_proxima_evaluacion TEXT,
  observaciones TEXT DEFAULT '',
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS evaluaciones_proveedor (
  id TEXT PRIMARY KEY,
  proveedor_id TEXT NOT NULL REFERENCES proveedores(id),
  periodo TEXT NOT NULL,
  fecha TEXT DEFAULT (datetime('now')),
  evaluador_id TEXT,
  calificacion_global REAL DEFAULT 0,
  resultado TEXT DEFAULT 'en_evaluacion',
  observaciones TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS criterios_evaluacion_prov (
  id TEXT PRIMARY KEY,
  evaluacion_id TEXT NOT NULL REFERENCES evaluaciones_proveedor(id),
  criterio TEXT NOT NULL,
  peso REAL DEFAULT 0,
  calificacion REAL DEFAULT 0,
  ponderado REAL DEFAULT 0,
  evidencia TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS incidencias_proveedor (
  id TEXT PRIMARY KEY,
  proveedor_id TEXT NOT NULL REFERENCES proveedores(id),
  fecha TEXT DEFAULT (datetime('now')),
  tipo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  impacto TEXT DEFAULT 'bajo',
  accion_tomada TEXT DEFAULT '',
  registrado_por TEXT DEFAULT ''
);

-- 2.8 Revisión por la Dirección
CREATE TABLE IF NOT EXISTS revisiones_direccion (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  fecha TEXT NOT NULL,
  hora_inicio TEXT DEFAULT '',
  hora_fin TEXT DEFAULT '',
  estado TEXT DEFAULT 'programada',
  convocado_por TEXT DEFAULT '',
  lugar TEXT DEFAULT '',
  resumen_ejecutivo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS entradas_revision (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES revisiones_direccion(id),
  tema TEXT NOT NULL,
  resumen TEXT DEFAULT '',
  datos TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS salidas_revision (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES revisiones_direccion(id),
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  responsable_id TEXT,
  fecha_compromiso TEXT,
  estado TEXT DEFAULT 'pendiente'
);

CREATE TABLE IF NOT EXISTS asistentes_revision (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES revisiones_direccion(id),
  nombre TEXT NOT NULL,
  cargo TEXT DEFAULT '',
  presente INTEGER DEFAULT 1
);

-- 2.9 Competencias y Capacitación
CREATE TABLE IF NOT EXISTS competencias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  nivel_requerido TEXT DEFAULT 'basico',
  vigencia_meses INTEGER DEFAULT 12
);

CREATE TABLE IF NOT EXISTS puestos_competencia (
  id TEXT PRIMARY KEY,
  puesto TEXT NOT NULL,
  proceso_id TEXT
);

CREATE TABLE IF NOT EXISTS puesto_competencia_rel (
  id TEXT PRIMARY KEY,
  puesto_comp_id TEXT NOT NULL REFERENCES puestos_competencia(id),
  competencia_id TEXT NOT NULL REFERENCES competencias(id),
  nivel_requerido TEXT DEFAULT 'basico',
  critica INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS personal_competencia (
  id TEXT PRIMARY KEY,
  personal_id TEXT NOT NULL,
  personal_nombre TEXT NOT NULL,
  puesto TEXT DEFAULT '',
  departamento TEXT DEFAULT '',
  brechas INTEGER DEFAULT 0,
  cumplimiento REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS evaluaciones_competencia (
  id TEXT PRIMARY KEY,
  personal_comp_id TEXT NOT NULL REFERENCES personal_competencia(id),
  competencia_id TEXT NOT NULL REFERENCES competencias(id),
  nivel_requerido TEXT DEFAULT 'basico',
  nivel_actual TEXT,
  estado TEXT DEFAULT 'no_evaluada',
  fecha_evaluacion TEXT,
  fecha_vencimiento TEXT,
  evidencia TEXT DEFAULT '',
  evaluado_por TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS capacitaciones (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  tipo TEXT DEFAULT 'interna',
  instructor TEXT DEFAULT '',
  fecha TEXT NOT NULL,
  duracion_horas REAL DEFAULT 0,
  lugar TEXT DEFAULT '',
  estado TEXT DEFAULT 'programada',
  evaluacion_eficacia TEXT DEFAULT '',
  eficaz INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS participantes_capacitacion (
  id TEXT PRIMARY KEY,
  capacitacion_id TEXT NOT NULL REFERENCES capacitaciones(id),
  personal_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  asistio INTEGER DEFAULT 0,
  calificacion REAL,
  observaciones TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS planes_capacitacion (
  id TEXT PRIMARY KEY,
  anio INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  estado TEXT DEFAULT 'borrador',
  avance REAL DEFAULT 0,
  aprobado_por TEXT DEFAULT '',
  fecha_aprobacion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

-- 2.10 Satisfacción del Cliente
CREATE TABLE IF NOT EXISTS encuestas (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  estado TEXT DEFAULT 'borrador',
  fecha_inicio TEXT,
  fecha_fin TEXT,
  total_respuestas INTEGER DEFAULT 0,
  promedio_general REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS preguntas_encuesta (
  id TEXT PRIMARY KEY,
  encuesta_id TEXT NOT NULL REFERENCES encuestas(id),
  texto TEXT NOT NULL,
  tipo TEXT DEFAULT 'escala',
  opciones TEXT DEFAULT '[]',
  escala_min INTEGER DEFAULT 1,
  escala_max INTEGER DEFAULT 10,
  orden INTEGER DEFAULT 0,
  obligatoria INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS respuestas_encuesta (
  id TEXT PRIMARY KEY,
  encuesta_id TEXT NOT NULL REFERENCES encuestas(id),
  cliente_id TEXT,
  cliente_nombre TEXT DEFAULT '',
  fecha TEXT DEFAULT (datetime('now')),
  comentario_general TEXT DEFAULT '',
  satisfaccion_global REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS respuestas_pregunta (
  id TEXT PRIMARY KEY,
  respuesta_encuesta_id TEXT NOT NULL REFERENCES respuestas_encuesta(id),
  pregunta_id TEXT NOT NULL REFERENCES preguntas_encuesta(id),
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quejas_cliente (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  tipo TEXT DEFAULT 'queja',
  cliente TEXT NOT NULL,
  fecha TEXT DEFAULT (datetime('now')),
  descripcion TEXT DEFAULT '',
  producto TEXT DEFAULT '',
  estado TEXT DEFAULT 'recibida',
  responsable_id TEXT,
  analisis TEXT DEFAULT '',
  accion_tomada TEXT DEFAULT '',
  fecha_cierre TEXT,
  nc_id TEXT,
  satisfaccion_final REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

-- 2.11 Control de Cambios
CREATE TABLE IF NOT EXISTS solicitudes_cambio (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  tipo TEXT NOT NULL,
  estado TEXT DEFAULT 'solicitado',
  solicitante_id TEXT,
  solicitante_nombre TEXT DEFAULT '',
  fecha TEXT DEFAULT (datetime('now')),
  impacto TEXT DEFAULT 'bajo',
  analisis_impacto TEXT DEFAULT '',
  procesos_afectados TEXT DEFAULT '[]',
  documentos_afectados TEXT DEFAULT '[]',
  riesgos_identificados TEXT DEFAULT '',
  recurso_requerido TEXT DEFAULT '',
  aprobado_por TEXT DEFAULT '',
  fecha_aprobacion TEXT,
  justificacion_decision TEXT DEFAULT '',
  plan_implementacion TEXT DEFAULT '',
  fecha_inicio_impl TEXT,
  fecha_fin_impl TEXT,
  responsable_impl_id TEXT,
  verificacion TEXT DEFAULT '',
  verificado_por TEXT DEFAULT '',
  fecha_verificacion TEXT,
  resultado_verificacion TEXT,
  evidencia TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS actividades_cambio (
  id TEXT PRIMARY KEY,
  solicitud_id TEXT NOT NULL REFERENCES solicitudes_cambio(id),
  descripcion TEXT NOT NULL,
  responsable_id TEXT,
  fecha_programada TEXT,
  fecha_real TEXT,
  estado TEXT DEFAULT 'pendiente',
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS historial_cambio_estado (
  id TEXT PRIMARY KEY,
  solicitud_id TEXT NOT NULL REFERENCES solicitudes_cambio(id),
  estado_anterior TEXT NOT NULL,
  estado_nuevo TEXT NOT NULL,
  fecha TEXT DEFAULT (datetime('now')),
  responsable_id TEXT,
  comentario TEXT DEFAULT ''
);
