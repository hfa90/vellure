/* =====================================================================
   VELLURE 3D · Ateliê: simulador de tamanho (manequim que se molda às
   medidas) e simulador de frete (a jornada do pacote até a sua porta)
   ===================================================================== */
const C = window.VELLURE_CONFIG || {};
const money = (n) => (+n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const lerp = (a, b, t) => a + (b - a) * t;
const MKEY = 'vellure_medidas';

/* ---------------- cálculo (padrão brasileiro) ---------------- */
const BANDS = [[0, 67, '38'], [67.01, 72, '40'], [72.01, 77, '42'], [77.01, 82, '44'], [82.01, 87, '46'], [87.01, 92, '48'], [92.01, 97, '50'], [97.01, 102, '52'], [102.01, 999, '54']];
const CUPS = [[10, 'AA'], [12.5, 'A'], [15, 'B'], [17.5, 'C'], [20, 'D'], [22.5, 'DD'], [25, 'E'], [999, 'F']];
const CUP_ORDER = CUPS.map((c) => c[1]);
const LETTERS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
const NUM = { PP: '36', P: '38', M: '40/42', G: '44', GG: '46/48', XG: '50', XXG: '52' };
const HIP = [88, 94, 100, 106, 114, 122, 999], WAIST = [62, 66, 72, 80, 88, 96, 999], BUST = [84, 88, 96, 104, 112, 120, 999];
const idx = (arr, v) => arr.findIndex((x) => v <= x);

export function sizeCalc(m, fit = 'ideal') {
  const band = BANDS.find(([a, b]) => m.sobBusto >= a && m.sobBusto <= b)[2];
  const diff = m.busto - m.sobBusto;
  const cup = CUPS.find(([lim]) => diff < lim)[1];
  const iHip = idx(HIP, m.quadril), iWaist = idx(WAIST, m.cintura), iBust = idx(BUST, m.busto);
  let panty = fit === 'justa' ? iHip : Math.max(iHip, iWaist);
  if (fit === 'solta') panty = Math.min(panty + 1, LETTERS.length - 1);
  let body = Math.max(iBust, iHip, fit === 'justa' ? 0 : iWaist);
  if (fit === 'solta') body = Math.min(body + 1, LETTERS.length - 1);
  const bi = CUP_ORDER.indexOf(cup), bn = +band, sisters = [];
  if (bn > 38 && bi < CUP_ORDER.length - 1) sisters.push(`${bn - 2}${CUP_ORDER[bi + 1]}`);
  if (bn < 54 && bi > 0) sisters.push(`${bn + 2}${CUP_ORDER[bi - 1]}`);
  const { busto: b, cintura: w, quadril: h } = m;
  let shape = 'Retângulo';
  if (w >= b * 0.92 && w >= h * 0.88) shape = 'Oval';
  else if (Math.abs(b - h) <= 5 && w <= Math.min(b, h) * 0.78) shape = 'Ampulheta';
  else if (h - b > 5) shape = 'Pera';
  else if (b - h > 5) shape = 'Triângulo invertido';
  return { bra: band + cup, sisters, panty: LETTERS[panty], pantyNum: NUM[LETTERS[panty]], body: LETTERS[body], shape };
}
const SHAPES = {
  Ampulheta: 'Busto e quadril em equilíbrio, cintura marcada. Corsets e cinturas altas desenham suas curvas.',
  Pera: 'Quadril mais largo que o busto. Sutiãs com detalhe no colo equilibram, calcinhas cavadas alongam.',
  'Triângulo invertido': 'Busto mais largo que o quadril. Laterais com tiras e alças largas trazem harmonia.',
  Retângulo: 'Medidas alinhadas, silhueta longilínea. Recortes, franzidos e laços criam movimento.',
  Oval: 'Volume no centro, colo e pernas elegantes. Camisolas fluidas e bojos firmes valorizam.'
};
const FIELDS = [
  { k: 'busto', name: 'Busto', min: 70, max: 140, y: 168, how: 'Na parte mais projetada dos seios, fita paralela ao chão, sem apertar.' },
  { k: 'sobBusto', name: 'Sob o busto', min: 60, max: 120, y: 204, how: 'Logo abaixo dos seios, onde fica o elástico do sutiã. Solte o ar.' },
  { k: 'cintura', name: 'Cintura', min: 54, max: 130, y: 262, how: 'Na parte mais fina do tronco, dois dedos acima do umbigo.' },
  { k: 'quadril', name: 'Quadril', min: 78, max: 150, y: 338, how: 'Na parte mais larga do quadril e do bumbum, pés juntos.' }
];
export function loadMeasures() { try { return JSON.parse(localStorage.getItem(MKEY)) || null; } catch (e) { return null; } }
export function saveMeasures(m) { try { localStorage.setItem(MKEY, JSON.stringify(m)); } catch (e) { /* privado */ } }

/* ---------------- manequim ---------------- */
function catmull(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function formPath(m) {
  const k = 0.74, cx = 150;
  const hb = m.busto * k * 1.02, hu = m.sobBusto * k * 0.98, hw = m.cintura * k * 0.98, hh = m.quadril * k;
  const R = [[cx + 15, 52], [cx + 18, 68], [cx + hb * 0.48, 82], [cx + hb * 0.8, 97], [cx + hb * 0.93, 116], [cx + hb * 0.97, 140], [cx + hb, 168], [cx + hu, 204], [cx + (hu + hw) / 2, 232], [cx + hw, 262], [cx + (hw + hh) / 2 + 3, 300], [cx + hh, 338], [cx + hh * 0.92, 372], [cx + hh * 0.55, 392], [cx, 398]];
  const L = R.slice().reverse().map(([x, y]) => [2 * cx - x, y]);
  return { d: catmull(R) + ' ' + catmull(L).replace(/^M/, 'L') + ' Z', hb, hu, hw, hh };
}

export function mountSizer(root, { onApply, compact = false, onSave } = {}) {
  const saved = loadMeasures();
  const target = saved || { busto: 90, sobBusto: 75, cintura: 70, quadril: 98 };
  const cur = { ...target };
  let fit = 'ideal', focus = 'busto', raf = 0;
  root.classList.add('sz');
  if (compact) root.classList.add('sz-compact');
  root.innerHTML = `
    <div class="sz-stage">
      <svg viewBox="0 0 300 520" role="img" aria-label="Manequim com suas medidas">
        <defs>
          <linearGradient id="szG" x1="0" x2="1"><stop offset="0" stop-color="#d8bd88" stop-opacity=".05"/><stop offset=".5" stop-color="#d8bd88" stop-opacity=".22"/><stop offset="1" stop-color="#d8bd88" stop-opacity=".04"/></linearGradient>
          <linearGradient id="szS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dcae"/><stop offset="1" stop-color="#a07a42"/></linearGradient>
        </defs>
        <path class="sz-body" fill="url(#szG)" stroke="url(#szS)" stroke-width="1.4"/>
        <path class="sz-cups" fill="none" stroke="#d8bd88" stroke-opacity=".5" stroke-width="1"/>
        <line x1="150" y1="40" x2="150" y2="52" stroke="url(#szS)" stroke-width="3" stroke-linecap="round"/>
        <circle cx="150" cy="36" r="6" fill="none" stroke="url(#szS)" stroke-width="1.4"/>
        <line x1="150" y1="398" x2="150" y2="486" stroke="url(#szS)" stroke-width="3"/>
        <path d="M150 486 L104 508 M150 486 L196 508 M150 486 L150 512" stroke="url(#szS)" stroke-width="2" stroke-linecap="round"/>
        ${FIELDS.map((f) => `<g class="sz-tape" data-k="${f.k}"><ellipse cx="150" cy="${f.y}" rx="50" ry="8" fill="none" stroke-width="1.4" stroke-dasharray="3 3"/><text x="150" y="${f.y - 13}" text-anchor="middle"></text></g>`).join('')}
      </svg>
      <p class="sz-shape"></p>
    </div>
    <div class="sz-panel">
      <div class="sz-fit" role="radiogroup" aria-label="Como você gosta de vestir">
        <button type="button" data-fit="justa" role="radio">Mais justa</button><button type="button" data-fit="ideal" role="radio" class="on">Na medida</button><button type="button" data-fit="solta" role="radio">Mais solta</button>
      </div>
      ${FIELDS.map((f) => `<label class="sz-row" data-k="${f.k}"><span class="sz-lbl">${f.name}</span><span class="sz-val"><b></b> cm</span>
        <input type="range" min="${f.min}" max="${f.max}" step="0.5" value="${target[f.k]}" aria-label="${f.name} em centímetros"></label>`).join('')}
      <p class="sz-how"></p>
      <div class="sz-res">
        <div><span>Sutiã</span><b data-r="bra"></b><small data-r="sis"></small></div>
        <div><span>Calcinha</span><b data-r="panty"></b><small data-r="pnum"></small></div>
        <div><span>Corset e body</span><b data-r="body"></b><small>numeração letra</small></div>
      </div>
      <div class="sz-actions">${onApply ? '<button type="button" class="btn-gold" data-act="apply">Usar este tamanho</button>' : ''}<button type="button" class="btn-line" data-act="save">Guardar minhas medidas</button></div>
    </div>`;
  const body = root.querySelector('.sz-body'), cups = root.querySelector('.sz-cups');
  const tapes = [...root.querySelectorAll('.sz-tape')];
  let res = null;

  function draw() {
    raf = 0; let moving = false;
    for (const f of FIELDS) { const d = target[f.k] - cur[f.k]; if (Math.abs(d) > 0.02) { cur[f.k] += d * 0.18; moving = true; } else cur[f.k] = target[f.k]; }
    const g = formPath(cur);
    body.setAttribute('d', g.d);
    const cupR = Math.max(10, (cur.busto - cur.sobBusto) * 1.6 + 6);
    cups.setAttribute('d', `M${150 - g.hb * 0.82} ${178} q${g.hb * 0.36} ${cupR * 0.9} ${g.hb * 0.76} 0 M${150 + 6} ${178} q${g.hb * 0.36} ${cupR * 0.9} ${g.hb * 0.76} 0`);
    const hw = { busto: g.hb, sobBusto: g.hu, cintura: g.hw, quadril: g.hh };
    tapes.forEach((t) => {
      const k = t.dataset.k, e = t.querySelector('ellipse');
      e.setAttribute('rx', (hw[k] + 3).toFixed(1)); e.setAttribute('ry', ((hw[k] + 3) * 0.16).toFixed(1));
      t.classList.toggle('on', k === focus);
      t.querySelector('text').textContent = k === focus ? `${target[k].toFixed(target[k] % 1 ? 1 : 0)} cm` : '';
    });
    if (moving) raf = requestAnimationFrame(draw);
  }
  function refresh() {
    res = sizeCalc(target, fit);
    root.querySelector('[data-r="bra"]').textContent = res.bra;
    root.querySelector('[data-r="sis"]').textContent = res.sisters.length ? `ou ${res.sisters.join(', ')}` : '';
    root.querySelector('[data-r="panty"]').textContent = res.panty;
    root.querySelector('[data-r="pnum"]').textContent = `equivale ao ${res.pantyNum}`;
    root.querySelector('[data-r="body"]').textContent = res.body;
    root.querySelector('.sz-shape').innerHTML = `<b>${res.shape}</b>${SHAPES[res.shape]}`;
    root.querySelectorAll('.sz-row').forEach((r) => { const v = target[r.dataset.k]; r.querySelector('b').textContent = v.toFixed(v % 1 ? 1 : 0); const i = r.querySelector('input'); i.style.setProperty('--p', `${((v - i.min) / (i.max - i.min)) * 100}%`); });
    root.querySelector('.sz-how').textContent = FIELDS.find((f) => f.k === focus).how;
    if (!raf) raf = requestAnimationFrame(draw);
  }
  root.querySelectorAll('.sz-row').forEach((r) => {
    const i = r.querySelector('input'), k = r.dataset.k;
    const set = () => { target[k] = +i.value; if (k === 'sobBusto' && target.sobBusto > target.busto - 2) { target.busto = target.sobBusto + 2; root.querySelector('[data-k="busto"] input').value = target.busto; } focus = k; refresh(); };
    i.addEventListener('input', set);
    i.addEventListener('focus', () => { focus = k; refresh(); });
    i.addEventListener('pointerdown', () => { focus = k; refresh(); });
  });
  root.querySelector('.sz-fit').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; fit = b.dataset.fit;
    root.querySelectorAll('.sz-fit button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
    refresh();
  });
  root.querySelector('.sz-actions').addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    saveMeasures({ ...target });
    if (a.dataset.act === 'apply' && onApply) onApply(res, { ...target });
    if (a.dataset.act === 'save') { onSave ? onSave({ ...target }) : null; a.textContent = 'Medidas guardadas'; setTimeout(() => (a.textContent = 'Guardar minhas medidas'), 2200); }
  });
  refresh();
  return {
    get result() { return res; },
    set(m) { Object.assign(target, m); root.querySelectorAll('.sz-row').forEach((r) => (r.querySelector('input').value = target[r.dataset.k])); refresh(); }
  };
}

