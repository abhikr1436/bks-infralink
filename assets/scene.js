// Scroll-driven 3D: a real Ø63 trench in Mohan Colony rises to an aerial view,
// then flattens into the as-built drawing of the same streets.
// Geometry comes from the client's DWG (assets/scene.json), so the final
// top-down frame lines up exactly with the drawing image.
import * as THREE from "./vendor/three.module.min.js";

const C = {
  haze: new THREE.Color("#e9cdb8"), ink: new THREE.Color("#1b2130"),
  pe: new THREE.Color("#f5c400"), blue: new THREE.Color("#9fb5ff"),
  sand: new THREE.Color("#e9cdb8"), soil: new THREE.Color("#5b4334"),
  road: new THREE.Color("#8d7b6c"),
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (p, a, b) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function soilTexture() {
  const s = 256, c = document.createElement("canvas"); c.width = c.height = s;
  const g = c.getContext("2d"), img = g.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const n = Math.random() * 38 + (Math.random() < .04 ? 40 : 0);
    img.data[i * 4] = 182 + n * .6; img.data[i * 4 + 1] = 146 + n * .5; img.data[i * 4 + 2] = 118 + n * .4; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function flowTexture() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 4;
  const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, "#fff"); gr.addColorStop(.5, "#fff"); gr.addColorStop(.62, "#fffbe6"); gr.addColorStop(.7, "#fff"); gr.addColorStop(1, "#fff");
  g.fillStyle = "#cfcfcf"; g.fillRect(0, 0, 128, 4); g.fillStyle = gr; g.fillRect(56, 0, 40, 4);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
}

