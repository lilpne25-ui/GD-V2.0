// Pruebas de alta atomica de usuario + credencial y de la validacion bcrypt
// en la ultima linea de defensa antes de la base de datos.
//
// Fase 0.5 - Auth & Security Foundation (revision del PR #2).
//
// BLOCKER 2: setPasswordHash debe rechazar cualquier valor que no sea bcrypt.
// BLOCKER 3: una creacion invalida o fallida no debe dejar un usuario parcial.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createUserWithCredential,
  hashPassword,
  isBcryptHash,
} = require('../dist-test/main/services/CredentialService');

/**
 * Doble de la capa de datos: registra que usuarios y credenciales existen
 * realmente, para poder afirmar que no queda estado parcial.
 */
function makeDb(options = {}) {
  const usuarios = new Map();
  const credenciales = new Map();

  return {
    usuarios,
    credenciales,
    ops: {
      insertUser: async userId => {
        if (options.failInsert) throw new Error('fallo al insertar usuario');
        usuarios.set(userId, { id: userId });
      },
      setPasswordHash: async (userId, hash) => {
        if (options.failCredential) throw new Error('fallo al escribir la credencial');
        // Se replica la regla del repositorio real: solo bcrypt.
        if (!isBcryptHash(hash)) throw new Error('Credencial rechazada: no es bcrypt.');
        credenciales.set(userId, hash);
      },
      deleteUser: async userId => {
        if (options.failRollback) throw new Error('fallo al revertir');
        usuarios.delete(userId);
      },
    },
  };
}

// --- BLOCKER 3: atomicidad -------------------------------------------------

test('BLOCKER 3: alta correcta crea usuario Y credencial bcrypt', async () => {
  const db = makeDb();
  const id = await createUserWithCredential(db.ops, 'usr-1', 'Contrasena-Valida-1'); // secret-scan:allow fixture sintetica

  assert.equal(id, 'usr-1');
  assert.equal(db.usuarios.has('usr-1'), true);
  assert.equal(db.credenciales.has('usr-1'), true);
  assert.equal(isBcryptHash(db.credenciales.get('usr-1')), true);
});

test('BLOCKER 3: contrasena vacia no inserta NINGUN usuario', async () => {
  for (const bad of ['', '   ', null, undefined]) {
    const db = makeDb();

    await assert.rejects(
      () => createUserWithCredential(db.ops, 'usr-x', bad),
      /contrasena inicial/i,
      `deberia rechazar: ${JSON.stringify(bad)}`
    );

    // Lo esencial: la validacion ocurre ANTES del INSERT.
    assert.equal(db.usuarios.size, 0, 'no debe existir ningun usuario');
    assert.equal(db.credenciales.size, 0, 'no debe existir ninguna credencial');
  }
});

test('BLOCKER 3: si falla la escritura de la credencial se revierte el usuario', async () => {
  const db = makeDb({ failCredential: true });

  await assert.rejects(
    () => createUserWithCredential(db.ops, 'usr-2', 'Contrasena-Valida-2'), // secret-scan:allow fixture sintetica
    /credencial/i
  );

  assert.equal(db.usuarios.has('usr-2'), false, 'el usuario debe haberse revertido');
  assert.equal(db.credenciales.has('usr-2'), false);
  assert.equal(db.usuarios.size, 0, 'no debe quedar ningun usuario huerfano');
});

test('BLOCKER 3: si falla el INSERT no se escribe credencial', async () => {
  const db = makeDb({ failInsert: true });

  await assert.rejects(
    () => createUserWithCredential(db.ops, 'usr-3', 'Contrasena-Valida-3'), // secret-scan:allow fixture sintetica
    /insertar usuario/i
  );

  assert.equal(db.usuarios.size, 0);
  assert.equal(db.credenciales.size, 0, 'no debe quedar una credencial sin usuario');
});

test('BLOCKER 3: si el rollback falla se propaga el error original de credencial', async () => {
  const db = makeDb({ failCredential: true, failRollback: true });

  await assert.rejects(
    () => createUserWithCredential(db.ops, 'usr-4', 'Contrasena-Valida-4'), // secret-scan:allow fixture sintetica
    /credencial/i,
    'debe propagarse el error original, no el del rollback'
  );

  // El usuario queda sin credencial: no puede iniciar sesion (fail-closed).
  assert.equal(db.credenciales.has('usr-4'), false);
});

