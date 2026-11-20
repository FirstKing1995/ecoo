// Ecoo Admin: editor de letra sincronizada. Usa as variaveis do admin.html (API, post, est, todas, msg...).
// Formato no texto: uma linha por verso, com o tempo na frente: [1:23.4] texto
// Linha so com o tempo ([1:23.4]) = pausa instrumental (vira os tres pontinhos no app).
const ESPACOS_IA = ['cjj-on-hf-faster-whisper-webui.hf.space', 'wong26-faster-whisper-webui.hf.space', 'olivier-truong-faster-whisper-webui-v2.hf.space'];
let edM = null, edLinhas = [], edMarca = 0, edMarcando = false;
const edAudio = new Audio();

document.body.insertAdjacentHTML('beforeend', `
<div class="ed-fundo" id="edLetra" hidden>
  <div class="ed-caixa" role="dialog" aria-modal="true" aria-labelledby="edTitulo">
    <div class="ed-topo">
      <div><h2 id="edTitulo"></h2><p id="edInfo"></p></div>
      <button class="ico" id="edFechar" aria-label="Fechar"><i data-lucide="x"></i></button>
    </div>
    <div class="ed-player">
      <button class="ico play" id="edPlay" aria-label="Tocar"><i data-lucide="play"></i></button>
      <span id="edTempo">0:00.0</span>
      <input type="range" id="edBarra" min="0" max="1000" value="0" aria-label="Posição">
      <button class="btn btn-borda" id="edVoltar" title="Voltar 5 segundos"><i data-lucide="rotate-ccw"></i>5 s</button>
    </div>
    <div class="ed-corpo">
      <div class="ed-col">
        <label for="edTexto">Texto (uma linha por verso, com o tempo na frente)</label>
        <textarea id="edTexto" spellcheck="true"></textarea>
      </div>
      <div class="ed-col">
        <label>Como fica no app (toque numa linha para ouvir dali)</label>
        <div class="ed-previa" id="edPrevia"></div>
      </div>
    </div>
    <div class="ed-marcar" id="edMarcarInfo"></div>
    <div class="ed-acoes">
      <button class="btn btn-borda" id="edIA"><i data-lucide="sparkles"></i>Gerar com IA</button>
      <button class="btn btn-borda" id="edMarcar"><i data-lucide="timer"></i>Acertar os tempos</button>
      <button class="btn btn-borda" id="edVoltarIA" hidden><i data-lucide="undo-2"></i>Voltar para a versão da IA</button>
      <span class="ed-espaco"></span>
      <button class="btn btn-ouro" id="edSalvar"><i data-lucide="check"></i>Salvar</button>
    </div>
  </div>
</div>`);

const edCss = document.createElement('style');
edCss.textContent = `
.ed-fundo { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,.7); display: grid; place-items: center; padding: 16px; }
.ed-caixa { width: min(1000px, 100%); max-height: calc(100dvh - 32px); overflow: auto; background: var(--painel); border: 1px solid var(--linha); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.ed-topo { display: flex; justify-content: space-between; gap: 12px; }
.ed-topo h2 { margin: 0; font-size: 22px; } .ed-topo p { margin: 4px 0 0; color: var(--texto-2); font-size: 13px; }
.ed-player { display: flex; align-items: center; gap: 12px; }
.ed-player #edTempo { font-variant-numeric: tabular-nums; color: var(--texto-2); width: 56px; }
.ed-player input { flex: 1; }
.ed-corpo { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.ed-col { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ed-col label { font-size: 12px; color: var(--texto-2); font-weight: 600; }
#edTexto, .ed-previa { height: 46vh; min-height: 260px; border-radius: 10px; border: 1px solid var(--linha); background: var(--fundo); color: var(--texto); }
#edTexto { font: 14px/1.6 ui-monospace, Consolas, monospace; padding: 10px 12px; resize: vertical; }
#edTexto:focus { outline: none; border-color: var(--ouro); }
.ed-previa { overflow: auto; padding: 10px 12px; }
.ed-previa p { margin: 0; padding: 5px 8px; border-radius: 8px; cursor: pointer; color: var(--texto-2); display: flex; gap: 10px; }
.ed-previa p b { font-weight: 500; font-variant-numeric: tabular-nums; color: #6f675a; width: 52px; flex: none; }
.ed-previa p:hover { background: var(--painel-2); }
.ed-previa p.agora { color: var(--texto); font-weight: 700; }
.ed-previa p.alvo { outline: 2px solid var(--ouro); }
.ed-previa p.sem-tempo b { color: #ff8a7a; }
.ed-marcar { color: var(--ouro); font-weight: 600; min-height: 20px; font-size: 14px; }
.ed-acoes { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.ed-espaco { flex: 1; }
#edMarcar.on { background: var(--ouro); color: #1a1205; border-color: var(--ouro); }
@media (max-width: 760px) { .ed-corpo { grid-template-columns: 1fr; } #edTexto, .ed-previa { height: 34vh; } }`;
document.head.appendChild(edCss);

