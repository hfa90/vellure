/* VELLURE 3D · utilidades compartilhadas (loja e área da cliente) */
const C = window.VELLURE_CONFIG || {};
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => (+n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const CAT_NAME = { lingerie: 'Lingerie', corset: 'Corsets', praia: 'Moda praia', fitness: 'Fitness' };
export const PIX = 0.05;
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
