// Trono: player de musicas do King
const GENEROS = {
  'Hip-Hop':      { cor: '#8a6414', icone: 'crown',          desc: 'O King em inglês, batida pesada e recado motivador.' },
  'Rap':          { cor: '#7a2e1e', icone: 'mic',            desc: 'Rima em português, papo reto.' },
  'Rock':         { cor: '#5c1a1a', icone: 'guitar',         desc: 'Guitarra alta, treino e atitude.' },
  'Sertanejo':    { cor: '#7a4a1c', icone: 'wheat',          desc: 'Modão, sofrência e comemoração.' },
  'Eletrônica':   { cor: '#1f3d6b', icone: 'audio-waveform', desc: 'Ben, Pedro e Sun nas pistas.' },
  'Pop':          { cor: '#6b2459', icone: 'sparkles',       desc: 'Luds, refrão que gruda.' },
  'R&B':          { cor: '#5a1f3d', icone: 'heart',          desc: 'Clima sensual, voz suave e grave marcado.' },
  'MPB':          { cor: '#2d4a3e', icone: 'orbit',          desc: 'Enoihd Aiarbmac e seus planetas.' },
  'Reggae':       { cor: '#2f5a1e', icone: 'leaf',           desc: 'Brisa leve, Enoihd Aiarbmac no balanço.' },
  'Pontos':       { cor: '#6b1d1d', icone: 'flame',          desc: 'Pontos de gira.' },
  'Wicca':        { cor: '#33285c', icone: 'moon-star',      desc: 'Rituais, encanto e lua cheia.' },
  'Funk':         { cor: '#4a1f6b', icone: 'speaker',        desc: 'Grave que treme o chão.' },
  'Melancólicas': { cor: '#2b3440', icone: 'cloud-rain',     desc: 'Para os dias cinzas.' },
  'Trap':         { cor: '#3d1f1f', icone: 'gem',            desc: 'Escolhidas pelos ouvintes.' },
  'Lo-fi':        { cor: '#3b3a2a', icone: 'coffee',         desc: 'Escolhidas pelos ouvintes.' },
  'Gospel':       { cor: '#5c4a1f', icone: 'sun',            desc: 'Escolhidas pelos ouvintes.' },
  'Pagode':       { cor: '#1f4a4a', icone: 'drum',           desc: 'Escolhidas pelos ouvintes.' },
  'Samba':        { cor: '#5c3a1f', icone: 'music-4',        desc: 'Escolhidas pelos ouvintes.' },
  'Forró':        { cor: '#4a3a1a', icone: 'tent',           desc: 'Escolhidas pelos ouvintes.' },
  'Sem gênero':   { cor: '#3a3631', icone: 'circle-help',    desc: 'Ninguém decidiu ainda. Ouça e vote no gênero de cada uma: com votos suficientes ela muda de lugar.' },
};
const SEM = 'Sem gênero';
const ORDEM = Object.keys(GENEROS);
const OPCOES_VOTO = ORDEM.filter(g => g !== SEM);
const API = window.TRONO_API || '';
const MIN_VOTOS = API ? (window.TRONO_MIN_VOTOS || 2) : 1;
const $ = s => document.querySelector(s);
const audio = $('#audio');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tempo = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const guardar = (k, v) => { try { localStorage.setItem('trono.' + k, JSON.stringify(v)); } catch {} };
const ler = (k, padrao) => { try { const v = localStorage.getItem('trono.' + k); return v ? JSON.parse(v) : padrao; } catch { return padrao; } };

let MUSICAS = [], porId = {};
const estado = {
  fila: [], pos: -1, aleatorio: ler('aleatorio', false), repetir: ler('repetir', 'nao'),
  favs: new Set(ler('favs', [])), recentes: ler('recentes', []),
};

// ---------- Votos de genero ----------
const votos = { todos: {}, fixos: {}, meus: ler('meusVotos', {}) };
let ouvinte = ler('ouvinte', '');
if (!/^[a-z0-9]{10,40}$/.test(ouvinte)) { ouvinte = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join(''); guardar('ouvinte', ouvinte); }

