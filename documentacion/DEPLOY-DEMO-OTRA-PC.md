# Deploy nativo en otra PC (demo)

## 1) Archivo que debes llevar

- Instalador: `dist\sgc-desktop-app Setup 0.1.0.exe`

Opcional:
- Carpeta portable sin instalación: `dist\win-unpacked\`

## 2) Requisitos mínimos en la otra PC

- Windows 10/11 x64.
- Acceso de red al SQL Server (si la BD está en otra máquina).
- SQL Server con autenticación SQL habilitada (modo mixto) y login `sa` activo.
- `sa` con contraseña válida para la instancia destino.
- **ODBC Driver 17 for SQL Server** solo si vas a usar `SGC_DB_TRUSTED=1` (conexión integrada Windows).
- Permisos para instalar aplicación (o usar `win-unpacked` si no hay permisos de instalación).

## 3) Configuración de entorno (opcional pero recomendado)

La app en producción carga `.env` desde:

- `%APPDATA%\sgc-desktop-app\.env`

Ejemplo base:

```env
SGC_DB_SERVER=TU_SERVIDOR_SQL
SGC_DB_PORT=1433
SGC_DB_DATABASE=SGC_Dev

# Opción A: autenticación SQL (recomendada para demo)
SGC_DB_TRUSTED=0
SGC_DB_USER=sa
SGC_DB_PASSWORD=NuevaContraseña123!

# Opción B: autenticación integrada Windows
# SGC_DB_TRUSTED=1
# SGC_DB_USER=
# SGC_DB_PASSWORD=

SGC_DB_ENCRYPT=0
SGC_DB_TRUST_CERT=1
SGC_DB_POOL_MAX=10
```

Notas:
- Si usarás SMTP en demo, agrega también las variables `SGC_SMTP_*`.
- El instalador **no** empaqueta `.env` (por diseño); va fuera del paquete.
- Si no existe `.env`, el build empaquetado usa fallback de demo (`sa` / `NuevaContraseña123!`) con `SGC_Dev` en `localhost`.

## 4) SQL Server para demo (check rápido)

- Debe existir BD objetivo (por defecto `SGC_Dev`).
- Debe estar abierto TCP 1433 (o el puerto que uses).
- El usuario (Windows o SQL) debe tener permisos para:
  - leer/escribir tablas de la app,
  - ejecutar migraciones al primer arranque.

## 5) Flujo recomendado para mostrar demo

1. Instalar app con `sgc-desktop-app Setup 0.1.0.exe`.
2. Crear `%APPDATA%\sgc-desktop-app\.env` con datos de SQL.
3. Abrir la app.
4. Verificar login.
5. Abrir 2-3 módulos clave (ej. Documentación, Workflow, Usuarios) para smoke test.

## 6) Fallas típicas y solución directa

- Error de conexión SQL:
  - revisar `SGC_DB_SERVER`, puerto y firewall.
- No conecta con `SGC_DB_TRUSTED=1`:
  - instalar ODBC Driver 17 y validar permisos del usuario Windows en SQL.
- Entorno de demo sin instalación:
  - usar `dist\win-unpacked\` y mantener mismo `.env` en `%APPDATA%\sgc-desktop-app\`.

## 7) Comando de build (equipo origen)

```powershell
npm run build
```

Salida esperada:
- `dist\sgc-desktop-app Setup 0.1.0.exe`
