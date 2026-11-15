// Ecoo: player de musicas do King
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
      const r = await fetch(API, { method: 'POST', body: JSON.stringify({ acao: 'votar', id, genero: genero || '', ouvinte: quemVota() }) });
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
function cardMusica(m, ctx) {
  return `<button class="card-musica" data-tocar-solo="${m.id}"${ctx ? ` data-ctx="${ctx}"` : ''}>${capaHTML(m)}<strong>${esc(m.titulo)}</strong><small>${esc(m.artista)}</small></button>`;
}

// ---------- Conta do ouvinte ----------
// Entrar com Google ou com codigo de 6 digitos por e-mail. Favoritas e musicas
// ouvidas ficam na conta; sem conta, ficam so neste aparelho.
const GOOGLE_ID = window.ECOO_GOOGLE_CLIENT_ID || '';
let conta = ler('conta', null); // { token, usuario }
estado.plays = ler('plays', {});          // total de vezes que cada musica foi ouvida
let playsPend = ler('playsPend', {});     // ainda nao enviadas para a conta
let emailCodigo = '';

const quemVota = () => (conta && conta.usuario && /^[a-z0-9]{10,40}$/.test(conta.usuario.id) ? conta.usuario.id : ouvinte);
async function api(corpo, extra) {
  const r = await fetch(API, { method: 'POST', body: JSON.stringify(corpo), ...(extra || {}) });
  return r.json();
}
function contar(id) {
  estado.plays[id] = (estado.plays[id] || 0) + 1; guardar('plays', estado.plays);
  playsPend[id] = (playsPend[id] || 0) + 1; guardar('playsPend', playsPend);
  sincronizar();
}
let sincT = 0;
function sincronizar(agora) {
  if (!conta || !API) return;
  clearTimeout(sincT);
  sincT = setTimeout(enviarPerfil, agora ? 0 : 4000);
}
async function enviarPerfil(keepalive) {
  if (!conta || !API) return;
  const enviando = playsPend; playsPend = {}; guardar('playsPend', playsPend);
  try {
    const d = await api({ acao: 'salvarPerfil', token: conta.token, favs: [...estado.favs], plays: enviando }, keepalive ? { keepalive: true } : null);
    if (d.ok) { estado.plays = { ...d.perfil.plays }; for (const [k, n] of Object.entries(playsPend)) estado.plays[k] = (estado.plays[k] || 0) + n; guardar('plays', estado.plays); }
    else if (d.sessao === false) { sairLocal('Sua sessão venceu. Entre de novo.'); }
    else throw 0;
  } catch {
    // devolve o que nao foi enviado para tentar de novo depois
    for (const [k, n] of Object.entries(enviando)) playsPend[k] = (playsPend[k] || 0) + n;
    guardar('playsPend', playsPend);
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && conta && Object.keys(playsPend).length) enviarPerfil(true); });

function aplicarLogin(d) {
  conta = { token: d.token, usuario: d.usuario }; guardar('conta', conta);
  // junta o que estava no aparelho com o que estava na conta
  const p = d.perfil || { favs: [], plays: {} };
  p.favs.forEach(id => estado.favs.add(id)); guardar('favs', [...estado.favs]);
  estado.plays = { ...p.plays };
  for (const [k, n] of Object.entries(playsPend)) estado.plays[k] = (estado.plays[k] || 0) + n;
  guardar('plays', estado.plays);
  sincronizar(true);
  atualizarContaUI();
  aviso('Bem-vindo, ' + (d.usuario.nome || 'ouvinte') + '!');
  if (location.hash.startsWith('#/voce')) render('voce'); else rota(true);
}
function sairLocal(msg) {
  conta = null; guardar('conta', null);
  atualizarContaUI();
  if (msg) aviso(msg);
  if (location.hash.startsWith('#/voce')) render('voce');
}
async function sair() {
  if (conta) { await enviarPerfil(); api({ acao: 'sair', token: conta.token }).catch(() => {}); }
  sairLocal('Você saiu da conta. Suas favoritas continuam neste aparelho.');
}
async function conferirConta() {
  if (!conta || !API) return;
  try {
    const d = await api({ acao: 'perfil', token: conta.token });
    if (d.ok) { conta.usuario = d.usuario; guardar('conta', conta); d.perfil.favs.forEach(id => estado.favs.add(id)); guardar('favs', [...estado.favs]); atualizarContaUI(); }
    else if (d.sessao === false) sairLocal('Sua sessão venceu. Entre de novo.');
  } catch {}
}
function atualizarContaUI() {
  const u = conta && conta.usuario;
  document.querySelectorAll('[data-conta-nome]').forEach(el => { el.textContent = u ? (u.nome || 'Você').split(' ')[0] : 'Entrar'; });
}

