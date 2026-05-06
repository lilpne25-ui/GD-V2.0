SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.usuario_email_config','U') IS NULL
BEGIN
  CREATE TABLE dbo.usuario_email_config (
    user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
    smtp_host NVARCHAR(255) NOT NULL DEFAULT '',
    smtp_port INT NOT NULL DEFAULT 587,
    smtp_user NVARCHAR(255) NOT NULL DEFAULT '',
    smtp_pass NVARCHAR(255) NOT NULL DEFAULT '',
    smtp_from NVARCHAR(255) NOT NULL DEFAULT '',
    smtp_secure INT NOT NULL DEFAULT 1,
    can_send_email INT NOT NULL DEFAULT 0,
    can_receive_email INT NOT NULL DEFAULT 1,
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    imap_host NVARCHAR(255) NOT NULL DEFAULT '',
    imap_port INT NOT NULL DEFAULT 993,
    imap_secure INT NOT NULL DEFAULT 1,
    pop_host NVARCHAR(255) NOT NULL DEFAULT '',
    pop_port INT NOT NULL DEFAULT 995,
    pop_secure INT NOT NULL DEFAULT 1,
    CONSTRAINT FK_usuario_email_config_user_m012 FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
  );
END;

IF COL_LENGTH('dbo.usuario_email_config', 'can_receive_email') IS NULL
BEGIN
  ALTER TABLE dbo.usuario_email_config
    ADD can_receive_email INT NOT NULL CONSTRAINT DF_usuario_email_config_can_receive_email_m012 DEFAULT 1;
END;

IF COL_LENGTH('dbo.usuario_email_config', 'imap_host') IS NULL
BEGIN
  ALTER TABLE dbo.usuario_email_config
    ADD imap_host NVARCHAR(255) NOT NULL CONSTRAINT DF_usuario_email_config_imap_host_m012 DEFAULT '';
END;

IF COL_LENGTH('dbo.usuario_email_config', 'imap_port') IS NULL
BEGIN
  ALTER TABLE dbo.usuario_email_config
    ADD imap_port INT NOT NULL CONSTRAINT DF_usuario_email_config_imap_port_m012 DEFAULT 993;
END;

IF COL_LENGTH('dbo.usuario_email_config', 'imap_secure') IS NULL
BEGIN
  ALTER TABLE dbo.usuario_email_config
    ADD imap_secure INT NOT NULL CONSTRAINT DF_usuario_email_config_imap_secure_m012 DEFAULT 1;
END;

IF COL_LENGTH('dbo.usuario_email_config', 'pop_host') IS NULL
BEGIN
  ALTER TABLE dbo.usuario_email_config
    ADD pop_host NVARCHAR(255) NOT NULL CONSTRAINT DF_usuario_email_config_pop_host_m012 DEFAULT '';
END;

IF COL_LENGTH('dbo.usuario_email_config', 'pop_port') IS NULL
BEGIN
  ALTER TABLE dbo.usuario_email_config
    ADD pop_port INT NOT NULL CONSTRAINT DF_usuario_email_config_pop_port_m012 DEFAULT 995;
END;

IF COL_LENGTH('dbo.usuario_email_config', 'pop_secure') IS NULL
BEGIN
  ALTER TABLE dbo.usuario_email_config
    ADD pop_secure INT NOT NULL CONSTRAINT DF_usuario_email_config_pop_secure_m012 DEFAULT 1;
END;

PRINT 'Migration 012_user_email_config.sql aplicada correctamente.';
