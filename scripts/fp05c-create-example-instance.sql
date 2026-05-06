SET NOCOUNT ON;

/*
  Ejemplo de alta de una instancia FP-05-C
  Uso: ejecutar despues de correr migraciones (incluida 016_seed_record_type_fp05c.sql).
*/

DECLARE @recordTypeId NVARCHAR(64) = (
  SELECT TOP 1 id
  FROM dbo.record_types
  WHERE LOWER(code) = LOWER('FP-05-C')
);

IF @recordTypeId IS NULL
BEGIN
  THROW 51000, 'No existe el tipo FP-05-C. Ejecuta primero las migraciones.', 1;
END;

DECLARE @actorId NVARCHAR(64) = (
  SELECT TOP 1 id
  FROM dbo.usuarios
  WHERE activo = 1
  ORDER BY created_at ASC
);

DECLARE @actorName NVARCHAR(200) = (
  SELECT TOP 1 nombre
  FROM dbo.usuarios
  WHERE id = @actorId
);

DECLARE @recordId NVARCHAR(64) = 'ri-fp05c-demo-001';
DECLARE @today NVARCHAR(10) = CONVERT(NVARCHAR(10), SYSDATETIME(), 23);

IF NOT EXISTS (SELECT 1 FROM dbo.record_instances WHERE id = @recordId)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.record_instances (
      id,
      record_type_id,
      title,
      status,
      version,
      locked,
      source,
      created_by,
      created_by_name,
      updated_by,
      updated_by_name,
      approved_by,
      approved_by_name,
      approved_at,
      created_at,
      updated_at
    ) VALUES (
      @recordId,
      @recordTypeId,
      N'FP-05-C Demo - Mantenimiento switch core',
      'borrador',
      1,
      0,
      'dynamic',
      @actorId,
      @actorName,
      @actorId,
      @actorName,
      NULL,
      NULL,
      NULL,
      SYSDATETIME(),
      SYSDATETIME()
    );

    INSERT INTO dbo.record_values (
      id,
      record_id,
      field_id,
      value_text,
      value_json,
      created_at,
      updated_at
    )
    SELECT
      CONCAT('rv-', LOWER(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''))),
      @recordId,
      rf.id,
      CASE rf.field_key
        WHEN 'equipo' THEN 'switch_core'
        WHEN 'tipo' THEN 'preventivo'
        WHEN 'actividad' THEN N'Limpieza de interfaces, verificacion de logs y prueba de conectividad.'
        WHEN 'responsable' THEN ISNULL(@actorName, 'Usuario Demo')
        WHEN 'fecha' THEN @today
        ELSE NULL
      END,
      CASE rf.field_key
        WHEN 'equipo' THEN N'"switch_core"'
        WHEN 'tipo' THEN N'"preventivo"'
        WHEN 'actividad' THEN N'"Limpieza de interfaces, verificacion de logs y prueba de conectividad."'
        WHEN 'responsable' THEN CONCAT(N'"', STRING_ESCAPE(ISNULL(@actorName, 'Usuario Demo'), 'json'), N'"')
        WHEN 'fecha' THEN CONCAT(N'"', @today, N'"')
        ELSE NULL
      END,
      SYSDATETIME(),
      SYSDATETIME()
    FROM dbo.record_fields rf
    WHERE rf.record_type_id = @recordTypeId
      AND rf.field_key IN ('equipo', 'tipo', 'actividad', 'responsable', 'fecha');

    INSERT INTO dbo.record_workflow (
      id,
      record_id,
      from_status,
      to_status,
      action,
      comments,
      metadata_json,
      performed_by,
      performed_by_name,
      performed_at
    ) VALUES (
      CONCAT('rwf-', LOWER(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''))),
      @recordId,
      NULL,
      'borrador',
      'create',
      N'Creacion de ejemplo FP-05-C desde script SQL.',
      N'{"source":"scripts/fp05c-create-example-instance.sql"}',
      @actorId,
      @actorName,
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
      @recordId,
      @recordTypeId,
      'record_instance',
      'create',
      @actorId,
      @actorName,
      NULL,
      SYSDATETIME(),
      NULL,
      N'{"title":"FP-05-C Demo - Mantenimiento switch core"}',
      N'["equipo","tipo","actividad","responsable","fecha"]',
      N'{"source":"scripts/fp05c-create-example-instance.sql"}'
    );

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH;
END;

SELECT
  ri.id,
  rt.code,
  rt.name,
  ri.title,
  ri.status,
  ri.created_at,
  ri.updated_at
FROM dbo.record_instances ri
INNER JOIN dbo.record_types rt ON rt.id = ri.record_type_id
WHERE ri.id = @recordId;

SELECT
  rf.field_key,
  rv.value_text,
  rv.value_json
FROM dbo.record_values rv
INNER JOIN dbo.record_fields rf ON rf.id = rv.field_id
WHERE rv.record_id = @recordId
ORDER BY rf.display_order ASC;
