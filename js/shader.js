// ろうそくの場面を 1枚の絵として描く「シェーダー」(画面の1点ずつの色を決めるプログラム)。
// 単位は cm。原点は「台(漆)の上、ろうそくの真下の手前のふち」。上が +y。
// 場面: 奥に土壁、手前は黒漆の台。光は炎ひとつだけ。

export const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uS;        // 1cm が何ピクセルか
uniform vec2  uOrg;      // 原点の位置(ピクセル)
uniform float uType;     // 0 ふつう / 1 ティーライト(アルミの器)
uniform vec4  uBody;     // 高さ, 上の半径, 下の半径, 形の曲がり具合
uniform vec3  uWax;      // ろうの色(リニア)
uniform vec4  uWaxP;     // 透け具合(cm), 池の広さ(割合), くぼみの深さ(cm), 模様(0なし 1絵 2蜂の巣)
uniform vec4  uWick;     // 芯の長さ, 太さ, 曲がり, 種類(0 ふつう 1 和ろうそく)
uniform vec4  uFlame;    // 炎の高さ, 半幅, 根元の傾き, 先の傾き
uniform vec4  uFlameP;   // 灯っている度合い, ゆらめき, 芯の赤い火, 炎の色(0 ふつう→1 だいだい)
uniform vec2  uFB;       // 炎の根元の位置(cm)
uniform vec2  uLP;       // 光の中心(cm)
uniform vec4  uLight;    // 光の強さ, 露出, まわりのうす明かり, 色(0 白っぽい .5 ふつう 1 あたたか)
uniform vec4  uHold;     // 台の種類(0 なし 1 鉄の燭台 2 真鍮の燭台 3 皿), 高さ, 半径, つや
uniform vec3  uHoldCol;  // 台の色
uniform vec4  uSmoke;    // 消えてからの秒数, 濃さ, 芯の先 x, y
uniform float uBlack;    // 1 で真っ黒

const float K  = 0.2;    // 見下ろす角度(上の面のだ円のつぶれ具合)
const float DW = 22.0;   // 壁までの距離
const float YJ = 4.4;    // 壁と台のさかい目(画面上の高さ) = K*DW
float gSide = 0.0;       // いま描いた点が ろうそくの手前の横の面か(炎や芯をかくすため)

float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
  return s;
}

vec3 lightCol(){
  vec3 cool = vec3(1.0, 0.50, 0.21);
  vec3 mid  = vec3(1.0, 0.40, 0.12);
  vec3 warm = vec3(1.0, 0.31, 0.065);
  float w = uLight.w;
  return w < 0.5 ? mix(cool, mid, w*2.0) : mix(mid, warm, w*2.0-1.0);
}

// ---------- 炎 ----------
float prof(float t, float t0, float tb, float w){
  if (t < t0 || t > 1.0) return 0.0;
  if (t < tb){ float u = (tb - t)/(tb - t0); return w*sqrt(max(1.0 - u*u, 0.0)); }
  float u = (t - tb)/(1.0 - tb);
  return w*(1.0 - pow(u, 1.55))*(1.0 - 0.22*u);
}

