#!/usr/bin/env python3
"""Google Flow で作った 画像・動画を、アプリで使う形にそろえる(2026-10-24 作り直し)。
  ~/.local/venvs/ryokoshi/bin/python tools/flow_media.py

  入れるもの(_check/flow/raw/、Git に入れない):
    <id>-lit.jpg    火がついた画像(Flow の「元のサイズ」768x1376)
    <id>-unlit.jpg  火が消えた画像(火がついた画像を Flow で直したもの)
    <id>.mp4        炎の動画(Veo 3.1 Lite・8秒・最初と最後が火がついた画像)
  作るもの:
    media/v|s|u/<id>   動画・火がついた静止画・火が消えた静止画(716x1280)
    icons/thumb-<id>.jpg  ろうそくを選ぶ画面の見本
    js/candles.js      一覧(名前・芯の先・炎の位置と大きさ・息)
  指示文と並び順は tools/flow_prompts.py
"""
import subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from flow_prompts import C, COVERED

RAW = ROOT / "_check/flow/raw"
W, H = 716, 1280
MEDIA_V = 2          # 動画・静止画を作り直したら 1つ上げる(スマホに覚えた古い絵を使わせないため)
WA = {"wa-shiro", "shu", "botan", "kin", "wa-e", "kinari", "ume", "kiku", "hyakume", "ayame", "nejiri"}


def bright(lit):
    L = np.asarray(lit.convert("L"), dtype=np.float32)
    L[int(L.shape[0] * 0.72):] = 0          # 下は 台への映り込みなので 見ない
    thr = max(200, np.percentile(L, 99.8))
    ys, xs = np.where(L >= thr)
    return L, ys, xs


def tip_of(lit, unlit, cid):
    """芯の先(煙が出る所)と、大きくするときの中心。0〜1 の割合"""
    L, ys, xs = bright(lit)
    cx, cy = float(np.median(xs)), float(np.median(ys))
    if cid in COVERED:
        return cx / W, cy / H
    bottom = float(np.percentile(ys, 97))
    U = np.asarray(unlit.convert("RGB"), dtype=np.float32)
    red = (U[..., 0] - U[..., 1]) * (U[..., 0] > 50)
    y0, y1 = int(max(0, cy - 0.12 * H)), int(min(H, bottom + 0.05 * H))
    x0, x1 = int(max(0, cx - 0.06 * W)), int(min(W, cx + 0.06 * W))
    sub = red[y0:y1, x0:x1]
    if sub.size and sub.max() > 60:
        yy, xx = np.unravel_index(np.argmax(sub), sub.shape)
        return (x0 + xx) / W, (y0 + yy) / H
    return cx / W, bottom / H


def flame_of(lit, cid):
    """炎の箱 [中心x, 上, 根元, 幅](割合)。ここだけ ゆらす"""
    L, ys, xs = bright(lit)
    cx = float(np.median(xs)) / W
    top, base = float(np.percentile(ys, 1)) / H, float(np.percentile(ys, 99)) / H
    w = (float(np.percentile(xs, 97)) - float(np.percentile(xs, 3))) / W
    if cid not in COVERED:
        h = base - top
        top -= h * 0.25                     # 炎の外側の うすい所も入れる
        w = min(max(w * 1.3, 0.016), 0.06)
    return [round(cx, 4), round(top, 4), round(base, 4), round(w, 4)]


def breath_of(cid):
    if cid in WA:
        return "{ amp: 0.10, freq: 0.12 }"
    if cid == "toumyou":
        return "{ amp: 0.05, freq: 0.25 }"
    return "{ amp: 0.03, freq: 0.18 }"


def main():
    for d in ("media/v", "media/s", "media/u"):
        (ROOT / d).mkdir(parents=True, exist_ok=True)
    rows, missing = [], []
    for cid, name, short, *_ in C:
        v, s, u = RAW / f"{cid}.mp4", RAW / f"{cid}-lit.jpg", RAW / f"{cid}-unlit.jpg"
        if not (v.exists() and s.exists() and u.exists()):
            missing.append(cid); continue
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(v), "-an",
                        "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
                        "-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                        str(ROOT / f"media/v/{cid}.mp4")], check=True)
        lit = Image.open(s).convert("RGB").resize((W, H), Image.LANCZOS)
        unl = Image.open(u).convert("RGB").resize((W, H), Image.LANCZOS)
        lit.save(ROOT / f"media/s/{cid}.jpg", quality=84)
        unl.save(ROOT / f"media/u/{cid}.jpg", quality=84)
        tx, ty = tip_of(lit, unl, cid)
        fl = flame_of(lit, cid)
        if cid in COVERED:
            tx = 0.5                        # かさの中の灯り: 明るい所が片よっても 大きくする中心は まん中
        elif abs(tx - fl[0]) > 0.03:        # 芯の先が 炎から はずれたら 炎の根元にする
            tx, ty = fl[0], fl[2]
        # 見本: 灯りのまわりを 3:4 に切りぬく(選ぶ画面は3列なので大きめに)
        ch = int(H * 0.62); cw = int(ch * 3 / 4)
        cy = int(min(max(ty * H + ch * 0.12, ch / 2), H - ch / 2)); cx = W // 2
        lit.crop((cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2)).resize((240, 320), Image.LANCZOS).save(ROOT / f"icons/thumb-{cid}.jpg", quality=84)
        rows.append((cid, name, short, round(tx, 4), round(ty, 4), cid not in COVERED, fl, breath_of(cid)))
        print(cid, round(tx, 3), round(ty, 3), fl)
    if missing:
        print("まだ そろっていない:", " ".join(missing))
    js = ["// ろうそくの顔ぶれ。2026-10-24 Google Flow で作り直し(背景は ろうそくごとに合う場所)。tools/flow_media.py が作る(手で直してもよい)。",
          "// tip = 芯の先の位置(絵の幅・高さに対する割合)。煙はここから出る。大きくするときの中心にもなる。smoke = 消したあとに煙を出すか",
          "// flame = [炎の中心x, 炎の上, 炎の根元, 炎の幅](割合)。動きを足す所。breath = 炎ののび縮み(和ろうそくは ゆっくり大きく)",
          f"export const MEDIA_V = {MEDIA_V};   // 絵と動画を作り直したら上げる",
          "export const CANDLES = ["]
    for cid, name, short, tx, ty, sm, fl, br in rows:
        js.append(f"  {{ id: '{cid}', name: '{name}', short: '{short}', tip: [{tx}, {ty}], smoke: {'true' if sm else 'false'}, flame: {fl}, breath: {br} }},")
    old = (ROOT / "js/candles.js").read_text()
    tail = old[old.index("// ゆれの3段階"):]
    js += ["];", "", tail]
    (ROOT / "js/candles.js").write_text("\n".join(js))
    print("ok", len(rows))


if __name__ == "__main__":
    main()