/* ---------------- frete ---------------- */
const UF_RANGES = [[1000, 19999, 'SP'], [20000, 28999, 'RJ'], [29000, 29999, 'ES'], [30000, 39999, 'MG'], [40000, 48999, 'BA'], [49000, 49999, 'SE'], [50000, 56999, 'PE'], [57000, 57999, 'AL'], [58000, 58999, 'PB'], [59000, 59999, 'RN'], [60000, 63999, 'CE'], [64000, 64999, 'PI'], [65000, 65999, 'MA'], [66000, 68899, 'PA'], [68900, 68999, 'AP'], [69000, 69299, 'AM'], [69300, 69399, 'RR'], [69400, 69899, 'AM'], [69900, 69999, 'AC'], [70000, 72799, 'DF'], [72800, 76799, 'GO'], [76800, 76999, 'RO'], [77000, 77999, 'TO'], [78000, 78899, 'MT'], [79000, 79999, 'MS'], [80000, 87999, 'PR'], [88000, 89999, 'SC'], [90000, 99999, 'RS']];
const RATE_FALLBACK = { SP: [29.9, 3, 49.9, 1], RJ: [34.9, 4, 59.9, 2], MG: [34.9, 4, 59.9, 2], ES: [39.9, 5, 64.9, 2], PR: [39.9, 5, 64.9, 2], SC: [42.9, 5, 69.9, 3], RS: [44.9, 6, 72.9, 3], DF: [44.9, 5, 72.9, 2], GO: [44.9, 6, 72.9, 3], MT: [52.9, 7, 84.9, 3], MS: [49.9, 6, 79.9, 3], BA: [49.9, 7, 79.9, 3], PE: [52.9, 7, 84.9, 3], CE: [54.9, 8, 86.9, 3], RN: [54.9, 8, 86.9, 4], PB: [54.9, 8, 86.9, 4], AL: [54.9, 8, 86.9, 4], SE: [52.9, 8, 84.9, 4], MA: [59.9, 9, 94.9, 4], PI: [59.9, 9, 94.9, 4], PA: [64.9, 10, 99.9, 5], AM: [69.9, 11, 109.9, 5], AP: [69.9, 12, 109.9, 6], RR: [72.9, 12, 114.9, 6], RO: [64.9, 10, 99.9, 5], AC: [72.9, 12, 114.9, 6], TO: [59.9, 9, 94.9, 4] };

