/* VELLURE · tema (escuro ou claro premium). Roda no <head> para não piscar. */
(function () {
  var KEY = 'vellure_tema', root = document.documentElement;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function apply(t) {
    root.dataset.theme = t;
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'claro' ? '#ece2d8' : '#140a10');
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-label', t === 'claro' ? 'Mudar para o modo escuro' : 'Mudar para o modo claro'); b.setAttribute('aria-pressed', String(t === 'claro')); });
  }
  apply(get() || 'escuro');
  window.VellureTheme = {
    get: function () { return root.dataset.theme; },
    set: function (t) { try { localStorage.setItem(KEY, t); } catch (e) { /* privado */ } apply(t); dispatchEvent(new CustomEvent('vellure-theme', { detail: t })); },
    toggle: function () { this.set(root.dataset.theme === 'claro' ? 'escuro' : 'claro'); }
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-theme-toggle]'); if (b) { e.preventDefault(); window.VellureTheme.toggle(); } });
  document.addEventListener('DOMContentLoaded', function () { apply(root.dataset.theme); });
})();
