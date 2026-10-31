(() => {
  const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;
  const $ = (id) => document.getElementById(id);
  const MESH_ENDPOINT = 'https://braidmesh.com/';
  const HISTORY_KEY = 'termHistory';
  const CHANNELS = {
    medium: { label: 'Medium @zachbobby8', url: 'https://medium.com/@zachbobby8' },
    superme: { label: 'Superme bzachs', url: 'https://www.superme.ai/bzachs' },
    x: { label: 'X @topologyflux', url: 'https://x.com/topologyflux' },
  };

  // Shared field state (driven by the simulator, read by the shader)
  const field = { morph: 0.45, bass: 0.6, mid: 0.4, target: { morph: 0.45, bass: 0.6, mid: 0.4 } };

  /* ---------------- Braid Mesh dispatcher ---------------- */
  function meshUrl(module = 'biophysics') {
    const params = new URLSearchParams({
      origin: 'osseosbio',
      node: 'osseos_bio',
      module,
      freq: '39420',
      lattice: 'locked',
    });
    return `${MESH_ENDPOINT}?${params.toString()}`;
  }

  let toastTimer;
  function showToast(text, url) {
    $('toastText').textContent = text;
    const link = $('toastLink');
    link.hidden = !url;
    if (url) link.href = url;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 7000);
  }

  function launchMeshEngine(module = 'biophysics') {
    const url = meshUrl(module);
    console.log(`[OSSEOS BIO] Hand-off to Braid Mesh: ${url}`);
    let win = null;
    try { win = window.open(url, '_blank'); } catch (e) { win = null; }
    if (win) {
      try { win.opener = null; } catch (e) { /* ignore */ }
      showToast(t('toast.dispatched'), url);
      return { ok: true, url };
    }
    showToast(t('toast.blocked'), url);
    return { ok: false, url };
  }

  document.querySelectorAll('[data-launch]').forEach((btn) => {
    btn.addEventListener('click', () => launchMeshEngine(btn.dataset.launch));
  });
  const dispatchEl = $('dispatchUrl');
  if (dispatchEl) dispatchEl.textContent = meshUrl('topological_sdf');

  /* ---------------- Vector search (S^127) ---------------- */
  const DIM = 128;
  const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'under', 'is', 'are', 'into', 'from', 'as', 'its', 'cost', 'than']);
  function tokens(text) {
    return String(text).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/[\s-]+/).filter((w) => w.length > 1 && !STOP.has(w))
      .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function embed(text) {
    const v = new Float32Array(DIM);
    const toks = tokens(text);
    toks.forEach((tok) => {
      const h = hash(tok);
      v[h % DIM] += (h & 1) ? 1 : -1;
      if (tok.length > 5) { const h2 = hash(tok.slice(0, 5)); v[h2 % DIM] += 0.5 * ((h2 & 1) ? 1 : -1); }
    });
    let n = 0; for (let i = 0; i < DIM; i++) n += v[i] * v[i];
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < DIM; i++) v[i] /= n;
    return v;
  }
  const DOC_IDS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
  let corpus = null;
  function getCorpus() {
    if (corpus) return corpus;
    corpus = DOC_IDS.map((id, i) => {
      const title = t(`docs.${id}.title`);
      const body = t(`docs.${id}.body`);
      return { id: `DOC_00${i + 1}`, title, body, vec: embed(`${title} ${title} ${body}`) };
    });
    return corpus;
  }
  function vectorSearch(query) {
    const q = embed(query);
    return getCorpus().map((d) => {
      let dot = 0; for (let i = 0; i < DIM; i++) dot += q[i] * d.vec[i];
      const sim = Math.max(-1, Math.min(1, dot));
      return { ...d, sim, dg: Math.acos(sim) };
    }).filter((r) => r.sim > 0.12).sort((a, b) => b.sim - a.sim).slice(0, 3);
  }

  /* ---------------- 48h metabolic ODE ---------------- */
  function simulate(f0, f1, workouts) {
    let E = 0.7, m = 0.6, a = 0.1, psi = 140;
    const dt = 0.05, trace = [], Es = [], psis = [];
    let maxA = 0;
    for (let step = 0; step <= 48 / dt; step++) {
      const h = step * dt;
      const N = h >= f0 && h <= f1 ? 0 : 1;
      const W = workouts.some((w) => h >= w && h < w + 1) ? 1 : 0;
      const dm = 1.4 * N * (1 - m) - 0.35 * m - 0.9 * a * m;
      const da = 0.9 * (1 - N) * ((a * a) / (0.09 + a * a) + 0.08) * (1 - a) - 0.8 * m * a * N - 0.05 * a + 0.15 * W * (1 - a);
      const dE = 0.5 * (0.6 + 0.4 * N) * (1 - E) - 0.5 * (0.15 + 1.6 * W) * E + 0.2 * a * (1 - E);
      const target = 135 + 18 * E + 6 * m - 10 * W;
      m = Math.max(0, Math.min(1, m + dm * dt));
      a = Math.max(0, Math.min(1, a + da * dt));
      E = Math.max(0, Math.min(1, E + dE * dt));
      psi += 2 * (target - psi) * dt;
      maxA = Math.max(maxA, a);
      Es.push(E); psis.push(psi);
      if (step % 20 === 0 && trace.length < 48) trace.push(a);
    }
    const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;
    const meanE = mean(Es);
    const meanPsi = mean(psis);
    const stdPsi = Math.sqrt(mean(psis.map((p) => (p - meanPsi) ** 2)));
    const psiMax = Math.max(...psis), psiMin = Math.min(...psis);
    const stability = Math.max(0, Math.min(100, 100 * (0.55 * meanE + 0.45 * (1 - stdPsi / 15)) + 10 * maxA));
    return {
      trace, stability, psiMax,
      bass: meanE,
      mid: Math.min(1, (psiMax - psiMin) / 25),
      morph: maxA,
    };
  }
  const BLOCKS = '▁▂▃▄▅▆▇█';
  const spark = (arr) => arr.map((v) => BLOCKS[Math.min(7, Math.floor(v * 8))]).join('');

  /* ---------------- Terminal ---------------- */
  const out = $('termOut');
  const form = $('termForm');
  const input = $('termInput');
  let history = [];
  let histIdx = -1;

  function line(text, cls = 'l-out') {
    const p = document.createElement('p');
    p.className = `term-line ${cls}`;
    p.textContent = text;
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
    return p;
  }
  function echo(cmd) {
    const p = document.createElement('p');
    p.className = 'term-line l-cmd';
    const pr = document.createElement('span');
    pr.className = 'p';
    pr.textContent = 'osseos> ';
    p.append(pr, document.createTextNode(cmd));
    out.appendChild(p);
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function parseArgs(str) {
    const parts = str.match(/"[^"]*"|'[^']*'|\S+/g) || [];
    const args = parts.map((p) => p.replace(/^["']|["']$/g, ''));
    const cmd = (args.shift() || '').toLowerCase();
    const flags = {}; const rest = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const k = args[i].slice(2).toLowerCase();
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith('--')) { flags[k] = next; i++; } else flags[k] = true;
      } else rest.push(args[i]);
    }
    return { cmd, flags, rest };
  }

  const fmt = (n, d = 2) => Number(n).toFixed(d);

  function linkLine(label, url) {
    const p = line(`  ${label}  `, 'l-val');
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = url;
    p.appendChild(a);
    return p;
  }

  async function run(raw) {
    const text = raw.trim();
    if (!text) return;
    echo(text);
    if (history[history.length - 1] !== text) {
      history.push(text);
      history = history.slice(-30);
      saveHistory();
    }
    histIdx = -1;
    const { cmd, flags, rest } = parseArgs(text);

    switch (cmd) {
      case 'help':
        line(t('term.help.title'), 'l-head');
        ['status', 'search', 'simulate', 'connect', 'links', 'open', 'clear'].forEach((k) => line(t(`term.help.${k}`)));
        line(t('term.help.history'));
        break;
      case 'links':
        line(t('term.links.title'), 'l-head');
        Object.values(CHANNELS).forEach((c) => linkLine(c.label, c.url));
        break;
      case 'open': {
        const key = String(flags.channel || rest[0] || '').toLowerCase().replace(/^@/, '');
        const alias = { twitter: 'x', topologyflux: 'x', zachbobby8: 'medium', bzachs: 'superme' };
        const ch = CHANNELS[key] || CHANNELS[alias[key]];
        if (!ch) { line(t('term.open.usage'), 'l-err'); break; }
        let win = null;
        try { win = window.open(ch.url, '_blank'); } catch (e) { win = null; }
        if (win) {
          try { win.opener = null; } catch (e) { /* ignore */ }
          line(t('term.open.ok', { name: ch.label }), 'l-ok');
        } else {
          line(t('term.open.blocked'), 'l-err');
          linkLine(ch.label, ch.url);
        }
        break;
      }
      case 'clear':
        out.textContent = '';
        break;
      case 'status': {
        const psi = 146 + field.mid * 6 + (Math.random() - 0.5) * 1.2;
        const atp = 6 + field.bass * 3 + (Math.random() - 0.5) * 0.2;
        const stab = 80 + field.bass * 10 + (Math.random() - 0.5);
        line(t('term.status.title'), 'l-head');
        line(t('term.status.time', { value: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }));
        line(t('term.status.sync'));
        line(t('term.status.psi', { value: fmt(psi, 1) }));
        line(t('term.status.atp', { value: fmt(atp, 2) }));
        line(field.morph >= 0.4 ? t('term.status.stateAutophagy') : t('term.status.stateGrowth'), 'l-ok');
        line(t('term.status.stability', { value: fmt(stab, 2) }));
        break;
      }
      case 'search': {
        const q = typeof flags.manifold === 'string' ? flags.manifold : rest.join(' ');
        if (!q.trim()) { line(t('term.search.usage'), 'l-err'); break; }
        const results = vectorSearch(q);
        if (!results.length) { line(t('term.search.none'), 'l-err'); break; }
        line(t('term.search.title', { count: results.length }), 'l-head');
        results.forEach((r) => {
          line(t('term.search.match', { id: r.id, title: r.title, sim: fmt(r.sim, 4), dg: fmt(r.dg, 3) }), 'l-val');
          line(`  ${r.body}`);
        });
        break;
      }
      case 'simulate': {
        const fast = String(flags.fasting && flags.fasting !== true ? flags.fasting : '16-36').split('-').map(Number);
        const wk = String(flags.workout && flags.workout !== true ? flags.workout : '10,34').split(',').map(Number);
        const [f0, f1] = fast;
        const valid = fast.length === 2 && fast.every((n) => Number.isFinite(n) && n >= 0 && n <= 48) && f0 < f1
          && wk.every((n) => Number.isFinite(n) && n >= 0 && n <= 48);
        if (!valid) { line(t('term.sim.bad'), 'l-err'); break; }
        const res = simulate(f0, f1, wk);
        line(t('term.sim.run'), 'l-ok');
        line(t('term.sim.params', { f0, f1, w: wk.join(', ') }));
        line(t('term.sim.trace'), 'l-head');
        line(spark(res.trace), 'l-ok');
        line(t('term.sim.stability', { value: fmt(res.stability) }), 'l-val');
        line(t('term.sim.psiPeak', { value: fmt(res.psiMax, 1) }), 'l-val');
        if (flags['export-glsl']) {
          line(t('term.sim.export'), 'l-head');
          line(t('term.sim.bass', { value: fmt(res.bass, 3) }));
          line(t('term.sim.mid', { value: fmt(res.mid, 3) }));
          line(t('term.sim.morph', { value: fmt(res.morph, 3) }));
        }
        field.target = { morph: res.morph, bass: res.bass, mid: res.mid };
        line(t('term.sim.applied'), 'l-ok');
        break;
      }
      case 'connect': {
        const engine = String(flags.engine || rest[0] || '').toLowerCase();
        if (engine !== 'braidmesh') { line(t('term.connect.usage'), 'l-err'); break; }
        const result = launchMeshEngine('topological_sdf');
        line(t('term.connect.d1'), 'l-head');
        await sleep(350);
        line(t('term.connect.d2'));
        await sleep(350);
        if (result.ok) {
          line(t('term.connect.d3'), 'l-ok');
        } else {
          const p = line(`${t('term.connect.blocked')} `, 'l-err');
          const a = document.createElement('a');
          a.href = result.url; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = result.url;
          p.appendChild(a);
        }
        break;
      }
      default:
        line(t('term.unknown', { cmd }), 'l-err');
    }
    out.scrollTop = out.scrollHeight;
  }

  async function saveHistory() {
    try { await window.miniappsAI?.storage?.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { /* non-critical */ }
  }
  async function loadHistory() {
    try {
      const raw = await window.miniappsAI?.storage?.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) history = parsed.filter((x) => typeof x === 'string').slice(-30);
    } catch (e) { history = []; }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    run(v);
  });
  input.addEventListener('keydown', (e) => {
    if (!history.length) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      histIdx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      input.value = history[histIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx < 0) return;
      histIdx += 1;
      if (histIdx >= history.length) { histIdx = -1; input.value = ''; } else input.value = history[histIdx];
    }
  });
  $('termClear').addEventListener('click', () => { out.textContent = ''; input.focus(); });
  document.querySelectorAll('[data-cmd]').forEach((chip) => {
    chip.addEventListener('click', () => run(chip.dataset.cmd));
  });

  function boot() {
    line(t('term.welcome1'), 'l-head');
    line(t('term.welcome2'), 'l-ok');
    line(t('term.welcome3'));
    loadHistory();
    initShader();
  }

  /* ---------------- Gyroid SDF shader ---------------- */
  function initShader() {
    const canvas = $('shader');
    const gl = canvas?.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;
uniform vec2 r;uniform float time;uniform float morph;uniform float bass;uniform float mid;uniform float off;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float map(vec3 p){
  p.xz*=rot(time*.15);p.xy*=rot(time*.07);
  float sc=2.6+morph*2.2;
  vec3 q=p*sc+vec3(0.,0.,time*.3);
  float g=abs(dot(sin(q),cos(q.yzx)+mid*.25*sin(q.zxy*2.+time)))/sc-(.035+.03*bass);
  float s=length(p)-1.55;
  return max(s,g*.75);
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;uv.x-=off;
  vec3 ro=vec3(0.,0.,3.6),rd=normalize(vec3(uv,-1.5));
  float d=0.,hit=0.;vec3 p;
  for(int i=0;i<72;i++){p=ro+rd*d;float h=map(p);if(h<.002){hit=1.;break;}d+=h;if(d>7.)break;}
  vec3 col=vec3(.027,.035,.043);
  if(hit>.5){
    vec2 e=vec2(.002,0.);
    vec3 n=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
    float dif=clamp(dot(n,normalize(vec3(.6,.8,.5))),0.,1.);
    float rim=pow(1.-abs(dot(n,-rd)),3.);
    vec3 teal=vec3(.486,.941,.769),amber=vec3(.945,.722,.29);
    vec3 base=mix(teal,amber,smoothstep(.6,1.5,length(p))*(.4+.6*morph));
    col=base*(.15+.75*dif)+rim*teal*.8;
    col=mix(col,vec3(.027,.035,.043),smoothstep(2.5,5.,d));
  }
  gl_FragColor=vec4(col,1.);
}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ['r', 'time', 'morph', 'bass', 'mid', 'off'].forEach((k) => { u[k] = gl.getUniformLocation(prog, k); });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

    function resize() {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.55;
      const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    const start = performance.now();
    function frame(now) {
      if (visible || reduce) {
        resize();
        ['morph', 'bass', 'mid'].forEach((k) => { field[k] += (field.target[k] - field[k]) * 0.03; });
        const aspect = canvas.width / canvas.height;
        gl.uniform2f(u.r, canvas.width, canvas.height);
        gl.uniform1f(u.time, reduce ? 4 : (now - start) / 1000);
        gl.uniform1f(u.morph, field.morph);
        gl.uniform1f(u.bass, field.bass);
        gl.uniform1f(u.mid, field.mid);
        gl.uniform1f(u.off, aspect > 1.2 ? Math.min(0.45, (aspect - 1) * 0.35) : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    if (reduce) window.addEventListener('resize', () => requestAnimationFrame(frame));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
