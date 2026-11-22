// Ecoo: Jornada. O modo visual vira uma travessia: a musica e dividida em capitulos pela energia
// (trechos calmos, medios e fortes) e cada capitulo e uma paisagem (dunas, poente, descida, noite,
// espelho d'agua, acima das nuvens, frio, aurora, delirio, infinito, tempestade). As paisagens nao
// cortam: a luz, as cores e o relevo vao se transformando uma na outra. Um viajante de manto, com uma
// faixa de tecido que esvoaca com fisica de verdade, caminha sobre as dunas desenhadas pelo WebGL,
// voa quando a musica sobe e reage a letra (amor traz companhia, ceu traz asas, lua nasce...).
// Sem WebGL, o visual.js continua com as cenas classicas. Carregado depois do visual.js.
(() => {
const MUNDOS = ['dunas', 'poente', 'descida', 'noite', 'espelho', 'nuvens', 'neve', 'aurora', 'delirio', 'cosmos', 'tempestade'];
const NOME = { dunas: 'As dunas', poente: 'O poente', descida: 'A descida', noite: 'Noite no deserto', espelho: 'O espelho', nuvens: 'Acima das nuvens',
  neve: 'O frio', aurora: 'Aurora', delirio: 'Delírio', cosmos: 'O infinito', tempestade: 'Tempestade' };
const CALMA = { dunas: .75, poente: .62, descida: .05, noite: .9, espelho: .95, nuvens: .35, neve: .7, aurora: .85, delirio: .15, cosmos: .45, tempestade: .1 };
// a cena escolhida no admin vira o humor da jornada
const HUMOR = { festa: ['descida', 'delirio', 'nuvens', 'cosmos'], fumaca: ['nuvens', 'espelho', 'delirio', 'dunas'], amor: ['poente', 'espelho', 'aurora', 'nuvens'],
  chuva: ['neve', 'espelho', 'noite', 'aurora'], noite: ['noite', 'aurora', 'cosmos', 'espelho'], fogo: ['tempestade', 'poente', 'descida', 'delirio'],
  ritual: ['tempestade', 'noite', 'delirio', 'cosmos'], cosmos: ['cosmos', 'noite', 'aurora', 'delirio'], topo: ['dunas', 'nuvens', 'descida', 'poente'],
  neon: ['delirio', 'descida', 'cosmos', 'noite'] };
// palavras de cada trecho puxam a paisagem do capitulo
const PALAVRA_MUNDO = [
  [/\b(mar|onda|oceano|praia|[aá]gua|rio|navega|reflex|espelho)/gi, 'espelho'], [/(fogo|queim|chama|inferno|brasa|calor|guerra|raiva)/gi, 'tempestade'],
  [/(chuva|chor|l[aá]grima|saudade|sozinh|frio|cinza|neve)/gi, 'neve'], [/(estrela|universo|gal[aá]x|cosm|infinit|espa[çc]o|planeta)/gi, 'cosmos'],
  [/(fuma|nuvem|vento|leve|flutu|baseado|beck|c[eé]u|voar)/gi, 'nuvens'], [/(\blua\b|noite|madrugada|escur|sereno)/gi, 'noite'],
  [/(aurora|amanhec|alvorada|luzes)/gi, 'aurora'], [/(\bsol\b|manh[aã]|caminh|estrada|longe|horizonte|viagem|deserto|areia)/gi, 'dunas'],
  [/(sonho|louc|viaj|mente|psico|gira|delír|brisa louca)/gi, 'delirio'], [/(corre|acelera|r[aá]pido|fuga|voando|veloc|adrenalina|desce)/gi, 'descida'],
  [/(amor|cora[çc][aã]o|beij|paix|pele|desejo|tarde|p[oô]r do sol)/gi, 'poente'],
];
// palavras de cada linha cantada viram acontecimentos na historia
const EVENTOS = [
  [/(amor|cora[çc]|beij|paix|love|abra[çc]|junt|n[oó]s dois|voc[eê] e eu|te quero|minha m[uo]lher|meu bem)/i, 'par'],
  [/(voa|voar|\basa|c[eé]u|livre|alto|subir|nuvem|fly)/i, 'asas'],
  [/(\blua\b|luar|moon)/i, 'lua'],
  [/(estrela|star|cometa|brilh)/i, 'cadente'],
  [/(\brei\b|coroa|king|rainha|trono|imp[eé]rio|reino)/i, 'coroa'],
  [/(dan[çc]|festa|pula|balan[çc]|rebol|party|mexe|baile)/i, 'danca'],
  [/(chuva|chor|l[aá]grima|tempestade|rain|neve)/i, 'chuva'],
  [/(\bmar\b|onda|oceano|baleia|profund)/i, 'baleia'],
  [/(\bluz\b|sonho|desejo|esperan|\bvela|lanterna|f[eé]\b)/i, 'lanternas'],
];

// ---------- como cada paisagem e: cores, luz e o que tem nela ----------
// todos os valores se misturam aos poucos quando o capitulo muda, por isso nao ha corte
const BASE = { top: [.1, .34, .78], hor: [.98, .78, .55], sol: [1.4, 1.1, .75], sx: .45, sy: .24, sr: .05, si: 1,
  areia: [1.05, .66, .36], sombra: [.4, .21, .26], nevoa: [.98, .76, .58], fita: [.3, .95, .9],
  estrelas: 0, aurora: 0, agua: 0, nuvem: 0, neve: 0, psy: 0, vento: .3, alt: 0, nebulosa: 0, tempestade: 0,
  brilho: .7, raios: .35, ruinas: 0, amp: 1, vel: 1, voo: 0 };
const MP = {
  dunas: { ruinas: .7 },
  poente: { top: [.2, .15, .4], hor: [1, .5, .3], sol: [1.6, .78, .38], sx: -.3, sy: .07, sr: .075, si: 1.2, areia: [.98, .52, .34], sombra: [.3, .12, .24],
    nevoa: [.95, .46, .36], fita: [1, .82, .35], raios: .75, ruinas: .45, amp: 1.1, vento: .5, brilho: .6 },
  descida: { top: [.14, .4, .86], hor: [1, .9, .72], sol: [1.6, 1.3, .9], sx: .05, sy: .34, sr: .045, si: 1.1, areia: [1.05, .78, .48], sombra: [.58, .32, .27],
    nevoa: [1, .86, .72], fita: [.3, .9, 1], brilho: 1.3, raios: .3, amp: 1.3, vel: 3.2, vento: 1 },
  noite: { top: [.01, .02, .07], hor: [.08, .12, .28], sol: [.85, .92, 1.1], sx: .38, sy: .3, sr: .028, si: .55, areia: [.3, .37, .58], sombra: [.05, .06, .15],
    nevoa: [.1, .14, .3], fita: [1, .74, .32], estrelas: 1, brilho: 1, raios: 0, ruinas: .55, amp: .9, vel: .6, vento: .2 },
  espelho: { top: [.42, .52, .85], hor: [1, .8, .82], sol: [1.4, 1.02, .92], sx: .16, sy: .13, sr: .05, si: .9, areia: [.95, .86, .9], sombra: [.6, .55, .74],
    nevoa: [1, .86, .9], fita: [1, .42, .5], agua: 1, brilho: .3, raios: .3, amp: .5, vel: .55, vento: .15 },
  nuvens: { top: [.18, .33, .75], hor: [1, .76, .56], sol: [1.7, 1.3, .9], sx: -.12, sy: .12, sr: .055, si: 1.3, areia: [1.12, .97, .92], sombra: [.52, .5, .76],
    nevoa: [.9, .78, .8], fita: [1, .8, .35], nuvem: 1, alt: .24, raios: .55, brilho: 0, vel: 1.2, vento: .5, voo: 1 },
  neve: { top: [.4, .48, .6], hor: [.78, .82, .88], sol: [1.1, 1.1, 1.15], sx: .3, sy: .26, sr: .04, si: .35, areia: [.9, .93, 1], sombra: [.42, .5, .66],
    nevoa: [.75, .8, .88], fita: [1, .28, .34], neve: 1, vento: .9, brilho: .5, raios: 0, ruinas: .5, amp: 1.1, vel: .7 },
  aurora: { top: [.01, .02, .06], hor: [.03, .08, .16], sol: [.8, .9, 1], sx: -.42, sy: .36, sr: .02, si: .25, areia: [.17, .25, .4], sombra: [.03, .05, .1],
    nevoa: [.04, .1, .18], fita: [1, .42, .9], estrelas: .8, aurora: 1, agua: .6, brilho: .6, raios: 0, amp: .8, vel: .5, vento: .15 },
  delirio: { top: [.3, .05, .4], hor: [1, .32, .6], sol: [1.5, .9, 1.2], sx: 0, sy: .16, sr: .06, si: 1, areia: [.9, .5, .9], sombra: [.2, .1, .4],
    nevoa: [.8, .4, .8], fita: [.4, 1, .8], psy: 1, brilho: 1.2, raios: .8, alt: .1, amp: 1.2, vel: 1.6, vento: .6, voo: 1 },
  cosmos: { top: [0, 0, .02], hor: [.05, .02, .12], sol: [1.2, 1, 1.3], sx: .25, sy: .2, sr: .02, si: .8, areia: [.25, .2, .4], sombra: [.04, .03, .1],
    nevoa: [.1, .05, .2], fita: [.45, .9, 1], estrelas: 1, nebulosa: 1, alt: 1.3, brilho: 0, raios: .2, vel: 1.5, vento: .3, voo: 1 },
  tempestade: { top: [.35, .18, .1], hor: [.85, .45, .2], sol: [1.3, .7, .3], sx: .2, sy: .2, sr: .06, si: .4, areia: [.8, .45, .25], sombra: [.3, .12, .08],
    nevoa: [.75, .4, .2], fita: [.3, 1, .85], tempestade: 1, vento: 1.6, ruinas: .8, amp: 1.3, vel: 2, brilho: .3, raios: 0 },
};
function clonar(o) { const r = {}; for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].slice() : o[k]; return r; }
function paisagem(nome) { const p = clonar(BASE), m = MP[nome] || {}; for (const k in m) p[k] = Array.isArray(m[k]) ? m[k].slice() : m[k]; return p; }

// ---------- WebGL ----------
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R; uniform float T,CAM,P,E,H,FL;
uniform vec3 cTop,cHor,cSol,cAreia,cSomb,cNev;
uniform vec4 uSol,uA,uB,uC; uniform vec2 uD;
const float HZ=.03;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
const mat2 RM=mat2(1.6,1.2,-1.2,1.6);
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p=RM*p;a*=.5;}return s;}
float fbm3(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*n2(p);p=RM*p;a*=.5;}return s/.875;}
vec3 pal(float t,vec3 d){return .5+.5*cos(6.28318*(t+d));}
float pontos(vec2 p,float dens,float t){vec2 g=floor(p),f=fract(p)-.5;float h=h21(g);vec2 o=(vec2(h21(g+1.7),h21(g+4.3))-.5)*.6;
 return step(dens,h)*smoothstep(.16,0.,length(f-o))*(.45+.55*sin(t*2.5+h*90.));}
