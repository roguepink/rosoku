#!/usr/bin/env python3
"""アプリの画面をスマホのふりで開いて、順番に操作して写真をとる(音なし・画面なし)。
  ~/.local/venvs/ryokoshi/bin/python tools/ui.py [--size 390x844]
"""
import argparse, functools, http.server, socketserver, threading, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass
ap = argparse.ArgumentParser(); ap.add_argument("--size", default="390x844"); ap.add_argument("--out", default="_check/ui")
a = ap.parse_args()
from playwright.sync_api import sync_playwright
out = ROOT / a.out; out.parent.mkdir(parents=True, exist_ok=True)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(H, directory=str(ROOT))) as srv:
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    w, h = (int(x) for x in a.size.split("x"))
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, headless=True, args=["--mute-audio", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"])
        ctx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); errs = []
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/index.html")
        def shot(name, wait=0):
            time.sleep(wait); pg.screenshot(path=str(out) + f"-{name}.png"); print("saved", name)
        shot("1-start", 3.2)
        pg.mouse.click(w/2, h/2); shot("2-lit", 3.5)
        pg.mouse.click(w/2, h/2); shot("3-ui", 0.8)
        pg.evaluate("__itto.openSheet('adjust')"); shot("4-adjust", 0.6)
        pg.evaluate("__itto.openSheet('pick')"); shot("5-pick", 0.6)
        pg.evaluate("__itto.openSheet('sleep')"); shot("6-sleep", 0.6)
        pg.evaluate("__itto.changeCandle(4)"); shot("7-change", 4.0)
        for e in errs: print(e)
        br.close()
