SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/*
  Migration 016 - Seed FP-05-C (Reporte de mantenimiento TI)
  Configuracion 100% por datos para motor dinamico.
*/

IF OBJECT_ID('dbo.record_types', 'U') IS NULL OR OBJECT_ID('dbo.record_fields', 'U') IS NULL
BEGIN
  RETURN;
END;

BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @code NVARCHAR(80) = 'FP-05-C';
  DECLARE @recordTypeId NVARCHAR(64) = 'rt-fp05c';
  DECLARE @existingByCode NVARCHAR(64) = (
    SELECT TOP 1 id
    FROM dbo.record_types
    WHERE LOWER(code) = LOWER(@code)
  );

  IF @existingByCode IS NOT NULL
  BEGIN
    SET @recordTypeId = @existingByCode;
  END;

  DECLARE @wasExisting INT = CASE WHEN EXISTS (SELECT 1 FROM dbo.record_types WHERE id = @recordTypeId) THEN 1 ELSE 0 END;

  MERGE dbo.record_types AS target
  USING (
    SELECT
      @recordTypeId AS id,
      @code AS code,
      N'Reporte de mantenimiento TI' AS name,
      N'Registro dinamico para mantenimiento preventivo/correctivo de activos TI.' AS description,
      CAST(NULL AS NVARCHAR(64)) AS process_id,
      N'{"enableWorkflow":true,"enableAudit":true,"defaultStatus":"borrador","ui":{"icon":"build","color":"#2A6F7E","listColumns":["equipo","tipo","responsable","fecha"]}}' AS settings_json,
      1 AS is_active,
      1 AS version
  ) AS source
  ON target.id = source.id
  WHEN MATCHED THEN
    UPDATE SET
      code = source.code,
      name = source.name,
      description = source.description,
      process_id = source.process_id,
      settings_json = source.settings_json,
      is_active = source.is_active,
      version = CASE WHEN target.version < source.version THEN source.version ELSE target.version END,
      updated_by = NULL,
      updated_at = SYSDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (id, code, name, description, process_id, settings_json, is_active, version, created_by, updated_by, created_at, updated_at)
    VALUES (source.id, source.code, source.name, source.description, source.process_id, source.settings_json, source.is_active, source.version, NULL, NULL, SYSDATETIME(), SYSDATETIME());

  DECLARE @fields TABLE (
    id NVARCHAR(64) NOT NULL,
    field_key NVARCHAR(100) NOT NULL,
    label NVARCHAR(255) NOT NULL,
    field_type NVARCHAR(40) NOT NULL,
    required INT NOT NULL,
    options_json NVARCHAR(MAX) NOT NULL,
    default_value NVARCHAR(MAX) NOT NULL,
    placeholder NVARCHAR(255) NOT NULL,
    help_text NVARCHAR(MAX) NOT NULL,
    validation_json NVARCHAR(MAX) NOT NULL,
    rules_json NVARCHAR(MAX) NOT NULL,
    display_order INT NOT NULL,
    is_active INT NOT NULL
  );

  INSERT INTO @fields (
    id,
    field_key,
    label,
    field_type,
    required,
    options_json,
    default_value,
    placeholder,
    help_text,
    validation_json,
    rules_json,
    display_order,
    is_active
  ) VALUES
  (
    'rf-fp05c-equipo',
    'equipo',
    N'Equipo',
    'select',
    1,
    N'[{"value":"servidor_principal","label":"Servidor principal"},{"value":"switch_core","label":"Switch core"},{"value":"firewall_perimetral","label":"Firewall perimetral"},{"value":"ups_sala_ti","label":"UPS sala TI"}]',
    N'',
    N'Selecciona el equipo intervenido',
    N'Activo TI sobre el cual se ejecuto la actividad.',
    N'{}',
    N'[]',
    10,
    1
  ),
  (
    'rf-fp05c-tipo',
    'tipo',
    N'Tipo de mantenimiento',
    'select',
    1,
    N'[{"value":"preventivo","label":"Preventivo"},{"value":"correctivo","label":"Correctivo"}]',
    N'preventivo',
    N'Selecciona el tipo',
    N'Clasificacion del mantenimiento ejecutado.',
    N'{}',
    N'[]',
    20,
    1
  ),
  (
    'rf-fp05c-actividad',
    'actividad',
    N'Actividad realizada',
    'textarea',
    1,
    N'[]',
    N'',
    N'Describe la actividad realizada',
    N'Detalle tecnico de la intervencion.',
    N'{"minLength":10,"maxLength":2000}',
    N'[]',
    30,
    1
  ),
  (
    'rf-fp05c-responsable',
    'responsable',
    N'Responsable',
    'text',
    1,
    N'[]',
    '@@actor.name',
    N'',
    N'Se completa automaticamente con el usuario activo.',
    N'{}',
    N'[]',
    40,
    1
  ),
  (
    'rf-fp05c-fecha',
    'fecha',
    N'Fecha',
    'date',
    1,
    N'[]',
    '@@now.date',
    N'',
    N'Se completa automaticamente con la fecha actual.',
    N'{}',
    N'[]',
    50,
    1
  );

  MERGE dbo.record_fields AS target
  USING (
    SELECT
      @recordTypeId AS record_type_id,
      id,
      field_key,
      label,
      field_type,
      required,
      options_json,
      default_value,
      placeholder,
      help_text,
      validation_json,
      rules_json,
      display_order,
      is_active
    FROM @fields
  ) AS source
  ON target.record_type_id = source.record_type_id
     AND target.field_key = source.field_key
  WHEN MATCHED THEN
    UPDATE SET
      label = source.label,
      field_type = source.field_type,
      required = source.required,
      options_json = source.options_json,
      default_value = source.default_value,
      placeholder = source.placeholder,
      help_text = source.help_text,
      validation_json = source.validation_json,
      rules_json = source.rules_json,
      display_order = source.display_order,
      is_active = source.is_active,
      updated_at = SYSDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      id,
      record_type_id,
      field_key,
      label,
      field_type,
      required,
      options_json,
      default_value,
      placeholder,
      help_text,
      validation_json,
      rules_json,
      display_order,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      source.id,
      source.record_type_id,
      source.field_key,
      source.label,
      source.field_type,
      source.required,
      source.options_json,
      source.default_value,
      source.placeholder,
      source.help_text,
      source.validation_json,
      source.rules_json,
      source.display_order,
      source.is_active,
      SYSDATETIME(),
      SYSDATETIME()
    );

  INSERT INTO dbo.record_audit_log (
    id,
    record_id,
    record_type_id,
    entity,
    action,
    user_id,
    user_name,
    user_role,
    event_timestamp,
    before_json,
    after_json,
    changed_fields_json,
    details_json
  ) VALUES (
    CONCAT('raud-', LOWER(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''))),
    NULL,
    @recordTypeId,
    'record_type',
    CASE WHEN @wasExisting = 1 THEN 'update' ELSE 'create' END,
    NULL,
    'migration',
    'system',
    SYSDATETIME(),
    NULL,
    N'{"code":"FP-05-C","name":"Reporte de mantenimiento TI"}',
    N'["fields","settings"]',
    N'{"source":"016_seed_record_type_fp05c.sql"}'
  );

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
