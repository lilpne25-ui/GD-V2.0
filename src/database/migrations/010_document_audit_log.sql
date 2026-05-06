-- ========================================
-- Migración 010: Auditoría de acciones en documentación
-- ========================================

CREATE TABLE IF NOT EXISTS documento_auditoria (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'add_document',
    'add_folder',
    'delete_node',
    'rename_node',
    'move_node'
  )),
  node_id TEXT,
  node_name TEXT,
  node_type TEXT CHECK(node_type IN ('folder','file')),
  from_parent_id TEXT,
  from_parent_name TEXT,
  to_parent_id TEXT,
  to_parent_name TEXT,
  actor_user_id TEXT,
  actor_user_name TEXT,
  actor_role TEXT,
  details_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documento_auditoria_created_at ON documento_auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documento_auditoria_node_id ON documento_auditoria(node_id);
CREATE INDEX IF NOT EXISTS idx_documento_auditoria_actor ON documento_auditoria(actor_user_id);
