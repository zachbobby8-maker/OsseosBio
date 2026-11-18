/**
 * OSSEOS BIO // ROBOTIC OR — self-playing surgery story.
 * Two robot arms repair a femur: scan → incise → weave scaffold → calcify → close.
 * Pure canvas 2D, driven by an internal clock (loops), with step jumps and play/pause.
 */
import { resonance } from './resonance.js';

const CH = [
  { key: 'scan', title: 'Scan the field.', body: 'A sweep of structured light maps the femur through skin. The fracture shows up as a break in the manifold.', read: 'Depth map · 0.2 mm voxels' },
  { key: 'incise', title: 'Open with light.', body: 'Arm A guides an amber laser along a 4 cm line. No blade, no tremor, no guesswork.', read: 'Laser · 39.42 kHz pulse' },
  { key: 'weave', title: 'Weave the bone.', body: 'Arm B spins a Legendrian braid across the gap, strand by strand, using the Weave P/Q you set in Symbio-CAD.', read: 'Braid · T(p, q) scaffold' },
  { key: 'calcify', title: 'Let it calcify.', body: 'The ghost lattice hardens from wireframe into solid, bone-white tissue.', read: 'Mineral density · rising' },
  { key: 'close', title: 'Close. Breathe.', body: 'The arms lift away, the incision seals, and the vitals settle into the stable leaf.', read: 'NESS · dΣ/dt → 0' },
];
const W = 1000, H = 600;
const BONE = { x0: 520, x1: 800, y: 392, gap0: 640, gap1: 690 };
const DURATION = 22000, HOLD = 2600;

