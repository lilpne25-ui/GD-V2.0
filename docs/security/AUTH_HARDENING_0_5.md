# Fase 0.5 — Auth & Security Foundation

Endurecimiento de autenticación, credenciales, sesiones, IPC y acceso a archivos
de GD-V2, previo a construir ISO 9001, SGC Mirror, Policy Engine, FP-15,
Evidence Graph y Closed Quality Loop.

Rama: `fix/auth-hardening-0.5` · Base: `main` (`b8257b8`)

Este sprint **no añade funcionalidad de negocio**. Sólo corrige la base de
seguridad.

---

## 1. Estado inicial

`main` acababa de recuperarse de un merge roto (PR #1). El subsistema de
autenticación (`AuthService`, `SessionManager`, `AuthContext`, `ProtectedRoute`)
convivía por primera vez con el Dynamic Records Engine y el RAG, pero la base de
credenciales era inconsistente y varios canales IPC estaban sin proteger.

El síntoma más visible: **nadie podía iniciar sesión**. `AuthService` validaba
con bcrypt contra una columna que contenía texto plano (`'123456'`), de modo que
`bcrypt.compare` devolvía siempre `false`.

---

## 2. Vulnerabilidades encontradas

| # | Severidad | Vulnerabilidad |
|---|---|---|
| A | **Crítica** | `UsuarioRepo.create` y `setPassword` almacenaban contraseñas en **texto plano**. Las migraciones sembraban `DEFAULT '123456'` para todos los usuarios. |
| B | **Crítica** | El modelo público `UsuarioRow` incluía `password`; `getAll()`/`getById()` la enviaban al renderer. El módulo Usuarios la **mostraba en pantalla** con un botón de "ver contraseña". |
| C | **Crítica** | Escalada de privilegios: `Usuarios.activateSession()` escribía `sgc.currentRole` en `localStorage`, y los handlers `records:*` tomaban `role`/`createdBy` **del payload** enviado por el renderer. Editando `localStorage` cualquiera se convertía en ADMIN. |
| D | **Crítica** | Los 7 canales `records:*` y los 6 canales `rag:*` se registraban **sin `withAuth`**: operaban sin sesión. |
| E | **Crítica** | `window:open-path`, `window:read-file-data-url` y `window:read-file-buffer` aceptaban **cualquier ruta absoluta** sin autenticación. Un renderer comprometido podía leer `.env`, `.ssh`, `AppData` o cualquier archivo del usuario. |
| F | **Alta** | Bypass de desarrollo presente en el código: `DISABLE_LOGIN_FOR_NOW`, `DEV_SESSION_USER`, `DEV_SESSION_RECORD` con `permissions: ['*']` y `securityVersion: 'dev-bypass'`. Estaba en `false`, pero a un flag de distancia. |
| G | **Alta** | Tres scripts de desarrollo volcaban credenciales por consola e implementaban una **ruta de autenticación paralela en texto plano**: `debug-login.js`, `auth-diagnose.js`, `test-auth-local.js`. |
| H | **Media** | `repo:call` incluía `delete` en `ALLOWED_GENERIC_METHODS`, autorizando borrado en **todos** los repositorios. |
| I | **Media** | Sin tests y sin CI: cualquier regresión pasaba desapercibida. |
| J | **Media** | Clave de API DeepSeek publicada en el historial de git. |

---

## 3. Decisiones

1. **Separación usuario / credencial.** `usuario_credenciales` deja de ser
   accesible desde `UsuarioRepo`. Se introduce `CredencialRepo`, deliberadamente
   **no exportado** en `repositories/index.ts` ni incluido en la `ALLOWLIST`, de
   modo que el renderer no puede alcanzarlo por `repo:call`.
2. **bcrypt como único formato válido.** `verifyPassword` exige un hash bcrypt
   con formato estricto. Una credencial legacy en texto plano **nunca**
   autentica, aunque coincida literalmente. Esto convierte el fallo en cierre
   (fail-closed) en lugar de aceptar credenciales débiles.
3. **La autorización se decide en el backend.** `withSessionActor()` sobrescribe
   `role`, `userId`, `createdBy`, `updatedBy` y `performedBy` con los valores de
   la sesión activa, descartando lo que envíe el renderer.
4. **Sin contraseña por defecto.** Se elimina `DEFAULT '123456'` y toda siembra
   de credenciales. Un usuario sin credencial simplemente no puede entrar.
5. **El bypass se borra, no se desactiva.** Se elimina el código completo, y un
   test impide que vuelva.
6. **`AUTHENTICATED / NOT AUTHENTICATED` primero.** No se inventa un RBAC
   empresarial. La regla de esta fase es: sin sesión válida, DENY.

---

## 4. Flujo final de autenticación

```
Renderer                         Main process
────────                         ────────────
Login.tsx
  └─ useAuth().login(user, pass)
       └─ window.auth.login ──────► auth:login  (authIpc)
                                      └─ AuthService.authenticate()
                                           ├─ UsuarioRepo.getByLogin()      (sin password)
                                           ├─ ¿usuario activo?              → si no, USER_DISABLED
                                           ├─ CredencialRepo.getHashByUserId()
                                           ├─ verifyPassword(pass, hash)    (bcrypt estricto)
                                           └─ SessionManager.createSession(
                                                 userId, role, [], webContentsId, 'v1')
       ◄──────────────────────────── AuthResponse { success, session }
  └─ guarda sessionId (opaco) en localStorage
  └─ ProtectedRoute renderiza la app
```

Toda llamada IPC posterior pasa por `withAuth`, que resuelve la sesión **por
`webContents.id`**, no por un identificador que envíe el renderer.

---

## 5. Almacenamiento de contraseñas

- Algoritmo: **bcrypt**, coste `10` (`BCRYPT_ROUNDS` en `CredentialService.ts`).
- Única función de escritura: `hashPassword()`. Rechaza cadenas vacías en lugar
  de inventar una contraseña.
- Única función de lectura/comparación: `verifyPassword()`. Exige el patrón
  `$2[aby]$NN$` + 53 caracteres. Una contraseña plana que empiece por `$2` no se
  confunde con un hash.
- El hash **nunca** sale del proceso main. `UsuarioRow` ya no declara `password`,
  y `getAll()`/`getById()` ni siquiera hacen JOIN con `usuario_credenciales`.

---

## 6. Migración legacy

Bcrypt no existe en T-SQL, así que la migración se divide en dos partes:

**a) `019_credentials_hardening.sql`** (automática, con el resto de migraciones)
- Elimina dinámicamente cualquier `DEFAULT` sobre `usuario_credenciales.password`
  (el nombre puede ser explícito en `001` o autogenerado en `004`).
