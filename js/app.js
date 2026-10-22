// 一灯 — 画面の動き(灯す・操作を出す/かくす・おやすみ・音楽・覚えておく)
import { Scene } from './scene.js';
import { Music } from './music.js';
import { CANDLES, SIZES, SWAYS, WARMTH } from './candles.js';

const $ = (id) => document.getElementById(id);
const KEY = 'itto-v1';
const SLEEPS = [
  { min: 0, name: 'なし' }, { min: 15, name: '15分' }, { min: 30, name: '30分' },
  { min: 40, name: 'お線香一本(40分)' }, { min: 60, name: '60分' }, { min: 90, name: '90分' },
];

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
try { scene = new Scene($('scene')); } catch (e) {
  document.body.insertAdjacentHTML('beforeend', '<p class="hint on" style="top:40%">この端末では ろうそくを描けませんでした。</p>');
  throw e;
}
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
setTimeout(() => $('title').classList.add('on'), 700);
setTimeout(() => { if (phase === 'dark') showHint('触れると、灯がともります'); }, 2400);

function showHint(text) { const h = $('hint'); h.textContent = text; h.classList.add('on'); }
function hideHint() { $('hint').classList.remove('on'); }
let toastT = 0;
function toast(text, ms = 2000) {
  const t = $('toast'); t.textContent = text; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}

function lightUp() {
  phase = 'lit';
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
    setTimeout(() => { if (phase === 'lit' && !uiOn) showHint('画面にふれると、操作が出ます'); }, 4000);
    setTimeout(hideHint, 9000);
  }
}

function putOut(byTimer) {
  phase = byTimer ? 'slept' : 'out';
  scene.extinguish();
  hideUI(true);
  if (byTimer) {
    // 煙が消えるのを待ってから、ゆっくり真っ暗にして、描くのをやめる
    setTimeout(() => {
      if (phase !== 'slept') return;
      scene.fadeOut = 15; scene.fadeTarget = 1;
      setTimeout(() => { if (phase === 'slept') { scene.stop(); wake(false); } }, 15500);
    }, 7000);
  } else {
    music.stop(3);
    setTimeout(() => { if (phase === 'out') showHint('触れると、灯がともります'); }, 6000);
  }
}

