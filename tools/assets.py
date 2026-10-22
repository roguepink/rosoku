#!/usr/bin/env python3
"""アイコン・ろうそくの見本画像・共有用の画像を作る。
  ~/.local/venvs/ryokoshi/bin/python tools/assets.py
"""
import functools, http.server, socketserver, threading, time, io, json, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
from playwright.sync_api import sync_playwright
ids = re.findall(r"id: '([^']+)'", (ROOT / "js/candles.js").read_text())[:6]
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(H, directory=str(ROOT))) as srv:
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}"
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, headless=True, args=["--mute-audio", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"])
        pg = br.new_page(viewport={"width": 512, "height": 512})
        for name, s, pad in [("icon-512", 512, 0), ("icon-192", 192, 0), ("apple-touch-icon", 180, 0), ("maskable-512", 512, 70)]:
            pg.goto(f"{base}/tools/icon.html?s={s}&pad={pad}"); time.sleep(0.3)
            pg.locator("#c").screenshot(path=str(ROOT / f"icons/{name}.png")); print(name)
        # 見本(ろうそくを選ぶところ)
        pg = br.new_page(viewport={"width": 300, "height": 420}, device_scale_factor=1)
        for i, cid in enumerate(ids):
            pg.goto(f"{base}/tools/view.html?c={i}&sway=0"); time.sleep(2.5)
            im = Image.open(io.BytesIO(pg.screenshot())).convert("RGB")
            im = im.crop((40, 40, 260, 330)).resize((152, 200), Image.LANCZOS)
            im.save(ROOT / f"icons/thumb-{cid}.jpg", quality=86); print("thumb", cid)
        # 共有用(LINE などに貼ったとき)
        pg = br.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        pg.goto(f"{base}/tools/view.html?c=0&sway=0&b=3"); time.sleep(3)
        im = Image.open(io.BytesIO(pg.screenshot())).convert("RGB")
        d = ImageDraw.Draw(im)
        f = ImageFont.truetype("/System/Library/Fonts/ヒラギノ明朝 ProN.ttc", 44)
        for j, ch in enumerate("一灯"):
            d.text((860, 190 + j * 80), ch, font=f, fill=(201, 184, 154))
        f2 = ImageFont.truetype("/System/Library/Fonts/ヒラギノ明朝 ProN.ttc", 22)
        d.text((800, 420), "電気を消して、一本だけ。", font=f2, fill=(170, 150, 120))
        im.save(ROOT / "icons/ogp.jpg", quality=86); print("ogp")
        br.close()