// flat strip along a polyline (x,z), width w, at height y; uv.x = distance / uvLen
function ribbon(pts, w, y, uvLen = 10) {
  const pos = [], uv = [], idx = []; let d = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    if (i) d += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    pos.push(p[0] - dz * w / 2, y, p[1] + dx * w / 2, p[0] + dz * w / 2, y, p[1] - dx * w / 2);
    uv.push(d / uvLen, 0, d / uvLen, 1);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// triangular soil heap beside a trench: from offset o0 to o1, peak height h
function heap(pts, o0, o1, h) {
  const pos = [], uv = [], idx = []; let d = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    if (i) d += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    const nx = -dz, nz = dx, om = (o0 + o1) / 2, wob = h * (.85 + .15 * Math.sin(d * 1.7));
    pos.push(p[0] + nx * o0, 0, p[1] + nz * o0, p[0] + nx * om, wob, p[1] + nz * om, p[0] + nx * o1, 0, p[1] + nz * o1);
    uv.push(d / 3, 0, d / 3, .5, d / 3, 1);
    if (i) { const k = i * 3; idx.push(k - 3, k - 2, k, k - 2, k + 1, k, k - 2, k - 1, k + 1, k - 1, k + 2, k + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal.array; for (let k = 1; k < n.length; k += 3) n[k] = Math.abs(n[k]) + .2; // keep faces lit at sharp turns
  return g;
}
const len = pts => pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);

export async function init(canvas, drawingURL) {
  const [data, drawTex] = await Promise.all([
    fetch("assets/scene.json").then(r => r.json()),
    new THREE.TextureLoader().loadAsync(drawingURL),
  ]);
  drawTex.colorSpace = THREE.SRGBColorSpace; drawTex.anisotropy = 8;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.haze.clone(), 30, 420);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 4000);

  scene.add(new THREE.HemisphereLight("#fff4e4", "#7a5a44", 1.1));
  const sun = new THREE.DirectionalLight("#ffd7ad", 2.6);
  sun.position.set(-180, 160, 120); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, far: 800 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005; sun.shadow.normalBias = .4;
  scene.add(sun);

  // ground
  const soil = soilTexture(); soil.repeat.set(220, 220);
  const groundM = new THREE.MeshStandardMaterial({ map: soil, roughness: 1, transparent: true });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), groundM);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // the actual drawing, sized to the same footprint
  const drawM = new THREE.MeshBasicMaterial({ map: drawTex, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const drawing = new THREE.Mesh(new THREE.PlaneGeometry(data.w, data.d), drawM);
  drawing.rotation.x = -Math.PI / 2; drawing.position.y = .05; drawing.renderOrder = 5; scene.add(drawing);

  // roads
  const roadM = new THREE.MeshStandardMaterial({ color: C.road, roughness: .95, transparent: true, side: THREE.DoubleSide });
  data.roads.forEach(r => { const m = new THREE.Mesh(ribbon(r, 6.5, .012), roadM); m.receiveShadow = true; scene.add(m); });

  // houses, extruded from plot outlines
  const houses = new THREE.Group(), tones = ["#e7c9b1", "#d8b096", "#efe0d2", "#c99c82", "#e2bfa6"].map(c => new THREE.Color(c));
  const houseMats = tones.map(c => new THREE.MeshStandardMaterial({ color: c.clone(), roughness: .92 }));
  const edgePos = [];
  data.houses.forEach((h, i) => {
    const shape = new THREE.Shape(h.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: h.h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, houseMats[i % houseMats.length]); m.material.side = THREE.DoubleSide; m.castShadow = m.receiveShadow = true; houses.add(m);
    const e = new THREE.EdgesGeometry(g, 30).attributes.position.array; for (let k = 0; k < e.length; k++) edgePos.push(e[k]);
  });
  const edgeG = new THREE.BufferGeometry(); edgeG.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3));
  const edgeM = new THREE.LineBasicMaterial({ color: "#6b5444", transparent: true, opacity: .35 });
  houses.add(new THREE.LineSegments(edgeG, edgeM));
  scene.add(houses);

  // pipes: real tubes in open trenches, and flat "drawn" ribbons
  const tubeM = new THREE.MeshPhysicalMaterial({ color: C.pe, roughness: .32, clearcoat: .6, clearcoatRoughness: .25, transparent: true });
  const trenchM = new THREE.MeshStandardMaterial({ color: "#3d2a1f", roughness: 1, transparent: true, side: THREE.DoubleSide });
  const spoilM = new THREE.MeshStandardMaterial({ map: soil, color: "#b48a6c", roughness: 1, transparent: true, side: THREE.DoubleSide });
  const flow = flowTexture();
  const ribM = { p63: new THREE.MeshBasicMaterial({ color: C.pe.clone(), map: flow, transparent: true, opacity: 0, fog: false, depthWrite: false, side: THREE.DoubleSide }) };
  ribM.p32 = ribM.p63.clone(); ribM.p20 = ribM.p63.clone(); ribM.p90 = ribM.p63.clone();
  const tubes = new THREE.Group(), ribbons = new THREE.Group();
  let main = null;
  data.pipes.forEach(({ b, p }) => {
    const L = len(p);
    if (b === "p63" && (!main || L > main.L)) main = { p, L };
    const r = b === "p63" ? .07 : .045;
    const path = new THREE.CurvePath(); for (let i = 1; i < p.length; i++) path.add(new THREE.LineCurve3(V(p[i - 1][0], r + .02, p[i - 1][1]), V(p[i][0], r + .02, p[i][1])));
    const t = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(8, Math.ceil(L / 1.5)), r, 16, false), tubeM); t.castShadow = true; tubes.add(t);
    const tr = new THREE.Mesh(ribbon(p, .55, .012), trenchM); tr.receiveShadow = true; tubes.add(tr);
    const sp = new THREE.Mesh(heap(p, .4, 1.3, .38), spoilM); sp.castShadow = sp.receiveShadow = true; tubes.add(sp);
    const rb = new THREE.Mesh(ribbon(p, b === "p63" ? 2.2 : 1.6, .2, 14), ribM[b] || ribM.p63); rb.renderOrder = 6; ribbons.add(rb);
  });
  scene.add(tubes, ribbons);

  // camera path, anchored on the longest Ø63 run
  let best = null;
  data.pipes.filter(q => q.b === "p63").forEach(({ p }) => { for (let i = 1; i < p.length; i++) { const s = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (!best || s > best.s) best = { a: p[i - 1], b: p[i], s }; } });
  const { a, b } = best;
  const dir = V(b[0] - a[0], 0, b[1] - a[1]).normalize(), side = V(-dir.z, 0, dir.x);
  const P0 = V(a[0], 0, a[1]).addScaledVector(dir, best.s * .12);
  const at = (f, s, u) => P0.clone().addScaledVector(dir, f).addScaledVector(side, s).setY(u);
  let topH = 400;
  const keys = () => [
    { t: 0, pos: at(-2.5, -.9, 1.55), look: at(9, .15, 0) },
    { t: .14, pos: at(1.5, -1.1, 2.2), look: at(16, 0, 0) },
    { t: .38, pos: at(-45, 38, 34), look: at(45, 0, 0) },
    { t: .58, pos: V(-60, 240, 260), look: V(0, 0, 0) },
    { t: .76, pos: V(0, topH, .01), look: V(0, 0, 0) },
    { t: 1, pos: V(0, topH, .01), look: V(0, 0, 0) },
  ];
  let K = keys();
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    topH = camera.aspect < 1 ? data.d / 2 / tan * .95 : Math.max(data.d / 2 / tan, data.w / 2 / (tan * camera.aspect)) * 1.06; K = keys();
  };
  resize(); addEventListener("resize", resize);

  const pos = V(), look = V(), ink = C.ink, haze = C.haze;
  let progress = 0, time = 0, last = performance.now(), running = true;
  const sample = p => {
    let k = 0; while (k < K.length - 2 && p > K[k + 1].t) k++;
    const A = K[k], B = K[k + 1], t = ramp(p, A.t, B.t);
    pos.lerpVectors(A.pos, B.pos, t); look.lerpVectors(A.look, B.look, t);
  };

  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
    if (running) {
      const p = progress;
      sample(p);
      const sway = (1 - ramp(p, .1, .3));            // handheld drift near the trench
      pos.x += Math.sin(time * .6) * .08 * sway; pos.y += Math.sin(time * .9) * .05 * sway;
      camera.position.copy(pos); camera.lookAt(look);

      const toInk = ramp(p, .6, .78);
      scene.fog.color.copy(haze).lerp(ink, toInk);
      scene.fog.near = THREE.MathUtils.lerp(30, 2000, ramp(p, .3, .6)); scene.fog.far = THREE.MathUtils.lerp(420, 4000, ramp(p, .3, .6));

      const real = 1 - ramp(p, .3, .44);
      tubeM.opacity = trenchM.opacity = spoilM.opacity = real; tubes.visible = real > .01;
      const drawn = ramp(p, .3, .44) * (1 - ramp(p, .86, .95));
      ribM.p63.opacity = drawn; ribM.p32.opacity = ribM.p20.opacity = ribM.p90.opacity = drawn;
      const recolor = ramp(p, .58, .72);
      ribM.p32.color.copy(C.pe).lerp(C.blue, recolor); ribM.p20.color.copy(C.pe).lerp(new THREE.Color("#7fe0c6"), recolor);
      flow.offset.x -= dt * .35;

      const flat = ramp(p, .64, .8);
      houses.scale.y = Math.max(.002, 1 - flat);
      houseMats.forEach((m, j) => m.color.copy(tones[j]).lerp(ink, flat));
      edgeM.color.set("#6b5444").lerp(C.sand, toInk); edgeM.opacity = .35 + .2 * toInk;
      houses.visible = ramp(p, .84, .92) < 1;
      edgeM.opacity *= 1 - ramp(p, .84, .92);
      groundM.opacity = 1 - ramp(p, .64, .78); roadM.opacity = groundM.opacity;
      ground.visible = groundM.opacity > .01;
      drawM.opacity = ramp(p, .76, .9);
      sun.castShadow = p < .7;

      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    set progress(p) { progress = clamp(p); },
    set running(v) { running = v; },
    height: () => camera.position.y,
  };
}