// ---------- 操作の部品を出す・かくす ----------
const ui = $('ui');
let uiOn = false, uiAt = 0, hideT = 0, sheet = null;
function showUI() {
  uiOn = true; uiAt = performance.now();
  ui.classList.add('on'); ui.setAttribute('aria-hidden', 'false');
  hideHint();
  if (st.hints < 3) { st.hints = 3; save(); }
  refreshLabels();
  bump();
}
function hideUI(now) {
  uiOn = false;
  ui.classList.remove('on'); ui.setAttribute('aria-hidden', 'true');
  clearTimeout(hideT);
  setTimeout(() => { if (!uiOn) openSheet(null); }, now ? 0 : 1200);
}
function bump() {
  clearTimeout(hideT);
  hideT = setTimeout(() => { if (!dragging) hideUI(); }, sheet ? 8000 : 4000);
}
function openSheet(id) {
  sheet = sheet === id ? null : id;
  for (const s of ['pick', 'sleep', 'adjust']) $(s).hidden = s !== sheet;
  document.querySelectorAll('#bar [data-open]').forEach((b) => b.classList.toggle('cur', b.dataset.open === sheet));
  const land = innerWidth > innerHeight && innerHeight <= 560;
  scene.shiftTo = !sheet ? [0, 0] : land ? [-0.2, 0] : [0, 0.14];
  if (sheet === 'pick') {
    const cur = $('thumbs').children[st.candle];
    if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  if (uiOn) bump();
}

document.querySelectorAll('#bar [data-open]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.open)));
ui.addEventListener('pointerdown', () => { if (uiOn) bump(); });
ui.addEventListener('input', () => { if (uiOn) bump(); });

// 画面(炎)にふれたとき
let down = null, dragging = false;
addEventListener('pointerdown', (e) => {
  if (e.target.closest('.bar, .sheet, .relight')) return;
  down = { x: e.clientX, y: e.clientY, t: performance.now(), wasOn: uiOn };
});
addEventListener('pointerup', (e) => {
  if (!down) return;
  const d = down; down = null;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (phase === 'dark' || phase === 'out') { lightUp(); return; }
  if (phase === 'slept') { $('relight').hidden = false; return; }
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
$('relight').addEventListener('click', () => { scene.fadeOut = 1.2; lightUp(); });

// ---------- ろうそく ----------
const thumbs = $('thumbs');
CANDLES.forEach((c, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<img src="icons/thumb-${c.id}.jpg" alt="" loading="lazy"><span>${c.short}</span>`;
  b.setAttribute('aria-label', c.name);
  b.addEventListener('click', () => changeCandle(i));
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
    b.textContent = it.name; b.setAttribute('aria-label', it.label || it.name);
    b.addEventListener('click', () => { set(i); refreshChoices(); save(); });
    el.appendChild(b);
  });
  el._get = get;
}
choices($('swayChoices'), SWAYS, () => st.sway, (i) => { st.sway = i; scene.set({ sway: i }); });
choices($('sizeChoices'), SIZES, () => st.size, (i) => { st.size = i; scene.set({ size: i }); });
choices($('brightChoices'), [1, 2, 3, 4, 5].map((n) => ({ name: '●'.repeat(n), label: `明るさ ${n}` })), () => st.bright, (i) => { st.bright = i; scene.set({ bright: i }); });
choices($('warmChoices'), WARMTH, () => st.warm, (i) => { st.warm = i; scene.set({ warm: i }); });
choices($('orderChoices'), [{ name: '順番に' }, { name: 'ばらばら' }], () => (st.order === 'order' ? 0 : 1), (i) => { st.order = i ? 'random' : 'order'; music.order = st.order; });
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
let sleepIdx = 0, sleepStart = 0, sleepEnd = 0, musicFaded = false;
function setSleep(i) {
  sleepIdx = i;
  musicFaded = false;
  if (SLEEPS[i].min === 0) { sleepEnd = 0; scene.burn = 1; scene.shrink = 1; }
  else {
    sleepStart = Date.now(); sleepEnd = sleepStart + SLEEPS[i].min * 60000;
    toast('おやすみ ' + SLEEPS[i].name.replace(/.*\((.*)\)/, '$1'), 2200);
  }
  refreshLabels();
}
scene.onFrame = () => {
  if (!sleepEnd || phase !== 'lit') return;
  const now = Date.now(), total = sleepEnd - sleepStart, left = (sleepEnd - now) / 1000;
  scene.burn = 1 - 0.55 * Math.min(1, (now - sleepStart) / total);   // ろうそくが すこしずつ短くなる
  if (left <= 60 && !musicFaded) { musicFaded = true; sleepStopping = true; music.fadeOut(Math.max(5, left)); sleepStopping = false; }
  scene.shrink = Math.max(0, Math.min(1, left / 30));
  // 消える前に 2〜3回 ふっと ゆらぐ
  if (left < 7) scene.shrink *= 1 - 0.55 * Math.max(0, Math.sin(left * 2.6)) ** 6;
  if (left <= 0) {
    sleepEnd = 0; sleepIdx = 0;
    refreshChoices(); refreshLabels();
    putOut(true);
  }
};
let labelT = 0;
function refreshLabels() {
  const l = $('sleepLab');
  if (sleepEnd && phase === 'lit') {
    const m = Math.max(1, Math.ceil((sleepEnd - Date.now()) / 60000));
    l.textContent = `あと${m}分`; l.classList.add('timing');
  } else { l.textContent = 'おやすみ'; l.classList.remove('timing'); }
  $('musicLab').textContent = music.playing ? '音楽 止める' : '音楽';
  $('musicBtn').classList.toggle('cur', music.playing);
  [...$('tracks').querySelectorAll('button')].forEach((b, i) => {
    const on = music.playing && i === music.idx;
    b.setAttribute('aria-current', String(on));
    b.querySelector('.mark').textContent = on ? '・' : '';
  });
  clearTimeout(labelT);
  if (uiOn) labelT = setTimeout(refreshLabels, 15000);
}

// ---------- 音楽 ----------
let sleepStopping = false;   // おやすみで止めたときは「音楽をかけていた」ことを覚えたままにする
music.onchange = () => {
  if (!sleepStopping) st.musicOn = music.playing;
  st.track = music.idx; save();
  refreshLabels();
};
music.load().then((n) => {
  if (!n) return;
  music.idx = Math.min(st.track, n - 1);
  $('musicBtn').hidden = false;
  $('musicRows').hidden = false;
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
$('musicBtn').addEventListener('click', () => music.toggle());
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { scene.stop(); }
  else if (phase !== 'slept') { scene.start(); if (phase === 'lit') wake(true); }
});

// ---------- 全画面・ホーム画面・LINE ----------
const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (document.documentElement.requestFullscreen && !isIOS) {
  $('fs').hidden = false;
  $('fs').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  });
}
if (/Line\//i.test(ua)) $('lineNote').hidden = false;
if (!standalone) {
  $('installNote').textContent = isIOS
    ? 'Safari の共有ボタンから「ホーム画面に追加」をすると、アプリのように開けます。'
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
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    if (phase !== 'lit') return;
    changeCandle((st.candle + (e.key === 'ArrowRight' ? 1 : -1) + CANDLES.length) % CANDLES.length);
  } else if (e.key === ' ') { e.preventDefault(); if (phase === 'lit') music.toggle(); else if (phase !== 'slept') lightUp(); }
  else if (e.key === 'Escape') hideUI();
  else if (e.key === 'Enter' && phase !== 'lit' && phase !== 'slept') lightUp();
});

refreshChoices();
refreshLabels();

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

// テスト用(自動で確かめるとき)
window.__itto = {
  scene, music, st, lightUp, putOut, showUI, openSheet, setSleep, changeCandle, get phase() { return phase; },
  sleepSecs(s) { sleepIdx = 1; musicFaded = false; sleepStart = Date.now(); sleepEnd = sleepStart + s * 1000; },
};
