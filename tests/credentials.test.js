// Pruebas de credenciales y migracion legacy.
// Fase 0.5 - Auth & Security Foundation.
//
// Cubren TEST 1, 2, 3, 4, 5 del sprint.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyCredential,
  isBcryptHash,
  hashPassword,
  verifyPassword,
  migrateLegacyCredentials,
  maskSecret,
} = require('../dist-test/main/services/CredentialService');

/** Almacen en memoria que imita usuario_credenciales. */
function makeStore(initialRows) {
  const rows = initialRows.map(r => ({ ...r }));
  return {
    rows,
    listAll: async () => rows.map(r => ({ ...r })),
    updateHash: async (userId, hash) => {
      const row = rows.find(r => r.user_id === userId);
      if (!row) throw new Error(`usuario inexistente: ${userId}`);
      row.password = hash;
    },
  };
}

test('clasificacion: distingue bcrypt, plaintext legacy y vacio', () => {
  assert.equal(classifyCredential(hashPassword('cualquiera')), 'bcrypt');
  assert.equal(classifyCredential('123456'), 'legacy-plaintext');
  assert.equal(classifyCredential(''), 'empty');
  assert.equal(classifyCredential('   '), 'empty');
  assert.equal(classifyCredential(null), 'empty');
  assert.equal(classifyCredential(undefined), 'empty');

  // Una contrasena plana que empieza por '$2' no debe confundirse con un hash.
  assert.equal(classifyCredential('$2parecido-pero-no'), 'legacy-plaintext');
  assert.equal(isBcryptHash('$2b$10$demasiado-corto'), false);
});

// TEST 1 / TEST 2: lo que se persiste nunca es texto plano.
test('TEST 1+2: hashPassword nunca devuelve la contrasena en claro', () => {
  const plain = 'Contrasena-Original-2026';
  const stored = hashPassword(plain);

  assert.notEqual(stored, plain);
  assert.ok(!stored.includes(plain), 'el hash no debe contener la contrasena');
  assert.equal(isBcryptHash(stored), true);
  assert.equal(classifyCredential(stored), 'bcrypt');

  // Dos hashes de la misma contrasena difieren (salt aleatorio).
  assert.notEqual(stored, hashPassword(plain));
});

test('hashPassword rechaza contrasenas vacias en lugar de inventar una', () => {
  assert.throws(() => hashPassword(''), /vacia/i);
  assert.throws(() => hashPassword(null), /vacia/i);
});

// TEST 4: password incorrecto -> DENY
test('TEST 4: password incorrecto es denegado', () => {
  const stored = hashPassword('correcta');
  assert.equal(verifyPassword('correcta', stored), true);
  assert.equal(verifyPassword('incorrecta', stored), false);
  assert.equal(verifyPassword('', stored), false);
});

// Regla dura: una credencial legacy en claro NUNCA autentica.
test('una credencial legacy en texto plano no autentica aunque coincida', () => {
  assert.equal(verifyPassword('123456', '123456'), false);
  assert.equal(verifyPassword('123456', ''), false);
  assert.equal(verifyPassword('123456', null), false);
});

// TEST 3: migracion legacy -> bcrypt, idempotente, conserva la contrasena.
test('TEST 3: migra plaintext a bcrypt conservando la contrasena funcional', async () => {
  const store = makeStore([
    { user_id: 'u1', password: 'password-original' },
    { user_id: 'u2', password: hashPassword('ya-segura') },
    { user_id: 'u3', password: '' },
  ]);

  const first = await migrateLegacyCredentials(store);

  assert.equal(first.analizadas, 3);
  assert.equal(first.migradas, 1);
  assert.equal(first.yaSeguras, 1);
  assert.equal(first.vacias, 1);
  assert.equal(first.errores, 0);

  const u1 = store.rows.find(r => r.user_id === 'u1');
  // Ahora es bcrypt...
  assert.equal(isBcryptHash(u1.password), true);
  // ...y la contrasena original sigue funcionando.
  assert.equal(verifyPassword('password-original', u1.password), true);
  assert.equal(verifyPassword('otra-cosa', u1.password), false);

  // Idempotencia: la segunda ejecucion no vuelve a hashear.
  const hashAfterFirst = u1.password;
  const second = await migrateLegacyCredentials(store);

  assert.equal(second.migradas, 0, 'la segunda pasada no debe migrar nada');
  assert.equal(second.yaSeguras, 2, 'u1 y u2 ya son seguras');
  assert.equal(store.rows.find(r => r.user_id === 'u1').password, hashAfterFirst,
    'el hash no debe cambiar en la segunda ejecucion');

  // La migracion no destruye usuarios.
  assert.equal(store.rows.length, 3);
  // No resetea credenciales vacias inventando una contrasena.
  assert.equal(store.rows.find(r => r.user_id === 'u3').password, '');
});

test('la migracion contabiliza errores sin abortar el resto', async () => {
  const store = makeStore([
    { user_id: 'ok', password: 'legacy-1' },
    { user_id: 'roto', password: 'legacy-2' },
  ]);
  store.updateHash = async (userId, hash) => {
    if (userId === 'roto') throw new Error('fallo de escritura simulado');
    const row = store.rows.find(r => r.user_id === userId);
    row.password = hash;
  };

  const report = await migrateLegacyCredentials(store);
  assert.equal(report.migradas, 1);
  assert.equal(report.errores, 1);
  assert.equal(isBcryptHash(store.rows.find(r => r.user_id === 'ok').password), true);
});

test('la migracion no filtra contrasenas ni hashes completos en los logs', async () => {
  const secret = 'super-secreta-2026';
  const store = makeStore([{ user_id: 'u1', password: secret }]);

  const logs = [];
  await migrateLegacyCredentials(store, msg => logs.push(msg));

  const joined = logs.join('\n');
  assert.ok(!joined.includes(secret), 'el log no debe contener la contrasena');
  const finalHash = store.rows[0].password;
  assert.ok(!joined.includes(finalHash), 'el log no debe contener el hash completo');
});

test('maskSecret nunca revela el valor completo', () => {
  const hash = hashPassword('algo');
  const masked = maskSecret(hash);
  assert.ok(!masked.includes(hash));
  assert.ok(masked.length < hash.length);
  assert.equal(maskSecret(''), '<vacio>');
});
