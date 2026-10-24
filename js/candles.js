// ろうそくの顔ぶれ。2026-10-24 Google Flow で作り直し(背景は ろうそくごとに合う場所)。tools/flow_media.py が作る(手で直してもよい)。
// tip = 芯の先の位置(絵の幅・高さに対する割合)。煙はここから出る。大きくするときの中心にもなる。smoke = 消したあとに煙を出すか
// flame = [炎の中心x, 炎の上, 炎の根元, 炎の幅](割合)。動きを足す所。breath = 炎ののび縮み(和ろうそくは ゆっくり大きく)
export const MEDIA_V = 2;   // 絵と動画を作り直したら上げる
export const CANDLES = [
  { id: 'wa-shiro', name: '白の和ろうそく', short: '和ろうそく', tip: [0.4986, 0.5031], smoke: true, flame: [0.5014, 0.3867, 0.4961, 0.0381], breath: { amp: 0.10, freq: 0.12 } },
];

// ゆれの3段階(動画の炎に、さらに足す動き)。lean = 傾き、height = のび縮み
export const SWAYS = [
  { id: 'calm',   name: 'しずか', lean: 0.03, height: 0.03, gustEvery: [40, 120], gust: 0.06, flick: 0.0 },
  { id: 'yuragi', name: 'ゆらぎ', lean: 0.08, height: 0.07, gustEvery: [10, 30],  gust: 0.20, flick: 0.25 },
  { id: 'soyo',   name: 'そよ風', lean: 0.16, height: 0.14, gustEvery: [5, 14],   gust: 0.30, flick: 0.6 },
];

export const SIZES = [{ id: 's', name: '小', zoom: 0.88 }, { id: 'm', name: '中', zoom: 1.0 }, { id: 'l', name: '大', zoom: 1.18 }];
// 明るさ5段階(動画の明るさに かける数)
export const BRIGHT = [0.5, 0.65, 0.82, 1.0, 1.15];
export const WARMTH = [{ id: 'cool', name: '白っぽく', v: 0.0 }, { id: 'mid', name: 'ふつう', v: 0.5 }, { id: 'warm', name: 'あたたかく', v: 1.0 }];