function contagem(id) {
  if (API) return votos.todos[id] || {};
  const c = {}; if (votos.meus[id]) c[votos.meus[id]] = 1; return c;
}
function lider(id) {
  const c = Object.entries(contagem(id)).sort((a, b) => b[1] - a[1]);
  if (!c.length) return null;
  return { genero: c[0][0], n: c[0][1], empate: c[1] && c[1][1] === c[0][1], total: c.reduce((s, x) => s + x[1], 0) };
}
const votavel = m => m.generoOriginal === SEM && !votos.fixos[m.id];
function recalcular() {
  for (const m of MUSICAS) {
    m.porVoto = false;
    if (votos.fixos[m.id] && GENEROS[votos.fixos[m.id]]) { m.genero = votos.fixos[m.id]; continue; }
    m.genero = m.generoOriginal;
    if (m.generoOriginal !== SEM) continue;
    const l = lider(m.id);
    if (l && !l.empate && l.n >= MIN_VOTOS && GENEROS[l.genero]) { m.genero = l.genero; m.porVoto = true; }
  }
  montarMenu();
}
// Catalogo = musicas do site + enviadas pelo admin, menos as desativadas no admin
let BASE = [], catalogo = ler('catalogo', { inativas: [], enviadas: [] });
function montarCatalogo() {
  const fora = new Set(catalogo.inativas || []);
  const enviadas = (catalogo.enviadas || []).filter(m => m && /^[a-z0-9-]+$/.test(m.id) && /^https:\/\//.test(m.audio))
    .map(m => ({ ...m, generoOriginal: GENEROS[m.genero] ? m.genero : SEM }));
  MUSICAS = [...BASE, ...enviadas].filter(m => !fora.has(m.id))
    .sort((a, b) => ORDEM.indexOf(a.generoOriginal) - ORDEM.indexOf(b.generoOriginal));
  porId = {}; MUSICAS.forEach(m => porId[m.id] = m);
  // tira da fila o que foi desativado, sem parar a musica que esta tocando
  const atual = estado.fila[estado.pos];
  estado.fila = estado.fila.filter(id => porId[id] || id === atual);
  estado.pos = Math.max(0, estado.fila.indexOf(atual));
  if (estado.ordemOriginal) estado.ordemOriginal = estado.ordemOriginal.filter(id => porId[id] || id === atual);
  recalcular();
}
function aplicarEstado(d) {
  if (!d || !d.ok) return false;
  votos.todos = d.votos || {}; votos.fixos = d.fixos || {};
  catalogo = { inativas: d.inativas || [], enviadas: d.enviadas || [] };
  guardar('catalogo', catalogo);
  montarCatalogo(); return true;
}
async function buscarVotos() {
  if (!API) return;
  try { aplicarEstado(await (await fetch(API)).json()); rota(true); } catch {}
}
async function votar(id, genero) {
  const m = porId[id]; if (!m) return;
  const antes = votos.meus[id];
  if (genero) votos.meus[id] = genero; else delete votos.meus[id];
  guardar('meusVotos', votos.meus);
  if (API) {
    // ajuste otimista na contagem enquanto o servidor responde
    const c = votos.todos[id] = { ...(votos.todos[id] || {}) };
    if (antes) c[antes] = Math.max(0, (c[antes] || 1) - 1);
    if (genero) c[genero] = (c[genero] || 0) + 1;
  }
  const generoAntes = m.genero;
  recalcular(); desenharVoto(id); rota(true); atualizarGeneroPlayer();
  aviso(!genero ? 'Voto retirado' : m.genero !== generoAntes && m.genero !== SEM ? `${m.titulo} agora está em ${m.genero}` : `Voto em ${genero} registrado`);
  if (API) {
    try {
      const r = await fetch(API, { method: 'POST', body: JSON.stringify({ acao: 'votar', id, genero: genero || '', ouvinte }) });
      if (aplicarEstado(await r.json())) { desenharVoto(id); rota(true); atualizarGeneroPlayer(); }
    } catch { aviso('Sem conexão: o voto ficou salvo só aqui.'); }
  }
}
function abrirVoto(id) {
  const m = porId[id]; if (!m) return;
  $('#voto').hidden = false; $('#voto').dataset.id = id;
  desenharVoto(id);
}
function desenharVoto(id) {
  const caixa = $('#voto');
  if (caixa.hidden || caixa.dataset.id !== id) return;
  const m = porId[id], c = contagem(id), meu = votos.meus[id];
  const l = lider(id);
  $('#votoTitulo').textContent = `Qual o gênero de ${m.titulo}?`;
  $('#votoInfo').textContent = l
    ? `${l.total} voto${l.total > 1 ? 's' : ''} até agora. ${m.porVoto ? 'Os ouvintes colocaram em ' + m.genero + '.' : `Precisa de ${MIN_VOTOS} votos no mesmo gênero para ela mudar de lugar.`}`
    : `Ninguém votou ainda. Com ${MIN_VOTOS} voto${MIN_VOTOS > 1 ? 's' : ''} no mesmo gênero ela muda de lugar.`;
  $('#votoOpcoes').innerHTML = OPCOES_VOTO.map(g => `<button class="chip ${meu === g ? 'on' : ''}" data-votar="${esc(g)}" style="--cor:${GENEROS[g].cor}">
      <i data-lucide="${GENEROS[g].icone}"></i>${esc(g)}${c[g] ? `<b>${c[g]}</b>` : ''}</button>`).join('');
  $('#votoTirar').hidden = !meu;
  icones();
}
function atualizarGeneroPlayer() {
  const m = porId[estado.fila[estado.pos]];
  if (!m) return;
  $('#tcGenero').textContent = m.genero;
  ['#bGenero', '#tcVotar'].forEach(s => { $(s).hidden = !votavel(m); $(s).classList.toggle('on', !!votos.meus[m.id]); });
}

function icones() { if (window.lucide) lucide.createIcons(); }
function cor(m) { return (GENEROS[m.genero] || {}).cor || '#444'; }
function capaHTML(m, extra = '') {
  const g = GENEROS[m.genero] || {};
  const img = m.capa ? ` com-img" style="--cor:${g.cor};--img:url('${m.capa}')` : `" style="--cor:linear-gradient(135deg, ${g.cor}, #0d0b08)`;
  return `<span class="capa ${extra}${img}"><i data-lucide="${g.icone || 'music'}"></i></span>`;
}
function aviso(txt) {
  const a = $('#aviso'); a.textContent = txt; a.classList.add('on');
  clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('on'), 2200);
}

