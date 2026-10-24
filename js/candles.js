// ろうそくの顔ぶれ。2026-10-24 Google Flow で作り直し(背景は ろうそくごとに合う場所)。tools/flow_media.py が作る(手で直してもよい)。
// tip = 芯の先の位置(絵の幅・高さに対する割合)。煙はここから出る。大きくするときの中心にもなる。smoke = 消したあとに煙を出すか
// flame = [炎の中心x, 炎の上, 炎の根元, 炎の幅](割合)。動きを足す所。breath = 炎ののび縮み(和ろうそくは ゆっくり大きく)
export const MEDIA_V = 2;   // 絵と動画を作り直したら上げる
export const CANDLES = [
  { id: 'wa-shiro', name: '白の和ろうそく', short: '和ろうそく', tip: [0.4986, 0.5031], smoke: true, flame: [0.5014, 0.3867, 0.4961, 0.0381], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'shu', name: '朱ろうそく', short: '朱', tip: [0.5042, 0.4102], smoke: true, flame: [0.5014, 0.277, 0.4, 0.0436], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'botan', name: '絵ろうそく・牡丹', short: '牡丹', tip: [0.4944, 0.4156], smoke: true, flame: [0.5, 0.3113, 0.3992, 0.0545], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'andon', name: '行灯', short: '行灯', tip: [0.5, 0.5352], smoke: false, flame: [0.5, 0.5102, 0.5609, 0.0782], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'take', name: '竹あかり', short: '竹あかり', tip: [0.5, 0.5461], smoke: false, flame: [0.4972, 0.4758, 0.6058, 0.0698], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'kin', name: '金ろうそく', short: '金', tip: [0.4972, 0.3734], smoke: true, flame: [0.5, 0.2194, 0.3492, 0.0472], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'wa-e', name: '絵ろうそく・椿', short: '椿', tip: [0.493, 0.4234], smoke: true, flame: [0.4972, 0.3254, 0.4055, 0.0599], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'bonbori', name: '雪洞', short: '雪洞', tip: [0.5, 0.3727], smoke: false, flame: [0.4148, 0.3445, 0.4102, 0.1802], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'kinari', name: '生成りのろうそく', short: '生成り', tip: [0.4972, 0.4484], smoke: true, flame: [0.5, 0.2852, 0.4297, 0.0508], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'toumyou', name: '灯明皿', short: '灯明皿', tip: [0.5154, 0.5305], smoke: true, flame: [0.5154, 0.464, 0.5305, 0.06], breath: { amp: 0.05, freq: 0.25 } },
  { id: 'ume', name: '絵ろうそく・梅', short: '梅', tip: [0.4972, 0.382], smoke: true, flame: [0.5, 0.2725, 0.3648, 0.049], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'kiku', name: '絵ろうそく・菊', short: '菊', tip: [0.4972, 0.3953], smoke: true, flame: [0.4986, 0.2947, 0.3758, 0.0545], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'teshoku', name: '手燭(ガラスのほや)', short: '手燭', tip: [0.4986, 0.4859], smoke: true, flame: [0.4986, 0.4143, 0.5043, 0.0581], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'hyakume', name: '百匁ろうそく', short: '百匁', tip: [0.4735, 0.432], smoke: true, flame: [0.4972, 0.269, 0.4279, 0.0563], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'ayame', name: '絵ろうそく・あやめ', short: 'あやめ', tip: [0.4986, 0.3695], smoke: true, flame: [0.5, 0.2449, 0.3409, 0.0525], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'mame', name: '豆ろうそく', short: '豆', tip: [0.5014, 0.4727], smoke: true, flame: [0.5, 0.4176, 0.5055, 0.0327], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'mitsurou', name: '蜜ろう', short: '蜜ろう', tip: [0.5056, 0.5469], smoke: true, flame: [0.5014, 0.4795, 0.5695, 0.06], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'tea', name: '小さな灯（豆皿）', short: '小さな灯', tip: [0.5196, 0.5], smoke: true, flame: [0.507, 0.4246, 0.5146, 0.06], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'hashira', name: '白い柱のろうそく', short: '白い柱', tip: [0.5056, 0.5422], smoke: true, flame: [0.5014, 0.5143, 0.568, 0.06], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'hosoi', name: '細いろうそく', short: '細いろうそく', tip: [0.4986, 0.3852], smoke: true, flame: [0.4986, 0.3143, 0.4043, 0.0527], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'nejiri', name: 'ねじりろうそく', short: 'ねじり', tip: [0.4874, 0.3766], smoke: true, flame: [0.5, 0.273, 0.3769, 0.0381], breath: { amp: 0.10, freq: 0.12 } },
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
