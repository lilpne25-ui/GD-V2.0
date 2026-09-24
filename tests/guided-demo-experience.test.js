// Pruebas de la Fase 2.1: voz femenina, bienvenida, identidad Innovax y
// coherencia del discurso (presente vs futuro).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { pickVoice } = require('../dist-test/renderer/demo/narration/VoiceEngine');
const { voiceGender, isFemaleVoice } = require('../dist-test/renderer/demo/narration/voiceGender');
const {
  getGreetingForHour,
  welcomeSpeech,
  welcomeTitle,
  formatRole,
  WELCOME_SUBTITLE,
} = require('../dist-test/renderer/welcome/greeting');
const { welcomeSession } = require('../dist-test/renderer/welcome/welcomeSession');
const { DEMO_SCENES } = require('../dist-test/renderer/demo/steps/scenes');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const steps = () => DEMO_SCENES.flatMap(s => s.steps);
const V = (name, lang, extra = {}) => ({ name, lang, localService: true, default: false, ...extra });

// Voces reales publicadas por Windows en la PC de la demo (Chromium/Electron).
const WINDOWS_VOICES = [
  V('Microsoft Helena - Spanish (Spain)', 'es-ES', { default: true }),
  V('Microsoft Mark - English (United States)', 'en-US'),
  V('Microsoft Zira - English (United States)', 'en-US'),
  V('Microsoft David - English (United States)', 'en-US'),
  V('Microsoft Laura - Spanish (Spain)', 'es-ES'),
  V('Microsoft Pablo - Spanish (Spain)', 'es-ES'),
  V('Microsoft Raul - Spanish (Mexico)', 'es-MX'),
  V('Microsoft Sabina - Spanish (Mexico)', 'es-MX'),
];

// --- Voz femenina obligatoria -------------------------------------------------------

test('clasifica el genero de las voces de Windows por su nombre', () => {
  assert.equal(voiceGender({ name: 'Microsoft Sabina - Spanish (Mexico)' }), 'female');
  assert.equal(voiceGender({ name: 'Microsoft Helena Desktop - Spanish (Spain)' }), 'female');
  assert.equal(voiceGender({ name: 'Microsoft Laura - Spanish (Spain)' }), 'female');
  assert.equal(voiceGender({ name: 'Microsoft Raul - Spanish (Mexico)' }), 'male');
  assert.equal(voiceGender({ name: 'Microsoft Pablo - Spanish (Spain)' }), 'male');
  assert.equal(voiceGender({ name: 'Google español' }), 'unknown');
  assert.equal(voiceGender({ name: 'Voz femenina de prueba' }), 'female');
  assert.equal(voiceGender({ name: 'Some Male Voice' }), 'male');
});

test('en esta PC se elige Sabina (femenina es-MX) aunque Raul aparezca antes', () => {
  assert.equal(pickVoice(WINDOWS_VOICES).name, 'Microsoft Sabina - Spanish (Mexico)');
  const raulDefault = WINDOWS_VOICES.map(v => (v.name.includes('Raul') ? { ...v, default: true } : { ...v, default: false }));
  assert.equal(pickVoice(raulDefault).name, 'Microsoft Sabina - Spanish (Mexico)');
});

test('sin voz femenina es-MX se usa otra femenina es-* (nunca una masculina)', () => {
  const noSabina = WINDOWS_VOICES.filter(v => !v.name.includes('Sabina'));
  const picked = pickVoice(noSabina);
  assert.ok(isFemaleVoice(picked), `eligio ${picked.name}`);
  assert.equal(picked.lang, 'es-ES');
});

test('nunca hay fallback automatico a una voz masculina ni de genero desconocido', () => {
  assert.equal(pickVoice([V('Microsoft Raul - Spanish (Mexico)', 'es-MX', { default: true }),
    V('Microsoft Pablo - Spanish (Spain)', 'es-ES')]), null);
  assert.equal(pickVoice([V('Google español', 'es-ES')]), null);
});

test('la voz preferida tras la audicion solo se respeta si es femenina', () => {
  assert.equal(pickVoice(WINDOWS_VOICES, 'Laura').name, 'Microsoft Laura - Spanish (Spain)');
  assert.equal(pickVoice(WINDOWS_VOICES, 'Microsoft Helena - Spanish (Spain)').name, 'Microsoft Helena - Spanish (Spain)');
  assert.equal(pickVoice(WINDOWS_VOICES, 'Raul').name, 'Microsoft Sabina - Spanish (Mexico)');
  assert.equal(pickVoice(WINDOWS_VOICES, 'NoExiste').name, 'Microsoft Sabina - Spanish (Mexico)');
});