// ---------- Telas ----------
function faixasHTML(lista, mostrarGenero = false) {
  if (!lista.length) return `<div class="vazio"><i data-lucide="music-2"></i><p>Nada por aqui ainda.</p></div>`;
  const atual = estado.fila[estado.pos];
  return `<div class="faixas">` + lista.map((m, i) => {
    const toc = atual === m.id;
    const l = votavel(m) && lider(m.id);
    const extra = m.porVoto ? ' · escolhida pelos ouvintes'
      : l && m.genero === SEM ? ` · ${l.total} voto${l.total > 1 ? 's' : ''}, mais votado: ${l.genero}` : '';
    return `<div class="faixa ${toc ? 'tocando' : ''}" role="button" tabindex="0" data-tocar="${m.id}" data-lista="${i}">
      <span class="num">${toc ? '<span class="eq"><i></i><i></i><i></i></span>' : i + 1}</span>
      ${capaHTML(m)}
      <span class="nome"><strong>${esc(m.titulo)}</strong><small>${esc(m.artista)}${mostrarGenero ? ' · ' + esc(m.genero) : ''}${esc(extra)}</small></span>
      ${votavel(m) ? `<button class="btn-votar ${votos.meus[m.id] ? 'on' : ''}" data-abrir-voto="${m.id}"><i data-lucide="tag"></i><span>${votos.meus[m.id] ? esc(votos.meus[m.id]) : 'Votar gênero'}</span></button>` : '<span></span>'}
      <button class="ico fav-faixa ${estado.favs.has(m.id) ? 'on' : ''}" data-fav="${m.id}" aria-label="Favoritar"><i data-lucide="heart"></i></button>
      <span class="dur">${tempo(m.dur)}</span>
    </div>`;
  }).join('') + `</div>`;
}
function cardMusica(m) {
  return `<button class="card-musica" data-tocar-solo="${m.id}">${capaHTML(m)}<strong>${esc(m.titulo)}</strong><small>${esc(m.artista)}</small></button>`;
}

