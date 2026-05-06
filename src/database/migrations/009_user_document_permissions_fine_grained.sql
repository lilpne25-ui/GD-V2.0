-- ========================================
-- Migración 009: Permisos finos de documentación
-- ========================================

CREATE TABLE IF NOT EXISTS usuario_permisos_documentos (
  user_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  can_add_documents INTEGER NOT NULL DEFAULT 1,
  can_delete_documents INTEGER NOT NULL DEFAULT 0,
  can_rename_documents INTEGER NOT NULL DEFAULT 0,
  can_move_documents INTEGER NOT NULL DEFAULT 0,
  can_sign_documents INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

ALTER TABLE usuario_permisos_documentos ADD COLUMN can_rename_documents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuario_permisos_documentos ADD COLUMN can_move_documents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuario_permisos_documentos ADD COLUMN can_sign_documents INTEGER NOT NULL DEFAULT 0;

UPDATE usuario_permisos_documentos
SET can_sign_documents = 1
WHERE can_sign_documents IS NULL;

INSERT OR IGNORE INTO usuario_permisos_documentos (
  user_id,
  can_add_documents,
  can_delete_documents,
  can_rename_documents,
  can_move_documents,
  can_sign_documents,
  updated_at
)
SELECT id,
       1,
       CASE WHEN lower(trim(id)) = 'usr-admin' OR lower(trim(rol)) = 'administrador' THEN 1 ELSE 0 END,
       CASE WHEN lower(trim(id)) = 'usr-admin' OR lower(trim(rol)) = 'administrador' THEN 1 ELSE 0 END,
       CASE WHEN lower(trim(id)) = 'usr-admin' OR lower(trim(rol)) = 'administrador' THEN 1 ELSE 0 END,
       1,
       datetime('now')
FROM usuarios;
