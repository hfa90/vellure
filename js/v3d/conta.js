/* =====================================================================
   VELLURE 3D · área exclusiva da cliente
   pedidos com linha do tempo, favoritos, medidas, endereços e dados
   ===================================================================== */
import { createWorld, hasWebGL } from './scene.js';
import { $, $$, esc, money, CAT_NAME, HEART, waLink, toast, haptic, favs, local, mySize } from './common.js';
import { mountSizer, saveMeasures, mountSizeRecorder } from './atelier.js';

const V = window.V || {};
const root = $('#ct');
const catalog = window.VELLURE_CATALOG || [];
const bySlug = new Map(catalog.map((p) => [p.slug, p]));
const params = new URLSearchParams(location.search);
const BASE = location.href.split(/[?#]/)[0];

/* ---------- cenário 3D (seda e poeira dourada, sem a logo) ---------- */
let world = null;
if (hasWebGL()) {
  try {
    world = createWorld($('#gl'));
    Object.assign(world.params, { loadP: 1, ready: 1, arm: 1, logoVis: 0, silkVis: 1, silkDim: 0.42, petals: 0.4, dust: 0.9 });
    world.setPalette({ vinho: 1, noir: 0.6 });
  } catch (e) { world = null; }
}
if (!world) document.body.classList.add('no-gl');

const STATUS = [
  ['aguardando_pagamento', 'Aguardando pagamento', 'A concierge enviou o link ou o Pix pelo WhatsApp.'],
  ['pago', 'Pagamento aprovado', 'Recebemos. Sua peça já foi reservada.'],
  ['em_atelier', 'Preparando no ateliê', 'Separada, conferida e embalada com cuidado.'],
  ['enviado', 'A caminho', 'Seu pacote saiu do ateliê.'],
  ['entregue', 'Entregue', 'Esperamos que você ame cada detalhe.']
];
const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const errMsg = (e) => (V.errMsg ? V.errMsg(e) : e?.message || 'Algo não saiu como esperado. Tente de novo.');
const reveal = () => window.gsap && gsap.fromTo(root.children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: 0.06, ease: 'expo.out' });

/* ======================= AUTENTICAÇÃO ======================= */
function authView(mode = 'entrar', note = '') {
  $('#outBtn').hidden = true;
  const tabs = `<div class="ct-tabs" role="tablist"><button role="tab" data-m="entrar" aria-selected="${mode === 'entrar'}">Entrar</button><button role="tab" data-m="criar" aria-selected="${mode === 'criar'}">Criar conta</button></div>`;
  const forms = {
    entrar: `<form class="ct-form" data-f="entrar">
        <label><span>E-mail</span><input type="email" name="email" autocomplete="email" required></label>
        <label><span>Senha</span><input type="password" name="senha" autocomplete="current-password" required minlength="6"></label>
        <button class="btn-gold" type="submit">Entrar</button>
        <button class="btn-text" type="button" data-m="esqueci">Esqueci minha senha</button></form>`,
    criar: `<form class="ct-form" data-f="criar">
        <label><span>Nome completo</span><input name="nome" autocomplete="name" required></label>
        <label><span>E-mail</span><input type="email" name="email" autocomplete="email" required></label>
        <label><span>WhatsApp</span><input name="fone" inputmode="tel" autocomplete="tel" placeholder="(11) 99999-9999"></label>
        <label><span>Crie uma senha</span><input type="password" name="senha" autocomplete="new-password" required minlength="6" placeholder="mínimo 6 caracteres"></label>
        <button class="btn-gold" type="submit">Criar minha conta</button></form>`,
    esqueci: `<form class="ct-form" data-f="esqueci">
        <p class="ct-p">Digite seu e-mail. Enviamos um link para você criar uma senha nova.</p>
        <label><span>E-mail</span><input type="email" name="email" autocomplete="email" required></label>
        <button class="btn-gold" type="submit">Enviar link</button>
        <button class="btn-text" type="button" data-m="entrar">Voltar para entrar</button></form>`,
    nova: `<form class="ct-form" data-f="nova">
        <p class="ct-p">Escolha sua nova senha.</p>
        <label><span>Nova senha</span><input type="password" name="senha" autocomplete="new-password" required minlength="6"></label>
        <button class="btn-gold" type="submit">Salvar senha</button></form>`
  };
  root.innerHTML = `<section class="ct-auth">
      <div class="ct-auth-copy"><h1>Sua Maison particular.</h1><p>Acompanhe cada pedido do ateliê até a sua porta, guarde as peças que você ama e deixe suas medidas salvas para acertar o tamanho sempre.</p></div>
      <div class="ct-card">${mode === 'esqueci' || mode === 'nova' ? '' : tabs}${note ? `<p class="ct-note">${note}</p>` : ''}${forms[mode]}</div>
    </section>`;
  reveal();
  root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => authView(b.dataset.m)));
  root.querySelector('form').addEventListener('submit', onAuth);
}

