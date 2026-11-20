// Ecoo: letra sincronizada (cante junto). Carregado depois de app.js e biblioteca.js.
// A letra vem do site (letras/<id>.json, gerada por IA) ou do servidor, quando o admin corrigiu.
const letras = new Map(); // id -> { linhas: [[t, texto]], revisada } | null
let letraAberta = ler('letraAberta', false); // tela cheia do celular mostra a letra no lugar da capa
let rolouEm = 0, linhaAtual = -1, quadro = 0;

function temLetra(m) { return !!(m && (m.letra || (catalogo.letras || {})[m.id])); }
async function letraDe(m) {
  if (!temLetra(m)) return null;
  const versao = (catalogo.letras || {})[m.id];
  const chave = m.id + ':' + (versao || 'site');
  if (letras.has(chave)) return letras.get(chave);
  let d = null;
  try {
    if (versao && API) {
      const r = await (await fetch(API + '?letra=' + encodeURIComponent(m.id))).json();
      if (r.ok && Array.isArray(r.linhas)) d = { linhas: r.linhas, revisada: r.revisada };
    }
    if (!d && m.letra) {
      const r = await (await fetch('letras/' + m.id + '.json?v=' + m.letra)).json();
      if (Array.isArray(r.linhas)) d = { linhas: r.linhas, revisada: !!r.revisada };
    }
  } catch {}
  if (d && !d.linhas.some(l => String(l[1]).trim())) d = null;
  letras.set(chave, d);
  return d;
}

function letraHTML(d, m) {
  if (!d) return `<div class="letra-vazia"><i data-lucide="mic-vocal"></i><p>Essa música ainda não tem letra.</p></div>`;
  return `<div class="letra-linhas">${d.linhas.map((l, i) => {
    const txt = String(l[1]).trim();
    return `<p data-i="${i}" data-t="${l[0]}" class="${txt ? '' : 'pausa'}">${txt ? esc(txt) : '<span class="pontos"><i></i><i></i><i></i></span>'}</p>`;
  }).join('')}</div>
  ${d.revisada ? '' : '<small class="letra-aviso">Letra escrita por IA a partir do áudio. Pode ter palavras erradas.</small>'}`;
}

// lugares onde a letra aparece agora (tela cheia do celular e/ou a tela da letra no computador)
function caixasLetra() { return [...document.querySelectorAll('[data-letra-caixa]')].filter(c => c.offsetParent !== null); }

async function preencherLetra() {
  const m = porId[estado.fila[estado.pos]];
  const caixas = document.querySelectorAll('[data-letra-caixa]');
  if (!caixas.length) return;
  caixas.forEach(c => { c.dataset.id = m ? m.id : ''; c.innerHTML = '<div class="letra-vazia"><p>Carregando a letra...</p></div>'; });
  const d = m ? await letraDe(m) : null;
  if (!m || estado.fila[estado.pos] !== m.id) return;
  caixas.forEach(c => { c.innerHTML = letraHTML(d, m); c.scrollTop = 0; });
  linhaAtual = -1; icones(); acompanhar(true);
}

function acompanhar(forcar) {
  const caixas = caixasLetra();
  if (!caixas.length) return;
  const m = porId[estado.fila[estado.pos]];
  const t = audio.currentTime + 0.2; // um pouco adiantado, como cantar junto
  caixas.forEach(c => {
    const ps = c.querySelectorAll('.letra-linhas p');
    if (!ps.length || c.dataset.id !== (m && m.id)) return;
    let i = -1;
    for (let k = 0; k < ps.length; k++) { if (+ps[k].dataset.t <= t) i = k; else break; }
    if (i === +c.dataset.atual && !forcar) return;
    c.dataset.atual = i;
    ps.forEach((p, k) => { p.classList.toggle('agora', k === i); p.classList.toggle('foi', k < i); });
    if (i >= 0 && Date.now() - rolouEm > 3500) {
      const p = ps[i];
      c.scrollTo({ top: p.offsetTop - c.clientHeight * 0.36, behavior: forcar ? 'auto' : 'smooth' });
    }
  });
}
function laco() {
  cancelAnimationFrame(quadro);
  if (!caixasLetra().length || document.hidden) return;
  acompanhar(false);
  if (!audio.paused) quadro = requestAnimationFrame(() => setTimeout(laco, 120));
}
audio.addEventListener('play', laco);
audio.addEventListener('seeked', () => acompanhar(true));
document.addEventListener('visibilitychange', () => { if (!document.hidden) { acompanhar(true); laco(); } });

// rolar com o dedo/mouse pausa a rolagem automatica por alguns segundos
document.addEventListener('wheel', e => { if (e.target.closest('[data-letra-caixa]')) rolouEm = Date.now(); }, { passive: true });
document.addEventListener('touchmove', e => { if (e.target.closest('[data-letra-caixa]')) rolouEm = Date.now(); }, { passive: true });
// tocar numa linha pula para ela
document.addEventListener('click', e => {
  const p = e.target.closest('[data-letra-caixa] .letra-linhas p');
  if (!p) return;
  audio.currentTime = +p.dataset.t; rolouEm = 0;
  if (audio.paused) audio.play().catch(() => {});
  acompanhar(true);
});

// ---------- botoes ----------
function atualizarBotoesLetra() {
  const m = porId[estado.fila[estado.pos]];
  const tem = temLetra(m);
  $('#bLetra').hidden = !tem;
  $('#tcLetra').hidden = !tem;
  const naTela = location.hash.startsWith('#/letra');
  $('#bLetra').classList.toggle('on', naTela);
  const cheia = tem && letraAberta;
  $('#tcLetra').classList.toggle('on', cheia);
  $('#telaCheia').classList.toggle('com-letra', cheia);
}
$('#bLetra').addEventListener('click', () => {
  if (location.hash.startsWith('#/letra')) history.back();
  else location.hash = '#/letra';
});
$('#tcLetra').addEventListener('click', () => {
  letraAberta = !letraAberta; guardar('letraAberta', letraAberta);
  atualizarBotoesLetra();
  if (letraAberta) preencherLetra();
});

// a pagina da letra (computador, ou celular pelo menu)
telas.letra = () => {
  const m = porId[estado.fila[estado.pos]];
  if (!m) return `<div class="vazio"><i data-lucide="mic-vocal"></i><p>Toque uma música para ver a letra.</p></div>`;
  setTimeout(() => { preencherLetra(); laco(); atualizarBotoesLetra(); }, 0);
  return `<section class="letra-tela" style="--cor:${cor(m)}">
    <div class="letra-cab"><strong>${esc(m.titulo)}</strong><span>${esc(m.artista)}</span></div>
    <div class="letra-caixa grande" data-letra-caixa></div>
  </section>`;
};

// chamado por abrir() a cada troca de musica
window.aoTrocarMusica = () => {
  atualizarBotoesLetra();
  if (location.hash.startsWith('#/letra')) { const s = document.querySelector('.letra-tela'); if (s) render('letra'); }
  else preencherLetra();
};
window.addEventListener('hashchange', atualizarBotoesLetra);
// abrir a tela cheia tambem precisa desenhar a letra
new MutationObserver(() => { if (!$('#telaCheia').hidden && letraAberta) { preencherLetra(); laco(); } })
  .observe($('#telaCheia'), { attributes: true, attributeFilter: ['hidden'] });
atualizarBotoesLetra();