test('sin voz femenina, el aviso lo dice y la demo sigue en modo manual', () => {
  const playback = read('src/renderer/demo/engine/usePlayback.ts');
  assert.ok(playback.includes("'Voz no disponible. Continuando en modo manual.'"));
  assert.ok(playback.includes("'Voz principal no disponible. Usando voz de respaldo.'"));
});

// --- Bienvenida --------------------------------------------------------------------------

test('saludo segun la hora local', () => {
  const cases = { 0: 'noches', 4: 'noches', 5: 'dias', 11: 'dias', 12: 'tardes', 18: 'tardes', 19: 'noches', 23: 'noches' };
  for (const [hour, key] of Object.entries(cases)) {
    assert.equal(getGreetingForHour(Number(hour)).key, key, `hora ${hour}`);
  }
  assert.equal(getGreetingForHour(8).label, 'Buenos días');
  assert.equal(getGreetingForHour(15).label, 'Buenas tardes');
  assert.equal(getGreetingForHour(21).label, 'Buenas noches');
});

test('textos de bienvenida: Innovax, Sistema de Gestion de Calidad y sin afirmaciones ISO', () => {
  assert.equal(welcomeTitle(9), 'Buenos días, Innovax');
  assert.equal(WELCOME_SUBTITLE, 'Bienvenidos a su Sistema de Gestión de Calidad.');
  assert.equal(welcomeSpeech(9), 'Buenos días, Innovax. Bienvenidos a su Sistema de Gestión de Calidad.');
  assert.equal(welcomeSpeech(15), 'Buenas tardes, Innovax. Bienvenidos a su Sistema de Gestión de Calidad.');
  assert.equal(welcomeSpeech(21), 'Buenas noches, Innovax. Bienvenidos a su Sistema de Gestión de Calidad.');
  for (const h of [9, 15, 21]) {
    for (const text of [welcomeSpeech(h), welcomeSpeech(h, 'alternativa')]) {
      assert.ok(text.includes('Innovax'));
      assert.ok(!/ISO|garantiza|certific|cumplimiento/i.test(text), text);
    }
  }
});

test('el puesto se muestra legible (sin mayusculas por palabra)', () => {
  assert.equal(formatRole('coordinador del sgc'), 'Coordinador del SGC');
  assert.equal(formatRole('ADMIN'), 'Admin');
  assert.equal(formatRole('jefe de gestion ti'), 'Jefe de gestion TI');
  assert.equal(formatRole(''), '');
});

test('la bienvenida ocurre una vez por login y no al restaurar una sesion', () => {
  welcomeSession.reset();
  assert.equal(welcomeSession.shouldShow('s1'), false, 'sin login (sesion restaurada) no saluda');
  welcomeSession.markLogin();
  assert.equal(welcomeSession.shouldShow('s1'), true);
  welcomeSession.markShown('s1');
  assert.equal(welcomeSession.shouldShow('s1'), false, 'cambiar de modulo o re-renderizar no repite');
  assert.equal(welcomeSession.shouldShow(null), false);
});

test('tras cerrar sesion, el siguiente login vuelve a saludar', () => {
  welcomeSession.reset();
  welcomeSession.markLogin();
  welcomeSession.markShown('s1');
  welcomeSession.reset(); // logout
  assert.equal(welcomeSession.shouldShow('s1'), false);
  welcomeSession.markLogin(); // nuevo login
  assert.equal(welcomeSession.shouldShow('s2'), true);
  welcomeSession.reset();
});

test('App: el login marca la bienvenida, el logout la rearma y la demo la silencia', () => {
  const app = read('src/renderer/App.tsx');
  assert.ok(app.includes('<Login onLoginSuccess={() => welcomeSession.markLogin()} />'));
  assert.ok(/void logout\(\);\s*\n\s*welcomeSession\.reset\(\);/.test(app));
  assert.ok(app.includes('suppressed={demoOpen}'));
  const authGate = app.indexOf('if (!authenticated)');
  assert.ok(app.indexOf('<WelcomeGreeting') > authGate, 'solo se renderiza con sesion');
  const welcome = read('src/renderer/welcome/WelcomeGreeting.tsx');
  assert.ok(/engineRef\.current\?\.dispose\(\)/.test(welcome), 'al desmontar (logout) corta la voz');
  assert.ok(!/email|\.id\b/.test(welcome.replace(/sessionKey/g, '')), 'no muestra correo ni ids');
});

// --- Identidad Innovax ------------------------------------------------------------------

