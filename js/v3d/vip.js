/* =====================================================================
   VELLURE 3D · Box Misteriosa VIP
   perfil de curadoria que aprende com cada resposta, planos com
   cobrança recorrente e assinatura gravada no Supabase
   ===================================================================== */
import { createBox } from './vipbox.js';
import { $, $$, esc, money, waLink, toast, haptic, local, mySize, currentUser } from './common.js';
import { mountSizeRecorder } from './atelier.js';
import { hasWebGL } from './scene.js';
import { pixReady, pixPayload, pixQrSvg } from './pix.js';
const PAYCFG = (window.VELLURE_CONFIG || {}).PAYMENTS || {};

const V = window.V || {};
const VIP = (window.VELLURE_CONFIG || {}).VIP;
const catalog = (window.VELLURE_CATALOG || []).filter((p) => p.cat === 'lingerie' || p.cat === 'corset');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = innerWidth < 760;
$$('[data-shipday]').forEach((s) => (s.textContent = VIP.SHIP_DAY));

/* ---------- caixa 3D ---------- */
let box = null;
if (hasWebGL()) { try { box = createBox($('#boxgl')); } catch (e) { box = null; } }
if (!box) document.body.classList.add('no-gl');

/* ---------- perfil ---------- */
const IMG = (s) => `assets/modelos/${s}-1.jpg`;
const STEPS = [
  { k: 'estilo', q: 'Qual destas é mais você?', hint: 'Escolha uma. Ela guia o tom de todas as suas boxes.', type: 'one', opts: [
    ['romantica', 'Romântica', 'Rendas, laços e tons suaves', IMG('conjunto-nadador-com-renda-e-laco-300-branco')],
    ['sedutora', 'Sedutora', 'Tule, transparências e espartilhos', IMG('espartilho-de-tule-com-fivela-rosa-choque')],
    ['classica', 'Clássica', 'Preto, vinho e linhas limpas', IMG('conjunto-maya-501-preto')],
    ['ousada', 'Ousada', 'Cores vivas e recortes', IMG('conjunto-franzido-com-renda-355-rosa-pink-preto')],
    ['confortavel', 'Confortável', 'Cetim leve e peças soltinhas', IMG('camisola-de-tule-com-cetim-347-amarelo')]
  ] },
  { k: 'cores', q: 'Que cores você ama usar?', hint: 'Marque quantas quiser.', type: 'many', opts: [
    ['preto', 'Preto', '#141014'], ['vinho', 'Vinho', '#5c1325'], ['vermelho', 'Vermelho', '#b3122e'], ['rosa', 'Rosa', '#e85d8f'],
    ['branco', 'Branco', '#f4ede4'], ['azul', 'Azul', '#1f3a7a'], ['verde', 'Verde', '#1c7a5a'], ['amarelo', 'Amarelo', '#e8c24a']
  ] },
  { k: 'pecas', q: 'O que você quer receber?', hint: 'Marque as peças que fazem sentido para você.', type: 'many', opts: [
    ['conjunto', 'Conjuntos', 'Sutiã e calcinha que combinam'], ['corset', 'Corsets e espartilhos', 'Para marcar a cintura'],
    ['camisola', 'Camisolas', 'Para dormir bonita'], ['tanga', 'Tangas e calcinhas', 'Para o dia a dia'], ['surpresa', 'Surpreenda-me', 'Confio na stylist']
  ] },
  { k: 'tamanho', q: 'Qual é o seu tamanho?', hint: 'Usamos o tamanho gravado. Ele também destaca as peças no closet.', type: 'size' },
  { k: 'evitar', q: 'Algo que você prefere não receber?', hint: 'Opcional. A stylist respeita cada escolha.', type: 'many', opts: [
    ['transparencia', 'Transparência', 'Tule e tecidos vazados'], ['vibrante', 'Cores vibrantes', 'Pink, verde, amarelo'],
    ['fio', 'Fio dental', 'Prefiro mais cobertura'], ['estampa', 'Estampas', 'Só cores lisas']
  ], note: true }
];
let prof = local.get('vellure_vip_perfil', { estilo: null, cores: [], pecas: [], evitar: [], obs: '' });
let step = 0;

