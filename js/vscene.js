// 動画で見せる ろうそく(2026-10-23 から。前の「計算で描く絵」= scene.js の代わり)。
// 重なり(下から): 火が消えた静止画 → 炎の動画(くり返し) → 煙(計算で描く) → 黒い幕
// 2026-10-23: AI の動画は炎の動きが小さいので、動画を WebGL で描きなおしながら 炎の所だけ ゆらす・のび縮みさせる・明かりをちらつかせる。
//   (WebGL が使えない端末では、動画をそのまま見せる)
// app.js から見た使い方は、前の Scene と同じにしてある(set / light / extinguish / fade / shrink など)。
import { CANDLES, SIZES, SWAYS, BRIGHT, WARMTH, MEDIA_V } from './candles.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function h1(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => h1(a * 57.0 + b * 131.0);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}

function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (h1(i) * 2 - 1) * (1 - u) + (h1(i + 1) * 2 - 1) * u; }
const rnd = (a, b) => a + Math.random() * (b - a);

// 炎の動き(ゆっくりの揺れ + ときどきの風 + ちらつき + 和ろうそくの息)。前の「計算で描く版」と同じ考え方
class FlameSim {
  constructor() { this.t = Math.random() * 1000; this.lean = 0; this.v = 0; this.hist = []; this.gusts = []; this.nextGust = 0; this.hMul = 1; this.wob = 0.05; this.turb = 0; this.ph = Math.random() * 6; }
  step(dt, sway, breath) {
    const t = (this.t += dt);
    if (t >= this.nextGust) {
      if (this.nextGust > 0) this.gusts.push({ t0: t, dur: rnd(1.0, 3.0), a: sway.gust * rnd(0.5, 1.0) * (Math.random() < 0.5 ? -1 : 1) });
      this.nextGust = t + rnd(sway.gustEvery[0], sway.gustEvery[1]);
    }
    let g = 0, turb = 0;
    this.gusts = this.gusts.filter((q) => t - q.t0 < q.dur * 4);
    for (const q of this.gusts) {
      const tau = t - q.t0, env = (1 - Math.exp(-tau / 0.12)) * Math.exp(-tau / q.dur);
      g += q.a * env * (1 + 0.5 * noise1(t * 2.3 + q.t0)); turb += Math.abs(q.a) * env * 2;
    }
    const n = 0.5 * noise1(t * 0.071) + 0.28 * noise1(t * 0.213 + 10) + 0.14 * noise1(t * 0.67 + 20) + 0.08 * noise1(t * 1.9 + 30);
    const target = sway.lean * n * 1.6 + g;
    const w = 2 * Math.PI * 1.1, z = 0.85;
    this.v += (w * w * (target - this.lean) - 2 * z * w * this.v) * dt;
    this.lean = Math.max(-0.45, Math.min(0.45, this.lean + this.v * dt));
    this.hist.push([t, this.lean]);
    while (this.hist.length > 2 && this.hist[1][0] < t - 0.08) this.hist.shift();
    const tip = this.hist[0][1] * 1.3;
    turb = Math.min(1, turb + sway.flick * 0.15 * (0.5 + 0.5 * noise1(t * 0.4 + 50)));
    this.turb += (turb - this.turb) * Math.min(1, dt * 4);
    const fast = this.turb * sway.flick * 0.08 * (noise1(t * 11.3) * 0.6 + noise1(t * 13.7 + 5) * 0.4);
    const slow = sway.height * (0.6 * noise1(t * 0.17 + 70) + 0.4 * noise1(t * 0.53 + 80));
    this.ph += dt * 2 * Math.PI * breath.freq * (1 + 0.35 * noise1(t * 0.05 + 40));
    const br = breath.amp * (0.75 * Math.sin(this.ph) + 0.25 * noise1(t * 0.3 + 90));
    this.hMul = Math.max(0.6, 1 + slow + br + fast - 0.5 * Math.abs(this.lean));
    this.wob = 0.015 + this.turb * 0.5 + sway.lean * 0.4;
    return { lean0: this.lean, lean1: tip };
  }
}

