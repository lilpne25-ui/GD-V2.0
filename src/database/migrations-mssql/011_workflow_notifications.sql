SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.documento_workflow','U') IS NULL
BEGIN
  CREATE TABLE dbo.documento_workflow (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    node_id NVARCHAR(64) NOT NULL,
    node_name NVARCHAR(255) NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'borrador' CHECK(status IN ('borrador','revision','correcciones','aprobado','obsoleto')),
    submitted_by NVARCHAR(64) NULL,
    submitted_by_name NVARCHAR(255) NULL,
    assigned_to NVARCHAR(64) NULL,
    assigned_to_name NVARCHAR(255) NULL,
    approved_by NVARCHAR(64) NULL,
    approved_by_name NVARCHAR(255) NULL,
    approved_at DATETIME2(0) NULL,
    target_folder_id NVARCHAR(64) NULL,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.workflow_correcciones','U') IS NULL
BEGIN
  CREATE TABLE dbo.workflow_correcciones (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    workflow_id NVARCHAR(64) NOT NULL,
    reviewer_id NVARCHAR(64) NULL,
    reviewer_name NVARCHAR(255) NULL,
    que_esta_mal NVARCHAR(MAX) NOT NULL DEFAULT '',
    por_que NVARCHAR(MAX) NOT NULL DEFAULT '',
    como_corregir NVARCHAR(MAX) NOT NULL DEFAULT '',
    observaciones NVARCHAR(MAX) NOT NULL DEFAULT '',
    destinatario_id NVARCHAR(64) NULL,
    destinatario_name NVARCHAR(255) NULL,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.notificaciones','U') IS NULL
BEGIN
  CREATE TABLE dbo.notificaciones (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    user_id NVARCHAR(64) NOT NULL,
    tipo NVARCHAR(40) NOT NULL DEFAULT 'info' CHECK(tipo IN ('info','workflow','correccion','aprobacion','email','sistema')),
    titulo NVARCHAR(255) NOT NULL DEFAULT '',
    mensaje NVARCHAR(MAX) NOT NULL DEFAULT '',
    referencia_id NVARCHAR(64) NULL,
    referencia_tipo NVARCHAR(64) NULL,
    leida INT NOT NULL DEFAULT 0,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.notificaciones') AND name = 'idx_notificaciones_user')
  CREATE INDEX idx_notificaciones_user ON dbo.notificaciones(user_id, leida);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_workflow') AND name = 'idx_workflow_node')
  CREATE INDEX idx_workflow_node ON dbo.documento_workflow(node_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.documento_workflow') AND name = 'idx_workflow_status')
  CREATE INDEX idx_workflow_status ON dbo.documento_workflow(status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.workflow_correcciones') AND name = 'idx_correcciones_workflow')
  CREATE INDEX idx_correcciones_workflow ON dbo.workflow_correcciones(workflow_id);

PRINT 'Migration 011_workflow_notifications.sql aplicada correctamente.';
