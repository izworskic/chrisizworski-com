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
            if width in (390, 1280):
                page.screenshot(path=str(OUT / f"lab-{width}.png"), full_page=True)

            # Changing either specimen must not change the other. Exercise both
            # directions and keep the mixed states long enough to inspect them.
            left, right = groups.nth(0), groups.nth(1)
            left_ships = left.get_by_role("button", name="Show ships")
            left_places = left.get_by_role("button", name="Viewing places")
            right_ships = right.get_by_role("button", name="Show ships")
            right_places = right.get_by_role("button", name="Viewing places")
            left_result = left.locator("..").locator("[data-result]")
            right_result = right.locator("..").locator("[data-result]")
            left_ships.focus()
            page.keyboard.press("Tab")
            assert left_places.evaluate("(el) => el === document.activeElement && el.matches(':focus-visible')")
            page.keyboard.press("Enter")
            assert left_places.get_attribute("aria-pressed") == "true"
            assert left_result.inner_text() == "Selected view: viewing places"
            assert right_ships.get_attribute("aria-pressed") == "true"
            assert right_result.inner_text() == "Selected view: ship reports"
            if width in (390, 1280):
                page.screenshot(path=str(OUT / f"lab-{width}-alternate-focus.png"), full_page=True)
            right_places.click()
            assert left_places.get_attribute("aria-pressed") == "true"
            assert right_places.get_attribute("aria-pressed") == "true"
            left_ships.click()
            assert right_places.get_attribute("aria-pressed") == "true"
            assert right_result.inner_text() == "Selected view: viewing places"
            assert left_result.inner_text() == "Selected view: ship reports"
            right_ships.click()
            assert left_ships.get_attribute("aria-pressed") == "true"
            assert right_ships.get_attribute("aria-pressed") == "true"
            # Cross-family roles retain their own palette and actual native behavior.
            snow = page.locator(".reference-snow")
            journey = page.locator(".reference-journey")
            assert snow.get_by_text("Not reported", exact=True).is_visible()
            assert journey.get_by_text("Not calculated", exact=True).is_visible()
            assert snow.evaluate("(e) => getComputedStyle(e).getPropertyValue('--pd-type-body').trim()") == "16px"
            assert journey.evaluate("(e) => getComputedStyle(e).getPropertyValue('--pd-accent').trim()") == "#2c5f2d"
            assert snow.evaluate("(e) => getComputedStyle(e).getPropertyValue('--pd-accent').trim()") == "#17476f"
            summary = journey.locator("summary")
            assert summary.bounding_box()["height"] >= 44
            summary.focus()
            summary.press("Enter")
            assert journey.locator("details").evaluate("(e) => e.open")
            assert journey.get_by_text("Check actual access,", exact=False).is_visible()
            summary.press("Enter")
            assert not journey.locator("details").evaluate("(e) => e.open")
            if width in (390, 1280):
                page.locator("#reference-title").scroll_into_view_if_needed()
                page.screenshot(path=str(OUT / f"lab-{width}-cross-family.png"), full_page=True)
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
            assert not errors, errors
            page.close()
        page = browser.new_page(java_script_enabled=False, viewport={"width": 390, "height": 844})
        page.goto(URL)
        assert page.locator("#glyphs li").count() == 9
        assert page.locator("noscript").is_visible()
        assert page.get_by_text("Type unknown", exact=True).is_visible()
        assert page.locator("#glyphs svg").count() == 0
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert "Selection does not change" in page.locator("noscript").inner_text()
        group = page.locator(".actions[role=group]").first
        group.get_by_role("button", name="Viewing places").click()
        assert group.get_by_role("button", name="Show ships").get_attribute("aria-pressed") == "true"
        assert group.locator("..").locator("[data-result]").inner_text() == "Selected view: ship reports"
        native_details = page.locator("#journey-details")
        native_details.locator("summary").click()
        assert native_details.evaluate("(e) => e.open")
        assert page.get_by_text("Not calculated", exact=True).is_visible()
        page.screenshot(path=str(OUT / "lab-390-no-js.png"), full_page=True)
        page.close()
    finally:
        browser.close()

print(f"Browser assertions passed at {WIDTHS}; screenshots: {OUT}")
print("Human screenshot review still required; not a production visual approval.")