- Garantiza `NVARCHAR(255)` para alojar el hash.
- Es idempotente.

**b) `npm run migrate:passwords`** (explícita)

```bash
npm run migrate:passwords -- --dry   # analiza sin escribir
npm run migrate:passwords            # aplica
```

Comportamiento:

| Situación | Acción | Contador |
|---|---|---|
| Ya es hash bcrypt | No se toca | `ya-seguras` |
| Texto plano | Se hashea conservando la contraseña funcional | `migradas` |
| Vacía | No se inventa contraseña | `vacias` |
| Error de escritura | Se registra y continúa | `errores` |

Garantías verificadas por tests: idempotente (segunda ejecución migra 0), no
destruye usuarios, no resetea contraseñas y **no imprime jamás la contraseña ni
el hash completo**.

### Cómo se crea el primer administrador

No existe contraseña por defecto. El único mecanismo soportado es:

```bash
SGC_BOOTSTRAP_ADMIN_LOGIN=admin@empresa.com \
SGC_BOOTSTRAP_ADMIN_PASSWORD='<contraseña-fuerte-min-12>' \
npm run bootstrap:admin
```

El script exige que el usuario exista y esté activo, y rechaza contraseñas de
menos de 12 caracteres. Para desarrollo:

```bash
NODE_ENV=development SGC_DEV_SEED_PASSWORD='<contraseña>' npm run bootstrap:admin -- --seed-dev
```

`SGC_DEV_SEED_PASSWORD` **no tiene valor por defecto**: si no está definida, el
script aborta. En `.env.example` aparece como placeholder vacío.

---

## 7. Modelo de sesión

`SessionManager` (singleton, en memoria del proceso main):

| Capacidad | Implementación |
|---|---|
| Crear | `createSession()` — `sessionId` = `crypto.randomUUID()`, opaco |
| Validar | `getSession(id \| webContentsId)` |
| Expirar | 8 h; al consultarla vencida se destruye y devuelve `null` |
| Invalidar | `destroySession(sessionId)` |
| Destruir por ventana | `destroySessionByWebContents(webContentsId)` |
| Asociar a webContents | Campo `webContentsId`; `withAuth` resuelve por él |