let listaVisivel = [];
const telas = {
  inicio() {
    const rec = estado.recentes.map(id => porId[id]).filter(Boolean).slice(0, 12);
    const gens = ORDEM.filter(g => g !== SEM && MUSICAS.some(m => m.genero === g));
    const semN = MUSICAS.filter(m => m.genero === SEM).length;
    listaVisivel = [];
    return `
      <section class="heroi">
        <div>
          <small>${MUSICAS.length} músicas · ${gens.length} gêneros</small>
          <h1>Toda a obra do King<br>num lugar só.</h1>
          <p>Escolha um gênero, aperte o play e mande o link da música para quem você quiser.</p>
        </div>
        <div class="acoes">
          <button class="btn btn-ouro" data-acao="tudo"><i data-lucide="play"></i>Tocar tudo</button>
          <button class="btn btn-borda" data-acao="misturar"><i data-lucide="shuffle"></i>Misturar</button>
        </div>
      </section>
      ${semN ? `<a class="chamada-voto" href="#/genero/${encodeURIComponent(SEM)}">
        <span class="chamada-ico"><i data-lucide="tags"></i></span>
        <span><strong>${semN} música${semN > 1 ? 's' : ''} sem gênero</strong><small>Ouça e diga em que gênero cada uma se encaixa. Você decide junto com a galera.</small></span>
        <i data-lucide="chevron-right"></i></a>` : ''}
      ${rec.length ? `<section class="secao"><h2>Ouvidas há pouco</h2><div class="fileira">${rec.map(cardMusica).join('')}</div></section>` : ''}
      <section class="secao"><h2>Gêneros</h2><div class="grade-generos">
        ${gens.map(g => `<a class="card-genero" href="#/genero/${encodeURIComponent(g)}" style="--cor:${GENEROS[g].cor}">
          <strong>${esc(g)}</strong><small>${MUSICAS.filter(m => m.genero === g).length} músicas</small><i data-lucide="${GENEROS[g].icone}"></i></a>`).join('')}
      </div></section>`;
  },
  genero(nome) {
    const g = GENEROS[nome];
    if (!g) return telas.naoAchou();
    listaVisivel = MUSICAS.filter(m => m.genero === nome);
    const total = listaVisivel.reduce((s, m) => s + m.dur, 0);
    const artistas = [...new Set(listaVisivel.map(m => m.artista))].join(', ');
    return `
      <header class="cab-genero" style="--cor:${g.cor}">
        <span class="capa" style="--cor:linear-gradient(135deg, ${g.cor}, #0d0b08)"><i data-lucide="${g.icone}"></i></span>
        <div><small>Gênero</small><h1>${esc(nome)}</h1><p>${esc(g.desc)}</p>
        <p>${listaVisivel.length ? esc(artistas) + ' · ' : ''}${listaVisivel.length} músicas, ${Math.round(total / 60)} min</p></div>
      </header>
      <div class="barra-acoes">
        <button class="btn-play-redondo" data-acao="lista" aria-label="Tocar ${esc(nome)}"><i data-lucide="play"></i></button>
        <button class="ico" data-acao="lista-mix" aria-label="Tocar misturado"><i data-lucide="shuffle"></i></button>
        <button class="ico" data-acao="link-genero" data-genero="${esc(nome)}" aria-label="Compartilhar gênero"><i data-lucide="share-2"></i></button>
      </div>
      ${faixasHTML(listaVisivel)}`;
  },
  buscar() {
    listaVisivel = [];
    return `<div class="topo-pagina"><h1>Buscar</h1></div>
      <div class="campo-busca"><i data-lucide="search"></i>
      <input id="busca" type="search" placeholder="Música, artista ou gênero" autocomplete="off"></div>
      <div id="resultado" class="secao"></div>`;
  },
  favoritas() {
    listaVisivel = MUSICAS.filter(m => estado.favs.has(m.id));
    return `<div class="topo-pagina"><h1>Favoritas</h1><p>Fica salvo neste aparelho.</p></div>
      ${listaVisivel.length ? `<div class="barra-acoes"><button class="btn-play-redondo" data-acao="lista" aria-label="Tocar favoritas"><i data-lucide="play"></i></button></div>` : ''}
      ${listaVisivel.length ? faixasHTML(listaVisivel, true) : `<div class="vazio"><i data-lucide="heart"></i><p>Toque no coração de uma música para ela aparecer aqui.</p></div>`}`;
  },
  naoAchou() { listaVisivel = []; return `<div class="vazio"><i data-lucide="search-x"></i><p>Essa página não existe.</p><a class="btn btn-borda" href="#/">Voltar ao início</a></div>`; },
};

