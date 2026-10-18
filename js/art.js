/* =====================================================================
   VELLURE · Ilustrações editoriais geradas (modelos que não existem)
   Cada produto descreve sua arte em JSON {style,color,accent,skin,bg}
   e esta biblioteca desenha a figura em SVG vetorial.
   ===================================================================== */
(function () {
  const V = (window.V = window.V || {});
  let uid = 0;

  const SKINS = ['#f3d9c8', '#e8c0a4', '#cf9a78', '#ad7253', '#8a5539', '#5f3a28'];
  const HAIR = ['#2a1a14', '#6b4226', '#c9a46a', '#1a1210', '#3b2418', '#120c0a'];
  const BGS = {
    noir: ['#2a2025', '#0e0b0d', 'rgba(201,164,106,.35)'],
    blush: ['#f6e1da', '#e0b4a8', 'rgba(255,255,255,.55)'],
    champagne: ['#f3e7d4', '#d6bc95', 'rgba(255,255,255,.5)'],
    ivory: ['#fbf7f1', '#e6d9c8', 'rgba(255,255,255,.7)'],
    wine: ['#6a1a2c', '#240710', 'rgba(230,207,159,.3)']
  };

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, p) {
    const [r, g, b] = hexToRgb(hex);
    const t = p < 0 ? 0 : 255, f = Math.abs(p);
    const c = (v) => Math.round((t - v) * f + v);
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }
  function lum(hex) { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${400 - +x} ${y}`);

  const P = {
    armL: 'M142 58 C110 64 90 84 84 130 C78 190 80 260 86 340 C88 360 92 380 96 392 L114 390 C110 360 108 330 110 300 C112 250 116 200 122 160 Z',
    torso: 'M176 0 C178 28 172 46 142 58 C116 66 102 84 104 120 C106 160 114 200 124 238 C132 270 128 300 116 340 C106 378 110 440 124 520 L194 520 C194 480 196 450 200 432 C204 450 206 480 206 520 L276 520 C290 440 294 378 284 340 C272 300 268 270 276 238 C286 200 294 160 296 120 C298 84 284 66 258 58 C228 46 222 28 224 0 Z',
    cupL: 'M198 158 C192 134 172 122 152 124 C130 128 118 150 122 180 C140 194 176 196 198 184 Z',
    triL: 'M198 184 C188 160 172 138 152 120 C138 140 128 162 122 182 C150 193 176 194 198 184 Z',
    band: 'M120 178 C150 196 250 196 280 178 L282 194 C250 212 150 212 118 194 Z',
    brief: 'M122 322 C170 336 230 336 278 322 L282 336 C252 364 222 404 206 432 L194 432 C178 404 148 364 118 336 Z',
    highwaist: 'M127 258 C170 270 230 270 273 258 C276 290 278 312 283 336 C252 364 222 404 206 432 L194 432 C178 404 148 364 117 336 C122 312 124 290 127 258 Z',
    belt: 'M125 250 C170 263 230 263 275 250 C277 272 279 292 284 312 C230 328 170 328 116 312 C121 292 123 272 125 250 Z',
    body: 'M122 180 C118 150 130 128 152 124 C172 122 192 134 198 158 L202 158 C208 134 228 122 248 124 C270 128 282 150 278 180 C276 210 272 236 276 250 C268 290 272 310 283 336 C252 364 222 404 206 432 L194 432 C178 404 148 364 117 336 C128 310 132 290 124 250 C128 236 124 210 122 180 Z',
    slip: 'M122 176 C140 192 176 196 200 186 C224 196 260 192 278 176 C288 240 304 360 322 476 C260 488 140 488 78 476 C96 360 112 240 122 176 Z',
    robeL: 'M150 54 C112 60 90 82 84 130 C74 210 70 340 58 520 L148 520 C140 430 134 350 136 280 C138 220 146 160 162 116 C168 92 172 70 178 44 Z',
    hair: 'M180 0 C168 34 150 58 146 96 C142 130 150 150 140 182 C150 180 160 172 164 160 C168 130 166 100 176 70 C182 50 186 26 188 0 Z'
  };

  function bow(x, y, c) {
    return `<g transform="translate(${x} ${y})"><ellipse cx="-6" cy="0" rx="6" ry="3.6" fill="${c}" transform="rotate(-18)"/><ellipse cx="6" cy="0" rx="6" ry="3.6" fill="${c}" transform="rotate(18)"/><circle r="2.6" fill="${shade(c, -0.25)}"/><path d="M-1 2 L-5 11 M1 2 L5 11" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/></g>`;
  }

  /**
   * Gera a ilustração.
   * @param {object} art {style,color,accent,skin,bg,under}
   * @param {object} o {zoom:boolean, pose:-1|0|1, frame:boolean}
   */
  V.figure = function (art = {}, o = {}) {
    const id = 'f' + ++uid;
    const style = art.style || 'set';
    const color = art.color || '#141014';
    const accent = art.accent || '#c9a46a';
    const skin = SKINS[(art.skin ?? 2) % SKINS.length];
    const hair = HAIR[(art.skin ?? 2) % HAIR.length];
    const bg = BGS[art.bg] || BGS.blush;
    const dark = lum(color) < 0.45;
    const lace = dark ? shade(color, 0.28) : shade(color, -0.22);
    const pose = o.pose ?? ((art.skin ?? 0) % 3) - 1;
    const vb = o.zoom ? '96 96 208 260' : '0 -10 400 530';

    const defs = `
      <radialGradient id="${id}bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
      <radialGradient id="${id}glow" cx="50%" cy="30%" r="45%"><stop offset="0" stop-color="${bg[2]}"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
      <linearGradient id="${id}skin" x1="0" x2="1"><stop offset="0" stop-color="${shade(skin, -0.32)}"/><stop offset=".2" stop-color="${skin}"/><stop offset=".55" stop-color="${shade(skin, 0.07)}"/><stop offset=".8" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -0.32)}"/></linearGradient>
      <linearGradient id="${id}arm" x1="0" x2="1"><stop offset="0" stop-color="${shade(skin, -0.38)}"/><stop offset=".6" stop-color="${shade(skin, -0.12)}"/><stop offset="1" stop-color="${shade(skin, -0.3)}"/></linearGradient>
      <linearGradient id="${id}fab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(color, dark ? 0.16 : 0.12)}"/><stop offset=".5" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.28)}"/></linearGradient>
      <linearGradient id="${id}silk" x1="0" x2="1"><stop offset="0" stop-color="${shade(color, -0.2)}"/><stop offset=".35" stop-color="${shade(color, 0.22)}"/><stop offset=".55" stop-color="${color}"/><stop offset=".8" stop-color="${shade(color, 0.15)}"/><stop offset="1" stop-color="${shade(color, -0.25)}"/></linearGradient>
      <pattern id="${id}lace" width="16" height="14" patternUnits="userSpaceOnUse">
        <path d="M0 7 Q4 0 8 7 T16 7" fill="none" stroke="${lace}" stroke-width="1" opacity=".75"/>
        <circle cx="8" cy="10.5" r="1.4" fill="${lace}" opacity=".7"/><circle cx="0" cy="3" r="2.6" fill="none" stroke="${lace}" stroke-width=".7" opacity=".55"/><circle cx="16" cy="3" r="2.6" fill="none" stroke="${lace}" stroke-width=".7" opacity=".55"/>
      </pattern>
      <pattern id="${id}scallop" width="10" height="6" patternUnits="userSpaceOnUse"><path d="M0 0 Q5 8 10 0" fill="${color}"/></pattern>
      <clipPath id="${id}clipBody"><path d="${P.torso}"/></clipPath>`;

    const laced = (d, extra = '') => `<path d="${d}" fill="url(#${id}fab)" ${extra}/><path d="${d}" fill="url(#${id}lace)"/><path d="${d}" fill="none" stroke="${shade(color, -0.35)}" stroke-width=".8" opacity=".6"/>`;

    // ---------- corpo ----------
    let body = `
      <path d="${P.armL}" fill="url(#${id}arm)"/><path d="${mirror(P.armL)}" fill="url(#${id}arm)"/>
      <path d="${P.torso}" fill="url(#${id}skin)"/>
      <g clip-path="url(#${id}clipBody)" opacity=".5">
        <ellipse cx="200" cy="300" rx="2.4" ry="4.5" fill="${shade(skin, -0.35)}"/>
        <path d="M150 66 C168 74 184 72 196 67" stroke="${shade(skin, -0.25)}" stroke-width="1.4" fill="none"/>
        <path d="M250 66 C232 74 216 72 204 67" stroke="${shade(skin, -0.25)}" stroke-width="1.4" fill="none"/>
        <ellipse cx="200" cy="245" rx="70" ry="40" fill="${shade(skin, 0.12)}" opacity=".35"/>
      </g>
      <path d="${pose >= 0 ? P.hair : mirror(P.hair)}" fill="${hair}"/>
      <path d="${pose >= 0 ? P.hair : mirror(P.hair)}" fill="none" stroke="${shade(hair, 0.25)}" stroke-width=".8" opacity=".5" stroke-dasharray="40 8"/>`;

    // ---------- peças ----------
    let wear = '';
    const straps = (w = 3.2) => `<path d="M150 125 L158 56" stroke="${shade(color, -0.1)}" stroke-width="${w}" stroke-linecap="round"/><path d="M250 125 L242 56" stroke="${shade(color, -0.1)}" stroke-width="${w}" stroke-linecap="round"/>`;
    const cups = (tri) => {
      const d = tri ? P.triL : P.cupL;
      return laced(d) + laced(mirror(d)) + `<path d="${tri ? 'M190 176 C180 160 168 146 154 132' : 'M188 150 C178 136 162 132 148 136'}" stroke="rgba(255,255,255,.28)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="${tri ? mirror('M190 176 C180 160 168 146 154 132') : mirror('M188 150 C178 136 162 132 148 136')}" stroke="rgba(255,255,255,.18)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    };
    const briefs = (d = P.brief) => laced(d) + `<path d="${d.split('L')[0].replace('M', 'M') }" fill="none"/><path d="M122 322 C170 336 230 336 278 322" stroke="${accent}" stroke-width="1.6" fill="none" opacity=".9"/>` + bow(200, 334, accent);

    if (style === 'set' || style === 'bralette' || style === 'highwaist' || style === 'robe') {
      const tri = style === 'bralette';
      wear += straps(tri ? 2.4 : 3.2) + cups(tri);
      wear += tri ? `<path d="M120 184 C150 198 250 198 280 184 L281 192 C250 206 150 206 119 192 Z" fill="${shade(color, -0.1)}"/><path d="M119 192 C150 206 250 206 281 192" stroke="url(#${id}scallop)" stroke-width="5" fill="none"/>` : laced(P.band);
      wear += bow(200, 186, accent);
      wear += style === 'highwaist' ? laced(P.highwaist) + `<path d="M127 258 C170 270 230 270 273 258" stroke="${accent}" stroke-width="2" fill="none"/>` + bow(200, 268, accent) : briefs();
    }
    if (style === 'garter') {
      wear += straps() + cups(false) + laced(P.band) + bow(200, 186, accent);
      wear += laced(P.belt) + `<path d="M125 250 C170 263 230 263 275 250" stroke="${accent}" stroke-width="2" fill="none"/>`;
      wear += briefs();
      const stock = (side) => {
        const d = side === 'L' ? 'M120 466 C150 470 176 472 197 468 L196 520 L124 520 Z' : mirror('M120 466 C150 470 176 472 197 468 L196 520 L124 520 Z');
        return `<path d="${d}" fill="${color}" opacity=".5"/><path d="${side === 'L' ? 'M120 466 C150 470 176 472 197 468' : mirror('M120 466 C150 470 176 472 197 468')}" stroke="${color}" stroke-width="9" fill="none"/><path d="${side === 'L' ? 'M120 466 C150 470 176 472 197 468' : mirror('M120 466 C150 470 176 472 197 468')}" stroke="url(#${id}lace)" stroke-width="9" fill="none"/>`;
      };
      wear += stock('L') + stock('R');
      [[142, 318, 140, 466], [182, 326, 180, 470], [258, 318, 260, 466], [218, 326, 220, 470]].forEach(([a, b, c, d]) => {
        wear += `<path d="M${a} ${b} L${c} ${d}" stroke="${shade(color, -0.05)}" stroke-width="2.4"/><rect x="${c - 3}" y="${d - 7}" width="6" height="7" rx="1.2" fill="${accent}"/>`;
      });
    }
    if (style === 'bodysuit') {
      wear += straps(2.6) + laced(P.body, 'opacity=".92"');
      wear += `<path d="M198 160 C199 190 200 220 200 246 C200 220 201 190 202 160 Z" fill="url(#${id}skin)"/>`;
      wear += `<path d="M122 180 C140 194 176 196 198 184 M202 184 C224 196 260 194 278 180" stroke="${accent}" stroke-width="1.6" fill="none"/>`;
      wear += `<path d="M117 336 C148 364 178 404 194 432 M283 336 C252 364 222 404 206 432" stroke="${accent}" stroke-width="1.6" fill="none"/>` + bow(200, 252, accent);
    }
    if (style === 'slip') {
      wear += `<path d="M150 125 L158 56 M250 125 L242 56" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>`;
      wear += `<path d="${P.slip}" fill="url(#${id}silk)"/>`;
      wear += [150, 182, 214, 248, 278].map((x, i) => `<path d="M${x} ${220 + i * 6} C${x - 6 + i * 3} 320 ${x - 16 + i * 8} 400 ${x - 24 + i * 12} 476" stroke="${i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.12)'}" stroke-width="${i % 2 ? 6 : 3}" fill="none"/>`).join('');
      wear += `<path d="${P.cupL}" fill="url(#${id}lace)"/><path d="${mirror(P.cupL)}" fill="url(#${id}lace)"/>`;
      wear += `<path d="M122 180 C140 194 176 196 200 186 C224 196 260 194 278 180" stroke="${accent}" stroke-width="2.4" fill="none"/>`;
      wear += `<path d="M80 474 C140 486 260 486 320 474" stroke="url(#${id}scallop)" stroke-width="7" fill="none"/>`;
    }
    if (style === 'robe') {
      const rc = color;
      wear = wear.replaceAll(`url(#${id}fab)`, art.under || '#e8cfae');
      const panel = (d) => `<path d="${d}" fill="url(#${id}silk)"/><path d="${d}" fill="none" stroke="${shade(rc, -0.25)}" stroke-width=".8"/>`;
      wear += panel(P.robeL) + panel(mirror(P.robeL));
      wear += `<path d="M100 150 C96 260 92 380 84 510" stroke="rgba(255,255,255,.35)" stroke-width="6" fill="none"/><path d="M300 150 C304 260 308 380 316 510" stroke="rgba(0,0,0,.1)" stroke-width="5" fill="none"/>`;
      wear += `<path d="M178 44 C172 70 168 92 162 116 C146 160 138 220 136 280" stroke="${accent}" stroke-width="2" fill="none"/><path d="${mirror('M178 44 C172 70 168 92 162 116 C146 160 138 220 136 280')}" stroke="${accent}" stroke-width="2" fill="none"/>`;
      wear += `<path d="M136 270 C120 300 116 340 122 380 M140 272 C150 310 150 350 146 392" stroke="${shade(rc, -0.12)}" stroke-width="7" stroke-linecap="round" fill="none"/><ellipse cx="138" cy="272" rx="9" ry="7" fill="${shade(rc, -0.08)}"/>`;
    }

    const frame = o.frame === false ? '' : `<path d="M60 520 L60 150 A140 140 0 0 1 340 150 L340 520" fill="none" stroke="${art.bg === 'noir' || art.bg === 'wine' ? 'rgba(230,207,159,.35)' : 'rgba(120,90,60,.18)'}" stroke-width="1.2"/>`;
    const rot = pose * 2.2;

    return `<svg class="figure-svg" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustração editorial de modelo vestindo a peça">
      <defs>${defs}</defs>
      <rect x="-50" y="-50" width="500" height="640" fill="url(#${id}bg)"/>
      <rect x="-50" y="-50" width="500" height="640" fill="url(#${id}glow)"/>
      ${frame}
      <g transform="rotate(${rot} 200 300)">
        <ellipse cx="200" cy="520" rx="150" ry="16" fill="rgba(0,0,0,.12)"/>
        ${body}${wear}
      </g>
    </svg>`;
  };

  /** Monograma da marca */
  V.logoMark = function (size = 64, cls = '') {
    return `<svg class="logo-mark ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id="lgGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1dcae"/><stop offset=".5" stop-color="#c9a46a"/><stop offset="1" stop-color="#8f6c3a"/></linearGradient></defs>
      <circle class="lm-ring" cx="50" cy="50" r="46" fill="none" stroke="url(#lgGold)" stroke-width="1.2"/>
      <circle class="lm-ring2" cx="50" cy="50" r="41" fill="none" stroke="url(#lgGold)" stroke-width=".5" stroke-dasharray="1 3"/>
      <path class="lm-v1" d="M24 26 C34 28 38 40 44 56 C47 64 49 72 50 78" fill="none" stroke="url(#lgGold)" stroke-width="3.2" stroke-linecap="round"/>
      <path class="lm-v2" d="M76 26 C66 28 62 40 56 56 C53 64 51 72 50 78" fill="none" stroke="url(#lgGold)" stroke-width="1.6" stroke-linecap="round"/>
      <path class="lm-loop" d="M38 46 C44 40 56 40 62 46 C56 52 44 52 38 46 Z" fill="none" stroke="url(#lgGold)" stroke-width="1"/>
      <path class="lm-gem" d="M50 14 L54 20 L50 26 L46 20 Z" fill="url(#lgGold)"/>
    </svg>`;
  };

  V.color = { shade, lum };
})();