// ---------- texto <-> linhas ----------
const fmt = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = (t - m * 60).toFixed(1); return m + ':' + (s < 10 ? '0' : '') + s; };
function paraTexto(linhas) { return linhas.map(l => `[${isFinite(l[0]) ? fmt(l[0]) : '?'}] ${l[1] || ''}`.trimEnd()).join('\n'); }
function lerTexto() {
  return $('#edTexto').value.split('\n').map(s => {
    const r = s.match(/^\s*\[(?:(\d+):(\d+(?:[.,]\d+)?)|\?)?\]\s?(.*)$/);
    if (r) return [r[1] !== undefined ? +r[1] * 60 + parseFloat(r[2].replace(',', '.')) : NaN, r[3].trim()];
    return s.trim() ? [NaN, s.trim()] : null; // verso sem tempo: precisa acertar
  }).filter(Boolean);
}
function desenharPrevia() {
  edLinhas = lerTexto();
  const t = edAudio.currentTime;
  let atual = -1;
  edLinhas.forEach((l, i) => { if (isFinite(l[0]) && l[0] <= t + 0.2) atual = i; });
  $('#edPrevia').innerHTML = edLinhas.map((l, i) => `<p data-i="${i}" class="${i === atual ? 'agora' : ''} ${edMarcando && i === edMarca ? 'alvo' : ''} ${isFinite(l[0]) ? '' : 'sem-tempo'}"><b>${isFinite(l[0]) ? fmt(l[0]) : 'sem tempo'}</b><span>${l[1] ? esc(l[1]) : '· · ·'}</span></p>`).join('');
  const alvo = $('#edPrevia').querySelector(edMarcando ? '.alvo' : '.agora');
  if (alvo && !edAudio.paused) alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const semTempo = edLinhas.filter(l => !isFinite(l[0])).length;
  $('#edMarcarInfo').textContent = edMarcando
    ? `Marcando: aperte ESPAÇO (ou o botão Marcar) quando a linha em destaque começar a ser cantada. Linha ${Math.min(edMarca + 1, edLinhas.length)} de ${edLinhas.length}.`
    : semTempo ? `${semTempo} linha${semTempo > 1 ? 's' : ''} sem tempo. Use "Acertar os tempos" para marcar.` : '';
}

// ---------- abrir ----------
async function audioDe(m) {
  if (!m.enviada) return m.audio;
  const d = await (await fetch(API + '?audio=' + encodeURIComponent(m.id))).json();
  if (!d.ok) throw new Error('áudio');
  const bin = atob(d.dados), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: d.mime }));
}
async function abrirEditor(m) {
  edM = m; edMarcando = false; edMarca = 0;
  $('#edTitulo').textContent = m.titulo;
  $('#edInfo').textContent = 'Carregando...';
  $('#edTexto').value = '';
  $('#edLetra').hidden = false; icones();
  try { player.pause(); } catch {}
  edAudio.pause(); edAudio.removeAttribute('src');
  const corrigida = (est.letras || {})[m.id];
  let d = null, origem = '';
  try {
    if (corrigida) { const r = await (await fetch(API + '?letra=' + encodeURIComponent(m.id))).json(); if (r.ok && r.linhas) { d = r; origem = 'Versão corrigida por você.'; } }
    if (!d && m.letra) { const r = await (await fetch('letras/' + m.id + '.json?v=' + Date.now())).json(); d = r; origem = 'Versão escrita pela IA, ainda não revisada.'; }
  } catch {}
  $('#edTexto').value = d ? paraTexto(d.linhas) : '';
  $('#edInfo').textContent = d ? origem : 'Sem letra ainda. Cole a letra aqui (uma linha por verso) ou use "Gerar com IA".';
  $('#edVoltarIA').hidden = !(corrigida && m.letra);
  atualizarMarcar(); desenharPrevia();
  audioDe(m).then(u => { if (edM === m) edAudio.src = u; }).catch(() => msg('Não consegui carregar o áudio dessa música.', true));
}
function fecharEditor() { edAudio.pause(); $('#edLetra').hidden = true; edMarcando = false; }

