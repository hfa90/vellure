/* =====================================================================
   VELLURE 3D · a Box Misteriosa: caixa de veludo com laço de ouro que
   respira, gira com o cursor, se abre ao toque e se enche de luz
   conforme a cliente monta o perfil
   ===================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export function createBox(canvas) {
  const mobile = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(innerWidth / innerHeight < 0.8 ? 46 : 34, innerWidth / innerHeight, 0.1, 60);
  camera.position.set(0, 1.1, 7.2);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.AmbientLight('#ffe2e6', 0.35));
  const key = new THREE.DirectionalLight('#fff0dc', 2.2); key.position.set(3, 5, 4); scene.add(key);
  const rose = new THREE.PointLight('#ff8fa8', 5, 12, 1.6); rose.position.set(-2.5, 1.5, 3); scene.add(rose);

  /* ---------- materiais ---------- */
  const velvet = new THREE.MeshPhysicalMaterial({ color: '#2c0b18', roughness: 0.8, metalness: 0, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color('#b85a76'), envMapIntensity: 0.5 });
  const velvetIn = new THREE.MeshPhysicalMaterial({ color: '#1a0710', roughness: 1, sheen: 1, sheenColor: new THREE.Color('#a8455f'), side: THREE.BackSide });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#e0b973', metalness: 1, roughness: 0.22, clearcoat: 0.7, envMapIntensity: 1.3 });
  const satin = new THREE.MeshPhysicalMaterial({ color: '#e9c48a', metalness: 0.65, roughness: 0.32, sheen: 1, sheenColor: new THREE.Color('#fff2d0'), envMapIntensity: 1.2 });

  /* ---------- caixa ---------- */
  const W = 1.7, H = 1.05, D = 1.7, LH = 0.3;
  const box = new THREE.Group(); scene.add(box);
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 5, 0.06), velvet); base.position.y = H / 2; box.add(base);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, H * 0.96, D * 0.94), velvetIn); inner.position.y = H / 2 + 0.03; box.add(inner);
  // luz que sai de dentro
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.86, 0.62), transparent: true, opacity: 0 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, D * 0.9), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.y = H - 0.02; box.add(glow);
  const innerLight = new THREE.PointLight('#ffd59a', 0, 6, 1.5); innerLight.position.set(0, H + 0.2, 0); box.add(innerLight);
  // seda dentro (aparece ao abrir)
  const silkG = new THREE.PlaneGeometry(W * 0.86, D * 0.86, 30, 30);
  { const p = silkG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 4 + y * 2) * 0.05 + Math.cos(y * 5) * 0.04); } silkG.computeVertexNormals(); }
  const silk = new THREE.Mesh(silkG, new THREE.MeshPhysicalMaterial({ color: '#f2c6cf', roughness: 0.35, sheen: 1, sheenColor: new THREE.Color('#fff'), side: THREE.DoubleSide }));
  silk.rotation.x = -Math.PI / 2; silk.position.y = H - 0.12; box.add(silk);

  // fitas da base
  const band = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), satin); m.position.set(x, y, z); return m; };
  box.add(band(0.2, H + 0.004, D + 0.012, 0, H / 2, 0), band(W + 0.012, H + 0.004, 0.2, 0, H / 2, 0));

  // tampa com dobradiça atrás
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, H, -D / 2 - 0.03); box.add(lidPivot);
  const lid = new THREE.Group(); lid.position.set(0, 0, D / 2 + 0.03); lidPivot.add(lid);
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(W + 0.08, LH, D + 0.08, 5, 0.07), velvet); lidMesh.position.y = LH / 2 - 0.08; lid.add(lidMesh);
  lid.add(band(0.21, LH + 0.006, D + 0.09, 0, LH / 2 - 0.08, 0), band(W + 0.09, LH + 0.006, 0.21, 0, LH / 2 - 0.08, 0));
  // laço
  const bow = new THREE.Group(); bow.position.y = LH - 0.02; lid.add(bow);
  const loopG = new THREE.TorusGeometry(0.26, 0.06, 18, 60);
  const l1 = new THREE.Mesh(loopG, satin); l1.scale.set(1.25, 0.62, 1); l1.position.set(-0.3, 0.12, 0); l1.rotation.set(0.25, 0.35, 0.35); bow.add(l1);
  const l2 = new THREE.Mesh(loopG, satin); l2.scale.set(1.25, 0.62, 1); l2.position.set(0.3, 0.12, 0); l2.rotation.set(0.25, -0.35, -0.35); bow.add(l2);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), satin); knot.scale.set(1.2, 0.9, 1); knot.position.y = 0.1; bow.add(knot);
  const tailG = new THREE.BoxGeometry(0.16, 0.012, 0.6);
  const t1 = new THREE.Mesh(tailG, satin); t1.position.set(-0.16, 0.03, 0.3); t1.rotation.y = 0.45; bow.add(t1);
  const t2 = new THREE.Mesh(tailG, satin); t2.position.set(0.16, 0.03, 0.3); t2.rotation.y = -0.45; bow.add(t2);
  // monograma dourado na frente da tampa
  const mono = new THREE.Group(); mono.position.set(0, LH / 2 - 0.08, D / 2 + 0.045); lid.add(mono);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 8, 64), gold); mono.add(ring);
  const S = (x, y) => new THREE.Vector3((x - 50) / 460, -(y - 50) / 460, 0);
  const vL = new THREE.CubicBezierCurve3(S(24, 26), S(36, 32), S(44, 56), S(50, 78)), vR = new THREE.CubicBezierCurve3(S(76, 26), S(64, 32), S(56, 56), S(50, 78));
  mono.add(new THREE.Mesh(new THREE.TubeGeometry(vL, 30, 0.006, 6), gold), new THREE.Mesh(new THREE.TubeGeometry(vR, 30, 0.0035, 6), gold));

  box.position.set(0, -0.55, 0);

  /* ---------- poeira dourada / estouro ---------- */
  const PN = mobile ? 500 : 1100;
  const pPos = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('aLife', new THREE.BufferAttribute(pLife, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: 40 * dpr } },
    vertexShader: 'uniform float uSize; attribute float aLife; varying float vL; void main(){ vL = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * (.3 + aLife) / -mv.z; }',
    fragmentShader: 'varying float vL; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1., .85, .55) * 1.4, a * a * vL); }'
  });
  const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; box.add(pts);
  let pNext = 0;
  function burst(n = 120, power = 1) {
    for (let k = 0; k < n; k++) {
      const i = pNext; pNext = (pNext + 1) % PN;
      pPos.set([(Math.random() - 0.5) * W * 0.7, H + 0.05, (Math.random() - 0.5) * D * 0.7], i * 3);
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.9;
      pVel.set([Math.cos(a) * r * power, (1.2 + Math.random() * 2.2) * power, Math.sin(a) * r * power], i * 3);
      pLife[i] = 1;
    }
  }
  // poeira ambiente
  const DN = mobile ? 200 : 420, dP = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) dP.set([(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, -4 + Math.random() * 6], i * 3);
  const dG = new THREE.BufferGeometry(); dG.setAttribute('position', new THREE.BufferAttribute(dP, 3));
  const dust = new THREE.Points(dG, new THREE.PointsMaterial({ color: '#f3d29b', size: 0.025, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);

  /* ---------- feixe de luz que sai da caixa ---------- */
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uO: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uO, uT; varying vec2 vUv; void main(){ float a = pow(1. - vUv.y, 1.6) * (.55 + .45 * sin(vUv.x * 40. + uT * 2.) * .5 + .25); float k = clamp(a * uO, 0., 1.); gl_FragColor = vec4(vec3(1., .82, .55) * k, k); }'
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.72, 2.6, 48, 1, true), beamMat);
  beam.position.y = H + 1.3; box.add(beam);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.4, D * 1.4), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uO: beamMat.uniforms.uO },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uO; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.; float k = smoothstep(1., 0., d) * uO * .8; gl_FragColor = vec4(vec3(1., .78, .5) * k, k); }' }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = H + 0.01; box.add(halo);

  /* ---------- estado ---------- */
  const st = { open: 0, openT: 0, fill: 0, x: 0, y: -0.55, s: 1, spin: 0, shake: 0, mx: 0, my: 0, drag: null, vel: 0 };
  const target = { x: 0, y: -0.55, s: 1 };
  addEventListener('pointermove', (e) => {
    st.mx = (e.clientX / innerWidth) * 2 - 1; st.my = -(e.clientY / innerHeight) * 2 + 1;
    if (st.drag) { st.vel = (e.clientX - st.drag) * 0.01; st.drag = e.clientX; }
  }, { passive: true });
  const ray = new THREE.Raycaster();
  function hitBox(e) {
    ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    return ray.intersectObject(box, true).length > 0;
  }
  let downX = 0;
  canvas.addEventListener('pointerdown', (e) => { if (!hitBox(e)) return; st.drag = e.clientX; downX = e.clientX; });
  addEventListener('pointerup', (e) => { if (st.drag !== null && Math.abs(e.clientX - downX) < 6) api.peek(); st.drag = null; });
  canvas.addEventListener('pointermove', (e) => { canvas.style.cursor = hitBox(e) ? 'pointer' : ''; });

  const clock = new THREE.Clock();
  let running = true, acc = 0, frames = 0, last = performance.now();
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    st.x = damp(st.x, target.x, 3, dt); st.y = damp(st.y, target.y, 3, dt); st.s = damp(st.s, target.s, 3, dt);
    if (!st.drag) st.vel *= Math.pow(0.05, dt);
    st.spin += st.vel + dt * 0.15;
    box.position.set(st.x + Math.sin(st.shake * 40) * 0.04 * st.shake, st.y + Math.sin(t * 1.1) * 0.06, 0);
    box.scale.setScalar(st.s);
    box.rotation.y = damp(box.rotation.y, st.spin + st.mx * 0.5 - 0.5, 6, dt);
    box.rotation.x = damp(box.rotation.x, 0.22 - st.my * 0.12, 6, dt);
    box.rotation.z = Math.sin(st.shake * 30) * 0.05 * st.shake;
    st.shake = Math.max(0, st.shake - dt * 1.4);
    // abrir tampa
    if (st.openT > 0) { st.openT -= dt; if (st.openT <= 0) st.open = 0; }
    lidPivot.rotation.x = damp(lidPivot.rotation.x, -st.open * 1.9, st.open ? 3.2 : 5, dt);
    const op = clamp(-lidPivot.rotation.x / 1.9, 0, 1);
    glowMat.opacity = op * (0.55 + st.fill * 0.45);
    innerLight.intensity = op * 6 + st.fill * 1.5;
    bow.rotation.y = Math.sin(t * 0.8) * 0.06;
    rose.position.x = -2.5 + st.mx * 1.5;
    // partículas
    for (let i = 0; i < PN; i++) {
      if (pLife[i] <= 0) continue;
      pVel[i * 3 + 1] -= dt * 1.6;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      pLife[i] -= dt * 0.55;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.aLife.needsUpdate = true;
    dust.rotation.y = t * 0.01; dust.position.y = Math.sin(t * 0.2) * 0.2;
    beamMat.uniforms.uO.value = op * (0.45 + st.fill * 0.35); beamMat.uniforms.uT.value = t; beam.visible = halo.visible = op > 0.01;
    renderer.render(scene, camera);
    // resolução dinâmica
    const now = performance.now(); acc += now - last; last = now; frames++;
    if (frames >= 45) { const avg = acc / frames; acc = 0; frames = 0; if (avg > 24 && dpr > 0.75) { dpr -= 0.25; renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); } }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 46 : 34; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  });

  const api = {
    /** espiar: a caixa treme, abre e solta brilho */
    peek(hold = 2.6) { st.shake = 1; setTimeout(() => { st.open = 1; st.openT = hold; burst(220, 1.1); }, 380); },
    /** cada resposta do perfil enche a caixa de luz */
    fill(v) { const up = v > st.fill; st.fill = clamp(v, 0, 1); if (up) { st.open = 0.35; st.openT = 0.9; burst(60, 0.7); } },
    /** posição na tela conforme a seção */
    place(x, y, s) { target.x = x; target.y = y; target.s = s; },
    celebrate() { st.open = 1; st.openT = 4.5; burst(400, 1.5); setTimeout(() => burst(260, 1.2), 600); }
  };
  return api;
}
