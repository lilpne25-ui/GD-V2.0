SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.usuario_permisos_documentos','U') IS NULL
BEGIN
  CREATE TABLE dbo.usuario_permisos_documentos (
    user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
    can_add_documents INT NOT NULL DEFAULT 1,
    can_delete_documents INT NOT NULL DEFAULT 0,
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_usuario_permisos_documentos_user_m008 FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
  );
END;

INSERT INTO dbo.usuario_permisos_documentos (user_id, can_add_documents, can_delete_documents, updated_at)
SELECT u.id,
       1,
       CASE WHEN lower(ltrim(rtrim(u.id))) = 'usr-admin' OR lower(ltrim(rtrim(u.rol))) = 'administrador' THEN 1 ELSE 0 END,
       SYSDATETIME()
FROM dbo.usuarios u
WHERE NOT EXISTS (SELECT 1 FROM dbo.usuario_permisos_documentos p WHERE p.user_id = u.id);

PRINT 'Migration 008_user_document_permissions.sql aplicada correctamente.';
