// Pruebas de la Fase 2 de la Demo guiada: voz, sincronizacion y control.
//
// Cada bloque protege una promesa concreta:
//  - La voz es local, se elige por capacidad (es-MX > es-* > predeterminada) y
//    nunca usa voces remotas.
//  - La voz gobierna la duracion: se avanza al terminar la locucion, no por
//    un temporizador fijo; un watchdog solo corta locuciones colgadas.
//  - Siguiente / Anterior / Salir cancelan la voz en el acto.
//  - Si la voz falla, la demo continua en modo manual.
//  - La voz no introduce ninguna escritura.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SpeechVoiceEngine,
  pickVoice,
  splitIntoChunks,
  watchdogMs,
  VOICE_RATE,
  VOICE_PITCH,
  VOICE_VOLUME,
} = require('../dist-test/renderer/demo/narration/VoiceEngine');
const { FakeVoiceEngine } = require('../dist-test/renderer/demo/narration/FakeVoiceEngine');
const {
  VoiceController,
  decideAfterNarration,
  effectiveMode,
  readingTimeMs,
  speechFor,
} = require('../dist-test/renderer/demo/narration/VoiceController');
const { DEMO_SCENES } = require('../dist-test/renderer/demo/steps/scenes');

const ROOT = path.join(__dirname, '..');
const DEMO_DIR = path.join(ROOT, 'src', 'renderer', 'demo');
const NO_DELAY = { preDelayMs: 0, postDelayMs: 0 };

const flush = () => new Promise(resolve => setImmediate(resolve));

/** Espera (sin temporizadores fijos) a que se cumpla una condicion; falla a 1 s. */
async function until(cond, label = 'condicion') {
  const started = Date.now();
  while (!cond()) {
    if (Date.now() - started > 1000) throw new Error(`timeout esperando ${label}`);
    await new Promise(resolve => setTimeout(resolve, 1));
  }
}
const steps = () => DEMO_SCENES.flatMap(s => s.steps);

// --- Sintetizador simulado (lo minimo de window.speechSynthesis) -------------

function makeSynth(voices) {
  const synth = {
    speaking: false,
    paused: false,
    spoken: [],
    calls: [],
    listeners: {},
    getVoices: () => voices,
    speak(u) { this.spoken.push(u); this.calls.push('speak'); },
    cancel() { this.calls.push('cancel'); },
    pause() { this.paused = true; this.calls.push('pause'); },
    resume() { this.paused = false; this.calls.push('resume'); },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeEventListener(type) { delete this.listeners[type]; },
  };
  return synth;
}

const makeUtterance = text => ({
  text, lang: '', rate: 1, pitch: 1, volume: 1, voice: null, onstart: null, onend: null, onerror: null,
});

const V = (name, lang, extra = {}) => ({ name, lang, localService: true, default: false, ...extra });

async function readyEngine(voices = [V('Sabina', 'es-MX')]) {
  const synth = makeSynth(voices);
  const engine = new SpeechVoiceEngine(synth, makeUtterance, { voicesTimeoutMs: 10, chunkGapMs: 0 });
  const events = [];
  engine.onEvent(e => events.push(e.type));
  const init = await engine.initialize();
  return { synth, engine, events, init };
}

// --- Seleccion de voz ----------------------------------------------------------------

test('sin speechSynthesis la voz queda no disponible y nunca lanza', async () => {
  const engine = new SpeechVoiceEngine(null, makeUtterance);
  const init = await engine.initialize();
  assert.equal(init.available, false);
  assert.equal(await engine.speak('Hola.'), 'error');
  assert.doesNotThrow(() => { engine.pause(); engine.resume(); engine.cancel(); engine.dispose(); });
});

test('sin voces locales la voz queda no disponible', async () => {
  const { init } = await readyEngine([]);
  assert.equal(init.available, false);
});

test('se elige es-MX antes que cualquier otra voz', () => {
  const picked = pickVoice([
    V('English', 'en-US', { default: true }),
    V('Helena', 'es-ES'),
    V('Sabina', 'es-MX'),
  ]);
  assert.equal(picked.lang, 'es-MX');
});

