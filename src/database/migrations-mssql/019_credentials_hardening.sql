-- 019_credentials_hardening.sql
-- Fase 0.5 - Auth & Security Foundation.
--
-- Objetivo: eliminar la contrasena por defecto conocida en instalaciones que ya
-- aplicaron 001/004, y dejar la columna preparada para almacenar hashes bcrypt.
--
-- IMPORTANTE: esta migracion NO convierte credenciales legacy a bcrypt.
-- El hashing se realiza desde Node (bcrypt no existe en T-SQL) mediante:
--     npm run migrate:passwords
-- Ver docs/security/AUTH_HARDENING_0_5.md.
--
-- Idempotente: se puede aplicar varias veces sin efecto adicional.

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

-- 1) Eliminar cualquier DEFAULT sobre usuario_credenciales.[password].
--    El nombre puede ser explicito (001) o autogenerado (004), asi que se
--    resuelve dinamicamente desde el catalogo.
IF OBJECT_ID('dbo.usuario_credenciales', 'U') IS NOT NULL
BEGIN
  DECLARE @constraintName SYSNAME;
  DECLARE @sql NVARCHAR(MAX);

  SELECT @constraintName = dc.name
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c
          ON c.object_id = dc.parent_object_id
         AND c.column_id = dc.parent_column_id
  WHERE dc.parent_object_id = OBJECT_ID('dbo.usuario_credenciales')
    AND c.name = 'password';

  WHILE @constraintName IS NOT NULL
  BEGIN
    SET @sql = N'ALTER TABLE dbo.usuario_credenciales DROP CONSTRAINT ' + QUOTENAME(@constraintName) + N';';
    EXEC sp_executesql @sql;

    SET @constraintName = NULL;

    SELECT @constraintName = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
            ON c.object_id = dc.parent_object_id
           AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.usuario_credenciales')
      AND c.name = 'password';
  END;
END;

-- 2) Asegurar longitud suficiente para un hash bcrypt (60 chars) con margen.
IF OBJECT_ID('dbo.usuario_credenciales', 'U') IS NOT NULL
   AND EXISTS (
     SELECT 1
     FROM sys.columns c
     WHERE c.object_id = OBJECT_ID('dbo.usuario_credenciales')
       AND c.name = 'password'
       AND c.max_length < 510   -- NVARCHAR(255) = 510 bytes
   )
BEGIN
  ALTER TABLE dbo.usuario_credenciales ALTER COLUMN [password] NVARCHAR(255) NOT NULL;
END;

-- 3) Marca de auditoria: deja constancia de que la instalacion paso por Fase 0.5.
IF OBJECT_ID('dbo.usuario_credenciales', 'U') IS NOT NULL
BEGIN
  PRINT 'usuario_credenciales: DEFAULT de contrasena eliminado. Ejecuta "npm run migrate:passwords" para convertir credenciales legacy a bcrypt.';
END;

PRINT 'Migration 019_credentials_hardening.sql aplicada correctamente.';