// ---------- player do editor ----------
$('#edPlay').addEventListener('click', () => edAudio.paused ? edAudio.play().catch(() => {}) : edAudio.pause());
$('#edVoltar').addEventListener('click', () => { edAudio.currentTime = Math.max(0, edAudio.currentTime - 5); });
$('#edBarra').addEventListener('input', e => { if (edAudio.duration) edAudio.currentTime = e.target.value / 1000 * edAudio.duration; });
['play', 'pause'].forEach(ev => edAudio.addEventListener(ev, () => { $('#edPlay').innerHTML = `<i data-lucide="${edAudio.paused ? 'play' : 'pause'}"></i>`; icones(); }));
edAudio.addEventListener('timeupdate', () => {
  $('#edTempo').textContent = fmt(edAudio.currentTime);
  if (edAudio.duration) $('#edBarra').value = edAudio.currentTime / edAudio.duration * 1000;
  desenharPrevia();
});
$('#edTexto').addEventListener('input', desenharPrevia);
$('#edPrevia').addEventListener('click', e => {
  const p = e.target.closest('p[data-i]'); if (!p) return;
  const i = +p.dataset.i, l = edLinhas[i];
  if (edMarcando) { edMarca = i; if (isFinite(l[0])) edAudio.currentTime = Math.max(0, l[0] - 2); desenharPrevia(); return; }
  if (isFinite(l[0])) { edAudio.currentTime = l[0]; edAudio.play().catch(() => {}); }
});
$('#edFechar').addEventListener('click', fecharEditor);
$('#edLetra').addEventListener('click', e => { if (e.target.id === 'edLetra') fecharEditor(); });

// ---------- marcar tempos ----------
function atualizarMarcar() {
  $('#edMarcar').classList.toggle('on', edMarcando);
  $('#edMarcar').innerHTML = edMarcando ? '<i data-lucide="hand"></i>Marcar (espaço)' : '<i data-lucide="timer"></i>Acertar os tempos';
  $('#edTexto').readOnly = edMarcando;
  icones();
}
function marcar() {
  edLinhas = lerTexto();
  if (edMarca >= edLinhas.length) { edMarcando = false; atualizarMarcar(); desenharPrevia(); return msg('Todas as linhas marcadas. Confira e clique em Salvar.'); }
  edLinhas[edMarca][0] = Math.round(edAudio.currentTime * 10) / 10;
  $('#edTexto').value = paraTexto(edLinhas);
  edMarca++;
  if (edMarca >= edLinhas.length) { edMarcando = false; atualizarMarcar(); msg('Todas as linhas marcadas. Confira e clique em Salvar.'); }
  desenharPrevia();
}
$('#edMarcar').addEventListener('click', e => {
  if (edMarcando && e.detail === 0) return; // espaco com o foco no botao: o keydown ja marcou
  if (!edMarcando) {
    if (!lerTexto().length) return msg('Escreva ou cole a letra primeiro.', true);
    edMarcando = true;
    // comeca da primeira linha sem tempo, ou do inicio
    const l = lerTexto(), semTempo = l.findIndex(x => !isFinite(x[0]));
    edMarca = semTempo >= 0 ? semTempo : 0;
    edAudio.currentTime = edMarca > 0 && isFinite(l[edMarca - 1][0]) ? l[edMarca - 1][0] : 0;
    edAudio.play().catch(() => {});
    atualizarMarcar(); desenharPrevia();
    return;
  }
  marcar();
});
document.addEventListener('keydown', e => {
  if ($('#edLetra').hidden) return;
  if (e.key === 'Escape') { if (edMarcando) { edMarcando = false; atualizarMarcar(); desenharPrevia(); } else fecharEditor(); return; }
  if (edMarcando && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); marcar(); }
});

// ---------- salvar ----------
$('#edSalvar').addEventListener('click', async () => {
  const linhas = lerTexto();
  if (linhas.some(l => !isFinite(l[0]))) return msg('Tem linha sem tempo. Use "Acertar os tempos" antes de salvar.', true);
  if (!linhas.some(l => l[1])) return msg('A letra está vazia.', true);
  $('#edSalvar').disabled = true; msg('Salvando a letra...');
  try { est = await post({ acao: 'salvarLetra', id: edM.id, linhas, revisada: true }); msg('Letra salva. Quem abrir a música já vê a versão nova.'); fecharEditor(); desenhar(); }
  catch (e) { msg(e.message === 'Failed to fetch' ? 'Sem conexão com o servidor.' : e.message, true); }
  $('#edSalvar').disabled = false;
});
$('#edVoltarIA').addEventListener('click', async () => {
  if (!confirm('Apagar a sua correção e voltar a mostrar a letra que a IA escreveu?')) return;
  try { est = await post({ acao: 'apagarLetra', id: edM.id }); msg('Voltou para a versão da IA.'); const m = edM; fecharEditor(); desenhar(); abrirEditor(todas().find(x => x.id === m.id) || m); }
  catch (e) { msg(e.message, true); }
});

