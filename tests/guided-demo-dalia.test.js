// Voz oficial de la demo (Dalia) y bienvenida: seleccion, respaldo y una sola vez por sesion.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { pickVoice, isPrimaryVoice, VOICE_RATE, CHUNK_GAP_MS } = require('../dist-test/renderer/demo/narration/VoiceEngine');
const { AudioAssetVoiceEngine } = require('../dist-test/renderer/demo/narration/AudioAssetVoiceEngine');
const { FakeVoiceEngine } = require('../dist-test/renderer/demo/narration/FakeVoiceEngine');
const { speechKey } = require('../dist-test/renderer/demo/narration/speechKey');
const { welcomeSession } = require('../dist-test/renderer/welcome/welcomeSession');
const { welcomeSpeech } = require('../dist-test/renderer/welcome/greeting');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const V = (name, lang, extra = {}) => ({ name, lang, localService: true, default: false, ...extra });
const DALIA = V('Microsoft Dalia Online (Natural) - Spanish (Mexico)', 'es-MX', { localService: false });

// --- Seleccion -------------------------------------------------------------------------

test('Dalia es la voz principal aunque sea en linea y no sea la primera', () => {
  const voices = [V('Microsoft Sabina - Spanish (Mexico)', 'es-MX', { default: true }), V('Microsoft Raul - Spanish (Mexico)', 'es-MX'), DALIA];
  assert.equal(pickVoice(voices).name, DALIA.name);
  assert.equal(pickVoice(voices, 'Sabina').name, DALIA.name);
});

