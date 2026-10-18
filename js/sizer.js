/* =====================================================================
   VELLURE · Simulador de medidas (padrão brasileiro)
   Corpo ilustrado que se transforma conforme as medidas + fitas métricas
   ===================================================================== */
(function () {
  const V = (window.V = window.V || {});

  const BANDS = [[0, 67, '38'], [67.01, 72, '40'], [72.01, 77, '42'], [77.01, 82, '44'], [82.01, 87, '46'], [87.01, 92, '48'], [92.01, 97, '50'], [97.01, 102, '52'], [102.01, 999, '54']];
  const BAND_RANGE = { 38: '63–67', 40: '68–72', 42: '73–77', 44: '78–82', 46: '83–87', 48: '88–92', 50: '93–97', 52: '98–102', 54: '103–107' };
  const CUPS = [[10, 'AA'], [12.5, 'A'], [15, 'B'], [17.5, 'C'], [20, 'D'], [22.5, 'DD'], [25, 'E'], [999, 'F']];
  const CUP_ORDER = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F'];
  const LETTERS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
  const NUM = { PP: '36', P: '38', M: '40/42', G: '44', GG: '46/48', XG: '50', XXG: '52' };
  const HIP = [88, 94, 100, 106, 114, 122, 999];
  const WAIST = [62, 66, 72, 80, 88, 96, 999];
  const BUST = [84, 88, 96, 104, 112, 120, 999];
  const TABLE = [
    ['PP', '36', '80–84', '58–62', '84–88'], ['P', '38', '85–88', '63–66', '89–94'], ['M', '40/42', '89–96', '67–72', '95–100'],
    ['G', '44', '97–104', '73–80', '101–106'], ['GG', '46/48', '105–112', '81–88', '107–114'], ['XG', '50', '113–120', '89–96', '115–122']
  ];

  const M = [
    { k: 'busto', name: 'Busto', color: '#5c1325', min: 70, max: 140, y: 168, how: 'Passe a fita na parte mais projetada dos seios, sem apertar, paralela ao chão.' },
    { k: 'sobBusto', name: 'Sob o busto', color: '#b8863e', min: 60, max: 120, y: 206, how: 'Logo abaixo dos seios, onde fica a faixa do sutiã. Expire e mantenha a fita firme.' },
    { k: 'cintura', name: 'Cintura', color: '#2f6476', min: 54, max: 130, y: 262, how: 'Na parte mais fina do tronco, cerca de dois dedos acima do umbigo.' },
    { k: 'quadril', name: 'Quadril', color: '#7a4d82', min: 78, max: 150, y: 340, how: 'Na parte mais larga do quadril e bumbum, com os pés juntos.' }
  ];

  const idx = (arr, v) => arr.findIndex((x) => v <= x);

  V.sizeCalc = function (m, fit = 'ideal') {
    const band = BANDS.find(([a, b]) => m.sobBusto >= a && m.sobBusto <= b)[2];
    const diff = m.busto - m.sobBusto;
    const cup = CUPS.find(([lim]) => diff < lim)[1];
    let iHip = idx(HIP, m.quadril), iWaist = idx(WAIST, m.cintura), iBust = idx(BUST, m.busto);
    let panty = fit === 'justa' ? iHip : Math.max(iHip, iWaist);
    if (fit === 'solta') panty = Math.min(panty + 1, LETTERS.length - 1);
    const body = Math.max(iBust, iHip, fit === 'justa' ? 0 : iWaist);
    const bi = CUP_ORDER.indexOf(cup), bn = +band;
    const sisters = [];
    if (bn > 38 && bi < CUP_ORDER.length - 1) sisters.push(`${bn - 2}${CUP_ORDER[bi + 1]}`);
    if (bn < 54 && bi > 0) sisters.push(`${bn + 2}${CUP_ORDER[bi - 1]}`);
    const { busto: b, cintura: w, quadril: h } = m;
    let shape = 'Retângulo';
    if (w >= b * 0.92 && w >= h * 0.88) shape = 'Oval';
    else if (Math.abs(b - h) <= 5 && w <= Math.min(b, h) * 0.78) shape = 'Ampulheta';
    else if (h - b > 5) shape = 'Pera';
    else if (b - h > 5) shape = 'Triângulo invertido';
    return { band, cup, bra: band + cup, diff: +diff.toFixed(1), panty: LETTERS[panty], pantyNum: NUM[LETTERS[panty]], body: LETTERS[body], sisters, shape };
  };

  const SHAPES = {
    Ampulheta: ['Busto e quadril em equilíbrio com cintura marcada.', 'Bodies acinturados, cintas-ligas e calcinhas de cintura alta desenham suas curvas.', ['bodysuit', 'garter', 'highwaist']],
    Pera: ['Quadril mais largo que o busto, cintura definida.', 'Sutiãs balconette e plunge com detalhes no colo equilibram a silhueta; calcinhas cavadas alongam as pernas.', ['set', 'bralette', 'slip']],
    'Triângulo invertido': ['Ombros e busto mais largos que o quadril.', 'Calcinhas com laterais em tiras e camisolas evasê dão volume ao quadril; prefira alças mais largas.', ['slip', 'highwaist', 'garter']],
    Retângulo: ['Medidas alinhadas, silhueta longilínea.', 'Bralettes, bodies com recortes e cintas criam curvas e movimento.', ['bralette', 'bodysuit', 'garter']],
    Oval: ['Volume concentrado no centro, pernas e colo elegantes.', 'Camisolas fluidas, robes de seda e bodies com sustentação valorizam o colo e alongam.', ['slip', 'robe', 'bodysuit']]
  };

  // ------------------- corpo paramétrico -------------------
  function catmull(pts) {
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }
  function geometry(m) {
    const bust = 18 + m.busto * 0.82, under = 8 + m.sobBusto * 0.98, waist = m.cintura * 0.92, hip = m.quadril * 0.88;
    const shoulder = Math.max(bust, hip) * 0.98 + 4;
    return { bust, under, waist, hip, shoulder, thigh: hip * 0.9, knee: Math.max(56, hip * 0.72) };
  }
  function bodySVG(m, focus) {
    const g = geometry(m);
    const side = [[224, -12], [226, 28], [200 + g.shoulder * 0.62, 56], [200 + g.shoulder, 84], [200 + g.bust * 0.98, 128], [200 + g.bust, 168], [200 + g.under, 206], [200 + g.waist, 262], [200 + g.hip * 0.97, 312], [200 + g.hip, 342], [200 + g.thigh, 420], [200 + g.knee, 532]];
    const right = catmull(side);
    const leftPts = side.map(([x, y]) => [400 - x, y]).reverse();
    const left = catmull(leftPts).replace(/^M[^C]+/, '');
    const inner = ` L${206 + Math.max(0, (g.hip - 86) * 0.12)} 532 C204 470 203 448 200 434 C197 448 196 470 ${194 - Math.max(0, (g.hip - 86) * 0.12)} 532 L${(400 - side[side.length - 1][0]).toFixed(1)} 532`;
    const torso = right + inner + left + ' Z';
    const armW = 22 + (m.busto - 70) * 0.08;
    const arm = (s) => {
      const x0 = 200 + s * g.shoulder, x1 = 200 + s * (g.waist + 30 + armW * 0.3);
      return `M${200 + s * g.shoulder * 0.6} 56 C${x0 + s * 26} 70 ${x0 + s * 22} 120 ${x0 + s * 16} 180 C${x0 + s * 12} 240 ${x1 + s * 14} 300 ${x1 + s * 10} 380 L${x1 - s * armW + s * 10} 384 C${x1 - s * armW} 300 ${x0 - s * armW * 0.6} 240 ${x0 - s * 6} 150 Z`;
    };
    const r = 22 + (m.busto - m.sobBusto) * 1.35;
    const bx = Math.min(g.bust * 0.46, 50 + r * 0.3);
    const cup = (s) => {
      const cx = 200 + s * bx, cy = 206 - r * 0.62;
      return `M${200 + s * 4} ${cy - r * 0.2} C${cx - s * r * 0.2} ${cy - r * 0.95} ${cx + s * r * 1.05} ${cy - r * 0.9} ${cx + s * r * 1.02} ${cy + r * 0.32} C${cx + s * r * 0.8} ${cy + r * 0.72} ${cx - s * r * 0.5} ${cy + r * 0.8} ${200 + s * 4} ${cy + r * 0.45} Z`;
    };
    const tape = (mm, w, i) => {
      const on = focus === mm.k ? 'on' : '';
      const rx = w + 9, y = mm.y;
      return `<g class="tape-g"><path class="tape ${on}" d="M${200 - rx} ${y} A ${rx} 11 0 0 0 ${200 + rx} ${y}" fill="none" stroke="${mm.color}" stroke-width="${on ? 5 : 3.2}" stroke-dasharray="${on ? '2 3' : '0'}"/>
        <path class="tape ${on}" d="M${200 - rx} ${y} A ${rx} 11 0 0 1 ${200 + rx} ${y}" fill="none" stroke="${mm.color}" stroke-width="1.4" stroke-dasharray="3 4" opacity=".5"/>
        <g class="tape-label ${on || 'on'}" transform="translate(${i % 2 ? 200 - rx - 10 : 200 + rx + 10} ${y + 4})"><rect x="${i % 2 ? -64 : 0}" y="-15" width="64" height="22" rx="11" fill="${mm.color}"/><text x="${i % 2 ? -32 : 32}" y="0" fill="#fff" text-anchor="middle" font-size="12" font-family="Jost, sans-serif">${(+m[mm.k]).toFixed(0)} cm</text></g></g>`;
    };
    const widths = { busto: g.bust, sobBusto: g.under, cintura: g.waist, quadril: g.hip };
    const fab = '#2a1e22';
    return `<svg viewBox="-40 -30 480 600" xmlns="http://www.w3.org/2000/svg" aria-label="Corpo ilustrado ajustado às suas medidas">
      <defs>
        <linearGradient id="szSkin" x1="0" x2="1"><stop offset="0" stop-color="#c49072"/><stop offset=".22" stop-color="#e3b89b"/><stop offset=".55" stop-color="#efc9ae"/><stop offset=".8" stop-color="#e3b89b"/><stop offset="1" stop-color="#c49072"/></linearGradient>
        <linearGradient id="szFab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a363d"/><stop offset="1" stop-color="#1a1215"/></linearGradient>
        <pattern id="szLace" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q3 0 6 5 T12 5" fill="none" stroke="#6b5058" stroke-width=".8"/></pattern>
      </defs>
      <g style="transition:all .4s">
        <path d="${arm(-1)}" fill="#cf9f82"/><path d="${arm(1)}" fill="#cf9f82"/>
        <path d="${torso}" fill="url(#szSkin)"/>
        <path d="M188 0 C178 34 160 56 156 96 C152 130 160 150 150 182 C160 180 170 172 174 160 C178 130 176 100 186 70 C190 50 194 26 196 0 Z" fill="#2a1a14"/>
        <ellipse cx="200" cy="292" rx="2.4" ry="4.5" fill="#b07e62"/>
        <path d="${cup(-1)}" fill="url(#szFab)"/><path d="${cup(-1)}" fill="url(#szLace)"/>
        <path d="${cup(1)}" fill="url(#szFab)"/><path d="${cup(1)}" fill="url(#szLace)"/>
        <path d="M${200 - g.under - 2} ${200} C${200 - g.under * 0.5} ${214} ${200 + g.under * 0.5} ${214} ${200 + g.under + 2} ${200} L${200 + g.under + 1} ${212} C${200 + g.under * 0.5} ${226} ${200 - g.under * 0.5} ${226} ${200 - g.under - 1} ${212} Z" fill="${fab}"/>
        <path d="M${200 - bx - r * 0.2} ${206 - r * 1.4} L${200 - g.shoulder * 0.55} 60 M${200 + bx + r * 0.2} ${206 - r * 1.4} L${200 + g.shoulder * 0.55} 60" stroke="${fab}" stroke-width="2.6"/>
        <path d="M${200 - g.hip * 0.96} 330 C${200 - g.hip * 0.4} 342 ${200 + g.hip * 0.4} 342 ${200 + g.hip * 0.96} 330 L${200 + g.hip * 0.98} 344 C${200 + g.hip * 0.6} 370 ${222} 410 206 434 L194 434 C178 410 ${200 - g.hip * 0.6} 370 ${200 - g.hip * 0.98} 344 Z" fill="url(#szFab)"/>
      </g>
      ${M.map((mm, i) => tape(mm, widths[mm.k], i)).join('')}
    </svg>`;
  }

  // ------------------- diagrama do sutiã (modo 2) -------------------
  const ISSUES = [
    { k: 'faixaSobe', t: 'A faixa sobe nas costas', spot: [70, 120], icon: '<path d="M4 24 C10 14 22 14 28 24"/><path d="M16 6 L16 16 M12 10 L16 6 L20 10"/>' },
    { k: 'faixaAperta', t: 'A faixa aperta ou marca', spot: [330, 120], icon: '<path d="M4 16 H28"/><path d="M8 10 L4 16 L8 22 M24 10 L28 16 L24 22"/>' },
    { k: 'transborda', t: 'O seio escapa do bojo', spot: [140, 62], icon: '<path d="M4 22 C4 10 28 10 28 22"/><path d="M8 12 C10 6 22 6 24 12"/>' },
    { k: 'sobra', t: 'Sobra espaço no bojo', spot: [255, 70], icon: '<path d="M4 22 C4 10 28 10 28 22"/><path d="M12 16 h8" stroke-dasharray="2 2"/>' },
    { k: 'aro', t: 'O aro machuca nas laterais', spot: [112, 108], icon: '<path d="M6 8 C6 22 26 22 26 8"/><circle cx="7" cy="12" r="2"/>' },
    { k: 'alca', t: 'As alças caem dos ombros', spot: [150, 16], icon: '<path d="M10 4 L14 28"/><path d="M22 4 L18 28"/>' }
  ];
  function braDiagram(active) {
    const spots = ISSUES.map((i) => `<g class="spot" style="opacity:${active[i.k] ? 1 : 0.25}"><circle cx="${i.spot[0]}" cy="${i.spot[1]}" r="8" fill="#5c1325"/>${active[i.k] ? `<circle cx="${i.spot[0]}" cy="${i.spot[1]}" r="8" fill="none" stroke="#5c1325" stroke-width="2"><animate attributeName="r" values="8;22" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.4s" repeatCount="indefinite"/></circle>` : ''}</g>`).join('');
    return `<svg viewBox="0 -20 400 260" xmlns="http://www.w3.org/2000/svg" aria-label="Diagrama do sutiã">
      <defs><pattern id="bdLace" width="14" height="12" patternUnits="userSpaceOnUse"><path d="M0 6 Q3.5 0 7 6 T14 6" fill="none" stroke="#7c5b64" stroke-width="1"/><circle cx="7" cy="9" r="1.3" fill="#7c5b64"/></pattern>
      <linearGradient id="bdF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2a30"/><stop offset="1" stop-color="#140e11"/></linearGradient></defs>
      <path d="M40 112 C80 100 110 104 120 110 L120 140 C100 136 70 138 40 146 Z" fill="url(#bdF)"/><path d="M360 112 C320 100 290 104 280 110 L280 140 C300 136 330 138 360 146 Z" fill="url(#bdF)"/>
      <path d="M200 96 C190 50 160 30 130 34 C104 38 96 70 104 112 C130 140 176 140 200 126 Z" fill="url(#bdF)"/><path d="M200 96 C190 50 160 30 130 34 C104 38 96 70 104 112 C130 140 176 140 200 126 Z" fill="url(#bdLace)"/>
      <path d="M200 96 C210 50 240 30 270 34 C296 38 304 70 296 112 C270 140 224 140 200 126 Z" fill="url(#bdF)"/><path d="M200 96 C210 50 240 30 270 34 C296 38 304 70 296 112 C270 140 224 140 200 126 Z" fill="url(#bdLace)"/>
      <path d="M104 112 C130 140 176 140 200 126 C224 140 270 140 296 112" fill="none" stroke="#c9a46a" stroke-width="2"/>
      <path d="M134 34 L150 -14 M266 34 L250 -14" stroke="#2a1e22" stroke-width="5" stroke-linecap="round"/>
      <rect x="36" y="110" width="8" height="38" rx="2" fill="#c9a46a"/><rect x="356" y="110" width="8" height="38" rx="2" fill="#c9a46a"/>
      <g transform="translate(200 128)"><ellipse cx="-6" rx="6" ry="3.6" fill="#c9a46a" transform="rotate(-18)"/><ellipse cx="6" rx="6" ry="3.6" fill="#c9a46a" transform="rotate(18)"/><circle r="2.6" fill="#8f6c3a"/></g>
      ${spots}
    </svg>`;
  }
  function fitAdjust(band, cup, a) {
    let b = +band, c = CUP_ORDER.indexOf(cup);
    const notes = [];
    if (a.faixaSobe) { b -= 2; c += 1; notes.push('A faixa é responsável por 80% da sustentação: diminuímos a numeração e subimos um bojo para manter o volume.'); }
    if (a.faixaAperta) { b += 2; c -= 1; notes.push('Aumentamos a faixa e ajustamos o bojo para o mesmo volume (tamanho-irmão).'); }
    if (a.transborda) { c += 1; notes.push('Seu volume pede um bojo acima.'); }
    if (a.sobra) { c -= 1; notes.push('Um bojo abaixo vai abraçar sem deixar espaço.'); }
    if (a.aro) { c += 1; notes.push('Aro machucando nas laterais costuma indicar bojo pequeno.'); }
    if (a.alca) notes.push('Alças caindo: aperte-as até caber dois dedos; se persistir, prefira modelos balconette ou com alças mais centrais.');
    b = Math.min(54, Math.max(38, b)); c = Math.min(CUP_ORDER.length - 1, Math.max(0, c));
    return { bra: b + CUP_ORDER[c], band: String(b), cup: CUP_ORDER[c], notes };
  }

  // ------------------- render -------------------
  V.renderSizer = function (root) {
    const saved = (() => { try { return JSON.parse(localStorage.getItem('vellure.measures')) || {}; } catch { return {}; } })();
    const prof = V.state.profile?.measurements || {};
    const st = { busto: 92, sobBusto: 76, cintura: 70, quadril: 100, ...saved, ...(prof.busto ? prof : {}), fit: 'ideal', focus: 'busto', mode: 'fita', bra: { band: '42', cup: 'B', issues: {} } };
    ['busto', 'sobBusto', 'cintura', 'quadril'].forEach((k) => (st[k] = +st[k]));
    let last = {};

    root.innerHTML = `
      <section class="page-title wrap"><span class="eyebrow">Atelier de medidas · Padrão brasileiro</span>
        <h1 class="reveal"><span class="split-line"><span>Seu tamanho,</span></span><span class="split-line"><span><em>sob medida.</em></span></span></h1>
        <p class="reveal d1">Arraste as fitas e veja o corpo se ajustar às suas medidas. Em segundos você descobre sua numeração de sutiã, calcinha e body — e as peças que mais valorizam sua silhueta.</p></section>
      <section class="wrap sizer" style="padding-bottom:100px">
        <div class="sizer-stage" id="szStage"></div>
        <div>
          <div class="sizer-modes" role="tablist"><button class="on" data-mode="fita">Tenho fita métrica</button><button data-mode="sutia">Pelo sutiã que uso</button></div>
          <div id="szPanel"></div>
        </div>
      </section>
      <section class="wrap" style="padding-bottom:120px">
        <div class="sec-head"><h2 class="reveal">Tabela de <em>referência</em></h2><span class="muted">Medidas em centímetros</span></div>
        <div class="row2" style="gap:40px">
          <div class="table-scroll"><table class="size-table" id="szTableBra"><thead><tr><th>Sutiã</th><th>Sob o busto</th><th>Busto (bojo B)</th></tr></thead><tbody>
            ${Object.entries(BAND_RANGE).map(([n, r]) => { const [a, b] = r.split('–').map(Number); return `<tr data-b="${n}"><td>${n}</td><td>${r}</td><td>${a + 13}–${b + 15}</td></tr>`; }).join('')}
          </tbody></table></div>
          <div class="table-scroll"><table class="size-table" id="szTableLet"><thead><tr><th>Tam.</th><th>Nº</th><th>Busto</th><th>Cintura</th><th>Quadril</th></tr></thead><tbody>
            ${TABLE.map((r) => `<tr data-l="${r[0]}">${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody></table></div>
        </div>
        <p class="muted" style="font-size:13px;margin-top:18px">Bojo pela diferença entre busto e sob o busto: AA &lt;10 · A 10–12,5 · B 12,5–15 · C 15–17,5 · D 17,5–20 · DD 20–22,5 · E 22,5–25 · F 25+</p>
      </section>`;

    const stage = root.querySelector('#szStage'), panel = root.querySelector('#szPanel');

    function drawStage() {
      if (st.mode === 'fita') {
        const r = V.sizeCalc(st, st.fit);
        stage.innerHTML = `<span class="shape-tag">Silhueta · ${r.shape}</span>` + bodySVG(st, st.focus);
      } else {
        stage.innerHTML = `<span class="shape-tag">Toque nos incômodos ao lado</span><div style="padding:22% 6% 0">${braDiagram(st.bra.issues)}</div>`;
      }
    }

    function resultHTML(r) {
      const sh = SHAPES[r.shape];
      return `<div class="size-result">
        <div class="grid-r">
          <div class="r"><span>Sutiã</span><b data-k="bra">${r.bra}</b></div>
          <div class="r"><span>Calcinha</span><b data-k="panty">${r.panty}</b><span style="letter-spacing:.1em">nº ${r.pantyNum}</span></div>
          <div class="r"><span>Body · Camisola</span><b data-k="body">${r.body}</b></div>
        </div>
        <div class="note"><b style="color:var(--gold-2);font-weight:400">Silhueta ${r.shape}.</b> ${sh[0]} ${sh[1]}
          ${r.sisters.length ? `<div class="sister"><span style="border:0;padding-left:0">Tamanhos-irmãos:</span>${r.sisters.map((s) => `<span>${s}</span>`).join('')}</div>` : ''}
        </div>
        <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap"><button class="btn gold sm" id="szSave">Salvar minhas medidas</button><a class="btn ghost sm" style="--fg:var(--gold-2)" href="#/loja">Ver peças no meu tamanho</a></div>
      </div>
      <div style="margin-top:40px"><span class="eyebrow">Escolhidas para sua silhueta</span><div class="grid" id="szRec" style="grid-template-columns:repeat(3,1fr);margin-top:18px"></div></div>`;
    }

    function drawPanel() {
      if (st.mode === 'fita') {
        panel.innerHTML = M.map((mm) => `<div class="measure ${st.focus === mm.k ? 'focus' : ''}" data-k="${mm.k}">
            <div class="top"><h4><i style="background:${mm.color}">${M.indexOf(mm) + 1}</i>${mm.name}</h4>
              <div style="display:flex;gap:14px;align-items:center"><div class="stepper"><button data-step="-1" aria-label="diminuir">−</button><button data-step="1" aria-label="aumentar">+</button></div><span class="val"><span data-v>${st[mm.k]}</span><small> cm</small></span></div></div>
            <p class="how">${mm.how}</p>
            <input class="range" type="range" min="${mm.min}" max="${mm.max}" step="0.5" value="${st[mm.k]}" aria-label="${mm.name} em centímetros">
          </div>`).join('') +
          `<div style="margin-top:26px"><span class="opt-label" style="margin:0 0 12px">Como você prefere vestir?</span>
            <div class="chips" id="szFit">${[['justa', 'Mais justa'], ['ideal', 'Ideal'], ['solta', 'Mais confortável']].map(([k, t]) => `<button class="chip-btn ${st.fit === k ? 'on' : ''}" data-fit="${k}">${t}</button>`).join('')}</div></div>
          <div id="szRes"></div>`;
        panel.querySelectorAll('.measure').forEach((el) => {
          const k = el.dataset.k, inp = el.querySelector('input');
          const setP = () => inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min)) * 100 + '%');
          setP();
          const update = (v) => {
            st[k] = Math.round(+v * 2) / 2; inp.value = st[k]; setP();
            el.querySelector('[data-v]').textContent = st[k];
            if (k === 'busto' && st.sobBusto > st.busto - 2) { st.sobBusto = st.busto - 2; syncInput('sobBusto'); }
            if (k === 'sobBusto' && st.busto < st.sobBusto + 2) { st.busto = st.sobBusto + 2; syncInput('busto'); }
            setFocus(k); refresh();
          };
          inp.addEventListener('input', () => update(inp.value));
          inp.addEventListener('focus', () => setFocus(k, true));
          el.addEventListener('mouseenter', () => setFocus(k, true));
          el.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => update(st[k] + +b.dataset.step)));
        });
        panel.querySelectorAll('[data-fit]').forEach((b) => b.addEventListener('click', () => { st.fit = b.dataset.fit; panel.querySelectorAll('[data-fit]').forEach((x) => x.classList.toggle('on', x === b)); refresh(); }));
      } else {
        panel.innerHTML = `<span class="opt-label" style="margin-top:0">Numeração que você usa hoje</span>
          <div class="sizes" id="bBand">${Object.keys(BAND_RANGE).map((n) => `<button class="${st.bra.band === n ? 'on' : ''}" data-b="${n}">${n}</button>`).join('')}</div>
          <span class="opt-label">Bojo</span>
          <div class="sizes" id="bCup">${CUP_ORDER.map((c) => `<button class="${st.bra.cup === c ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
          <span class="opt-label">O que te incomoda?</span>
          <div class="fit-issues">${ISSUES.map((i) => `<button class="${st.bra.issues[i.k] ? 'on' : ''}" data-i="${i.k}"><svg viewBox="0 0 32 32">${i.icon}</svg>${i.t}</button>`).join('')}</div>
          <div id="szRes"></div>`;
        panel.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => { st.bra.band = b.dataset.b; drawPanel(); refresh(); }));
        panel.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { st.bra.cup = b.dataset.c; drawPanel(); refresh(); }));
        panel.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { st.bra.issues[b.dataset.i] = !st.bra.issues[b.dataset.i]; b.classList.toggle('on'); drawStage(); refresh(); }));
      }
    }
    function syncInput(k) {
      const el = panel.querySelector(`.measure[data-k="${k}"]`);
      if (!el) return;
      const inp = el.querySelector('input'); inp.value = st[k];
      inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min)) * 100 + '%');
      el.querySelector('[data-v]').textContent = st[k];
    }
    function setFocus(k, redraw) {
      if (st.focus === k) return;
      st.focus = k;
      panel.querySelectorAll('.measure').forEach((x) => x.classList.toggle('focus', x.dataset.k === k));
      if (redraw) drawStage();
    }

    async function refresh() {
      const res = panel.querySelector('#szRes');
      let r;
      if (st.mode === 'fita') {
        drawStage();
        r = V.sizeCalc(st, st.fit);
      } else {
        const a = fitAdjust(st.bra.band, st.bra.cup, st.bra.issues);
        const base = { ...V.sizeCalc({ busto: 92, sobBusto: 76, cintura: 70, quadril: 100 }), bra: a.bra, band: a.band, cup: a.cup, sisters: [] };
        r = base;
        res.innerHTML = `<div class="size-result"><div class="grid-r" style="grid-template-columns:1fr 2fr"><div class="r"><span>Seu tamanho ideal</span><b data-k="bra">${a.bra}</b></div>
          <div class="r" style="font-size:14px;color:rgba(250,246,241,.8)"><span>Você usa hoje: ${st.bra.band}${st.bra.cup}</span><p style="margin:8px 0 0">${a.notes.length ? a.notes.join(' ') : 'Se nada incomoda, seu tamanho está perfeito. Para confirmar, use a fita métrica na outra aba.'}</p></div></div>
          <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap"><button class="btn gold sm" id="szSave">Salvar este tamanho</button><a class="btn ghost sm" style="--fg:var(--gold-2)" href="#/cercle">Agendar prova com stylist</a></div></div>`;
        bindSave(r);
        highlightTables(r);
        return;
      }
      if (!res.firstChild) { res.innerHTML = resultHTML(r); bindSave(r); loadRecs(r); }
      else {
        ['bra', 'panty', 'body'].forEach((k) => {
          const b = res.querySelector(`[data-k="${k}"]`);
          if (b && last[k] !== r[k]) { b.textContent = r[k]; b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); }
        });
        const note = res.querySelector('.note');
        const sh = SHAPES[r.shape];
        note.innerHTML = `<b style="color:var(--gold-2);font-weight:400">Silhueta ${r.shape}.</b> ${sh[0]} ${sh[1]}${r.sisters.length ? `<div class="sister"><span style="border:0;padding-left:0">Tamanhos-irmãos:</span>${r.sisters.map((s) => `<span>${s}</span>`).join('')}</div>` : ''}`;
        res.querySelector('[data-k="panty"]').nextElementSibling.textContent = 'nº ' + r.pantyNum;
        if (last.shape !== r.shape) loadRecs(r);
        bindSave(r);
      }
      last = r;
      highlightTables(r);
      try { localStorage.setItem('vellure.measures', JSON.stringify({ busto: st.busto, sobBusto: st.sobBusto, cintura: st.cintura, quadril: st.quadril })); } catch {}
    }
    function highlightTables(r) {
      root.querySelectorAll('#szTableBra tr[data-b]').forEach((tr) => tr.classList.toggle('hit', tr.dataset.b === r.band));
      root.querySelectorAll('#szTableLet tr[data-l]').forEach((tr) => tr.classList.toggle('hit', tr.dataset.l === r.panty));
    }
    function bindSave(r) {
      const btn = panel.querySelector('#szSave');
      if (!btn || btn.dataset.bound) return;
      btn.dataset.bound = 1;
      btn.addEventListener('click', async () => {
        const cur = st.mode === 'fita' ? V.sizeCalc(st, st.fit) : fitAdjust(st.bra.band, st.bra.cup, st.bra.issues);
        const sizes = { sutia: cur.bra, band: cur.band, calcinha: cur.panty || (last.panty), body: cur.body || last.body };
        try { localStorage.setItem('vellure.sizes', JSON.stringify(sizes)); } catch {}
        if (V.state.user && V.state.dbReady !== false) {
          try { await V.api.updateProfile({ measurements: { busto: st.busto, sobBusto: st.sobBusto, cintura: st.cintura, quadril: st.quadril, ...sizes } }); V.toast('Medidas salvas no seu perfil ✦'); }
          catch (e) { V.toast(V.errMsg(e)); }
        } else V.toast('Medidas salvas neste aparelho. Entre na sua conta para guardá-las no perfil.');
      });
    }
    async function loadRecs(r) {
      const box = panel.querySelector('#szRec'); if (!box) return;
      const styles = SHAPES[r.shape][2];
      const all = await V.api.products();
      const picks = styles.map((s) => all.find((p) => (typeof p.art === 'string' ? JSON.parse(p.art) : p.art).style === s)).filter(Boolean).slice(0, 3);
      box.innerHTML = picks.map((p) => V.cardHTML(p, { size: /^\d/.test(p.sizes[0]) ? r.band : r.panty })).join('');
      V.bindCards(box);
    }

    root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      st.mode = b.dataset.mode;
      root.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
      last = {}; drawStage(); drawPanel(); refresh();
    }));
    drawStage(); drawPanel(); refresh();
  };
})();