test('sin es-MX femenina se prefiere una latinoamericana y luego cualquier es-* femenina', () => {
  assert.equal(pickVoice([V('Helena', 'es-ES'), V('Paulina - Spanish (Latin America)', 'es-US')]).name,
    'Paulina - Spanish (Latin America)');
  assert.equal(pickVoice([V('Zira', 'en-US', { default: true }), V('Helena', 'es-ES')]).lang, 'es-ES');
  assert.equal(pickVoice([V('Zira', 'en-US', { default: true }), V('Laura', 'es_ES')]).name, 'Laura');
});

test('sin voz femenina en espanol no hay voz (nunca otra lengua ni la predeterminada)', () => {
  assert.equal(pickVoice([V('David', 'en-US'), V('Zira', 'en-US', { default: true })]), null);
});

test('nunca se eligen voces remotas (sin internet)', () => {
  const picked = pickVoice([V('Sabina Online', 'es-MX', { localService: false }), V('Helena', 'es-ES')]);
  assert.equal(picked.name, 'Helena');
  assert.equal(pickVoice([V('Sabina Online', 'es-MX', { localService: false })]), null);
});

test('el unico nombre de voz en el codigo es Dalia (voz aprobada)', () => {
  const src = fs.readFileSync(path.join(DEMO_DIR, 'narration', 'VoiceEngine.ts'), 'utf8');
  assert.ok(!/Sabina|Helena|Laura|Raul|Pablo|Zira|David|Google|Microsoft/.test(src), 'no debe haber otros nombres de voz');
  assert.match(src, /dalia/i);
});

test('espera el evento voiceschanged cuando Windows publica las voces tarde', async () => {
  const voices = [];
  const synth = makeSynth(voices);
  const engine = new SpeechVoiceEngine(synth, makeUtterance, { voicesTimeoutMs: 1000 });
  const pending = engine.initialize();
  voices.push(V('Sabina', 'es-MX'));
  synth.listeners.voiceschanged();
  const init = await pending;
  assert.equal(init.available, true);
  assert.equal(init.voice.lang, 'es-MX');
});

test('configuracion aprobada en la audicion: velocidad 1.05, pitch y volumen normales', async () => {
  assert.equal(VOICE_RATE, 1.05);
  assert.equal(VOICE_PITCH, 1);
  assert.equal(VOICE_VOLUME, 1);
  const { synth, engine } = await readyEngine();
  void engine.speak('Hola.');
  const u = synth.spoken[0];
  assert.equal(u.rate, VOICE_RATE);
  assert.equal(u.lang, 'es-MX');
  assert.equal(u.voice.name, 'Sabina');
  engine.cancel();
});

// --- Locucion --------------------------------------------------------------------------

test('speak termina cuando llega onend de la ultima frase', async () => {
  const { synth, engine, events } = await readyEngine();
  let outcome = null;
  const p = engine.speak('Primera frase. Segunda frase.').then(o => { outcome = o; });
  assert.equal(synth.spoken.length, 1, 'se habla frase a frase');
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  await flush();
  assert.equal(outcome, null, 'no termina hasta la ultima frase');
  assert.equal(synth.spoken.length, 2);
  synth.spoken[1].onend();
  await p;
  assert.equal(outcome, 'finished');
  assert.deepEqual(events, ['STARTED', 'FINISHED']);
  assert.equal(engine.isSpeaking(), false);
});

test('cancel corta la voz, resuelve "cancelled" e ignora eventos tardios', async () => {
  const { synth, engine, events } = await readyEngine();
  const p = engine.speak('Hola mundo.');
  const u = synth.spoken[0];
  engine.cancel();
  assert.equal(await p, 'cancelled');
  assert.ok(synth.calls.includes('cancel'));
  u.onend();
  u.onerror({ error: 'interrupted' });
  assert.deepEqual(events, ['CANCELLED']);
});

test('una nueva locucion cancela la anterior', async () => {
  const { synth, engine } = await readyEngine();
  const first = engine.speak('Uno.');
  const second = engine.speak('Dos.');
  assert.equal(await first, 'cancelled');
  synth.spoken[1].onend();
  assert.equal(await second, 'finished');
});

test('pause y resume usan el sintetizador y emiten eventos', async () => {
  const { synth, engine, events } = await readyEngine();
  const p = engine.speak('Hola.');
  engine.pause();
  assert.equal(engine.isPaused(), true);
  assert.ok(synth.calls.includes('pause'));
  engine.resume();
  assert.equal(engine.isPaused(), false);
  assert.ok(synth.calls.includes('resume'));
  synth.spoken[0].onend();
  assert.equal(await p, 'finished');
  assert.deepEqual(events.filter(e => e === 'PAUSED' || e === 'RESUMED'), ['PAUSED', 'RESUMED']);
});

