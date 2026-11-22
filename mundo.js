// Ecoo: Jornada. O modo visual vira uma historia: a musica e dividida em capitulos pela energia
// (trechos calmos, medios e fortes), cada capitulo e um mundo desenhado em WebGL (tinta viva, fumaca,
// tunel, mar, cosmos, caleidoscopio, estrada, aurora, fogo, chuva) e um viajante de cachecol atravessa
// esses mundos no ritmo da batida, reagindo a letra (amor traz companhia, ceu traz asas, lua nasce...).
// Sem WebGL, o visual.js continua com as cenas classicas. Carregado depois do visual.js.
(() => {
const MUNDOS = ['fluido', 'fumaca', 'tunel', 'oceano', 'cosmos', 'caleido', 'montanhas', 'aurora', 'fogo', 'chuva'];
const NOME = { fluido: 'Tinta viva', fumaca: 'Brisa', tunel: 'Velocidade', oceano: 'O mar', cosmos: 'Cosmos', caleido: 'Delírio', montanhas: 'A estrada', aurora: 'Aurora', fogo: 'Fogo', chuva: 'Chuva' };
const CALMA = { fluido: .45, fumaca: .8, tunel: .05, oceano: .95, cosmos: .55, caleido: .1, montanhas: .7, aurora: .9, fogo: .3, chuva: .85 };
const NO_CHAO = { oceano: 1, montanhas: 1, aurora: 1, chuva: 1 };
const HUMOR = { festa: ['fluido', 'tunel', 'caleido', 'cosmos'], fumaca: ['fumaca', 'fluido', 'oceano', 'aurora'], amor: ['fluido', 'oceano', 'aurora', 'cosmos'],
  chuva: ['chuva', 'oceano', 'fumaca', 'aurora'], noite: ['aurora', 'cosmos', 'oceano', 'chuva'], fogo: ['fogo', 'tunel', 'fluido', 'caleido'],
  ritual: ['fogo', 'fumaca', 'caleido', 'cosmos'], cosmos: ['cosmos', 'tunel', 'fluido', 'aurora'], topo: ['montanhas', 'oceano', 'fluido', 'cosmos'],
  neon: ['tunel', 'montanhas', 'caleido', 'fluido'] };
// palavras de cada trecho puxam o mundo do capitulo
const PALAVRA_MUNDO = [
  [/\b(mar|onda|oceano|praia|[aá]gua|rio|navega)/gi, 'oceano'], [/(fogo|queim|chama|inferno|brasa|calor)/gi, 'fogo'],
  [/(chuva|chor|l[aá]grima|saudade|sozinh|frio|cinza)/gi, 'chuva'], [/(estrela|universo|gal[aá]x|cosm|infinit|espa[çc]o|planeta)/gi, 'cosmos'],
  [/(fuma|brisa|nuvem|vento|leve|flutu|baseado|beck)/gi, 'fumaca'], [/(\blua\b|noite|madrugada|escur|sereno)/gi, 'aurora'],
  [/(\bsol\b|manh[aã]|amanhec|montanha|caminh|estrada|longe|horizonte|viagem)/gi, 'montanhas'], [/(sonho|louc|viaj|mente|psico|gira|brisa louca|delír)/gi, 'caleido'],
  [/(corre|acelera|r[aá]pido|fuga|voando|veloc|adrenalina)/gi, 'tunel'], [/(amor|cora[çc][aã]o|beij|paix|pele|desejo)/gi, 'fluido'],
];
// palavras de cada linha cantada viram acontecimentos na historia
const EVENTOS = [
  [/(amor|cora[çc]|beij|paix|love|abra[çc]|junt|n[oó]s dois|voc[eê] e eu|te quero|minha m[uo]lher|meu bem)/i, 'par'],
  [/(voa|voar|\basa|c[eé]u|livre|alto|subir|nuvem|fly)/i, 'asas'],
  [/(\blua\b|luar|moon)/i, 'lua'],
  [/(estrela|star|cometa|brilh)/i, 'cadente'],
  [/(\brei\b|coroa|king|rainha|trono|imp[eé]rio|reino)/i, 'coroa'],
  [/(dan[çc]|festa|pula|balan[çc]|rebol|party|mexe|baile)/i, 'danca'],
  [/(chuva|chor|l[aá]grima|tempestade|rain)/i, 'guarda'],
  [/(\bmar\b|onda|oceano|baleia|profund)/i, 'baleia'],
  [/(\bluz\b|sonho|desejo|esperan|\bvela|lanterna|f[eé]\b)/i, 'lanternas'],
];

// ---------- WebGL ----------
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R; uniform float T,E,G,A,P,H,MIX,CAM,INT,WA,WB;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
const mat2 RM=mat2(1.6,1.2,-1.2,1.6);
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p=RM*p;a*=.5;}return s;}
float fbm3(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*n2(p);p=RM*p;a*=.5;}return s/.875;}
vec3 pal(float t,vec3 d){return .5+.5*cos(6.28318*(t+d));}
float pontos(vec2 p,float dens,float t){vec2 g=floor(p),f=fract(p)-.5;float h=h21(g);vec2 o=(vec2(h21(g+1.7),h21(g+4.3))-.5)*.6;
 return step(dens,h)*smoothstep(.16,0.,length(f-o))*(.45+.55*sin(t*2.5+h*90.));}

