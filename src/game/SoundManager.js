// All sounds generated with Web Audio API — no audio files needed.
// AudioContext must be created after a user gesture; getCtx() handles this lazily.

let ctx = null;

function getCtx() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) { return null; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function osc(freq, type, duration, vol, delay = 0) {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + duration + 0.02);
}

function noiseBurst(duration, vol, filterFreq = 900, delay = 0) {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * duration);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = 'bandpass'; flt.frequency.value = filterFreq; flt.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(flt); flt.connect(g); g.connect(c.destination);
  src.start(t);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function playWhoosh(speedMs) {
  // High-pitched hiss for fast ball, low rumble for slow
  const filterFreq = 2200 - (speedMs / 1450) * 1600;
  noiseBurst(speedMs / 1800, 0.12, filterFreq);
}

export function playHit(runs) {
  // Solid crack — higher pitch for bigger shots
  const freq = 160 + runs * 38;
  osc(freq, 'triangle', 0.12, 0.55);
  noiseBurst(0.08, 0.35, 700 + runs * 80);
}

export function playCrowd(runs) {
  const duration = runs >= 6 ? 1.4 : runs >= 4 ? 0.8 : 0.22;
  const vol      = 0.04 + runs * 0.016;
  noiseBurst(duration, vol, 650 + runs * 25);
}

export function playSix() {
  // Rising chord arpeggio
  [220, 277, 330, 440].forEach((f, i) =>
    osc(f, 'sine', 0.9 - i * 0.05, 0.28, i * 0.06)
  );
  setTimeout(() => playCrowd(6), 120);
}

export function playFour() {
  playHit(4);
  setTimeout(() => playCrowd(4), 110);
}

export function playWicket() {
  // Low dramatic thud
  osc(90, 'sawtooth', 0.45, 0.75);
  osc(60, 'sine',     0.55, 0.45, 0.05);
  // Stump rattle
  noiseBurst(0.18, 0.5, 2200, 0.07);
  setTimeout(() => playCrowd(1), 200);
}

export function playDot() {
  noiseBurst(0.06, 0.07, 320);
}

export function playCountdown(word) {
  const freqs = { READY: 330, SET: 392, 'PLAY!': 523 };
  const f = freqs[word] || 440;
  osc(f, 'sine', 0.25, 0.4);
}
