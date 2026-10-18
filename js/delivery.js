/* =====================================================================
   VELLURE · Simulador de frete por CEP + mapa lúdico de bairros
   ===================================================================== */
(function () {
  const V = (window.V = window.V || {});
  const C = window.VELLURE_CONFIG;

  const UF_RANGES = [[1000, 19999, 'SP'], [20000, 28999, 'RJ'], [29000, 29999, 'ES'], [30000, 39999, 'MG'], [40000, 48999, 'BA'], [49000, 49999, 'SE'], [50000, 56999, 'PE'], [57000, 57999, 'AL'], [58000, 58999, 'PB'], [59000, 59999, 'RN'], [60000, 63999, 'CE'], [64000, 64999, 'PI'], [65000, 65999, 'MA'], [66000, 68899, 'PA'], [68900, 68999, 'AP'], [69000, 69299, 'AM'], [69300, 69399, 'RR'], [69400, 69899, 'AM'], [69900, 69999, 'AC'], [70000, 72799, 'DF'], [72800, 76799, 'GO'], [76800, 76999, 'RO'], [77000, 77999, 'TO'], [78000, 78899, 'MT'], [79000, 79999, 'MS'], [80000, 87999, 'PR'], [88000, 89999, 'SC'], [90000, 99999, 'RS']];
  const ICONS = {
    moto: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M8.5 17h6l3-6h-4l-2-3H9M14.5 11l-3 6"/></svg>',
    plane: '<svg viewBox="0 0 24 24"><path d="M2 13l20-7-6 15-4-6-6-1z"/><path d="M12 15l4-5"/></svg>',
    box: '<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
    store: '<svg viewBox="0 0 24 24"><path d="M4 10v10h16V10M2 10l2-6h16l2 6z"/><path d="M9 20v-6h6v6"/></svg>'
  };
  V.ICONS = Object.assign(V.ICONS || {}, ICONS);

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /** Calcula opções de frete para um CEP */
  V.shippingQuote = async function (cep, subtotal = 0) {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) throw new Error('Digite um CEP com 8 números');
    let addr = null;
    try { addr = await V.api.cep(digits); } catch (e) { if (/não encontrado/.test(e.message)) throw e; }
    const n = +digits.slice(0, 5);
    const uf = addr?.uf || (UF_RANGES.find(([a, b]) => n >= a && n <= b) || [])[2];
    if (!uf) throw new Error('CEP fora da área de entrega');
    const rates = await V.api.rates();
    const rate = rates.find((r) => r.uf === uf) || { classic_price: 59.9, classic_days: 9, express_price: 94.9, express_days: 4 };
    const free = subtotal >= C.FREE_SHIPPING_FROM;
    const opts = [];
    const capital = (n >= 1000 && n <= 5999) || (n >= 8000 && n <= 8499);
    if (capital) {
      const ds = await V.api.districts();
      const d = addr && ds.find((x) => norm(addr.bairro).includes(norm(x.name)) || norm(x.name).includes(norm(addr.bairro)));
      const fee = d ? +d.fee : 34.9;
      opts.push({ id: 'mensageira', icon: 'moto', label: 'Mensageira Vellure', desc: `Hoje, em até ${d ? Math.round(d.eta_minutes / 60 * 10) / 10 + 'h' : '3h'} · caixa perfumada`, price: free ? 0 : fee, days: 0 });
      opts.push({ id: 'retirada', icon: 'store', label: 'Retirar no Atelier Jardins', desc: 'Pronto em 2h · com taça de champagne', price: 0, days: 0 });
    }
    opts.push({ id: 'expresso', icon: 'plane', label: 'Expresso Premium', desc: `${rate.express_days} dia${rate.express_days > 1 ? 's' : ''} útil${rate.express_days > 1 ? 'eis' : ''} · seguro incluso`, price: free ? 0 : +rate.express_price, days: +rate.express_days });
    opts.push({ id: 'classico', icon: 'box', label: 'Envio Clássico', desc: `Até ${rate.classic_days} dias úteis · embalagem discreta`, price: free ? 0 : +rate.classic_price, days: +rate.classic_days });
    return { uf, address: addr, options: opts, free };
  };

  V.shipOptsHTML = (opts, sel) => opts.map((o, i) => `<div class="ship-opt ${sel === o.id ? 'on' : ''}" data-ship="${o.id}" style="animation-delay:${i * 0.08}s"><span class="ic">${ICONS[o.icon]}</span><div><b>${o.label}</b><span>${o.desc}</span></div><div class="pr ${o.price ? '' : 'free'}">${o.price ? V.money(o.price) : 'Cortesia'}</div></div>`).join('');

  // ------------------- Voronoi simples (recorte por semiplanos) -------------------
  function clip(poly, a, b) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1];
    const side = (p) => (p[0] - mx) * nx + (p[1] - my) * ny;
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
      if (sp <= 0) out.push(p);
      if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  }
  function voronoi(sites, W, H) {
    return sites.map((s, i) => {
      let poly = [[0, 0], [W, 0], [W, H], [0, H]];
      sites.forEach((o, j) => { if (i !== j) poly = clip(poly, [s.x, s.y], [o.x, o.y]); });
      return poly;
    });
  }
  const polyPath = (p) => 'M' + p.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') + ' Z';

  /** Mapa ilustrado e interativo dos bairros atendidos pela Mensageira */
  V.renderCityMap = async function (root) {
    const ds = await V.api.districts();
    const W = 1000, H = 700;
    const atelier = ds.find((d) => /jardins/i.test(d.name)) || ds[0];
    const cells = voronoi(ds, W, H);
    const zone = (f) => (f <= 0 ? 0 : f <= 20 ? 1 : f <= 30 ? 2 : 3);
    const outline = 'M120 120 C220 40 420 30 560 60 C700 40 860 110 930 220 C990 320 960 450 880 520 C800 620 640 680 480 670 C330 690 190 640 110 540 C30 450 10 300 60 220 C80 180 100 150 120 120 Z';
    root.innerHTML = `
      <div class="city-map" id="cityMap">
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa ilustrado de São Paulo com os bairros de entrega">
          <defs>
            <clipPath id="cityClip"><path d="${outline}"/></clipPath>
            <pattern id="mapGrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0 H0 V24" fill="none" stroke="rgba(120,90,60,.06)"/></pattern>
            <filter id="mapShadow"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity=".15"/></filter>
          </defs>
          <rect width="${W}" height="${H}" fill="url(#mapGrid)"/>
          <path d="${outline}" fill="#efe3d3" filter="url(#mapShadow)"/>
          <g clip-path="url(#cityClip)">
            ${cells.map((c, i) => `<path class="cell z${zone(+ds[i].fee)} ${ds[i] === atelier ? 'atelier' : ''}" data-i="${i}" d="${polyPath(c)}"/>`).join('')}
            <path class="river" d="M-20 190 C150 210 260 170 400 200 C560 230 700 180 1020 220"/>
            <path class="river" d="M200 700 C230 600 270 520 290 440 C310 360 300 280 330 200"/>
            <ellipse class="park" cx="525" cy="470" rx="38" ry="26"/>
            <ellipse class="park" cx="300" cy="300" rx="16" ry="12"/>
            <path id="routePath" class="route" d="" />
          </g>
          ${ds.map((d) => `<text class="lbl" data-l="${d.id}" x="${d.x}" y="${d.y + 4}">${V.esc(d.name)}</text>`).join('')}
          <text x="560" y="510" font-size="10" fill="#7a8f6a" font-family="Jost" text-anchor="middle" letter-spacing="2">IBIRAPUERA</text>
          <text x="880" y="205" font-size="10" fill="#6f8f9c" font-family="Jost" letter-spacing="2" transform="rotate(4 880 205)">RIO TIETÊ</text>
          <text x="250" y="560" font-size="10" fill="#6f8f9c" font-family="Jost" letter-spacing="2" transform="rotate(-68 250 560)">RIO PINHEIROS</text>
          <g class="pin-atelier" transform="translate(${atelier.x} ${atelier.y - 32})">
            <circle r="16" fill="none" stroke="#c9a46a" stroke-width="2"><animate attributeName="r" values="12;30" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite"/></circle>
            <circle r="13" fill="#0e0b0d"/><text y="5" text-anchor="middle" font-family="Cormorant Garamond" font-size="16" fill="#e6cf9f">V</text>
          </g>
          <g id="courier" style="opacity:0"><circle r="15" fill="#5c1325"/><g transform="translate(-9 -9) scale(.75)" stroke="#e6cf9f" fill="none" stroke-width="1.8">${ICONS.moto.replace(/<\/?svg[^>]*>/g, '')}</g></g>
        </svg>
        <div class="map-card" id="mapCard"></div>
      </div>
      <div class="map-legend"><span><i style="background:var(--gold)"></i>Atelier · cortesia</span><span><i style="background:#e9d3b3"></i>até R$ 20</span><span><i style="background:#ecdcc6"></i>até R$ 30</span><span><i style="background:#f4ebdf;border:1px solid #e0d4c4"></i>acima de R$ 30</span></div>
      <div class="district-list">${ds.map((d, i) => `<button data-i="${i}"><span>${V.esc(d.name)}</span><span>${+d.fee ? V.money(d.fee) : 'Grátis'}</span></button>`).join('')}</div>`;

    const svg = root.querySelector('svg'), route = root.querySelector('#routePath'), courier = root.querySelector('#courier'), card = root.querySelector('#mapCard');
    let anim;
    function select(i) {
      const d = ds[i];
      root.querySelectorAll('.cell').forEach((c) => c.classList.toggle('on', +c.dataset.i === i && d !== atelier));
      root.querySelectorAll('.lbl').forEach((l) => l.classList.toggle('on', +l.dataset.l === d.id && d !== atelier));
      root.querySelectorAll('.district-list button').forEach((b) => b.classList.toggle('on', +b.dataset.i === i));
      const sx = atelier.x, sy = atelier.y - 20, ex = d.x, ey = d.y - 12;
      const mx = (sx + ex) / 2 + (ey - sy) * 0.25, my = (sy + ey) / 2 - (ex - sx) * 0.25 - 30;
      route.setAttribute('d', d === atelier ? '' : `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`);
      const len = route.getTotalLength ? route.getTotalLength() : 0;
      route.style.transition = 'none'; route.style.strokeDashoffset = len; route.style.strokeDasharray = `8 7`;
      cancelAnimationFrame(anim);
      if (len) {
        courier.style.opacity = 1;
        const t0 = performance.now(), dur = 1600 + len * 1.4;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          const p = route.getPointAtLength(e * len);
          courier.setAttribute('transform', `translate(${p.x} ${p.y})`);
          route.style.strokeDashoffset = (1 - e) * len;
          if (k < 1) anim = requestAnimationFrame(step);
        };
        anim = requestAnimationFrame(step);
      } else courier.style.opacity = 0;
      const now = new Date(), cutoff = now.getHours() < 16;
      const eta = d.eta_minutes >= 60 ? `${Math.floor(d.eta_minutes / 60)}h${String(d.eta_minutes % 60).padStart(2, '0')}` : `${d.eta_minutes} min`;
      card.innerHTML = `<span class="eyebrow">${d === atelier ? 'Nosso atelier' : 'Mensageira Vellure'}</span><h4>${V.esc(d.name)}</h4>
        <div class="kv"><div><b>${+d.fee ? V.money(d.fee) : 'Cortesia'}</b><span>Entrega</span></div><div><b>${eta}</b><span>Tempo médio</span></div><div><b>${cutoff ? 'Hoje' : 'Amanhã'}</b><span>${cutoff ? 'pedindo até 16h' : 'primeira hora'}</span></div></div>
        <p class="muted" style="font-size:13px;margin:10px 0 0">${V.esc(d.note || 'Entregue em mãos, em caixa perfumada lacrada com selo de cera. Compras acima de ' + V.money(C.FREE_SHIPPING_FROM) + ' têm entrega cortesia.')}</p>`;
      card.classList.add('on');
    }
    root.querySelectorAll('.cell, .district-list button').forEach((el) => el.addEventListener('click', () => select(+el.dataset.i)));
    root.querySelectorAll('.cell').forEach((el) => {
      el.addEventListener('mouseenter', () => root.querySelector(`.lbl[data-l="${ds[+el.dataset.i].id}"]`)?.setAttribute('font-weight', '500'));
      el.addEventListener('mouseleave', () => root.querySelector(`.lbl[data-l="${ds[+el.dataset.i].id}"]`)?.removeAttribute('font-weight'));
    });
    select(ds.indexOf(ds.find((d) => /itaim/i.test(d.name)) || ds[1]));
  };
})();