test('un error del sintetizador se informa como ERROR sin lanzar', async () => {
  const { synth, engine, events } = await readyEngine();
  const p = engine.speak('Hola.');
  synth.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.equal(await p, 'error');
  assert.ok(events.includes('ERROR'));
});

test('el watchdog corta una locucion colgada (onend que nunca llega)', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { engine, events } = await readyEngine();
  let outcome = null;
  const p = engine.speak('Hola.').then(o => { outcome = o; });
  t.mock.timers.tick(watchdogMs('Hola.') - 1);
  await flush();
  assert.equal(outcome, null, 'no corta antes de tiempo');
  t.mock.timers.tick(2);
  await p;
  assert.equal(outcome, 'error');
  assert.ok(events.includes('ERROR'));
});

test('el watchdog no corta mientras la voz esta en pausa', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { synth, engine } = await readyEngine();
  let outcome = null;
  const p = engine.speak('Hola.').then(o => { outcome = o; });
  engine.pause();
  t.mock.timers.tick(watchdogMs('Hola.') * 3);
  await flush();
  assert.equal(outcome, null);
  engine.resume();
  synth.spoken[0].onend();
  await p;
  assert.equal(outcome, 'finished');
});

test('las frases largas se parten sin perder texto', () => {
  const text = 'Uno, dos, tres. ' + 'palabra, '.repeat(40) + 'fin.';
  const chunks = splitIntoChunks(text, 80);
  assert.ok(chunks.every(c => c.length <= 90));
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), text.replace(/\s+/g, ' ').trim());
});

// --- Controlador: la voz gobierna la duracion ------------------------------------------

test('la narracion espera el fin real de la voz antes de devolver el control', async () => {
  const voice = new FakeVoiceEngine();
  await voice.initialize();
  const controller = new VoiceController(voice, NO_DELAY);
  const stages = [];
  let outcome = null;
  const p = controller.run({ text: 'Hola.', voice: true, silentDwell: true, onStage: s => stages.push(s) })
    .then(o => { outcome = o; });
  await new Promise(r => setTimeout(r, 30));
  assert.equal(outcome, null, 'no avanza mientras habla');
  assert.equal(voice.isSpeaking(), true);
  voice.finishCurrent();
  await p;
  assert.equal(outcome, 'finished');
  assert.deepEqual(stages, ['waiting', 'speaking', 'after', 'done']);
});

test('Siguiente/Anterior: una nueva narracion cancela la anterior', async () => {
  const voice = new FakeVoiceEngine();
  await voice.initialize();
  const controller = new VoiceController(voice, NO_DELAY);
  const first = controller.run({ text: 'Paso uno.', voice: true, silentDwell: true });
  await until(() => voice.isSpeaking(), 'voz 1');
  const second = controller.run({ text: 'Paso dos.', voice: true, silentDwell: true });
  assert.equal(await first, 'cancelled');
  await until(() => voice.isSpeaking(), 'voz 2');
  voice.finishCurrent();
  assert.equal(await second, 'finished');
  assert.ok(voice.cancelCount >= 1);
  assert.deepEqual(voice.spoken, ['Paso uno.', 'Paso dos.']);
});

test('Salir: dispose corta la voz y ninguna narracion queda activa', async () => {
  const voice = new FakeVoiceEngine();
  await voice.initialize();
  const controller = new VoiceController(voice, NO_DELAY);
  const p = controller.run({ text: 'Hola.', voice: true, silentDwell: true });
  await until(() => voice.isSpeaking(), 'voz');
  controller.dispose();
  assert.equal(await p, 'cancelled');
  assert.equal(voice.isSpeaking(), false);
});

test('Pausa detiene la voz y la espera; Reanudar continua la secuencia', async () => {
  const voice = new FakeVoiceEngine();
  await voice.initialize();
  const controller = new VoiceController(voice, { preDelayMs: 0, postDelayMs: 40 });
  let outcome = null;
  const p = controller.run({ text: 'Hola.', voice: true, silentDwell: true }).then(o => { outcome = o; });
  await until(() => voice.isSpeaking(), 'voz');
  controller.pause();
  assert.equal(voice.isPaused(), true);
  controller.resume();
  voice.finishCurrent();
  await until(() => !voice.isSpeaking(), 'fin de voz');
  await flush();
  controller.pause(); // pausa durante la pausa natural posterior
  await new Promise(r => setTimeout(r, 80));
  assert.equal(outcome, null, 'en pausa no avanza');
  controller.resume();
  await p;
  assert.equal(outcome, 'finished');
});

