/* =====================================================================
   VELLURE 3D · loja: closet, página da peça, sacola e WhatsApp
   ===================================================================== */
const C = window.VELLURE_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => (+n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const CAT_NAME = { lingerie: 'Lingerie', corset: 'Corsets', praia: 'Moda praia', fitness: 'Fitness' };
const PIX = 0.05;

export function waLink(text) {
  const n = String(C.WHATSAPP || '').replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

let toastT;
export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800);
}

const store = {
  get() { try { return JSON.parse(localStorage.getItem('vellure_sacola') || '[]'); } catch (e) { return mem; } },
  set(v) { mem = v; try { localStorage.setItem('vellure_sacola', JSON.stringify(v)); } catch (e) { /* modo privado */ } }
};
let mem = [];

export function createShop({ catalog, lock, unlock, chime }) {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  let bag = store.get().filter((x) => bySlug.has(x.slug));
  let current = null, size = null, imgI = 0;

  /* ---------------- closet (grade) ---------------- */
  const grid = $('#grid');
  function renderGrid(filter = 'all') {
    const list = catalog.filter((p) => filter === 'all' || p.cat === filter);
    grid.innerHTML = list.length ? list.map((p) => `
      <article class="card" data-slug="${esc(p.slug)}">
        <div class="card-media" role="button" tabindex="0" aria-label="Ver ${esc(p.name)}">
          <img class="a" src="${esc(p.imgs[0])}" alt="${esc(p.name)} ${esc(p.color)}" loading="lazy" decoding="async">
          ${p.imgs[1] ? `<img class="b" src="${esc(p.imgs[1])}" alt="" loading="lazy" decoding="async">` : ''}
          <button class="card-add" type="button">Ver tamanhos</button>
        </div>
        <div class="card-info"><h3 class="card-name">${esc(p.name)}<span class="card-color">${esc(p.color || CAT_NAME[p.cat])}</span></h3><span class="card-price">${money(p.price)}</span></div>
      </article>`).join('') : '<p class="vs-empty">Nenhuma peça nesta categoria por enquanto.</p>';
    if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(grid.children, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, stagger: 0.04, ease: 'expo.out' });
    }
  }
  grid.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) open(c.dataset.slug); });
  grid.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card-media')) { e.preventDefault(); open(e.target.closest('.card').dataset.slug); } });
  if (matchMedia('(hover: hover)').matches) {
    grid.addEventListener('pointermove', (e) => {
      const m = e.target.closest('.card-media'); if (!m) return;
      const r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      m.style.setProperty('--mx', `${x * 100}%`); m.style.setProperty('--my', `${y * 100}%`);
      m.style.transform = `rotateY(${(x - 0.5) * 10}deg) rotateX(${(0.5 - y) * 8}deg) translateZ(10px)`;
    });
    grid.addEventListener('pointerout', (e) => { const m = e.target.closest('.card-media'); if (m && !m.contains(e.relatedTarget)) m.style.transform = ''; });
  }

  /* ---------------- página da peça ---------------- */
  const pdp = $('#pdp'), stage = $('#pdpStage'), thumbs = $('#pdpThumbs');
  function setImg(i) {
    imgI = (i + current.imgs.length) % current.imgs.length;
    stage.querySelectorAll('img').forEach((im, k) => im.classList.toggle('cur', k === imgI));
    thumbs.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === imgI));
    stage.classList.remove('zoom');
  }
  function open(slug, push = true) {
    const p = bySlug.get(slug); if (!p) return;
    current = p; size = p.sizes.length === 1 ? p.sizes[0] : null;
    $('#pdpCat').textContent = CAT_NAME[p.cat] || '';
    $('#pdpName').textContent = p.name;
    $('#pdpColor').textContent = p.color || '';
    $('#pdpPrice').textContent = money(p.price);
    $('#pdpPix').textContent = `${money(p.price * (1 - PIX))} no Pix`;
    stage.innerHTML = p.imgs.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.name)}, foto ${i + 1}" ${i ? 'loading="lazy"' : ''}>`).join('');
    thumbs.innerHTML = p.imgs.length > 1 ? p.imgs.map((src, i) => `<button type="button" aria-label="Foto ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('') : '';
    $('#pdpSizes').innerHTML = p.sizes.map((s) => `<button type="button" aria-pressed="${s === size}">${esc(s)}</button>`).join('');
    const more = catalog.filter((x) => x.cat === p.cat && x.slug !== p.slug).sort(() => Math.random() - 0.5).slice(0, 3);
    $('#pdpMore').innerHTML = more.map((x) => `<button type="button" data-slug="${esc(x.slug)}"><img src="${esc(x.imgs[0])}" alt="" loading="lazy"><span>${esc(x.name)}<br>${money(x.price)}</span></button>`).join('');
    setImg(0);
    pdp.classList.add('open'); pdp.setAttribute('aria-hidden', 'false');
    $('.pdp-info').scrollTop = 0; pdp.scrollTop = 0;
    lock();
    if (window.gsap) {
      gsap.fromTo(stage.querySelector('img.cur'), { clipPath: 'inset(12% 18% 12% 18% round 200px 200px 8px 8px)', scale: 1.15 }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, duration: 1.3, ease: 'expo.out', clearProps: 'clipPath,scale' });
      gsap.fromTo('.pdp-info > *', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out', delay: 0.15 });
    }
    if (push) history.pushState({ peca: slug }, '', `#peca/${slug}`);
    chime && chime(1.2);
    setTimeout(() => $('.pdp-close').focus({ preventScroll: true }), 50);
  }
  function close(pop = false) {
    if (!pdp.classList.contains('open')) return;
    pdp.classList.remove('open'); pdp.setAttribute('aria-hidden', 'true');
    unlock();
    if (!pop && location.hash.startsWith('#peca/')) history.back();
  }
  $('.pdp-close').addEventListener('click', () => close());
  thumbs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setImg([...thumbs.children].indexOf(b)); });
  stage.addEventListener('click', () => { if (matchMedia('(hover: hover)').matches) stage.classList.toggle('zoom'); else setImg(imgI + 1); });
  stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); stage.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`); stage.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`); });
  let sx = null;
  stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) setImg(imgI + (dx < 0 ? 1 : -1)); sx = null; });
  $('#pdpSizes').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; size = b.textContent;
    $('#pdpSizes').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
  $('#pdpMore').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) open(b.dataset.slug, false); });
  $('#pdpAdd').addEventListener('click', () => {
    if (!size) {
      toast('Escolha um tamanho para continuar.');
      window.gsap && gsap.fromTo('#pdpSizes', { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, .3)' });
      return;
    }
    add(current.slug, size); close(); openBag();
  });
  $('#pdpWa').addEventListener('click', () => window.open(waLink(`Olá, Vellure! Tenho uma dúvida sobre a peça ${current.name}${current.color ? ` (${current.color})` : ''}.`), '_blank', 'noopener'));
  addEventListener('popstate', () => {
    const m = location.hash.match(/^#peca\/(.+)$/);
    if (m) open(decodeURIComponent(m[1]), false); else close(true);
  });

  /* ---------------- sacola ---------------- */
  const bagEl = $('#bag'), scrim = $('.scrim');
  function save() { store.set(bag); $('#bagCount').textContent = bag.reduce((a, x) => a + x.qty, 0); }
  function add(slug, sz) {
    const it = bag.find((x) => x.slug === slug && x.size === sz);
    if (it) it.qty++; else bag.push({ slug, size: sz, qty: 1 });
    save(); renderBag();
    const b = $('#bagBtn'); b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 500);
    toast('Peça colocada na sacola.');
    chime && chime(1.5);
  }
  function totals() { const sub = bag.reduce((a, x) => a + bySlug.get(x.slug).price * x.qty, 0); return { sub, pix: sub * (1 - PIX) }; }
  function renderBag() {
    const items = $('#bagItems'), foot = $('#bagFoot');
    if (!bag.length) {
      items.innerHTML = '<div class="bag-empty"><strong>Sua sacola está vazia.</strong>Escolha uma peça na galeria ou no closet e ela aparece aqui.</div>';
      foot.innerHTML = '<button class="btn-line" type="button" data-go="#vestiaire">Ver o closet</button>';
      return;
    }
    items.innerHTML = bag.map((x, i) => {
      const p = bySlug.get(x.slug);
      return `<div class="bag-item" data-i="${i}"><img src="${esc(p.imgs[0])}" alt=""><div><h3>${esc(p.name)}</h3><p>${esc(p.color ? p.color + ', ' : '')}tamanho ${esc(x.size)}</p>
        <div class="qty"><button type="button" data-q="-1" aria-label="Diminuir">−</button><span>${x.qty}</span><button type="button" data-q="1" aria-label="Aumentar">+</button></div></div>
        <div style="display:grid;gap:10px;justify-items:end"><button class="rm" type="button">Remover</button><span class="pr">${money(p.price * x.qty)}</span></div></div>`;
    }).join('');
    const t = totals();
    foot.innerHTML = `<div class="row"><span>Subtotal</span><span>${money(t.sub)}</span></div>
      <div class="row pix"><span>No Pix, com 5% de desconto</span><span>${money(t.pix)}</span></div>
      <button class="btn-gold" type="button" id="checkout">Finalizar pelo WhatsApp</button>
      <p class="fine">A concierge confirma tamanho, frete e envia o link de pagamento na conversa.</p>`;
  }
  $('#bagItems').addEventListener('click', (e) => {
    const row = e.target.closest('.bag-item'); if (!row) return; const i = +row.dataset.i;
    if (e.target.closest('.rm')) bag.splice(i, 1);
    const q = e.target.closest('[data-q]'); if (q) { bag[i].qty += +q.dataset.q; if (bag[i].qty < 1) bag.splice(i, 1); }
    save(); renderBag();
  });
  $('#bagFoot').addEventListener('click', (e) => {
    if (e.target.closest('[data-go]')) { closeBag(); setTimeout(() => window.__vellureGo && window.__vellureGo('#vestiaire'), 350); }
    if (e.target.id === 'checkout') {
      const t = totals();
      const lines = bag.map((x) => { const p = bySlug.get(x.slug); return `• ${x.qty}x ${p.name}${p.color ? ` (${p.color})` : ''}, tamanho ${x.size}: ${money(p.price * x.qty)}`; });
      const msg = `Olá, Vellure! Quero finalizar meu pedido:\n\n${lines.join('\n')}\n\nSubtotal: ${money(t.sub)}\nNo Pix (5% off): ${money(t.pix)}\n\nPode me enviar o frete e o link de pagamento?`;
      window.open(waLink(msg), '_blank', 'noopener');
    }
  });
  function openBag() { renderBag(); bagEl.classList.add('open'); bagEl.setAttribute('aria-hidden', 'false'); scrim.classList.add('on'); lock(); }
  function closeBag() { if (!bagEl.classList.contains('open')) return; bagEl.classList.remove('open'); bagEl.setAttribute('aria-hidden', 'true'); scrim.classList.remove('on'); unlock(); }
  $('#bagBtn').addEventListener('click', openBag);
  $('.bag-close').addEventListener('click', closeBag);
  scrim.addEventListener('click', closeBag);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeBag(); close(); } });

  save(); renderGrid();
  return { open, close, renderGrid, openBag, add, bySlug };
}