vec3 wFluido(vec2 p,float t){
 p*=1.3;
 vec2 q=vec2(fbm3(p+vec2(0.,t*.12)),fbm3(p+vec2(5.2,1.3)-t*.1));
 vec2 r=vec2(fbm3(p+3.*q+vec2(1.7,9.2)+t*.15),fbm3(p+3.*q+vec2(8.3,2.8)-t*.13));
 float f=fbm(p+(2.5+2.5*INT+1.2*G)*r);
 vec3 c=pal(f*1.3+H+length(q)*.5,vec3(0.,.33,.67));
 c*=.12+1.7*f*f+.7*P*f;
 c+=pal(H+.5,vec3(0.,.1,.2))*pow(r.x,3.)*.7;
 return c;
}
vec3 wFumaca(vec2 p,float t){
 vec3 c=pal(H+.6,vec3(0.,.1,.2))*.05;
 for(int i=0;i<3;i++){float fi=float(i);
  vec2 q=p*(1.2+fi*.6)+vec2(t*(.03+fi*.025),-t*.05*(fi+1.))+fi*4.;
  float d=fbm(q+fbm3(q*1.4+t*.05)*1.6);
  d=smoothstep(.38,.95,d);
  c+=d*pal(H+fi*.12,vec3(0.,.15,.3))*(.55-fi*.13);
 }
 vec2 l=vec2(.35,.75); float k=max(0.,1.-length(p-l)*.7);
 float raios=n2(vec2(atan(p.x-l.x,p.y-l.y)*7.,t*.25));
 c+=pal(H+.1,vec3(.1,.2,.3))*(pow(k,3.)*(.5+.6*P)+raios*pow(k,2.)*.35);
 return c;
}
vec3 wTunel(vec2 p,float t){
 float r=length(p),a=atan(p.y,p.x),u=a/3.14159;
 float z=.32/max(r,.002)+CAM*1.4;
 float tw=u*3.+z*.12*sin(t*.13);
 float aneis=smoothstep(.3,0.,abs(fract(z*.5)-.5));
 float grade=smoothstep(.12,0.,abs(fract(tw*4.)-.5));
 vec3 col=pal(z*.04+H+abs(u)*.3,vec3(0.,.33,.67));
 vec3 c=col*(aneis*(.35+1.3*P)+grade*.35+fbm3(vec2(cos(a),sin(a))*2.5+vec2(z*.7,0.))*.35);
 c*=smoothstep(0.,.35,r);
 c+=pal(H+.5,vec3(.1,.2,.3))*.06/(r*r*6.+.05)*(.4+E);
 return c;
}
vec3 wOceano(vec2 p,float t){
 float hz=-.04;
 vec3 alto=pal(H+.55,vec3(0.,.1,.2))*.3, baixo=pal(H+.03,vec3(0.,.15,.3))*.9;
 vec2 sol=vec2(-.05,.1);
 vec3 luzS=pal(H+.08,vec3(0.,.1,.2));
 if(p.y>hz){
  float y=p.y-hz;
  vec3 c=mix(baixo,alto,smoothstep(0.,.55,y));
  float d=length(p-sol);
  c+=luzS*(smoothstep(.115,.105,d)*1.1+.05/(d*d*25.+.3)*(.5+.6*P));
  float n=fbm(vec2(p.x*1.8+t*.015,y*6.));
  c=mix(c,c*.45+baixo*.25,smoothstep(.5,.8,n)*smoothstep(.5,.06,y));
  c+=pontos(p*70.,.9,t)*smoothstep(.15,.5,y);
  return c;
 }
 float d=hz-p.y; float z=.06/max(d,.002);
 vec2 w=vec2(p.x*z,z+CAM*.5);
 float on=fbm3(w*vec2(1.4,.7)+vec2(t*.08,0.));
 float on2=n2(w*vec2(7.,3.)-vec2(0.,t*.6));
 vec3 c=mix(baixo*.55,alto*.35,smoothstep(0.,.35,d));
 float col=exp(-abs(p.x-sol.x)*(5.+28.*d))*(on2*1.3+.15);
 c+=luzS*col*(1.-smoothstep(0.,.5,d))*(.8+P);
 c*=.65+on*.7;
 return c;
}
vec3 estrelas(vec2 p){vec3 c=vec3(0.);
 for(int i=0;i<4;i++){float fi=float(i);float z=fract(fi*.25+CAM*.06);
  vec2 q=p*mix(16.,1.8,z)+fi*17.3; vec2 g=floor(q),f=fract(q)-.5;
  float h=h21(g); vec2 o=vec2(h21(g+3.1),h21(g+7.7))-.5;
  float b=smoothstep(.07*z+.015,0.,length(f-o*.6))*smoothstep(1.,.8,z)*smoothstep(0.,.3,z)*step(.55,h);
  c+=b*pal(h+H,vec3(0.,.2,.4))*2.2;}
 return c;}
