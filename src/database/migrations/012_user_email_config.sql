-- Migration 012: Email configuration per user
-- Only certain roles can send automated emails:
--   1 DIRECTOR, 1.1 RECURSOS HUMANOS, 8 COORDINADOR DEL SGC, 4.3 TÉCNICO TI

CREATE TABLE IF NOT EXISTS usuario_email_config (
  user_id TEXT PRIMARY KEY,
  smtp_host TEXT DEFAULT '',
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT DEFAULT '',
  smtp_pass TEXT DEFAULT '',
  smtp_from TEXT DEFAULT '',
  smtp_secure INTEGER DEFAULT 1,
  can_send_email INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