vec3 flameEmit(vec2 p){
  float lit = uFlameP.x;
  if (lit <= 0.002) return vec3(0.0);
  float h = uFlame.x*mix(0.22, 1.0, lit);
  float w = uFlame.y*mix(0.55, 1.0, lit);
  vec2 q = p - uFB;
  float t = q.y/h;
  if (t < -0.2 || t > 1.05) return vec3(0.0);
  if (abs(q.x) > h*1.2 + w*2.0) return vec3(0.0);
  float bend = (uFlame.z*t + (uFlame.w - uFlame.z)*t*t)*h;
  float wob = uFlameP.y*w*t*t*(sin(t*8.0 - uTime*12.0)*0.5 + (vnoise(vec2(t*3.5 - uTime*5.0, 2.0)) - 0.5)*1.4);
  float x = q.x - bend - wob;
  float tint = uFlameP.w;

  float hwO = prof(t, -0.13, 0.22 + 0.12*tint, w);
  float hwL = prof(t, 0.03 + 0.05*tint, 0.30 + 0.14*tint, w*0.9);
  float aa = 1.2/(uS*max(w, 0.05));
  float dO = abs(x)/max(hwO, 1e-4);
  float dL = abs(x)/max(hwL, 1e-4);
  float envO = hwO > 0.0 ? smoothstep(1.0, 0.78 - aa, dO) : 0.0;
  float envL = hwL > 0.0 ? smoothstep(1.0, 0.70 - aa, dL) : 0.0;

  float tn = clamp((t - 0.03)/0.97, 0.0, 1.0);
  float core = (1.0 - dL*dL)*(1.0 - smoothstep(0.30, 0.95 - 0.15*tint, tn));
  vec3 cTip  = vec3(1.0, 0.30, 0.05);
  vec3 cOut  = vec3(1.0, 0.52, 0.13);
  vec3 cMid  = vec3(1.0, 0.80, 0.42);
  vec3 cCore = vec3(1.0, 0.95, 0.84);
  vec3 c = mix(cTip, cOut, smoothstep(0.98, 0.62, tn));
  cMid = mix(cMid, vec3(1.0, 0.64, 0.24), tint);
  cCore = mix(cCore, vec3(1.0, 0.84, 0.55), tint);
  c = mix(c, cMid, smoothstep(0.15, 0.65, core));
  c = mix(c, cCore, smoothstep(0.55, 0.95, core));
  float lum = envL*mix(1.0, 0.25 + 0.15*tint, smoothstep(0.6, 1.0, tn))*(2.2 + 5.5*core*(1.0 - 0.35*tint))*(1.0 - 0.38*tint);

  // 芯のまわりの暗いところ(まだ燃えていない ろうの蒸気)
  float dz = 1.0 - smoothstep(0.30, 1.0, length(vec2(x/(w*0.55), (t - 0.10 - 0.05*tint)/(0.17 + 0.06*tint))));
  lum *= 1.0 - 0.88*dz;
  vec3 e = c*lum;

  // 青い根元
  float blue = envO*(1.0 - envL*0.92)*smoothstep(0.09, -0.03, t);
  blue *= 0.2 + 0.8*smoothstep(0.25, 0.85, dO);
  e += vec3(0.0, 0.12, 0.55)*blue*0.4*(1.0 - 0.5*tint);
  e += vec3(0.22, 0.10, 0.03)*dz*envO*0.35;

  // つけたて・消えかけは 小さく 青っぽい
  float young = smoothstep(0.15, 0.75, lit);
  e = mix(vec3(0.12, 0.22, 1.0)*(envO*1.4 + envL*0.6), e, young);
  return e*smoothstep(0.0, 0.12, lit);
}

vec3 halo(vec2 p){
  float lit = uFlameP.x;
  if (lit <= 0.002) return vec3(0.0);
  vec2 d = p - uLP;
  d.y *= 0.72;
  float r = length(d)/max(uFlame.x, 0.5)*3.0;
  float g = 0.30*exp(-r*1.6) + 0.07*exp(-r*0.42) + 0.015*exp(-r*0.12);
  return mix(vec3(1.0, 0.55, 0.20), lightCol(), 0.5)*g*(uLight.x/60.0)*lit;
}

