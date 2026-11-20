// Ecoo: biblioteca (playlists), menu de cada musica, fila "A seguir" e timer para dormir.
// Carregado depois do app.js e usa as mesmas variaveis (estado, porId, MUSICAS...).

// ---------- Playlists ----------
const novoIdLista = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => (b % 36).toString(36)).join('');
const listasVivas = () => estado.listas.filter(l => !l.apagada).sort((a, b) => (b.atualizada || 0) - (a.atualizada || 0));
function listaPorId(id) { return estado.listas.find(l => l.id === id && !l.apagada); }
function salvarListas() { guardar('listas', estado.listas); sincronizar(); montarListasMenu(); }

// Junta as playlists do aparelho com as da conta: vale a versao mais recente de cada uma.
// Devolve true se o aparelho tinha algo mais novo que ainda precisa subir.
function mesclarListas(remotas) {
  if (!Array.isArray(remotas)) return false;
  const mapa = new Map(estado.listas.map(l => [l.id, l]));
  let localNovo = false;
  const idsRemotos = new Set();
  for (const r of remotas) {
    if (!r || typeof r.id !== 'string') continue;
    idsRemotos.add(r.id);
    const l = mapa.get(r.id);
    if (!l || (r.atualizada || 0) > (l.atualizada || 0)) mapa.set(r.id, r);
    else if ((l.atualizada || 0) > (r.atualizada || 0)) localNovo = true;
  }
  for (const l of estado.listas) if (!idsRemotos.has(l.id)) localNovo = true;
  estado.listas = [...mapa.values()];
  guardar('listas', estado.listas);
  montarListasMenu();
  return localNovo;
}
function criarLista(nome, musicas = []) {
  const agora = Date.now();
  const l = { id: novoIdLista(), nome: nome.trim().slice(0, 60) || 'Minha playlist', musicas: [...new Set(musicas)], criada: agora, atualizada: agora };
  estado.listas.push(l); salvarListas();
  return l;
}
function mexerLista(id, fn) {
  const l = listaPorId(id); if (!l) return null;
  fn(l); l.atualizada = Date.now(); salvarListas();
  return l;
}
function adicionarNaLista(idLista, idMusica) {
  const l = listaPorId(idLista); if (!l) return;
  if (l.musicas.includes(idMusica)) return aviso(`Já está em ${l.nome}`);
  mexerLista(idLista, x => x.musicas.push(idMusica));
  aviso(`Adicionada em ${l.nome}`);
}
function tirarDaLista(idLista, idMusica) {
  mexerLista(idLista, x => { x.musicas = x.musicas.filter(i => i !== idMusica); });
  aviso('Removida da playlist');
  if (location.hash.startsWith('#/playlist/')) rota(true);
}
function apagarLista(id) {
  mexerLista(id, x => { x.apagada = true; x.musicas = []; });
  aviso('Playlist apagada');
  location.hash = '#/biblioteca';
}
function montarListasMenu() {
  const alvo = $('#listasMenu'); if (!alvo) return;
  const ls = listasVivas();
  alvo.innerHTML = ls.map(l => `<a href="#/playlist/${l.id}" data-l="${l.id}"><i data-lucide="list-music"></i><span>${esc(l.nome)}</span></a>`).join('');
  const atual = decodeURIComponent(location.hash).replace('#/playlist/', '');
  alvo.querySelectorAll('a').forEach(a => a.classList.toggle('ativo', a.dataset.l === atual));
  icones();
}

// Link de playlist: leva os ids no proprio endereco, nao precisa de servidor.
const paraB64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function linkLista(l) { return location.href.split('#')[0] + '#/compartilhada/' + paraB64(JSON.stringify({ n: l.nome, m: l.musicas })); }
function lerCompartilhada(arg) {
  try {
    const d = JSON.parse(deB64(arg));
    return { nome: String(d.n || 'Playlist').slice(0, 60), musicas: (Array.isArray(d.m) ? d.m : []).filter(id => typeof id === 'string').slice(0, 500) };
  } catch { return null; }
}

