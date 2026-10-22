// ろうそくの顔ぶれ(20灯)。寸法は cm(大きさ「中」のとき)。
// 色は見た目の色(#rrggbb)。描くときに光の計算用の色に直す。
// 2026-10-22: 専門家の案で最初の6灯 → ノブさんの希望で、日本で今売られている和ろうそく・和の灯りを中心に20灯へ。
// 寸法・色は 和ろうそくの調べ(中村ローソク・会津絵ろうそく・高澤ろうそく など)をもとにした。
//
// 書き方:
//   body   … H 高さ, Rt 上の半径, Rb 下の半径, flare 形(1 まっすぐ / 2以上 いかり型: 上がひらく)
//   deco   … 0 なし / 1 絵(motif) / 2 蜂の巣
//   motif  … kind 1椿 2桜 3梅 4菊 5牡丹 6あやめ, size 花の大きさ, n 花の数(〜6), leaf 葉や枝, petal/petal2/leafC 色
//   gold   … 金箔の量(0〜1)
//   type   … 0 ろうそく / 1 アルミの器(ティーライト) / 2 灯明皿(油と灯芯)
//   holder … kind 0なし 1燭台(鉄・漆・木) 2真鍮の燭台 3皿, H 高さ, R 台座の半径, gloss つや, color
//   cover  … kind 1行灯 2雪洞 3ほや(ガラス) 4竹あかり, R 半径, y0 下, y1 上, color 紙・ガラス・竹, frame 枠
//   calm   … 風の当たりにくさ(かさの中は 揺れが小さい)、flick … ちらつきを足す

const WARO = { flare: 2.4 };                       // いかり型
const IRON = { kind: 1, H: 6.0, R: 3.0, gloss: 0.5, color: '#2c2723' };
const SHU_STAND = { kind: 1, H: 7.5, R: 4.2, gloss: 0.75, color: '#a8261c' };   // 朱漆の燭台
const KURO_STAND = { kind: 1, H: 7.5, R: 4.2, gloss: 0.8, color: '#15110f' };   // 黒漆の燭台
const BRASS = { kind: 2, H: 8.5, R: 4.0, gloss: 0.85, color: '#6e5527' };
const WA_FLAME = { h: 7.5, w: 1.25, tint: 1.0 };
const WA_WICK = { len: 2.0, w: 0.28, curl: 0.22, kind: 1 };

