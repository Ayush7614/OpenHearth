#!/usr/bin/env python3
"""Capture real README product screenshots from Pages + CLI."""

from __future__ import annotations

import html
import os
import pathlib
import re
import subprocess

from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).resolve().parents[1] / "docs" / "images"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = "https://ayush7614.github.io/OpenHearth/"
ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]|\[[0-9;]*m")


def strip_ansi(text: str) -> str:
    return ANSI_RE.sub("", text)


def capture_site() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)

        page = browser.new_page(viewport={"width": 1280, "height": 853})
        page.goto(BASE, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1500)
        page.screenshot(path=str(OUT / "landing.jpg"), type="jpeg", quality=88)
        print("landing ok")
        page.close()

        # Tall viewport so we can clip Trends + MoM compare into 1280×853
        context = browser.new_context(viewport={"width": 1280, "height": 1600})
        page = context.new_page()
        page.goto(BASE + "#/app", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1200)
        page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(1800)

        got_it = page.locator("#dismiss-onboard")
        if got_it.count() and got_it.is_visible():
            got_it.click()

        alice = page.locator('a.ws-card-main:has-text("Alice")')
        if alice.count():
            alice.first.click()
        else:
            page.locator(".ws-card-main").first.click()
        page.wait_for_timeout(2000)
        page.wait_for_selector("#chart-panel svg, #chart-panel canvas, #chart-panel .chart", timeout=10000)
        box = page.locator(".track-section").bounding_box() or {"y": 700}
        y = max(0, float(box["y"]) - 120)
        page.screenshot(
            path=str(OUT / "workspace.jpg"),
            type="jpeg",
            quality=90,
            clip={"x": 0, "y": y, "width": 1280, "height": 853},
        )
        print("workspace ok")

        page.goto(BASE + "#/app/board", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1500)
        compare = page.locator('button:has-text("Compare")')
        if compare.count() and compare.is_visible():
            compare.click()
            page.wait_for_timeout(800)
        page.set_viewport_size({"width": 1280, "height": 853})
        page.screenshot(path=str(OUT / "board.jpg"), type="jpeg", quality=88)
        print("board ok")
        browser.close()


def capture_cli() -> None:
    env = {**os.environ, "NO_COLOR": "1", "FORCE_COLOR": "0", "TERM": "dumb"}
    parts: list[str] = []
    for cmd in [
        ["npx", "--yes", "@felix-ayush/openhearth@2.3.0", "--version"],
        ["npx", "--yes", "@felix-ayush/openhearth@2.3.0", "doctor"],
        ["npx", "--yes", "@felix-ayush/openhearth@2.3.0", "--help"],
    ]:
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=180, check=False, env=env
            )
            parts.append(strip_ansi((result.stdout or "") + (result.stderr or "")))
        except Exception as exc:  # noqa: BLE001
            parts.append(str(exc))

    cli = "\n".join(parts)[:2400]
    safe = html.escape(cli)
    tmp = OUT / "_cli.html"
    tmp.write_text(
        f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;background:#0d1117}}
.term{{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13.5px;line-height:1.45;
color:#e6edf3;padding:28px 32px;white-space:pre-wrap;width:1280px;height:853px;box-sizing:border-box;overflow:hidden}}
.prompt{{color:#3fb950}}.accent{{color:#c48442}}
</style></head><body><div class="term"><span class="prompt">$</span> npx @felix-ayush/openhearth@2.3.0 --version
<span class="accent">{safe}</span>
</div></body></html>"""
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 853})
        page.goto(tmp.as_uri())
        page.screenshot(path=str(OUT / "cli.jpg"), type="jpeg", quality=88)
        print("cli ok")
        browser.close()
    tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    capture_site()
    capture_cli()
    print("done", sorted(p.name for p in OUT.iterdir()))
