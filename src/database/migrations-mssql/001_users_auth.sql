/*
  SGC - SQL Server Migration 001
  Scope: soporte base + usuarios + credenciales + config de correo
  Compatible: SQL Server 2019+
*/

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.departamentos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.departamentos (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_departamentos PRIMARY KEY,
    nombre NVARCHAR(200) NOT NULL,
    responsable NVARCHAR(200) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_departamentos_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_departamentos_updated_at DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.procesos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.procesos (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_procesos PRIMARY KEY,
    codigo NVARCHAR(50) NOT NULL,
    nombre NVARCHAR(200) NOT NULL,
    tipo NVARCHAR(20) NOT NULL,
    departamento_id NVARCHAR(64) NULL,
    responsable NVARCHAR(200) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_procesos_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_procesos_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_procesos_codigo UNIQUE (codigo),
    CONSTRAINT CK_procesos_tipo CHECK (tipo IN ('estrategico','operativo','soporte')),
    CONSTRAINT FK_procesos_departamento FOREIGN KEY (departamento_id) REFERENCES dbo.departamentos(id)
  );
END;

IF OBJECT_ID('dbo.usuarios', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuarios (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_usuarios PRIMARY KEY,
    nombre NVARCHAR(200) NOT NULL,
    email NVARCHAR(320) NULL,
    rol NVARCHAR(200) NOT NULL,
    departamento NVARCHAR(200) NULL,
    activo BIT NOT NULL CONSTRAINT DF_usuarios_activo DEFAULT 1,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_usuarios_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_usuarios_updated_at DEFAULT SYSDATETIME()
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.usuarios')
    AND name = 'UX_usuarios_email_not_null'
)
BEGIN
  CREATE UNIQUE INDEX UX_usuarios_email_not_null
    ON dbo.usuarios(email)
    WHERE email IS NOT NULL;
END;

IF OBJECT_ID('dbo.usuario_credenciales', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuario_credenciales (
    user_id NVARCHAR(64) NOT NULL CONSTRAINT PK_usuario_credenciales PRIMARY KEY,
    [password] NVARCHAR(255) NOT NULL CONSTRAINT DF_usuario_credenciales_password DEFAULT '123456',
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_usuario_credenciales_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT FK_usuario_credenciales_user FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.usuario_email_config', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuario_email_config (
    user_id NVARCHAR(64) NOT NULL CONSTRAINT PK_usuario_email_config PRIMARY KEY,
    smtp_host NVARCHAR(255) NOT NULL CONSTRAINT DF_usuario_email_config_smtp_host DEFAULT '',
    smtp_port INT NOT NULL CONSTRAINT DF_usuario_email_config_smtp_port DEFAULT 587,
    smtp_user NVARCHAR(255) NOT NULL CONSTRAINT DF_usuario_email_config_smtp_user DEFAULT '',
    smtp_pass NVARCHAR(255) NOT NULL CONSTRAINT DF_usuario_email_config_smtp_pass DEFAULT '',
    smtp_from NVARCHAR(255) NOT NULL CONSTRAINT DF_usuario_email_config_smtp_from DEFAULT '',
    smtp_secure BIT NOT NULL CONSTRAINT DF_usuario_email_config_smtp_secure DEFAULT 1,
    can_send_email BIT NOT NULL CONSTRAINT DF_usuario_email_config_can_send_email DEFAULT 0,
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_usuario_email_config_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT FK_usuario_email_config_user FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.departamentos WHERE id = 'dep-calidad')
BEGIN
  INSERT INTO dbo.departamentos (id, nombre) VALUES ('dep-calidad', N'Calidad');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.departamentos WHERE id = 'dep-direccion')
BEGIN
  INSERT INTO dbo.departamentos (id, nombre) VALUES ('dep-direccion', N'Dirección');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE id = 'usr-admin')
BEGIN
  INSERT INTO dbo.usuarios (id, nombre, email, rol, departamento)
  VALUES ('usr-admin', N'Administrador', 'admin@empresa.com', 'administrador', N'Dirección');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE id = 'usr-calidad')
BEGIN
  INSERT INTO dbo.usuarios (id, nombre, email, rol, departamento)
  VALUES ('usr-calidad', N'Resp. Calidad', 'calidad@empresa.com', 'responsable_calidad', N'Calidad');
END;

INSERT INTO dbo.usuario_credenciales (user_id, [password], updated_at)
SELECT u.id, '123456', SYSDATETIME()
FROM dbo.usuarios u
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.usuario_credenciales c WHERE c.user_id = u.id
);

PRINT 'Migration 001_users_auth.sql aplicada correctamente.';
