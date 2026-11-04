/**
 * Symbio-CAD: tuner HUD, resonance drone, Bio-Control panel, sector reveals,
 * phase-lock indicator and terminal commands (weave / resonate / evolve / lock / regenerate).
 */
import { resonance, setRes, onRes, DEFAULTS, phaseName, flip720 } from './resonance.js';
import { initLoom } from './loom.js';

const $ = (id) => document.getElementById(id);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const DRONE_HZ = [157.68, 78.84]; // 39,420 Hz ÷ 250 and ÷ 500 (audible sub-harmonics)
let T = (k) => k;

/* ---------------- Drone audio ---------------- */
let audio = null;
function startDrone() {
  try {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = new AC();
      const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      const trem = ac.createGain(); trem.gain.value = 1; trem.connect(master);
      const oscs = DRONE_HZ.map((hz, i) => {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = hz;
        const g = ac.createGain(); g.gain.value = i ? 0.6 : 1; o.connect(g); g.connect(trem); o.start();
        return o;
      });
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.5;
      const lfoG = ac.createGain(); lfoG.gain.value = 0.25; lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start();
      audio = { ac, master, oscs };
    }
    if (audio.ac.state === 'suspended') audio.ac.resume();
    const now = audio.ac.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.linearRampToValueAtTime(0.03 + 0.03 * resonance.intensity, now + 0.8);
  } catch (e) { /* audio optional */ }
}
function stopDrone() {
  if (!audio) return;
  try {
    const now = audio.ac.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.linearRampToValueAtTime(0, now + 0.5);
  } catch (e) { /* ignore */ }
}
function syncDrone() {
  if (resonance.isResonating && resonance.sound) startDrone(); else stopDrone();
}

/* ---------------- Actions ---------------- */
export function toggleResonance(force) {
  const on = typeof force === 'boolean' ? force : !resonance.isResonating;
  setRes({ isResonating: on });
  syncDrone();
  return on;
}
export function evolve() {
  const nudge = () => (Math.random() < 0.5 ? -1 : 1);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const which = Math.random() < 0.5 ? 'p' : 'q';
  const patch = { mutation: Math.min(1, resonance.mutation + 0.35), seed: Math.floor(Math.random() * 1000) + 1, locked: false };
  patch[which] = which === 'p' ? clamp(resonance.p + nudge(), 2, 21) : clamp(resonance.q + nudge(), 2, 15);
  setRes(patch);
}
export function regenerate() {
  setRes({ ...DEFAULTS, sound: resonance.sound });
  syncDrone();
}

/* ---------------- UI sync ---------------- */
function syncUi() {
  const r = resonance;
  const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
  const pIn = $('weaveP'), qIn = $('weaveQ'), ph = $('phaseSlider');
  if (pIn && Number(pIn.value) !== r.p) pIn.value = r.p;
  if (qIn && Number(qIn.value) !== r.q) qIn.value = r.q;
  if (ph && Number(ph.value) !== r.phase) ph.value = r.phase;
  set('weavePVal', String(r.p));
  set('weaveQVal', String(r.q));
  set('loomKnot', `T(${r.p}, ${r.q})`);
  const g = gcd(r.p, r.q);
  set('weaveNote', g > 1 ? T('symbio.linked', { n: g }) : T('symbio.single'));
  set('intensityVal', r.intensity.toFixed(2));
  set('intensityBtn', r.intensity > 0.7 ? 'H' : 'L');
  const st = phaseName(r.phase);
  set('phaseState', T(`symbio.phase.${st}`));
  set('loomPhaseLabel', T(`symbio.phase.${st}`));
  set('resonateLabel', T(r.isResonating ? 'symbio.resonating' : 'symbio.resonate'));
  set('soundLabel', T(r.sound ? 'symbio.soundOn' : 'symbio.soundOff'));
  set('bioState', T(r.locked ? 'bio.stateLocked' : (r.isResonating ? 'bio.stateResonating' : 'bio.stateIdle')));
  $('resonateBtn')?.setAttribute('aria-pressed', String(r.isResonating));
  $('soundBtn')?.setAttribute('aria-pressed', String(r.sound));
  $('btnLock')?.setAttribute('aria-pressed', String(r.locked));
  $('intensityBtn')?.setAttribute('aria-label', T('symbio.intensityToggle'));
  document.body.classList.toggle('is-resonating', r.isResonating);
}

