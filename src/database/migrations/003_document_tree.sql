-- ========================================
-- Migración 003: Árbol de documentación (carpetas/archivos)
-- ========================================

CREATE TABLE IF NOT EXISTS documento_nodos (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES documento_nodos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK(node_type IN ('folder','file')),
  file_name TEXT,
  mime_type TEXT,
  file_data_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documento_nodos_parent ON documento_nodos(parent_id);
CREATE INDEX IF NOT EXISTS idx_documento_nodos_type ON documento_nodos(node_type);

INSERT OR IGNORE INTO documento_nodos (id, parent_id, name, node_type) VALUES
  ('root', NULL, 'Documentos', 'folder');
