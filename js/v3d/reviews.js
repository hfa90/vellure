/* =====================================================================
   VELLURE 3D · avaliações com foto (só de clientes que compraram)
   - resumo com estrelas, distribuição e "como veste"
   - mural de fotos com visualizador
   - formulário com estrelas, caimento e até 4 fotos
   Nada aqui é inventado: sem banco ou sem avaliações, a seção diz isso.
   ===================================================================== */
import { $, $$, esc, toast, haptic, currentUser } from './common.js';

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8 6.2 20.1l1.5-6.4L2.8 9.4l6.5-.6z"/></svg>';
const WORDS = ['', 'Não gostei', 'Podia ser melhor', 'Gostei', 'Amei', 'Apaixonada'];
const FIT = { pequeno: 'Ficou pequeno', perfeito: 'Perfeito', grande: 'Ficou grande' };
const MAX_PHOTOS = 4;

export const stars = (v, cls = '') => `<span class="stars ${cls}" style="--v:${Math.max(0, Math.min(5, v)) * 20}%" role="img" aria-label="${String(v).replace('.', ',')} de 5 estrelas"><i>★★★★★</i></span>`;
const dt = (d) => new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
const api = () => (window.V?.sb ? window.V.api : null);

export function createReviews({ catalog }) {
  const ratings = new Map();
  let cur = null, list = [], filter = 'all', bought = null, uid = null;

  /* ---------- notas no closet ---------- */
  function badge(slug) {
    const r = ratings.get(slug);
    return r && r.total ? `${stars(r.avg, 'sm')}<b>${r.avg.toFixed(1).replace('.', ',')}</b><small>(${r.total})</small>` : '';
  }
  const paintBadges = () => $$('[data-rate]').forEach((el) => { el.innerHTML = badge(el.dataset.rate); });
  if (api()) api().ratings().then((rows) => { (rows || []).forEach((r) => ratings.set(r.product_slug, { avg: +r.avg, total: +r.total })); paintBadges(); }).catch(() => {});

  /* ---------- seção na página da peça ---------- */
  const box = $('#pdpRev'), rateBtn = $('#pdpRate');
  rateBtn.addEventListener('click', () => box.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  async function show(p) {
    cur = p; list = []; filter = 'all'; bought = null;
    paintRate(); jsonLd(p);
    box.innerHTML = '<div class="rv-loading"><span></span><span></span><span></span></div>';
    if (!api()) { render(); return; }
    try { list = await api().reviews(p.slug); } catch (e) { list = []; }
    try { const u = await currentUser(); uid = u?.id || null; if (uid) bought = await api().boughtSize(p.slug); } catch (e) { /* */ }
    if (cur !== p) return;
    const ok = list.filter((r) => r.approved);
    if (ok.length) ratings.set(p.slug, { avg: ok.reduce((a, r) => a + r.rating, 0) / ok.length, total: ok.length });
    paintRate(); paintBadges(); jsonLd(p); render();
  }
  function paintRate() {
    const r = cur && ratings.get(cur.slug);
    rateBtn.hidden = !(r && r.total);
    if (r && r.total) rateBtn.innerHTML = `${stars(r.avg)}<span>${r.avg.toFixed(1).replace('.', ',')} · ${r.total} ${r.total === 1 ? 'avaliação' : 'avaliações'}</span>`;
  }

  function render() {
    const ok = list.filter((r) => r.approved);
    const mine = uid ? list.find((r) => r.user_id === uid) : null;
    const photos = ok.flatMap((r) => (r.photos || []).map((src) => ({ src, r })));
    const n = ok.length, avg = n ? ok.reduce((a, r) => a + r.rating, 0) / n : 0;
    const dist = [5, 4, 3, 2, 1].map((s) => [s, ok.filter((r) => r.rating === s).length]);
    const fits = ok.filter((r) => r.fit);
    const fitPos = fits.length ? fits.reduce((a, r) => a + { pequeno: 0, perfeito: 0.5, grande: 1 }[r.fit], 0) / fits.length : null;
    const perfect = fits.length ? Math.round((fits.filter((r) => r.fit === 'perfeito').length / fits.length) * 100) : 0;
    const shown = ok.filter((r) => filter === 'all' || (filter === 'foto' ? r.photos?.length : r.rating === +filter));

    box.innerHTML = `
      <header class="rv-hd"><h3>Avaliações</h3><p>Só de clientes que compraram esta peça.</p></header>
      ${n ? `
      <div class="rv-sum">
        <div class="rv-score"><strong>${avg.toFixed(1).replace('.', ',')}</strong>${stars(avg, 'lg')}<span>${n} ${n === 1 ? 'avaliação' : 'avaliações'}</span></div>
        <div class="rv-dist">${dist.map(([s, c]) => `<button type="button" data-f="${s}" aria-pressed="${filter === String(s)}" ${c ? '' : 'disabled'}><span>${s}</span>${STAR}<i style="--w:${n ? (c / n) * 100 : 0}%"></i><em>${c}</em></button>`).join('')}</div>
        ${fitPos !== null ? `<div class="rv-fit"><p>Como veste <b>${perfect}% acharam perfeito</b></p><div class="rv-track"><i style="--x:${fitPos * 100}%"></i></div><div class="rv-ends"><span>Pequeno</span><span>Perfeito</span><span>Grande</span></div></div>` : ''}
      </div>
      ${photos.length ? `<div class="rv-wall" aria-label="Fotos das clientes">${photos.slice(0, 12).map((ph, i) => `<button type="button" data-ph="${i}"><img src="${esc(ph.src)}" alt="Foto de ${esc(ph.r.author_name || 'cliente')}" loading="lazy"></button>`).join('')}</div>` : ''}
      <div class="rv-chips"><button type="button" data-f="all" aria-pressed="${filter === 'all'}">Todas</button>${photos.length ? `<button type="button" data-f="foto" aria-pressed="${filter === 'foto'}">Com foto</button>` : ''}</div>
      <div class="rv-list">${shown.map(card).join('') || '<p class="rv-none">Nenhuma avaliação com esse filtro.</p>'}</div>`
      : `<div class="rv-empty">${stars(0, 'lg')}<p>${api() ? 'Esta peça ainda não tem avaliações. A primeira pode ser a sua, depois de receber a peça.' : 'As avaliações aparecem aqui quando a loja estiver conectada ao banco de dados.'}</p></div>`}
      <div class="rv-cta">${cta(mine)}</div>`;
    box._photos = photos;
  }
  function card(r) {
    return `<article class="rv-card">
      <div class="rv-top">${stars(r.rating)}<b>${esc(WORDS[r.rating])}</b><time>${dt(r.created_at)}</time></div>
      <p class="rv-who"><span class="rv-av">${esc((r.author_name || 'C')[0])}</span>${esc(r.author_name || 'Cliente Vellure')}${r.verified ? '<em class="rv-ok">Compra verificada</em>' : ''}</p>
      ${r.size_bought || r.fit ? `<p class="rv-meta">${r.size_bought ? `Comprou o <b>${esc(r.size_bought)}</b>` : ''}${r.size_bought && r.fit ? ' · ' : ''}${r.fit ? esc(FIT[r.fit]) : ''}</p>` : ''}
      ${r.body ? `<p class="rv-body">${esc(r.body)}</p>` : ''}
      ${r.photos?.length ? `<div class="rv-pics">${r.photos.map((src) => `<button type="button" data-src="${esc(src)}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      ${r.reply ? `<div class="rv-reply"><b>Resposta da Maison</b><p>${esc(r.reply)}</p></div>` : ''}
    </article>`;
  }
  function cta(mine) {
    if (!api()) return '';
    if (mine && !mine.approved) return `<p class="rv-pend"><i></i>Sua avaliação está em revisão e aparece aqui em breve.</p><button class="btn-line" type="button" data-rv="edit">Editar minha avaliação</button>`;
    if (mine) return '<button class="btn-line" type="button" data-rv="edit">Editar minha avaliação</button>';
    if (!uid) return `<p class="rv-hint">Comprou esta peça? <a href="conta.html?volta=${encodeURIComponent('peca/' + cur.slug)}">Entre na sua conta</a> para contar como ficou.</p>`;
    if (bought !== null) return '<button class="btn-gold" type="button" data-rv="new">Avaliar esta peça</button>';
    return '<p class="rv-hint">As avaliações são abertas para quem comprou esta peça, assim cada opinião é real.</p>';
  }

  box.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]'); if (f) { filter = filter === f.dataset.f ? 'all' : f.dataset.f; render(); haptic(6); return; }
    const ph = e.target.closest('[data-ph]'); if (ph) { lightbox(box._photos, +ph.dataset.ph); return; }
    const pic = e.target.closest('[data-src]'); if (pic) { const i = box._photos.findIndex((x) => x.src === pic.dataset.src); lightbox(box._photos, Math.max(0, i)); return; }
    const b = e.target.closest('[data-rv]'); if (b) openForm(list.find((r) => r.user_id === uid));
  });

  /* ---------- produto para o Google (só com dados reais) ---------- */
  function jsonLd(p) {
    let el = $('#ldProduct');
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'ldProduct'; document.head.appendChild(el); }
    const r = ratings.get(p.slug);
    const avail = p.stock && p.sizes.every((s) => p.stock[s] === 0) ? 'OutOfStock' : 'InStock';
    const base = location.href.split('#')[0];
    const data = {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, color: p.color || undefined, sku: p.slug,
      image: p.imgs.map((u) => new URL(u, base).href), brand: { '@type': 'Brand', name: 'Vellure' },
      offers: { '@type': 'Offer', price: (+p.price).toFixed(2), priceCurrency: 'BRL', availability: 'https://schema.org/' + avail, url: `${base}#peca/${p.slug}` }
    };
    if (r && r.total) data.aggregateRating = { '@type': 'AggregateRating', ratingValue: r.avg.toFixed(1), reviewCount: r.total, bestRating: 5, worstRating: 1 };
    el.textContent = JSON.stringify(data);
  }

  /* ---------- visualizador de fotos ---------- */
  const lb = document.createElement('div');
  lb.className = 'rv-light'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Fotos das clientes'); lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML = '<button class="rv-lx" type="button" aria-label="Fechar">Fechar</button><button class="rv-lp" type="button" aria-label="Foto anterior">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="rv-ln" type="button" aria-label="Próxima foto">›</button>';
  document.body.appendChild(lb);
  let lbList = [], lbI = 0;
  function lbPaint() {
    const ph = lbList[lbI]; if (!ph) return;
    $('img', lb).src = ph.src;
    $('figcaption', lb).innerHTML = `<p>${stars(ph.r.rating, 'sm')} <b>${esc(ph.r.author_name || 'Cliente')}</b>${ph.r.size_bought ? `<span>tamanho ${esc(ph.r.size_bought)}</span>` : ''}</p>${ph.r.body ? `<span>${esc(ph.r.body.slice(0, 160))}${ph.r.body.length > 160 ? '…' : ''}</span>` : ''}`;
    $('.rv-lp', lb).hidden = $('.rv-ln', lb).hidden = lbList.length < 2;
  }
  function lightbox(arr, i) { lbList = arr; lbI = i; lbPaint(); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); }
  const lbClose = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); };
  lb.addEventListener('click', (e) => {
    if (e.target.closest('.rv-lp')) { lbI = (lbI - 1 + lbList.length) % lbList.length; lbPaint(); }
    else if (e.target.closest('.rv-ln')) { lbI = (lbI + 1) % lbList.length; lbPaint(); }
    else if (e.target === lb || e.target.closest('.rv-lx')) lbClose();
  });
  let tx = null;
  lb.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (tx === null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 40 && lbList.length > 1) { lbI = (lbI + (d < 0 ? 1 : -1) + lbList.length) % lbList.length; lbPaint(); } tx = null; });

  /* ---------- formulário ---------- */
  const sh = document.createElement('div');
  sh.className = 'sheet rv-sheet'; sh.id = 'rvSheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', 'Avaliar a peça'); sh.setAttribute('aria-hidden', 'true');
  sh.innerHTML = `<div class="sheet-box rv-box"><button class="rv-close" type="button">Fechar</button><div class="rv-in"></div></div>`;
  document.body.appendChild(sh);
  let form = null;
  const closeForm = () => { sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true'); };
  sh.addEventListener('click', (e) => { if (e.target === sh || e.target.closest('.rv-close') || e.target.closest('[data-done]')) closeForm(); });
  addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (lb.classList.contains('open')) { lbClose(); e.stopImmediatePropagation(); } else if (sh.classList.contains('open')) { closeForm(); e.stopImmediatePropagation(); } }, true);

  function openForm(mine) {
    const p = cur;
    form = { id: mine?.id, rating: mine?.rating || 0, fit: mine?.fit || '', body: mine?.body || '', keep: [...(mine?.photos || [])], files: [] };
    const inn = $('.rv-in', sh);
    inn.innerHTML = `
      <div class="rv-head"><img src="${esc(p.imgs[0])}" alt=""><div><p class="rv-eb">${mine ? 'Editar avaliação' : 'Sua avaliação'}</p><h2>${esc(p.name)}</h2>${bought ? `<p>Você comprou o tamanho <b>${esc(bought)}</b></p>` : ''}</div></div>
      <form class="rv-form" novalidate>
        <fieldset class="rv-pick"><legend>Sua nota</legend><div class="rv-stars" role="radiogroup" aria-label="Nota de 1 a 5">${[1, 2, 3, 4, 5].map((s) => `<button type="button" role="radio" data-s="${s}" aria-label="${s} de 5: ${WORDS[s]}">${STAR}</button>`).join('')}</div><output class="rv-word">Toque nas estrelas</output></fieldset>
        <fieldset class="rv-fits"><legend>Como vestiu?</legend><div>${Object.entries(FIT).map(([k, l]) => `<label><input type="radio" name="fit" value="${k}" ${form.fit === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
        <label class="co-f rv-txt"><span>Conte como foi (opcional)</span><textarea name="body" rows="4" maxlength="1500" placeholder="Tecido, caimento, conforto, a ocasião em que usou...">${esc(form.body)}</textarea><small class="rv-count">0/1500</small></label>
        <div class="rv-up"><p>Fotos (até ${MAX_PHOTOS}) <small>Mostre a peça como quiser. As fotos aparecem depois da revisão da Maison.</small></p><div class="rv-thumbs"></div></div>
        <p class="rv-msg" role="alert"></p>
        <button class="btn-gold" type="submit">${mine ? 'Salvar avaliação' : 'Enviar avaliação'}</button>
        <p class="rv-note">Publicamos com o seu primeiro nome e a inicial do sobrenome, com o selo de compra verificada.</p>
      </form>`;
    const f = $('form', inn), word = $('.rv-word', inn), btns = $$('.rv-stars button', inn);
    const paintStars = (v, hover) => {
      btns.forEach((b, i) => { b.classList.toggle('on', i < v); b.setAttribute('aria-checked', String(i + 1 === form.rating)); });
      word.textContent = v ? WORDS[v] : 'Toque nas estrelas'; word.classList.toggle('hov', !!hover);
    };
    paintStars(form.rating);
    btns.forEach((b, i) => {
      b.addEventListener('pointerenter', () => paintStars(i + 1, true));
      b.addEventListener('click', () => {
        form.rating = i + 1; paintStars(form.rating); haptic(10 + i * 3);
        window.gsap && gsap.fromTo(b, { scale: 1.5, rotate: -18 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1, .4)' });
        if (form.rating === 5) burst(b);
      });
      b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const j = Math.max(0, Math.min(4, i + (e.key === 'ArrowRight' ? 1 : -1))); btns[j].focus(); btns[j].click(); } });
    });
    $('.rv-stars', inn).addEventListener('pointerleave', () => paintStars(form.rating));
    const ta = f.body, cnt = $('.rv-count', inn);
    const count = () => { cnt.textContent = `${ta.value.length}/1500`; }; count(); ta.addEventListener('input', count);
    const thumbs = $('.rv-thumbs', inn);
    const paintThumbs = () => {
      const all = [...form.keep.map((src) => ({ src, k: 'keep' })), ...form.files.map((file) => ({ src: file._url, k: 'file', file }))];
      thumbs.innerHTML = all.map((x, i) => `<div class="rv-th"><img src="${esc(x.src)}" alt=""><button type="button" data-rm="${i}" aria-label="Remover foto">×</button></div>`).join('')
        + (all.length < MAX_PHOTOS ? `<label class="rv-add"><input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Adicionar</span></label>` : '');
      const inp = $('input', thumbs);
      inp && inp.addEventListener('change', () => {
        const room = MAX_PHOTOS - form.keep.length - form.files.length;
        [...inp.files].filter((fl) => /^image\//.test(fl.type)).slice(0, room).forEach((fl) => { fl._url = URL.createObjectURL(fl); form.files.push(fl); });
        if (inp.files.length > room) toast(`Cabem até ${MAX_PHOTOS} fotos.`);
        paintThumbs();
      });
    };
    thumbs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rm]'); if (!b) return;
      const i = +b.dataset.rm;
      if (i < form.keep.length) form.keep.splice(i, 1); else form.files.splice(i - form.keep.length, 1);
      paintThumbs();
    });
    paintThumbs();

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('.rv-msg', inn), sub = $('button[type="submit"]', f);
      if (!form.rating) { msg.textContent = 'Escolha de 1 a 5 estrelas.'; window.gsap && gsap.fromTo('.rv-stars', { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, .3)' }); return; }
      msg.textContent = ''; sub.disabled = true;
      try {
        const urls = [...form.keep];
        for (let i = 0; i < form.files.length; i++) { sub.textContent = `Enviando foto ${i + 1} de ${form.files.length}…`; urls.push(await api().uploadReviewPhoto(form.files[i])); }
        sub.textContent = 'Enviando…';
        await api().saveReview({ id: form.id, slug: p.slug, rating: form.rating, fit: f.fit.value || null, body: ta.value.trim(), photos: urls, size: bought || null });
        inn.innerHTML = `<div class="rv-thanks">${stars(form.rating, 'lg')}<h2>Obrigada por contar.</h2><p>Sua avaliação vai para a revisão da Maison e aparece na página da peça em breve.</p><button class="btn-line" type="button" data-done>Voltar à peça</button></div>`;
        haptic(24);
        try { list = await api().reviews(p.slug); } catch (er) { /* */ }
        if (cur === p) render();
      } catch (err) {
        const m = String(err?.message || err);
        msg.textContent = /comprou/i.test(m) ? 'Só quem comprou esta peça pode avaliar.' : /duplicate|unique/i.test(m) ? 'Você já avaliou esta peça. Use "Editar minha avaliação".' : /row-level|policy/i.test(m) ? 'Entre de novo na sua conta e tente mais uma vez.' : m;
        sub.disabled = false; sub.textContent = form.id ? 'Salvar avaliação' : 'Enviar avaliação';
      }
    });
    sh.classList.add('open'); sh.setAttribute('aria-hidden', 'false');
    setTimeout(() => btns[Math.max(0, form.rating - 1)].focus({ preventScroll: true }), 80);
  }
  function burst(el) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('i'); s.className = 'rv-spark';
      s.style.left = `${r.left + r.width / 2}px`; s.style.top = `${r.top + r.height / 2}px`;
      document.body.appendChild(s);
      const a = (i / 14) * Math.PI * 2, d = 40 + Math.random() * 40;
      const anim = s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 }], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.2,1)' });
      anim.onfinish = () => s.remove();
    }
  }

  return { show, badge, paintBadges, catalog };
}
