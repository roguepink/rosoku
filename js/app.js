// 一灯 — 画面の動き(灯す・操作を出す/かくす・おやすみ・音楽・覚えておく)
import { Scene } from './vscene.js';   // 2026-10-23 から動画で見せる(前の scene.js は計算で描く版)
import { Music } from './music.js';
import { CANDLES, SIZES, SWAYS, WARMTH } from './candles.js';

const $ = (id) => document.getElementById(id);
const KEY = 'itto-v2';   // 動画版で 明るさの段階が変わったので、覚えた設定を新しくする
const SLEEPS = [
  { min: 0, name: 'なし' }, { min: 5, name: '5分' }, { min: 10, name: '10分' }, { min: 15, name: '15分' }, { min: 30, name: '30分' },
  { min: 40, name: 'お線香一本（40分）' }, { min: 60, name: '60分' }, { min: 90, name: '90分' },
];
const TOUCH_TO_LIGHT = 'ふれると、灯がともります';

// ---------- 覚えておく ----------
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const st = Object.assign(
  { candle: 0, size: 1, sway: reduce ? 0 : 1, bright: 2, warm: 1, vol: 40, order: 'random', musicOn: false, track: 0, hints: 0 },
  load()
);
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

// ---------- 場面 ----------
let scene;
scene = new Scene($('scene'));
if (st.candle >= CANDLES.length) st.candle = 0;
scene.set({ candle: st.candle, size: st.size, sway: st.sway, bright: st.bright, warm: st.warm });
scene.fadeIn = 3.0;
scene.fadeTarget = 0;
scene.start();

const music = new Music();
music.volume = st.vol / 100;
music.order = st.order;

// phase: 'dark' はじめ(まだ灯っていない) / 'lit' 灯っている / 'out' 自分で消した / 'slept' おやすみで消えた
let phase = 'dark';

// ---------- はじめ ----------
setTimeout(() => $('title').classList.add('on'), 200);
setTimeout(() => { if (phase === 'dark') showHint(TOUCH_TO_LIGHT); }, 900);
// 描く仕組みが こわれて もどらないときは、黙って真っ黒にせず ことわりを出す
let lostT = 0;
scene.onLost = () => { clearTimeout(lostT); lostT = setTimeout(() => showHint('表示が重すぎたようです。ほかのアプリを閉じて、もう一度開いてください。'), 4000); };
scene.onRestored = () => { clearTimeout(lostT); hideHint(); };

function showHint(text) { const h = $('hint'); h.textContent = text; h.classList.add('on'); }
function hideHint() { $('hint').classList.remove('on'); }
let toastT = 0;
function toast(text, ms = 2000) {
  const t = $('toast'); t.textContent = text; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}

let outT = 0, relightT = 0;
function lightUp() {
  phase = 'lit';
  clearTimeout(outT); clearTimeout(relightT);
  $('title').classList.remove('on');
  hideHint();
  $('relight').hidden = true;
  scene.fadeIn = 2.5; scene.fadeTarget = 0;
  scene.shrink = 1; scene.burn = 1;
  if (!scene.running) scene.start();
  scene.light();
  wake(true);
  if (st.musicOn && music.tracks.length) music.play();
  if (st.hints < 3) {
    st.hints++; save();
    const what = music.tracks.length ? 'ろうそくや音楽' : 'ろうそくや明るさ';
    setTimeout(() => { if (phase === 'lit' && !uiOn) showHint(`画面にふれると、${what}をえらべます`); }, 5000);
    setTimeout(hideHint, 10000);
  }
}