// ---------- 光と影 ----------
// 世界の点 P(x,y,z) が炎から照らされるか(ろうそく本体の影)。1=照らされる
float candleShadow(vec3 P){
  float Rt = (uType > 0.5) ? uBody.y : uBody.y;
  float Htop = uHold.y + uBody.x;
  vec2 L = vec2(uLP.x, 0.0);
  vec2 D = vec2(P.x, P.z) - L;
  float dd = dot(D, D);
  if (dd < 1e-4) return 0.0;
  float b = dot(L, D);
  float c = dot(L, L) - Rt*Rt;
  float disc = b*b - dd*c;
  if (disc < 0.0) return 1.0;
  float s = (-b + sqrt(disc))/dd;     // 本体の上をこえる位置
  if (s >= 1.0) return 1.0;            // 本体の中(上の面)
  float hExit = uLP.y + s*(P.y - uLP.y);
  float pen = uFlame.x*0.35*(1.0 - s) + 0.05;
  return smoothstep(-pen, pen, hExit - Htop);
}

float irr(vec3 P, vec3 n){
  vec3 L = vec3(uLP, 0.0) - P;
  float d2 = dot(L, L);
  float c = max(dot(n, normalize(L)), 0.0);
  return c/(d2 + 4.0);
}

// ---------- 背景(土壁と黒漆の台) ----------
vec3 wallAt(vec2 p){
  float yw = (p.y - YJ)/0.98;
  vec3 P = vec3(p.x, yw, -DW);
  float sh = candleShadow(P);
  float E = irr(P, vec3(0.0, 0.0, 1.0))*sh;
  // 土のざらつきと、すさ(わらの繊維)
  float n1 = fbm(p*0.9);
  float n2 = fbm(p*4.0 + 3.0);
  vec2 rp = mat2(0.8, 0.6, -0.6, 0.8)*p;
  float fib = smoothstep(0.80, 0.95, vnoise(rp*vec2(1.6, 14.0)))*smoothstep(0.55, 0.8, vnoise(p*0.7 + 9.0));
  vec3 alb = vec3(0.30, 0.205, 0.13)*(0.72 + 0.45*n1)*(0.85 + 0.3*n2);
  alb = mix(alb, vec3(0.46, 0.34, 0.20), fib*0.45);
  // すみ(角)の暗がり
  float ao = 0.55 + 0.45*smoothstep(0.0, 3.0, yw);
  return alb*(E*uLight.x*1.7*lightCol() + uLight.z*vec3(0.9, 0.85, 0.8))*ao;
}

vec3 tableAt(vec2 p){
  float z = -p.y/K;
  vec3 P = vec3(p.x, 0.0, z);
  float sh = candleShadow(P);
  float E = irr(P, vec3(0.0, 1.0, 0.0))*sh;
  float n = fbm(vec2(p.x*0.25, z*0.08));
  vec3 alb = vec3(0.030, 0.012, 0.009)*(0.8 + 0.4*n);   // 黒漆に うすく朱
  // 漆の表面のやわらかい照り(光の当たる場所が ぼんやり明るい)
  vec3 Lv = normalize(vec3(uLP, 0.0) - P);
  vec3 V = normalize(vec3(0.0, K, 1.0));
  vec3 Hh = normalize(Lv + V);
  float sheen = pow(max(Hh.y, 0.0), 30.0)*0.6*sh;
  // 奥の すみ
  float ao = 0.6 + 0.4*smoothstep(0.0, 2.5, (YJ - p.y)/K);
  return (alb*(E*uLight.x*1.0 + uLight.z) + sheen*E*uLight.x*18.0*0.04)*lightCol()*ao + alb*uLight.z*0.3;
}

