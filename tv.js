// Ecoo na TV: navegar com as setas do controle remoto, OK para tocar, teclas de midia,
// e o modo visual entra sozinho depois de um tempo parado (como protetor de tela).
// Liga com ?tv=1 (ou abrindo /ecoo/tv/), desliga com ?tv=0. Carregado por ultimo.
(() => {
if (!document.documentElement.classList.contains('tv')) return;

const SEL = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
function visivel(el) {
  if (el.closest('[hidden]') || el.disabled) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
}
// onde o foco pode andar agora: dentro da janela que estiver por cima, se houver
function escopo() {
  for (const s of ['#modoVisual', '#menu', '#campo', '#voto', '#dica', '#telaCheia']) { const el = document.querySelector(s); if (el && !el.hidden) return el; }
  return document.body;
}
function candidatos() { return [...escopo().querySelectorAll(SEL)].filter(visivel); }

function mover(dir) {
  const lista = candidatos();
  const atual = document.activeElement && lista.includes(document.activeElement) ? document.activeElement : null;
  if (!atual) { const p = lista.find(el => el.closest('.conteudo')) || lista[0]; if (p) focar(p); return; }
  const a = atual.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let melhor = null, nota = Infinity;
  for (const el of lista) {
    if (el === atual) continue;
    const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const dx = bx - ax, dy = by - ay;
    let principal, lado;
    if (dir === 'direita') { if (b.left < a.right - 4 && dx <= 4) continue; principal = dx; lado = dy; }
    else if (dir === 'esquerda') { if (b.right > a.left + 4 && dx >= -4) continue; principal = -dx; lado = dy; }
    else if (dir === 'baixo') { if (b.top < a.bottom - 4 && dy <= 4) continue; principal = dy; lado = dx; }
    else { if (b.bottom > a.top + 4 && dy >= -4) continue; principal = -dy; lado = dx; }
    if (principal <= 0) continue;
    const n = principal + Math.abs(lado) * 2.2; // prefere o que esta na mesma linha/coluna
    if (n < nota) { nota = n; melhor = el; }
  }
  if (melhor) focar(melhor);
}
function focar(el) {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
}

const SETAS = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita' };
document.addEventListener('keydown', e => {
  acordou();
  const el = document.activeElement;
  // modo visual aberto: setas trocam de musica / mostram os controles, OK pausa
  const mv = document.querySelector('#modoVisual');
  if (mv && !mv.hidden && !(el && mv.contains(el) && el.matches('button, input'))) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); proxima(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); anterior(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const b = mv.querySelector('#mvPlay'); if (b) b.focus(); return; }
  }
  if (SETAS[e.key]) {
    // barra de progresso/volume: esquerda e direita mexem no valor
    if (el && el.type === 'range' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName) && el.type !== 'range' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    e.preventDefault(); mover(SETAS[e.key]); return;
  }
  if (e.key === 'Enter' && el && el.getAttribute('role') === 'button' && el.tagName !== 'BUTTON') { e.preventDefault(); el.click(); return; }
  switch (e.key) {
    case 'MediaPlayPause': case 'MediaPlay': case 'MediaPause': e.preventDefault(); alternar(); break;
    case 'MediaTrackNext': case 'MediaFastForward': e.preventDefault(); proxima(); break;
    case 'MediaTrackPrevious': case 'MediaRewind': e.preventDefault(); anterior(); break;
  }
});

// protetor de tela: tocando e sem mexer no controle por 45 s, abre o modo visual
let paradoDesde = Date.now();
function acordou() { paradoDesde = Date.now(); }
['pointermove', 'pointerdown', 'wheel'].forEach(ev => document.addEventListener(ev, acordou, { passive: true }));
setInterval(() => {
  const mv = document.querySelector('#modoVisual');
  if (!audio.paused && mv && mv.hidden && Date.now() - paradoDesde > 45000 && window.abrirVisual) { abrirVisual(); }
}, 5000);

// foco inicial e depois de cada troca de tela
function focarConteudo(tentativa = 0) {
  setTimeout(() => {
    const lista = candidatos();
    if (lista.includes(document.activeElement)) return; // ja tem algo focado de verdade
    const p = lista.find(el => el.closest('.conteudo'));
    if (p) p.focus({ preventScroll: true });
    else if (tentativa < 20) focarConteudo(tentativa + 1); // a tela ainda esta carregando
  }, 150);
}
window.addEventListener('hashchange', () => focarConteudo());
// o app redesenha a tela quando o servidor responde: o elemento focado some junto
new MutationObserver(() => { if (!document.activeElement || document.activeElement === document.body) focarConteudo(); })
  .observe(document.querySelector('#conteudo'), { childList: true });
focarConteudo();
})();
