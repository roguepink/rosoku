#!/usr/bin/env python3
"""Higgsfield で作った 動画・静止画を、アプリで使う形にそろえる(2026-10-23)。
  ~/.local/venvs/ryokoshi/bin/python tools/media.py _check/hf/urls.json

  urls.json = [{"id": "wa-shiro", "video": "https://...mp4", "unlit": "https://...png", "still": "https://...png"}, ...](アプリの並び順)
  作るもの:
    media/v/<id>.mp4   炎の動画(10秒くり返し)
    media/s/<id>.jpg   火がついた静止画(動画が出るまでの絵)
    media/u/<id>.jpg   火が消えた静止画(灯る前・消えたあと)
    icons/thumb-<id>.jpg  ろうそくを選ぶ画面の見本
    js/candles.js      一覧(名前・芯の先の位置)
"""
import json, re, subprocess, sys, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "_check/hf/raw"; RAW.mkdir(parents=True, exist_ok=True)
W, H = 716, 1280
COVERED = {"andon", "bonbori", "take"}      # かさの中の灯り: 煙は出さない

NAMES = [
    ("wa-shiro", "白の和ろうそく", "和ろうそく"), ("shu", "朱ろうそく", "朱"), ("botan", "絵ろうそく・牡丹", "牡丹"),
    ("andon", "行灯", "行灯"), ("take", "竹あかり", "竹あかり"), ("kin", "金ろうそく", "金"), ("wa-e", "絵ろうそく・椿", "椿"),
    ("bonbori", "雪洞", "雪洞"), ("kinari", "生成りのろうそく", "生成り"), ("toumyou", "灯明皿", "灯明皿"),
    ("ume", "絵ろうそく・梅", "梅"), ("kiku", "絵ろうそく・菊", "菊"), ("teshoku", "手燭(ガラスのほや)", "手燭"),
    ("hyakume", "百匁ろうそく", "百匁"), ("ayame", "絵ろうそく・あやめ", "あやめ"), ("mame", "豆ろうそく", "豆"),
    ("mitsurou", "蜜ろう", "蜜ろう"), ("tea", "小さな灯（豆皿）", "小さな灯"), ("hashira", "白い柱のろうそく", "白い柱"),
    ("hosoi", "細いろうそく", "細いろうそく"),
]

def get(url, path):
    if not path.exists():
        urllib.request.urlretrieve(url, path)
    return path

def tip_of(lit, unlit, cid):
    """芯の先(煙が出る所)と、大きくするときの中心。0〜1 の割合"""
    L = np.asarray(lit.convert("L"), dtype=np.float32)
    L[int(L.shape[0] * 0.72):] = 0          # 下は 台への映り込みなので 見ない
    thr = max(200, np.percentile(L, 99.8))
    ys, xs = np.where(L >= thr)
    cx, cy = float(np.median(xs)), float(np.median(ys))
    if cid in COVERED:
        return cx / L.shape[1], cy / L.shape[0]
    bottom = float(np.percentile(ys, 97))
    # 火が消えた絵の 赤い火(芯の先)が 炎の下のあたりにあれば、そちらを使う
    U = np.asarray(unlit.convert("RGB"), dtype=np.float32)
    red = (U[..., 0] - U[..., 1]) * (U[..., 0] > 50)
    y0, y1 = int(max(0, cy - 0.12 * L.shape[0])), int(min(L.shape[0], bottom + 0.05 * L.shape[0]))
    x0, x1 = int(max(0, cx - 0.06 * L.shape[1])), int(min(L.shape[1], cx + 0.06 * L.shape[1]))
    sub = red[y0:y1, x0:x1]
    if sub.size and sub.max() > 60:
        yy, xx = np.unravel_index(np.argmax(sub), sub.shape)
        return (x0 + xx) / L.shape[1], (y0 + yy) / L.shape[0]
    return cx / L.shape[1], bottom / L.shape[0]

def main():
    items = json.loads(Path(sys.argv[1]).read_text())
    by = {it["id"]: it for it in items}
    for d in ("media/v", "media/s", "media/u"):
        (ROOT / d).mkdir(parents=True, exist_ok=True)
    rows = []
    for cid, name, short in NAMES:
        it = by[cid]
        v = get(it["video"], RAW / f"{cid}.mp4")
        s = get(it["still"], RAW / f"{cid}-lit.png")
        u = get(it["unlit"], RAW / f"{cid}-unlit.png")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(v), "-an", "-c:v", "copy", "-movflags", "+faststart",
                        str(ROOT / f"media/v/{cid}.mp4")], check=True)
        lit = Image.open(s).convert("RGB").resize((W, H), Image.LANCZOS)
        unl = Image.open(u).convert("RGB").resize((W, H), Image.LANCZOS)
        lit.save(ROOT / f"media/s/{cid}.jpg", quality=84)
        unl.save(ROOT / f"media/u/{cid}.jpg", quality=84)
        tx, ty = tip_of(lit, unl, cid)
        # 見本: 灯りのまわりを 152x200 に切りぬく
        ch = int(H * 0.62); cw = int(ch * 152 / 200)
        cy = int(min(max(ty * H + ch * 0.12, ch / 2), H - ch / 2)); cx = W // 2
        lit.crop((cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2)).resize((152, 200), Image.LANCZOS).save(ROOT / f"icons/thumb-{cid}.jpg", quality=86)
        rows.append((cid, name, short, round(tx, 4), round(ty, 4), cid not in COVERED))
        print(cid, round(tx, 3), round(ty, 3))
    js = ["// ろうそくの顔ぶれ(20灯)。2026-10-23 から Higgsfield で作った動画・静止画で見せる(tools/media.py が作るファイル。手で直してもよい)。",
          "// tip = 芯の先の位置(絵の幅・高さに対する割合)。煙はここから出る。大きくするときの中心にもなる。smoke = 消したあとに煙を出すか",
          "export const CANDLES = ["]
    for cid, name, short, tx, ty, sm in rows:
        js.append(f"  {{ id: '{cid}', name: '{name}', short: '{short}', tip: [{tx}, {ty}], smoke: {'true' if sm else 'false'} }},")
    js += ["];", "",
           "export const SIZES = [{ id: 's', name: '小', zoom: 0.88 }, { id: 'm', name: '中', zoom: 1.0 }, { id: 'l', name: '大', zoom: 1.18 }];",
           "// 明るさ5段階(動画の明るさに かける数)",
           "export const BRIGHT = [0.5, 0.65, 0.82, 1.0, 1.15];",
           "export const WARMTH = [{ id: 'cool', name: '白っぽく', v: 0.0 }, { id: 'mid', name: 'ふつう', v: 0.5 }, { id: 'warm', name: 'あたたかく', v: 1.0 }];",
           ""]
    (ROOT / "js/candles.js").write_text("\n".join(js))
    print("ok", len(rows))

main()
