// Pruebas: ciclo de revision en la demo, audio pregenerado y prueba de correo.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { speechKey, normalizeSpeech } = require('../dist-test/renderer/demo/narration/speechKey');
const { AudioAssetVoiceEngine } = require('../dist-test/renderer/demo/narration/AudioAssetVoiceEngine');
const { FakeVoiceEngine } = require('../dist-test/renderer/demo/narration/FakeVoiceEngine');
const { SpeechVoiceEngine } = require('../dist-test/renderer/demo/narration/VoiceEngine');
const {
  resolveProyectosTiRecipient,
  buildDemoTestEmail,
  RECIPIENT_UNRESOLVED,
} = require('../dist-test/shared/demoEmailTest');
const { DEMO_SCENES } = require('../dist-test/renderer/demo/steps/scenes');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const flush = () => new Promise(r => setImmediate(r));

// --- Audio pregenerado ---------------------------------------------------------------

function fakeAudio({ failPlay = false } = {}) {
  const audio = {
    src: '', currentTime: 0, duration: 3, onended: null, onerror: null, playing: false, played: 0,
    play() { this.played += 1; this.playing = true; return failPlay ? Promise.reject(new Error('bloqueado')) : Promise.resolve(); },
    pause() { this.playing = false; },
  };
  return audio;
}

async function audioEngine({ assets = { 'Hola.': 'a.mp3' }, fallback = new FakeVoiceEngine(), failPlay = false } = {}) {
  const created = [];
  const engine = new AudioAssetVoiceEngine({
    resolve: text => assets[normalizeSpeech(text)] ? `/demo-audio/${assets[normalizeSpeech(text)]}` : null,
    hasAssets: Object.keys(assets).length > 0,
    voiceName: 'Voz de prueba',
    makeAudio: url => { const a = fakeAudio({ failPlay }); a.src = url; created.push(a); return a; },
    fallback,
  });
  const init = await engine.initialize();
  return { engine, created, fallback, init };
}

test('la clave de audio es estable, normalizada y distinta por texto', () => {
  assert.equal(speechKey('Hola  mundo.'), speechKey(' Hola mundo. '));
  assert.notEqual(speechKey('Hola mundo.'), speechKey('Hola mundo'));
  assert.match(speechKey('x'), /^[0-9a-f]{8}$/);
});

test('con audio pregenerado se reproduce el archivo y el paso termina con "ended"', async () => {
  const { engine, created, fallback, init } = await audioEngine();
  assert.equal(init.available, true);
  assert.match(init.voice.name, /audio pregenerado/);
  let outcome = null;
  const p = engine.speak('Hola.').then(o => { outcome = o; });
  await flush();
  assert.equal(created.length, 1);
  assert.equal(created[0].src, '/demo-audio/a.mp3');
  assert.equal(outcome, null, 'no avanza mientras suena');
  created[0].onended();
  await p;
  assert.equal(outcome, 'finished');
  assert.equal(fallback.spoken.length, 0, 'no usa la voz de reserva');
});

test('sin audio para ese texto, se narra con la voz femenina de reserva', async () => {
  const { engine, fallback } = await audioEngine();
  const p = engine.speak('Otro texto.');
  await flush();
  assert.deepEqual(fallback.spoken, ['Otro texto.']);
  fallback.finishCurrent();
  assert.equal(await p, 'finished');
});

test('si el audio falla, la misma frase continua con la voz de reserva', async () => {
  const { engine, created, fallback } = await audioEngine();
  const p = engine.speak('Hola.');
  await flush();
  created[0].onerror();
  await flush();
  assert.deepEqual(fallback.spoken, ['Hola.']);
  fallback.finishCurrent();
  assert.equal(await p, 'finished');
});

test('si el navegador bloquea la reproduccion, tambien cae a la voz de reserva', async () => {
  const { engine, fallback } = await audioEngine({ failPlay: true });
  const p = engine.speak('Hola.');
  await flush(); await flush();
  assert.deepEqual(fallback.spoken, ['Hola.']);
  fallback.finishCurrent();
  assert.equal(await p, 'finished');
});

