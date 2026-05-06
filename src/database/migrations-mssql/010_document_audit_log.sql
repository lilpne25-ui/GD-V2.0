SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.documento_auditoria','U') IS NULL
BEGIN
  CREATE TABLE dbo.documento_auditoria (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    event_type NVARCHAR(40) NOT NULL CHECK(event_type IN ('add_document','add_folder','delete_node','rename_node','move_node')),
    node_id NVARCHAR(64) NULL,
    node_name NVARCHAR(255) NULL,
    node_type NVARCHAR(20) NULL CHECK(node_type IN ('folder','file')),
    from_parent_id NVARCHAR(64) NULL,
    from_parent_name NVARCHAR(255) NULL,
    to_parent_id NVARCHAR(64) NULL,
    to_parent_name NVARCHAR(255) NULL,
    actor_user_id NVARCHAR(64) NULL,
    actor_user_name NVARCHAR(255) NULL,
    actor_role NVARCHAR(255) NULL,
    details_json NVARCHAR(MAX) NULL,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_auditoria') AND name = 'idx_documento_auditoria_created_at')
  CREATE INDEX idx_documento_auditoria_created_at ON dbo.documento_auditoria(created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_auditoria') AND name = 'idx_documento_auditoria_node_id')
  CREATE INDEX idx_documento_auditoria_node_id ON dbo.documento_auditoria(node_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_auditoria') AND name = 'idx_documento_auditoria_actor')
  CREATE INDEX idx_documento_auditoria_actor ON dbo.documento_auditoria(actor_user_id);

PRINT 'Migration 010_document_audit_log.sql aplicada correctamente.';
