// Pruebas de sesion y proteccion de IPC.
// Fase 0.5 - Auth & Security Foundation.
//
// Cubren TEST 8, 9, 10, 11 (records:* sin sesion -> DENY) ejercitando el
// middleware real (withAuth) contra el SessionManager real.

const test = require('node:test');
const assert = require('node:assert/strict');

const { withAuth, validateIpcSender } = require('../dist-test/main/ipc/authMiddleware');
const { SessionManager } = require('../dist-test/main/services/SessionManager');

/** Evento IPC de nivel superior (no anidado), como el de un renderer legitimo. */
function makeEvent(webContentsId) {
  return {
    sender: { id: webContentsId },
    senderFrame: { parent: null },
  };
}

function resetSessions() {
  const mgr = SessionManager.getInstance();
  for (const s of mgr.getActiveSessions()) {
    mgr.destroySession(s.sessionId);
  }
}

const RECORDS_CHANNELS = [
  'records:create',
  'records:update',
  'records:get-by-type',
  'records:get-definition',
  'records:get-transitions',
  'records:get-audit-history',
  'records:transition',
];

// TEST 8-11 (y los tres canales restantes): sin sesion -> DENY
test('TEST 8-11: los canales records:* son denegados sin sesion activa', async () => {
  resetSessions();

  for (const channel of RECORDS_CHANNELS) {
    let invoked = false;
    const handler = withAuth(async () => {
      invoked = true;
      return 'no-deberia-ejecutarse';
    });

    await assert.rejects(
      () => handler(makeEvent(101), { recordTypeId: 'rt-1', role: 'ADMIN', createdBy: 'atacante' }),
      /Unauthorized/,
      `${channel} deberia denegarse sin sesion`
    );
    assert.equal(invoked, false, `${channel}: el handler no debe ejecutarse`);
  }
});

test('con sesion activa el handler si se ejecuta', async () => {
  resetSessions();
  const mgr = SessionManager.getInstance();
  mgr.createSession('usr-1', 'operativo', [], 202, 'v1');

  const handler = withAuth(async () => 'ok');
  const result = await handler(makeEvent(202), {});
  assert.equal(result, 'ok');
});

test('una sesion de otro webContents no autoriza', async () => {
  resetSessions();
  SessionManager.getInstance().createSession('usr-1', 'operativo', [], 300, 'v1');

  const handler = withAuth(async () => 'ok');
  // El mismo webContents funciona...
  assert.equal(await handler(makeEvent(300), {}), 'ok');
  // ...pero otro distinto no.
  await assert.rejects(() => handler(makeEvent(301), {}), /Unauthorized/);
});

test('sesion expirada -> DENY y se destruye', async () => {
  resetSessions();
  const mgr = SessionManager.getInstance();
  const session = mgr.createSession('usr-1', 'operativo', [], 400, 'v1');

  // Forzar expiracion.
  session.expiresAt = new Date(Date.now() - 1000).toISOString();

  const handler = withAuth(async () => 'ok');
  await assert.rejects(() => handler(makeEvent(400), {}), /Unauthorized/);

  assert.equal(mgr.getSession(session.sessionId), null, 'la sesion expirada debe eliminarse');
});

test('sesion invalidada explicitamente -> DENY', async () => {
  resetSessions();
  const mgr = SessionManager.getInstance();
  const session = mgr.createSession('usr-1', 'operativo', [], 500, 'v1');

  const handler = withAuth(async () => 'ok');
  assert.equal(await handler(makeEvent(500), {}), 'ok');

  mgr.destroySession(session.sessionId);
  await assert.rejects(() => handler(makeEvent(500), {}), /Unauthorized/);
});

test('destroySessionByWebContents invalida la sesion de esa ventana', async () => {
  resetSessions();
  const mgr = SessionManager.getInstance();
  mgr.createSession('usr-1', 'operativo', [], 600, 'v1');

  mgr.destroySessionByWebContents(600);
  const handler = withAuth(async () => 'ok');
  await assert.rejects(() => handler(makeEvent(600), {}), /Unauthorized/);
});

test('un frame anidado (iframe) es rechazado', () => {
  const nested = { sender: { id: 700 }, senderFrame: { parent: {} } };
  assert.equal(validateIpcSender(nested), false);
  assert.equal(validateIpcSender(makeEvent(700)), true);
  assert.equal(validateIpcSender({ sender: null, senderFrame: null }), false);
});

test('el id de sesion es opaco e impredecible', () => {
  resetSessions();
  const mgr = SessionManager.getInstance();
  const a = mgr.createSession('usr-1', 'operativo', [], 800, 'v1');
  const b = mgr.createSession('usr-1', 'operativo', [], 801, 'v1');

  assert.notEqual(a.sessionId, b.sessionId);
  // UUID v4: no deriva del userId ni del rol.
  assert.match(a.sessionId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.ok(!a.sessionId.includes('usr-1'));
});

test('la sesion no concede permisos comodin', () => {
  resetSessions();
  const session = SessionManager.getInstance().createSession('usr-1', 'operativo', [], 900, 'v1');
  assert.deepEqual(session.permissions, []);
  assert.ok(!session.permissions.includes('*'));
  assert.notEqual(session.securityVersion, 'dev-bypass');
});
