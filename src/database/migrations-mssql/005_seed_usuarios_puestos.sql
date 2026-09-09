SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE id = 'org-001')
  INSERT INTO dbo.usuarios (id, nombre, email, rol, departamento, activo, created_at, updated_at)
  VALUES ('org-001', N'FERNANDO GABRIEL MORENO JUAREZ', 'u001@empresa.com', N'1 DIRECTOR', N'Dirección', 1, SYSDATETIME(), SYSDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE id = 'org-016')
  INSERT INTO dbo.usuarios (id, nombre, email, rol, departamento, activo, created_at, updated_at)
  VALUES ('org-016', N'VALDES REYES LUDWING MAXIMILIANO', 'u016@empresa.com', N'4.3 TÉCNICO TI', N'TI', 1, SYSDATETIME(), SYSDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE id = 'org-037')
  INSERT INTO dbo.usuarios (id, nombre, email, rol, departamento, activo, created_at, updated_at)
  VALUES ('org-037', N'VILLADA ESCOBAR SELENA', 'u037@empresa.com', N'8 COORDINADOR DEL SGC', N'Calidad', 1, SYSDATETIME(), SYSDATETIME());

-- Fase 0.5: los usuarios del organigrama se crean SIN credencial.
-- Cada uno recibe su contrasena mediante bootstrap/alta explicita.
-- Sin credencial no es posible iniciar sesion (no hay hash bcrypt valido).

PRINT 'Migration 005_seed_usuarios_puestos.sql aplicada correctamente.';