test('BLOCKER 3: el orden es validar -> hashear -> insertar -> credencial', async () => {
  const order = [];
  const ops = {
    insertUser: async () => { order.push('insert'); },
    setPasswordHash: async () => { order.push('credential'); },
    deleteUser: async () => { order.push('rollback'); },
  };

  await createUserWithCredential(ops, 'usr-5', 'Contrasena-Valida-5'); // secret-scan:allow fixture sintetica
  assert.deepEqual(order, ['insert', 'credential']);

  // Con contrasena invalida no se llega siquiera a insertar.
  const order2 = [];
  const ops2 = {
    insertUser: async () => { order2.push('insert'); },
    setPasswordHash: async () => { order2.push('credential'); },
    deleteUser: async () => { order2.push('rollback'); },
  };
  await assert.rejects(() => createUserWithCredential(ops2, 'usr-6', ''));
  assert.deepEqual(order2, [], 'ninguna operacion de escritura debe ejecutarse');
});

test('BLOCKER 3: nunca se persiste la contrasena en claro al crear', async () => {
  const plain = 'Contrasena-En-Claro-9'; // secret-scan:allow fixture sintetica
  const db = makeDb();
  await createUserWithCredential(db.ops, 'usr-7', plain);

  const stored = db.credenciales.get('usr-7');
  assert.notEqual(stored, plain);
  assert.ok(!stored.includes(plain));
  assert.equal(isBcryptHash(stored), true);
});

// --- BLOCKER 2: setPasswordHash solo admite bcrypt -------------------------
//
// Se verifica la regla contra el codigo real del repositorio. No se puede
// invocar CredencialRepo aqui sin SQL Server, asi que se comprueba (a) que el
// guardia existe en el codigo y (b) el predicado que lo implementa.

test('BLOCKER 2: isBcryptHash acepta bcrypt valido y rechaza todo lo demas', () => {
  // Permitido: hash bcrypt real.
  const valid = hashPassword('lo-que-sea');
  assert.equal(isBcryptHash(valid), true);

  // Rechazado: plaintext.
  assert.equal(isBcryptHash('123456'), false);
  assert.equal(isBcryptHash('password-original'), false); // secret-scan:allow fixture sintetica
  assert.equal(isBcryptHash('Contrasena-Larga-Pero-Plana'), false);

  // Rechazado: cadena vacia y no-strings.
  assert.equal(isBcryptHash(''), false);
  assert.equal(isBcryptHash('   '), false);
  assert.equal(isBcryptHash(null), false);
  assert.equal(isBcryptHash(undefined), false);
  assert.equal(isBcryptHash(42), false);
  assert.equal(isBcryptHash({}), false);

  // Rechazado: parecidos a bcrypt pero invalidos.
  assert.equal(isBcryptHash('$2b$10$demasiado-corto'), false);
  assert.equal(isBcryptHash('$2x$10$' + 'a'.repeat(53)), false, 'variante $2x no es valida');
  assert.equal(isBcryptHash('$2b$1$' + 'a'.repeat(53)), false, 'coste de un solo digito');
  assert.equal(isBcryptHash('$2b$10$' + 'a'.repeat(52)), false, 'un caracter de menos');
  assert.equal(isBcryptHash('$2b$10$' + 'a'.repeat(54)), false, 'un caracter de mas');
  assert.equal(isBcryptHash('$2b$10$' + '!'.repeat(53)), false, 'alfabeto invalido');

  // Aceptado: las tres variantes validas.
  for (const prefix of ['$2a$', '$2b$', '$2y$']) {
    assert.equal(isBcryptHash(prefix + '10$' + 'a'.repeat(53)), true, `${prefix} deberia ser valido`);
  }
});

// Prueba FUNCIONAL del guardia: se invoca CredencialRepo.setPasswordHash de
// verdad, interceptando dbRun para no necesitar SQL Server. Asi la prueba falla
// si alguien elimina o desactiva la validacion, cosa que una comprobacion sobre
// el texto fuente no garantiza.
const dbSqlServer = require('../dist-test/database/db-sqlserver');
const { CredencialRepo } = require('../dist-test/database/repositories/credencialRepo');

