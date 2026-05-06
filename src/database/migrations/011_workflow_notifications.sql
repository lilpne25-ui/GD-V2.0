-- Migration 011: Document workflow + notifications + correction feedback
-- Workflow states: borrador → revision → correcciones → aprobado → obsoleto

CREATE TABLE IF NOT EXISTS documento_workflow (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  node_name TEXT,
  status TEXT NOT NULL DEFAULT 'borrador'
    CHECK(status IN ('borrador','revision','correcciones','aprobado','obsoleto')),
  submitted_by TEXT,
  submitted_by_name TEXT,
  assigned_to TEXT,
  assigned_to_name TEXT,
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TEXT,
  target_folder_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflow_correcciones (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  reviewer_id TEXT,
  reviewer_name TEXT,
  que_esta_mal TEXT NOT NULL DEFAULT '',
  por_que TEXT NOT NULL DEFAULT '',
  como_corregir TEXT NOT NULL DEFAULT '',
  observaciones TEXT DEFAULT '',
  destinatario_id TEXT,
  destinatario_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info'
    CHECK(tipo IN ('info','workflow','correccion','aprobacion','email','sistema')),
  titulo TEXT NOT NULL DEFAULT '',
  mensaje TEXT NOT NULL DEFAULT '',
  referencia_id TEXT,
  referencia_tipo TEXT,
  leida INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id, leida);
CREATE INDEX IF NOT EXISTS idx_workflow_node ON documento_workflow(node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON documento_workflow(status);
CREATE INDEX IF NOT EXISTS idx_correcciones_workflow ON workflow_correcciones(workflow_id);
