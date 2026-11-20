/**
 * OSSEOSBIO // TOPOLOGICAL GENOME & BIO-LOCK CONSOLE
 * 1) 120x24px 39,420 Hz Standing-Wave & 0.00 W Thermal-Leak Micro-Oscilloscope
 * 2) 2D Legendrian Chromatin Manifold Canvas (Lk = Tw + Wr) with horizontal cursor scrubbing
 * 3) 3D Three.js Osseous Ti-hBN Scaffold, Nuclear Envelope, LINC Filaments & Supercoiled Chromatin
 * 4) 16x6 Braid CUDA-Q Spatial Transcriptomics Heatmap
 */
export function initBioLock() {
  const root = document.getElementById('biolock');
  if (!root) return;

  const PRI = '#7cf0c4';
  const ACC = '#f1b84a';
  const MUTED = '#84928d';
  const BG_HEX = 0x07090b;
  const PRI_HEX = 0x7cf0c4;
  const ACC_HEX = 0xf1b84a;

  const state = {
    mode: '5IR',
    conservationLock: true,
    targetLk: 13.0,
    wr: 3.50,
    tw: 9.50,
    strain: 0.42,
    scrubActive: false,
    scrubNormX: 0.5,
    autoOrbit: true,
    drawerOpen: true,
  };

  const $ = (id) => document.getElementById(id);
  const banner = $('blBanner');
  const dnaWrap = $('blDnaWrap');
  const strainAlertTag = $('blStrainAlert');
  const pillCoherence = $('blPillCoherence');
  const pillThermal = $('blPillThermal');
  const pillBetti = $('blPillBetti');

  const btnMode5IR = $('blMode5IR');
  const btnMode4IR = $('blMode4IR');
  const btnConservationLock = $('blConservationLock');
  const lockDot = $('blLockDot');
  const invariantBadge = $('blInvariantBadge');

  const sliderWr = $('blSliderWr');
  const sliderTw = $('blSliderTw');
  const sliderStrain = $('blSliderStrain');

  const readoutWr = $('blReadoutWr');
  const readoutTw = $('blReadoutTw');
  const readoutStrain = $('blReadoutStrain');

  const hudLkVal = $('blHudLk');
  const hudTwVal = $('blHudTw');
  const hudWrVal = $('blHudWr');
  const hudTbVal = $('blHudTb');
  const telemetryTbVal = $('blTelemetryTb');
  const lincStatusText = $('blLincStatus');
  const saspStatusText = $('blSaspStatus');

  function syncStateAndUI() {
    const lk = state.tw + state.wr;
    const tb = state.wr - 2.0;
    const tbFormatted = `${tb >= 0 ? '+' : ''}${tb.toFixed(2)}`;

    sliderWr.value = state.wr.toFixed(2);
    sliderTw.value = state.tw.toFixed(2);
    sliderStrain.value = state.strain.toFixed(2);

    readoutWr.textContent = state.wr.toFixed(2);
    readoutTw.textContent = state.tw.toFixed(2);
    readoutStrain.textContent = `${state.strain.toFixed(2)}c`;

    hudLkVal.textContent = lk.toFixed(2);
    hudTwVal.textContent = state.tw.toFixed(2);
    hudWrVal.textContent = state.wr.toFixed(2);
    hudTbVal.textContent = tbFormatted;
    telemetryTbVal.textContent = `${tbFormatted} [INVARIANT]`;

    invariantBadge.textContent = state.conservationLock
      ? `LOCKED [${lk.toFixed(2)}]`
      : `FREE [${lk.toFixed(2)}]`;

    const highStrain = state.strain > 0.70;
    banner.classList.toggle('high-strain', highStrain);
    dnaWrap.classList.toggle('high-strain', highStrain);
    strainAlertTag.hidden = !highStrain;
    sliderStrain.classList.toggle('strain-alert', highStrain);
    readoutStrain.classList.toggle('is-accent', highStrain);

    if (state.mode === '5IR') {
      pillCoherence.textContent = 'COHERENCE FLOOR: 84.2%';
      pillCoherence.classList.remove('is-accent');
      pillThermal.textContent = 'THERMAL LEAK: 0.00 W';
      pillBetti.textContent = 'BETTI-1 VOIDS (H¹): 0';
      lincStatusText.textContent = highStrain
        ? 'LINC Tensegrity [HIGH-LOAD ROUTING]'
        : 'LINC Tensegrity [PHASE-COHERENT]';
      lincStatusText.style.color = highStrain ? ACC : PRI;
      saspStatusText.textContent = 'Liver–Bone Microfluidic [NOMINAL]';
    } else {
      pillCoherence.textContent = 'COHERENCE FLOOR: 41.8% [DRIFT]';
      pillCoherence.classList.add('is-accent');
      pillThermal.textContent = 'THERMAL LEAK: 1.84 W';
      pillBetti.textContent = 'BETTI-1 VOIDS (H¹): 14';
      lincStatusText.textContent = 'LINC Tensegrity [DECOUPLED / 1D TAPE]';
      lincStatusText.style.color = ACC;
      saspStatusText.textContent = 'Liver–Bone Microfluidic [SASP ELEVATED]';
    }

    updateHeatmapVisuals();
  }

  function setWrithe(newWr) {
    state.wr = Math.max(0, Math.min(7, newWr));
    if (state.conservationLock) {
      state.tw = Math.max(2, Math.min(13, state.targetLk - state.wr));
    }
    syncStateAndUI();
  }

  function setTwist(newTw) {
    if (state.conservationLock) {
      state.tw = Math.max(6.0, Math.min(13.0, newTw));
      state.wr = Math.max(0, Math.min(7, state.targetLk - state.tw));
    } else {
      state.tw = Math.max(2.0, Math.min(13.0, newTw));
    }
    syncStateAndUI();
  }

  sliderWr.addEventListener('input', (e) => setWrithe(parseFloat(e.target.value)));
  sliderTw.addEventListener('input', (e) => setTwist(parseFloat(e.target.value)));
  sliderStrain.addEventListener('input', (e) => {
    state.strain = parseFloat(e.target.value);
    syncStateAndUI();
  });

  btnMode5IR.addEventListener('click', () => {
    state.mode = '5IR';
    btnMode5IR.classList.add('active');
    btnMode4IR.classList.remove('active-accent');
    syncStateAndUI();
  });

  btnMode4IR.addEventListener('click', () => {
    state.mode = '4IR';
    btnMode4IR.classList.add('active-accent');
    btnMode5IR.classList.remove('active');
    syncStateAndUI();
  });

  btnConservationLock.addEventListener('click', () => {
    state.conservationLock = !state.conservationLock;
    if (state.conservationLock) {
      state.wr = Math.max(0, Math.min(7, state.wr));
      state.tw = state.targetLk - state.wr;
      btnConservationLock.classList.add('active');
      lockDot.style.backgroundColor = PRI;
    } else {
      btnConservationLock.classList.remove('active');
      lockDot.style.backgroundColor = MUTED;
    }
    syncStateAndUI();
  });

  // 1. TOP BAR 120x24px LIVE MICRO-OSCILLOSCOPE
  const scopeCanvas = $('blMicroScope');
  const scopeCtx = scopeCanvas ? scopeCanvas.getContext('2d') : null;
  let scopePhase = 0;

  function renderMicroScope() {
    if (!scopeCtx) return;
    const w = scopeCanvas.width;
    const h = scopeCanvas.height;
    scopeCtx.clearRect(0, 0, w, h);

    scopeCtx.strokeStyle = 'rgba(223, 230, 225, 0.1)';
    scopeCtx.lineWidth = 1;
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, h / 2);
    scopeCtx.lineTo(w, h / 2);
    scopeCtx.stroke();

    scopeCtx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const leakY = state.mode === '5IR'
        ? h - 4
        : h - 5 - Math.abs(Math.sin(x * 0.25 + scopePhase * 2.2)) * 6;
      if (x === 0) scopeCtx.moveTo(x, leakY);
      else scopeCtx.lineTo(x, leakY);
    }
    scopeCtx.strokeStyle = state.mode === '5IR' ? 'rgba(241, 184, 74, 0.85)' : ACC;
    scopeCtx.lineWidth = 1.2;
    scopeCtx.stroke();

    scopeCtx.beginPath();
    for (let x = 0; x <= w; x++) {
      const norm = x / w;
      const envelope = Math.sin(norm * Math.PI);
      const amp = (state.mode === '5IR' ? 7.5 : 4.2) * (0.45 + 0.55 * envelope);
      const y = (h / 2 - 1) + Math.sin(norm * Math.PI * 8 - scopePhase) * amp;
      if (x === 0) scopeCtx.moveTo(x, y);
      else scopeCtx.lineTo(x, y);
    }
    scopeCtx.strokeStyle = PRI;
    scopeCtx.lineWidth = 1.5;
    scopeCtx.stroke();

    scopePhase += 0.14;
  }

  // 2. 2D LEGENDRIAN CHROMATIN MANIFOLD CANVAS
  const dnaCanvas = $('blDnaCanvas');
  const dnaCtx = dnaCanvas ? dnaCanvas.getContext('2d') : null;
  let dnaWidth = 640;
  let dnaHeight = 265;
  let dnaTime = 0;

  function resizeDnaCanvas() {
    if (!dnaCanvas || !dnaCtx) return;
    const rect = dnaWrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dnaWidth = Math.max(260, rect.width);
    dnaHeight = Math.max(200, rect.height);
    dnaCanvas.width = Math.floor(dnaWidth * dpr);
    dnaCanvas.height = Math.floor(dnaHeight * dpr);
    dnaCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function handleDnaScrub(clientX) {
    const rect = dnaCanvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    state.scrubActive = true;
    state.scrubNormX = normX;
    setWrithe(normX * 7.0);
  }

  if (dnaCanvas) {
    dnaCanvas.addEventListener('mousemove', (e) => handleDnaScrub(e.clientX));
    dnaCanvas.addEventListener('mouseleave', () => { state.scrubActive = false; });
    dnaCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) handleDnaScrub(e.touches[0].clientX);
    }, { passive: true });
    dnaCanvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) handleDnaScrub(e.touches[0].clientX);
    }, { passive: true });
    dnaCanvas.addEventListener('touchend', () => { state.scrubActive = false; });
  }

  const basePairs = ['A=T', 'G≡C', 'C≡G', 'T=A', 'G≡C', 'A=T'];

  function renderDnaCanvas() {
    if (!dnaCtx) return;
    dnaTime += 0.028;
    const w = dnaWidth;
    const h = dnaHeight;
    dnaCtx.clearRect(0, 0, w, h);

    dnaCtx.strokeStyle = 'rgba(124, 240, 196, 0.05)';
    dnaCtx.lineWidth = 1;
    const gridStep = 36;
    for (let x = 0; x < w; x += gridStep) {
      dnaCtx.beginPath();
      dnaCtx.moveTo(x, 0);
      dnaCtx.lineTo(x, h);
      dnaCtx.stroke();
    }
    for (let y = 0; y < h; y += gridStep) {
      dnaCtx.beginPath();
      dnaCtx.moveTo(0, y);
      dnaCtx.lineTo(w, y);
      dnaCtx.stroke();
    }

    dnaCtx.strokeStyle = 'rgba(241, 184, 74, 0.18)';
    dnaCtx.setLineDash([4, 4]);
    dnaCtx.beginPath();
    dnaCtx.moveTo(0, h * 0.5);
    dnaCtx.lineTo(w, h * 0.5);
    dnaCtx.stroke();
    dnaCtx.setLineDash([]);

    if (state.mode === '4IR') {
      dnaCtx.font = '600 13px "JetBrains Mono", monospace';
      const spacing = 54;
      const totalCols = Math.ceil(w / spacing) + 2;
      const scrollOffset = (dnaTime * 55) % spacing;

      for (let i = 0; i < totalCols; i++) {
        const x = i * spacing - scrollOffset;
        const label = basePairs[i % basePairs.length];
        dnaCtx.fillStyle = i % 2 === 0 ? 'rgba(132, 146, 141, 0.85)' : 'rgba(241, 184, 74, 0.8)';
        dnaCtx.fillText(label, x, h * 0.5 + 4);

        dnaCtx.strokeStyle = 'rgba(132, 146, 141, 0.2)';
        dnaCtx.beginPath();
        dnaCtx.moveTo(x + 12, h * 0.5 - 18);
        dnaCtx.lineTo(x + 12, h * 0.5 + 18);
        dnaCtx.stroke();
      }

      dnaCtx.fillStyle = ACC;
      dnaCtx.font = '500 11px "JetBrains Mono", monospace';
      dnaCtx.fillText('[4IR LEGACY STRING]: 1D QUATERNARY TAPE — ZERO TOPOLOGICAL COUPLING', 14, 22);
      return;
    }

    const padX = 26;
    const spanW = w - padX * 2;
    const steps = 180;
    const midY = h * 0.52;
    const baseAmp = Math.min(44, h * 0.17) * (1.0 - state.strain * 0.24);
    const writheAmp = state.wr * Math.min(6.2, h * 0.024);

    for (let i = 0; i <= steps; i += 4) {
      const u = i / steps;
      const x = padX + u * spanW;
      const plectonemeY = Math.sin(u * Math.PI * 2.2 - dnaTime * 0.9) * writheAmp;
      const phase = u * state.tw * Math.PI * 1.45 - dnaTime * 1.65;
      const y1 = midY + plectonemeY + Math.sin(phase) * baseAmp;
      const y2 = midY + plectonemeY + Math.sin(phase + Math.PI) * baseAmp;
      const depth = Math.abs(Math.cos(phase));

      dnaCtx.strokeStyle = `rgba(241, 184, 74, ${0.14 + depth * 0.34})`;
      dnaCtx.lineWidth = 1.1;
      dnaCtx.beginPath();
      dnaCtx.moveTo(x, y1);
      dnaCtx.lineTo(x, y2);
      dnaCtx.stroke();
    }

    const strandConfigs = [
      { phaseOffset: 0, color: PRI, glow: 'rgba(124, 240, 196, 0.55)' },
      { phaseOffset: Math.PI, color: ACC, glow: 'rgba(241, 184, 74, 0.55)' },
    ];

    strandConfigs.forEach((strand) => {
      dnaCtx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = padX + u * spanW;
        const plectonemeY = Math.sin(u * Math.PI * 2.2 - dnaTime * 0.9) * writheAmp;
        const phase = u * state.tw * Math.PI * 1.45 - dnaTime * 1.65 + strand.phaseOffset;
        const y = midY + plectonemeY + Math.sin(phase) * baseAmp;
        if (i === 0) dnaCtx.moveTo(x, y);
        else dnaCtx.lineTo(x, y);
      }
      dnaCtx.strokeStyle = strand.color;
      dnaCtx.lineWidth = 2.4;
      dnaCtx.shadowBlur = 8;
      dnaCtx.shadowColor = strand.glow;
      dnaCtx.stroke();
      dnaCtx.shadowBlur = 0;
    });

    for (let i = 0; i <= steps; i += 18) {
      const u = i / steps;
      const x = padX + u * spanW;
      const plectonemeY = Math.sin(u * Math.PI * 2.2 - dnaTime * 0.9) * writheAmp;
      const phase = u * state.tw * Math.PI * 1.45 - dnaTime * 1.65;
      const y1 = midY + plectonemeY + Math.sin(phase) * baseAmp;
      dnaCtx.fillStyle = PRI;
      dnaCtx.beginPath();
      dnaCtx.arc(x, y1, 2.3, 0, Math.PI * 2);
      dnaCtx.fill();
    }

    if (state.scrubActive) {
      const scrubX = state.scrubNormX * w;
      dnaCtx.strokeStyle = 'rgba(124, 240, 196, 0.55)';
      dnaCtx.lineWidth = 1;
      dnaCtx.setLineDash([3, 3]);
      dnaCtx.beginPath();
      dnaCtx.moveTo(scrubX, 0);
      dnaCtx.lineTo(scrubX, h);
      dnaCtx.stroke();
      dnaCtx.setLineDash([]);

      dnaCtx.fillStyle = PRI;
      dnaCtx.font = '600 10px "JetBrains Mono", monospace';
      const labelX = scrubX > w - 135 ? scrubX - 128 : scrubX + 8;
      dnaCtx.fillText(`SCRUB Wr:${state.wr.toFixed(2)} Tw:${state.tw.toFixed(2)}`, labelX, h - 12);
    }

    dnaCtx.fillStyle = PRI;
    dnaCtx.font = '500 11px "JetBrains Mono", monospace';
    dnaCtx.fillText('[5IR CONTACT MANIFOLD]: DUPLEX RIBBON LOCKED @ 39,420 Hz', 14, 22);
  }

  // 3. 3D THREE.JS OSSEOUS SCAFFOLD & LINC BRIDGE VIEWPORT
  const threeContainer = $('blThreeContainer');
  const btnAutoOrbit = $('blAutoOrbit');
  const btnResetCam = $('blResetCam');

  let scene;
  let camera;
  let renderer;
  let rootGroup;
  let scaffoldMat;
  const nodeMeshes = [];
  const lincPulses = [];
  let helixStrandA;
  let helixStrandB;
  let helixRungsGroup;

  const orbit = {
    theta: 0.55,
    phi: 1.18,
    radius: 6.4,
    isDragging: false,
    prevX: 0,
    prevY: 0,
  };

  function updateCameraTransform() {
    if (!camera) return;
    const sinPhi = Math.sin(orbit.phi);
    camera.position.x = orbit.radius * sinPhi * Math.sin(orbit.theta);
    camera.position.y = orbit.radius * Math.cos(orbit.phi);
    camera.position.z = orbit.radius * sinPhi * Math.cos(orbit.theta);
    camera.lookAt(0, 0, 0);
  }

  function initThreeScene() {
    const THREE = window.THREE;
    if (!THREE || !threeContainer) return;

    const rect = threeContainer.getBoundingClientRect();
    const width = Math.max(260, rect.width);
    const height = Math.max(200, rect.height);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    updateCameraTransform();

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(BG_HEX, 1);
    threeContainer.appendChild(renderer.domElement);

    rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const scaffoldGroup = new THREE.Group();
    rootGroup.add(scaffoldGroup);

    scaffoldMat = new THREE.LineBasicMaterial({
      color: PRI_HEX,
      transparent: true,
      opacity: 0.48,
    });

    const nodeGeo = new THREE.SphereGeometry(0.055, 10, 10);
    const hexRings = [-2.1, -0.7, 0.7, 2.1];
    const hexRadius = 2.35;
    const ringVertices = [];

    hexRings.forEach((xPos, rIdx) => {
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2 + (rIdx % 2) * (Math.PI / 6);
        const y = Math.cos(angle) * hexRadius;
        const z = Math.sin(angle) * hexRadius;
        const v = new THREE.Vector3(xPos, y, z);
        pts.push(v);

        const nodeMat = new THREE.MeshBasicMaterial({ color: PRI_HEX });
        const sphere = new THREE.Mesh(nodeGeo, nodeMat);
        sphere.position.copy(v);
        scaffoldGroup.add(sphere);
        nodeMeshes.push(sphere);
      }
      ringVertices.push(pts);

      const loopPts = [...pts, pts[0]];
      const ringGeo = new THREE.BufferGeometry().setFromPoints(loopPts);
      scaffoldGroup.add(new THREE.Line(ringGeo, scaffoldMat));
    });

    for (let r = 0; r < ringVertices.length - 1; r++) {
      for (let k = 0; k < 6; k++) {
        const a = ringVertices[r][k];
        const b = ringVertices[r + 1][k];
        const c = ringVertices[r + 1][(k + 1) % 6];
        scaffoldGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), scaffoldMat));
        scaffoldGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, c]), scaffoldMat));
      }
    }

    const nuclearGeo = new THREE.IcosahedronGeometry(1.18, 2);
    const nuclearWire = new THREE.WireframeGeometry(nuclearGeo);
    const nuclearMat = new THREE.LineBasicMaterial({
      color: 0x5c7c73,
      transparent: true,
      opacity: 0.28,
    });
    const nuclearMesh = new THREE.LineSegments(nuclearWire, nuclearMat);
    nuclearMesh.scale.set(1.45, 0.92, 0.92);
    rootGroup.add(nuclearMesh);

    const lincMat = new THREE.LineBasicMaterial({
      color: ACC_HEX,
      transparent: true,
      opacity: 0.72,
    });
    const pulseGeo = new THREE.SphereGeometry(0.036, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xfde2a3 });

    [1, 2].forEach((ringIdx) => {
      ringVertices[ringIdx].forEach((outerPt, k) => {
        const innerPt = outerPt.clone().normalize().multiplyScalar(1.06);
        innerPt.x *= 1.35;
        rootGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([outerPt, innerPt]), lincMat));

        const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
        rootGroup.add(pulseMesh);
        lincPulses.push({
          mesh: pulseMesh,
          start: outerPt.clone(),
          end: innerPt.clone(),
          offset: (ringIdx * 0.37 + k * 0.16) % 1,
        });
      });
    });

    const helixSamples = 120;
    const geoA = new THREE.BufferGeometry();
    const geoB = new THREE.BufferGeometry();
    geoA.setAttribute('position', new THREE.BufferAttribute(new Float32Array(helixSamples * 3), 3));
    geoB.setAttribute('position', new THREE.BufferAttribute(new Float32Array(helixSamples * 3), 3));

    helixStrandA = new THREE.Line(geoA, new THREE.LineBasicMaterial({ color: PRI_HEX }));
    helixStrandB = new THREE.Line(geoB, new THREE.LineBasicMaterial({ color: ACC_HEX }));
    rootGroup.add(helixStrandA);
    rootGroup.add(helixStrandB);

    helixRungsGroup = new THREE.Group();
    const rungMat = new THREE.LineBasicMaterial({
      color: ACC_HEX,
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < 24; i++) {
      const rGeo = new THREE.BufferGeometry();
      rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      helixRungsGroup.add(new THREE.Line(rGeo, rungMat));
    }
    rootGroup.add(helixRungsGroup);

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', (e) => {
      orbit.isDragging = true;
      orbit.prevX = e.clientX;
      orbit.prevY = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!orbit.isDragging) return;
      const dx = e.clientX - orbit.prevX;
      const dy = e.clientY - orbit.prevY;
      orbit.prevX = e.clientX;
      orbit.prevY = e.clientY;
      orbit.theta -= dx * 0.008;
      orbit.phi = Math.max(0.25, Math.min(Math.PI - 0.25, orbit.phi - dy * 0.008));
      updateCameraTransform();
    });
    window.addEventListener('mouseup', () => { orbit.isDragging = false; });

    domEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        orbit.isDragging = true;
        orbit.prevX = e.touches[0].clientX;
        orbit.prevY = e.touches[0].clientY;
      }
    }, { passive: true });
    domEl.addEventListener('touchmove', (e) => {
      if (!orbit.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - orbit.prevX;
      const dy = e.touches[0].clientY - orbit.prevY;
      orbit.prevX = e.touches[0].clientX;
      orbit.prevY = e.touches[0].clientY;
      orbit.theta -= dx * 0.009;
      orbit.phi = Math.max(0.25, Math.min(Math.PI - 0.25, orbit.phi - dy * 0.009));
      updateCameraTransform();
    }, { passive: true });
    domEl.addEventListener('touchend', () => { orbit.isDragging = false; });

    domEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      orbit.radius = Math.max(3.6, Math.min(10.5, orbit.radius + e.deltaY * 0.004));
      updateCameraTransform();
    }, { passive: false });
  }

  btnAutoOrbit.addEventListener('click', () => {
    state.autoOrbit = !state.autoOrbit;
    btnAutoOrbit.textContent = state.autoOrbit ? 'ORBIT: AUTO' : 'ORBIT: MANUAL';
    btnAutoOrbit.classList.toggle('active', state.autoOrbit);
  });

  btnResetCam.addEventListener('click', () => {
    orbit.theta = 0.55;
    orbit.phi = 1.18;
    orbit.radius = 6.4;
    updateCameraTransform();
  });

  function resizeThreeViewport() {
    if (!renderer || !camera || !threeContainer) return;
    const rect = threeContainer.getBoundingClientRect();
    const width = Math.max(260, rect.width);
    const height = Math.max(200, rect.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function updateAndRenderThree(elapsedSec) {
    if (!renderer || !scene || !camera) return;

    if (state.autoOrbit && !orbit.isDragging) {
      orbit.theta += 0.0035;
      updateCameraTransform();
    }

    const highStrain = state.strain > 0.70;
    const targetNodeHex = highStrain ? ACC_HEX : PRI_HEX;
    nodeMeshes.forEach((m) => m.material.color.setHex(targetNodeHex));
    if (scaffoldMat) {
      scaffoldMat.color.setHex(highStrain ? ACC_HEX : PRI_HEX);
      scaffoldMat.opacity = highStrain ? 0.62 : 0.45;
    }

    const speed = 0.35 + state.strain * 0.85;
    lincPulses.forEach((p) => {
      const alpha = (elapsedSec * speed + p.offset) % 1.0;
      p.mesh.position.lerpVectors(p.start, p.end, alpha);
      p.mesh.visible = state.mode === '5IR';
    });

    if (helixStrandA && helixStrandB && helixRungsGroup) {
      const posA = helixStrandA.geometry.attributes.position.array;
      const posB = helixStrandB.geometry.attributes.position.array;
      const samples = posA.length / 3;

      const rLocal = 0.28 * (1.0 - state.strain * 0.22);
      const rWrithe = 0.045 * state.wr;
      const twistTurns = state.tw * 0.85;

      for (let i = 0; i < samples; i++) {
        const u = i / (samples - 1);
        const x = (u * 2.0 - 1.0) * 1.38;
        const superAngle = u * Math.PI * 2.5 - elapsedSec * 1.1;
        const ySuper = Math.sin(superAngle) * rWrithe;
        const zSuper = Math.cos(superAngle) * rWrithe;
        const theta = u * Math.PI * 2 * twistTurns - elapsedSec * 1.8;

        const idx = i * 3;
        posA[idx] = x;
        posA[idx + 1] = ySuper + Math.sin(theta) * rLocal;
        posA[idx + 2] = zSuper + Math.cos(theta) * rLocal;

        posB[idx] = x;
        posB[idx + 1] = ySuper + Math.sin(theta + Math.PI) * rLocal;
        posB[idx + 2] = zSuper + Math.cos(theta + Math.PI) * rLocal;
      }

      helixStrandA.geometry.attributes.position.needsUpdate = true;
      helixStrandB.geometry.attributes.position.needsUpdate = true;

      const rungs = helixRungsGroup.children;
      for (let r = 0; r < rungs.length; r++) {
        const sampleIdx = Math.floor((r / (rungs.length - 1)) * (samples - 1)) * 3;
        const arr = rungs[r].geometry.attributes.position.array;
        arr[0] = posA[sampleIdx];
        arr[1] = posA[sampleIdx + 1];
        arr[2] = posA[sampleIdx + 2];
        arr[3] = posB[sampleIdx];
        arr[4] = posB[sampleIdx + 1];
        arr[5] = posB[sampleIdx + 2];
        rungs[r].geometry.attributes.position.needsUpdate = true;
      }
    }

    renderer.render(scene, camera);
  }

  // 4. COLLAPSIBLE BRAID CUDA-Q SPATIAL TRANSCRIPTOMICS HEATMAP (16x6)
  const heatmapGrid = $('blHeatmapGrid');
  const cellInspector = $('blCellInspector');
  const heatmapSummaryBadge = $('blHeatmapSummary');
  const btnToggleDrawer = $('blToggleDrawer');
  const heatmapDrawerBody = $('blDrawerBody');
  const drawerChevron = $('blDrawerChevron');

  const ROWS = 6;
  const COLS = 16;
  const cellRecords = [];

  function buildHeatmapGrid() {
    if (!heatmapGrid) return;
    heatmapGrid.textContent = '';
    cellRecords.length = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const cellEl = document.createElement('div');
        cellEl.className = 'bl-cell';

        const radialDist = Math.hypot((c - 7.5) / 7.5, (r - 2.5) / 2.5);
        const record = {
          id: `OST-${String(idx + 1).padStart(3, '0')}`,
          row: r + 1,
          col: c + 1,
          radialDist,
          el: cellEl,
        };

        const inspectCell = () => {
          const is5IR = state.mode === '5IR';
          const coh = is5IR
            ? Math.max(76, Math.min(99.4, 96.5 - radialDist * 11 + state.strain * 3.5)).toFixed(1)
            : Math.max(18, Math.min(62, 54 - radialDist * 24)).toFixed(1);
          const lineage = is5IR
            ? (radialDist < 0.55 ? 'PHASE-LOCKED OSTEOCYTE' : 'ACTIVE OSTEOBLAST')
            : (radialDist > 0.65 ? 'SENESCENT DRIFT (H¹ VOID)' : 'SASP STRESS STATE');
          const localWr = (state.wr * (0.85 + 0.3 * (1 - radialDist))).toFixed(2);

          cellInspector.textContent =
            `[${record.id} | R${record.row}:C${record.col}] ${lineage} • COHERENCE: ${coh}% • LOCAL Wr: ${localWr}`;
        };

        cellEl.addEventListener('mouseenter', inspectCell);
        cellEl.addEventListener('click', inspectCell);

        heatmapGrid.appendChild(cellEl);
        cellRecords.push(record);
      }
    }
  }

  function updateHeatmapVisuals() {
    if (cellRecords.length === 0) return;

    let coherentCount = 0;
    const is5IR = state.mode === '5IR';

    cellRecords.forEach((rec, i) => {
      const wave = Math.sin(i * 0.65 + state.wr * 0.9);
      if (is5IR) {
        if (state.strain > 0.78 && rec.radialDist > 0.85 && wave > 0.25) {
          rec.el.style.backgroundColor = 'rgba(241, 184, 74, 0.78)';
          rec.el.style.boxShadow = '0 0 6px rgba(241, 184, 74, 0.45)';
        } else if (rec.radialDist < 0.62 || wave > -0.2) {
          rec.el.style.backgroundColor = 'rgba(124, 240, 196, 0.82)';
          rec.el.style.boxShadow = '0 0 5px rgba(124, 240, 196, 0.25)';
          coherentCount++;
        } else {
          rec.el.style.backgroundColor = 'rgba(72, 168, 134, 0.62)';
          rec.el.style.boxShadow = 'none';
          coherentCount++;
        }
      } else {
        if (rec.radialDist > 0.52 || wave < 0.15) {
          rec.el.style.backgroundColor = wave < -0.35
            ? 'rgba(42, 54, 58, 0.82)'
            : 'rgba(241, 184, 74, 0.72)';
          rec.el.style.boxShadow = 'none';
        } else {
          rec.el.style.backgroundColor = 'rgba(72, 168, 134, 0.45)';
          rec.el.style.boxShadow = 'none';
          coherentCount++;
        }
      }
    });

    const pct = ((coherentCount / cellRecords.length) * 100).toFixed(1);
    heatmapSummaryBadge.textContent = is5IR
      ? `COHERENT OSTEOCYTES: ${pct}%`
      : `COHERENT OSTEOCYTES: ${pct}% [SENESCENCE DRIFT]`;
    heatmapSummaryBadge.style.color = is5IR ? PRI : ACC;
  }

  btnToggleDrawer.addEventListener('click', () => {
    state.drawerOpen = !state.drawerOpen;
    heatmapDrawerBody.hidden = !state.drawerOpen;
    drawerChevron.textContent = state.drawerOpen ? 'HIDE ▲' : 'EXPAND ▼';
  });

  // 5. ANIMATION LOOP & RESIZE
  let startTimestamp = 0;
  function loop(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const elapsedSec = (timestamp - startTimestamp) * 0.001;
    renderMicroScope();
    renderDnaCanvas();
    updateAndRenderThree(elapsedSec);
    requestAnimationFrame(loop);
  }

  buildHeatmapGrid();
  resizeDnaCanvas();
  initThreeScene();
  resizeThreeViewport();
  syncStateAndUI();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      resizeDnaCanvas();
      resizeThreeViewport();
    });
    ro.observe(dnaWrap);
    if (threeContainer) ro.observe(threeContainer);
  } else {
    window.addEventListener('resize', () => {
      resizeDnaCanvas();
      resizeThreeViewport();
    });
  }

  requestAnimationFrame(loop);
}