/* inteligência da curadoria: pontua cada peça real do catálogo */
const STYLE_RX = {
  romantica: /renda|laço|nadador|rendado|branco|rosa(?! choque)/i, sedutora: /tule|espartilho|fivela|bordado|tiras/i,
  classica: /preto|vinho|maya|ana clara|marcela|azul marinho/i, ousada: /pink|choque|vermelho|esmeralda|franzido|tiras|perneira/i,
  confortavel: /camisola|cetim|kit|rendado/i
};
const COLOR_RX = { preto: /preto/i, vinho: /vinho/i, vermelho: /vermelho/i, rosa: /rosa|pink/i, branco: /branc/i, azul: /azul/i, verde: /verde|esmeralda/i, amarelo: /amarelo/i };
const TYPE_RX = { conjunto: /conjunto/i, corset: /espartilho|corset/i, camisola: /camisola/i, tanga: /tanga|calcinha/i };
const AVOID_RX = { transparencia: /tule/i, vibrante: /pink|choque|esmeralda|amarelo|verde/i, fio: /fio/i, estampa: /estampa/i };
function score(p) {
  const txt = `${p.name} ${p.color}`;
  if (prof.evitar.some((a) => AVOID_RX[a].test(txt))) return -1;
  const size = mySize.get();
  if (size && !mySize.fits(p)) return -1;
  let s = 10;
  if (prof.estilo && STYLE_RX[prof.estilo].test(txt)) s += 34;
  const cm = prof.cores.filter((c) => COLOR_RX[c].test(txt)).length; s += Math.min(2, cm) * 18;
  const tipos = prof.pecas.filter((t) => t !== 'surpresa');
  if (tipos.length) s += tipos.some((t) => TYPE_RX[t].test(txt)) ? 26 : -14; else s += 8;
  if (size) s += 6;
  return s;
}
function picks() {
  const ranked = catalog.map((p) => ({ p, s: score(p) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s || a.p.price - b.p.price);
  return ranked.slice(0, 3).map((x) => ({ ...x, pct: Math.min(98, Math.round(48 + x.s * 0.55)) }));
}
const answered = () => [!!prof.estilo, prof.cores.length > 0, prof.pecas.length > 0, !!mySize.get(), true].filter(Boolean).length;
function paintPicks() {
  const list = picks(), el = $('#qzPicks');
  const a = answered() - 1;
  $('#qzMatchSub').textContent = a <= 0 ? 'Responda e veja as peças que combinam com você.' : list.length ? 'Uma destas pode ser a sua próxima box. A stylist decide o resto.' : 'Com essas escolhas não temos peças agora. Desmarque alguma restrição.';
  el.innerHTML = list.map(({ p, pct }, i) => `<a class="qp" href="index.html#peca/${esc(p.slug)}" style="--i:${i}"><img src="${esc(p.imgs[0])}" alt="" loading="lazy"><span class="qp-txt"><b>${esc(p.name)}</b><small>${esc(p.color)}</small><span class="qp-bar"><i style="width:${pct}%"></i></span><em>${pct}% de afinidade</em></span></a>`).join('');
  if (box) box.fill(a / 4);
}

function renderStep() {
  const s = STEPS[step], root = $('#quiz');
  $('#qzBar').style.transform = `scaleX(${(step + 1) / STEPS.length})`;
  $('#qzCount').textContent = `Pergunta ${step + 1} de ${STEPS.length}`;
  let body = '';
  if (s.type === 'one') body = `<div class="qz-styles">${s.opts.map(([v, l, d, img]) => `<button type="button" class="qz-style" aria-pressed="${prof.estilo === v}" data-v="${v}"><img src="${img}" alt="" loading="lazy"><span><b>${l}</b><small>${d}</small></span></button>`).join('')}</div>`;
  else if (s.k === 'cores') body = `<div class="qz-colors">${s.opts.map(([v, l, hex]) => `<button type="button" class="qz-color" aria-pressed="${prof.cores.includes(v)}" data-v="${v}"><i style="--c:${hex}"></i>${l}</button>`).join('')}</div>`;
  else if (s.type === 'many') body = `<div class="qz-list">${s.opts.map(([v, l, d]) => `<button type="button" class="qz-opt" aria-pressed="${prof[s.k].includes(v)}" data-v="${v}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>${s.note ? `<label class="qz-note"><span>Algo mais que a stylist precisa saber? (presente, ocasião, alergia...)</span><textarea rows="3" maxlength="400">${esc(prof.obs)}</textarea></label>` : ''}`;
  else body = '<div id="qzSize"></div>';
  root.innerHTML = `<div class="qz-step"><h3>${s.q}</h3><p class="qz-hint">${s.hint}</p>${body}</div>
    <div class="qz-nav"><button type="button" class="btn-text" data-nav="-1" ${step ? '' : 'hidden'}>Voltar</button><button type="button" class="btn-gold" data-nav="1">${step === STEPS.length - 1 ? 'Ver os planos' : 'Continuar'}</button></div>`;
  if (s.type === 'size') {
    const cur = mySize.get(), wrap = $('#qzSize');
    const showRec = () => mountSizeRecorder(wrap, { onDone: (v) => { if (v) { toast('Tamanho gravado.'); paintSize(); paintPicks(); } } });
    const paintSize = () => { const c = mySize.get(); if (!c) return showRec(); wrap.innerHTML = `<div class="qz-sized"><span class="mine-badge"><i></i>Tamanho gravado: ${esc(c.top === c.bottom ? c.top : `${c.top} em cima, ${c.bottom} embaixo`)}${c.bra ? `, sutiã ${esc(c.bra)}` : ''}</span><button type="button" class="btn-text">Alterar</button></div>`; wrap.querySelector('button').onclick = showRec; };
    cur ? paintSize() : showRec();
  }
  if (!REDUCED && window.gsap) gsap.fromTo('.qz-step > *', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'expo.out' });
}
$('#quiz').addEventListener('click', (e) => {
  const s = STEPS[step];
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    const d = +nav.dataset.nav;
    if (d > 0 && s.type === 'one' && !prof.estilo) { toast('Escolha o estilo que mais combina com você.'); return; }
    if (d > 0 && s.k === 'cores' && !prof.cores.length) { toast('Marque pelo menos uma cor.'); return; }
    if (d > 0 && s.k === 'pecas' && !prof.pecas.length) { toast('Marque o que você quer receber.'); return; }
    if (d > 0 && s.type === 'size' && !mySize.get()) { toast('Grave seu tamanho para a stylist acertar.'); return; }
    if (d > 0 && step === STEPS.length - 1) { save(); document.getElementById('planos').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); return; }
    step = Math.max(0, Math.min(STEPS.length - 1, step + d)); renderStep(); save(); return;
  }
  const b = e.target.closest('[data-v]'); if (!b) return; haptic(8);
  const v = b.dataset.v;
  if (s.type === 'one') { prof.estilo = v; $$('.qz-style').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === v))); setTimeout(() => { if (step === 0) { step = 1; renderStep(); } }, 420); }
  else {
    let arr = prof[s.k].includes(v) ? prof[s.k].filter((x) => x !== v) : [...prof[s.k], v];
    if (s.k === 'pecas') arr = v === 'surpresa' && arr.includes('surpresa') ? ['surpresa'] : arr.filter((x) => x !== 'surpresa' || v === 'surpresa');
    prof[s.k] = arr;
    $$('[data-v]', $('#quiz')).forEach((x) => x.setAttribute('aria-pressed', String(arr.includes(x.dataset.v))));
  }
  save(); paintPicks();
});
$('#quiz').addEventListener('input', (e) => { if (e.target.tagName === 'TEXTAREA') { prof.obs = e.target.value; save(); } });
function save() { local.set('vellure_vip_perfil', prof); paintCheckout(); if (typeof paintBar === 'function') { paintMobileQuiz(); paintBar(); } }