async function onAuth(e) {
  e.preventDefault();
  const f = e.currentTarget, d = Object.fromEntries(new FormData(f)), btn = f.querySelector('.btn-gold'), label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Um instante...';
  try {
    if (!V.sb) throw new Error('Não foi possível conectar agora. Verifique sua internet.');
    if (f.dataset.f === 'entrar') { await V.api.signIn(d.email, d.senha); haptic(); return afterLogin(); }
    if (f.dataset.f === 'criar') {
      const { data, error } = await V.sb.auth.signUp({ email: d.email, password: d.senha, options: { data: { full_name: d.nome, phone: d.fone }, emailRedirectTo: `${BASE}?confirmado=1` } });
      if (error) throw error;
      if (data.session) return afterLogin();
      return sentView(d.email, 'Confirme seu e-mail', 'Enviamos um link de confirmação. Toque nele e sua conta abre aqui, já com tudo pronto.');
    }
    if (f.dataset.f === 'esqueci') {
      const { error } = await V.sb.auth.resetPasswordForEmail(d.email, { redirectTo: `${BASE}?nova-senha=1` });
      if (error) throw error;
      return sentView(d.email, 'Confira seu e-mail', 'Enviamos um link para você criar uma senha nova.');
    }
    if (f.dataset.f === 'nova') {
      const { error } = await V.sb.auth.updateUser({ password: d.senha }); if (error) throw error;
      toast('Senha nova salva.'); history.replaceState(null, '', BASE); return afterLogin();
    }
  } catch (err) { toast(errMsg(err)); btn.disabled = false; btn.textContent = label; }
}

function sentView(email, title, text) {
  root.innerHTML = `<section class="ct-auth"><div class="ct-card ct-sent">
      <svg viewBox="0 0 120 90" class="ct-env" aria-hidden="true"><rect x="6" y="14" width="108" height="70" rx="6"/><path d="M6 20 L60 58 L114 20"/><path class="seal" d="M60 52 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"/></svg>
      <h2>${esc(title)}</h2><p>${esc(text)}</p><p class="ct-mail">${esc(email)}</p>
      <button class="btn-text" type="button" data-m="entrar">Voltar para entrar</button></div></section>`;
  reveal();
  root.querySelector('[data-m]').addEventListener('click', () => authView('entrar'));
}

function afterLogin() {
  if (params.get('volta') === 'sacola') { location.href = 'index.html?sacola=1'; return; }
  if (params.get('volta') === 'vip') { location.href = 'assinatura.html#assinar'; return; }
  if (/^peca\/[a-z0-9-]+$/.test(params.get('volta') || '')) { location.href = 'index.html#' + params.get('volta'); return; }
  history.replaceState(null, '', BASE + location.hash);
  dashboard();
}

/* ======================= PAINEL DA CLIENTE ======================= */
const TABS = [['pedidos', 'Pedidos'], ['vip', 'Box VIP'], ['favoritos', 'Favoritos'], ['medidas', 'Medidas'], ['enderecos', 'Endereços'], ['dados', 'Meus dados']];
let profile = null;