export const CANDLES = [
  {
    id: 'wa-shiro', name: '白の和ろうそく', short: '和ろうそく',
    body: { H: 12, Rt: 1.0, Rb: 0.72, ...WARO },
    wax: '#ede6d3', trans: 0.35, pool: 0.6, depth: 0.12, deco: 0,
    wick: WA_WICK, flame: WA_FLAME,
    breath: { amp: 0.10, freq: 0.12 },
    holder: IRON,
  },
  {
    id: 'shu', name: '朱ろうそく', short: '朱',
    body: { H: 15, Rt: 1.6, Rb: 1.15, ...WARO },
    wax: '#c8402a', trans: 0.3, pool: 0.6, depth: 0.15, deco: 0,
    wick: { len: 2.1, w: 0.3, curl: -0.25, kind: 1 }, flame: { h: 7.2, w: 1.25, tint: 1.0 },
    breath: { amp: 0.10, freq: 0.11 },
    holder: SHU_STAND,
  },
  {
    id: 'botan', name: '絵ろうそく・牡丹', short: '牡丹',
    body: { H: 17, Rt: 1.9, Rb: 1.25, ...WARO },
    wax: '#f3eedc', trans: 0.35, pool: 0.6, depth: 0.15, deco: 1,
    motif: { kind: 5, size: 1.6, n: 2, leaf: 1, petal: '#c81e4e', petal2: '#ee8fb0', leafC: '#3f6b30' },
    wick: { len: 2.2, w: 0.32, curl: 0.25, kind: 1 }, flame: { h: 7.8, w: 1.35, tint: 1.0 },
    breath: { amp: 0.10, freq: 0.10 },
    holder: KURO_STAND,
  },
  {
    id: 'andon', name: '行灯', short: '行灯',
    body: { H: 6, Rt: 0.55, Rb: 0.5, flare: 1 },
    wax: '#f4efe0', trans: 0.6, pool: 0.6, depth: 0.1, deco: 0,
    wick: { len: 1.2, w: 0.14, curl: 0.12, kind: 1 }, flame: { h: 4.2, w: 0.75, tint: 0.9 },
    breath: { amp: 0.06, freq: 0.14 },
    holder: { kind: 1, H: 4.0, R: 2.2, gloss: 0.4, color: '#1a1410' },
    cover: { kind: 1, R: 6.5, y0: 1.4, y1: 19, color: '#f2e6cc', frame: '#1a1410' },
    calm: 0.45,
  },
  {
    id: 'take', name: '竹あかり', short: '竹あかり',
    body: { H: 8, Rt: 0.9, Rb: 0.7, ...WARO },
    wax: '#ede6d3', trans: 0.35, pool: 0.6, depth: 0.12, deco: 0,
    wick: { len: 1.6, w: 0.22, curl: 0.2, kind: 1 }, flame: { h: 5.0, w: 0.9, tint: 1.0 },
    breath: { amp: 0.08, freq: 0.12 },
    holder: { kind: 0, H: 0, R: 0, gloss: 0, color: '#000000' },
    cover: { kind: 4, R: 5.5, y0: 0, y1: 21, color: '#a89a5a', frame: '#000000' },
    calm: 0.3,
  },
  {
    id: 'kin', name: '金ろうそく', short: '金',
    body: { H: 14, Rt: 1.6, Rb: 1.1, ...WARO },
    wax: '#c79a3a', trans: 0.2, pool: 0.6, depth: 0.12, deco: 0, gold: 1.0,
    wick: WA_WICK, flame: { h: 6.6, w: 1.15, tint: 1.0 },
    breath: { amp: 0.10, freq: 0.12 },
    holder: SHU_STAND,
  },
  {
    id: 'wa-e', name: '絵ろうそく・椿', short: '椿',
    body: { H: 12, Rt: 1.0, Rb: 0.72, ...WARO },
    wax: '#a8321e', trans: 0.3, pool: 0.6, depth: 0.12, deco: 1,
    motif: { kind: 1, size: 1.0, n: 2, leaf: 1, petal: '#e7ddc5', petal2: '#f0e8d4', leafC: '#3f592b' },
    wick: { len: 2.0, w: 0.28, curl: -0.2, kind: 1 }, flame: WA_FLAME,
    breath: { amp: 0.10, freq: 0.11 },
    holder: IRON,
  },
  {
    id: 'bonbori', name: '雪洞', short: '雪洞',
    body: { H: 5, Rt: 0.55, Rb: 0.5, flare: 1 },
    wax: '#f4efe0', trans: 0.6, pool: 0.6, depth: 0.1, deco: 0,
    wick: { len: 1.2, w: 0.14, curl: 0.12, kind: 1 }, flame: { h: 4.0, w: 0.7, tint: 0.9 },
    breath: { amp: 0.06, freq: 0.14 },
    holder: { kind: 1, H: 9.5, R: 3.4, gloss: 0.75, color: '#a8261c' },
    cover: { kind: 2, R: 5.6, y0: 9.8, y1: 22, color: '#f5ecd6', frame: '#a8261c' },
    calm: 0.45,
  },
  {
    id: 'kinari', name: '生成りのろうそく', short: '生成り',
    body: { H: 14, Rt: 1.2, Rb: 1.0, flare: 1 },
    wax: '#e6c46a', trans: 0.7, pool: 0.65, depth: 0.15, deco: 0,
    wick: { len: 1.8, w: 0.26, curl: 0.2, kind: 1 }, flame: { h: 6.4, w: 1.05, tint: 0.95 },
    breath: { amp: 0.08, freq: 0.12 },
    holder: { kind: 3, H: 2.6, R: 4.0, gloss: 0.6, color: '#8c8470' },
  },
  {
    id: 'toumyou', name: '灯明皿', short: '灯明皿', type: 2,
    body: { H: 1.4, Rt: 4.0, Rb: 2.2, flare: 0.6 },
    wax: '#b88a5e', trans: 0.1, pool: 0.86, depth: 0.35, deco: 0,
    wick: { len: 0, w: 0.24, curl: 0, kind: 0 }, flame: { h: 2.4, w: 0.42, tint: 0.6, at: { x: 0.8, dy: 0.12 } },
    breath: { amp: 0.04, freq: 0.3 },
    holder: { kind: 1, H: 9.0, R: 3.2, gloss: 0.3, color: '#5a3a22' },
    flick: 0.6,
  },
  {
    id: 'ume', name: '絵ろうそく・梅', short: '梅',
    body: { H: 15, Rt: 0.9, Rb: 0.8, flare: 1 },
    wax: '#f4efe0', trans: 0.4, pool: 0.6, depth: 0.12, deco: 1,
    motif: { kind: 3, size: 0.42, n: 6, leaf: 1, petal: '#c42a3c', petal2: '#d8506a', leafC: '#4a3426' },
    wick: { len: 1.8, w: 0.24, curl: 0.18, kind: 1 }, flame: { h: 6.0, w: 1.0, tint: 1.0 },
    breath: { amp: 0.09, freq: 0.13 },
    holder: IRON,
  },
  {
    id: 'kiku', name: '絵ろうそく・菊', short: '菊',
    body: { H: 15, Rt: 1.35, Rb: 1.0, ...WARO },
    wax: '#f3eedc', trans: 0.35, pool: 0.6, depth: 0.12, deco: 1,
    motif: { kind: 4, size: 1.35, n: 1, leaf: 1, petal: '#e8b01e', petal2: '#9a6a10', leafC: '#2f5d2a' },
    wick: WA_WICK, flame: { h: 6.6, w: 1.15, tint: 1.0 },
    breath: { amp: 0.10, freq: 0.12 },
    holder: KURO_STAND,
  },
  {
    id: 'teshoku', name: '手燭(ガラスのほや)', short: '手燭',
    body: { H: 9, Rt: 0.85, Rb: 0.8, flare: 1 },
    wax: '#f1ecd8', trans: 0.5, pool: 0.6, depth: 0.12, deco: 0,
    wick: { len: 1.5, w: 0.2, curl: 0.15, kind: 1 }, flame: { h: 5.0, w: 0.85, tint: 0.95 },
    breath: { amp: 0.08, freq: 0.13 },
    holder: { kind: 2, H: 4.0, R: 4.5, gloss: 0.85, color: '#7a5d2c' },
    cover: { kind: 3, R: 2.9, y0: 3.6, y1: 18.5, color: '#dfe8e2', frame: '#000000' },
    calm: 0.35,
  },
  {
    id: 'hyakume', name: '百匁ろうそく', short: '百匁',
    body: { H: 20, Rt: 3.3, Rb: 2.4, ...WARO },
    wax: '#f1ecd8', trans: 0.35, pool: 0.6, depth: 0.2, deco: 0,
    wick: { len: 2.8, w: 0.45, curl: 0.3, kind: 1 }, flame: { h: 11, w: 1.9, tint: 1.0 },
    breath: { amp: 0.10, freq: 0.09 },
    holder: { kind: 1, H: 8, R: 6.2, gloss: 0.85, color: '#6e5527' },
  },
  {
    id: 'ayame', name: '絵ろうそく・あやめ', short: 'あやめ',
    body: { H: 15, Rt: 1.0, Rb: 0.85, flare: 1 },
    wax: '#f4efe0', trans: 0.4, pool: 0.6, depth: 0.12, deco: 1,
    motif: { kind: 6, size: 0.72, n: 3, leaf: 1, petal: '#8a64c4', petal2: '#b39ae0', leafC: '#3c6e3a' },
    wick: { len: 1.8, w: 0.24, curl: -0.18, kind: 1 }, flame: { h: 6.0, w: 1.0, tint: 1.0 },
    breath: { amp: 0.09, freq: 0.13 },
    holder: BRASS,
  },
  {
    id: 'mame', name: '豆ろうそく', short: '豆',
    body: { H: 8, Rt: 0.5, Rb: 0.45, flare: 1 },
    wax: '#f4efe0', trans: 0.5, pool: 0.6, depth: 0.08, deco: 0,
    wick: { len: 1.0, w: 0.12, curl: 0.12, kind: 1 }, flame: { h: 3.2, w: 0.55, tint: 0.8 },
    breath: { amp: 0.05, freq: 0.2 },
    holder: { kind: 3, H: 0.6, R: 3.0, gloss: 0.1, color: '#c9a27a' },
  },
  {
    id: 'mitsurou', name: '蜜ろう', short: '蜜ろう',
    body: { H: 9, Rt: 2.5, Rb: 2.5, flare: 1 },
    wax: '#c98a3a', trans: 0.95, pool: 0.74, depth: 0.45, deco: 2,
    wick: { len: 0.95, w: 0.085, curl: 0.2, kind: 0 },
    flame: { h: 3.3, w: 0.5, tint: 0.25 },
    breath: { amp: 0.03, freq: 0.2 },
    holder: { kind: 3, H: 0.9, R: 3.9, gloss: 0.15, color: '#4a2e1c' },
  },
  {
    id: 'tea', name: '小さな灯（豆皿）', short: '小さな灯',
    type: 1,
    body: { H: 1.5, Rt: 1.95, Rb: 1.95, flare: 1 },
    wax: '#f2ede2', trans: 1.0, pool: 0.94, depth: 0.32, deco: 0,
    wick: { len: 0.75, w: 0.06, curl: 0.12, kind: 0 },
    flame: { h: 1.9, w: 0.33, tint: 0.0 },
    breath: { amp: 0.02, freq: 0.25 },
    holder: { kind: 3, H: 0.7, R: 3.5, gloss: 0.7, color: '#6b665c' },
  },
  {
    id: 'hashira', name: '白い柱のろうそく', short: '白い柱',
    body: { H: 11, Rt: 3.75, Rb: 3.75, flare: 1 },
    wax: '#e9e2d4', trans: 1.1, pool: 0.85, depth: 2.2, deco: 0,
    wick: { len: 1.0, w: 0.075, curl: 0.18, kind: 0 },
    flame: { h: 2.9, w: 0.5, tint: 0.0 },
    breath: { amp: 0.02, freq: 0.2 },
    holder: { kind: 0, H: 0, R: 0, gloss: 0, color: '#000000' },
  },
  {
    id: 'hosoi', name: '細いろうそく', short: '細いろうそく',
    body: { H: 17, Rt: 1.05, Rb: 1.15, flare: 1 },
    wax: '#efe6d6', trans: 0.9, pool: 0.7, depth: 0.12, deco: 0,
    wick: { len: 0.9, w: 0.07, curl: 0.16, kind: 0 },
    flame: { h: 3.4, w: 0.45, tint: 0.05 },
    breath: { amp: 0.02, freq: 0.2 },
    holder: BRASS,
  },
];

