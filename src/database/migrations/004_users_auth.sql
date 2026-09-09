-- ========================================
-- Migración 004: Credenciales de usuarios
-- ========================================

CREATE TABLE IF NOT EXISTS usuario_credenciales (
  user_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  password TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO usuario_credenciales (user_id, password)
SELECT id, '' FROM usuarios WHERE 1 = 0; -- Fase 0.5: sin siembra de contrasenas
