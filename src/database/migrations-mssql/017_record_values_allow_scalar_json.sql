SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/*
  Migration 017 - Permitir JSON escalar en record_values.value_json
  Motivo:
    - El motor de registros dinamicos persiste strings/numeros/boolean en value_json
      como JSON escalar (ej. "texto", 123, true), ademas de objetos/arreglos.
    - ISJSON(value_json)=1 valida solo objeto/arreglo en esta instancia SQL Server.
*/

IF OBJECT_ID('dbo.record_values', 'U') IS NULL
BEGIN
  RETURN;
END;

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('dbo.record_values')
    AND name = 'CK_record_values_value_json'
)
BEGIN
  ALTER TABLE dbo.record_values DROP CONSTRAINT CK_record_values_value_json;
END;

ALTER TABLE dbo.record_values
WITH CHECK
ADD CONSTRAINT CK_record_values_value_json CHECK (
  value_json IS NULL
  OR ISJSON(value_json) = 1
  OR (
    LEFT(LTRIM(value_json), 1) = '"'
    AND RIGHT(RTRIM(value_json), 1) = '"'
  )
  OR LOWER(LTRIM(RTRIM(value_json))) IN ('true', 'false', 'null')
  OR TRY_CONVERT(float, value_json) IS NOT NULL
);

PRINT 'Migration 017_record_values_allow_scalar_json.sql aplicada correctamente.';