async function dashboard() {
  $('#outBtn').hidden = false;
  try { profile = await V.api.profile(true); } catch (e) { profile = null; }
  const user = V.state.user;
  const name = (profile?.full_name || user.user_metadata?.full_name || '').split(' ')[0];
  const tab = (location.hash.slice(1) || 'pedidos');
  root.innerHTML = `
    <section class="ct-hello">
      <h1>${name ? `Olá, ${esc(name)}.` : 'Olá.'}</h1>
      <p>${profile?.petals ? `Você tem <b>${profile.petals.toLocaleString('pt-BR')} pétalas</b> no programa de pontos.` : 'Que bom ter você na Maison.'}</p>
    </section>
    <nav class="ct-pills" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-t="${k}" aria-selected="${k === tab}">${l}</button>`).join('')}</nav>
    <section class="ct-panel" id="panel"></section>`;
  root.querySelector('.ct-pills').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); });
  reveal();
  favs.sync();
  show(TABS.some((t) => t[0] === tab) ? tab : 'pedidos', false);
}
function show(t, push = true) {
  $$('.ct-pills button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === t)));
  if (push) history.replaceState(null, '', `${BASE}#${t}`);
  const p = $('#panel'); p.innerHTML = '<div class="ct-loading"><span></span></div>';
  ({ pedidos, vip, favoritos, medidas, enderecos, dados })[t](p);
}

/* ---------- pedidos ---------- */
async function pedidos(p) {
  let list = [];
  try { list = await V.api.myOrders(); } catch (e) { p.innerHTML = `<p class="ct-empty">${esc(errMsg(e))}</p>`; return; }
  if (!list.length) { p.innerHTML = `<div class="ct-empty"><strong>Nenhum pedido ainda.</strong><p>Quando você finalizar uma compra, ela aparece aqui com cada etapa, do ateliê até a sua porta.</p><a class="btn-line" href="index.html#galerie">Ver a galeria</a></div>`; return; }
  p.innerHTML = list.map((o, i) => {
    const si = STATUS.findIndex((s) => s[0] === o.status), cancel = o.status === 'cancelado';
    const thumbs = (o.order_items || []).map((it) => { const pr = catalog.find((x) => x.name === it.name); return pr ? `<img src="${esc(pr.imgs[0])}" alt="">` : ''; }).join('');
    return `<article class="od ${i === 0 ? 'open' : ''}">
      <button class="od-head" type="button" aria-expanded="${i === 0}">
        <span class="od-thumbs">${thumbs}</span>
        <span class="od-main"><b>Pedido ${esc(o.code)}</b><span>${fmtDate(o.created_at)}</span></span>
        <span class="od-status ${cancel ? 'x' : ''}">${cancel ? 'Cancelado' : STATUS[si]?.[1] || o.status}</span>
        <span class="od-total">${money(o.total)}</span>
      </button>
      <div class="od-body">
        ${cancel ? '<p class="ct-p">Este pedido foi cancelado. Se tiver dúvidas, fale com a concierge.</p>' : `<ol class="od-line" style="--done:${si}">${STATUS.map((s, k) => `<li class="${k < si ? 'done' : k === si ? 'now' : ''}"><i></i><b>${s[1]}</b><span>${k === si ? s[2] : ''}</span></li>`).join('')}</ol>`}
        ${o.tracking ? `<p class="od-track">Código de rastreio <b>${esc(o.tracking)}</b> <a href="https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(o.tracking)}" target="_blank" rel="noopener">Rastrear</a></p>` : ''}
        <ul class="od-items">${(o.order_items || []).map((it) => { const pr = catalog.find((x) => x.name === it.name); return `<li><span>${it.qty}x ${esc(it.name)}${it.size ? `, tam. ${esc(it.size)}` : ''}${pr && o.status === 'entregue' ? ` <a class="od-rate" href="index.html#peca/${esc(pr.slug)}">Avaliar com foto</a>` : ''}</span><span>${money(it.unit_price * it.qty)}</span></li>`; }).join('')}</ul>
        <div class="od-sum"><span>Frete ${esc(o.shipping_method || '')}</span><span>${+o.shipping ? money(o.shipping) : 'Cortesia'}</span>${+o.discount ? `<span>Desconto</span><span>− ${money(o.discount)}</span>` : ''}<b>Total</b><b>${money(o.total)}</b></div>
        <a class="btn-line" target="_blank" rel="noopener" href="${esc(waLink(`Olá, Vellure! Quero falar sobre o pedido ${o.code}.`))}">Falar sobre este pedido</a>
      </div></article>`;
  }).join('');
  p.addEventListener('click', (e) => { const h = e.target.closest('.od-head'); if (!h) return; const a = h.parentElement; a.classList.toggle('open'); h.setAttribute('aria-expanded', String(a.classList.contains('open'))); });
  window.gsap && gsap.fromTo('.od', { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.8, ease: 'expo.out' });
}

