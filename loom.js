/**
 * Loom manifold: a (p, q) torus-knot braid drawn on a 2D canvas with a solid
 * "bone" strand and a counter-rotating "ghost" wire layer. Reacts to the
 * resonance store (weave, intensity, resonate, phase, lock, mutation, 720° flip).
 */
import { resonance } from './resonance.js';

function cssColor(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const m = v.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return [200, 200, 200];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a, b, k) => a.map((x, i) => Math.round(x + (b[i] - x) * k));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

export function initLoom(canvas, { onLag } = {}) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return null;
  const bone = cssColor('--text', '#dfe6e1');
  const amber = cssColor('--accent', '#f1b84a');
  const teal = cssColor('--primary', '#7cf0c4');
  const voidC = cssColor('--bg', '#07090b');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 1, H = 1, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, canvas.clientWidth); H = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

  // Cached knot points, rebuilt when the weave changes
  let cacheKey = '', pts = [];
  function build() {
    const { p, q, mutation, seed } = resonance;
    const key = `${p}|${q}|${mutation.toFixed(3)}|${seed}`;
    if (key === cacheKey) return;
    cacheKey = key;
    const N = Math.min(1600, 260 + (p + q) * 48);
    pts = new Array(N);
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const wob = mutation * 0.09 * Math.sin(5 * t + seed) * Math.cos(3 * t + seed * 0.7);
      pts[i] = { t, wob };
    }
  }

  function project(x, y, z, ax, ay, scale) {
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    const persp = 3.2 / (3.2 + z2);
    return [W / 2 + x1 * scale * persp, H / 2 + y1 * scale * persp, z2, persp];
  }

  function knotPoint(pt, R, r) {
    const { p, q } = resonance;
    const rad = R + r * Math.cos(q * pt.t) + pt.wob;
    return [rad * Math.cos(p * pt.t), rad * Math.sin(p * pt.t), r * Math.sin(q * pt.t) + pt.wob * 0.6];
  }

  let extra = 0, glow = 0, lagAvg = 16, last = performance.now();
  const start = last;

  function draw(now) {
    const dt = now - last; last = now;
    lagAvg += (Math.min(dt, 200) - lagAvg) * 0.05;
    if (onLag) onLag(lagAvg > 34);
    let step = 0;
    if (resonance.spin > 0) {
      step = Math.max(0.06, resonance.spin * 0.07);
      resonance.spin = Math.max(0, resonance.spin - step);
    }
    if (visible || reduce) {
      build();
      const time = reduce ? 6 : (now - start) / 1000;
      const { intensity, isResonating, phase, locked } = resonance;
      glow += ((isResonating ? 1 : 0) - glow) * 0.06;
      extra += step;
      const jitter = locked ? 0 : Math.sin(time * 39.42) * 0.012 * glow * intensity;
      const pulse = locked ? 1 : 1 + Math.sin(time * 0.5) * 0.05;
      const tight = 1 - 0.18 * glow * intensity;
      const scale = Math.min(W, H) * 0.3 * pulse;
      const solidK = phase / 100;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';

      // Ghost architecture (counter-rotating wire)
      const gAlpha = 0.1 + 0.45 * (1 - solidK);
      ctx.beginPath();
      pts.forEach((pt, i) => {
        const [x, y, z] = knotPoint(pt, 1.0, 0.46);
        const [sx, sy] = project(x * 1.06, y * 1.06, z * 1.06, -time * 0.03, -time * 0.05 - extra * 0.5, scale);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.strokeStyle = rgba(teal, gAlpha);
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Solid bone strand, depth-sorted into buckets
      const ax = time * 0.05, ay = time * 0.08 + jitter + extra;
      const proj = pts.map((pt) => {
        const [x, y, z] = knotPoint(pt, 1.0, 0.42 * tight);
        return project(x, y, z, ax, ay, scale);
      });
      const segs = [];
      for (let i = 0; i < proj.length; i++) {
        const a = proj[i], b = proj[(i + 1) % proj.length];
        segs.push({ a, b, z: (a[2] + b[2]) / 2 });
      }
      segs.sort((s1, s2) => s2.z - s1.z);
      const BUCKETS = 10, per = Math.ceil(segs.length / BUCKETS);
      const baseW = Math.max(1.2, Math.min(W, H) * 0.012) * (1 + 0.25 * glow);
      const sAlpha = 0.2 + 0.8 * solidK;
      for (let bI = 0; bI < BUCKETS; bI++) {
        const slice = segs.slice(bI * per, (bI + 1) * per);
        if (!slice.length) continue;
        const near = bI / (BUCKETS - 1);
        const base = mix(mix(teal, bone, solidK), amber, (0.25 + 0.5 * intensity) * (0.35 + 0.65 * glow) * near);
        ctx.beginPath();
        slice.forEach((s) => { ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); });
        ctx.strokeStyle = rgba(mix(base, voidC, (1 - near) * 0.55), sAlpha);
        ctx.lineWidth = baseW * (0.55 + 0.6 * near);
        if (glow > 0.05 && near > 0.6) { ctx.shadowColor = rgba(amber, 0.8 * glow); ctx.shadowBlur = 14 * glow * intensity; }
        else ctx.shadowBlur = 0;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    if (!reduce || resonance.spin > 0) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  return { redraw: () => requestAnimationFrame(draw) };
}
