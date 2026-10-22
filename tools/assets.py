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
ids = re.findall(r"id: '([^']+)', name", (ROOT / "js/candles.js").read_text())[:20]
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(H, directory=str(ROOT))) as srv:
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}"
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, headless=True, args=["--mute-audio", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"])
        # アイコン: 場面そのものから切りぬく(小さな灯。土壁の光のたまり と 漆の映り込み)
        pg = br.new_page(viewport={"width": 600, "height": 900}, device_scale_factor=2)
        pg.goto(f"{base}/tools/view.html?c={ids.index('tea')}&sway=0&b=2"); time.sleep(3)   # アイコンは いつも「小さな灯」
        pos = pg.evaluate("""(() => { const s = __s, cv = s.canvas, f = s.framing(cv.width, cv.height), d = s.candleDims(), c = d.c;
          const top = c.holder.H + d.H; const fy = top - c.depth + d.wl*0.55 + d.fh*0.45;
          return { x: f.ox / cv.width, y: 1 - (f.oy + fy * f.S) / cv.height, s: f.S / cv.height, fh: d.fh }; })()""")
        full = Image.open(io.BytesIO(pg.screenshot())).convert("RGB")
        W, Hh = full.size
        side = int(pos["s"] * Hh * pos["fh"] * 7.0)
        cx, cy = int(pos["x"] * W), int(pos["y"] * Hh + side * 0.18)
        sq = full.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2))
        for name, size in [("icon-512", 512), ("icon-192", 192), ("apple-touch-icon", 180)]:
            sq.resize((size, size), Image.LANCZOS).save(ROOT / f"icons/{name}.png"); print(name)
        m = Image.new("RGB", (512, 512), (0, 0, 0)); m.paste(sq.resize((372, 372), Image.LANCZOS), (70, 70))
        big = sq.resize((512, 512), Image.LANCZOS)
        from PIL import ImageFilter
        bg = big.filter(ImageFilter.GaussianBlur(30)); bg.paste(sq.resize((372, 372), Image.LANCZOS), (70, 70))
        bg.save(ROOT / "icons/maskable-512.png"); print("maskable")
        # 見本(ろうそくを選ぶところ)
        pg = br.new_page(viewport={"width": 360, "height": 640}, device_scale_factor=1)
        for i, cid in enumerate(ids):
            pg.goto(f"{base}/tools/view.html?c={i}&sway=0&b=2"); time.sleep(2.5)
            box = pg.evaluate("""(() => { const s = __s, cv = s.canvas, f = s.framing(cv.width, cv.height), d = s.candleDims(), c = d.c;
              let top = c.holder.H + d.H - c.depth + d.wl*0.55 + d.fh*1.05; if (c.cover) top = Math.max(top, c.cover.y1 + 0.3*c.cover.R*0.2 + 0.4);
              return { top: 1 - (f.oy + top * f.S) / cv.height, base: 1 - f.oy / cv.height }; })()""")
            im = Image.open(io.BytesIO(pg.screenshot())).convert("RGB")
            W, Hh = im.size
            t, bse = box["top"] * Hh, box["base"] * Hh
            h = (bse - t) / 0.72                      # ろうそくが 画像の高さの 7割ほど
            y0 = t - h * 0.16; w = h * 152 / 200
            if w > W:                                   # 横にはみ出すときは 小さめに切る
                cy = y0 + h / 2; w = W; h = w * 200 / 152; y0 = cy - h / 2
            im = im.crop((int(W / 2 - w / 2), int(y0), int(W / 2 + w / 2), int(y0 + h))).resize((152, 200), Image.LANCZOS)
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