/* ---------- assinatura VIP ---------- */
const SUB_ST = { ativa: 'Ativa', pausada: 'Pausada', cancelada: 'Cancelada' };
const BOX_ST = { curadoria: 'Em curadoria', preparando: 'Preparando', enviada: 'A caminho', entregue: 'Entregue' };
async function vip(p) {
  let subs = [];
  try { subs = (await V.api.mySubscriptions()).filter((s) => s.plans?.kind === 'box' || /^vip-/.test(s.plan_slug)); } catch (e) { p.innerHTML = `<p class="ct-empty">${esc(errMsg(e))}</p>`; return; }
  const live = subs.find((s) => s.status !== 'cancelada');
  if (!live) { p.innerHTML = `<div class="ct-empty"><strong>Você ainda não tem a Box VIP.</strong><p>Todo mês, uma lingerie escolhida para o seu estilo e o seu tamanho, com troca grátis e desconto no closet.</p><a class="btn-gold" href="assinatura.html">Conhecer a Box Misteriosa</a></div>`; return; }
  const pr = live.preferences || {}, boxes = (live.boxes || []).sort((a, b) => b.month.localeCompare(a.month));
  const next = live.next_billing ? fmtDate(live.next_billing + 'T12:00:00') : '—';
  p.innerHTML = `<article class="vipc">
      <div class="vipc-top"><div><span class="od-status ${live.status === 'pausada' ? 'x' : ''}">${SUB_ST[live.status]}</span><h3>${esc(live.plans?.name || pr.plano || 'Box VIP')}</h3><p>${esc(pr.ciclo ? pr.ciclo[0].toUpperCase() + pr.ciclo.slice(1) : '')}${pr.valor_mensal ? `, ${money(pr.valor_mensal)} por mês` : live.plans?.price ? `, ${money(live.plans.price)} por mês` : ''}</p></div>
      <div class="vipc-next"><span>Próxima cobrança</span><b>${next}</b></div></div>
      <div class="vipc-prof"><span>Perfil: <b>${esc(pr.estilo || '—')}</b></span><span>Cores: <b>${esc((pr.cores || []).join(', ') || '—')}</b></span><span>Tamanho: <b>${esc(pr.tamanho ? `${pr.tamanho.top}/${pr.tamanho.bottom}` : '—')}</b></span><a href="assinatura.html#perfil">Editar perfil</a></div>
      <div class="vipc-act">
        ${live.status === 'ativa' ? '<button class="btn-line" data-a="skip" type="button">Pular o próximo mês</button><button class="btn-line" data-a="pause" type="button">Pausar</button>' : '<button class="btn-gold" data-a="resume" type="button">Retomar assinatura</button>'}
        <button class="btn-text" data-a="cancel" type="button">Cancelar assinatura</button>
      </div>
      <h4>Minhas boxes</h4>
      <ul class="vipc-boxes">${boxes.length ? boxes.map((b) => `<li><span>${new Date(b.month + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span><b>${esc(b.theme || 'Box do mês')}</b><em>${BOX_ST[b.status] || b.status}</em>${b.tracking ? `<a target="_blank" rel="noopener" href="https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(b.tracking)}">Rastrear</a>` : ''}</li>`).join('') : '<li><span>A primeira box está em curadoria.</span></li>'}</ul>
    </article>`;
  p.querySelector('.vipc-act').addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'cancel' && !confirmInline(e.target)) return;
    const patch = a === 'pause' ? { status: 'pausada' } : a === 'resume' ? { status: 'ativa' } : a === 'cancel' ? { status: 'cancelada' } : null;
    try {
      if (a === 'skip') { const d = new Date((live.next_billing || new Date().toISOString().slice(0, 10)) + 'T12:00:00'); d.setMonth(d.getMonth() + 1); await V.api.updateSubscription(live.id, { next_billing: d.toISOString().slice(0, 10) }); toast('Pronto. Pulamos a próxima box.'); }
      else { await V.api.updateSubscription(live.id, patch); toast(a === 'pause' ? 'Assinatura pausada.' : a === 'resume' ? 'Que bom ter você de volta.' : 'Assinatura cancelada.'); }
      haptic(); vip(p);
    } catch (err) { toast(errMsg(err)); }
  });
}
function confirmInline(btn) {
  if (btn.dataset.sure) return true;
  btn.dataset.sure = '1'; btn.textContent = 'Toque de novo para confirmar o cancelamento'; setTimeout(() => { delete btn.dataset.sure; btn.textContent = 'Cancelar assinatura'; }, 4000);
  return false;
}