/* ---------- planos ---------- */
let cycle = local.get('vellure_vip_ciclo', 'trimestral'), plan = local.get('vellure_vip_plano', 'duo');
function renderPlans() {
  $('#cycles').innerHTML = Object.entries(VIP.CYCLES).map(([k, c]) => {
    const save = Math.round((1 - VIP.PLANS[0].prices[k] / VIP.PLANS[0].prices.mensal) * 100);
    return `<button type="button" role="radio" aria-checked="${k === cycle}" data-c="${k}">${c.label}${save > 0 ? `<em>-${save}%</em>` : ''}</button>`;
  }).join('');
  const c = VIP.CYCLES[cycle];
  $('#plans').innerHTML = VIP.PLANS.map((p) => {
    const m = p.prices[cycle], tot = m * c.months;
    return `<article class="pl ${p.highlight ? 'hl' : ''} ${p.id === plan ? 'on' : ''}" data-p="${p.id}">
      ${p.highlight ? '<span class="pl-flag">A mais escolhida</span>' : ''}
      <h3>${esc(p.name)}</h3><p class="pl-desc">${esc(p.desc)}</p>
      <p class="pl-price"><span class="pl-num" data-to="${m}">${money(m)}</span><small>por mês</small></p>
      <p class="pl-bill">${c.months > 1 ? `${money(tot)} ${c.note}` : c.note}</p>
      <ul>${p.perks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <button type="button" class="${p.id === plan ? 'btn-gold' : 'btn-line'}" data-choose="${p.id}">${p.id === plan ? 'Plano escolhido' : 'Escolher este'}</button>
    </article>`;
  }).join('');
}
$('#cycles').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; cycle = b.dataset.c; local.set('vellure_vip_ciclo', cycle); haptic(8); renderPlans(); paintCheckout(); });
$('#plans').addEventListener('click', (e) => {
  const b = e.target.closest('[data-choose]') || e.target.closest('.pl'); if (!b) return;
  plan = b.dataset.choose || b.dataset.p; local.set('vellure_vip_plano', plan); haptic(10); renderPlans(); paintCheckout();
  if (e.target.closest('[data-choose]')) document.getElementById('assinar').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
});

