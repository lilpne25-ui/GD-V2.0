// Invariantes de seguridad verificados sobre el codigo fuente.
// Fase 0.5 - Auth & Security Foundation.
//
// Cubren TEST 6, 7 (password/hash no llega al renderer), TEST 15, 16 (bypass
// eliminado) y la ausencia de contrasenas por defecto y secretos trackeados.
//
// Estas pruebas detectan regresiones reales: si alguien vuelve a seleccionar
// la columna password en getAll(), o reintroduce el bypass, fallan.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

/** Recorre archivos de codigo bajo src/ y scripts/. */
function walkSources() {
  const out = [];
  const stack = [path.join(ROOT, 'src'), path.join(ROOT, 'scripts')];
  while (stack.length) {
    const dir = stack.pop();
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

const SOURCES = walkSources();

// --- TEST 15 / 16: el bypass de desarrollo desaparecio del codigo ----------

test('TEST 15+16: no queda ninguna referencia al bypass de desarrollo', () => {
  const forbidden = [
    'DISABLE_LOGIN_FOR_NOW',
    'DEV_SESSION_USER',
    'DEV_SESSION_RECORD',
    'dev-session-id',
    'dev-bypass',
    'demo_bypass',
  ];

  const hits = [];
  for (const file of SOURCES) {
    const content = fs.readFileSync(file, 'utf8');
    for (const needle of forbidden) {
      if (content.includes(needle)) {
        hits.push(`${path.relative(ROOT, file)}: ${needle}`);
      }
    }
  }

  assert.deepEqual(hits, [], `referencias a bypass encontradas:\n${hits.join('\n')}`);
});

test('ninguna sesion concede permisos comodin en el codigo', () => {
  const hits = SOURCES.filter(f => {
    const c = fs.readFileSync(f, 'utf8');
    return /permissions\s*:\s*\[\s*['"]\*['"]\s*\]/.test(c);
  }).map(f => path.relative(ROOT, f));

  assert.deepEqual(hits, [], `permissions: ['*'] encontrado en: ${hits.join(', ')}`);
});

// --- TEST 6 / 7: el modelo publico de usuario no transporta credenciales ---

test('TEST 6+7: getAll() y getById() no seleccionan la columna password', () => {
  const repo = read('src/database/repositories/usuarioRepo.ts');

  // El modelo publico no declara password.
  const rowInterface = repo.slice(
    repo.indexOf('export interface UsuarioRow'),
    repo.indexOf('export interface UsuarioAuth')
  );
  assert.ok(!/\bpassword\b/.test(rowInterface), 'UsuarioRow no debe declarar password');

  // Ninguna consulta del repositorio publico hace JOIN con usuario_credenciales
  // ni proyecta la columna password.
  assert.ok(
    !repo.includes('usuario_credenciales'),
    'usuarioRepo no debe consultar usuario_credenciales; eso es tarea de credencialRepo'
  );
  assert.ok(
    !/COALESCE\(uc\.password/.test(repo),
    'ninguna consulta debe proyectar la columna password'
  );
});

test('solo el repositorio de credenciales accede a usuario_credenciales', () => {
  const allowed = new Set([
    path.join('src', 'database', 'repositories', 'credencialRepo.ts'),
    path.join('scripts', 'migrate-legacy-passwords.js'),
    path.join('scripts', 'bootstrap-admin.js'),
    // Copia de datos SQLite -> SQL Server: mueve la tabla sin imprimir valores.
    path.join('scripts', 'migrate-sqlite-to-mssql.js'),
    // Solo la menciona en documentacion interna, no ejecuta SQL.
    path.join('src', 'main', 'services', 'CredentialService.ts'),
  ]);

  const offenders = SOURCES
    .filter(f => fs.readFileSync(f, 'utf8').includes('usuario_credenciales'))
    .map(f => path.relative(ROOT, f))
    .filter(rel => !allowed.has(rel));

  assert.deepEqual(offenders, [], `acceso no autorizado a credenciales en: ${offenders.join(', ')}`);
});

test('el modulo Usuarios del renderer no muestra ni transporta contrasenas', () => {
  const ui = read('src/renderer/modules/usuarios/Usuarios.tsx');
  assert.ok(!/user\.password/.test(ui), 'la UI no debe leer user.password');
  assert.ok(!/activateSession/.test(ui), 'no debe existir suplantacion de sesion desde la UI');
});

// --- TEST 1 (superficie de escritura): nunca se persiste texto plano --------

test('UsuarioRepo delega toda escritura de credencial en CredencialRepo', () => {
  const repo = read('src/database/repositories/usuarioRepo.ts');
  assert.ok(repo.includes('CredencialRepo.setPassword'), 'setPassword debe delegar en CredencialRepo');
  assert.ok(!repo.includes('MERGE usuario_credenciales'), 'no debe escribir credenciales directamente');
});

test('CredencialRepo solo persiste hashes generados por hashPassword', () => {
  const repo = read('src/database/repositories/credencialRepo.ts');
  assert.ok(repo.includes('hashPassword'), 'debe usar hashPassword');
  assert.ok(!repo.includes("|| '123456'"), 'no debe existir contrasena por defecto');
});

test('AuthService valida contra bcrypt y no lee el password del modelo publico', () => {
  const svc = read('src/main/services/AuthService.ts');
  assert.ok(svc.includes('verifyPassword'), 'debe usar verifyPassword');
  assert.ok(svc.includes('CredencialRepo.getHashByUserId'), 'el hash viene del repo de credenciales');
  assert.ok(!/user\.password/.test(svc), 'no debe leer user.password del modelo publico');
});

// --- Seccion 5: sin contrasena por defecto conocida ------------------------

test('no queda ninguna contrasena por defecto 123456 en el codigo ni en las migraciones', () => {
  const files = [...SOURCES];
  const migrationsDirs = [
    path.join(ROOT, 'src', 'database', 'migrations'),
    path.join(ROOT, 'src', 'database', 'migrations-mssql'),
  ];
  for (const dir of migrationsDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.sql')) files.push(path.join(dir, f));
    }
  }

  const hits = files
    .filter(f => fs.readFileSync(f, 'utf8').includes('123456'))
    .map(f => path.relative(ROOT, f));

  assert.deepEqual(hits, [], `contrasena por defecto encontrada en: ${hits.join(', ')}`);
});

// --- Seccion 8/10: los IPC sensibles estan protegidos ----------------------

test('todos los canales records:* estan envueltos en withAuth', () => {
  const main = read('src/main/main.ts');
  const channels = [
    'records:create', 'records:update', 'records:get-by-type', 'records:get-definition',
    'records:get-transitions', 'records:get-audit-history', 'records:transition',
  ];
  for (const ch of channels) {
    assert.ok(
      main.includes(`ipcMain.handle('${ch}', withAuth(`),
      `${ch} debe registrarse con withAuth`
    );
  }
});

test('los canales de acceso a archivos usan withAuth y FileAccessPolicy', () => {
  const main = read('src/main/main.ts');
  for (const ch of ['window:open-path', 'window:read-file-data-url', 'window:read-file-buffer']) {
    assert.ok(main.includes(`ipcMain.handle('${ch}', withAuth(`), `${ch} debe usar withAuth`);
  }
  // Tres llamadas: una por canal.
  const guards = main.split('assertReadablePath(').length - 1;
  assert.ok(guards >= 3, `se esperaban >=3 usos de assertReadablePath, hay ${guards}`);
});

test('los canales rag:* estan protegidos', () => {
  const rag = read('src/main/ragIpc.ts');
  for (const ch of ['rag:get-status', 'rag:ingest-document-node', 'rag:analyze-record',
                    'rag:get-answer', 'rag:submit-feedback', 'rag:get-evidence']) {
    assert.ok(rag.includes(`ipcMain.handle('${ch}', withAuth(`), `${ch} debe usar withAuth`);
  }
});

// --- Seccion 7: el renderer no decide su propia identidad ------------------

test('la identidad del actor de records se deriva de la sesion, no del payload', () => {
  const main = read('src/main/main.ts');
  assert.ok(main.includes('function withSessionActor('), 'debe existir withSessionActor');

  for (const fn of ['validateCreateRecordPayload', 'validateUpdateRecordPayload',
                    'validateTransitionPayload', 'validateGetTransitionsPayload']) {
    assert.ok(
      main.includes(`${fn}(withSessionActor(event, payload))`),
      `${fn} debe recibir la identidad derivada de la sesion`
    );
  }
});

// --- Seccion 9: repo:call deny by default ----------------------------------

test('repo:call mantiene deny-by-default y no expone delete generico', () => {
  const main = read('src/main/main.ts');
  const genericLine = main
    .split('\n')
    .find(l => l.includes('const ALLOWED_GENERIC_METHODS'));

  assert.ok(genericLine, 'debe existir ALLOWED_GENERIC_METHODS');
  assert.ok(!/'delete'/.test(genericLine), "delete no debe estar en los metodos genericos");

  assert.ok(main.includes("ipcMain.handle('repo:call', withAuth("), 'repo:call debe usar withAuth');
  assert.ok(main.includes('const allowed = ALLOWLIST[repo] || [];'), 'debe existir denegacion por defecto');
  assert.ok(!main.includes('CredencialRepo'), 'el repo de credenciales no debe ser alcanzable via repo:call');
});

// --- Seccion 11: .env.example sin secretos ---------------------------------

test('.env.example solo contiene placeholders para claves y contrasenas', () => {
  const env = read('.env.example');
  const offenders = env
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .filter(l => /(API_KEY|PASSWORD|SECRET|TOKEN)\s*=/i.test(l))
    .filter(l => {
      const value = l.slice(l.indexOf('=') + 1).trim();
      return value.length > 0;
    });

  assert.deepEqual(offenders, [], `.env.example contiene valores reales: ${offenders.join(', ')}`);
});

test('no hay claves con formato sk- en archivos de codigo', () => {
  const hits = SOURCES
    .filter(f => /\bsk-[A-Za-z0-9]{16,}/.test(fs.readFileSync(f, 'utf8')))
    .map(f => path.relative(ROOT, f));

  assert.deepEqual(hits, [], `posibles claves encontradas en: ${hits.join(', ')}`);
});