vec3 wCosmos(vec2 p,float t){
 float a=t*.015; vec2 q=p*1.2*mat2(cos(a),-sin(a),sin(a),cos(a));
 float n=fbm(q*1.4+fbm3(q*2.+t*.03)*1.3);
 vec3 c=pal(n+H+.6,vec3(0.,.2,.45))*pow(n,3.)*2.;
 c+=pal(H+.2,vec3(.1,.3,.5))*pow(fbm3(q*3.-t*.02),4.)*1.3;
 float r=length(p);float braco=sin(atan(p.y,p.x)*2.-r*11.+t*.2)*.5+.5;
 c+=pal(H+.1,vec3(0.,.1,.2))*braco*exp(-r*3.)*.5+vec3(1.,.92,.8)*exp(-r*16.)*(.4+.8*P);
 return c+estrelas(p);
}
vec3 wCaleido(vec2 p,float t){
 float r=length(p),a=atan(p.y,p.x);
 float k=6.+floor(INT*3.+.5)*2.,s=6.28318/k;
 a=mod(a+t*.05,s);a=abs(a-s*.5);
 vec2 q=vec2(cos(a),sin(a))*r*(1.6+.3*sin(t*.2))+vec2(t*.08,CAM*.04);
 float f=fbm(q*2.+fbm3(q*3.-t*.1)*2.);
 vec3 c=pal(f*1.5+r*.7-t*.04+H,vec3(0.,.33,.67));
 c*=smoothstep(.15,.85,f)*1.5+.08;
 c+=pal(H+.5,vec3(0.,.2,.4))*smoothstep(.05,0.,abs(fract(r*3.-CAM*.25)-.5))*(.25+P*.8);
 return c;
}
vec3 wMontanhas(vec2 p,float t){
 vec3 alto=pal(H+.62,vec3(0.,.1,.25))*.28, baixo=pal(H,vec3(0.,.12,.25));
 vec3 c=mix(baixo,alto,smoothstep(-.15,.5,p.y));
 vec2 sol=vec2(.22,.06);float d=length(p-sol);
 c+=pal(H+.05,vec3(0.,.1,.2))*(smoothstep(.15,.14,d)*.9+.04/(d*d*20.+.25)*(.6+.5*P));
 for(int i=0;i<5;i++){float fi=float(i);
  float x=p.x*(1.+fi*.45)+CAM*(.04+fi*.07)+fi*13.;
  float h=.02-fi*.075+fbm3(vec2(x*1.1,fi*3.))*.3*(1.-fi*.1);
  vec3 mc=mix(baixo*.75+alto*.2,alto*.12,fi/4.);
  c=mix(c,mc,smoothstep(.003,0.,p.y-h));
 }
 return c;
}
vec3 wAurora(vec2 p,float t){
 vec3 c=mix(pal(H+.6,vec3(0.,.1,.2))*.14,vec3(.01,.015,.04),smoothstep(-.3,.6,p.y));
 c+=pontos(p*80.,.88,t)*smoothstep(-.1,.2,p.y);
 for(int i=0;i<3;i++){float fi=float(i);
  float x=p.x*(1.1+fi*.35)+t*.025*(fi+1.)+fi*3.;
  float y0=.02+fi*.1+(fbm3(vec2(x*1.3,t*.04+fi*2.))-.5)*.45;
  float d=p.y-y0;
  float b=exp(-max(-d,0.)*28.)*exp(-max(d,0.)*(3.5-fi*.6));
  b*=.5+.5*n2(vec2(x*24.,t*.3+fi));
  c+=b*pal(H+.3+fi*.13,vec3(0.,.25,.5))*(.4+.35*E+.45*P);
 }
 float hz=-.13+fbm3(vec2(p.x*1.5+CAM*.05,1.))*.1;
 float cel=p.x*22.+CAM*1.1,tri=abs(fract(cel)-.5)*2.,th=h21(vec2(floor(cel),4.));
 c=mix(c,vec3(.005,.008,.015),smoothstep(.004,0.,p.y-(hz+step(.35,th)*(1.-tri)*th*.13)));
 return c;
}
vec3 wFogo(vec2 p,float t){
 vec2 q=p*vec2(2.2,1.6);q.y-=t*.9*(1.+E*.6);
 float n=fbm(q+fbm3(q*2.1)*.9);
 float alt=p.y+.5;
 float f=clamp(n*1.7-alt*(1.35-.45*G-.3*P),0.,1.);
 vec3 c=vec3(1.6*f,1.5*f*f*f,f*f*f*f*f*f);
 c=mix(c,pal(H+f*.25,vec3(0.,.2,.4))*f*1.4,.3);
 return c+vec3(.05,.012,0.)*(1.-alt)+vec3(.02,.005,.02);
}
vec3 wChuva(vec2 p,float t){
 vec3 c=mix(pal(H+.55,vec3(0.,.1,.2))*.12,vec3(.012,.018,.04),smoothstep(-.5,.5,p.y));
 for(int i=0;i<3;i++){float fi=float(i);float s=3.5+fi*3.;
  vec2 q=p*s+vec2(CAM*.08*(fi+1.),fi*7.);
  vec2 g=floor(q),f=fract(q)-.5;float h=h21(g+fi*11.);
  vec2 o=(vec2(h21(g+1.3),h21(g+5.1))-.5)*.5;
  float b=smoothstep(.42-fi*.1,.3-fi*.1,length(f-o))*step(.45,h)*smoothstep(.35,-.35,p.y+(h-.5)*.6);
  c+=b*pal(h*.4+H,vec3(0.,.15,.3))*(.2+.1*sin(t*.5+h*20.))*(1.+P*.5);
 }
 float coluna=floor(p.x*90.);float vel=1.+h21(vec2(coluna,1.));
 float y=fract(p.y*1.4+t*vel*1.3+h21(vec2(coluna,2.)));
 c+=vec3(.45,.55,.75)*smoothstep(0.,.05,y)*smoothstep(.14,.05,y)*.22*step(.55,h21(vec2(coluna,3.)));
 return c;
}
vec3 mundo(float w,vec2 p,float t){
 if(w<.5)return wFluido(p,t); if(w<1.5)return wFumaca(p,t); if(w<2.5)return wTunel(p,t);
 if(w<3.5)return wOceano(p,t); if(w<4.5)return wCosmos(p,t); if(w<5.5)return wCaleido(p,t);
 if(w<6.5)return wMontanhas(p,t); if(w<7.5)return wAurora(p,t); if(w<8.5)return wFogo(p,t);
 return wChuva(p,t);
}
void main(){
 vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
 p*=1.-.035*P;
 vec3 c=mundo(WA,p,T);
 if(MIX>.001){
  // a passagem entre mundos abre como um portal a partir do centro
  float onda=smoothstep(MIX*1.3-.15,MIX*1.3,length(p)*.9);
  c=mix(mundo(WB,p,T),c,onda);
  c+=pal(H,vec3(0.,.33,.67))*smoothstep(.08,0.,abs(length(p)*.9-MIX*1.3+.07))*(1.-MIX)*.8;
 }
 c=1.-exp(-c*1.5);
 vec2 u=gl_FragCoord.xy/R; c*=.4+.6*pow(16.*u.x*u.y*(1.-u.x)*(1.-u.y),.22);
 c+=(h21(gl_FragCoord.xy+fract(T*7.)*100.)-.5)*.03;
 gl_FragColor=vec4(c,1.);
}`;

const caixa = document.querySelector('#modoVisual');
const cv = document.createElement('canvas');
cv.id = 'mvMundo'; cv.hidden = true;
caixa.insertBefore(cv, caixa.querySelector('#mvTela'));
const UN = ['R', 'T', 'E', 'G', 'A', 'P', 'H', 'MIX', 'CAM', 'INT', 'WA', 'WB'];
let G_ = null, falhou = false;
function iniciarGL() {
  if (G_ || falhou) return G_;
  try {
    const gl = cv.getContext('webgl', { antialias: false, depth: false, alpha: false, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl');
    if (!gl) throw 0;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); throw 0; } return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw 0;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; UN.forEach(n => U[n] = gl.getUniformLocation(pr, n));
    G_ = { gl, U };
  } catch { falhou = true; G_ = null; }
  return G_;
}
cv.addEventListener('webglcontextlost', e => { e.preventDefault(); falhou = true; G_ = null; });

// ---------- estado ----------
const ehTV = document.documentElement.classList.contains('tv');
const pouco = ehTV || matchMedia('(pointer: coarse)').matches;
let W = 0, H = 0, caps = [], capAtual = -1, wa = 0, wb = 0, mixT = 0, relogio = 0, cam = 0, eLenta = .4, intens = .5;
let hAtual = 0, hAlvo = 0, tAntes = 0, dur = 240, chaoA = 0, kick = 0, fase = 0, titulo = null;
let px = 0, py = 0, parA = 0, asasA = 0, guardaA = 0, dancaA = 0, luaA = 0, coroa = false;
let ate = {}, seres = [], timers = {}, pronto = false, rnd = Math.random;

function semente(txt) { let h = 1779033703; for (const ch of String(txt)) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353), h = h << 13 | h >>> 19; return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function amostra(v, fps, t) { if (!v || !v.length) return .5; const i = Math.max(0, Math.min(v.length - 1, Math.round(t * fps))); return v[i]; }
const lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ROMANO = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

// divide a musica em capitulos e escolhe o mundo de cada um
function roteiro(R, letra, humor, id) {
  const sorte = semente(id), n = Math.max(1, Math.floor(dur));
  const lv = new Float32Array(n);
  for (let s = 0; s < n; s++) { let soma = 0, c = 0; for (let k = -4; k <= 4; k += .5) { soma += R.e ? amostra(R.e, R.fps, s + k) : .5; c++; } lv[s] = soma / c; }
  const ord = Array.from(lv).sort((a, b) => a - b), lo = ord[Math.floor(n * .15)], hi = ord[Math.floor(n * .9)];
  for (let s = 0; s < n; s++) lv[s] = lim((lv[s] - lo) / Math.max(.05, hi - lo));
  const classe = v => v < .38 ? 0 : v < .7 ? 1 : 2;
  const lista = []; let ini = 0, cl = classe(lv[0]), dif = 0;
  for (let s = 1; s < n; s++) {
    const c = classe(lv[s]); dif = c !== cl ? dif + 1 : 0;
    const len = s - ini;
    if ((dif >= 3 && len >= 14) || len >= 36) { const corte = dif >= 3 ? s - 2 : s; lista.push({ ini, fim: corte }); ini = corte; cl = c; dif = 0; }
  }
  lista.push({ ini, fim: dur + 30 });
  if (lista.length > 1 && dur - lista[lista.length - 1].ini < 9) { const u = lista.pop(); lista[lista.length - 1].fim = u.fim; }
  // comeco de cada capitulo cai numa batida
  const B = R.batidas || [];
  for (let i = 1; i < lista.length; i++) {
    let melhor = lista[i].ini, d = 1.6;
    for (const b of B) { if (Math.abs(b - lista[i].ini) < d) { d = Math.abs(b - lista[i].ini); melhor = b; } if (b > lista[i].ini + 2) break; }
    lista[i].ini = melhor; lista[i - 1].fim = melhor;
  }
  const preferidos = HUMOR[humor] || HUMOR.neon, usados = {};
  let antes = null;
  lista.forEach((c, i) => {
    let s = 0, k0 = Math.floor(c.ini), k1 = Math.min(n, Math.ceil(c.fim));
    for (let k = k0; k < k1; k++) s += lv[k];
    c.int = s / Math.max(1, k1 - k0);
    const texto = letra ? letra.linhas.filter(l => l[0] >= c.ini - 1 && l[0] < c.fim).map(l => l[1]).join(' ') : '';
    let melhor = null, nota = -1e9;
    for (const w of MUNDOS) {
      let p = 0; const pos = preferidos.indexOf(w); if (pos >= 0) p += [3, 2.2, 1.6, 1.2][pos];
      p -= Math.abs(CALMA[w] - (1 - c.int)) * 3.5;
      for (const [re, mw] of PALAVRA_MUNDO) if (mw === w) { const m = texto.match(re); if (m) p += Math.min(3, m.length) * 1.5; }
      if (w === antes) p -= 10;
      p -= (usados[w] || 0) * 2.7; p += sorte() * .9;
      if (i === 0) p += CALMA[w] * 1.2; // a historia comeca mais calma
      if (p > nota) { nota = p; melhor = w; }
    }
    c.mundo = melhor; c.h = sorte(); antes = melhor; usados[melhor] = (usados[melhor] || 0) + 1;
  });
  return lista;
}

function capituloEm(t) { for (let i = caps.length - 1; i >= 0; i--) if (t >= caps[i].ini) return i; return 0; }
function mundoVisivel() { return caps[capAtual] ? (mixT > 0 && mixT > .5 ? MUNDOS[wb] : MUNDOS[wa]) : 'fluido'; }
function trocarCapitulo(i, suave) {
  const c = caps[i]; if (!c) return;
  const idx = MUNDOS.indexOf(c.mundo);
  if (suave && capAtual >= 0) { wb = idx; mixT = .0001; kick = 1; }
  else { wa = idx; mixT = 0; }
  hAlvo = c.h; if (!suave) hAtual = hAlvo;
  capAtual = i; seres = seres.filter(s => s.fica);
  titulo = { num: ROMANO[i] || String(i + 1), nome: NOME[c.mundo], vida: 0 };
  const el = document.querySelector('#mvCena'); if (el) el.textContent = 'Jornada · ' + NOME[c.mundo];
}

// ---------- desenho 2D da historia ----------
let ctx = null;
const sprites = new Map();
function brilho(h) { // bolinha de luz pre-desenhada
  const k = Math.round(((h % 360) + 360) % 360 / 8) * 8;
  if (sprites.has(k)) return sprites.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `hsla(${k},95%,85%,1)`); gr.addColorStop(.25, `hsla(${k},90%,62%,.65)`); gr.addColorStop(1, `hsla(${k},90%,55%,0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); sprites.set(k, c); return c;
}
function luz(x, y, r, h, a = 1) { if (a <= 0.01) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(brilho(h), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
const TINTA = '#07060b';
const matizCSS = () => (hAtual * 360 + relogio * 3) % 360;

function chaoY(x) { return H * (.73 + .028 * Math.sin(x / W * 2.3 + cam * .9) + .014 * Math.sin(x / W * 6.1 + cam * 2.2)) + (1 - chaoA) * H * .3; }
function desenharChao(h) {
  if (chaoA < .01) return;
  ctx.beginPath(); ctx.moveTo(0, H + 2);
  for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, chaoY(x));
  ctx.lineTo(W + 16, H + 2); ctx.closePath();
  ctx.fillStyle = TINTA; ctx.globalAlpha = chaoA; ctx.fill();
  ctx.strokeStyle = `hsla(${h},80%,65%,.35)`; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
}

function viajante(x, y, s, o) {
  const P = o.pulso, h = o.h;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = o.alpha;
  const bob = Math.abs(Math.sin(o.fase)) * s * .035 * (1 - o.voo) + o.danca * Math.abs(Math.sin(o.fase * .5)) * s * .12 + kick * s * .03;
  ctx.translate(0, -bob); ctx.rotate(o.voo * .32 + o.danca * Math.sin(o.fase * .5) * .12);
  ctx.globalCompositeOperation = 'lighter';
  luz(0, -s * .6, s * (1.05 + .3 * P), h, (.22 + .35 * P) * o.alpha);
  // asas de luz
  if (o.asas > .01) for (const lado of [-1, 1]) {
    ctx.save(); ctx.translate(-s * .02, -s * .74); ctx.scale(lado, 1); ctx.rotate(-.35 + Math.sin(relogio * 5) * .35 + P * .3);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * .4, -s * .55, s * 1.05, -s * .5, s * 1.15, -s * .08);
    ctx.bezierCurveTo(s * .75, -s * .1, s * .5, s * .12, 0, s * .1);
    ctx.fillStyle = `hsla(${h + 20},95%,70%,${.3 * o.asas})`; ctx.fill();
    ctx.strokeStyle = `hsla(${h + 20},100%,80%,${.75 * o.asas})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  // cachecol: a assinatura do viajante, longa e brilhante
  const N = 16, len = s * (.95 + .8 * o.voo + .35 * P + .3 * kick);
  const topo = [], baixo = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1), larg = s * .065 * (1 - u * .55);
    const qx = -u * len, qy = -s * .82 + Math.sin(relogio * 6.5 - u * 5.5) * s * .09 * u - u * s * .1 * (o.voo - .4) + u * u * s * .14 * (1 - o.voo);
    topo.push([qx, qy - larg]); baixo.push([qx, qy + larg]);
  }
  ctx.beginPath(); topo.forEach(([a, b], k) => ctx[k ? 'lineTo' : 'moveTo'](a, b)); for (let k = N - 1; k >= 0; k--) ctx.lineTo(baixo[k][0], baixo[k][1]); ctx.closePath();
  ctx.fillStyle = `hsla(${h},95%,62%,${.9 * o.alpha})`; ctx.fill();
  luz(topo[N - 1][0], topo[N - 1][1], s * .2, h, .5 * o.alpha);
  ctx.globalCompositeOperation = 'source-over';
  // pernas
  ctx.strokeStyle = TINTA; ctx.lineCap = 'round'; ctx.lineWidth = s * .075;
  const pa = Math.sin(o.fase) * .55 * (1 - o.voo);
  for (const sg of [1, -1]) {
    const ang = sg * pa - o.voo * .45;
    ctx.beginPath(); ctx.moveTo(0, -s * .38); ctx.lineTo(Math.sin(ang) * s * .38, -s * .38 + Math.cos(ang) * s * .38); ctx.stroke();
  }
  // manto e cabeca
  const fl = Math.sin(relogio * 5) * s * .03 + kick * s * .04;
  ctx.fillStyle = TINTA; ctx.beginPath();
  ctx.moveTo(-s * .07, -s * .86); ctx.lineTo(s * .07, -s * .86); ctx.lineTo(s * .2 + fl * .5, -s * .3);
  ctx.quadraticCurveTo(0, -s * .24, -s * .24 - fl * 1.5, -s * .3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -s * .96, s * .105, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * .1, -s * .94); ctx.lineTo(s * .03, -s * 1.13); ctx.lineTo(s * .1, -s * .93); ctx.fill();
  ctx.strokeStyle = `hsla(${h},90%,70%,.55)`; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; luz(s * .045, -s * .97, s * .05, h + 40, .9); ctx.globalCompositeOperation = 'source-over';
  // coroa
  if (o.coroa) {
    ctx.fillStyle = '#f5c84c'; ctx.beginPath(); const cy = -s * 1.1;
    ctx.moveTo(-s * .09, cy); [-.09, -.06, -.03, 0, .03, .06, .09].forEach((v, k) => ctx.lineTo(s * v, cy - (k % 2 ? s * .02 : s * .08)));
    ctx.lineTo(s * .09, cy); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; luz(0, cy - s * .04, s * .16, 45, .5 + P * .4); ctx.globalCompositeOperation = 'source-over';
  }
  // guarda-chuva
  if (o.guarda > .01) {
    ctx.globalAlpha = o.alpha * o.guarda; ctx.strokeStyle = TINTA; ctx.lineWidth = s * .03;
    ctx.beginPath(); ctx.moveTo(s * .1, -s * .55); ctx.lineTo(s * .1, -s * 1.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * .1, -s * 1.3, s * .42, Math.PI, 0);
    for (let k = 4; k >= 0; k--) ctx.quadraticCurveTo(s * .1 - s * .42 + s * .84 * (k + .5) / 5, -s * 1.22, s * .1 - s * .42 + s * .84 * k / 5, -s * 1.3);
    ctx.fillStyle = TINTA; ctx.fill(); ctx.strokeStyle = `hsla(${h},90%,70%,.6)`; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}

// criaturas e coisas que vivem em cada mundo
function nascer(tipo, extra = {}) { if (seres.length < 90) seres.push(Object.assign({ tipo, vida: 0, fase: rnd() * 7 }, extra)); }
function baleiaForma(s, cauda = 0) {
  const c = Math.sin(cauda) * s * .06;
  ctx.beginPath(); ctx.moveTo(s * .5, s * .02);
  ctx.bezierCurveTo(s * .5, -s * .14, s * .3, -s * .2, s * .05, -s * .17);
  ctx.bezierCurveTo(-s * .2, -s * .13, -s * .38, -s * .05, -s * .5, c * .5);
  ctx.bezierCurveTo(-s * .58, -s * .06 + c, -s * .7, -s * .13 + c, -s * .76, -s * .11 + c);
  ctx.quadraticCurveTo(-s * .66, c, -s * .76, s * .1 + c);
  ctx.bezierCurveTo(-s * .68, s * .09 + c, -s * .58, s * .05 + c, -s * .5, s * .03 + c * .5);
  ctx.bezierCurveTo(-s * .3, s * .1, 0, s * .17, s * .3, s * .14);
  ctx.quadraticCurveTo(s * .48, s * .11, s * .5, s * .02); ctx.closePath();
}
function baleiaDetalhe(s, cor) { // nadadeira, olho e as pregas da barriga
  ctx.strokeStyle = cor; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(s * .12, s * .1); ctx.quadraticCurveTo(s * .02, s * .26, -s * .1, s * .3); ctx.quadraticCurveTo(-s * .02, s * .18, s * .02, s * .1); ctx.stroke();
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(s * (.42 - k * .02), s * (.05 + k * .022)); ctx.quadraticCurveTo(s * .1, s * (.11 + k * .025), -s * .15, s * (.09 + k * .02)); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(s * .36, -s * .02, s * .012, 0, 7); ctx.stroke();
}
function moverSeres(dt, P, h) {
  for (let i = seres.length - 1; i >= 0; i--) {
    const q = seres[i]; q.vida += dt; q.fase += dt;
    switch (q.tipo) {
      case 'aguaviva': {
        q.vy += (-14 - q.vy) * dt; q.y += q.vy * dt * (q.s / 40); q.x += Math.sin(q.fase * .7) * 12 * dt;
        if (q.y < -q.s * 3) { seres.splice(i, 1); break; }
        const con = 1 - .18 * Math.max(0, q.pulso || 0); q.pulso = Math.max(0, (q.pulso || 0) - dt * 3);
        ctx.globalCompositeOperation = 'lighter';
        luz(q.x, q.y, q.s * 1.6, q.h, .35);
        ctx.fillStyle = `hsla(${q.h},90%,70%,.32)`; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.s * con, q.s * .7, 0, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = `hsla(${q.h},95%,75%,.45)`; ctx.lineWidth = 1.4;
        for (let k = 0; k < 5; k++) { const bx = q.x + (k - 2) * q.s * .35 * con; ctx.beginPath(); ctx.moveTo(bx, q.y);
          for (let j = 1; j <= 6; j++) ctx.lineTo(bx + Math.sin(q.fase * 2.4 + j * .8 + k) * q.s * .12, q.y + j * q.s * .32); ctx.stroke(); }
        ctx.globalCompositeOperation = 'source-over'; break; }
      case 'lanterna': {
        q.y -= q.v * dt; q.x += Math.sin(q.fase * .8) * 10 * dt;
        if (q.y < -40) { seres.splice(i, 1); break; }
        const tr = .75 + .25 * Math.sin(q.fase * 7 + q.s);
        ctx.globalCompositeOperation = 'lighter'; luz(q.x, q.y, q.s * 3.2, 32, .45 * tr);
        ctx.fillStyle = `hsla(34,100%,${60 + 12 * tr}%,.9)`; ctx.fillRect(q.x - q.s * .5, q.y - q.s * .65, q.s, q.s * 1.3);
        ctx.globalCompositeOperation = 'source-over'; break; }
      case 'vagalume': {
        q.x += Math.sin(q.fase * 1.3 + q.s) * 20 * dt; q.y += Math.cos(q.fase * .9 + q.s) * 14 * dt;
        if (q.vida > 14) { seres.splice(i, 1); break; }
        ctx.globalCompositeOperation = 'lighter'; luz(q.x, q.y, 10 + 6 * P, 70, Math.max(0, Math.sin(q.fase * 2 + q.s)) * Math.min(1, q.vida, 14 - q.vida)); ctx.globalCompositeOperation = 'source-over'; break; }
      case 'baleia': {
        const k = q.vida / q.max; if (k >= 1) { seres.splice(i, 1); break; }
        const x = q.x0 + (q.x1 - q.x0) * k, y = q.y + Math.sin(q.fase * .4) * H * .03;
        ctx.save(); ctx.translate(x, y); ctx.scale(q.x1 < q.x0 ? -1 : 1, 1); ctx.rotate(Math.sin(q.fase * .4 + 1) * .06);
        const a = Math.min(1, k * 6, (1 - k) * 6);
        baleiaForma(q.s, q.fase * 1.3);
        if (q.cosmica) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `hsla(${q.h},80%,60%,${.16 * a})`; ctx.fill(); ctx.strokeStyle = `hsla(${q.h},90%,75%,${.55 * a})`; ctx.lineWidth = 1.5; ctx.stroke();
          baleiaDetalhe(q.s, `hsla(${q.h},90%,80%,${.45 * a})`);
          for (let j = 0; j < 9; j++) luz((j / 9 - .45) * q.s * .9, Math.sin(j * 2.3) * q.s * .06, 4 + 3 * P, q.h + j * 9, .8 * a); ctx.globalCompositeOperation = 'source-over'; }
        else { ctx.globalAlpha = a * .92; ctx.fillStyle = TINTA; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.restore(); break; }
      case 'salto': { // baleia saltando no mar
        const k = q.vida / 3.2; if (k >= 1) { seres.splice(i, 1); break; }
        const x = q.x + k * q.s * 1.2, y = q.y - Math.sin(k * Math.PI) * q.s * .55;
        ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.cos(k * Math.PI) * .9); baleiaForma(q.s, q.fase * 3); ctx.fillStyle = TINTA; ctx.fill();
        ctx.strokeStyle = `hsla(${h},80%,70%,.5)`; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        if (k > .85 || k < .12) { ctx.globalCompositeOperation = 'lighter'; luz(x, q.y, q.s * .4, h + 180, .35); ctx.globalCompositeOperation = 'source-over'; }
        break; }
      case 'passaros': {
        q.x -= q.v * dt; if (q.x < -W * .3) { seres.splice(i, 1); break; }
        ctx.strokeStyle = TINTA; ctx.lineWidth = 2;
        for (let j = 0; j < q.n; j++) { const bx = q.x + Math.abs(j - q.n / 2) * 26, by = q.y + (j - q.n / 2) * 14 + Math.sin(q.fase * 2 + j) * 4, as = Math.sin(q.fase * 9 + j) * 7;
          ctx.beginPath(); ctx.moveTo(bx - 10, by - as); ctx.quadraticCurveTo(bx - 4, by - 3, bx, by); ctx.quadraticCurveTo(bx + 4, by - 3, bx + 10, by - as); ctx.stroke(); }
        break; }
      case 'cadente': {
        if (q.vida > .9) { seres.splice(i, 1); break; }
        const x = q.x + q.vx * q.vida, y = q.y + q.vy * q.vida, a = Math.sin(q.vida / .9 * Math.PI);
        ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(x, y, x - q.vx * .25, y - q.vy * .25);
        gr.addColorStop(0, `hsla(${q.h},90%,85%,${a})`); gr.addColorStop(1, `hsla(${q.h},90%,70%,0)`);
        ctx.strokeStyle = gr; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - q.vx * .25, y - q.vy * .25); ctx.stroke();
        luz(x, y, 14, q.h, a); ctx.globalCompositeOperation = 'source-over'; break; }
      case 'risco': { // velocidade no tunel
        q.r += q.r * dt * 2.8 + 40 * dt; if (q.r > Math.max(W, H)) { seres.splice(i, 1); break; }
        const c = Math.cos(q.ang), s = Math.sin(q.ang), r2 = q.r * 1.25;
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `hsla(${q.h},90%,75%,${Math.min(.7, q.r / H)})`; ctx.lineWidth = 1 + q.r / H * 3;
        ctx.beginPath(); ctx.moveTo(W / 2 + c * q.r, H / 2 + s * q.r); ctx.lineTo(W / 2 + c * r2, H / 2 + s * r2); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; break; }
      case 'brasa': {
        q.y -= q.v * dt; q.x += Math.sin(q.fase * 3 + q.s) * 30 * dt; if (q.vida > q.max) { seres.splice(i, 1); break; }
        ctx.globalCompositeOperation = 'lighter'; luz(q.x, q.y, q.s * (1 + P * .6), 22 + q.s, 1 - q.vida / q.max); ctx.globalCompositeOperation = 'source-over'; break; }
      case 'coracao': {
        q.y -= 50 * dt; q.x += Math.sin(q.fase * 2) * 18 * dt; if (q.vida > 3) { seres.splice(i, 1); break; }
        ctx.save(); ctx.translate(q.x, q.y); ctx.globalAlpha = 1 - q.vida / 3; ctx.fillStyle = `hsl(${345 + q.s},90%,66%)`; ctx.beginPath();
        const r = 9 + q.s * .4; for (let k = 0; k <= 30; k++) { const a = k / 30 * Math.PI * 2; ctx.lineTo(16 * Math.sin(a) ** 3 * r / 16, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r / 16); }
        ctx.fill(); ctx.restore(); break; }
      case 'anel': {
        if (q.vida > 1.2) { seres.splice(i, 1); break; }
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `hsla(${q.h},95%,70%,${(1 - q.vida / 1.2) * .7})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(q.x, q.y, 20 + q.vida * Math.max(W, H) * .5, 0, 7); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; break; }
    }
  }
}
// cada mundo vai soltando as suas criaturas
function povoar(dt, mundo, h, s) {
  const vez = (nome, cada) => { timers[nome] = (timers[nome] || 0) - dt; if (timers[nome] <= 0) { timers[nome] = cada * (.6 + rnd() * .8); return true; } return false; };
  const conta = tipo => seres.reduce((n, q) => n + (q.tipo === tipo), 0);
  if (mundo === 'fluido' && vez('aguaviva', 3.5) && conta('aguaviva') < 5) nascer('aguaviva', { x: W * (.1 + rnd() * .8), y: H + 60, vy: -20, s: s * (.25 + rnd() * .3), h: h + rnd() * 80 - 40 });
  if ((mundo === 'fumaca' || mundo === 'aurora') && vez('lanterna', 1.6) && conta('lanterna') < 14) nascer('lanterna', { x: W * (.05 + rnd() * .9), y: H + 30, v: 25 + rnd() * 30, s: 6 + rnd() * 8 });
  if ((mundo === 'aurora' || mundo === 'montanhas') && vez('vagalume', .7) && conta('vagalume') < 18) nascer('vagalume', { x: rnd() * W, y: H * (.55 + rnd() * .3), s: rnd() * 9 });
  if (mundo === 'cosmos' && vez('baleia', 14) && conta('baleia') < 1) { const d = rnd() < .5; nascer('baleia', { x0: d ? -W * .4 : W * 1.4, x1: d ? W * 1.4 : -W * .4, y: H * (.25 + rnd() * .2), s: Math.min(W, H) * (.5 + rnd() * .25), max: 26, cosmica: true, h: h + 150 }); }
  if (mundo === 'fumaca' && vez('baleiaF', 22) && conta('baleia') < 1) nascer('baleia', { x0: W * 1.4, x1: -W * .4, y: H * .3, s: Math.min(W, H) * .45, max: 30, cosmica: true, h: h + 40 });
  if (mundo === 'oceano' && vez('salto', 16) && conta('salto') < 1) nascer('salto', { x: W * (.55 + rnd() * .2), y: H * .56, s: Math.min(W, H) * .22 });
  if ((mundo === 'oceano' || mundo === 'montanhas') && vez('passaros', 9) && conta('passaros') < 2) nascer('passaros', { x: W * 1.15, y: H * (.18 + rnd() * .2), v: 50 + rnd() * 40, n: 3 + Math.floor(rnd() * 5) });
  if (mundo === 'fogo' && vez('brasa', .12) && conta('brasa') < 45) nascer('brasa', { x: rnd() * W, y: H + 10, v: 70 + rnd() * 140, s: 3 + rnd() * 7, max: 3 + rnd() * 3 });
}