/* ---------- resumo e assinatura ---------- */
const slug = () => `vip-${plan}-${cycle}`;
function nextShip() { const d = new Date(), day = VIP.SHIP_DAY; const n = new Date(d.getFullYear(), d.getMonth() + (d.getDate() > day - 3 ? 1 : 0), day); return n; }
const fmtD = (d) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
const STYLE_NAME = Object.fromEntries(STEPS[0].opts.map((o) => [o[0], o[1]]));
function paintCheckout() {
  const p = VIP.PLANS.find((x) => x.id === plan), c = VIP.CYCLES[cycle], m = p.prices[cycle], sz = mySize.get();
  const ready = prof.estilo && prof.cores.length && prof.pecas.length && sz;
  const user = V.state?.user;
  const ship = nextShip();
  const months = [0, 1, 2].map((i) => new Date(ship.getFullYear(), ship.getMonth() + i, ship.getDate()));
  $('#checkout').innerHTML = `
    <div class="ck-l">
      <h2>Sua box</h2>
      <dl class="ck-dl">
        <div><dt>Plano</dt><dd>${esc(p.name)}, ${c.label.toLowerCase()}</dd></div>
        <div><dt>Estilo</dt><dd>${prof.estilo ? esc(STYLE_NAME[prof.estilo]) : '<a href="#perfil">responder</a>'}</dd></div>
        <div><dt>Cores</dt><dd>${prof.cores.length ? prof.cores.map((x) => esc(STEPS[1].opts.find((o) => o[0] === x)[1])).join(', ') : '<a href="#perfil">responder</a>'}</dd></div>
        <div><dt>Tamanho</dt><dd>${sz ? esc(sz.top === sz.bottom ? sz.top : `${sz.top} / ${sz.bottom}`) : '<a href="#perfil">gravar</a>'}</dd></div>
      </dl>
      <ol class="ck-months">${months.map((d, i) => `<li><span>${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span><b>${i === 0 ? 'Primeira box' : `Box ${i + 1}`}</b><small>sai em ${fmtD(d)}</small></li>`).join('')}</ol>
    </div>
    <div class="ck-r">
      <p class="ck-price"><span>${money(m)}</span> por mês</p>
      <p class="ck-bill">${c.months > 1 ? `Cobrança de ${money(m * c.months)} a cada ${c.months} meses.` : 'Cobrança todo mês.'} Pause, pule ou cancele na sua conta.</p>
      <button type="button" class="btn-gold" id="subscribe" ${ready ? '' : 'disabled'}>${user ? 'Assinar agora' : 'Entrar e assinar'}</button>
      ${ready ? '' : '<p class="ck-miss">Complete o seu perfil de curadoria para assinar.</p>'}
      <p class="ck-safe">${PAYCFG.CARD ? 'Pagamento recorrente no cartão.' : 'Primeira cobrança via Pix agora. Nas próximas, o Pix do ciclo chega no seu WhatsApp. Cartão recorrente em breve.'} A primeira box sai em ${fmtD(ship)}.</p>
    </div>`;
}
$('#checkout').addEventListener('click', async (e) => {
  if (e.target.id !== 'subscribe') return;
  const btn = e.target;
  if (!V.state?.user) { location.href = 'conta.html?volta=vip'; return; }
  btn.disabled = true; btn.textContent = 'Preparando sua box...';
  const p = VIP.PLANS.find((x) => x.id === plan), c = VIP.CYCLES[cycle];
  const prefs = { ...prof, tamanho: mySize.get(), plano: p.name, ciclo: cycle, meses: c.months, valor_mensal: p.prices[cycle], sugestoes: picks().map((x) => x.p.slug) };
  let ok = false;
  try { await V.api.subscribe(slug(), prefs); ok = true; } catch (err) { console.warn('[Vellure] assinatura no banco falhou', err); }
  const link = PAYCFG.CARD ? VIP.PAY_LINKS[slug()] : '';
  const first = p.prices[cycle] * c.months, code = 'VIP' + Date.now().toString(36).toUpperCase().slice(-6);
  const msg = `Olá, Vellure! Quero assinar a ${p.name} (${c.label.toLowerCase()}, ${money(p.prices[cycle])}/mês). Código ${code}.\nEstilo: ${STYLE_NAME[prof.estilo]}. Cores: ${prof.cores.join(', ')}. Tamanho: ${prefs.tamanho.top}/${prefs.tamanho.bottom}.${prof.obs ? `\nObservação: ${prof.obs}` : ''}`;
  if (box) { celebrating = true; box.place(0, MOBILE ? -1.4 : -1.2, MOBILE ? 0.5 : 0.62); setTimeout(() => box.celebrate(), 500); setTimeout(() => (celebrating = false), 9000); }
  haptic([20, 40, 20, 40, 60]);
  const usePix = !link && pixReady(), payload = usePix ? pixPayload(first, code) : '';
  $('#checkout').innerHTML = `<div class="ck-done">
    <h2>Bem-vinda ao clube.</h2>
    <p>${ok ? 'Sua assinatura foi registrada e a stylist já recebeu o seu perfil.' : 'Seu perfil está pronto.'} ${link ? 'Finalize o pagamento recorrente para confirmar.' : usePix ? `Pague a primeira cobrança de <b>${money(first)}</b> com Pix para confirmar.` : 'A concierge envia o Pix da primeira cobrança pelo WhatsApp.'}</p>
    ${usePix ? `<div class="pix pix-vip"><div class="pix-qr" id="vipQr"><span class="pix-load"></span></div><button type="button" class="btn-line pix-copy" id="vipCopy">Copiar código Pix</button></div>` : ''}
    <div class="ck-actions">${link ? `<a class="btn-gold" href="${esc(link)}" target="_blank" rel="noopener">Pagar no cartão</a>` : `<a class="btn-gold" href="${esc(waLink(msg + (usePix ? '\nJá paguei o Pix, segue o comprovante.' : '\nPode me enviar o Pix?')))}" target="_blank" rel="noopener">${usePix ? 'Já paguei, enviar comprovante' : 'Receber o Pix'}</a>`}<a class="btn-line" href="conta.html#vip">Ver minha assinatura</a></div></div>`;
  if (usePix) {
    pixQrSvg(payload).then((svg) => { $('#vipQr').innerHTML = svg; }).catch(() => {});
    $('#vipCopy').addEventListener('click', async (e) => { try { await navigator.clipboard.writeText(payload); } catch (err) { /* */ } e.currentTarget.textContent = 'Código copiado'; toast('Código Pix copiado.'); });
  }
  if (link) window.open(link, '_blank', 'noopener');
});

/* ---------- a caixa acompanha a rolagem ---------- */
const secs = $$('[data-box]');
let celebrating = false;
function placeBox() {
  if (!box) return;
  if (MOBILE) { if (!celebrating || immOpen) dockBox(); requestAnimationFrame(placeBox); return; }
  const vh = innerHeight; let cur = 'hero';
  secs.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top < vh * 0.5 && r.bottom > vh * 0.5) cur = s.dataset.box; });
  const P = MOBILE
    ? { hero: [0, 1.35, 0.55], how: [1.2, 1.6, 0.4], quiz: [1.15, 1.75, 0.32], plans: [1.15, 1.75, 0.001], check: [0, 1.25, 0.001] }
    : { hero: [1.55, -0.45, 1], how: [-1.9, -0.3, 0.7], quiz: [2.75, 1.45, 0.34], plans: [2.9, 2.2, 0.001], check: [0, 2.4, 0.001] };
  if (!celebrating) box.place(...(P[cur] || P.hero));
  requestAnimationFrame(placeBox);
}
let peeks = 0;
$('#boxgl').addEventListener('pointerup', () => { if (++peeks === 1) $('#peekHint').textContent = 'Lá dentro tem uma peça escolhida para você.'; });

