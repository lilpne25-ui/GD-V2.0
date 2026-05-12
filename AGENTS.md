# Reglas de respaldos locales para Codex (GD-V2.0)

Estas reglas son obligatorias cuando Codex trabaje en este repo.

## Archivos de respaldo versionados

1. `backups/20260303-101847/SGC_Dev_precutover.bak`
- Propósito: respaldo SQL Server previo al cutover.
- Uso: restaurar base local para desarrollo cuando se requiera entorno SQL real.
- Estado: solo lectura en Git (no editar ni regenerar en sitio).

2. `backups/20260303-101847/sgc_precutover.db`
- Propósito: snapshot SQLite histórico para comparación y diagnóstico legacy.
- Uso: análisis local o migraciones/validaciones contra SQL Server.
- Estado: solo lectura en Git (si se necesita experimentar, trabajar sobre una copia).

## Regla de fuente de verdad

- Para la app actual, la fuente de verdad de runtime es SQL Server + migraciones `migrations-mssql`.
- SQLite se usa como referencia histórica y apoyo de migración, no como runtime principal.

## Flujo recomendado para Codex

1. Si el usuario pide levantar entorno local completo:
- Verificar conexión SQL Server.
- Si no existe `SGC_Dev`, restaurar desde `.bak`.
- Ejecutar app y permitir que corran migraciones pendientes.

2. Si el usuario pide análisis de datos legacy:
- Consultar `sgc_precutover.db` en modo lectura.
- No sobrescribir ni borrar el archivo original.

3. Si hay diferencias entre SQL Server y SQLite:
- Priorizar SQL Server para comportamiento actual.
- Reportar divergencias y proponer script de reconciliación.

## Regla de Git

- Estos dos respaldos deben mantenerse versionados con Git LFS.
- El resto de `backups/` permanece ignorado por defecto.