// ---------- API usada pelo visual.js ----------
window.Mundo = {
  _ver(nome) { wa = MUNDOS.indexOf(nome); mixT = 0; }, // para testar um mundo
  _caps() { return caps.map(c => [Math.round(c.ini), c.mundo, +c.int.toFixed(2)]); },
  disponivel() { return !!iniciarGL(); },
  ligar(sim) { cv.hidden = !sim; },
  tamanho(w, h, escala) {
    W = w; H = h;
    const orc = (pouco ? .3e6 : .62e6) * escala * escala, k = Math.min(window.devicePixelRatio || 1, Math.sqrt(orc / Math.max(1, w * h)));
    cv.width = Math.max(64, Math.round(w * k)); cv.height = Math.max(36, Math.round(h * k));
  },
  preparar({ id, R, letra, humor, duracao }) {
    dur = duracao || 240; rnd = semente(id + '#');
    caps = roteiro(R, letra, humor, id); capAtual = -1; mixT = 0; seres = []; timers = {}; ate = {}; coroa = false;
    cam = 0; relogio = 0; tAntes = 0; parA = asasA = guardaA = dancaA = luaA = 0; px = 0; py = 0; pronto = true;
  },
  batida(gb, forte) {
    if (!pronto) return;
    kick = Math.max(kick, .5 + .5 * gb);
    const m = mundoVisivel(), h = matizCSS();
    if (m === 'tunel') for (let k = 0; k < (forte ? 10 : 4); k++) nascer('risco', { ang: rnd() * 7, r: 10 + rnd() * 30, h: h + rnd() * 60 });
    if (m === 'fluido') seres.forEach(q => { if (q.tipo === 'aguaviva') { q.vy = -70 - 60 * gb; q.pulso = 1; } });
    if (m === 'cosmos' && forte && rnd() < .3) nascer('cadente', { x: rnd() * W, y: rnd() * H * .4, vx: (rnd() < .5 ? -1 : 1) * W * .6, vy: H * .35, h: h + 30 });
    if (forte && intens > .62) nascer('anel', { x: px, y: py - Math.min(W, H) * .07, h });
    if (dancaA > .5 && forte) for (let k = 0; k < 3; k++) nascer('coracao', { x: px + (rnd() - .5) * 80, y: py - 80, s: rnd() * 20 });
  },
  linha(texto) {
    if (!pronto || !texto) return;
    const t = audio.currentTime || 0;
    for (const [re, ev] of EVENTOS) if (re.test(texto)) {
      if (ev === 'coroa') coroa = true;
      else if (ev === 'cadente') for (let k = 0; k < 2; k++) nascer('cadente', { x: rnd() * W, y: rnd() * H * .35, vx: (rnd() < .5 ? -1 : 1) * W * .55, vy: H * .3, h: matizCSS() + 40 });
      else if (ev === 'baleia') { if (!seres.some(q => q.tipo === 'baleia' || q.tipo === 'salto')) { if (mundoVisivel() === 'oceano') nascer('salto', { x: W * .6, y: H * .56, s: Math.min(W, H) * .22 }); else nascer('baleia', { x0: W * 1.4, x1: -W * .4, y: H * .3, s: Math.min(W, H) * .5, max: 22, cosmica: true, h: matizCSS() + 160 }); } }
      else if (ev === 'lanternas') for (let k = 0; k < 6; k++) nascer('lanterna', { x: W * (.1 + rnd() * .8), y: H + 20 + rnd() * 120, v: 30 + rnd() * 30, s: 6 + rnd() * 8 });
      else ate[ev] = t + ({ par: 28, asas: 10, lua: 30, danca: 8, guarda: 16 })[ev];
      if (ev === 'par') for (let k = 0; k < 3; k++) nascer('coracao', { x: px + (rnd() - .5) * 120, y: py - 60 - rnd() * 60, s: rnd() * 20 });
    }
  },
  quadro(dt, t, e, g, a, pulso, c2d, w, h, tocando) {
    if (!pronto || !caps.length) return;
    ctx = c2d; W = w; H = h;
    const lento = tocando ? 1 : .15;
    relogio += dt * lento; eLenta += (e - eLenta) * Math.min(1, dt * .9);
    const vel = (.35 + 1.5 * eLenta) * lento; cam += dt * vel;
    // capitulo
    const ci = capituloEm(t);
    if (ci !== capAtual) trocarCapitulo(ci, capAtual >= 0 && Math.abs(t - caps[ci].ini) < 2.5 && Math.abs(t - tAntes) < 1.5);
    tAntes = t;
    if (mixT > 0) { mixT += dt / 2.6; if (mixT >= 1) { wa = wb; mixT = 0; } }
    const cap = caps[capAtual];
    intens += (cap.int - intens) * Math.min(1, dt * .5);
    let dh = hAlvo - hAtual; dh -= Math.round(dh); hAtual += dh * Math.min(1, dt * .4);
    kick = Math.max(0, kick - dt * 3);
    // mundo em WebGL
    const G = iniciarGL();
    if (G) {
      const gl = G.gl, U = G.U;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.R, cv.width, cv.height);
      gl.uniform1f(U.T, relogio % 900); gl.uniform1f(U.E, e); gl.uniform1f(U.G, g); gl.uniform1f(U.A, a); gl.uniform1f(U.P, pulso);
      gl.uniform1f(U.H, (hAtual + relogio * .006 + eLenta * .08) % 1); gl.uniform1f(U.MIX, mixT); gl.uniform1f(U.CAM, cam % 900);
      gl.uniform1f(U.INT, intens); gl.uniform1f(U.WA, wa); gl.uniform1f(U.WB, wb);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // historia por cima
    const mundo = mundoVisivel(), hc = matizCSS(), s = Math.min(W, H) * (W < H ? .19 : .13);
    const seAte = k => (ate[k] || 0) > t;
    parA += ((seAte('par') ? 1 : 0) - parA) * Math.min(1, dt * 1.2);
    asasA += ((seAte('asas') ? 1 : 0) - asasA) * Math.min(1, dt * 2);
    guardaA += ((seAte('guarda') || mundo === 'chuva' ? 1 : 0) - guardaA) * Math.min(1, dt * 2);
    dancaA += ((seAte('danca') ? 1 : 0) - dancaA) * Math.min(1, dt * 2);
    luaA += ((seAte('lua') ? 1 : 0) - luaA) * Math.min(1, dt * .8);
    const chao = NO_CHAO[mundo] && asasA < .5;
    chaoA += ((chao ? 1 : 0) - chaoA) * Math.min(1, dt * 1.4);
    // lua que nasce quando a letra fala dela
    if (luaA > .01) {
      const lx = W * .78, ly = H * (.34 - .12 * luaA), lr = Math.min(W, H) * .11;
      ctx.globalCompositeOperation = 'lighter'; luz(lx, ly, lr * 3.2, 50, .35 * luaA);
      ctx.fillStyle = `rgba(255,248,225,${.92 * luaA})`; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(170,160,150,${.25 * luaA})`;
      [[-.3, -.2, .22], [.25, .15, .16], [-.05, .35, .12], [.35, -.3, .1]].forEach(([u, v, r]) => { ctx.beginPath(); ctx.arc(lx + u * lr, ly + v * lr, r * lr, 0, 7); ctx.fill(); });
    }
    povoar(dt, mundo, hc, s);
    moverSeres(dt, pulso, hc);
    desenharChao(hc);
    // onde o viajante esta
    let tx, ty, voo, esc = 1;
    if (mundo === 'tunel') { tx = W * .5 + Math.sin(relogio * .7) * W * .05; ty = H * .62 + Math.sin(relogio * 1.1) * H * .03; voo = 1; esc = .8; }
    else if (chao) { tx = W * .4; ty = chaoY(W * .4); voo = 0; }
    else { tx = W * (.5 + .2 * Math.sin(relogio * .23)); ty = H * (.5 + .07 * Math.sin(relogio * .41)) + s * .5; voo = 1; }
    if (!px) { px = tx; py = ty; }
    px += (tx - px) * Math.min(1, dt * 2.2); py += (ty - py) * Math.min(1, dt * 2.2);
    fase += dt * (chao ? vel * 6.5 : 2) * (1 + dancaA);
    const nascendo = lim((t - .4) / 2.5), indo = lim((dur - t) / 5);
    const o = { fase, voo: chao ? 0 : 1, h: hc, alpha: nascendo * (.3 + .7 * indo), pulso, asas: asasA, guarda: guardaA, danca: dancaA, coroa };
    if (mundo === 'caleido') { // no delirio o viajante se multiplica em volta do centro
      const n = 6, raio = Math.min(W, H) * .26;
      for (let k = 0; k < n; k++) { const ang = k / n * Math.PI * 2 + relogio * .25; ctx.save(); ctx.translate(W / 2 + Math.cos(ang) * raio, H / 2 + Math.sin(ang) * raio); ctx.rotate(ang + Math.PI / 2); viajante(0, s * .5, s * .7, Object.assign({}, o, { h: hc + k * 60 })); ctx.restore(); }
    } else {
      const ex = (1 - indo) * W * .25;
      if (parA > .01) viajante(px - s * .85 * esc - ex, py + (voo ? Math.sin(relogio * 1.3) * s * .25 : chaoY(px - s * .85) - py), s * .92 * esc, Object.assign({}, o, { h: hc + 150, alpha: o.alpha * parA, fase: fase + 1.4, coroa: false, guarda: 0 }));
      viajante(px + ex, py, s * esc, o);
      if (parA > .5 && rnd() < dt * .5) nascer('coracao', { x: px - s * .4, y: py - s, s: rnd() * 20 });
    }
    // titulo do capitulo
    if (titulo) {
      titulo.vida += dt; const v = titulo.vida, al = Math.min(1, v / .7, Math.max(0, (3.6 - v) / 1));
      if (al <= 0) titulo = null;
      else {
        ctx.save(); ctx.globalAlpha = al; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12;
        try { ctx.letterSpacing = Math.round(H * .008) + 'px'; } catch {}
        ctx.font = `600 ${Math.round(Math.max(11, H * .018))}px Outfit, sans-serif`; ctx.globalAlpha = al * .7; ctx.fillText('CAPÍTULO ' + titulo.num, W / 2, H * .2);
        try { ctx.letterSpacing = Math.round(H * .004) + 'px'; } catch {}
        ctx.font = `700 ${Math.round(Math.max(22, H * .05))}px Outfit, sans-serif`; ctx.globalAlpha = al; ctx.fillText(titulo.nome, W / 2, H * .2 + H * .06);
        ctx.restore();
      }
    }
    // fim da musica: a luz vai baixando
    if (indo < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - indo) * .55})`; ctx.fillRect(0, 0, W, H); }
  },
};
})();
