// Pruebas de la Demo guiada Innovax (Fase 1: capa guiada sobre el software real).
//
// No son de cobertura: cada bloque protege una promesa concreta de la demo.
//  - 15 escenas; cada micro-paso declara su estado y el origen de sus datos.
//  - Toda accion es de solo lectura; las escrituras se rechazan en tiempo de
//    ejecucion (politica central + demoBus).
//  - Todo objetivo del spotlight existe en la aplicacion.
//  - Nada de la demo escribe en la base de datos ni llama a proveedores de IA.
//  - El logo y la paleta de Innovax no se alteran ni se dispersan.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { fp15Duration, FP15_EXAMPLE } = require('../dist-test/renderer/demo/data/demoData');
const { demoBus } = require('../dist-test/renderer/demo/demoBus');
const { DEMO_SCENES } = require('../dist-test/renderer/demo/steps/scenes');
const { STATUS_META } = require('../dist-test/renderer/demo/steps/statusMeta');
const {
  READ_ONLY_ACTIONS,
  PROHIBITED_VERBS,
  assertReadOnlyAction,
  containsProhibitedVerb,
  isReadOnlyAction,
} = require('../dist-test/renderer/demo/actions/policy');
const { buildTimeline, countSentences } = require('../dist-test/renderer/demo/narration/timeline');
const { FORBIDDEN_DEMO_DOCUMENTS } = require('../dist-test/renderer/demo/data/safeDocuments');

const ROOT = path.join(__dirname, '..');
const DEMO_DIR = path.join(ROOT, 'src', 'renderer', 'demo');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Archivos de la demo (recursivo) con la extension indicada. */
function demoFiles(extRe) {
  const out = [];
  const stack = [DEMO_DIR];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (extRe.test(entry.name)) {
        out.push({ file: path.relative(DEMO_DIR, full), content: fs.readFileSync(full, 'utf8') });
      }
    }
  }
  return out;
}

const demoSources = () => demoFiles(/\.(ts|tsx)$/);

