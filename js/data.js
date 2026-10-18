/* =====================================================================
   VELLURE · camada de dados (Supabase + vitrine de contingência)
   ===================================================================== */
(function () {
  const V = (window.V = window.V || {});
  const C = window.VELLURE_CONFIG;
  V.sb = window.supabase ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  V.state = { dbReady: null, user: null, profile: null };

  // ---------------- dados de contingência (iguais ao seed SQL) ----------------
  const p = (slug, name, subtitle, category, price, colors, sizes, art, extra = {}) => ({
    id: slug, slug, name, subtitle, category, price, compare_price: extra.cp || null,
    colors: colors.map(([n, h]) => ({ name: n, hex: h })), sizes, stock: extra.stock ?? 12, images: [], art,
    description: extra.d || '', material: extra.m || 'Renda e seda', care: 'Lavar à mão em água fria com sabão neutro',
    is_featured: !!extra.f, is_new: !!extra.n, is_active: true
  });
  const BRA = ['38', '40', '42', '44', '46', '48'], LET = ['P', 'M', 'G', 'GG'];
  const FALLBACK = {
    categories: [
      { slug: 'conjuntos', name: 'Conjuntos', description: 'Sutiã e calcinha desenhados para existirem juntos', sort: 1 },
      { slug: 'sutias', name: 'Sutiãs', description: 'Sustentação esculpida, renda que respira', sort: 2 },
      { slug: 'calcinhas', name: 'Calcinhas', description: 'Do fio ao cintura alta', sort: 3 },
      { slug: 'bodies', name: 'Bodies', description: 'Uma única linha, do colo ao quadril', sort: 4 },
      { slug: 'noite', name: 'Noite & Robes', description: 'Camisolas e robes em seda pura', sort: 5 },
      { slug: 'cintas-ligas', name: 'Cintas-ligas', description: 'O ritual mais antigo da sedução', sort: 6 },
      { slug: 'noiva', name: 'Noiva', description: 'Enxoval branco, bordado à mão', sort: 7 }
    ],
    products: [
      p('conjunto-nocturne', 'Conjunto Nocturne', 'Renda Chantilly · Preto ônix', 'conjuntos', 689, [['Ônix', '#141014'], ['Vinho', '#5c1325']], BRA, { style: 'set', color: '#141014', accent: '#c9a46a', skin: 2, bg: 'blush' }, { f: 1, d: 'Renda Chantilly de Calais sobre tule de seda, bordas em festonê e fecho banhado a ouro 18k. A peça-assinatura da Maison.', m: 'Renda Chantilly, tule de seda, aro forrado' }),
      p('conjunto-aurora', 'Conjunto Aurora', 'Cetim de seda · Champagne', 'conjuntos', 749, [['Champagne', '#e8cfae'], ['Pérola', '#f4ede4']], BRA.slice(0, 5), { style: 'set', color: '#e8cfae', accent: '#b8925a', skin: 4, bg: 'noir' }, { f: 1, n: 1, d: 'Cetim de seda com toque líquido e brilho perolado. Bojo modelado sem costuras, calcinha de recorte alto.', m: 'Cetim de seda 19 momme' }),
      p('body-vesper', 'Body Vesper', 'Tule bordado · Bordeaux', 'bodies', 890, [['Bordeaux', '#5c1325'], ['Ônix', '#141014']], LET, { style: 'bodysuit', color: '#5c1325', accent: '#d4af7a', skin: 1, bg: 'champagne' }, { f: 1, cp: 990, d: 'Body de tule com bordado floral contínuo, decote profundo e cavas altas que alongam a silhueta.', m: 'Tule bordado, elastano' }),
      p('sutia-camelia', 'Sutiã Camélia', 'Renda francesa · Rosé', 'sutias', 389, [['Rosé', '#d9a3a6'], ['Marfim', '#efe6da']], [...BRA, '50'], { style: 'bralette', color: '#d9a3a6', accent: '#a8737a', skin: 3, bg: 'ivory' }, { n: 1, d: 'Sutiã balconette em renda francesa leavers, com alças reguláveis forradas em cetim.', m: 'Renda leavers francesa' }),
      p('calcinha-camelia', 'Calcinha Camélia', 'Renda francesa · Rosé', 'calcinhas', 189, [['Rosé', '#d9a3a6'], ['Marfim', '#efe6da']], ['PP', ...LET], { style: 'bralette', color: '#d9a3a6', accent: '#a8737a', skin: 5, bg: 'blush' }, { d: 'Calcinha tanga de renda leavers com fundo em algodão egípcio.', m: 'Renda leavers, forro algodão egípcio' }),
      p('cinta-liga-belle-epoque', 'Cinta-liga Belle Époque', 'Seda & renda · Noir', 'cintas-ligas', 459, [['Noir', '#0f0f12']], LET, { style: 'garter', color: '#0f0f12', accent: '#c9a46a', skin: 5, bg: 'wine' }, { f: 1, d: 'Cinta-liga de cintura alta com seis presilhas em metal dourado e laço de veludo.', m: 'Seda, renda Chantilly, veludo' }),
      p('robe-lune', 'Robe Lune', 'Seda pura · Marfim', 'noite', 1190, [['Marfim', '#f3ece2'], ['Noir', '#151216']], ['P', 'M', 'G'], { style: 'robe', color: '#f3ece2', accent: '#c9a46a', skin: 0, bg: 'noir', under: '#e8cfae' }, { f: 1, n: 1, d: 'Robe longo em seda pura charmeuse com mangas quimono e faixa removível.', m: 'Seda charmeuse 22 momme' }),
      p('camisola-mirage', 'Camisola Mirage', 'Seda · Azul névoa', 'noite', 980, [['Azul névoa', '#8a9bb0'], ['Champagne', '#e8cfae']], LET, { style: 'slip', color: '#8a9bb0', accent: '#e8e2d6', skin: 3, bg: 'ivory' }, { n: 1, d: 'Camisola slip em viés, alças finas cruzadas nas costas e barra com renda.', m: 'Seda em viés' }),
      p('conjunto-blanc-de-noces', 'Blanc de Noces', 'Coleção Noiva · Branco', 'noiva', 920, [['Branco', '#f7f3ee']], BRA.slice(0, 5), { style: 'garter', color: '#f7f3ee', accent: '#d8c3a5', skin: 2, bg: 'champagne' }, { f: 1, d: 'Conjunto com cinta-liga em renda guipir e pérolas de água doce. Bordamos as iniciais do casal sob encomenda.', m: 'Renda guipir, pérolas' }),
      p('body-onyx', 'Body Onyx', 'Tule transparente · Preto', 'bodies', 790, [['Preto', '#1b1b1f']], LET, { style: 'bodysuit', color: '#1b1b1f', accent: '#c9a46a', skin: 4, bg: 'blush' }, { d: 'Body em tule de alta transparência com tiras gráficas e fecho em gancho dourado.', m: 'Tule, elastano' }),
      p('conjunto-emeraude', 'Conjunto Émeraude', 'Veludo & renda · Esmeralda', 'conjuntos', 720, [['Esmeralda', '#1f4d3f']], BRA.slice(0, 5), { style: 'set', color: '#1f4d3f', accent: '#c9a46a', skin: 0, bg: 'champagne' }, { n: 1, d: 'Veludo de seda verde-esmeralda com renda tom sobre tom. Edição limitada de inverno.', m: 'Veludo de seda, renda' }),
      p('bralette-petale', 'Bralette Pétale', 'Renda sem aro · Blush', 'sutias', 329, [['Blush', '#f0c9c0'], ['Ônix', '#141014']], LET, { style: 'bralette', color: '#f0c9c0', accent: '#c48b80', skin: 5, bg: 'ivory' }, { d: 'Bralette sem aro e sem bojo, renda macia com acabamento em festonê.', m: 'Renda elástica' }),
      p('calcinha-hauteville', 'Calcinha Hauteville', 'Cintura alta · Cacau', 'calcinhas', 249, [['Cacau', '#4a2e2a'], ['Ônix', '#141014']], ['PP', ...LET, 'XG'], { style: 'highwaist', color: '#4a2e2a', accent: '#c9a46a', skin: 1, bg: 'blush' }, { d: 'Calcinha de cintura alta em microfibra italiana com painel de renda.', m: 'Microfibra italiana, renda' }),
      p('conjunto-saphir', 'Conjunto Saphir', 'Renda bordada · Cobalto', 'conjuntos', 690, [['Cobalto', '#1d2f6b']], BRA, { style: 'set', color: '#1d2f6b', accent: '#d4af7a', skin: 3, bg: 'blush' }, { f: 1, d: 'Renda bordada com fio metalizado em azul cobalto profundo. Sutiã plunge com bojo leve.', m: 'Renda bordada' }),
      p('camisola-nuit-blanche', 'Camisola Nuit Blanche', 'Seda · Pérola', 'noite', 860, [['Pérola', '#efe6da']], LET, { style: 'slip', color: '#efe6da', accent: '#c9a46a', skin: 4, bg: 'wine' }, { d: 'Camisola em seda pérola com decote em renda Chantilly e fenda lateral.', m: 'Seda, renda Chantilly' }),
      p('conjunto-rubis', 'Conjunto Rubis', 'Tule & veludo · Rubi', 'conjuntos', 710, [['Rubi', '#8e1b2c']], BRA.slice(0, 5), { style: 'set', color: '#8e1b2c', accent: '#d4af7a', skin: 1, bg: 'ivory' }, { cp: 790, d: 'Tule bordado com aplicações de veludo, cor rubi intensa.', m: 'Tule, veludo' })
    ],
    plans: [
      { slug: 'essentielle', kind: 'box', name: 'Essentielle', tagline: 'Uma peça-surpresa por mês', price: 189, highlight: false, sort: 1, perks: ['1 peça surpresa (sutiã, calcinha ou bralette)', 'Curadoria pelo seu perfil e medidas', 'Caixa-presente perfumada', 'Troca de tamanho grátis'] },
      { slug: 'signature', kind: 'box', name: 'Signature', tagline: 'O conjunto completo, todo mês', price: 349, highlight: true, sort: 2, perks: ['Conjunto completo surpresa', 'Sachê perfumado exclusivo', 'Bilhete escrito à mão', 'Troca grátis e 2× Pétalas', 'Acesso antecipado às coleções'] },
      { slug: 'haute-couture', kind: 'box', name: 'Haute Couture', tagline: 'A experiência integral da Maison', price: 649, highlight: false, sort: 3, perks: ['Conjunto premium + peça extra (body, robe ou cinta-liga)', 'Inclui Cercle Privé (frete grátis sempre)', 'Prova em Casa ilimitada', 'Presente de aniversário', '3× Pétalas'] },
      { slug: 'cercle-prive', kind: 'cercle', name: 'Cercle Privé', tagline: 'Clube de membros da Maison', price: 99, highlight: true, sort: 4, perks: ['Frete grátis em todas as compras', 'Prova em Casa com mensageira', 'Pré-venda 48h antes de todas', 'Personal stylist por vídeo', 'Presente no aniversário'] },
      { slug: 'lingerie-care', kind: 'care', name: 'Lingerie Care', tagline: 'Lavanderia delicada mensal', price: 129, highlight: false, sort: 5, perks: ['Coleta e devolução em casa', 'Lavagem à mão com sabão de seda', 'Restauração de alças e fechos', 'Devolução em sachê perfumado'] }
    ],
    services: [
      { slug: 'prova-em-casa', name: 'Prova em Casa', description: 'Uma mensageira Vellure leva até 8 peças selecionadas para você. Prove com calma e fique apenas com o que amar.', duration: '90 min', price: 120, member_price: 0, icon: 'home' },
      { slug: 'stylist-video', name: 'Personal Stylist por Vídeo', description: 'Uma consultora confirma suas medidas e monta seu guarda-roupa íntimo ideal.', duration: '45 min', price: 90, member_price: 0, icon: 'video' },
      { slug: 'gift-concierge', name: 'Gift Concierge', description: 'Para presentear: curadoria, cartão caligrafado e entrega na hora marcada, com discrição absoluta.', duration: '—', price: 60, member_price: 0, icon: 'gift' },
      { slug: 'atelier-noiva', name: 'Atelier Noiva', description: 'Enxoval completo da noiva com bordado de iniciais e prova no atelier dos Jardins.', duration: '2 h', price: 0, member_price: 0, icon: 'ring' },
      { slug: 'monograma', name: 'Monograma Bordado', description: 'Suas iniciais bordadas à mão em fio de seda em qualquer peça da Maison.', duration: '7 dias', price: 150, member_price: 90, icon: 'needle' }
    ],
    districts: [
      ['Jardins', 470, 385, 0, 40, 'Nosso atelier fica aqui · retirada com champagne'], ['Cerqueira César', 400, 348, 0, 45], ['Higienópolis', 480, 290, 19.9, 60], ['Pacaembu', 375, 292, 19.9, 65], ['Perdizes', 345, 250, 24.9, 75], ['Vila Madalena', 300, 330, 24.9, 75], ['Pinheiros', 355, 385, 19.9, 60], ['Itaim Bibi', 420, 455, 19.9, 55], ['Vila Nova Conceição', 485, 470, 19.9, 55], ['Vila Mariana', 570, 420, 24.9, 70], ['Aclimação', 600, 350, 24.9, 75], ['Moema', 540, 525, 24.9, 70], ['Brooklin', 450, 565, 29.9, 85], ['Campo Belo', 520, 605, 29.9, 90], ['Cidade Jardim', 335, 465, 24.9, 70], ['Morumbi', 245, 505, 34.9, 100], ['Butantã', 205, 390, 34.9, 100], ['Santana', 530, 120, 39.9, 120], ['Tatuapé', 770, 255, 39.9, 120], ['Mooca', 690, 335, 34.9, 105], ['Anália Franco', 830, 355, 44.9, 130], ['Alphaville', 70, 255, 59.9, 150, 'Entrega com hora marcada']
    ].map(([name, x, y, fee, eta, note], i) => ({ id: i + 1, name, x, y, fee, eta_minutes: eta, same_day: true, note: note || null })),
    rates: Object.entries({
      SP: ['Sudeste', 29.9, 3, 49.9, 1], RJ: ['Sudeste', 34.9, 4, 59.9, 2], MG: ['Sudeste', 34.9, 4, 59.9, 2], ES: ['Sudeste', 39.9, 5, 64.9, 2],
      PR: ['Sul', 39.9, 5, 64.9, 2], SC: ['Sul', 42.9, 5, 69.9, 3], RS: ['Sul', 44.9, 6, 72.9, 3], DF: ['Centro-Oeste', 44.9, 5, 72.9, 2], GO: ['Centro-Oeste', 44.9, 6, 72.9, 3],
      MT: ['Centro-Oeste', 52.9, 7, 84.9, 3], MS: ['Centro-Oeste', 49.9, 6, 79.9, 3], BA: ['Nordeste', 49.9, 7, 79.9, 3], PE: ['Nordeste', 52.9, 7, 84.9, 3], CE: ['Nordeste', 54.9, 8, 86.9, 3],
      RN: ['Nordeste', 54.9, 8, 86.9, 4], PB: ['Nordeste', 54.9, 8, 86.9, 4], AL: ['Nordeste', 54.9, 8, 86.9, 4], SE: ['Nordeste', 52.9, 8, 84.9, 4], MA: ['Nordeste', 59.9, 9, 94.9, 4],
      PI: ['Nordeste', 59.9, 9, 94.9, 4], PA: ['Norte', 64.9, 10, 99.9, 5], AM: ['Norte', 69.9, 11, 109.9, 5], AP: ['Norte', 69.9, 12, 109.9, 6], RR: ['Norte', 72.9, 12, 114.9, 6],
      RO: ['Norte', 64.9, 10, 99.9, 5], AC: ['Norte', 72.9, 12, 114.9, 6], TO: ['Norte', 59.9, 9, 94.9, 4]
    }).map(([uf, [region, cp, cd, ep, ed]]) => ({ uf, region, classic_price: cp, classic_days: cd, express_price: ep, express_days: ed }))
  };
  V.FALLBACK = FALLBACK;

  // ---------------- helpers ----------------
  const cache = {};
  async function q(key, fn, fallback) {
    if (cache[key]) return cache[key];
    if (!V.sb) return (cache[key] = fallback);
    try {
      const { data, error } = await fn();
      if (error) throw error;
      if (V.state.dbReady === null) V.state.dbReady = true;
      return (cache[key] = data && data.length ? data : fallback);
    } catch (e) {
      console.warn('[Vellure] usando vitrine local para', key, e.message || e);
      V.state.dbReady = false;
      return (cache[key] = fallback);
    }
  }
  const normPerks = (r) => r.map((x) => ({ ...x, perks: typeof x.perks === 'string' ? JSON.parse(x.perks) : x.perks || [] }));
  V.clearCache = (k) => (k ? delete cache[k] : Object.keys(cache).forEach((x) => delete cache[x]));

  V.api = {
    categories: () => q('cats', () => V.sb.from('categories').select('*').order('sort'), FALLBACK.categories),
    products: () => q('products', () => V.sb.from('products').select('*').eq('is_active', true).order('created_at'), FALLBACK.products),
    async product(slug) { return (await V.api.products()).find((x) => x.slug === slug); },
    plans: async () => normPerks(await q('plans', () => V.sb.from('plans').select('*').eq('active', true).order('sort'), FALLBACK.plans)),
    services: () => q('services', () => V.sb.from('services').select('*').order('sort'), FALLBACK.services),
    districts: () => q('districts', () => V.sb.from('delivery_districts').select('*').order('id'), FALLBACK.districts),
    rates: () => q('rates', () => V.sb.from('shipping_rates').select('*'), FALLBACK.rates),

    // ---------- autenticação ----------
    async session() {
      if (!V.sb) return null;
      const { data } = await V.sb.auth.getSession();
      V.state.user = data.session?.user || null;
      return V.state.user;
    },
    async signIn(email, password) {
      const { data, error } = await V.sb.auth.signInWithPassword({ email, password });
      if (error) throw error; V.state.user = data.user; return data.user;
    },
    async signUp(email, password, full_name, phone) {
      const { data, error } = await V.sb.auth.signUp({ email, password, options: { data: { full_name, phone } } });
      if (error) throw error; V.state.user = data.user; return data;
    },
    async resetPassword(email) {
      const { error } = await V.sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
      if (error) throw error;
    },
    async signOut() { await V.sb.auth.signOut(); V.state.user = null; V.state.profile = null; },
    async profile(force) {
      if (!V.state.user) return null;
      if (V.state.profile && !force) return V.state.profile;
      const { data, error } = await V.sb.from('profiles').select('*').eq('id', V.state.user.id).maybeSingle();
      if (error) { V.state.dbReady = false; return { id: V.state.user.id, email: V.state.user.email, full_name: V.state.user.user_metadata?.full_name || '', role: 'customer', petals: 0, measurements: {} }; }
      return (V.state.profile = data);
    },
    async updateProfile(patch) {
      const { data, error } = await V.sb.from('profiles').update(patch).eq('id', V.state.user.id).select().single();
      if (error) throw error; return (V.state.profile = data);
    },

    // ---------- pedidos ----------
    async checkCoupon(code, subtotal) {
      if (V.sb && V.state.dbReady !== false) {
        const { data, error } = await V.sb.rpc('check_coupon', { p_code: code, p_subtotal: subtotal });
        if (!error) return data;
      }
      const c = { BIENVENUE10: ['percent', 10, 0], MAISON150: ['fixed', 150, 1200] }[code.toUpperCase()];
      if (!c) return { ok: false, message: 'Cupom inválido ou expirado' };
      if (subtotal < c[2]) return { ok: false, message: 'Válido para compras acima de R$ ' + c[2] };
      return { ok: true, code: code.toUpperCase(), discount: c[0] === 'percent' ? +(subtotal * c[1] / 100).toFixed(2) : Math.min(c[1], subtotal) };
    },
    async placeOrder(payload) {
      const { data, error } = await V.sb.rpc('place_order', payload);
      if (error) throw error; return data;
    },
    async myOrders() {
      const { data, error } = await V.sb.from('orders').select('*, order_items(*)').eq('user_id', V.state.user.id).order('created_at', { ascending: false });
      if (error) throw error; return data;
    },

    // ---------- recorrência ----------
    async subscribe(plan, preferences) {
      const { data, error } = await V.sb.rpc('subscribe_plan', { p_plan: plan, p_preferences: preferences || {} });
      if (error) throw error; return data;
    },
    async mySubscriptions() {
      const { data, error } = await V.sb.from('subscriptions').select('*, plans(*), boxes(*)').eq('user_id', V.state.user.id).order('started_at', { ascending: false });
      if (error) throw error; return data;
    },
    async updateSubscription(id, patch) {
      const { error } = await V.sb.from('subscriptions').update(patch).eq('id', id);
      if (error) throw error;
    },
    async book(appt) {
      const { data, error } = await V.sb.from('appointments').insert({ ...appt, user_id: V.state.user.id }).select().single();
      if (error) throw error; return data;
    },
    async myAppointments() {
      const { data, error } = await V.sb.from('appointments').select('*, services(name)').eq('user_id', V.state.user.id).order('date', { ascending: false });
      if (error) throw error; return data;
    },
    async cancelAppointment(id) {
      const { error } = await V.sb.from('appointments').update({ status: 'cancelado' }).eq('id', id);
      if (error) throw error;
    },

    // ---------- endereços ----------
    async addresses() {
      const { data, error } = await V.sb.from('addresses').select('*').eq('user_id', V.state.user.id).order('created_at');
      if (error) throw error; return data;
    },
    async saveAddress(a) {
      const row = { ...a, user_id: V.state.user.id };
      const { error } = a.id ? await V.sb.from('addresses').update(row).eq('id', a.id) : await V.sb.from('addresses').insert(row);
      if (error) throw error;
    },
    async deleteAddress(id) { const { error } = await V.sb.from('addresses').delete().eq('id', id); if (error) throw error; },

    // ---------- favoritos ----------
    async syncWishlist(local) {
      if (!V.state.user || V.state.dbReady === false) return local;
      const prods = await V.api.products();
      const ids = local.map((s) => prods.find((x) => x.slug === s)?.id).filter((x) => x && x.length > 30);
      if (ids.length) await V.sb.from('wishlist').upsert(ids.map((product_id) => ({ user_id: V.state.user.id, product_id })), { ignoreDuplicates: true });
      const { data } = await V.sb.from('wishlist').select('product_id').eq('user_id', V.state.user.id);
      const slugs = (data || []).map((r) => prods.find((x) => x.id === r.product_id)?.slug).filter(Boolean);
      return [...new Set([...local, ...slugs])];
    },
    async wishToggle(slug, on) {
      if (!V.state.user || V.state.dbReady === false) return;
      const pr = await V.api.product(slug);
      if (!pr || pr.id.length < 30) return;
      if (on) await V.sb.from('wishlist').upsert({ user_id: V.state.user.id, product_id: pr.id }, { ignoreDuplicates: true });
      else await V.sb.from('wishlist').delete().eq('user_id', V.state.user.id).eq('product_id', pr.id);
    },

    async newsletter(email) {
      if (!V.sb) return;
      const { error } = await V.sb.from('newsletter').insert({ email });
      if (error && !String(error.message).includes('duplicate')) throw error;
    },

    // ---------- CEP ----------
    async cep(cep) {
      const c = cep.replace(/\D/g, '');
      if (c.length !== 8) throw new Error('CEP deve ter 8 dígitos');
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const j = await r.json();
      if (j.erro) throw new Error('CEP não encontrado');
      return j;
    }
  };

  // ---------------- utilidades ----------------
  V.money = (n) => (+n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  V.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  V.fmtDate = (d) => new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  V.errMsg = (e) => {
    const m = e?.message || String(e);
    if (/Invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/already registered/i.test(m)) return 'Este e-mail já possui cadastro.';
    if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos.';
    if (/relation .* does not exist|Could not find the|schema cache/i.test(m)) return 'O banco ainda não foi instalado — rode o arquivo supabase/schema.sql no Supabase.';
    if (/Password should be/i.test(m)) return 'A senha precisa ter ao menos 6 caracteres.';
    return m;
  };
  V.productImage = (pr, o = {}) =>
    pr.images && pr.images.length && pr.images[0]
      ? `<img src="${V.esc(o.zoom && pr.images[1] ? pr.images[1] : pr.images[0])}" alt="${V.esc(pr.name)}" loading="lazy">`
      : V.figure(typeof pr.art === 'string' ? JSON.parse(pr.art) : pr.art, o);
})();