function addBusinessDays(n, from = new Date()) {
  const d = new Date(from); if (d.getHours() >= 14) d.setDate(d.getDate() + 1);
  let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) left--; }
  return d;
}
const fmtDay = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

export async function quoteShipping(cep, subtotal = 0) {
  const digits = String(cep).replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('Digite um CEP com 8 números.');
  let addr = null;
  try { const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`); const j = await r.json(); if (j.erro) throw new Error('nf'); addr = j; }
  catch (e) { if (e.message === 'nf') throw new Error('Não encontramos esse CEP. Confira os números.'); }
  const n = +digits.slice(0, 5);
  const uf = addr?.uf || (UF_RANGES.find(([a, b]) => n >= a && n <= b) || [])[2];
  if (!uf) throw new Error('Ainda não entregamos nesse CEP.');
  let rate = null;
  try { const rows = window.V?.api ? await window.V.api.rates() : []; const r = rows.find((x) => x.uf === uf); if (r) rate = [+r.classic_price, +r.classic_days, +r.express_price, +r.express_days]; } catch (e) { /* tabela local */ }
  rate = rate || RATE_FALLBACK[uf] || [59.9, 9, 94.9, 4];
  const free = subtotal >= (C.FREE_SHIPPING_FROM || 299);
  const options = [
    { id: 'economico', label: 'Econômico', price: free ? 0 : rate[0], days: rate[1] },
    { id: 'expresso', label: 'Expresso', price: free ? 0 : rate[2], days: rate[3] }
  ].map((o) => ({ ...o, arrive: addBusinessDays(o.days + 1) }));
  return { uf, addr, options, free, cep: digits };
}

export function mountFrete(root, { subtotal = () => 0, onChoose, compact = false } = {}) {
  root.classList.add('fr'); if (compact) root.classList.add('fr-compact');
  let saved = ''; try { saved = localStorage.getItem('vellure_cep') || ''; } catch (e) { /* */ }
  root.innerHTML = `
    <form class="fr-form" novalidate>
      <label class="fr-field"><span>Seu CEP</span><input inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000" value="${saved.replace(/^(\d{5})(\d{3})$/, '$1-$2')}"></label>
      <button type="submit" class="btn-line">Calcular frete</button>
    </form>
    <p class="fr-msg" aria-live="polite">Frete cortesia em compras acima de ${money(C.FREE_SHIPPING_FROM || 299)}.</p>
    <div class="fr-out" hidden>
      <p class="fr-dest"></p>
      <div class="fr-opts" role="radiogroup" aria-label="Formas de envio"></div>
      <svg class="fr-route" viewBox="0 0 600 150" aria-hidden="true">
        <path class="fr-path-bg" d="M30 110 C 160 10, 440 10, 570 110"/>
        <path class="fr-path" d="M30 110 C 160 10, 440 10, 570 110"/>
        <circle cx="30" cy="110" r="5" class="fr-node"/><circle cx="570" cy="110" r="5" class="fr-node end"/>
        <g class="fr-parcel"><circle r="9"/><path d="M-4 -2 L0 -4 L4 -2 L4 3 L0 5 L-4 3 Z M-4 -2 L0 0 L4 -2 M0 0 V5"/></g>
        <text x="30" y="135" text-anchor="start" class="fr-t">Ateliê Vellure</text><text x="570" y="135" text-anchor="end" class="fr-t fr-city"></text>
      </svg>
      <ol class="fr-steps"></ol>
    </div>`;
  const input = root.querySelector('input'), msg = root.querySelector('.fr-msg'), out = root.querySelector('.fr-out');
  const path = root.querySelector('.fr-path'), parcel = root.querySelector('.fr-parcel');
  const L = path.getTotalLength ? path.getTotalLength() : 600;
  let q = null, sel = 'economico', anim = 0;
  input.addEventListener('input', () => { const v = input.value.replace(/\D/g, '').slice(0, 8); input.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v; if (v.length === 8) go(); });
  root.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); go(); });

  async function go() {
    msg.textContent = 'Calculando...'; msg.classList.remove('err');
    try {
      q = await quoteShipping(input.value, subtotal());
      try { localStorage.setItem('vellure_cep', q.cep); } catch (e) { /* */ }
      const a = q.addr;
      root.querySelector('.fr-dest').innerHTML = a ? `${a.logradouro ? a.logradouro + ', ' : ''}${a.bairro ? a.bairro + ', ' : ''}<b>${a.localidade}/${a.uf}</b>` : `<b>${q.uf}</b>`;
      root.querySelector('.fr-city').textContent = a ? a.localidade : q.uf;
      msg.textContent = q.free ? 'Seu frete é cortesia da Maison.' : `Frete cortesia acima de ${money(C.FREE_SHIPPING_FROM || 299)}.`;
      out.hidden = false; render();
    } catch (err) { msg.textContent = err.message; msg.classList.add('err'); out.hidden = true; }
  }
  function render() {
    const opts = root.querySelector('.fr-opts');
    opts.innerHTML = q.options.map((o) => `<button type="button" role="radio" aria-checked="${o.id === sel}" class="fr-opt ${o.id === sel ? 'on' : ''}" data-id="${o.id}">
      <span class="fr-name">${o.label}</span><span class="fr-eta">chega até ${fmtDay(o.arrive)}</span><span class="fr-price">${o.price ? money(o.price) : 'Cortesia'}</span></button>`).join('');
    const o = q.options.find((x) => x.id === sel);
    const now = new Date(), post = addBusinessDays(1), mid = addBusinessDays(Math.max(2, Math.round(o.days / 2) + 1));
    root.querySelector('.fr-steps').innerHTML = [['Separada no ateliê', now], ['Postada', post], ['Em trânsito', mid], ['Na sua porta', o.arrive]]
      .map(([t, d], i) => `<li style="--i:${i}"><b>${t}</b><span>${fmtDay(d)}</span></li>`).join('');
    animate(o.days);
    onChoose && onChoose(o, q);
  }
  function animate(days) {
    cancelAnimationFrame(anim);
    const dur = 900 + days * 180, t0 = performance.now();
    path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      path.style.strokeDashoffset = L * (1 - e);
      const p = path.getPointAtLength(L * e); parcel.setAttribute('transform', `translate(${p.x} ${p.y})`);
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  root.querySelector('.fr-opts').addEventListener('click', (e) => { const b = e.target.closest('.fr-opt'); if (!b) return; sel = b.dataset.id; render(); });
  if (saved.length === 8) go();
  return { get choice() { return q && { ...q.options.find((x) => x.id === sel), addr: q.addr, cep: q.cep, uf: q.uf }; }, recalc: () => q && go() };
}
