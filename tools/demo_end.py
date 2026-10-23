#!/usr/bin/env python3
"""タイマーの終わり方「案1(静止画+計算でえがく煙)」と「案2(AIの消える動画)」をくらべる動画を作る。
  ~/.local/venvs/ryokoshi/bin/python tools/demo_end.py <くり返し動画> <火が消えた静止画> <消える動画> <芯の先x> <芯の先y> <出力.mp4>
  芯の先の位置は、静止画(752x1344)の上の座標。
"""
import sys, subprocess, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

loop, unlit, ext, tx, ty, out = sys.argv[1:7]
W, H, FPS = 716, 1280, 24
k = W / 752
TIPX, TIPY = float(tx) * k, float(ty) * k
S = 28.0                      # 1cm が何ピクセルか(だいたい)
FONT = "/System/Library/Fonts/ヒラギノ明朝 ProN.ttc"

def frames(path):
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32)

def hash2(x, y):
    v = np.sin(x * 127.1 + y * 311.7) * 43758.5453
    return v - np.floor(v)
def vnoise(x, y):
    xi, yi = np.floor(x), np.floor(y); xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    a, b, c, d = hash2(xi, yi), hash2(xi + 1, yi), hash2(xi, yi + 1), hash2(xi + 1, yi + 1)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# 煙(アプリのシェーダーと同じ式)
ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
YY = (TIPY - ys) / S          # 芯の先からの高さ cm
XX = (xs - TIPX) / S
def smoke(age):
    v = 15.0; head = age * v; tail = max(age - 3.0, 0.0) * v * 1.1
    yy = np.maximum(YY, 0)
    tur = sstep(5.0, 9.0, yy)
    drift = ((vnoise(yy * 0.15 - age * 0.35, 7.0) - 0.5) * (yy - 4.0) * 0.6 + np.sin(yy * 0.55 - age * 1.6) * 0.25 * np.sqrt(yy)) * tur \
            + (vnoise(yy * 0.4, np.full_like(yy, age)) - 0.5) * 0.08
    wid = 0.03 + yy * 0.008 + tur * yy * 0.03
    d = (XX - drift) / wid
    dens = np.exp(-d * d) * sstep(head + 1.0, head - 2.5, yy) * sstep(tail - 1.0, tail + 3.5, yy)
    dens *= np.exp(-yy / 16.0) / (1.0 + yy * 0.12)
    dens[YY < 0] = 0
    return np.clip(dens * 0.8, 0, 1)

def card(lines, secs):
    im = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(im)
    y = H * 0.42
    for text, size, col in lines:
        f = ImageFont.truetype(FONT, size); w = d.textlength(text, font=f)
        d.text(((W - w) / 2, y), text, font=f, fill=col); y += size * 1.9
    a = np.asarray(im).astype(np.float32)
    n = int(secs * FPS)
    for i in range(n):
        f = min(1, i / 8, (n - 1 - i) / 8); yield a * f

def label(a, text):
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, 26); d.text((24, 24), text, font=f, fill=(190, 175, 150))
    return np.asarray(im).astype(np.float32)

enc = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
def put(a): enc.stdin.write(a.clip(0, 255).astype(np.uint8).tobytes())

unl = np.asarray(Image.open(unlit).convert("RGB").resize((W, H), Image.LANCZOS)).astype(np.float32)
smokeCol = np.array([150, 140, 128], np.float32)

# ---- 案1 ----
for a in card([("案1", 64, (232, 168, 90)), ("動画 → 火が消えた静止画 → 計算でえがく煙", 30, (201, 184, 154)), ("クレジット:20個で 約5", 26, (150, 135, 115))], 3.0): put(a)
lf = list(frames(loop)); n = len(lf)
last = None
for i, a in enumerate(lf):                      # 10秒: 後半で ゆっくり暗くなる(アプリでは最後の30秒)
    t = i / FPS
    br = 1.0 - 0.45 * sstep(4.0, 10.0, t)
    last = a * br; put(label(last, "案1"))
for i in range(int(1.0 * FPS)):                 # 1秒で 火が消えた静止画へ
    f = (i + 1) / (1.0 * FPS); put(label(last * (1 - f) + unl * f, "案1"))
for i in range(int(9.0 * FPS)):                 # 煙がのぼる。芯の赤い火は 5秒で消える
    age = i / FPS
    dens = smoke(age)[..., None]
    a = unl.copy()
    ember = max(0.0, 1 - age / 5.0)
    g = np.exp(-(((xs - TIPX) ** 2 + (ys - TIPY) ** 2) / (6.0 ** 2)))[..., None]
    a = a * (1 - g * 0.5 * (1 - ember))           # 赤い火が だんだん暗く
    a = a * (1 - dens) + smokeCol * dens
    fade = 1.0 - sstep(5.0, 9.0, age)             # 最後は 真っ黒へ(アプリでは15秒)
    put(label(a * fade, "案1"))
for i in range(int(1.0 * FPS)): put(np.zeros((H, W, 3), np.float32))

# ---- 案2 ----
for a in card([("案2", 64, (232, 168, 90)), ("動画 → AIが作った「消えていく動画」", 30, (201, 184, 154)), ("クレジット:20個で 約150", 26, (150, 135, 115))], 3.0): put(a)
for a in lf: put(label(a, "案2"))
ef = list(frames(ext))
for a in ef: put(label(a, "案2"))
lastE = ef[-1]
for i in range(int(4.0 * FPS)):
    put(label(lastE * (1 - sstep(0.0, 4.0, i / FPS)), "案2"))
for i in range(int(1.0 * FPS)): put(np.zeros((H, W, 3), np.float32))
enc.stdin.close(); enc.wait()
print("ok", out)
