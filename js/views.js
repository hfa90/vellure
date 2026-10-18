/* =====================================================================
   VELLURE · telas: Box Misteriosa, Cercle Privé, Medidas, Entrega,
   Checkout e Área da Cliente
   ===================================================================== */
(function () {
  const V = window.V, C = window.VELLURE_CONFIG, $ = V.$, $$ = V.$$, I = V.ICONS;
  const STATUS = { aguardando_pagamento: 'Aguardando pagamento', pago: 'Pago', em_atelier: 'No atelier', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
  V.STATUS = STATUS;
  const maskCep = (el) => el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 8); if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5); el.value = v; });

  // =================================================================
  //  BOX MISTERIOSA
  // =================================================================
  V.route(/^\/box$/, async (view) => {
    view.dataset.title = 'Box Misteriosa';
    const plans = (await V.api.plans()).filter((p) => p.kind === 'box');
    const ps = await V.api.products();
    const pick = (s) => ps.find((p) => p.slug === s) || ps[0];
    view.innerHTML = `
      <section class="box-hero"><div class="wrap inner">
        <div><span class="eyebrow" style="color:var(--gold)">Assinatura mensal · cancele quando quiser</span>
          <h1 class="reveal"><span class="split-line"><span>Box</span></span><span class="split-line"><span><em>Misteriosa</em></span></span></h1>
          <p class="reveal d1">Uma caixa negra, lacrada com cera dourada, chega à sua porta todo mês. Dentro, uma lingerie escolhida pela nossa curadoria a partir do seu estilo, das suas cores e das suas medidas. O mistério é parte do presente.</p>
          <div class="reveal d2" style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn gold" href="#planos">Escolher meu plano</a><a class="btn ghost" style="--fg:var(--ivory)" href="#/medidas">Antes, meu tamanho</a></div></div>
        <div class="mystery" id="mystery" role="button" tabindex="0" aria-label="Abrir a caixa">
          <div class="glow"></div>
          <div class="pop p1">${V.figure(pick('conjunto-emeraude').art, { frame: false })}</div>
          <div class="pop p2">${V.figure(pick('body-vesper').art, { frame: false })}</div>
          <div class="pop p3">${V.figure(pick('conjunto-aurora').art, { frame: false })}</div>
          <div class="mbox"><div class="f front"><div class="ribbon-v"></div>${V.logoMark(60)}</div><div class="f back"></div><div class="f left"></div><div class="f right"></div><div class="f bottom"></div>
            <div class="lid"><div class="ribbon-v"></div><div class="ribbon-h"></div></div></div>
          <span class="hint">Toque para abrir</span>
        </div>
      </div></section>
      <section class="sec wrap">
        <div class="sec-head"><h2 class="reveal">Como <em>funciona</em></h2></div>
        <div class="steps">
          <div class="reveal"><h4>Conte quem você é</h4><p>Um quiz de 1 minuto sobre seu estilo, cores preferidas e o que você ama vestir.</p></div>
          <div class="reveal d1"><h4>Suas medidas</h4><p>Usamos o Atelier de Medidas para garantir a numeração perfeita — sem errar.</p></div>
          <div class="reveal d2"><h4>Curadoria à mão</h4><p>Nossa stylist escolhe sua peça do mês entre coleções e edições exclusivas da Box.</p></div>
          <div class="reveal d3"><h4>O momento de abrir</h4><p>Caixa perfumada, bilhete escrito à mão e troca cortesia se algo não for perfeito.</p></div>
        </div>
      </section>
      <section class="sec wrap" id="planos" style="padding-top:0">
        <div class="sec-head"><h2 class="reveal">Escolha seu <em>ritual</em></h2><span class="muted">Valores mensais · sem fidelidade</span></div>
        <div class="plans">${plans.map((p, i) => `<div class="plan ${p.highlight ? 'hl' : ''} reveal d${i}">${p.highlight ? '<span class="ribbon">A preferida</span>' : ''}
          <h3>${V.esc(p.name)}</h3><span class="muted">${V.esc(p.tagline)}</span>
          <div class="price">${V.money(p.price)}<small> /mês</small></div>
          <ul>${p.perks.map((x) => `<li>${V.esc(x)}</li>`).join('')}</ul>
          <button class="btn ${p.highlight ? 'gold' : ''} block" data-plan="${p.slug}">Assinar ${V.esc(p.name)}</button></div>`).join('')}</div>
      </section>
      <section class="sec" style="background:var(--cream)"><div class="wrap" style="max-width:860px">
        <div class="sec-head"><h2 class="reveal">Perguntas <em>frequentes</em></h2></div>
        <div class="accordion">
          <details><summary>Posso pausar ou cancelar?</summary><div class="body">Sim, a qualquer momento pela sua área de cliente, sem multa. A pausa vale por até 3 meses.</div></details>
          <details><summary>E se não servir?</summary><div class="body">A troca de tamanho é cortesia: a mensageira busca e devolve a peça nova sem custo.</div></details>
          <details><summary>Quando a Box é enviada?</summary><div class="body">A curadoria acontece até o dia 5 e o envio entre os dias 8 e 12 de cada mês.</div></details>
          <details><summary>Posso dar a Box de presente?</summary><div class="body">Pode. Fale com nosso Gift Concierge no Cercle Privé — entregamos com cartão caligrafado.</div></details>
        </div></div></section>`;
    const m = $('#mystery');
    const toggle = () => m.classList.toggle('open');
    m.addEventListener('click', toggle); m.addEventListener('keydown', (e) => e.key === 'Enter' && toggle());
    $$('[data-plan]', view).forEach((b) => b.addEventListener('click', () => startQuiz(plans.find((p) => p.slug === b.dataset.plan))));
    view.querySelector('a[href="#planos"]').addEventListener('click', (e) => { e.preventDefault(); $('#planos').scrollIntoView({ behavior: 'smooth' }); });
  });

  function startQuiz(plan) {
    const sizes = V.store.get('sizes', {});
    const Q = [
      { k: 'estilo', t: 'Qual é a sua essência?', multi: false, o: [['romantica', 'Romântica', 'rendas, laços, tons suaves'], ['classica', 'Clássica', 'atemporal, preto e marfim'], ['ousada', 'Ousada', 'transparências, cintas-ligas'], ['minimal', 'Minimalista', 'linhas puras, seda lisa']] },
      { k: 'cores', t: 'Quais cores te vestem bem?', multi: true, o: [['#141014', 'Ônix'], ['#efe6da', 'Marfim'], ['#d9a3a6', 'Rosé'], ['#5c1325', 'Bordeaux'], ['#1f4d3f', 'Esmeralda'], ['#1d2f6b', 'Cobalto'], ['#e8cfae', 'Champagne'], ['#8e1b2c', 'Rubi']] },
      { k: 'pecas', t: 'O que você mais ama vestir?', multi: true, o: [['conjuntos', 'Conjuntos', ''], ['bodies', 'Bodies', ''], ['cintas-ligas', 'Cintas-ligas', ''], ['noite', 'Camisolas & robes', ''], ['bralettes', 'Bralettes sem aro', '']] },
      { k: 'tamanhos', t: 'Seus tamanhos', sizes: true }
    ];
    const ans = { estilo: null, cores: [], pecas: [], sutia: sizes.sutia || '', calcinha: sizes.calcinha || '' };
    let step = 0;
    const box = V.openModal('<div id="quiz"></div>', true);
    const draw = () => {
      const q = Q[step];
      let body;
      if (q.sizes) {
        body = `<div class="row2" style="text-align:left;max-width:520px;margin:0 auto"><div class="field"><input id="qzS" placeholder=" " value="${V.esc(ans.sutia)}"><label>Sutiã (ex.: 42B)</label></div><div class="field"><select id="qzC">${['', 'PP', 'P', 'M', 'G', 'GG', 'XG'].map((s) => `<option ${ans.calcinha === s ? 'selected' : ''}>${s}</option>`).join('')}</select><label>Calcinha</label></div></div>
          <p class="muted" style="font-size:13px">Não sabe? <a href="#/medidas" style="text-decoration:underline">Descubra no Atelier de Medidas</a>.</p>
          <div class="field" style="max-width:520px;margin:10px auto 0;text-align:left"><textarea id="qzN" placeholder=" ">${V.esc(ans.notas || '')}</textarea><label>Algo que devemos evitar? (opcional)</label></div>`;
      } else {
        body = `<div class="quiz-opts">${q.o.map(([v, n, d]) => {
          const on = q.multi ? ans[q.k].includes(v) : ans[q.k] === v;
          return `<button class="${on ? 'on' : ''}" data-v="${v}">${q.k === 'cores' ? `<div class="sw" style="background:${v}"></div>` : ''}<b>${n}</b>${d ? `<span>${d}</span>` : ''}</button>`;
        }).join('')}</div>`;
      }
      $('#quiz', box).innerHTML = `<div class="quiz-q"><span class="eyebrow">${V.esc(plan.name)} · ${V.money(plan.price)}/mês</span>
        <div class="quiz-progress" style="margin-top:14px">${Q.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
        <h4>${q.t}</h4>${body}
        <div style="display:flex;justify-content:space-between;margin-top:30px;gap:10px"><button class="btn ghost sm" id="qzBack" ${step ? '' : 'style="visibility:hidden"'}>Voltar</button>
        <button class="btn" id="qzNext">${step === Q.length - 1 ? 'Confirmar assinatura' : 'Continuar'}</button></div><div class="form-msg"></div></div>`;
      $$('[data-v]', box).forEach((b) => b.addEventListener('click', () => {
        if (q.multi) { const a = ans[q.k]; a.includes(b.dataset.v) ? a.splice(a.indexOf(b.dataset.v), 1) : a.push(b.dataset.v); b.classList.toggle('on'); }
        else { ans[q.k] = b.dataset.v; $$('[data-v]', box).forEach((x) => x.classList.toggle('on', x === b)); setTimeout(() => { step++; draw(); }, 350); }
      }));
      $('#qzBack', box).addEventListener('click', () => { step--; draw(); });
      $('#qzNext', box).addEventListener('click', async () => {
        if (q.sizes) { ans.sutia = $('#qzS', box).value.trim().toUpperCase(); ans.calcinha = $('#qzC', box).value; ans.notas = $('#qzN', box).value; }
        if (!q.sizes && !q.multi && !ans[q.k]) return;
        if (step < Q.length - 1) { step++; return draw(); }
        const msg = $('.form-msg', box);
        V.closeModal();
        await V.requireAuth(`Entre para concluir sua assinatura ${plan.name}.`);
        try {
          await V.api.subscribe(plan.slug, ans);
          V.openModal(`<div class="center">${V.logoMark(70)}<h3 style="margin-top:20px">Bem-vinda ao <em>ritual</em></h3><p class="muted">Sua assinatura <b>${V.esc(plan.name)}</b> está ativa. Nossa concierge enviará pelo WhatsApp o link seguro para a primeira cobrança de ${V.money(plan.price)}, e a sua primeira Box entra em curadoria agora.</p><a class="btn" href="#/conta/assinaturas">Ver minha assinatura</a></div>`);
        } catch (e) { V.toast(V.errMsg(e)); }
      });
    };
    draw();
  }

  // =================================================================
  //  CERCLE PRIVÉ
  // =================================================================
  V.route(/^\/cercle$/, async (view) => {
    view.dataset.title = 'Cercle Privé';
    const [plans, services] = await Promise.all([V.api.plans(), V.api.services()]);
    const rec = plans.filter((p) => p.kind !== 'box');
    const name = V.state.profile?.full_name || 'Seu nome aqui';
    view.innerHTML = `
      <section class="cercle-hero">
        ${[300, 520, 760, 1000].map((s) => `<div class="orb" style="width:${s}px;height:${s}px"></div>`).join('')}
        <div class="wrap" style="position:relative">
          <span class="eyebrow" style="color:var(--gold)">Clube de membros</span>
          <h1 class="reveal"><span class="split-line"><span>Cercle</span></span><span class="split-line"><span><em>Privé</em></span></span></h1>
          <p class="reveal d1">Um círculo restrito para quem entende que o verdadeiro luxo é ser atendida pelo nome. Prova em casa, personal stylist, presentes com hora marcada e cuidados para as suas peças.</p>
          <div class="member-card" id="mcard"><div class="mc-top">${V.logoMark(40)}<span style="font-size:10px;letter-spacing:.4em">CERCLE PRIVÉ</span></div>
            <svg width="44" height="34" viewBox="0 0 44 34" style="margin-top:22px"><rect width="44" height="34" rx="6" fill="#c9a46a" opacity=".8"/><path d="M0 12h44M0 22h44M15 0v34M29 0v34" stroke="#8f6c3a" stroke-width=".8"/></svg>
            <div class="mc-name">${V.esc(name)}</div><div class="mc-tier">MEMBRE · ${new Date().getFullYear()}</div></div>
        </div>
      </section>
      <section class="sec wrap">
        <div class="sec-head"><h2 class="reveal">Assinaturas <em>da Maison</em></h2><span class="muted">Recorrência pensada para encantar</span></div>
        <div class="plans" style="grid-template-columns:repeat(2,1fr)">${rec.map((p, i) => `<div class="plan ${p.highlight ? 'hl' : ''} reveal d${i}">${p.highlight ? '<span class="ribbon">Membros</span>' : ''}
          <h3>${V.esc(p.name)}</h3><span class="muted">${V.esc(p.tagline)}</span><div class="price">${V.money(p.price)}<small> /mês</small></div>
          <ul>${p.perks.map((x) => `<li>${V.esc(x)}</li>`).join('')}</ul><button class="btn ${p.highlight ? 'gold' : ''} block" data-sub="${p.slug}">Tornar-me membro</button></div>`).join('')}</div>
        <p class="muted center" style="margin-top:20px;font-size:14px">O plano Box <b>Haute Couture</b> já inclui o Cercle Privé.</p>
      </section>
      <section class="sec wrap" style="padding-top:0">
        <div class="sec-head"><h2 class="reveal">Serviços <em>exclusivos</em></h2><span class="muted">Agende em poucos toques</span></div>
        <div class="services">${services.map((s) => `<div class="service reveal"><span class="ico">${I[s.icon] || I.sparkle}</span><h4>${V.esc(s.name)}</h4><p>${V.esc(s.description)}</p>
          <div class="pr"><span>${s.duration && s.duration !== '—' ? V.esc(s.duration) + ' · ' : ''}${+s.price ? V.money(s.price) : 'Cortesia'}${+s.price && +s.member_price < +s.price ? ` <span class="muted">· membros ${+s.member_price ? V.money(s.member_price) : 'cortesia'}</span>` : ''}</span><button class="link" data-book="${s.slug}">Agendar</button></div></div>`).join('')}</div>
      </section>`;
    const card = $('#mcard');
    view.querySelector('.cercle-hero').addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / innerWidth, y = (e.clientY - r.top - r.height / 2) / innerHeight;
      card.style.transform = `rotateY(${x * 30}deg) rotateX(${-y * 30}deg)`; card.style.setProperty('--shine', `${x * 300}%`);
    });
    $$('[data-sub]', view).forEach((b) => b.addEventListener('click', async () => {
      const p = rec.find((x) => x.slug === b.dataset.sub);
      await V.requireAuth(`Entre para assinar ${p.name}.`);
      try { await V.api.subscribe(p.slug, {}); V.toast(`<b>${V.esc(p.name)}</b> ativado. Bem-vinda ✦`); location.hash = '#/conta/assinaturas'; } catch (e) { V.toast(V.errMsg(e)); }
    }));
    $$('[data-book]', view).forEach((b) => b.addEventListener('click', () => book(services.find((s) => s.slug === b.dataset.book))));
  });

  async function book(service) {
    await V.requireAuth(`Entre para agendar ${service.name}.`);
    const days = [];
    for (let d = new Date(), i = 0; days.length < 14; i++) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i + 1); if (x.getDay() !== 0) days.push(x); }
    const st = { date: days[0], time: null, mode: service.slug === 'stylist-video' ? 'video' : service.slug === 'atelier-noiva' ? 'atelier' : 'domicilio' };
    const slots = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    const box = V.openModal(`<span class="eyebrow">Cercle Privé</span><h3>${V.esc(service.name)}</h3><p class="muted" style="margin-top:0">${V.esc(service.description)}</p>
      <div class="opt-label"><span>Dia</span></div><div class="days">${days.map((d, i) => `<button class="${i ? '' : 'on'}" data-d="${i}"><span>${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span><b>${d.getDate()}</b><span>${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span></button>`).join('')}</div>
      <div class="opt-label"><span>Horário</span></div><div class="slots">${slots.map((s) => `<button data-t="${s}">${s}</button>`).join('')}</div>
      <div class="opt-label"><span>Onde</span></div><div class="chips">${[['domicilio', 'Na minha casa'], ['atelier', 'No Atelier Jardins'], ['video', 'Por vídeo']].map(([k, t]) => `<button class="chip-btn ${st.mode === k ? 'on' : ''}" data-m="${k}">${t}</button>`).join('')}</div>
      <div class="field" style="margin-top:18px" id="addrF"><input id="bkAddr" placeholder=" "><label>Endereço da visita</label></div>
      <div class="field"><textarea id="bkNotes" placeholder=" "></textarea><label>Preferências, ocasião, tamanhos…</label></div>
      <div class="form-msg"></div><button class="btn block" id="bkGo">Solicitar agendamento</button>`, true);
    const refresh = () => { $('#addrF', box).style.display = st.mode === 'domicilio' ? '' : 'none'; };
    refresh();
    $$('[data-d]', box).forEach((b) => b.addEventListener('click', () => { st.date = days[+b.dataset.d]; $$('[data-d]', box).forEach((x) => x.classList.toggle('on', x === b)); }));
    $$('[data-t]', box).forEach((b) => b.addEventListener('click', () => { st.time = b.dataset.t; $$('[data-t]', box).forEach((x) => x.classList.toggle('on', x === b)); }));
    $$('[data-m]', box).forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.m; $$('[data-m]', box).forEach((x) => x.classList.toggle('on', x === b)); refresh(); }));
    $('#bkGo', box).addEventListener('click', async () => {
      const msg = $('.form-msg', box);
      if (!st.time) { msg.className = 'form-msg err'; msg.textContent = 'Escolha um horário.'; return; }
      if (st.mode === 'domicilio' && !$('#bkAddr', box).value.trim()) { msg.className = 'form-msg err'; msg.textContent = 'Informe o endereço da visita.'; return; }
      try {
        const iso = `${st.date.getFullYear()}-${String(st.date.getMonth() + 1).padStart(2, '0')}-${String(st.date.getDate()).padStart(2, '0')}`;
        await V.api.book({ service_slug: service.slug, date: iso, time: st.time, mode: st.mode, address: $('#bkAddr', box).value, notes: $('#bkNotes', box).value });
        V.closeModal();
        V.toast(`<b>${V.esc(service.name)}</b> solicitado para ${st.date.toLocaleDateString('pt-BR')} às ${st.time}. Confirmaremos pelo WhatsApp.`);
      } catch (e) { msg.className = 'form-msg err'; msg.textContent = V.errMsg(e); }
    });
  }

  // =================================================================
  //  MEDIDAS & ENTREGA
  // =================================================================
  V.route(/^\/medidas$/, async (view) => { view.dataset.title = 'Atelier de Medidas'; V.renderSizer(view); });

  V.route(/^\/entrega$/, async (view) => {
    view.dataset.title = 'Entrega';
    view.innerHTML = `<section class="page-title wrap"><span class="eyebrow">Entrega & Mensageira</span>
        <h1 class="reveal"><span class="split-line"><span>Até a sua <em>porta,</em></span></span><span class="split-line"><span>com perfume.</span></span></h1>
        <p class="reveal d1">Simule o frete para todo o Brasil — ou toque no seu bairro e veja nossa mensageira sair do atelier até você.</p></section>
      <section class="wrap ship-sim" style="padding-bottom:80px">
        <div class="cep-box reveal"><span class="eyebrow">Simulador de frete</span>
          <form id="cepForm" class="big-in" style="margin-top:14px"><input id="cepIn" placeholder="00000-000" inputmode="numeric" maxlength="9" aria-label="CEP"><button class="btn sm">Calcular</button></form>
          <div class="muted" id="cepAddr" style="font-size:13px;margin-top:10px">Ainda não sabe seu CEP? <a href="https://buscacepinter.correios.com.br" target="_blank" rel="noopener" style="text-decoration:underline">Consulte os Correios</a>.</div>
          <div class="truck-road"><svg class="house" viewBox="0 0 46 46"><path d="M4 22L23 6l19 16v20H4z" fill="#f2e9de" stroke="#1d171a"/><rect x="18" y="28" width="10" height="14" fill="#5c1325"/></svg>
            <svg class="car" id="car" viewBox="0 0 70 40"><rect x="2" y="10" width="40" height="22" rx="3" fill="#0e0b0d"/><path d="M42 16h14l10 9v7H42z" fill="#0e0b0d"/><path d="M46 19h8l6 6H46z" fill="#e6cf9f"/><circle cx="14" cy="33" r="5" fill="#1d171a" stroke="#c9a46a" stroke-width="2"/><circle cx="54" cy="33" r="5" fill="#1d171a" stroke="#c9a46a" stroke-width="2"/><text x="22" y="25" text-anchor="middle" font-family="Cormorant Garamond" font-size="12" fill="#e6cf9f">V</text></svg></div>
          <div class="ship-opts" id="cepOpts"></div>
        </div>
        <div class="reveal d1"><span class="eyebrow">Nossos cuidados</span>
          <div class="accordion" style="margin-top:14px">
            <details open><summary>Caixa perfumada & discreta</summary><div class="body">Toda peça viaja em papel de seda, dentro de caixa negra lacrada com selo de cera. Na etiqueta externa, apenas "V. Maison" — discrição total.</div></details>
            <details><summary>Entrega cortesia</summary><div class="body">Compras acima de ${V.money(C.FREE_SHIPPING_FROM)} e membros do Cercle Privé têm entrega cortesia em qualquer modalidade.</div></details>
            <details><summary>Troca em 30 dias</summary><div class="body">A primeira troca é sempre cortesia. Em São Paulo, a mensageira busca na sua casa.</div></details>
            <details><summary>Seguro total</summary><div class="body">Todos os envios são segurados pelo valor integral da peça.</div></details>
          </div></div>
      </section>
      <section class="wrap" style="padding-bottom:120px">
        <div class="sec-head"><h2 class="reveal">Mapa da <em>Mensageira</em></h2><span class="muted">São Paulo · toque em um bairro</span></div>
        <div id="cityMapRoot" class="reveal"></div>
      </section>`;
    const inp = $('#cepIn'); maskCep(inp); inp.value = V.store.get('cep', '');
    $('#cepForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = $('#cepOpts'), car = $('#car');
      out.innerHTML = '<div class="spinner" style="margin:20px auto"></div>'; car.style.left = '-80px';
      try {
        const sub = await V.cart.subtotal();
        const q = await V.shippingQuote(inp.value, sub); V.store.set('cep', inp.value);
        $('#cepAddr').innerHTML = q.address ? `${V.esc(q.address.logradouro || '')} ${q.address.bairro ? '· ' + V.esc(q.address.bairro) : ''} · <b style="font-weight:400">${V.esc(q.address.localidade)}/${q.uf}</b>` : `Estado: ${q.uf}`;
        out.innerHTML = V.shipOptsHTML(q.options);
        requestAnimationFrame(() => (car.style.left = 'calc(100% - 130px)'));
      } catch (err) { out.innerHTML = `<p style="color:var(--err)">${V.esc(err.message)}</p>`; }
    });
    V.renderCityMap($('#cityMapRoot'));
  });

  // =================================================================
  //  CHECKOUT
  // =================================================================
  V.route(/^\/checkout$/, async (view) => {
    view.dataset.title = 'Finalizar';
    const items = await V.cart.detailed();
    if (!items.length) { view.innerHTML = `<div class="wrap empty"><h3>Sua sacola está vazia</h3><a class="btn" href="#/loja">Ver a coleção</a></div>`; return; }
    view.innerHTML = '<div class="spinner"></div>';
    await V.requireAuth('Entre ou crie sua conta para finalizar com segurança.');
    const prof = (await V.api.profile()) || {};
    let addrs = [];
    try { addrs = await V.api.addresses(); } catch {}
    const sub = items.reduce((s, i) => s + i.p.price * i.qty, 0);
    const st = { addr: addrs.find((a) => a.is_default) || addrs[0] || null, quote: null, ship: null, coupon: null, pay: 'pix', gift: false };

    view.innerHTML = `<section class="wrap page-title" style="padding-bottom:10px"><h1 style="font-size:clamp(44px,6vw,80px)">Finalizar <em>pedido</em></h1></section>
      <section class="wrap checkout">
        <div>
          <div class="panel"><h3><i>01</i>Seus dados</h3>
            <div class="row2"><div class="field"><input id="ckName" placeholder=" " value="${V.esc(prof.full_name || '')}"><label>Nome completo</label></div><div class="field"><input id="ckPhone" placeholder=" " value="${V.esc(prof.phone || '')}"><label>WhatsApp</label></div></div>
            <div class="row2"><div class="field"><input id="ckCpf" placeholder=" " value="${V.esc(prof.cpf || '')}"><label>CPF</label></div><div class="field"><input placeholder=" " value="${V.esc(V.state.user.email)}" disabled><label>E-mail</label></div></div></div>
          <div class="panel"><h3><i>02</i>Endereço</h3>
            ${addrs.length ? `<div class="chips" style="margin-bottom:16px;flex-wrap:wrap">${addrs.map((a) => `<button class="chip-btn ${st.addr?.id === a.id ? 'on' : ''}" data-addr="${a.id}">${V.esc(a.label)} · ${V.esc(a.street)}, ${V.esc(a.number)}</button>`).join('')}<button class="chip-btn" data-addr="new">+ Novo</button></div>` : ''}
            <div id="addrForm"></div></div>
          <div class="panel"><h3><i>03</i>Entrega</h3><div class="ship-opts" id="ckShip" style="margin:0"><p class="muted">Informe o CEP para ver as opções.</p></div></div>
          <div class="panel"><h3><i>04</i>É um presente?</h3>
            <label class="check"><input type="checkbox" id="ckGift"> Sim — embalar como presente, sem preços na caixa (cortesia)</label>
            <div id="giftF" style="display:none;margin-top:12px"><div class="field"><input id="gTo" placeholder=" "><label>Para quem?</label></div><div class="field"><textarea id="gMsg" placeholder=" " maxlength="240"></textarea><label>Mensagem (escrita à mão em cartão de algodão)</label></div></div></div>
          <div class="panel"><h3><i>05</i>Pagamento</h3>
            <div class="pay-opts"><label><input type="radio" name="pay" value="pix" checked> Pix · <b style="font-weight:400;color:var(--ok)">5% off</b></label><label><input type="radio" name="pay" value="cartao"> Cartão · até 6× sem juros</label></div>
            <p class="muted" style="font-size:13px;margin:14px 0 0">${I.shield.replace('<svg', '<svg style="width:16px;height:16px;display:inline;vertical-align:-3px;stroke:currentColor;fill:none"')} Ao confirmar, nossa concierge envia pelo WhatsApp o link de pagamento seguro. Seus dados de cartão nunca passam pelo nosso site.</p></div>
        </div>
        <aside>
          <h3 style="font-size:30px;margin-bottom:10px">Resumo</h3>
          ${items.map((i) => `<div class="line-item" style="grid-template-columns:60px 1fr auto"><div class="ph">${V.productImage(i.p)}</div><div><h4 style="font-size:18px">${V.esc(i.p.name)}</h4><div class="meta">${V.esc(i.color)} · ${V.esc(i.size)} · ${i.qty}×</div></div><div>${V.money(i.p.price * i.qty)}</div></div>`).join('')}
          <form class="coupon" id="cpForm"><input id="cpIn" placeholder="Cupom"><button class="btn sm ghost">Aplicar</button></form><div class="form-msg" id="cpMsg"></div>
          <div class="totals" id="ckTotals"></div>
          <button class="btn block" id="ckGo">Confirmar pedido</button>
          <p class="muted center" style="font-size:12px;margin-top:12px">Membros do Cercle Privé: entrega cortesia aplicada na confirmação.</p>
        </aside>
      </section>`;

    const drawAddr = (a) => {
      a = a || {};
      $('#addrForm').innerHTML = `<div class="row3"><div class="field"><input id="aCep" placeholder=" " inputmode="numeric" value="${V.esc(a.cep || V.store.get('cep', ''))}"><label>CEP</label></div><div class="field"><input id="aLabel" placeholder=" " value="${V.esc(a.label || 'Casa')}"><label>Apelido</label></div><div class="field"><input id="aNum" placeholder=" " value="${V.esc(a.number || '')}"><label>Número</label></div></div>
        <div class="field"><input id="aStreet" placeholder=" " value="${V.esc(a.street || '')}"><label>Rua</label></div>
        <div class="row3"><div class="field"><input id="aComp" placeholder=" " value="${V.esc(a.complement || '')}"><label>Complemento</label></div><div class="field"><input id="aDist" placeholder=" " value="${V.esc(a.district || '')}"><label>Bairro</label></div><div class="field"><input id="aCity" placeholder=" " value="${V.esc(a.city ? a.city + '/' + a.state : '')}"><label>Cidade/UF</label></div></div>
        ${a.id ? '' : '<label class="check"><input type="checkbox" id="aSave" checked> Salvar este endereço</label>'}`;
      const cep = $('#aCep'); maskCep(cep);
      const look = async () => {
        if (cep.value.replace(/\D/g, '').length !== 8) return;
        try {
          const r = await V.api.cep(cep.value);
          if (!$('#aStreet').value) $('#aStreet').value = r.logradouro || '';
          $('#aDist').value = r.bairro || $('#aDist').value; $('#aCity').value = `${r.localidade}/${r.uf}`;
        } catch {}
        quote();
      };
      cep.addEventListener('input', () => cep.value.length === 9 && look());
      if (cep.value.length === 9) look();
    };
    const quote = async () => {
      const cep = $('#aCep')?.value || st.addr?.cep;
      const box = $('#ckShip');
      try {
        st.quote = await V.shippingQuote(cep, sub - (st.coupon?.discount || 0));
        st.ship = st.quote.options[0];
        box.innerHTML = V.shipOptsHTML(st.quote.options, st.ship.id);
        $$('[data-ship]', box).forEach((el) => el.addEventListener('click', () => { st.ship = st.quote.options.find((o) => o.id === el.dataset.ship); $$('[data-ship]', box).forEach((x) => x.classList.toggle('on', x === el)); totals(); }));
      } catch (e) { box.innerHTML = `<p style="color:var(--err)">${V.esc(e.message)}</p>`; st.ship = null; }
      totals();
    };
    const totals = () => {
      const disc = st.coupon?.discount || 0;
      const pix = st.pay === 'pix' ? (sub - disc) * 0.05 : 0;
      const ship = sub >= C.FREE_SHIPPING_FROM ? 0 : st.ship?.price || 0;
      const total = sub - disc - pix + ship;
      $('#ckTotals').innerHTML = `<div><span>Subtotal</span><span>${V.money(sub)}</span></div>${disc ? `<div style="color:var(--ok)"><span>Cupom ${V.esc(st.coupon.code)}</span><span>− ${V.money(disc)}</span></div>` : ''}${pix ? `<div style="color:var(--ok)"><span>Pix 5%</span><span>− ${V.money(pix)}</span></div>` : ''}
        <div><span>Entrega${st.ship ? ' · ' + st.ship.label : ''}</span><span>${st.ship ? (ship ? V.money(ship) : 'Cortesia') : '—'}</span></div><div class="grand"><span>Total</span><span>${V.money(total)}</span></div>
        ${st.pay === 'cartao' ? `<div class="muted" style="font-size:12px"><span>6× de ${V.money(total / 6)} sem juros</span></div>` : ''}<div class="muted" style="font-size:12px"><span>+${Math.floor(total)} Pétalas</span></div>`;
    };
    $$('[data-addr]', view).forEach((b) => b.addEventListener('click', () => {
      $$('[data-addr]', view).forEach((x) => x.classList.toggle('on', x === b));
      st.addr = b.dataset.addr === 'new' ? null : addrs.find((a) => a.id === b.dataset.addr);
      drawAddr(st.addr);
    }));
    drawAddr(st.addr);
    $$('input[name=pay]', view).forEach((r) => r.addEventListener('change', () => { st.pay = r.value; totals(); }));
    $('#ckGift').addEventListener('change', (e) => { st.gift = e.target.checked; $('#giftF').style.display = st.gift ? '' : 'none'; });
    $('#cpForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const msg = $('#cpMsg');
      const r = await V.api.checkCoupon($('#cpIn').value.trim(), sub);
      if (r.ok) { st.coupon = r; msg.className = 'form-msg ok'; msg.textContent = `Cupom aplicado: − ${V.money(r.discount)}`; } else { st.coupon = null; msg.className = 'form-msg err'; msg.textContent = r.message; }
      totals();
    });
    totals();
    $('#ckGo').addEventListener('click', async () => {
      const btn = $('#ckGo');
      const name = $('#ckName').value.trim(), phone = $('#ckPhone').value.trim();
      const addr = { cep: $('#aCep').value, label: $('#aLabel').value, number: $('#aNum').value, street: $('#aStreet').value, complement: $('#aComp').value, district: $('#aDist').value, city: $('#aCity').value.split('/')[0], state: ($('#aCity').value.split('/')[1] || '').trim(), recipient: name };
      if (!name || !phone) return V.toast('Preencha <b>nome e WhatsApp</b>.');
      if (!addr.street || !addr.number || addr.cep.length !== 9) return V.toast('Complete o <b>endereço</b>.');
      if (!st.ship) return V.toast('Escolha a <b>entrega</b>.');
      btn.disabled = true; btn.textContent = 'Confirmando…';
      try {
        V.api.updateProfile({ full_name: name, phone, cpf: $('#ckCpf').value.trim() }).catch(() => {});
        if ($('#aSave')?.checked) V.api.saveAddress({ ...addr, is_default: !addrs.length }).catch(() => {});
        const r = await V.api.placeOrder({
          p_items: items.map((i) => ({ slug: i.slug, size: i.size, color: i.color, qty: i.qty })),
          p_address: addr, p_shipping: { label: st.ship.label, price: st.ship.price }, p_payment: st.pay,
          p_coupon: st.coupon?.code || null, p_gift: st.gift ? { wrap: true, to: $('#gTo').value, message: $('#gMsg').value } : null
        });
        V.cart.clear(); V.lastOrder = { ...r, pay: st.pay, phone };
        location.hash = '#/pedido/' + r.code;
      } catch (e) { V.toast(V.errMsg(e)); btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
    });
  });

  V.route(/^\/pedido\/([\w-]+)$/, async (view, m) => {
    view.dataset.title = 'Pedido confirmado';
    const o = V.lastOrder || { code: m[1] };
    const wa = `https://wa.me/${C.WHATSAPP}?text=${encodeURIComponent(`Olá! Acabei de fazer o pedido ${o.code} na Vellure e gostaria do link de pagamento.`)}`;
    view.innerHTML = `<section class="wrap success">${V.logoMark(90)}<span class="eyebrow">Pedido ${V.esc(o.code)}</span>
      <h1 class="reveal"><span class="split-line"><span>Merci, <em>chérie.</em></span></span></h1>
      <p class="muted" style="max-width:520px;margin:20px auto">Seu pedido foi recebido pelo atelier${o.total ? ` — total de <b>${V.money(o.total)}</b>` : ''}. Em instantes nossa concierge envia pelo WhatsApp o link seguro de pagamento ${o.pay === 'pix' ? 'via Pix' : 'no cartão'}. Assim que confirmado, sua peça segue para a caixa perfumada.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn" href="${wa}" target="_blank" rel="noopener">Falar com a concierge</a><a class="btn ghost" href="#/conta/pedidos">Acompanhar pedido</a></div></section>`;
  });

  // =================================================================
  //  ÁREA DA CLIENTE
  // =================================================================
  const TABS = [['resumo', 'Resumo'], ['pedidos', 'Pedidos'], ['assinaturas', 'Assinaturas'], ['agenda', 'Agendamentos'], ['medidas', 'Minhas medidas'], ['favoritos', 'Favoritos'], ['enderecos', 'Endereços'], ['perfil', 'Perfil']];
  V.route(/^\/conta(?:\/(\w+))?$/, async (view, m) => {
    view.dataset.title = 'Minha conta';
    if (!V.state.user) { view.innerHTML = '<div class="spinner"></div>'; await V.requireAuth(); }
    const tab = m[1] || 'resumo';
    const prof = (await V.api.profile()) || {};
    const first = (prof.full_name || '').split(' ')[0] || 'querida';
    view.innerHTML = `<section class="wrap" style="padding-top:40px">
      <div class="account"><nav>${TABS.map(([k, t]) => `<a href="#/conta/${k}" class="${tab === k ? 'on' : ''}">${t}</a>`).join('')}${prof.role === 'admin' ? '<a href="admin.html" style="color:var(--gold-3)">Painel admin →</a>' : ''}<a href="#" id="logout">Sair</a></nav>
      <div><div class="welcome"><div><span class="eyebrow" style="color:var(--gold)">Área exclusiva</span><h2>Olá, <em>${V.esc(first)}</em></h2></div><div class="petals"><b>${(prof.petals || 0).toLocaleString('pt-BR')}</b><span>Pétalas acumuladas</span></div></div>
      <div id="acc"><div class="spinner"></div></div></div></div></section>`;
    $('#logout').addEventListener('click', async (e) => { e.preventDefault(); await V.api.signOut(); V.toast('Até breve ✦'); location.hash = '#/'; });
    const acc = $('#acc');
    try { await (ACC[tab] || ACC.resumo)(acc, prof); } catch (e) { acc.innerHTML = `<div class="empty"><h3>Não foi possível carregar</h3><p>${V.esc(V.errMsg(e))}</p></div>`; }
    V.revealScan();
  });

  const orderCard = (o) => {
    const steps = ['aguardando_pagamento', 'pago', 'em_atelier', 'enviado', 'entregue'];
    const at = steps.indexOf(o.status);
    return `<div class="order-card"><div class="oh"><div><b style="font-weight:400;font-family:var(--serif);font-size:22px">${V.esc(o.code)}</b><br><span class="muted" style="font-size:12px">${V.fmtDate(o.created_at)} · ${V.esc(o.shipping_method || '')}</span></div><span class="status ${o.status}">${STATUS[o.status]}</span><b style="font-weight:400">${V.money(o.total)}</b></div>
      <div class="ob">${o.status !== 'cancelado' ? `<div class="timeline">${steps.map((s, i) => `<div class="${i <= at ? 'done' : ''}">${STATUS[s].replace('Aguardando pagamento', 'Pagamento')}</div>`).join('')}</div>` : ''}
      ${(o.order_items || []).map((i) => `<div style="display:flex;justify-content:space-between;padding:6px 0">${V.esc(i.name)} · ${V.esc(i.size || '')} · ${i.qty}×<span>${V.money(i.unit_price * i.qty)}</span></div>`).join('')}
      ${o.tracking ? `<p style="margin:10px 0 0">Rastreio: <b style="font-weight:400">${V.esc(o.tracking)}</b></p>` : ''}</div></div>`;
  };
  const ACC = {
    async resumo(el, prof) {
      const [orders, subs, appts] = await Promise.all([V.api.myOrders().catch(() => []), V.api.mySubscriptions().catch(() => []), V.api.myAppointments().catch(() => [])]);
      const active = subs.filter((s) => s.status === 'ativa');
      const next = appts.filter((a) => a.status !== 'cancelado' && a.date >= new Date().toISOString().slice(0, 10));
      el.innerHTML = `<div class="kpis"><div class="kpi"><b>${orders.length}</b><span>Pedidos</span></div><div class="kpi"><b>${active.length}</b><span>Assinaturas ativas</span></div><div class="kpi"><b>${next.length}</b><span>Próximos agendamentos</span></div></div>
        ${active.length ? '' : `<div class="sub-card"><div><span class="eyebrow">Sugestão da Maison</span><h3>Box <em>Misteriosa</em></h3><p class="muted" style="margin:6px 0 0">Uma lingerie-surpresa por mês, escolhida pelo seu estilo e medidas.</p></div><a class="btn" href="#/box">Conhecer</a></div>`}
        ${orders[0] ? `<span class="eyebrow">Último pedido</span><div style="margin-top:12px">${orderCard(orders[0])}</div>` : `<div class="empty" style="padding:40px 0"><h3>Ainda sem pedidos</h3><a class="btn" href="#/loja">Descobrir a coleção</a></div>`}`;
    },
    async pedidos(el) {
      const orders = await V.api.myOrders();
      el.innerHTML = orders.length ? orders.map(orderCard).join('') : `<div class="empty"><h3>Nenhum pedido ainda</h3><a class="btn" href="#/loja">Ver coleção</a></div>`;
    },
    async assinaturas(el) {
      const subs = await V.api.mySubscriptions();
      el.innerHTML = subs.length ? subs.map((s) => `<div class="sub-card"><div><span class="eyebrow">${s.plans?.kind === 'box' ? 'Box Misteriosa' : s.plans?.kind === 'care' ? 'Lingerie Care' : 'Cercle Privé'}</span>
          <h3>${V.esc(s.plans?.name || s.plan_slug)} <span class="status ${s.status}" style="vertical-align:middle">${s.status}</span></h3>
          <p class="muted" style="margin:6px 0">${V.money(s.plans?.price)} /mês · desde ${V.fmtDate(s.started_at)}${s.status === 'ativa' ? ` · próxima cobrança ${V.fmtDate(s.next_billing)}` : ''}</p>
          ${s.preferences?.estilo ? `<p style="font-size:13px;margin:0">Estilo: ${V.esc(s.preferences.estilo)} · Sutiã ${V.esc(s.preferences.sutia || '—')} · Calcinha ${V.esc(s.preferences.calcinha || '—')}</p>` : ''}
          ${(s.boxes || []).length ? `<p style="font-size:13px;margin:8px 0 0">${s.boxes.map((b) => `📦 ${V.esc(b.theme || 'Box')} · <span class="status">${b.status}</span>${b.tracking ? ' · ' + V.esc(b.tracking) : ''}`).join('<br>')}</p>` : ''}</div>
          <div class="sub-actions">${s.status === 'ativa' ? `<button class="btn ghost sm" data-s="${s.id}" data-a="pausada">Pausar</button><button class="btn ghost sm" data-s="${s.id}" data-a="cancelada">Cancelar</button>` : s.status === 'pausada' ? `<button class="btn sm" data-s="${s.id}" data-a="ativa">Retomar</button>` : ''}</div></div>`).join('')
        : `<div class="empty"><h3>Nenhuma assinatura</h3><p>Descubra a Box Misteriosa, o Cercle Privé e o Lingerie Care.</p><a class="btn" href="#/box">Box Misteriosa</a> <a class="btn ghost" href="#/cercle">Cercle Privé</a></div>`;
      $$('[data-s]', el).forEach((b) => b.addEventListener('click', async () => {
        if (b.dataset.a === 'cancelada' && !confirm('Deseja mesmo cancelar? Você pode pausar por até 3 meses.')) return;
        try { await V.api.updateSubscription(b.dataset.s, { status: b.dataset.a }); V.toast('Assinatura atualizada'); ACC.assinaturas(el); } catch (e) { V.toast(V.errMsg(e)); }
      }));
    },
    async agenda(el) {
      const ap = await V.api.myAppointments();
      el.innerHTML = (ap.length ? ap.map((a) => `<div class="order-card"><div class="oh"><div><b style="font-weight:400;font-family:var(--serif);font-size:22px">${V.esc(a.services?.name || a.service_slug)}</b><br><span class="muted" style="font-size:12px">${V.fmtDate(a.date)} às ${V.esc(a.time)} · ${{ domicilio: 'Em casa', atelier: 'Atelier Jardins', video: 'Vídeo' }[a.mode] || a.mode}</span></div><span class="status ${a.status}">${a.status}</span>${['solicitado', 'confirmado'].includes(a.status) ? `<button class="link" data-c="${a.id}">Cancelar</button>` : ''}</div></div>`).join('') : `<div class="empty"><h3>Nenhum agendamento</h3></div>`) + `<div class="center"><a class="btn" href="#/cercle">Agendar experiência</a></div>`;
      $$('[data-c]', el).forEach((b) => b.addEventListener('click', async () => { await V.api.cancelAppointment(b.dataset.c); ACC.agenda(el); }));
    },
    async medidas(el, prof) {
      const m = prof.measurements || {}, s = V.store.get('sizes', {});
      el.innerHTML = `<div class="kpis"><div class="kpi"><b>${V.esc(m.sutia || s.sutia || '—')}</b><span>Sutiã</span></div><div class="kpi"><b>${V.esc(m.calcinha || s.calcinha || '—')}</b><span>Calcinha</span></div><div class="kpi"><b>${V.esc(m.body || s.body || '—')}</b><span>Body · Camisola</span></div></div>
        ${m.busto ? `<table class="size-table"><tr><th>Busto</th><th>Sob o busto</th><th>Cintura</th><th>Quadril</th></tr><tr><td>${m.busto} cm</td><td>${m.sobBusto} cm</td><td>${m.cintura} cm</td><td>${m.quadril} cm</td></tr></table>` : ''}
        <div class="center" style="margin-top:30px"><a class="btn" href="#/medidas">${m.busto ? 'Atualizar no Atelier de Medidas' : 'Descobrir meu tamanho'}</a></div>`;
    },
    async favoritos(el) {
      const ps = (await V.api.products()).filter((p) => V.wish.has(p.slug));
      el.innerHTML = ps.length ? `<div class="grid" style="grid-template-columns:repeat(3,1fr)">${ps.map((p) => V.cardHTML(p)).join('')}</div>` : `<div class="empty"><h3>Nenhum favorito</h3><a class="btn" href="#/loja">Ver coleção</a></div>`;
      V.bindCards(el);
    },
    async enderecos(el) {
      const list = await V.api.addresses();
      el.innerHTML = list.map((a) => `<div class="order-card"><div class="oh"><div><b style="font-weight:400">${V.esc(a.label)}</b>${a.is_default ? ' <span class="status">padrão</span>' : ''}<br><span class="muted" style="font-size:13px">${V.esc(a.street)}, ${V.esc(a.number)} ${V.esc(a.complement || '')} · ${V.esc(a.district)} · ${V.esc(a.city)}/${V.esc(a.state)} · ${V.esc(a.cep)}</span></div><button class="link" data-del="${a.id}">Remover</button></div></div>`).join('') +
        `<form id="newAddr" class="order-card" style="padding:22px"><span class="eyebrow">Novo endereço</span><div class="row3" style="margin-top:14px"><div class="field"><input name="cep" placeholder=" " required><label>CEP</label></div><div class="field"><input name="label" placeholder=" " value="Casa"><label>Apelido</label></div><div class="field"><input name="number" placeholder=" " required><label>Número</label></div></div>
        <div class="field"><input name="street" placeholder=" " required><label>Rua</label></div><div class="row3"><div class="field"><input name="complement" placeholder=" "><label>Complemento</label></div><div class="field"><input name="district" placeholder=" "><label>Bairro</label></div><div class="field"><input name="city" placeholder=" "><label>Cidade/UF</label></div></div><button class="btn">Salvar endereço</button></form>`;
      const f = $('#newAddr', el); maskCep(f.cep);
      f.cep.addEventListener('input', async () => { if (f.cep.value.length === 9) try { const r = await V.api.cep(f.cep.value); f.street.value = r.logradouro; f.district.value = r.bairro; f.city.value = r.localidade + '/' + r.uf; } catch {} });
      f.addEventListener('submit', async (e) => {
        e.preventDefault(); const d = Object.fromEntries(new FormData(f)); const [city, state] = d.city.split('/');
        try { await V.api.saveAddress({ ...d, city, state: (state || '').trim(), is_default: !list.length }); ACC.enderecos(el); V.toast('Endereço salvo'); } catch (err) { V.toast(V.errMsg(err)); }
      });
      $$('[data-del]', el).forEach((b) => b.addEventListener('click', async () => { await V.api.deleteAddress(b.dataset.del); ACC.enderecos(el); }));
    },
    async perfil(el, prof) {
      el.innerHTML = `<form id="pf" class="order-card" style="padding:28px;max-width:620px"><div class="field"><input name="full_name" placeholder=" " value="${V.esc(prof.full_name || '')}"><label>Nome completo</label></div>
        <div class="row2"><div class="field"><input name="phone" placeholder=" " value="${V.esc(prof.phone || '')}"><label>WhatsApp</label></div><div class="field"><input name="cpf" placeholder=" " value="${V.esc(prof.cpf || '')}"><label>CPF</label></div></div>
        <div class="field"><input name="birth_date" type="date" placeholder=" " value="${V.esc(prof.birth_date || '')}"><label>Aniversário (ganhe um presente)</label></div><button class="btn">Salvar</button></form>`;
      $('#pf', el).addEventListener('submit', async (e) => {
        e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); if (!d.birth_date) delete d.birth_date;
        try { await V.api.updateProfile(d); V.toast('Perfil atualizado ✦'); } catch (err) { V.toast(V.errMsg(err)); }
      });
    }
  };
})();
