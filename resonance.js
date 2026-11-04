/**
 * Resonance store: shared state for the Symbio-CAD tuner, the loom manifold,
 * the hero shader and the Bio-Control panel.
 */
export const DEFAULTS = Object.freeze({
  p: 13,            // Weave_P (winding)
  q: 7,             // Weave_Q (meridian)
  intensity: 0.5,   // Resonance_Δ (0.5 = L, 1.0 = H)
  isResonating: false,
  phase: 50,        // 0 = fluid, 50 = gel, 100 = crystal
  locked: false,    // LOCK_PHASE freezes breathing and jitter
  mutation: 0,      // EVOLVE adds a 5iR mutation wobble
  seed: 1,
  sound: true,
});

export const resonance = { ...DEFAULTS, spin: 0 };

const subs = new Set();
export function setRes(patch) {
  Object.assign(resonance, patch);
  subs.forEach((fn) => { try { fn(resonance); } catch (e) { /* ignore */ } });
}
export function onRes(fn) { subs.add(fn); return () => subs.delete(fn); }

export function phaseName(v) {
  if (v < 34) return 'fluid';
  if (v < 67) return 'gel';
  return 'crystal';
}

/** Trigger a short 720° flip of the manifolds (decays in the render loops) */
export function flip720() { resonance.spin = Math.PI * 4; }
