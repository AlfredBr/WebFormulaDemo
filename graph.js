// Simple 2D function plotter using three.js (orthographic camera)
// Exposes a global `appGraph` with init, setData, resize methods.
(function () {
  const state = {
    container: null,
    renderer: null,
    scene: null,
    camera: null,
    line: null,
    axes: null,
    grid: null,
    marker: null,
    data: [],
    range: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
  dpi: window.devicePixelRatio || 1,
  sampleStepX: null,
  sampleStartX: null
  };

  function createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(state.dpi);
    container.appendChild(renderer.domElement);
    return renderer;
  }

  function calcRange(data) {
    if (!data || data.length === 0) return { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of data) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.fx < yMin) yMin = p.fx;
      if (p.fx > yMax) yMax = p.fx;
    }
    // Pad ranges by 5%
    const xPad = (xMax - xMin) * 0.05 || 1;
    const yPad = (yMax - yMin) * 0.10 || 1;
    return { xMin: xMin - xPad, xMax: xMax + xPad, yMin: yMin - yPad, yMax: yMax + yPad };
  }

  function createCamera(range, width, height) {
    const cam = new THREE.OrthographicCamera(range.xMin, range.xMax, range.yMax, range.yMin, -100, 100);
    cam.position.set(0, 0, 10);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    return cam;
  }

  function createAxes(range) {
    const g = new THREE.Group();
    const matAxis = new THREE.LineBasicMaterial({ color: 0x222222, linewidth: 3 });

    // X axis
    const geoX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(range.xMin, 0, 0),
      new THREE.Vector3(range.xMax, 0, 0)
    ]);
    const xAxis = new THREE.Line(geoX, matAxis);
    g.add(xAxis);

    // Y axis
    const geoY = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, range.yMin, 0),
      new THREE.Vector3(0, range.yMax, 0)
    ]);
    const yAxis = new THREE.Line(geoY, matAxis);
    g.add(yAxis);

    // Origin marker (crosshair)
    const originSizeX = (range.xMax - range.xMin) * 0.01;
    const originSizeY = (range.yMax - range.yMin) * 0.01;
    const matOrigin = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
    const cross1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-originSizeX, 0, 0),
      new THREE.Vector3(originSizeX, 0, 0)
    ]);
    const cross2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -originSizeY, 0),
      new THREE.Vector3(0, originSizeY, 0)
    ]);
    g.add(new THREE.Line(cross1, matOrigin));
    g.add(new THREE.Line(cross2, matOrigin));

    return g;
  }

  function createGrid(range) {
    const g = new THREE.Group();
  // Lighter and fainter grid
  const matGrid = new THREE.LineBasicMaterial({ color: 0xeef2f7, transparent: true, opacity: 0.25 });

    const xStep = (state.sampleStepX && state.sampleStepX > 0)
      ? state.sampleStepX
      : niceStep((range.xMax - range.xMin) / 10);
    const yStepRaw = (range.yMax - range.yMin) / 10;
    const yStep = niceStep(yStepRaw);

    // Align X grid lines to the data sampling start when available.
    let xStart = Math.ceil(range.xMin / xStep) * xStep;
    if (state.sampleStartX != null) {
      // Shift xStart so it's congruent to sampleStartX modulo xStep.
      const r = ((state.sampleStartX % xStep) + xStep) % xStep; // normalized remainder [0, xStep)
      const startR = ((xStart % xStep) + xStep) % xStep;
      let delta = r - startR;
      if (delta > 0) delta -= xStep; // move back to align
      xStart += delta;
      while (xStart > range.xMin) xStart -= xStep; // ensure we start before visible
    }

    for (let x = xStart; x <= range.xMax + 1e-12; x += xStep) {
      if (Math.abs(x) < 1e-9) continue; // skip axis line (drawn separately)
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, range.yMin, 0),
        new THREE.Vector3(x, range.yMax, 0)
      ]);
      g.add(new THREE.Line(geo, matGrid));
    }
    for (let y = Math.ceil(range.yMin / yStep) * yStep; y <= range.yMax + 1e-12; y += yStep) {
      if (Math.abs(y) < 1e-9) continue;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(range.xMin, y, 0),
        new THREE.Vector3(range.xMax, y, 0)
      ]);
      g.add(new THREE.Line(geo, matGrid));
    }
    return g;
  }

  function niceStep(step) {
    // Round step to 1/2/5 * 10^n
    const pow10 = Math.pow(10, Math.floor(Math.log10(step)));
    const norm = step / pow10;
    let nice;
    if (norm < 1.5) nice = 1;
    else if (norm < 3.5) nice = 2;
    else if (norm < 7.5) nice = 5;
    else nice = 10;
    return nice * pow10;
  }

  function buildLine(data) {
    const positions = new Float32Array(data.length * 3);
    for (let i = 0; i < data.length; i++) {
      positions[i * 3 + 0] = data[i].x;
      positions[i * 3 + 1] = data[i].fx;
      positions[i * 3 + 2] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x1f77b4, linewidth: 2 });
    return new THREE.Line(geo, mat);
  }

  function buildMarker() {
    const geom = new THREE.SphereGeometry(0.02, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xd62728 });
    const m = new THREE.Mesh(geom, mat);
    m.visible = false;
    return m;
  }

  function render() {
    if (!state.renderer) return;
    state.renderer.render(state.scene, state.camera);
  }

  function resize() {
    if (!state.container || !state.renderer) return;
    const w = state.container.clientWidth;
    const h = state.container.clientHeight;
    state.renderer.setSize(w, h, false);
    render();
  }

  function findNearest(x) {
    const arr = state.data;
    if (!arr || arr.length === 0) return null;
    // Binary search by x (assumes sorted by x)
    let lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].x < x) lo = mid + 1; else hi = mid - 1;
    }
    const cand = [];
    if (lo < arr.length) cand.push(arr[lo]);
    if (lo - 1 >= 0) cand.push(arr[lo - 1]);
    if (cand.length === 0) return arr[0];
    cand.sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
    return cand[0];
  }

  function onPointerMove(evt) {
    if (!state.container) return;
    const rect = state.container.getBoundingClientRect();
    const nx = (evt.clientX - rect.left) / rect.width; // 0..1
    const x = state.range.xMin + nx * (state.range.xMax - state.range.xMin);
    const p = findNearest(x);
    const readout = document.getElementById('readout');
    if (p) {
      if (state.marker) {
        state.marker.position.set(p.x, p.fx, 0);
        state.marker.visible = true;
      }
      if (readout) readout.textContent = `x: ${p.x.toFixed(2)}, f(x): ${p.fx.toFixed(2)}`;
      render();
    } else {
      if (state.marker) state.marker.visible = false;
      if (readout) readout.textContent = `x: --, f(x): --`;
      render();
    }
  }

  const appGraph = {
    init(containerId = 'graph') {
      const mount = document.getElementById(containerId);
      if (!mount) throw new Error('Graph container not found');
      // Use the container as the render area height (graph-container controls size)
      state.container = mount;
      state.scene = new THREE.Scene();
      state.renderer = createRenderer(mount);
      // Defaults (will be overridden on first setData)
      state.camera = createCamera(state.range, mount.clientWidth, mount.clientHeight);

      // Interactive elements
      state.marker = buildMarker();
      state.scene.add(state.marker);

      mount.addEventListener('mousemove', onPointerMove);
      mount.addEventListener('mouseleave', () => {
        if (state.marker) state.marker.visible = false;
        const ro = document.getElementById('readout');
        if (ro) ro.textContent = 'x: --, f(x): --';
        render();
      });
      resize();
    },

    setData(data) {
      state.data = (data || [])
        .filter(p => Number.isFinite(p.x) && Number.isFinite(p.fx))
        .slice()
        .sort((a, b) => a.x - b.x);
      state.range = calcRange(state.data);

      // Derive the sample step from data if uniformly spaced
      state.sampleStepX = null;
      state.sampleStartX = null;
      if (state.data.length >= 2) {
        // Compute min positive delta to avoid duplicates/zeros
        let minDx = Infinity;
        for (let i = 1; i < state.data.length; i++) {
          const dx = state.data[i].x - state.data[i - 1].x;
          if (dx > 1e-12 && dx < minDx) minDx = dx;
        }
        if (isFinite(minDx) && minDx > 0) {
          state.sampleStepX = minDx;
          state.sampleStartX = state.data[0].x;
        }
      }

      // Rebuild camera to fit range
      state.camera = createCamera(state.range, state.container.clientWidth, state.container.clientHeight);

      // Clear previous geometry
      if (state.line) { state.scene.remove(state.line); state.line.geometry.dispose(); }
      if (state.axes) { state.scene.remove(state.axes); }
      if (state.grid) { state.scene.remove(state.grid); }

      state.grid = createGrid(state.range);
      state.scene.add(state.grid);
      state.axes = createAxes(state.range);
      state.scene.add(state.axes);
      state.line = buildLine(state.data);
      state.scene.add(state.line);

      resize();
    },

    resize,

    destroy() {
      if (!state.renderer) return;
      state.container.removeEventListener('mousemove', onPointerMove);
      state.renderer.dispose();
      state.scene = null;
      state.camera = null;
      state.line = null;
      state.axes = null;
      state.grid = null;
      state.marker = null;
      state.renderer = null;
    }
  };

  window.appGraph = appGraph;
})();
