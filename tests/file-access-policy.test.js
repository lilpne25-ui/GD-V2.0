// Pruebas de FileAccessPolicy.
// Fase 0.5 - Auth & Security Foundation.
//
// Cubren TEST 12, 13, 14 del sprint (ruta permitida / ruta externa / traversal)
// mas ruta inexistente y directorio.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  resolveReadablePath,
  isPathInsideRoot,
  getAllowedRoots,
} = require('../dist-test/main/services/FileAccessPolicy');

// Estructura temporal:
//   <tmp>/sgc-fap-<rnd>/
//     permitido/         <- raiz autorizada
//       documento.txt
//       sub/anidado.txt
//     prohibido/
//       secreto.env
//     permitido-extra/   <- hermana con prefijo comun (trampa de startsWith)
//       fuera.txt
function makeFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sgc-fap-'));
  const allowed = path.join(base, 'permitido');
  const forbidden = path.join(base, 'prohibido');
  const sibling = path.join(base, 'permitido-extra');

  fs.mkdirSync(path.join(allowed, 'sub'), { recursive: true });
  fs.mkdirSync(forbidden, { recursive: true });
  fs.mkdirSync(sibling, { recursive: true });

  fs.writeFileSync(path.join(allowed, 'documento.txt'), 'contenido permitido');
  fs.writeFileSync(path.join(allowed, 'sub', 'anidado.txt'), 'anidado');
  fs.writeFileSync(path.join(forbidden, 'secreto.env'), 'DEEPSEEK_API_KEY=no-deberia-leerse');
  fs.writeFileSync(path.join(sibling, 'fuera.txt'), 'fuera de la raiz');

  return { base, allowed, forbidden, sibling };
}

const fx = makeFixture();
const ROOTS = [fx.allowed];

test.after(() => {
  try { fs.rmSync(fx.base, { recursive: true, force: true }); } catch { /* noop */ }
});

// TEST 12: archivo dentro de raiz autorizada -> ALLOW
test('TEST 12: archivo dentro de la raiz autorizada se permite', () => {
  const decision = resolveReadablePath(path.join(fx.allowed, 'documento.txt'), ROOTS);
  assert.equal(decision.allowed, true);
  assert.ok(path.isAbsolute(decision.resolvedPath));
  assert.equal(fs.readFileSync(decision.resolvedPath, 'utf8'), 'contenido permitido');
});

test('TEST 12b: archivo en subcarpeta de la raiz se permite', () => {
  const decision = resolveReadablePath(path.join(fx.allowed, 'sub', 'anidado.txt'), ROOTS);
  assert.equal(decision.allowed, true);
});

// TEST 13: archivo fuera de la raiz -> DENY
test('TEST 13: archivo fuera de la raiz autorizada se deniega', () => {
  const decision = resolveReadablePath(path.join(fx.forbidden, 'secreto.env'), ROOTS);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'OUTSIDE_ALLOWED_ROOTS');
});

// TEST 14: path traversal -> DENY
test('TEST 14: path traversal con .. se deniega', () => {
  const traversal = path.join(fx.allowed, '..', 'prohibido', 'secreto.env');
  const decision = resolveReadablePath(traversal, ROOTS);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'OUTSIDE_ALLOWED_ROOTS');
});

test('TEST 14b: traversal encadenado y con separadores mixtos se deniega', () => {
  const variants = [
    path.join(fx.allowed, 'sub', '..', '..', 'prohibido', 'secreto.env'),
    `${fx.allowed}/../prohibido/secreto.env`,
    `${fx.allowed}\\..\\prohibido\\secreto.env`,
  ];
  for (const v of variants) {
    const decision = resolveReadablePath(v, ROOTS);
    assert.equal(decision.allowed, false, `deberia denegar: ${v}`);
  }
});

// Trampa clasica de startsWith: carpeta hermana con prefijo comun.
test('una carpeta hermana con prefijo comun NO se considera dentro de la raiz', () => {
  const decision = resolveReadablePath(path.join(fx.sibling, 'fuera.txt'), ROOTS);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'OUTSIDE_ALLOWED_ROOTS');

  // Comprobacion directa del comparador.
  assert.equal(isPathInsideRoot(fx.sibling, fx.allowed), false);
  assert.equal(isPathInsideRoot(path.join(fx.allowed, 'x'), fx.allowed), true);
  assert.equal(isPathInsideRoot(fx.allowed, fx.allowed), true);
});

test('ruta inexistente se deniega', () => {
  const decision = resolveReadablePath(path.join(fx.allowed, 'no-existe.txt'), ROOTS);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'NOT_FOUND');
});

test('un directorio no es un archivo legible', () => {
  const decision = resolveReadablePath(fx.allowed, ROOTS);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'NOT_A_FILE');
});

test('entradas vacias o no-string se deniegan', () => {
  for (const bad of ['', '   ', null, undefined, 42, {}, []]) {
    const decision = resolveReadablePath(bad, ROOTS);
    assert.equal(decision.allowed, false, `deberia denegar: ${String(bad)}`);
  }
});

// Deny by default: sin raices configuradas no se lee nada.
test('sin raices configuradas se deniega todo (deny by default)', () => {
  const decision = resolveReadablePath(path.join(fx.allowed, 'documento.txt'), []);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'NO_ROOTS_CONFIGURED');
});

test('getAllowedRoots parsea SGC_ALLOWED_FILE_ROOTS sin rutas hardcodeadas', () => {
  assert.deepEqual(getAllowedRoots(''), []);
  assert.deepEqual(getAllowedRoots('   '), []);

  const parsed = getAllowedRoots(`${fx.allowed};${fx.forbidden}`);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0], path.resolve(fx.allowed));

  // Separador alternativo por comas.
  assert.equal(getAllowedRoots(`${fx.allowed},${fx.forbidden}`).length, 2);
});