test('sin audio y sin voz femenina: error (la demo pasa a modo manual)', async () => {
  const { engine, init } = await audioEngine({ assets: {}, fallback: new FakeVoiceEngine({ voices: [] }) });
  assert.equal(init.available, false);
  assert.equal(await engine.speak('Hola.'), 'error');
});

test('cancelar detiene el audio y pausar/reanudar lo controla', async () => {
  const { engine, created } = await audioEngine();
  const p = engine.speak('Hola.');
  await flush();
  engine.pause();
  assert.equal(created[0].playing, false);
  assert.equal(engine.isPaused(), true);
  engine.resume();
  assert.equal(created[0].playing, true);
  engine.cancel();
  assert.equal(await p, 'cancelled');
  assert.equal(created[0].playing, false);
});

test('la voz local respira entre frases y la pausa respeta ese silencio', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const spoken = [];
  const synth = {
    speaking: false, paused: false,
    getVoices: () => [{ name: 'Microsoft Sabina - Spanish (Mexico)', lang: 'es-MX', localService: true, default: false }],
    speak(u) { spoken.push(u); }, cancel() {}, pause() {}, resume() {},
  };
  const make = text => ({ text, lang: '', rate: 1, pitch: 1, volume: 1, voice: null, onstart: null, onend: null, onerror: null });
  const engine = new SpeechVoiceEngine(synth, make, { chunkGapMs: 320 });
  await engine.initialize();
  const p = engine.speak('Buenos días, Innovax. Bienvenidos a su Sistema de Gestión de Calidad.');
  spoken[0].onend();
  assert.equal(spoken.length, 1, 'no encadena la siguiente frase sin pausa');
  engine.pause();
  t.mock.timers.tick(1000);
  assert.equal(spoken.length, 1, 'en pausa no continua');
  engine.resume();
  assert.equal(spoken.length, 2);
  spoken[1].onend();
  assert.equal(await p, 'finished');
});

test('la fabrica usa audio premium con reserva a la voz femenina local', () => {
  const factory = read('src/renderer/demo/narration/voiceEngineFactory.ts');
  assert.ok(factory.includes('new AudioAssetVoiceEngine('));
  assert.ok(factory.includes('fallback'));
  const manifest = read('src/renderer/assets/demo-audio/manifest.ts');
  assert.ok(manifest.includes('entries'));
  const webpack = read('webpack.renderer.js');
  assert.ok(/mp3\|ogg\|wav/.test(webpack) && webpack.includes("asset/resource"));
});

// --- Ciclo de revision -------------------------------------------------------------------

const review = () => DEMO_SCENES.find(s => s.id === 'review').steps;

test('la escena de revision muestra las dos ramas y el reenvio', () => {
  const ids = review().map(s => s.id);
  assert.deepEqual(ids, [
    'review-submit', 'review-inbox', 'review-authority', 'review-branches',
    'review-approve', 'review-approve-result', 'review-correct', 'review-correct-result',
    'review-resubmit', 'review-email',
  ]);
  const focus = review().filter(s => s.visual === 'workflow-branch').map(s => s.workflowFocus);
  for (const f of ['overview', 'approve', 'correct', 'resubmit']) assert.ok(focus.includes(f), f);
});

test('las decisiones se muestran con dialogos reales en vista previa, etiquetados como ejemplo', () => {
  for (const step of review().filter(s => /approve|correct|resubmit|email/.test(s.id))) {
    assert.equal(step.dataSource, 'REAL_UI_EXAMPLE', step.id);
    assert.equal(step.action.kind, 'doc.openDecisionPreview', step.id);
  }
  const doc = read('src/renderer/modules/documentacion/Documentacion.tsx');
  assert.ok(doc.includes('EJEMPLO DE FLUJO'));
  assert.ok(/disabled=\{wfApproveDialog\.workflowId === DEMO_PREVIEW_WORKFLOW_ID\}/.test(doc), 'aprobar desactivado en vista previa');
  assert.ok(/wfCorrectionDialog\.workflowId === DEMO_PREVIEW_WORKFLOW_ID\s*\n\s*\|\| !wfCorr/.test(doc), 'enviar correcciones desactivado');
  assert.ok(doc.includes('wfCorrectionDialog.workflowId !== DEMO_PREVIEW_WORKFLOW_ID'), 'sin lista de nombres en vista previa');
});