function rota(manterRolagem) {
  const rolagem = $('#conteudo').scrollTop;
  if (manterRolagem === true) {
    if ($('#busca')) { buscar($('#busca').value); return; }
    rotaBase(); $('#conteudo').scrollTop = rolagem; return;
  }
  rotaBase();
}
function rotaBase() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [tipo, ...resto] = h.split('/');
  const arg = resto.join('/');
  if (tipo === 'musica' && porId[arg]) {
    const m = porId[arg];
    history.replaceState(null, '', '#/genero/' + encodeURIComponent(m.genero));
    render('genero', m.genero);
    const lista = listaVisivel.map(x => x.id);
    carregarFila(lista, lista.indexOf(m.id), false);
    aviso('Toque no play para ouvir ' + m.titulo);
    return;
  }
  if (tipo === 'genero') return render('genero', arg);
  if (tipo === 'buscar' || tipo === 'favoritas') return render(tipo);
  if (!tipo) return render('inicio');
  render('naoAchou');
}
function render(tela, arg) {
  const c = $('#conteudo');
  c.innerHTML = telas[tela](arg);
  c.scrollTop = 0;
  document.querySelectorAll('[data-rota]').forEach(a => a.classList.toggle('ativo', a.dataset.rota === tela));
  document.querySelectorAll('#generosMenu a').forEach(a => a.classList.toggle('ativo', tela === 'genero' && a.dataset.g === arg));
  document.title = tela === 'genero' ? arg + ' · Trono' : 'Trono';
  if (tela === 'buscar') { const i = $('#busca'); i.addEventListener('input', () => buscar(i.value)); i.focus(); }
  icones();
}
function buscar(q) {
  const n = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  q = n(q.trim());
  const r = $('#resultado');
  if (!q) { r.innerHTML = ''; listaVisivel = []; return; }
  listaVisivel = MUSICAS.filter(m => n(m.titulo + ' ' + m.artista + ' ' + m.genero).includes(q));
  r.innerHTML = listaVisivel.length ? faixasHTML(listaVisivel, true) : `<div class="vazio"><i data-lucide="search-x"></i><p>Nenhuma música com "${esc(q)}".</p></div>`;
  icones();
}
function marcarTocando() {
  const atual = estado.fila[estado.pos];
  document.querySelectorAll('.faixa').forEach(el => {
    const toc = el.dataset.tocar === atual;
    el.classList.toggle('tocando', toc);
    const num = el.querySelector('.num');
    num.innerHTML = toc ? '<span class="eq"><i></i><i></i><i></i></span>' : (+el.dataset.lista + 1);
  });
  document.body.classList.toggle('pausado', audio.paused);
}