// o mesmo relevo que o mundo.js calcula para o viajante pisar na duna da frente
float duna(float x,float s){float u=x+.35*sin(x*.375+s);return (1.-abs(sin(u*.5+s)))*.75+.25*sin(x*.25+s*2.);}

vec3 aurora(vec2 p){vec3 c=vec3(0.);
 for(int i=0;i<3;i++){float fi=float(i);
  float x=p.x*(1.1+fi*.35)+T*.025*(fi+1.)+fi*3.;
  float y0=.13+fi*.085+(fbm3(vec2(x*1.3,T*.04+fi*2.))-.5)*.32;
  float d=p.y-y0;
  float b=exp(-max(-d,0.)*30.)*exp(-max(d,0.)*(3.5-fi*.6));
  b*=.55+.45*n2(vec2(x*24.,T*.3+fi));
  c+=b*mix(vec3(.15,1.,.55),vec3(.6,.3,1.),fi*.45+.15*sin(T*.05+fi))*(.4+.3*E+.35*P);
 }
 return c;}

vec3 ceu(vec2 p,float caro){
 float y=p.y-HZ;
 vec3 c=mix(cHor,cTop,pow(clamp(y/.62,0.,1.),.65));
 c+=cHor*exp(-abs(y)*14.)*.16;
 vec2 d2=p-uSol.xy; float d=length(d2), sw=uSol.w;
 c+=cSol*sw*(exp(-d*3.2)*.26+exp(-d*14.)*.42*(1.+.4*P));
 c=mix(c,cSol*1.25,smoothstep(uSol.z,uSol.z*.8,d)*min(1.,sw*1.6));
 if(uA.x>.01){
  float ac=uA.x*smoothstep(0.,.18,y);
  c+=pontos(p*85.,.86,T)*ac*vec3(.9,.95,1.)*1.1;
  c+=pontos(p*38.+3.,.95,T*.7)*ac*vec3(1.,.92,.82)*1.6;
  float mw=p.y-(.24+.42*p.x); mw=exp(-mw*mw*28.)*fbm3(p*6.+vec2(T*.004,0.));
  c+=vec3(.5,.58,.95)*mw*mw*ac*.9;
 }
 if(uA.y>.01) c+=aurora(p)*uA.y*smoothstep(-.02,.1,y);
 if(caro>.5){
  float dia=(1.-uA.x)*(1.-uC.x);
  if(dia>.01){float nv=fbm3(vec2(p.x*1.3+T*.008+CAM*.003,p.y*5.5));
   c=mix(c,mix(cHor,cSol*.85,.3)*1.06,smoothstep(.55,.86,nv)*smoothstep(.05,.3,y)*.4*dia);}
  if(uC.w>.01){float a=atan(d2.y,d2.x);float r=n2(vec2(a*9.,T*.12))*n2(vec2(a*23.,-T*.08));
   c+=cSol*r*r*exp(-d*1.6)*uC.w*.5*sw*smoothstep(-.05,.1,y);}
  if(uC.x>.01){float a=T*.012;vec2 q=p*1.3*mat2(cos(a),-sin(a),sin(a),cos(a));
   float n=fbm(q*1.4+fbm3(q*2.+T*.03)*1.3);
   c+=pal(n+H+.6,vec3(0.,.2,.45))*pow(n,3.)*1.8*uC.x;
   c+=pal(H+.2,vec3(.1,.3,.5))*pow(fbm3(q*3.-T*.02),4.)*1.1*uC.x;}
  if(uB.y>.01){vec2 q=p*1.4;q+=vec2(fbm3(q+T*.08),fbm3(q+5.2-T*.07))*1.6;
   float f=fbm(q*1.3+T*.05);
   vec3 ps=pal(f*1.5+H+T*.015,vec3(0.,.33,.67))*(.25+1.3*f*f);
   c=mix(c,ps+c*.3,uB.y*.85);}
 }
 return c;}

