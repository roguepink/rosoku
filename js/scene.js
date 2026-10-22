// 炎の動き(ゆれ・息・風)を計算して、シェーダーに渡して描く。
import { VERT, FRAG } from './shader.js';
import { CANDLES, SIZES, SWAYS, BRIGHT, WARMTH, hexToLinear } from './candles.js';

// なめらかな 1次元のノイズ(-1〜1)
function h1(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
function noise(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return h1(i) * (1 - u) + h1(i + 1) * u;
}
const rnd = (a, b) => a + Math.random() * (b - a);

class FlameSim {
  constructor() {
    this.t = Math.random() * 1000;
    this.lean = 0; this.v = 0;
    this.hist = [];           // 先端は根元より少し遅れて動く
    this.gusts = [];
    this.nextGust = 0;
    this.hMul = 1; this.wob = 0.05; this.turb = 0;
  }
  step(dt, sway, breath) {
    const t = (this.t += dt);
    if (t >= this.nextGust) {
      if (this.nextGust > 0) {
        const dur = rnd(1.0, 3.0);
        this.gusts.push({ t0: t, dur, a: sway.gust * rnd(0.5, 1.0) * (Math.random() < 0.5 ? -1 : 1) });
      }
      this.nextGust = t + rnd(sway.gustEvery[0], sway.gustEvery[1]);
    }
    let g = 0, turb = 0;
    this.gusts = this.gusts.filter((q) => t - q.t0 < q.dur * 4);
    for (const q of this.gusts) {
      const tau = t - q.t0;
      const env = (1 - Math.exp(-tau / 0.12)) * Math.exp(-tau / q.dur);
      g += q.a * env * (1 + 0.5 * noise(t * 2.3 + q.t0));
      turb += Math.abs(q.a) * env * 2;
    }
    // ゆっくり〜中くらいの揺れを重ねる(周期が割り切れないように)
    const n = 0.5 * noise(t * 0.071) + 0.28 * noise(t * 0.213 + 10) + 0.14 * noise(t * 0.67 + 20) + 0.08 * noise(t * 1.9 + 30);
    const target = sway.lean * n * 1.6 + g;
    const w = 2 * Math.PI * 0.85, z = 0.38;
    this.v += (w * w * (target - this.lean) - 2 * z * w * this.v) * dt;
    this.lean += this.v * dt;
    this.hist.push([t, this.lean]);
    while (this.hist.length > 2 && this.hist[1][0] < t - 0.08) this.hist.shift();
    const tip = this.hist[0][1] * 1.3;

    turb = Math.min(1, turb + sway.flick * 0.15 * (0.5 + 0.5 * noise(t * 0.4 + 50)));
    this.turb += (turb - this.turb) * Math.min(1, dt * 4);
    const fast = this.turb * sway.flick * 0.08 * (noise(t * 11.3) * 0.6 + noise(t * 13.7 + 5) * 0.4);
    const slow = sway.height * (0.6 * noise(t * 0.17 + 70) + 0.4 * noise(t * 0.53 + 80));
    const br = breath.amp * (0.7 * Math.sin(t * 2 * Math.PI * breath.freq + 0.6 * noise(t * 0.1)) + 0.3 * noise(t * 0.45 + 90));
    this.hMul = Math.max(0.55, 1 + slow + br + fast - 0.5 * Math.abs(this.lean));
    this.wob = 0.04 + this.turb * 0.5 + sway.lean * 0.4;
    return { lean0: this.lean, lean1: tip };
  }
}

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (!gl) throw new Error('webgl');
    this.gl = gl;
    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(prog, s);
    }
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(prog, i); this.u[a.name] = gl.getUniformLocation(prog, a.name); }

    this.sim = new FlameSim();
    this.opt = { candle: 0, size: 1, sway: 1, bright: 2, warm: 1 };
    this.cur = { bright: BRIGHT[2].exp, amb: BRIGHT[2].amb, warm: 0.5 };   // ゆっくり追いかける値
    this.burn = 1;            // 1 = 新しい / 小さいほど燃えて短い
    this.lit = 0; this.litTarget = 0;
    this.ember = 0; this.smokeAge = -1; this.smokeStr = 0;
    this.fade = 1;            // 1 = 真っ黒 (切りかえ・はじめ)
    this.fadeTarget = 1;
    this.fadeIn = 2.0;        // 何秒で 見えてくるか
    this.fadeOut = 1.2;       // 何秒で 暗くなるか
    this.shrink = 1;          // おやすみの終わりに 炎を小さくする(1→0)
    this.quality = 1;
    this.frames = []; this.running = false;
    this.time = 0;
    this.onFrame = null;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    const q = this.quality * (dpr > 1.5 ? 0.62 : 0.85);
    this.canvas.width = Math.max(2, Math.round(w * dpr * q));
    this.canvas.height = Math.max(2, Math.round(h * dpr * q));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  set(o) { Object.assign(this.opt, o); }

  candleDims() {
    const c = CANDLES[this.opt.candle], sz = SIZES[this.opt.size];
    const H = c.body.H * sz.body * this.burn;
    return {
      c, H, Rt: c.body.Rt * sz.body, Rb: c.body.Rb * sz.body,
      fh: c.flame.h * sz.flame, fw: c.flame.w * sz.flame,
      wl: c.wick.len * (0.85 + 0.15 * sz.flame),
    };
  }

  // 画面にどう収めるか(大きさ「中」で決めて、小・大は その中で大きさが変わる)
  framing(W, Hp) {
    const c = CANDLES[this.opt.candle];
    const top = c.holder.H + c.body.H + c.wick.len * 0.55 + c.flame.h;
    const wide = Math.max(c.holder.R || 0, c.body.Rt, c.body.Rb) * 2;
    const portrait = Hp > W;
    let S = (portrait ? 0.42 : 0.56) * Hp / top;
    S = Math.min(S, (portrait ? 0.8 : 0.5) * W / wide, Hp * 0.12 / c.flame.h * 2.2);
    const baseY = portrait ? Hp * 0.24 : Hp * 0.2;
    return { S, ox: W / 2, oy: baseY };
  }

  light() { this.litTarget = 1; this.smokeAge = -1; this.smokeStr = 0; }
  extinguish() {
    if (this.litTarget === 0) return;
    this.litTarget = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.draw();
      this.adapt(dt);
      if (this.onFrame) this.onFrame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  adapt(dt) {
    this.frames.push(dt);
    if (this.frames.length < 90) return;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    this.frames = [];
    if (avg > 1 / 40 && this.quality > 0.55) { this.quality = Math.max(0.55, this.quality - 0.15); this.resize(); }
    else if (avg < 1 / 57 && this.quality < 1) { this.quality = Math.min(1, this.quality + 0.1); this.resize(); }
  }

  update(dt) {
    this.time += dt;
    const sway = SWAYS[this.opt.sway];
    const c = CANDLES[this.opt.candle];
    this.lean = this.sim.step(dt, sway, c.breath);
    // 灯る・消える
    const prevLit = this.lit;
    if (this.litTarget > this.lit) this.lit = Math.min(1, this.lit + dt / 2.6);
    else if (this.litTarget < this.lit) this.lit = Math.max(0, this.lit - dt / 1.3);
    if (prevLit > 0 && this.lit === 0) { this.smokeAge = 0; this.smokeStr = 1; this.ember = 1; }
    if (this.smokeAge >= 0) { this.smokeAge += dt; if (this.smokeAge > 14) { this.smokeAge = -1; this.smokeStr = 0; } }
    if (this.lit === 0) this.ember = Math.max(0, this.ember - dt / 5);
    else this.ember = 0.25 * this.lit;
    // 明るさなどは 指にぴったりではなく、少し遅れて ついてくる
    const b = BRIGHT[this.opt.bright], k = Math.min(1, dt * 1.6);
    this.cur.bright += (b.exp - this.cur.bright) * k;
    this.cur.amb += (b.amb - this.cur.amb) * k;
    this.cur.warm += (WARMTH[this.opt.warm].v - this.cur.warm) * k;
    if (this.fade < this.fadeTarget) this.fade = Math.min(this.fadeTarget, this.fade + dt / this.fadeOut);
    else if (this.fade > this.fadeTarget) this.fade = Math.max(this.fadeTarget, this.fade - dt / this.fadeIn);
  }

  draw() {
    const gl = this.gl, u = this.u;
    const W = this.canvas.width, Hp = this.canvas.height;
    const d = this.candleDims(), c = d.c;
    const fr = this.framing(W, Hp);
    const ease = (x) => x * x * (3 - 2 * x);
    const lit = ease(this.lit);
    const hm = this.sim.hMul * mix(0.35, 1, this.shrink);
    const fh = d.fh * hm, fw = d.fw * (0.92 + 0.08 * hm) * (1 - 0.25 * Math.min(1, Math.abs(this.lean.lean0) * 2));
    const poolY = c.holder.H + d.H - c.depth;
    const fbx = c.wick.curl * 0.7 + this.lean.lean0 * 0.2 * d.wl;
    const fby = poolY + d.wl * 0.55;
    const lh = fh * mix(0.22, 1, lit);
    const lpx = fbx + (this.lean.lean0 * 0.4 + (this.lean.lean1 - this.lean.lean0) * 0.16) * lh;
    const lpy = fby + 0.4 * lh;
    const I = 60 * Math.pow(hm, 1.3) * lit * (1 - 0.25 * Math.min(1, Math.abs(this.lean.lean0)));

    gl.uniform2f(u.uRes, W, Hp);
    gl.uniform1f(u.uTime, this.time);
    gl.uniform1f(u.uS, fr.S);
    gl.uniform2f(u.uOrg, fr.ox, fr.oy);
    gl.uniform1f(u.uType, c.type || 0);
    gl.uniform4f(u.uBody, d.H, d.Rt, d.Rb, c.body.flare);
    gl.uniform3fv(u.uWax, hexToLinear(c.wax));
    gl.uniform4f(u.uWaxP, c.trans, c.pool, c.depth, c.deco);
    gl.uniform4f(u.uWick, d.wl, c.wick.w * SIZES[this.opt.size].flame, c.wick.curl, c.wick.kind);
    gl.uniform4f(u.uFlame, fh, fw, this.lean.lean0, this.lean.lean1);
    gl.uniform4f(u.uFlameP, lit, this.sim.wob, this.ember, c.flame.tint);
    gl.uniform2f(u.uFB, fbx, fby);
    gl.uniform2f(u.uLP, lpx, lpy);
    gl.uniform4f(u.uLight, I, this.cur.bright, this.cur.amb, this.cur.warm);
    gl.uniform4f(u.uHold, c.holder.kind, c.holder.H, c.holder.R, c.holder.gloss);
    gl.uniform3fv(u.uHoldCol, hexToLinear(c.holder.color));
    const tipX = c.wick.curl, tipY = poolY + d.wl * 0.95;
    gl.uniform4f(u.uSmoke, Math.max(0, this.smokeAge), this.smokeStr, tipX, tipY);
    gl.uniform1f(u.uBlack, this.fade * this.fade * (3 - 2 * this.fade));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

function mix(a, b, t) { return a + (b - a) * t; }