function telaEntrar() {
  listaVisivel = [];
  setTimeout(montarLogin, 0);
  return `<section class="entrar-caixa">
    <span class="entrar-logo">Ec<img class="marca-oo" src="logo-oo.svg" alt="oo"></span>
    <h1>Entre no Ecoo</h1>
    <p>Suas favoritas em qualquer aparelho e uma seleção feita a partir do que você mais ouve. Sem senha para lembrar.</p>
    <div id="gbtn" class="gbtn"></div>
    ${GOOGLE_ID ? '<div class="ou"><span>ou</span></div>' : ''}
    <form id="formEmail" class="form-entrar">
      <label for="emailEntrar">Receba um código no seu e-mail</label>
      <input id="emailEntrar" type="email" autocomplete="email" inputmode="email" placeholder="seu@email.com" required value="${esc(emailCodigo)}">
      <button class="btn btn-ouro" type="submit"><i data-lucide="mail"></i>Enviar código</button>
    </form>
    <form id="formCodigo" class="form-entrar" hidden>
      <label for="codigoEntrar">Digite o código de 6 números que chegou em <b id="emailMostrado"></b></label>
      <input id="codigoEntrar" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required>
      <button class="btn btn-ouro" type="submit"><i data-lucide="log-in"></i>Entrar</button>
      <button class="link" type="button" id="trocarEmail">Usar outro e-mail</button>
    </form>
    <p class="msg-entrar" id="msgEntrar" role="status" aria-live="polite"></p>
    <small class="nota">Sem conta, o Ecoo continua funcionando. Suas favoritas ficam só neste aparelho.</small>
  </section>`;
}
function msgEntrar(t, erro) { const m = $('#msgEntrar'); if (m) { m.textContent = t || ''; m.classList.toggle('erro', !!erro); } }
function montarLogin() {
  const fe = $('#formEmail'), fc = $('#formCodigo');
  if (!fe) return;
  if (!API) { msgEntrar('O servidor ainda não está ligado.', true); return; }
  fe.addEventListener('submit', async e => {
    e.preventDefault();
    emailCodigo = $('#emailEntrar').value.trim();
    const b = fe.querySelector('button'); b.disabled = true; msgEntrar('Enviando...');
    try {
      const d = await api({ acao: 'pedirCodigo', email: emailCodigo });
      if (!d.ok) return msgEntrar(d.erro, true);
      fe.hidden = true; fc.hidden = false; $('#emailMostrado').textContent = emailCodigo; $('#codigoEntrar').focus();
      msgEntrar('Código enviado. Olhe também a caixa de spam.');
    } catch { msgEntrar('Sem conexão. Tente de novo.', true); } finally { b.disabled = false; }
  });
  fc.addEventListener('submit', async e => {
    e.preventDefault();
    const b = fc.querySelector('button[type=submit]'); b.disabled = true; msgEntrar('Conferindo...');
    try {
      const d = await api({ acao: 'entrarCodigo', email: emailCodigo, codigo: $('#codigoEntrar').value });
      if (!d.ok) return msgEntrar(d.erro, true);
      aplicarLogin(d);
    } catch { msgEntrar('Sem conexão. Tente de novo.', true); } finally { b.disabled = false; }
  });
  $('#trocarEmail').addEventListener('click', () => { fc.hidden = true; fe.hidden = false; msgEntrar(''); $('#emailEntrar').focus(); });
  if (GOOGLE_ID) carregarGoogle().then(() => {
    const alvo = $('#gbtn'); if (!alvo || !window.google) return;
    google.accounts.id.initialize({ client_id: GOOGLE_ID, callback: entrarGoogle, ux_mode: 'popup', use_fedcm_for_prompt: true });
    google.accounts.id.renderButton(alvo, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'pt-BR', width: Math.min(320, alvo.clientWidth || 320) });
  }).catch(() => { const a = $('#gbtn'); if (a) a.innerHTML = '<small class="nota">Não consegui carregar o botão do Google. Use o código por e-mail.</small>'; });
}
let googleCarregando = null;
function carregarGoogle() {
  if (window.google && google.accounts) return Promise.resolve();
  return googleCarregando ||= new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = ok; s.onerror = falha;
    document.head.appendChild(s);
  });
}
async function entrarGoogle(resp) {
  msgEntrar('Entrando...');
  try {
    const d = await api({ acao: 'loginGoogle', credential: resp.credential });
    if (!d.ok) return msgEntrar(d.erro, true);
    aplicarLogin(d);
  } catch { msgEntrar('Sem conexão. Tente de novo.', true); }
}

