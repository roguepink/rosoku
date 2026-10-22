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
uniform float uType;     // 0 ふつう / 1 ティーライト(アルミの器) / 2 灯明皿(油と灯芯)
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
uniform vec4  uMotif;    // 絵: 種類(1椿 2桜 3梅 4菊 5牡丹), 花の大きさ(cm), 数, 枝や葉(0/1)
uniform vec3  uPetal;    // 花の色
uniform vec3  uPetal2;   // 花の内側・しべの色
uniform vec3  uLeafC;    // 葉・枝の色
uniform vec4  uGold;     // 金箔: 量(0〜1)
uniform vec4  uCover;    // かさ: 種類(0なし 1行灯 2雪洞 3ほや 4竹), 半径, 下の高さ, 上の高さ
uniform vec3  uCoverCol; // 紙・ガラス・竹の色
uniform vec3  uFrameCol; // 枠の色

const float K  = 0.2;    // 見下ろす角度(上の面のだ円のつぶれ具合)
const float DW = 22.0;   // 壁までの距離
const float YJ = 4.4;    // 壁と台のさかい目(画面上の高さ) = K*DW
float gSide = 0.0;
float gNoFlame = 0.0;    // 1 = 炎は描かない(映り込みのぼかし用)
float gRefl = 0.0;       // 1 = 映り込みを描いている(上の面は映らない)       // いま描いた点が ろうそくの手前の横の面か(炎や芯をかくすため)

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
float prof(float t, float t0, float tb, float w, float tipE){
  if (t < t0 || t > 1.0) return 0.0;
  if (t < tb){ float u = (tb - t)/(tb - t0); return w*sqrt(max(1.0 - u*u, 0.0)); }
  float u = (t - tb)/(1.0 - tb);
  return w*(1.0 - pow(u, tipE))*(1.0 - 0.22*u);
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
  float wob = uFlameP.y*w*t*t*((vnoise(vec2(t*3.0 - uTime*4.3, 2.0)) - 0.5)*1.4 + (vnoise(vec2(t*6.0 - uTime*9.7, 5.0)) - 0.5)*0.7);
  float x = q.x - bend - wob;
  float tint = uFlameP.w;

  float tipE = mix(1.6, 2.4, tint);
  float hwO = prof(t, -0.13, 0.22 + 0.12*tint, w, tipE);
  float hwL = prof(t, 0.03 + 0.05*tint, 0.30 + 0.14*tint, w*0.9, tipE);
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
  cMid = mix(cMid, vec3(1.0, 0.55, 0.18), tint);
  cCore = mix(cCore, vec3(1.0, 0.78, 0.45), tint);
  c = mix(c, cMid, smoothstep(0.15, 0.65, core));
  c = mix(c, cCore, smoothstep(0.55, 0.95, core));
  float lum = envL*mix(1.0, 0.25 + 0.15*tint, smoothstep(0.6, 1.0, tn))*(2.2 + 5.5*core*(1.0 - 0.7*tint))*(1.0 - 0.38*tint);

  // 芯のまわりの暗いところ(まだ燃えていない ろうの蒸気)
  float dz = 1.0 - smoothstep(0.30, 1.0, length(vec2(x/(w*mix(0.55, 0.75, tint)), (t - 0.10 - 0.08*tint)/(0.17 + 0.14*tint))));
  lum *= 1.0 - 0.88*dz;
  vec3 e = c*lum;

  // 青い根元
  float blue = envO*(1.0 - envL*0.92)*smoothstep(0.12, 0.0, t)*(0.6 + 0.4*smoothstep(0.3, 0.9, dO))*(1.0 - 0.8*tint);
  blue *= 0.2 + 0.8*smoothstep(0.25, 0.85, dO);
  e += vec3(0.05, 0.10, 0.45)*blue*0.3;
  e += vec3(0.22, 0.10, 0.03)*dz*envO*0.06;

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


// ---------- かさ(行灯・雪洞・ほや・竹)----------
// 竹あかりの穴(u = まわりの長さ cm, y = 高さ cm)。soft が大きいほど ぼやける(壁にうつる光)
float bambooHole(float u, float y, float soft){
  float y0 = uCover.z + 2.2, y1 = uCover.w - 2.0;
  if (y < y0 - 1.0 || y > y1 + 1.0) return 0.0;
  vec2 q = vec2(u, y)/1.05;
  vec2 cell = floor(q);
  vec2 f = fract(q) - 0.5;
  float h1 = hash(cell + 3.1), h2 = hash(cell + 9.7);
  // 流れるような帯の中にだけ 穴をあける
  float band = 0.5 + 0.5*sin(cell.x*0.75 + cell.y*0.55);
  if (band < 0.38 || h1 < 0.2) return 0.0;
  vec2 o = (vec2(h1, h2) - 0.5)*0.3;
  float r = mix(0.09, 0.27, h2)*smoothstep(0.38, 0.8, band + 0.2);
  float d = length(f - o);
  float edge = smoothstep(y0 - 0.6, y0 + 0.4, y)*smoothstep(y1 + 0.6, y1 - 0.4, y);
  return (1.0 - smoothstep(r - soft, r + soft, d))*edge;
}
float paperShadeR(float y){
  // 雪洞の紙の かさ: 下がすぼまり、上が ひらく
  float t = clamp((y - uCover.z)/(uCover.w - uCover.z), 0.0, 1.0);
  return uCover.y*mix(0.72, 1.0, pow(t, 0.7))*(1.0 - 0.08*pow(t, 6.0));
}
float glassR(float y){
  float t = clamp((y - uCover.z)/(uCover.w - uCover.z), 0.0, 1.0);
  return uCover.y*(0.62 + 0.38*sin(3.14159*min(t*1.05, 1.0)))*(1.0 - 0.18*smoothstep(0.82, 1.0, t));
}
// 部屋(壁・台)へ とどく光の割合。紙は やわらかく、竹は 穴と上の口から だけ
float coverTrans(vec3 P){
  float k = uCover.x;
  if (k < 0.5) return 1.0;
  if (k < 2.5) return 0.55;
  if (k < 3.5) return 0.92;
  vec2 L = vec2(uLP.x, 0.0);
  vec2 D = vec2(P.x, P.z) - L;
  float dd = dot(D, D);
  float b = dot(L, D), c = dot(L, L) - uCover.y*uCover.y;
  float s = (-b + sqrt(max(b*b - dd*c, 0.0)))/max(dd, 1e-4);
  if (s >= 1.0) return 1.0;
  vec3 Hh = vec3(uLP, 0.0) + s*(P - vec3(uLP, 0.0));
  if (Hh.y > uCover.w) return 1.0;
  float u = atan(Hh.x, Hh.z)*uCover.y;
  float dist = length(P - Hh);
  return bambooHole(u, Hh.y, 0.04 + dist*0.012)*1.6;
}

// ---------- 背景(土壁と黒漆の台) ----------
vec3 wallAt(vec2 p){
  float yw = (p.y - YJ)/0.98;
  vec3 P = vec3(p.x, yw, -DW);
  float sh = (uCover.x > 0.5 && uCover.x < 2.5) ? 1.0 : candleShadow(P);
  sh *= coverTrans(P);
  float E = irr(P, vec3(0.0, 0.0, 1.0))*sh;
  // 光のたまり: 炎の正面から離れるほど早く暗く
  vec2 dl = vec2(p.x - uLP.x, (yw - uLP.y)*0.85);
  E *= 1.0/(1.0 + dot(dl, dl)/(14.0*14.0));
  // 土: 砂の粒(細かい)+ こての波(ゆるい)
  float n1 = fbm(p*0.35);
  float sand = vnoise(p*22.0)*0.6 + vnoise(p*47.0)*0.4;
  float grit = smoothstep(0.86, 0.95, vnoise(p*9.0 + 4.0));
  float trowel = sin(p.y*0.9 + 2.0*fbm(p*0.12))*0.5 + 0.5;
  // すさ: 短い わら。向きは ばらばら
  vec2 cell = floor(p*1.3);
  vec2 f = fract(p*1.3) - 0.5;
  float ang = hash(cell)*6.283;
  vec2 dir = vec2(cos(ang), sin(ang));
  float along = dot(f, dir), across = dot(f, vec2(-dir.y, dir.x));
  float fib = step(0.62, hash(cell + 7.1))*smoothstep(0.035, 0.0, abs(across))*smoothstep(0.32, 0.18, abs(along));
  vec3 alb = vec3(0.24, 0.19, 0.135)*(0.80 + 0.30*n1)*(0.86 + 0.28*sand)*(0.95 + 0.07*trowel)*(1.0 - 0.25*grit);
  alb = mix(alb, vec3(0.42, 0.33, 0.17), fib*0.55);
  float ao = 0.55 + 0.45*smoothstep(0.0, 3.0, yw);
  vec3 Lw = mix(lightCol(), vec3(1.0, 0.60, 0.32), 0.45);
  return alb*(E*uLight.x*1.9*Lw + uLight.z*vec3(0.9, 0.85, 0.8))*ao;
}

vec3 tableAt(vec2 p){
  float z = -p.y/K;
  vec3 P = vec3(p.x, 0.0, z);
  float sh = (uCover.x > 0.5 && uCover.x < 2.5) ? 1.0 : candleShadow(P);
  sh *= coverTrans(P);
  float E = irr(P, vec3(0.0, 1.0, 0.0))*sh;
  float n = fbm(vec2(p.x*0.25, z*0.08));
  vec3 alb = vec3(0.045, 0.011, 0.007)*(0.8 + 0.4*n);   // 黒漆に うすく朱
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
    float pole = 0.095*R;
    if (y < 0.9)  return mix(R*0.92, pole*1.5, smoothstep(0.45, 0.9, y));
    if (y < Hh - 0.25) return pole + 0.05*smoothstep(Hh - 1.2, Hh - 0.4, y);
    return 0.55*R;
  } else if (k < 2.5){     // 真鍮の燭台
    if (y < 0.0 || y > Hh) return 0.0;
    if (y < 0.35) return R;
    if (y < 1.6)  return mix(R, 0.85, pow(smoothstep(0.35, 1.6, y), 0.6));
    float r = 0.55 + 0.16*exp(-pow((y - Hh*0.38)/0.22, 2.0)) + 0.16*exp(-pow((y - Hh*0.68)/0.22, 2.0));
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
  float Hh = uHold.y; float R = max(uHold.z, 2.0);
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
  float aTop = clamp(0.5 - dTop/px, 0.0, 1.0)*(1.0 - gRefl);
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
  if (y > Hh - 0.001 && aTop <= 0.0 && gRefl < 0.5) inSide = 0.0;
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
    float rim = smoothstep(0.90, 0.985, Le)*smoothstep(1.0, 0.985, Le)*1.2;
    col = uHoldCol*(E*uLight.x*0.6*lightCol() + uLight.z) + lightCol()*E*uLight.x*(spec*2.0 + rim*(0.3 + uHold.w)*2.0) + uHoldCol*rim*uLight.x*0.01;
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
    vec3 env = vec3(1.0, 0.55, 0.28)*uLight.x*0.03;   // まわり(照らされた壁)の照り返し
    float diff = mix(0.6, 0.2, step(0.5, uHold.w));
    col = uHoldCol*(E*uLight.x*diff*lightCol() + uLight.z + env*(0.15 + 2.2*fres)*(0.4 + uHold.w)) + lightCol()*sh*spec*uLight.x*mix(0.17, 0.7, step(0.7, uHold.w));
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

float petalR(float a, float kind, float sz){
  if (kind < 1.5) return sz*(0.88 + 0.08*cos(5.0*a));                                              // 椿
  if (kind < 2.5){ float c = abs(cos(2.5*a)); return sz*(0.6 + 0.4*pow(c, 0.45) - 0.18*smoothstep(0.988, 1.0, c)); } // 桜(先に切れこみ)
  if (kind < 3.5){ float c = abs(cos(2.5*a)); return sz*(0.70 + 0.30*pow(c, 0.22)); }               // 梅(まるい花びら)
  if (kind < 4.5){ float c = abs(cos(8.0*a)); return sz*(0.52 + 0.48*pow(c, 0.65)); }               // 菊(細い花びら)
  if (kind < 5.5) return sz*(0.84 + 0.09*cos(7.0*a) + 0.05*cos(13.0*a + 1.0));                    // 牡丹
  return sz*(0.28 + 0.72*pow(abs(cos(1.5*a)), 1.3));                                              // あやめ(3枚の花びら)
}
float branchX(float y, float sz){ return -0.35*sz + 0.45*sz*sin(y*0.5) + (y - uBody.x*0.5)*0.1; }
vec4 paint(vec2 q){
  // 絵ろうそくの花。q は cm(横はまわりの長さ, たては高さ)。a = 絵のある所
  vec3 col = vec3(0.0); float m = 0.0;
  float kind = uMotif.x, sz = uMotif.y, n = uMotif.z, H = uBody.x;
  // 梅・桜は 枝
  if (uMotif.w > 0.5 && kind > 1.5 && kind < 3.5){
    float bx = branchX(q.y, sz*2.0);
    float br = smoothstep(0.11*sz, 0.06*sz, abs(q.x - bx))*smoothstep(H*0.2, H*0.3, q.y)*smoothstep(H*0.9, H*0.8, q.y);
    col = mix(col, uLeafC, br); m = max(m, br*0.95);
  }
  bool onBranch = uMotif.w > 0.5 && kind > 1.5 && kind < 3.5;
  for (int i = 0; i < 6; i++){
    float fi = float(i);
    if (fi > n - 0.5) break;
    vec2 c = vec2((mod(fi, 2.0)*2.0 - 1.0)*0.28*sz + 0.1*fi*sz, H*(0.70 - 0.22*fi));
    if (onBranch){ float cy = H*(0.80 - 0.095*fi); c = vec2(branchX(cy, sz*2.0) + (mod(fi, 2.0)*2.0 - 1.0)*0.55*sz, cy); }
    if (kind > 5.5){
      // あやめ: 剣のような 細い葉
      float bl = smoothstep(0.09*sz, 0.04*sz, abs(q.x - (c.x + 0.45*sz + (q.y - c.y)*0.12)))*step(q.y, c.y - 0.4*sz)*step(c.y - 4.0*sz, q.y);
      col = mix(col, uLeafC, bl*0.9); m = max(m, bl*0.9);
    }
    // 葉(椿・菊・牡丹)
    if (uMotif.w > 0.5 && (kind < 1.5 || kind > 3.5)){
      vec2 ld = q - c - vec2(0.85, -0.7)*sz;
      float leaf = 1.0 - smoothstep(0.85, 1.0, length(vec2(ld.x*0.8 + ld.y*0.6, ld.y*0.8 - ld.x*0.6)/(vec2(0.9, 0.34)*sz)));
      vec2 ld2 = q - c - vec2(-0.8, -0.85)*sz;
      float leaf2 = 1.0 - smoothstep(0.85, 1.0, length(vec2(ld2.x*0.8 - ld2.y*0.6, ld2.y*0.8 + ld2.x*0.6)/(vec2(0.85, 0.3)*sz)));
      float lf = max(leaf, leaf2)*0.9;
      col = mix(col, uLeafC, lf); m = max(m, lf);
    }
    vec2 d = q - c;
    if (kind > 5.5) d.y *= 0.8;
    float a = atan(d.y, d.x) + (kind > 5.5 ? -1.5708 : fi*1.3);
    float r = length(d);
    float pr = petalR(a, kind, sz);
    float f = smoothstep(pr, pr - 0.05, r);
    // 花びらの さかい目と、内側の色
    float vein = kind > 3.5 && kind < 4.5 ? 0.85 + 0.15*abs(cos(8.0*a)) : 0.92 + 0.08*cos(5.0*a + 3.14);
    vec3 pc = mix(uPetal2, uPetal, smoothstep(0.15*sz, 0.75*sz, r))*vein;
    if (kind > 4.5 && kind < 5.5) pc *= 0.9 + 0.1*smoothstep(0.45*sz, 0.5*sz, r);      // 牡丹の 重なり
    if (kind > 5.5) pc = mix(pc, vec3(0.80, 0.62, 0.12), smoothstep(0.22, 0.0, abs(sin(1.5*a)))*smoothstep(0.1*sz, 0.4*sz, r)*0.85);   // あやめの 黄色いすじ
    col = mix(col, pc, f*0.93); m = max(m, f*0.93);
    // しべ
    float ce = kind > 2.5 && kind < 3.5
      ? smoothstep(0.07*sz, 0.04*sz, abs(r - 0.33*sz))*step(0.5, fract(a*1.27))*0.9 + smoothstep(0.12*sz, 0.08*sz, r)*0.6
      : smoothstep(0.24*sz, 0.15*sz, r)*0.9;
    col = mix(col, kind > 1.5 && kind < 2.5 ? uPetal2*0.8 : vec3(0.62, 0.42, 0.08), ce*f);
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
  float aTop = clamp(0.5 - dTop/px, 0.0, 1.0)*(1.0 - gRefl);
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
    if (uType > 1.5){
      // 灯明皿(かわらけ): すぐ上の炎に 照らされる
      float df = length(vec2(p.x - uFB.x, y + y0 - uFB.y));
      G = 0.0;
      wax *= 1.0 + 1.4*exp(-df/1.6)*nz;
    }
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
      side = mix(side, pt.rgb*(refl*2.6 + Lc*glowL*0.8), pt.a);
    }
    if (uGold.x > 0.0){
      // 金箔: ところどころ(量が多いと全部)。箔の継ぎ目と しわで ちらちら光る
      float gn = vnoise(vec2(u, y)*2.2)*0.65 + vnoise(vec2(u, y)*7.0)*0.35;
      float gm = smoothstep(1.0 - uGold.x, 1.0 - uGold.x + 0.05, gn + 0.02*uGold.x);
      vec2 sq = vec2(u + 0.3, y)/1.8;
      float seam = max(smoothstep(0.04, 0.0, abs(fract(sq.x) - 0.5) - 0.47), smoothstep(0.04, 0.0, abs(fract(sq.y) - 0.5) - 0.47));
      float cr = vnoise(vec2(u*6.0, y*5.0));
      float tw = 0.7 + 0.3*sin(uTime*0.9 + cr*9.0);
      vec3 goldC = vec3(0.78, 0.52, 0.12);
      float nearTop = 0.55 + 0.9*exp(-(H - y)/4.0);
      vec3 gcol = goldC*(refl*2.2 + uLight.z*1.5)
                + goldC*Lc*I*nearTop*(0.06 + 0.42*pow(1.0 - nz, 1.4) + 0.22*exp(-pow((nx + 0.3)/0.18, 2.0))*(0.6 + 0.6*cr)*tw);
      gcol *= 1.0 - 0.35*seam;
      side = mix(side, gcol, gm);
    }
    if (uWaxP.w > 1.5){
      float he = hexEdge(vec2(u, y)*2.4);
      side *= 1.0 - 0.15*he*smoothstep(H*0.3, H*0.85, y);
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
    vec3 liq = vec3(0.0), inner = vec3(0.0), rimc = vec3(0.0);
    {
      // とけた ろうの池: すき通って、下から光る。炎が映る
      liq = Lc*pow(max(wax, vec3(0.001)), vec3(1.3))*I*(1.1 + 0.6*(1.0 - lp*lp));
      if (uType > 1.5){
        // 油: 黒っぽい こはく色で、よく映る
        liq = vec3(0.05, 0.025, 0.006)*(0.6 + 0.4*I) + Lc*I*0.05*(1.0 - lp*lp);
      } else if (tea > 0.5){
        liq = Lc*vec3(1.0, 0.92, 0.80)*I*(0.9 + 0.5*(1.0 - lp*lp));
        float tab = smoothstep(0.24, 0.20, length(vec2(p.x, (y - (H - depth))/K)));
        liq = mix(liq, vec3(0.08, 0.08, 0.085)*I + Lc*I*0.1, tab*0.8);
      }
      float men = smoothstep(0.80, 1.0, lp);
      liq *= 1.0 - 0.35*men;
      vec3 mirror = flameEmit(vec2(p.x, 2.0*poolY - p.y + 0.02));
      liq += mirror*(uType > 1.5 ? 0.55 : 0.25 + 0.3*men);
    }
    {
      // くぼみの 奥の壁(内側から照らされて いちばん明るい)
      float hgt = clamp((y - (H - depth))/max(depth, 0.01), 0.0, 1.0);
      inner = tea > 0.5 ? vec3(0.6)*Lc*I*0.9 : Lc*pow(max(wax, vec3(0.001)), vec3(0.7))*I*(2.2 - 0.8*hgt);
    }
    {
      // ふち(平らな輪)
      float z = -(y - H)/K;
      vec3 P = vec3(p.x, topY, z);
      float dh = uLP.y - topY;
      float r2 = dot(P.xz, P.xz);
      float E = max(dh, 0.0)/pow(r2 + dh*dh + 0.5, 1.5);
      if (tea > 0.5){
        rimc = vec3(0.7)*Lc*(E*uLight.x*0.2 + 0.25*I) + vec3(0.6)*uLight.z;
      } else {
        float wall = max(Rt - Rp, 0.05);
        float thin = exp(-wall/(tr*1.3));
        rimc = wax*Lc*(E*uLight.x*0.15) + Lc*pow(max(wax, vec3(0.001)), vec3(0.8))*I*(0.15 + 1.3*thin*smoothstep(0.0, 0.6, depth));
        rimc += wax*uLight.z;
      }
    }
    // さかい目は 1ピクセルぶん なめらかに まぜる(ギザギザを出さない)
    float pw = px/(K*Rp);
    float mPool = 1.0 - smoothstep(1.0 - pw, 1.0 + pw, lp);
    float mOpen = 1.0 - smoothstep(1.0 - pw, 1.0 + pw, lo);
    top = mix(mix(rimc, inner, mOpen), liq, mPool);
  }
  vec3 col = mix(side, top, aTop);
  return vec4(col, a);
}

// ---------- 芯 ----------
vec4 wick(vec2 p){
  float L = uWick.x, ww = uWick.y;
  if (uType > 1.5){
    // 灯芯: 油の中から ふちへ のびる
    vec2 A = vec2(uBody.y*0.1, uHold.y + uBody.x - uWaxP.z);
    vec2 B = uFB + vec2(0.0, 0.12);
    vec2 pa = p - A, ba = B - A;
    float t2 = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
    float d2 = length(pa - ba*t2);
    float a2 = clamp(0.5 - (d2 - ww*0.5)*uS, 0.0, 1.0);
    if (a2 <= 0.0) return vec4(0.0);
    float I2 = uLight.x/60.0;
    vec3 c2 = mix(vec3(0.5, 0.45, 0.35)*(0.08 + I2*0.25), vec3(0.01), smoothstep(0.75, 0.95, t2));
    c2 = mix(c2, c2*0.35, smoothstep(0.5, 0.3, t2));
    c2 += vec3(1.0, 0.22, 0.03)*uFlameP.z*smoothstep(0.85, 1.0, t2)*1.5;
    return vec4(c2, a2);
  }
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
  float v = 15.0;
  float head = age*v;
  float tail = max(age - 3.0, 0.0)*v*1.1;
  if (yy > head + 2.0 || yy < tail - 2.0) return 0.0;
  float tur = smoothstep(5.0, 9.0, yy);
  float drift = ((vnoise(vec2(yy*0.15 - age*0.35, 7.0)) - 0.5)*(yy - 4.0)*0.6 + sin(yy*0.55 - age*1.6)*0.25*sqrt(yy))*tur + (vnoise(vec2(yy*0.4, age))-0.5)*0.08;
  float wid = 0.03 + yy*0.008 + tur*yy*0.03;
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
  if (gNoFlame < 0.5) col += flameEmit(p)*(1.0 - max(front, gRefl*cover));
  return col;
}


// かさを 上から重ねる(紙・竹は 中の ろうそくを かくし、内側からの光で光る。ガラスは すける)
vec3 coverLayer(vec2 p, vec3 col){
  float k = uCover.x;
  if (k < 0.5) return col;
  float px = 1.0/uS;
  float I = uLight.x/60.0;
  vec3 Lc = lightCol();
  float ax = abs(p.x);
  float y0 = uCover.z, y1 = uCover.w, R = uCover.y;
  vec3 L3 = vec3(uLP, 0.0);
  float fib = 0.86 + 0.22*fbm(vec2(p.x*1.6, p.y*0.5)) + 0.18*smoothstep(0.72, 0.92, vnoise(vec2(p.x*1.2 + p.y*0.3, p.y*7.0)));
  float blob = exp(-pow((p.x - uLP.x)/(uFlame.y*2.6 + 0.4), 2.0) - pow((p.y - uLP.y)/(uFlame.x*0.65 + 0.4), 2.0))*uFlameP.x;
  if (k < 1.5){
    // 行灯: 四角い木の枠に 和紙(正面から)
    float Yf0 = y0 - K*R, Yf1 = y1 - K*R;       // 手前の面
    float post = 0.45;
    float inX = clamp(0.5 - (ax - R)/px, 0.0, 1.0);
    float legs = step(-K*R, p.y)*step(p.y, Yf0)*clamp(0.5 - (abs(ax - (R - post*0.5)) - post*0.5)/px, 0.0, 1.0);
    float front = inX*step(Yf0, p.y)*step(p.y, Yf1);
    float opening = inX*step(Yf1, p.y)*step(p.y, y1 + K*R)*(1.0 - gRefl);
    if (front + opening + legs <= 0.0) return col;
    vec3 c;
    if (front > 0.0){
      vec3 P = vec3(p.x, p.y + K*R, R);
      float sh = candleShadow(P);
      float E = irr(P, vec3(0.0, 0.0, -1.0));
      c = uCoverCol*Lc*uLight.x*E*0.55*fib*(0.25 + 0.75*sh) + Lc*I*0.55*blob*sh + uCoverCol*uLight.z;
      float rail = max(smoothstep(0.3, 0.2, abs(p.y - Yf0 - 0.25)), smoothstep(0.3, 0.2, abs(p.y - Yf1 + 0.25)));
      rail = max(rail, smoothstep(0.16, 0.08, abs(p.y - mix(Yf0, Yf1, 0.62))));
      float posts = smoothstep(R - post - px, R - post + px, ax);
      float fr = max(rail, posts);
      c = mix(c, uFrameCol*(0.02*I + uLight.z*1.5) + uFrameCol*Lc*I*0.04*(1.0 - posts), fr);
    } else if (opening > 0.0){
      // 上の口から見える 奥の紙(内側から照らされて明るい)
      vec3 P = vec3(p.x, p.y - K*R, -R);
      float E = irr(P, vec3(0.0, 0.0, 1.0));
      c = uCoverCol*Lc*uLight.x*E*0.9;
      float rim = max(smoothstep(0.35, 0.2, abs(p.y - (y1 + K*R) + 0.18)), smoothstep(R - post - px, R - post + px, ax));
      c = mix(c, uFrameCol*(0.03*I + uLight.z*1.5), rim);
    } else {
      c = uFrameCol*(0.015*I + uLight.z*1.5);
    }
    return mix(col, c, max(max(front, opening), legs));
  }
  if (k < 2.5 || k > 3.5){
    // 雪洞(紙のかさ)と 竹: まわりが丸い
    bool bamboo = k > 3.5;
    float y = p.y, r = R;
    for (int i = 0; i < 3; i++){
      r = bamboo ? R : paperShadeR(clamp(y, y0, y1));
      y = p.y + K*sqrt(max(r*r - ax*ax, 0.0));
    }
    float inSide = clamp(0.5 - (ax - r)/px, 0.0, 1.0)*step(y0, y)*step(y, y1);
    // 上の口(だ円)
    float r1 = bamboo ? R : paperShadeR(y1);
    float le = length(vec2(p.x/r1, (p.y - y1)/(K*r1)));
    float inTop = clamp(0.5 - (le - 1.0)*r1*K/px, 0.0, 1.0)*(1.0 - gRefl);
    if (inSide + inTop <= 0.0) return col;
    vec3 c;
    if (inSide > 0.0 && !(inTop > 0.0 && p.y > y1 - K*sqrt(max(r1*r1 - ax*ax, 0.0)))){
      float nx = clamp(p.x/r, -1.0, 1.0), nz = sqrt(max(1.0 - nx*nx, 0.0));
      vec3 P = vec3(p.x, y, nz*r);
      vec3 n = vec3(nx, 0.0, nz);
      if (bamboo){
        float u = asin(nx)*R;
        float fibb = 0.9 + 0.12*vnoise(vec2(u*9.0, y*0.4)) + 0.05*sin(u*40.0);
        float node = smoothstep(0.25, 0.0, abs(y - mix(y0, y1, 0.36))) + smoothstep(0.25, 0.0, abs(y - mix(y0, y1, 0.8)));
        vec3 refl = Lc*I*0.05*(0.4 + 0.6*nz) + vec3(uLight.z);
        c = uCoverCol*fibb*refl*(1.0 - 0.35*node) + uCoverCol*Lc*I*0.12*pow(1.0 - nz, 2.0);
        float h = bambooHole(u, y, 0.012);
        float inner = uLight.x*0.035*R*R/(R*R + pow(y - uLP.y, 2.0));
        c = mix(c, Lc*inner*vec3(1.0, 0.85, 0.65), h);
      } else {
        float sh = candleShadow(P);
        float E = irr(P, -n);
        c = uCoverCol*Lc*uLight.x*E*0.55*fib*(0.25 + 0.75*sh) + Lc*I*0.5*blob*sh + uCoverCol*uLight.z;
        // 六角の 骨
        float th = asin(nx);
        float e1 = min(abs(th - 0.5236), abs(th + 0.5236));
        float bone = smoothstep(0.05, 0.02, e1*r);
        c = mix(c, uFrameCol*(0.02*I + uLight.z*1.5), bone*0.8);
      }
      float rimB = smoothstep(0.35, 0.15, y - y0) + smoothstep(0.35, 0.15, y1 - y);
      if (!bamboo) c = mix(c, uFrameCol*(0.03*I + uLight.z*1.5), clamp(rimB, 0.0, 1.0));
    } else {
      // 口の中: 奥の内側が 光っている。竹は 切り口の輪
      float ringW = bamboo ? 0.45 : 0.25;
      float ring = smoothstep(1.0 - ringW/r1 - 0.02, 1.0 - ringW/r1, le);
      float inner = uLight.x*0.03*(bamboo ? 1.4 : 1.0);
      c = (bamboo ? vec3(0.55, 0.42, 0.25) : uCoverCol)*Lc*inner;
      c = mix(c, (bamboo ? vec3(0.62, 0.5, 0.32)*Lc*I*0.35 : uFrameCol*(0.03*I + uLight.z*1.5)), ring);
    }
    return mix(col, c, max(inSide, inTop));
  }
  // ほや(ガラス): すけて見える。ふちが光り、たての照りが入る
  float y = p.y, r = R;
  for (int i = 0; i < 3; i++){
    r = glassR(clamp(y, y0, y1));
    y = p.y + K*sqrt(max(r*r - ax*ax, 0.0));
  }
  float inG = clamp(0.5 - (ax - r)/px, 0.0, 1.0)*step(y0, y)*step(y, y1);
  float r1 = glassR(y1), r0 = glassR(y0);
  float lt = length(vec2(p.x/r1, (p.y - y1)/(K*r1)));
  float lb = length(vec2(p.x/r0, (p.y - y0)/(K*r0)));
  float rimT = smoothstep(0.06, 0.0, abs(lt - 1.0)*r1*K)*(1.0 - gRefl);
  float rimBt = smoothstep(0.06, 0.0, abs(lb - 1.0)*r0*K)*step(y0 - K*r0*0.2, p.y);
  if (inG <= 0.0 && rimT <= 0.0) return col;
  float nx = clamp(p.x/r, -1.0, 1.0), nz = sqrt(max(1.0 - nx*nx, 0.0));
  float near = exp(-abs(y - uLP.y)/5.0);
  vec3 c = col*mix(vec3(1.0), uCoverCol, 0.55*inG)*(1.0 - 0.05*inG);
  c += Lc*I*inG*(0.22*pow(1.0 - nz, 3.0)*near + 0.07*(exp(-pow((nx - 0.55)/0.07, 2.0)) + 0.6*exp(-pow((nx + 0.62)/0.05, 2.0)))*near);
  c += Lc*I*0.35*(rimT + rimBt*inG);
  return c;
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
      // 漆の面は 鏡ほど平らではない → 3か所を少しずらして見て 平均し、ぼかす(遠いほど強く ぼける)
      float dist = yb - p.y;
      float rough = (vnoise(vec2(p.x*0.8, p.y*0.5)) - 0.5)*0.04*dist;
      vec2 pm = vec2(p.x + rough, 2.0*yb - p.y);
      float spread = 0.06 + dist*0.09;
      float cv, cv1, cv2, cv3;
      gRefl = 1.0; gNoFlame = 1.0;
      vec3 rc = objects(pm + vec2(-spread, 0.3*spread), cv1)
              + objects(pm + vec2(0.0, -0.4*spread), cv2)
              + objects(pm + vec2(spread, 0.3*spread), cv3);
      gNoFlame = 0.0;
      // 炎は1か所だけ うすく(ずらして重ねると 炎が いくつにも見えるため)。ゆらぎで にじませる
      vec2 pf = pm + vec2((vnoise(vec2(p.y*1.5, uTime*0.5)) - 0.5)*0.08*dist, 0.0);
      vec3 rf = flameEmit(pf)*(1.0 - (cv1 + cv2 + cv3)/3.0);
      rc = rc/3.0 + rf*0.22 + halo(pm)*0.35;
      if (uCover.x > 0.5) rc = coverLayer(pm, rc);
      gRefl = 0.0;
      cv = (cv1 + cv2 + cv3)/3.0;
      float fall = exp(-dist/9.0);
      col = mix(col, col*0.5, cv*0.4*fall);
      col += rc*0.2*fall;
      // 縦に のびる ぼんやりした光の帯
      float dx = (p.x - uLP.x)/(uFlame.y*1.3 + 0.2);
      float dyv = (p.y + uLP.y)/(uFlame.x*2.6 + 2.0);
      col += lightCol()*uLight.x*uFlameP.x*0.0009*exp(-dx*dx - dyv*dyv);
    }
  }

  float cv;
  vec3 ob = objects(p, cv);
  col = mix(col, vec3(0.0), cv) + ob;
  col += halo(p)*((uCover.x > 0.5 && uCover.x < 2.5) || uCover.x > 3.5 ? 0.35 : 1.0);
  col = coverLayer(p, col);

  // 煙
  float sm = smoke(p);
  col = mix(col, vec3(0.62, 0.58, 0.54)*(0.035 + uLight.z*6.0 + uFlameP.z*0.03), clamp(sm*0.75, 0.0, 1.0));

  vec2 vq = (fc - 0.5*uRes)/uRes.y;
  col *= 1.0 - 0.55*smoothstep(0.25, 0.85, length(vq*vec2(1.0, 0.8)));
  col *= uLight.y;
  col = aces(col);
  col = pow(col, vec3(1.0/2.2));
  // ざらつき(暗いところの色の段々を消す)
  vec2 gp = fc + floor(uTime*12.0)*vec2(5.588, 5.0);
  float gr = fract(52.9829189*fract(dot(gp, vec2(0.06711056, 0.00583715)))) - 0.5;
  float lumG = dot(col, vec3(0.3, 0.5, 0.2));
  col += gr*(2.2/255.0)*smoothstep(0.01, 0.06, lumG);
  col *= 1.0 - uBlack;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