// ---------- 台(燭台・皿) ----------
float holderR(float y){
  float k = uHold.x; float Hh = uHold.y; float R = uHold.z;
  if (k < 1.5){            // 鉄の燭台: 丸い台座, 細い柱, 上に受け皿
    if (y < 0.0 || y > Hh) return 0.0;
    if (y < 0.45) return R*mix(1.0, 0.92, y/0.45);
    if (y < 0.9)  return mix(R*0.92, 0.42, smoothstep(0.45, 0.9, y));
    if (y < Hh - 0.25) return 0.36 + 0.06*smoothstep(Hh - 1.2, Hh - 0.4, y);
    return 2.1;
  } else if (k < 2.5){     // 真鍮の燭台
    if (y < 0.0 || y > Hh) return 0.0;
    if (y < 0.35) return R;
    if (y < 1.6)  return mix(R, 0.85, pow(smoothstep(0.35, 1.6, y), 0.6));
    float r = 0.62 + 0.18*exp(-pow((y - 3.2)/0.45, 2.0)) + 0.32*exp(-pow((y - Hh*0.55)/0.6, 2.0)) + 0.14*exp(-pow((y - (Hh - 2.4))/0.35, 2.0));
    if (y > Hh - 1.3) r = mix(r, 2.0, smoothstep(Hh - 1.3, Hh - 0.9, y));
    if (y > Hh - 0.7) r = mix(2.0, 1.45, smoothstep(Hh - 0.7, Hh - 0.4, y));
    return r;
  } else {                 // 皿
    if (y < 0.0 || y > Hh) return 0.0;
    return R*mix(0.78, 1.0, smoothstep(0.0, Hh*0.7, y));
  }
}

vec4 holder(vec2 p){
  float k = uHold.x;
  if (k < 0.5) return vec4(0.0);
  float Hh = uHold.y; float R = max(uHold.z, 2.1);
  float ax = abs(p.x);
  if (ax > R + 0.1 || p.y < -K*R - 0.1 || p.y > Hh + K*R + 0.1) return vec4(0.0);
  float px = 1.0/uS;
  // 上の面(皿・受け皿)
  float Rtop = holderR(Hh - 0.001);
  float st = sqrt(max(Rtop*Rtop - ax*ax, 0.0));
  vec2 qe = vec2(p.x/Rtop, (p.y - Hh)/(K*Rtop));
  float Le = length(qe);
  vec2 g = vec2(qe.x/Rtop, qe.y/(K*Rtop))/max(Le, 1e-4);
  float dTop = (Le - 1.0)/max(length(g), 1e-4);
  float aTop = clamp(0.5 - dTop/px, 0.0, 1.0);
  // 横の面: 高さ y の輪の手前のふちが p.y にくる y を さがす(だいたいで 4 回)
  float y = p.y;
  float r = 0.0;
  for (int i = 0; i < 4; i++){
    r = holderR(clamp(y, 0.0, Hh));
    float s = sqrt(max(r*r - ax*ax, 0.0));
    y = p.y + K*s;
  }
  r = holderR(clamp(y, 0.0, Hh));
  float inSide = (y >= 0.0 && y <= Hh) ? clamp(0.5 - (ax - r)/px, 0.0, 1.0) : 0.0;
  if (y > Hh - 0.001 && aTop <= 0.0) inSide = 0.0;
  float a = max(inSide, aTop);
  if (a <= 0.0) return vec4(0.0);

  vec3 col;
  vec3 V = vec3(0.0, K, 0.98);
  if (aTop > 0.0 && dTop < 0.0 + px){
    float z = -(p.y - Hh)/K;
    vec3 P = vec3(p.x, Hh, z);
    float sh = candleShadow(P);
    float E = irr(P, vec3(0.0, 1.0, 0.0))*sh;
    vec3 Lv = normalize(vec3(uLP, 0.0) - P);
    float spec = pow(max(dot(normalize(Lv + V), vec3(0.0, 1.0, 0.0)), 0.0), 12.0 + 40.0*uHold.w)*uHold.w;
    // ふちの 光るすじ
    float rim = smoothstep(0.86, 0.99, Le)*0.6;
    col = uHoldCol*(E*uLight.x*0.6*lightCol() + uLight.z) + lightCol()*E*uLight.x*(spec*6.0 + rim*uHold.w*2.0);
  } else {
    float nx = clamp(p.x/max(r, 1e-3), -1.0, 1.0);
    float nz = sqrt(max(1.0 - nx*nx, 0.0));
    float dr = (holderR(clamp(y + 0.05, 0.0, Hh)) - holderR(clamp(y - 0.05, 0.0, Hh)))/0.1;
    vec3 n = normalize(vec3(nx, -dr, nz));
    vec3 P = vec3(p.x, y, nz*r);
    float sh = candleShadow(P + n*0.05);
    vec3 Lv = normalize(vec3(uLP, 0.0) - P);
    float E = irr(P, n)*sh;
    vec3 Hv = normalize(Lv + normalize(V));
    float spec = pow(max(dot(n, Hv), 0.0), 20.0 + 60.0*uHold.w)*uHold.w;
    float fres = pow(1.0 - nz, 3.0);
    vec3 env = vec3(1.0, 0.55, 0.28)*uLight.x*0.016;   // まわり(照らされた壁)の照り返し
    col = uHoldCol*(E*uLight.x*0.6*lightCol() + uLight.z + env*(0.15 + 2.2*fres)*(0.4 + uHold.w)) + lightCol()*sh*spec*uLight.x*0.35;
    col *= 0.75 + 0.25*nz;
  }
  return vec4(col, a);
}

