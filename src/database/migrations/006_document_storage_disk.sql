-- ========================================
-- Migración 006: Soporte de archivos en disco para Documentación
-- ========================================

ALTER TABLE documento_nodos ADD COLUMN file_disk_path TEXT;
ALTER TABLE documento_nodos ADD COLUMN file_size_bytes INTEGER;
ALTER TABLE documento_nodos ADD COLUMN storage_mode TEXT CHECK(storage_mode IN ('dataurl','disk'));

UPDATE documento_nodos
SET storage_mode = 'dataurl'
WHERE node_type = 'file' AND file_data_url IS NOT NULL AND (storage_mode IS NULL OR storage_mode = '');

CREATE INDEX IF NOT EXISTS idx_documento_nodos_storage_mode ON documento_nodos(storage_mode);