test('un fallo del TTS devuelve "error" (la demo pasa a modo manual)', async () => {
  const voice = new FakeVoiceEngine();
  await voice.initialize();
  voice.failNext();
  const controller = new VoiceController(voice, NO_DELAY);
  assert.equal(await controller.run({ text: 'Hola.', voice: true, silentDwell: true }), 'error');
  assert.equal(decideAfterNarration({
    mode: 'AUTO_NARRATED', outcome: 'error', stepAutoAdvance: true, envLimited: false, awaitingPresenter: false, isLast: false,
  }), 'manual-fallback');
});

test('sin voz en modo manual no se espera nada; en automatico, el tiempo de lectura', async () => {
  const controller = new VoiceController(null, NO_DELAY);
  const started = Date.now();
  assert.equal(await controller.run({ text: 'Hola.', voice: false, silentDwell: false }), 'silent');
  assert.ok(Date.now() - started < 200);
  assert.ok(readingTimeMs('x'.repeat(10)) >= 3500);
  assert.ok(readingTimeMs('x'.repeat(10000)) <= 14000);
});

test('modo efectivo: MANUAL, VOICE_SYNC o AUTOPLAY', () => {
  assert.equal(effectiveMode('MANUAL', true), 'MANUAL');
  assert.equal(effectiveMode('AUTO_NARRATED', true), 'VOICE_SYNC');
  assert.equal(effectiveMode('AUTO_NARRATED', false), 'AUTOPLAY');
});

test('reglas de avance: solo avanza en automatico, al terminar y si el paso lo permite', () => {
  const base = { mode: 'AUTO_NARRATED', outcome: 'finished', stepAutoAdvance: true, envLimited: false, awaitingPresenter: false, isLast: false };
  assert.equal(decideAfterNarration(base), 'advance');
  assert.equal(decideAfterNarration({ ...base, outcome: 'silent' }), 'advance');
  assert.equal(decideAfterNarration({ ...base, mode: 'MANUAL' }), 'wait');
  assert.equal(decideAfterNarration({ ...base, stepAutoAdvance: false }), 'wait');
  assert.equal(decideAfterNarration({ ...base, envLimited: true }), 'wait');
  assert.equal(decideAfterNarration({ ...base, awaitingPresenter: true }), 'wait');
  assert.equal(decideAfterNarration({ ...base, isLast: true }), 'wait');
  assert.equal(decideAfterNarration({ ...base, outcome: 'cancelled' }), 'wait');
});

test('simulacion del recorrido completo en automatico: 53/53 sin bloqueos', async () => {
  const voice = new FakeVoiceEngine({ mode: 'auto', autoFinishMs: 1 });
  await voice.initialize();
  const controller = new VoiceController(voice, NO_DELAY);
  const all = steps();
  let index = 0;
  let waits = 0;
  let guard = 0;
  while (index < all.length && guard++ < 200) {
    const step = all[index];
    const outcome = await controller.run({ text: speechFor(step, false), voice: true, silentDwell: true });
    const decision = decideAfterNarration({
      mode: 'AUTO_NARRATED',
      outcome,
      stepAutoAdvance: step.autoAdvance !== false,
      envLimited: false,
      awaitingPresenter: step.action?.trigger === 'presenter',
      isLast: index === all.length - 1,
    });
    assert.notEqual(decision, 'manual-fallback', `${step.id}: la voz no debe fallar`);
    if (decision === 'wait') waits += 1; // el presentador pulsa Siguiente
    index += 1;
  }
  assert.equal(index, 53);
  assert.equal(voice.spoken.length, 53, 'se narran los 53 micro-pasos');
  assert.equal(waits, all.filter(s => s.autoAdvance === false).length);
});

// --- Guion: pronunciacion y pasos que esperan al presentador ------------------------------