export const SIZES = [
  { id: 's', name: '小', body: 0.8, flame: 0.9 },
  { id: 'm', name: '中', body: 1.0, flame: 1.0 },
  { id: 'l', name: '大', body: 1.22, flame: 1.1 },
];

// ゆれの3段階。lean = 炎の傾き(高さに対する横ずれの割合)
export const SWAYS = [
  { id: 'calm',   name: 'しずか', lean: 0.035, height: 0.04, gustEvery: [40, 120], gust: 0.08, flick: 0.0 },
  { id: 'yuragi', name: 'ゆらぎ', lean: 0.10,  height: 0.09, gustEvery: [10, 30],  gust: 0.26, flick: 0.25 },
  { id: 'soyo',   name: 'そよ風', lean: 0.18,  height: 0.18, gustEvery: [5, 14],   gust: 0.32, flick: 0.7 },
];

// 明るさ5段階: 露出と、部屋のうす明かり
export const BRIGHT = [
  { exp: 0.42, amb: 0.0002 },
  { exp: 0.68, amb: 0.0005 },
  { exp: 0.80, amb: 0.0007 },
  { exp: 1.00, amb: 0.0011 },
  { exp: 1.25, amb: 0.0016 },
];

export const WARMTH = [
  { id: 'cool', name: '白っぽく', v: 0.0 },
  { id: 'mid',  name: 'ふつう',   v: 0.5 },
  { id: 'warm', name: 'あたたかく', v: 1.0 },
];

export function hexToLinear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.pow(c / 255, 2.2));
}