/* ---------- favoritos ---------- */
function favoritos(p) {
  const render = () => {
    const list = favs.list().map((s) => bySlug.get(s)).filter(Boolean);
    if (!list.length) { p.innerHTML = `<div class="ct-empty"><strong>Nenhum favorito por enquanto.</strong><p>Toque no coração de qualquer peça e ela fica guardada aqui, em todos os seus aparelhos.</p><a class="btn-line" href="index.html#vestiaire">Ver o closet</a></div>`; return; }
    p.innerHTML = `<div class="vs-grid ct-favs">${list.map((x) => `<article class="card" data-slug="${esc(x.slug)}">
      <a class="card-media" href="index.html#peca/${esc(x.slug)}"><img class="a" src="${esc(x.imgs[0])}" alt="${esc(x.name)}" loading="lazy">${x.imgs[1] ? `<img class="b" src="${esc(x.imgs[1])}" alt="" loading="lazy">` : ''}<span class="card-add">Ver a peça</span></a>
      <button class="fav card-fav" type="button" aria-pressed="true" aria-label="Remover dos favoritos">${HEART}</button>
      <div class="card-info"><h3 class="card-name">${esc(x.name)}<span class="card-color">${esc(x.color || CAT_NAME[x.cat])}</span></h3><span class="card-price">${money(x.price)}</span></div></article>`).join('')}</div>`;
  };
  render();
  p.onclick = async (e) => { const b = e.target.closest('.card-fav'); if (!b) return; await favs.toggle(b.closest('.card').dataset.slug); haptic(); render(); };
}

/* ---------- medidas ---------- */
function medidas(p) {
  p.innerHTML = '<div class="ct-block"><h3 class="ct-h3">Meu tamanho gravado</h3><div id="ctRec"></div></div><div class="ct-block"><h3 class="ct-h3">Minhas medidas</h3><p class="ct-p">Suas medidas ficam salvas na conta. Ao guardar, o tamanho também é gravado.</p><div id="ctSizer"></div></div>';
  mySize.pull().then(() => mountSizeRecorder($('#ctRec'), { onDone: (v) => toast(v ? 'Tamanho gravado. As peças com o seu número aparecem em destaque na loja.' : 'Tamanho apagado.') }));
  const m = profile?.measurements;
  if (m && m.busto) saveMeasures(m);
  mountSizer($('#ctSizer'), { onSave: async (val) => { try { await V.api.updateProfile({ measurements: val }); toast('Medidas salvas na sua conta.'); } catch (e) { toast(errMsg(e)); } } });
}