test('los codigos y siglas se pronuncian con speechText sin cambiar el texto visible', () => {
  const codes = /[A-Z]{2}-\d{2}(-[A-Z])?|GD-V2|ISO 9001|\bSGC\b|\bKPI\b|workflow/i;
  for (const step of steps()) {
    if (!codes.test(step.narrationText)) continue;
    assert.ok(step.speechText, `${step.id}: necesita speechText`);
    assert.ok(!codes.test(step.speechText), `${step.id}: speechText aun contiene un codigo: ${step.speechText}`);
  }
  // El texto visible conserva los codigos reales.
  const byId = Object.fromEntries(steps().map(s => [s.id, s]));
  assert.ok(byId['fp05-definition'].narrationText.includes('FP-05-C'));
  assert.ok(byId['fp15-format'].narrationText.includes('FP-15'));
  assert.ok(byId['intro-innovax'].narrationText.includes('GD-V2'));
  assert.ok(byId['loop-value'].narrationText.includes('ISO 9001'));
});

test('speechText, si existe, tambien tiene 1-3 frases', () => {
  for (const step of steps()) {
    if (!step.speechText) continue;
    const n = step.speechText.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    assert.ok(n >= 1 && n <= 3, `${step.id}: ${n} frases`);
  }
});

test('los pasos del presentador y los cierres no avanzan solos', () => {
  const manual = steps().filter(s => s.autoAdvance === false).map(s => s.id);
  assert.deepEqual(manual, [
    'master-viewer', 'review-email', 'record-protection', 'fp15-data', 'loop-value', 'plan-close',
  ]);
  for (const step of steps()) {
    if (step.action?.trigger === 'presenter') {
      assert.equal(step.autoAdvance, false, `${step.id}: accion del presentador sin autoAdvance false`);
    }
  }
});

test('con el entorno limitado se pronuncia tambien el aviso honesto', () => {
  const step = steps().find(s => s.id === 'master-row');
  assert.ok(speechFor(step, true).endsWith(step.fallbackText));
  assert.equal(speechFor(step, false), step.narrationText);
});

// --- Garantias: sin escrituras, sin red, sin temporizadores de avance ------------------------

test('la voz no importa canales de escritura, red ni proveedores externos', () => {
  const files = [
    'narration/VoiceEngine.ts', 'narration/VoiceController.ts', 'narration/FakeVoiceEngine.ts',
    'narration/voiceEngineFactory.ts', 'engine/usePlayback.ts',
  ];
  const forbidden = [
    /demoBus/, /runAction/, /repo\.call/, /\bfetch\s*\(/, /XMLHttpRequest/, /ipcRenderer/,
    /openai|elevenlabs|azure|deepseek|googleapis|texttospeech/i, /api[_-]?key/i,
  ];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(DEMO_DIR, rel), 'utf8');
    for (const re of forbidden) assert.ok(!re.test(src), `${rel} no debe contener ${re}`);
  }
});

test('el avance ya no depende de un temporizador fijo por paso', () => {
  assert.ok(!fs.existsSync(path.join(DEMO_DIR, 'engine', 'useAutoplay.ts')), 'el autoplay de 8 s debe desaparecer');
  const playback = fs.readFileSync(path.join(DEMO_DIR, 'engine', 'usePlayback.ts'), 'utf8');
  assert.ok(!/setTimeout|setInterval|STEP_DWELL|dwellMs/.test(playback));
});

test('al desmontar la demo o cerrar la ventana se corta la voz', () => {
  const playback = fs.readFileSync(path.join(DEMO_DIR, 'engine', 'usePlayback.ts'), 'utf8');
  assert.ok(/controllerRef\.current\?\.dispose\(\)/.test(playback));
  assert.ok(/engineRef\.current\?\.dispose\(\)/.test(playback));
  assert.ok(playback.includes("'pagehide'") && playback.includes("'beforeunload'"));
  const factory = fs.readFileSync(path.join(DEMO_DIR, 'narration', 'voiceEngineFactory.ts'), 'utf8');
  assert.ok(factory.includes('window.speechSynthesis'));
});

test('la demo no empieza a hablar sin la accion "Iniciar recorrido"', () => {
  const playback = fs.readFileSync(path.join(DEMO_DIR, 'engine', 'usePlayback.ts'), 'utf8');
  assert.ok(/if \(!started \|\| !input\.uiReady\) return;/.test(playback));
  const view = fs.readFileSync(path.join(DEMO_DIR, 'GuidedDemo.tsx'), 'utf8');
  assert.ok(view.includes('Iniciar recorrido'));
});
