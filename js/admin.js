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
    ['produtos', 'Produtos', ico('<path d="M20 7l-8-4-8 4v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>')],
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
      [['pedidos', o], ['agenda', a]].forEach(([k, n]) => { const el = $(`[data-cnt="${k}"]`); if (el) { el.hidden = !n; el.textContent = n; } });
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
      const low = prods.filter((p) => p.stock < 10).sort((a, b) => a.stock - b.stock).slice(0, 6);
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
            <h3 style="margin-top:22px">Estoque baixo</h3>${low.map((p) => `<div class="list-row"><span>${esc(p.name)}</span><b style="font-weight:400;color:${p.stock < 5 ? 'var(--err)' : 'inherit'}">${p.stock} un.</b></div>`).join('') || '<p class="muted">Tudo abastecido.</p>'}</div>
        </div>`;
      bindOrderRows(main);
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
        $('#pt').innerHTML = prods.filter((p) => (!c || p.category === c) && (!t || p.name.toLowerCase().includes(t))).map((p) => `<tr class="click" data-id="${p.id}"><td><div class="thumb">${V.productImage(p)}</div></td><td><b style="font-weight:400">${esc(p.name)}</b><br><span class="muted" style="font-size:12px">${esc(p.subtitle || '')}</span></td><td>${esc(cats.find((x) => x.slug === p.category)?.name || p.category)}</td><td>${money(p.price)}</td><td style="color:${p.stock < 5 ? 'var(--err)' : ''}">${p.stock}</td><td><span class="toggle ${p.is_featured ? 'on' : ''}" data-tg="is_featured"></span></td><td><span class="toggle ${p.is_active ? 'on' : ''}" data-tg="is_active"></span></td></tr>`).join('');
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
      const list = await q(sb.from('coupons').select('*').order('code'));
      main.innerHTML = head('Cupons') + `<div class="two"><div class="pane"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Desconto</th><th>Mínimo</th><th>Validade</th><th>Usos</th><th>Ativo</th><th></th></tr></thead><tbody>
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
    async newsletter(main) {
      const list = await q(sb.from('newsletter').select('*').order('created_at', { ascending: false }));
      main.innerHTML = head('Liste <em>Privée</em>', `<button class="btn ghost sm" id="exp">Exportar CSV</button>`) + `<div class="pane"><p class="muted" style="margin-top:0">${list.length} inscritas</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>E-mail</th><th>Data</th></tr></thead><tbody>${list.map((n) => `<tr><td>${esc(n.email)}</td><td>${fmt(n.created_at)}</td></tr>`).join('')}</tbody></table></div></div>`;
      $('#exp').addEventListener('click', () => csv(list, 'liste-privee'));
    }
  };

  async function upd(table, id, patch) {
    try { await q(sb.from(table).update(patch).eq('id', id)); V.toast('Atualizado ✦'); } catch (e) { fail(e); }
  }

  // ---------------- tabela e detalhe de pedidos ----------------
  function orderTable(list) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Entrega</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${list.map((o) => `<tr class="click" data-o="${o.id}"><td><b style="font-weight:400">${esc(o.code)}</b>${o.gift?.wrap ? ' 🎁' : ''}</td><td>${esc(who(o.user_id))}</td><td>${fmt(o.created_at)}</td><td style="font-size:13px">${esc(o.shipping_method || '')}</td><td>${money(o.total)}</td><td><span class="status ${o.status}">${STATUS[o.status]}</span></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhum pedido.</td></tr>'}</tbody></table></div>`;
  }
  function bindOrderRows(root, cache) {
    $$('[data-o]', root).forEach((tr) => tr.addEventListener('click', async () => {
      const o = (cache && cache.find((x) => x.id === tr.dataset.o)) || (await q(sb.from('orders').select('*, order_items(*)').eq('id', tr.dataset.o).single()));
      const p = profiles[o.user_id] || {}, a = o.address || {};
      const wa = p.phone ? `https://wa.me/55${p.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${(p.full_name || '').split(' ')[0]}! Aqui é a concierge da Vellure ✦ Segue o link seguro para pagamento do seu pedido ${o.code} (${money(o.total)}): `)}` : null;
      const box = modal(`<span class="eyebrow">${fmt(o.created_at)} · ${o.payment_method === 'pix' ? 'Pix' : 'Cartão'}</span><h3>${esc(o.code)}</h3>
        <div class="row2" style="gap:24px;margin-top:16px"><div><span class="eyebrow">Cliente</span><p style="margin:6px 0">${esc(p.full_name || a.recipient || '')}<br>${esc(p.email || '')}<br>${esc(p.phone || '')}${p.cpf ? '<br>CPF ' + esc(p.cpf) : ''}</p>${wa ? `<a class="btn sm" target="_blank" rel="noopener" href="${wa}">Enviar link de pagamento</a>` : ''}</div>
        <div><span class="eyebrow">Entrega · ${esc(o.shipping_method || '')}</span><p style="margin:6px 0">${esc(a.street || '')}, ${esc(a.number || '')} ${esc(a.complement || '')}<br>${esc(a.district || '')} · ${esc(a.city || '')}/${esc(a.state || '')}<br>CEP ${esc(a.cep || '')}</p></div></div>
        ${o.gift?.wrap ? `<div style="background:var(--blush);padding:14px;margin:12px 0"><b style="font-weight:400">🎁 Presente para ${esc(o.gift.to || '—')}</b><br><em>“${esc(o.gift.message || '')}”</em></div>` : ''}
        <div style="margin:16px 0">${(o.order_items || []).map((i) => `<div class="list-row"><span>${i.qty}× ${esc(i.name)} · ${esc(i.color || '')} · ${esc(i.size || '')}</span><span>${money(i.unit_price * i.qty)}</span></div>`).join('')}
        <div class="list-row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div class="list-row"><span>Descontos ${o.coupon ? '(' + esc(o.coupon) + ')' : ''}</span><span>− ${money(o.discount)}</span></div><div class="list-row"><span>Entrega</span><span>${money(o.shipping)}</span></div><div class="list-row" style="font-family:var(--serif);font-size:22px"><span>Total</span><span>${money(o.total)}</span></div></div>
        <div class="row2"><div class="field">${statusSel(Object.keys(STATUS), o.status, 'id="os"')}<label>Status</label></div>${field('tracking', 'Código de rastreio', o.tracking || '')}</div>
        <button class="btn block" id="osave">Salvar alterações</button>`, true);
      $('#os', box).classList.remove('mini-in');
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
      <div class="row3">${field('sizes', 'Tamanhos (vírgula)', (p.sizes || []).join(', '))}${field('stock', 'Estoque', p.stock, 'number')}${field('colors', 'Cores (Nome:#hex, …)', (p.colors || []).map((c) => c.name + ':' + c.hex).join(', '))}</div>
      <div class="field"><textarea name="description" placeholder=" ">${esc(p.description || '')}</textarea><label>Descrição</label></div>
      <div class="row2">${field('material', 'Composição', p.material)}${field('care', 'Cuidados', p.care)}</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap"><label class="check"><input type="checkbox" name="is_active" ${p.is_active ? 'checked' : ''}> Ativo na loja</label><label class="check"><input type="checkbox" name="is_featured" ${p.is_featured ? 'checked' : ''}> Destaque na home</label><label class="check"><input type="checkbox" name="is_new" ${p.is_new ? 'checked' : ''}> Novidade</label></div>
      <div style="display:flex;gap:10px;margin-top:16px">${isNew ? '' : '<button type="button" class="btn ghost" id="pdel">Excluir</button>'}<button class="btn" style="flex:1">${isNew ? 'Criar produto' : 'Salvar'}</button></div></form>`, true);
    const pv = () => { $('#apv', box).innerHTML = V.figure(art); };
    const bindArt = (id, k, num) => $('#' + id, box).addEventListener('input', (e) => { art[k] = num ? +e.target.value : e.target.value; pv(); });
    bindArt('aStyle', 'style'); bindArt('aBg', 'bg'); bindArt('aColor', 'color'); bindArt('aAccent', 'accent'); bindArt('aSkin', 'skin', true);
    pv();
    const f = $('#pf', box);
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
        sizes: d.sizes.split(',').map((s) => s.trim()).filter(Boolean), stock: +d.stock || 0,
        colors: d.colors.split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [name, hex] = s.split(':'); return { name: name.trim(), hex: (hex || '#000').trim() }; }),
        description: d.description, material: d.material, care: d.care, is_active: !!d.is_active, is_featured: !!d.is_featured, is_new: !!d.is_new, art, images
      };
      try { isNew ? await q(sb.from('products').insert(row)) : await q(sb.from('products').update(row).eq('id', p.id)); close(); V.toast('Produto salvo ✦'); route(); } catch (err) { fail(err); }
    });
  }

  document.addEventListener('DOMContentLoaded', gate);
})();
