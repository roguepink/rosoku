// ろうそくの顔ぶれ。寸法は cm(大きさ「中」のとき)。
// 色は見た目の色(#rrggbb)。描くときに光の計算用の色に直す。
// ろうそく・癒しの専門家とデザイナーの案(2026-10-22)をもとに決めた。

export const CANDLES = [
  {
    id: 'wa-shiro', name: '白の和ろうそく', short: '和・白',
    body: { H: 12, Rt: 1.0, Rb: 0.72, flare: 2.4 },
    wax: '#ede6d3', trans: 0.35, pool: 0.6, depth: 0.12, deco: 0,
    wick: { len: 1.5, w: 0.2, curl: 0.22, kind: 1 },
    flame: { h: 6.4, w: 0.95, tint: 0.85 },
    breath: { amp: 0.17, freq: 0.33 },     // 和ろうそくは ゆっくり息をするように のび縮みする
    holder: { kind: 1, H: 6.0, R: 3.0, gloss: 0.5, color: '#1d1a17' },
  },
  {
    id: 'wa-e', name: '絵ろうそく', short: '絵',
    body: { H: 12, Rt: 1.0, Rb: 0.72, flare: 2.4 },
    wax: '#a8321e', trans: 0.3, pool: 0.6, depth: 0.12, deco: 1,
    wick: { len: 1.5, w: 0.2, curl: -0.2, kind: 1 },
    flame: { h: 6.4, w: 0.95, tint: 0.85 },
    breath: { amp: 0.17, freq: 0.29 },
    holder: { kind: 1, H: 6.0, R: 3.0, gloss: 0.5, color: '#1d1a17' },
  },
  {
    id: 'mitsurou', name: '蜜ろう', short: '蜜ろう',
    body: { H: 9, Rt: 2.5, Rb: 2.5, flare: 1 },
    wax: '#c98a3a', trans: 0.75, pool: 0.74, depth: 0.45, deco: 2,
    wick: { len: 0.95, w: 0.085, curl: 0.2, kind: 0 },
    flame: { h: 3.3, w: 0.5, tint: 0.25 },
    breath: { amp: 0.03, freq: 0.2 },
    holder: { kind: 3, H: 0.9, R: 3.9, gloss: 0.3, color: '#3b2416' },
  },
  {
    id: 'hashira', name: '白い柱のろうそく', short: '白い柱',
    body: { H: 11, Rt: 3.75, Rb: 3.75, flare: 1 },
    wax: '#e9e2d4', trans: 1.1, pool: 0.8, depth: 1.0, deco: 0,
    wick: { len: 1.0, w: 0.075, curl: 0.18, kind: 0 },
    flame: { h: 2.9, w: 0.5, tint: 0.0 },
    breath: { amp: 0.02, freq: 0.2 },
    holder: { kind: 0, H: 0, R: 0, gloss: 0, color: '#000000' },
  },
  {
    id: 'hosoi', name: '細いろうそく', short: '細い',
    body: { H: 17, Rt: 1.05, Rb: 1.15, flare: 1 },
    wax: '#efe6d6', trans: 0.9, pool: 0.7, depth: 0.12, deco: 0,
    wick: { len: 0.9, w: 0.07, curl: 0.16, kind: 0 },
    flame: { h: 3.4, w: 0.45, tint: 0.05 },
    breath: { amp: 0.02, freq: 0.2 },
    holder: { kind: 2, H: 8.5, R: 4.0, gloss: 0.85, color: '#8a6a35' },
  },
  {
    id: 'tea', name: 'ティーライト', short: '小さな灯',
    type: 1,
    body: { H: 1.5, Rt: 1.95, Rb: 1.95, flare: 1 },
    wax: '#f2ede2', trans: 1.0, pool: 0.94, depth: 0.32, deco: 0,
    wick: { len: 0.75, w: 0.06, curl: 0.12, kind: 0 },
    flame: { h: 1.9, w: 0.33, tint: 0.0 },
    breath: { amp: 0.02, freq: 0.25 },
    holder: { kind: 3, H: 0.7, R: 3.5, gloss: 0.7, color: '#6b665c' },
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
  { id: 'soyo',   name: 'そよ風', lean: 0.26,  height: 0.20, gustEvery: [3, 8],    gust: 0.50, flick: 0.7 },
];

// 明るさ5段階: 露出と、部屋のうす明かり
export const BRIGHT = [
  { exp: 0.42, amb: 0.0002 },
  { exp: 0.60, amb: 0.0004 },
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