// ---------- ろうそく本体 ----------
float radiusAt(float y){
  float t = clamp(y/uBody.x, 0.0, 1.0);
  return mix(uBody.z, uBody.y, pow(t, uBody.w));
}

float hexEdge(vec2 p){
  vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(p, s) - s*0.5;
  vec2 b = mod(p - s*0.5, s) - s*0.5;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  vec2 q = abs(g);
  float d = max(dot(q, normalize(s)), q.x);
  return smoothstep(0.36, 0.5, d);
}

vec4 paint(vec2 q){
  // 絵ろうそくの花(色あせた椿と葉)。q は cm(横はまわりの長さ, たては高さ)。a = 絵のある所
  vec3 col = vec3(0.0); float m = 0.0;
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    vec2 c = vec2(-0.45 + 0.6*fi - 0.25*mod(fi, 2.0), uBody.x*(0.62 - 0.13*fi));
    vec2 ld = q - c - vec2(0.42, -0.30);
    float leaf = 1.0 - smoothstep(0.85, 1.0, length(vec2(ld.x*0.8 + ld.y*0.6, ld.y*0.8 - ld.x*0.6)/vec2(0.42, 0.16)));
    vec2 ld2 = q - c - vec2(-0.35, -0.38);
    float leaf2 = 1.0 - smoothstep(0.85, 1.0, length(vec2(ld2.x*0.8 - ld2.y*0.6, ld2.y*0.8 + ld2.x*0.6)/vec2(0.38, 0.14)));
    float lf = max(leaf, leaf2)*0.85;
    col = mix(col, vec3(0.10, 0.17, 0.07), lf); m = max(m, lf);
    vec2 d = q - c;
    float a = atan(d.y, d.x);
    float r = length(d);
    float petal = 0.44 + 0.045*cos(5.0*a + fi*1.7);
    float f = smoothstep(petal, petal - 0.05, r);
    col = mix(col, mix(vec3(0.85, 0.50, 0.45), vec3(0.93, 0.82, 0.74), smoothstep(0.35, 0.1, r)), f*0.85); m = max(m, f*0.85);
    float ce = smoothstep(0.11, 0.07, r)*0.9;
    col = mix(col, vec3(0.80, 0.55, 0.10), ce);
  }
  return vec4(col, m);
}