// ---------- Caixa de texto (nome da playlist) ----------
function pedirTexto(titulo, valor = '', botao = 'Salvar', semCampo = false) {
  return new Promise(ok => {
    const c = $('#campo'), txt = $('#campoTexto');
    $('#campoTitulo').textContent = titulo;
    txt.value = valor; txt.hidden = semCampo; txt.required = !semCampo;
    $('#campoOk').querySelector('span').textContent = botao;
    $('#campoOk').classList.toggle('perigo', semCampo);
    c.hidden = false; icones();
    setTimeout(() => { if (semCampo) $('#campoOk').focus(); else { txt.focus(); txt.select(); } }, 50);
    const fim = v => { c.hidden = true; c.onclick = null; $('#campoForm').onsubmit = null; ok(v); };
    $('#campoForm').onsubmit = e => { e.preventDefault(); fim(semCampo ? 'ok' : (txt.value.trim() || null)); };
    c.onclick = e => { if (e.target === c || e.target.closest('#campoFechar')) fim(null); };
  });
}

// ---------- Fila ----------
function tocarASeguir(id) {
  if (!estado.fila.length || !audio.getAttribute('src')) return carregarFila([id]);
  const atual = estado.fila[estado.pos];
  estado.fila.splice(estado.pos + 1, 0, id);
  if (estado.ordemOriginal) { const i = estado.ordemOriginal.indexOf(atual); estado.ordemOriginal.splice(i + 1, 0, id); }
  aviso(`${porId[id].titulo} toca a seguir`);
  if (location.hash.startsWith('#/fila')) rota(true);
}
function adicionarNaFila(id) {
  if (!estado.fila.length || !audio.getAttribute('src')) return carregarFila([id]);
  estado.fila.push(id);
  if (estado.ordemOriginal) estado.ordemOriginal.push(id);
  aviso(`${porId[id].titulo} entrou na fila`);
  if (location.hash.startsWith('#/fila')) rota(true);
}
function tirarDaFila(idx) {
  if (idx <= estado.pos || idx >= estado.fila.length) return;
  const [id] = estado.fila.splice(idx, 1);
  if (estado.ordemOriginal) { const i = estado.ordemOriginal.lastIndexOf(id); if (i >= 0) estado.ordemOriginal.splice(i, 1); }
  rota(true);
}
function linhaFila(m, idx, atual) {
  return `<div class="faixa ${atual ? 'tocando' : ''}" role="button" tabindex="0" data-ir-fila="${idx}">
    <span class="num">${atual ? '<span class="eq"><i></i><i></i><i></i></span>' : ''}</span>
    ${capaHTML(m)}
    <span class="nome"><strong>${esc(m.titulo)}</strong><small>${esc(m.artista)} · ${esc(m.genero)}</small></span>
    <span></span><span></span>
    <span class="dur">${tempo(m.dur)}</span>
    ${atual ? '<span></span>' : `<button class="ico" data-tirar-fila="${idx}" aria-label="Tirar ${esc(m.titulo)} da fila"><i data-lucide="x"></i></button>`}
  </div>`;
}

