-- ========================================
-- Migración 007: Firmas persistentes en documentos
-- ========================================

CREATE TABLE IF NOT EXISTS documento_firmas (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES documento_nodos(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_role TEXT,
  signature_data_url TEXT NOT NULL,
  pos_x_percent REAL DEFAULT 76,
  pos_y_percent REAL DEFAULT 78,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documento_firmas_node ON documento_firmas(node_id);
CREATE INDEX IF NOT EXISTS idx_documento_firmas_created ON documento_firmas(created_at);