vec4 body(vec2 p){
  float H = uBody.x, Rt = uBody.y, Rb = uBody.z;
  float y0 = uHold.y;
  float y = p.y - y0;
  float ax = abs(p.x);
  float Rmax = max(Rt, Rb);
  float px = 1.0/uS;
  if (ax > Rmax + 2.0*px || y < -K*Rmax - 2.0*px || y > H + K*Rt + 2.0*px) return vec4(0.0);
  float Ry = radiusAt(clamp(y + K*sqrt(max(Rmax*Rmax - ax*ax, 0.0))*0.0, 0.0, H));
  float st = sqrt(max(Rt*Rt - ax*ax, 0.0));
  float sb = sqrt(max(Rb*Rb - ax*ax, 0.0));
  float dSide = max(ax - Ry, max(-K*sb - y, y - (H - K*st)));
  vec2 qe = vec2(p.x/Rt, (y - H)/(K*Rt));
  float Le = length(qe);
  vec2 g = vec2(qe.x/Rt, qe.y/(K*Rt))/max(Le, 1e-4);
  float dTop = (Le - 1.0)/max(length(g), 1e-4);
  float aSide = clamp(0.5 - dSide/px, 0.0, 1.0);
  float aTop = clamp(0.5 - dTop/px, 0.0, 1.0);
  float a = max(aSide, aTop);
  gSide = aSide*(1.0 - aTop);
  if (a <= 0.0) return vec4(0.0);

  float I = uLight.x/60.0;        // 炎の明るさ(ゆらぐ)
  vec3 Lc = lightCol();
  float tr = uWaxP.x;
  float depth = uWaxP.z;
  float Rp = Rt*uWaxP.y;
  vec3 wax = uWax;
  float tea = step(0.5, uType);

  // ---- 横の面 ----
  float nx = clamp(p.x/max(Ry, 1e-3), -1.0, 1.0);
  float nz = sqrt(max(1.0 - nx*nx, 0.0));
  float u = asin(nx)*Ry;          // 横方向の長さ(cm)
  vec3 side;
  if (tea > 0.5){
    // アルミの器: たての細いひだ + まわりの照り返し
    float rib = 0.5 + 0.5*sin(u*42.0);
    float fres = pow(1.0 - nz, 2.0);
    vec3 alu = vec3(0.55, 0.55, 0.56);
    float refl = 0.010 + 0.05*smoothstep(0.0, 1.0, y/H)*(0.5 + 0.5*nz) + fres*0.03;
    side = alu*(refl*I*Lc*(0.7 + 0.3*rib)*1.6 + uLight.z*(0.4 + 0.3*rib));
    side += Lc*I*0.10*smoothstep(H - 0.25, H, y)*(0.6 + 0.4*rib);
  } else {
    float wall = max(Rt - Rp, 0.05);
    float thin = exp(-wall/(tr*1.3));
    float inTun = smoothstep(0.0, 0.25, depth)*step(H - depth, y);
    float yL = H - depth;
    float dy = max(yL - y, 0.0);
    float G = (0.18 + 1.6*thin*smoothstep(0.0, 0.8, depth) + 0.25*thin)*exp(-dy/tr);
    G *= mix(0.82, 1.0, nz) + 0.45*(1.0 - nz)*inTun;
    float mott = 0.93 + 0.1*fbm(vec2(u*2.5, y*2.5));
    vec3 sssCol = Lc*pow(max(wax, vec3(0.001)), vec3(0.6 + dy*0.5/tr));
    side = sssCol*G*I*1.25;
    side += wax*uLight.z*(0.35 + 0.65*nz);
    side += wax*Lc*pow(1.0 - nz, 3.0)*I*0.05;
    // 壁や台から はね返ってくる光
    vec3 refl = Lc*I*0.06*(0.45 + 0.55*nz) + uLight.z*(0.35 + 0.65*nz);
    side += wax*refl;
    side *= mott;
    if (uWaxP.w > 0.5 && uWaxP.w < 1.5){
      vec4 pt = paint(vec2(u, y));
      float glowL = dot(sssCol*G*I, vec3(0.3, 0.5, 0.2));
      side = mix(side, pt.rgb*(refl*1.2 + Lc*glowL*0.6), pt.a);
    }
    if (uWaxP.w > 1.5){
      float he = hexEdge(vec2(u, y)*2.4);
      side *= 1.0 - 0.32*he;
    }
    side *= 0.9 + 0.1*nz;
  }

  // ---- 上の面 ----
  vec3 top = vec3(0.0);
  if (aTop > 0.0){
    float topY = y0 + H;
    vec2 qp = vec2(p.x/Rp, (y - (H - depth))/(K*Rp));
    float lp = length(qp);
    vec2 qo = vec2(p.x/Rp, (y - H)/(K*Rp));
    float lo = length(qo);
    float poolY = y0 + H - depth;
    if (lp < 1.0){
      // とけた ろうの池: すき通って、下から光る。炎が映る
      vec3 liq = Lc*pow(max(wax, vec3(0.001)), vec3(1.3))*I*(1.1 + 0.6*(1.0 - lp*lp));
      if (tea > 0.5){
        liq = Lc*vec3(1.0, 0.92, 0.80)*I*(0.9 + 0.5*(1.0 - lp*lp));
        float tab = smoothstep(0.24, 0.20, length(vec2(p.x, (y - (H - depth))/K)));
        liq = mix(liq, vec3(0.08, 0.08, 0.085)*I + Lc*I*0.1, tab*0.8);
      }
      float men = smoothstep(0.80, 1.0, lp);
      liq *= 1.0 - 0.35*men;
      vec3 mirror = flameEmit(vec2(p.x, 2.0*poolY - p.y + 0.02));
      liq += mirror*(0.25 + 0.3*men);
      top = liq;
    } else if (lo < 1.0){
      // くぼみの 奥の壁(内側から照らされて いちばん明るい)
      float hgt = clamp((y - (H - depth))/max(depth, 0.01), 0.0, 1.0);
      vec3 inner = tea > 0.5 ? vec3(0.6)*Lc*I*0.9 : Lc*pow(max(wax, vec3(0.001)), vec3(0.7))*I*(2.2 - 0.8*hgt);
      top = inner;
    } else {
      // ふち(平らな輪)
      float z = -(y - H)/K;
      vec3 P = vec3(p.x, topY, z);
      float dh = uLP.y - topY;
      float r2 = dot(P.xz, P.xz);
      float E = max(dh, 0.0)/pow(r2 + dh*dh + 0.5, 1.5);
      if (tea > 0.5){
        top = vec3(0.7)*Lc*(E*uLight.x*0.2 + 0.25*I) + vec3(0.6)*uLight.z;
      } else {
        float wall = max(Rt - Rp, 0.05);
        float thin = exp(-wall/(tr*1.3));
        top = wax*Lc*(E*uLight.x*0.15) + Lc*pow(max(wax, vec3(0.001)), vec3(0.8))*I*(0.35 + 1.3*thin*smoothstep(0.0, 0.6, depth));
        top += wax*uLight.z;
      }
    }
  }
  vec3 col = mix(side, top, aTop);
  return vec4(col, a);
}

