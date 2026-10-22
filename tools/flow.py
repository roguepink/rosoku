#!/usr/bin/env python3
"""音楽とおやすみ(タイマー)の流れを自動で確かめる。音は出ない。曲はテスト用の音をその場で作る(リポジトリには入れない)。
  ~/.local/venvs/ryokoshi/bin/python tools/flow.py
"""
import functools, http.server, socketserver, threading, time, io, json, math, struct, wave
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass
def tone(freq, secs=12):
    b = io.BytesIO(); w = wave.open(b, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
    w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * freq * i / 22050))) for i in range(22050 * secs)))
    w.close(); return b.getvalue()
from playwright.sync_api import sync_playwright
out = ROOT / "_check"; out.mkdir(exist_ok=True)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(H, directory=str(ROOT))) as srv:
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, headless=True, args=["--mute-audio", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=user-gesture-required"])
        ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); errs = []
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        td = out / "music-test"; td.mkdir(exist_ok=True)
        for i, f in enumerate([330, 440, 550]):
            (td / f"t{i+1}.wav").write_bytes(tone(f))
        tracks = [{"file": f"../_check/music-test/t{i}.wav", "title": f"テストの曲 {i}"} for i in (1, 2, 3)]
        pg.route("**/music/tracks.json", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(tracks)))
        pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/index.html")
        time.sleep(2.5)
        pg.mouse.click(195, 400); time.sleep(3)          # 灯す
        pg.mouse.click(195, 400); time.sleep(0.6)        # 操作を出す
        print("music button visible:", pg.is_visible("#musicBtn"))
        pg.click("#musicBtn"); time.sleep(0.4); pg.click("#mplay"); time.sleep(2)
        st = lambda: pg.evaluate("({playing: __itto.music.playing, idx: __itto.music.idx, t: __itto.music.audio.currentTime, paused: __itto.music.audio.paused, err: __itto.music.audio.error && __itto.music.audio.error.code, src: __itto.music.audio.src.slice(-6), rs: __itto.music.audio.readyState, gain: __itto.music.gain && +__itto.music.gain.gain.value.toFixed(3), phase: __itto.phase})")
        print("after play 2s:", st())
        time.sleep(0.1)
        pg.screenshot(path=str(out / "flow-adjust-music.png"))
        time.sleep(4); print("after 6s:", st())
        time.sleep(10); print("after 16s:", st()); time.sleep(4); print("after 20s (曲がかわるはず):", st()); time.sleep(3); print("after 23s:", st())
        if "--quick" in __import__("sys").argv:
            [print(e) for e in errs]; br.close(); raise SystemExit
        # おやすみ: 70秒で終わるようにする
        pg.evaluate("__itto.sleepSecs(70)")
        time.sleep(15); print("sleep, 55s left:", st())
        time.sleep(30); print("sleep, 25s left (炎 小さく):", st()); pg.screenshot(path=str(out / "flow-shrink.png"))
        time.sleep(26.5); print("sleep end:", st())
        time.sleep(1.5); pg.screenshot(path=str(out / "flow-smoke1.png"))
        time.sleep(2); pg.screenshot(path=str(out / "flow-smoke2.png"))
        time.sleep(25); print("after fade:", st(), "running:", pg.evaluate("__itto.scene.running"))
        pg.screenshot(path=str(out / "flow-black.png"))
        pg.mouse.click(195, 400); time.sleep(0.5)
        print("relight visible:", pg.is_visible("#relight"))
        pg.click("#relight"); time.sleep(3); print("relit:", st())
        for e in errs: print(e)
        br.close()