/* ---------------- Carrier wave (Bio-Control) ---------------- */
function initWave(canvas) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const amber = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f1b84a';
  const start = performance.now();
  function frame(now) {
    const panel = $('bioctlBody');
    if (panel && !panel.hidden) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.floor(w * dpr)) { canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const time = (now - start) / 1000;
      const amp = (h / 2 - 4) * (0.35 + 0.5 * resonance.intensity) * (resonance.isResonating ? 1 : 0.6);
      const speed = resonance.locked ? 0 : (resonance.isResonating ? 6 : 2.5);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const noise = resonance.locked ? 0 : (Math.random() - 0.5) * 2 * (1 - resonance.intensity * 0.6);
        const y = h / 2 + Math.sin(x * 0.12 + time * speed) * amp * (0.8 + 0.2 * Math.sin(x * 0.013 + time)) + noise;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = amber; ctx.lineWidth = 1.5; ctx.stroke();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function tickTelemetry() {
  const r = resonance;
  const err = r.locked ? '5.50e-16' : `${(5.5 + Math.random() * (r.isResonating ? 0.02 : 0.05)).toFixed(2)}e-16`;
  const coh = r.locked ? 0.9999 : 0.9982 + (Math.random() - 0.5) * (r.isResonating ? 0.0006 : 0.0016);
  const e1 = $('phaseErr'); if (e1) e1.textContent = `${err} rad`;
  const e2 = $('bioCoherence'); if (e2) e2.textContent = coh.toFixed(4);
}

/* ---------------- Init ---------------- */
export function initSymbio({ t } = {}) {
  if (t) T = t;
  initLoom($('loomCanvas'), {
    onLag: (lag) => { const d = $('phaseDot'); if (d) d.classList.toggle('is-lag', lag); },
  });

  $('weaveP')?.addEventListener('input', (e) => setRes({ p: Number(e.target.value) }));
  $('weaveQ')?.addEventListener('input', (e) => setRes({ q: Number(e.target.value) }));
  $('phaseSlider')?.addEventListener('input', (e) => setRes({ phase: Number(e.target.value) }));
  $('intensityBtn')?.addEventListener('click', () => { setRes({ intensity: resonance.intensity === 1 ? 0.5 : 1 }); syncDrone(); });
  $('resonateBtn')?.addEventListener('click', () => toggleResonance());
  $('soundBtn')?.addEventListener('click', () => { setRes({ sound: !resonance.sound }); syncDrone(); });
  $('btnRegen')?.addEventListener('click', regenerate);
  $('btnLock')?.addEventListener('click', () => setRes({ locked: !resonance.locked }));
  $('btnEvolve')?.addEventListener('click', evolve);

  const toggle = $('bioctlToggle'), body = $('bioctlBody');
  toggle?.addEventListener('click', () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    $('bioctl')?.classList.toggle('is-open', open);
  });

  const flip = $('flipFoundry');
  if (flip) { flip.addEventListener('mouseenter', flip720); flip.addEventListener('focus', flip720); }

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { threshold: 0.15 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('is-in'));

  onRes(syncUi);
  syncUi();
  initWave($('waveCanvas'));
  tickTelemetry();
  setInterval(tickTelemetry, 1000);
}

/** Re-apply translated labels once wording has loaded */
export function refreshSymbio() { syncUi(); }

/* ---------------- Terminal commands ---------------- */
export const SYMBIO_HELP = [
  ['weave', 'weave --p 13 --q 7'],
  ['resonate', 'resonate [on|off]'],
  ['evolve', 'evolve'],
  ['lock', 'lock'],
  ['regenerate', 'regenerate'],
];

export function symbioCommand(cmd, flags, rest, line) {
  switch (cmd) {
    case 'weave': {
      const p = Number(flags.p ?? rest[0] ?? resonance.p);
      const q = Number(flags.q ?? rest[1] ?? resonance.q);
      const ok = Number.isInteger(p) && Number.isInteger(q) && p >= 2 && p <= 21 && q >= 2 && q <= 15;
      if (!ok) { line(T('term.weave.bad'), 'l-err'); return true; }
      setRes({ p, q });
      line(T('term.weave.ok', { p, q }), 'l-ok');
      line(gcd(p, q) > 1 ? T('symbio.linked', { n: gcd(p, q) }) : T('symbio.single'));
      return true;
    }
    case 'resonate': {
      const arg = String(rest[0] || '').toLowerCase();
      const on = toggleResonance(arg === 'on' ? true : arg === 'off' ? false : undefined);
      line(T(on ? 'term.resonate.on' : 'term.resonate.off'), on ? 'l-ok' : 'l-out');
      return true;
    }
    case 'evolve':
      evolve();
      line(T('term.evolve.ok', { p: resonance.p, q: resonance.q, m: resonance.mutation.toFixed(2) }), 'l-ok');
      return true;
    case 'lock':
      setRes({ locked: !resonance.locked });
      line(T(resonance.locked ? 'term.lock.on' : 'term.lock.off'), 'l-ok');
      return true;
    case 'regenerate':
      regenerate();
      line(T('term.regen.ok'), 'l-ok');
      return true;
    default:
      return false;
  }
}
