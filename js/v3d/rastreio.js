/* =====================================================================
   VELLURE 3D · rastreio público (número do pedido + CEP, sem login)
   ===================================================================== */
import { createWorld, hasWebGL } from './scene.js';
import { $, esc, money, waLink, toast, haptic, local } from './common.js';

const V = window.V || {};
const catalog = window.VELLURE_CATALOG || [];
const bySlug = new Map(catalog.map((p) => [p.slug, p]));
const params = new URLSearchParams(location.search);

let world = null;
if (hasWebGL()) {
  try {
    world = createWorld($('#gl'));
    Object.assign(world.params, { loadP: 1, ready: 1, arm: 1, logoVis: 0, silkVis: 1, silkDim: 0.42, petals: 0.3, dust: 0.9 });
    world.setPalette({ vinho: 1, noir: 0.6 });
  } catch (e) { world = null; }
}
if (!world) document.body.classList.add('no-gl');

const STEPS = [
  ['aguardando_pagamento', 'Pedido recebido', 'Aguardando a confirmação do pagamento.'],
  ['pago', 'Pagamento aprovado', 'Suas peças já estão reservadas.'],
  ['em_atelier', 'No ateliê', 'Separadas, conferidas e embaladas com cuidado.'],
  ['enviado', 'A caminho', 'O pacote saiu do ateliê.'],
  ['entregue', 'Entregue', 'Esperamos que você ame cada detalhe.']
];
const HEAD = {
  aguardando_pagamento: ['Quase lá.', 'Assim que o pagamento for confirmado, o ateliê começa a separar as peças.'],
  pago: ['Pagamento aprovado.', 'As peças estão reservadas e entram no ateliê em seguida.'],
  em_atelier: ['No ateliê.', 'Separando, conferindo e embalando cada peça.'],
  enviado: ['A caminho.', 'O pacote já saiu e está indo até você.'],
  entregue: ['Entregue.', 'Chegou. Que cada peça seja do jeito que você imaginou.'],
  cancelado: ['Pedido cancelado.', 'Se tiver dúvidas, a concierge explica tudo pelo WhatsApp.']
};
const at = (d) => new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) + ', ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const f = $('#trForm'), msg = $('#trMsg'), res = $('#trRes');
f.code.value = (params.get('pedido') || local.get('vellure_rastreio', '') || '').toUpperCase();
f.key.addEventListener('input', () => {
  const d = f.key.value.replace(/\D/g, '').slice(0, 8);
  f.key.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
});
if (f.code.value) setTimeout(() => f.key.focus(), 300);

f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = f.code.value.trim().toUpperCase(), key = f.key.value.replace(/\D/g, '');
  msg.textContent = '';
  if (!/^VL\d{4}-[A-Z0-9]{5}$/.test(code)) { msg.textContent = 'O número do pedido tem este formato: VL2610-3F9A2. Ele está no WhatsApp e na tela do Pix.'; f.code.focus(); return; }
  if (key.length !== 8 && key.length !== 4) { msg.textContent = 'Digite o CEP com 8 números ou os 4 últimos números do WhatsApp.'; f.key.focus(); return; }
  const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Procurando…';
  try {
    if (!V.sb) throw new Error('Não conseguimos conectar agora. Tente de novo em instantes.');
    const r = await V.api.trackOrder(code, key);
    if (!r?.ok) { msg.textContent = r?.message || 'Não encontramos esse pedido.'; return; }
    local.set('vellure_rastreio', code);
    history.replaceState(null, '', `${location.pathname}?pedido=${encodeURIComponent(code)}`);
    render(r); haptic(16);
  } catch (err) {
    const m = String(err?.message || err);
    msg.textContent = /function|schema cache|does not exist/i.test(m) ? 'O rastreio ainda está sendo ativado. Fale com a concierge pelo WhatsApp.' : m;
  } finally { btn.disabled = false; btn.textContent = 'Rastrear'; }
});

