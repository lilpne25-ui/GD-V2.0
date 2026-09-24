// Pregenera la narracion de la Demo guiada con Dalia (Edge) grabando la salida local de Windows.
//   node scripts/demo-voice/record-dalia.js record [--only welcome]  -> graba frases crudas (carpeta temporal)
//   node scripts/demo-voice/record-dalia.js build                    -> WAV 24 kHz mono + manifest.ts
// Sin claves, sin servicios adicionales: Edge reproduce la voz aprobada.
//
// Requisitos (solo en la PC que genera, no en la demo):
//  1. npm run build:test   (textos compilados de la demo)
//  2. Compilar la grabadora local (compilador de .NET Framework incluido en Windows):
//       C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe -nologo -platform:x64
//         -out:%TEMP%\gdv2-demo-voice-raw\LoopRec.exe scripts\demo-voice\LoopRec.cs
//  3. Edge abierto con --remote-debugging-port=9224 en scripts/demo-voice/voice-samples.html
//     (las voces "Online (Natural)" de Edge necesitan internet al GENERAR, no al presentar).
//  4. Silencio en la PC: la grabadora captura toda la salida de audio.
//  5. Si cambia un texto de la demo, se vuelve a generar: la clave del audio es speechKey(texto).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const OUT = path.join(REPO, 'src/renderer/assets/demo-audio');
const RAW = path.join(require('os').tmpdir(), 'gdv2-demo-voice-raw');
const { DEMO_SCENES } = require(path.join(REPO, 'dist-test/renderer/demo/steps/scenes.js'));
const { splitIntoChunks } = require(path.join(REPO, 'dist-test/renderer/demo/narration/VoiceEngine.js'));
const { speechKey } = require(path.join(REPO, 'dist-test/renderer/demo/narration/speechKey.js'));
const { speechFor } = require(path.join(REPO, 'dist-test/renderer/demo/narration/VoiceController.js'));
const { welcomeSpeech } = require(path.join(REPO, 'dist-test/renderer/welcome/greeting.js'));

const VOICE = { match: 'Dalia', lang: 'es-MX', rate: 1.05, pitch: 1, volume: 1 };
const SHORT_PAUSE_MS = 350; // "pausa corta" aprobada: 250 ms + latencia media de Edge

function allTexts(only) {
  const list = [8, 14, 21].map(h => ({ id: `welcome-${h}`, text: welcomeSpeech(h) }));
  if (only === 'welcome') return list;
  for (const scene of DEMO_SCENES) {
    for (const step of scene.steps) {
      list.push({ id: step.id, text: speechFor(step, false) });
      if (step.fallbackText) list.push({ id: `${step.id}~limitado`, text: speechFor(step, true) });
    }
  }
  const seen = new Set();
  return list.filter(t => (seen.has(speechKey(t.text)) ? false : (seen.add(speechKey(t.text)), true)));
}

// --- Edge por CDP (solo 127.0.0.1) -----------------------------------------
async function edge() {
  const list = await (await fetch('http://127.0.0.1:9224/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('voice-samples'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const evaluate = expression => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method: 'Runtime.evaluate', params: { expression: `(async()=>{${expression}})()`, awaitPromise: true, returnByValue: true, timeout: 120000 } }));
  }).then(m => { if (m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails)); return m.result.result.value; });
  return { evaluate, close: () => ws.close() };
}

function speakExpr(text) {
  return `
    speechSynthesis.cancel();
    const voice = speechSynthesis.getVoices().find(v => v.name.includes(${JSON.stringify(VOICE.match)}) && v.lang === ${JSON.stringify(VOICE.lang)});
    if (!voice) return { ok: false, reason: 'Dalia no disponible' };
    const t0 = performance.now();
    return await new Promise(res => {
      const u = new SpeechSynthesisUtterance(${JSON.stringify(text)});
      u.voice = voice; u.lang = voice.lang; u.rate = ${VOICE.rate}; u.pitch = ${VOICE.pitch}; u.volume = ${VOICE.volume};
      let startMs = null;
      u.onstart = () => { startMs = Math.round(performance.now() - t0); };
      u.onend = () => res({ ok: true, voice: voice.name, voiceURI: voice.voiceURI, local: voice.localService, startMs, endMs: Math.round(performance.now() - t0) });
      u.onerror = e => res({ ok: false, reason: e.error, startMs });
      speechSynthesis.speak(u);
      setTimeout(() => res({ ok: false, reason: 'timeout' }), 60000);
    });`;
}