function putOut(byTimer) {
  phase = byTimer ? 'slept' : 'out';
  scene.extinguish();
  hideUI(true);
  clearSleep();
  if (byTimer) {
    // 煙が消えるのを待ってから、ゆっくり真っ暗にして、描くのをやめる
    outT = setTimeout(() => {
      if (phase !== 'slept') return;
      scene.fadeOut = 15; scene.fadeTarget = 1;
      outT = setTimeout(() => { if (phase === 'slept') { scene.stop(); wake(false); } }, 15500);
    }, 7000);
  } else {
    music.stop(3);
    outT = setTimeout(() => {
      if (phase !== 'out') return;
      showHint(TOUCH_TO_LIGHT);
      // 1分たったら、画面のつけっぱなしをやめ、描くのも止める(電池のため)
      outT = setTimeout(() => { if (phase === 'out') { scene.stop(); wake(false); } }, 54000);
    }, 6000);
  }
}

// ---------- 操作の部品を出す・かくす ----------
const ui = $('ui');
let uiOn = false, uiAt = 0, hideT = 0, fadeT = 0, sheet = null;
ui.inert = true;
function showUI() {
  if (phase !== 'lit') return;
  uiOn = true; uiAt = performance.now();
  clearTimeout(fadeT);
  ui.inert = false;
  ui.classList.remove('fading');
  ui.classList.add('on'); ui.setAttribute('aria-hidden', 'false');
  document.body.classList.remove('nocursor');
  hideHint();
  refreshLabels();
  bump();
}
function hideUI(now) {
  uiOn = false;
  clearTimeout(hideT); clearTimeout(fadeT);
  ui.classList.remove('on'); ui.setAttribute('aria-hidden', 'true');
  // 消えかけ(1.2秒)の間は、押せば また出てくる
  if (!now) ui.classList.add('fading');
  fadeT = setTimeout(() => {
    ui.classList.remove('fading');
    if (uiOn) return;
    ui.inert = true;
    document.body.classList.add('nocursor');
    openSheet(null);
  }, now ? 0 : 1200);
}
function bump() {
  clearTimeout(hideT);
  hideT = setTimeout(() => hideUI(), sheet ? 15000 : 6000);
}
function openSheet(id) {
  sheet = sheet === id ? null : id;
  for (const s of ['pick', 'music', 'sleep', 'adjust']) $(s).hidden = s !== sheet;
  document.querySelectorAll('#bar [data-open]').forEach((b) => b.classList.toggle('cur', b.dataset.open === sheet));
  const land = innerWidth > innerHeight && innerHeight <= 560;
  scene.shiftTo = !sheet ? [0, 0] : land ? [-0.2, 0] : [0, 0.14];
  if (sheet === 'pick') {
    const cur = $('thumbs').children[st.candle];
    if (cur) cur.scrollIntoView({ block: 'center' });
  }
  if (uiOn) bump();
}

