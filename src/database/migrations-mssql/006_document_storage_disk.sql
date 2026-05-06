SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF COL_LENGTH('dbo.documento_nodos', 'file_disk_path') IS NULL
  ALTER TABLE dbo.documento_nodos ADD file_disk_path NVARCHAR(1024) NULL;

IF COL_LENGTH('dbo.documento_nodos', 'file_size_bytes') IS NULL
  ALTER TABLE dbo.documento_nodos ADD file_size_bytes BIGINT NULL;

IF COL_LENGTH('dbo.documento_nodos', 'storage_mode') IS NULL
BEGIN
  ALTER TABLE dbo.documento_nodos ADD storage_mode NVARCHAR(20) NULL;
  EXEC('ALTER TABLE dbo.documento_nodos ADD CONSTRAINT CK_documento_nodos_storage_mode CHECK (storage_mode IN (''dataurl'',''disk''))');
END;

EXEC('UPDATE dbo.documento_nodos
SET storage_mode = ''dataurl''
WHERE node_type = ''file'' AND file_data_url IS NOT NULL AND (storage_mode IS NULL OR storage_mode = '''')');

IF COL_LENGTH('dbo.documento_nodos', 'storage_mode') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_nodos') AND name = 'idx_documento_nodos_storage_mode')
    EXEC('CREATE INDEX idx_documento_nodos_storage_mode ON dbo.documento_nodos(storage_mode)');
END;

PRINT 'Migration 006_document_storage_disk.sql aplicada correctamente.';