/** Sustituye dbRun por un espia y devuelve las escrituras capturadas. */
function withStubbedDbRun(fn) {
  const original = dbSqlServer.dbRun;
  const writes = [];
  dbSqlServer.dbRun = async (sql, params) => {
    writes.push({ sql, params });
    return { lastID: 0, changes: 1 };
  };
  try {
    return { result: fn(writes), writes };
  } finally {
    dbSqlServer.dbRun = original;
  }
}

test('BLOCKER 2: setPasswordHash acepta un hash bcrypt valido', async () => {
  const validHash = hashPassword('cualquier-cosa');
  let writes;

  const { result } = withStubbedDbRun(w => {
    writes = w;
    return CredencialRepo.setPasswordHash('usr-ok', validHash);
  });
  await result;

  assert.equal(writes.length, 1, 'debe haberse escrito exactamente una vez');
  assert.ok(writes[0].sql.includes('MERGE usuario_credenciales'));
  assert.deepEqual(writes[0].params, ['usr-ok', validHash]);
});

test('BLOCKER 2: setPasswordHash RECHAZA plaintext y no escribe nada', async () => {
  const plaintexts = ['123456', 'password-original', 'Contrasena-Larga-Pero-Plana', '$2parecido']; // secret-scan:allow fixtures sinteticas

  for (const plain of plaintexts) {
    let writes;
    const { result } = withStubbedDbRun(w => {
      writes = w;
      return CredencialRepo.setPasswordHash('usr-x', plain);
    });

    await assert.rejects(
      () => result,
      /solo se admiten hashes bcrypt/i,
      `deberia rechazar plaintext: ${plain}`
    );
    assert.equal(writes.length, 0, 'no debe escribirse nada en la base de datos');
  }
});

test('BLOCKER 2: setPasswordHash RECHAZA cadena vacia y valores no-string', async () => {
  for (const bad of ['', '   ', null, undefined, 42, {}]) {
    let writes;
    const { result } = withStubbedDbRun(w => {
      writes = w;
      return CredencialRepo.setPasswordHash('usr-x', bad);
    });

    await assert.rejects(() => result, /solo se admiten hashes bcrypt/i,
      `deberia rechazar: ${JSON.stringify(bad)}`);
    assert.equal(writes.length, 0, 'no debe escribirse nada');
  }
});

test('BLOCKER 2: setPasswordHash rechaza un user_id vacio', async () => {
  const validHash = hashPassword('cualquier-cosa');
  for (const badId of ['', '   ', null, undefined]) {
    let writes;
    const { result } = withStubbedDbRun(w => {
      writes = w;
      return CredencialRepo.setPasswordHash(badId, validHash);
    });
    await assert.rejects(() => result, /user_id invalido/i);
    assert.equal(writes.length, 0);
  }
});

test('BLOCKER 2: el error no filtra el valor recibido', async () => {
  const secreto = 'contrasena-en-claro-no-debe-aparecer'; // secret-scan:allow fixture sintetica
  const { result } = withStubbedDbRun(() => CredencialRepo.setPasswordHash('usr-x', secreto));

  await result.then(
    () => assert.fail('deberia haber lanzado'),
    err => {
      assert.ok(!err.message.includes(secreto), 'el mensaje no debe contener el valor recibido');
    }
  );
});

test('BLOCKER 2: setPassword hashea y llega a la base como bcrypt', async () => {
  let writes;
  const { result } = withStubbedDbRun(w => {
    writes = w;
    return CredencialRepo.setPassword('usr-1', 'Contrasena-Del-Usuario'); // secret-scan:allow fixture sintetica
  });
  await result;

  assert.equal(writes.length, 1);
  const stored = writes[0].params[1];
  assert.equal(isBcryptHash(stored), true, 'lo persistido debe ser bcrypt');
  assert.notEqual(stored, 'Contrasena-Del-Usuario');
});

test('BLOCKER 2: setPassword rechaza contrasena vacia sin escribir', async () => {
  for (const bad of ['', '   ', null, undefined]) {
    let writes;
    const { result } = withStubbedDbRun(w => {
      writes = w;
      return CredencialRepo.setPassword('usr-1', bad);
    });
    await assert.rejects(() => result, /no puede estar vacia/i);
    assert.equal(writes.length, 0);
  }
});
