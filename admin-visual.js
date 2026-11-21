// Ecoo Admin: modo visual. Escolher a cena de cada musica e medir a batida das musicas enviadas
// (mesma conta do tools/ritmo.py, feita aqui no navegador). Usa as variaveis do admin.html.
const CENAS_ADM = { '': 'Automática', festa: 'Festa', fumaca: 'Brisa', amor: 'Amor', chuva: 'Chuva', noite: 'Noite', fogo: 'Fogo', ritual: 'Ritual', cosmos: 'Cosmos', topo: 'Amanhecer', neon: 'Neon' };

// ---------- conta do ritmo ----------
function fft(re, im) { // radix-2 no lugar
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
function percentil(v, p) { const s = Array.from(v).sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] || 1; }
function envelope(v, fpsOrig, fps = 20) {
  const n = Math.floor(v.length / fpsOrig * fps), saida = new Float32Array(n), alto = percentil(v, 97) || 1;
  for (let i = 0; i < n; i++) { const x = i / fps * fpsOrig, k = Math.floor(x), f = x - k; saida[i] = Math.min(1, ((v[k] || 0) * (1 - f) + (v[k + 1] || 0) * f) / alto); }
  return Array.from(saida, x => B36[Math.round(x * 35)]).join('');
}
async function medirRitmo(buffer) {
  const ctxA = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 22050);
  const audioB = await ctxA.decodeAudioData(buffer);
  // mistura em mono e reduz para ~22 kHz
  const sr0 = audioB.sampleRate, passo = Math.max(1, Math.round(sr0 / 22050)), SR = sr0 / passo;
  const ch = Array.from({ length: audioB.numberOfChannels }, (_, i) => audioB.getChannelData(i));
  const N = Math.floor(audioB.length / passo), x = new Float32Array(N);
  for (let i = 0; i < N; i++) { let s = 0; for (const c of ch) s += c[i * passo]; x[i] = s / ch.length; }
  const NFFT = 2048, HOP = 512, nq = 1 + Math.floor((N - NFFT) / HOP), fpsS = SR / HOP;
  const jan = new Float32Array(NFFT).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NFFT));
  const binHz = SR / NFFT, g0 = Math.ceil(30 / binHz), g1 = Math.floor(160 / binHz), a0 = Math.ceil(3000 / binHz), a1 = Math.floor(10000 / binHz);
  const rms = new Float32Array(nq), grav = new Float32Array(nq), agu = new Float32Array(nq), fluxo = new Float32Array(nq);
  let antes = new Float32Array(NFFT / 2 + 1);
  const re = new Float32Array(NFFT), im = new Float32Array(NFFT);
  for (let q = 0; q < nq; q++) {
    const o = q * HOP;
    for (let i = 0; i < NFFT; i++) { re[i] = x[o + i] * jan[i]; im[i] = 0; }
    fft(re, im);
    let soma2 = 0, g = 0, a = 0, fl = 0;
    const agora = new Float32Array(NFFT / 2 + 1);
    for (let k = 0; k <= NFFT / 2; k++) {
      const mag = Math.hypot(re[k], im[k]); soma2 += mag * mag;
      if (k >= g0 && k < g1) g += mag; if (k >= a0 && k < a1) a += mag;
      const l = Math.log1p(10 * mag); agora[k] = l; if (l > antes[k]) fl += l - antes[k];
    }
    antes = agora; rms[q] = Math.sqrt(soma2); grav[q] = g; agu[q] = a; fluxo[q] = fl;
    if (q % 400 === 0) await new Promise(r => setTimeout(r)); // deixa a tela respirar
  }
  // tira a media local e normaliza
  const on = new Float32Array(nq); let mx = 0;
  for (let i = 0; i < nq; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - 8); j < Math.min(nq, i + 8); j++) { s += fluxo[j]; c++; } on[i] = Math.max(0, fluxo[i] - s / c); mx = Math.max(mx, on[i]); }
  for (let i = 0; i < nq; i++) on[i] /= mx || 1;
  // tempo pela autocorrelacao (preferindo perto de 115 BPM)
  let media = 0; for (const v of on) media += v; media /= nq;
  let melhor = -Infinity, lag = 20;
  const lagMin = Math.floor(60 * fpsS / 185), lagMax = Math.ceil(60 * fpsS / 65);
  const ac = new Float32Array(lagMax + 2);
  for (let L = lagMin - 1; L <= lagMax + 1; L++) { let s = 0; for (let i = 0; i + L < nq; i++) s += (on[i] - media) * (on[i + L] - media); ac[L] = s; }
  for (let L = lagMin; L <= lagMax; L++) { const bpmL = 60 * fpsS / L, peso = Math.exp(-0.5 * (Math.log2(bpmL / 115) / 0.9) ** 2); if (ac[L] * peso > melhor) { melhor = ac[L] * peso; lag = L; } }
  const a_ = ac[lag - 1], b_ = ac[lag], c_ = ac[lag + 1], den = a_ - 2 * b_ + c_;
  const periodo = lag + (den ? 0.5 * (a_ - c_) / den : 0), bpm = 60 * fpsS / periodo;
  // batidas por programacao dinamica
  const pont = Float64Array.from(on), ant = new Int32Array(nq).fill(-1);
  const j0 = -Math.round(2 * periodo), j1 = -Math.round(periodo / 2);
  for (let i = 0; i < nq; i++) {
    let best = -Infinity, bj = -1;
    for (let d = j0; d <= j1; d++) { const j = i + d; if (j < 0) continue; const v = pont[j] - 100 * Math.log(-d / periodo) ** 2; if (v > best) { best = v; bj = j; } }
    if (bj >= 0) { pont[i] = on[i] + best; ant[i] = bj; }
  }
  let fim = nq - 1, top = -Infinity;
  for (let i = Math.max(0, nq - Math.round(periodo * 2)); i < nq; i++) if (pont[i] > top) { top = pont[i]; fim = i; }
  const batidas = [];
  while (fim >= 0) { batidas.push(Math.round(fim / fpsS * 1000) / 1000); fim = ant[fim]; }
  batidas.reverse();
  return { bpm: Math.round(bpm * 10) / 10, batidas, fps: 20, e: envelope(rms, fpsS), g: envelope(grav, fpsS), a: envelope(agu, fpsS) };
}