export function initSurgery({ t }) {
  const section = document.getElementById('or');
  const canvas = document.getElementById('orCanvas');
  if (!section || !canvas) return;
  const ctx = canvas.getContext('2d');
  const tx = (k, fb, v) => { try { const s = t(k, v); return s && s !== k ? s : fb; } catch (e) { return fb; } };
  const css = getComputedStyle(document.documentElement);
  const C = {
    bg: css.getPropertyValue('--bg').trim() || '#07090b',
    line: css.getPropertyValue('--line').trim() || '#1f2a2e',
    text: css.getPropertyValue('--text').trim() || '#dfe6e1',
    muted: css.getPropertyValue('--muted').trim() || '#84928d',
    primary: css.getPropertyValue('--primary').trim() || '#7cf0c4',
    accent: css.getPropertyValue('--accent').trim() || '#f1b84a',
    surface: css.getPropertyValue('--surface').trim() || '#0f1417',
  };
  const el = {
    step: document.getElementById('orStep'), title: document.getElementById('orTitle'),
    body: document.getElementById('orBody'), read: document.getElementById('orRead'),
    bar: document.getElementById('orBar'), bpm: document.getElementById('orBpm'),
    play: document.getElementById('orPlay'), playLabel: document.getElementById('orPlayLabel'),
    index: document.querySelectorAll('[data-or-ch]'),
  };

  let chap = -1, visible = true, raf = 0, last = 0, hold = 0;
  let playing = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let prog = playing ? 0 : 0.62;
  let scale = 1, ox = 0, oy = 0, dpr = 1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    // Fit the scene's region of interest (x 120..900, y 10..560) into the canvas
    const vw = 780, vh = 550;
    scale = Math.max(0.2, Math.min(r.width / vw, r.height / vh));
    ox = (r.width - vw * scale) / 2 - 120 * scale;
    oy = (r.height - vh * scale) / 2 - 10 * scale;
  }

  function setChapter(i) {
    if (i === chap) return;
    chap = i;
    const c = CH[i];
    el.step.textContent = tx('or.stepOf', `${String(i + 1).padStart(2, '0')} / 05`, { n: String(i + 1).padStart(2, '0') });
    revealLetters(el.title, tx(`or.${c.key}.title`, c.title));
    el.body.textContent = tx(`or.${c.key}.body`, c.body);
    el.read.textContent = tx(`or.${c.key}.read`, c.read);
    el.body.classList.remove('in'); el.read.classList.remove('in');
    void el.body.offsetWidth;
    el.body.classList.add('in'); el.read.classList.add('in');
    el.index.forEach((b, j) => {
      b.classList.toggle('is-active', j === i);
      b.classList.toggle('is-done', j < i);
      if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }

  function revealLetters(node, text) {
    node.textContent = '';
    node.setAttribute('aria-label', text);
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'or-ch';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? '\u00a0' : ch;
      node.appendChild(s);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('in')));
    node.classList.remove('in');
  }

  function setPlaying(on) {
    playing = on;
    el.play.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.playLabel.textContent = on ? tx('or.pause', 'Pause') : (prog >= 1 ? tx('or.replay', 'Replay') : tx('or.play', 'Play procedure'));
    kick();
  }

  el.index.forEach((b) => b.addEventListener('click', () => {
    prog = Number(b.dataset.orCh) / 5 + 0.012;
    hold = 0;
    setPlaying(false);
  }));

  el.play.addEventListener('click', () => {
    if (playing) { setPlaying(false); return; }
    if (prog >= 1) prog = 0;
    hold = 0;
    setPlaying(true);
  });

  // ---------- drawing helpers ----------
  const P = (x, y) => [ox + x * scale, oy + y * scale];
  function rr(x, y, w, h, r) {
    const k = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
  }
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (v) => v * v * (3 - 2 * v);
  const lerp = (a, b, k) => a + (b - a) * k;
  function seg(p) { return [clamp(p * 5 - 0), clamp(p * 5 - 1), clamp(p * 5 - 2), clamp(p * 5 - 3), clamp(p * 5 - 4)]; }

  function mixHex(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, k)));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function alpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function ik(base, tgt, l1, l2, flip) {
    const dx = tgt[0] - base[0], dy = tgt[1] - base[1];
    const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - 1);
    const a = Math.atan2(dy, dx);
    const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * (flip ? -1 : 1);
    const elbow = [base[0] + Math.cos(a - al) * l1, base[1] + Math.sin(a - al) * l1];
    const tip = [base[0] + Math.cos(a) * d, base[1] + Math.sin(a) * d];
    return { elbow, tip };
  }

  function drawArm(base, tgt, flip, color, label) {
    const { elbow, tip } = ik(base, tgt, 190, 170, flip);
    const b = P(...base), e = P(...elbow), tp = P(...tip);
    ctx.lineCap = 'round';
    // mount
    ctx.fillStyle = '#26333a'; ctx.strokeStyle = alpha(color, 0.6); ctx.lineWidth = 2 * scale;
    ctx.fillRect(b[0] - 34 * scale, b[1] - 20 * scale, 68 * scale, 20 * scale);
    ctx.strokeRect(b[0] - 34 * scale, b[1] - 20 * scale, 68 * scale, 20 * scale);
    // links
    [[b, e, 22], [e, tp, 15]].forEach(([s, f, w]) => {
      ctx.strokeStyle = '#3d4d54'; ctx.lineWidth = (w + 4) * scale;
      ctx.beginPath(); ctx.moveTo(...s); ctx.lineTo(...f); ctx.stroke();
      ctx.strokeStyle = '#a9b6b1'; ctx.lineWidth = w * scale;
      ctx.beginPath(); ctx.moveTo(...s); ctx.lineTo(...f); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 3 * scale;
      ctx.beginPath(); ctx.moveTo(...s); ctx.lineTo(...f); ctx.stroke();
    });
    // joints
    [b, e].forEach((j) => {
      ctx.fillStyle = C.bg; ctx.strokeStyle = color; ctx.lineWidth = 2 * scale;
      ctx.beginPath(); ctx.arc(j[0], j[1], 13 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(j[0], j[1], 4 * scale, 0, Math.PI * 2); ctx.fill();
    });
    // tool head
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(tp[0], tp[1], 6 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${Math.max(10, 13 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = C.text; ctx.fillText(label, b[0] + 42 * scale, b[1] - 4 * scale);
    return tip;
  }

  function drawBone(calc, gapFill, xray) {
    const k = clamp(xray);
    if (k <= 0) return;
    const { x0, x1, y, gap0, gap1 } = BONE;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * k;
    const piece = (a, b) => {
      const [ax, ay] = P(a, y), [bx] = P(b, y);
      ctx.fillStyle = alpha('#e8efe9', 0.85);
      ctx.beginPath();
      rr(ax, ay - 11 * scale, bx - ax, 22 * scale, 10 * scale);
      ctx.fill();
    };
    piece(x0, gap0); piece(gap1, x1);
    // condyles
    [[x0, 1], [x1, -1]].forEach(([x]) => {
      const [cx, cy] = P(x, y);
      ctx.fillStyle = alpha('#e8efe9', 0.85);
      ctx.beginPath(); ctx.arc(cx, cy - 8 * scale, 16 * scale, 0, Math.PI * 2); ctx.arc(cx, cy + 8 * scale, 16 * scale, 0, Math.PI * 2); ctx.fill();
    });
    // fracture edges
    if (gapFill < 1) {
      ctx.strokeStyle = alpha(C.accent, 0.9 * (1 - calc)); ctx.lineWidth = 2 * scale;
      [gap0, gap1].forEach((gx, i) => {
        const [fx, fy] = P(gx, y);
        ctx.beginPath(); ctx.moveTo(fx, fy - 11 * scale);
        ctx.lineTo(fx + (i ? -5 : 5) * scale, fy - 3 * scale); ctx.lineTo(fx, fy + 4 * scale);
        ctx.lineTo(fx + (i ? -4 : 4) * scale, fy + 11 * scale); ctx.stroke();
      });
    }
    ctx.restore();
  }

  function drawBraid(time, grow, calc) {
    if (grow <= 0) return;
    const { y, gap0, gap1 } = BONE;
    const strands = clamp(Math.round((resonance.q || 7) / 2), 3, 7);
    const turns = clamp(resonance.p || 13, 2, 21) / 3;
    const x1 = lerp(gap0 - 6, gap1 + 6, grow);
    for (let s = 0; s < strands; s++) {
      const ph = (s / strands) * Math.PI * 2;
      ctx.strokeStyle = mixHex(C.primary, '#eef3ee', calc);
      ctx.globalAlpha = 0.5 + 0.5 * calc;
      ctx.lineWidth = (1.4 + calc * 2.4) * scale;
      ctx.beginPath();
      for (let x = gap0 - 6; x <= x1; x += 1.5) {
        const u = (x - gap0) / (gap1 - gap0);
        const yy = y + Math.sin(u * turns * Math.PI * 2 + ph + time * (resonance.isResonating ? 3 : 1.2)) * 10 * (1 - calc * 0.3);
        const [px, py] = P(x, yy);
        if (x === gap0 - 6) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (calc > 0) {
      const [ax, ay] = P(gap0 - 4, y), [bx] = P(gap1 + 4, y);
      ctx.fillStyle = alpha('#e8efe9', 0.85 * ease(calc));
      ctx.beginPath(); rr(ax, ay - 11 * scale, bx - ax, 22 * scale, 6 * scale); ctx.fill();
    }
  }

  function drawPatient(scanX, xray, incise, close) {
    const [tl] = P(170, 0);
    // table
    const [tx0, ty0] = P(140, 430), [tx1] = P(860, 430);
    ctx.fillStyle = '#1c272c'; ctx.strokeStyle = alpha(C.primary, 0.45); ctx.lineWidth = 2 * scale;
    ctx.beginPath(); rr(tx0, ty0, tx1 - tx0, 18 * scale, 8 * scale); ctx.fill(); ctx.stroke();
    [[300], [700]].forEach(([x]) => { const [lx, ly] = P(x, 448); ctx.fillStyle = '#2b393f'; ctx.fillRect(lx - 6 * scale, ly, 12 * scale, 90 * scale); });
    const [bx, by] = P(420, 560), [bx2] = P(580, 560);
    ctx.fillRect(bx, by, bx2 - bx, 10 * scale);
    // head + body silhouette
    ctx.fillStyle = '#3a4a50'; ctx.strokeStyle = alpha(C.text, 0.35); ctx.lineWidth = 1.5 * scale;
    const [hx, hy] = P(215, 392);
    ctx.beginPath(); ctx.arc(hx, hy, 30 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const [sx, sy] = P(250, 365), [sx2] = P(830, 365);
    ctx.beginPath(); rr(sx, sy, sx2 - sx, 65 * scale, 30 * scale); ctx.fill(); ctx.stroke();
    // drape over torso
    const [dx, dy] = P(255, 352), [dx2] = P(545, 352);
    ctx.fillStyle = alpha(C.primary, 0.28); ctx.strokeStyle = alpha(C.primary, 0.7);
    ctx.beginPath(); rr(dx, dy, dx2 - dx, 82 * scale, 26 * scale); ctx.fill(); ctx.stroke();
    // x-ray window over thigh
    if (xray > 0) {
      ctx.save();
      const [wx, wy] = P(510, 362), [wx2] = P(Math.min(scanX, 820), 362);
      ctx.beginPath(); ctx.rect(wx, wy, Math.max(0, wx2 - wx), 72 * scale); ctx.clip();
      ctx.fillStyle = alpha(C.primary, 0.08 * xray + 0.04); ctx.fillRect(wx, wy, 340 * scale, 72 * scale);
      ctx.restore();
    }
    // incision line
    if (incise > 0) {
      const a = 625, b = lerp(625, 705, incise);
      const [ix, iy] = P(a, 366), [ix2] = P(b, 366);
      ctx.strokeStyle = close > 0 ? alpha(C.accent, 0.8 * (1 - close)) : C.accent;
      ctx.lineWidth = 2.5 * scale; ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix2, iy); ctx.stroke();
      if (close > 0) {
        ctx.strokeStyle = alpha(C.primary, close); ctx.lineWidth = 1.5 * scale;
        for (let x = 632; x <= 700; x += 12) {
          const [cx, cy] = P(x, 366); ctx.beginPath(); ctx.moveTo(cx, cy - 5 * scale); ctx.lineTo(cx + 4 * scale, cy + 5 * scale); ctx.stroke();
        }
      }
    }
    return tl;
  }

  function drawScanner(scanX, s0) {
    if (s0 <= 0 || s0 >= 1) return;
    const [x, y0] = P(scanX, 300), [, y1] = P(scanX, 460);
    const g = ctx.createLinearGradient(x - 40 * scale, 0, x, 0);
    g.addColorStop(0, alpha(C.primary, 0)); g.addColorStop(1, alpha(C.primary, 0.25));
    ctx.fillStyle = g; ctx.fillRect(x - 40 * scale, y0, 40 * scale, y1 - y0);
    ctx.strokeStyle = C.primary; ctx.lineWidth = 2 * scale;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  }

  function drawLight(time) {
    // floor grid for depth
    ctx.strokeStyle = alpha(C.primary, 0.07); ctx.lineWidth = 1;
    for (let gy = 460; gy <= 600; gy += 28) {
      const [g0x, g0y] = P(60, gy), [g1x] = P(940, gy);
      ctx.beginPath(); ctx.moveTo(g0x, g0y); ctx.lineTo(g1x, g0y); ctx.stroke();
    }
    const [lx, ly] = P(500, 20);
    const g = ctx.createRadialGradient(lx, ly + 300 * scale, 10, lx, ly + 300 * scale, 420 * scale);
    g.addColorStop(0, alpha(C.primary, 0.16)); g.addColorStop(1, alpha(C.primary, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = C.surface; ctx.strokeStyle = C.line; ctx.lineWidth = 2 * scale;
    ctx.beginPath(); ctx.ellipse(lx, ly + 20 * scale, 90 * scale, 16 * scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = alpha(C.primary, 0.35 + Math.sin(time * 2) * 0.05);
    ctx.beginPath(); ctx.ellipse(lx, ly + 26 * scale, 70 * scale, 7 * scale, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawVitals(time, stable) {
    const [x0, y0] = P(140, 500), [x1] = P(860, 500);
    const bpm = Math.round(lerp(88, 64, stable));
    const period = 60 / bpm;
    ctx.strokeStyle = alpha(stable > 0.5 ? C.primary : C.accent, 0.8); ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    const n = 260;
    for (let i = 0; i <= n; i++) {
      const u = i / n; const x = lerp(x0, x1, u);
      const tt = (time - (1 - u) * 3) % period / period;
      let v = Math.sin(tt * Math.PI * 2) * 0.04;
      if (tt > 0.1 && tt < 0.14) v = -0.3; else if (tt > 0.14 && tt < 0.18) v = 1; else if (tt > 0.18 && tt < 0.22) v = -0.4;
      else if (tt > 0.4 && tt < 0.55) v = Math.sin((tt - 0.4) / 0.15 * Math.PI) * 0.18;
      const y = y0 + 24 * scale - v * 22 * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (el.bpm && el.bpm.textContent !== String(bpm)) el.bpm.textContent = String(bpm);
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    const time = now / 1000;
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    if (playing) {
      if (prog < 1) prog = Math.min(1, prog + dt / DURATION);
      else { hold += dt; if (hold > HOLD) { hold = 0; prog = 0; } }
    }
    const box = canvas.getBoundingClientRect();
    if (Math.round(box.width * dpr) !== canvas.width || Math.round(box.height * dpr) !== canvas.height) resize();
    const [s0, s1, s2, s3, s4] = seg(prog);
    setChapter(Math.min(4, Math.floor(prog * 5 + 0.0001)));
    el.bar.style.transform = `scaleX(${prog})`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    drawLight(time);

    const scanX = lerp(180, 840, ease(s0));
    const xray = s0 > 0 ? 1 - s4 * 0.6 : 0;
    drawPatient(scanX, s0, ease(s1), ease(s4));
    drawBone(ease(s3), s3, Math.max(0.4, Math.min(1, s0 * 1.6)) * (1 - s4 * 0.5));
    drawBraid(time, ease(s2), ease(s3));
    drawScanner(scanX, s0);

    // Arm A — laser
    const restA = [380, 230];
    const lx = lerp(625, 705, ease(s1));
    const jit = resonance.isResonating ? Math.sin(time * 39.42) * 1.2 : 0;
    let tA = restA;
    if (s1 > 0 && s1 < 1) tA = [lx, 318 + jit];
    else if (s1 >= 1) tA = [lerp(705, restA[0], ease(clamp(s2 * 3))), lerp(318, restA[1], ease(clamp(s2 * 3)))];
    else tA = [lerp(restA[0], 625, ease(clamp(s0 * 2 - 1))), lerp(restA[1], 318, ease(clamp(s0 * 2 - 1)))];
    if (s4 > 0) tA = [lerp(tA[0], restA[0], ease(s4)), lerp(tA[1], 170, ease(s4))];
    const tipA = drawArm([420, 40], tA, false, C.accent, 'ARM_A · LASER');
    if (s1 > 0 && s1 < 1) {
      const [ax, ay] = P(...tipA), [bx, by] = P(lx, 366);
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5 * scale; ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = alpha(C.accent, 0.5); ctx.beginPath(); ctx.arc(bx, by, (5 + Math.random() * 4) * scale, 0, Math.PI * 2); ctx.fill();
    }

    // Arm B — weaver
    const restB = [760, 220];
    const wx = lerp(BONE.gap0, BONE.gap1, ease(s2));
    let tB = restB;
    if (s2 > 0 && s2 < 1) tB = [wx, 340 + Math.sin(time * 6) * 6];
    else if (s2 >= 1 && s3 < 1) tB = [lerp(BONE.gap1, 665, ease(s3)), lerp(340, 300, ease(s3))];
    else if (s3 >= 1) tB = [665, 300];
    else tB = [lerp(restB[0], BONE.gap0, ease(clamp(s1 * 2 - 1))), lerp(restB[1], 340, ease(clamp(s1 * 2 - 1)))];
    if (s4 > 0) tB = [lerp(tB[0], restB[0], ease(s4)), lerp(tB[1], 160, ease(s4))];
    const tipB = drawArm([820, 40], tB, true, C.primary, 'ARM_B · WEAVER');
    if (s2 > 0 && s2 < 1) {
      const [ax, ay] = P(...tipB), [bx, by] = P(wx, BONE.y);
      ctx.strokeStyle = alpha(C.primary, 0.6); ctx.lineWidth = 1 * scale; ctx.setLineDash([3 * scale, 4 * scale]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    }
    if (s3 > 0 && s3 < 1) {
      const [ax, ay] = P(...tipB), [bx, by] = P(665, BONE.y);
      const g = ctx.createRadialGradient(bx, by, 2, bx, by, 60 * scale);
      g.addColorStop(0, alpha('#eef3ee', 0.35)); g.addColorStop(1, alpha('#eef3ee', 0));
      ctx.fillStyle = g; ctx.fillRect(bx - 60 * scale, by - 60 * scale, 120 * scale, 120 * scale);
      ctx.strokeStyle = alpha('#eef3ee', 0.4); ctx.lineWidth = 1 * scale;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }

    drawVitals(time, ease(s4));
    raf = requestAnimationFrame(frame);
  }

  function kick() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) { resize(); kick(); }
    }, { rootMargin: '200px' });
    io.observe(section);
  }
  window.addEventListener('resize', () => { resize(); kick(); });
  resize(); setChapter(0); setPlaying(playing);
}