### localStorage — compatibilidad legacy documentada

`localStorage` **no autoriza nada**. Lo que se conserva:

| Clave | Naturaleza | Autoridad |
|---|---|---|
| `sgc.sessionId` | Identificador opaco de sesión | Ninguna — el main lo revalida |
| `sgc.currentUser`, `sgc.currentRole`, `sgc.session` | Espejo **visual** para módulos existentes (menús, etiquetas) | **Ninguna** |

Manipular estas claves ya no concede privilegios: los canales `records:*`
derivan la identidad de la sesión mediante `withSessionActor()`, y `repo:call`
exige sesión activa. Reducir estas claves a sólo `sgc.sessionId` queda como
**P1** en el backlog (requiere adaptar Documentación, Registros y el hook
`useDocumentacionSave`).

---

## 8. IPC protegido

| Canal | Antes | Ahora |
|---|---|---|
| `repo:call` | `withAuth` + ALLOWLIST | Igual, sin `delete` genérico |
| `dashboard:get-metrics` | `withAuth` | Sin cambios |
| `records:*` (7 canales) | **Sin autenticación** | `withAuth` + identidad de sesión |
| `rag:*` (6 canales) | **Sin autenticación** | `withAuth` |
| `window:open-path` | **Sin autenticación, ruta libre** | `withAuth` + `FileAccessPolicy` |
| `window:read-file-data-url` | **Sin autenticación, ruta libre** | `withAuth` + `FileAccessPolicy` |
| `window:read-file-buffer` | **Sin autenticación, ruta libre** | `withAuth` + `FileAccessPolicy` |
| `auth:login` | Público (necesario) | Público por diseño |

### `repo:call` — deny by default

- `ALLOWED_GENERIC_METHODS` ya **no** incluye `delete`.
- **Excepción documentada:** `DocumentoTreeRepo` declara `delete` explícitamente
  porque el módulo Documentación gestiona papelera y borrado de nodos. Sigue
  sujeto a sesión activa.
- `UsuarioRepo.delete`, `setPassword` y `updatePassword` siguen bloqueados por el
  control de mutaciones destructivas previo a la ALLOWLIST.
- `CredencialRepo` **no está** en la ALLOWLIST ni en `repositories/index.ts`.

---

## 9. FileAccessPolicy

`src/main/services/FileAccessPolicy.ts`. Deny by default.

Raíces autorizadas por entorno, **sin rutas hardcodeadas de ningún cliente**:

```bash
SGC_ALLOWED_FILE_ROOTS=D:\SGC\Documentos;\\servidor\calidad\evidencias
```

