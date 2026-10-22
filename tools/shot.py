#!/usr/bin/env python3
"""ページを Mac の Chrome(画面なし・音なし)で開いて写真をとる。
  ~/.local/venvs/ryokoshi/bin/python tools/shot.py "tools/view.html?c=0" --size 390x844 --wait 3 --out _check/a.png [--eval JS]
"""
import argparse, functools, http.server, socketserver, threading, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass
ap = argparse.ArgumentParser()
ap.add_argument("url"); ap.add_argument("--size", default="390x844"); ap.add_argument("--wait", type=float, default=3)
ap.add_argument("--out", default="_check/shot.png"); ap.add_argument("--eval", default=""); ap.add_argument("--shots", type=int, default=1)
ap.add_argument("--gap", type=float, default=1.0); ap.add_argument("--mobile", action="store_true"); ap.add_argument("--dpr", type=float, default=2)
a = ap.parse_args()
from playwright.sync_api import sync_playwright
out = ROOT / a.out; out.parent.mkdir(parents=True, exist_ok=True)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(H, directory=str(ROOT))) as srv:
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    w, h = (int(x) for x in a.size.split("x"))
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, headless=True, args=["--mute-audio", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"])
        ctx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=a.dpr, has_touch=a.mobile, is_mobile=a.mobile)
        pg = ctx.new_page(); errs = []
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/{a.url}")
        time.sleep(a.wait)
        if a.eval: print("eval:", pg.evaluate(a.eval))
        for i in range(a.shots):
            f = out if a.shots == 1 else out.with_name(f"{out.stem}-{i+1}{out.suffix}")
            pg.screenshot(path=str(f)); print("saved", f)
            if i < a.shots - 1: time.sleep(a.gap)
        for e in errs: print(e)
        br.close()
