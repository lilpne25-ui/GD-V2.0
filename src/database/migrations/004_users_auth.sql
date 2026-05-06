-- ========================================
-- Migración 004: Credenciales de usuarios
-- ========================================

CREATE TABLE IF NOT EXISTS usuario_credenciales (
  user_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  password TEXT NOT NULL DEFAULT '123456',
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO usuario_credenciales (user_id, password)
SELECT id, '123456' FROM usuarios;
