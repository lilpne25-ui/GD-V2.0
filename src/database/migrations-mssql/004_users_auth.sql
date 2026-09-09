SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.usuario_credenciales', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuario_credenciales (
    user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
    [password] NVARCHAR(255) NOT NULL,
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_usuario_credenciales_user_m004 FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
  );
END;

-- Fase 0.5: sin siembra de contrasenas conocidas. Bootstrap explicito.

PRINT 'Migration 004_users_auth.sql aplicada correctamente.';