/* =====================================================================
   CELULAR: a caixa vive em "docas" reservadas na página e a montagem
   acontece em tela cheia, com gestos, giroscópio e vibração
   ===================================================================== */
let immOpen = false;
function dockBox() {
  const vh = innerHeight;
  const docks = immOpen ? [$('[data-dock="imm"]')] : $$('.vp > section [data-dock]');
  let best = null, bestScore = -1;
  for (const d of docks) {
    const r = d.getBoundingClientRect(); if (!r.height) continue;
    const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    if (vis > bestScore) { bestScore = vis; best = r; }
  }
  if (!best || bestScore < 40) { box.place(0, 4, 0.001); return; }
  const size = Math.min(best.width * 0.55, best.height * 0.72);
  box.placeScreen(best.left + best.width / 2, best.top + best.height / 2, size);
}

/* giroscópio: a caixa acompanha o celular */
let tiltOn = false;
function startTilt() {
  if (tiltOn || !box || !window.DeviceOrientationEvent) return; tiltOn = true;
  const listen = () => addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; box.tilt(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, ((e.beta || 50) - 50) / 30))); });
  try { if (typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then((r) => r === 'granted' && listen()).catch(() => {}); else listen(); } catch (e) { /* sem sensor */ }
}
addEventListener('touchstart', startTilt, { once: true, passive: true });