// ---------- Telas novas ----------
telas.fila = () => {
  listaVisivel = [];
  const atual = porId[estado.fila[estado.pos]];
  const resto = estado.fila.map((id, i) => [porId[id], i]).filter(([m, i]) => m && i > estado.pos);
  return `<div class="topo-pagina"><h1>Fila</h1><p>${resto.length ? `${resto.length} música${resto.length > 1 ? 's' : ''} a seguir` : 'Nada na fila depois desta música.'}</p></div>
    ${atual ? `<section class="secao"><h2>Tocando agora</h2><div class="faixas">${linhaFila(atual, estado.pos, true)}</div></section>` : '<div class="vazio"><i data-lucide="list-music"></i><p>Nada tocando. Escolha uma música para começar.</p></div>'}
    ${resto.length ? `<section class="secao"><div class="secao-cab"><h2>A seguir</h2><button class="btn btn-borda" data-limpar-fila><i data-lucide="list-x"></i>Limpar</button></div>
      <div class="faixas">${resto.map(([m, i]) => linhaFila(m, i, false)).join('')}</div></section>` : ''}
    <p class="nota-conta">Para pôr uma música aqui, toque nos três pontinhos dela e escolha "Tocar a seguir" ou "Adicionar à fila".</p>`;
};
telas.biblioteca = () => {
  listaVisivel = [];
  const ls = listasVivas();
  const capaLista = l => {
    const ms = l.musicas.map(id => porId[id]).filter(Boolean);
    return ms.length ? capaHTML(ms[0]) : '<span class="capa" style="--cor:linear-gradient(135deg,#5a4413,#0d0b08)"><i data-lucide="list-music"></i></span>';
  };
  return `<div class="topo-pagina"><h1>Sua biblioteca</h1><p>${conta ? 'Salva na sua conta, em qualquer aparelho.' : 'Salva neste aparelho. <a class="link" href="#/voce">Entre</a> para levar para qualquer aparelho.'}</p></div>
    <div class="grade-listas">
      <a class="card-lista" href="#/favoritas"><span class="capa" style="--cor:linear-gradient(135deg,#8a6414,#2a1d08)"><i data-lucide="heart"></i></span>
        <strong>Favoritas</strong><small>${MUSICAS.filter(m => estado.favs.has(m.id)).length} músicas</small></a>
      ${ls.map(l => `<a class="card-lista" href="#/playlist/${l.id}">${capaLista(l)}<strong>${esc(l.nome)}</strong><small>${l.musicas.filter(id => porId[id]).length} músicas</small></a>`).join('')}
      <button class="card-lista nova" data-nova-lista><span class="capa"><i data-lucide="plus"></i></span><strong>Nova playlist</strong><small>Junte as que você mais curte</small></button>
    </div>`;
};
telas.playlist = id => {
  const l = listaPorId(id);
  if (!l) return telas.naoAchou();
  listaVisivel = l.musicas.map(i => porId[i]).filter(Boolean);
  const total = listaVisivel.reduce((s, m) => s + m.dur, 0);
  return `<header class="cab-genero" style="--cor:#5a4413">
      <span class="capa" style="--cor:linear-gradient(135deg,#8a6414,#0d0b08)"><i data-lucide="list-music"></i></span>
      <div><small>Playlist</small><h1>${esc(l.nome)}</h1><p>${listaVisivel.length} músicas, ${Math.round(total / 60)} min</p></div>
    </header>
    <div class="barra-acoes">
      ${listaVisivel.length ? `<button class="btn-play-redondo" data-acao="lista" aria-label="Tocar ${esc(l.nome)}"><i data-lucide="play"></i></button>
      <button class="ico" data-acao="lista-mix" aria-label="Tocar misturado"><i data-lucide="shuffle"></i></button>
      <button class="ico" data-compartilhar-lista="${l.id}" aria-label="Compartilhar playlist"><i data-lucide="share-2"></i></button>` : ''}
      <button class="ico" data-renomear-lista="${l.id}" aria-label="Renomear playlist"><i data-lucide="pencil"></i></button>
      <button class="ico" data-apagar-lista="${l.id}" aria-label="Apagar playlist"><i data-lucide="trash-2"></i></button>
    </div>
    ${listaVisivel.length ? faixasHTML(listaVisivel, true, 'lista:' + l.id)
      : '<div class="vazio"><i data-lucide="list-plus"></i><p>Playlist vazia. Nos três pontinhos de qualquer música, escolha "Adicionar a uma playlist".</p><a class="btn btn-borda" href="#/buscar">Buscar músicas</a></div>'}`;
};
telas.compartilhada = arg => {
  const d = lerCompartilhada(arg);
  if (!d) return telas.naoAchou();
  listaVisivel = d.musicas.map(i => porId[i]).filter(Boolean);
  return `<header class="cab-genero" style="--cor:#3a3631">
      <span class="capa" style="--cor:linear-gradient(135deg,#8a6414,#0d0b08)"><i data-lucide="send"></i></span>
      <div><small>Playlist que mandaram para você</small><h1>${esc(d.nome)}</h1><p>${listaVisivel.length} músicas</p></div>
    </header>
    <div class="barra-acoes">
      ${listaVisivel.length ? `<button class="btn-play-redondo" data-acao="lista" aria-label="Tocar"><i data-lucide="play"></i></button>` : ''}
      <button class="btn btn-borda" data-salvar-compartilhada="${esc(arg)}"><i data-lucide="library"></i>Salvar na minha biblioteca</button>
    </div>
    ${faixasHTML(listaVisivel, true)}`;
};

