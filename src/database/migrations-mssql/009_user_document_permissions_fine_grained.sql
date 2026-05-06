SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.usuario_permisos_documentos','U') IS NULL
BEGIN
  CREATE TABLE dbo.usuario_permisos_documentos (
    user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
    can_add_documents INT NOT NULL DEFAULT 1,
    can_delete_documents INT NOT NULL DEFAULT 0,
    can_rename_documents INT NOT NULL DEFAULT 0,
    can_move_documents INT NOT NULL DEFAULT 0,
    can_sign_documents INT NOT NULL DEFAULT 0,
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_usuario_permisos_documentos_user_m009 FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
  );
END;

IF COL_LENGTH('dbo.usuario_permisos_documentos', 'can_rename_documents') IS NULL
  ALTER TABLE dbo.usuario_permisos_documentos ADD can_rename_documents INT NOT NULL DEFAULT 0;

IF COL_LENGTH('dbo.usuario_permisos_documentos', 'can_move_documents') IS NULL
  ALTER TABLE dbo.usuario_permisos_documentos ADD can_move_documents INT NOT NULL DEFAULT 0;

IF COL_LENGTH('dbo.usuario_permisos_documentos', 'can_sign_documents') IS NULL
  ALTER TABLE dbo.usuario_permisos_documentos ADD can_sign_documents INT NOT NULL DEFAULT 0;

EXEC('UPDATE dbo.usuario_permisos_documentos
SET can_sign_documents = 1
WHERE can_sign_documents IS NULL;');

EXEC('INSERT INTO dbo.usuario_permisos_documentos (
  user_id,
  can_add_documents,
  can_delete_documents,
  can_rename_documents,
  can_move_documents,
  can_sign_documents,
  updated_at
)
SELECT u.id,
       1,
       CASE WHEN lower(ltrim(rtrim(u.id))) = ''usr-admin'' OR lower(ltrim(rtrim(u.rol))) = ''administrador'' THEN 1 ELSE 0 END,
       CASE WHEN lower(ltrim(rtrim(u.id))) = ''usr-admin'' OR lower(ltrim(rtrim(u.rol))) = ''administrador'' THEN 1 ELSE 0 END,
       CASE WHEN lower(ltrim(rtrim(u.id))) = ''usr-admin'' OR lower(ltrim(rtrim(u.rol))) = ''administrador'' THEN 1 ELSE 0 END,
       1,
       SYSDATETIME()
FROM dbo.usuarios u
WHERE NOT EXISTS (SELECT 1 FROM dbo.usuario_permisos_documentos p WHERE p.user_id = u.id);');

PRINT 'Migration 009_user_document_permissions_fine_grained.sql aplicada correctamente.';
