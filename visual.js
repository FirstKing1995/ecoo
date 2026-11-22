// Ecoo: modo visual. Animacao em tela cheia que segue a batida da musica (ritmo medido antes,
// em site/ritmo/<id>.json) e reage a letra. Nao usa Web Audio para nao atrapalhar o som com a tela apagada.
// Carregado depois de app.js, biblioteca.js e letra.js.
(() => {
const CENAS_GENERO = { 'Eletrônica': 'neon', 'Funk': 'festa', 'Melancólicas': 'chuva', 'Pontos': 'ritual', 'Wicca': 'ritual',
  'R&B': 'amor', 'Rap': 'fogo', 'Reggae': 'fumaca', 'Rock': 'fogo', 'Sertanejo': 'amor' };
const NOMES = { festa: 'Festa', fumaca: 'Brisa', amor: 'Amor', chuva: 'Chuva', noite: 'Noite', fogo: 'Fogo', ritual: 'Ritual', cosmos: 'Cosmos', topo: 'Amanhecer', neon: 'Neon' };
// palavras da letra que soltam efeitos na tela
const GATILHOS = [
  [/cora[çc]|amor|beij|paix|love|heart|kiss|te quero|carinho/i, 'coracao'],
  [/fogo|queim|chama|fire|burn|quente|calor|inferno/i, 'faisca'],
  [/lua|estrela|c[eé]u|noite|star|moon|brilh|prata/i, 'estrela'],
  [/chuva|chor|l[aá]grima|mar|[aá]gua|rain|tears|oceano/i, 'gota'],
  [/festa|brind|copo|dan[çc]|balada|party|comemor|pula|toast/i, 'confete'],
  [/fuma|brisa|nuvem|leve|smoke|vento|flutu/i, 'fumaca'],
  [/dinheiro|grana|cash|ouro|rico|money|coroa|rei|king/i, 'moeda'],
  [/sol|dia|manh[aã]|luz|sun|light|morning/i, 'raio'],
];

const $v = s => document.querySelector(s);
const ehTV = document.documentElement.classList.contains('tv');
document.body.insertAdjacentHTML('beforeend', `
<div class="modo-visual" id="modoVisual" hidden>
  <canvas id="mvTela"></canvas>
  <div class="mv-topo">
    <button class="ico" id="mvFechar" aria-label="Sair do modo visual"><i data-lucide="minimize-2"></i></button>
    <div class="mv-nome"><strong id="mvTitulo"></strong><span id="mvArtista"></span></div>
    <button class="mv-cena" id="mvCena" title="Trocar entre a Jornada e as cenas clássicas"></button>
  </div>
  <div class="mv-letra" id="mvLetra" aria-live="off"><p class="mv-atual" id="mvAtual"></p><p class="mv-prox" id="mvProx"></p></div>
  <div class="mv-baixo">
    <input type="range" id="mvProgresso" min="0" max="1000" value="0" aria-label="Posição da música">
    <div class="mv-botoes">
      <button class="ico" id="mvAnterior" aria-label="Anterior"><i data-lucide="skip-back"></i></button>
      <button class="ico play" id="mvPlay" aria-label="Tocar"><i data-lucide="pause"></i></button>
      <button class="ico" id="mvProxima" aria-label="Próxima"><i data-lucide="skip-forward"></i></button>
    </div>
  </div>
</div>`);

const tela = $v('#mvTela'), ctx = tela.getContext('2d');
let W = 0, H = 0, DPR = 1, quadro = 0, ultimo = 0, aberto = false, ocultarEm = 0, travaTela = null;
let M = null, R = null, cena = null, nomeCena = '', batidaIdx = -1, pulso = 0, forcaBatida = 0, tremor = 0, flash = 0, flashCor = '255,255,255';
let matiz = 0, energiaLenta = 0, letraDados = null, linhaIdx = -2;
// Jornada (mundo.js, em WebGL) ou cenas classicas; a pessoa escolhe no botao do topo e fica lembrado
let jornada = false;
function preferido() { try { return localStorage.getItem('ecoo.estilo') || 'classico'; } catch { return 'classico'; } }
const parts = [];

// ---------- ritmo ----------
function decodificar(s) { const v = new Float32Array(s.length); for (let i = 0; i < s.length; i++) v[i] = parseInt(s[i], 36) / 35; return v; }
function amostra(v, t) {
  if (!v || !v.length) return 0.5;
  const x = t * R.fps, i = Math.floor(x), f = x - i;
  if (i < 0) return v[0]; if (i >= v.length - 1) return v[v.length - 1];
  return v[i] * (1 - f) + v[i + 1] * f;
}
async function carregarRitmo(m) {
  const medido = (catalogo.ritmos || {})[m.id];
  if (medido && API) { // musica enviada, medida no admin
    try {
      const r = await (await fetch(API + '?ritmo=' + encodeURIComponent(m.id))).json();
      if (r.ok) { const d = r.ritmo; return { bpm: d.bpm, batidas: d.batidas, fps: d.fps || 20, e: decodificar(d.e), g: decodificar(d.g), a: decodificar(d.a) }; }
    } catch {}
  }
  if (m.ritmo) {
    try {
      const d = await (await fetch('ritmo/' + m.id + '.json?v=' + m.ritmo)).json();
      return { bpm: d.bpm, batidas: d.batidas, fps: d.fps, e: decodificar(d.e), g: decodificar(d.g), a: decodificar(d.a) };
    } catch {}
  }
  // sem medicao (musica enviada pelo admin): batida inventada de 100 BPM
  const dur = m.dur || 240, b = [];
  for (let t = 0.3; t < dur; t += 0.6) b.push(t);
  return { bpm: 100, batidas: b, fps: 20, e: null, g: null, a: null, falso: true };
}

// ---------- utilidades de desenho ----------
const sprites = new Map();
function brilho(h, s, l) { // bolinha de luz pre-desenhada (bem mais leve que shadowBlur)
  const k = h + ',' + s + ',' + l;
  if (sprites.has(k)) return sprites.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `hsla(${h},${s}%,${Math.min(95, l + 25)}%,1)`);
  gr.addColorStop(0.25, `hsla(${h},${s}%,${l}%,.7)`);
  gr.addColorStop(1, `hsla(${h},${s}%,${l}%,0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  if (sprites.size > 300) sprites.clear();
  sprites.set(k, c); return c;
}
const hq = h => Math.round(((h % 360) + 360) % 360 / 6) * 6; // agrupa matizes para reaproveitar sprites
function luz(x, y, r, h, s = 90, l = 60, a = 1) { ctx.globalAlpha = a; ctx.drawImage(brilho(hq(h), s, l), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
const rnd = (a, b) => a + Math.random() * (b - a);
function coracao(x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.35);
  ctx.bezierCurveTo(x - r * 1.1, y - r * 0.5, x - r * 0.5, y - r * 1.2, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.5, y - r * 1.2, x + r * 1.1, y - r * 0.5, x, y + r * 0.35);
  ctx.lineTo(x, y + r * 0.9 - r * 0.55); ctx.closePath();
}
function coracaoCheio(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40 * Math.PI * 2;
    const px = 16 * Math.sin(t) ** 3, py = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    ctx[i ? 'lineTo' : 'moveTo'](x + px * r / 16, y - py * r / 16);
  }
  ctx.closePath();
}
function fundo(h1, h2, l1 = 8, l2 = 3, s = 60) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${h1},${s}%,${l1}%)`); g.addColorStop(1, `hsl(${h2},${s}%,${l2}%)`);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
}

// ---------- particulas (efeitos da letra e das batidas) ----------
function soltar(tipo, n, x, y, forca = 1) {
  for (let i = 0; i < n && parts.length < limiteParts; i++) {
    const ang = rnd(0, Math.PI * 2), v = rnd(60, 260) * forca;
    const p = { tipo, x: x ?? rnd(0, W), y: y ?? rnd(0, H), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 0, max: rnd(1.4, 3), r: rnd(6, 16), giro: rnd(-4, 4), ang: rnd(0, 6), h: matiz + rnd(-30, 30) };
    if (tipo === 'confete') { p.y = y ?? -10; p.vx = rnd(-120, 120); p.vy = rnd(80, 260); p.max = rnd(2.5, 4.5); p.h = rnd(0, 360); p.r = rnd(5, 10); }
    if (tipo === 'gota') { p.x = x ?? rnd(0, W); p.y = y ?? -20; p.vx = 0; p.vy = rnd(500, 900); p.max = 2; }
    if (tipo === 'fumaca') { p.vx = rnd(-30, 30); p.vy = rnd(-70, -20); p.r = rnd(40, 90); p.max = rnd(3, 5); }
    if (tipo === 'faisca') { p.y = y ?? H + 10; p.x = x ?? rnd(0, W); p.vx = rnd(-60, 60); p.vy = rnd(-420, -160) * forca; p.r = rnd(4, 10); }
    if (tipo === 'coracao') { p.vy = -Math.abs(p.vy) * 0.6 - 40; p.r = rnd(10, 24); p.h = rnd(330, 360); }
    if (tipo === 'moeda') { p.y = y ?? -20; p.vx = rnd(-40, 40); p.vy = rnd(160, 360); p.r = rnd(8, 14); p.max = 3.5; }
    if (tipo === 'raio') { p.x = x ?? W / 2; p.y = y ?? H * 0.3; p.vx = 0; p.vy = 0; p.max = 0.9; p.r = rnd(H * 0.4, H * 0.8); }
    parts.push(p);
  }
}
function moverParticulas(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vida += dt;
    if (p.vida > p.max || p.y > H + 120 || p.y < -200) { parts.splice(i, 1); continue; }
    const k = 1 - p.vida / p.max;
    p.x += p.vx * dt; p.y += p.vy * dt; p.ang += p.giro * dt;
    switch (p.tipo) {
      case 'confete':
        p.vx *= 0.99; p.vy = Math.min(p.vy + 40 * dt, 220); p.x += Math.sin(p.vida * 6 + p.r) * 30 * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.scale(1, Math.cos(p.vida * 8));
        ctx.fillStyle = `hsl(${p.h},90%,62%)`; ctx.globalAlpha = Math.min(1, k * 3); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); break;
      case 'coracao':
        p.vx *= 0.97; p.vy *= 0.98;
        ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = `hsl(${p.h},85%,64%)`; coracaoCheio(p.x, p.y, p.r * (0.8 + 0.3 * pulso)); ctx.fill(); ctx.restore(); break;
      case 'faisca':
        p.vy += 120 * dt; luz(p.x, p.y, p.r * (1 + pulso), 20 + p.r * 2, 100, 55, k); break;
      case 'estrela': {
        p.vx *= 0.95; p.vy *= 0.95; const r = p.r * (0.6 + 0.6 * k);
        luz(p.x, p.y, r * 2.4, 50, 80, 75, k);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.fillStyle = `rgba(255,250,230,${k})`; ctx.beginPath();
        for (let j = 0; j < 8; j++) { const rr = j % 2 ? r * 0.25 : r; ctx.lineTo(Math.cos(j * Math.PI / 4) * rr, Math.sin(j * Math.PI / 4) * rr); }
        ctx.fill(); ctx.restore(); break; }
      case 'gota':
        ctx.strokeStyle = `rgba(170,210,255,${0.6 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 24); ctx.stroke(); break;
      case 'fumaca':
        p.r += 18 * dt; luz(p.x, p.y, p.r, p.h, 50, 55, 0.22 * k); break;
      case 'moeda':
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.cos(p.vida * 7), 1); ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = '#f5c84c'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
        ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.62, 0, 7); ctx.fill(); ctx.restore(); break;
      case 'vetor': {
        if (p.modo === 'explode') { p.vx *= 0.96; p.vy = p.vy * 0.96 - 10 * dt; }
        else if (p.modo === 'sobe') p.x += Math.sin(p.vida * 0.9 + p.r) * 14 * dt;
        const al = p.modo === 'sobe' ? p.a * Math.min(1, p.vida, (p.max - p.vida)) : Math.min(1, k * 2.5);
        const r = p.r * (1 + 0.25 * pulso) * (p.modo === 'explode' ? 0.7 + 0.3 * Math.min(1, p.vida * 4) : 1);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.globalAlpha = Math.max(0, al);
        ctx.drawImage(vetor(p.nome, p.h), -r * 2, -r * 2, r * 4, r * 4); ctx.restore(); break; }
      case 'raio': {
        const a = Math.sin(k * Math.PI) * 0.35; ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 12; j++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = `hsla(45,100%,70%,${a * 0.5})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p.r, -p.r * 0.05); ctx.lineTo(p.r, p.r * 0.05); ctx.fill(); }
        ctx.restore(); break; }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- desenhos vetoriais (vetores.js) que viram particulas ----------