async function medirESalvar(id, buffer) {
  const ritmo = await medirRitmo(buffer);
  est = await post({ acao: 'salvarRitmo', id, ritmo });
  return ritmo;
}
// depois de enviar uma musica: mede usando o proprio arquivo (sem baixar de novo)
window.medirDepois = async (id, arquivo) => {
  if (!id || !arquivo) return;
  try { msg('Medindo a batida de ' + arquivo.name + '...'); await medirESalvar(id, await arquivo.arrayBuffer()); msg('Batida medida. O modo visual já acompanha a música.'); desenhar(); }
  catch (e) { msg('A música foi enviada, mas não consegui medir a batida. Use "Medir batida" na lista.', true); }
};

// ---------- na lista de musicas ----------
const antesDesenhar = desenhar;
desenhar = function () {
  antesDesenhar();
  document.querySelectorAll('#lista .linha').forEach(l => {
    const id = l.dataset.id, m = todas().find(x => x.id === id); if (!m) return;
    const atual = (est.cenas || {})[id] || '';
    const auto = m.cena ? CENAS_ADM[m.cena] : 'pelo gênero';
    const ops = Object.entries(CENAS_ADM).map(([k, v]) => `<option value="${k}" ${k === atual ? 'selected' : ''}>${k ? v : 'Animação: automática (' + esc(auto) + ')'}</option>`).join('');
    const mini = l.querySelector('.mini');
    mini.insertAdjacentHTML('beforeend', `<select class="sel-cena" data-cena="${esc(id)}" aria-label="Animação de ${esc(m.titulo)}">${ops}</select>` +
      (m.enviada ? `<button data-medir="${esc(id)}"><i data-lucide="activity"></i>${(est.ritmos || {})[id] ? 'Medir de novo' : 'Medir batida'}</button>` : ''));
  });
  icones();
};
$('#lista').addEventListener('change', e => {
  const s = e.target.closest('select[data-cena]'); if (!s) return;
  e.stopPropagation();
  acao({ acao: 'fixarCena', id: s.dataset.cena, cena: s.value }, s.value ? 'Animação trocada para ' + CENAS_ADM[s.value] + '.' : 'Animação voltou para a automática.');
}, true);
$('#lista').addEventListener('click', async e => {
  const b = e.target.closest('[data-medir]'); if (!b) return;
  const m = todas().find(x => x.id === b.dataset.medir); if (!m) return;
  b.disabled = true; msg('Baixando ' + m.titulo + ' para medir a batida...');
  try {
    const d = await (await fetch(API + '?audio=' + encodeURIComponent(m.id))).json();
    if (!d.ok) throw 0;
    const bin = atob(d.dados), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    msg('Medindo a batida de ' + m.titulo + '...');
    const r = await medirESalvar(m.id, bytes.buffer);
    msg(`Batida medida: ${Math.round(r.bpm)} batidas por minuto.`); desenhar();
  } catch { msg('Não consegui medir a batida dessa música.', true); }
  b.disabled = false;
});
if (est) desenhar();