// ---------- Feito para voce ----------
function aleatorioDoDia(id) { // mesmo sorteio o dia inteiro, para a lista nao mudar a cada toque
  let h = 2166136261; const s = id + new Date().toDateString() + quemVota();
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
function generosPreferidos() {
  const peso = {};
  for (const m of MUSICAS) {
    const p = (estado.plays[m.id] || 0) + (estado.favs.has(m.id) ? 3 : 0);
    if (p && m.genero !== SEM) peso[m.genero] = (peso[m.genero] || 0) + p;
  }
  return Object.entries(peso).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
function maisOuvidas(n) {
  return MUSICAS.filter(m => estado.plays[m.id]).sort((a, b) => estado.plays[b.id] - estado.plays[a.id]).slice(0, n);
}
function feitoParaVoce() {
  const gens = generosPreferidos().slice(0, 3);
  if (!gens.length) return [];
  const pesoG = Object.fromEntries(gens.map((g, i) => [g, 3 - i]));
  return MUSICAS.filter(m => pesoG[m.genero] || estado.favs.has(m.id))
    .map(m => ({ m, s: ((pesoG[m.genero] || 1) + (estado.favs.has(m.id) ? 1.5 : 0)) * (0.5 + aleatorioDoDia(m.id)) / (1 + (estado.plays[m.id] || 0) * 0.25) }))
    .sort((a, b) => b.s - a.s).slice(0, 20).map(x => x.m);
}
function secoesParaVoce() {
  const mix = feitoParaVoce(), top = maisOuvidas(10);
  if (!mix.length) return `<a class="chamada-voto" href="${conta ? '#/genero/' + encodeURIComponent(ORDEM[0]) : '#/voce'}">
      <span class="chamada-ico"><i data-lucide="sparkles"></i></span>
      <span><strong>Feito para você</strong><small>${conta ? 'Ouça algumas músicas e o Ecoo monta uma seleção com o que você mais curte.' : 'Entre com Google ou e-mail e o Ecoo monta uma seleção com o que você mais curte, em qualquer aparelho.'}</small></span>
      <i data-lucide="chevron-right"></i></a>`;
  const gens = generosPreferidos().slice(0, 3).join(', ');
  return `<section class="secao">
      <div class="secao-cab"><div><h2>Feito para você</h2><small>Mais ${esc(gens)}, renovado todo dia</small></div>
        <button class="btn btn-ouro" data-acao="mix"><i data-lucide="play"></i>Tocar</button></div>
      <div class="fileira">${mix.map(m => cardMusica(m, 'mix')).join('')}</div></section>
    ${top.length >= 3 ? `<section class="secao"><h2>Suas mais ouvidas</h2><div class="fileira">${top.map(m => cardMusica(m, 'top')).join('')}</div></section>` : ''}
    ${!conta ? `<p class="nota-conta"><a class="link" href="#/voce">Entre</a> para não perder essa seleção e suas favoritas se trocar de aparelho.</p>` : ''}`;
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
          <button class="btn btn-borda so-instalar" data-instalar><i data-lucide="download"></i>Instalar app</button>
        </div>
      </section>
      ${semN ? `<a class="chamada-voto" href="#/genero/${encodeURIComponent(SEM)}">
        <span class="chamada-ico"><i data-lucide="tags"></i></span>
        <span><strong>${semN} música${semN > 1 ? 's' : ''} sem gênero</strong><small>Ouça e diga em que gênero cada uma se encaixa. Você decide junto com a galera.</small></span>
        <i data-lucide="chevron-right"></i></a>` : ''}
      ${secoesParaVoce()}
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
    return `<div class="topo-pagina"><h1>Favoritas</h1><p>${conta ? 'Salvas na sua conta, em qualquer aparelho.' : 'Salvas neste aparelho. <a class="link" href="#/voce">Entre</a> para levar para qualquer aparelho.'}</p></div>
      ${listaVisivel.length ? `<div class="barra-acoes"><button class="btn-play-redondo" data-acao="lista" aria-label="Tocar favoritas"><i data-lucide="play"></i></button></div>` : ''}
      ${listaVisivel.length ? faixasHTML(listaVisivel, true) : `<div class="vazio"><i data-lucide="heart"></i><p>Toque no coração de uma música para ela aparecer aqui.</p></div>`}`;
  },
  voce() {
    if (!conta) return telaEntrar();
    const u = conta.usuario, top = maisOuvidas(10);
    listaVisivel = top;
    const total = Object.values(estado.plays).reduce((s, n) => s + n, 0);
    const gen = generosPreferidos()[0];
    const foto = u.foto && /^https:\/\//.test(u.foto)
      ? `<img class="avatar grande" src="${esc(u.foto)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="avatar grande">${esc((u.nome || '?').charAt(0).toUpperCase())}</span>`;
    return `<header class="perfil-topo">${foto}<div><small>Sua conta</small><h1>${esc(u.nome || 'Ouvinte')}</h1><p>${esc(u.email)}</p></div></header>
      <div class="resumo-voce">
        <div><strong>${total}</strong><span>músicas ouvidas</span></div>
        <div><strong>${estado.favs.size}</strong><span>favoritas</span></div>
        <div><strong>${gen ? esc(gen) : '—'}</strong><span>gênero que você mais ouve</span></div>
      </div>
      <section class="secao"><h2>Suas mais ouvidas</h2>
        ${top.length ? faixasHTML(top, true) : '<div class="vazio"><i data-lucide="headphones"></i><p>Ouça algumas músicas e elas aparecem aqui.</p></div>'}
      </section>
      <div class="barra-acoes"><button class="btn btn-borda" data-acao="sair"><i data-lucide="log-out"></i>Sair da conta</button></div>`;
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
  if (tipo === 'buscar' || tipo === 'favoritas' || tipo === 'voce') return render(tipo);
  if (!tipo) return render('inicio');
  render('naoAchou');
}
function render(tela, arg) {
  const c = $('#conteudo');
  c.innerHTML = telas[tela](arg);
  c.scrollTop = 0;
  document.querySelectorAll('[data-rota]').forEach(a => a.classList.toggle('ativo', a.dataset.rota === tela));
  document.querySelectorAll('#generosMenu a').forEach(a => a.classList.toggle('ativo', tela === 'genero' && a.dataset.g === arg));
  document.title = tela === 'genero' ? arg + ' · Ecoo' : 'Ecoo';
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
// ---------- Pre-carregamento ----------
// Com a tela apagada o celular corta ou atrasa a rede; por isso a proxima faixa
// e baixada inteira enquanto a atual toca, e a troca acontece sem precisar da rede.
const prontas = new Map(); // id -> blob URL
let baixando = null;
function idProxima() {
  if (!estado.fila.length) return null;
  if (estado.repetir === 'uma') return null;
  if (estado.pos < estado.fila.length - 1) return estado.fila[estado.pos + 1];
  return estado.repetir === 'todas' ? estado.fila[0] : null;
}
function mesmaOrigem(url) { try { return new URL(url, location.href).origin === location.origin; } catch { return false; } }
async function preCarregar() {
  const id = idProxima(), m = id && porId[id];
  if (!m || prontas.has(id) || baixando === id || !mesmaOrigem(m.audio)) return;
  baixando = id;
  try {
    const r = await fetch(m.audio);
    if (!r.ok) throw new Error(r.status);
    const url = URL.createObjectURL(await r.blob());
    prontas.set(id, url);
  } catch {} finally { if (baixando === id) baixando = null; }
  limparProntas();
}
function limparProntas() {
  const manter = new Set([estado.fila[estado.pos], idProxima()]);
  for (const [id, url] of prontas) if (!manter.has(id)) { URL.revokeObjectURL(url); prontas.delete(id); }
}

function abrir(tocar = true) {
  const m = porId[estado.fila[estado.pos]];
  if (!m) return;
  audio.src = prontas.get(m.id) || m.audio;
  if (tocar) audio.play().catch(() => {});
  limparProntas();
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
    navigator.mediaSession.metadata = new MediaMetadata({ title: m.titulo, artist: m.artista, album: m.genero + ' · Ecoo', artwork: art });
  }
}
function proxima(manual = true) {
  if (!estado.fila.length) return;
  if (!manual && estado.repetir === 'uma') { audio.currentTime = 0; audio.play(); return; }
  if (estado.pos < estado.fila.length - 1) estado.pos++;
  else if (estado.repetir === 'todas' || manual) estado.pos = 0;
  else { pausar(); return; }
  abrir(true);
}
// Pausa pedida pela pessoa (botao, fone, fim da fila). Qualquer outra pausa com o app
// em segundo plano foi o sistema do celular, e o app avisa como evitar.
let pausaPedida = false;
function pausar() { pausaPedida = true; audio.pause(); }
function anterior() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (estado.pos > 0) { estado.pos--; abrir(true); } else audio.currentTime = 0;
}
function alternar() { if (!audio.src) return carregarFila(MUSICAS.map(m => m.id)); audio.paused ? audio.play() : pausar(); }
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
  sincronizar();
  aviso(estado.favs.has(id) ? 'Salva nas favoritas' : 'Removida das favoritas');
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(b => b.classList.toggle('on', estado.favs.has(id)));
  atualizarFav();
  if (location.hash.startsWith('#/favoritas')) render('favoritas');
}
async function compartilhar(url, titulo) {
  try {
    if (navigator.share) { await navigator.share({ title: titulo, text: titulo + ' no Ecoo', url }); return; }
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
  // comeca a baixar a proxima alguns segundos depois do inicio
  if (audio.currentTime > 4 && !audio.paused) preCarregar();
  // posicao na tela de bloqueio (a cada ~5 s basta)
  if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && audio.duration && Date.now() - (posicaoEm || 0) > 5000) {
    posicaoEm = Date.now();
    try { navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate || 1 }); } catch {}
  }
});
let posicaoEm = 0;
audio.addEventListener('loadedmetadata', () => { $('#tTotal').textContent = $('#tcTotal').textContent = tempo(audio.duration); posicaoEm = 0; });
audio.addEventListener('play', () => { atualizarPlay(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });
audio.addEventListener('pause', () => { atualizarPlay(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
audio.addEventListener('ended', () => proxima(false));
audio.addEventListener('error', () => {
  if (!audio.src) return;
  const m = porId[estado.fila[estado.pos]];
  // o arquivo pre-carregado falhou: tenta direto pela rede antes de pular
  if (m && audio.src.startsWith('blob:')) { prontas.delete(m.id); audio.src = m.audio; audio.play().catch(() => {}); return; }
  aviso('Não consegui carregar essa música. Pulando.'); setTimeout(() => proxima(false), 800);
});
// rede travou no meio da musica (comum com a tela apagada): recarrega do ponto em que parou
let travadaDesde = 0;
['stalled', 'waiting'].forEach(ev => audio.addEventListener(ev, () => {
  if (audio.src.startsWith('blob:') || audio.paused) return;
  const ponto = audio.currentTime, quando = travadaDesde = Date.now();
  setTimeout(() => {
    if (travadaDesde !== quando || audio.paused || audio.currentTime > ponto + 0.5) return;
    audio.load(); audio.currentTime = ponto; audio.play().catch(() => {});
  }, 8000);
}));
audio.addEventListener('playing', () => { travadaDesde = 0; });

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
  if (solo) {
    const m = porId[solo.dataset.tocarSolo]; if (!m) return;
    // card de "Feito para voce" ou "Mais ouvidas" toca aquela lista; os outros, o genero
    const ctx = solo.dataset.ctx;
    const ids = (ctx === 'mix' ? feitoParaVoce() : ctx === 'top' ? maisOuvidas(10) : MUSICAS.filter(x => x.genero === m.genero)).map(x => x.id);
    return carregarFila(ids, Math.max(0, ids.indexOf(m.id)));
  }
  const ac = e.target.closest('[data-acao]');
  if (!ac) return;
  const todos = MUSICAS.map(m => m.id);
  if (ac.dataset.acao === 'tudo') carregarFila(todos);
  if (ac.dataset.acao === 'mix') carregarFila(feitoParaVoce().map(m => m.id));
  if (ac.dataset.acao === 'sair') sair();
  if (ac.dataset.acao === 'misturar') { estado.aleatorio = true; guardar('aleatorio', true); atualizarModos(); carregarFila(todos, Math.floor(Math.random() * todos.length)); }
  if (ac.dataset.acao === 'lista') carregarFila(listaVisivel.map(m => m.id));
  if (ac.dataset.acao === 'lista-mix') { estado.aleatorio = true; guardar('aleatorio', true); atualizarModos(); const ids = listaVisivel.map(m => m.id); carregarFila(ids, Math.floor(Math.random() * ids.length)); }
  if (ac.dataset.acao === 'link-genero') compartilhar(location.href.split('#')[0] + '#/genero/' + encodeURIComponent(ac.dataset.genero), ac.dataset.genero + ' no Ecoo');
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
  navigator.mediaSession.setActionHandler('pause', pausar);
  navigator.mediaSession.setActionHandler('nexttrack', () => proxima());
  navigator.mediaSession.setActionHandler('previoustrack', anterior);
  const acao = (nome, fn) => { try { navigator.mediaSession.setActionHandler(nome, fn); } catch {} };
  acao('seekto', d => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
  acao('seekbackward', d => { audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 10)); });
  acao('seekforward', d => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (d.seekOffset || 10)); });
}