const VET = window.VETORES || {};
const vetCache = new Map(), vetPath = {};
function vetor(nome, h, l = 72) { // desenho pre-renderizado com brilho em volta
  const k = nome + '|' + hq(h) + '|' + l;
  let c = vetCache.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d');
  g.globalAlpha = 0.5; g.drawImage(brilho(hq(h), 95, l - 12), 0, 0, 96, 96); g.globalAlpha = 1;
  g.translate(48, 48); g.scale(2.7, 2.7); g.translate(-12, -12);
  g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round';
  const p = vetPath[nome] || (vetPath[nome] = new Path2D(VET[nome] || 'M4 12h16'));
  g.strokeStyle = `hsl(${hq(h)},95%,${Math.min(92, l + 14)}%)`; g.stroke(p);
  if (vetCache.size > 400) vetCache.clear();
  vetCache.set(k, c); return c;
}
// desenhos de cada cena (variam a cada trecho da musica)
const TEMAS = {
  festa: ['music', 'music-2', 'music-4', 'disc-3', 'party-popper', 'sparkles', 'headphones', 'martini', 'mic-vocal'],
  fumaca: ['leaf', 'feather', 'wind', 'cloud', 'sprout', 'clover', 'flower-2'],
  amor: ['heart', 'heart-pulse', 'flower', 'flower-2', 'sparkle', 'cherry', 'infinity', 'origami'],
  chuva: ['droplet', 'droplets', 'cloud-rain', 'umbrella', 'waves', 'fish', 'shell'],
  noite: ['moon', 'moon-star', 'star', 'sparkle', 'sparkles', 'cat', 'eye'],
  fogo: ['flame', 'flame-kindling', 'zap', 'skull', 'hand-metal', 'guitar', 'drum'],
  ritual: ['eye', 'moon-star', 'gem', 'diamond', 'hexagon', 'triangle', 'asterisk', 'key', 'spade', 'club'],
  cosmos: ['orbit', 'rocket', 'satellite', 'atom', 'star', 'sparkle', 'ghost'],
  topo: ['sun', 'sunrise', 'bird', 'mountain', 'leaf', 'feather', 'footprints'],
  neon: ['zap', 'gamepad-2', 'headphones', 'audio-lines', 'radio', 'dice-5', 'glasses', 'music-3'],
};
const NOTAS = ['music', 'music-2', 'music-3', 'music-4'];
// palavras da letra que soltam desenhos (junto com os efeitos de antes)
const VET_LETRA = { coracao: ['heart', 'heart-pulse', 'flower'], faisca: ['flame', 'zap', 'flame-kindling'], estrela: ['star', 'sparkle', 'moon-star'], gota: ['droplet', 'umbrella', 'waves'],
  confete: ['party-popper', 'music', 'martini', 'wine'], fumaca: ['leaf', 'wind', 'cloud', 'feather'], moeda: ['crown', 'gem', 'diamond'], raio: ['sun', 'sunrise', 'rainbow'] };