document.querySelectorAll('#bar [data-open]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.open)));
// 部品にふれたら(消えかけでも)、出しなおして 消えるまでの時間を延ばす
ui.addEventListener('pointerdown', () => { if (!uiOn) showUI(); else bump(); }, true);
ui.addEventListener('input', () => { if (uiOn) bump(); });

// 画面(炎)にふれたとき
let down = null;
addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;                       // 右クリックは使わない
  if (e.target.closest('.bar, .sheet, .relight')) return;
  down = { x: e.clientX, y: e.clientY, wasOn: uiOn };
});
addEventListener('pointercancel', () => { down = null; });
addEventListener('pointerup', (e) => {
  if (!down) return;
  const d = down; down = null;
  // 2026-10-24: iPhone の Safari は、ボタン以外の所をタップしても click を出さないことがある(「開かない」と言われた原因)。
  // 灯す・もう一度ともす は、指を離したとき(pointerup)に行う。pointerup は iPhone でも「ふれた」扱いなので 音も出せる
  if (phase !== 'lit') {
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) <= 20) { tappedAt = performance.now(); tapIdle(); }
    return;
  }
  if (st.musicOn && music.tracks.length && (music.audio.paused || !music.playing) && !sleepEnd) { if (music.ctx) music.ctx.resume(); if (!music.playing) music.play(3); }
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  // 操作が出ているときだけ、左右にはらうと ろうそくが変わる
  if (d.wasOn && Math.abs(dx) > 80 && Math.abs(dy) < Math.abs(dx) * 0.5) {
    changeCandle((st.candle + (dx < 0 ? 1 : -1) + CANDLES.length) % CANDLES.length);
    bump();
    return;
  }
  if (Math.hypot(dx, dy) > 20) return;
  if (!uiOn) showUI();
  else if (performance.now() - uiAt > 300) hideUI();
});
let tappedAt = -1e9;
function tapIdle() {
  if (phase === 'dark' || phase === 'out') lightUp();
  else if (phase === 'slept') {
    $('relight').hidden = false;
    clearTimeout(relightT);
    relightT = setTimeout(() => { $('relight').hidden = true; }, 10000);   // 暗い寝室で 光りつづけないように
  }
}
// パソコン(マウス)・キーボード用。指で灯した直後の click は 二重にしない
addEventListener('click', (e) => {
  if (e.button > 0 || e.target.closest('.bar, .sheet, .relight')) return;
  if (performance.now() - tappedAt < 800) return;
  if (phase !== 'lit') tapIdle();
});
$('relight').addEventListener('click', () => { scene.fadeOut = 1.2; lightUp(); });
// パソコン: マウスを動かすと操作が出る
let lastMove = null;
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || phase !== 'lit') return;
  if (lastMove && Math.hypot(e.clientX - lastMove[0], e.clientY - lastMove[1]) > 8) { if (!uiOn) showUI(); else bump(); }
  lastMove = [e.clientX, e.clientY];
});
addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('#ui') && !uiOn) showUI(); });

