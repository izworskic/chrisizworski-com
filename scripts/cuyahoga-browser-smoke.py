#!/usr/bin/env python3
"""One-time browser acceptance for noindex Cuyahoga preview. No visitor actions."""
import asyncio, json, os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:8765/cuyahoga-freighter-watch/"
OUT = Path(os.environ.get("CUYAHOGA_QA_OUTPUT", "/tmp/cuyahoga-preview-qa"))
OUT.mkdir(parents=True, exist_ok=True)
NOW = datetime.now(timezone.utc)

def iso(t):
    return t.isoformat(timespec="seconds").replace("+00:00", "Z")

async def run():
    async with async_playwright() as p:
        chromium = p.chromium
        executable = next((x for x in ("/usr/bin/google-chrome", "/usr/bin/chromium", "/opt/google/chrome/chrome") if Path(x).exists()), None)
        launch_options = {"headless": True, "args": ["--no-sandbox"]}
        if executable:
            launch_options["executable_path"] = executable
        browser = await chromium.launch(**launch_options)
        cases = []
        for width, height in ((390, 844), (1280, 900)):
            context = await browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce", device_scale_factor=1)
            page = await context.new_page()
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))
            now = iso(NOW - timedelta(seconds=90))
            feed = {
                "ok": True,
                "checkedAt": iso(NOW - timedelta(seconds=15)),
                "vessels": [
                    {"mmsi": "367123456", "name": "BROWSER TEST SHIP", "seen": now,
                     "lat": 41.4945, "lon": -81.7033, "speedKnots": 2.4,
                     "lengthMeters": 180, "shipType": 70, "source": "mock AIS QA"},
                    {"mmsi": "367123457", "name": "STALE SHIP", "seen": iso(NOW - timedelta(minutes=42)),
                     "lat": 41.4945, "lon": -81.7033, "speedKnots": 0.2, "lengthMeters": 190,
                     "shipType": 70, "source": "mock AIS QA"}
                ]
            }
            await page.route("**/api/freighter-ais", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(feed)))
            await page.goto(URL, wait_until="domcontentloaded", timeout=40000)
            await page.get_by_text("BROWSER TEST SHIP", exact=True).first.wait_for(timeout=25000)
            if await page.get_by_text("STALE SHIP", exact=True).count():
                raise AssertionError("Stale AIS still visible")
            marker_count = await page.locator(".pin-vessel").count()
            if marker_count != 1:
                raise AssertionError(f"Expected one recent marker, found {marker_count}")
            await page.get_by_role("button", name="Scranton Flats Pier").click()
            await page.locator("#river-focus h3").get_by_text("Scranton Flats Pier").wait_for()
            if await page.locator("#river-focus a[href*='clevelandmetroparks']").count() != 1:
                raise AssertionError("Missing park manager handoff")
            await page.locator("#show-history").click()
            await page.locator("#history-controls").wait_for(state="visible")
            await page.get_by_text("NOAA fix 1 of 434").wait_for(timeout=15000)
            if await page.locator(".pin-vessel").count() != 0:
                raise AssertionError("Live markers leaked into historical mode")
            await page.locator("#history-next").click()
            await page.get_by_text("NOAA fix 2 of 434").wait_for()
            await page.locator("#voyage-select").select_option("laud-2025-08-15")
            await page.get_by_text("NOAA fix 1 of 215").wait_for()
            await page.locator("#show-live").click()
            await page.get_by_text("BROWSER TEST SHIP", exact=True).first.wait_for()
            if await page.locator(".pin-historic").count():
                raise AssertionError("Historic marker leaked into recent mode")
            # A -> B -> A history must reset to same previously selected vessel/day state.
            await page.locator("#show-history").click()
            await page.get_by_text("NOAA fix 1 of 215").wait_for()
            overflow = await page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2")
            if overflow:
                raise AssertionError(f"Horizontal page overflow at {width}px")
            if errors:
                raise AssertionError("Page JS errors: " + "; ".join(errors[:5]))
            tiles = await page.locator(".leaflet-tile-loaded").count()
            if not tiles:
                raise AssertionError("Map tiles not loaded; browser acceptance blocked")
            filename = OUT / f"cuyahoga-{width}-history.png"
            await page.screenshot(path=str(filename), full_page=True, animations="disabled")
            cases.append({"viewport":width,"status":"PASS","tilesLoaded":tiles,"liveShipMarkers":marker_count,
                          "archiveSelected":"laud-2025-08-15","screenshots":filename.name,"jsErrors":errors})
            await context.close()
        nojs = await browser.new_context(viewport={"width":390,"height":844}, java_script_enabled=False)
        page = await nojs.new_page()
        await page.goto(URL, wait_until="domcontentloaded")
        await page.get_by_text("Interactive vessel markers require JavaScript").wait_for()
        assert await page.locator("noscript a[href*='clevelandmetroparks']").count() == 4
        cases.append({"viewport":390,"javascript":False,"status":"PASS","fallbackParkLinks":4})
        await nojs.close()
        await browser.close()
        (OUT/"browser-acceptance.json").write_text(json.dumps({"url":URL,"cases":cases,"status":"PASSED_LOCAL_BROWSER"},indent=2)+"\n")
        print(json.dumps({"status":"PASSED_LOCAL_BROWSER","cases":cases}))
if __name__ == "__main__":
    asyncio.run(run())
