SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.documento_nodos','U') IS NULL
BEGIN
  CREATE TABLE dbo.documento_nodos (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    parent_id NVARCHAR(64) NULL,
    name NVARCHAR(255) NOT NULL,
    node_type NVARCHAR(20) NOT NULL CHECK(node_type IN ('folder','file')),
    file_name NVARCHAR(255) NULL,
    mime_type NVARCHAR(255) NULL,
    file_data_url NVARCHAR(MAX) NULL,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_documento_nodos_parent FOREIGN KEY (parent_id) REFERENCES dbo.documento_nodos(id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_nodos') AND name = 'idx_documento_nodos_parent')
  CREATE INDEX idx_documento_nodos_parent ON dbo.documento_nodos(parent_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_nodos') AND name = 'idx_documento_nodos_type')
  CREATE INDEX idx_documento_nodos_type ON dbo.documento_nodos(node_type);

IF NOT EXISTS (SELECT 1 FROM dbo.documento_nodos WHERE id = 'root')
  INSERT INTO dbo.documento_nodos (id, parent_id, name, node_type) VALUES ('root', NULL, N'Documentos', 'folder');

PRINT 'Migration 003_document_tree.sql aplicada correctamente.';