// --- Grabadora --------------------------------------------------------------
function recorder() {
  const proc = spawn(path.join(RAW, 'LoopRec.exe'), [], { stdio: ['pipe', 'pipe', 'inherit'] });
  let buf = ''; const waiters = [];
  proc.stdout.on('data', d => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      const w = waiters.shift(); if (w) w(line);
    }
  });
  const cmd = line => new Promise(res => { waiters.push(res); if (line) proc.stdin.write(line + '\n'); });
  return { ready: cmd(null), cmd, quit: () => proc.stdin.write('quit\n') };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function record(only) {
  fs.mkdirSync(RAW, { recursive: true });
  const texts = allTexts(only);
  const e = await edge();
  const rec = recorder();
  console.log(await rec.ready);
  const log = [];
  for (const t of texts) {
    const sentences = splitIntoChunks(t.text);
    const parts = [];
    for (let i = 0; i < sentences.length; i++) {
      const file = path.join(RAW, `${speechKey(t.text)}-${i}.f32`);
      let result = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        await rec.cmd('start');
        await sleep(120);
        result = await e.evaluate(speakExpr(sentences[i]));
        await sleep(350);
        await rec.cmd(`stop ${file}`);
        if (result.ok) break;
        console.log('  reintento', t.id, i, result.reason);
        await sleep(800);
      }
      if (!result.ok) throw new Error(`No se pudo grabar ${t.id}: ${result.reason}`);
      parts.push({ file, startMs: result.startMs, endMs: result.endMs });
      log.push({ id: t.id, i, ...result });
    }
    console.log(`ok ${t.id} (${sentences.length} frases) inicio=${parts.map(p => p.startMs).join('/')}ms`);
    fs.writeFileSync(path.join(RAW, `${speechKey(t.text)}.json`), JSON.stringify({ id: t.id, text: t.text, sentences, parts }, null, 1));
  }
  fs.writeFileSync(path.join(RAW, `log-${only || 'all'}.json`), JSON.stringify(log, null, 1));
  rec.quit(); e.close();
}

// --- Armado -----------------------------------------------------------------
function readF32(file) {
  const b = fs.readFileSync(file);
  return new Float32Array(b.buffer, b.byteOffset, b.length / 4);
}

function trim(s, rate) {
  const th = 0.004;
  let a = 0; while (a < s.length && Math.abs(s[a]) < th) a++;
  let z = s.length - 1; while (z > a && Math.abs(s[z]) < th) z--;
  if (a >= z) return new Float32Array(0);
  return s.subarray(Math.max(0, a - Math.round(rate * 0.03)), Math.min(s.length, z + Math.round(rate * 0.06)));
}

function to24k(s) {
  const out = new Float32Array(Math.floor(s.length / 2));
  for (let i = 0; i < out.length; i++) {
    const j = i * 2;
    out[i] = 0.25 * (s[j - 1] ?? s[j]) + 0.5 * s[j] + 0.25 * s[j + 1];
  }
  return out;
}

function wav(samples, rate, gain) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function build() {
  const RATE = 48000;
  const metas = fs.readdirSync(RAW).filter(f => /^[0-9a-z]+\.json$/.test(f) && !f.startsWith('log'))
    .map(f => JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')));
  const pause = new Float32Array(Math.round(RATE * SHORT_PAUSE_MS / 1000));
  const lead = new Float32Array(Math.round(RATE * 0.06));
  const tail = new Float32Array(Math.round(RATE * 0.15));
  const assembled = metas.map(m => {
    const pieces = [lead];
    m.parts.forEach((p, i) => {
      const t = trim(readF32(p.file), RATE);
      if (t.length < RATE * 0.2) throw new Error(`Frase vacia o muy corta: ${m.id} #${i}`);
      if (i > 0) pieces.push(pause);
      pieces.push(t);
    });
    pieces.push(tail);
    const total = new Float32Array(pieces.reduce((n, p) => n + p.length, 0));
    let o = 0; for (const p of pieces) { total.set(p, o); o += p.length; }
    return { m, samples: to24k(total) };
  });
  let peak = 0;
  for (const a of assembled) for (const v of a.samples) peak = Math.max(peak, Math.abs(v));
  const gain = Math.min(4, 0.89 / peak); // -1 dBFS global, misma ganancia para todos
  const entries = {};
  for (const f of fs.readdirSync(OUT)) if (/^dalia-.*\.wav$/.test(f)) fs.unlinkSync(path.join(OUT, f));
  let bytes = 0, secs = 0;
  for (const a of assembled) {
    const key = speechKey(a.m.text);
    const name = `dalia-${key}.wav`;
    const buf = wav(a.samples, 24000, gain);
    fs.writeFileSync(path.join(OUT, name), buf);
    entries[key] = name;
    bytes += buf.length; secs += a.samples.length / 24000;
  }
  const sorted = Object.fromEntries(Object.entries(entries).sort());
  const ts = `// Manifiesto de la narracion pregenerada de la Demo guiada.
//
// Voz aprobada por Innovax tras la audicion: Dalia Online (Natural), es-MX,
// velocidad 1.05, pausa corta entre frases. Generado grabando localmente la
// salida de Edge (sin claves ni servicios adicionales). Clave = speechKey(texto):
// si un texto cambia, su audio deja de coincidir y esa frase usa la voz de reserva.

import type { DemoAudioManifest } from '../../demo/narration/speechKey';

export const DEMO_AUDIO_MANIFEST: DemoAudioManifest = {
  voice: 'Dalia Online (Natural) · México',
  source: 'Microsoft Edge · es-MX · rate 1.05 · pausa corta',
  generatedAt: '${new Date().toISOString()}',
  entries: {
${Object.entries(sorted).map(([k, v]) => `    '${k}': '${v}',`).join('\n')}
  },
};
`;
  fs.writeFileSync(path.join(OUT, 'manifest.ts'), ts);
  console.log(`archivos=${assembled.length} ganancia=${gain.toFixed(2)} pico=${peak.toFixed(3)} total=${(bytes / 1048576).toFixed(1)} MB duracion=${secs.toFixed(0)} s`);
}

const [cmd, flag, value] = process.argv.slice(2);
(cmd === 'build' ? Promise.resolve(build()) : record(flag === '--only' ? value : null))
  .then(() => process.exit(0))
  .catch(err => { console.error('ERROR', err.message); process.exit(1); });