test('Dalia se reconoce por nombre o voiceURI y solo en es-MX', () => {
  assert.equal(isPrimaryVoice(DALIA), true);
  assert.equal(isPrimaryVoice({ ...V('Voz', 'es-MX'), voiceURI: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)' }), true);
  assert.equal(isPrimaryVoice(V('Microsoft Dalia - Spanish (Spain)', 'es-ES')), false);
  assert.equal(isPrimaryVoice(V('Microsoft Sabina - Spanish (Mexico)', 'es-MX')), false);
});

test('sin Dalia: femenina es-MX, luego femenina es-*, nunca masculina ni otra remota', () => {
  assert.equal(pickVoice([V('Microsoft Raul - Spanish (Mexico)', 'es-MX'), V('Microsoft Sabina - Spanish (Mexico)', 'es-MX')]).name, 'Microsoft Sabina - Spanish (Mexico)');
  assert.equal(pickVoice([V('Microsoft Pablo - Spanish (Spain)', 'es-ES'), V('Microsoft Helena - Spanish (Spain)', 'es-ES')]).name, 'Microsoft Helena - Spanish (Spain)');
  assert.equal(pickVoice([V('Microsoft Raul - Spanish (Mexico)', 'es-MX'), V('Microsoft Pablo - Spanish (Spain)', 'es-ES')]), null);
  assert.equal(pickVoice([V('Microsoft Paloma Online (Natural) - Spanish (United States)', 'es-US', { localService: false })]), null);
});

test('configuracion aprobada: velocidad 1.05 y pausa corta', () => {
  assert.equal(VOICE_RATE, 1.05);
  assert.ok(CHUNK_GAP_MS <= 300, 'pausa corta');
});

// --- Audio pregenerado de Dalia ------------------------------------------------------------

test('el manifiesto declara a Dalia y cubre las tres bienvenidas', () => {
  const manifest = read('src/renderer/assets/demo-audio/manifest.ts');
  assert.match(manifest, /voice: 'Dalia Online \(Natural\) · México'/);
  for (const hour of [8, 14, 21]) {
    const key = speechKey(welcomeSpeech(hour));
    assert.ok(manifest.includes(`'${key}': 'dalia-${key}.wav'`), `falta la bienvenida de las ${hour} h`);
    assert.ok(fs.existsSync(path.join(ROOT, 'src/renderer/assets/demo-audio', `dalia-${key}.wav`)));
  }
});

function fakeAudio({ failPlay = false } = {}) {
  return {
    src: '', currentTime: 0, duration: 3, onended: null, onerror: null, onplaying: null,
    play() { return failPlay ? Promise.reject(new Error('bloqueado')) : Promise.resolve(); },
    pause() {},
  };
}

function engineWith({ failPlay = false, fallback = new FakeVoiceEngine() } = {}) {
  const created = [];
  const engine = new AudioAssetVoiceEngine({
    resolve: text => (text === 'Hola.' ? '/a.wav' : null),
    hasAssets: true,
    voiceName: 'Dalia',
    makeAudio: () => { const a = fakeAudio({ failPlay }); created.push(a); return a; },
    fallback,
  });
  return { engine, created, fallback };
}

const flush = () => new Promise(r => setImmediate(r));

test('STARTED llega cuando el audio empieza de verdad y marca la voz principal', async () => {
  const { engine, created } = engineWith();
  await engine.initialize();
  const events = [];
  engine.onEvent(e => events.push(`${e.type}:${e.source}`));
  const p = engine.speak('Hola.');
  await flush();
  assert.deepEqual(events, ['STARTED:primary']);
  created[0].onended();
  assert.equal(await p, 'finished');
  assert.deepEqual(events, ['STARTED:primary', 'FINISHED:primary']);
});

test('si el audio falla, la misma frase sigue con la voz de respaldo y se avisa como respaldo', async () => {
  const { engine, fallback } = engineWith({ failPlay: true });
  await engine.initialize();
  const events = [];
  engine.onEvent(e => events.push(`${e.type}:${e.source}`));
  const p = engine.speak('Hola.');
  await flush(); await flush();
  assert.ok(events.includes('STARTED:fallback'));
  fallback.finishCurrent();
  assert.equal(await p, 'finished');
});

// --- Bienvenida: una vez por sesion ------------------------------------------------------

test('la bienvenida solo se consume cuando la voz empieza (un intento fallido no la gasta)', () => {
  welcomeSession.reset();
  welcomeSession.markLogin();
  assert.equal(welcomeSession.shouldShow('s1'), true);
  // Intento fallido: nadie llama markShown -> sigue pendiente.
  assert.equal(welcomeSession.shouldShow('s1'), true);
  welcomeSession.markShown('s1');
  assert.equal(welcomeSession.shouldShow('s1'), false, 'navegar no vuelve a saludar');
  welcomeSession.reset(); // logout
  assert.equal(welcomeSession.shouldShow('s1'), false, 'sin login no saluda');
  welcomeSession.markLogin();
  assert.equal(welcomeSession.shouldShow('s2'), true, 'nuevo login vuelve a saludar');
});

test('Repetir bienvenida rearma el saludo en la misma sesion y no espera al Dashboard', () => {
  welcomeSession.reset();
  welcomeSession.markLogin();
  welcomeSession.markShown('s1');
  welcomeSession.replay();
  assert.equal(welcomeSession.shouldShow('s1'), true);
  assert.equal(welcomeSession.isReplay(), true);
  welcomeSession.markShown('s1');
  assert.equal(welcomeSession.isReplay(), false);
});

test('la tarjeta marca el saludo al evento STARTED, reintenta y no queda eterna', () => {
  const src = read('src/renderer/welcome/WelcomeGreeting.tsx');
  assert.match(src, /event\.type !== 'STARTED'[\s\S]*welcomeSession\.markShown\(sessionKey\)/);
  assert.match(src, /const ATTEMPTS = 2;/);
  assert.match(src, /VOICE_READY_TIMEOUT_MS = 6000/);
  assert.match(src, /Preparando experiencia…/);
  assert.match(src, /if \(!started\) setPreparing\(true\)/, '"Preparando" no aparece si la voz ya empezo');
  assert.match(src, /Voz principal no disponible\. Usando voz de respaldo\./);
});

test('"Repetir bienvenida" vive solo en los controles de la demo', () => {
  const demo = read('src/renderer/demo/GuidedDemo.tsx');
  const app = read('src/renderer/App.tsx');
  assert.match(demo, /Repetir bienvenida/);
  assert.match(app, /onReplayWelcome=\{replayWelcome\}/);
  assert.ok(!/Repetir bienvenida/.test(read('src/renderer/components/Sidebar.tsx')));
});

test('todos los pasos de la demo tienen audio de Dalia (una misma voz de principio a fin)', () => {
  const { DEMO_SCENES } = require('../dist-test/renderer/demo/steps/scenes');
  const { speechFor } = require('../dist-test/renderer/demo/narration/VoiceController');
  const manifest = read('src/renderer/assets/demo-audio/manifest.ts');
  const missing = [];
  for (const scene of DEMO_SCENES) {
    for (const step of scene.steps) {
      const texts = [speechFor(step, false)];
      if (step.fallbackText) texts.push(speechFor(step, true));
      for (const text of texts) {
        const key = speechKey(text);
        if (!manifest.includes(`'${key}': 'dalia-${key}.wav'`) || !fs.existsSync(path.join(ROOT, 'src/renderer/assets/demo-audio', `dalia-${key}.wav`))) missing.push(step.id);
      }
    }
  }
  assert.deepEqual(missing, []);
});

test('causa del silencio en la bienvenida: un voiceschanged VACIO no cuenta como voces cargadas', async () => {
  const { SpeechVoiceEngine } = require('../dist-test/renderer/demo/narration/VoiceEngine');
  const voices = [];
  const listeners = [];
  const synth = {
    speaking: false, paused: false,
    getVoices: () => voices.slice(),
    speak() {}, cancel() {}, pause() {}, resume() {},
    addEventListener: (type, fn) => listeners.push(fn),
    removeEventListener: (type, fn) => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
  };
  const engine = new SpeechVoiceEngine(synth, text => ({ text }), { voicesTimeoutMs: 1000 });
  const pending = engine.initialize();
  listeners.slice().forEach(fn => fn()); // Electron en frio: primer aviso sin voces (~27 ms)
  voices.push({ name: 'Microsoft Sabina - Spanish (Mexico)', lang: 'es-MX', localService: true, default: false });
  listeners.slice().forEach(fn => fn()); // segundo aviso con las voces reales (~35 ms)
  const init = await pending;
  assert.equal(init.available, true);
  assert.equal(init.voice.name, 'Microsoft Sabina - Spanish (Mexico)');
});