/** Codigo sin comentarios: las reglas se evaluan sobre lo que se ejecuta. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const allSteps = () => DEMO_SCENES.flatMap(scene => scene.steps.map(step => ({ scene, step })));

function allActions() {
  const actions = [];
  for (const scene of DEMO_SCENES) {
    for (const a of scene.onEnter || []) actions.push({ where: `${scene.id}.onEnter`, action: a });
    for (const a of scene.onExit || []) actions.push({ where: `${scene.id}.onExit`, action: a });
    for (const step of scene.steps) {
      if (step.action) actions.push({ where: step.id, action: step.action });
      for (const a of step.cleanup || []) actions.push({ where: `${step.id}.cleanup`, action: a });
    }
  }
  return actions;
}

// --- FP-15-C: la duracion se calcula, no se escribe a mano ----------------

test('la duracion del ejemplo FP-15-C se calcula a partir de inicio y fin', () => {
  assert.equal(fp15Duration(FP15_EXAMPLE.inicio, FP15_EXAMPLE.fin), '1 h 32 min');
  assert.equal(fp15Duration('07:10', '08:42'), '1 h 32 min');
  assert.equal(fp15Duration('07:00', '09:00'), '2 h');
  assert.equal(fp15Duration('07:10', '07:45'), '35 min');
  assert.equal(fp15Duration('23:30', '00:15'), '45 min');
  assert.equal(fp15Duration('', '08:00'), '—');
  assert.equal(fp15Duration('25:00', '08:00'), '—');
  assert.equal(fp15Duration('7:61', '08:00'), '—');
});

test('el ejemplo FP-15-C no tiene campos de persona', () => {
  assert.deepEqual(Object.keys(FP15_EXAMPLE).sort(), [
    'area', 'comentario', 'evento', 'fin', 'inicio', 'maquina', 'parte', 'porquesCompletos', 'porquesTotal',
  ]);
});

// --- Estructura del recorrido ------------------------------------------------

test('el recorrido tiene 15 escenas con el estado acordado', () => {
  assert.equal(DEMO_SCENES.length, 15);
  assert.deepEqual(
    DEMO_SCENES.map(s => s.status),
    [
      'context',
      'live', 'live', 'live', 'live', 'live',
      'next',
      'live', 'live', 'live', 'live', 'live',
      'next',
      'vision',
      'plan',
    ]
  );
});

test('cada micro-paso declara id, titulo, narracion, estado y origen validos', () => {
  const statuses = Object.keys(STATUS_META);
  const sources = ['REAL', 'ANONYMIZED_REAL', 'DEMO_EXAMPLE', 'VISION', 'NO_DATA'];
  const ids = new Set();
  for (const { step } of allSteps()) {
    assert.match(step.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${step.id}: id no es kebab-case`);
    assert.ok(!ids.has(step.id), `${step.id}: id duplicado`);
    ids.add(step.id);
    assert.ok(step.title.trim(), `${step.id}: sin titulo`);
    assert.ok(statuses.includes(step.status), `${step.id}: estado invalido`);
    assert.ok(sources.includes(step.dataSource), `${step.id}: dataSource invalido`);
    const n = countSentences(step.narrationText);
    assert.ok(n >= 1 && n <= 3, `${step.id}: la narracion debe tener 1-3 frases (tiene ${n})`);
  }
  assert.ok(ids.size >= 36, `se esperaban al menos 36 micro-pasos (hay ${ids.size})`);
});

test('los ids de escena son unicos y kebab-case', () => {
  const ids = DEMO_SCENES.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('los tres estados obligatorios se muestran con su texto exacto', () => {
  assert.equal(STATUS_META.live.label.toUpperCase(), 'FUNCIONA HOY');
  assert.equal(STATUS_META.next.label.toUpperCase(), 'SIGUIENTE IMPLEMENTACIÓN');
  assert.equal(STATUS_META.vision.label.toUpperCase(), 'VISIÓN');
});

test('lo que no esta construido nunca se presenta como "Funciona hoy"', () => {
  for (const { scene, step } of allSteps()) {
    if (step.dataSource === 'VISION') {
      assert.ok(['vision', 'plan'].includes(step.status), `${step.id}: una vision no puede ser ${step.status}`);
    }
    if (step.dataSource === 'DEMO_EXAMPLE') {
      assert.notEqual(step.status, 'live', `${step.id}: un ejemplo no puede ser "Funciona hoy"`);
    }
    if (scene.status === 'next' || scene.status === 'vision') {
      assert.notEqual(step.status, 'live', `${step.id}: escena ${scene.status} con paso "Funciona hoy"`);
    }
  }
});

test('FP-15-C es siguiente implementacion, anonimizado y sin pantalla real', () => {
  const fp15 = DEMO_SCENES.find(s => s.id === 'fp15');
  assert.equal(fp15.status, 'next');
  assert.equal(fp15.layout, 'stage');
  assert.equal(fp15.section, undefined, 'no debe navegar a ningun modulo');
  for (const step of fp15.steps) assert.equal(step.dataSource, 'ANONYMIZED_REAL');
});

test('solo las escenas con pantalla real iluminan la aplicacion', () => {
  for (const scene of DEMO_SCENES) {
    if (scene.layout === 'stage') {
      for (const step of scene.steps) {
        assert.ok(!step.target || step.target.length === 0, `${step.id}: escena de panel con objetivo`);
        assert.ok(!step.action, `${step.id}: escena de panel con accion`);
      }
    } else {
      assert.ok(scene.section, `${scene.id}: escena en vivo sin seccion`);
      for (const step of scene.steps) {
        assert.ok(step.target && step.target.length > 0, `${step.id}: paso en vivo sin objetivo`);
      }
    }
  }
});

test('el discurso no usa numerales ISO ni afirma cumplimiento o certificacion', () => {
  const claims = [
    /\b\d{1,2}\.\d{1,2}(\.\d{1,2})?\b/, // numerales de clausula (7.5, 10.2...)
    /certific/i,
    /cumple\s+(con\s+)?(la\s+)?ISO/i,
    /garantiza(?:mos)?\s+(el\s+)?cumplimiento/i,
  ];
  for (const { step } of allSteps()) {
    const text = `${step.title} ${step.narrationText} ${step.fallbackText || ''}`;
    for (const re of claims) assert.ok(!re.test(text), `${step.id}: "${text}" coincide con ${re}`);
  }
});

// --- Acciones: solo lectura ---------------------------------------------------

test('toda accion declarada es de solo lectura y no contiene verbos de escritura', () => {
  for (const { where, action } of allActions()) {
    assert.ok(READ_ONLY_ACTIONS.includes(action.kind), `${where}: ${action.kind} no esta en la lista blanca`);
    assert.ok(!containsProhibitedVerb(action.kind), `${where}: ${action.kind} contiene un verbo de escritura`);
  }
  for (const kind of READ_ONLY_ACTIONS) {
    assert.ok(isReadOnlyAction(kind), `${kind} deberia ser de solo lectura`);
  }
});

test('la politica rechaza cualquier accion de escritura', () => {
  const writes = [
    'records.create', 'records.update', 'records.transition', 'doc.delete', 'doc.deleteNode',
    'doc.approveWorkflow', 'doc.requestCorrection', 'doc.rejectWorkflow', 'app.markRead',
    'app.markAllRead', 'doc.upload', 'dynamic.import', 'dynamic.importFp05', 'mail.send',
    'doc.rename', 'doc.move', 'doc.sign', 'doc.restoreTrash', 'doc.purgeTrash', 'users.setPassword',
    'doc.publish', 'dynamic.save', 'dynamic.submit', 'sql.write',
  ];
  for (const kind of writes) {
    assert.ok(!isReadOnlyAction(kind), `${kind} deberia estar prohibida`);
    assert.throws(() => assertReadOnlyAction(kind), /no permitida/, `${kind} deberia lanzar`);
  }
  // Un verbo de escritura se rechaza aunque alguien lo anada a la lista blanca.
  for (const verb of PROHIBITED_VERBS) {
    assert.ok(containsProhibitedVerb(`doc.${verb}Something`), `${verb} no detectado`);
  }
});

test('demoBus rechaza comandos de escritura antes de entregarlos', async () => {
  demoBus.clear();
  let delivered = 0;
  const off = demoBus.register('documentacion', () => { delivered += 1; return true; });
  assert.throws(() => demoBus.execute('documentacion', { kind: 'doc.deleteNode' }), /no permitida/);
  assert.throws(() => demoBus.execute('app', { kind: 'app.markAllRead' }), /no permitida/);
  assert.equal(delivered, 0);
  assert.equal(await demoBus.execute('documentacion', { kind: 'doc.setSearch', params: { text: 'PR-01-A' } }), true);
  assert.equal(delivered, 1);
  off();
  demoBus.clear();
});

test('demoBus encola comandos hasta que el modulo se monta', async () => {
  demoBus.clear();
  const seen = [];
  const pending = demoBus.execute('registros', { kind: 'registros.setTab', params: { tab: 'dynamic' } });
  assert.equal(demoBus.pendingCount('registros'), 1);
  const off = demoBus.register('registros', cmd => { seen.push(cmd.params.tab); return true; });
  assert.equal(await pending, true);
  assert.deepEqual(seen, ['dynamic']);
  assert.equal(demoBus.pendingCount('registros'), 0);
  off();
  demoBus.clear();
});

test('un manejador defectuoso no rompe la demo', async () => {
  demoBus.clear();
  const off = demoBus.register('dynamic', () => { throw new Error('fallo simulado'); });
  assert.equal(await demoBus.execute('dynamic', { kind: 'dynamic.resetForm' }), false);
  off();
  demoBus.clear();
});

test('clear descarta los comandos en cola al cerrar la demo', async () => {
  demoBus.clear();
  const pending = demoBus.execute('dynamic', { kind: 'dynamic.selectType', params: { code: 'FP-05-C' } });
  demoBus.clear();
  assert.equal(await pending, false);
  assert.equal(demoBus.pendingCount('dynamic'), 0);
});

test('la demo nunca abre documentos con informacion personal', () => {
  const scenesSrc = read('src/renderer/demo/steps/scenes.ts');
  const safe = read('src/renderer/demo/data/safeDocuments.ts');
  const usedNames = allActions()
    .map(({ action }) => String((action.params || {}).name || ''))
    .filter(Boolean);
  for (const forbidden of FORBIDDEN_DEMO_DOCUMENTS) {
    for (const name of usedNames) {
      assert.ok(!name.toUpperCase().includes(forbidden.toUpperCase()), `se referencia ${forbidden}`);
    }
    assert.ok(!scenesSrc.includes(forbidden), `scenes.ts menciona ${forbidden}`);
  }
  assert.ok(safe.includes('FORBIDDEN_DEMO_DOCUMENTS'));
  // Documentacion rechaza abrir los prohibidos aunque se pidan por nombre.
  const doc = read('src/renderer/modules/documentacion/Documentacion.tsx');
  assert.ok(doc.includes('isForbiddenDemoDocument(node)'), 'Documentacion debe bloquear documentos prohibidos');
});

test('el visor protegido solo se abre por accion explicita del presentador', () => {
  for (const { where, action } of allActions()) {
    if (action.kind === 'doc.openDocumentViewer') {
      assert.equal(action.trigger, 'presenter', `${where}: el visor no debe abrirse solo`);
      assert.ok(action.label, `${where}: falta el texto del boton`);
    }
  }
});

test('las escenas y acciones no dependen de temporizadores fijos', () => {
  for (const rel of ['steps/scenes.ts', 'engine/useDemoEngine.ts', 'actions/policy.ts']) {
    const code = stripComments(fs.readFileSync(path.join(DEMO_DIR, rel), 'utf8'));
    assert.ok(!/setTimeout|setInterval/.test(code), `${rel} no debe usar temporizadores`);
  }
});

// --- Linea de tiempo para la Fase 2 (voz) --------------------------------------

test('la linea de tiempo encadena todos los micro-pasos con next/prev', () => {
  const timeline = buildTimeline(DEMO_SCENES);
  const total = DEMO_SCENES.reduce((n, s) => n + s.steps.length, 0);
  assert.equal(timeline.length, total);
  assert.equal(timeline[0].prev, null);
  assert.equal(timeline[timeline.length - 1].next, null);
  for (let i = 1; i < timeline.length; i += 1) {
    assert.equal(timeline[i].prev, timeline[i - 1].stepId);
    assert.equal(timeline[i - 1].next, timeline[i].stepId);
    assert.equal(timeline[i].index, i);
  }
});

// --- Spotlight: todo objetivo existe en la aplicacion ----------------------------

test('cada data-demo-id usado por el recorrido existe en el codigo de la app', () => {
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
  const prefixes = [];
  for (const file of rendererFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(/data-demo-id="([a-z0-9-]+)"/g)) declared.add(m[1]);
    // Expresiones: data-demo-id={cond ? 'id' : undefined} o record lookups.
    for (const m of content.matchAll(/data-demo-id=\{[^}]*?'([a-z0-9-]+)'/g)) declared.add(m[1]);
    // Plantillas: data-demo-id={`dynamic-field-${...}`}
    for (const m of content.matchAll(/data-demo-id=\{`([a-z0-9-]+)\$\{/g)) prefixes.push(m[1]);
    for (const m of content.matchAll(/:\s*'(dashboard-kpi-[a-z]+)'/g)) declared.add(m[1]);
  }

  const exists = id => declared.has(id) || prefixes.some(p => id.startsWith(p));
  const missing = [];
  for (const { step } of allSteps()) {
    for (const t of step.target || []) if (!exists(t)) missing.push(`${step.id} -> ${t}`);
  }
  for (const { where, action } of allActions()) {
    if (action.kind === 'dom.touchField' && !exists(String(action.params.target))) {
      missing.push(`${where} -> ${action.params.target}`);
    }
  }
  assert.deepEqual(missing, [], `objetivos sin data-demo-id:\n${missing.join('\n')}`);
});

test('los modulos prototipo se marcan como tales', () => {
  const list = read('src/renderer/components/prototypeSections.ts');
  for (const id of [
    'auditorias', 'no-conformidades', 'capa', 'riesgos', 'indicadores', 'proveedores',
    'revision-direccion', 'competencias', 'satisfaccion', 'control-cambios',
  ]) {
    assert.ok(list.includes(`'${id}'`), `${id} deberia marcarse como prototipo`);
  }
  assert.ok(!/'documentacion'|'registros'|'dashboard'|'usuarios'/.test(list), 'un modulo real no es prototipo');
  const app = read('src/renderer/App.tsx');
  assert.ok(app.includes('isPrototypeSection(section)'), 'App debe mostrar el aviso de prototipo');
  assert.ok(app.includes('no pertenecen a Innovax'), 'el aviso debe aclarar que los datos son de ejemplo');
  const sidebar = read('src/renderer/components/Sidebar.tsx');
  assert.ok(sidebar.includes('sidebar-proto-badge'), 'el Sidebar debe marcar los prototipos');
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

test('los manejadores de la demo en los modulos no llaman a escrituras', () => {
  const doc = read('src/renderer/modules/documentacion/Documentacion.tsx');
  const start = doc.indexOf('const runDemoCommand');
  const end = doc.indexOf("demoBus.register('documentacion'");
  assert.ok(start > 0 && end > start, 'no se encontro el manejador de la demo en Documentacion');
  const handler = stripComments(doc.slice(start, end));
  for (const re of [
    /approveWorkflow|requestCorrection|submitForReview/,
    /deleteNode|moveNodeToFolder|uploadFilesToFolder|renameNode/,
    /callTreeRepo\(\s*'(create|update|delete|move|rename|restore|purge|sign|clear)/i,
    /markRead|markAllRead/,
  ]) {
    assert.ok(!re.test(handler), `el manejador de Documentacion no debe usar ${re}`);
  }

  const app = read('src/renderer/App.tsx');
  const appStart = app.indexOf("demoBus.register('app'");
  const appHandler = app.slice(appStart, app.indexOf('}), []);', appStart));
  assert.ok(!/markRead|markAllRead|repo\.call/.test(appHandler), 'abrir notificaciones no debe marcarlas como leidas');
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

  const others = [...demoSources(), ...demoFiles(/\.css$/)];
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
