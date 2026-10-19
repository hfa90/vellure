/* =====================================================================
   VELLURE 3D · direção da experiência
   loading em 3D → entrada pela logo → rolagem que conduz a cena
   ===================================================================== */
import { createWorld, hasWebGL } from './scene.js';
import { createShop, toast, waLink, money, CAT_NAME } from './shop.js';
import { sound } from './sound.js';
import { mountSizer, mountFrete, mountSizeRecorder } from './atelier.js';
import { currentUser, favs, haptic, mySize } from './common.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
const MOBILE = innerWidth < 760;

/* ---------------- catálogo: fotos locais + produtos com foto no Supabase ---------------- */
// estoque por tamanho vindo do banco: {P: 3, M: 0}; tamanho ausente = sem controle
function stockOf(r) {
  const m = r.stock_by_size && typeof r.stock_by_size === 'object' ? r.stock_by_size : {};
  if (Object.keys(m).length) return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.max(0, +v || 0)]));
  if (r.stock != null && +r.stock <= 0) return Object.fromEntries((r.sizes || []).map((s) => [s, 0]));
  return null;
}
async function getCatalog() {
  const local = (window.VELLURE_CATALOG || []).slice();
  try {
    if (!window.V?.api || !window.V.sb) return local;
    const rows = await Promise.race([window.V.api.products(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))]);
    const withPhotos = (rows || []).filter((r) => Array.isArray(r.images) && r.images.filter(Boolean).length);
    if (!withPhotos.length) return local;
    const map = new Map(local.map((p) => [p.slug, p]));
    const known = ['lingerie', 'corset', 'praia', 'fitness'];
    withPhotos.forEach((r) => {
      map.set(r.slug, {
        slug: r.slug, name: r.name, color: r.subtitle || (r.colors?.[0]?.name ?? ''), price: +r.price,
        cat: known.includes(r.category) ? r.category : 'lingerie',
        sizes: r.sizes?.length ? r.sizes : ['P', 'M', 'G', 'GG'], imgs: r.images.filter(Boolean),
        stock: stockOf(r)
      });
    });
    return [...map.values()];
  } catch (e) { return local; }
}

