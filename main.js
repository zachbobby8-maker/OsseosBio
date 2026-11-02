(() => {
  // Built-in wording backup: if the translation service hasn't loaded (or never does),
  // read the English wording file directly so raw keys never reach the screen.
  let FALLBACK = null;
  const lookup = (key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), FALLBACK);
  const fill = (s, values) => (values ? s.replace(/\{(\w+)\}/g, (m, k) => (values[k] !== undefined ? String(values[k]) : m)) : s);
  const t = (key, values) => {
    let s;
    try { s = window.miniappI18n?.t(key, values); } catch (e) { s = undefined; }
    if (typeof s === 'string' && s && s !== key) return s;
    const f = FALLBACK ? lookup(key) : undefined;
    return typeof f === 'string' ? fill(f, values) : key;
  };
  async function loadFallback() {
    try {
      const res = await fetch('locales/en.json', { cache: 'no-cache' });
      if (res.ok) FALLBACK = await res.json();
    } catch (e) { FALLBACK = null; }
  }
  const $ = (id) => document.getElementById(id);
  const MESH_TARGET = 'https://braidmesh.com/terminal';
  const HISTORY_KEY = 'termHistory';
  const CHANNELS = {
    medium: { label: 'Medium @zachbobby8', url: 'https://medium.com/@zachbobby8' },
    superme: { label: 'Superme bzachs', url: 'https://www.superme.ai/bzachs' },
    x: { label: 'X @topologyflux', url: 'https://x.com/topologyflux' },
  };

  // Shared field state (driven by the simulator, read by the shader)
  const field = { morph: 0.45, bass: 0.6, mid: 0.4, target: { morph: 0.45, bass: 0.6, mid: 0.4 } };

  /* ---------------- Osseos Gateway v1.10 (NESS coupling hand-off) ---------------- */
  const NESS_PARAMS = {
    node: 'osseos_bio',
    frequency: '39420',
    manifold: 'Sd-1',
    kappa_c_star: '1.0',
    a0: '2.0',
    b: '1.0',
    alpha: '2.0',
    beta: '10.0',
    mu: '2.0',
    lattice: 'locked',
  };

  // Live telemetry derived from the current (simulated) field state
  function liveTelemetry() {
    const { morph, bass, mid } = field.target;
    return {
      phi_p: +(0.001 + (1 - bass) * 0.04).toFixed(4),
      height_fluct: +(0.3 + mid * 0.6).toFixed(3),
      geodesic_var: +(0.008 + (1 - bass) * 0.02).toFixed(4),
      psi_m: +(146 + mid * 6).toFixed(1),
      kappa: +(1.4 + bass * 0.75).toFixed(2),
      cellular_state: morph >= 0.4 ? 'autophagy_active' : 'growth_phase',
    };
  }

  function encodeNessPayload(tel = liveTelemetry()) {
    // Short readable token: phi_height_geodesic_psi_state (A = autophagy, G = growth)
    const state = tel.cellular_state === 'autophagy_active' ? 'A' : 'G';
    return [tel.phi_p, tel.height_fluct, tel.geodesic_var, tel.psi_m, state].join('_');
  }

  const MODE_SHORT = { ness_coupling: 'ness', terminal_cli: 'cli', topological_sdf: 'sdf', biophysics: 'bio' };
  function meshUrl(mode = 'ness_coupling') {
    const params = new URLSearchParams({ node: 'osseos', mode: MODE_SHORT[mode] || 'ness', v: encodeNessPayload() });
    return `${MESH_TARGET}?${params.toString()}`;
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

  function launchMeshEngine(mode = 'ness_coupling') {
    const url = meshUrl(mode);
    console.log(`[OSSEOS GATEWAY] Handshake initialized -> Dispatching to: ${url}`);
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

  // Translate, but never show a raw key: fall back to the bare reading
  const tv = (key, values, fallback) => {
    const s = t(key, values);
    return !s || s === key ? fallback : s;
  };
  let metricRetries = 0;
  function renderMetrics() {
    const tel = liveTelemetry();
    const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
    const kappa = tel.kappa.toFixed(2);
    const phi = tel.phi_p.toFixed(3);
    const geo = tel.geodesic_var.toFixed(3);
    set('mKappa', tv('ness.kappaValue', { value: kappa }, `${kappa} κc*`));
    set('mPhi', tv(tel.phi_p < 0.01 ? 'ness.phiIntact' : 'ness.phiStressed', { value: phi }, phi));
    set('mGeo', tv('ness.geoValue', { value: geo }, `${geo} · S^15`));
    set('dispatchUrl', meshUrl('ness_coupling'));
    // If wording wasn't ready yet, re-render shortly once it loads
    if (t('ness.kappaValue', { value: 1 }) === 'ness.kappaValue' && metricRetries < 30) {
      metricRetries += 1;
      setTimeout(renderMetrics, 200);
    }
  }

  // Cmd/Ctrl + Enter anywhere: jump straight into the Braid Mesh terminal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      launchMeshEngine('terminal_cli');
    }
  });

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
    const built = DOC_IDS.map((id, i) => {
      const title = t(`docs.${id}.title`);
      const body = t(`docs.${id}.body`);
      return { id: `DOC_00${i + 1}`, title, body, vec: embed(`${title} ${title} ${body}`) };
    });
    if (built[0].title !== 'docs.d1.title') corpus = built;
    return built;
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

  const HELP = [
    ['status', 'status --node active'],
    ['search', 'search --manifold "query"'],
    ['simulate', 'simulate --fasting 16-36 --workout 10,34 --export-glsl'],
    ['ness', 'ness'],
    ['connect', 'connect --engine braidmesh [--mode terminal_cli]'],
    ['links', 'links'],
    ['open', 'open medium | superme | x'],
    ['clear', 'clear'],
  ];
  const COMMANDS = HELP.map(([k]) => k).concat('help');

  function helpRow(syntax, desc) {
    const p = document.createElement('p');
    p.className = 'term-line h-row';
    const c = document.createElement('span');
    c.className = 'h-cmd';
    c.textContent = syntax;
    const d = document.createElement('span');
    d.className = 'h-desc';
    d.textContent = desc;
    p.append(c, d);
    out.appendChild(p);
  }

  function suggest(cmd) {
    if (!cmd) return null;
    return COMMANDS.find((c) => c.startsWith(cmd) || cmd.startsWith(c)) || null;
  }

  function linkLine(label, url) {
    const p = line(`  ${label}  `, 'l-val');
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = url;
    p.appendChild(a);
    return p;
  }

  async function run(raw) {
    // Accept pasted lines like "osseos> status" or "osseosbio> connect --engine braidmesh"
    const text = String(raw || '').replace(/^\s*(?:osseos(?:bio)?\s*>|\$|>)\s*/i, '').trim();
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
        HELP.forEach(([k, syntax]) => helpRow(syntax, t(`term.help.${k}`)));
        line(t('term.help.history'));
        line(t('term.help.shortcut'));
        break;
      case 'ness': {
        const tel = liveTelemetry();
        line(t('term.ness.title'), 'l-head');
        line(t('term.ness.params', { kc: NESS_PARAMS.kappa_c_star, a0: NESS_PARAMS.a0, b: NESS_PARAMS.b, alpha: NESS_PARAMS.alpha, beta: NESS_PARAMS.beta, mu: NESS_PARAMS.mu }));
        line(t('term.ness.kappa', { value: tel.kappa.toFixed(2) }), 'l-val');
        line(t('term.ness.phi', { value: tel.phi_p.toFixed(4) }), 'l-val');
        line(t('term.ness.height', { value: tel.height_fluct.toFixed(3) }), 'l-val');
        line(t('term.ness.geo', { value: tel.geodesic_var.toFixed(4) }), 'l-val');
        line(t('term.ness.psi', { value: tel.psi_m.toFixed(1) }), 'l-val');
        line(tel.cellular_state === 'autophagy_active' ? t('term.status.stateAutophagy') : t('term.status.stateGrowth'), 'l-ok');
        line(t('term.ness.token'), 'l-head');
        line(encodeNessPayload(tel));
        line(t('term.ness.next'));
        break;
      }
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
        renderMetrics();
        line(t('term.sim.applied'), 'l-ok');
        break;
      }
      case 'connect': {
        const engine = String(flags.engine && flags.engine !== true ? flags.engine : (rest[0] || 'braidmesh')).toLowerCase().replace(/\.com$/, '').replace(/[\s_-]/g, '');
        if (engine !== 'braidmesh') { line(t('term.connect.usage'), 'l-err'); break; }
        const allowed = ['ness_coupling', 'terminal_cli', 'topological_sdf', 'biophysics'];
        const mode = typeof flags.mode === 'string' && allowed.includes(flags.mode.toLowerCase()) ? flags.mode.toLowerCase() : 'ness_coupling';
        const result = launchMeshEngine(mode);
        line(t('term.connect.d1'), 'l-head');
        await sleep(350);
        line(t('term.connect.d2', { mode }));
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
      default: {
        const s = suggest(cmd);
        line(s ? t('term.unknownSuggest', { cmd, s }) : t('term.unknown', { cmd }), 'l-err');
      }
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

  async function boot() {
    // Load the backup wording first, then wait briefly for translations
    await loadFallback();
    let tries = 0;
    while (t('term.welcome1') === 'term.welcome1' && tries < 10) { await sleep(100); tries += 1; }
    line(tv('term.welcome1', null, 'OSSEOS BIO // TOPOLOGICAL BIOPHYSICS NODE'), 'l-head');
    line(tv('term.welcome2', null, 'SYS_ID: OSSEOS-GATEWAY-v1.10 · FREQ_LOCK: 39,420 Hz · STATUS: [ONLINE]'), 'l-ok');
    line(tv('term.welcome3', null, 'Type help to list commands.'));
    renderMetrics();
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
  else boot();
})();
