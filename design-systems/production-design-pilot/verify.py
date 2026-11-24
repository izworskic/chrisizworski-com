"""Local-only Playwright verification; never updates an approved screenshot baseline.
Run from repo root: python3 design-systems/production-design-pilot/verify.py
Requires existing Python Playwright and a Chromium installation. No auto-install.
"""
from pathlib import Path
from tempfile import mkdtemp
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = Path(mkdtemp(prefix="production-design-pilot-"))
URL = (ROOT / "index.html").as_uri()
WIDTHS = (360, 390, 768, 1280, 1440)

with sync_playwright() as playwright:
    launch = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        launch["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = playwright.chromium.launch(**launch)
    try:
        for width in WIDTHS:
            page = browser.new_page(viewport={"width": width, "height": 900},
                                    reduced_motion="reduce")
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(URL, wait_until="load")
            assert page.locator("#glyphs svg").count() == 9, "Shared assets missing"
            assert page.locator("#glyph-status").inner_text() == "Shared icon factory loaded."
            assert page.locator(".type-unknown svg").count() == 1
            assert page.locator(".type-cargo svg").inner_html() != page.locator(".type-unknown svg").inner_html()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
            groups = page.locator(".actions[role=group]")
            assert groups.count() == 2
            for index in range(2):
                group = groups.nth(index)
                ships = group.get_by_role("button", name="Show ships")
                places = group.get_by_role("button", name="Viewing places")
                result = group.locator("..").locator("[data-result]")
                assert ships.get_attribute("aria-pressed") == "true"
                assert places.bounding_box()["height"] >= 44
                ships.focus()
                page.keyboard.press("Tab")
                assert places.evaluate("(el) => el === document.activeElement")
                assert places.evaluate("(el) => el.matches(':focus-visible')")
                places.press("Enter")
                assert places.get_attribute("aria-pressed") == "true"
                assert ships.get_attribute("aria-pressed") == "false"
                assert result.inner_text() == "Selected view: viewing places"
                ships.click()
                assert result.inner_text() == "Selected view: ship reports"
            assert page.locator("[data-state=unavailable] button").is_disabled()
            assert "Current position unavailable" in page.locator("[data-state=stale]").inner_text()
            assert not errors, errors
            if width in (390, 1280):
                page.screenshot(path=str(OUT / f"lab-{width}.png"), full_page=True)
            page.close()
        page = browser.new_page(java_script_enabled=False, viewport={"width": 390, "height": 844})
        page.goto(URL)
        assert page.locator("#glyphs li").count() == 9
        assert page.locator("noscript").is_visible()
        assert page.get_by_text("Type unknown", exact=True).is_visible()
        page.close()
    finally:
        browser.close()

print(f"Browser assertions passed at {WIDTHS}; screenshots: {OUT}")
print("Human screenshot review still required; not a production visual approval.")
