/**
 * OSSEOS BIO // 3D BIOPRINTING & OSTEOGENESIS BAY
 * Vanilla port of the Osseosbio3DViewport component:
 * Three.js scene + UnrealBloom + OrbitControls + cursor raycasting,
 * three surgical protocols and a live telemetry waveform.
 * Three.js (r147 UMD build) is loaded by index.html as window.THREE.
 */
import { resonance } from './resonance.js';

const MODES = {
  cranial: { id: 'cranial', code: '01', res: '0.8μm', targetPos: [-1.45, 0.35, 0], density: '99.7%', frequency: '39.42 kHz', tensileGain: '+142%', waveSpeed: 0.14 },
  spinal: { id: 'spinal', code: '02', res: '1.2μm', targetPos: [-0.15, 0.22, 0], density: '98.4%', frequency: '39.42 kHz', tensileGain: '+168%', waveSpeed: 0.1 },
  orthopedic: { id: 'orthopedic', code: '03', res: '1.8μm', targetPos: [1.15, 0.18, 0], density: '96.9%', frequency: '39.42 kHz', tensileGain: '+184%', waveSpeed: 0.07 },
};

const $ = (id) => document.getElementById(id);

export function initBay({ t }) {
  const root = $('bay');
  const mount = $('bayMount');
  const waveCanvas = $('bayWave');
  if (!root || !mount || !waveCanvas) return;

  const css = getComputedStyle(root);
  const cv = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
  const C = {
    cyan: cv('--bay-cyan', '#00f0ff'),
    violet: cv('--bay-violet', '#a855f7'),
    void: cv('--bay-void', '#05070c'),
    steel: cv('--bay-steel', '#334155'),
    chassis: cv('--bay-chassis', '#0f172a'),
    bed: cv('--bay-bed', '#090d16'),
    ambient: cv('--bay-ambient', '#1e293b'),
  };

  let mode = MODES.spinal;
  let visible = true;

  // ---------- UI: protocol switcher + readouts ----------
  const buttons = Array.from(root.querySelectorAll('[data-bay-mode]'));
  const setMode = (key) => {
    mode = MODES[key] || MODES.spinal;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bayMode === mode.id)));
    const title = t(`bay.mode.${mode.id}`);
    $('bayProtocol').textContent = t('bay.protocol', { title, res: mode.res });
    $('bayDensity').textContent = mode.density;
    $('bayGain').textContent = mode.tensileGain;
    $('bayFreq').textContent = mode.frequency;
  };
  buttons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.bayMode)));
  setMode('spinal');

  // ---------- 1. Live telemetry waveform ----------
  const wctx = waveCanvas.getContext('2d');
  let phase = 0;
  const renderWave = () => {
    if (!wctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = waveCanvas.clientWidth;
    const h = waveCanvas.clientHeight;
    if (!w || !h) return;
    if (waveCanvas.width !== Math.round(w * dpr) || waveCanvas.height !== Math.round(h * dpr)) {
      waveCanvas.width = Math.round(w * dpr);
      waveCanvas.height = Math.round(h * dpr);
    }
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wctx.clearRect(0, 0, w, h);

    wctx.globalAlpha = 0.15;
    wctx.strokeStyle = C.cyan;
    wctx.lineWidth = 1;
    wctx.beginPath();
    wctx.moveTo(0, h * 0.5);
    wctx.lineTo(w, h * 0.5);
    wctx.stroke();
    wctx.globalAlpha = 1;

    const boost = resonance.isResonating ? 1.25 : 1;
    wctx.strokeStyle = C.cyan;
    wctx.lineWidth = 1.6;
    wctx.beginPath();
    for (let x = 0; x < w; x++) {
      const env = Math.sin((x / w) * Math.PI);
      const y = h * 0.5 + Math.sin(x * mode.waveSpeed + phase) * (h * 0.34) * env * boost + Math.cos(x * 0.25 - phase * 1.5) * 2.5;
      if (x === 0) wctx.moveTo(x, y); else wctx.lineTo(x, y);
    }
    wctx.stroke();

    wctx.strokeStyle = C.violet;
    wctx.lineWidth = 1.2;
    wctx.beginPath();
    for (let x = 0; x < w; x++) {
      const y = h * 0.5 + Math.cos(x * 0.08 - phase * 0.8) * (h * 0.22);
      if (x === 0) wctx.moveTo(x, y); else wctx.lineTo(x, y);
    }
    wctx.stroke();
    phase += 0.12;
  };

  // ---------- 2. Three.js scene ----------
  const THREE = window.THREE;
  const fail = (key) => {
    const fb = $('bayFallback');
    if (fb) { fb.textContent = t(key); fb.hidden = false; }
  };

  let renderFrame = () => {};
  if (!THREE) {
    fail('bay.noThree');
  } else {
    try {
      renderFrame = buildScene(THREE, mount, C, () => mode);
    } catch (e) {
      console.warn('[OSSEOS] 3D bay unavailable', e);
      fail('bay.noWebgl');
    }
  }
  const loading = $('bayLoading');
  if (loading) loading.hidden = true;

  // ---------- Shared loop, paused when off screen ----------
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
    }, { rootMargin: '120px' }).observe(root);
  }
  const loop = () => {
    if (visible && !document.hidden) {
      renderWave();
      try { renderFrame(); } catch (e) { /* keep wave alive */ }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function buildScene(THREE, container, C, getMode) {
  const width = () => Math.max(1, container.clientWidth);
  const height = () => Math.max(1, container.clientHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.void);
  scene.fog = new THREE.FogExp2(new THREE.Color(C.void).getHex(), 0.09);

  const camera = new THREE.PerspectiveCamera(42, width() / height(), 0.1, 100);
  camera.position.set(0.5, 2.15, 4.35);
  camera.lookAt(0, 0.25, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(width(), height());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(new THREE.Color(C.void), 1);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.className = 'bay-gl';
  container.appendChild(renderer.domElement);

  // Bloom pipeline (falls back to plain render if the add-ons failed to load)
  let composer = null;
  let bloomPass = null;
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(width(), height()), 0.95, 0.45, 0.2);
    composer.addPass(bloomPass);
  }

  let controls = null;
  if (THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.1;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.enablePan = false;
    controls.target.set(0, 0.25, 0);
    // On touch screens let vertical swipes keep scrolling the page
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      renderer.domElement.style.touchAction = 'pan-y';
    }
  }

  // Lighting
  scene.add(new THREE.AmbientLight(new THREE.Color(C.ambient), 2.4));
  const cyanLight = new THREE.PointLight(new THREE.Color(C.cyan), 7, 12);
  cyanLight.position.set(-2, 2.6, 2);
  scene.add(cyanLight);
  const violetLight = new THREE.PointLight(new THREE.Color(C.violet), 7, 12);
  violetLight.position.set(2, 2.6, -1.5);
  scene.add(violetLight);

  // Floor grid
  const grid = new THREE.GridHelper(14, 28, new THREE.Color(C.cyan), new THREE.Color(C.chassis));
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  grid.position.y = -0.35;
  scene.add(grid);

  // Bio-scanner bed
  const bedGeo = new THREE.BoxGeometry(4.4, 0.14, 1.3);
  const bed = new THREE.Mesh(bedGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(C.bed), metalness: 0.85, roughness: 0.25 }));
  bed.position.y = -0.15;
  scene.add(bed);
  bed.add(new THREE.LineSegments(new THREE.EdgesGeometry(bedGeo), new THREE.LineBasicMaterial({ color: new THREE.Color(C.cyan), transparent: true, opacity: 0.55 })));

  // Raycast plane over the patient
  const raycastPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
  raycastPlane.rotation.x = -Math.PI / 2;
  raycastPlane.position.y = 0.22;
  scene.add(raycastPlane);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hoverTarget = new THREE.Vector3();
  let isHoveringBed = false;
  renderer.domElement.addEventListener('pointermove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(raycastPlane);
    isHoveringBed = hits.length > 0;
    if (isHoveringBed) hoverTarget.copy(hits[0].point);
  });
  renderer.domElement.addEventListener('pointerleave', () => { isHoveringBed = false; });

  // Volumetric patient skeletal lattice
  const patient = new THREE.Group();
  scene.add(patient);
  const wireCyan = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.cyan), wireframe: true, transparent: true, opacity: 0.35 });
  const wireViolet = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.violet), wireframe: true, transparent: true, opacity: 0.9 });

  const cranium = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 2), wireCyan);
  cranium.position.set(-1.45, 0.25, 0);
  patient.add(cranium);

  const spineNodes = [];
  for (let i = 0; i < 12; i++) {
    const r = 0.16 + Math.sin((i / 11) * Math.PI) * 0.14;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 20), wireCyan);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(-0.95 + i * 0.14, 0.18, 0);
    patient.add(ring);
    spineNodes.push(ring);
  }

  const orthoNodes = [];
  [-0.22, 0.22].forEach((z) => {
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 1.15, 12, 6, true), wireCyan);
    limb.rotation.z = Math.PI / 2;
    limb.position.set(1.25, 0.12, z);
    patient.add(limb);
    orthoNodes.push(limb);
  });

  // Surgical droid
  const droid = new THREE.Group();
  droid.position.set(0.8, 1.55, -0.75);
  scene.add(droid);
  const chassisMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.chassis), metalness: 0.9, roughness: 0.2 });
  droid.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.45), chassisMat));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.34), chassisMat);
  head.position.set(0, 0.48, 0.05);
  droid.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.cyan) }));
  visor.position.set(0, 0, 0.18);
  head.add(visor);

  // Articulated arm
  const armMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.steel), metalness: 0.85, roughness: 0.25 });
  const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 1, 12), armMat);
  const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 1, 12), armMat);
  scene.add(upperArm, foreArm);
  const jointGeo = new THREE.SphereGeometry(0.065, 16, 16);
  const jointMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.violet) });
  const shoulderJoint = new THREE.Mesh(jointGeo, jointMat);
  const elbowJoint = new THREE.Mesh(jointGeo, jointMat);
  const emitterTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.cyan) }));
  scene.add(shoulderJoint, elbowJoint, emitterTip);

  // Osteogenic laser + contact halo
  const laserBeam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: new THREE.Color(C.cyan) }),
  );
  scene.add(laserBeam);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.095, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(C.violet), side: THREE.DoubleSide, transparent: true, opacity: 0.95 }),
  );
  halo.rotation.x = -Math.PI / 2;
  scene.add(halo);

  // Synthesis particle cloud
  const particleCount = 65;
  const pPositions = new Float32Array(particleCount * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: new THREE.Color(C.cyan), size: 0.038, transparent: true, opacity: 0.9 })));

  const UP = new THREE.Vector3(0, 1, 0);
  const tmpDir = new THREE.Vector3();
  const align = (mesh, a, b) => {
    tmpDir.subVectors(b, a);
    const len = tmpDir.length();
    mesh.scale.set(1, len, 1);
    mesh.position.copy(a).addScaledVector(tmpDir, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, tmpDir.normalize());
  };

  const currentTarget = new THREE.Vector3(...MODES.spinal.targetPos);
  const desired = new THREE.Vector3();
  const shoulderPos = new THREE.Vector3();
  const wristPos = new THREE.Vector3();
  const elbowPos = new THREE.Vector3();
  let t = 0;

  const resize = () => {
    const w = width(), h = height();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
  };
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
  else window.addEventListener('resize', resize);

  return function frame() {
    t += 0.025;
    const mode = getMode();
    const res = resonance.isResonating;

    cranium.material = mode.id === 'cranial' ? wireViolet : wireCyan;
    spineNodes.forEach((n, i) => { n.material = mode.id === 'spinal' && i >= 3 && i <= 8 ? wireViolet : wireCyan; });
    orthoNodes.forEach((l) => { l.material = mode.id === 'orthopedic' ? wireViolet : wireCyan; });

    if (isHoveringBed) {
      desired.copy(hoverTarget);
    } else {
      const jitter = res ? Math.sin(t * 39.42) * 0.01 : 0;
      desired.set(
        mode.targetPos[0] + Math.sin(t * 1.6) * 0.22 + jitter,
        mode.targetPos[1] + Math.cos(t * 2.2) * 0.04,
        mode.targetPos[2] + Math.cos(t * 1.4) * 0.14,
      );
    }
    currentTarget.lerp(desired, 0.09);

    droid.position.y = 1.55 + Math.sin(t * 1.5) * 0.04;
    head.lookAt(currentTarget);

    shoulderPos.set(droid.position.x - 0.25, droid.position.y - 0.1, droid.position.z + 0.15);
    wristPos.set(currentTarget.x + 0.18, currentTarget.y + 0.55, currentTarget.z - 0.15);
    elbowPos.set(
      (shoulderPos.x + wristPos.x) * 0.5 + 0.25,
      (shoulderPos.y + wristPos.y) * 0.5 + 0.35 + Math.sin(t * 2) * 0.05,
      (shoulderPos.z + wristPos.z) * 0.5 - 0.2,
    );
    shoulderJoint.position.copy(shoulderPos);
    elbowJoint.position.copy(elbowPos);
    emitterTip.position.copy(wristPos);
    align(upperArm, shoulderPos, elbowPos);
    align(foreArm, elbowPos, wristPos);

    laserBeam.geometry.setFromPoints([wristPos, currentTarget]);
    halo.position.set(currentTarget.x, currentTarget.y + 0.02, currentTarget.z);
    const ps = 1 + Math.sin(t * 10) * 0.25;
    halo.scale.set(ps, ps, 1);

    for (let i = 0; i < particleCount; i++) {
      const a = t * 2.5 + i * 0.6;
      const r = 0.08 + (i % 5) * 0.04;
      pPositions[i * 3] = currentTarget.x + Math.cos(a) * r;
      pPositions[i * 3 + 1] = currentTarget.y + ((t * 0.35 + i * 0.05) % 0.45);
      pPositions[i * 3 + 2] = currentTarget.z + Math.sin(a) * r;
    }
    pGeo.attributes.position.needsUpdate = true;

    if (bloomPass) bloomPass.strength = res ? 1.6 : 0.95;
    if (controls) controls.update();
    if (composer) composer.render(); else renderer.render(scene, camera);
  };
}
