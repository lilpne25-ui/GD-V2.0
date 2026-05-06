SET NOCOUNT ON;

/* Smoke check de configuracion FP-05-C y reutilizacion de formulario dinamico */

DECLARE @recordTypeId NVARCHAR(64) = (
  SELECT TOP 1 id
  FROM dbo.record_types
  WHERE LOWER(code) = LOWER('FP-05-C')
);

SELECT
  CASE WHEN @recordTypeId IS NULL THEN 'FAIL' ELSE 'OK' END AS fp05c_type_exists,
  @recordTypeId AS record_type_id;

SELECT
  rt.id,
  rt.code,
  rt.name,
  rt.is_active,
  rt.settings_json
FROM dbo.record_types rt
WHERE rt.id = @recordTypeId;

SELECT
  rf.field_key,
  rf.label,
  rf.field_type,
  rf.required,
  rf.default_value,
  rf.display_order,
  rf.is_active
FROM dbo.record_fields rf
WHERE rf.record_type_id = @recordTypeId
ORDER BY rf.display_order ASC;

SELECT
  SUM(CASE WHEN rf.field_key = 'equipo' AND rf.field_type = 'select' THEN 1 ELSE 0 END) AS ok_equipo,
  SUM(CASE WHEN rf.field_key = 'tipo' AND rf.field_type = 'select' THEN 1 ELSE 0 END) AS ok_tipo,
  SUM(CASE WHEN rf.field_key = 'actividad' AND rf.field_type = 'textarea' THEN 1 ELSE 0 END) AS ok_actividad,
  SUM(CASE WHEN rf.field_key = 'responsable' AND rf.default_value = '@@actor.name' THEN 1 ELSE 0 END) AS ok_responsable_auto,
  SUM(CASE WHEN rf.field_key = 'fecha' AND rf.default_value = '@@now.date' THEN 1 ELSE 0 END) AS ok_fecha_auto
FROM dbo.record_fields rf
WHERE rf.record_type_id = @recordTypeId;

SELECT TOP 20
  rt.code,
  rt.name,
  COUNT(1) AS total_campos_activos
FROM dbo.record_types rt
INNER JOIN dbo.record_fields rf
  ON rf.record_type_id = rt.id
 AND rf.is_active = 1
GROUP BY rt.code, rt.name
ORDER BY rt.code ASC;