const VS = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }';
const FS = `precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec4 uFlame;   // 炎の中心x, 上, 根元, 幅(絵の割合。y は上から)
uniform vec4 uMove;    // 根元の傾き, 先の傾き, のび縮み, ゆらめき
uniform float uTime, uGain, uOn;
float hash(vec2 q){ q = fract(q * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }
float vnoise(vec2 q){ vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec2 s = vUv;
  if (uOn > 0.5) {
    float h = max(uFlame.z - uFlame.y, 0.005);
    float t = (uFlame.z - vUv.y) / h;                         // 0 = 根元, 1 = 先
    float ax = abs(vUv.x - uFlame.x) / max(uFlame.w, 0.004);  // 炎の幅 いくつぶん 横か
    float k = (1.0 - smoothstep(0.9, 2.2, ax)) * smoothstep(-0.02, 0.3, t) * (1.0 - smoothstep(1.25, 1.8, t));
    float tt = max(t, 0.0);
    float off = (uMove.x * tt + (uMove.y - uMove.x) * tt * tt) * h * 1.7778;
    float wob = uMove.w * tt * tt * ((vnoise(vec2(tt * 3.0 - uTime * 4.3, 2.0)) - 0.5) * 1.4 + (vnoise(vec2(tt * 6.0 - uTime * 9.7, 5.0)) - 0.5) * 0.7) * uFlame.w;
    float sy = uFlame.z - (uFlame.z - vUv.y) / uMove.z;        // のびると 先が上へ
    s = vec2(vUv.x - (off + wob) * k, mix(vUv.y, sy, k));
  }
  vec3 c = texture2D(uTex, s).rgb;
  gl_FragColor = vec4(c * uGain, 1.0);
}`;

