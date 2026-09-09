# Security Backlog — GD-V2

Trabajo de seguridad **identificado pero deliberadamente fuera** de la Fase 0.5.
Se documenta aquí para no arrastrarlo dentro del sprint actual.

Referencia del sprint cerrado: [`AUTH_HARDENING_0_5.md`](./AUTH_HARDENING_0_5.md)

Criterio de prioridad:

- **P0** — explotable o bloqueante hoy. Atender antes de la siguiente fase.
- **P1** — debilidad real de diseño. Atender antes de exponer el producto a más usuarios.
- **P2** — mejora de robustez o higiene. Planificable.

---

## P0

### P0-1 · Rotar la clave de API de DeepSeek
La clave estuvo publicada en el repositorio y **sigue en el historial de git**
(`52478ff`, `3f35308`). Retirarla de `.env.example` no la invalida.
- **Acción:** revocar y emitir una nueva en el proveedor.
- **Nota:** no se reescribe el historial en este sprint (indicación explícita).
- **Verificación:** la clave anterior deja de autenticar contra la API.

### P0-2 · Ejecutar la migración de credenciales en cada entorno
Tras desplegar, `npm run migrate:passwords` debe correrse en dev, QA y
producción. Sin ese paso, las credenciales legacy no autentican.
- El comportamiento es fail-closed (correcto), pero **bloquea el acceso**.
- **Verificación:** el reporte muestra `migradas=N, errores=0` y una segunda
  ejecución devuelve `migradas=0`.

### P0-3 · Definir `SGC_ALLOWED_FILE_ROOTS` en cada entorno
Sin esta variable, `FileAccessPolicy` deniega todo acceso a archivos y la
previsualización de documentos deja de funcionar. Es deny-by-default
intencionado, pero debe configurarse en el despliegue.
- **Verificación:** abrir un documento desde el módulo Documentación.

---

## P1

### P1-1 · RBAC real sobre `repo:call`
Hoy la regla es `AUTHENTICATED / NOT AUTHENTICATED`. La `ALLOWLIST` filtra por
repositorio y método, pero **no por rol**: cualquier usuario autenticado puede
invocar cualquier método permitido.
- **Propuesta:** matriz `rol × repositorio × método`, derivada de la sesión.
- **Cuidado:** no inventar permisos ficticios; partir de los roles reales del
  organigrama ISO.

### P1-2 · Reducir `localStorage` a un identificador opaco
`sgc.currentUser`, `sgc.currentRole` y `sgc.session` persisten como espejo
visual. Ya **no autorizan** nada, pero siguen siendo superficie innecesaria.
- **Consumidores a adaptar:** `Documentacion.tsx`, `Registros.tsx`,
  `useDocumentacionSave.ts`, `DynamicRecordsPanel.tsx`.
- **Objetivo:** que el renderer obtenga el usuario desde `AuthContext`, y sólo
  `sgc.sessionId` sobreviva en `localStorage`.

### P1-3 · Rate limiting y bloqueo por fuerza bruta en el login
`auth:login` no limita intentos. Con bcrypt coste 10 el ataque es lento, pero no
hay bloqueo por usuario ni retardo progresivo.
- **Propuesta:** contador por login + ventana temporal, con bloqueo temporal.

### P1-4 · Persistencia e inactividad de sesiones
Las sesiones viven en memoria del proceso main:
- se pierden al reiniciar la aplicación;
- expiran a las 8 h absolutas, pero **no** por inactividad, pese a que
  `lastActivityAt` ya se registra.
- **Propuesta:** timeout de inactividad + decisión explícita sobre persistencia.

### P1-5 · Pruebas de integración contra SQL Server
Las pruebas actuales son unitarias y de invariantes de código. Faltan:
- TEST 5 funcional (usuario inactivo → DENY contra base real);
- migración legacy end-to-end sobre `usuario_credenciales`;
- `019_credentials_hardening.sql` aplicada dos veces (idempotencia real).
- **Propuesta:** servicio SQL Server en CI o contenedor efímero.

### P1-6 · Política de contraseñas
`bootstrap-admin.js` exige 12 caracteres, pero `UsuarioRepo.create` y
`setPassword` aceptan cualquier cadena no vacía.
- **Propuesta:** validación única y compartida (longitud, complejidad,
  contraseñas comunes), aplicada en el backend.

### P1-7 · Revisar `window:open-path`
`shell.openPath` delega en el sistema operativo: aunque la ruta esté dentro de
una raíz autorizada, abre el archivo con la aplicación asociada. Un `.exe` o
`.lnk` dentro de una raíz autorizada sería ejecutable.
- **Propuesta:** allowlist de extensiones para `openPath`.

---

## P2

### P2-1 · Vulnerabilidades de `npm audit`
Vulnerabilidades heredadas en el árbol de dependencias. No se actualizaron
masivamente por indicación del sprint.
- **Propuesta:** triaje por explotabilidad real en Electron empaquetado, y
  actualizaciones dirigidas. **No** ejecutar `npm audit fix --force` sin revisar.

### P2-2 · Hook pre-commit para el escáner de secretos
`scripts/secret-scan.js --staged` ya existe y CI lo ejecuta, pero no está
instalado como hook local.
- **Propuesta:** hook versionado (`core.hooksPath`) o husky.

### P2-3 · Auditoría de eventos de autenticación
No se registran intentos fallidos, logins correctos ni cierres de sesión.
Relevante para la trazabilidad exigida por ISO 9001.
- **Propuesta:** tabla de auditoría de autenticación, sin datos sensibles.

### P2-4 · Revisar `contextIsolation` y CSP del renderer
`contextIsolation` está activo y `nodeIntegration` desactivado. Falta revisar la
Content Security Policy y `webSecurity` del `BrowserWindow`.

### P2-5 · Firma de código del instalador
`electron-builder` falla en `winCodeSign` por privilegios de symlink en Windows.
Documentado y aislado en CI, pero la firma real del instalador sigue pendiente.

### P2-6 · Retirar `UsuarioRepo.authenticate` del puente `repo:call`
Existe un camino redundante: `repo:call → UsuarioRepo.authenticate` convive con
`auth:login`. Ambos terminan en `AuthService`, pero mantener dos entradas al
login amplía la superficie y obliga al bypass especial de `withAuth`.
- **Propuesta:** dejar `auth:login` como única entrada y eliminar el caso
  especial del middleware.
