-- ========================================
-- SGC Desktop App — Migración inicial
-- Módulos: Documentación, Auditorías, NC, CAPA, Riesgos
-- ========================================

-- =====================
-- Tablas de soporte
-- =====================
CREATE TABLE IF NOT EXISTS departamentos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  responsable TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS procesos (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo TEXT CHECK(tipo IN ('estrategico','operativo','soporte')) NOT NULL,
  departamento_id TEXT REFERENCES departamentos(id),
  responsable TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE,
  rol TEXT NOT NULL,
  departamento TEXT,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================
-- 2.1 DOCUMENTACIÓN
-- =====================
CREATE TABLE IF NOT EXISTS documentos (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo TEXT CHECK(tipo IN ('procedimiento','instruccion','formato','registro','ficha_proceso','manual','politica','externo')) NOT NULL,
  origen TEXT CHECK(origen IN ('interno','externo')) DEFAULT 'interno',
  estado TEXT CHECK(estado IN ('borrador','en_revision','aprobado','obsoleto')) DEFAULT 'borrador',
  version INTEGER DEFAULT 1,
  version_texto TEXT DEFAULT '1.0',
  departamento_id TEXT REFERENCES departamentos(id),
  proceso_id TEXT REFERENCES procesos(id),
  responsable_id TEXT REFERENCES usuarios(id),
  descripcion TEXT,
  ruta_archivo TEXT,
  fecha_emision TEXT,
  fecha_vigencia TEXT,
  fecha_proxima_revision TEXT,
  tags TEXT, -- JSON array
  -- Workflow de aprobación
  elaboro_id TEXT REFERENCES usuarios(id),
  elaboro_fecha TEXT,
  reviso_id TEXT REFERENCES usuarios(id),
  reviso_fecha TEXT,
  aprobo_id TEXT REFERENCES usuarios(id),
  aprobo_fecha TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS documento_versiones (
  id TEXT PRIMARY KEY,
  documento_id TEXT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  version_texto TEXT,
  cambios TEXT,
  ruta_archivo TEXT,
  creado_por TEXT,
  fecha TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documento_distribuciones (
  id TEXT PRIMARY KEY,
  documento_id TEXT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  destinatario TEXT NOT NULL,
  tipo TEXT CHECK(tipo IN ('controlada','no_controlada')) DEFAULT 'controlada',
  fecha_entrega TEXT,
  acuse_recibo INTEGER DEFAULT 0
);

-- =====================
-- 2.2 AUDITORÍAS
-- =====================
CREATE TABLE IF NOT EXISTS programas_auditoria (
  id TEXT PRIMARY KEY,
  anio INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  objetivo TEXT,
  alcance TEXT,
  estado TEXT CHECK(estado IN ('activo','cerrado')) DEFAULT 'activo',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS auditorias (
  id TEXT PRIMARY KEY,
  programa_id TEXT REFERENCES programas_auditoria(id),
  codigo TEXT NOT NULL UNIQUE,
  tipo TEXT CHECK(tipo IN ('interna','externa')) DEFAULT 'interna',
  estado TEXT CHECK(estado IN ('programada','en_ejecucion','completada','cancelada')) DEFAULT 'programada',
  objetivo TEXT,
  alcance TEXT,
  criterios TEXT,
  fecha_programada TEXT,
  fecha_inicio TEXT,
  fecha_fin TEXT,
  procesos_auditados TEXT, -- JSON array de IDs
  auditor_lider_id TEXT REFERENCES usuarios(id),
  equipo_auditor TEXT, -- JSON array de IDs
  observadores TEXT, -- JSON array de IDs
  reunion_apertura TEXT,
  reunion_cierre TEXT,
  conclusiones TEXT,
  informe_generado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS auditor_competencias (
  id TEXT PRIMARY KEY,
  auditor_id TEXT NOT NULL REFERENCES usuarios(id),
  formacion TEXT,
  experiencia_anios INTEGER DEFAULT 0,
  certificaciones TEXT, -- JSON array
  procesos_habilitados TEXT, -- JSON array
  imparcialidad_declarada INTEGER DEFAULT 0,
  fecha_ultima_evaluacion TEXT
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  auditoria_id TEXT NOT NULL REFERENCES auditorias(id) ON DELETE CASCADE,
  clausula TEXT,
  proceso_id TEXT REFERENCES procesos(id),
  pregunta TEXT NOT NULL,
  cumple TEXT CHECK(cumple IN ('si','no','parcial','no_aplica')),
  evidencia_objetiva TEXT,
  notas_campo TEXT,
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hallazgos (
  id TEXT PRIMARY KEY,
  auditoria_id TEXT NOT NULL REFERENCES auditorias(id) ON DELETE CASCADE,
  checklist_item_id TEXT REFERENCES checklist_items(id),
  clasificacion TEXT CHECK(clasificacion IN ('nc_mayor','nc_menor','observacion','oportunidad_mejora','fortaleza')) NOT NULL,
  clausula_referencia TEXT,
  descripcion TEXT NOT NULL,
  evidencia TEXT,
  proceso_id TEXT REFERENCES procesos(id),
  responsable_id TEXT REFERENCES usuarios(id),
  nc_id TEXT,
  capa_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

-- =====================
-- 2.3 NO CONFORMIDADES
-- =====================
CREATE TABLE IF NOT EXISTS no_conformidades (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  origen TEXT CHECK(origen IN ('auditoria','proceso','producto','cliente','proveedor','otra')) NOT NULL,
  clasificacion TEXT CHECK(clasificacion IN ('nc_mayor','nc_menor')) NOT NULL,
  estado TEXT CHECK(estado IN ('abierta','en_analisis','correccion_aplicada','en_verificacion','cerrada','cancelada')) DEFAULT 'abierta',
  proceso_id TEXT REFERENCES procesos(id),
  responsable_id TEXT REFERENCES usuarios(id),
  detectado_por TEXT,
  fecha_deteccion TEXT NOT NULL,
  fecha_limite TEXT,
  fecha_cierre TEXT,
  -- Corrección inmediata
  correccion_inmediata TEXT,
  correccion_responsable TEXT,
  correccion_fecha TEXT,
  -- Análisis causa raíz
  metodo_analisis TEXT CHECK(metodo_analisis IN ('5_porques','ishikawa','8d','otro')),
  causa_raiz TEXT,
  analisis_detalle TEXT,
  -- Cierre
  evidencia_cierre TEXT,
  verificado_por TEXT,
  fecha_verificacion TEXT,
  -- Vinculaciones
  auditoria_id TEXT REFERENCES auditorias(id),
  hallazgo_id TEXT REFERENCES hallazgos(id),
  capa_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS analisis_5porques (
  id TEXT PRIMARY KEY,
  nc_id TEXT NOT NULL REFERENCES no_conformidades(id) ON DELETE CASCADE,
  porque1 TEXT,
  porque2 TEXT,
  porque3 TEXT,
  porque4 TEXT,
  porque5 TEXT,
  causa_raiz_identificada TEXT
);

CREATE TABLE IF NOT EXISTS analisis_ishikawa (
  id TEXT PRIMARY KEY,
  nc_id TEXT NOT NULL REFERENCES no_conformidades(id) ON DELETE CASCADE,
  mano_obra TEXT, -- JSON array
  maquinaria TEXT,
  material TEXT,
  metodo TEXT,
  medio_ambiente TEXT,
  medicion TEXT,
  causa_raiz_identificada TEXT
);

-- =====================
-- 2.4 CAPA
-- =====================
CREATE TABLE IF NOT EXISTS capas (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT CHECK(tipo IN ('correctiva','preventiva','mejora')) NOT NULL,
  estado TEXT CHECK(estado IN ('abierta','en_implementacion','implementada','en_verificacion','cerrada_eficaz','cerrada_no_eficaz','cancelada')) DEFAULT 'abierta',
  proceso_id TEXT REFERENCES procesos(id),
  responsable_id TEXT REFERENCES usuarios(id),
  fecha_apertura TEXT NOT NULL,
  fecha_compromiso_implementacion TEXT,
  fecha_cierre TEXT,
  -- Origen
  nc_id TEXT REFERENCES no_conformidades(id),
  auditoria_id TEXT REFERENCES auditorias(id),
  origen_descripcion TEXT,
  -- Plan de acción
  plan_accion TEXT,
  recursos_necesarios TEXT,
  -- Seguimiento
  porcentaje_avance INTEGER DEFAULT 0,
  -- Verificación eficacia
  verificacion_eficacia TEXT,
  verificado_por TEXT,
  fecha_verificacion TEXT,
  es_eficaz INTEGER, -- NULL = sin evaluar, 0 = no, 1 = sí
  -- Cierre
  evidencia_cierre TEXT,
  cerrado_por TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS capa_actividades (
  id TEXT PRIMARY KEY,
  capa_id TEXT NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  responsable_id TEXT REFERENCES usuarios(id),
  fecha_compromiso TEXT,
  fecha_real TEXT,
  estado TEXT CHECK(estado IN ('pendiente','en_progreso','completada','vencida')) DEFAULT 'pendiente',
  evidencia TEXT,
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS capa_seguimientos (
  id TEXT PRIMARY KEY,
  capa_id TEXT NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
  fecha TEXT DEFAULT (datetime('now')),
  descripcion TEXT,
  porcentaje_avance INTEGER DEFAULT 0,
  registrado_por TEXT
);

-- =====================
-- 2.5 RIESGOS Y OPORTUNIDADES
-- =====================
CREATE TABLE IF NOT EXISTS riesgos (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  tipo TEXT CHECK(tipo IN ('riesgo','oportunidad')) NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT CHECK(estado IN ('identificado','en_tratamiento','aceptado','mitigado','cerrado')) DEFAULT 'identificado',
  proceso_id TEXT REFERENCES procesos(id),
  responsable_id TEXT REFERENCES usuarios(id),
  -- Evaluación
  probabilidad INTEGER CHECK(probabilidad BETWEEN 1 AND 5),
  impacto INTEGER CHECK(impacto BETWEEN 1 AND 5),
  nivel_riesgo TEXT CHECK(nivel_riesgo IN ('bajo','medio','alto','critico')),
  valor_riesgo INTEGER,
  -- Evaluación residual
  probabilidad_residual INTEGER CHECK(probabilidad_residual BETWEEN 1 AND 5),
  impacto_residual INTEGER CHECK(impacto_residual BETWEEN 1 AND 5),
  nivel_riesgo_residual TEXT,
  valor_riesgo_residual INTEGER,
  -- Planes
  plan_mitigacion TEXT,
  plan_contingencia TEXT,
  -- Oportunidad
  oportunidad_descripcion TEXT,
  beneficio_esperado TEXT,
  -- Vinculación objetivos
  objetivos_calidad TEXT, -- JSON array
  -- Reevaluación
  fecha_ultima_evaluacion TEXT,
  fecha_proxima_evaluacion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS riesgo_evaluaciones (
  id TEXT PRIMARY KEY,
  riesgo_id TEXT NOT NULL REFERENCES riesgos(id) ON DELETE CASCADE,
  fecha TEXT DEFAULT (datetime('now')),
  probabilidad INTEGER CHECK(probabilidad BETWEEN 1 AND 5),
  impacto INTEGER CHECK(impacto BETWEEN 1 AND 5),
  valor_riesgo INTEGER,
  nivel_riesgo TEXT,
  observaciones TEXT,
  evaluado_por TEXT
);

CREATE TABLE IF NOT EXISTS riesgo_acciones (
  id TEXT PRIMARY KEY,
  riesgo_id TEXT NOT NULL REFERENCES riesgos(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  responsable_id TEXT REFERENCES usuarios(id),
  fecha_compromiso TEXT,
  fecha_real TEXT,
  estado TEXT CHECK(estado IN ('pendiente','en_progreso','completada')) DEFAULT 'pendiente',
  evidencia TEXT
);

-- =====================
-- Índices de rendimiento
-- =====================
CREATE INDEX IF NOT EXISTS idx_documentos_estado ON documentos(estado);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_proceso ON documentos(proceso_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_estado ON auditorias(estado);
CREATE INDEX IF NOT EXISTS idx_auditorias_programa ON auditorias(programa_id);
CREATE INDEX IF NOT EXISTS idx_nc_estado ON no_conformidades(estado);
CREATE INDEX IF NOT EXISTS idx_nc_proceso ON no_conformidades(proceso_id);
CREATE INDEX IF NOT EXISTS idx_capas_estado ON capas(estado);
CREATE INDEX IF NOT EXISTS idx_capas_nc ON capas(nc_id);
CREATE INDEX IF NOT EXISTS idx_riesgos_proceso ON riesgos(proceso_id);
CREATE INDEX IF NOT EXISTS idx_riesgos_nivel ON riesgos(nivel_riesgo);

-- =====================
-- Datos semilla
-- =====================
INSERT OR IGNORE INTO departamentos (id, nombre) VALUES
  ('dep-calidad', 'Calidad'),
  ('dep-produccion', 'Producción'),
  ('dep-ingenieria', 'Ingeniería'),
  ('dep-ventas', 'Ventas'),
  ('dep-rh', 'Recursos Humanos'),
  ('dep-logistica', 'Logística'),
  ('dep-direccion', 'Dirección'),
  ('dep-mantenimiento', 'Mantenimiento');

INSERT OR IGNORE INTO procesos (id, codigo, nombre, tipo, departamento_id) VALUES
  ('proc-sgc', 'PR-SGC', 'Sistema de Gestión de Calidad', 'estrategico', 'dep-calidad'),
  ('proc-riesgo', 'PR-RO', 'Gestión de Riesgos', 'estrategico', 'dep-calidad'),
  ('proc-audit', 'PR-AUD', 'Auditoría Interna', 'estrategico', 'dep-calidad'),
  ('proc-ventas', 'PR-VEN', 'Proceso de Ventas', 'operativo', 'dep-ventas'),
  ('proc-diseno', 'PR-DIS', 'Diseño y Desarrollo', 'operativo', 'dep-ingenieria'),
  ('proc-produccion', 'PR-PROD', 'Producción', 'operativo', 'dep-produccion'),
  ('proc-compras', 'PR-COM', 'Compras', 'operativo', 'dep-logistica'),
  ('proc-rh', 'PR-RH', 'Recursos Humanos', 'soporte', 'dep-rh'),
  ('proc-mant', 'PR-MNT', 'Mantenimiento', 'soporte', 'dep-mantenimiento'),
  ('proc-ti', 'PR-TI', 'Tecnologías de la Información', 'soporte', 'dep-ingenieria');

INSERT OR IGNORE INTO usuarios (id, nombre, email, rol, departamento) VALUES
  ('usr-admin', 'Administrador', 'admin@empresa.com', 'administrador', 'Dirección'),
  ('usr-calidad', 'Resp. Calidad', 'calidad@empresa.com', 'responsable_calidad', 'Calidad'),
  ('usr-auditor1', 'Auditor Líder', 'auditor1@empresa.com', 'auditor_lider', 'Calidad'),
  ('usr-jefe-prod', 'Jefe Producción', 'produccion@empresa.com', 'jefe_area', 'Producción');