const sorteia = l => l[Math.floor(Math.random() * l.length)];
function soltarVetor(lista, n, x, y, modo = 'explode', forca = 1) {
  for (let i = 0; i < n && parts.length < limiteParts; i++) {
    const ang = rnd(0, Math.PI * 2), v = rnd(90, 280) * forca;
    const p = { tipo: 'vetor', nome: sorteia(lista), x: x ?? rnd(0, W), y: y ?? rnd(0, H), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 0, max: rnd(1.6, 2.8),
      r: rnd(14, 26) * forca, giro: rnd(-1.5, 1.5), ang: rnd(-0.4, 0.4), h: matiz + rnd(-50, 50), modo };
    if (modo === 'sobe') { p.x = x ?? rnd(0, W); p.y = y ?? H + 30; p.vx = rnd(-15, 15); p.vy = rnd(-60, -25); p.max = rnd(6, 10); p.r = rnd(10, 20); p.giro = rnd(-0.4, 0.4); p.a = rnd(0.35, 0.6); }
    if (modo === 'cai') { p.y = y ?? -30; p.vx = rnd(-40, 40); p.vy = rnd(120, 260); p.max = 4; }
    parts.push(p);
  }
}

// ---------- a batida aparecendo na tela ----------
const NB = 48, banda = new Float32Array(NB), envB = new Float32Array(NB);
let estiloBatida = 'barras', contador = 0, borda = 0;
const ESTILOS = ['barras', 'anel', 'onda'];
function batidaVisivel(gb, forte) {
  for (let k = 0; k < NB; k++) {
    const grave = k < NB * 0.3, v = grave ? 0.55 + 0.45 * gb : rnd(0.25, 1);
    envB[k] = Math.max(envB[k], v * (forte ? 1 : 0.7) * rnd(0.7, 1));
  }
  contador = batidaIdx % 4; if (forte) borda = 1;
}
function desenharBatida(dt, e, g, a) {
  const kd = Math.exp(-dt * 6.5);
  for (let k = 0; k < NB; k++) {
    envB[k] *= kd;
    const d = k / NB, base = d < 0.3 ? g : d < 0.7 ? e : a;
    const alvo = base * (0.2 + 0.8 * envB[k]) + 0.04 * Math.sin(performance.now() / 300 + k);
    banda[k] += (alvo - banda[k]) * Math.min(1, dt * 18);
  }
  ctx.globalCompositeOperation = 'lighter';
  if (estiloBatida === 'barras') { // barras espelhadas saindo do centro de baixo
    const n = NB / 2, bw = W / (n * 2), hmax = H * 0.2;
    for (let k = 0; k < n; k++) {
      const v = banda[k * 2], hgt = Math.max(3, v * hmax), h = (matiz + k * 7) % 360;
      ctx.fillStyle = `hsla(${h},95%,62%,${0.28 + 0.4 * v})`;
      for (const lado of [-1, 1]) { const x = W / 2 + lado * (k + 0.5) * bw - bw * 0.35; ctx.fillRect(x, H - hgt, bw * 0.7, hgt); }
      if (v > 0.55) for (const lado of [-1, 1]) luz(W / 2 + lado * (k + 0.5) * bw, H - hgt, bw * 1.4, h, 95, 65, (v - 0.5) * 0.8);
    }
  } else if (estiloBatida === 'anel') { // anel de barras em volta do centro
    const cx = W / 2, cy = H * 0.42, r0 = Math.min(W, H) * (0.27 + 0.03 * pulso), comp = Math.min(W, H) * 0.16;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.008);
    for (let k = 0; k < NB * 2; k++) {
      const v = banda[k < NB ? k : NB * 2 - 1 - k], ang = k / (NB * 2) * Math.PI * 2 - Math.PI / 2 + performance.now() / 9000;
      const c = Math.cos(ang), s = Math.sin(ang), l = 4 + v * comp;
      ctx.strokeStyle = `hsla(${(matiz + k * 4) % 360},95%,65%,${0.3 + 0.5 * v})`;
      ctx.beginPath(); ctx.moveTo(cx + c * r0, cy + s * r0); ctx.lineTo(cx + c * (r0 + l), cy + s * (r0 + l)); ctx.stroke();
    }
    ctx.strokeStyle = `hsla(${matiz},90%,70%,${0.15 + 0.5 * pulso})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r0 * 0.96, 0, 7); ctx.stroke();
  } else { // onda: duas linhas de luz que pulam com a batida
    const y0 = H * 0.68;
    for (const k2 of [1, -1]) {
      ctx.strokeStyle = `hsla(${(matiz + (k2 > 0 ? 0 : 120)) % 360},95%,65%,${0.35 + 0.4 * pulso})`; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= NB; i++) {
        const x = i / NB * W, v = banda[Math.min(NB - 1, Math.abs(Math.round(NB / 2 - i)) * 2 % NB)];
        const y = y0 + k2 * v * H * 0.12 * Math.sin(i * 0.7 + performance.now() / 260);
        ctx[i ? 'lineTo' : 'moveTo'](x, y);
      }
      ctx.stroke();
    }
  }
  // contador 1-2-3-4 da batida
  const cy = H - Math.max(26, H * 0.045), gap = 22;
  for (let k = 0; k < 4; k++) {
    const on = k === contador, x = W / 2 + (k - 1.5) * gap;
    luz(x, cy, on ? 14 + 10 * pulso : 6, matiz + k * 30, 95, on ? 70 : 45, on ? 0.9 : 0.35);
  }
  // borda que acende nas batidas fortes
  if (borda > 0.01) {
    const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `hsla(${matiz},95%,60%,${0.35 * borda})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); borda = Math.max(0, borda - dt * 3);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- trechos: a cena muda ao longo da musica ----------
const GRUPO = { festa: ['neon', 'cosmos', 'fogo'], fumaca: ['noite', 'cosmos', 'topo'], amor: ['noite', 'topo', 'fumaca'], chuva: ['noite', 'fumaca', 'amor'],
  noite: ['cosmos', 'chuva', 'fumaca'], fogo: ['ritual', 'festa', 'neon'], ritual: ['fogo', 'cosmos', 'noite'], cosmos: ['noite', 'neon', 'ritual'],
  topo: ['fumaca', 'amor', 'cosmos'], neon: ['festa', 'cosmos', 'fogo'] };
let sequencia = [], secao = 0, batidasSecao = 0, energiaSecao = 0.5, cenaAtual = '', foto = null, fade = 0, ambiente = 0;
function montarSequencia(principal) {
  const g = GRUPO[principal] || [];
  sequencia = [principal]; g.forEach(c => sequencia.push(c, principal)); // a cena da musica volta sempre entre as outras
  secao = 0; batidasSecao = 0;
}
function trocarSecao() {
  if (!sequencia.length) return;
  if (!foto) foto = document.createElement('canvas');
  foto.width = tela.width; foto.height = tela.height; foto.getContext('2d').drawImage(tela, 0, 0); fade = 1;
  secao++; batidasSecao = 0; energiaSecao = energiaLenta;
  cenaAtual = sequencia[secao % sequencia.length]; cena = CENAS[cenaAtual]();
  estiloBatida = ESTILOS[(secao + (M ? M.id.length : 0)) % ESTILOS.length];
  matiz = (matiz + 70 + rnd(0, 80)) % 360;
  if (!jornada) $v('#mvCena').textContent = NOMES[cenaAtual];
  soltarVetor(TEMAS[cenaAtual] || NOTAS, 10, W / 2, H * 0.45, 'explode', 1.1);
}