// ---------- Player ----------
function embaralhar(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function carregarFila(ids, inicio = 0, tocar = true) {
  if (!ids.length) return;
  let fila = ids.slice(), pos = Math.max(0, inicio);
  if (estado.aleatorio) { const primeiro = fila[pos]; fila = [primeiro, ...embaralhar(fila.filter(id => id !== primeiro))]; pos = 0; }
  estado.fila = fila; estado.pos = pos; estado.ordemOriginal = ids.slice();
  abrir(tocar);
}
function abrir(tocar = true) {
  const m = porId[estado.fila[estado.pos]];
  if (!m) return;
  audio.src = m.audio;
  if (tocar) audio.play().catch(() => {});
  $('#player').hidden = false;
  $('#pTitulo').textContent = m.titulo; $('#pArtista').textContent = m.artista;
  $('#tcTitulo').textContent = m.titulo; $('#tcArtista').textContent = m.artista; $('#tcGenero').textContent = m.genero;
  $('#pCapa').outerHTML = capaHTML(m, 'p-capa').replace('class="capa', 'id="pCapa" class="capa');
  $('#tcCapa').outerHTML = capaHTML(m, 'tc-capa').replace('class="capa', 'id="tcCapa" class="capa');
  document.documentElement.style.setProperty('--cor-player', `color-mix(in srgb, ${cor(m)} 70%, #000)`);
  $('#telaCheia').style.setProperty('--cor', cor(m));
  $('#tTotal').textContent = $('#tcTotal').textContent = tempo(m.dur);
  atualizarFav(); atualizarGeneroPlayer(); marcarTocando(); icones();
  estado.recentes = [m.id, ...estado.recentes.filter(id => id !== m.id)].slice(0, 20); guardar('recentes', estado.recentes);
  if ('mediaSession' in navigator) {
    const art = m.capa ? [{ src: m.capa, sizes: '400x400', type: 'image/jpeg' }] : [{ src: 'icone-512.png', sizes: '512x512', type: 'image/png' }];
    navigator.mediaSession.metadata = new MediaMetadata({ title: m.titulo, artist: m.artista, album: m.genero + ' · Trono', artwork: art });
  }
}
function proxima(manual = true) {
  if (!estado.fila.length) return;
  if (!manual && estado.repetir === 'uma') { audio.currentTime = 0; audio.play(); return; }
  if (estado.pos < estado.fila.length - 1) estado.pos++;
  else if (estado.repetir === 'todas' || manual) estado.pos = 0;
  else { audio.pause(); return; }
  abrir(true);
}
function anterior() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (estado.pos > 0) { estado.pos--; abrir(true); } else audio.currentTime = 0;
}
function alternar() { if (!audio.src) return carregarFila(MUSICAS.map(m => m.id)); audio.paused ? audio.play() : audio.pause(); }
function setIcone(btn, nome) { btn.innerHTML = `<i data-lucide="${nome}"></i>`; }
function atualizarPlay() {
  ['#bPlay', '#tcPlay', '#bPlayMini'].forEach(s => setIcone($(s), audio.paused ? 'play' : 'pause'));
  icones(); marcarTocando();
}
function atualizarModos() {
  ['#bAleatorio', '#tcAleatorio'].forEach(s => $(s).classList.toggle('on', estado.aleatorio));
  ['#bRepetir', '#tcRepetir'].forEach(s => { const b = $(s); b.classList.toggle('on', estado.repetir !== 'nao'); setIcone(b, estado.repetir === 'uma' ? 'repeat-1' : 'repeat'); });
  icones();
}
function atualizarFav() {
  const id = estado.fila[estado.pos];
  ['#bFav', '#tcFav'].forEach(s => $(s).classList.toggle('on', estado.favs.has(id)));
}
function favoritar(id) {
  if (!id) return;
  estado.favs.has(id) ? estado.favs.delete(id) : estado.favs.add(id);
  guardar('favs', [...estado.favs]);
  aviso(estado.favs.has(id) ? 'Salva nas favoritas' : 'Removida das favoritas');
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(b => b.classList.toggle('on', estado.favs.has(id)));
  atualizarFav();
  if (location.hash.startsWith('#/favoritas')) render('favoritas');
}
async function compartilhar(url, titulo) {
  try {
    if (navigator.share) { await navigator.share({ title: titulo, text: titulo + ' no Trono', url }); return; }
    await navigator.clipboard.writeText(url); aviso('Link copiado. É só colar na conversa.');
  } catch (e) { if (e && e.name !== 'AbortError') aviso('Não deu para copiar. Link: ' + url); }
}
function linkMusica(id) { return location.href.split('#')[0] + '#/musica/' + id; }
function pintarRange(el) { el.style.setProperty('--p', (el.value / el.max * 100) + '%'); }