/* ---------------- rolagem suave ---------------- */
let lenis = null;
function setupScroll() {
  if (REDUCED || !window.Lenis) return;
  lenis = new Lenis({ lerp: 0.14, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.2 });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
let locks = 0;
const lock = () => { locks++; document.body.classList.add('lockui'); lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'); };
const unlock = () => { locks = Math.max(0, locks - 1); if (!locks) { document.body.classList.remove('lockui'); lenis ? lenis.start() : (document.body.style.overflow = ''); } };
function go(target) {
  const el = typeof target === 'string' ? $(target) : target; if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
}
window.__vellureGo = go;

/* ---------------- cursor ---------------- */
function setupCursor() {
  if (!HOVER) return null;
  document.documentElement.classList.add('has-cursor');
  const c = $('.cursor'), dot = $('.c-dot'), ring = $('.c-ring'), lbl = $('.c-lbl');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
  addEventListener('pointermove', (e) => { dot.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`; }, { passive: true });
  (function tick() { rx = lerp(rx, x, 0.35); ry = lerp(ry, y, 0.35); ring.style.transform = `translate3d(${rx}px,${ry}px,0)`; requestAnimationFrame(tick); })();
  document.addEventListener('pointerover', (e) => { if (e.target.closest('a, button, input, .card-media, [role="button"]')) c.classList.add('hover'); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('a, button, input, .card-media, [role="button"]')) c.classList.remove('hover'); });
  return { label(t) { lbl.textContent = t || ''; c.classList.toggle('label', !!t); } };
}

/* ---------------- textos que se movem com a mão ---------------- */
function setupHeroLetters() {
  const letters = $$('.hero-word span');
  if (!HOVER || REDUCED) return;
  let centers = [], mx = -1e4, my = -1e4, raf = 0;
  const measure = () => { letters.forEach((l) => (l.style.transform = '')); centers = letters.map((l) => { const r = l.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 + scrollY]; }); };
  measure(); setTimeout(measure, 2400); addEventListener('resize', measure);
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
  function apply() {
    raf = 0;
    if (scrollY > innerHeight) return;
    letters.forEach((l, i) => {
      const dx = (mx - centers[i][0]) / innerWidth, dy = (my - (centers[i][1] - scrollY)) / innerHeight; const d = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - d * 3.2);
      l.style.transform = f ? `translate3d(${-dx * 26 * f}px, ${-dy * 30 * f}px, ${f * 90}px) rotateY(${dx * 38 * f}deg) rotateX(${-dy * 30 * f}deg)` : '';
    });
  }
}
function splitWords(el) {
  el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  return $$('.w', el);
}

/* ---------------- giroscópio: a joia acompanha o celular ---------------- */
let tiltTarget = null;
function startTilt() {
  if (HOVER || !window.DeviceOrientationEvent) return;
  const listen = () => addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    const x = Math.max(-1, Math.min(1, e.gamma / 35)), y = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 35));
    tiltTarget && tiltTarget.tilt(x * 0.5, y * 0.3);
  });
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then((r) => r === 'granted' && listen()).catch(() => {});
    else listen();
  } catch (e) { /* sem sensor */ }
}

/* ======================================================================= */
async function boot() {
  const gl = hasWebGL();
  setupScroll();
  if (lenis) lenis.stop();
  const cursor = setupCursor();
  const catalog = await getCatalog();
  let world = null, entered = false, hoverP = null;
  const enterScale = { v: 1 };

  const shop = createShop({ catalog, lock, unlock, chime: (p) => sound.chime(p) });
  mountSizer($('#sizer'), { onSave: async (m) => { try { if (window.V?.state?.user) await window.V.api.updateProfile({ measurements: m }); } catch (e) { /* fica no aparelho */ } } });
  mountFrete($('#frete'));
  currentUser().then(async (u) => {
    if (!u) return;
    let name = u.user_metadata?.full_name || '';
    try { const p = await window.V.api.profile(); name = p?.full_name || name; } catch (e) { /* */ }
    $('#acctLbl').textContent = name ? `Olá, ${name.split(' ')[0]}` : 'Minha conta';
    favs.sync(); mySize.pull();
  });

  if (gl) {
    try { world = createWorld($('#gl')); } catch (e) { console.warn('[Vellure] WebGL indisponível', e); world = null; }
  }
  if (!world) document.body.classList.add('no-gl');
  tiltTarget = world;

  /* ---------- LOADING ---------- */
  const tl0 = gsap.timeline();
  tl0.to('.ld-word span', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, stagger: 0.09, ease: 'expo.out', delay: 0.3 })
     .to('.ld-sub', { opacity: 1, duration: 1.2 }, '-=1')
     .to('.ld-hint', { opacity: 1, duration: 1 }, '-=.8');

  const shown = { p: 0 }; let real = 0;
  const t0 = performance.now();
  const MIN = REDUCED ? 600 : 3400;
  const fontP = document.fonts ? document.fonts.ready : Promise.resolve();
  const texP = world ? world.loadTextures(catalog, (p) => { real = p; }) : Promise.resolve();
  let done = false;
  Promise.all([texP, fontP]).then(() => { real = 1; done = true; });

  let lastT = performance.now();
  await new Promise((res) => {
    (function tick() {
      const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      const tp = clamp((performance.now() - t0) / MIN, 0, 1);
      const target = Math.min(real * 0.98 + (done ? 0.02 : 0), tp);
      shown.p = lerp(shown.p, target, 1 - Math.exp(-dt * 5));
      if (target >= 1 && shown.p > 0.995) shown.p = 1;
      $('#ldNum').textContent = Math.round(shown.p * 100);
      $('#ldBar').style.transform = `scaleX(${shown.p})`;
      if (world) world.params.loadP = shown.p;
      if (shown.p >= 1) return res();
      requestAnimationFrame(tick);
    })();
  });

  // pronto: a joia acende, os aros se alinham
  if (world) {
    gsap.to(world.params, { ready: 1, arm: 1, duration: 2.2, ease: 'expo.inOut' });
    gsap.fromTo(world.params, { bloom: 1.1 }, { bloom: 0.45, duration: 2, ease: 'power2.out' });
  }
  const btn = $('#enterBtn');
  btn.disabled = false;
  gsap.to('.ld-meter', { opacity: 0, duration: 0.6 });
  gsap.to(btn, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', delay: 0.3 });
  $('#ldHint').textContent = HOVER ? 'Arraste a joia para girá-la. Clique em entrar quando quiser.' : 'Toque em entrar.';

  await new Promise((res) => {
    const enter = () => { removeEventListener('keydown', key); haptic(25); startTilt(); res(); };
    const key = (e) => { if (e.key === 'Enter') enter(); };
    btn.addEventListener('click', enter, { once: true });
    addEventListener('keydown', key);
  });

  /* ---------- ENTRADA: atravessar a logo ---------- */
  btn.disabled = true;
  if (cursor) cursor.label('');
  const flash = $('.flash');
  await new Promise((res) => {
    const tl = gsap.timeline({ onComplete: res });
    tl.to('#loader > *', { opacity: 0, y: -14, duration: 0.6, stagger: 0.04, ease: 'power2.in' });
    if (world && !REDUCED) {
      const P = world.params;
      tl.to(P, { logoY: 0, duration: 0.6, ease: 'power2.inOut' }, 0)
        .to(P, { camZ: -0.6, camY: 0.18, fov: 74, duration: 1.7, ease: 'power3.in' }, 0.35)
        .to(P, { bloom: 2.2, aberr: 0.02, scatter: 1.2, duration: 1.5, ease: 'power2.in' }, 0.45)
        .to(flash, { opacity: 1, duration: 0.45, ease: 'power2.in' }, 1.6)
        .add(() => {
          P.camZ = 6; P.camY = 0; P.fov = innerWidth / innerHeight < 0.8 ? 54 : 42; P.scatter = 0; P.aberr = 0.0025; P.silkVis = 1; enterScale.v = 0.2; entered = true;
          document.body.classList.remove('is-loading'); document.body.classList.add('is-in');
          $('#loader').remove();
        }, 2.08)
        .to(enterScale, { v: 1, duration: 2.2, ease: 'expo.out' }, 2.1)
        .to(P, { bloom: 0.45, duration: 2, ease: 'power2.out' }, 2.1)
        .to(flash, { opacity: 0, duration: 1.6, ease: 'power2.out' }, 2.15);
    } else {
      tl.add(() => {
        if (world) world.params.silkVis = 1; entered = true;
        document.body.classList.remove('is-loading'); document.body.classList.add('is-in'); $('#loader').remove();
      });
    }
  });

  /* ---------- SITE ---------- */
  gsap.to('#site', { opacity: 1, duration: 1.2, ease: 'power2.out' });
  gsap.to('.nav', { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: 0.3 });
  gsap.fromTo('.hero-word span', { yPercent: 110, rotateX: -80, opacity: 0 }, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.8, stagger: 0.07, ease: 'expo.out', delay: 0.1, clearProps: 'transform' });
  gsap.fromTo('.hero-foot', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: 0.7 });
  if (lenis) lenis.start();
  scrollTo(0, 0);
  setupHeroLetters();
  if (world) setTimeout(() => world.loadSecond(catalog), 600);

  /* ---------- galeria em 3D ---------- */
  const galerie = $('#galerie');
  let galItems = catalog;
  const PER = MOBILE ? 70 : 90;
  function sizeGallery() { galerie.style.height = `${galItems.length * PER + innerHeight}px`; window.__vellureMeasure && window.__vellureMeasure(); }
  function setGal(f) {
    galItems = f === 'all' ? catalog : catalog.filter((p) => (f === 'mine' ? mySize.fits(p) : p.cat === f));
    if (!galItems.length) galItems = catalog;
    if (world) world.setMine((p) => !!mySize.fits(p));
    if (world) world.setGallery(galItems);
    sizeGallery(); updateCaption(0, galItems[0]);
  }
  function updateCaption(i, p) {
    if (!p) return;
    $('#glCount').textContent = `${i + 1} de ${galItems.length}`;
    $('#glName').textContent = p.name;
    $('#glMeta').textContent = `${p.color ? p.color + ', ' : ''}${money(p.price)}`;
    const mine = mySize.fits(p), mb = $('#glMine');
    mb.hidden = !mine; if (mine) mb.innerHTML = `<i></i>${mine === 'Único' ? 'Tamanho único, serve em você' : `Tem o seu tamanho ${mine}`}`;
    $('#glOpen').dataset.slug = p.slug;
  }
  if (world) {
    world.on('focus', (i, p) => { updateCaption(i, p); sound.chime(0.75 + (i % 5) * 0.08); });
    world.on('hover', (p) => { hoverP = p; });
    world.on('click', (p) => p && shop.open(p.slug));
  }
  $('#glOpen').addEventListener('click', (e) => { const s = e.currentTarget.dataset.slug; if (s) shop.open(s); });
  setGal('all');

  $$('.chips').forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip', g).forEach((c) => c.classList.toggle('on', c === b));
    if (g.dataset.target === 'galerie') { setGal(b.dataset.f); go(galerie); }
    else shop.renderGrid(b.dataset.f);
  }));
  function filterCloset(f) {
    $$('.chips[data-target="vestiaire"] .chip').forEach((c) => c.classList.toggle('on', c.dataset.f === f));
    shop.renderGrid(f);
  }

  /* ---------- gravar meu tamanho ---------- */
  const sizeSheet = $('#sizeSheet');
  const paintSize = (v = mySize.get()) => {
    $$('[data-size-open] .sp-txt').forEach((t) => (t.textContent = v ? `Seu tamanho: ${v.top === v.bottom ? v.top : `${v.top} em cima, ${v.bottom} embaixo`}` : 'Gravar meu tamanho'));
    $$('[data-size-open]').forEach((b) => b.classList.toggle('on', !!v));
    $$('.chip-mine').forEach((c) => (c.hidden = !v));
    if (world) world.setMine((p) => !!mySize.fits(p));
    if (world && world.gal.items[world.gal.focus]) updateCaption(world.gal.focus, world.gal.items[world.gal.focus]);
  };
  const openSize = () => {
    mountSizeRecorder($('#sizeSheetBody'), { onDone: (v) => { closeSize(); if (v) { toast('Tamanho gravado. As peças com o seu número agora brilham em dourado.'); } } });
    sizeSheet.classList.add('open'); sizeSheet.setAttribute('aria-hidden', 'false'); lock();
  };
  const closeSize = () => { if (!sizeSheet.classList.contains('open')) return; sizeSheet.classList.remove('open'); sizeSheet.setAttribute('aria-hidden', 'true'); unlock(); };
  $$('[data-size-open]').forEach((b) => b.addEventListener('click', openSize));
  $('.sheet-close', sizeSheet).addEventListener('click', closeSize);
  sizeSheet.addEventListener('click', (e) => { if (e.target === sizeSheet) closeSize(); });
  mySize.on(paintSize); paintSize();
  try { const V2 = window.VELLURE_CONFIG.VIP; const min = Math.min(...V2.PLANS.flatMap((p) => Object.values(p.prices))); $('#vtFrom').textContent = money(min); } catch (e) { /* */ }

  /* ---------- manifesto ---------- */
  const words = splitWords($('.mf-text'));

  /* ---------- seda: texto para toque ---------- */
  if (!HOVER) $('#sdSub').textContent = 'Deslize o dedo devagar. O tecido responde ao seu toque, como uma boa peça deve responder.';

  /* ---------- diretor: a rolagem conduz a cena ---------- */
  const secs = { hero: $('#inicio'), man: $('#manifesto'), gal: galerie, seda: $('#seda'), vs: $('#vestiaire') };
  const bar = $('#glBar');
  let lit = -1, box = {};
  const measureSecs = () => { const y = scrollY; for (const k in secs) { const r = secs[k].getBoundingClientRect(); box[k] = { top: r.top + y, height: r.height }; } };
  measureSecs(); addEventListener('resize', () => setTimeout(measureSecs, 50)); window.__vellureMeasure = measureSecs;
  setInterval(measureSecs, 2000);
  (function direct() {
    const vh = innerHeight, sy = lenis ? lenis.scroll : scrollY;
    const r = (k) => { const b = box[k]; const top = b.top - sy; return { top, height: b.height, bottom: top + b.height }; };
    const hero = r('hero'), man = r('man'), g = r('gal'), sd = r('seda'), vs = r('vs');
    const heroOut = clamp(-hero.top / vh, 0, 1);
    const pMan = clamp((vh - man.top) / (man.height + vh), 0, 1);
    const gIn = clamp((vh * 0.8 - g.top) / (vh * 0.8), 0, 1), gOut = clamp((g.bottom - vh * 0.2) / (vh * 0.8), 0, 1);
    const galVis = smooth(0, 1, gIn) * smooth(0, 1, gOut);
    const galProg = clamp(-g.top / Math.max(1, g.height - vh), 0, 1);
    const pSeda = clamp((vh - sd.top) / (sd.height + vh), 0, 1), sedaW = Math.sin(pSeda * Math.PI) ** 1.5;
    const pVs = clamp((vh - vs.top) / vh, 0, 1);

    if (world && entered) {
      const P = world.params, portrait = innerWidth / innerHeight < 0.8;
      P.logoVis = 1 - smooth(0.2, 0.62, pMan);
      P.logoY = (portrait ? 0.62 : 0.6) + heroOut * 0.85 + pMan * 0.9;
      P.logoSpin = heroOut * 1.4 + pMan * 2.4;
      P.logoScale = enterScale.v * (0.82 - heroOut * 0.15);
      P.camZ = 6 - sedaW * 1.3; P.camY = -sedaW * 0.45; P.camTilt = -sedaW * 0.3;
      let dim = 0.8; dim = lerp(dim, 0.62, smooth(0.1, 0.5, pMan)); dim = lerp(dim, 0.32, galVis); dim = lerp(dim, 0.95, sedaW); dim = lerp(dim, 0.3, pVs);
      P.silkDim = dim;
      P.touch = sedaW;
      P.galVis = galVis;
      P.petals = (1 - galVis) * (1 - pVs * 0.85);
      P.dust = 1 - galVis * 0.4;
      world.setPalette({ noir: 1 - Math.sin(pMan * Math.PI) - sedaW + 0.001, vinho: Math.sin(pMan * Math.PI) * (1 - galVis), rose: galVis * 0.5 + pVs * 0.6, perola: sedaW * 1.6 });
      world.gal.scrollF = galProg * (galItems.length - 1);
      if (cursor) cursor.label(locks ? '' : hoverP ? 'Ver' : galVis > 0.6 && HOVER ? 'Arraste' : '');
    }
    bar.style.transform = `scaleY(${galProg})`;
    document.body.classList.toggle('in-gal', galVis > 0.4);
    const n = Math.floor(smooth(0.18, 0.62, pMan) * words.length);
    if (n !== lit) { words.forEach((w, i) => { w.style.opacity = i < n ? 1 : 0.12; w.style.transition = 'opacity .5s'; }); lit = n; }
    requestAnimationFrame(direct);
  })();

  /* ---------- menu ---------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn'), prev = $('.menu-preview'), prevImg = $('img', prev);
  const toggleMenu = (open = !menu.classList.contains('open')) => {
    menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-hidden', String(!open));
    open ? lock() : unlock();
    if (open) gsap.fromTo('.menu-list li', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.06, ease: 'expo.out', delay: 0.15 });
  };
  menuBtn.addEventListener('click', () => toggleMenu());
  $$('.menu-list a').forEach((a) => {
    a.addEventListener('pointerenter', () => { prevImg.src = a.dataset.img; prev.classList.add('show'); });
    a.addEventListener('pointerleave', () => prev.classList.remove('show'));
    a.addEventListener('click', (e) => {
      if (a.hasAttribute('data-out')) return;
      e.preventDefault(); toggleMenu(false);
      if (a.dataset.filter) filterCloset(a.dataset.filter);
      setTimeout(() => go(a.getAttribute('href')), 450);
    });
  });
  menu.addEventListener('pointermove', (e) => { prev.style.left = `${e.clientX + 120}px`; prev.style.top = `${e.clientY}px`; });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) toggleMenu(false); });

  /* ---------- links internos e WhatsApp ---------- */
  document.addEventListener('click', (e) => {
    const wa = e.target.closest('[data-wa]');
    if (wa) { e.preventDefault(); if (menu.classList.contains('open')) toggleMenu(false); window.open(waLink(wa.dataset.wa), '_blank', 'noopener'); return; }
    const a = e.target.closest('a[href^="#"]');
    if (a && !a.closest('.menu-list') && a.getAttribute('href').length > 1) { e.preventDefault(); go(a.getAttribute('href')); }
  });

  /* ---------- som ---------- */
  const sb = $('#soundBtn');
  sb.addEventListener('click', () => { const on = sound.toggle(); sb.setAttribute('aria-pressed', String(on)); sb.setAttribute('aria-label', on ? 'Desligar som ambiente' : 'Ligar som ambiente'); });

  /* ---------- assinatura gigante do rodapé ---------- */
  const fw = $('.foot-word');
  fw.addEventListener('pointermove', (e) => { const r = fw.getBoundingClientRect(); fw.style.setProperty('--fx', `${((e.clientX - r.left) / r.width) * 100}%`); fw.style.setProperty('--fy', `${((e.clientY - r.top) / r.height) * 100}%`); });

  /* ---------- lista privada ---------- */
  $('#nlForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget, email = f.email.value.trim(), b = $('button', f);
    b.disabled = true; b.textContent = 'Enviando...';
    try { if (window.V?.api) await window.V.api.newsletter(email); toast('Pronto! Você está na lista privada.'); f.reset(); }
    catch (err) { toast('Não foi possível salvar agora. Tente de novo em instantes.'); }
    b.disabled = false; b.textContent = 'Quero receber';
  });

  /* ---------- link direto para uma peça ---------- */
  const m = location.hash.match(/^#peca\/(.+)$/);
  if (m) setTimeout(() => shop.open(decodeURIComponent(m[1]), false), 600);

  addEventListener('resize', sizeGallery);

  /* ---------- busca instantânea ---------- */
  const sEl = $('#search'), sIn = $('#searchIn'), sRes = $('#searchRes');
  const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const SYN = { corset: 'espartilho', espartilho: 'corset', biquini: 'praia', maio: 'praia', calcinha: 'tanga', top: 'conjunto', fitness: 'legging bermuda calca', praia: 'biquini maio' };
  const index = catalog.map((p) => ({ p, t: norm(`${p.name} ${p.color} ${CAT_NAME[p.cat]} ${p.cat}`) }));
  let sSel = 0, sList = [];
  function runSearch() {
    const q = norm(sIn.value).trim();
    const words = q.split(/\s+/).filter(Boolean).map((w) => [w, ...(SYN[w] ? SYN[w].split(' ') : [])]);
    sList = !q ? catalog.slice(0, 8) : index.filter(({ t }) => words.every((alts) => alts.some((a) => t.includes(a)))).map((x) => x.p);
    sSel = 0;
    const hl = (txt) => { let out = txt; q && q.split(/\s+/).forEach((w) => { if (w.length < 2) return; const i = norm(out).indexOf(w); if (i >= 0) out = out.slice(0, i) + '<mark>' + out.slice(i, i + w.length) + '</mark>' + out.slice(i + w.length); }); return out; };
    sRes.innerHTML = sList.length ? sList.slice(0, 24).map((p, i) => `<button type="button" class="sr-item ${i === 0 ? 'on' : ''}" data-slug="${p.slug}"><img src="${p.imgs[0]}" alt="" loading="lazy"><b>${hl(p.name)}</b><small>${hl(p.color || CAT_NAME[p.cat])}, ${money(p.price)}</small></button>`).join('') : `<p class="sr-empty">Nada com “${sIn.value}”. Tente outra palavra ou fale com a concierge: buscamos para você.</p>`;
  }
  $('#searchSug').innerHTML = ['corset', 'conjunto preto', 'biquíni', 'legging', 'camisola', 'branco', 'vinho'].map((t) => `<button type="button">${t}</button>`).join('');
  $('#searchSug').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { sIn.value = b.textContent; runSearch(); sIn.focus(); } });
  const openSearch = () => { sEl.classList.add('open'); sEl.setAttribute('aria-hidden', 'false'); lock(); runSearch(); setTimeout(() => sIn.focus(), 60); };
  const closeSearch = () => { if (!sEl.classList.contains('open')) return; sEl.classList.remove('open'); sEl.setAttribute('aria-hidden', 'true'); unlock(); };
  $('#searchBtn').addEventListener('click', openSearch);
  $('#searchClose').addEventListener('click', closeSearch);
  sIn.addEventListener('input', runSearch);
  sRes.addEventListener('click', (e) => { const b = e.target.closest('[data-slug]'); if (b) { closeSearch(); shop.open(b.dataset.slug); } });
  addEventListener('keydown', (e) => {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName) && !sEl.classList.contains('open')) { e.preventDefault(); openSearch(); return; }
    if (!sEl.classList.contains('open')) return;
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { sSel = Math.min(sList.length - 1, sSel + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { sSel = Math.max(0, sSel - 1); }
    if (/Arrow/.test(e.key)) { e.preventDefault(); $$('.sr-item', sRes).forEach((b, i) => b.classList.toggle('on', i === sSel)); $$('.sr-item', sRes)[sSel]?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter' && sList[sSel]) { closeSearch(); shop.open(sList[sSel].slug); }
  });

  /* ---------- instalar como app (Android e iPhone) ---------- */
  const ib = $('#installBtn');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let deferred = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; ib.hidden = false; });
  if (ios && !standalone) ib.hidden = false;
  ib.addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; ib.hidden = true; }
    else toast('No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.');
  });
}

boot();