// ---------- 芯 ----------
vec4 wick(vec2 p){
  float L = uWick.x, ww = uWick.y;
  float y0 = uHold.y + uBody.x - uWaxP.z - 0.02;
  float t = (p.y - y0)/L;
  if (t < 0.0 || t > 1.0) return vec4(0.0);
  float lean = uFlame.z*0.25*uFlameP.x;
  float cx = uWick.z*t*t + lean*t*L;
  float dx = abs(p.x - cx);
  float px = 1.0/uS;
  float hw = ww*0.5*(uWick.w > 0.5 ? (0.8 + 0.4*smoothstep(0.5, 0.9, t)) : 1.0);
  float a = clamp(0.5 - (dx - hw)/px, 0.0, 1.0)*smoothstep(1.0, 0.94, t);
  if (a <= 0.0) return vec4(0.0);
  float I = uLight.x/60.0;
  vec3 c = mix(vec3(0.05, 0.04, 0.035), vec3(0.008, 0.006, 0.005), smoothstep(0.2, 0.6, t));
  c += lightCol()*I*0.04*(1.0 - t);
  // 芯の先の赤い火
  float em = uFlameP.z*smoothstep(0.55, 0.95, t);
  c += vec3(1.0, 0.22, 0.03)*em*(1.5 + 1.0*vnoise(vec2(uTime*3.0, 1.0)));
  return vec4(c, a);
}