audio.addEventListener('timeupdate', () => {
  const d = audio.duration || (porId[estado.fila[estado.pos]] || {}).dur || 1;
  const v = Math.round(audio.currentTime / d * 1000);
  if (!arrastando) ['#progresso', '#tcProgresso'].forEach(s => { $(s).value = v; pintarRange($(s)); });
  $('#tAtual').textContent = $('#tcAtual').textContent = tempo(audio.currentTime);
  $('#miniBarra').style.width = (v / 10) + '%';
});
audio.addEventListener('loadedmetadata', () => { $('#tTotal').textContent = $('#tcTotal').textContent = tempo(audio.duration); });
audio.addEventListener('play', atualizarPlay);
audio.addEventListener('pause', atualizarPlay);
audio.addEventListener('ended', () => proxima(false));
audio.addEventListener('error', () => { if (audio.src) { aviso('Não consegui carregar essa música. Pulando.'); setTimeout(() => proxima(false), 800); } });

let arrastando = false;
['#progresso', '#tcProgresso'].forEach(s => {
  const el = $(s);
  el.addEventListener('input', () => { arrastando = true; pintarRange(el); });
  el.addEventListener('change', () => { arrastando = false; if (audio.duration) audio.currentTime = el.value / 1000 * audio.duration; });
});
const vol = $('#volume');
vol.value = ler('volume', 90); audio.volume = vol.value / 100; pintarRange(vol);
vol.addEventListener('input', () => { audio.volume = vol.value / 100; pintarRange(vol); guardar('volume', +vol.value); });

const cliques = {
  '#bPlay': alternar, '#tcPlay': alternar, '#bPlayMini': alternar,
  '#bProxima': () => proxima(), '#tcProxima': () => proxima(),
  '#bAnterior': anterior, '#tcAnterior': anterior,
  '#bAleatorio': mudarAleatorio, '#tcAleatorio': mudarAleatorio,
  '#bRepetir': mudarRepetir, '#tcRepetir': mudarRepetir,
  '#bFav': () => favoritar(estado.fila[estado.pos]), '#tcFav': () => favoritar(estado.fila[estado.pos]),
  '#bCompartilhar': compartilharAtual, '#tcCompartilhar': compartilharAtual,
  '#pInfo': () => { if (matchMedia('(max-width: 820px)').matches) { $('#telaCheia').hidden = false; icones(); } else { const m = porId[estado.fila[estado.pos]]; if (m) location.hash = '#/genero/' + encodeURIComponent(m.genero); } },
  '#tcFechar': () => { $('#telaCheia').hidden = true; },
};
Object.entries(cliques).forEach(([s, fn]) => $(s).addEventListener('click', fn));
function compartilharAtual() { const m = porId[estado.fila[estado.pos]]; if (m) compartilhar(linkMusica(m.id), m.titulo + ' · ' + m.artista); }
function mudarAleatorio() {
  estado.aleatorio = !estado.aleatorio; guardar('aleatorio', estado.aleatorio);
  const atual = estado.fila[estado.pos];
  if (estado.ordemOriginal && atual) {
    if (estado.aleatorio) { estado.fila = [atual, ...embaralhar(estado.ordemOriginal.filter(id => id !== atual))]; estado.pos = 0; }
    else { estado.fila = estado.ordemOriginal.slice(); estado.pos = estado.fila.indexOf(atual); }
  }
  aviso(estado.aleatorio ? 'Modo aleatório ligado' : 'Modo aleatório desligado');
  atualizarModos();
}
function mudarRepetir() {
  estado.repetir = { nao: 'todas', todas: 'uma', uma: 'nao' }[estado.repetir]; guardar('repetir', estado.repetir);
  aviso({ nao: 'Repetir desligado', todas: 'Repetindo a lista', uma: 'Repetindo esta música' }[estado.repetir]);
  atualizarModos();
}

