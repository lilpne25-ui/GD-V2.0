SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/*
  Migration 014 - Dynamic Records Engine
  Scope:
    - record_types
    - record_fields
    - record_instances
    - record_values
    - record_workflow
    - record_audit_log
*/

IF OBJECT_ID('dbo.record_types', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.record_types (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_record_types PRIMARY KEY,
    code NVARCHAR(80) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_types_description DEFAULT '',
    process_id NVARCHAR(64) NULL,
    settings_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_types_settings_json DEFAULT '{}',
    is_active INT NOT NULL CONSTRAINT DF_record_types_is_active DEFAULT 1,
    version INT NOT NULL CONSTRAINT DF_record_types_version DEFAULT 1,
    created_by NVARCHAR(64) NULL,
    updated_by NVARCHAR(64) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_types_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_types_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_record_types_settings_json CHECK (ISJSON(settings_json) = 1),
    CONSTRAINT FK_record_types_process FOREIGN KEY (process_id) REFERENCES dbo.procesos(id),
    CONSTRAINT FK_record_types_created_by FOREIGN KEY (created_by) REFERENCES dbo.usuarios(id),
    CONSTRAINT FK_record_types_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.usuarios(id)
  );
END;

IF OBJECT_ID('dbo.record_fields', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.record_fields (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_record_fields PRIMARY KEY,
    record_type_id NVARCHAR(64) NOT NULL,
    field_key NVARCHAR(100) NOT NULL,
    label NVARCHAR(255) NOT NULL,
    field_type NVARCHAR(40) NOT NULL,
    required INT NOT NULL CONSTRAINT DF_record_fields_required DEFAULT 0,
    options_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_fields_options_json DEFAULT '[]',
    default_value NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_fields_default_value DEFAULT '',
    placeholder NVARCHAR(255) NOT NULL CONSTRAINT DF_record_fields_placeholder DEFAULT '',
    help_text NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_fields_help_text DEFAULT '',
    validation_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_fields_validation_json DEFAULT '{}',
    rules_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_fields_rules_json DEFAULT '{}',
    display_order INT NOT NULL CONSTRAINT DF_record_fields_display_order DEFAULT 0,
    is_active INT NOT NULL CONSTRAINT DF_record_fields_is_active DEFAULT 1,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_fields_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_fields_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_record_fields_field_type CHECK (field_type IN ('text', 'textarea', 'select', 'number', 'date', 'checkbox', 'computed')),
    CONSTRAINT CK_record_fields_required CHECK (required IN (0, 1)),
    CONSTRAINT CK_record_fields_options_json CHECK (ISJSON(options_json) = 1),
    CONSTRAINT CK_record_fields_validation_json CHECK (ISJSON(validation_json) = 1),
    CONSTRAINT CK_record_fields_rules_json CHECK (ISJSON(rules_json) = 1),
    CONSTRAINT FK_record_fields_record_type FOREIGN KEY (record_type_id) REFERENCES dbo.record_types(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.record_instances', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.record_instances (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_record_instances PRIMARY KEY,
    record_type_id NVARCHAR(64) NOT NULL,
    title NVARCHAR(255) NOT NULL CONSTRAINT DF_record_instances_title DEFAULT '',
    status NVARCHAR(40) NOT NULL CONSTRAINT DF_record_instances_status DEFAULT 'borrador',
    version INT NOT NULL CONSTRAINT DF_record_instances_version DEFAULT 1,
    locked INT NOT NULL CONSTRAINT DF_record_instances_locked DEFAULT 0,
    source NVARCHAR(40) NOT NULL CONSTRAINT DF_record_instances_source DEFAULT 'dynamic',
    created_by NVARCHAR(64) NULL,
    created_by_name NVARCHAR(255) NULL,
    updated_by NVARCHAR(64) NULL,
    updated_by_name NVARCHAR(255) NULL,
    approved_by NVARCHAR(64) NULL,
    approved_by_name NVARCHAR(255) NULL,
    approved_at DATETIME2(0) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_instances_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_instances_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_record_instances_status CHECK (status IN ('borrador', 'en_revision', 'aprobado', 'rechazado', 'obsoleto')),
    CONSTRAINT CK_record_instances_locked CHECK (locked IN (0, 1)),
    CONSTRAINT FK_record_instances_record_type FOREIGN KEY (record_type_id) REFERENCES dbo.record_types(id),
    CONSTRAINT FK_record_instances_created_by FOREIGN KEY (created_by) REFERENCES dbo.usuarios(id),
    CONSTRAINT FK_record_instances_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.usuarios(id),
    CONSTRAINT FK_record_instances_approved_by FOREIGN KEY (approved_by) REFERENCES dbo.usuarios(id)
  );
END;

IF OBJECT_ID('dbo.record_values', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.record_values (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_record_values PRIMARY KEY,
    record_id NVARCHAR(64) NOT NULL,
    field_id NVARCHAR(64) NOT NULL,
    value_text NVARCHAR(MAX) NULL,
    value_json NVARCHAR(MAX) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_values_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_values_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_record_values_value_json CHECK (value_json IS NULL OR ISJSON(value_json) = 1),
    CONSTRAINT FK_record_values_record FOREIGN KEY (record_id) REFERENCES dbo.record_instances(id) ON DELETE CASCADE,
    CONSTRAINT FK_record_values_field FOREIGN KEY (field_id) REFERENCES dbo.record_fields(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.record_workflow', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.record_workflow (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_record_workflow PRIMARY KEY,
    record_id NVARCHAR(64) NOT NULL,
    from_status NVARCHAR(40) NULL,
    to_status NVARCHAR(40) NOT NULL,
    action NVARCHAR(64) NOT NULL,
    comments NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_workflow_comments DEFAULT '',
    metadata_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_workflow_metadata_json DEFAULT '{}',
    performed_by NVARCHAR(64) NULL,
    performed_by_name NVARCHAR(255) NULL,
    performed_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_workflow_performed_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_record_workflow_to_status CHECK (to_status IN ('borrador', 'en_revision', 'aprobado', 'rechazado', 'obsoleto')),
    CONSTRAINT CK_record_workflow_metadata_json CHECK (ISJSON(metadata_json) = 1),
    CONSTRAINT FK_record_workflow_record FOREIGN KEY (record_id) REFERENCES dbo.record_instances(id) ON DELETE CASCADE,
    CONSTRAINT FK_record_workflow_performed_by FOREIGN KEY (performed_by) REFERENCES dbo.usuarios(id)
  );
END;

IF OBJECT_ID('dbo.record_audit_log', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.record_audit_log (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_record_audit_log PRIMARY KEY,
    record_id NVARCHAR(64) NULL,
    record_type_id NVARCHAR(64) NULL,
    entity NVARCHAR(64) NOT NULL,
    action NVARCHAR(64) NOT NULL,
    user_id NVARCHAR(64) NULL,
    user_name NVARCHAR(255) NULL,
    user_role NVARCHAR(255) NULL,
    event_timestamp DATETIME2(0) NOT NULL CONSTRAINT DF_record_audit_log_event_timestamp DEFAULT SYSDATETIME(),
    before_json NVARCHAR(MAX) NULL,
    after_json NVARCHAR(MAX) NULL,
    changed_fields_json NVARCHAR(MAX) NULL,
    details_json NVARCHAR(MAX) NULL,
    CONSTRAINT CK_record_audit_log_before_json CHECK (before_json IS NULL OR ISJSON(before_json) = 1),
    CONSTRAINT CK_record_audit_log_after_json CHECK (after_json IS NULL OR ISJSON(after_json) = 1),
    CONSTRAINT CK_record_audit_log_changed_fields_json CHECK (changed_fields_json IS NULL OR ISJSON(changed_fields_json) = 1),
    CONSTRAINT CK_record_audit_log_details_json CHECK (details_json IS NULL OR ISJSON(details_json) = 1),
    CONSTRAINT FK_record_audit_log_record FOREIGN KEY (record_id) REFERENCES dbo.record_instances(id) ON DELETE SET NULL,
    CONSTRAINT FK_record_audit_log_record_type FOREIGN KEY (record_type_id) REFERENCES dbo.record_types(id) ON DELETE SET NULL,
    CONSTRAINT FK_record_audit_log_user FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE SET NULL
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_types') AND name = 'UX_record_types_code')
  CREATE UNIQUE INDEX UX_record_types_code ON dbo.record_types(code);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_types') AND name = 'idx_record_types_process_id')
  CREATE INDEX idx_record_types_process_id ON dbo.record_types(process_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_types') AND name = 'idx_record_types_is_active')
  CREATE INDEX idx_record_types_is_active ON dbo.record_types(is_active);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_fields') AND name = 'UX_record_fields_type_key')
  CREATE UNIQUE INDEX UX_record_fields_type_key ON dbo.record_fields(record_type_id, field_key);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_fields') AND name = 'idx_record_fields_type_order')
  CREATE INDEX idx_record_fields_type_order ON dbo.record_fields(record_type_id, display_order);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_fields') AND name = 'idx_record_fields_type_active')
  CREATE INDEX idx_record_fields_type_active ON dbo.record_fields(record_type_id, is_active);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_instances') AND name = 'idx_record_instances_type_status_created_at')
  CREATE INDEX idx_record_instances_type_status_created_at ON dbo.record_instances(record_type_id, status, created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_instances') AND name = 'idx_record_instances_created_by_created_at')
  CREATE INDEX idx_record_instances_created_by_created_at ON dbo.record_instances(created_by, created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_instances') AND name = 'idx_record_instances_status_updated_at')
  CREATE INDEX idx_record_instances_status_updated_at ON dbo.record_instances(status, updated_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_values') AND name = 'UX_record_values_record_field')
  CREATE UNIQUE INDEX UX_record_values_record_field ON dbo.record_values(record_id, field_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_values') AND name = 'idx_record_values_record_id')
  CREATE INDEX idx_record_values_record_id ON dbo.record_values(record_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_values') AND name = 'idx_record_values_field_id')
  CREATE INDEX idx_record_values_field_id ON dbo.record_values(field_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_workflow') AND name = 'idx_record_workflow_record_performed_at')
  CREATE INDEX idx_record_workflow_record_performed_at ON dbo.record_workflow(record_id, performed_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_workflow') AND name = 'idx_record_workflow_to_status')
  CREATE INDEX idx_record_workflow_to_status ON dbo.record_workflow(to_status, performed_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_audit_log') AND name = 'idx_record_audit_log_record_timestamp')
  CREATE INDEX idx_record_audit_log_record_timestamp ON dbo.record_audit_log(record_id, event_timestamp DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_audit_log') AND name = 'idx_record_audit_log_type_timestamp')
  CREATE INDEX idx_record_audit_log_type_timestamp ON dbo.record_audit_log(record_type_id, event_timestamp DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_audit_log') AND name = 'idx_record_audit_log_user_timestamp')
  CREATE INDEX idx_record_audit_log_user_timestamp ON dbo.record_audit_log(user_id, event_timestamp DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_audit_log') AND name = 'idx_record_audit_log_action_timestamp')
  CREATE INDEX idx_record_audit_log_action_timestamp ON dbo.record_audit_log(action, event_timestamp DESC);

PRINT 'Migration 014_dynamic_records_engine.sql aplicada correctamente.';
