SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.documento_papelera','U') IS NULL
BEGIN
  CREATE TABLE dbo.documento_papelera (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    root_node_id NVARCHAR(64) NOT NULL,
    root_node_name NVARCHAR(255) NULL,
    root_node_type NVARCHAR(20) NULL,
    deleted_by_user_id NVARCHAR(64) NULL,
    deleted_by_name NVARCHAR(255) NULL,
    deleted_by_role NVARCHAR(255) NULL,
    deleted_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    expires_at DATETIME2(0) NOT NULL,
    payload_json NVARCHAR(MAX) NOT NULL
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_papelera') AND name = 'idx_documento_papelera_expires_at')
  CREATE INDEX idx_documento_papelera_expires_at ON dbo.documento_papelera(expires_at);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_papelera') AND name = 'idx_documento_papelera_deleted_at')
  CREATE INDEX idx_documento_papelera_deleted_at ON dbo.documento_papelera(deleted_at DESC);

PRINT 'Migration 013_document_trash.sql aplicada correctamente.';
