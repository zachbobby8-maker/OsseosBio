/**
 * OSSEOS BIO // AETHERGEIST CHAT-NODE
 * A floating orb that answers questions; replies "grow" onto the screen as filaments.
 */
import { resonance, phaseName } from './resonance.js';

const MODEL_ID = '1eea8efe-f9bb-4029-b959-346d889e12cc'; // DeepSeek V4.1 Flash Instant
const STORE_KEY = 'aetherLog';
const MAX_SAVED = 24;
const MAX_CONTEXT = 10;

let t = (k) => k;
let messages = [];
let busy = false;
let els = null;

const $ = (id) => document.getElementById(id);

function systemPrompt() {
  const r = resonance;
  return [
    'You are the Aethergeist, the chat-node "droid" of Osseos Bio — a topological biophysics and longevity concept studio that hands heavy computation to the Braid Mesh engine (braidmesh.com).',
    'Voice: calm, precise, a little poetic; biology as a continuous self-regulating field, woven Legendrian braids, the 39,420 Hz carrier, Helfrich membranes, mitochondrial flux, LKB representations and NAND gates.',
    'Keep replies under 90 words, plain text, no markdown, no lists unless asked.',
    'Terminal commands visitors can try: status, search, simulate, ness, lkb, weave, resonate, connect --engine braidmesh, links.',
    'Never diagnose or prescribe. For real health concerns, gently suggest a qualified professional. Be honest that on-page readings are demo simulations.',
    `Current loom state: weave T(${r.p}, ${r.q}), manifold ${phaseName(r.phase)}, resonance ${r.isResonating ? 'ACTIVE' : 'idle'}, intensity ${r.intensity >= 0.7 ? 'H' : 'L'}.`,
  ].join(' ');
}

function setStatus(key) {
  if (els) els.status.textContent = key ? t(key) : '';
}

function growText(container, text, animate) {
  container.textContent = '';
  const words = String(text).split(/(\s+)/);
  let i = 0;
  words.forEach((w) => {
    if (!w) return;
    if (/^\s+$/.test(w)) { container.appendChild(document.createTextNode(w)); return; }
    const s = document.createElement('span');
    s.className = animate ? 'ae-fil' : '';
    s.style.setProperty('--i', String(Math.min(i, 120)));
    s.textContent = w;
    container.appendChild(s);
    i += 1;
  });
}

function addBubble(msg, animate) {
  const div = document.createElement('div');
  div.className = msg.role === 'user' ? 'ae-msg ae-user' : 'ae-msg ae-node';
  if (msg.role === 'user') div.textContent = msg.content;
  else growText(div, msg.content, animate);
  els.log.appendChild(div);
  els.log.scrollTop = els.log.scrollHeight;
  return div;
}

function render() {
  els.log.textContent = '';
  messages.forEach((m) => addBubble(m, false));
  els.suggest.hidden = messages.some((m) => m.role === 'user');
}

function showError(err) {
  const msg = String((err && (err.code || err.message)) || '').toLowerCase();
  let key = 'aether.errGeneric';
  if (/credit|quota|balance|payment/.test(msg)) key = 'aether.errCredits';
  else if (/sign|auth|login|unauth/.test(msg)) key = 'aether.errSignin';
  else if (/timeout|timed out/.test(msg)) key = 'aether.errTimeout';
  else if (/consent|denied|cancel/.test(msg)) key = 'aether.errConsent';
  const div = document.createElement('div');
  div.className = 'ae-msg ae-error';
  div.textContent = t(key);
  els.log.appendChild(div);
  els.log.scrollTop = els.log.scrollHeight;
}

async function save() {
  try {
    await window.miniappsAI?.storage?.setItem(STORE_KEY, JSON.stringify(messages.slice(-MAX_SAVED)));
  } catch (e) { /* non-critical */ }
}

async function load() {
  try {
    const raw = await window.miniappsAI?.storage?.getItem(STORE_KEY);
    if (raw === null || raw === undefined) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
  } catch (e) { return null; }
}

function seed() {
  messages = [{ role: 'assistant', content: t('aether.greeting') }];
}

function setBusy(on) {
  busy = on;
  els.root.classList.toggle('is-thinking', on);
  els.send.disabled = on;
  els.input.disabled = on;
  setStatus(on ? 'aether.thinking' : 'aether.online');
}

export async function askAether(text) {
  const q = String(text || '').trim().slice(0, 600);
  if (!q || busy || !els) return;
  openAether();
  messages.push({ role: 'user', content: q });
  addBubble(messages[messages.length - 1], false);
  els.suggest.hidden = true;
  save();
  setBusy(true);
  try {
    if (!window.miniappsAI?.callModel) throw new Error('unavailable');
    const history = messages.slice(-MAX_CONTEXT).map((m) => ({ role: m.role, content: m.content }));
    const result = await window.miniappsAI.callModel({
      modelId: MODEL_ID,
      messages: [{ role: 'system', content: systemPrompt() }, ...history],
      timeoutMs: 45000,
    });
    const reply = (window.miniappsAI.extractText(result) || '').trim();
    if (!reply) throw new Error('empty');
    messages.push({ role: 'assistant', content: reply });
    addBubble(messages[messages.length - 1], true);
    save();
  } catch (err) {
    showError(err);
  } finally {
    setBusy(false);
    els.input.focus();
  }
}

export function openAether() {
  if (!els) return;
  els.panel.hidden = false;
  els.orb.setAttribute('aria-expanded', 'true');
  els.root.classList.add('is-open');
  els.log.scrollTop = els.log.scrollHeight;
  if (!busy) setTimeout(() => els.input.focus(), 30);
}

function closeAether() {
  if (!els) return;
  els.panel.hidden = true;
  els.orb.setAttribute('aria-expanded', 'false');
  els.root.classList.remove('is-open');
  els.orb.focus();
}

/** Terminal hook: `aether` opens the orb, `ask <question>` sends a question. */
export function aetherCommand(cmd, rest, line) {
  if (cmd !== 'aether' && cmd !== 'ask') return false;
  const q = (rest || []).join(' ').trim();
  line(t(q ? 'aether.termAsk' : 'aether.termOpen'), 'l-ok');
  if (q) askAether(q); else openAether();
  return true;
}

export async function initAether(opts = {}) {
  if (typeof opts.t === 'function') t = opts.t;
  const root = $('aether');
  if (!root) return;
  els = {
    root,
    orb: $('aeOrb'),
    panel: $('aePanel'),
    log: $('aeLog'),
    suggest: $('aeSuggest'),
    form: $('aeForm'),
    input: $('aeInput'),
    send: $('aeSend'),
    status: $('aeStatus'),
  };

  ['aether.s1', 'aether.s2', 'aether.s3'].forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ae-chip';
    b.textContent = t(key);
    b.addEventListener('click', () => askAether(b.textContent));
    els.suggest.appendChild(b);
  });

  els.orb.addEventListener('click', () => (els.panel.hidden ? openAether() : closeAether()));
  $('aeClose').addEventListener('click', closeAether);
  $('aeClear').addEventListener('click', () => {
    if (busy) return;
    seed();
    render();
    save();
    els.input.focus();
  });
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = els.input.value;
    els.input.value = '';
    askAether(v);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.panel.hidden) closeAether();
  });

  setStatus('aether.online');
  const saved = await load();
  if (saved) messages = saved;
  else { seed(); save(); }
  render();
}
