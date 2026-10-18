/* =====================================================================
   VELLURE · Pix: gera o código "copia e cola" (padrão BR Code do Banco
   Central) com o valor e o número do pedido, e o QR Code para escanear
   ===================================================================== */
const P = (window.VELLURE_CONFIG || {}).PAYMENTS || {};
const clean = (s, n) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, n).trim();
const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export const pixReady = () => !!String(P.PIX_KEY || '').trim();
export function pixPayload(amount, txid = '***') {
  const key = String(P.PIX_KEY).trim();
  const tx = (String(txid).replace(/[^A-Za-z0-9]/g, '').slice(0, 25)) || '***';
  let s = f('00', '01') + f('26', f('00', 'br.gov.bcb.pix') + f('01', key));
  s += f('52', '0000') + f('53', '986') + (amount > 0 ? f('54', (+amount).toFixed(2)) : '') + f('58', 'BR');
  s += f('59', clean(P.PIX_NAME || 'VELLURE', 25) || 'VELLURE') + f('60', clean(P.PIX_CITY || 'SAO PAULO', 15) || 'SAO PAULO');
  s += f('62', f('05', tx)) + '6304';
  return s + crc16(s);
}
let qrLib = null;
function loadQr() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrLib) qrLib = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'; sc.onload = () => res(window.qrcode); sc.onerror = rej; document.head.appendChild(sc); });
  return qrLib;
}
/** devolve um <svg> do QR Code (módulos escuros sobre fundo claro, para qualquer banco ler) */
export async function pixQrSvg(payload) {
  const qrcode = await loadQr();
  const q = qrcode(0, 'M'); q.addData(payload); q.make();
  const n = q.getModuleCount(), m = 2; let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n + m * 2} ${n + m * 2}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><rect width="100%" height="100%" fill="#fffaf4"/><path d="${d}" fill="#2b1a20"/></svg>`;
}
