-- ========================================
-- Migración 008: Permisos de documentación por usuario
-- ========================================

CREATE TABLE IF NOT EXISTS usuario_permisos_documentos (
  user_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  can_add_documents INTEGER NOT NULL DEFAULT 1,
  can_delete_documents INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO usuario_permisos_documentos (user_id, can_add_documents, can_delete_documents, updated_at)
SELECT id,
       1,
       CASE WHEN lower(trim(id)) = 'usr-admin' OR lower(trim(rol)) = 'administrador' THEN 1 ELSE 0 END,
       datetime('now')
FROM usuarios;