test('el tema de la instancia Innovax vive en tokens y no toca los colores semanticos', () => {
  const tokens = read('src/renderer/assets/branding/innovax/innovax-tokens.css');
  for (const token of ['--color-primary:', '--btn-primary-bg:', '--innovax-sidebar-bg:', '--innovax-sidebar-active-bg:']) {
    assert.ok(tokens.includes(token), `falta ${token}`);
  }
  for (const semantic of ['--color-success', '--color-warning', '--color-danger', '--color-info']) {
    assert.ok(!tokens.includes(`${semantic}:`), `la marca no debe redefinir ${semantic}`);
  }
  // Gana a global.css aunque la hoja se cargue antes (DemoBrand la importa desde el Sidebar).
  assert.ok(/html:root \{[^}]*--color-primary:/.test(tokens), 'el tema de instancia usa html:root');
});

test('los estados de producto no comparten color con la marca', () => {
  const css = read('src/renderer/demo/GuidedDemo.css');
  const next = css.match(/\.gd-status--next \{([^}]*)\}/)[1];
  assert.ok(next.includes('--color-info') && !next.includes('--color-primary'), 'Siguiente implementacion usa el color informativo');
  const live = css.match(/\.gd-status--live \{([^}]*)\}/)[1];
  assert.ok(live.includes('--color-success'));
  const sidebar = read('src/renderer/components/Sidebar.css');
  const proto = sidebar.match(/\.sidebar-proto-badge \{([^}]*)\}/)[1];
  assert.ok(/dashed/.test(proto) && !/--innovax-accent|--color-success/.test(proto), 'Prototipo es neutro');
});

test('Sidebar y Login muestran la marca Innovax con co-branding GD-V2 y sin afirmaciones ISO', () => {
  const sidebar = read('src/renderer/components/Sidebar.tsx');
  assert.ok(sidebar.includes('<InnovaxLogo'));
  assert.ok(sidebar.includes('Sistema de Gestión de Calidad') && sidebar.includes('Powered by GD-V2'));
  assert.ok(!sidebar.includes('Operación ISO 9001'));
  const login = read('src/renderer/components/Login.tsx');
  assert.ok(login.includes('<InnovaxLogo') && login.includes('Powered by GD-V2'));
});

test('los botones primarios usan tokens, no azules fijos', () => {
  const global = read('src/renderer/styles/global.css');
  const primary = global.match(/\.btn-primary \{([^}]*)\}/)[1];
  assert.ok(primary.includes('var(--btn-primary-bg)'));
  assert.ok(!/#[0-9a-f]{6}/i.test(primary));
});

// --- Coherencia del discurso -------------------------------------------------------------

const FUTURE = /(siguiente etapa|etapa posterior|permitirá|permitirán|\bserá\b|\bserán\b|estará|estarán|podrá|podrán|conectarán|producirá|calculará|alimentará|controlarán|la visión)/i;
const PRESENT_CLAIMS = [
  /\bel sistema (hace|calcula|controla|conecta|genera|detecta)\b/i,
  /\bya (funciona|calcula|conecta|genera|detecta)\b/i,
  /\bahora produce\b/i,
  /\bcada paro calcula\b/i,
  /\balimenta la recurrencia\b/i,
];

test('ningun paso "Funciona hoy" usa lenguaje de futuro', () => {
  for (const step of steps().filter(s => s.status === 'live')) {
    assert.ok(!FUTURE.test(step.narrationText), `${step.id}: ${step.narrationText}`);
  }
});

test('los pasos de siguiente implementacion y vision no afirman funciones actuales', () => {
  for (const step of steps().filter(s => s.status === 'next' || s.status === 'vision')) {
    for (const re of PRESENT_CLAIMS) {
      assert.ok(!re.test(step.narrationText), `${step.id}: ${re} en "${step.narrationText}"`);
      if (step.speechText) assert.ok(!re.test(step.speechText), `${step.id} (voz): ${re}`);
    }
  }
});

test('las narraciones de siguiente implementacion hablan en futuro o de lo que hay hoy', () => {
  const byId = Object.fromEntries(steps().map(s => [s.id, s]));
  for (const id of ['mirror-rules', 'fp15-format', 'fp15-data']) {
    assert.ok(/(siguiente etapa|seguirá|producirá|controlarán|calculará)/i.test(byId[id].narrationText), id);
  }
  assert.ok(/visión/i.test(byId['loop-chain'].narrationText));
});

test('todos los micro-pasos tienen narracion y los pasos en vivo, objetivo', () => {
  assert.equal(steps().length, 53);
  for (const step of steps()) {
    assert.ok(step.narrationText && step.narrationText.trim().length > 10, `${step.id} sin narracion`);
    assert.ok(step.status, `${step.id} sin estado`);
  }
});

test('el paso sin datos de demo lo dice tambien en voz', () => {
  const step = steps().find(s => s.id === 'record-lifecycle');
  assert.ok(/no tiene registros de demostración/.test(step.narrationText));
});