test('aprobar y solicitar correcciones no hacen nada con el documento de vista previa', () => {
  const wf = read('src/renderer/modules/documentacion/hooks/useWorkflow.ts');
  assert.ok(/if \(wfApproveDialog\.workflowId === DEMO_PREVIEW_WORKFLOW_ID\) return;/.test(wf));
  assert.ok(/if \(wfCorrectionDialog\.workflowId === DEMO_PREVIEW_WORKFLOW_ID\) return;/.test(wf));
  const approveIdx = wf.indexOf('const approveWorkflow');
  assert.ok(wf.indexOf('DEMO_PREVIEW_WORKFLOW_ID) return;', approveIdx) < wf.indexOf("repo.call('WorkflowRepo', 'approve'", approveIdx));
});

test('los estados y avisos de la demo son los que genera el sistema', () => {
  const wf = read('src/renderer/modules/documentacion/hooks/useWorkflow.ts');
  for (const real of ["titulo: 'Nuevo documento para revisión'", "titulo: 'Documento aprobado'", "titulo: 'Correcciones solicitadas'"]) {
    assert.ok(wf.includes(real), real);
  }
  const repo = read('src/database/repositories/workflowRepo.ts');
  assert.ok(repo.includes("status: 'borrador' | 'revision' | 'correcciones' | 'aprobado' | 'obsoleto'"));
  assert.ok(/SET status = 'revision'[\s\S]*status IN \('borrador', 'correcciones'\)/.test(repo), 'reenviar desde correcciones');
  const preview = read('src/renderer/demo/DemoPreview.tsx');
  assert.ok(preview.includes('Documento aprobado') && preview.includes('Correcciones solicitadas') && preview.includes('Nuevo documento para revisión'));
  assert.ok(preview.includes('WF_STATUS_LABEL'), 'los estados salen de la etiqueta real');
});

test('la demo nunca envia correos por si sola', () => {
  const stack = [path.join(ROOT, 'src/renderer/demo')];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const src = fs.readFileSync(full, 'utf8');
        assert.ok(!/CorreoRepo|sendNotificationEmail|sendEmail/.test(src), full);
      }
    }
  }
});

// --- Prueba de correo a Proyectos TI -------------------------------------------------------

test('el destinatario de Proyectos TI solo se resuelve si es inequivoco', () => {
  assert.deepEqual(resolveProyectosTiRecipient(['1', null, 'Proyectos.TI@empresa.example', 'proyectos.ti@empresa.example']),
    { ok: true, address: 'proyectos.ti@empresa.example' });
  const none = resolveProyectosTiRecipient(['ventas@empresa.example', '1']);
  assert.equal(none.ok, false);
  assert.equal(none.reason, RECIPIENT_UNRESOLVED);
  const many = resolveProyectosTiRecipient(['proyectos.ti@empresa.example', 'proyectos-ti@otro.example']);
  assert.equal(many.ok, false);
  assert.equal(many.candidates.length, 2);
});

test('el correo de prueba se identifica como prueba y no lleva datos personales', () => {
  const email = buildDemoTestEmail(new Date('2026-09-23T17:00:00Z'));
  assert.equal(email.subject, '[GD-V2 DEMO] Prueba de notificación de workflow');
  assert.ok(email.message.includes('PRUEBA DE DEMOSTRACIÓN'));
  assert.ok(/no es una aprobación/.test(email.message));
  assert.ok(!/@/.test(email.message));
});

test('el script de prueba solo envia con --send y un unico destinatario resuelto', () => {
  const script = read('scripts/demo-email-test.js');
  assert.ok(script.includes("process.argv.includes('--send')"));
  assert.ok(script.includes('resolveProyectosTiRecipient'));
  assert.ok(script.includes('process.exit(2)'), 'aborta si no hay destinatario inequivoco');
  assert.ok(!/smtp_pass|console\.log\([^)]*pass/i.test(script), 'no imprime credenciales');
});