// Cliques no conteudo
$('#conteudo').addEventListener('click', e => {
  const av = e.target.closest('[data-abrir-voto]');
  if (av) { e.stopPropagation(); return abrirVoto(av.dataset.abrirVoto); }
  const fav = e.target.closest('[data-fav]');
  if (fav) { e.stopPropagation(); return favoritar(fav.dataset.fav); }
  const faixa = e.target.closest('[data-tocar]');
  if (faixa) {
    if (estado.fila[estado.pos] === faixa.dataset.tocar) return alternar();
    return carregarFila(listaVisivel.map(m => m.id), +faixa.dataset.lista);
  }
  const solo = e.target.closest('[data-tocar-solo]');
  if (solo) { const m = porId[solo.dataset.tocarSolo]; const ids = MUSICAS.filter(x => x.genero === m.genero).map(x => x.id); return carregarFila(ids, ids.indexOf(m.id)); }
  const ac = e.target.closest('[data-acao]');
  if (!ac) return;
  const todos = MUSICAS.map(m => m.id);
  if (ac.dataset.acao === 'tudo') carregarFila(todos);
  if (ac.dataset.acao === 'misturar') { estado.aleatorio = true; guardar('aleatorio', true); atualizarModos(); carregarFila(todos, Math.floor(Math.random() * todos.length)); }
  if (ac.dataset.acao === 'lista') carregarFila(listaVisivel.map(m => m.id));
  if (ac.dataset.acao === 'lista-mix') { estado.aleatorio = true; guardar('aleatorio', true); atualizarModos(); const ids = listaVisivel.map(m => m.id); carregarFila(ids, Math.floor(Math.random() * ids.length)); }
  if (ac.dataset.acao === 'link-genero') compartilhar(location.href.split('#')[0] + '#/genero/' + encodeURIComponent(ac.dataset.genero), ac.dataset.genero + ' no Trono');
});
$('#conteudo').addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.faixa')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); alternar(); }
  if (e.key === 'Escape') { if (!$('#voto').hidden) $('#voto').hidden = true; else $('#telaCheia').hidden = true; }
});
$('#voto').addEventListener('click', e => {
  const id = $('#voto').dataset.id;
  if (e.target === $('#voto') || e.target.closest('#votoFechar')) { $('#voto').hidden = true; return; }
  if (e.target.closest('#votoTirar')) return votar(id, '');
  const b = e.target.closest('[data-votar]');
  if (b) votar(id, votos.meus[id] === b.dataset.votar ? '' : b.dataset.votar);
});
['#bGenero', '#tcVotar'].forEach(s => $(s).addEventListener('click', () => abrirVoto(estado.fila[estado.pos])));
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('nexttrack', () => proxima());
  navigator.mediaSession.setActionHandler('previoustrack', anterior);
}

function montarMenu() {
  const lista = ORDEM.filter(g => MUSICAS.some(m => m.genero === g));
  lista.sort((a, b) => (a === SEM) - (b === SEM));
  const ativo = decodeURIComponent(location.hash).replace('#/genero/', '');
  $('#generosMenu').innerHTML = lista.map(g => `<a href="#/genero/${encodeURIComponent(g)}" data-g="${esc(g)}" class="${g === ativo ? 'ativo' : ''}"><span class="ponto" style="background:${GENEROS[g].cor}"></span>${esc(g)}</a>`).join('');
}

// ---------- Inicio ----------
fetch('dados/musicas.json').then(r => r.json()).then(lista => {
  BASE = lista.map(m => ({ ...m, generoOriginal: m.genero }));
  montarCatalogo();
  atualizarModos();
  window.addEventListener('hashchange', rota);
  rota();
  buscarVotos();
  setInterval(() => { if (!document.hidden) buscarVotos(); }, 90000);
}).catch(() => { $('#conteudo').innerHTML = '<div class="vazio"><p>Não consegui carregar as músicas. Atualize a página.</p></div>'; });

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