/* ---------- endereços ---------- */
async function enderecos(p) {
  let list = [];
  try { list = await V.api.addresses(); } catch (e) { p.innerHTML = `<p class="ct-empty">${esc(errMsg(e))}</p>`; return; }
  p.innerHTML = `<div class="ad-list">${list.map((a) => `<div class="ad"><b>${esc(a.label || 'Endereço')}</b><p>${esc(a.street)}, ${esc(a.number)}${a.complement ? ' ' + esc(a.complement) : ''}<br>${esc(a.district)}, ${esc(a.city)}/${esc(a.state)}<br>CEP ${esc(a.cep)}</p><button class="btn-text" data-del="${a.id}" type="button">Remover</button></div>`).join('') || '<p class="ct-p">Nenhum endereço salvo.</p>'}</div>
    <form class="ct-form ad-form" id="adForm"><h3>Novo endereço</h3>
      <div class="ad-grid">
        <label class="w2"><span>Nome do endereço</span><input name="label" placeholder="Casa, trabalho..." required></label>
        <label class="w2"><span>CEP</span><input name="cep" inputmode="numeric" maxlength="9" required></label>
        <label class="w4"><span>Rua</span><input name="street" required></label>
        <label class="w1"><span>Número</span><input name="number" inputmode="numeric" required></label>
        <label class="w3"><span>Complemento</span><input name="complement"></label>
        <label class="w2"><span>Bairro</span><input name="district" required></label>
        <label class="w1"><span>Cidade</span><input name="city" required></label>
        <label class="w1"><span>UF</span><input name="state" maxlength="2" required></label>
      </div>
      <button class="btn-gold" type="submit">Salvar endereço</button></form>`;
  const f = $('#adForm');
  f.cep.addEventListener('input', async () => {
    const v = f.cep.value.replace(/\D/g, ''); f.cep.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5, 8) : v; if (v.length !== 8) return;
    try { const j = await (await fetch(`https://viacep.com.br/ws/${v}/json/`)).json(); if (!j.erro) { f.street.value = j.logradouro; f.district.value = j.bairro; f.city.value = j.localidade; f.state.value = j.uf; f.number.focus(); } } catch (e) { /* manual */ }
  });
  f.addEventListener('submit', async (e) => { e.preventDefault(); try { await V.api.saveAddress({ ...Object.fromEntries(new FormData(f)), recipient: profile?.full_name || '', is_default: !list.length }); toast('Endereço salvo.'); enderecos(p); } catch (err) { toast(errMsg(err)); } });
  p.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { try { await V.api.deleteAddress(b.dataset.del); enderecos(p); } catch (err) { toast(errMsg(err)); } }));
}

/* ---------- dados ---------- */
function dados(p) {
  const pr = profile || {};
  p.innerHTML = `<form class="ct-form ad-form" id="dForm"><div class="ad-grid">
      <label class="w4"><span>Nome completo</span><input name="full_name" value="${esc(pr.full_name || '')}" autocomplete="name"></label>
      <label class="w2"><span>WhatsApp</span><input name="phone" value="${esc(pr.phone || '')}" inputmode="tel" autocomplete="tel"></label>
      <label class="w2"><span>Data de nascimento</span><input name="birth_date" type="date" value="${esc(pr.birth_date || '')}"></label>
      <label class="w4"><span>E-mail</span><input value="${esc(V.state.user.email)}" disabled></label>
    </div><button class="btn-gold" type="submit">Salvar dados</button></form>`;
  $('#dForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); if (!d.birth_date) delete d.birth_date;
    try { profile = await V.api.updateProfile(d); toast('Dados salvos.'); } catch (err) { toast(errMsg(err)); }
  });
}

/* ======================= INÍCIO ======================= */
$('#outBtn').addEventListener('click', async () => { try { await V.api.signOut(); } catch (e) { /* */ } local.set('vellure_favoritos', []); authView('entrar', 'Você saiu da sua conta.'); });

(async function start() {
  if (!V.sb) return authView('entrar', 'Não conseguimos conectar ao servidor agora. Tente de novo em instantes.');
  let recovery = params.has('nova-senha');
  V.sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') { recovery = true; authView('nova'); } });
  const user = await V.api.session();
  if (recovery && user) return authView('nova');
  if (user) { if (params.has('confirmado')) toast('E-mail confirmado. Bem-vinda à Maison!'); return afterLogin(); }
  authView(params.get('modo') === 'criar' ? 'criar' : 'entrar', params.get('volta') === 'sacola' ? 'Entre para concluir seu pedido e acompanhar cada etapa.' : params.get('volta') === 'vip' ? 'Entre ou crie sua conta para assinar a Box Misteriosa VIP.' : /^peca\//.test(params.get('volta') || '') ? 'Entre para avaliar a peça que você comprou.' : '');
})();
