// Pruebas de la Demo guiada Innovax.
//
// No son de cobertura: cada bloque protege una promesa concreta de la demo.
//  - La historia tiene 8 pasos y cada uno declara su estado real.
//  - Nada de la demo escribe en la base de datos ni llama a proveedores de IA.
//  - Todo objetivo del spotlight existe en la aplicacion.
//  - El logo y la paleta de Innovax no se alteran ni se dispersan.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { fp15Duration, FP15_EXAMPLE } = require('../dist-test/renderer/demo/demoData');
const { demoBus } = require('../dist-test/renderer/demo/demoBus');
const { DEMO_STEPS, STATUS_META } = require('../dist-test/renderer/demo/demoStory');

const ROOT = path.join(__dirname, '..');
const DEMO_DIR = path.join(ROOT, 'src', 'renderer', 'demo');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function demoSources() {
  return fs.readdirSync(DEMO_DIR)
    .filter(f => /\.(ts|tsx)$/.test(f))
    .map(f => ({ file: f, content: fs.readFileSync(path.join(DEMO_DIR, f), 'utf8') }));
}

/** Codigo sin comentarios: las reglas se evaluan sobre lo que se ejecuta. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// --- FP-15-C: la duracion se calcula, no se escribe a mano ----------------

test('la duracion del ejemplo FP-15-C se calcula a partir de inicio y fin', () => {
  assert.equal(fp15Duration(FP15_EXAMPLE.inicio, FP15_EXAMPLE.fin), '1 h 32 min');
  assert.equal(fp15Duration('07:10', '08:42'), '1 h 32 min');
  assert.equal(fp15Duration('07:00', '09:00'), '2 h');
  assert.equal(fp15Duration('07:10', '07:45'), '35 min');
  // Un paro que cruza la medianoche.
  assert.equal(fp15Duration('23:30', '00:15'), '45 min');
  // Entradas invalidas no inventan una duracion.
  assert.equal(fp15Duration('', '08:00'), '—');
  assert.equal(fp15Duration('25:00', '08:00'), '—');
  assert.equal(fp15Duration('7:61', '08:00'), '—');
});

test('el ejemplo FP-15-C no tiene campos de persona', () => {
  // El responsable se expresa por area/rol. Si alguien anade un campo como
  // "operador" o "responsable" con un nombre real, esta prueba falla.
  assert.deepEqual(Object.keys(FP15_EXAMPLE).sort(), [
    'area', 'comentario', 'evento', 'fin', 'inicio', 'maquina', 'parte', 'porquesCompletos', 'porquesTotal',
  ]);
  assert.equal(FP15_EXAMPLE.maquina, 'M-31');
  assert.equal(FP15_EXAMPLE.area, 'Logística');
});

// --- Canal de navegacion interna -------------------------------------------

test('demoBus entrega una peticion pendiente una sola vez', () => {
  demoBus.clear();
  demoBus.requestRegistrosTab('dynamic');
  assert.equal(demoBus.consumeRegistrosTab(), 'dynamic');
  assert.equal(demoBus.consumeRegistrosTab(), null, 'no debe reaplicarse en un segundo montaje');
});

test('demoBus notifica a los modulos ya montados', () => {
  demoBus.clear();
  const seen = [];
  const off = demoBus.onRecordTypeCode(code => seen.push(code));
  demoBus.requestRecordTypeCode('FP-05-C');
  off();
  demoBus.requestRecordTypeCode('FP-99');
  assert.deepEqual(seen, ['FP-05-C'], 'tras desuscribirse no debe recibir mas');
  demoBus.clear();
});

test('un listener defectuoso no rompe la demo ni a otros listeners', () => {
  demoBus.clear();
  const seen = [];
  const offBad = demoBus.onRegistrosTab(() => { throw new Error('fallo simulado'); });
  const offGood = demoBus.onRegistrosTab(tab => seen.push(tab));
  assert.doesNotThrow(() => demoBus.requestRegistrosTab('studio'));
  assert.deepEqual(seen, ['studio']);
  offBad();
  offGood();
  demoBus.clear();
});

test('clear descarta peticiones al cerrar la demo', () => {
  demoBus.requestRegistrosTab('dynamic');
  demoBus.requestRecordTypeCode('FP-05-C');
  demoBus.clear();
  assert.equal(demoBus.consumeRegistrosTab(), null);
  assert.equal(demoBus.consumeRecordTypeCode(), null);
});

// --- La historia ------------------------------------------------------------

test('la historia tiene exactamente 8 pasos con el estado acordado', () => {
  assert.equal(DEMO_STEPS.length, 8);
  assert.deepEqual(
    DEMO_STEPS.map(s => s.status),
    ['context', 'next', 'live', 'live', 'live', 'next', 'vision', 'plan']
  );
  for (const step of DEMO_STEPS) {
    assert.ok(STATUS_META[step.status], `${step.id}: estado sin etiqueta`);
    assert.ok(step.title.trim().length > 0, `${step.id}: sin titulo`);
    assert.ok(step.message.trim().length > 0, `${step.id}: sin mensaje`);
  }
});

test('los tres estados obligatorios se muestran con su texto exacto', () => {
  assert.equal(STATUS_META.live.label.toUpperCase(), 'FUNCIONA HOY');
  assert.equal(STATUS_META.next.label.toUpperCase(), 'SIGUIENTE IMPLEMENTACIÓN');
  assert.equal(STATUS_META.vision.label.toUpperCase(), 'VISIÓN');
});

test('FP-15-C nunca se presenta como funcionalidad terminada', () => {
  const fp15 = DEMO_STEPS.find(s => s.visual === 'fp15');
  assert.ok(fp15, 'debe existir el paso FP-15-C');
  assert.equal(fp15.status, 'next');
  assert.equal(fp15.layout, 'stage', 'no debe iluminar una pantalla real inexistente');
  assert.equal(fp15.section, undefined, 'no debe navegar a ningun modulo');
});

test('solo los pasos "Funciona hoy" iluminan pantallas reales', () => {
  for (const step of DEMO_STEPS) {
    if (step.status === 'live') {
      assert.equal(step.layout, 'spotlight', `${step.id} deberia mostrar la pantalla real`);
      assert.ok(step.section, `${step.id} deberia navegar a un modulo`);
      assert.ok(step.focus && step.focus.length > 0, `${step.id} sin objetivo de spotlight`);
    } else {
      assert.equal(step.layout, 'stage', `${step.id} no es real y no debe iluminar la app`);
    }
  }
});

test('el autoplay se detiene en los pasos que se presentan en vivo', () => {
  const manual = DEMO_STEPS.filter(s => !s.autoAdvance).map(s => s.id);
  // Mirror, Dynamic Records, FP-15, ciclo cerrado y plan requieren explicacion.
  assert.deepEqual(manual, ['sgc-mirror', 'dynamic-records', 'fp15', 'closed-loop', 'roadmap']);
  for (const step of DEMO_STEPS) {
    assert.ok(step.dwellMs >= 7000 && step.dwellMs <= 10000, `${step.id}: dwell fuera de 7-10 s`);
  }
});

// --- Spotlight: todo objetivo existe en la aplicacion ------------------------

test('cada data-demo-id usado por la historia existe en el codigo de la app', () => {
  const rendererFiles = [];
  const stack = [path.join(ROOT, 'src', 'renderer')];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.tsx$/.test(entry.name) && !full.includes(`${path.sep}demo${path.sep}`)) rendererFiles.push(full);
    }
  }
  const declared = new Set();
  for (const file of rendererFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(/data-demo-id="([a-z0-9-]+)"/g)) declared.add(m[1]);
  }

  const missing = [];
  for (const step of DEMO_STEPS) {
    for (const focus of step.focus || []) {
      // Al menos el objetivo preferido debe existir; los demas son respaldo.
      if (!declared.has(focus.targets[0])) missing.push(`${step.id} -> ${focus.targets[0]}`);
      for (const t of focus.targets) {
        if (!declared.has(t)) missing.push(`${step.id} -> ${t}`);
      }
    }
  }
  assert.deepEqual([...new Set(missing)], [], `objetivos sin data-demo-id:\n${missing.join('\n')}`);
});

// --- Seguridad y honestidad del codigo de la demo ---------------------------

test('la demo no invoca ningun canal de escritura ni analisis de IA', () => {
  const forbidden = [
    /records\.(create|update|transition)\s*\(/,
    /rag\.(analyzeRecord|ingestDocumentNode|submitFeedback|getAnswer|getEvidence)\s*\(/,
    /repo\.call\s*\(/,
    /\bauth\.(login|logout)\s*\(/,
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /ipcRenderer/,
  ];
  const hits = [];
  for (const { file, content } of demoSources()) {
    const code = stripComments(content);
    for (const re of forbidden) {
      if (re.test(code)) hits.push(`${file}: ${re}`);
    }
  }
  assert.deepEqual(hits, [], `llamadas no permitidas en la demo:\n${hits.join('\n')}`);
});

test('la demo solo escribe en localStorage el feature flag existente', () => {
  const writes = [];
  for (const { file, content } of demoSources()) {
    const code = stripComments(content);
    for (const m of code.matchAll(/localStorage\.(setItem|removeItem)\(\s*([^,)]+)/g)) {
      writes.push(`${file}: ${m[1]}(${m[2].trim()})`);
    }
  }
  assert.ok(writes.length > 0, 'deberia gestionar el flag de Dynamic Records');
  for (const w of writes) {
    assert.ok(w.includes('DYNAMIC_FLAG_KEY'), `escritura no permitida en localStorage: ${w}`);
  }
  const main = read('src/renderer/demo/GuidedDemo.tsx');
  assert.ok(main.includes("const DYNAMIC_FLAG_KEY = 'SGC_ENABLE_DYNAMIC_RECORDS';"));
});

test('la demo no introduce bypass de login, secretos ni claves', () => {
  const forbidden = [
    'DISABLE_LOGIN_FOR_NOW', 'DEV_SESSION', 'dev-bypass', 'demo_bypass',
    "permissions: ['*']", 'DEEPSEEK', 'api.deepseek.com',
  ];
  const hits = [];
  for (const { file, content } of demoSources()) {
    for (const needle of forbidden) {
      if (content.includes(needle)) hits.push(`${file}: ${needle}`);
    }
    if (/\bsk-[A-Za-z0-9]{12,}/.test(content)) hits.push(`${file}: clave con formato sk-`);
  }
  assert.deepEqual(hits, []);
});

test('la demo no hace afirmaciones de certificacion ni de producto terminado', () => {
  const claims = [
    /certifica/i,
    /garantiza(?:mos)?\s+(el\s+)?cumplimiento/i,
    /todo el producto est[aá] terminado/i,
    /todos los m[oó]dulos son producci[oó]n/i,
  ];
  const hits = [];
  for (const { file, content } of demoSources()) {
    for (const re of claims) if (re.test(content)) hits.push(`${file}: ${re}`);
  }
  assert.deepEqual(hits, []);
});

test('la demo se abre solo desde la rama autenticada de App.tsx', () => {
  const app = read('src/renderer/App.tsx');
  const authGate = app.indexOf('if (!authenticated)');
  const button = app.indexOf('data-demo-id="demo-launch"');
  const render = app.indexOf('<GuidedDemo');
  assert.ok(authGate > 0 && button > authGate, 'el boton debe renderizarse despues del control de autenticacion');
  assert.ok(render > authGate, 'la demo debe renderizarse despues del control de autenticacion');
  assert.ok(app.includes('<DemoErrorBoundary'), 'la demo debe estar aislada por un Error Boundary');
  assert.ok(/setDemoOpen\(false\);\s*\n\s*void logout\(\);/.test(app), 'cerrar sesion debe cerrar la demo');
});

// --- Identidad visual Innovax ----------------------------------------------

test('el logo de Innovax es el archivo original sin modificar', () => {
  const buf = fs.readFileSync(path.join(ROOT, 'src/renderer/assets/branding/innovax/innovax-logo.jpg'));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  assert.equal(sha, '03fc3a01f9a2f3293f712814161e0dc36bba3167ed4b248fa7180c8f9b5dd35f');
});

test('la paleta coincide con la guia cromatica y vive en un unico archivo', () => {
  const tokens = read('src/renderer/assets/branding/innovax/innovax-tokens.css').toLowerCase();
  const guide = ['#1f130f', '#fdd000', '#f0bb09', '#bf7a08', '#7b4114', '#fdfbf8'];
  for (const hex of guide) assert.ok(tokens.includes(hex), `falta ${hex} en innovax-tokens.css`);

  // Ningun otro archivo de la demo repite esos HEX: todo pasa por tokens.
  const others = [
    ...demoSources(),
    ...fs.readdirSync(DEMO_DIR).filter(f => f.endsWith('.css'))
      .map(f => ({ file: f, content: fs.readFileSync(path.join(DEMO_DIR, f), 'utf8') })),
  ];
  const hits = [];
  for (const { file, content } of others) {
    for (const hex of guide) if (content.toLowerCase().includes(hex)) hits.push(`${file}: ${hex}`);
  }
  assert.deepEqual(hits, [], `HEX de Innovax fuera de los tokens:\n${hits.join('\n')}`);
});

test('el logo nunca se recolorea ni se filtra en los estilos de la demo', () => {
  const css = fs.readFileSync(path.join(DEMO_DIR, 'GuidedDemo.css'), 'utf8');
  const logoRules = [...css.matchAll(/\.gd-logo-img\s*\{([^}]*)\}/g)].map(m => m[1]).join('\n');
  assert.ok(logoRules.includes('object-fit: contain'), 'el logo debe conservar su proporcion');
  assert.ok(!/filter|mix-blend|opacity|hue|saturate/i.test(logoRules), 'el logo no debe alterarse');
});
