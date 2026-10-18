/* =====================================================================
   VELLURE 3D · mundo WebGL
   Monograma em ouro, poeira dourada, seda viva, pétalas e a
   escadaria-galeria com as fotos das modelos.
   ===================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

/* paletas da seda: base escura, tom médio, brilho */
export const PALETTES_LIGHT = {
  noir: ['#e6d9cc', '#d6bca8', '#fff8f0'],
  vinho: ['#e9d6d0', '#cfa1a4', '#fff4ee'],
  perola: ['#efe4da', '#dcc0b0', '#fffbf5'],
  rose: ['#ead7d4', '#d3a3ab', '#fff5f2']
};
export const PALETTES = {
  noir: ['#120a0f', '#3b1522', '#e9c891'],
  vinho: ['#1c060c', '#6e1b30', '#f2b9a8'],
  perola: ['#2a1a1e', '#b88a8e', '#fff0e4'],
  rose: ['#26101a', '#a55467', '#ffd9cc']
};

export function createWorld(canvas, opts = {}) {
  const mobile = Math.min(innerWidth, innerHeight) < 700;
  const isTouch = matchMedia('(hover: none)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  const DPR_MAX = Math.min(devicePixelRatio, mobile ? 1.5 : 1.5);
  let dpr = DPR_MAX;
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const theme = { light: 0, bg: new THREE.Color('#140a10') };
  scene.background = new THREE.Color('#140a10');
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(0, 0, 6);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  /* ---------- luzes ---------- */
  scene.add(new THREE.AmbientLight('#ffe9e0', 0.25));
  const key = new THREE.DirectionalLight('#fff1d8', 1.6); key.position.set(3, 4, 5); scene.add(key);
  const roseLight = new THREE.PointLight('#ff9fb2', 9, 12, 1.6); roseLight.position.set(0, 0, 2.5); scene.add(roseLight);
  const rim = new THREE.PointLight('#ffd7a0', 6, 10, 1.5); rim.position.set(-2.5, 1.5, -2); scene.add(rim);

  const params = {
    camZ: 6, camY: 0, camTilt: 0, fov: innerWidth / innerHeight < 0.8 ? 54 : 42, bloom: 0.45, scatter: 0, aberr: 0.0025,
    loadP: 0, ready: 0, logoVis: 1, logoY: 0.42, logoScale: 1, logoSpin: 0, arm: 0, dust: 1,
    silkVis: 0, silkDim: 1, touch: 0, galVis: 0, petals: 0
  };

  /* =============== MONOGRAMA EM OURO =============== */
  const logo = new THREE.Group();
  scene.add(logo);
  const S = (x, y, z = 0) => new THREE.Vector3((x - 50) / 46, -(y - 50) / 46, z);
  const bez = (a, b, c, d) => new THREE.CubicBezierCurve3(S(...a), S(...b), S(...c), S(...d));

  class Bulge extends THREE.Curve {
    constructor(path, amp) { super(); this.path = path; this.amp = amp; }
    getPoint(t, o = new THREE.Vector3()) { this.path.getPointAt(t, o); o.z += Math.sin(Math.PI * t) * this.amp; return o; }
  }
  class Circle extends THREE.Curve {
    constructor(r) { super(); this.r = r; }
    getPoint(t, o = new THREE.Vector3()) { const a = Math.PI / 2 - t * Math.PI * 2; return o.set(Math.cos(a) * this.r, Math.sin(a) * this.r, 0); }
  }
  const leftPath = new THREE.CurvePath(); leftPath.add(bez([24, 26], [34, 28], [38, 40], [44, 56])); leftPath.add(bez([44, 56], [47, 64], [49, 72], [50, 78]));
  const rightPath = new THREE.CurvePath(); rightPath.add(bez([76, 26], [66, 28], [62, 40], [56, 56])); rightPath.add(bez([56, 56], [53, 64], [51, 72], [50, 78]));
  const leftC = new Bulge(leftPath, 0.16), rightC = new Bulge(rightPath, 0.1), ringC = new Circle(1);

  const profL = (t) => 0.16 + 0.84 * Math.pow(Math.sin(Math.PI * clamp(t * 1.06, 0, 1)), 0.55);
  const profR = (t) => 0.22 + 0.78 * Math.pow(Math.sin(Math.PI * t), 0.6);
  function taperTube(curve, seg, radial, r0, prof) {
    const g = new THREE.TubeGeometry(curve, seg, r0, radial, false);
    const pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i <= seg; i++) {
      curve.getPointAt(i / seg, c); const s = prof(i / seg);
      for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(s).add(c); pos.setXYZ(k, v.x, v.y, v.z); }
    }
    g.userData = { seg, radial };
    return g;
  }
  const gold = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#dcb36e'), metalness: 1, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.1 });
  const goldPale = gold.clone(); goldPale.color = new THREE.Color('#f3dcb3'); goldPale.roughness = 0.3;
  const ringG = taperTube(ringC, 300, 14, 0.02, () => 1);
  const leftG = taperTube(leftC, 160, 18, 0.058, profL);
  const rightG = taperTube(rightC, 160, 14, 0.03, profR);
  const ring = new THREE.Mesh(ringG, gold), left = new THREE.Mesh(leftG, gold), right = new THREE.Mesh(rightG, gold);
  logo.add(ring, left, right);
  const reveal = (mesh, p) => { const { seg, radial } = mesh.geometry.userData; mesh.geometry.setDrawRange(0, Math.floor(seg * clamp(p, 0, 1)) * radial * 6); };
  [ring, left, right].forEach((m) => reveal(m, 0));

  // aros armilares que giram durante a montagem
  const arm1 = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.006, 8, 220), goldPale);
  const arm2 = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.0045, 8, 220), goldPale);
  logo.add(arm1, arm2);

  // a joia do topo
  const gemMat = new THREE.MeshPhysicalMaterial({ color: '#f6c3d0', metalness: 0.15, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 1, iridescenceIOR: 1.8, envMapIntensity: 2.4, flatShading: true });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), gemMat);
  gem.position.copy(S(50, 20)); gem.scale.setScalar(0.0001);
  logo.add(gem);
  const gemBase = new THREE.Vector3(0.105, 0.155, 0.105);

  /* ---------- partículas que formam a logo ---------- */
  const N = mobile ? 3000 : 6000;
  const aStart = new Float32Array(N * 3), aTarget = new Float32Array(N * 3), aRand = new Float32Array(N * 4);
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3(), nrm = new THREE.Vector3(), bin = new THREE.Vector3();
  function onTube(curve, r0, prof, t, out) {
    curve.getPointAt(t, out); curve.getTangentAt(t, tan);
    nrm.set(0, 0, 1).cross(tan).normalize(); bin.copy(tan).cross(nrm).normalize();
    const a = Math.random() * Math.PI * 2, r = r0 * prof(t) * (0.85 + Math.random() * 0.3);
    out.addScaledVector(nrm, Math.cos(a) * r).addScaledVector(bin, Math.sin(a) * r);
  }
  for (let i = 0; i < N; i++) {
    const k = Math.random();
    if (k < 0.4) onTube(ringC, 0.02, () => 1, Math.random(), tmp);
    else if (k < 0.72) onTube(leftC, 0.058, profL, Math.random(), tmp);
    else if (k < 0.9) onTube(rightC, 0.03, profR, Math.random(), tmp);
    else if (k < 0.95) { const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5); d.divideScalar(Math.abs(d.x) + Math.abs(d.y) + Math.abs(d.z)); tmp.copy(gem.position).add(d.multiply(gemBase)); }
    else { const a = Math.random() * Math.PI * 2; tmp.set(Math.cos(a) * 1.17, Math.sin(a) * 1.17, (Math.random() - 0.5) * 0.02); }
    aTarget.set([tmp.x, tmp.y, tmp.z], i * 3);
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rr = 3 + Math.random() * 5;
    const sq = Math.sqrt(1 - u * u);
    aStart.set([Math.cos(th) * sq * rr, u * rr * 0.7, Math.sin(th) * sq * rr - 1], i * 3);
    aRand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(aTarget, 3));
  pGeo.setAttribute('aStart', new THREE.BufferAttribute(aStart, 3));
  pGeo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 4));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: 22 * renderer.getPixelRatio() }, uScatter: { value: 0 }, uAlpha: { value: 1 }, uLightM: { value: 0 } },
    vertexShader: /* glsl */`
      uniform float uP, uTime, uSize, uScatter; attribute vec3 aStart; attribute vec4 aRand; varying float vA; varying float vM;
      void main(){
        float d = aRand.x * 0.45; float p = clamp((uP - d) / 0.55, 0., 1.); p = p * p * (3. - 2. * p);
        vec3 pos = mix(aStart, position, p);
        float ang = (1. - p) * (aRand.y * 6.2831 * 1.4 + uTime * 0.25);
        float c = cos(ang), s = sin(ang); pos.xz = mat2(c, -s, s, c) * pos.xz;
        pos += (1. - p) * vec3(sin(uTime * (0.6 + aRand.z) + aRand.w * 6.), cos(uTime * (0.5 + aRand.w) + aRand.z * 6.), 0.) * 0.18;
        pos += normalize(aStart) * uScatter * (0.6 + aRand.x * 2.4);
        vec4 mv = modelViewMatrix * vec4(pos, 1.);
        gl_Position = projectionMatrix * mv;
        float tw = 0.65 + 0.35 * sin(uTime * (2. + aRand.z * 3.) + aRand.w * 40.);
        gl_PointSize = uSize * (0.35 + aRand.z * 0.75) * tw / -mv.z * (1. + (1. - p) * 0.6);
        vA = (0.25 + 0.75 * p) * tw; vM = aRand.w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uAlpha, uLightM; varying float vA; varying float vM;
      void main(){
        float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); a *= a;
        vec3 col = mix(vec3(1., .8, .52), vec3(1., .66, .74), step(.72, vM)); col = mix(col, vec3(1., .97, .92), step(.94, vM));
        gl_FragColor = vec4(mix(col * 1.25, col * vec3(.62, .45, .3), uLightM), a * vA * uAlpha);
      }`
  });
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  logo.add(particles);

  /* =============== SEDA VIVA =============== */
  const silkU = {
    uTime: { value: 0 }, uTouch: { value: new THREE.Vector3(0, 0, 0) },
    uRip: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, 0, -100)) },
    uA: { value: new THREE.Color(PALETTES.noir[0]) }, uB: { value: new THREE.Color(PALETTES.noir[1]) }, uC: { value: new THREE.Color(PALETTES.noir[2]) },
    uDim: { value: 0 }, uLight: { value: new THREE.Vector2(0.4, 0.6) }, uCam: { value: camera.position }, uBase: { value: new THREE.Color('#140a10') }
  };
  const silk = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 20, mobile ? 90 : 140, mobile ? 52 : 80),
    new THREE.ShaderMaterial({
      uniforms: silkU,
      vertexShader: NOISE + /* glsl */`
        uniform float uTime; uniform vec3 uRip[6]; uniform vec3 uTouch;
        varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying float vH;
        float H(vec2 p){
          float t = uTime;
          float warp = snoise(vec3(p.x * .11, p.y * .14, t * .05));
          float h = sin(dot(p, vec2(1.7, 1.05)) + warp * 3.2 + t * .28) * .12;
          h += sin(dot(p, vec2(-.5, 1.9)) * .6 + warp * 1.6 - t * .14) * .07;
          h += snoise(vec3(p.x * .08 + 7., p.y * .1, t * .04)) * .9;
          for (int i = 0; i < 6; i++) {
            vec3 r = uRip[i]; float age = t - r.z;
            if (age < 0. || age > 4.5) continue;
            float d = distance(p, r.xy);
            float front = smoothstep(age * 2.2, age * 2.2 - 1.4, d);
            h += sin((d - age * 2.2) * 3.6) * front * exp(-age * 1.0) * .2 * exp(-d * .2);
          }
          float dt = distance(p, uTouch.xy);
          h += exp(-dt * dt * .8) * .5 * uTouch.z;
          return h;
        }
        void main(){
          vec3 p = position; float e = .07;
          float h = H(p.xy), hx = H(p.xy + vec2(e, 0.)), hy = H(p.xy + vec2(0., e));
          vec3 n = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.));
          p.z += h; vH = h; vUv = uv;
          vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * n);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uA, uB, uC, uCam, uBase; uniform float uDim; uniform vec2 uLight;
        varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying float vH;
        void main(){
          vec3 N = normalize(vN); vec3 V = normalize(uCam - vW);
          vec3 L1 = normalize(vec3(uLight, 1.1)); vec3 L2 = normalize(vec3(-.7, .6, .6));
          float dif = max(dot(N, L1), 0.) * .75 + max(dot(N, L2), 0.) * .25;
          vec3 H1 = normalize(L1 + V);
          vec3 T = normalize(cross(N, vec3(0., 1., 0.)));
          float th = dot(T, H1);
          float fres = pow(1. - max(dot(N, V), 0.), 3.);
          float lit = pow(dif, 1.6);
          vec3 col = mix(uA, uB, clamp(lit * .85 + smoothstep(-1.2, 1.4, vH) * .2, 0., 1.));
          float sheen = pow(sqrt(max(1. - th * th, 0.)), 240.);
          col += uC * (sheen * .32 + pow(max(dot(N, H1), 0.), 140.) * .45);
          col += uB * fres * .22;
          gl_FragColor = vec4(mix(uBase, col, uDim), 1.);
        }`
    })
  );
  silk.position.set(0, -0.5, -5);
  silk.rotation.x = -0.32;
  scene.add(silk);
  silk.updateMatrixWorld();
  let ripI = 0;
  const lastRip = new THREE.Vector2(999, 999);

  /* =============== POEIRA DOURADA =============== */
  const DN = mobile ? 380 : 800;
  const dPos = new Float32Array(DN * 3), dR = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { dPos.set([(Math.random() - 0.5) * 18, (Math.random() - 0.5) * 11, -4 + Math.random() * 7.5], i * 3); dR[i] = Math.random(); }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('aR', new THREE.BufferAttribute(dR, 1));
  const dMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: 30 * renderer.getPixelRatio() }, uAlpha: { value: 0 }, uLightM: { value: 0 } },
    vertexShader: /* glsl */`uniform float uTime, uSize; attribute float aR; varying float vT;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime * (.05 + aR * .12) + 5.5, 11.) - 5.5; p.x += sin(uTime * .3 + aR * 20.) * .3;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        vT = .5 + .5 * sin(uTime * (1. + aR * 2.) + aR * 50.); gl_PointSize = uSize * (.2 + aR * .5) / -mv.z; }`,
    fragmentShader: /* glsl */`uniform float uAlpha, uLightM; varying float vT;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(mix(vec3(1., .86, .62), vec3(.66, .48, .28), uLightM), a * a * vT * uAlpha * .8); }`
  });
  const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false; scene.add(dust);

  /* =============== PÉTALAS =============== */
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.15); shape.bezierCurveTo(0.13, -0.1, 0.15, 0.08, 0, 0.16); shape.bezierCurveTo(-0.15, 0.08, -0.13, -0.1, 0, -0.15);
  const petalG = new THREE.ShapeGeometry(shape, 14);
  { const p = petalG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, x * x * 3.2 - y * 0.25 + y * y * 1.2); } petalG.computeVertexNormals(); }
  const PN = mobile ? 16 : 34;
  const petals = new THREE.InstancedMesh(petalG, new THREE.MeshPhysicalMaterial({ color: '#e6c3c6', roughness: 0.62, sheen: 1, sheenColor: new THREE.Color('#ffd1dc'), sheenRoughness: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0 }), PN);
  const petalData = [], dummy = new THREE.Object3D();
  const pcols = ['#f4c7c8', '#e9a7b0', '#f7dccf', '#d98597', '#f1d3b0'];
  for (let i = 0; i < PN; i++) {
    petalData.push({ p: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, -3 + Math.random() * 4), v: new THREE.Vector3(), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), s: 0.7 + Math.random() * 0.8, ph: Math.random() * 10 });
    petals.setColorAt(i, new THREE.Color(pcols[i % pcols.length]));
  }
  petals.frustumCulled = false;
  scene.add(petals);

  /* =============== ESCADARIA-GALERIA =============== */
  const helix = new THREE.Group(); scene.add(helix);
  const R = mobile ? 4.1 : 5.4, PH = mobile ? 1.85 : 2.15, PW = PH * 2 / 3;
  const STEP = (PW + (mobile ? 0.5 : 0.65)) / R, DY = 0.2;
  const panelGeo = new THREE.PlaneGeometry(PW, PH, 40, 8);
  { const p = panelGeo.attributes.position; for (let i = 0; i < p.count; i++) { const a = p.getX(i) / R; p.setX(i, Math.sin(a) * R); p.setZ(i, R - Math.cos(a) * R); } }
  const panelVS = /* glsl */`uniform float uVel, uHover; varying vec2 vUv;
    void main(){ vUv = uv; vec3 p = position; p.z += sin(uv.y * 3.1416) * uVel * .35 + sin(uv.x * 3.1416) * uHover * .1; p.y += sin(uv.x * 3.1416) * uVel * .06;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`;
  const panelFS = /* glsl */`uniform sampler2D uTex, uTex2; uniform float uHover, uFocus, uVel, uTime, uHas2, uAlpha, uImgA, uPlaneA, uMine, uLightM; uniform vec3 uBg; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    void main(){
      float r = uPlaneA / uImgA; vec2 sc = r < 1. ? vec2(r, 1.) : vec2(1., 1. / r);
      vec2 uv = (vUv - .5) * sc * (1. - .05 * uHover) + .5;
      float sh = uVel * .01;
      vec3 a = vec3(texture2D(uTex, uv + vec2(sh, 0.)).r, texture2D(uTex, uv).g, texture2D(uTex, uv - vec2(sh, 0.)).b);
      vec3 b = texture2D(uTex2, uv).rgb;
      float n = vnoise(uv * 5. + uTime * .15) * .7 + vnoise(uv * 13.) * .3;
      float m = smoothstep(uHover * 1.25 - .25, uHover * 1.25, n) ;
      vec3 col = mix(b, a, mix(1., m, uHas2));
      float edge = (1. - smoothstep(0., .04, abs(n - (uHover * 1.25 - .12)))) * uHover * uHas2 * (1. - uHover);
      col += vec3(1., .8, .5) * edge * .9;
      float g = dot(col, vec3(.299, .587, .114));
      col = mix(vec3(g) * vec3(1.04, .95, .96), col, .25 + .75 * uFocus);
      col = mix(col * (.32 + .68 * uFocus), mix(uBg, col, .5 + .5 * uFocus), uLightM);
      vec2 e = min(vUv, 1. - vUv) * vec2(uPlaneA, 1.);
      float d = min(e.x, e.y);
      float frame = smoothstep(.006, 0., abs(d - .028));
      col = mix(col, vec3(.95, .8, .55), frame * (.25 + .75 * uFocus) * .9);
      float shim = .5 + .5 * sin((vUv.x * uPlaneA + vUv.y) * 9. - uTime * 2.6);
      float mf = smoothstep(.016, 0., abs(d - .028)) + smoothstep(.022, 0., d) * .9;
      col = mix(col, vec3(1., .83, .52) * (1.05 + .5 * shim), clamp(mf, 0., 1.) * uMine);
      col *= 1. + uMine * (1. - uFocus) * .35;
      gl_FragColor = vec4(col, uAlpha);
    }`;
  const panels = [];
  const gal = { items: [], f: 0, scrollF: 0, dragF: 0, vel: 0, hovered: -1, focus: -1 };
  const blank = new THREE.DataTexture(new Uint8Array([40, 20, 28, 255]), 1, 1); blank.needsUpdate = true;

  let mineFn = () => false;
  function setGallery(items) {
    panels.forEach((p) => { helix.remove(p); p.material.dispose(); });
    panels.length = 0;
    gal.items = items; gal.dragF = 0;
    items.forEach((it, i) => {
      const t = textures.get(it.slug) || {};
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: panelVS, fragmentShader: panelFS,
        uniforms: {
          uTex: { value: t.a || blank }, uTex2: { value: t.b || blank }, uHas2: { value: t.b ? 1 : 0 },
          uHover: { value: 0 }, uFocus: { value: 0 }, uVel: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 0 }, uMine: { value: 0 }, uLightM: { value: theme.light }, uBg: { value: theme.bg },
          uImgA: { value: t.a?.image ? t.a.image.width / t.a.image.height : 2 / 3 }, uPlaneA: { value: PW / PH }
        }
      });
      const m = new THREE.Mesh(panelGeo, mat);
      const a = i * STEP;
      m.position.set(Math.sin(a) * R, -i * DY, -Math.cos(a) * R);
      m.rotation.y = -a;
      m.userData = { i, a, item: it, mine: mineFn(it) ? 1 : 0 };
      m.visible = false;
      helix.add(m); panels.push(m);
    });
  }

  /* =============== TEXTURAS =============== */
  const textures = new Map();
  const loader = new THREE.TextureLoader();
  const prepTex = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return t; };
  const loadTex = (url) => new Promise((res) => loader.load(url, (t) => res(prepTex(t)), undefined, () => res(null)));
  async function loadTextures(items, onP) {
    let n = 0; const total = items.length;
    await Promise.all(items.map(async (it) => {
      const a = await loadTex(it.imgs[0]);
      textures.set(it.slug, { a, b: null });
      onP && onP(++n / total);
    }));
  }
  async function loadSecond(items) {
    for (const it of items) {
      const t = textures.get(it.slug); if (!t || t.b || !it.imgs[1]) continue;
      t.b = await loadTex(it.imgs[1]);
      const p = panels.find((x) => x.userData.item.slug === it.slug);
      if (p && t.b) { p.material.uniforms.uTex2.value = t.b; p.material.uniforms.uHas2.value = 1; }
    }
  }

  /* =============== PÓS-PROCESSAMENTO =============== */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.45, 0.5, 0.86);
  composer.addPass(bloom);
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uAberr: { value: 0.0025 }, uVig: { value: 0.85 }, uSeed: { value: 0 }, uVigCol: { value: new THREE.Vector3(0, 0, 0) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uAberr, uVig, uSeed; uniform vec3 uVigCol; varying vec2 vUv;
      void main(){ vec2 c = vUv - .5; float d = length(c); vec2 o = c * uAberr * d * 4.;
        vec3 col = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
        col = mix(col, col * uVigCol, smoothstep(.3, 1.0, d) * uVig);
        float g = fract(sin(dot(vUv * 1000. + uSeed, vec2(12.9898, 78.233))) * 43758.5453) - .5; col += g * .025;
        gl_FragColor = vec4(col, 1.); }`
  });
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  /* =============== ENTRADA DO USUÁRIO =============== */
  const tiltG = { x: 0, y: 0 };
  const mouse = new THREE.Vector2(0, 0), mouseS = new THREE.Vector2(0, 0), lastMouse = new THREE.Vector2();
  let mouseSpeed = 0, pointerIn = false;
  const ray = new THREE.Raycaster();
  let drag = null, spin = { v: 0, a: 0 };
  const handlers = { hover: () => {}, click: () => {}, focus: () => {} };

  addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    pointerIn = true;
    if (drag) {
      const dx = e.clientX - drag.x; drag.moved = drag.moved || Math.abs(dx) > 6 || Math.abs(e.clientY - drag.y) > 6;
      if (drag.moved && drag.horiz === undefined) drag.horiz = Math.abs(dx) > Math.abs(e.clientY - drag.y);
      if (drag.mode === 'gal' && drag.horiz) { gal.dragF = clamp(drag.f0 - dx / (mobile ? 110 : 180), -gal.scrollF, gal.items.length - 1 - gal.scrollF); }
      else if (drag.mode === 'logo') { spin.v = (e.clientX - drag.lx) * 0.012; drag.lx = e.clientX; }
    }
  }, { passive: true });
  let visPanels = [];
  addEventListener('pointerdown', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (e.button !== 0 || e.target.closest('button, a, input, .pdp, .bag, .menu')) return;
    if (params.galVis > 0.6) drag = { mode: 'gal', x: e.clientX, y: e.clientY, f0: gal.dragF, moved: false };
    else if (params.logoVis > 0.6 && params.ready > 0.5) drag = { mode: 'logo', x: e.clientX, y: e.clientY, lx: e.clientX, moved: false };
  });
  addEventListener('pointerup', () => {
    if (drag && drag.mode === 'gal' && !drag.moved) {
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(visPanels, false);
      if (hits.length) handlers.click(hits[0].object.userData.item);
    }
    drag = null;
  });
  document.addEventListener('pointerleave', () => { pointerIn = false; });

  /* =============== LOOP =============== */
  const clock = new THREE.Clock();
  const tA = new THREE.Color(), tB = new THREE.Color(), tC = new THREE.Color();
  let palette = { from: 'noir', w: {} };
  let running = true;
  const plane = new THREE.Plane(), hit = new THREE.Vector3(), local = new THREE.Vector3();

  function update() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    mouseS.x = damp(mouseS.x, mouse.x, 9, dt); mouseS.y = damp(mouseS.y, mouse.y, 9, dt);
    mouseSpeed = damp(mouseSpeed, lastMouse.distanceTo(mouse) / Math.max(dt, 1e-3), 6, dt); lastMouse.copy(mouse);

    /* câmera */
    camera.position.x = damp(camera.position.x, mouseS.x * 0.16, 3, dt);
    camera.position.y = damp(camera.position.y, params.camY + mouseS.y * 0.1, 3, dt);
    camera.position.z = params.camZ;
    camera.rotation.set(params.camTilt, 0, 0);
    if (Math.abs(camera.fov - params.fov) > 0.01) { camera.fov = params.fov; camera.updateProjectionMatrix(); }

    /* monograma */
    const lv = params.logoVis;
    logo.visible = lv > 0.002;
    if (logo.visible) {
      if (!drag) spin.v *= Math.pow(0.04, dt); spin.a += spin.v;
      const portrait = innerWidth / innerHeight < 0.8 ? 0.78 : 1;
      logo.scale.setScalar(params.logoScale * portrait * (0.55 + 0.45 * lv));
      logo.position.y = params.logoY + Math.sin(t * 0.8) * 0.035 * params.ready;
      logo.rotation.y = damp(logo.rotation.y, mouseS.x * 0.42 + spin.a + params.logoSpin + Math.sin(t * 0.35) * 0.06 + tiltG.x, 8, dt);
      logo.rotation.x = damp(logo.rotation.x, -mouseS.y * 0.26 + tiltG.y, 8, dt);
      const p = params.loadP;
      pMat.uniforms.uP.value = smooth(0, 0.9, p) * 1.0;
      pMat.uniforms.uTime.value = t;
      pMat.uniforms.uScatter.value = params.scatter + (1 - lv) * 2.5;
      pMat.uniforms.uAlpha.value = lerp(1, 0.32, params.ready) * lv;
      reveal(ring, smooth(0.05, 0.75, p)); reveal(left, smooth(0.3, 0.92, p)); reveal(right, smooth(0.45, 0.97, p));
      [ring, left, right].forEach((m) => { m.visible = lv > 0.35 || params.scatter < 0.1; });
      const gs = smooth(0.9, 1, p);
      gem.scale.copy(gemBase).multiplyScalar(Math.max(0.0001, gs * (1 + Math.sin(gs * Math.PI) * 0.6)) * (lv > 0.3 ? 1 : lv / 0.3));
      gem.rotation.y += dt * 0.9; gem.rotation.z = Math.sin(t * 0.7) * 0.08;
      const al = params.arm;
      arm1.rotation.set((1 - al) * t * 1.1, (1 - al) * t * 0.6, t * 0.08);
      arm2.rotation.set((1 - al) * -t * 0.7 + al * 0.0, (1 - al) * t * 0.9, -t * 0.05);
      arm1.scale.setScalar(smooth(0.1, 0.5, p)); arm2.scale.setScalar(smooth(0.2, 0.6, p));
      arm1.visible = arm2.visible = lv > 0.3;
    }
    roseLight.position.set(mouseS.x * 3.4, mouseS.y * 2.2 + params.logoY, 2.6);
    rim.position.x = -2.5 + Math.sin(t * 0.4) * 1.2;

    /* seda */
    silkU.uTime.value = t;
    silkU.uDim.value = damp(silkU.uDim.value, params.silkVis * params.silkDim, 3, dt);
    silkU.uLight.value.set(0.35 + mouseS.x * 0.6, 0.55 + mouseS.y * 0.4);
    silk.visible = silkU.uDim.value > 0.005;
    if (silk.visible) {
      ray.setFromCamera(mouse, camera);
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(silk.quaternion), silk.position);
      if (ray.ray.intersectPlane(plane, hit)) {
        local.copy(hit); silk.worldToLocal(local);
        const tch = silkU.uTouch.value;
        tch.x = damp(tch.x, local.x, 10, dt); tch.y = damp(tch.y, local.y, 10, dt);
        tch.z = damp(tch.z, pointerIn ? clamp(mouseSpeed * 0.25, 0, 1) * (0.4 + params.touch) : 0, 3, dt);
        if (pointerIn && mouseSpeed > 0.4 && lastRip.distanceTo(local) > (0.9 - params.touch * 0.4)) {
          silkU.uRip.value[ripI].set(local.x, local.y, t); ripI = (ripI + 1) % 6; lastRip.set(local.x, local.y);
        }
      }
      const w = palette.w; let sa = 0;
      tA.setRGB(0, 0, 0); tB.setRGB(0, 0, 0); tC.setRGB(0, 0, 0);
      for (const k in w) { if (w[k] <= 0) continue; sa += w[k]; tA.add(PAL[k][0].clone().multiplyScalar(w[k])); tB.add(PAL[k][1].clone().multiplyScalar(w[k])); tC.add(PAL[k][2].clone().multiplyScalar(w[k])); }
      if (sa > 0) { tA.multiplyScalar(1 / sa); tB.multiplyScalar(1 / sa); tC.multiplyScalar(1 / sa); }
      const k = 1 - Math.exp(-2.5 * dt);
      silkU.uA.value.lerp(tA, k); silkU.uB.value.lerp(tB, k); silkU.uC.value.lerp(tC, k);
    }

    /* poeira e pétalas */
    dMat.uniforms.uTime.value = t;
    dMat.uniforms.uAlpha.value = damp(dMat.uniforms.uAlpha.value, params.dust, 2, dt);
    petals.material.opacity = damp(petals.material.opacity, params.petals * 0.95, 2, dt);
    petals.visible = petals.material.opacity > 0.01;
    if (petals.visible) {
      ray.setFromCamera(mouse, camera);
      for (let i = 0; i < PN; i++) {
        const d = petalData[i];
        d.v.y -= dt * 0.02; d.v.multiplyScalar(Math.pow(0.4, dt));
        const near = ray.ray.distanceToPoint(d.p);
        if (near < 1.4 && mouseSpeed > 0.3) { tmp.subVectors(d.p, ray.ray.origin).cross(ray.ray.direction).normalize(); d.v.addScaledVector(tmp, -dt * mouseSpeed * 0.9 * (1.4 - near)); }
        d.p.addScaledVector(d.v, dt);
        d.p.x += Math.sin(t * 0.4 + d.ph) * dt * 0.12; d.p.y -= dt * 0.12 * d.s;
        if (d.p.y < -5) { d.p.y = 5; d.p.x = (Math.random() - 0.5) * 12; d.v.set(0, 0, 0); }
        if (Math.abs(d.p.x) > 7.5) d.p.x *= -0.95;
        d.r.x += dt * 0.4 * d.s; d.r.y += dt * 0.3; d.r.z = Math.sin(t * 0.6 + d.ph) * 0.8;
        dummy.position.copy(d.p); dummy.rotation.copy(d.r); dummy.scale.setScalar(d.s);
        dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
    }

    /* galeria */
    const gv = params.galVis;
    helix.visible = gv > 0.002 && panels.length > 0;
    if (helix.visible) {
      const n = gal.items.length;
      let target = clamp(gal.scrollF + gal.dragF, 0, n - 1);
      if (!drag) target = Math.round(target) + (target - Math.round(target)) * 0.3;
      const prev = gal.f;
      gal.f = damp(gal.f, target, 5, dt);
      gal.vel = damp(gal.vel, clamp((gal.f - prev) / Math.max(dt, 1e-3) * 0.35, -1.5, 1.5), 6, dt);
      helix.position.set(0, gal.f * DY, camera.position.z);
      helix.rotation.y = gal.f * STEP;
      const spread = 1 + (1 - gv) * 0.9;
      let best = -1;
      ray.setFromCamera(mouse, camera);
      const vis = [];
      for (const m of panels) {
        const { i, a } = m.userData;
        const diff = (i - gal.f) * STEP;
        const ad = Math.abs(diff);
        m.visible = ad < 1.9;
        if (!m.visible) continue;
        vis.push(m);
        m.position.set(Math.sin(a) * R * spread, -i * DY + (1 - gv) * (i % 2 ? 1 : -1) * 1.2, -Math.cos(a) * R * spread);
        const u = m.material.uniforms;
        const foc = 1 - smooth(0, STEP * 1.3, ad);
        u.uFocus.value = damp(u.uFocus.value, foc, 6, dt);
        u.uHover.value = damp(u.uHover.value, gal.hovered === i ? 1 : 0, 5, dt);
        u.uVel.value = gal.vel; u.uTime.value = t; u.uMine.value = damp(u.uMine.value, m.userData.mine, 4, dt);
        u.uAlpha.value = gv * (1 - smooth(1.2, 1.85, ad));
        if (ad < 0.5 && (best < 0 || ad < Math.abs((best - gal.f) * STEP))) best = i;
      }
      visPanels = vis;
      let h = -1;
      if (gv > 0.6 && pointerIn && !isTouch && !(drag && drag.moved)) { const hits = ray.intersectObjects(vis, false); if (hits.length) h = hits[0].object.userData.i; }
      if (h !== gal.hovered) { gal.hovered = h; handlers.hover(h >= 0 ? gal.items[h] : null); }
      const fi = Math.round(clamp(gal.f, 0, n - 1));
      if (fi !== gal.focus) { gal.focus = fi; handlers.focus(fi, gal.items[fi]); }
    } else if (gal.hovered !== -1) { gal.hovered = -1; handlers.hover(null); }

    bloom.strength = params.bloom * (theme.light ? 0.3 : 1);
    finish.uniforms.uAberr.value = params.aberr; finish.uniforms.uSeed.value = (t * 60 | 0) % 97;
    composer.render();
  }
  const mkPal = (src) => Object.fromEntries(Object.entries(src).map(([k, v]) => [k, v.map((c) => new THREE.Color(c))]));
  const PAL_D = mkPal(PALETTES), PAL_L = mkPal(PALETTES_LIGHT);
  let PAL = theme.light ? PAL_L : PAL_D;
  function setTheme(mode) {
    const light = mode === 'claro'; theme.light = light ? 1 : 0;
    theme.bg.set(light ? '#ece2d8' : '#140a10');
    scene.background.copy(theme.bg); silkU.uBase.value.copy(theme.bg);
    PAL = light ? PAL_L : PAL_D;
    pMat.uniforms.uLightM.value = theme.light; dMat.uniforms.uLightM.value = theme.light;
    pMat.blending = dMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; pMat.needsUpdate = dMat.needsUpdate = true;
    finish.uniforms.uVig.value = light ? 0.55 : 0.85; finish.uniforms.uVigCol.value.set(light ? 0.9 : 0, light ? 0.84 : 0, light ? 0.82 : 0);
    panels.forEach((m) => { m.material.uniforms.uLightM.value = theme.light; });
    key.intensity = light ? 1.9 : 1.6;
  }
  setTheme(document.documentElement.dataset.theme);
  addEventListener('vellure-theme', (e) => setTheme(e.detail));

  let acc = 0, frames = 0, lastNow = performance.now(), slowStreak = 0;
  function adapt() {
    const now = performance.now(); acc += now - lastNow; lastNow = now; frames++;
    if (frames < 45) return;
    const avg = acc / frames; acc = 0; frames = 0;
    if (avg > 24 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); slowStreak++; }
    else if (avg < 14 && dpr < DPR_MAX) dpr = Math.min(DPR_MAX, dpr + 0.25);
    else return;
    renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr); composer.setSize(innerWidth, innerHeight);
    if (slowStreak > 3) bloom.enabled = false;
  }
  function loop() { if (!running) return; update(); adapt(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; } else if (!running) { running = true; clock.getDelta(); requestAnimationFrame(loop); } });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; params.fov = camera.aspect < 0.8 ? 54 : 42; camera.fov = params.fov; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); bloom.setSize(innerWidth / 2, innerHeight / 2);
  });

  return {
    params, gal, renderer,
    loadTextures, loadSecond, setGallery,
    setPalette(w) { palette.w = w; },
    on(ev, fn) { handlers[ev] = fn; },
    tilt(x, y) { tiltG.x = x; tiltG.y = y; },
    setMine(fn) { mineFn = fn; panels.forEach((m) => { m.userData.mine = fn(m.userData.item) ? 1 : 0; }); },
    get dragging() { return !!(drag && drag.moved); }
  };
}

export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