// ---------- Tela apagada: Android x iPhone ----------
const ehIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ehAndroid = /Android/i.test(navigator.userAgent);
const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let paradaNoFundo = false;

audio.addEventListener('pause', () => {
  if (pausaPedida) { marcarSessao(false); pausaPedida = false; return; }
  if (!audio.ended && document.hidden) paradaNoFundo = true;
});
audio.addEventListener('play', () => { pausaPedida = false; paradaNoFundo = false; $('#dica').hidden = true; });
// batida a cada 10 s: se o sistema fechar o app com a tela apagada, na volta ele sabe
let batidaEm = 0;
audio.addEventListener('timeupdate', () => {
  if (Date.now() - batidaEm > 10000) marcarSessao(true);
  // conta como "ouvida" depois de 30 s (ou metade, em musica curta)
  const id = estado.fila[estado.pos];
  if (id && contadaId !== id && audio.currentTime >= Math.min(30, (audio.duration || 60) / 2)) { contadaId = id; contar(id); }
});
let contadaId = null;
audio.addEventListener('emptied', () => { contadaId = null; });
function marcarSessao(tocando) {
  batidaEm = Date.now();
  const id = estado.fila[estado.pos];
  guardar('sessao', tocando && id ? { id, t: Math.floor(audio.currentTime), em: Date.now(), oculto: document.hidden, fila: estado.fila.slice(0, 200), pos: estado.pos } : null);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (!audio.paused) marcarSessao(true); return; }
  if (paradaNoFundo && audio.paused) mostrarDica(false);
  paradaNoFundo = false;
});
function textoDica() {
  if (ehIOS && instalado) return {
    titulo: 'O iPhone pausou o Ecoo quando a tela apagou',
    texto: 'No iPhone, o app instalado na tela de início para de tocar com a tela bloqueada. Abra o Ecoo pelo Safari: lá ele continua tocando com a tela apagada e aparece no controle da tela de bloqueio.',
    extra: 'Copiar link para abrir no Safari',
  };
  if (ehIOS) return {
    titulo: 'O iPhone pausou o Ecoo',
    texto: 'Para tocar com a tela bloqueada, deixe o Ecoo aberto no Safari, não feche a aba, e use os controles da tela de bloqueio. O Modo de Pouca Energia também pode pausar a música.',
  };
  if (ehAndroid) return {
    titulo: 'O celular pausou o Ecoo para economizar bateria',
    texto: `Para não acontecer de novo: Configurações > Apps > ${instalado ? 'Ecoo' : 'Chrome'} > Bateria > Sem restrições. Em alguns celulares o nome é "Não otimizar".`,
  };
  return { titulo: 'A música parou enquanto o app estava em segundo plano', texto: 'Toque em continuar para voltar de onde parou.' };
}
function mostrarDica(recuperar) {
  const d = textoDica();
  $('#dicaTitulo').textContent = d.titulo;
  $('#dicaTexto').textContent = d.texto;
  $('#dicaExtra').hidden = !d.extra;
  if (d.extra) $('#dicaExtra').querySelector('span').textContent = d.extra;
  $('#dica').dataset.recuperar = recuperar ? '1' : '';
  $('#dica').hidden = false; icones();
}
$('#dica').addEventListener('click', async e => {
  if (e.target.closest('#dicaContinuar')) {
    $('#dica').hidden = true;
    const s = ler('sessao', null);
    if ($('#dica').dataset.recuperar && s && porId[s.id]) {
      const fila = (s.fila || [s.id]).filter(id => porId[id]);
      estado.fila = fila.length ? fila : [s.id]; estado.pos = Math.max(0, estado.fila.indexOf(s.id)); estado.ordemOriginal = estado.fila.slice();
      abrir(true);
      audio.addEventListener('loadedmetadata', () => { audio.currentTime = s.t || 0; }, { once: true });
    } else audio.play().catch(() => {});
  }
  if (e.target.closest('#dicaExtra')) {
    const url = location.href.split('#')[0];
    try { await navigator.clipboard.writeText(url); aviso('Link copiado. Cole no Safari.'); } catch { aviso(url); }
  }
  if (e.target.closest('#dicaFechar')) $('#dica').hidden = true;
});

// Android/Chrome: botao de instalar o app
let pedidoInstalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalar = e; document.body.classList.add('pode-instalar'); });
window.addEventListener('appinstalled', () => { pedidoInstalar = null; document.body.classList.remove('pode-instalar'); aviso('Ecoo instalado. Ele aparece junto dos seus apps.'); });
document.addEventListener('click', async e => {
  if (!e.target.closest('[data-instalar]') || !pedidoInstalar) return;
  pedidoInstalar.prompt();
  try { await pedidoInstalar.userChoice; } catch {}
  pedidoInstalar = null; document.body.classList.remove('pode-instalar');
});

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
  atualizarContaUI();
  conferirConta();
  // o sistema fechou o app enquanto tocava com a tela apagada: oferece continuar
  const s = ler('sessao', null);
  if (s && s.oculto && Date.now() - s.em < 3 * 3600 * 1000 && porId[s.id]) mostrarDica(true);
  setInterval(() => { if (!document.hidden) buscarVotos(); }, 90000);
}).catch(() => { $('#conteudo').innerHTML = '<div class="vazio"><p>Não consegui carregar as músicas. Atualize a página.</p></div>'; });

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
