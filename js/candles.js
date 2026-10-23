// ろうそくの顔ぶれ(20灯)。2026-10-23 から Higgsfield で作った動画・静止画で見せる(tools/media.py が作るファイル。手で直してもよい)。
// tip = 芯の先の位置(絵の幅・高さに対する割合)。煙はここから出る。大きくするときの中心にもなる。smoke = 消したあとに煙を出すか
export const CANDLES = [
  { id: 'wa-shiro', name: '白の和ろうそく', short: '和ろうそく', tip: [0.5014, 0.4055], smoke: true },
  { id: 'shu', name: '朱ろうそく', short: '朱', tip: [0.4986, 0.4055], smoke: true },
  { id: 'botan', name: '絵ろうそく・牡丹', short: '牡丹', tip: [0.5, 0.3289], smoke: true },
  { id: 'andon', name: '行灯', short: '行灯', tip: [0.4986, 0.6398], smoke: false },
  { id: 'take', name: '竹あかり', short: '竹あかり', tip: [0.5028, 0.5844], smoke: false },
  { id: 'kin', name: '金ろうそく', short: '金', tip: [0.5, 0.3852], smoke: true },
  { id: 'wa-e', name: '絵ろうそく・椿', short: '椿', tip: [0.5014, 0.3953], smoke: true },
  { id: 'bonbori', name: '雪洞', short: '雪洞', tip: [0.4958, 0.4984], smoke: false },
  { id: 'kinari', name: '生成りのろうそく', short: '生成り', tip: [0.4944, 0.4297], smoke: true },
  { id: 'toumyou', name: '灯明皿', short: '灯明皿', tip: [0.3966, 0.4328], smoke: true },
  { id: 'ume', name: '絵ろうそく・梅', short: '梅', tip: [0.4972, 0.3859], smoke: true },
  { id: 'kiku', name: '絵ろうそく・菊', short: '菊', tip: [0.4972, 0.3734], smoke: true },
  { id: 'teshoku', name: '手燭(ガラスのほや)', short: '手燭', tip: [0.5, 0.5367], smoke: true },
  { id: 'hyakume', name: '百匁ろうそく', short: '百匁', tip: [0.4944, 0.3266], smoke: true },
  { id: 'ayame', name: '絵ろうそく・あやめ', short: 'あやめ', tip: [0.4972, 0.3445], smoke: true },
  { id: 'mame', name: '豆ろうそく', short: '豆', tip: [0.5014, 0.557], smoke: true },
  { id: 'mitsurou', name: '蜜ろう', short: '蜜ろう', tip: [0.5, 0.5539], smoke: true },
  { id: 'tea', name: '小さな灯（豆皿）', short: '小さな灯', tip: [0.4986, 0.5883], smoke: true },
  { id: 'hashira', name: '白い柱のろうそく', short: '白い柱', tip: [0.5, 0.5812], smoke: true },
  { id: 'hosoi', name: '細いろうそく', short: '細いろうそく', tip: [0.4972, 0.4547], smoke: true },
];

export const SIZES = [{ id: 's', name: '小', zoom: 0.88 }, { id: 'm', name: '中', zoom: 1.0 }, { id: 'l', name: '大', zoom: 1.18 }];
// 明るさ5段階(動画の明るさに かける数)
export const BRIGHT = [0.5, 0.65, 0.82, 1.0, 1.15];
export const WARMTH = [{ id: 'cool', name: '白っぽく', v: 0.0 }, { id: 'mid', name: 'ふつう', v: 0.5 }, { id: 'warm', name: 'あたたかく', v: 1.0 }];