$('#conteudo').addEventListener('click', async e => {
  const t = e.target;
  const ir = t.closest('[data-ir-fila]'), tira = t.closest('[data-tirar-fila]');
  if (tira) { e.stopPropagation(); return tirarDaFila(+tira.dataset.tirarFila); }
  if (ir) { const i = +ir.dataset.irFila; if (i === estado.pos) return alternar(); estado.pos = i; abrir(true); return rota(true); }
  if (t.closest('[data-limpar-fila]')) { estado.fila = estado.fila.slice(0, estado.pos + 1); return rota(true); }
  if (t.closest('[data-nova-lista]')) { const nome = await pedirTexto('Nova playlist', '', 'Criar'); if (nome) location.hash = '#/playlist/' + criarLista(nome).id; return; }
  const ren = t.closest('[data-renomear-lista]');
  if (ren) { const l = listaPorId(ren.dataset.renomearLista); const nome = l && await pedirTexto('Renomear playlist', l.nome); if (nome) { mexerLista(l.id, x => { x.nome = nome.slice(0, 60); }); rota(true); } return; }
  const apa = t.closest('[data-apagar-lista]');
  if (apa) { const l = listaPorId(apa.dataset.apagarLista); if (l && await confirmar(`Apagar a playlist "${l.nome}"?`, 'Apagar')) apagarLista(l.id); return; }
  const comp = t.closest('[data-compartilhar-lista]');
  if (comp) { const l = listaPorId(comp.dataset.compartilharLista); if (l) compartilhar(linkLista(l), l.nome + ' · playlist no Ecoo'); return; }
  const sal = t.closest('[data-salvar-compartilhada]');
  if (sal) { const d = lerCompartilhada(sal.dataset.salvarCompartilhada); if (d) { const l = criarLista(d.nome, d.musicas.filter(i => porId[i])); aviso('Salva na sua biblioteca'); location.hash = '#/playlist/' + l.id; } }
});
$('#conteudo').addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-ir-fila]')) { e.preventDefault(); e.target.click(); }
});
async function confirmar(texto, botao) {
  return (await pedirTexto(texto, '', botao, true)) !== null;
}
// botao "Nova playlist" do menu lateral (fica fora do conteudo)
$('#novaListaLateral').addEventListener('click', async () => {
  const nome = await pedirTexto('Nova playlist', '', 'Criar');
  if (nome) location.hash = '#/playlist/' + criarLista(nome).id;
});