Separadores admitidos: `;` y `,` (no `:`, que rompería `C:\`).

Orden de comprobación:

1. Ruta no vacía y de tipo `string` → si no, `EMPTY_PATH`.
2. Hay raíces configuradas → si no, `NO_ROOTS_CONFIGURED` (**sin configuración,
   no se lee nada**).
3. La ruta existe → si no, `NOT_FOUND`.
4. Es un archivo regular → si no, `NOT_A_FILE`.
5. Cae dentro de alguna raíz → si no, `OUTSIDE_ALLOWED_ROOTS`.

Detalles que evitan bypass:

- Se resuelven `..` y `.` con `path.resolve`, y los enlaces simbólicos con
  `fs.realpathSync.native`, **antes** de comparar.
- La comparación es **por segmentos**, no `startsWith`: `C:\datos-privados` no se
  considera hijo de `C:\datos`. Hay un test específico para esta trampa.
- En Windows la comparación es insensible a mayúsculas; soporta UNC.
- Las raíces también se canonicalizan, para comparar en el mismo espacio de
  nombres.

---

## 10. Gestión de secretos

- `.env.example` sólo contiene placeholders vacíos; un test lo verifica.
- `scripts/secret-scan.js` analiza los archivos trackeados con 9 reglas
  (claves estilo OpenAI, AWS, GitHub, Slack, bloques de clave privada, tokens
  Bearer, claves genéricas, cadenas de conexión con contraseña y asignaciones
  de contraseña en línea). **Nunca imprime el valor completo**: enmascara y
  muestra sólo el prefijo.
- Ejecutable como `npm run secret:scan`, con `--staged` para usarlo en un hook
  pre-commit, y como job propio en CI.
- Falsos positivos: comentario `secret-scan:allow` en la línea, auditable.

### ROTATION REQUIRED

La clave de API de DeepSeek estuvo publicada en el repositorio y **permanece en
el historial de git** (commits `52478ff` y `3f35308`). Fue retirada de
`.env.example`, pero eso no la invalida.

> **Acción requerida fuera de este sprint: rotar la clave en el proveedor.**

Por indicación del sprint no se reescribe el historial de git ni se genera una
clave nueva.

---

## 11. Pruebas

`npm test` → compila `tsconfig.test.json` a `dist-test/` y ejecuta `node --test`.
**No se añadió ninguna dependencia**: se usa el runner nativo de Node 22.

| Archivo | Cubre |
|---|---|
| `tests/credentials.test.js` | TEST 1, 2, 3, 4 + no filtración en logs |
| `tests/ipc-session.test.js` | TEST 8, 9, 10, 11 + expiración, invalidación, frames anidados |
| `tests/file-access-policy.test.js` | TEST 12, 13, 14 + inexistente, directorio, prefijo común |
| `tests/source-invariants.test.js` | TEST 5, 6, 7, 15, 16 + IPC protegido, sin `123456`, sin secretos |

TEST 5 (usuario inactivo → DENY) está cubierto por la rama `USER_DISABLED` de
`AuthService`, verificada estructuralmente; la validación funcional completa
requiere SQL Server (ver backlog P1: pruebas de integración).

Los tests de invariantes **no** son de cobertura: detectan regresiones reales.
Durante este sprint encontraron por sí solos los tres scripts que volcaban
credenciales (hallazgo G), que no estaban en la lista de auditoría inicial.

---

## 12. Empaquetado

`npm run build` ejecuta webpack (renderer + main) y después `electron-builder`.

Los **bundles compilan correctamente**. `electron-builder` falla en Windows al
extraer la caché `winCodeSign`, porque necesita privilegio para crear enlaces
simbólicos de `.dylib` de macOS:

```
ERROR: Cannot create symbolic link : El cliente no dispone de un privilegio requerido.
  ...winCodeSign\<id>\darwin\10.12\lib\libcrypto.dylib
```

Es un **problema de entorno, no de código**: ocurre antes de empaquetar nada de
la aplicación. Se resuelve activando el Modo Desarrollador de Windows o
ejecutando con privilegios elevados. Por eso el CI separa `code-build` (que sí
bloquea) de `installer-packaging` (`continue-on-error: true`).

---

## 13. Riesgos restantes

| Prioridad | Riesgo |
|---|---|
| **P0** | La clave DeepSeek sigue viva en el historial de git → **rotar**. |
| **P0** | Tras desplegar hay que ejecutar `npm run migrate:passwords`; sin ese paso, las credenciales legacy no autentican (fail-closed, correcto, pero bloquea el acceso). |
| **P1** | No hay RBAC: la sesión distingue autenticado / no autenticado, pero `role` aún no restringe métodos concretos en `repo:call`. |
| **P1** | `localStorage` conserva `sgc.currentUser`/`currentRole` como espejo visual. Ya no autoriza, pero debería reducirse a `sgc.sessionId`. |
| **P1** | Las sesiones viven en memoria: se pierden al reiniciar y no hay límite de intentos de login (sin rate limiting ni bloqueo por fuerza bruta). |
| **P1** | Sin pruebas de integración contra SQL Server real (TEST 5 funcional, migración end-to-end). |
| **P2** | `npm audit` reporta vulnerabilidades heredadas (ver §14 del reporte). |
| **P2** | `SGC_ALLOWED_FILE_ROOTS` sin configurar bloquea la previsualización de documentos. Es deny-by-default deliberado, pero requiere documentarlo en el despliegue. |

---

## 14. Variables de entorno nuevas

| Variable | Obligatoria | Descripción |
|---|---|---|
| `SGC_ALLOWED_FILE_ROOTS` | Sí, para previsualizar archivos | Raíces autorizadas, separadas por `;` o `,`. Sin ella, todo acceso a archivos se deniega. |
| `SGC_BOOTSTRAP_ADMIN_LOGIN` | Sólo para bootstrap | Email o id del usuario administrador inicial. |
| `SGC_BOOTSTRAP_ADMIN_PASSWORD` | Sólo para bootstrap | Contraseña inicial, mínimo 12 caracteres. Sin valor por defecto. |
| `SGC_DEV_SEED_PASSWORD` | No | Sólo con `NODE_ENV=development` y `--seed-dev`. Sin fallback. |
