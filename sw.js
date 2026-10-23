'use strict';
/* 電波がなくても開けるようにする(ホーム画面に入れたあと)。
   - アプリの本体(下の FILES)は、はじめに全部覚える。開くときは まずネットで最新を取りにいき、3秒つながらなければ 覚えているものを出す。
   - 曲(music/)と文字の形(フォント)は、一度流した・表示したものだけ 覚えておく(10曲ぶん 先に全部はダウンロードしない)。
   FILES を変えたときは VERSION を1つ上げる。 */
const VERSION = 'itto-v4';
const FILES = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/vscene.js', 'js/candles.js', 'js/music.js',
  'manifest.webmanifest', 'music/tracks.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'icons/thumb-wa-shiro.jpg', 'icons/thumb-shu.jpg', 'icons/thumb-botan.jpg', 'icons/thumb-andon.jpg', 'icons/thumb-take.jpg', 'icons/thumb-kin.jpg', 'icons/thumb-wa-e.jpg', 'icons/thumb-bonbori.jpg', 'icons/thumb-kinari.jpg', 'icons/thumb-toumyou.jpg', 'icons/thumb-ume.jpg', 'icons/thumb-kiku.jpg', 'icons/thumb-teshoku.jpg', 'icons/thumb-hyakume.jpg', 'icons/thumb-ayame.jpg', 'icons/thumb-mame.jpg', 'icons/thumb-mitsurou.jpg', 'icons/thumb-tea.jpg', 'icons/thumb-hashira.jpg', 'icons/thumb-hosoi.jpg'];
const KEEP = 'itto-keep';   // 曲とフォント(VERSION を上げても消さない)

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== KEEP).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // フォントと曲: 覚えているものがあれば それを使う
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isMusic = url.origin === location.origin && /\/(music\/.+\.(mp3|m4a|aac|ogg|wav)|media\/[su]\/.+\.jpg|media\/v\/.+\.mp4)$/i.test(url.pathname);
  if (isFont || isMusic) {
    if (req.headers.has('range')) return;   // 曲の途中読みは ふつうにネットへ
    e.respondWith(caches.open(KEEP).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (url.origin !== location.origin) return;
  const nav = req.mode === 'navigate';
  const key = nav ? './' : req;
  const net = fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(VERSION).then((c) => c.put(key, copy))); }
    return res;
  });
  const late = new Promise((r) => setTimeout(r, 3000));
  const fromCache = () => caches.match(key, { ignoreSearch: nav }).then((hit) => hit || caches.match('index.html'));
  e.respondWith(Promise.race([net, late.then(() => fromCache().then((hit) => hit || net))]).then((res) => res || net).catch(() => fromCache()));
});
