// ろうそくの顔ぶれ(20灯)。2026-10-23 から Higgsfield で作った動画・静止画で見せる(tools/media.py が作るファイル。手で直してもよい)。
// flame = [炎の中心x, 炎の上, 炎の根元, 炎の幅](割合)。動きを足す所。breath = 炎ののび縮み(和ろうそくは ゆっくり大きく)
// tip = 芯の先の位置(絵の幅・高さに対する割合)。煙はここから出る。大きくするときの中心にもなる。smoke = 消したあとに煙を出すか
export const CANDLES = [
  { id: 'wa-shiro', name: '白の和ろうそく', short: '和ろうそく', tip: [0.5014, 0.4055], smoke: true, flame: [0.4993, 0.3234, 0.4172, 0.0391], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'shu', name: '朱ろうそく', short: '朱', tip: [0.4986, 0.4055], smoke: true, flame: [0.4979, 0.3367, 0.4258, 0.0363], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'botan', name: '絵ろうそく・牡丹', short: '牡丹', tip: [0.5, 0.3289], smoke: true, flame: [0.4993, 0.2547, 0.3414, 0.0391], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'andon', name: '行灯', short: '行灯', tip: [0.4986, 0.6398], smoke: false, flame: [0.4972, 0.5922, 0.6773, 0.1187], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'take', name: '竹あかり', short: '竹あかり', tip: [0.5028, 0.5844], smoke: false, flame: [0.5056, 0.5836, 0.5852, 0.0042], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'kin', name: '金ろうそく', short: '金', tip: [0.5, 0.3852], smoke: true, flame: [0.4972, 0.2984, 0.3898, 0.0377], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'wa-e', name: '絵ろうそく・椿', short: '椿', tip: [0.5014, 0.3953], smoke: true, flame: [0.4986, 0.2984, 0.4023, 0.0433], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'bonbori', name: '雪洞', short: '雪洞', tip: [0.4958, 0.4984], smoke: false, flame: [0.4972, 0.4609, 0.525, 0.0936], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'kinari', name: '生成りのろうそく', short: '生成り', tip: [0.4944, 0.4297], smoke: true, flame: [0.4979, 0.3641, 0.443, 0.0391], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'toumyou', name: '灯明皿', short: '灯明皿', tip: [0.3966, 0.4328], smoke: true, flame: [0.4015, 0.4031, 0.4375, 0.0251], breath: { amp: 0.05, freq: 0.25 } },
  { id: 'ume', name: '絵ろうそく・梅', short: '梅', tip: [0.4972, 0.3859], smoke: true, flame: [0.4986, 0.3008, 0.4031, 0.0349], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'kiku', name: '絵ろうそく・菊', short: '菊', tip: [0.4972, 0.3734], smoke: true, flame: [0.4979, 0.3047, 0.3891, 0.0335], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'teshoku', name: '手燭(ガラスのほや)', short: '手燭', tip: [0.5, 0.5367], smoke: true, flame: [0.4965, 0.4734, 0.5422, 0.0391], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'hyakume', name: '百匁ろうそく', short: '百匁', tip: [0.4944, 0.3266], smoke: true, flame: [0.4979, 0.2234, 0.3445, 0.0503], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'ayame', name: '絵ろうそく・あやめ', short: 'あやめ', tip: [0.4972, 0.3445], smoke: true, flame: [0.4965, 0.2781, 0.3594, 0.0307], breath: { amp: 0.10, freq: 0.12 } },
  { id: 'mame', name: '豆ろうそく', short: '豆', tip: [0.5014, 0.557], smoke: true, flame: [0.5007, 0.5469, 0.5828, 0.0168], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'mitsurou', name: '蜜ろう', short: '蜜ろう', tip: [0.5, 0.5539], smoke: true, flame: [0.5, 0.5133, 0.5579, 0.022], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'tea', name: '小さな灯（豆皿）', short: '小さな灯', tip: [0.4986, 0.5883], smoke: true, flame: [0.4986, 0.5664, 0.5923, 0.022], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'hashira', name: '白い柱のろうそく', short: '白い柱', tip: [0.5, 0.5812], smoke: true, flame: [0.5, 0.5695, 0.5852, 0.022], breath: { amp: 0.03, freq: 0.18 } },
  { id: 'hosoi', name: '細いろうそく', short: '細いろうそく', tip: [0.4972, 0.4547], smoke: true, flame: [0.4979, 0.4438, 0.4914, 0.0196], breath: { amp: 0.03, freq: 0.18 } },
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