void main(){
 vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
 // camadas da frente para o fundo: o que ja esta coberto nao gasta conta (nem o ceu)
 vec3 c=vec3(0.); float acc=0.;
 float alt=uB.w, ag=uA.z, nu=uA.w;
 float wl=HZ-.0696-alt*.6575; // linha da agua (base da terceira camada)
 for(int i=0;i<5;i++){
  if(acc>.995) break;
  float fi=float(i);
  float f=9.*pow(1.42,fi), k=4./pow(2.,fi);
  float agi=ag*smoothstep(3.5,2.5,fi);
  float a0=.13*pow(.62,fi);
  float base=HZ-.23*pow(.55,fi)-alt*(.35+.8*pow(.62,fi));
  float amp=a0*uD.y*(1.-agi);
  float s=fi*2.1, x=p.x*f+CAM*k+fi*17.3;
  float hb=duna(x,s), h=base+amp*hb;
  if(nu>.01) h+=nu*a0*(fbm3(vec2(x*.5+T*.04,fi*3.))-.45)*1.1;
  float e=.0012+nu*.022*(1.+fi*.3);
  float cob=smoothstep(e,-e,p.y-h);
  // pilares antigos, meio enterrados, nas camadas do meio
  float pc=0.,pdx=0.;
  if(uD.x>.01&&i>=2&&i<=3){
   float cel=x/6.2832, id=floor(cel), r1=h21(vec2(id,fi+1.));
   if(r1<.4*uD.x){
    float xc=(id+.3+.4*h21(vec2(id,2.)))*6.2832;
    pdx=(x-xc)/f;
    float w=(.0045+.004*h21(vec2(id,7.)))*(1.4-fi*.2);
    float ht=a0*(1.1+2.4*h21(vec2(id,3.)));
    float top=base+amp*duna(xc,s)+ht+pdx*ht*(h21(vec2(id,8.))-.5)*30.;
    pc=smoothstep(w,w*.7,abs(pdx))*smoothstep(.0015,-.0015,p.y-top);
   }
  }
  float cv=max(cob,pc);
  if(cv>.002){
   // a sombra da face desce na diagonal a partir da crista e some com a profundidade
   float dpt=max(h-p.y,0.), xs=x+dpt*f*1.3;
   float sl=(duna(xs+.03,s)-duna(xs,s))/.03*amp*f;
   vec2 n=normalize(vec2(-sl,1.));
   vec2 L=normalize(vec2(uSol.x-p.x,(uSol.y-h)*.5+.1));
   float lf=smoothstep(-.05,.55,dot(n,L));
   if(nu>.01) lf=mix(lf,.15+.85*smoothstep(h-.06,h-.005,p.y),nu);
   float prof=clamp((h-p.y)/(a0*1.6+.02),0.,1.);
   lf=mix(lf,.5,smoothstep(.2,1.,prof)*.7);
   vec3 lc=mix(cSomb,cAreia,lf*(1.-prof*.4));
   lc+=cSol*smoothstep(.0035+fi*.001,0.,h-p.y)*lf*.5*(1.-nu*.5);
   lc*=1.+.06*sin((h-p.y)*f*30.+x*2.+sin(x*3.1)*2.5)*(1.-nu)*(1.-agi)*(1.-fi*.2);
   if(uC.z>.01&&i<=2) lc+=cSol*pontos(vec2(x*5.,(h-p.y)*f*7.),.9,T*1.3)*lf*uC.z*(.6+1.6*P)*(1.-fi*.3)*(1.-agi);
   if(pc>cob){float lado=sign(uSol.x-p.x)*sign(pdx);lc=mix(cSomb,cAreia,lado>0.?.78:.28)*.92;}
   if(uB.y>.01) lc=mix(lc,pal(x*.03+H+fi*.12+T*.01,vec3(0.,.33,.67))*(.15+.9*lf),uB.y*.55);
   lc=mix(lc,cNev,(1.-pow(.6,fi))*.72*(1.-.45*nu)+uC.y*.2*fi*.25);
   c+=(1.-acc)*cv*lc; acc+=(1.-acc)*cv;
  }
 }
 if(acc<.995) c+=(1.-acc)*ceu(p,1.);
 // espelho d'agua: reflete o ceu e as ilhas de areia ao fundo
 if(ag>.01&&p.y<wl){
  float pr=wl-p.y; vec2 rp=vec2(p.x,wl+pr);
  rp+=vec2(n2(vec2(p.x*30.,pr*300.-T*1.2))-.5,n2(vec2(p.x*12.+3.,pr*160.+T))-.5)*.014*min(1.,pr*5.);
  vec3 rc=ceu(rp,0.)*vec3(.8,.86,.94);
  float x3=rp.x*25.7+CAM*.5+51.9, h3=HZ-.23*.0915-alt*(.35+.8*.1478)+.13*.2383*uD.y*.5*duna(x3,6.3);
  rc=mix(rc,cNev*.8,smoothstep(.002,-.002,rp.y-h3)*.85);
  rc+=cSol*pow(n2(vec2(p.x*80.,pr*900.-T*2.)),8.)*exp(-abs(p.x-uSol.x)*5.)*uSol.w;
  c=mix(c,mix(rc,cNev,.12),ag*smoothstep(0.,.004,pr));
  c+=cHor*exp(-pr*250.)*.25*ag;
 }
 // areia levada pelo vento
 if(uB.z>.01){
  vec2 q=vec2(p.x*1.6+T*uB.z*.8,p.y*18.+sin(p.x*2.+T*.4)*1.5);
  float st=smoothstep(.6,.88,fbm3(q))*smoothstep(.15,-.3,p.y);
  c+=mix(cAreia,cSol*.6,.5)*st*uB.z*.28;
 }
 // neve (ou chuva de luz quando a letra pede)
 if(uB.x>.01){
  for(int i=0;i<3;i++){float fi=float(i);float sc=6.+fi*5.;
   vec2 q=p*sc+vec2(T*(.5+uB.z*1.5)*(1.+fi*.4),T*(1.2+fi*.5));q.x+=sin(q.y*.7+fi)*.3;
   vec2 g=floor(q),fr=fract(q)-.5;float hh=h21(g+fi*13.);
   vec2 o=(vec2(h21(g+2.1),h21(g+6.3))-.5)*.7;
   c+=mix(vec3(1.),cSol,.2)*smoothstep(.06+fi*.015,0.,length(fr-o))*step(.6,hh)*uB.x*(.55-fi*.12);}
 }
 // tempestade de areia
 if(uC.y>.01){
  float dust=fbm3(vec2(p.x*1.2+T*.5,p.y*2.5-T*.05));
  c=mix(c,cNev*(.6+.7*dust),uC.y*((.3+.4*dust)*smoothstep(.6,-.3,p.y)+.1));
  c+=vec3(1.,.92,.85)*FL*uC.y*.6;
 }
 c*=.88+.06*P;
 c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);
 c=max(mix(vec3(dot(c,vec3(.3,.59,.11))),c,1.18),0.);
 vec2 u=gl_FragCoord.xy/R; c*=.55+.45*pow(16.*u.x*u.y*(1.-u.x)*(1.-u.y),.18);
 c+=(h21(gl_FragCoord.xy+fract(T*7.)*100.)-.5)*.025;
 gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`;

const caixa = document.querySelector('#modoVisual');
const cv = document.createElement('canvas');
cv.id = 'mvMundo'; cv.hidden = true;
caixa.insertBefore(cv, caixa.querySelector('#mvTela'));
const UN = ['R', 'T', 'CAM', 'P', 'E', 'H', 'FL', 'cTop', 'cHor', 'cSol', 'cAreia', 'cSomb', 'cNev', 'uSol', 'uA', 'uB', 'uC', 'uD'];
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
const HZ = .03, VOLTA = 64 * Math.PI; // o relevo se repete a cada VOLTA de camera
let W = 0, H = 0, caps = [], capAtual = -1, relogio = 0, cam = 0, eLenta = .4, intens = .5, velCam = .5;
let hAtual = 0, hAlvo = 0, tAntes = 0, dur = 240, kick = 0, titulo = null, flash = 0, rajada = 0, chuvaA = 0, temLetra = false;
let cur = paisagem('dunas'), alvo = paisagem('dunas');
let px = 0, vooA = 0, parA = 0, asasA = 0, dancaA = 0, luaA = 0, deslizaA = 0, coroa = false, giro = 0, passoAntes = 0;
let ate = {}, seres = [], pegadas = [], graos = [], timers = {}, pronto = false, rnd = Math.random;
const heroi = { fita: [], sem: 0, x: 0, y: 0 }, amigo = { fita: [], sem: 2.3, x: 0, y: 0 };

function semente(txt) { let h = 1779033703; for (const ch of String(txt)) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353), h = h << 13 | h >>> 19; return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function amostra(v, fps, t) { if (!v || !v.length) return .5; const i = Math.max(0, Math.min(v.length - 1, Math.round(t * fps))); return v[i]; }
const lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const q8 = v => Math.max(0, Math.min(255, Math.round(v * 255)));
const css = (c, m = 1, a = 1) => `rgba(${q8(c[0] * m)},${q8(c[1] * m)},${q8(c[2] * m)},${a})`;
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const ROMANO = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

// divide a musica em capitulos e escolhe a paisagem de cada um
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
      if (i === 0) p += CALMA[w] * 1.4 + (w === 'dunas' ? 1 : 0); // a jornada comeca mais calma, de preferencia nas dunas
      if (p > nota) { nota = p; melhor = w; }
    }
    c.mundo = melhor; c.h = sorte(); antes = melhor; usados[melhor] = (usados[melhor] || 0) + 1;
  });
  return lista;
}

function capituloEm(t) { for (let i = caps.length - 1; i >= 0; i--) if (t >= caps[i].ini) return i; return 0; }
function mundoVisivel() { return caps[capAtual] ? caps[capAtual].mundo : 'dunas'; }
function trocarCapitulo(i, suave) {
  const c = caps[i]; if (!c) return;
  alvo = paisagem(c.mundo);
  if (!suave || capAtual < 0) cur = clonar(alvo);
  else { rajada = 1; kick = 1; }
  hAlvo = c.h; if (!suave) hAtual = hAlvo;
  capAtual = i; seres = seres.filter(s => s.fica);
  titulo = { num: ROMANO[i] || String(i + 1), nome: NOME[c.mundo], vida: 0 };
  const el = document.querySelector('#mvCena'); if (el) el.textContent = 'Jornada · ' + NOME[c.mundo];
}

// ---------- o chao que o viajante pisa (mesma conta do shader) ----------
function duna(x, s) { const u = x + .35 * Math.sin(x * .375 + s); return (1 - Math.abs(Math.sin(u * .5 + s))) * .75 + .25 * Math.sin(x * .25 + s * 2); }
function chaoH(pxn) { return HZ - .23 - cur.alt * 1.15 + .13 * cur.amp * (1 - cur.agua) * duna(pxn * 9 + cam * 4, 0); }
function chaoY(x) { return H * (.5 - chaoH((x - W / 2) / H)); }
const solX = () => W / 2 + cur.sx * Math.min(1, W / H / 1.6) * H;

// ---------- luzes pre-desenhadas ----------
let ctx = null;
const sprites = new Map();
function brilho(k) { // por matiz
  k = Math.round(((k % 360) + 360) % 360 / 8) * 8;
  if (sprites.has(k)) return sprites.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `hsla(${k},95%,85%,1)`); gr.addColorStop(.25, `hsla(${k},90%,62%,.65)`); gr.addColorStop(1, `hsla(${k},90%,55%,0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); sprites.set(k, c); return c;
}
function brilhoRGB(cor) { // por cor
  const r = q8(cor[0]) >> 4, g = q8(cor[1]) >> 4, b = q8(cor[2]) >> 4, k = 'c' + (r * 256 + g * 16 + b);
  if (sprites.has(k)) return sprites.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  const R_ = r * 17, G = g * 17, B = b * 17, cl = v => Math.min(255, v + 90);
  gr.addColorStop(0, `rgba(${cl(R_)},${cl(G)},${cl(B)},1)`); gr.addColorStop(.25, `rgba(${R_},${G},${B},.6)`); gr.addColorStop(1, `rgba(${R_},${G},${B},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); sprites.set(k, c); return c;
}
function luz(x, y, r, h, a = 1) { if (a <= .01) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(brilho(h), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
function luzC(x, y, r, cor, a = 1) { if (a <= .01) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(brilhoRGB(cor), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
const matizCSS = () => (hAtual * 360 + relogio * 3) % 360;

// ---------- o viajante ----------
// a faixa de tecido e uma corrente de pontos com inercia (verlet): segue o corpo, o vento e a batida
function moverFita(v, ax, ay, dt, comp, vento, peso) {
  const N = 18, L = comp / (N - 1), f = v.fita;
  if (!f.length || Math.hypot(f[1].x - ax, f[1].y - ay) > comp) { f.length = 0; for (let i = 0; i < N; i++) f.push({ x: ax - i * L, y: ay + i * L * .2, ox: ax - i * L, oy: ay + i * L * .2 }); }
  f[0].x = f[0].ox = ax; f[0].y = f[0].oy = ay;
  const d2 = dt * dt;
  for (let i = 1; i < N; i++) {
    const q = f[i], u = i / (N - 1);
    const vx = (q.x - q.ox) * .965, vy = (q.y - q.oy) * .965; q.ox = q.x; q.oy = q.y;
    const fx = -vento * (1 + .35 * Math.sin(relogio * 2.1 + i * .5 + v.sem));
    const fy = peso + Math.sin(relogio * 6.1 - i * .62 + v.sem) * (vento * 1.8 + peso) * u + Math.sin(relogio * 2.3 - i * .27) * vento * .7 * u;
    q.x += vx + fx * d2; q.y += vy + fy * d2;
  }
  for (let it = 0; it < 8; it++) for (let i = 1; i < N; i++) {
    const a = f[i - 1], b = f[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3, k = (d - L) / d;
    if (i === 1) { b.x -= dx * k; b.y -= dy * k; } else { a.x += dx * k * .5; a.y += dy * k * .5; b.x -= dx * k * .5; b.y -= dy * k * .5; }
  }
  for (let i = 1; i < N; i++) { const a = f[i - 1], b = f[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d > L * 1.05) { b.x = a.x + dx / d * L * 1.05; b.y = a.y + dy / d * L * 1.05; } }
}
function desenharFita(v, o) {
  const f = v.fita, N = f.length; if (N < 2) return;
  const larg = o.s * .05, cor = o.fita, esc = mix3(cor, [0, 0, 0], .45);
  const lados = [];
  for (let i = 0; i < N; i++) {
    const a = f[Math.max(0, i - 1)], b = f[Math.min(N - 1, i + 1)], u = i / (N - 1);
    let nx = -(b.y - a.y), ny = b.x - a.x; const d = Math.hypot(nx, ny) || 1; nx /= d; ny /= d;
    const tw = Math.cos(relogio * 3.2 - i * .55 + v.sem), w = larg * (1 - u * .5) * (.3 + .7 * Math.abs(tw));
    lados.push([f[i].x + nx * w, f[i].y + ny * w, f[i].x - nx * w, f[i].y - ny * w, tw]);
  }
  for (let i = 0; i < N - 1; i++) { // cada pedaco mostra a frente ou o verso do tecido quando ele gira
    const A = lados[i], B = lados[i + 1];
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(B[2], B[3]); ctx.lineTo(A[2], A[3]); ctx.closePath();
    ctx.fillStyle = A[4] > 0 ? css(cor, .95, o.alpha) : css(esc, 1, o.alpha); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); f.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p.x, p.y));
  ctx.strokeStyle = css(cor, 1, (.16 + .4 * o.P) * o.alpha); ctx.lineWidth = larg * 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  luzC(f[N - 1].x, f[N - 1].y, o.s * (.14 + .12 * o.P), cor, (.35 + .4 * o.P) * o.alpha);
  luzC(f[Math.floor(N / 2)].x, f[Math.floor(N / 2)].y, o.s * .2, cor, .25 * o.P * o.alpha);
  ctx.globalCompositeOperation = 'source-over';
}
const MANTO = { claro: [.27, .36, .6], escuro: [.07, .09, .19] }, MANTO2 = { claro: [.78, .5, .44], escuro: [.24, .11, .14] };
function corpo(v, o, fantasma) {
  const s = o.s, tr = o.voo * .9 + o.desliza * .5 + o.vento * .2, sw = o.balanco * (1 - o.voo) * (1 - o.desliza);
  const t1 = Math.sin(relogio * 5.5 + v.sem) * s * .018 * (1 + tr * 2.5), t2 = Math.sin(relogio * 7.7 + v.sem * 2) * s * .02 * (1 + tr * 2.5);
  const claro = mix3(o.manto.claro, mix3(o.manto.claro, cur.sol, .45), .5), escuro = mix3(o.manto.escuro, cur.sombra, .18);
  ctx.save(); ctx.translate(o.x, o.y - o.bob); ctx.rotate(o.tilt);
  if (o.giro) ctx.scale(Math.cos(o.giro) || .01, 1);
  ctx.scale(1, 1 - .12 * o.desliza);
  // sombra no chao
  if (!fantasma && o.chao > .05) { ctx.fillStyle = `rgba(0,0,0,${.2 * o.chao * o.alpha})`; ctx.beginPath(); ctx.ellipse(0, 0, s * .26, s * .045, 0, 0, 7); ctx.fill(); }
  // asas de luz
  if (o.asas > .01) {
    ctx.globalCompositeOperation = 'lighter';
    for (const lado of [-1, 1]) {
      ctx.save(); ctx.translate(-s * .02, -s * .68); ctx.scale(lado, 1); const ab = Math.sin(relogio * 2.6) * .25 + o.P * .2;
      for (let k = 0; k < 6; k++) {
        const ang = -.15 - k * .24 + ab * (1 - k * .12), L = s * (.85 - k * .08);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(ang - .35) * L * .6, Math.sin(ang - .35) * L * .6 - s * .05, Math.cos(ang) * L, Math.sin(ang) * L);
        ctx.strokeStyle = css(o.fita, 1.1, .4 * o.asas * (1 - k * .1) * o.alpha); ctx.lineWidth = s * .03 * (1 - k * .08); ctx.lineCap = 'round'; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // manto: largo embaixo, a barra esvoaca para tras com o vento
  const hd = s * .16 + sw * s * .06, hex = -s * .19 - tr * s * .42 + t1, hey = -s * .05 - tr * s * .15 + t2;
  ctx.beginPath();
  ctx.moveTo(-s * .06, -s * .8);
  ctx.quadraticCurveTo(s * .1, -s * .8, s * .11, -s * .68);
  ctx.bezierCurveTo(s * .14, -s * .45, s * .15 + sw * s * .03, -s * .2, hd, -s * .02);
  ctx.bezierCurveTo(s * .08, s * .015 + t2 * .3, -s * .02, -s * .045, -s * .07 - sw * s * .04, -s * .02 + t1 * .3);
  ctx.bezierCurveTo((-s * .07 + hex) / 2, t2 * .5, hex + s * .03, hey + s * .03, hex, hey);
  ctx.bezierCurveTo(-s * .16 - tr * s * .16, -s * .3 - tr * s * .1, -s * .14, -s * .6, -s * .06, -s * .8);
  ctx.closePath();
  const gr = ctx.createLinearGradient(-s * .22 * o.lado, 0, s * .22 * o.lado, 0);
  gr.addColorStop(0, css(escuro, 1, o.alpha)); gr.addColorStop(.6, css(mix3(escuro, claro, .55), 1, o.alpha)); gr.addColorStop(1, css(claro, 1, o.alpha));
  ctx.fillStyle = gr; ctx.fill();
  // contorno iluminado do lado do sol
  const rim = ctx.createLinearGradient(-s * .2 * o.lado, 0, s * .2 * o.lado, 0);
  rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, css(cur.sol, .9, .55 * cur.si * o.alpha));
  ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, s * .012); ctx.stroke();
  // barra bordada que brilha na batida
  ctx.beginPath(); ctx.moveTo(hd, -s * .02);
  ctx.bezierCurveTo(s * .08, s * .015 + t2 * .3, -s * .02, -s * .045, -s * .07 - sw * s * .04, -s * .02 + t1 * .3);
  ctx.bezierCurveTo((-s * .07 + hex) / 2, t2 * .5, hex + s * .03, hey + s * .03, hex, hey);
  ctx.strokeStyle = css(o.fita, 1, (.55 + .45 * o.P) * o.alpha); ctx.lineWidth = Math.max(1, s * .016); ctx.setLineDash([s * .03, s * .02]); ctx.stroke(); ctx.setLineDash([]);
  // pes aparecendo no passo
  if (o.chao > .3 && !o.desliza) {
    ctx.fillStyle = css(escuro, .7, o.alpha);
    for (const sg of [1, -1]) { ctx.beginPath(); ctx.ellipse(sg * o.balanco * s * .07 + s * .02, -s * .005, s * .04, s * .02, 0, 0, 7); ctx.fill(); }
  }
  // capuz pontudo caindo para tras
  const hx = s * .02, hy = -s * .9, hr = s * .095;
  ctx.beginPath();
  ctx.moveTo(hx + hr * .95, hy + hr * .3);
  ctx.quadraticCurveTo(hx + hr * 1.1, hy - hr * 1.1, hx - hr * .1, hy - hr * 1.05);
  ctx.quadraticCurveTo(hx - hr * 1.2 - tr * s * .05, hy - hr * .9, hx - hr * 2.1 - tr * s * .13, hy - hr * .3 + t1 * .6);
  ctx.quadraticCurveTo(hx - hr * 1.2, hy + hr * .25, hx - hr * .9, hy + hr * .9);
  ctx.quadraticCurveTo(hx, hy + hr * 1.35, hx + hr * .95, hy + hr * .3);
  ctx.closePath(); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, s * .01); ctx.stroke();
  // rosto: escuro, com uma luz so
  ctx.fillStyle = `rgba(4,4,10,${.92 * o.alpha})`; ctx.beginPath(); ctx.ellipse(hx + hr * .45, hy + hr * .15, hr * .42, hr * .6, -.15, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  luzC(hx + hr * .5, hy + hr * .05, hr * (.55 + .2 * o.P), o.fita, (.75 + .25 * o.P) * o.alpha);
  // coroa: um aro de ouro sobre o capuz
  if (o.coroa) {
    ctx.strokeStyle = `rgba(255,214,110,${.9 * o.alpha})`; ctx.lineWidth = Math.max(1.2, s * .014);
    ctx.beginPath(); ctx.ellipse(hx - hr * .1, hy - hr * 1.2, hr * .75, hr * .2, -.1, 0, 7); ctx.stroke();
    for (let k = 0; k < 5; k++) luzC(hx - hr * .1 + Math.cos(k / 5 * 6.28 + relogio) * hr * .75, hy - hr * 1.2 + Math.sin(k / 5 * 6.28 + relogio) * hr * .2, hr * .25, [1, .8, .4], .6 + .4 * o.P);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
// calcula a pose da vez e move a fita (uma vez por quadro)
function pose(v, x, y, s, o, dt) {
  Object.assign(o, { x, y, s });
  const c = Math.cos(o.tilt), sn = Math.sin(o.tilt), lx = s * .0, ly = -s * .78 * (1 - .12 * o.desliza);
  const ax = x + c * lx - sn * ly, ay = y - o.bob + sn * lx + c * ly;
  const comp = s * (1.5 + .7 * o.voo + 1.6 * o.asas + .35 * o.P + .4 * o.desliza);
  const vento = s * (5 + 14 * cur.vento * (.6 + .8 * eLenta) + 10 * Math.min(2.5, velCam * cur.vel) + 22 * rajada);
  moverFita(v, ax, ay, dt, comp, vento, s * (5 - 3.5 * o.voo));
  v.o = o;
}
function desenharViajante(v) { const o = v.o; if (!o) return; ctx.save(); desenharFita(v, o); corpo(v, o); ctx.restore(); }

// ---------- criaturas e coisas de cada paisagem ----------
function nascer(tipo, extra = {}) { if (seres.length < 110) seres.push(Object.assign({ tipo, vida: 0, fase: rnd() * 7, camada: 0 }, extra)); }
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
function moverSeres(dt, P, camada, s0) {
  const silh = mix3(cur.sombra, cur.nevoa, .4);
  for (let i = seres.length - 1; i >= 0; i--) {
    const q = seres[i]; if (q.camada !== camada) continue;
    q.vida += dt; q.fase += dt;
    switch (q.tipo) {
      case 'semente': { // graos de luz levados pelo vento
        q.x -= (12 + 50 * cur.vento + 30 * rajada + velCam * cur.vel * 18) * q.v * dt; q.y += Math.sin(q.fase * 1.1 + q.s) * 9 * dt;
        if (q.x < -30 || q.vida > 30) { seres.splice(i, 1); break; }
        const a = Math.min(1, q.vida * .7) * (.55 + .45 * Math.sin(q.fase * 2.3 + q.s));
        ctx.globalCompositeOperation = 'lighter';
        if (cur.psy > .5) luz(q.x, q.y, q.s * (2.4 + P), matizCSS() + q.s * 40, a); else luzC(q.x, q.y, q.s * (2.4 + P), mix3(cur.sol, cur.fita, .35), a);
        ctx.globalCompositeOperation = 'source-over'; break; }
      case 'passaros': { // bando acompanhando o viajante
        q.x += q.v * dt; if (q.x > W * 1.3) { seres.splice(i, 1); break; }
        ctx.strokeStyle = css(silh, .55, .85); ctx.lineCap = 'round';
        for (let j = 0; j < q.n; j++) {
          const bx = q.x - Math.abs(j - q.n / 2) * q.sz * 2.4 + Math.sin(q.fase * .7 + j * 2) * q.sz, by = q.y + (j - q.n / 2) * q.sz * 1.2 + Math.sin(q.fase * 1.3 + j) * q.sz * .5;
          const as = Math.sin(q.fase * 8 + j * 1.7), sz = q.sz * (1 - j % 3 * .12);
          ctx.lineWidth = Math.max(1, sz * .2);
          ctx.beginPath(); ctx.moveTo(bx - sz, by - as * sz * .6); ctx.quadraticCurveTo(bx - sz * .3, by - sz * .15, bx, by); ctx.quadraticCurveTo(bx + sz * .3, by - sz * .15, bx + sz, by - as * sz * .6); ctx.stroke();
        }
        break; }
      case 'baleia': { // baleia que nada no ceu
        const k = q.vida / q.max; if (k >= 1) { seres.splice(i, 1); break; }
        const x = q.x0 + (q.x1 - q.x0) * k, y = q.y + Math.sin(q.fase * .4) * H * .03;
        ctx.save(); ctx.translate(x, y); ctx.scale(q.x1 < q.x0 ? -1 : 1, 1); ctx.rotate(Math.sin(q.fase * .4 + 1) * .06);
        const a = Math.min(1, k * 6, (1 - k) * 6);
        baleiaForma(q.s, q.fase * 1.3);
        if (q.cosmica) {
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = css(cur.fita, .5, .14 * a); ctx.fill(); ctx.strokeStyle = css(cur.fita, 1, .5 * a); ctx.lineWidth = 1.5; ctx.stroke();
          baleiaDetalhe(q.s, css(cur.fita, 1, .4 * a));
          for (let j = 0; j < 9; j++) luzC((j / 9 - .45) * q.s * .9, Math.sin(j * 2.3) * q.s * .06, 4 + 3 * P, cur.fita, .8 * a);
          ctx.globalCompositeOperation = 'source-over';
        } else { ctx.fillStyle = css(silh, .8, .75 * a); ctx.fill(); baleiaDetalhe(q.s, css(cur.nevoa, 1, .25 * a)); }
        ctx.restore(); break; }
      case 'lanterna': {
        q.y -= q.v * dt; q.x += Math.sin(q.fase * .8) * 10 * dt - 8 * dt;
        if (q.y < -40) { seres.splice(i, 1); break; }
        const tr = .75 + .25 * Math.sin(q.fase * 7 + q.s);
        ctx.globalCompositeOperation = 'lighter'; luz(q.x, q.y, q.s * 3.2, 32, .45 * tr);
        ctx.fillStyle = `hsla(34,100%,${60 + 12 * tr}%,.9)`; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.s * .5, q.s * .7, 0, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; break; }
      case 'cadente': {
        if (q.vida > 1) { seres.splice(i, 1); break; }
        const x = q.x + q.vx * q.vida, y = q.y + q.vy * q.vida, a = Math.sin(q.vida * Math.PI);
        ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(x, y, x - q.vx * .25, y - q.vy * .25);
        gr.addColorStop(0, `rgba(255,250,235,${a})`); gr.addColorStop(1, 'rgba(255,240,220,0)');
        ctx.strokeStyle = gr; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - q.vx * .25, y - q.vy * .25); ctx.stroke();
        luzC(x, y, 12, [1, .95, .85], a); ctx.globalCompositeOperation = 'source-over'; break; }
      case 'bolha': { // delirio: bolhas furta-cor subindo
        q.y -= q.v * dt; q.x += Math.sin(q.fase * 1.2 + q.s) * 16 * dt;
        if (q.y < -q.r * 2) { seres.splice(i, 1); break; }
        const hh = matizCSS() + q.s * 60 + q.fase * 30;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `hsla(${hh},95%,72%,.5)`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1 + .08 * P), 0, 7); ctx.stroke();
        luz(q.x - q.r * .35, q.y - q.r * .35, q.r * .5, hh + 60, .5); luz(q.x, q.y, q.r * 1.5, hh, .12 + .2 * P);
        ctx.globalCompositeOperation = 'source-over'; break; }
      case 'onda': { // onda de luz que sai dos pes na batida forte
        if (q.vida > 1.4) { seres.splice(i, 1); break; }
        const r = s0 * .25 + q.vida * s0 * 2.6, a = (1 - q.vida / 1.4) * .55 * q.a;
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = css(mix3(cur.sol, cur.fita, .5), 1, a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(q.x, q.y, r, r * (q.plano ? .16 : 1), 0, 0, 7); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; break; }
      case 'petala': { // petalas girando em volta do casal
        q.ang += dt * 1.4; q.r += dt * s0 * .25; q.cy -= dt * s0 * .35;
        if (q.vida > 4) { seres.splice(i, 1); break; }
        const x = q.cx + Math.cos(q.ang) * q.r, y = q.cy + Math.sin(q.ang) * q.r * .45;
        ctx.save(); ctx.translate(x, y); ctx.rotate(q.ang * 2); ctx.globalAlpha = Math.min(1, q.vida * 2, (4 - q.vida)) * .85;
        ctx.fillStyle = `hsl(${345 + q.s * 30},85%,${72 + q.s * 10}%)`; ctx.beginPath(); ctx.ellipse(0, 0, s0 * .05, s0 * .022, 0, 0, 7); ctx.fill(); ctx.restore(); break; }
    }
  }
}
// cada paisagem vai soltando as suas criaturas
function povoar(dt, m, s) {
  const vez = (nome, cada) => { timers[nome] = (timers[nome] || 0) - dt; if (timers[nome] <= 0) { timers[nome] = cada * (.6 + rnd() * .8); return true; } return false; };
  const conta = tipo => seres.reduce((n, q) => n + (q.tipo === tipo), 0);
  const max = pouco ? 14 : 26;
  if (m !== 'descida' && m !== 'tempestade' && vez('semente', m === 'cosmos' || m === 'delirio' ? .2 : .45) && conta('semente') < max)
    nascer('semente', { x: W * (.3 + rnd() * .9), y: H * (.12 + rnd() * .6), s: 1.5 + rnd() * 3.5, v: .5 + rnd() * .9 });
  if (['dunas', 'poente', 'espelho', 'nuvens', 'neve'].includes(m) && vez('passaros', 16) && conta('passaros') < 1)
    nascer('passaros', { x: -W * .2, y: H * (.16 + rnd() * .18), v: W * (.05 + rnd() * .04), n: 4 + Math.floor(rnd() * 5), sz: s * (.08 + rnd() * .04) });
  if (['nuvens', 'noite', 'cosmos', 'espelho'].includes(m) && vez('baleia', 24) && conta('baleia') < 1) {
    const d = rnd() < .6; nascer('baleia', { x0: d ? -W * .4 : W * 1.4, x1: d ? W * 1.4 : -W * .4, y: H * (.2 + rnd() * .14), s: Math.min(W, H) * (.45 + rnd() * .25), max: 34, cosmica: m === 'noite' || m === 'cosmos' });
  }
  if (m === 'noite' && vez('lanterna', 3.5) && conta('lanterna') < 5) nascer('lanterna', { x: W * (.1 + rnd() * .8), y: H + 20, v: 18 + rnd() * 20, s: 5 + rnd() * 6 });
  if (['noite', 'cosmos', 'aurora'].includes(m) && vez('cadente', 7)) nascer('cadente', { x: W * (.2 + rnd() * .8), y: rnd() * H * .3, vx: -W * (.4 + rnd() * .3), vy: H * .3, h: 0 });
  if (m === 'delirio' && vez('bolha', .6) && conta('bolha') < 12) nascer('bolha', { x: rnd() * W, y: H + 30, v: 30 + rnd() * 40, r: s * (.08 + rnd() * .2), s: rnd() * 6 });
}
// areia que voa dos pes, pegadas que ficam para tras
function areia(dt, s, x, y, quanto) {
  if (graos.length < 160) for (let k = 0; k < quanto; k++) graos.push({ x: x + (rnd() - .5) * s * .2, y: y - rnd() * s * .05, vx: -(s * (.6 + rnd() * 2.2)), vy: -(s * (.4 + rnd() * 1.6)), vida: 0, max: .5 + rnd() * .7 });
  ctx.fillStyle = css(mix3(cur.areia, cur.sol, .25), 1, 1);
  for (let i = graos.length - 1; i >= 0; i--) {
    const g = graos[i]; g.vida += dt; if (g.vida > g.max) { graos.splice(i, 1); continue; }
    g.vy += s * 6 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
    ctx.globalAlpha = (1 - g.vida / g.max) * .8; ctx.fillRect(g.x, g.y, 1.8, 1.8);
  }
  ctx.globalAlpha = 1;
}
function desenharPegadas(dt, s) {
  const cor = css(cur.sombra, .8, 1);
  for (let i = pegadas.length - 1; i >= 0; i--) {
    const p = pegadas[i]; p.vida += dt;
    const x = W / 2 + (p.X - cam * 4) / 9 * H;
    if (x < -20 || p.vida > 7) { pegadas.splice(i, 1); continue; }
    ctx.fillStyle = cor; ctx.globalAlpha = .35 * (1 - p.vida / 7) * (1 - cur.agua) * (1 - cur.nuvem);
    ctx.beginPath(); ctx.ellipse(x, chaoY(x) + s * .006 * p.lado, s * .035, s * .012, 0, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- API usada pelo visual.js ----------
window.Mundo = {
  _ver(nome) { alvo = paisagem(nome); cur = clonar(alvo); }, // para testar uma paisagem
  _dbg() { const o = heroi.o || {}; return { px, vooA, x: o.x, y: o.y, alpha: o.alpha, alt: cur.alt, W, H, seres: seres.length }; },
  _caps() { return caps.map(c => [Math.round(c.ini), c.mundo, +c.int.toFixed(2)]); },
  disponivel() { return !!iniciarGL(); },
  ligar(sim) { cv.hidden = !sim; caixa.classList.toggle('jornada', !!sim); },
  tamanho(w, h, escala) {
    W = w; H = h;
    const orc = (pouco ? .3e6 : .62e6) * escala * escala, k = Math.min(window.devicePixelRatio || 1, Math.sqrt(orc / Math.max(1, w * h)));
    cv.width = Math.max(64, Math.round(w * k)); cv.height = Math.max(36, Math.round(h * k));
  },
  preparar({ id, R, letra, humor, duracao }) {
    dur = duracao || 240; rnd = semente(id + '#'); temLetra = !!letra;
    caps = roteiro(R, letra, humor, id); capAtual = -1; seres = []; pegadas = []; graos = []; timers = {}; ate = {}; coroa = false;
    cam = 0; relogio = 0; tAntes = 0; parA = asasA = dancaA = luaA = deslizaA = chuvaA = rajada = flash = 0; px = 0; giro = 0;
    heroi.fita.length = 0; amigo.fita.length = 0; heroi.o = amigo.o = null; pronto = true;
    alvo = paisagem(caps[0] ? caps[0].mundo : 'dunas'); cur = clonar(alvo); vooA = cur.voo;
  },
  batida(gb, forte) {
    if (!pronto) return;
    kick = Math.max(kick, .5 + .5 * gb);
    const m = mundoVisivel(), o = heroi.o;
    if (forte && intens > .55 && o) nascer('onda', { x: o.x, y: o.y - (o.chao > .5 ? 0 : o.s * .5), plano: o.chao > .5, a: 1, camada: 1 });
    if (m === 'tempestade' && forte && rnd() < .35) flash = 1;
    if (m === 'cosmos' && forte && rnd() < .3) nascer('cadente', { x: W * (.3 + rnd() * .7), y: rnd() * H * .3, vx: -W * .5, vy: H * .3 });
    if (m === 'delirio' && forte) for (let k = 0; k < 2; k++) nascer('bolha', { x: rnd() * W, y: H * (.6 + rnd() * .4), v: 50 + rnd() * 50, r: (o ? o.s : 40) * (.06 + rnd() * .12), s: rnd() * 6 });
    if (dancaA > .5 && forte) giro = Math.max(giro, .001);
    if (parA > .5 && forte && o) for (let k = 0; k < 3; k++) nascer('petala', { cx: o.x - o.s * .55, cy: o.y - o.s * .6, ang: rnd() * 7, r: o.s * .3, s: rnd(), camada: 1 });
  },
  linha(texto) {
    if (!pronto || !texto) return;
    const t = audio.currentTime || 0;
    for (const [re, ev] of EVENTOS) if (re.test(texto)) {
      if (ev === 'coroa') coroa = true;
      else if (ev === 'cadente') for (let k = 0; k < 2; k++) nascer('cadente', { x: W * (.3 + rnd() * .7), y: rnd() * H * .3, vx: -W * (.45 + rnd() * .2), vy: H * .3 });
      else if (ev === 'baleia') { if (!seres.some(q => q.tipo === 'baleia')) nascer('baleia', { x0: -W * .4, x1: W * 1.4, y: H * .24, s: Math.min(W, H) * .5, max: 26, cosmica: cur.estrelas > .5 }); }
      else if (ev === 'lanternas') for (let k = 0; k < 6; k++) nascer('lanterna', { x: W * (.1 + rnd() * .8), y: H + 20 + rnd() * 120, v: 26 + rnd() * 26, s: 5 + rnd() * 7 });
      else ate[ev] = t + ({ par: 28, asas: 10, lua: 30, danca: 8, chuva: 16 })[ev];
    }
  },
  quadro(dt, t, e, g, a, pulso, c2d, w, h, tocando) {
    if (!pronto || !caps.length) return;
    ctx = c2d; W = w; H = h; dt = Math.min(dt, .05);
    const lento = tocando ? 1 : .15;
    relogio += dt * lento; eLenta += (e - eLenta) * Math.min(1, dt * .9);
    // capitulo e a paisagem se transformando na proxima
    const ci = capituloEm(t);
    if (ci !== capAtual) trocarCapitulo(ci, capAtual >= 0 && Math.abs(t - caps[ci].ini) < 2.5 && Math.abs(t - tAntes) < 1.5);
    tAntes = t;
    const seAte = k => (ate[k] || 0) > t;
    chuvaA += ((seAte('chuva') ? 1 : 0) - chuvaA) * Math.min(1, dt * .7);
    const kp = 1 - Math.exp(-dt / 1.5);
    for (const c in alvo) { const av = alvo[c]; if (Array.isArray(av)) for (let i = 0; i < 3; i++) cur[c][i] += (av[i] - cur[c][i]) * kp; else cur[c] += (av - cur[c]) * kp; }
    const cap = caps[capAtual];
    intens += (cap.int - intens) * Math.min(1, dt * .5);
    let dh = hAlvo - hAtual; dh -= Math.round(dh); hAtual += dh * Math.min(1, dt * .4);
    kick = Math.max(0, kick - dt * 3); rajada = Math.max(0, rajada - dt * .3); flash = Math.max(0, flash - dt * 3);
    velCam = (.2 + .65 * eLenta) * lento; cam += dt * velCam * cur.vel;
    // paisagem em WebGL
    const G = iniciarGL();
    if (G) {
      const gl = G.gl, U = G.U, k = Math.min(1, W / H / 1.6);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.R, cv.width, cv.height);
      gl.uniform1f(U.T, relogio % 900); gl.uniform1f(U.CAM, cam % VOLTA); gl.uniform1f(U.P, pulso); gl.uniform1f(U.E, e);
      gl.uniform1f(U.H, (hAtual + relogio * .006 + eLenta * .08) % 1); gl.uniform1f(U.FL, flash);
      gl.uniform3fv(U.cTop, cur.top); gl.uniform3fv(U.cHor, cur.hor); gl.uniform3fv(U.cSol, cur.sol);
      gl.uniform3fv(U.cAreia, cur.areia); gl.uniform3fv(U.cSomb, cur.sombra); gl.uniform3fv(U.cNev, cur.nevoa);
      gl.uniform4f(U.uSol, cur.sx * k, cur.sy, cur.sr, cur.si);
      gl.uniform4f(U.uA, cur.estrelas, cur.aurora, cur.agua, cur.nuvem);
      gl.uniform4f(U.uB, Math.max(cur.neve, chuvaA * .8), cur.psy, cur.vento * (.7 + .6 * eLenta) + rajada * .8, cur.alt);
      gl.uniform4f(U.uC, cur.nebulosa, cur.tempestade, cur.brilho, cur.raios);
      gl.uniform2f(U.uD, cur.ruinas, cur.amp);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // historia por cima
    const mundo = mundoVisivel(), s = Math.min(W, H) * (W < H ? .2 : .11);
    parA += ((seAte('par') ? 1 : 0) - parA) * Math.min(1, dt * 1.2);
    asasA += ((seAte('asas') ? 1 : 0) - asasA) * Math.min(1, dt * 2);
    dancaA += ((seAte('danca') ? 1 : 0) - dancaA) * Math.min(1, dt * 2);
    luaA += ((seAte('lua') ? 1 : 0) - luaA) * Math.min(1, dt * .8);
    const voa = cur.voo > .5 || asasA > .5 || cur.alt > .15; // quando o chao vai embora, ele levanta voo
    vooA += ((voa ? 1 : 0) - vooA) * Math.min(1, dt * 1.5);
    const vooE = vooA * vooA * (3 - 2 * vooA);
    deslizaA += ((cur.vel > 2.2 && !voa ? 1 : 0) - deslizaA) * Math.min(1, dt * 1.5);
    // lua que nasce quando a letra fala dela
    if (luaA > .01) {
      const lx = W * .76, ly = H * (.3 - .12 * luaA), lr = Math.min(W, H) * .07, dia = 1 - cur.estrelas * .6;
      ctx.globalCompositeOperation = 'lighter'; luzC(lx, ly, lr * 4, [.7, .75, .9], .3 * luaA);
      ctx.fillStyle = `rgba(250,248,240,${(.85 - .35 * dia) * luaA})`; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(150,155,175,${.22 * luaA})`;
      [[-.3, -.2, .22], [.25, .15, .16], [-.05, .35, .12], [.35, -.3, .1]].forEach(([u, v, r]) => { ctx.beginPath(); ctx.arc(lx + u * lr, ly + v * lr, r * lr, 0, 7); ctx.fill(); });
    }
    povoar(dt, mundo, s);
    moverSeres(dt, pulso, 0, s);
    // onde o viajante esta: pisando na duna da frente ou voando
    const nascendo = lim((t - .4) / 2.5), indo = lim((dur - t) / 5);
    const gx = W * (W < H ? .44 : .4), fx = W * (.46 + .1 * Math.sin(relogio * .19)), fy = H * (.47 + .05 * Math.sin(relogio * .31));
    const tx = gx + (fx - gx) * vooE + (1 - indo) * W * .3;
    if (!px) px = tx;
    px += (tx - px) * Math.min(1, dt * 1.5);
    const gy = Math.min(chaoY(px), H * .8), y = gy + (fy - gy) * vooE;
    const incl = Math.atan2(chaoY(px + 6) - chaoY(px - 6), 12);
    const tilt = incl * (.55 + .35 * deslizaA) * (1 - vooE) + vooE * (.28 + Math.sin(relogio * .6) * .08);
    // passos casados com a areia que passa (os pes nao escorregam)
    const scroll = (4 / 9) * velCam * cur.vel * H, chao = 1 - vooE;
    let balanco = 0;
    if (chao > .5 && deslizaA < .5) {
      const fase = (cam * 4 / 9 * H) / (s * .3) * Math.PI;
      balanco = Math.sin(fase);
      const passo = Math.floor(fase / Math.PI);
      if (passo !== passoAntes) {
        passoAntes = passo;
        if (cur.agua > .5) nascer('onda', { x: px, y: gy, plano: true, a: .5, camada: 1 });
        else if (cur.nuvem < .3) pegadas.push({ X: (px - W / 2) / H * 9 + cam * 4, vida: 0, lado: passo % 2 ? 1 : -1 });
      }
    }
    if (giro > 0) { giro += dt * 9; if (giro > Math.PI * 2) giro = 0; }
    const bob = Math.abs(balanco) * s * .025 * chao + vooE * Math.sin(relogio * 1.7) * s * .06 + kick * s * .02 + dancaA * Math.abs(Math.sin(relogio * 4)) * s * .08;
    const o = { tilt, bob, voo: vooE, desliza: deslizaA, balanco, chao, vento: cur.vento, alpha: nascendo * (.35 + .65 * indo), P: pulso, asas: asasA,
      coroa, giro, lado: solX() > px ? 1 : -1, fita: cur.psy > .5 ? hsl(matizCSS()) : cur.fita, manto: MANTO };
    pose(heroi, px, y, s, o, dt);
    if (parA > .01) {
      const ax2 = px - s * 1.05, ay2 = chaoY(ax2) + (fy + Math.sin(relogio * 1.3) * s * .3 - chaoY(ax2)) * vooE;
      pose(amigo, ax2, ay2, s * .92, Object.assign({}, o, { alpha: o.alpha * parA, tilt: o.tilt * .9, bob: o.bob * .8, balanco: -balanco, coroa: false, giro: 0,
        fita: [o.fita[2], o.fita[0], o.fita[1]], manto: MANTO2 }), dt);
      if (rnd() < dt * 1.2) nascer('petala', { cx: px - s * .5, cy: y - s * .6, ang: rnd() * 7, r: s * .25, s: rnd(), camada: 1 });
    }
    if (chao > .3) desenharPegadas(dt, s);
    // reflexo no espelho d'agua
    if (cur.agua > .3 && chao > .5) {
      ctx.save(); ctx.translate(0, gy * 2); ctx.scale(1, -1); ctx.globalAlpha = .3 * cur.agua;
      if (parA > .01) desenharViajante(amigo); desenharViajante(heroi); ctx.restore();
    }
    if (parA > .01) desenharViajante(amigo);
    desenharViajante(heroi);
    const sobreAreia = chao > .5 && cur.agua < .3 && cur.nuvem < .3;
    areia(dt, s, px - s * .05, gy, sobreAreia ? (deslizaA > .5 ? 4 : (cur.tempestade > .5 || scroll > H * .3) && rnd() < .5 ? 1 : 0) : 0);
    moverSeres(dt, pulso, 1, s);
    // faixa escura embaixo para a letra ler bem sobre a areia clara
    const fx0 = H * .55, gr = ctx.createLinearGradient(0, fx0, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${temLetra ? .5 : .22})`);
    ctx.fillStyle = gr; ctx.fillRect(0, fx0, W, H - fx0);
    // titulo do capitulo
    if (titulo) {
      titulo.vida += dt; const v = titulo.vida, al = Math.min(1, v / 1.1, Math.max(0, (4.6 - v) / 1.2));
      if (al <= 0) titulo = null;
      else {
        const ty = H * .19 - (1 - Math.min(1, v / 1.5)) * H * .015;
        ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14;
        try { ctx.letterSpacing = Math.round(H * .012) + 'px'; } catch {}
        ctx.font = `500 ${Math.round(Math.max(11, H * .016))}px Outfit, sans-serif`; ctx.globalAlpha = al * .75; ctx.fillText('CAPÍTULO ' + titulo.num, W / 2, ty);
        ctx.globalAlpha = al * .5; ctx.fillRect(W / 2 - H * .04 * al, ty + H * .018, H * .08 * al, 1);
        try { ctx.letterSpacing = Math.round(H * .006) + 'px'; } catch {}
        ctx.font = `600 ${Math.round(Math.max(22, H * .048))}px Outfit, sans-serif`; ctx.globalAlpha = al; ctx.fillText(titulo.nome, W / 2, ty + H * .075);
        ctx.restore();
      }
    }
    // fim da musica: a luz vai baixando
    if (indo < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - indo) * .55})`; ctx.fillRect(0, 0, W, H); }
  },
};
function hsl(h) { // matiz -> cor [r,g,b] viva
  const k = n => (n + h / 30) % 12, f = n => .5 - .45 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}
})();
