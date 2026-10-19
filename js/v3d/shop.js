/* =====================================================================
   VELLURE 3D · loja: closet, página da peça, favoritos, sacola e pedido
   ===================================================================== */
import { $, $$, esc, money, CAT_NAME, PIX, HEART, waLink, toast, haptic, local, favs, mySize } from './common.js';
import { mountSizer, mountFrete, loadMeasures, sizeCalc } from './atelier.js';
import { pixReady, pixPayload, pixQrSvg } from './pix.js';
import { createReviews } from './reviews.js';
const PAYCFG = (window.VELLURE_CONFIG || {}).PAYMENTS || {};
export { money, CAT_NAME, waLink, toast };

const FIELDS = [['nome', 'Nome completo', 'name'], ['fone', 'WhatsApp', 'tel'], ['cep', 'CEP', 'postal-code'], ['rua', 'Rua', 'address-line1'], ['numero', 'Número', ''], ['comp', 'Complemento', 'address-line2'], ['bairro', 'Bairro', ''], ['cidade', 'Cidade', 'address-level2'], ['uf', 'UF', 'address-level1']];

export function createShop({ catalog, lock, unlock, chime }) {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  let bag = local.get('vellure_sacola', []).filter((x) => bySlug.has(x.slug));
  let current = null, size = null, imgI = 0, view = 'list', ship = null;

  /* ---------------- estoque por tamanho ---------------- */
  const LOW = 3;
  const left = (p, s) => (p && p.stock && s in p.stock ? p.stock[s] : null); // null = sem controle
  const soldOut = (p) => !!p.stock && p.sizes.every((s) => left(p, s) === 0);
  const reviews = createReviews({ catalog, lock, unlock });

  /* ---------------- closet (grade) ---------------- */
  const grid = $('#grid');
  let gridFilter = 'all';
  function renderGrid(filter = gridFilter) {
    gridFilter = filter;
    const list = catalog.filter((p) => filter === 'all' || (filter === 'mine' ? mySize.fits(p) : p.cat === filter));
    grid.innerHTML = list.length ? list.map((p) => { const mine = mySize.fits(p); return `
      <article class="card${mine ? ' mine' : ''}" data-slug="${esc(p.slug)}">
        ${mine ? `<span class="mine-tag${left(p, mine) === 0 ? ' wait' : ''}"><i></i>${left(p, mine === 'Único' ? p.sizes[0] : mine) === 0 ? `Seu ${mine === 'Único' ? 'tamanho' : esc(mine)} volta em breve` : mine === 'Único' ? 'Tamanho único, serve em você' : `Tem o seu tamanho ${esc(mine)}`}</span>` : ''}
        <div class="card-media" role="button" tabindex="0" aria-label="Ver ${esc(p.name)}">
          <img class="a" src="${esc(p.imgs[0])}" alt="${esc(p.name)} ${esc(p.color)}" loading="lazy" decoding="async">
          ${p.imgs[1] ? `<img class="b" src="${esc(p.imgs[1])}" alt="" loading="lazy" decoding="async">` : ''}
          ${soldOut(p) ? '<span class="out-tag">Esgotada · avise-me</span>' : ''}
          <button class="card-add" type="button">Ver tamanhos</button>
        </div>
        <button class="fav card-fav" type="button" aria-pressed="${favs.has(p.slug)}" aria-label="Favoritar ${esc(p.name)}">${HEART}</button>
        <div class="card-info"><h3 class="card-name">${esc(p.name)}<span class="card-color">${esc(p.color || CAT_NAME[p.cat])}</span></h3><span class="card-side"><span class="card-price">${money(p.price)}</span><span class="card-rate" data-rate="${esc(p.slug)}">${reviews.badge(p.slug)}</span></span></div>
      </article>`; }).join('') : `<p class="vs-empty">${filter === 'mine' ? 'Nenhuma peça no seu tamanho gravado por enquanto. Fale com a concierge: pedimos sob encomenda.' : 'Nenhuma peça nesta categoria por enquanto.'}</p>`;
    if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(grid.children, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, stagger: 0.035, ease: 'expo.out' });
    }
  }
  grid.addEventListener('click', async (e) => {
    const f = e.target.closest('.card-fav');
    if (f) { const on = await favs.toggle(f.closest('.card').dataset.slug); f.setAttribute('aria-pressed', String(on)); haptic(); toast(on ? 'Guardada nos seus favoritos.' : 'Removida dos favoritos.'); return; }
    const c = e.target.closest('.card'); if (c) open(c.dataset.slug);
  });
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
  favs.on(() => { $$('.card-fav', grid).forEach((b) => b.setAttribute('aria-pressed', String(favs.has(b.closest('.card').dataset.slug)))); if (current) $('#pdpFav').setAttribute('aria-pressed', String(favs.has(current.slug))); });

  mySize.on(() => renderGrid());

  /* ---------------- tamanho sugerido ---------------- */
  function suggest(p, res) {
    if (!res) { const f = mySize.fits(p); if (f && f !== 'Único') return f; const m = loadMeasures(); if (!m) return null; res = sizeCalc(m); }
    const want = p.cat === 'corset' ? res.body : res.panty;
    if (p.sizes.includes(want)) return want;
    const order = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'], wi = order.indexOf(want);
    return p.sizes.slice().sort((a, b) => Math.abs(order.indexOf(a) - wi) - Math.abs(order.indexOf(b) - wi))[0];
  }
  function paintSizes() {
    $('#pdpSizes').innerHTML = current.sizes.map((s) => {
      const n = left(current, s), low = n !== null && n > 0 && n <= LOW;
      return `<button type="button" data-size="${esc(s)}" aria-pressed="${s === size}" class="${n === 0 ? 'out' : low ? 'low' : ''}" aria-label="Tamanho ${esc(s)}${n === 0 ? ', esgotado' : low ? `, últimas ${n}` : ''}">${esc(s)}${low ? `<i>${n}</i>` : ''}</button>`;
    }).join('');
    paintStock();
    const mine = suggest(current);
    const el = $('#pdpMine');
    if (mine && current.sizes.length > 1) { el.hidden = false; el.innerHTML = mySize.fits(current) ? `Esta peça tem o seu tamanho gravado: <b>${esc(mine)}</b>. Já deixamos marcado.` : `Pelas suas medidas, o seu é o <b>${esc(mine)}</b>.`; } else el.hidden = true;
  }

  /* status do tamanho escolhido + "avise-me quando chegar" */
  const addBtn = $('#pdpAdd'), alertF = $('#pdpAlert');
  const avisos = () => local.get('vellure_avisos', []);
  function paintStock() {
    const n = size ? left(current, size) : null, st = $('#pdpStock');
    const asked = avisos().some((a) => a.slug === current.slug && a.size === size);
    st.className = 'pdp-stock';
    if (size && n === 0) {
      st.hidden = false; st.classList.add('out');
      st.innerHTML = asked ? `Você já está na lista do <b>${esc(size)}</b>. Avisamos assim que voltar.` : `O <b>${esc(size)}</b> esgotou por enquanto. As outras medidas seguem disponíveis.`;
      addBtn.textContent = asked ? 'Você será avisada' : 'Avise-me quando chegar'; addBtn.dataset.mode = 'alert'; addBtn.disabled = asked;
    } else {
      if (n !== null && n > 0 && n <= LOW) { st.hidden = false; st.classList.add('low'); st.innerHTML = n === 1 ? `<i></i>Última peça no ${esc(size)}.` : `<i></i>Só ${n} peças no ${esc(size)}.`; }
      else st.hidden = true;
      addBtn.textContent = 'Colocar na sacola'; delete addBtn.dataset.mode; addBtn.disabled = false;
      alertF.hidden = true;
    }
  }
  function openAlert() {
    const u = window.V?.state?.user, prof = window.V?.state?.profile || {};
    $('#paSize').textContent = size;
    if (u && !alertF.email.value) alertF.email.value = u.email || '';
    if (prof.phone && !alertF.phone.value) alertF.phone.value = prof.phone;
    $('#paMsg').textContent = '';
    alertF.hidden = false;
    window.gsap && gsap.fromTo(alertF, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    setTimeout(() => (alertF.email.value ? alertF.phone : alertF.email).focus({ preventScroll: true }), 60);
    alertF.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  alertF.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = alertF.email.value.trim(), phone = alertF.phone.value.replace(/\D/g, ''), msg = $('#paMsg');
    if (!email && !phone) { msg.textContent = 'Deixe um e-mail ou um WhatsApp para a gente te avisar.'; return; }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'Confira o e-mail.'; return; }
    if (phone && (phone.length < 10 || phone.length > 13)) { msg.textContent = 'Confira o WhatsApp com DDD.'; return; }
    const btn = alertF.querySelector('button'); btn.disabled = true; btn.textContent = 'Guardando…';
    const p = current, sz = size;
    const done = (txt) => {
      local.set('vellure_avisos', [...avisos().filter((a) => !(a.slug === p.slug && a.size === sz)), { slug: p.slug, size: sz, at: Date.now() }]);
      alertF.hidden = true; btn.disabled = false; btn.textContent = 'Quero ser avisada';
      if (current === p) paintStock();
      toast(txt); haptic(18); chime && chime(1.8);
    };
    try {
      if (!window.V?.sb) throw Object.assign(new Error('offline'), { offline: true });
      const r = await window.V.api.stockAlert(p.slug, sz, email, phone);
      done(r?.waiting > 1 ? `Combinado. Você e mais ${r.waiting - 1} estão esperando o ${sz}.` : `Combinado. Assim que o ${sz} voltar, você é a primeira a saber.`);
    } catch (err) {
      const m = String(err?.message || err);
      if (err?.offline || /function|schema cache|does not exist|Failed to fetch/i.test(m)) {
        // banco ainda não instalado: o pedido de aviso vai para a concierge
        window.open(waLink(`Olá, Vellure! Quero ser avisada quando a peça ${p.name}${p.color ? ` (${p.color})` : ''} voltar no tamanho ${sz}.${email ? ` E-mail: ${email}.` : ''}`), '_blank', 'noopener');
        done('Pedido de aviso enviado para a concierge.');
      } else { msg.textContent = m; btn.disabled = false; btn.textContent = 'Quero ser avisada'; }
    }
  });
  $('#paClose').addEventListener('click', () => { alertF.hidden = true; });
  // voltou? avisa quem pediu neste aparelho
  setTimeout(() => {
    const back = avisos().filter((a) => { const p = bySlug.get(a.slug); return p && left(p, a.size) > 0; });
    if (!back.length) return;
    const p = bySlug.get(back[0].slug);
    toast(`Boa notícia: ${p.name} voltou no ${back[0].size}.`);
    local.set('vellure_avisos', avisos().filter((a) => !back.includes(a)));
  }, 9000);

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
    current = p; size = p.sizes.length === 1 ? p.sizes[0] : (mySize.fits(p) || null);
    $('#pdpCat').textContent = CAT_NAME[p.cat] || '';
    $('#pdpName').textContent = p.name;
    $('#pdpColor').textContent = p.color || '';
    $('#pdpPrice').textContent = money(p.price);
    $('#pdpPix').textContent = `${money(p.price * (1 - PIX))} no Pix`;
    $('#pdpFav').setAttribute('aria-pressed', String(favs.has(p.slug)));
    $('#pdpSizer').hidden = p.sizes.length < 2;
    stage.innerHTML = p.imgs.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.name)}, foto ${i + 1}" ${i ? 'loading="lazy"' : ''}>`).join('');
    thumbs.innerHTML = p.imgs.length > 1 ? p.imgs.map((src, i) => `<button type="button" aria-label="Foto ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('') : '';
    paintSizes();
    reviews.show(p);
    const more = catalog.filter((x) => x.cat === p.cat && x.slug !== p.slug).sort(() => Math.random() - 0.5).slice(0, 3);
    $('#pdpMore').innerHTML = more.map((x) => `<button type="button" data-slug="${esc(x.slug)}"><img src="${esc(x.imgs[0])}" alt="" loading="lazy"><span>${esc(x.name)}<br>${money(x.price)}</span></button>`).join('');
    setImg(0);
    if (!pdp.classList.contains('open')) { pdp.classList.add('open'); pdp.setAttribute('aria-hidden', 'false'); lock(); }
    $('.pdp-info').scrollTop = 0; pdp.scrollTop = 0;
    if (window.gsap) {
      gsap.fromTo(stage.querySelector('img.cur'), { clipPath: 'inset(12% 18% 12% 18% round 200px 200px 8px 8px)', scale: 1.15 }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, duration: 1.3, ease: 'expo.out', clearProps: 'clipPath,scale' });
      gsap.fromTo('.pdp-info > *', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out', delay: 0.15 });
    }
    if (push) history.pushState({ peca: slug }, '', `#peca/${slug}`);
    const seen = [slug, ...local.get('vellure_vistos', []).filter((x) => x !== slug)].slice(0, 12); local.set('vellure_vistos', seen); paintSeen();
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
    const b = e.target.closest('button'); if (!b) return; size = b.dataset.size; haptic(8);
    $('#pdpSizes').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    paintStock();
  });
  $('#pdpMore').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) open(b.dataset.slug, false); });
  $('#pdpFav').addEventListener('click', async (e) => { const on = await favs.toggle(current.slug); e.currentTarget.setAttribute('aria-pressed', String(on)); haptic(); toast(on ? 'Guardada nos seus favoritos.' : 'Removida dos favoritos.'); });
  $('#pdpAdd').addEventListener('click', () => {
    if (addBtn.dataset.mode === 'alert') { openAlert(); return; }
    if (!size) {
      toast('Escolha um tamanho para continuar.');
      window.gsap && gsap.fromTo('#pdpSizes', { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, .3)' });
      return;
    }
    if (add(current.slug, size) === false) return;
    close(); openBag();
  });
  $('#pdpShare').addEventListener('click', async () => {
    const url = `${location.href.split('#')[0]}#peca/${current.slug}`, title = `${current.name} | Vellure`;
    try { if (navigator.share) { await navigator.share({ title, text: `${current.name}${current.color ? ` (${current.color})` : ''} na Vellure`, url }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); toast('Link da peça copiado.'); } catch (e) { toast(url); }
  });
  $('#pdpWa').addEventListener('click', () => window.open(waLink(`Olá, Vellure! Tenho uma dúvida sobre a peça ${current.name}${current.color ? ` (${current.color})` : ''}.`), '_blank', 'noopener'));
  addEventListener('popstate', () => {
    const m = location.hash.match(/^#peca\/(.+)$/);
    if (m) open(decodeURIComponent(m[1]), false); else close(true);
  });

  /* ---------------- “descobrir meu tamanho” ---------------- */
  const sheet = $('#szModal');
  let sheetSizer = null;
  function openSheet() {
    if (!sheetSizer) sheetSizer = mountSizer($('#szModalBody'), {
      compact: true,
      onApply: (res) => { const s = suggest(current, res); if (s) { size = s; paintSizes(); toast(`Tamanho ${s} selecionado.`); } closeSheet(); }
    });
    else { const m = loadMeasures(); if (m) sheetSizer.set(m); }
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  }
  function closeSheet() { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); if (current) paintSizes(); }
  $('#pdpSizer').addEventListener('click', openSheet);
  $('.sheet-close').addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

  /* ---------------- sacola ---------------- */
  const bagEl = $('#bag'), scrim = $('.scrim');
  function save() { local.set('vellure_sacola', bag); $('#bagCount').textContent = bag.reduce((a, x) => a + x.qty, 0); }
  function add(slug, sz) {
    const it = bag.find((x) => x.slug === slug && x.size === sz), n = left(bySlug.get(slug), sz);
    if (n !== null && (it ? it.qty : 0) + 1 > n) { toast(n ? `Temos só ${n} no ${sz}, e já estão na sua sacola.` : `O ${sz} esgotou.`); return false; }
    if (it) it.qty++; else bag.push({ slug, size: sz, qty: 1 });
    save(); renderBag();
    const b = $('#bagBtn'); b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 500);
    toast('Peça colocada na sacola.'); haptic(18);
    chime && chime(1.5);
  }
  const subtotal = () => bag.reduce((a, x) => a + bySlug.get(x.slug).price * x.qty, 0);
  let coupon = null; // { code, discount }
  function totals(pay = 'pix') {
    const sub = subtotal(), fr = ship ? ship.price : 0;
    const cd = coupon ? Math.min(coupon.discount, sub) : 0;
    const disc = pay === 'pix' ? (sub - cd) * PIX : 0;
    return { sub, fr, cd, disc, total: Math.max(0, sub - cd - disc + fr) };
  }
  const itemsHTML = () => bag.map((x, i) => {
    const p = bySlug.get(x.slug);
    return `<div class="bag-item" data-i="${i}"><img src="${esc(p.imgs[0])}" alt=""><div><h3>${esc(p.name)}</h3><p>${esc(p.color ? p.color + ', ' : '')}tamanho ${esc(x.size)}</p>
      <div class="qty"><button type="button" data-q="-1" aria-label="Diminuir">−</button><span>${x.qty}</span><button type="button" data-q="1" aria-label="Aumentar">+</button></div></div>
      <div class="bag-side"><button class="rm" type="button">Remover</button><span class="pr">${money(p.price * x.qty)}</span></div></div>`;
  }).join('');
  let freteBox = null;
  function renderBag() {
    const items = $('#bagItems'), foot = $('#bagFoot');
    $('#bag h2').textContent = view === 'checkout' ? 'Finalizar pedido' : view === 'done' ? 'Pedido feito' : 'Sua sacola';
    if (view === 'done') return;
    if (!bag.length) {
      view = 'list';
      items.innerHTML = '<div class="bag-empty"><strong>Sua sacola está vazia.</strong>Escolha uma peça na galeria ou no closet e ela aparece aqui.</div>';
      foot.innerHTML = '<button class="btn-line" type="button" data-go="#vestiaire">Ver o closet</button>';
      freteBox = null; return;
    }
    if (view === 'checkout') return renderCheckout();
    items.innerHTML = itemsHTML() + '<div class="bag-frete"><h4>Frete</h4><div id="bagFrete"></div></div>';
    freteBox = mountFrete($('#bagFrete'), { compact: true, subtotal, onChoose: (o) => { ship = o; paintTotals(); } });
    paintTotals();
  }
  function paintTotals() {
    if (view !== 'list') return;
    const t = totals();
    $('#bagFoot').innerHTML = `<div class="row"><span>Subtotal</span><span>${money(t.sub)}</span></div>
      <div class="row"><span>Frete</span><span>${ship ? (ship.price ? money(ship.price) : 'Cortesia') : 'Informe o CEP'}</span></div>
      <div class="row pix"><span>Total no Pix, com 5% off</span><span>${money(t.total)}</span></div>
      <button class="btn-gold" type="button" id="toCheckout">Finalizar pedido</button>`;
  }
  async function renderCheckout() {
    const user = window.V?.state?.user;
    const a = ship?.addr || {};
    let saved = {};
    try { if (user) { const list = await window.V.api.addresses(); if (list?.length) saved = list[0]; } } catch (e) { /* sem endereços */ }
    const prof = (user && window.V.state.profile) || {};
    const val = { nome: prof.full_name || user?.user_metadata?.full_name || '', fone: prof.phone || '', cep: (ship?.cep || saved.cep || ''), rua: a.logradouro || saved.street || '', numero: saved.number || '', comp: saved.complement || '', bairro: a.bairro || saved.district || '', cidade: a.localidade || saved.city || '', uf: a.uf || saved.state || '' };
    $('#bagItems').innerHTML = `
      ${user ? '' : `<div class="co-login"><p>Entre na sua conta para acompanhar este pedido, com status e rastreio.</p><a class="btn-line" href="conta.html?volta=sacola">Entrar ou criar conta</a></div>`}
      <form class="co-form" id="coForm" novalidate>
        ${FIELDS.map(([k, l, ac]) => `<label class="co-f co-${k}"><span>${l}</span><input name="${k}" value="${esc(val[k])}" ${ac ? `autocomplete="${ac}"` : ''} ${k === 'comp' ? '' : 'required'} ${k === 'cep' || k === 'numero' || k === 'fone' ? 'inputmode="numeric"' : ''}></label>`).join('')}
        <fieldset class="co-pay"><legend>Pagamento no ato da compra</legend>
          <label><input type="radio" name="pay" value="pix" checked><span><b>Pix</b>${Math.round(PIX * 100)}% de desconto. O QR Code aparece na hora, com o valor exato.</span><em class="co-tag">${Math.round(PIX * 100)}% off</em></label>
          ${PAYCFG.CASH !== false ? '<label><input type="radio" name="pay" value="dinheiro"><span><b>Dinheiro</b>Pague na entrega ou na retirada. Se precisar, levamos troco.</span></label>' : ''}
          <label class="co-off" aria-disabled="true"><input type="radio" name="pay" value="cartao" disabled><span><b>Cartão de crédito</b>Em breve.</span><em class="co-tag">em breve</em></label>
        </fieldset>
        <label class="co-f co-troco" hidden><span>Troco para quanto? (opcional)</span><input name="troco" inputmode="decimal" placeholder="Ex.: 200"></label>
        <div class="co-cupom"><label class="co-f"><span>Cupom de desconto</span><input name="cupom" autocomplete="off" value="${esc(coupon?.code || '')}" style="text-transform:uppercase"></label><button type="button" class="btn-line" id="applyCoupon">Aplicar</button><p class="co-cmsg" id="couponMsg">${coupon ? `Cupom ${esc(coupon.code)} aplicado.` : ''}</p></div>
      </form>`;
    const paint = () => {
      const pay = $('#coForm').pay.value, t = totals(pay);
      $('#bagFoot').innerHTML = `<div class="row"><span>Peças</span><span>${money(t.sub)}</span></div>
        <div class="row"><span>Frete ${ship ? esc(ship.label) : ''}</span><span>${ship ? (ship.price ? money(ship.price) : 'Cortesia') : 'a combinar'}</span></div>
        ${t.cd ? `<div class="row pix"><span>Cupom ${esc(coupon.code)}</span><span>− ${money(t.cd)}</span></div>` : ''}
        ${t.disc ? `<div class="row pix"><span>Desconto Pix</span><span>− ${money(t.disc)}</span></div>` : ''}
        <div class="row total"><span>Total</span><span>${money(t.total)}</span></div>
        <button class="btn-gold" type="button" id="placeOrder">${pay === 'pix' ? 'Gerar Pix e finalizar' : 'Confirmar pedido em dinheiro'}</button>
        <button class="btn-text" type="button" id="backBag">Voltar para a sacola</button>`;
    };
    paint();
    $('#coForm').addEventListener('change', () => { $('.co-troco').hidden = $('#coForm').pay.value !== 'dinheiro'; paint(); });
    $('#applyCoupon').addEventListener('click', async () => {
      const code = $('#coForm').cupom.value.trim().toUpperCase(), msg = $('#couponMsg');
      if (!code) { coupon = null; msg.textContent = ''; paint(); return; }
      try {
        const r = window.V?.api ? await window.V.api.checkCoupon(code, subtotal()) : { ok: false, message: 'Cupom indisponível agora.' };
        if (r.ok) { coupon = { code: r.code || code, discount: +r.discount }; msg.textContent = `Cupom ${coupon.code} aplicado: − ${money(coupon.discount)}.`; msg.classList.remove('err'); haptic(12); }
        else { coupon = null; msg.textContent = r.message || 'Cupom inválido.'; msg.classList.add('err'); }
      } catch (e) { coupon = null; msg.textContent = 'Não consegui validar o cupom agora.'; msg.classList.add('err'); }
      paint();
    });
    $('#coForm').cep.addEventListener('input', async (e) => {
      const v = e.target.value.replace(/\D/g, ''); if (v.length !== 8) return;
      try { const j = await (await fetch(`https://viacep.com.br/ws/${v}/json/`)).json(); if (j.erro) return; const f = $('#coForm'); f.rua.value = j.logradouro || f.rua.value; f.bairro.value = j.bairro || f.bairro.value; f.cidade.value = j.localidade; f.uf.value = j.uf; f.numero.focus(); } catch (err) { /* digita à mão */ }
    });
  }
  async function placeOrder() {
    const f = $('#coForm'), d = Object.fromEntries(new FormData(f));
    const miss = FIELDS.filter(([k]) => k !== 'comp' && !String(d[k] || '').trim());
    if (miss.length) { toast(`Preencha: ${miss.map((m) => m[1]).join(', ')}.`); f[miss[0][0]].focus(); return; }
    const btn = $('#placeOrder'); btn.disabled = true; btn.textContent = 'Enviando...';
    const pay = d.pay === 'dinheiro' ? 'dinheiro' : 'pix', t = totals(pay);
    const troco = String(d.troco || '').replace(',', '.').replace(/[^\d.]/g, '');
    const address = { name: d.nome, phone: d.fone, cep: d.cep, street: d.rua, number: d.numero, complement: d.comp, district: d.bairro, city: d.cidade, state: d.uf, ...(pay === 'dinheiro' && troco ? { troco: +troco } : {}) };
    const lines = bag.map((x) => { const p = bySlug.get(x.slug); return `• ${x.qty}x ${p.name}${p.color ? ` (${p.color})` : ''}, tamanho ${x.size}: ${money(p.price * x.qty)}`; });
    const addrTxt = `${d.rua}, ${d.numero}${d.comp ? ' ' + d.comp : ''}, ${d.bairro}, ${d.cidade}/${d.uf}, CEP ${d.cep}`;
    let code = null, saved = false, total = t.total;
    if (window.V?.state?.user) {
      try {
        const r = await window.V.api.placeOrder({
          p_items: bag.map((x) => ({ slug: x.slug, qty: x.qty, size: x.size, color: bySlug.get(x.slug).color })),
          p_address: address, p_shipping: { label: ship ? ship.label : 'A combinar', price: ship ? ship.price : 0 }, p_payment: pay, p_coupon: coupon?.code || null, p_gift: null
        });
        code = r.code; saved = true; if (r.total != null) total = +r.total;
        try { const had = await window.V.api.addresses(); if (!had.length) await window.V.api.saveAddress({ label: 'Principal', recipient: d.nome, is_default: true, cep: d.cep, street: d.rua, number: d.numero, complement: d.comp, district: d.bairro, city: d.cidade, state: d.uf }); } catch (e) { /* já existe */ }
      } catch (err) { console.warn('[Vellure] pedido no banco falhou, seguindo pelo WhatsApp', err); }
    }
    if (!code) code = 'VL' + Date.now().toString(36).toUpperCase().slice(-6);
    const pagto = pay === 'pix' ? `Pix (${Math.round(PIX * 100)}% off)` : `Dinheiro na entrega${troco ? `, troco para ${money(troco)}` : ''}`;
    const msg = `Olá, Vellure! Pedido ${code}:\n\n${lines.join('\n')}\n\nFrete: ${ship ? `${ship.label}, ${ship.price ? money(ship.price) : 'cortesia'}` : 'a combinar'}${coupon ? `\nCupom: ${coupon.code}` : ''}\nPagamento: ${pagto}\nTotal: ${money(total)}\n\nEntrega para ${d.nome}: ${addrTxt}`;
    view = 'done';
    $('#bag h2').textContent = pay === 'pix' ? 'Pague com Pix' : 'Pedido confirmado';
    const done = (body, foot) => { $('#bagItems').innerHTML = body; $('#bagFoot').innerHTML = foot; };
    if (pay === 'pix') {
      const ready = pixReady(), payload = ready ? pixPayload(total, code) : '';
      done(`<div class="pix">
          <p class="pix-code">Pedido <b>${esc(code)}</b></p>
          <p class="pix-amt">${money(total)}</p>
          ${ready ? `<div class="pix-qr" id="pixQr"><span class="pix-load"></span></div>
          <p class="pix-timer">Pague em até <b id="pixTimer">${PAYCFG.PIX_MINUTES || 30}:00</b> para garantir as peças.</p>
          <button type="button" class="btn-line pix-copy" id="pixCopy" data-code="${esc(payload)}">Copiar código Pix</button>
          <ol class="pix-steps"><li>Abra o app do seu banco e escolha Pix.</li><li>Escaneie o QR Code ou cole o código.</li><li>Confira o valor e confirme. Depois toque em “Já paguei”.</li></ol>`
          : '<p class="pix-note">A concierge envia a chave Pix com o valor exato pelo WhatsApp em instantes.</p>'}
        </div>`,
        `<a class="btn-gold" href="${esc(waLink(msg + '\n\n' + (ready ? 'Já paguei o Pix, segue o comprovante.' : 'Pode me enviar a chave Pix?')))}" target="_blank" rel="noopener">${ready ? 'Já paguei, enviar comprovante' : 'Receber a chave Pix'}</a>${saved ? '<a class="btn-line" href="conta.html#pedidos">Acompanhar meu pedido</a>' : ''}`);
      if (ready) {
        pixQrSvg(payload).then((svg) => { $('#pixQr').innerHTML = svg; }).catch(() => { $('#pixQr').innerHTML = '<p class="pix-note">Use o código copia e cola abaixo.</p>'; });
        $('#pixCopy').addEventListener('click', async (e) => { try { await navigator.clipboard.writeText(e.currentTarget.dataset.code); } catch (err) { const ta = document.createElement('textarea'); ta.value = e.currentTarget.dataset.code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } e.currentTarget.textContent = 'Código copiado'; haptic(15); toast('Código Pix copiado. Cole no app do seu banco.'); });
        const end = Date.now() + (PAYCFG.PIX_MINUTES || 30) * 60000;
        const tick = () => { const el = $('#pixTimer'); if (!el) return; const left = Math.max(0, end - Date.now()); el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`; if (left > 0) setTimeout(tick, 1000); else el.textContent = 'prazo encerrado, fale com a concierge'; };
        tick();
      }
    } else {
      done(`<div class="done">
          <svg viewBox="0 0 100 100" class="done-mark" aria-hidden="true"><circle cx="50" cy="50" r="46"/><path d="M24 26 C34 28 38 40 44 56 C47 64 49 72 50 78 M76 26 C66 28 62 40 56 56 C53 64 51 72 50 78"/></svg>
          <strong>Pedido ${esc(code)}</strong>
          <p>Pagamento em dinheiro de <b>${money(total)}</b> na entrega ou na retirada${troco ? `, com troco para ${money(troco)}` : ''}. A concierge confirma o horário com você.</p></div>`,
        `<a class="btn-gold" href="${esc(waLink(msg))}" target="_blank" rel="noopener">Confirmar com a concierge</a>${saved ? '<a class="btn-line" href="conta.html#pedidos">Acompanhar meu pedido</a>' : ''}`);
    }
    bag = []; coupon = null; save();
    haptic([20, 40, 20]);
  }

  $('#bagItems').addEventListener('click', (e) => {
    const row = e.target.closest('.bag-item'); if (!row) return; const i = +row.dataset.i;
    if (e.target.closest('.rm')) bag.splice(i, 1);
    const q = e.target.closest('[data-q]');
    if (q) {
      const n = left(bySlug.get(bag[i].slug), bag[i].size);
      if (+q.dataset.q > 0 && n !== null && bag[i].qty + 1 > n) { toast(n === 1 ? `É a última peça no ${bag[i].size}.` : `Temos só ${n} no ${bag[i].size}.`); return; }
      bag[i].qty += +q.dataset.q; if (bag[i].qty < 1) bag.splice(i, 1);
    }
    save(); renderBag(); freteBox && freteBox.recalc();
  });
  $('#bagFoot').addEventListener('click', (e) => {
    if (e.target.closest('[data-go]')) { closeBag(); setTimeout(() => window.__vellureGo && window.__vellureGo('#vestiaire'), 350); }
    if (e.target.id === 'toCheckout') { view = 'checkout'; renderBag(); $('#bagItems').scrollTop = 0; }
    if (e.target.id === 'backBag') { view = 'list'; renderBag(); }
    if (e.target.id === 'placeOrder') placeOrder();
  });
  function openBag() { if (view === 'done' && !bag.length) view = 'list'; renderBag(); bagEl.classList.add('open'); bagEl.setAttribute('aria-hidden', 'false'); scrim.classList.add('on'); lock(); }
  function closeBag() { if (!bagEl.classList.contains('open')) return; bagEl.classList.remove('open'); bagEl.setAttribute('aria-hidden', 'true'); scrim.classList.remove('on'); unlock(); if (view === 'done') view = 'list'; }
  $('#bagBtn').addEventListener('click', openBag);
  $('.bag-close').addEventListener('click', closeBag);
  scrim.addEventListener('click', closeBag);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (sheet.classList.contains('open')) return closeSheet(); closeBag(); close(); } });

  function paintSeen() {
    const box = $('#seen'); if (!box) return;
    const list = local.get('vellure_vistos', []).map((x) => bySlug.get(x)).filter(Boolean);
    box.hidden = list.length < 2;
    $('#seenRow').innerHTML = list.map((p) => `<button type="button" data-slug="${esc(p.slug)}"><img src="${esc(p.imgs[0])}" alt="" loading="lazy"><span>${esc(p.name)}<br>${money(p.price)}</span></button>`).join('');
  }
  $('#seenRow') && $('#seenRow').addEventListener('click', (e) => { const b = e.target.closest('[data-slug]'); if (b) open(b.dataset.slug); });
  save(); renderGrid(); paintSeen();
  if (/[?&]sacola=1/.test(location.search)) setTimeout(() => { view = 'checkout'; openBag(); }, 800);
  return { open, close, renderGrid, openBag, add, bySlug };
}
