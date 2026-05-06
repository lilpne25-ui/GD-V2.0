SET NOCOUNT ON;
PRINT 'SMOKE_START';

-- Usuarios
SELECT 'usuarios.count' AS check_name, COUNT(1) AS value FROM dbo.usuarios;
SELECT 'credenciales.count' AS check_name, COUNT(1) AS value FROM dbo.usuario_credenciales;
SELECT TOP 1 'auth.join.sample' AS check_name, u.id, u.nombre, u.activo, ISNULL(c.[password],'') AS has_password
FROM dbo.usuarios u
LEFT JOIN dbo.usuario_credenciales c ON c.user_id = u.id
ORDER BY u.updated_at DESC;

-- Documentación
SELECT 'documento_nodos.count' AS check_name, COUNT(1) AS value FROM dbo.documento_nodos;
BEGIN TRAN;
  INSERT INTO dbo.documento_nodos (id, parent_id, name, node_type) VALUES ('smk-doc-node', 'root', N'Smoke Node', 'folder');
  SELECT 'documento_nodos.inserted' AS check_name, COUNT(1) AS value FROM dbo.documento_nodos WHERE id='smk-doc-node';
ROLLBACK TRAN;

-- Workflow
SELECT 'workflow.count' AS check_name, COUNT(1) AS value FROM dbo.documento_workflow;
SELECT 'notificaciones.count' AS check_name, COUNT(1) AS value FROM dbo.notificaciones;
BEGIN TRAN;
  INSERT INTO dbo.notificaciones (id, user_id, tipo, titulo, mensaje, leida)
  VALUES ('smk-notif-1', 'usr-admin', 'sistema', N'Smoke', N'Prueba workflow', 0);
  UPDATE dbo.notificaciones SET leida = 1 WHERE id='smk-notif-1';
  SELECT 'notificaciones.crud' AS check_name, user_id, tipo, leida FROM dbo.notificaciones WHERE id='smk-notif-1';
ROLLBACK TRAN;

-- Indicadores
SELECT 'indicadores.count' AS check_name, COUNT(1) AS value FROM dbo.indicadores;
BEGIN TRAN;
  INSERT INTO dbo.indicadores (id, codigo, nombre) VALUES ('smk-ind-1','SMK-IND-1',N'Indicador Smoke');
  UPDATE dbo.indicadores SET descripcion=N'Editado smoke' WHERE id='smk-ind-1';
  SELECT 'indicadores.crud' AS check_name, codigo, nombre FROM dbo.indicadores WHERE id='smk-ind-1';
ROLLBACK TRAN;

-- Proveedores
SELECT 'proveedores.count' AS check_name, COUNT(1) AS value FROM dbo.proveedores;
BEGIN TRAN;
  INSERT INTO dbo.proveedores (id, codigo, razon_social) VALUES ('smk-prov-1','SMK-PROV-1',N'Proveedor Smoke');
  SELECT 'proveedores.crud' AS check_name, codigo, razon_social FROM dbo.proveedores WHERE id='smk-prov-1';
ROLLBACK TRAN;

-- Revisión dirección
SELECT 'rev_dir.count' AS check_name, COUNT(1) AS value FROM dbo.revisiones_direccion;
BEGIN TRAN;
  INSERT INTO dbo.revisiones_direccion (id, codigo, titulo, fecha) VALUES ('smk-rev-1','SMK-REV-1',N'Revisión Smoke', SYSDATETIME());
  SELECT 'rev_dir.crud' AS check_name, codigo, titulo FROM dbo.revisiones_direccion WHERE id='smk-rev-1';
ROLLBACK TRAN;

-- Competencias
SELECT 'competencias.count' AS check_name, COUNT(1) AS value FROM dbo.competencias;
BEGIN TRAN;
  INSERT INTO dbo.competencias (id, nombre) VALUES ('smk-comp-1', N'Competencia Smoke');
  SELECT 'competencias.crud' AS check_name, nombre FROM dbo.competencias WHERE id='smk-comp-1';
ROLLBACK TRAN;

-- Satisfacción
SELECT 'encuestas.count' AS check_name, COUNT(1) AS value FROM dbo.encuestas;
BEGIN TRAN;
  INSERT INTO dbo.encuestas (id, codigo, titulo) VALUES ('smk-enc-1','SMK-ENC-1',N'Encuesta Smoke');
  SELECT 'encuestas.crud' AS check_name, codigo, titulo FROM dbo.encuestas WHERE id='smk-enc-1';
ROLLBACK TRAN;

-- Control de cambios
SELECT 'sol_cambio.count' AS check_name, COUNT(1) AS value FROM dbo.solicitudes_cambio;
BEGIN TRAN;
  INSERT INTO dbo.solicitudes_cambio (id, codigo, titulo, tipo) VALUES ('smk-cc-1','SMK-CC-1',N'Cambio Smoke', 'menor');
  SELECT 'sol_cambio.crud' AS check_name, codigo, titulo, tipo FROM dbo.solicitudes_cambio WHERE id='smk-cc-1';
ROLLBACK TRAN;

PRINT 'SMOKE_OK';
