#!/usr/bin/env python3
"""炎の箱(緑)と芯の先(紫)を、火がついた画像に描いて1枚に並べる → _check/flow/boxes.jpg"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
from flow_media import C, flame_of, tip_of, RAW, W, H
tiles = []
for cid, *_ in C:
    s, u = RAW / f"{cid}-lit.jpg", RAW / f"{cid}-unlit.jpg"
    if not (s.exists() and u.exists()):
        continue
    lit = Image.open(s).convert("RGB").resize((W, H)); unl = Image.open(u).convert("RGB").resize((W, H))
    cx, top, base, w = flame_of(lit, cid); tx, ty = tip_of(lit, unl, cid)
    d = ImageDraw.Draw(lit)
    d.rectangle([(cx - w / 2) * W, top * H, (cx + w / 2) * W, base * H], outline=(0, 255, 0), width=4)
    d.ellipse([tx * W - 10, ty * H - 10, tx * W + 10, ty * H + 10], outline=(255, 0, 255), width=4)
    tiles.append(lit.resize((179, 320)))
    print(cid, [cx, top, base, w], round(tx, 3), round(ty, 3))
sheet = Image.new("RGB", (179 * len(tiles), 320))
for i, t in enumerate(tiles):
    sheet.paste(t, (179 * i, 0))
sheet.save(RAW.parent / "boxes.jpg")