// ---------- Menu de cada musica ----------
let menuMusica = null, menuCtx = '';
function abrirMenu(id, ctx = '') {
  const m = porId[id]; if (!m) return;
  menuMusica = id; menuCtx = ctx;
  desenharMenu('principal');
  $('#menu').hidden = false;
}
function fecharMenu() { $('#menu').hidden = true; }
function desenharMenu(vista) {
  const m = porId[menuMusica];
  const naLista = menuCtx.startsWith('lista:') ? listaPorId(menuCtx.slice(6)) : null;
  $('#menuCab').innerHTML = `${capaHTML(m)}<span><strong>${esc(m.titulo)}</strong><small>${esc(m.artista)} · ${esc(m.genero)}</small></span>`;
  const item = (acao, icone, texto) => `<button class="menu-item" data-mi="${acao}"><i data-lucide="${icone}"></i><span>${texto}</span></button>`;
  let h;
  if (vista === 'listas') {
    const ls = listasVivas();
    h = item('voltar', 'arrow-left', 'Voltar') + item('nova-com', 'plus', 'Nova playlist com esta música')
      + ls.map(l => `<button class="menu-item" data-mi="na-lista" data-l="${l.id}"><i data-lucide="${l.musicas.includes(menuMusica) ? 'check' : 'list-music'}"></i><span>${esc(l.nome)}</span></button>`).join('');
  } else if (vista === 'timer') {
    h = item('voltar', 'arrow-left', 'Voltar')
      + [15, 30, 45, 60].map(n => item('timer-' + n, 'moon', `Parar em ${n} minutos`)).join('')
      + item('timer-fim', 'square', 'Parar no fim desta música')
      + (timer ? item('timer-0', 'x', 'Desligar o timer') : '');
  } else {
    const fav = estado.favs.has(menuMusica);
    h = item('seguir', 'list-start', 'Tocar a seguir') + item('fila', 'list-plus', 'Adicionar à fila')
      + item('listas', 'list-music', 'Adicionar a uma playlist')
      + (naLista ? item('tirar-lista', 'list-minus', `Remover de ${esc(naLista.nome)}`) : '')
      + item('fav', 'heart', fav ? 'Remover das favoritas' : 'Salvar nas favoritas')
      + item('genero', 'disc-3', `Ver ${esc(m.genero)}`)
      + item('compartilhar', 'share-2', 'Compartilhar')
      + (menuCtx === 'player' ? item('ver-fila', 'list-ordered', 'Ver fila') + item('timer', 'moon', timer ? `Timer: ${textoTimer()}` : 'Timer para dormir') : '');
  }
  $('#menuItens').innerHTML = h;
  icones();
}
$('#menu').addEventListener('click', async e => {
  if (e.target === $('#menu') || e.target.closest('#menuFechar')) return fecharMenu();
  const b = e.target.closest('[data-mi]'); if (!b) return;
  const id = menuMusica, m = porId[id], a = b.dataset.mi;
  if (a === 'voltar') return desenharMenu('principal');
  if (a === 'listas') return desenharMenu('listas');
  if (a === 'timer') return desenharMenu('timer');
  if (a.startsWith('timer-')) { definirTimer(a.slice(6)); return fecharMenu(); }
  fecharMenu();
  if (a === 'seguir') tocarASeguir(id);
  if (a === 'fila') adicionarNaFila(id);
  if (a === 'na-lista') adicionarNaLista(b.dataset.l, id);
  if (a === 'nova-com') { const nome = await pedirTexto('Nova playlist', '', 'Criar'); if (nome) { criarLista(nome, [id]); aviso(`Playlist ${nome} criada`); } }
  if (a === 'tirar-lista') tirarDaLista(menuCtx.slice(6), id);
  if (a === 'fav') favoritar(id);
  if (a === 'genero') { $('#telaCheia').hidden = true; location.hash = '#/genero/' + encodeURIComponent(m.genero); }
  if (a === 'compartilhar') compartilhar(linkMusica(id), m.titulo + ' · ' + m.artista);
  if (a === 'ver-fila') { $('#telaCheia').hidden = true; location.hash = '#/fila'; }
});
['#bMais', '#tcMais'].forEach(s => $(s).addEventListener('click', () => { const id = estado.fila[estado.pos]; if (id) abrirMenu(id, 'player'); }));
$('#bFila').addEventListener('click', () => { location.hash = location.hash === '#/fila' ? '#/' : '#/fila'; });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#menu').hidden) fecharMenu();
  if (!$('#campo').hidden) $('#campo').click();
});

// ---------- Timer para dormir ----------
let timer = null; // { ate: ms } ou { fim: true }
function textoTimer() {
  if (!timer) return '';
  if (timer.fim) return 'no fim desta música';
  return 'em ' + Math.max(1, Math.ceil((timer.ate - Date.now()) / 60000)) + ' min';
}
function definirTimer(v) {
  if (v === '0') timer = null;
  else if (v === 'fim') timer = { fim: true };
  else timer = { ate: Date.now() + (+v) * 60000 };
  atualizarTimerUI();
  aviso(timer ? 'A música para ' + textoTimer() : 'Timer desligado');
}
function atualizarTimerUI() {
  ['#bTimer', '#tcTimer'].forEach(s => { $(s).hidden = !timer; $(s).title = timer ? 'Para ' + textoTimer() : ''; });
}
function pararNoFim() {
  if (!timer || !timer.fim) return false;
  timer = null; atualizarTimerUI(); aviso('Timer: boa noite');
  return true;
}
setInterval(() => {
  if (!timer || !timer.ate) return;
  atualizarTimerUI();
  if (Date.now() < timer.ate) return;
  timer = null; atualizarTimerUI();
  // abaixa o volume aos poucos antes de parar
  const vol = audio.volume; let passo = 0;
  const desce = setInterval(() => {
    passo++; audio.volume = Math.max(0, vol * (1 - passo / 20));
    if (passo >= 20) { clearInterval(desce); pausar(); audio.volume = vol; aviso('Timer: boa noite'); }
  }, 250);
}, 1000);
['#bTimer', '#tcTimer'].forEach(s => $(s).addEventListener('click', () => { const id = estado.fila[estado.pos]; if (id) { abrirMenu(id, 'player'); desenharMenu('timer'); } }));

window.addEventListener('hashchange', montarListasMenu);
montarListasMenu();
