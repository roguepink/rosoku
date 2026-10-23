// 動画で見せる ろうそく(2026-10-23 から。前の「計算で描く絵」= scene.js の代わり)。
// 重なり(下から): 火が消えた静止画 → 炎の動画(くり返し) → 煙(計算で描く) → 黒い幕
// app.js から見た使い方は、前の Scene と同じにしてある(set / light / extinguish / fade / shrink など)。
import { CANDLES, SIZES, BRIGHT, WARMTH } from './candles.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function h1(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => h1(a * 57.0 + b * 131.0);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}

export class Scene {
  constructor(root) {
    this.root = root;
    root.innerHTML = '';
    this.stage = el('div', 'stage', root);
    this.unlit = el('img', 'layer unlit', this.stage); this.unlit.alt = '';
    this.video = el('video', 'layer lit', this.stage);
    Object.assign(this.video, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
    this.video.setAttribute('muted', ''); this.video.setAttribute('playsinline', '');
    this.smoke = el('canvas', 'layer smoke', this.stage);
    this.black = el('div', 'black', root);
    this.sx = this.smoke.getContext('2d');

    this.opt = { candle: 0, size: 1, bright: 2, warm: 1 };
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

  resize() {
    this.layout();                         // 先に 絵の置き場所と大きさを決めてから、煙の紙の大きさを合わせる
    const dpr = Math.min(devicePixelRatio || 1, 2);
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
    this.unlit.src = `media/u/${c.id}.jpg`;
    this.video.poster = `media/s/${c.id}.jpg`;
    this.video.src = `media/v/${c.id}.mp4`;
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
    this.video.style.opacity = lit.toFixed(3);
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
