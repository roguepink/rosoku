# 曲の入れ方

1. 曲のファイル(mp3 がおすすめ)を、この `music` フォルダに入れる。名前は英数字にする(例: `01-yoru.mp3`)。
2. `tracks.json` に 1曲 1行で書く。上から順番が「順番に」のときの並び。

```json
[
  { "file": "01-yoru.mp3", "title": "夜のはじまり" },
  { "file": "02-shizuku.mp3", "title": "しずく" }
]
```

- 曲が1つもないとき(`[]` のとき)は、画面に「音楽」のボタンは出ない。
- 曲の終わり 8秒は自動で小さくなり、3秒しずかにしてから次の曲へ。
- 音の大きさは そろえる(2026-10-22 ノブさんの「少し小さく」で、目安は -19.8 LUFS)。大きい曲は `"gain": 0.74` のように書くと、その曲だけ小さく流れる(0.74 = -15.4 LUFS の曲を -18 にそろえる値)。
  はかり方: `ffmpeg -i 曲.mp3 -af ebur128=framelog=quiet -f null -` の Integrated loudness。gain = 10^((-19.8 - その値)/20)
- 1曲 3〜5MB くらいにしておくと、スマホで流しやすい。

## 曲名(Suno の英語名 → アプリの名前)
- Candle Flame Meditation → 灯心(とうしん)
- Moonlight over Still Water → 水月(すいげつ)
- Dawn in the Sacred Forest → 朝の杜(あさのもり)
- Midnight Forest Chimes → 夜の鈴(よるのすず)
- Temple Bell Meditation → 晩鐘(ばんしょう)
- Cathedral Silence → しじま
- Distant Galactic Signal → 星便り(ほしだより)
