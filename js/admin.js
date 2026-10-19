/* =====================================================================
   VELLURE · Painel administrativo
   ===================================================================== */
(function () {
  const V = window.V, sb = V.sb;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = V.esc, money = V.money;
  const STATUS = { aguardando_pagamento: 'Aguardando pagamento', pago: 'Pago', em_atelier: 'No atelier', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
  const ico = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const NAV = [
    ['dash', 'Dashboard', ico('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>')],
    ['pedidos', 'Pedidos', ico('<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 016 0v2"/>')],
    ['sacolas', 'Sacolas', ico('<path d="M6 7h12l-1 14H7z"/><path d="M9 7V5a3 3 0 016 0v2"/><path d="M10 13h4" stroke-dasharray="1 2"/>')],
    ['produtos', 'Produtos', ico('<path d="M20 7l-8-4-8 4v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>')],
    ['avisos', 'Avise-me', ico('<path d="M6 16V11a6 6 0 0112 0v5l1.6 2H4.4z"/><path d="M10 20.5a2 2 0 004 0"/>')],
    ['avaliacoes', 'Avaliações', ico('<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6L12 16.3 6.6 19.3l1.3-6L3.3 9.2l6.1-.6z"/>')],
    ['assinaturas', 'Assinaturas', ico('<path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/>')],
    ['boxes', 'Box do mês', ico('<rect x="3" y="8" width="18" height="13"/><path d="M3 8l3-5h12l3 5M12 8v13"/>')],
    ['agenda', 'Concierge', ico('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>')],
    ['clientes', 'Clientes', ico('<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6M17 11a3 3 0 100-6M22 21c-.5-3-2-4.5-4-5"/>')],
    ['planos', 'Planos & serviços', ico('<path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14 3 9.5 9.5 9z"/>')],
    ['cupons', 'Cupons', ico('<path d="M3 9V5h18v4a3 3 0 000 6v4H3v-4a3 3 0 000-6z"/><path d="M10 5v14" stroke-dasharray="2 2"/>')],
    ['entregas', 'Entregas', ico('<path d="M2 6h12v10H2zM14 10h4l4 4v2h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>')],
    ['newsletter', 'Liste Privée', ico('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>')]
  ];

  // ---------------- UI helpers ----------------
  V.toast = (msg) => {
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span style="color:var(--gold)">✦</span><div>${msg}</div>`;
    $('.toasts').appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 500); }, 3200);
  };
  const modal = (html, wide) => {
    const m = $('#modal'), box = $('.box', m);
    box.className = 'box' + (wide ? ' wide' : '');
    box.innerHTML = `<button class="icon-btn x" data-close aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg></button>` + html;
    m.classList.add('on'); $('.overlay').classList.add('on');
    $$('[data-close]', box).forEach((b) => b.addEventListener('click', close));
    return box;
  };
  const close = () => { $('#modal').classList.remove('on'); $('.overlay').classList.remove('on'); };
  const fail = (e) => V.toast(V.errMsg(e));
  const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  const fmt = (d) => (d ? V.fmtDate(d) : '—');
  const field = (name, label, val = '', type = 'text', extra = '') => `<div class="field"><input name="${name}" type="${type}" placeholder=" " value="${esc(val ?? '')}" ${extra}><label>${label}</label></div>`;
  const statusSel = (opts, cur, attr) => `<select class="mini-in" ${attr}>${opts.map((o) => `<option value="${o}" ${o === cur ? 'selected' : ''}>${STATUS[o] || o}</option>`).join('')}</select>`;
  const csv = (rows, name) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const body = [keys.join(';'), ...rows.map((r) => keys.map((k) => `"${String(typeof r[k] === 'object' && r[k] ? JSON.stringify(r[k]) : r[k] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv' })); a.download = name + '.csv'; a.click();
  };
  let profiles = {};
  const who = (id) => profiles[id]?.full_name || profiles[id]?.email || '—';
  async function loadProfiles() { (await q(sb.from('profiles').select('*'))).forEach((p) => (profiles[p.id] = p)); }

  // ---------------- GATE ----------------
  async function gate() {
    if (!sb) return ($('#app').innerHTML = `<div class="gate"><div class="box"><h3>Sem conexão</h3><p class="muted">Não foi possível carregar o Supabase.</p></div></div>`);
    const user = await V.api.session();
    let prof = user ? await V.api.profile(true) : null;
    if (user && prof?.role === 'admin') return shell(prof);
    $('#app').innerHTML = `<div class="gate"><form class="box" id="gf">${V.logoMark(60)}<span class="eyebrow">Acesso restrito</span><h3 style="font-size:34px;margin:6px 0 20px">Painel da <em>Maison</em></h3>
      ${user ? `<p class="form-msg err">${esc(user.email)} não tem permissão de administrador.</p>` : ''}
      ${field('email', 'E-mail', '', 'email', 'required')}${field('pass', 'Senha', '', 'password', 'required')}
      <div class="form-msg" id="gm"></div><button class="btn block">Entrar</button><p style="margin-top:16px"><a class="link" href="index.html">Voltar à loja</a></p></form></div>`;
    $('#gf').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target;
      try { await V.api.signIn(f.email.value, f.pass.value); gate(); } catch (err) { $('#gm').className = 'form-msg err'; $('#gm').textContent = V.errMsg(err); }
    });
  }

  function shell(prof) {
    $('#app').innerHTML = `<div class="adm"><aside id="side"><a class="brand" href="index.html">${V.logoMark(34)}<span class="name">VELLURE<small>PAINEL DA MAISON</small></span></a>
      <nav>${NAV.map(([k, t, i]) => `<a data-p="${k}">${i}${t}<span class="cnt" data-cnt="${k}" hidden></span></a>`).join('')}</nav>
      <div class="foot">${esc(prof.full_name || prof.email)}<br><a href="index.html">Ver loja</a> · <a href="#" id="out">Sair</a></div></aside>
      <main id="main"></main></div>`;
    $('#out').addEventListener('click', async (e) => { e.preventDefault(); await V.api.signOut(); gate(); });
    $$('[data-p]').forEach((a) => a.addEventListener('click', () => { location.hash = a.dataset.p; }));
    addEventListener('hashchange', route);
    $('.overlay').addEventListener('click', close);
    loadProfiles().then(route).catch((e) => { route(); fail(e); });
    badges();
  }
  async function badges() {
    try {
      const [{ count: o }, { count: a }] = await Promise.all([
        sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'aguardando_pagamento'),
        sb.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'solicitado')
      ]);
      const opt = async (fn) => { try { const r = await fn(); return r.error ? 0 : r.count; } catch (e) { return 0; } };
      const [av, rv] = await Promise.all([
        opt(() => sb.from('stock_alerts').select('id', { count: 'exact', head: true }).is('notified_at', null).not('ready_at', 'is', null)),
        opt(() => sb.from('reviews').select('id', { count: 'exact', head: true }).eq('approved', false))
      ]);
      const sc = await opt(() => sb.from('carts').select('id', { count: 'exact', head: true }).is('recovered_at', null).is('reminded_at', null).neq('items', '[]').lt('updated_at', new Date(Date.now() - 3600e3).toISOString()));
      [['pedidos', o], ['agenda', a], ['avisos', av], ['avaliacoes', rv], ['sacolas', sc]].forEach(([k, n]) => { const el = $(`[data-cnt="${k}"]`); if (el) { el.hidden = !n; el.textContent = n; } });
    } catch {}
  }
  async function route() {
    const p = location.hash.slice(1) || 'dash';
    $$('[data-p]').forEach((a) => a.classList.toggle('on', a.dataset.p === p));
    $('#side')?.classList.remove('open');
    const main = $('#main');
    main.innerHTML = '<div class="spinner"></div>';
    try { await (PAGES[p] || PAGES.dash)(main); } catch (e) { main.innerHTML = `<div class="pane"><h3>Erro ao carregar</h3><p>${esc(V.errMsg(e))}</p></div>`; }
  }
  const head = (title, actions = '') => `<div class="top"><div style="display:flex;gap:12px;align-items:center"><button class="icon-btn burger-adm" onclick="document.getElementById('side').classList.add('open')"><svg viewBox="0 0 24 24"><path d="M3 8h18M3 16h18"/></svg></button><h1>${title}</h1></div><div class="actions">${actions}</div></div>`;

  // =================================================================
  const PAGES = {
    // ---------------- DASHBOARD ----------------
    async dash(main) {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [orders, items, subs, appts, prods] = await Promise.all([
        q(sb.from('orders').select('*').order('created_at', { ascending: false })),
        q(sb.from('order_items').select('*, orders!inner(status, created_at)').gte('orders.created_at', since)),
        q(sb.from('subscriptions').select('*, plans(*)')),
        q(sb.from('appointments').select('*, services(name)').order('date')),
        q(sb.from('products').select('*'))
      ]);
      const paid = orders.filter((o) => !['aguardando_pagamento', 'cancelado'].includes(o.status));
      const rev30 = paid.filter((o) => o.created_at >= since).reduce((s, o) => s + +o.total, 0);
      const active = subs.filter((s) => s.status === 'ativa');
      const mrr = active.reduce((s, x) => s + +(x.plans?.price || 0), 0);
      const ticket = paid.length ? paid.reduce((s, o) => s + +o.total, 0) / paid.length : 0;
      const days = [...Array(30)].map((_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5); return d.toISOString().slice(0, 10); });
      const byDay = days.map((d) => paid.filter((o) => o.created_at.slice(0, 10) === d).reduce((s, o) => s + +o.total, 0));
      const max = Math.max(1, ...byDay);
      const top = Object.values(items.filter((i) => i.orders.status !== 'cancelado').reduce((m, i) => { (m[i.name] = m[i.name] || { name: i.name, qty: 0, rev: 0 }); m[i.name].qty += i.qty; m[i.name].rev += i.qty * i.unit_price; return m; }, {})).sort((a, b) => b.rev - a.rev).slice(0, 5);
      const low = prods.filter((p) => p.is_active).flatMap((p) => Object.entries(p.stock_by_size || {}).filter(([, n]) => +n <= 2).map(([s, n]) => ({ name: p.name, size: s, stock: +n })))
        .concat(prods.filter((p) => p.is_active && !Object.keys(p.stock_by_size || {}).length && p.stock < 5).map((p) => ({ name: p.name, size: '', stock: p.stock })))
        .sort((a, b) => a.stock - b.stock).slice(0, 8);
      const today = new Date().toISOString().slice(0, 10);
      main.innerHTML = head('Bonjour, <em>Maison</em>', `<a class="btn sm" href="#pedidos">Ver pedidos</a>`) + `
        <div class="kgrid">
          <div class="kcard dark"><span>Receita · 30 dias</span><b>${money(rev30)}</b><small>${paid.length} pedidos pagos no total</small></div>
          <div class="kcard"><span>MRR recorrente</span><b>${money(mrr)}</b><small>${active.length} assinaturas ativas</small></div>
          <div class="kcard"><span>Ticket médio</span><b>${money(ticket)}</b><small>pedidos pagos</small></div>
          <div class="kcard"><span>Aguardando pagamento</span><b>${orders.filter((o) => o.status === 'aguardando_pagamento').length}</b><small>enviar link pelo WhatsApp</small></div>
          <div class="kcard"><span>Concierge</span><b>${appts.filter((a) => a.status === 'solicitado').length}</b><small>agendamentos a confirmar</small></div>
        </div>
        <div class="two">
          <div class="pane"><h3>Vendas · últimos 30 dias <small class="muted" style="font-family:var(--sans);font-size:12px">${money(rev30)}</small></h3>
            <svg class="chart" viewBox="0 0 600 220" preserveAspectRatio="none">${byDay.map((v, i) => `<rect class="bar" x="${i * 20 + 2}" y="${200 - (v / max) * 180}" width="16" height="${Math.max(1, (v / max) * 180)}" rx="2"><title>${days[i].split('-').reverse().join('/')} · ${money(v)}</title></rect>`).join('')}
            ${[0, 7, 14, 21, 29].map((i) => `<text x="${i * 20 + 2}" y="216">${days[i].slice(8)}/${days[i].slice(5, 7)}</text>`).join('')}</svg></div>
          <div class="pane"><h3>Mais vendidas</h3>${top.length ? top.map((t) => `<div class="list-row"><span>${esc(t.name)} <span class="muted">· ${t.qty} un.</span></span><b style="font-weight:400">${money(t.rev)}</b></div>`).join('') : '<p class="muted">Sem vendas ainda.</p>'}</div>
        </div>
        <div class="two">
          <div class="pane"><h3>Últimos pedidos <a class="link" href="#pedidos">todos</a></h3>${orderTable(orders.slice(0, 6))}</div>
          <div class="pane"><h3>Próximos atendimentos</h3>${appts.filter((a) => a.date >= today && a.status !== 'cancelado').slice(0, 5).map((a) => `<div class="list-row"><span>${esc(a.services?.name)}<br><span class="muted" style="font-size:12px">${who(a.user_id)} · ${fmt(a.date)} ${esc(a.time)}</span></span><span class="status ${a.status}">${a.status}</span></div>`).join('') || '<p class="muted">Agenda livre.</p>'}
            <h3 style="margin-top:22px">Estoque por tamanho <a class="link" href="#avisos">avise-me</a></h3>${low.map((p) => `<div class="list-row"><span>${esc(p.name)}${p.size ? ` <span class="muted">· ${esc(p.size)}</span>` : ''}</span><b style="font-weight:400;color:${p.stock < 1 ? 'var(--err)' : 'inherit'}">${p.stock < 1 ? 'esgotado' : p.stock + ' un.'}</b></div>`).join('') || '<p class="muted">Tudo abastecido.</p>'}</div>
        </div>`;
      bindOrderRows(main);
      // aniversariantes do mês e indicações
      const m = new Date().getMonth() + 1;
      const bdays = Object.values(profiles).filter((p) => p.birth_date && +p.birth_date.slice(5, 7) === m).sort((a, b) => a.birth_date.slice(8) - b.birth_date.slice(8));
      let refs = [];
      try { refs = await q(sb.from('referrals').select('*')); } catch (e) { refs = []; }
      const box = document.createElement('div'); box.className = 'two';
      box.innerHTML = `<div class="pane"><h3>Aniversariantes de ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}</h3><p class="muted" style="margin-top:0;font-size:13px">Cada uma recebe um cupom pessoal de ${(window.VELLURE_CONFIG?.VENDAS?.BIRTHDAY_PERCENT) || 15}% que entra sozinho na sacola.</p>
        ${bdays.map((p) => `<div class="list-row"><span>${esc(p.full_name || p.email)} <span class="muted">· dia ${+p.birth_date.slice(8)}</span></span>${p.phone ? `<a class="link" target="_blank" rel="noopener" href="https://wa.me/55${esc(p.phone.replace(/\D/g, '').replace(/^55/, ''))}?text=${encodeURIComponent(`Feliz aniversário, ${(p.full_name || '').split(' ')[0]}! Aqui é a concierge da Vellure. Seu presente já está na sua conta: ${(window.VELLURE_CONFIG?.VENDAS?.BIRTHDAY_PERCENT) || 15}% em tudo até o fim do mês, aplicado sozinho na sacola. ${new URL('index.html', location.href).href}`)}">Parabenizar</a>` : '<span class="muted">sem WhatsApp</span>'}</div>`).join('') || '<p class="muted">Ninguém faz aniversário este mês (ou ainda não cadastrou a data).</p>'}</div>
        <div class="pane"><h3>Indique uma amiga</h3><div class="kgrid" style="margin:0 0 12px;grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kcard"><span>Amigas que entraram</span><b>${refs.length}</b></div><div class="kcard"><span>Compraram</span><b>${refs.filter((r) => r.order_id).length}</b></div><div class="kcard"><span>Pétalas dadas</span><b>${refs.reduce((a, r) => a + (r.petals || 0), 0)}</b></div></div>
        ${Object.entries(refs.reduce((a, r) => { a[r.referrer] = (a[r.referrer] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `<div class="list-row"><span>${esc(who(id))}</span><span>${n} indicada(s)</span></div>`).join('')}</div>`;
      main.appendChild(box);
    },

    // ---------------- SACOLAS ABANDONADAS ----------------
    async sacolas(main) {
      let carts, coupons, prods;
      try { [carts, coupons, prods] = await Promise.all([q(sb.from('carts').select('*').order('updated_at', { ascending: false }).limit(300)), q(sb.from('coupons').select('*').eq('active', true)), q(sb.from('products').select('slug, name, price, images, art'))]); }
      catch (e) { if (missing(e) || /carts/.test(String(e?.message))) { main.innerHTML = head('Sacolas') + needSql('Sacolas abandonadas').replace('estoque_avaliacoes.sql', 'vendas.sql'); return; } throw e; }
      const bySlug = Object.fromEntries(prods.map((p) => [p.slug, p]));
      const pub = coupons.filter((c) => !c.user_id && (!c.expires_at || new Date(c.expires_at) > new Date()));
      const now = Date.now(), age = (c) => now - new Date(c.updated_at).getTime();
      const open = carts.filter((c) => !c.recovered_at && (c.items || []).length);
      const aband = open.filter((c) => age(c) > 3600e3), live = open.filter((c) => age(c) <= 3600e3);
      const rec = carts.filter((c) => c.recovered_at && c.reminded_at && now - new Date(c.recovered_at) < 30 * 864e5);
      const ago = (c) => { const m = Math.round(age(c) / 60000); return m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} dia(s)`; };
      const contact = (c) => { const p = c.user_id ? profiles[c.user_id] || {} : {}; return { name: c.name || p.full_name || '', phone: (c.phone || p.phone || '').replace(/\D/g, ''), email: c.email || p.email || '' }; };
      main.innerHTML = head('Sacolas <em>abandonadas</em>') + `
        <div class="kgrid">
          <div class="kcard dark"><span>Esperando um lembrete</span><b>${aband.filter((c) => !c.reminded_at).length}</b><small>paradas há mais de 1 hora</small></div>
          <div class="kcard"><span>Valor parado</span><b>${money(aband.reduce((a, c) => a + +c.subtotal, 0))}</b><small>${aband.length} sacola(s)</small></div>
          <div class="kcard"><span>Comprando agora</span><b>${live.length}</b><small>mexeram na última hora</small></div>
          <div class="kcard"><span>Recuperadas · 30 dias</span><b>${rec.length}</b><small>viraram pedido depois do lembrete</small></div>
        </div>
        <div class="pane"><div class="filters"><span class="muted" style="font-size:13px">Cupom no lembrete</span><select id="scp"><option value="">Sem cupom</option>${pub.map((c) => `<option value="${esc(c.code)}">${esc(c.code)} · ${c.kind === 'percent' ? c.value + '%' : money(c.value)}${+c.min_total ? ' acima de ' + money(c.min_total) : ''}</option>`).join('')}</select><a class="link" href="#cupons">criar cupom</a></div>
        <p class="muted" style="margin-top:0;font-size:13px">O lembrete abre o WhatsApp da cliente com um link que devolve a sacola dela, em qualquer aparelho, já com o cupom. Só aparecem aqui sacolas de clientes com conta ou que digitaram o WhatsApp no checkout.</p>
        ${aband.map((c, i) => { const k = contact(c); return `<div class="al-row ${c.reminded_at ? '' : 'ready'}" data-c="${i}">
          <div class="thumb">${bySlug[c.items[0]?.slug] ? V.productImage(bySlug[c.items[0].slug]) : ''}</div>
          <div class="al-main"><b>${esc(k.name || 'Cliente sem nome')}</b> <span class="muted">${esc(k.phone || k.email || 'sem contato')}</span> ${c.user_id ? '<span class="status pago">com conta</span>' : ''}<br>
            <span class="muted">${ago(c)} · ${c.items.reduce((a, x) => a + (x.qty || 1), 0)} peça(s) · <b style="font-weight:500;color:var(--ink,inherit)">${money(c.subtotal)}</b>${c.reminded_at ? ` · lembrete enviado ${fmt(c.reminded_at)}${c.reminder_coupon ? ' com ' + esc(c.reminder_coupon) : ''}` : ''}</span>
            <div class="al-who">${c.items.map((x) => `<span>${x.qty}× ${esc(bySlug[x.slug]?.name || x.slug)} · ${esc(x.size || '')}</span>`).join('')}</div></div>
          <div class="al-act">${k.phone ? `<button class="btn sm" data-wa>${c.reminded_at ? 'Lembrar de novo' : 'Lembrar no WhatsApp'}</button>` : ''}${k.email ? '<button class="btn ghost sm" data-mail>E-mail</button>' : ''}<button class="btn ghost sm" data-copy>Copiar link</button></div></div>`; }).join('') || '<p class="muted">Nenhuma sacola parada. Quando alguém monta a sacola e sai sem finalizar, ela aparece aqui depois de 1 hora.</p>'}</div>`;
      const link = (c) => { const cp = $('#scp').value; return new URL(`index.html?sacola=${c.id}${cp ? '&cupom=' + encodeURIComponent(cp) : ''}`, location.href).href; };
      const text = (c) => { const k = contact(c), cp = pub.find((x) => x.code === $('#scp').value), first = (k.name || '').split(' ')[0], it = bySlug[c.items[0]?.slug]?.name || 'suas peças';
        return `Oi${first ? ', ' + first : ''}! Aqui é a concierge da Vellure. Vi que ${c.items.length > 1 ? `a ${it} e mais ${c.items.length - 1} peça(s) ficaram` : `a ${it} ficou`} na sua sacola e guardei tudo para você.${cp ? ` Com o cupom ${cp.code} você ganha ${cp.kind === 'percent' ? cp.value + '%' : money(cp.value)} de desconto, já aplicado no link.` : ''} É só tocar para continuar: ${link(c)}`; };
      const mark = async (c) => { try { await q(sb.from('carts').update({ reminded_at: new Date().toISOString(), reminder_coupon: $('#scp').value || null }).eq('id', c.id)); badges(); } catch (e) { fail(e); } };
      $$('.al-row', main).forEach((row) => {
        const c = aband[+row.dataset.c], k = contact(c);
        $('[data-wa]', row)?.addEventListener('click', async () => { window.open(`https://wa.me/55${k.phone.replace(/^55/, '')}?text=${encodeURIComponent(text(c))}`, '_blank', 'noopener'); await mark(c); setTimeout(route, 400); });
        $('[data-mail]', row)?.addEventListener('click', async () => { location.href = `mailto:${encodeURIComponent(k.email)}?subject=${encodeURIComponent('Sua sacola na Vellure ficou guardada')}&body=${encodeURIComponent(text(c))}`; await mark(c); });
        $('[data-copy]', row).addEventListener('click', async () => { try { await navigator.clipboard.writeText(link(c)); V.toast('Link copiado'); } catch (e) { V.toast(link(c)); } });
      });
    },

    // ---------------- PEDIDOS ----------------
    async pedidos(main) {
      const orders = await q(sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }));
      main.innerHTML = head('Pedidos', `<button class="btn ghost sm" id="exp">Exportar CSV</button>`) +
        `<div class="pane"><div class="filters"><input id="fq" placeholder="Código, cliente…"><select id="fs"><option value="">Todos os status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div><div id="ot"></div></div>`;
      const draw = () => {
        const s = $('#fs').value, t = $('#fq').value.toLowerCase();
        const list = orders.filter((o) => (!s || o.status === s) && (!t || (o.code + who(o.user_id) + (o.address?.recipient || '')).toLowerCase().includes(t)));
        $('#ot').innerHTML = orderTable(list); bindOrderRows(main, orders);
      };
      $('#fq').addEventListener('input', draw); $('#fs').addEventListener('change', draw);
      $('#exp').addEventListener('click', () => csv(orders.map(({ order_items, ...o }) => ({ ...o, cliente: who(o.user_id), itens: order_items.map((i) => `${i.qty}x ${i.name} ${i.size}`).join(', ') })), 'pedidos-vellure'));
      draw();
    },

    // ---------------- PRODUTOS ----------------
    async produtos(main) {
      const [prods, cats] = await Promise.all([q(sb.from('products').select('*').order('created_at', { ascending: false })), q(sb.from('categories').select('*').order('sort'))]);
      main.innerHTML = head('Produtos', `<button class="btn sm" id="newP">+ Novo produto</button>`) +
        `<div class="pane"><div class="filters"><input id="pq" placeholder="Buscar…"><select id="pc"><option value="">Todas as categorias</option>${cats.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join('')}</select></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Destaque</th><th>Ativo</th></tr></thead><tbody id="pt"></tbody></table></div></div>`;
      const draw = () => {
        const t = $('#pq').value.toLowerCase(), c = $('#pc').value;
        $('#pt').innerHTML = prods.filter((p) => (!c || p.category === c) && (!t || p.name.toLowerCase().includes(t))).map((p) => `<tr class="click" data-id="${p.id}"><td><div class="thumb">${V.productImage(p)}</div></td><td><b style="font-weight:400">${esc(p.name)}</b><br><span class="muted" style="font-size:12px">${esc(p.subtitle || '')}</span></td><td>${esc(cats.find((x) => x.slug === p.category)?.name || p.category)}</td><td>${money(p.price)}</td><td>${stockChips(p)}</td><td><span class="toggle ${p.is_featured ? 'on' : ''}" data-tg="is_featured"></span></td><td><span class="toggle ${p.is_active ? 'on' : ''}" data-tg="is_active"></span></td></tr>`).join('');
        $$('#pt tr').forEach((tr) => tr.addEventListener('click', async (e) => {
          const p = prods.find((x) => x.id === tr.dataset.id);
          const tg = e.target.closest('[data-tg]');
          if (tg) { e.stopPropagation(); try { const v = !p[tg.dataset.tg]; await q(sb.from('products').update({ [tg.dataset.tg]: v }).eq('id', p.id)); p[tg.dataset.tg] = v; tg.classList.toggle('on', v); } catch (err) { fail(err); } return; }
          productForm(p, cats);
        }));
      };
      $('#pq').addEventListener('input', draw); $('#pc').addEventListener('change', draw);
      $('#newP').addEventListener('click', () => productForm(null, cats));
      draw();
    },

    // ---------------- ASSINATURAS ----------------
    async assinaturas(main) {
      const subs = await q(sb.from('subscriptions').select('*, plans(*), boxes(*)').order('started_at', { ascending: false }));
      const act = subs.filter((s) => s.status === 'ativa');
      const by = (k) => act.filter((s) => s.plans?.kind === k);
      main.innerHTML = head('Assinaturas', `<button class="btn ghost sm" id="exp">Exportar CSV</button>`) + `
        <div class="kgrid"><div class="kcard dark"><span>MRR</span><b>${money(act.reduce((s, x) => s + +x.plans.price, 0))}</b></div>
        <div class="kcard"><span>Box Misteriosa</span><b>${by('box').length}</b><small>ativas</small></div><div class="kcard"><span>Cercle Privé</span><b>${by('cercle').length}</b><small>membros</small></div><div class="kcard"><span>Lingerie Care</span><b>${by('care').length}</b><small>ativas</small></div>
        <div class="kcard"><span>Pausadas / canceladas</span><b>${subs.filter((s) => s.status === 'pausada').length} / ${subs.filter((s) => s.status === 'cancelada').length}</b></div></div>
        <div class="pane"><div class="filters"><select id="sf"><option value="">Todos os planos</option><option value="box">Box Misteriosa</option><option value="cercle">Cercle Privé</option><option value="care">Lingerie Care</option></select><select id="ss"><option value="">Todos os status</option><option>ativa</option><option>pausada</option><option>cancelada</option></select></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Plano</th><th>Preferências</th><th>Desde</th><th>Próx. cobrança</th><th>Status</th></tr></thead><tbody id="st"></tbody></table></div></div>`;
      const draw = () => {
        const f = $('#sf').value, s = $('#ss').value;
        $('#st').innerHTML = subs.filter((x) => (!f || x.plans?.kind === f) && (!s || x.status === s)).map((x) => `<tr><td>${esc(who(x.user_id))}<br><span class="muted" style="font-size:12px">${esc(profiles[x.user_id]?.phone || '')}</span></td><td>${esc(x.plans?.name)}<br><span class="muted" style="font-size:12px">${money(x.plans?.price)}/mês</span></td>
          <td style="font-size:12px">${x.preferences?.estilo ? `${esc(x.preferences.estilo)} · ${esc(x.preferences.sutia || '')} / ${esc(x.preferences.calcinha || '')}<br>${(x.preferences.cores || []).map((c) => `<i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(c)}"></i>`).join(' ')} ${esc((x.preferences.pecas || []).join(', '))}${x.preferences.notas ? '<br><em>' + esc(x.preferences.notas) + '</em>' : ''}` : '—'}</td>
          <td>${fmt(x.started_at)}</td><td><input type="date" class="mini-in" value="${x.next_billing || ''}" data-nb="${x.id}"></td><td>${statusSel(['ativa', 'pausada', 'cancelada'], x.status, `data-ss="${x.id}"`)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhuma assinatura.</td></tr>';
        $$('[data-ss]').forEach((el) => el.addEventListener('change', () => upd('subscriptions', el.dataset.ss, { status: el.value })));
        $$('[data-nb]').forEach((el) => el.addEventListener('change', () => upd('subscriptions', el.dataset.nb, { next_billing: el.value })));
      };
      $('#sf').addEventListener('change', draw); $('#ss').addEventListener('change', draw);
      $('#exp').addEventListener('click', () => csv(subs.map((s) => ({ cliente: who(s.user_id), email: profiles[s.user_id]?.email, plano: s.plans?.name, valor: s.plans?.price, status: s.status, desde: s.started_at, proxima: s.next_billing, preferencias: s.preferences })), 'assinaturas-vellure'));
      draw();
    },

    // ---------------- BOX DO MÊS ----------------
    async boxes(main) {
      const [subs, prods] = await Promise.all([q(sb.from('subscriptions').select('*, plans(*), boxes(*)').eq('status', 'ativa')), q(sb.from('products').select('id,slug,name,art,images,sizes'))]);
      const boxSubs = subs.filter((s) => s.plans?.kind === 'box');
      const now = new Date(); const month = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
      const all = boxSubs.flatMap((s) => (s.boxes || []).map((b) => ({ ...b, sub: s }))).sort((a, b) => b.month.localeCompare(a.month));
      main.innerHTML = head('Box do <em>mês</em>', `<button class="btn sm" id="gen">Gerar curadoria de ${new Date(month + 'T12:00').toLocaleDateString('pt-BR', { month: 'long' })}</button>`) +
        `<div class="pane"><p class="muted" style="margin-top:0">Cada assinante ativa da Box recebe uma caixa por mês. Gere a curadoria, escolha as peças pelas preferências de cada cliente e atualize o status até a entrega.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mês</th><th>Cliente</th><th>Plano · perfil</th><th>Peças escolhidas</th><th>Rastreio</th><th>Status</th></tr></thead><tbody>
        ${all.map((b) => `<tr><td>${new Date(b.month + 'T12:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</td><td>${esc(who(b.sub.user_id))}</td><td style="font-size:12px">${esc(b.sub.plans.name)}<br>${esc(b.sub.preferences?.estilo || '')} · ${esc(b.sub.preferences?.sutia || '')}/${esc(b.sub.preferences?.calcinha || '')}</td>
          <td><button class="link" data-pick="${b.id}">${(b.items || []).length ? (b.items || []).map((i) => esc(i.name)).join(', ') : 'Escolher peças'}</button></td>
          <td><input class="mini-in" style="width:130px" value="${esc(b.tracking || '')}" data-tr="${b.id}" placeholder="código"></td>
          <td>${statusSel(['curadoria', 'preparando', 'enviada', 'entregue'], b.status, `data-bs="${b.id}"`)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhuma box ainda.</td></tr>'}
        </tbody></table></div></div>`;
      $$('[data-bs]').forEach((el) => el.addEventListener('change', () => upd('boxes', el.dataset.bs, { status: el.value })));
      $$('[data-tr]').forEach((el) => el.addEventListener('change', () => upd('boxes', el.dataset.tr, { tracking: el.value })));
      $$('[data-pick]').forEach((el) => el.addEventListener('click', () => {
        const b = all.find((x) => x.id === el.dataset.pick); const sel = new Set((b.items || []).map((i) => i.slug));
        const box = modal(`<h3>Curadoria</h3><p class="muted">${esc(who(b.sub.user_id))} · ${esc(b.sub.plans.name)} · estilo ${esc(b.sub.preferences?.estilo || '—')}</p>
          <div class="field">${''}<input id="bt" placeholder=" " value="${esc(b.theme || '')}"><label>Tema da caixa</label></div>
          <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:10px">${prods.map((p) => `<button class="pick" data-s="${p.slug}" style="text-align:left;border:1px solid ${sel.has(p.slug) ? 'var(--wine)' : 'var(--line)'};padding:6px;background:${sel.has(p.slug) ? 'var(--blush)' : '#fff'}"><div style="aspect-ratio:4/5;overflow:hidden">${V.productImage(p)}</div><span style="font-size:12px">${esc(p.name)}</span></button>`).join('')}</div>
          <button class="btn block" id="bsave" style="margin-top:16px">Salvar curadoria</button>`, true);
        $$('.pick', box).forEach((pb) => pb.addEventListener('click', () => { const s = pb.dataset.s; sel.has(s) ? sel.delete(s) : sel.add(s); pb.style.borderColor = sel.has(s) ? 'var(--wine)' : 'var(--line)'; pb.style.background = sel.has(s) ? 'var(--blush)' : '#fff'; }));
        $('#bsave', box).addEventListener('click', async () => {
          try { await q(sb.from('boxes').update({ theme: $('#bt', box).value, items: prods.filter((p) => sel.has(p.slug)).map((p) => ({ slug: p.slug, name: p.name })), status: b.status === 'curadoria' && sel.size ? 'preparando' : b.status }).eq('id', b.id)); close(); V.toast('Curadoria salva'); route(); } catch (e) { fail(e); }
        });
      }));
      $('#gen').addEventListener('click', async () => {
        const missing = boxSubs.filter((s) => !(s.boxes || []).some((b) => b.month === month));
        if (!missing.length) return V.toast('Todas as assinantes já têm a box deste mês.');
        try { await q(sb.from('boxes').insert(missing.map((s) => ({ subscription_id: s.id, month, theme: 'Edição ' + new Date(month + 'T12:00').toLocaleDateString('pt-BR', { month: 'long' }) })))); V.toast(`${missing.length} caixas criadas`); route(); } catch (e) { fail(e); }
      });
    },

    // ---------------- CONCIERGE ----------------
    async agenda(main) {
      const ap = await q(sb.from('appointments').select('*, services(name)').order('date', { ascending: true }));
      main.innerHTML = head('Concierge · <em>agenda</em>') + `<div class="pane"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Serviço</th><th>Cliente</th><th>Local</th><th>Observações</th><th>Status</th></tr></thead><tbody>
        ${ap.map((a) => `<tr><td>${fmt(a.date)}<br><b style="font-weight:400">${esc(a.time)}</b></td><td>${esc(a.services?.name || a.service_slug)}</td><td>${esc(who(a.user_id))}<br>${profiles[a.user_id]?.phone ? `<a class="link" style="font-size:10px" target="_blank" href="https://wa.me/55${esc(profiles[a.user_id].phone.replace(/\D/g, ''))}">WhatsApp</a>` : ''}</td>
          <td style="font-size:13px">${{ domicilio: 'Domicílio', atelier: 'Atelier', video: 'Vídeo' }[a.mode] || a.mode}${a.address ? '<br><span class="muted">' + esc(a.address) + '</span>' : ''}</td><td style="font-size:13px;max-width:260px">${esc(a.notes || '')}</td>
          <td>${statusSel(['solicitado', 'confirmado', 'concluido', 'cancelado'], a.status, `data-as="${a.id}"`)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhum agendamento.</td></tr>'}</tbody></table></div></div>`;
      $$('[data-as]').forEach((el) => el.addEventListener('change', () => upd('appointments', el.dataset.as, { status: el.value }).then(badges)));
    },

    // ---------------- CLIENTES ----------------
    async clientes(main) {
      await loadProfiles();
      const orders = await q(sb.from('orders').select('user_id,total,status'));
      const stats = {}; orders.filter((o) => o.status !== 'cancelado').forEach((o) => { (stats[o.user_id] = stats[o.user_id] || { n: 0, t: 0 }); stats[o.user_id].n++; stats[o.user_id].t += +o.total; });
      const list = Object.values(profiles).sort((a, b) => (stats[b.id]?.t || 0) - (stats[a.id]?.t || 0));
      main.innerHTML = head('Clientes', `<button class="btn ghost sm" id="exp">Exportar CSV</button>`) + `<div class="pane"><div class="filters"><input id="cq" placeholder="Nome, e-mail, telefone…"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Contato</th><th>Medidas</th><th>Pedidos</th><th>Total gasto</th><th>Pétalas</th><th>Admin</th></tr></thead><tbody id="ct"></tbody></table></div></div>`;
      const draw = () => {
        const t = $('#cq').value.toLowerCase();
        $('#ct').innerHTML = list.filter((p) => !t || (p.full_name + p.email + p.phone).toLowerCase().includes(t)).map((p) => `<tr><td>${esc(p.full_name || '—')}<br><span class="muted" style="font-size:12px">desde ${fmt(p.created_at)}</span></td><td style="font-size:13px">${esc(p.email || '')}<br>${esc(p.phone || '')}</td><td style="font-size:13px">${esc(p.measurements?.sutia || '—')} · ${esc(p.measurements?.calcinha || '—')}</td><td>${stats[p.id]?.n || 0}</td><td>${money(stats[p.id]?.t || 0)}</td><td>${p.petals || 0}</td><td><span class="toggle ${p.role === 'admin' ? 'on' : ''}" data-role="${p.id}"></span></td></tr>`).join('');
        $$('[data-role]').forEach((el) => el.addEventListener('click', async () => {
          const p = profiles[el.dataset.role]; const role = p.role === 'admin' ? 'customer' : 'admin';
          if (!confirm(`${role === 'admin' ? 'Conceder' : 'Remover'} acesso de administrador para ${p.email}?`)) return;
          try { await q(sb.from('profiles').update({ role }).eq('id', p.id)); p.role = role; el.classList.toggle('on'); V.toast('Permissão atualizada'); } catch (e) { fail(e); }
        }));
      };
      $('#cq').addEventListener('input', draw);
      $('#exp').addEventListener('click', () => csv(list.map((p) => ({ nome: p.full_name, email: p.email, telefone: p.phone, pedidos: stats[p.id]?.n || 0, total: stats[p.id]?.t || 0, petalas: p.petals })), 'clientes-vellure'));
      draw();
    },

    // ---------------- PLANOS & SERVIÇOS ----------------
    async planos(main) {
      const [plans, services] = await Promise.all([q(sb.from('plans').select('*').order('sort')), q(sb.from('services').select('*').order('sort'))]);
      main.innerHTML = head('Planos & <em>serviços</em>') + `<div class="pane"><h3>Planos recorrentes</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Plano</th><th>Tipo</th><th>Chamada</th><th>Preço/mês</th><th>Benefícios (um por linha)</th><th>Ativo</th><th></th></tr></thead><tbody>
        ${plans.map((p) => `<tr data-plan="${p.slug}"><td><input class="mini-in" name="name" value="${esc(p.name)}"></td><td>${p.kind}</td><td><input class="mini-in" name="tagline" value="${esc(p.tagline || '')}"></td><td><input class="mini-in" style="width:90px" name="price" type="number" step="0.01" value="${p.price}"></td><td><textarea class="mini-in" name="perks" rows="3" style="width:260px">${esc((p.perks || []).join('\n'))}</textarea></td><td><input type="checkbox" name="active" ${p.active ? 'checked' : ''}></td><td><button class="btn sm" data-sp="${p.slug}">Salvar</button></td></tr>`).join('')}</tbody></table></div></div>
        <div class="pane"><h3>Serviços do Cercle Privé</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Serviço</th><th>Descrição</th><th>Duração</th><th>Preço</th><th>Membros</th><th></th></tr></thead><tbody>
        ${services.map((s) => `<tr data-svc="${s.slug}"><td><input class="mini-in" name="name" value="${esc(s.name)}"></td><td><textarea class="mini-in" name="description" rows="2" style="width:280px">${esc(s.description || '')}</textarea></td><td><input class="mini-in" style="width:80px" name="duration" value="${esc(s.duration || '')}"></td><td><input class="mini-in" style="width:90px" type="number" step="0.01" name="price" value="${s.price}"></td><td><input class="mini-in" style="width:90px" type="number" step="0.01" name="member_price" value="${s.member_price}"></td><td><button class="btn sm" data-ssv="${s.slug}">Salvar</button></td></tr>`).join('')}</tbody></table></div></div>`;
      const vals = (tr) => Object.fromEntries($$('[name]', tr).map((i) => [i.name, i.type === 'checkbox' ? i.checked : i.name === 'perks' ? i.value.split('\n').map((x) => x.trim()).filter(Boolean) : i.type === 'number' ? +i.value : i.value]));
      $$('[data-sp]').forEach((b) => b.addEventListener('click', async () => { try { await q(sb.from('plans').update(vals(b.closest('tr'))).eq('slug', b.dataset.sp)); V.toast('Plano salvo'); } catch (e) { fail(e); } }));
      $$('[data-ssv]').forEach((b) => b.addEventListener('click', async () => { try { await q(sb.from('services').update(vals(b.closest('tr'))).eq('slug', b.dataset.ssv)); V.toast('Serviço salvo'); } catch (e) { fail(e); } }));
    },

    // ---------------- CUPONS ----------------
    async cupons(main) {
      const all = await q(sb.from('coupons').select('*').order('code'));
      const list = all.filter((c) => !c.user_id), pess = all.filter((c) => c.user_id);
      main.innerHTML = head('Cupons') + `<div class="two"><div class="pane">${pess.length ? `<p class="muted" style="margin-top:0">${pess.length} cupom(ns) pessoal(is) de aniversário gerado(s) automaticamente, ${pess.filter((c) => c.uses).length} usado(s). Eles não aparecem na lista.</p>` : ''}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Desconto</th><th>Mínimo</th><th>Validade</th><th>Usos</th><th>Ativo</th><th></th></tr></thead><tbody>
        ${list.map((c) => `<tr><td><b style="font-weight:400;letter-spacing:.1em">${esc(c.code)}</b></td><td>${c.kind === 'percent' ? c.value + '%' : money(c.value)}</td><td>${money(c.min_total)}</td><td>${fmt(c.expires_at)}</td><td>${c.uses}</td><td><span class="toggle ${c.active ? 'on' : ''}" data-ct="${esc(c.code)}"></span></td><td><button class="link" data-cd="${esc(c.code)}">excluir</button></td></tr>`).join('')}</tbody></table></div></div>
        <form class="pane" id="cf"><h3>Novo cupom</h3>${field('code', 'Código', '', 'text', 'required style="text-transform:uppercase"')}<div class="row2"><div class="field"><select name="kind"><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select><label>Tipo</label></div>${field('value', 'Valor', '', 'number', 'required step="0.01"')}</div>
        <div class="row2">${field('min_total', 'Compra mínima', '0', 'number', 'step="0.01"')}${field('expires_at', 'Validade', '', 'date')}</div><button class="btn block">Criar cupom</button></form></div>`;
      $$('[data-ct]').forEach((el) => el.addEventListener('click', async () => { const c = list.find((x) => x.code === el.dataset.ct); try { await q(sb.from('coupons').update({ active: !c.active }).eq('code', c.code)); c.active = !c.active; el.classList.toggle('on'); } catch (e) { fail(e); } }));
      $$('[data-cd]').forEach((el) => el.addEventListener('click', async () => { if (!confirm('Excluir cupom ' + el.dataset.cd + '?')) return; try { await q(sb.from('coupons').delete().eq('code', el.dataset.cd)); route(); } catch (e) { fail(e); } }));
      $('#cf').addEventListener('submit', async (e) => {
        e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); d.code = d.code.toUpperCase().trim(); d.value = +d.value; d.min_total = +d.min_total || 0; d.expires_at = d.expires_at ? d.expires_at + 'T23:59:59' : null;
        try { await q(sb.from('coupons').insert(d)); V.toast('Cupom criado'); route(); } catch (err) { fail(err); }
      });
    },

    // ---------------- ENTREGAS ----------------
    async entregas(main) {
      const [ds, rates] = await Promise.all([q(sb.from('delivery_districts').select('*').order('id')), q(sb.from('shipping_rates').select('*').order('uf'))]);
      main.innerHTML = head('Entregas') + `<div class="two"><div class="pane"><h3>Bairros · Mensageira <small class="muted" style="font-family:var(--sans);font-size:12px">posição no mapa (x 0–1000, y 0–700)</small></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Bairro</th><th>Taxa</th><th>Minutos</th><th>X</th><th>Y</th><th></th></tr></thead><tbody>
        ${ds.map((d) => `<tr data-d="${d.id}"><td><input class="mini-in" name="name" value="${esc(d.name)}"></td><td><input class="mini-in" style="width:80px" type="number" step="0.01" name="fee" value="${d.fee}"></td><td><input class="mini-in" style="width:70px" type="number" name="eta_minutes" value="${d.eta_minutes}"></td><td><input class="mini-in" style="width:64px" type="number" name="x" value="${d.x}"></td><td><input class="mini-in" style="width:64px" type="number" name="y" value="${d.y}"></td><td><button class="btn sm" data-sd="${d.id}">Salvar</button></td></tr>`).join('')}
        <tr data-d="new"><td><input class="mini-in" name="name" placeholder="Novo bairro"></td><td><input class="mini-in" style="width:80px" type="number" step="0.01" name="fee" value="29.9"></td><td><input class="mini-in" style="width:70px" type="number" name="eta_minutes" value="90"></td><td><input class="mini-in" style="width:64px" type="number" name="x" value="500"></td><td><input class="mini-in" style="width:64px" type="number" name="y" value="350"></td><td><button class="btn sm" data-sd="new">Adicionar</button></td></tr></tbody></table></div></div>
        <div class="pane"><h3>Frete por estado</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>UF</th><th>Clássico</th><th>Dias</th><th>Expresso</th><th>Dias</th><th></th></tr></thead><tbody>
        ${rates.map((r) => `<tr data-r="${r.uf}"><td>${r.uf}</td><td><input class="mini-in" style="width:76px" type="number" step="0.01" name="classic_price" value="${r.classic_price}"></td><td><input class="mini-in" style="width:52px" type="number" name="classic_days" value="${r.classic_days}"></td><td><input class="mini-in" style="width:76px" type="number" step="0.01" name="express_price" value="${r.express_price}"></td><td><input class="mini-in" style="width:52px" type="number" name="express_days" value="${r.express_days}"></td><td><button class="link" data-sr="${r.uf}">salvar</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
      const vals = (tr) => Object.fromEntries($$('[name]', tr).map((i) => [i.name, i.type === 'number' ? +i.value : i.value]));
      $$('[data-sd]').forEach((b) => b.addEventListener('click', async () => {
        const v = vals(b.closest('tr'));
        try { b.dataset.sd === 'new' ? await q(sb.from('delivery_districts').insert(v)) : await q(sb.from('delivery_districts').update(v).eq('id', b.dataset.sd)); V.toast('Bairro salvo'); if (b.dataset.sd === 'new') route(); } catch (e) { fail(e); }
      }));
      $$('[data-sr]').forEach((b) => b.addEventListener('click', async () => { try { await q(sb.from('shipping_rates').update(vals(b.closest('tr'))).eq('uf', b.dataset.sr)); V.toast('Frete salvo'); } catch (e) { fail(e); } }));
    },

    // ---------------- NEWSLETTER ----------------
    // ---------------- AVISE-ME QUANDO CHEGAR ----------------
    async avisos(main) {
      let alerts, prods;
      try { [alerts, prods] = await Promise.all([q(sb.from('stock_alerts').select('*').is('notified_at', null).order('created_at')), q(sb.from('products').select('id, slug, name, subtitle, sizes, stock, stock_by_size, images, art'))]); }
      catch (e) { if (missing(e)) { main.innerHTML = head('Avise-me') + needSql('Lista de espera por tamanho'); return; } throw e; }
      const bySlug = Object.fromEntries(prods.map((p) => [p.slug, p]));
      const groups = Object.values(alerts.reduce((m, a) => { const k = a.product_slug + '|' + a.size; (m[k] = m[k] || { slug: a.product_slug, size: a.size, list: [] }).list.push(a); return m; }, {}))
        .map((g) => ({ ...g, p: bySlug[g.slug], left: +(bySlug[g.slug]?.stock_by_size || {})[g.size] || 0 }))
        .sort((a, b) => (b.left > 0) - (a.left > 0) || b.list.length - a.list.length);
      const ready = groups.filter((g) => g.left > 0);
      main.innerHTML = head('Avise-me <em>quando chegar</em>', `<button class="btn ghost sm" id="exp">Exportar CSV</button>`) + `
        <div class="kgrid">
          <div class="kcard dark"><span>Clientes esperando</span><b>${alerts.length}</b><small>em ${groups.length} tamanho(s)</small></div>
          <div class="kcard"><span>Prontas para avisar</span><b>${ready.reduce((a, g) => a + g.list.length, 0)}</b><small>o tamanho já voltou</small></div>
          <div class="kcard"><span>Mais pedido</span><b style="font-size:22px">${groups[0] ? esc((groups[0].p?.name || groups[0].slug)) + ' · ' + esc(groups[0].size) : '—'}</b><small>${groups[0] ? groups[0].list.length + ' na fila' : 'sem fila'}</small></div>
        </div>
        <div class="pane"><p class="muted" style="margin-top:0">Reponha o tamanho aqui mesmo. Quando ele volta, a fila fica pronta: avise pelo WhatsApp (uma a uma) ou copie os e-mails para enviar em cópia oculta, e marque como avisadas.</p>
        ${groups.map((g, gi) => `<div class="al-row ${g.left > 0 ? 'ready' : ''}" data-g="${gi}">
          <div class="thumb">${g.p ? V.productImage(g.p) : ''}</div>
          <div class="al-main"><b>${esc(g.p?.name || g.slug)}</b> <span class="muted">${esc(g.p?.subtitle || '')}</span><br>
            <span class="al-size">Tamanho ${esc(g.size)}</span> <span class="status ${g.left > 0 ? 'pago' : 'aguardando_pagamento'}">${g.left > 0 ? `voltou · ${g.left} un.` : 'esgotado'}</span> <span class="muted">· ${g.list.length} esperando desde ${fmt(g.list[0].created_at)}</span>
            <div class="al-who">${g.list.map((a) => `<span title="${fmt(a.created_at)}">${esc(a.email || '')}${a.email && a.phone ? ' · ' : ''}${esc(a.phone || '')}${a.phone ? ` <a class="link" target="_blank" rel="noopener" href="https://wa.me/55${esc(a.phone.replace(/^55/, ''))}?text=${encodeURIComponent(`Oi! Aqui é a concierge da Vellure. A peça ${g.p?.name || ''} voltou no tamanho ${g.size}, e você pediu para ser avisada. Separei o link: ${shopUrl(g.slug)}`)}">WhatsApp</a>` : ''}</span>`).join('')}</div>
          </div>
          <div class="al-act">
            <div class="al-rep"><input class="mini-in" type="number" min="1" value="${g.left > 0 ? g.left : 1}" aria-label="Quantidade"><button class="btn ghost sm" data-rep>${g.left > 0 ? 'Atualizar' : 'Repor'}</button></div>
            ${g.list.some((a) => a.email) ? '<button class="btn ghost sm" data-mail>E-mails</button>' : ''}
            <button class="btn sm" data-done>Marcar avisadas</button>
          </div></div>`).join('') || '<p class="muted">Ninguém na fila. Quando um tamanho esgota, a loja oferece "Avise-me quando chegar" e as clientes aparecem aqui.</p>'}</div>`;
      $('#exp').addEventListener('click', () => csv(alerts.map((a) => ({ peca: bySlug[a.product_slug]?.name || a.product_slug, tamanho: a.size, email: a.email, whatsapp: a.phone, pedido_em: a.created_at, voltou_em: a.ready_at })), 'avise-me-vellure'));
      $$('.al-row', main).forEach((row) => {
        const g = groups[+row.dataset.g];
        $('[data-rep]', row).addEventListener('click', async () => {
          const n = Math.max(0, Math.floor(+$('.al-rep input', row).value || 0)); if (!g.p) return;
          try { await q(sb.from('products').update({ stock_by_size: { ...(g.p.stock_by_size || {}), [g.size]: n } }).eq('id', g.p.id)); V.toast(`${g.size} com ${n} un. A fila está pronta para avisar.`); route(); badges(); } catch (e) { fail(e); }
        });
        $('[data-mail]', row)?.addEventListener('click', async () => {
          const emails = g.list.map((a) => a.email).filter(Boolean);
          const subj = `Voltou no seu tamanho: ${g.p?.name || ''} ${g.size}`;
          const body = `Olá!\n\nA peça ${g.p?.name || ''} voltou no tamanho ${g.size}, e você pediu para ser avisada.\n\nEla está aqui: ${shopUrl(g.slug)}\n\nCom carinho,\nMaison Vellure`;
          try { await navigator.clipboard.writeText(emails.join(', ')); V.toast(`${emails.length} e-mail(s) copiados. Abrindo o e-mail com cópia oculta.`); } catch (e) { /* */ }
          location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
        });
        $('[data-done]', row).addEventListener('click', async () => {
          if (!g.left && !confirm('Este tamanho ainda está esgotado. Marcar a fila como avisada mesmo assim?')) return;
          try { await q(sb.from('stock_alerts').update({ notified_at: new Date().toISOString() }).in('id', g.list.map((a) => a.id))); V.toast('Fila marcada como avisada ✦'); route(); badges(); } catch (e) { fail(e); }
        });
      });
    },

    // ---------------- AVALIAÇÕES ----------------
    async avaliacoes(main) {
      let revs, prods;
      try { [revs, prods] = await Promise.all([q(sb.from('reviews').select('*').order('created_at', { ascending: false })), q(sb.from('products').select('slug, name, images, art'))]); }
      catch (e) { if (missing(e)) { main.innerHTML = head('Avaliações') + needSql('Avaliações com foto'); return; } throw e; }
      const bySlug = Object.fromEntries(prods.map((p) => [p.slug, p]));
      const pend = revs.filter((r) => !r.approved), pub = revs.filter((r) => r.approved);
      const avg = pub.length ? pub.reduce((a, r) => a + r.rating, 0) / pub.length : 0;
      let tab = pend.length ? 'pend' : 'pub';
      const st = (n) => '★★★★★'.slice(0, n) + '<span style="opacity:.25">' + '★★★★★'.slice(n) + '</span>';
      const FITS = { pequeno: 'ficou pequeno', perfeito: 'veste perfeito', grande: 'ficou grande' };
      main.innerHTML = head('Avaliações <em>com foto</em>', `<button class="btn ghost sm" id="exp">Exportar CSV</button>`) + `
        <div class="kgrid">
          <div class="kcard dark"><span>Para revisar</span><b>${pend.length}</b><small>aparecem na loja só depois de aprovadas</small></div>
          <div class="kcard"><span>Publicadas</span><b>${pub.length}</b><small>${pub.filter((r) => r.photos?.length).length} com foto</small></div>
          <div class="kcard"><span>Nota média</span><b>${pub.length ? avg.toFixed(1).replace('.', ',') : '—'}</b><small>todas as peças</small></div>
        </div>
        <div class="pane"><div class="filters"><button class="btn sm" data-tab="pend">Para revisar (${pend.length})</button><button class="btn ghost sm" data-tab="pub">Publicadas (${pub.length})</button></div><div id="rvl"></div></div>`;
      const draw = () => {
        $$('[data-tab]', main).forEach((b) => b.classList.toggle('ghost', b.dataset.tab !== tab));
        const list = tab === 'pend' ? pend : pub;
        $('#rvl').innerHTML = list.map((r) => `<article class="rv-adm" data-r="${r.id}">
          <div class="thumb">${bySlug[r.product_slug] ? V.productImage(bySlug[r.product_slug]) : ''}</div>
          <div class="rv-adm-main">
            <p style="margin:0"><span class="rv-st">${st(r.rating)}</span> <b style="font-weight:400">${esc(bySlug[r.product_slug]?.name || r.product_slug)}</b></p>
            <p class="muted" style="margin:4px 0;font-size:12px">${esc(r.author_name || '')} · ${esc(who(r.user_id))} · ${fmt(r.created_at)}${r.size_bought ? ' · comprou ' + esc(r.size_bought) : ''}${r.fit ? ' · ' + FITS[r.fit] : ''}${r.verified ? ' · compra verificada' : ''}</p>
            ${r.body ? `<p style="margin:8px 0;white-space:pre-line">${esc(r.body)}</p>` : '<p class="muted" style="margin:8px 0">Sem texto.</p>'}
            ${r.photos?.length ? `<div class="rv-adm-ph">${r.photos.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt=""></a>`).join('')}</div>` : ''}
            <div class="field" style="margin-top:10px"><textarea data-reply placeholder=" " rows="2">${esc(r.reply || '')}</textarea><label>Resposta da Maison (opcional, aparece embaixo da avaliação)</label></div>
          </div>
          <div class="al-act">
            ${r.approved ? '<button class="btn ghost sm" data-hide>Ocultar</button>' : '<button class="btn sm" data-ok>Aprovar</button>'}
            <button class="btn ghost sm" data-save>Salvar resposta</button>
            <button class="btn ghost sm" data-del>Excluir</button>
          </div></article>`).join('') || `<p class="muted">${tab === 'pend' ? 'Nada para revisar.' : 'Nenhuma avaliação publicada ainda.'} As avaliações vêm só de clientes com compra paga da peça.</p>`;
        $$('.rv-adm', main).forEach((el) => {
          const r = revs.find((x) => x.id === el.dataset.r), reply = () => $('[data-reply]', el).value.trim() || null;
          const set = async (patch, msg) => { try { await q(sb.from('reviews').update(patch).eq('id', r.id)); Object.assign(r, patch); V.toast(msg); route(); badges(); } catch (e) { fail(e); } };
          $('[data-ok]', el)?.addEventListener('click', () => set({ approved: true, reply: reply() }, 'Avaliação publicada ✦'));
          $('[data-hide]', el)?.addEventListener('click', () => set({ approved: false }, 'Avaliação ocultada'));
          $('[data-save]', el).addEventListener('click', () => set({ reply: reply() }, 'Resposta salva'));
          $('[data-del]', el).addEventListener('click', async () => {
            if (!confirm('Excluir esta avaliação de vez? Isso não pode ser desfeito.')) return;
            try { await q(sb.from('reviews').delete().eq('id', r.id)); V.toast('Avaliação excluída'); route(); badges(); } catch (e) { fail(e); }
          });
        });
      };
      $$('[data-tab]', main).forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
      $('#exp').addEventListener('click', () => csv(revs.map((r) => ({ peca: bySlug[r.product_slug]?.name || r.product_slug, nota: r.rating, autora: r.author_name, texto: r.body, caimento: r.fit, tamanho: r.size_bought, fotos: (r.photos || []).join(' '), publicada: r.approved, data: r.created_at })), 'avaliacoes-vellure'));
      draw();
    },

    async newsletter(main) {
      const list = await q(sb.from('newsletter').select('*').order('created_at', { ascending: false }));
      main.innerHTML = head('Liste <em>Privée</em>', `<button class="btn ghost sm" id="exp">Exportar CSV</button>`) + `<div class="pane"><p class="muted" style="margin-top:0">${list.length} inscritas</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>E-mail</th><th>Data</th></tr></thead><tbody>${list.map((n) => `<tr><td>${esc(n.email)}</td><td>${fmt(n.created_at)}</td></tr>`).join('')}</tbody></table></div></div>`;
      $('#exp').addEventListener('click', () => csv(list, 'liste-privee'));
    }
  };

  async function upd(table, id, patch) {
    try { await q(sb.from(table).update(patch).eq('id', id)); V.toast('Atualizado ✦'); } catch (e) { fail(e); }
  }

  function stockChips(p) {
    const m = p.stock_by_size || {};
    if (!Object.keys(m).length) return `<span style="color:${p.stock < 5 ? 'var(--err)' : ''}">${p.stock}</span>`;
    return `<span class="schips">${(p.sizes || Object.keys(m)).filter((s) => s in m).map((s) => `<i class="${+m[s] === 0 ? 'z' : +m[s] <= 2 ? 'l' : ''}" title="${esc(s)}: ${+m[s]} un.">${esc(s)}<b>${+m[s]}</b></i>`).join('')}</span>`;
  }
  const shopUrl = (slug) => new URL('index.html' + (slug ? '#peca/' + slug : ''), location.href).href;
  const missing = (e) => /stock_alerts|reviews|does not exist|schema cache/i.test(String(e?.message || e));
  const needSql = (t) => `<div class="pane"><h3>${t}</h3><p>Para ativar, rode <b>supabase/estoque_avaliacoes.sql</b> no SQL Editor do Supabase.</p></div>`;

  // ---------------- tabela e detalhe de pedidos ----------------
  function orderTable(list) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Entrega</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${list.map((o) => `<tr class="click" data-o="${o.id}"><td><b style="font-weight:400">${esc(o.code)}</b>${o.gift?.wrap ? ' 🎁' : ''}</td><td>${esc(who(o.user_id))}</td><td>${fmt(o.created_at)}</td><td style="font-size:13px">${esc(o.shipping_method || '')}</td><td>${money(o.total)}</td><td><span class="status ${o.status}">${STATUS[o.status]}</span></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhum pedido.</td></tr>'}</tbody></table></div>`;
  }
  function bindOrderRows(root, cache) {
    $$('[data-o]', root).forEach((tr) => tr.addEventListener('click', async () => {
      const o = (cache && cache.find((x) => x.id === tr.dataset.o)) || (await q(sb.from('orders').select('*, order_items(*)').eq('id', tr.dataset.o).single()));
      const p = profiles[o.user_id] || {}, a = o.address || {};
      const wa = p.phone ? `https://wa.me/55${p.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${(p.full_name || '').split(' ')[0]}! Aqui é a concierge da Vellure. ${o.payment_method === 'dinheiro' ? `Confirmando o seu pedido ${o.code} (${money(o.total)}), com pagamento em dinheiro na entrega${a.troco ? ` e troco para ${money(a.troco)}` : ''}. Qual o melhor horário para receber?` : `Recebemos o seu pedido ${o.code} (${money(o.total)}). Assim que o Pix cair, separamos tudo para envio.`} Acompanhe cada etapa aqui: ${new URL('rastreio.html?pedido=' + encodeURIComponent(o.code), location.href).href}`)}` : null;
      const box = modal(`<span class="eyebrow">${fmt(o.created_at)} · ${({ pix: 'Pix', dinheiro: 'Dinheiro na entrega', cartao: 'Cartão' })[o.payment_method] || o.payment_method || '—'}</span><h3>${esc(o.code)}</h3>
        <div class="row2" style="gap:24px;margin-top:16px"><div><span class="eyebrow">Cliente</span><p style="margin:6px 0">${esc(p.full_name || a.recipient || '')}<br>${esc(p.email || '')}<br>${esc(p.phone || '')}${p.cpf ? '<br>CPF ' + esc(p.cpf) : ''}</p>${wa ? `<a class="btn sm" target="_blank" rel="noopener" href="${wa}">Enviar link de pagamento</a>` : ''}</div>
        <div><span class="eyebrow">Entrega · ${esc(o.shipping_method || '')}</span><p style="margin:6px 0">${esc(a.street || '')}, ${esc(a.number || '')} ${esc(a.complement || '')}<br>${esc(a.district || '')} · ${esc(a.city || '')}/${esc(a.state || '')}<br>CEP ${esc(a.cep || '')}</p>${a.troco ? `<p style="margin:6px 0"><b style="font-weight:400">Troco para ${money(a.troco)}</b></p>` : ''}</div></div>
        ${o.gift?.wrap ? `<div class="gift-adm"><span class="eyebrow">Presente · escrever o cartão à mão${o.gift.fee ? ' · ' + money(o.gift.fee) : ''}${o.gift.hide_price !== false ? ' · sem preço na caixa' : ''}</span><p class="gift-card">${o.gift.to ? `Para ${esc(o.gift.to)},<br>` : ''}${esc(o.gift.message || '(sem mensagem)').replace(/\n/g, '<br>')}${o.gift.from ? `<br><span style="float:right">com carinho, ${esc(o.gift.from)}</span>` : ''}</p></div>` : ''}
        <div style="margin:16px 0">${(o.order_items || []).map((i) => `<div class="list-row"><span>${i.qty}× ${esc(i.name)} · ${esc(i.color || '')} · ${esc(i.size || '')}</span><span>${money(i.unit_price * i.qty)}</span></div>`).join('')}
        <div class="list-row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>${o.gift?.fee ? `<div class="list-row"><span>Embalagem para presente</span><span>${money(o.gift.fee)}</span></div>` : ''}<div class="list-row"><span>Descontos ${o.coupon === 'AMIGA' ? '(indicação de amiga)' : o.coupon ? '(' + esc(o.coupon) + ')' : ''}</span><span>− ${money(o.discount)}</span></div><div class="list-row"><span>Entrega</span><span>${money(o.shipping)}</span></div><div class="list-row" style="font-family:var(--serif);font-size:22px"><span>Total</span><span>${money(o.total)}</span></div></div>
        <div class="row2"><div class="field">${statusSel(Object.keys(STATUS), o.status, 'id="os"')}<label>Status</label></div>${field('tracking', 'Código de rastreio', o.tracking || '')}</div>
        ${o.status === 'aguardando_pagamento' ? `<button class="btn ghost block" id="opaid" style="margin-bottom:10px">${o.payment_method === 'dinheiro' ? 'Dinheiro recebido: marcar como pago' : 'Pix recebido: marcar como pago'}</button>` : ''}
        <button class="btn block" id="osave">Salvar alterações</button>`, true);
      $('#os', box).classList.remove('mini-in');
      $('#opaid', box)?.addEventListener('click', async () => { try { await q(sb.from('orders').update({ status: 'pago' }).eq('id', o.id)); close(); V.toast('Pagamento confirmado'); route(); badges(); } catch (e) { fail(e); } });
      $('#osave', box).addEventListener('click', async () => {
        try { await q(sb.from('orders').update({ status: $('#os', box).value, tracking: $('[name=tracking]', box).value }).eq('id', o.id)); o.status = $('#os', box).value; close(); V.toast('Pedido atualizado'); route(); badges(); } catch (e) { fail(e); }
      });
    }));
  }

  // ---------------- formulário de produto ----------------
  function productForm(p, cats) {
    const isNew = !p;
    p = p || { name: '', slug: '', price: 0, stock: 0, sizes: ['P', 'M', 'G', 'GG'], colors: [{ name: 'Ônix', hex: '#141014' }], images: [], art: { style: 'set', color: '#141014', accent: '#c9a46a', skin: 2, bg: 'blush' }, is_active: true, category: cats[0]?.slug };
    const art = { ...(typeof p.art === 'string' ? JSON.parse(p.art) : p.art) };
    let images = [...(p.images || [])];
    const box = modal(`<h3>${isNew ? 'Novo produto' : esc(p.name)}</h3><form id="pf" style="margin-top:18px">
      <div class="art-editor"><div class="pv" id="apv"></div><div>
        <span class="eyebrow">Ilustração editorial (usada quando não há fotos)</span>
        <div class="row2"><div><label>Modelo da peça</label><select class="mini-in" id="aStyle">${['set', 'bralette', 'highwaist', 'bodysuit', 'garter', 'slip', 'robe'].map((s) => `<option ${art.style === s ? 'selected' : ''} value="${s}">${{ set: 'Conjunto', bralette: 'Bralette', highwaist: 'Cintura alta', bodysuit: 'Body', garter: 'Cinta-liga', slip: 'Camisola', robe: 'Robe' }[s]}</option>`).join('')}</select></div>
        <div><label>Fundo</label><select class="mini-in" id="aBg">${['blush', 'champagne', 'ivory', 'noir', 'wine'].map((s) => `<option ${art.bg === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
        <div class="row3" style="grid-template-columns:1fr 1fr 2fr"><div><label>Cor</label><input type="color" id="aColor" value="${art.color}"></div><div><label>Detalhe</label><input type="color" id="aAccent" value="${art.accent}"></div><div><label>Tom de pele</label><input type="range" min="0" max="5" id="aSkin" value="${art.skin ?? 2}" style="width:100%"></div></div>
      </div></div>
      <span class="eyebrow">Fotos (opcional · substituem a ilustração)</span>
      <div class="imgs" id="imgs"></div><label class="drop" id="drop">Arraste fotos aqui ou clique para enviar<input type="file" accept="image/*" multiple hidden id="file"></label>
      <div class="row2" style="margin-top:16px">${field('name', 'Nome', p.name, 'text', 'required')}${field('slug', 'Slug (URL)', p.slug, 'text', 'required pattern="[a-z0-9-]+"')}</div>
      ${field('subtitle', 'Subtítulo (material · cor)', p.subtitle)}
      <div class="row3"><div class="field"><select name="category">${cats.map((c) => `<option value="${c.slug}" ${c.slug === p.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><label>Categoria</label></div>${field('price', 'Preço', p.price, 'number', 'step="0.01" required')}${field('compare_price', 'Preço "de"', p.compare_price || '', 'number', 'step="0.01"')}</div>
      <div class="row3">${field('sizes', 'Tamanhos (vírgula)', (p.sizes || []).join(', '))}<div class="field"><input readonly tabindex="-1" id="stTotal" value="${p.stock ?? 0} un." placeholder=" "><label>Estoque total (soma)</label></div>${field('colors', 'Cores (Nome:#hex, …)', (p.colors || []).map((c) => c.name + ':' + c.hex).join(', '))}</div>
      <div class="sgrid-wrap"><span class="eyebrow">Estoque por tamanho</span><div class="sgrid" id="sgrid"></div><p class="muted" style="font-size:12px;margin:6px 0 0">Ao repor um tamanho esgotado, as clientes da lista "Avise-me" ficam prontas para receber o aviso.</p></div>
      <div class="field"><textarea name="description" placeholder=" ">${esc(p.description || '')}</textarea><label>Descrição</label></div>
      <div class="row2">${field('material', 'Composição', p.material)}${field('care', 'Cuidados', p.care)}</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap"><label class="check"><input type="checkbox" name="is_active" ${p.is_active ? 'checked' : ''}> Ativo na loja</label><label class="check"><input type="checkbox" name="is_featured" ${p.is_featured ? 'checked' : ''}> Destaque na home</label><label class="check"><input type="checkbox" name="is_new" ${p.is_new ? 'checked' : ''}> Novidade</label></div>
      <div style="display:flex;gap:10px;margin-top:16px">${isNew ? '' : '<button type="button" class="btn ghost" id="pdel">Excluir</button>'}<button class="btn" style="flex:1">${isNew ? 'Criar produto' : 'Salvar'}</button></div></form>`, true);
    const pv = () => { $('#apv', box).innerHTML = V.figure(art); };
    const bindArt = (id, k, num) => $('#' + id, box).addEventListener('input', (e) => { art[k] = num ? +e.target.value : e.target.value; pv(); });
    bindArt('aStyle', 'style'); bindArt('aBg', 'bg'); bindArt('aColor', 'color'); bindArt('aAccent', 'accent'); bindArt('aSkin', 'skin', true);
    pv();
    const f = $('#pf', box);
    // grade de estoque por tamanho
    const sbs = { ...(p.stock_by_size || {}) };
    if (!Object.keys(sbs).length && (p.sizes || []).length) { const n = p.sizes.length; p.sizes.forEach((s, i) => (sbs[s] = Math.floor((p.stock || 0) / n) + (i < (p.stock || 0) % n ? 1 : 0))); }
    const sizesNow = () => f.sizes.value.split(',').map((s) => s.trim()).filter(Boolean);
    const drawStock = () => {
      const sz = sizesNow();
      $('#sgrid', box).innerHTML = sz.map((s) => `<label class="sg ${(+sbs[s] || 0) === 0 ? 'zero' : ''}"><span>${esc(s)}</span><button type="button" data-st="-1" data-s="${esc(s)}">−</button><input type="number" min="0" step="1" inputmode="numeric" data-sz="${esc(s)}" value="${+sbs[s] || 0}"><button type="button" data-st="1" data-s="${esc(s)}">+</button></label>`).join('') || '<p class="muted">Informe os tamanhos acima.</p>';
      $('#stTotal', box).value = sz.reduce((a, s) => a + (+sbs[s] || 0), 0) + ' un.';
    };
    $('#sgrid', box).addEventListener('input', (e) => { const i = e.target.closest('[data-sz]'); if (!i) return; sbs[i.dataset.sz] = Math.max(0, Math.floor(+i.value || 0)); i.closest('.sg').classList.toggle('zero', !sbs[i.dataset.sz]); $('#stTotal', box).value = sizesNow().reduce((a, s) => a + (+sbs[s] || 0), 0) + ' un.'; });
    $('#sgrid', box).addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (!b) return; sbs[b.dataset.s] = Math.max(0, (+sbs[b.dataset.s] || 0) + +b.dataset.st); drawStock(); });
    f.sizes.addEventListener('input', drawStock);
    drawStock();
    f.name.addEventListener('input', () => { if (isNew) f.slug.value = f.name.value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
    const drawImgs = () => {
      $('#imgs', box).innerHTML = images.map((u, i) => `<div class="im"><img src="${esc(u)}" alt=""><button type="button" data-ri="${i}">×</button></div>`).join('');
      $$('[data-ri]', box).forEach((b) => b.addEventListener('click', () => { images.splice(+b.dataset.ri, 1); drawImgs(); }));
    };
    drawImgs();
    const upload = async (files) => {
      for (const file of files) {
        const path = `${Date.now()}-${file.name.normalize('NFD').replace(/[^\w.]+/g, '-')}`;
        $('#drop', box).firstChild.textContent = 'Enviando ' + file.name + '…';
        const { error } = await sb.storage.from('products').upload(path, file, { cacheControl: '31536000', upsert: false });
        if (error) { fail(error); continue; }
        images.push(sb.storage.from('products').getPublicUrl(path).data.publicUrl); drawImgs();
      }
      $('#drop', box).firstChild.textContent = 'Arraste fotos aqui ou clique para enviar';
    };
    const drop = $('#drop', box);
    $('#file', box).addEventListener('change', (e) => upload([...e.target.files]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); upload([...e.dataTransfer.files].filter((x) => x.type.startsWith('image/'))); });
    $('#pdel', box)?.addEventListener('click', async () => {
      if (!confirm('Excluir ' + p.name + '? Pedidos antigos continuam registrados.')) return;
      try { await q(sb.from('products').delete().eq('id', p.id)); close(); V.toast('Produto excluído'); route(); } catch (e) { fail(e); }
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const row = {
        name: d.name, slug: d.slug, subtitle: d.subtitle, category: d.category, price: +d.price, compare_price: d.compare_price ? +d.compare_price : null,
        sizes: sizesNow(), stock_by_size: Object.fromEntries(sizesNow().map((s) => [s, +sbs[s] || 0])), stock: sizesNow().reduce((a, s) => a + (+sbs[s] || 0), 0),
        colors: d.colors.split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [name, hex] = s.split(':'); return { name: name.trim(), hex: (hex || '#000').trim() }; }),
        description: d.description, material: d.material, care: d.care, is_active: !!d.is_active, is_featured: !!d.is_featured, is_new: !!d.is_new, art, images
      };
      try { isNew ? await q(sb.from('products').insert(row)) : await q(sb.from('products').update(row).eq('id', p.id)); close(); V.toast('Produto salvo ✦'); route(); } catch (err) { fail(err); }
    });
  }

  document.addEventListener('DOMContentLoaded', gate);
})();