/* uma bolinha de luz voa do toque até a caixa */
function flyToBox(x, y, color = '#f3dcae', img = null) {
  const dock = $(immOpen ? '[data-dock="imm"]' : '[data-dock="hero"]').getBoundingClientRect();
  const el = document.createElement('i'); el.className = 'fly';
  if (img) el.style.backgroundImage = `url(${img})`; else el.style.background = color;
  el.style.left = `${x}px`; el.style.top = `${y}px`; document.body.appendChild(el);
  const tx = dock.left + dock.width / 2 - x, ty = dock.top + dock.height * 0.45 - y;
  const anim = el.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${tx * 0.6}px), calc(-50% + ${ty * 0.4 - 60}px)) scale(.8)`, opacity: 1, offset: 0.55 }, { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(.15)`, opacity: 0 }], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)' });
  anim.onfinish = () => { el.remove(); box && box.burstAt(70); haptic(14); };
}

const SAY = ['Qual estilo é mais você? Deslize e toque.', 'Toque nas cores que você ama.', 'O que você quer receber?', 'Seu tamanho, para acertar sempre.', 'Algo que prefere não receber?', 'Sua box está pronta.'];
let iStep = 0;
function immRender(dir = 0) {
  const track = $('#immTrack');
  $('#immDots').innerHTML = STEPS.map((_, i) => `<i class="${i < iStep ? 'done' : i === iStep ? 'now' : ''}"></i>`).join('') + `<i class="${iStep === STEPS.length ? 'now' : ''}"></i>`;
  $('#immSay').textContent = SAY[iStep];
  let html = '';
  if (iStep < STEPS.length) {
    const s = STEPS[iStep];
    if (s.type === 'one') html = `<div class="im-styles">${s.opts.map(([v, l, d, img]) => `<button type="button" class="im-style" data-v="${v}" aria-pressed="${prof.estilo === v}"><img src="${img}" alt=""><span><b>${l}</b><small>${d}</small></span></button>`).join('')}</div>`;
    else if (s.k === 'cores') html = `<div class="im-colors">${s.opts.map(([v, l, hex]) => `<button type="button" class="im-color" data-v="${v}" aria-pressed="${prof.cores.includes(v)}"><i style="--c:${hex}"></i><span>${l}</span></button>`).join('')}</div>`;
    else if (s.type === 'many') html = `<div class="im-opts">${s.opts.map(([v, l, d]) => `<button type="button" class="im-opt" data-v="${v}" aria-pressed="${prof[s.k].includes(v)}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>${s.note ? `<textarea class="im-note" rows="2" placeholder="Algo mais para a stylist? (presente, ocasião...)">${esc(prof.obs)}</textarea>` : ''}`;
    else html = '<div id="immSize"></div>';
    html = `<div class="im-slide"><h3>${s.q}</h3>${html}</div><div class="im-nav">${iStep ? '<button type="button" class="btn-text" data-go="-1">Voltar</button>' : '<span></span>'}${s.type === 'one' ? '<span class="im-swipe">deslize para ver todos</span>' : `<button type="button" class="btn-gold" data-go="1">${iStep === STEPS.length - 1 ? 'Revelar minha box' : 'Continuar'}</button>`}</div>`;
  } else {
    const list = picks();
    html = `<div class="im-slide im-reveal"><h3>Isto pode vir na sua box</h3><div class="im-picks">${list.map(({ p, pct }, i) => `<a class="im-pick" style="--i:${i}" href="index.html#peca/${esc(p.slug)}"><img src="${esc(p.imgs[0])}" alt=""><b>${esc(p.name)}</b><em>${pct}% você</em></a>`).join('') || '<p class="qz-hint">Com essas escolhas não temos peças agora. Volte e desmarque alguma restrição.</p>'}</div>
      <p class="qz-hint">A stylist escolhe a peça final entre estas e as novidades do mês.</p></div>
      <div class="im-nav"><button type="button" class="btn-text" data-go="-1">Ajustar</button><button type="button" class="btn-gold" data-done>Escolher meu plano</button></div>`;
  }
  track.innerHTML = html;
  if (iStep < STEPS.length && STEPS[iStep].type === 'size') {
    const w = $('#immSize'), c = mySize.get();
    const rec = () => mountSizeRecorder(w, { onDone: (v) => { if (v) { haptic([15, 30, 15]); box && box.burstAt(120); paintPicks(); paintCheckout(); setTimeout(() => go(1), 350); } } });
    if (c) { w.innerHTML = `<div class="im-sized"><span class="mine-badge"><i></i>Seu tamanho: ${esc(c.top === c.bottom ? c.top : `${c.top} em cima, ${c.bottom} embaixo`)}</span><button type="button" class="btn-text">Alterar</button></div>`; w.querySelector('button').onclick = rec; } else rec();
  }
  if (iStep === STEPS.length && box) { box.celebrate(); haptic([20, 40, 20, 40, 80]); }
  if (window.gsap && !REDUCED) gsap.fromTo('.im-slide > *, .im-nav', { opacity: 0, x: dir * 40 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.05, ease: 'expo.out' });
}
function valid() {
  const s = STEPS[iStep]; if (!s) return true;
  if (s.type === 'one' && !prof.estilo) return 'Toque no estilo que mais combina com você.';
  if (s.k === 'cores' && !prof.cores.length) return 'Toque em pelo menos uma cor.';
  if (s.k === 'pecas' && !prof.pecas.length) return 'Toque no que você quer receber.';
  if (s.type === 'size' && !mySize.get()) return 'Grave seu tamanho para continuar.';
  return true;
}
function go(d) {
  if (d > 0) { const v = valid(); if (v !== true) { toast(v); haptic(40); return; } }
  iStep = Math.max(0, Math.min(STEPS.length, iStep + d)); step = Math.min(iStep, STEPS.length - 1);
  save(); paintPicks(); immRender(d);
}
function openImm() {
  immOpen = true; startTilt();
  iStep = !prof.estilo ? 0 : !prof.cores.length ? 1 : !prof.pecas.length ? 2 : !mySize.get() ? 3 : 4;
  $('#imm').classList.add('open'); $('#imm').setAttribute('aria-hidden', 'false'); document.body.classList.add('imm-on');
  immRender(); box && box.peek(1.4);
}
function closeImm() { immOpen = false; $('#imm').classList.remove('open'); $('#imm').setAttribute('aria-hidden', 'true'); document.body.classList.remove('imm-on'); renderStep(); paintMobileQuiz(); }
$('.imm-close').addEventListener('click', closeImm);
$('#immTrack').addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (g) return go(+g.dataset.go);
  if (e.target.closest('[data-done]')) { closeImm(); setTimeout(() => document.getElementById('planos').scrollIntoView({ behavior: 'smooth' }), 120); return; }
  const b = e.target.closest('[data-v]'); if (!b) return;
  const s = STEPS[iStep], v = b.dataset.v, r = b.getBoundingClientRect();
  if (s.type === 'one') {
    prof.estilo = v; $$('.im-style').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === v)));
    flyToBox(r.left + r.width / 2, r.top + r.height / 3, null, b.querySelector('img').src); setTimeout(() => go(1), 650); return;
  }
  const on = !prof[s.k].includes(v);
  let arr = on ? [...prof[s.k], v] : prof[s.k].filter((x) => x !== v);
  if (s.k === 'pecas') arr = v === 'surpresa' && on ? ['surpresa'] : arr.filter((x) => x !== 'surpresa' || v === 'surpresa');
  prof[s.k] = arr;
  $$('[data-v]', $('#immTrack')).forEach((x) => x.setAttribute('aria-pressed', String(arr.includes(x.dataset.v))));
  if (on && s.k !== 'evitar') flyToBox(r.left + r.width / 2, r.top + r.height / 2, s.k === 'cores' ? s.opts.find((o) => o[0] === v)[2] : '#f3dcae');
  else haptic(8);
  save(); paintPicks();
});
$('#immTrack').addEventListener('input', (e) => { if (e.target.classList.contains('im-note')) { prof.obs = e.target.value; save(); } });
let tx0 = null, ty0 = null;
$('#immTrack').addEventListener('touchstart', (e) => { if (e.target.closest('.im-styles')) { tx0 = null; return; } tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
$('#immTrack').addEventListener('touchend', (e) => { if (tx0 === null) return; const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1); tx0 = null; });

/* cartão do perfil na página (celular) */
function paintMobileQuiz() {
  if (!MOBILE) return;
  let card = $('#qzMobile');
  if (!card) { card = document.createElement('div'); card.id = 'qzMobile'; card.className = 'qz-mobile'; $('.qz-wrap').prepend(card); }
  const a = answered(), done = a >= 5;
  card.innerHTML = `<div class="qm-ring" style="--p:${(Math.min(a, 5) / 5) * 100}"><span>${Math.min(a, 5)}/5</span></div>
    <div class="qm-txt"><b>${done ? 'Perfil completo' : a > 1 ? 'Continue de onde parou' : 'Monte em 5 toques'}</b><small>${done ? `${esc(STYLE_NAME[prof.estilo] || '')}, ${prof.cores.length} cores, tamanho ${esc(mySize.get()?.top || '')}` : 'Em tela cheia, com a sua caixa ganhando luz a cada resposta.'}</small></div>
    <button type="button" class="${done ? 'btn-line' : 'btn-gold'}" data-imm>${done ? 'Refazer' : 'Montar'}</button>`;
}

/* barra fixa inferior (celular) */
function paintBar() {
  if (!MOBILE) return;
  const bar = $('#vpBar'), ck = $('#assinar').getBoundingClientRect(), hero = $('.vp-hero').getBoundingClientRect();
  const done = answered() >= 5, p = VIP.PLANS.find((x) => x.id === plan);
  const hide = immOpen || (ck.top < innerHeight * 0.9 && ck.bottom > 0) || hero.bottom > innerHeight * 0.65;
  bar.classList.toggle('show', !hide);
  $('#vbTxt').innerHTML = done ? `${esc(p.name)}<br><b>${money(p.prices[cycle])}</b>/mês` : 'Sua box em<br><b>5 toques</b>';
  $('#vbBtn').textContent = done ? 'Assinar' : 'Montar minha box';
  $('#vbBtn').dataset.act = done ? 'sub' : 'imm';
}
$('#vbBtn').addEventListener('click', (e) => { if (e.currentTarget.dataset.act === 'imm') openImm(); else document.getElementById('assinar').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
document.addEventListener('click', (e) => { const t = e.target.closest('[data-imm]'); if (t && MOBILE) { e.preventDefault(); openImm(); } });
if (MOBILE) { addEventListener('scroll', paintBar, { passive: true }); setInterval(paintBar, 800); }

/* ---------- início ---------- */
(async function start() {
  renderStep(); paintPicks(); renderPlans(); paintCheckout(); placeBox(); paintMobileQuiz(); paintBar();
  if (!REDUCED && window.gsap) {
    gsap.fromTo('.vp-hero-copy > *', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.4, stagger: 0.1, ease: 'expo.out', delay: 0.2 });
    if (box) setTimeout(() => box.peek(1.8), 1400);
  }
  const u = await currentUser();
  if (u) { $('#acctLbl').textContent = 'Minha conta'; mySize.pull(); paintCheckout(); }
  mySize.on(() => { paintPicks(); paintCheckout(); });
  if (location.hash === '#assinar') setTimeout(() => document.getElementById('assinar').scrollIntoView(), 300);
})();
