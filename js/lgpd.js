/* VELLURE · aviso de privacidade (LGPD). Só guarda o que o site precisa para funcionar. */
(function () {
  var K = 'vellure_lgpd';
  try { if (localStorage.getItem(K)) return; } catch (e) { return; }
  var d = document.createElement('div');
  d.className = 'lgpd'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Aviso de privacidade');
  d.innerHTML = '<p>Guardamos no seu aparelho só o necessário para a sacola, os favoritos e suas preferências. Nada de anúncios rastreando você. <a href="politicas.html#privacidade">Saiba mais</a></p><button type="button">Entendi</button>';
  d.querySelector('button').addEventListener('click', function () { try { localStorage.setItem(K, String(Date.now())); } catch (e) { /* */ } d.classList.add('out'); setTimeout(function () { d.remove(); }, 600); });
  document.body.appendChild(d);
  requestAnimationFrame(function () { d.classList.add('in'); });
})();
