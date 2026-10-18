/* VELLURE 3D · utilidades compartilhadas (loja e área da cliente) */
const C = window.VELLURE_CONFIG || {};
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => (+n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const CAT_NAME = { lingerie: 'Lingerie', corset: 'Corsets', praia: 'Moda praia', fitness: 'Fitness' };
export const PIX = +(((window.VELLURE_CONFIG || {}).PAYMENTS || {}).PIX_DISCOUNT ?? 0.05);
export const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9-9.2C1.6 7.2 4 4 7.2 4c2 0 3.5 1.1 4.8 2.8C13.3 5.1 14.8 4 16.8 4 20 4 22.4 7.2 21 10.8 19 15.6 12 20 12 20z"/></svg>';

export function waLink(text) {
  const n = String(C.WHATSAPP || '').replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
export function haptic(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* iOS ignora */ } }

let toastT;
export function toast(msg) {
  const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3000);
}

const mem = {};
export const local = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return mem[k] ?? d; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } }
};

/* ---------- sessão (Supabase) ---------- */
export async function currentUser() {
  try { if (!window.V?.api || !window.V.sb) return null; return await window.V.api.session(); } catch (e) { return null; }
}

/* ---------- favoritos: locais + sincronizados com a conta ---------- */
const listeners = new Set();
export const favs = {
  list() { return local.get('vellure_favoritos', []); },
  has(slug) { return this.list().includes(slug); },
  async toggle(slug) {
    const l = this.list(); const on = !l.includes(slug);
    const next = on ? [...l, slug] : l.filter((x) => x !== slug);
    local.set('vellure_favoritos', next); listeners.forEach((f) => f(next));
    try { if (window.V?.state?.user) await window.V.api.wishToggle(slug, on); } catch (e) { /* segue local */ }
    return on;
  },
  async sync() {
    try { if (!window.V?.state?.user) return this.list(); const all = await window.V.api.syncWishlist(this.list()); local.set('vellure_favoritos', all); listeners.forEach((f) => f(all)); return all; }
    catch (e) { return this.list(); }
  },
  on(fn) { listeners.add(fn); }
};

/* ---------- meu tamanho gravado ---------- */
const sizeListeners = new Set();
const ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
export const mySize = {
  get() { return local.get('vellure_tamanho', null); },
  async set(v) {
    const val = v ? { ...v, at: Date.now() } : null;
    local.set('vellure_tamanho', val); sizeListeners.forEach((f) => f(val));
    try {
      if (window.V?.state?.user) {
        const p = await window.V.api.profile();
        await window.V.api.updateProfile({ measurements: { ...(p?.measurements || {}), tamanho: val } });
      }
    } catch (e) { /* fica no aparelho */ }
    return val;
  },
  async pull() {
    try { if (!window.V?.state?.user) return; const p = await window.V.api.profile(); const t = p?.measurements?.tamanho; if (t && (!this.get() || (t.at || 0) > (this.get().at || 0))) { local.set('vellure_tamanho', t); sizeListeners.forEach((f) => f(t)); } } catch (e) { /* */ }
  },
  on(fn) { sizeListeners.add(fn); },
  /** parte do corpo que manda no tamanho da peça */
  part(p) {
    const n = (p.name || '').toLowerCase();
    if (p.cat === 'corset') return 'top';
    if (/tanga|calcinha|legging|calça|bermuda|short/.test(n)) return 'bottom';
    return 'top';
  },
  /** devolve o tamanho da cliente se a peça tiver, senão null */
  fits(p, s = this.get()) {
    if (!s) return null;
    if (p.sizes.length === 1 && /único/i.test(p.sizes[0])) return 'Único';
    const want = s[this.part(p)] || s.top || s.bottom;
    return p.sizes.includes(want) ? want : null;
  },
  ORDER
};