// ---------- cenas ----------
// cada cena: { iniciar(), desenhar(dt, t, e, g, a), batida(forca, forte) }
const CENAS = {
  festa: () => {
    const lasers = Array.from({ length: 6 }, (_, i) => ({ x: i % 2 ? W * 1.05 : -W * 0.05, fase: i * 1.3, h: i * 60 }));
    let bola = 0;
    return {
      desenhar(dt, t, e, g) {
        fundo(270 + matiz * 0.2, 250, 9 + 6 * g, 3);
        ctx.globalCompositeOperation = 'lighter';
        for (const l of lasers) {
          const ang = -Math.PI / 2 + Math.sin(t * 0.9 + l.fase) * 0.9 * (l.x < 0 ? -1 : 1) + (l.x < 0 ? 0.6 : -0.6);
          const h = l.h + matiz + t * 40, larg = 3 + 6 * pulso;
          ctx.strokeStyle = `hsla(${h},100%,60%,${0.12 + 0.5 * e})`; ctx.lineWidth = larg;
          ctx.beginPath(); ctx.moveTo(l.x, H); ctx.lineTo(l.x + Math.cos(ang) * H * 2, H + Math.sin(ang) * H * 2); ctx.stroke();
        }
        // globo espelhado
        bola += dt * (0.5 + e);
        const bx = W / 2, by = H * 0.16, br = Math.min(W, H) * 0.07 * (1 + 0.12 * pulso);
        luz(bx, by, br * 4, 200 + matiz, 60, 60, 0.4 + 0.4 * pulso);
        for (let i = 0; i < 14; i++) { const a = bola + i / 14 * Math.PI * 2; luz(bx + Math.cos(a) * W * 0.45, by + 40 + Math.sin(a * 1.7) * H * 0.35, 26, (i * 26 + matiz) % 360, 90, 65, 0.35 * e + 0.1); }
        ctx.globalCompositeOperation = 'source-over';
        const esf = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.1, bx, by, br);
        esf.addColorStop(0, '#f4f6fa'); esf.addColorStop(0.6, '#9aa3b5'); esf.addColorStop(1, '#3c4250');
        ctx.fillStyle = esf; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
        // facetas que piscam conforme o globo gira
        ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.clip();
        const q = br / 4;
        for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
          const v = Math.sin(i * 1.7 + j * 2.3 + bola * 3);
          ctx.fillStyle = v > 0.6 ? `hsla(${(i * 40 + j * 25 + matiz) % 360},80%,85%,.9)` : `rgba(20,24,34,${0.15 + 0.15 * (v + 1)})`;
          ctx.fillRect(bx + i * q - q / 2 + 1, by + j * q - q / 2 + 1, q - 2, q - 2);
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(200,200,210,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by - br); ctx.stroke();
        // chao de pista
        const cols = 8, ch = H * 0.12;
        for (let i = 0; i < cols; i++) { ctx.fillStyle = `hsla(${(i * 45 + matiz + Math.floor(t * 2) * 45) % 360},90%,55%,${0.08 + 0.25 * (((i + batidaIdx) % 3) === 0 ? pulso : 0)})`; ctx.fillRect(i * W / cols, H - ch, W / cols - 2, ch); }
      },
      batida(f, forte) { soltar('confete', forte ? 26 : 6, null, -10); if (forte) { flash = 0.18; flashCor = '255,255,255'; } }
    };
  },
  fumaca: () => {
    const nuvens = Array.from({ length: 26 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(60, 180), v: rnd(10, 30), f: rnd(0, 6), h: rnd(-40, 40) }));
    return {
      desenhar(dt, t, e, g) {
        fundo(150 + matiz * 0.3, 280, 7, 3, 40);
        ctx.globalCompositeOperation = 'lighter';
        for (const n of nuvens) {
          n.y -= n.v * dt * (0.6 + e); n.x += Math.sin(t * 0.4 + n.f) * 18 * dt;
          if (n.y < -n.r) { n.y = H + n.r; n.x = rnd(0, W); }
          luz(n.x, n.y, n.r * (1 + 0.15 * pulso), 140 + n.h + matiz + Math.sin(t * 0.2 + n.f) * 60, 55, 50, 0.16 + 0.12 * e);
        }
        // ondas de brisa
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          ctx.strokeStyle = `hsla(${160 + k * 40 + matiz},70%,65%,${0.08 + 0.18 * g})`; ctx.beginPath();
          for (let x = 0; x <= W; x += 16) { const y = H * (0.35 + k * 0.12) + Math.sin(x * 0.006 + t * (0.7 + k * 0.2) + k) * (30 + 50 * e); ctx[x ? 'lineTo' : 'moveTo'](x, y); }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
      batida(f, forte) { if (forte) soltar('fumaca', 3, rnd(W * 0.2, W * 0.8), H * 0.9); }
    };
  },
  amor: () => {
    const petalas = Array.from({ length: 30 }, () => ({ x: rnd(0, W), y: rnd(-H, H), v: rnd(30, 70), f: rnd(0, 6), r: rnd(5, 10) }));
    return {
      desenhar(dt, t, e, g) {
        fundo(340 + matiz * 0.2, 300, 10 + 6 * pulso, 3, 55);
        const cx = W / 2, cy = H * 0.42, r = Math.min(W, H) * (0.16 + 0.05 * g) * (1 + 0.18 * pulso);
        ctx.globalCompositeOperation = 'lighter';
        luz(cx, cy, r * 3.2, 345 + matiz * 0.3, 85, 55, 0.35 + 0.4 * pulso);
        // aneis que saem do coracao
        for (let k = 0; k < 3; k++) {
          const fase = ((t * 0.5 + k / 3) % 1);
          ctx.strokeStyle = `hsla(${340 + matiz * 0.3},90%,70%,${(1 - fase) * 0.35})`; ctx.lineWidth = 3;
          coracaoCheio(cx, cy, r * (1 + fase * 2.2)); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        const gr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r * 1.2);
        gr.addColorStop(0, `hsl(${350 + matiz * 0.2},95%,72%)`); gr.addColorStop(1, `hsl(${335 + matiz * 0.2},85%,42%)`);
        ctx.fillStyle = gr; coracaoCheio(cx, cy, r); ctx.fill();
        for (const p of petalas) {
          p.y += p.v * dt; p.x += Math.sin(t + p.f) * 20 * dt; if (p.y > H + 20) { p.y = -20; p.x = rnd(0, W); }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t * 0.8 + p.f); ctx.fillStyle = `hsla(${350 + p.f * 4},80%,75%,.7)`;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, 7); ctx.fill(); ctx.restore();
        }
      },
      batida(f, forte) { soltar('coracao', forte ? 6 : 2, W / 2, H * 0.42, forte ? 1.3 : 0.7); }
    };
  },
  chuva: () => {
    const gotas = Array.from({ length: 220 }, () => ({ x: rnd(0, W), y: rnd(0, H), v: rnd(500, 900), l: rnd(10, 26) }));
    const ondas = [];
    const luzes = Array.from({ length: 16 }, () => ({ x: rnd(0, W), y: rnd(H * 0.15, H * 0.75), r: rnd(30, 90), v: rnd(4, 14), f: rnd(0, 6), h: [210, 30, 330, 190][Math.floor(rnd(0, 4))], k: rnd(0.3, 1) }));
    let relampago = 0, raioPts = null;
    return {
      desenhar(dt, t, e, g) {
        fundo(215 + matiz * 0.2, 230, 9 + 30 * relampago, 3, 45);
        // luzes da cidade desfocadas atras do vidro
        ctx.globalCompositeOperation = 'lighter';
        for (const b of luzes) { b.x += b.v * dt; if (b.x > W + 80) b.x = -80; luz(b.x, b.y + Math.sin(t * 0.3 + b.f) * 8, b.r * (1 + 0.25 * pulso * b.k), (b.h + matiz * 0.3) % 360, 70, 55, 0.18 + 0.25 * e * b.k); }
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(170,205,255,${0.25 + 0.3 * e})`; ctx.lineWidth = 1.5; ctx.beginPath();
        for (const d of gotas) {
          d.y += d.v * dt * (0.7 + e * 0.8); d.x -= 60 * dt;
          if (d.y > H * 0.82 + rnd(0, H * 0.18)) { if (Math.random() < 0.04) ondas.push({ x: d.x, y: d.y, r: 2, a: 0.5 }); d.y = -20; d.x = rnd(0, W + 100); }
          ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 4, d.y - d.l);
        }
        ctx.stroke();
        for (let i = ondas.length - 1; i >= 0; i--) {
          const o = ondas[i]; o.r += 60 * dt; o.a -= 0.6 * dt; if (o.a <= 0) { ondas.splice(i, 1); continue; }
          ctx.strokeStyle = `rgba(180,215,255,${o.a})`; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * 0.3, 0, 0, 7); ctx.stroke();
        }
        if (relampago > 0) {
          relampago -= dt * 2.5;
          if (raioPts) { ctx.strokeStyle = `rgba(230,240,255,${Math.max(0, relampago)})`; ctx.lineWidth = 3; ctx.beginPath(); raioPts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1])); ctx.stroke(); }
        }
        // poca refletindo
        const gr = ctx.createLinearGradient(0, H * 0.8, 0, H); gr.addColorStop(0, 'rgba(120,160,220,0)'); gr.addColorStop(1, `rgba(120,160,220,${0.1 + 0.15 * pulso})`);
        ctx.fillStyle = gr; ctx.fillRect(0, H * 0.8, W, H * 0.2);
      },
      batida(f, forte) {
        for (let i = 0; i < 3; i++) ondas.push({ x: rnd(0, W), y: rnd(H * 0.82, H), r: 4, a: 0.7 });
        if (forte && Math.random() < 0.3) {
          relampago = 1; let x = rnd(W * 0.2, W * 0.8), y = 0; raioPts = [[x, y]];
          while (y < H * 0.7) { y += rnd(20, 60); x += rnd(-40, 40); raioPts.push([x, y]); }
        }
      }
    };
  },
  noite: () => {
    const estrelas = Array.from({ length: 220 }, () => ({ x: rnd(0, 1), y: rnd(0, 1), r: rnd(0.5, 2), f: rnd(0, 6) }));
    const cadentes = [];
    return {
      desenhar(dt, t, e, g, a) {
        fundo(235 + matiz * 0.2, 260, 10, 2, 55);
        ctx.globalCompositeOperation = 'lighter';
        // aurora
        for (let k = 0; k < 3; k++) { // faixas de aurora
          const onda = x => H * (0.2 + k * 0.08) + Math.sin(x * 0.004 + t * 0.5 + k * 2) * 40 * (0.5 + e) + Math.sin(x * 0.011 - t * 0.3) * 12;
          const esp = H * (0.05 + 0.05 * e + 0.03 * pulso);
          ctx.fillStyle = `hsla(${150 + k * 50 + matiz},80%,55%,${0.08 + 0.14 * e})`; ctx.beginPath();
          for (let x = 0; x <= W; x += 20) ctx.lineTo(x, onda(x) - esp);
          for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, onda(x) + esp * 0.4);
          ctx.fill();
        }
        const giro = t * 0.01;
        for (const s of estrelas) {
          const x = ((s.x + giro * s.r * 0.2) % 1) * W, y = s.y * H;
          const brilhoE = 0.3 + 0.7 * Math.abs(Math.sin(t * (1 + s.r) + s.f)) * (0.5 + a);
          ctx.fillStyle = `rgba(255,255,240,${brilhoE})`; ctx.fillRect(x, y, s.r * (1 + pulso * 0.6), s.r * (1 + pulso * 0.6));
        }
        // lua
        const lx = W * 0.75, ly = H * 0.22, lr = Math.min(W, H) * 0.08;
        luz(lx, ly, lr * 4 * (1 + 0.15 * pulso), 50, 30, 80, 0.5);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#efe9d8'; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(180,170,150,.35)'; [[-.3, -.2, .2], [.25, .1, .15], [-.05, .35, .12]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(lx + dx * lr, ly + dy * lr, rr * lr, 0, 7); ctx.fill(); });
        for (let i = cadentes.length - 1; i >= 0; i--) {
          const c = cadentes[i]; c.x += c.vx * dt; c.y += c.vy * dt; c.v -= dt;
          if (c.v <= 0) { cadentes.splice(i, 1); continue; }
          const gr = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 0.15, c.y - c.vy * 0.15);
          gr.addColorStop(0, `rgba(255,255,255,${c.v})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = gr; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - c.vx * 0.15, c.y - c.vy * 0.15); ctx.stroke();
        }
        // morros
        ctx.fillStyle = '#05060c'; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * 0.86 - Math.sin(x * 0.008) * 30 - Math.sin(x * 0.021) * 14); ctx.lineTo(W, H); ctx.fill();
      },
      batida(f, forte) { if (forte && Math.random() < 0.45) cadentes.push({ x: rnd(0, W * 0.7), y: rnd(0, H * 0.3), vx: rnd(500, 900), vy: rnd(200, 400), v: 1 }); }
    };
  },
  fogo: () => ({
    desenhar(dt, t, e, g) {
      fundo(10 + matiz * 0.1, 0, 8 + 10 * g, 2, 70);
      ctx.globalCompositeOperation = 'lighter';
      luz(W / 2, H * 1.05, Math.max(W, H) * (0.55 + 0.15 * pulso), 18, 100, 50, 0.35 + 0.35 * e);
      // chamas: camadas de ondas
      for (let k = 0; k < 5; k++) {
        const alt = H * (0.22 + 0.4 * e + 0.12 * pulso) * (1 - k * 0.15);
        ctx.fillStyle = `hsla(${4 + k * 11},100%,${42 + k * 7}%,${0.26})`; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 14) {
          const n = Math.sin(x * 0.02 + t * (5 + k)) * 0.5 + Math.sin(x * 0.047 - t * (7 + k)) * 0.3 + Math.sin(x * 0.011 + t * 3) * 0.2;
          ctx.lineTo(x, H - alt * (0.6 + 0.4 * n));
        }
        ctx.lineTo(W, H); ctx.fill();
      }
      // brasas constantes
      if (Math.random() < 0.3 + e) soltar('faisca', 1, rnd(0, W), H + 5, 0.6 + e);
      ctx.globalCompositeOperation = 'source-over';
    },
    batida(f, forte) { soltar('faisca', forte ? 22 : 6, null, H + 5, forte ? 1.4 : 1); if (forte) { tremor = 10; flash = 0.12; flashCor = '255,140,40'; } }
  }),
  ritual: () => {
    let giro = 0;
    return {
      desenhar(dt, t, e, g) {
        fundo(285 + matiz * 0.2, 340, 9, 2, 60);
        giro += dt * (0.15 + 0.6 * e);
        const cx = W / 2, cy = H * 0.45, R0 = Math.min(W, H) * 0.42 * (1 + 0.06 * pulso);
        ctx.globalCompositeOperation = 'lighter';
        luz(cx, cy, R0 * 1.6, 300 + matiz * 0.4, 80, 45, 0.25 + 0.35 * pulso);
        for (let k = 0; k < 5; k++) {
          const r = R0 * (0.25 + k * 0.18), lados = 3 + k * 2, dir = k % 2 ? -1 : 1, h = (300 + k * 25 + matiz) % 360;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(giro * dir * (1 + k * 0.2));
          ctx.strokeStyle = `hsla(${h},90%,65%,${0.35 + 0.4 * (k === batidaIdx % 5 ? pulso : 0)})`; ctx.lineWidth = 2;
          ctx.beginPath(); for (let i = 0; i <= lados; i++) { const a = i / lados * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, r * 1.04, 0, 7); ctx.stroke();
          for (let i = 0; i < lados * 2; i++) { // simbolos ao redor
            const a = i / (lados * 2) * Math.PI * 2; ctx.save(); ctx.rotate(a); ctx.translate(r * 1.12, 0);
            ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(5, 0); ctx.lineTo(-5, 6); if (i % 3 === 0) { ctx.moveTo(0, -7); ctx.lineTo(0, 7); } ctx.stroke(); ctx.restore();
          }
          ctx.restore();
        }
        // velas
        for (let i = 0; i < 7; i++) {
          const x = W * (0.1 + i * 0.133), y = H * 0.92, tremula = Math.sin(t * 13 + i * 3) * 0.15 + 0.85;
          luz(x, y - 22, 34 * tremula * (1 + 0.3 * pulso), 35, 100, 60, 0.8);
          ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 5, y - 14, 10, 30); ctx.globalCompositeOperation = 'lighter';
        }
        ctx.globalCompositeOperation = 'source-over';
      },
      batida(f, forte) { if (forte) soltar('estrela', 8, W / 2, H * 0.45, 1.2); }
    };
  },
  cosmos: () => {
    const fundoEstrelas = Array.from({ length: 160 }, () => ({ x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(0.1, 1) }));
    let ang = 0;
    return {
      desenhar(dt, t, e, g) {
        fundo(255 + matiz * 0.3, 280, 6, 2, 60);
        ctx.globalCompositeOperation = 'lighter';
        // nebulosa
        for (let i = 0; i < 6; i++) luz(W * (0.5 + Math.sin(t * 0.07 + i) * 0.4), H * (0.5 + Math.cos(t * 0.05 + i * 2) * 0.35), Math.min(W, H) * 0.5, (260 + i * 30 + matiz) % 360, 80, 45, 0.12 + 0.1 * e);
        // viagem pelas estrelas
        const vel = 0.05 + 0.5 * e + 0.5 * pulso;
        ctx.fillStyle = '#fff';
        for (const s of fundoEstrelas) {
          s.z -= vel * dt; if (s.z <= 0.05) { s.z = 1; s.x = rnd(-1, 1); s.y = rnd(-1, 1); }
          const x = W / 2 + s.x / s.z * W * 0.3, y = H / 2 + s.y / s.z * H * 0.3, r = (1 - s.z) * 2.5;
          ctx.fillRect(x, y, r, r);
        }
        ctx.globalCompositeOperation = 'source-over';
        // planeta com anel e luas
        ang += dt * (0.3 + e);
        const cx = W / 2, cy = H * 0.45, r = Math.min(W, H) * 0.13 * (1 + 0.08 * pulso), h = 20 + matiz;
        const anel = (frente) => { ctx.strokeStyle = `hsla(${h + 30},70%,70%,.7)`; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.9, r * 0.45, -0.3, frente ? 0 : Math.PI, frente ? Math.PI : Math.PI * 2); ctx.stroke(); };
        anel(false);
        const gr = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
        gr.addColorStop(0, `hsl(${h},80%,65%)`); gr.addColorStop(1, `hsl(${h - 20},70%,25%)`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
        anel(true);
        for (let i = 0; i < 3; i++) { const a = ang * (1 + i * 0.4) + i * 2, d = r * (2.4 + i * 0.6); ctx.fillStyle = `hsl(${h + 120 * i},50%,70%)`; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.4, r * (0.12 + i * 0.04), 0, 7); ctx.fill(); }
      },
      batida(f, forte) { if (forte) soltar('estrela', 5, W / 2, H * 0.45, 1.5); }
    };
  },
  topo: () => {
    const camadas = Array.from({ length: 4 }, (_, k) => ({ desloc: rnd(0, 1000), alt: 0.25 - k * 0.04, sem: rnd(0, 100) }));
    const altura = (x, s) => Math.sin(x * 0.004 + s) * 0.5 + Math.sin(x * 0.011 + s * 2) * 0.3 + Math.sin(x * 0.027 + s * 3) * 0.2;
    return {
      desenhar(dt, t, e, g) {
        const prog = Math.min(1, t / ((M && M.dur) || 200)); // o sol nasce ao longo da musica
        const h1 = 230 - prog * 200, h2 = 30 + prog * 10;
        fundo(h1 + matiz * 0.1, h2, 12 + prog * 30, 30 + prog * 10, 60);
        const sx = W * 0.5, sy = H * (0.75 - prog * 0.45), sr = Math.min(W, H) * 0.09 * (1 + 0.1 * pulso);
        ctx.globalCompositeOperation = 'lighter';
        luz(sx, sy, sr * 5, 40, 100, 60, 0.5 + 0.3 * pulso);
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.1);
        for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = `hsla(45,100%,70%,${0.05 + 0.12 * pulso})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, -20); ctx.lineTo(W, 20); ctx.fill(); }
        ctx.restore(); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
        camadas.forEach((c, k) => {
          c.desloc += dt * (20 + 120 * e) * (k + 1) * 0.5;
          const base = H * (0.62 + k * 0.1), l = 8 + k * 5 + prog * 12;
          ctx.fillStyle = `hsl(${250 - prog * 40 + k * 8},35%,${l}%)`; ctx.beginPath(); ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 12) ctx.lineTo(x, base - H * c.alt * (0.5 + 0.5 * altura(x + c.desloc, c.sem)));
          ctx.lineTo(W, H); ctx.fill();
        });
      },
      batida(f, forte) { if (forte) soltar('raio', 1, W / 2, H * 0.4); }
    };
  },
  neon: () => {
    let corrida = 0; const aneis = [];
    return {
      desenhar(dt, t, e, g, a) {
        fundo(275 + matiz * 0.3, 300, 8, 3, 70);
        const hz = H * 0.55, cx = W / 2;
        // barras de equalizador saindo do horizonte (graves no meio, agudos nas pontas)
        ctx.globalCompositeOperation = 'lighter';
        const n = 32, bw = W / n;
        for (let i = 0; i < n; i++) {
          const d = Math.abs(i - (n - 1) / 2) / (n / 2), base = d < 0.35 ? g : d > 0.7 ? a : e;
          const v = base * (0.45 + 0.55 * Math.abs(Math.sin(t * (2 + i * 0.37) + i * 1.3))) + 0.15 * pulso;
          ctx.fillStyle = `hsla(${(190 + d * 120 + matiz) % 360},100%,60%,.32)`; ctx.fillRect(i * bw + 2, hz - v * H * 0.38, bw - 4, v * H * 0.38);
        }
        ctx.globalCompositeOperation = 'source-over';
        // sol listrado
        const sr = Math.min(W, H) * 0.2 * (1 + 0.06 * pulso);
        const gs = ctx.createLinearGradient(0, hz - sr, 0, hz); gs.addColorStop(0, `hsl(${45 + matiz * 0.2},100%,60%)`); gs.addColorStop(1, `hsl(${320 + matiz * 0.2},100%,55%)`);
        ctx.fillStyle = gs; ctx.save(); ctx.beginPath(); ctx.arc(cx, hz, sr, Math.PI, 0); ctx.clip();
        ctx.fillRect(cx - sr, hz - sr, sr * 2, sr);
        ctx.fillStyle = `hsl(${280 + matiz * 0.3},70%,8%)`; for (let i = 0; i < 6; i++) { const y = hz - sr * 0.08 - i * sr * 0.14; ctx.fillRect(cx - sr, y, sr * 2, 3 + i * 0.8); }
        ctx.restore();
        // grade no chao
        corrida = (corrida + dt * (0.6 + 2 * e)) % 1;
        ctx.strokeStyle = `hsla(${300 + matiz * 0.3},100%,65%,${0.4 + 0.5 * pulso})`; ctx.lineWidth = 1.5;
        ctx.fillStyle = `hsl(${280 + matiz * 0.3},70%,6%)`; ctx.fillRect(0, hz, W, H - hz);
        ctx.beginPath();
        for (let i = 0; i < 14; i++) { const z = (i + corrida) / 14, y = hz + (H - hz) * z * z; ctx.moveTo(0, y); ctx.lineTo(W, y); }
        for (let i = -12; i <= 12; i++) { ctx.moveTo(cx + i * 8, hz); ctx.lineTo(cx + i * W * 0.12, H); }
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = aneis.length - 1; i >= 0; i--) {
          const r = aneis[i]; r.s += dt * 1.6; if (r.s > 1.6) { aneis.splice(i, 1); continue; }
          ctx.strokeStyle = `hsla(${r.h},100%,65%,${1 - r.s / 1.6})`; ctx.lineWidth = 3; ctx.strokeRect(cx - W * r.s * 0.5, hz - H * r.s * 0.3, W * r.s, H * r.s * 0.6);
        }
        ctx.globalCompositeOperation = 'source-over';
      },
      batida(f, forte) { if (forte) aneis.push({ s: 0.05, h: (180 + matiz + rnd(0, 140)) % 360 }); }
    };
  },
};

// ---------- letra (karaoke) ----------
function linhaAgora(t) {
  if (!letraDados) return -1;
  let i = -1; const L = letraDados.linhas;
  for (let k = 0; k < L.length; k++) { if (L[k][0] <= t + 0.15) i = k; else break; }
  return i;
}
function montarLinha(i) {
  const L = letraDados ? letraDados.linhas : [];
  const atual = i >= 0 ? String(L[i][1] || '').trim() : '';
  const prox = L.slice(i + 1).find(l => String(l[1]).trim());
  $v('#mvAtual').innerHTML = atual ? atual.split(/\s+/).map(w => `<span>${esc(w)}</span>`).join(' ') : '';
  $v('#mvProx').textContent = prox ? prox[1] : '';
  $v('#mvAtual').classList.remove('entra'); void $v('#mvAtual').offsetWidth; $v('#mvAtual').classList.add('entra');
  if (atual && jornada) Mundo.linha(atual);
  if (atual && !jornada) for (const [re, tipo] of GATILHOS) if (re.test(atual)) {
    soltarVetor(VET_LETRA[tipo] || NOTAS, 8, W / 2, H * 0.45, 'explode', 1.2);
    soltar(tipo, tipo === 'raio' ? 1 : tipo === 'fumaca' ? 4 : 14, tipo === 'confete' || tipo === 'moeda' || tipo === 'gota' ? null : W / 2, tipo === 'confete' || tipo === 'moeda' || tipo === 'gota' ? -10 : H * 0.62);
  }
}
function pintarPalavras(t, i) {
  const spans = $v('#mvAtual').children;
  if (!spans.length || !letraDados) return;
  const L = letraDados.linhas, ini = L[i][0], fim = L[i + 1] ? L[i + 1][0] : ini + 4;
  const p = Math.min(1, (t - ini) / Math.max(0.6, (fim - ini) * 0.85));
  const n = Math.floor(p * spans.length + 0.0001);
  for (let k = 0; k < spans.length; k++) spans[k].classList.toggle('dita', k < n || p >= 1);
}

// ---------- laco principal ----------
// qualidade automatica: se a animacao engasgar (TV, celular fraco), desenha em resolucao menor
let escala = ehTV ? 0.75 : 1, baixou = 0, somaQuadros = 0, nQuadros = 0, limiteParts = 420;
function redimensionar() {
  const w = tela.clientWidth, h = tela.clientHeight, mudou = w !== W || h !== H;
  W = w; H = h;
  DPR = Math.max(0.4, Math.min(window.devicePixelRatio || 1, W * H > 1.2e6 ? 1 : 1.5) * escala);
  tela.width = Math.round(W * DPR); tela.height = Math.round(H * DPR);
  limiteParts = Math.round(420 * Math.min(1, escala));
  if (cenaAtual && (mudou || !cena)) cena = CENAS[cenaAtual]();
  if (window.Mundo) Mundo.tamanho(W, H, escala);
}
function medirFluidez(intervalo) {
  if (document.hidden || intervalo > 200) return;
  somaQuadros += intervalo; nQuadros++;
  if (nQuadros < 90) return;
  const media = somaQuadros / nQuadros; somaQuadros = 0; nQuadros = 0;
  if (jornada && media > 45 && escala <= 0.45) { jornada = false; Mundo.ligar(false); $v('#mvCena').textContent = NOMES[nomeCena]; return; } // nem assim: volta para as cenas leves
  if (media > 24 && escala > 0.45) { escala *= 0.75; baixou++; redimensionar(); }        // abaixo de ~40 quadros/s: alivia
  else if (media < 17.5 && escala < 1 && baixou < 2) { escala = Math.min(1, escala / 0.85); redimensionar(); } // sobrando: melhora
}

function passo(agora) {
  if (!aberto) return;
  quadro = requestAnimationFrame(passo);
  if (ultimo) medirFluidez(agora - ultimo);
  const dt = Math.min(0.05, (agora - (ultimo || agora)) / 1000); ultimo = agora;
  if (!R || !cena) return;
  const t = audio.currentTime || 0;
  const e = R.e ? amostra(R.e, t) : 0.5 + 0.1 * Math.sin(t), g = R.g ? amostra(R.g, t) : 0.5, a = R.a ? amostra(R.a, t) : 0.5;
  energiaLenta += (e - energiaLenta) * Math.min(1, dt * 0.8);
  matiz = (matiz + dt * (4 + 30 * energiaLenta)) % 360; // a cor caminha mais rapido nos trechos fortes
  // batida
  const B = R.batidas;
  let i = batidaIdx;
  if (i < 0 || i >= B.length || B[i] > t || (B[i + 1] !== undefined && B[i + 1] <= t)) {
    let lo = 0, hi = B.length - 1; i = -1;
    while (lo <= hi) { const md = (lo + hi) >> 1; if (B[md] <= t) { i = md; lo = md + 1; } else hi = md - 1; }
  }
  if (i !== batidaIdx) {
    const nova = i === batidaIdx + 1 && !audio.paused;
    batidaIdx = i;
    if (nova && i >= 0) {
      const gb = R.g ? amostra(R.g, B[i]) : 0.6;
      forcaBatida = gb; pulso = 0.4 + 0.6 * gb;
      const forte = gb > 0.55 || i % 4 === 0;
      if (jornada) Mundo.batida(gb, forte);
      else {
        cena.batida(gb, forte); batidaVisivel(gb, forte); batidasSecao++;
        if (forte && Math.random() < 0.5) soltarVetor(NOTAS.concat(TEMAS[cenaAtual] || []), forte && gb > 0.7 ? 3 : 1, W / 2, H * 0.42, 'explode', 0.8);
        // muda de cena a cada ~32 batidas, ou antes se a musica mudar de energia
        if (i % 4 === 0 && (batidasSecao >= 32 || (batidasSecao >= 16 && Math.abs(energiaLenta - energiaSecao) > 0.22))) trocarSecao();
      }
    }
  }
  pulso = Math.max(0, pulso - dt * 4.2);
  // tela
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (jornada) { ctx.clearRect(-20, -20, W + 40, H + 40); Mundo.quadro(dt, t, e, g, a, pulso, ctx, W, H, !audio.paused); }
  else {
    if (tremor > 0) { ctx.translate(rnd(-tremor, tremor), rnd(-tremor, tremor)); tremor = Math.max(0, tremor - dt * 40); }
    cena.desenhar(dt, t, e, g, a);
    // a cena anterior some aos poucos por cima da nova
    if (fade > 0 && foto) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = fade; ctx.drawImage(foto, 0, 0); ctx.restore(); fade = Math.max(0, fade - dt / 1.3); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    desenharBatida(dt, e, g, a);
    ambiente -= dt; if (ambiente <= 0) { ambiente = rnd(0.6, 1.4) / (0.6 + e); soltarVetor(TEMAS[cenaAtual] || NOTAS, 1, null, null, 'sobe'); }
  }
  moverParticulas(dt);
  if (flash > 0) { ctx.fillStyle = `rgba(${flashCor},${flash})`; ctx.fillRect(-20, -20, W + 40, H + 40); flash = Math.max(0, flash - dt * 1.5); }
  // vinheta (a Jornada ja faz a sua)
  if (!jornada) {
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(-20, -20, W + 40, H + 40);
  }
  // letra
  const li = linhaAgora(t);
  if (li !== linhaIdx) { linhaIdx = li; montarLinha(li); }
  if (li >= 0) pintarPalavras(t, li);
  document.documentElement.style.setProperty('--mv-pulso', pulso.toFixed(3));
  // progresso e controles
  const d = audio.duration || (M && M.dur) || 1;
  const pr = $v('#mvProgresso'); pr.value = Math.round(t / d * 1000); pintarRange(pr);
  if (ocultarEm && performance.now() > ocultarEm) { $v('#modoVisual').classList.add('quieto'); ocultarEm = 0; }
}

async function prepararMusica() {
  const m = porId[estado.fila[estado.pos]];
  if (!m) return;
  M = m; R = null; batidaIdx = -1; linhaIdx = -2; letraDados = null; parts.length = 0;
  nomeCena = (catalogo.cenas || {})[m.id] || m.cena || CENAS_GENERO[m.genero] || 'neon';
  montarSequencia(nomeCena); cenaAtual = nomeCena; cena = CENAS[cenaAtual](); estiloBatida = ESTILOS[m.id.length % ESTILOS.length]; fade = 0; envB.fill(0);
  jornada = !!(window.Mundo && preferido() === 'jornada' && Mundo.disponivel());
  if (window.Mundo) Mundo.ligar(jornada);
  $v('#mvTitulo').textContent = m.titulo; $v('#mvArtista').textContent = m.artista;
  $v('#mvCena').textContent = jornada ? 'Jornada' : NOMES[nomeCena];
  $v('#mvAtual').innerHTML = ''; $v('#mvProx').textContent = '';
  const [r, l] = await Promise.all([carregarRitmo(m), typeof letraDe === 'function' ? letraDe(m) : null]);
  if (M !== m) return;
  if (jornada) Mundo.preparar({ id: m.id, R: r, letra: l, humor: nomeCena, duracao: (isFinite(audio.duration) && audio.duration) || m.dur || (r.batidas[r.batidas.length - 1] || 236) + 4 });
  R = r; letraDados = l;
  $v('#mvLetra').classList.toggle('sem', !l);
}

async function abrirVisual() {
  if (!porId[estado.fila[estado.pos]]) { aviso('Toque uma música para abrir o modo visual.'); return; }
  const el = $v('#modoVisual');
  el.hidden = false; aberto = true; icones();
  document.body.classList.add('em-visual');
  // o botao Voltar (celular e controle da TV) fecha o modo visual em vez de sair da pagina
  if (!(history.state && history.state.visual)) history.pushState({ visual: 1 }, '', location.href);
  // tela cheia de verdade e tela sempre acesa: pede sem esperar (alguns celulares nem respondem)
  try { if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch {}
  try { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(t => { travaTela = t; }).catch(() => {}); } catch {}
  if (audio.paused) audio.play().catch(() => {});
  redimensionar(); acordar(); atualizarPlayVisual();
  cancelAnimationFrame(quadro); ultimo = 0; quadro = requestAnimationFrame(passo);
  await prepararMusica();
}
function fecharVisual(peloVoltar) {
  if (!aberto) return;
  if (peloVoltar !== true && history.state && history.state.visual) { history.back(); return; } // o popstate fecha
  aberto = false; cancelAnimationFrame(quadro);
  $v('#modoVisual').hidden = true; document.body.classList.remove('em-visual');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (travaTela) { travaTela.release().catch(() => {}); travaTela = null; }
}
function acordar() { $v('#modoVisual').classList.remove('quieto'); ocultarEm = performance.now() + 3000; }
function atualizarPlayVisual() { $v('#mvPlay').innerHTML = `<i data-lucide="${audio.paused ? 'play' : 'pause'}"></i>`; icones(); }

// botoes que abrem o modo visual: player do computador e tela cheia do celular
$('#bFila').insertAdjacentHTML('beforebegin', '<button class="ico" id="bVisual" aria-label="Modo visual" title="Modo visual em tela cheia"><i data-lucide="sparkles"></i></button>');
$('#tcCompartilhar').insertAdjacentHTML('beforebegin', '<button class="ico" id="tcVisual" aria-label="Modo visual em tela cheia"><i data-lucide="sparkles"></i></button>');
['#bVisual', '#tcVisual'].forEach(s => $(s).addEventListener('click', abrirVisual));
$v('#mvFechar').addEventListener('click', fecharVisual);
$v('#mvCena').addEventListener('click', () => {
  try { localStorage.setItem('ecoo.estilo', jornada ? 'classico' : 'jornada'); } catch {}
  if (!jornada && !(window.Mundo && Mundo.disponivel())) { aviso('Este aparelho não tem WebGL: fica com as cenas clássicas.'); return; }
  prepararMusica(); aviso(jornada ? 'Jornada: a música vira uma história.' : 'Cenas clássicas.');
});
$v('#mvPlay').addEventListener('click', () => { alternar(); });
$v('#mvAnterior').addEventListener('click', anterior);
$v('#mvProxima').addEventListener('click', () => proxima());
$v('#mvProgresso').addEventListener('input', e => { const d = audio.duration || (M && M.dur); if (d) audio.currentTime = e.target.value / 1000 * d; batidaIdx = -1; });
['pointermove', 'pointerdown', 'keydown'].forEach(ev => $v('#modoVisual').addEventListener(ev, acordar));
document.addEventListener('keydown', e => { if (!aberto) return; if (e.key === 'Escape' && !document.fullscreenElement) fecharVisual(); if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); alternar(); } });
document.addEventListener('fullscreenchange', () => { if (aberto) setTimeout(redimensionar, 60); });
window.addEventListener('resize', () => { if (aberto) redimensionar(); });
audio.addEventListener('play', () => aberto && atualizarPlayVisual());
audio.addEventListener('pause', () => aberto && atualizarPlayVisual());
document.addEventListener('visibilitychange', async () => {
  if (!aberto) return;
  if (!document.hidden) { try { if ('wakeLock' in navigator) travaTela = await navigator.wakeLock.request('screen'); } catch {} ultimo = 0; }
});
// troca de musica com o modo visual aberto
const antes = window.aoTrocarMusica;
window.aoTrocarMusica = m => { if (antes) antes(m); if (aberto) prepararMusica(); };
window.abrirVisual = abrirVisual;
window._trocarSecao = trocarSecao; // para testar
window.addEventListener('popstate', () => { if (aberto) fecharVisual(true); });
})();