// ---------- ろうそく ----------
const thumbs = $('thumbs');
CANDLES.forEach((c, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<img src="icons/thumb-${c.id}.jpg" alt="" loading="lazy"><span>${c.short}</span>`;
  b.setAttribute('aria-label', c.name);
  // 選んだら 板を閉じて、操作もゆっくり消す → ろうそくが 画面いっぱいに やさしく出てくる(one candle と同じ)
  b.addEventListener('click', () => { changeCandle(i); openSheet(null); hideUI(); });
  thumbs.appendChild(b);
});
let switching = 0;
function changeCandle(i) {
  if (i === st.candle) return;
  st.candle = i; save(); refreshChoices();
  toast(CANDLES[i].name, 2400);
  clearTimeout(switching);
  scene.fadeOut = 1.0; scene.fadeTarget = 1;
  switching = setTimeout(() => {
    scene.set({ candle: i });
    scene.fadeIn = 2.0; scene.fadeTarget = 0;
  }, 1300);
}

// ---------- ととのえる ----------
function choices(el, items, get, set) {
  el.innerHTML = '';
  items.forEach((it, i) => {
    const b = document.createElement('button');
    if (it.html) b.innerHTML = it.html; else b.textContent = it.name;
    b.setAttribute('aria-label', it.label || it.name);
    b.addEventListener('click', () => { set(i); refreshChoices(); save(); });
    el.appendChild(b);
  });
  el._get = get;
}
choices($('swayChoices'), SWAYS, () => st.sway, (i) => { st.sway = i; scene.set({ sway: i }); });
choices($('sizeChoices'), SIZES, () => st.size, (i) => { st.size = i; scene.set({ size: i }); });
choices($('brightChoices'), [7, 9, 11, 13, 15].map((px, i) => ({ html: `<i style="width:${px}px;height:${px}px;opacity:${0.45 + i * 0.13}"></i>`, label: `明るさ ${i + 1}` })),
  () => st.bright, (i) => { st.bright = i; scene.set({ bright: i }); });
choices($('warmChoices'), WARMTH, () => st.warm, (i) => { st.warm = i; scene.set({ warm: i }); });
const ORDERS = ['order', 'random', 'one'];
choices($('orderChoices'), [{ name: '順番に' }, { name: 'ばらばら' }, { name: '1曲くり返し' }], () => Math.max(0, ORDERS.indexOf(st.order)), (i) => { st.order = ORDERS[i]; music.order = st.order; });
choices($('sleepChoices'), SLEEPS, () => sleepIdx, (i) => setSleep(i));

function refreshChoices() {
  document.querySelectorAll('.choices').forEach((el) => {
    if (!el._get) return;
    const v = el._get();
    [...el.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === v)));
  });
  [...thumbs.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === st.candle)));
}

$('out').addEventListener('click', () => { if (phase === 'lit') putOut(false); });

// ---------- おやすみ ----------
// 時間は Date.now() で見る。画面が消えて描くのが止まっても、1秒ごとの見張りで 終わりを必ず通る。
let sleepIdx = 0, sleepStart = 0, sleepEnd = 0, musicFaded = false, burnFrom = 1, sleepWatch = 0;
function setSleep(i) {
  sleepIdx = i;
  musicFaded = false;
  burnFrom = scene.burn;           // 途中で変えても、ろうそくの長さは 今のところから
  if (SLEEPS[i].min === 0) { clearSleep(); scene.shrink = 1; }
  else {
    sleepStart = Date.now(); sleepEnd = sleepStart + SLEEPS[i].min * 60000;
    toast('おやすみ ' + SLEEPS[i].name.replace(/.*（(.*)）/, '$1'), 2200);
    clearInterval(sleepWatch); sleepWatch = setInterval(sleepTick, 1000);
  }
  refreshLabels();
}
function clearSleep() {
  sleepEnd = 0; sleepIdx = 0;
  clearInterval(sleepWatch);
  refreshChoices(); refreshLabels();
}
let sleepStopping = false;   // おやすみで止めたときは「音楽をかけていた」ことを覚えたままにする
function sleepTick() {
  if (!sleepEnd || phase !== 'lit') return;
  const now = Date.now(), left = (sleepEnd - now) / 1000;
  scene.burn = Math.max(0.45, burnFrom - 0.55 * (now - sleepStart) / 60000 / 90);   // 90分で いちばん短くなる速さ
  if (left <= 60 && !musicFaded) { musicFaded = true; sleepStopping = true; music.fadeOut(Math.max(5, left)); sleepStopping = false; }
  scene.shrink = Math.max(0, Math.min(1, left / 30));
  // 消える前に 2〜3回 ふっと ゆらぐ(間隔は少しずつ ちがう)
  if (left < 7) scene.shrink *= 1 - 0.55 * Math.max(0, Math.sin(left * 2.6 + 0.8 * Math.sin(left * 0.9))) ** 6;
  if (left <= 0) putOut(true);
}
scene.onFrame = sleepTick;

let labelT = 0;
function refreshLabels() {
  const l = $('sleepLab');
  if (sleepEnd && phase === 'lit') {
    const m = Math.max(1, Math.ceil((sleepEnd - Date.now()) / 60000));
    l.textContent = `あと${m}分`; l.classList.add('timing');
  } else { l.textContent = 'おやすみ'; l.classList.remove('timing'); }
  $('musicBtn').classList.toggle('playing', music.playing);
  $('mplay').textContent = music.playing ? '止める' : '流す';
  [...$('tracks').querySelectorAll('button')].forEach((b, i) => {
    const on = music.playing && i === music.idx;
    b.setAttribute('aria-current', String(on));
    b.querySelector('.mark').textContent = on ? '・' : '';
  });
  clearTimeout(labelT);
  if (uiOn) labelT = setTimeout(refreshLabels, 15000);
}

// ---------- 音楽 ----------
music.onchange = () => {
  if (!sleepStopping) st.musicOn = music.playing;
  st.track = music.idx; save();
  refreshLabels();
};
music.load().then((n) => {
  if (!n) return;
  music.idx = Math.min(st.track, n - 1);
  $('musicBtn').hidden = false;
  const ol = $('tracks');
  music.tracks.forEach((t, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.innerHTML = '<span class="mark"></span><span></span>';
    b.lastChild.textContent = t.title || t.file;
    b.addEventListener('click', () => music.pick(i));
    li.appendChild(b); ol.appendChild(li);
  });
  refreshLabels();
});
$('mplay').addEventListener('click', () => music.toggle());
$('vol').value = st.vol;
$('vol').addEventListener('input', (e) => { st.vol = +e.target.value; music.setVolume(st.vol / 100); save(); });

// ---------- 画面を消さない ----------
let lock = null;
async function wake(on) {
  try {
    if (on && 'wakeLock' in navigator) {
      if (!lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
    } else if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) { if (on) $('wakeNote').hidden = false; }
}
if (!('wakeLock' in navigator)) $('wakeNote').hidden = false;
// アプリを閉じたら(ほかのアプリへ・画面を消す)、音楽も すぐ止める。もどったら また流す
let resumeMusic = false;
function closeSound() { if (music.pauseNow()) resumeMusic = true; refreshLabels(); }
addEventListener('pagehide', closeSound);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { scene.stop(); closeSound(); return; }
  if (resumeMusic && phase === 'lit') { resumeMusic = false; if (music.ctx) music.ctx.resume(); music.play(3); }
  if (phase === 'slept') {
    // 暗くなる途中で離れていたら、真っ暗にしておく
    scene.fade = scene.fadeTarget = 1; scene.draw();
    return;
  }
  scene.start();
  if (phase === 'lit') wake(true);
});

// ---------- 全画面・ホーム画面・LINE ----------
const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const inLine = /Line\//i.test(ua);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (document.documentElement.requestFullscreen && !isIOS) {
  const fs = $('fs');
  fs.hidden = false;
  fs.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => { fs.textContent = document.fullscreenElement ? '元にもどす' : '画面いっぱいにする'; });
}
if (inLine) $('lineNote').hidden = false;
if (!standalone && !inLine && matchMedia('(pointer: coarse)').matches) {
  $('installNote').textContent = isIOS
    ? 'Safariの共有ボタンから「ホーム画面に追加」をすると、アプリのように開けます。'
    : 'ブラウザのメニューから「ホーム画面に追加」をすると、アプリのように開けます。';
}
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); installEvt = e;
  const n = $('installNote');
  n.innerHTML = '<button class="link" id="install">ホーム画面に入れる</button>';
  $('install').addEventListener('click', () => { installEvt.prompt(); installEvt = null; n.textContent = ''; });
});

// ---------- キー(パソコン) ----------
addEventListener('keydown', (e) => {
  const inControl = e.target.closest && e.target.closest('input, button');
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    if (inControl || phase !== 'lit') return;
    changeCandle((st.candle + (e.key === 'ArrowRight' ? 1 : -1) + CANDLES.length) % CANDLES.length);
  } else if (e.key === ' ') {
    if (inControl) return;
    e.preventDefault();
    if (phase === 'lit') { if (music.tracks.length) music.toggle(); } else if (phase !== 'slept') lightUp();
  } else if (e.key === 'Escape') hideUI();
  else if (e.key === 'Enter' && !inControl && (phase === 'dark' || phase === 'out')) lightUp();
});

refreshChoices();
refreshLabels();

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

// テスト用(自動で確かめるとき)
window.__itto = {
  scene, music, st, lightUp, putOut, showUI, openSheet, setSleep, changeCandle, get phase() { return phase; },
  sleepSecs(s) {
    sleepIdx = 1; musicFaded = false; burnFrom = scene.burn; sleepStart = Date.now(); sleepEnd = sleepStart + s * 1000;
    clearInterval(sleepWatch); sleepWatch = setInterval(sleepTick, 1000);
  },
};