// ---------- gerar com IA (Whisper num Space gratuito do Hugging Face) ----------
async function base64DoAudio(m) {
  const url = await audioDe(m);
  const blob = await (await fetch(url)).blob();
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ dados: r.result, tamanho: blob.size }); r.onerror = rej; r.readAsDataURL(blob); });
}
function transcrever(host, arq) {
  return new Promise((res, rej) => {
    const ws = new WebSocket('wss://' + host + '/queue/join'), sessao = Math.random().toString(36).slice(2, 13);
    const desistir = setTimeout(() => { ws.close(); rej(new Error('demorou demais')); }, 20 * 60000);
    ws.onerror = () => { clearTimeout(desistir); rej(new Error('sem conexão')); };
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.msg === 'send_hash') ws.send(JSON.stringify({ fn_index: 0, session_hash: sessao }));
      else if (m.msg === 'send_data') ws.send(JSON.stringify({ fn_index: 0, session_hash: sessao, event_data: null,
        data: ['medium', 'Portuguese', '', [arq], null, 'transcribe', 'none', 5, 30, false, false, false, 2] }));
      else if (m.msg === 'estimation') $('#edInfo').textContent = 'A IA está ouvindo a música' + (m.rank ? ` (${m.rank} na fila)` : '') + '... leva de 1 a 3 minutos.';
      else if (m.msg === 'queue_full') { clearTimeout(desistir); ws.close(); rej(new Error('fila cheia')); }
      else if (m.msg === 'process_completed') {
        clearTimeout(desistir); ws.close();
        if (!m.success || !m.output || !m.output.data) return rej(new Error('falhou'));
        const arqs = [].concat(m.output.data[0] || []);
        const json = arqs.find(a => a && /\.json$/.test(a.name || ''));
        if (!json) return rej(new Error('sem resultado'));
        fetch('https://' + host + '/file=' + json.name).then(r => r.json()).then(r => res(r.segments || [])).catch(rej);
      }
    };
  });
}
const LIXO_IA = [/^\[.*\]$/, /^\(.*\)$/, /amara\.org/i, /legendas? (pela|por)/i, /obrigad[oa] por assistir/i, /inscreva-se/i, /^\W*$/];
function segmentosParaLinhas(segs) {
  const linhas = []; let fim = 0;
  for (const s of segs) {
    const txt = String(s.text || '').replace(/\s+/g, ' ').trim();
    if (!txt || LIXO_IA.some(r => r.test(txt))) continue;
    if (linhas.length && s.start - fim > 7) linhas.push([Math.round((fim + 0.5) * 10) / 10, '']);
    // a IA as vezes junta dois versos: separa onde comeca uma palavra maiuscula no meio da linha
    const partes = txt.length > 38 ? txt.split(/(?<=[a-zà-ú,!?.…])\s+(?=[A-ZÀ-Ú])/) : [txt];
    if (partes.length < 2 || partes.some(p => p.length < 10)) linhas.push([Math.round(s.start * 10) / 10, txt]);
    else {
      const total = partes.reduce((n, p) => n + p.length, 0), dur = Math.max(0.5, s.end - s.start);
      let t = s.start;
      for (const p of partes) { linhas.push([Math.round(t * 10) / 10, p]); t += dur * p.length / total; }
    }
    fim = s.end;
  }
  return linhas;
}
$('#edIA').addEventListener('click', async () => {
  if (lerTexto().some(l => l[1]) && !confirm('Trocar o texto atual pelo que a IA escrever?')) return;
  const m = edM;
  $('#edIA').disabled = true;
  $('#edInfo').textContent = 'Preparando o áudio...';
  try {
    const { dados, tamanho } = await base64DoAudio(m);
    const arq = { name: m.id + '.mp3', data: dados, size: tamanho, is_file: false, orig_name: m.id + '.mp3' };
    let segs = null, erro = null;
    for (const host of ESPACOS_IA) {
      try { $('#edInfo').textContent = 'Mandando para a IA...'; segs = await transcrever(host, arq); break; } catch (e) { erro = e; }
    }
    if (!segs) throw erro || new Error('falhou');
    if (edM !== m) return;
    const linhas = segmentosParaLinhas(segs);
    if (!linhas.some(l => l[1])) { $('#edInfo').textContent = 'A IA não encontrou voz nessa música.'; return; }
    $('#edTexto').value = paraTexto(linhas);
    $('#edInfo').textContent = 'A IA escreveu a letra. Ouça, corrija o que estiver errado e clique em Salvar.';
    desenharPrevia();
  } catch (e) {
    $('#edInfo').textContent = 'A IA não respondeu agora (os serviços gratuitos às vezes ficam fora do ar). Tente de novo mais tarde ou cole a letra à mão.';
  } finally { $('#edIA').disabled = false; }
});

// botao "Letra" em cada musica da lista
$('#lista').addEventListener('click', e => {
  const b = e.target.closest('[data-letra]'); if (!b) return;
  const m = todas().find(x => x.id === b.dataset.letra);
  if (m) abrirEditor(m);
});