// ---------- 煙 ----------
float smoke(vec2 p){
  if (uSmoke.y <= 0.0) return 0.0;
  float age = uSmoke.x;
  vec2 o = uSmoke.zw;
  float yy = p.y - o.y;
  if (yy < 0.0 || yy > 45.0) return 0.0;
  float v = 6.5;
  float head = age*v;
  float tail = max(age - 3.0, 0.0)*v*1.2;
  if (yy > head + 2.0 || yy < tail - 2.0) return 0.0;
  float drift = (vnoise(vec2(yy*0.15 - age*0.35, 7.0)) - 0.5)*yy*0.55 + sin(yy*0.55 - age*1.6)*0.14*sqrt(yy);
  float wid = 0.035 + yy*0.03;
  float d = (p.x - o.x - drift)/wid;
  float dens = exp(-d*d)*smoothstep(head + 1.0, head - 2.5, yy)*smoothstep(tail - 1.0, tail + 3.5, yy);
  dens *= exp(-yy/16.0)/(1.0 + yy*0.12);
  return dens*uSmoke.y;
}

// ---------- 組み立て ----------
vec3 objects(vec2 p, out float cover){
  vec3 col = vec3(0.0);
  cover = 0.0;
  vec4 h = holder(p);
  col = mix(col, h.rgb, h.a); cover = max(cover, h.a);
  gSide = 0.0;
  vec4 b = body(p);
  col = mix(col, b.rgb, b.a); cover = max(cover, b.a);
  float front = gSide;
  vec4 w = wick(p);
  w.a *= 1.0 - front;
  col = mix(col, w.rgb, w.a); cover = max(cover, w.a);
  col += flameEmit(p)*(1.0 - front);
  return col;
}

vec3 aces(vec3 x){
  return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0);
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 p = (fc - uOrg)/uS;
  vec3 col = p.y > YJ ? wallAt(p) : tableAt(p);

  // 黒漆への映り込み
  if (p.y < 0.0){
    float Rb0 = uHold.x > 0.5 ? max(holderR(0.01), 0.1) : uBody.z;
    float yb = -K*sqrt(max(Rb0*Rb0 - p.x*p.x, 0.0));
    if (p.y < yb + 0.02){
      float rough = (vnoise(vec2(p.x*0.8, p.y*0.5)) - 0.5)*0.025*(-p.y);
      vec2 pm = vec2(p.x + rough, 2.0*yb - p.y);
      float cv;
      vec3 rc = objects(pm, cv) + halo(pm)*0.6;
      float fall = exp(p.y/14.0);
      col = mix(col, col*0.3, cv*0.5);
      col += rc*0.24*fall;
      // 縦に のびる ぼんやりした光の帯
      float dx = (p.x - uLP.x)/(uFlame.y*2.2 + 0.35);
      float dyv = (p.y + uLP.y)/(uFlame.x*2.6 + 2.0);
      col += lightCol()*uLight.x*uFlameP.x*0.0022*exp(-dx*dx - dyv*dyv);
    }
  }

  float cv;
  vec3 ob = objects(p, cv);
  col = mix(col, vec3(0.0), cv) + ob;
  col += halo(p);

  // 煙
  float sm = smoke(p);
  col = mix(col, vec3(0.62, 0.58, 0.54)*(0.035 + uLight.z*6.0 + uFlameP.z*0.03), clamp(sm*0.75, 0.0, 1.0));

  col *= uLight.y;
  col = aces(col);
  col = pow(col, vec3(1.0/2.2));
  // ざらつき(暗いところの色の段々を消す)
  float gr = hash(fc + floor(uTime*10.0)*vec2(17.0, 31.0)) - 0.5;
  col += gr*(1.6/255.0);
  col *= 1.0 - uBlack;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
