/* =====================================================================
   VELLURE · núcleo da loja: loading, layout, sacola, login, rotas
   ===================================================================== */
(function () {
  const V = (window.V = window.V || {});
  const C = window.VELLURE_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  V.$ = $; V.$$ = $$;

  const I = (V.ICONS = Object.assign(V.ICONS || {}, {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9.2C1.6 7.2 4 4 7.2 4c2 0 3.5 1.1 4.8 2.8C13.3 5.1 14.8 4 16.8 4 20 4 22.4 7.2 21 10.8 19 15.6 12 20 12 20z"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 8h18M3 16h18"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/></svg>',
    gift: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/></svg>',
    ring: '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="M9 5l3 4 3-4-1.5-2h-3z"/></svg>',
    needle: '<svg viewBox="0 0 24 24"><path d="M20 4L6 18l-2 2M20 4c-2 0-3 1-3 1M17 7l1 1"/><path d="M4 12c4 0 6 2 8 8"/></svg>',
    truck: '<svg viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 10h4l4 4v2h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>',
    ruler: '<svg viewBox="0 0 24 24"><path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/></svg>'
  }));

  // =================================================================
  //  LOADING
  // =================================================================
  function runLoader(ready) {
    const el = $('#loader');
    const word = 'VELLURE';
    $('.word', el).innerHTML = word.split('').map((c, i) => `<span style="animation-delay:${1 + i * 0.09}s">${c}</span>`).join('');
    $('.mark-slot', el).innerHTML = V.logoMark(132);
    const bar = $('.bar i', el), pct = $('.pct', el), stage = $('.stage', el);
    const fast = sessionStorage.getItem('vellure.seen');
    const minTime = fast ? 1500 : 3000;
    const t0 = performance.now();
    let isReady = false, done = false;
    ready.then(() => (isReady = true));
    setTimeout(() => (isReady = true), 7000);

    // partículas douradas seguindo o cursor
    const cv = $('canvas', el), ctx = cv.getContext('2d');
    const fit = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
    fit(); addEventListener('resize', fit);
    const parts = [];
    const spawn = (x, y, n = 2) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 1.4 - 0.3, life: 1, r: Math.random() * 2 + 0.6 }); };
    for (let i = 0; i < 40; i++) spawn(Math.random() * innerWidth, innerHeight * (0.4 + Math.random() * 0.6), 1);
    el.addEventListener('mousemove', (e) => {
      spawn(e.clientX, e.clientY, 3);
      const rx = (e.clientY / innerHeight - 0.5) * -18, ry = (e.clientX / innerWidth - 0.5) * 22;
      stage.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    el.addEventListener('touchmove', (e) => spawn(e.touches[0].clientX, e.touches[0].clientY, 3), { passive: true });

    function frame(t) {
      if (done) return;
      const k = Math.min(1, (t - t0) / minTime);
      const shown = Math.floor((isReady ? k : Math.min(k, 0.9)) * 100);
      bar.style.width = shown + '%'; pct.textContent = String(shown).padStart(3, '0');
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.012;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.beginPath(); ctx.fillStyle = `rgba(230,207,159,${p.life * 0.8})`;
        ctx.arc(p.x * devicePixelRatio, p.y * devicePixelRatio, p.r * devicePixelRatio, 0, 7); ctx.fill();
      }
      if (Math.random() < 0.3) spawn(Math.random() * innerWidth, innerHeight + 5, 1);
      if (shown >= 100) return exit();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    el.addEventListener('click', () => { if (performance.now() - t0 > 1200 && isReady) exit(); });
    function exit() {
      if (done) return; done = true;
      bar.style.width = '100%'; pct.textContent = '100';
      sessionStorage.setItem('vellure.seen', 1);
      setTimeout(() => {
        el.classList.add('out'); document.body.classList.remove('lock');
        setTimeout(() => { el.classList.add('gone'); removeEventListener('resize', fit); }, 1300);
        revealScan();
      }, 250);
    }
  }

  // =================================================================
  //  CURSOR, REVEAL, HEADER
  // =================================================================
  function initCursor() {
    if (matchMedia('(pointer: coarse)').matches) return;
    const c = $('.cursor'), dot = $('.dot', c), ring = $('.ring', c);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x - 3}px, ${y - 3}px)`; });
    (function loop() { rx += (x - rx) * 0.16; ry += (y - ry) * 0.16; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(loop); })();
    document.addEventListener('mouseover', (e) => c.classList.toggle('hover', !!e.target.closest('a,button,.cell,input[type=range],label,.card')));
  }
  let io;
  function revealScan() {
    const ld = $('#loader');
    if (ld && !ld.classList.contains('out')) return;
    io = io || new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal:not(.in)').forEach((el) => io.observe(el));
  }
  V.revealScan = revealScan;

  // =================================================================
  //  TOAST & MODAL
  // =================================================================
  V.toast = function (msg, art) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = (art ? `<div class="t-ph">${art}</div>` : `<span style="color:var(--gold)">✦</span>`) + `<div>${msg}</div>`;
    $('.toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 500); }, 3600);
  };
  V.openModal = function (html, wide) {
    const m = $('#modal');
    $('.box', m).className = 'box' + (wide ? ' wide' : '');
    $('.box', m).innerHTML = `<button class="icon-btn x" data-close aria-label="Fechar">${I.close}</button>` + html;
    m.classList.add('on'); $('.overlay').classList.add('on'); document.body.classList.add('lock');
    $$('[data-close]', m).forEach((b) => b.addEventListener('click', V.closeModal));
    return $('.box', m);
  };
  V.closeModal = function () {
    $('#modal').classList.remove('on');
    if (!$('#cart').classList.contains('on')) { $('.overlay').classList.remove('on'); document.body.classList.remove('lock'); }
  };

  // =================================================================
  //  SACOLA & FAVORITOS
  // =================================================================
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('vellure.' + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('vellure.' + k, JSON.stringify(v)); } catch {} }
  };
  V.store = store;
  V.cart = {
    items: () => store.get('cart', []),
    save(items) { store.set('cart', items); updateBadges(true); },
    add(slug, size, color, qty = 1) {
      const items = V.cart.items();
      const f = items.find((i) => i.slug === slug && i.size === size && i.color === color);
      f ? (f.qty += qty) : items.push({ slug, size, color, qty });
      V.cart.save(items);
    },
    setQty(i, q) { const it = V.cart.items(); if (q <= 0) it.splice(i, 1); else it[i].qty = Math.min(10, q); V.cart.save(it); },
    count: () => V.cart.items().reduce((s, i) => s + i.qty, 0),
    async detailed() {
      const ps = await V.api.products();
      return V.cart.items().map((i) => ({ ...i, p: ps.find((p) => p.slug === i.slug) })).filter((i) => i.p);
    },
    async subtotal() { return (await V.cart.detailed()).reduce((s, i) => s + i.p.price * i.qty, 0); },
    clear() { V.cart.save([]); }
  };
  V.wish = {
    list: () => store.get('wish', []),
    has: (s) => V.wish.list().includes(s),
    toggle(s) {
      const l = V.wish.list(), on = !l.includes(s);
      store.set('wish', on ? [...l, s] : l.filter((x) => x !== s));
      V.api.wishToggle(s, on).catch(() => {});
      updateBadges();
      return on;
    }
  };
  function updateBadges(bump) {
    const n = V.cart.count(), b = $('#cartCount');
    b.textContent = n; b.classList.toggle('on', n > 0);
    if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    const w = V.wish.list().length, wb = $('#wishCount');
    wb.textContent = w; wb.classList.toggle('on', w > 0);
  }
  V.updateBadges = updateBadges;

  V.openCart = async function () {
    const panel = $('#cart');
    panel.classList.add('on'); $('.overlay').classList.add('on'); document.body.classList.add('lock');
    await renderCart();
  };
  V.closeCart = function () { $('#cart').classList.remove('on'); if (!$('#modal').classList.contains('on')) { $('.overlay').classList.remove('on'); document.body.classList.remove('lock'); } };
  async function renderCart() {
    const items = await V.cart.detailed();
    const sub = items.reduce((s, i) => s + i.p.price * i.qty, 0);
    const missing = Math.max(0, C.FREE_SHIPPING_FROM - sub);
    $('#cart .content').innerHTML = items.length
      ? `<div class="progress-free">${missing ? `Faltam <b>${V.money(missing)}</b> para a entrega cortesia` : '✦ Você ganhou <b>entrega cortesia</b>'}<div class="pb"><i style="width:${Math.min(100, (sub / C.FREE_SHIPPING_FROM) * 100)}%"></i></div></div>` +
        items.map((i, idx) => `<div class="line-item"><a class="ph" href="#/produto/${i.slug}">${V.productImage(i.p)}</a>
          <div><h4>${V.esc(i.p.name)}</h4><div class="meta">${V.esc(i.color || '')}${i.size ? ' · Tam. ' + V.esc(i.size) : ''}</div>
          <div class="qty"><button data-q="${idx}" data-d="-1">−</button><input value="${i.qty}" readonly aria-label="quantidade"><button data-q="${idx}" data-d="1">+</button></div>
          <button class="rm" data-rm="${idx}">Remover</button></div><div>${V.money(i.p.price * i.qty)}</div></div>`).join('')
      : `<div class="empty"><h3>Sua sacola está vazia</h3><p>Cada peça Vellure chega em caixa perfumada, lacrada com selo de cera.</p><a class="btn" href="#/loja" data-closecart>Descobrir a coleção</a></div>`;
    $('#cart footer').style.display = items.length ? '' : 'none';
    $('#cart .totals').innerHTML = `<div><span>Subtotal</span><span>${V.money(sub)}</span></div><div class="muted"><span>Entrega</span><span>calculada no checkout</span></div><div class="grand"><span>Total</span><span>${V.money(sub)}</span></div><div class="muted" style="font-size:12px"><span>ou 6× de ${V.money(sub / 6)} sem juros</span></div>`;
    $$('#cart [data-q]').forEach((b) => b.addEventListener('click', () => { const it = V.cart.items()[+b.dataset.q]; V.cart.setQty(+b.dataset.q, it.qty + +b.dataset.d); renderCart(); }));
    $$('#cart [data-rm]').forEach((b) => b.addEventListener('click', () => { V.cart.setQty(+b.dataset.rm, 0); renderCart(); }));
    $$('#cart [data-closecart], #cart a').forEach((a) => a.addEventListener('click', V.closeCart));
  }

  // =================================================================
  //  LOGIN / CADASTRO
  // =================================================================
  V.requireAuth = function (msg) {
    return new Promise((resolve) => {
      if (V.state.user) return resolve(V.state.user);
      V.openAuth(msg, resolve);
    });
  };
  V.openAuth = function (msg, onDone, tab = 'in') {
    const box = V.openModal(`<div class="center">${V.logoMark(54)}</div>
      <h3 class="center" style="margin-top:14px">Bem-vinda à <em>Maison</em></h3>
      <p class="center muted" style="margin:0">${msg || 'Entre para acompanhar pedidos, assinaturas e seus agendamentos.'}</p>
      <div class="tabs" style="justify-content:center"><button data-t="in">Entrar</button><button data-t="up">Criar conta</button></div>
      <form id="authForm" autocomplete="on"></form>`);
    const form = $('#authForm', box);
    const draw = (t) => {
      tab = t;
      $$('[data-t]', box).forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      form.innerHTML = (t === 'up' ? `<div class="field"><input name="name" placeholder=" " required autocomplete="name"><label>Nome completo</label></div><div class="field"><input name="phone" placeholder=" " autocomplete="tel"><label>WhatsApp</label></div>` : '') +
        `<div class="field"><input name="email" type="email" placeholder=" " required autocomplete="email"><label>E-mail</label></div>` +
        (t !== 'reset' ? `<div class="field"><input name="pass" type="password" placeholder=" " required minlength="6" autocomplete="${t === 'up' ? 'new-password' : 'current-password'}"><label>Senha</label></div>` : '') +
        (t === 'up' ? `<label class="check"><input type="checkbox" name="nl" checked> Quero receber convites para pré-vendas e eventos privados</label>` : '') +
        `<div class="form-msg"></div><button class="btn block">${t === 'in' ? 'Entrar' : t === 'up' ? 'Criar minha conta' : 'Enviar link'}</button>` +
        (t === 'in' ? `<p class="center" style="margin-top:14px"><a href="#" class="link" data-reset>Esqueci minha senha</a></p>` : '');
      $('[data-reset]', form)?.addEventListener('click', (e) => { e.preventDefault(); draw('reset'); });
    };
    $$('[data-t]', box).forEach((b) => b.addEventListener('click', () => draw(b.dataset.t)));
    draw(tab);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form)), msgEl = $('.form-msg', form), btn = $('button.btn', form);
      if (!V.sb) { msgEl.className = 'form-msg err'; msgEl.textContent = 'Sem conexão com o Supabase.'; return; }
      btn.disabled = true; msgEl.className = 'form-msg'; msgEl.textContent = 'Um instante…';
      try {
        if (tab === 'in') await V.api.signIn(f.email, f.pass);
        else if (tab === 'up') {
          const r = await V.api.signUp(f.email, f.pass, f.name, f.phone);
          if (f.nl) V.api.newsletter(f.email).catch(() => {});
          if (!r.session) { msgEl.className = 'form-msg ok'; msgEl.textContent = 'Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.'; btn.disabled = false; return; }
        } else { await V.api.resetPassword(f.email); msgEl.className = 'form-msg ok'; msgEl.textContent = 'Enviamos um link para redefinir sua senha.'; btn.disabled = false; return; }
        await afterLogin();
        V.closeModal();
        V.toast(`Olá, <b>${V.esc((V.state.profile?.full_name || '').split(' ')[0] || 'querida')}</b>. Que bom te ver.`);
        onDone && onDone(V.state.user);
      } catch (err) { msgEl.className = 'form-msg err'; msgEl.textContent = V.errMsg(err); btn.disabled = false; }
    });
  };
  async function afterLogin() {
    await V.api.profile(true);
    const merged = await V.api.syncWishlist(V.wish.list()).catch(() => V.wish.list());
    store.set('wish', merged); updateBadges();
    if (V.state.profile?.measurements?.sutia) store.set('sizes', { sutia: V.state.profile.measurements.sutia, band: V.state.profile.measurements.band, calcinha: V.state.profile.measurements.calcinha, body: V.state.profile.measurements.body });
    $('#acctBtn').setAttribute('title', 'Minha conta');
  }

  // =================================================================
  //  CARDS DE PRODUTO
  // =================================================================
  V.recSize = function (p) {
    const s = store.get('sizes', null); if (!s) return null;
    const numeric = /^\d/.test(p.sizes?.[0] || '');
    const want = numeric ? s.band : (p.category === 'calcinhas' ? s.calcinha : s.body || s.calcinha);
    return p.sizes?.includes(want) ? want : null;
  };
  V.cardHTML = function (p, o = {}) {
    const art = typeof p.art === 'string' ? JSON.parse(p.art) : p.art;
    const rec = o.size || V.recSize(p);
    return `<article class="card reveal" data-slug="${p.slug}">
      <a href="#/produto/${p.slug}" class="ph" aria-label="${V.esc(p.name)}">
        <div class="main">${V.productImage(p)}</div><div class="alt">${p.images?.[1] ? V.productImage(p, { zoom: true }) : V.figure(art, { zoom: true })}</div>
      </a>
      <div class="tags">${p.is_new ? '<span class="tag dark">Novo</span>' : ''}${p.compare_price ? '<span class="tag wine">Privé</span>' : ''}${p.stock > 0 && p.stock < 10 ? '<span class="tag">Últimas</span>' : ''}</div>
      <button class="wish ${V.wish.has(p.slug) ? 'on' : ''}" data-wish="${p.slug}" aria-label="Favoritar">${I.heart}</button>
      <div class="quick"><button class="btn light block sm" data-quick="${p.slug}">Adicionar${rec ? ' · ' + rec : ''}</button></div>
      <div class="info"><div><h3><a href="#/produto/${p.slug}">${V.esc(p.name)}</a></h3><div class="sub">${V.esc(p.subtitle || '')}</div>
        <div class="swatches">${(p.colors || []).map((c) => `<i style="background:${c.hex}" title="${V.esc(c.name)}"></i>`).join('')}</div></div>
        <div class="price">${p.compare_price ? `<s>${V.money(p.compare_price)}</s>` : ''}${V.money(p.price)}</div></div>
    </article>`;
  };
  V.bindCards = function (root) {
    $$('[data-wish]', root).forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      const on = V.wish.toggle(b.dataset.wish); b.classList.toggle('on', on);
      V.toast(on ? 'Adicionada aos <b>favoritos</b>' : 'Removida dos favoritos');
    }));
    $$('[data-quick]', root).forEach((b) => b.addEventListener('click', async (e) => {
      e.preventDefault();
      const p = await V.api.product(b.dataset.quick);
      const size = V.recSize(p);
      if (!size) { location.hash = '#/produto/' + p.slug; return; }
      V.cart.add(p.slug, size, p.colors?.[0]?.name || '', 1);
      V.toast(`<b>${V.esc(p.name)}</b> · ${size} na sacola`, V.figure(p.art, { frame: false }));
    }));
    revealScan();
  };

  // =================================================================
  //  ROTEADOR
  // =================================================================
  const routes = [];
  V.route = (re, fn) => routes.push([re, fn]);
  async function router() {
    const hash = location.hash.slice(1) || '/';
    const [path, qs] = hash.split('?');
    const params = new URLSearchParams(qs || '');
    const view = $('#view');
    V.closeCart(); V.closeModal(); $('.drawer-menu').classList.remove('open');
    $$('header.site nav.main a').forEach((a) => a.classList.toggle('on', path.startsWith(a.getAttribute('href').slice(1)) && a.getAttribute('href') !== '#/'));
    for (const [re, fn] of routes) {
      const m = path.match(re);
      if (m) {
        view.classList.remove('page-enter'); void view.offsetWidth; view.classList.add('page-enter');
        if (!routerFirst) window.scrollTo({ top: 0, behavior: 'instant' });
        routerFirst = false;
        try { await fn(view, m, params); } catch (e) { console.error(e); view.innerHTML = `<div class="wrap empty"><h3>Algo saiu do lugar</h3><p>${V.esc(V.errMsg(e))}</p><a class="btn" href="#/">Voltar ao início</a></div>`; }
        document.title = (view.dataset.title ? view.dataset.title + ' · ' : '') + 'Vellure — Maison de Lingerie';
        revealScan();
        return;
      }
    }
    location.hash = '#/';
  }
  let routerFirst = true;

  // =================================================================
  //  HOME
  // =================================================================
  V.route(/^\/$/, async (view) => {
    view.dataset.title = '';
    const ps = await V.api.products();
    const featured = ps.filter((p) => p.is_featured).slice(0, 8);
    const hero = ps.find((p) => p.slug === 'conjunto-nocturne') || ps[0];
    const side = ps.find((p) => p.slug === 'robe-lune') || ps[1];
    const cats = [['conjuntos', 'Conjuntos', ps.find((p) => p.slug === 'conjunto-saphir')], ['bodies', 'Bodies', ps.find((p) => p.category === 'bodies')], ['noite', 'Noite & Robes', ps.find((p) => p.slug === 'camisola-nuit-blanche')], ['noiva', 'Noiva', ps.find((p) => p.category === 'noiva')]];
    view.innerHTML = `
      <section class="wrap hero">
        <div>
          <span class="eyebrow reveal">Coleção Outono · Inverno 2026</span>
          <h1 class="reveal"><span class="split-line"><span>O luxo</span></span><span class="split-line"><span>que só <em>você</em></span></span><span class="split-line"><span>conhece.</span></span></h1>
          <p class="lead reveal d1">Lingerie de alta-costura em rendas de Calais, sedas italianas e bordados feitos à mão no nosso atelier dos Jardins.</p>
          <div class="ctas reveal d2"><a class="btn" href="#/loja">Explorar a coleção</a><a class="btn ghost" href="#/box">Box Misteriosa</a></div>
          <div class="meta reveal d3"><div><b>48h</b><span>do desenho à peça</span></div><div><b>3h</b><span>Mensageira em SP</span></div><div><b>100%</b><span>seda & renda nobre</span></div></div>
        </div>
        <div class="hero-art" id="heroArt">
          <div class="main" data-depth="12">${V.productImage(hero)}</div>
          <div class="side" data-depth="-22">${V.figure(side.art, { zoom: true, frame: false })}</div>
          <svg class="seal" viewBox="0 0 130 130"><defs><path id="circ" d="M65 65 m-52 0 a52 52 0 1 1 104 0 a52 52 0 1 1 -104 0"/></defs><circle cx="65" cy="65" r="64" fill="#faf6f1"/><text><textPath href="#circ">Maison Vellure ✦ Fait main ✦ São Paulo ✦</textPath></text><g transform="translate(43 43) scale(.44)">${V.logoMark(100).replace(/<\/?svg[^>]*>/g, '')}</g></svg>
          <div class="chip"><i>✦</i><div><b style="font-weight:400">${V.esc(hero.name)}</b><br><span class="muted">${V.money(hero.price)}</span></div></div>
        </div>
      </section>
      <div class="big-marquee"><div class="track">${Array(2).fill('<span>Renda de Calais</span><span>Seda italiana</span><span>Feito à mão</span><span>Box Misteriosa</span><span>Cercle Privé</span><span>Mensageira em 3h</span>').join('')}</div></div>
      <section class="sec wrap">
        <div class="sec-head"><h2 class="reveal">Nossas <em>categorias</em></h2><a class="link" href="#/loja">Ver tudo</a></div>
        <div class="cats">${cats.map(([s, n, p], i) => `<a class="cat reveal d${i}" href="#/loja?cat=${s}">${p ? V.productImage(p) : ''}<div class="lbl"><span>0${i + 1}</span><h3>${n}</h3></div></a>`).join('')}</div>
      </section>
      <section class="sec wrap" style="padding-top:40px">
        <div class="sec-head"><h2 class="reveal">Peças <em>assinatura</em></h2><a class="link" href="#/loja">Toda a coleção</a></div>
        <div class="grid" id="homeGrid">${featured.map((p) => V.cardHTML(p)).join('')}</div>
      </section>
      <section class="split dark">
        <div class="art" id="boxTeaserArt"></div>
        <div class="txt"><span class="eyebrow" style="color:var(--gold)">Assinatura mensal</span>
          <h2 class="reveal"><span class="split-line"><span>Box</span></span><span class="split-line"><span><em>Misteriosa</em></span></span></h2>
          <p class="reveal">Todo mês, uma lingerie escolhida a dedo pela nossa curadoria chega à sua porta numa caixa negra lacrada com cera dourada. Você só descobre ao abrir.</p>
          <div class="reveal"><a class="btn gold" href="#/box">Quero minha Box</a></div></div>
      </section>
      <section class="sec wrap">
        <div class="sec-head"><h2 class="reveal">Feito para <em>você</em></h2></div>
        <div class="tools-grid">
          <a class="tool-card reveal" href="#/medidas"><span class="num">01</span><h3>Atelier de Medidas</h3><p>Um simulador interativo que transforma suas medidas em numeração brasileira exata — e mostra as peças que valorizam sua silhueta.</p><span class="link">Descobrir meu tamanho</span></a>
          <a class="tool-card reveal d1" href="#/entrega"><span class="num">02</span><h3>Mensageira Vellure</h3><p>Veja no mapa ilustrado quanto tempo leva para sua caixa perfumada chegar ao seu bairro — e simule o frete para todo o Brasil.</p><span class="link">Ver meu bairro</span></a>
          <a class="tool-card reveal d2" href="#/cercle"><span class="num">03</span><h3>Cercle Privé</h3><p>Prova em casa, personal stylist, gift concierge e lavanderia delicada. O clube de membros da Maison.</p><span class="link">Conhecer o clube</span></a>
        </div>
      </section>
      <section class="sec" style="background:var(--cream)"><div class="wrap manifesto">
        <span class="eyebrow">Manifesto</span>
        <p class="reveal">Acreditamos que a peça mais importante do guarda-roupa é a <em>primeira</em> que você veste — e a única que ninguém precisa ver. Por isso, cada ponto é dado pensando em <em>você</em>.</p>
        <div class="sig">${V.logoMark(46)}</div>
      </div></section>
      <section class="split">
        <div class="txt"><span class="eyebrow">Experiências</span>
          <h2 class="reveal"><span class="split-line"><span>Prova</span></span><span class="split-line"><span><em>em casa</em></span></span></h2>
          <p class="reveal">Uma mensageira Vellure leva até oito peças selecionadas para você provar com calma, no conforto da sua casa. Você fica só com o que amar.</p>
          <div class="reveal"><a class="btn" href="#/cercle">Agendar uma prova</a></div></div>
        <div class="art" id="tryArt"></div>
      </section>`;
    $('#boxTeaserArt').innerHTML = V.figure({ style: 'garter', color: '#0f0f12', accent: '#c9a46a', skin: 3, bg: 'wine' });
    $('#tryArt').innerHTML = V.figure({ style: 'slip', color: '#e8cfae', accent: '#b8925a', skin: 1, bg: 'blush' });
    V.bindCards($('#homeGrid'));
    const art = $('#heroArt');
    art.addEventListener('mousemove', (e) => {
      const r = art.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $$('[data-depth]', art).forEach((el) => (el.style.transform = `translate(${x * el.dataset.depth}px, ${y * el.dataset.depth}px)`));
    });
  });

  // =================================================================
  //  LOJA
  // =================================================================
  V.route(/^\/(loja|favoritos)$/, async (view, m, params) => {
    const fav = m[1] === 'favoritos';
    view.dataset.title = fav ? 'Favoritos' : 'Coleção';
    const [ps, cats] = await Promise.all([V.api.products(), V.api.categories()]);
    const st = { cat: params.get('cat') || 'all', sort: 'rel', q: params.get('q') || '' };
    view.innerHTML = `<section class="page-title wrap"><span class="eyebrow">${fav ? 'Sua seleção' : 'Coleção completa'}</span>
        <h1 class="reveal"><span class="split-line"><span>${fav ? 'Seus <em>favoritos</em>' : 'A <em>coleção</em>'}</span></span></h1></section>
      <div class="wrap">
        ${fav ? '' : `<div class="shop-bar"><div class="chips" id="catChips"><button class="chip-btn" data-cat="all">Todas</button>${cats.map((c) => `<button class="chip-btn" data-cat="${c.slug}">${V.esc(c.name)}</button>`).join('')}</div>
          <div style="display:flex;gap:10px"><input class="search-in" id="shopQ" placeholder="Buscar peça…" value="${V.esc(st.q)}"><select class="select" id="shopSort"><option value="rel">Relevância</option><option value="new">Novidades</option><option value="asc">Menor preço</option><option value="desc">Maior preço</option></select></div></div>`}
        <div class="grid" id="shopGrid" style="padding-bottom:120px"></div>
      </div>`;
    const draw = () => {
      let list = fav ? ps.filter((p) => V.wish.has(p.slug)) : ps.filter((p) => st.cat === 'all' || p.category === st.cat);
      if (st.q) { const q = st.q.toLowerCase(); list = list.filter((p) => (p.name + p.subtitle + p.description).toLowerCase().includes(q)); }
      if (st.sort === 'asc') list = [...list].sort((a, b) => a.price - b.price);
      if (st.sort === 'desc') list = [...list].sort((a, b) => b.price - a.price);
      if (st.sort === 'new') list = [...list].sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
      $$('#catChips [data-cat]').forEach((b) => b.classList.toggle('on', b.dataset.cat === st.cat));
      $('#shopGrid').innerHTML = list.length ? list.map((p) => V.cardHTML(p)).join('') : `<div class="empty" style="grid-column:1/-1"><h3>${fav ? 'Nenhum favorito ainda' : 'Nada encontrado'}</h3><p>${fav ? 'Toque no coração das peças que você amar.' : 'Tente outra busca.'}</p><a class="btn" href="#/loja">Ver coleção</a></div>`;
      V.bindCards($('#shopGrid'));
    };
    $$('#catChips [data-cat]').forEach((b) => b.addEventListener('click', () => { st.cat = b.dataset.cat; draw(); }));
    $('#shopSort')?.addEventListener('change', (e) => { st.sort = e.target.value; draw(); });
    $('#shopQ')?.addEventListener('input', (e) => { st.q = e.target.value; draw(); });
    draw();
  });

  // =================================================================
  //  PRODUTO
  // =================================================================
  V.route(/^\/produto\/([\w-]+)$/, async (view, m) => {
    const p = await V.api.product(m[1]);
    if (!p) throw new Error('Peça não encontrada');
    view.dataset.title = p.name;
    const art = typeof p.art === 'string' ? JSON.parse(p.art) : p.art;
    const rec = V.recSize(p);
    const st = { size: rec, color: p.colors?.[0]?.name || '', qty: 1 };
    const ps = await V.api.products();
    const related = ps.filter((x) => x.slug !== p.slug && (x.category === p.category || x.art?.style === art.style)).slice(0, 4);
    const imgs = p.images?.length ? p.images.map((u) => `<img src="${V.esc(u)}" alt="${V.esc(p.name)}">`) : [V.figure(art), V.figure(art, { zoom: true }), V.figure({ ...art, bg: art.bg === 'noir' ? 'ivory' : 'noir' }, { pose: 1 })];
    view.innerHTML = `<div class="wrap" style="padding-top:20px"><span class="muted" style="font-size:12px;letter-spacing:.15em"><a href="#/loja">COLEÇÃO</a> / <a href="#/loja?cat=${p.category}">${V.esc((p.category || '').toUpperCase())}</a></span></div>
      <section class="wrap pdp">
        <div class="gallery">${imgs.map((h) => `<div class="ph">${h}</div>`).join('')}</div>
        <div class="details">
          <span class="eyebrow">${V.esc(p.subtitle || '')}</span>
          <h1>${V.esc(p.name)}</h1>
          <div class="price">${V.money(p.price)}${p.compare_price ? `<s>${V.money(p.compare_price)}</s>` : ''}</div>
          <div class="install">ou 6× de ${V.money(p.price / 6)} sem juros · 5% off no Pix · +${Math.floor(p.price)} Pétalas</div>
          ${p.colors?.length ? `<div class="opt-label"><span>Cor · <b style="font-weight:400" id="colorName">${V.esc(st.color)}</b></span></div><div class="colors">${p.colors.map((c, i) => `<button class="${i ? '' : 'on'}" style="background:${c.hex}" data-color="${V.esc(c.name)}" data-hex="${c.hex}" aria-label="${V.esc(c.name)}"></button>`).join('')}</div>` : ''}
          <div class="opt-label"><span>Tamanho</span><a href="#/medidas" class="link" style="font-size:10px">Descobrir meu tamanho</a></div>
          <div class="sizes">${(p.sizes || []).map((s) => `<button class="${s === rec ? 'rec on' : ''}" data-size="${s}">${s}</button>`).join('')}</div>
          ${rec ? `<p style="font-size:13px;color:var(--wine);margin:10px 0 0">✦ ${rec} é o seu tamanho, segundo o Atelier de Medidas.</p>` : `<p class="muted" style="font-size:13px;margin:10px 0 0">Não sabe seu tamanho? <a href="#/medidas" style="text-decoration:underline">Use nosso simulador</a> em 30 segundos.</p>`}
          <div class="buy-row"><div class="qty"><button data-qd="-1">−</button><input id="qty" value="1" readonly aria-label="quantidade"><button data-qd="1">+</button></div><button class="btn" id="addBtn">Adicionar à sacola</button><button class="icon-btn wish ${V.wish.has(p.slug) ? 'on' : ''}" data-wish="${p.slug}" style="border:1px solid var(--line);border-radius:0;width:52px;height:52px" aria-label="Favoritar">${I.heart}</button></div>
          <div class="perks-mini"><div>${I.truck}Mensageira em 3h em SP</div><div>${I.swap}Troca cortesia em 30 dias</div><div>${I.gift}Caixa-presente perfumada</div><div>${I.shield}Pagamento seguro</div></div>
          <div class="opt-label"><span>Calcular entrega</span></div>
          <div class="ship-mini"><input id="pdpCep" placeholder="00000-000" inputmode="numeric" maxlength="9"><button class="btn sm" id="pdpCepBtn">Calcular</button></div>
          <div class="ship-result" id="pdpShip"></div>
          <div class="accordion">
            <details open><summary>A peça</summary><div class="body">${V.esc(p.description || '')}</div></details>
            <details><summary>Composição & cuidados</summary><div class="body">${V.esc(p.material || '')}<br>${V.esc(p.care || '')}</div></details>
            <details><summary>Monograma bordado</summary><div class="body">Personalize com suas iniciais bordadas à mão em fio de seda. Solicite pelo <a href="#/cercle" style="text-decoration:underline">Cercle Privé</a>.</div></details>
          </div>
        </div>
      </section>
      ${related.length ? `<section class="wrap" style="padding-bottom:120px"><div class="sec-head"><h2 class="reveal">Combina <em>com</em></h2></div><div class="grid" id="relGrid">${related.map((x) => V.cardHTML(x)).join('')}</div></section>` : ''}`;
    const setSize = (s) => { st.size = s; $$('[data-size]', view).forEach((b) => b.classList.toggle('on', b.dataset.size === s)); };
    $$('[data-size]', view).forEach((b) => b.addEventListener('click', () => setSize(b.dataset.size)));
    $$('[data-color]', view).forEach((b) => b.addEventListener('click', () => {
      st.color = b.dataset.color; $('#colorName').textContent = st.color;
      $$('[data-color]', view).forEach((x) => x.classList.toggle('on', x === b));
      if (!p.images?.length) {
        const a2 = { ...art, color: b.dataset.hex };
        const phs = $$('.gallery .ph', view);
        phs[0].innerHTML = V.figure(a2); phs[1].innerHTML = V.figure(a2, { zoom: true }); phs[2].innerHTML = V.figure({ ...a2, bg: art.bg === 'noir' ? 'ivory' : 'noir' }, { pose: 1 });
      }
    }));
    $$('[data-qd]', view).forEach((b) => b.addEventListener('click', () => { st.qty = Math.max(1, Math.min(10, st.qty + +b.dataset.qd)); $('#qty').value = st.qty; }));
    $('#addBtn').addEventListener('click', () => {
      if (!st.size) { V.toast('Escolha um <b>tamanho</b> ✦'); $('.sizes', view).animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 400 }); return; }
      V.cart.add(p.slug, st.size, st.color, st.qty);
      V.toast(`<b>${V.esc(p.name)}</b> · ${st.size} na sacola. <a href="#/checkout" style="text-decoration:underline">Finalizar</a>`, V.figure(art, { frame: false }));
    });
    $$('.gallery .ph', view).forEach((ph) => {
      ph.addEventListener('mousemove', (e) => { const r = ph.getBoundingClientRect(); const c = ph.firstElementChild; c.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`; c.style.transform = 'scale(1.6)'; });
      ph.addEventListener('mouseleave', () => (ph.firstElementChild.style.transform = ''));
    });
    const cepIn = $('#pdpCep');
    cepIn.addEventListener('input', () => { let v = cepIn.value.replace(/\D/g, '').slice(0, 8); if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5); cepIn.value = v; });
    const saved = store.get('cep', ''); if (saved) cepIn.value = saved;
    $('#pdpCepBtn').addEventListener('click', async () => {
      const out = $('#pdpShip'); out.innerHTML = '<span class="muted">Calculando…</span>';
      try {
        const q = await V.shippingQuote(cepIn.value, p.price * st.qty); store.set('cep', cepIn.value);
        out.innerHTML = (q.address ? `<div class="muted" style="font-size:12px">${V.esc(q.address.logradouro || '')} · ${V.esc(q.address.bairro || '')} · ${V.esc(q.address.localidade)}/${q.uf}</div>` : '') + q.options.map((o) => `<div class="opt"><span>${o.label}<br><span class="muted" style="font-size:12px">${o.desc}</span></span><b style="font-weight:400">${o.price ? V.money(o.price) : 'Cortesia'}</b></div>`).join('');
      } catch (e) { out.innerHTML = `<span style="color:var(--err)">${V.esc(e.message)}</span>`; }
    });
    V.bindCards(view);
  });

  // =================================================================
  //  INICIALIZAÇÃO
  // =================================================================
  async function boot() {
    document.body.classList.add('lock');
    const ready = (async () => {
      await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 2500))]);
      await V.api.session().catch(() => null);
      if (V.state.user) await afterLogin().catch(() => {});
      await V.api.products();
    })();
    runLoader(ready);
    initCursor();
    updateBadges();
    addEventListener('scroll', () => $('header.site').classList.toggle('scrolled', scrollY > 10), { passive: true });
    $('#cartBtn').addEventListener('click', V.openCart);
    $('#wishBtn').addEventListener('click', () => (location.hash = '#/favoritos'));
    $('#acctBtn').addEventListener('click', () => (V.state.user ? (location.hash = '#/conta') : V.openAuth()));
    $('#searchBtn').addEventListener('click', () => {
      const box = V.openModal(`<h3>Buscar</h3><form id="sForm" style="margin-top:20px"><div class="field"><input name="q" placeholder=" " autofocus><label>Renda, seda, body, noiva…</label></div><button class="btn block">Buscar</button></form>`);
      $('#sForm', box).addEventListener('submit', (e) => { e.preventDefault(); location.hash = '#/loja?q=' + encodeURIComponent(new FormData(e.target).get('q')); });
      setTimeout(() => $('input', box).focus(), 100);
    });
    $('.burger').addEventListener('click', () => $('.drawer-menu').classList.add('open'));
    $('.drawer-menu .close').addEventListener('click', () => $('.drawer-menu').classList.remove('open'));
    $('#cart .close').addEventListener('click', V.closeCart);
    $('.overlay').addEventListener('click', () => { V.closeCart(); V.closeModal(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { V.closeCart(); V.closeModal(); } });
    $('#goCheckout').addEventListener('click', () => { V.closeCart(); location.hash = '#/checkout'; });
    $('#nlForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const em = e.target.email.value;
      try { await V.api.newsletter(em); V.toast('Você está na <b>Liste Privée</b> ✦'); e.target.reset(); } catch (err) { V.toast(V.errMsg(err)); }
    });
    V.sb?.auth.onAuthStateChange((ev, session) => {
      V.state.user = session?.user || null;
      if (ev === 'SIGNED_OUT') { V.state.profile = null; if (location.hash.startsWith('#/conta')) location.hash = '#/'; }
    });
    addEventListener('hashchange', router);
    await ready.catch(() => {});
    if (V.state.dbReady === false) $('#dbBanner').hidden = false;
    router();
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
