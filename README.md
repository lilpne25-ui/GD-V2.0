# GD-V2.0

Aplicación desktop para gestión de calidad (SGC) construida con Electron + React + TypeScript, usando SQL Server como runtime principal.

## Stack

- Electron 28
- React 18
- TypeScript
- SQL Server (`mssql` + `msnodesqlv8`)
- SQLite (solo soporte legacy/migración)

## Arranque rápido (desarrollo)

1. Instalar dependencias:

```powershell
npm install
```

2. Crear `.env` (puedes basarte en `.env.example`) y configurar SQL Server.

3. Ejecutar en modo desarrollo:

```powershell
npm start
```

## Build de producción

```powershell
npm run build
```

Salida esperada:
- `dist\sgc-desktop-app Setup 0.1.0.exe`
- `dist\win-unpacked\`

## Configuración de base de datos

Variables principales:

```env
SGC_DB_SERVER=localhost
SGC_DB_PORT=1433
SGC_DB_DATABASE=SGC_Dev
SGC_DB_TRUSTED=0
SGC_DB_USER=sa
SGC_DB_PASSWORD=NuevaContraseña123!
SGC_DB_ENCRYPT=0
SGC_DB_TRUST_CERT=1
```

Notas:
- Runtime actual: SQL Server + migraciones `src/database/migrations-mssql`.
- Si no existe `.env` en app empaquetada, hay fallback de demo para `sa` / `NuevaContraseña123!`.

## Respaldos versionados (Git LFS)

Se versionan explícitamente estos archivos:

- `backups/20260303-101847/SGC_Dev_precutover.bak`
- `backups/20260303-101847/sgc_precutover.db`

Uso recomendado:
- `.bak`: restaurar SQL Server local (`SGC_Dev`) para entorno real de desarrollo.
- `.db`: referencia legacy para comparación/migración (no runtime principal).

## Reglas para asistentes (Codex)

Las reglas operativas están en:

- `AGENTS.md`

Incluye:
- cómo usar `.bak` y `.db`
- prioridad SQL Server vs SQLite
- flujo sugerido para restauración local y soporte de desarrollo

## Documentación útil

- `documentacion/DEPLOY-DEMO-OTRA-PC.md`
- `documentacion/AI-CACHE-EXECUTIVE.md`
- `documentacion/AI-CACHE.md`

