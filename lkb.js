/**
 * OSSEOS BIO // LKB TELEMETRY ENGINE v2.0
 * Turns the simulated field state into LKB phase switches t1, t2,
 * the input state vector v_in = (t1, t2, 1) and the intertwiner I.
 * Demo model only — values are derived from the on-page simulation.
 */
export function deriveMetrics(target) {
  const { morph, bass, mid } = target;
  return {
    membraneStress: +(0.8 + (1 - bass) * 0.8 + mid * 0.4).toFixed(3),
    psiM: +(146 + mid * 6).toFixed(1),
    psiM_collapse: 146 + mid * 6 < 148,
    hrv: +(0.25 + (1 - bass) * 0.5).toFixed(3),
    lactate: +(0.75 - mid * 0.5).toFixed(3),
    autophagyIndex: +Math.min(1, morph * 1.6).toFixed(3),
  };
}

export function computeLkb(target) {
  const metrics = deriveMetrics(target);
  const t1 = metrics.membraneStress > 1.2 ? 1 : -1;
  const t2 = metrics.psiM_collapse ? -1 : 1;
  const v_in = [t1, t2, 1];
  const intertwiner = [
    Math.sin(metrics.hrv * Math.PI),
    Math.cos(metrics.lactate * Math.PI),
    metrics.autophagyIndex,
  ].map((x) => +x.toFixed(3));
  // NAND gate on the two phase switches: output 0 only when both are +1
  const gate = t1 === 1 && t2 === 1 ? 0 : 1;
  return { metrics, t1, t2, v_in, intertwiner, gate, intact: gate === 1, product: t1 * t2 };
}

/** Full Base64 token (shown in the terminal, not put in the link) */
export function encodeLkbToken(lkb) {
  try {
    return btoa(JSON.stringify({ v_in: lkb.v_in, intertwiner: lkb.intertwiner, gate: lkb.gate, timestamp: Date.now() }));
  } catch (e) {
    return '';
  }
}

/** Short readable form for the hand-off link: t1_t2_I1_I2_I3 */
export function shortLkb(lkb) {
  const sign = (n) => (n > 0 ? 'p' : 'm');
  return [sign(lkb.t1), sign(lkb.t2), ...lkb.intertwiner.map((x) => x.toFixed(2))].join('_');
}

export const fmtVec = (arr, d = 3) => `[${arr.map((x) => Number(x).toFixed(d)).join(', ')}]`;

