SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.documento_firmas','U') IS NULL
BEGIN
  CREATE TABLE dbo.documento_firmas (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    node_id NVARCHAR(64) NOT NULL,
    signer_name NVARCHAR(255) NOT NULL,
    signer_role NVARCHAR(255) NULL,
    signature_data_url NVARCHAR(MAX) NOT NULL,
    pos_x_percent FLOAT NOT NULL DEFAULT 76,
    pos_y_percent FLOAT NOT NULL DEFAULT 78,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_documento_firmas_node FOREIGN KEY (node_id) REFERENCES dbo.documento_nodos(id) ON DELETE CASCADE
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_firmas') AND name = 'idx_documento_firmas_node')
  CREATE INDEX idx_documento_firmas_node ON dbo.documento_firmas(node_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_firmas') AND name = 'idx_documento_firmas_created')
  CREATE INDEX idx_documento_firmas_created ON dbo.documento_firmas(created_at);

PRINT 'Migration 007_document_signatures.sql aplicada correctamente.';