export class Scene {
  constructor(root) {
    this.root = root;
    root.innerHTML = '';
    this.stage = el('div', 'stage', root);
    this.unlit = el('img', 'layer unlit', this.stage); this.unlit.alt = '';
    this.video = el('video', 'layer lit', this.stage);
    Object.assign(this.video, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
    this.video.setAttribute('muted', ''); this.video.setAttribute('playsinline', '');
    this.gc = el('canvas', 'layer lit', this.stage);
    this.video.className = 'layer src';
    // 2026-10-24 ノブさん: Flow の動画は炎が自然に動くので、WebGL で炎をゆらす・部屋の明るさをゆらすのは やめた
    // (炎のまわりの壁まで ゆがんでいた)。動画を そのまま見せる。もどすときは 下の2行を前の形(initGL)に。
    this.gl = null;
    this.gc.remove(); this.video.className = 'layer lit';
    this.sim = new FlameSim();
    this.smoke = el('canvas', 'layer smoke', this.stage);
    this.black = el('div', 'black', root);
    this.sx = this.smoke.getContext('2d');

    this.opt = { candle: 0, size: 1, sway: 1, bright: 2, warm: 1 };
    this.cur = { bright: BRIGHT[2], warm: 0.5 };
    this.lit = 0; this.litTarget = 0;
    this.fade = 1; this.fadeTarget = 1; this.fadeIn = 2.0; this.fadeOut = 1.2;
    this.shrink = 1; this.burn = 1;
    this.shift = [0, 0]; this.shiftTo = [0, 0];
    this.smokeAge = -1; this.ember = 0;
    this.running = false; this.onFrame = null; this.time = 0;
    this.loaded = -1;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  initGL() {
    const gl = this.gc.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const pr = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
      const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(pr, sh);
    }
    gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    this.u = {}; for (const n of ['uTex', 'uFlame', 'uMove', 'uTime', 'uGain', 'uOn']) this.u[n] = gl.getUniformLocation(pr, n);
    this.gl = gl;
    this.gc.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.glLost = true; });
    this.gc.addEventListener('webglcontextrestored', () => { this.glLost = false; this.initGL(); });
  }

  resize() {
    this.layout();                         // 先に 絵の置き場所と大きさを決めてから、煙の紙の大きさを合わせる
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.gl) { this.gc.width = Math.round(Math.min(this.box.w * Math.min(dpr, 1.5), 1080)); this.gc.height = Math.round(this.gc.width * 16 / 9); }
    this.smoke.width = Math.max(2, Math.round(this.box.w * dpr * 0.6));
    this.smoke.height = Math.max(2, Math.round(this.box.h * dpr * 0.6));
  }

  // 絵(9:16)を画面のどこに どの大きさで置くか。たて画面は 横を少し切ってでも いっぱいに、横画面は全体を見せる
  layout() {
    const W = innerWidth, H = innerHeight;
    const ar = 9 / 16;
    let w, h;
    if (W / H < ar * 1.25) { h = H; w = H * ar; if (w < W) { w = W; h = W / ar; } }
    else { h = H; w = H * ar; }
    this.box = { w, h, x: (W - w) / 2, y: (H - h) / 2 };
    for (const s of [this.stage]) Object.assign(s.style, { width: w + 'px', height: h + 'px', left: this.box.x + 'px', top: this.box.y + 'px' });
  }

  set(o) {
    Object.assign(this.opt, o);
    if (this.loaded !== this.opt.candle) this.loadCandle();
  }

  loadCandle() {
    const c = CANDLES[this.opt.candle];
    this.loaded = this.opt.candle;
    const q = `?v=${MEDIA_V}`;   // 作り直したら MEDIA_V を上げる → スマホに覚えた古い絵を使わない
    this.unlit.src = `media/u/${c.id}.jpg${q}`;
    this.video.poster = `media/s/${c.id}.jpg${q}`;
    this.video.src = `media/v/${c.id}.mp4${q}`;
    const p = this.video.play(); if (p && p.catch) p.catch(() => {});
  }

  light() { this.litTarget = 1; this.smokeAge = -1; this.ember = 0; const p = this.video.play(); if (p && p.catch) p.catch(() => {}); }
  extinguish() { this.litTarget = 0; }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    if (this.lit > 0 || this.litTarget > 0) { const p = this.video.play(); if (p && p.catch) p.catch(() => {}); }
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      this.update(dt); this.draw();
      if (this.onFrame) this.onFrame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.video.pause(); }

  update(dt) {
    this.time += dt;
    const cc = CANDLES[this.loaded >= 0 ? this.loaded : 0];
    this.move = this.sim.step(dt, SWAYS[this.opt.sway] || SWAYS[1], cc.breath || { amp: 0.03, freq: 0.18 });
    const prev = this.lit;
    if (this.litTarget > this.lit) this.lit = Math.min(1, this.lit + dt / 2.5);
    else if (this.litTarget < this.lit) this.lit = Math.max(0, this.lit - dt / 1.2);
    if (prev > 0 && this.lit === 0) { this.smokeAge = 0; this.ember = 1; }
    if (this.smokeAge >= 0) { this.smokeAge += dt; if (this.smokeAge > 14) this.smokeAge = -1; }
    if (this.lit === 0) this.ember = Math.max(0, this.ember - dt / 5);
    const k = Math.min(1, dt * 1.6);
    this.cur.bright += (BRIGHT[this.opt.bright] - this.cur.bright) * k;
    this.cur.warm += (WARMTH[this.opt.warm].v - this.cur.warm) * k;
    if (this.fade < this.fadeTarget) this.fade = Math.min(this.fadeTarget, this.fade + dt / this.fadeOut);
    else if (this.fade > this.fadeTarget) this.fade = Math.max(this.fadeTarget, this.fade - dt / this.fadeIn);
    const sk = Math.min(1, dt * 2.5);
    this.shift[0] += (this.shiftTo[0] - this.shift[0]) * sk;
    this.shift[1] += (this.shiftTo[1] - this.shift[1]) * sk;
    // 動画が止まっていたら(画面にもどったとき など)、流しなおす
    if (this.lit > 0 && this.video.paused && this.video.readyState >= 2) { const p = this.video.play(); if (p && p.catch) p.catch(() => {}); }
  }

  draw() {
    const c = CANDLES[this.loaded >= 0 ? this.loaded : 0];
    const lit = this.lit * this.lit * (3 - 2 * this.lit);
    // 炎の動画は、灯るほど見えてくる(火が消えた静止画との 重ね合わせ)。おやすみの終わりは だんだん暗く
    if (this.gl) { this.gc.style.opacity = lit.toFixed(3); this.drawGL(c); }
    else this.video.style.opacity = lit.toFixed(3);
    const dim = 0.55 + 0.45 * this.shrink;
    const w = this.cur.warm;   // 0 白っぽく / .5 ふつう / 1 あたたかく
    const filt = `brightness(${(this.cur.bright * dim).toFixed(3)}) saturate(${(0.85 + 0.35 * w).toFixed(3)}) sepia(${Math.max(0, (w - 0.5) * 0.5).toFixed(3)}) hue-rotate(${((0.5 - w) * 8).toFixed(1)}deg)`;
    this.stage.style.filter = filt;
    // 大きさ: 炎のあたりを中心に ふくらませる
    const s = SIZES[this.opt.size].zoom;
    this.stage.style.transformOrigin = `${(c.tip[0] * 100).toFixed(1)}% ${(c.tip[1] * 100).toFixed(1)}%`;
    this.stage.style.transform = `translate(${(this.shift[0] * innerWidth).toFixed(1)}px, ${(-this.shift[1] * innerHeight).toFixed(1)}px) scale(${s})`;
    const f = this.fade;
    this.black.style.opacity = (f * f * (3 - 2 * f)).toFixed(3);
    this.drawSmoke(c);
  }

  drawGL(c) {
    const gl = this.gl, v = this.video;
    if (this.glLost || v.readyState < 2) return;
    gl.viewport(0, 0, this.gc.width, this.gc.height);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); } catch (e) { return; }
    const m = this.move || { lean0: 0, lean1: 0 }, sim = this.sim;
    const covered = !c.smoke;               // 行灯・雪洞・竹: 炎は見えないので、明かりの ちらつきだけ
    const f = c.flame || [c.tip[0], c.tip[1] - 0.05, c.tip[1], 0.03];
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform4f(this.u.uFlame, f[0], f[1], f[2], f[3]);
    gl.uniform4f(this.u.uMove, m.lean0, m.lean1, sim.hMul, sim.wob);
    gl.uniform1f(this.u.uTime, this.time);
    gl.uniform1f(this.u.uOn, covered ? 0 : 1);
    // 部屋の明るさも 炎といっしょに 少しだけ ゆらぐ(かさの中の灯りは 少し強めに)
    const gain = Math.pow(sim.hMul, covered ? 0.9 : 0.5) * (1 - 0.15 * Math.min(1, Math.abs(m.lean0)));
    gl.uniform1f(this.u.uGain, gain);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // 消したあとの細い煙(前のシェーダーと同じ形の式)。かさの中の灯り(行灯・雪洞・竹)は 煙を出さない
  drawSmoke(c) {
    const g = this.sx, W = this.smoke.width, H = this.smoke.height;
    g.clearRect(0, 0, W, H);
    const age = this.smokeAge;
    const ember = this.ember;
    const tx = c.tip[0] * W, ty = c.tip[1] * H;
    const S = H / 46;                      // 1cm が何ピクセルか(だいたい。絵の高さ ≒ 46cm)
    if (ember > 0 && this.lit === 0 && c.smoke) {
      const r = S * 0.5;
      const grd = g.createRadialGradient(tx, ty, 0, tx, ty, r);
      grd.addColorStop(0, `rgba(255,90,20,${(0.6 * ember).toFixed(3)})`); grd.addColorStop(1, 'rgba(255,60,10,0)');
      g.fillStyle = grd; g.fillRect(tx - r, ty - r, r * 2, r * 2);
    }
    if (age < 0 || !c.smoke) return;
    // 煙は 小さな紙に 1点ずつ「濃さ」を計算して描き、拡大して重ねる(ふちが やわらかくなる)
    const R = 6, GW = 16 * R, GH = 46 * R;   // 1cm = 6点。横16cm・たて46cm ぶん
    if (!this.sm) { this.sm = document.createElement('canvas'); this.sm.width = GW; this.sm.height = GH; this.smx = this.sm.getContext('2d'); this.smd = this.smx.createImageData(GW, GH); }
    const d = this.smd.data;
    const v = 15, head = age * v, tail = Math.max(age - 3, 0) * v * 1.1;
    for (let j = 0; j < GH; j++) {
      const yy = (GH - 1 - j) / R;          // 芯の先からの高さ cm(下が 0)
      const tur = sstep(5, 9, yy);
      const drift = ((vnoise(yy * 0.15 - age * 0.35, 7) - 0.5) * (yy - 4) * 0.6 + Math.sin(yy * 0.55 - age * 1.6) * 0.25 * Math.sqrt(yy)) * tur
        + (vnoise(yy * 0.4, age) - 0.5) * 0.08;
      const wid = 0.03 + yy * 0.008 + tur * yy * 0.03;
      const rowD = sstep(head + 1, head - 2.5, yy) * sstep(tail - 1, tail + 3.5, yy) * Math.exp(-yy / 16) / (1 + yy * 0.12);
      for (let i = 0; i < GW; i++) {
        const k = (j * GW + i) * 4;
        let a = 0;
        if (rowD > 0.002) { const x = (i + 0.5) / R - 8 - drift, q = x / Math.max(wid, 0.09); a = Math.exp(-q * q) * rowD * 0.75; }
        d[k] = 150; d[k + 1] = 140; d[k + 2] = 128; d[k + 3] = Math.min(255, a * 255);
      }
    }
    this.smx.putImageData(this.smd, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.sm, tx - 8 * S, ty - (GH / R - 0.2) * S, 16 * S, (GH / R) * S);
  }
}

function el(tag, cls, parent) { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; }
