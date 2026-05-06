SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/*
  Migration 015 - Record Rules Engine
  Scope:
    - record_rules
*/

IF OBJECT_ID('dbo.record_rules', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.record_rules (
    id NVARCHAR(64) NOT NULL CONSTRAINT PK_record_rules PRIMARY KEY,
    record_type_id NVARCHAR(64) NOT NULL,
    rule_name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_rules_description DEFAULT '',
    enabled INT NOT NULL CONSTRAINT DF_record_rules_enabled DEFAULT 1,
    priority INT NOT NULL CONSTRAINT DF_record_rules_priority DEFAULT 100,
    stop_on_match INT NOT NULL CONSTRAINT DF_record_rules_stop_on_match DEFAULT 0,
    conditions_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_rules_conditions_json DEFAULT '[]',
    effects_json NVARCHAR(MAX) NOT NULL CONSTRAINT DF_record_rules_effects_json DEFAULT '[]',
    created_by NVARCHAR(64) NULL,
    updated_by NVARCHAR(64) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_rules_created_at DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_record_rules_updated_at DEFAULT SYSDATETIME(),
    CONSTRAINT CK_record_rules_enabled CHECK (enabled IN (0, 1)),
    CONSTRAINT CK_record_rules_stop_on_match CHECK (stop_on_match IN (0, 1)),
    CONSTRAINT CK_record_rules_conditions_json CHECK (ISJSON(conditions_json) = 1),
    CONSTRAINT CK_record_rules_effects_json CHECK (ISJSON(effects_json) = 1),
    CONSTRAINT FK_record_rules_record_type FOREIGN KEY (record_type_id) REFERENCES dbo.record_types(id) ON DELETE CASCADE,
    CONSTRAINT FK_record_rules_created_by FOREIGN KEY (created_by) REFERENCES dbo.usuarios(id),
    CONSTRAINT FK_record_rules_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.usuarios(id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_rules') AND name = 'idx_record_rules_type_enabled_priority')
  CREATE INDEX idx_record_rules_type_enabled_priority ON dbo.record_rules(record_type_id, enabled, priority, created_at);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.record_rules') AND name = 'idx_record_rules_updated_at')
  CREATE INDEX idx_record_rules_updated_at ON dbo.record_rules(updated_at DESC);

PRINT 'Migration 015_record_rules_engine.sql aplicada correctamente.';