function render(o) {
  const cancel = o.status === 'cancelado';
  const si = Math.max(0, STEPS.findIndex((s) => s[0] === o.status));
  const log = Array.isArray(o.log) ? o.log : [];
  const when = (st) => { const x = log.filter((l) => l.status === st).pop(); return x ? at(x.at) : ''; };
  const [h1, sub] = HEAD[o.status] || HEAD.aguardando_pagamento;
  const prog = cancel ? 0 : si / (STEPS.length - 1);
  const items = (o.items || []).map((it) => {
    const p = bySlug.get(it.slug) || catalog.find((x) => x.name === it.name);
    return `<li>${p ? `<img src="${esc(p.imgs[0])}" alt="" loading="lazy">` : '<span class="tr-ph"></span>'}<span><b>${esc(it.name)}</b>${it.qty}× ${it.size ? `tamanho ${esc(it.size)}` : ''}</span></li>`;
  }).join('');
  res.innerHTML = `
    <article class="tr-card${cancel ? ' x' : ''}">
      <header class="tr-top">
        <p class="tr-eb">Pedido ${esc(o.code)} · feito em ${new Date(o.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
        <h2>${o.name ? `${esc(o.name)}, ` : ''}${h1.charAt(0).toLowerCase() + h1.slice(1)}</h2>
        <p class="ct-p">${sub}</p>
      </header>
      ${cancel ? '' : `<div class="tr-route" style="--p:${prog}" aria-hidden="true">
        <svg viewBox="0 0 600 20" preserveAspectRatio="none"><path class="tr-base" d="M0 10 H600"/><path class="tr-done" pathLength="1" d="M0 10 H600"/></svg>
        <span class="tr-pin a">Ateliê</span><span class="tr-pin b">${esc(o.city || 'Você')}${o.state ? '/' + esc(o.state) : ''}</span>
        <span class="tr-box"><svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg></span>
      </div>`}
      ${cancel ? '' : `<ol class="tr-steps">${STEPS.map(([k, t, d], i) => `<li class="${i < si ? 'ok' : i === si ? 'now' : ''}"><i></i><div><b>${t}</b><span>${i === si ? d : ''}</span>${when(k) ? `<em>${when(k)}</em>` : ''}</div></li>`).join('')}</ol>`}
      ${o.tracking ? `<p class="od-track">Código dos Correios <b>${esc(o.tracking)}</b> <a href="https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(o.tracking)}" target="_blank" rel="noopener">Ver nos Correios</a></p>` : ''}
      <div class="tr-info">
        <div><span>Entrega</span><b>${esc(o.shipping_method || 'A combinar')}</b></div>
        <div><span>Pagamento</span><b>${({ pix: 'Pix', dinheiro: 'Dinheiro na entrega', cartao: 'Cartão' })[o.payment_method] || '—'}</b></div>
        <div><span>Total</span><b>${money(o.total)}</b></div>
        ${o.gift ? '<div><span>Presente</span><b>Embalado com cartão</b></div>' : ''}
      </div>
      <ul class="tr-items">${items}</ul>
      <div class="tr-act">
        <a class="btn-gold" target="_blank" rel="noopener" href="${esc(waLink(`Olá, Vellure! Quero falar sobre o pedido ${o.code}.`))}">Falar com a concierge</a>
        <button class="btn-line" type="button" id="trShare">Copiar link do rastreio</button>
      </div>
    </article>`;
  res.hidden = false;
  if (window.gsap) {
    gsap.fromTo('.tr-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' });
    if (!cancel) {
      gsap.fromTo('.tr-route', { '--p': 0 }, { '--p': prog, duration: 2.2, ease: 'power3.inOut', delay: 0.3 });
      gsap.fromTo('.tr-steps li', { opacity: 0, x: -14 }, { opacity: 1, x: 0, stagger: 0.09, duration: 0.8, ease: 'expo.out', delay: 0.4 });
    }
  }
  res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#trShare').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?pedido=${encodeURIComponent(o.code)}`;
    try { await navigator.clipboard.writeText(url); toast('Link copiado. Quem abrir digita o CEP para ver.'); } catch (e) { toast(url); }
  });
}
