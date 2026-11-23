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
        for width, height in ((360, 780), (390, 844), (768, 1024), (1280, 900), (1440, 900)):
            context = await browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce", device_scale_factor=1)
            page = await context.new_page()
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))
            now = iso(NOW - timedelta(seconds=90))
            feed = {
                "ok": True, "scope": "cuyahoga-regional-openwaters",
                "checkedAt": iso(NOW - timedelta(seconds=15)),
                "vessels": [
                    {"mmsi": "367123456", "name": "BROWSER TEST SHIP", "seen": now,
                     "lat": 41.4945, "lon": -81.7033, "speedKnots": 2.4, "course": 90,
                     "lengthMeters": 180, "shipType": 70, "source": "mock AIS QA"},
                    {"mmsi": "367123457", "name": "STALE SHIP", "seen": iso(NOW - timedelta(minutes=42)),
                     "lat": 41.4945, "lon": -81.7033, "speedKnots": 0.2, "lengthMeters": 190,
                     "shipType": 70, "source": "mock AIS QA"}
                ]
            }
            await page.route("**/api/freighter-ais?region=cuyahoga", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(feed)))
            await page.goto(URL, wait_until="domcontentloaded", timeout=40000)
            await page.get_by_text("BROWSER TEST SHIP", exact=True).first.wait_for(timeout=25000)
            # Check the redesign's actual first screen, not only full-page snapshots.
            hero = await page.locator(".lead").bounding_box()
            river = await page.locator("#cuyahoga-map").bounding_box()
            if not hero or not river or river["y"] > height * 0.67:
                raise AssertionError(f"River map is still buried below the first screen at {width}px")
            if river["width"] < width * (0.72 if width < 830 else 0.43):
                raise AssertionError(f"River canvas too narrow at {width}px")
            if await page.locator(".place-button[aria-current=true][data-park=scranton]").count() != 1:
                raise AssertionError("Start at a real public park, not an empty focus panel")
            if await page.locator("#river-focus h3").inner_text() != "Scranton Flats Pier":
                raise AssertionError("Default park selection does not answer the visit question")
            await page.screenshot(path=str(OUT / f"cuyahoga-{width}-first-screen.png"), full_page=False, animations="disabled")
            axe_path = os.environ.get("CUYAHOGA_AXE_PATH")
            if axe_path:
                await page.add_script_tag(path=axe_path)
                audit = await page.evaluate("""async () => {
                    const result = await axe.run(document.querySelector('main'), {
                        runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}
                    });
                    return result.violations.map(v => ({
                        id:v.id,impact:v.impact,description:v.description,
                        nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary})).slice(0,8)
                    }));
                }""")
                (OUT / f"cuyahoga-{width}-axe.json").write_text(json.dumps(audit, indent=2)+"\\n")
                if any(x["impact"] in ("critical","serious") for x in audit):
                    raise AssertionError(f"Serious or critical axe accessibility violations at {width}px: " +
                                         json.dumps([x for x in audit if x["impact"] in ("critical","serious")])[:1800])

            if await page.get_by_text("STALE SHIP", exact=True).count():
                raise AssertionError("Stale AIS still visible")
            marker_count = await page.locator(".soo-ais-symbol").count()
            if marker_count != 1:
                raise AssertionError(f"Expected one recent marker, found {marker_count}")
            if await page.locator(".cuyahoga-ship-cargo").count() != 1:
                raise AssertionError("Cargo vessel missing its source-category silhouette")
            if await page.locator(".cuyahoga-vessel-icon svg").count() != 1:
                raise AssertionError("Soo Locks SVG vessel marker missing")
            if await page.locator(".river-ship-course").count():
                raise AssertionError("Cuyahoga must not overlay extra compass badges over Soo-style hulls")
            if await page.locator(".river-type-strip").evaluate("(el)=>el.open"):
                raise AssertionError("Advanced vessel-type filters must be collapsed by default")
            # The Soo Locks pattern is one on-map ship popup, never a hover card plus
            # another distant content card competing for the same click.
            await page.locator(".soo-ais-symbol").first.click()
            if await page.locator(".leaflet-popup").count() != 1:
                raise AssertionError("Selecting a vessel must open exactly one on-map popup")
            await page.locator("#live-vessels button[data-ship='367123456']").click()
            if await page.locator(".leaflet-popup").count() != 1:
                raise AssertionError("Ship-list selection stacked another popup")
            if not await page.locator(".leaflet-popup").get_by_text("BROWSER TEST SHIP").count():
                raise AssertionError("Vessel details missing from map popup")
            if await page.locator("#show-ships-on-map").inner_text() != "Show 1 ship":
                raise AssertionError("Live ship map control must display a verified report count")
            if await page.locator("#live-controls").count() != 1:
                raise AssertionError("Current AIS report list missing")
            if await page.locator(".pin-bridge").count() or await page.locator(".pin-work").count():
                raise AssertionError("Default river map should prioritize public parks and observed ships, not bridge pins")
            if await page.locator(".pin-park").count() != 4:
                raise AssertionError("Default river map missing four public viewing points")
            frame = await page.locator("#cuyahoga-map").bounding_box()
            for pin in await page.locator(".pin-park").all():
                location = await pin.bounding_box()
                if not frame or not location or (location["x"] < frame["x"] + 4 or
                    location["x"] + location["width"] > frame["x"] + frame["width"] - 4 or
                    location["y"] < frame["y"] + 4 or
                    location["y"] + location["height"] > frame["y"] + frame["height"] - 4):
                    raise AssertionError(f"Public park map marker clipped at {width}px: {location}")
            await page.screenshot(path=str(OUT / f"cuyahoga-{width}-live.png"), full_page=True, animations="disabled")
            await page.get_by_role("button", name="Scranton Flats Pier").click()
            await page.locator("#river-focus h3").get_by_text("Scranton Flats Pier").wait_for()
            if await page.locator("#river-focus a[href*='clevelandmetroparks']").count() != 1:
                raise AssertionError("Missing park manager handoff")
            if await page.locator(".park-signal").count() != 4:
                raise AssertionError("Missing source-labeled nearby report context on parks")
            await page.locator("#river-focus button.focus-action").get_by_text("Inspect this reported vessel").click()
            await page.locator("#river-focus h3").get_by_text("BROWSER TEST SHIP").wait_for()
            await page.locator(".bridge-picker summary").click()
            await page.wait_for_function("document.querySelectorAll('.pin-bridge').length === 4 && document.querySelectorAll('.pin-work').length === 1", timeout=6000)
            if await page.locator("#bridge-select option").count() != 20:
                raise AssertionError("NOAA main-channel bridge options were not loaded")
            await page.locator("#show-all-bridges").check()
            await page.wait_for_function("document.querySelectorAll('.pin-bridge').length === 18", timeout=6000)
            await page.locator("#show-all-bridges").uncheck()
            await page.wait_for_function("document.querySelectorAll('.pin-bridge').length === 4", timeout=6000)
            await page.locator("#bridge-select").select_option("eagle-280")
            await page.locator("#river-focus h3").get_by_text("Eagle Avenue bridge").wait_for()
            if await page.locator("#river-focus a[href*='navcen.uscg.gov']").count() != 1:
                raise AssertionError("Dated Coast Guard Eagle Avenue evidence link missing")
            if "opening" not in (await page.locator("#river-focus").inner_text()).lower():
                raise AssertionError("Bridge notice does not state opening limitations")
            # Return from a bridge's chart reference to a verified public park.
            await page.get_by_role("button", name="Rivergate Park").click()
            await page.locator("#river-focus h3").get_by_text("Rivergate Park").wait_for()
            if await page.locator(".place-button[aria-current=true][data-park=rivergate]").count() != 1:
                raise AssertionError("Bridge-to-park selection did not synchronize")
            if await page.locator("#river-focus a[href*='clevelandmetroparks']").count() != 1:
                raise AssertionError("Selected public park lost its official access link")
            if await page.locator("#show-history").count() or await page.locator("#history-controls").count():
                raise AssertionError("Outdated 2025 replay is still advertised on current map")
            await page.get_by_role("button", name="Scranton Flats Pier").click()
            await page.locator("#river-focus button.focus-action").get_by_text("Inspect this reported vessel").click()
            await page.locator("#river-focus h3").get_by_text("BROWSER TEST SHIP").wait_for()
            if await page.locator(".vessel-list button[aria-current=true]").count() != 1:
                raise AssertionError("Selected ship not reflected in vessel list")
            if await page.locator(".leaflet-marker-icon.is-active-vessel").count() != 1:
                raise AssertionError("Selected ship not reflected on map")
            await page.get_by_role("button", name="Scranton Flats Pier").click()
            if await page.locator(".leaflet-marker-icon.is-active-vessel").count():
                raise AssertionError("Returning to a park left the previous ship selected")
            photo = page.locator(".story-photo img")
            if await photo.count() != 1:
                raise AssertionError("Exact-subject licensed historical freighter photo missing")
            await photo.scroll_into_view_if_needed()
            await page.wait_for_timeout(1200)
            if not await photo.evaluate("(el) => el.complete && el.naturalWidth > 0"):
                raise AssertionError("Verified historical Wikimedia photo failed to load")
            if await page.locator(".story-photo figcaption a[href*='creativecommons.org/licenses/by/2.0']").count() != 1:
                raise AssertionError("Photo license credit is not visible")
            # The separate river-bend lesson is illustrative, not the observed AIS map.
            diagram = page.locator("#bend-diagram")
            if await diagram.count() != 1:
                raise AssertionError("River-bend vessel explanation missing")
            approach = page.locator("[data-bend-step='0']")
            middle = page.locator("[data-bend-step='1']")
            exit_turn = page.locator("[data-bend-step='2']")
            if await middle.is_disabled() or await page.locator("#bend-position").is_disabled():
                raise AssertionError("River-bend explainer controls did not initialize")
            original = await page.locator("#bend-ship").get_attribute("transform")
            await middle.click()
            if await middle.get_attribute("aria-pressed") != "true":
                raise AssertionError("Middle bend moment not selected")
            if "Mind both ends" not in await page.locator("#bend-stage-name").inner_text():
                raise AssertionError("Missing bow-and-stern explanation")
            mid_transform = await page.locator("#bend-ship").get_attribute("transform")
            if original == mid_transform:
                raise AssertionError("Illustration did not actually change")
            await exit_turn.click()
            if "stern" not in (await page.locator("#bend-stage-name").inner_text()).lower():
                raise AssertionError("Third stage explanation not synchronized")
            await approach.click()
            if await page.locator("#bend-ship").get_attribute("transform") != original:
                raise AssertionError("A → B → C → A did not restore the same scene")
            await page.locator("#bend-position").focus()
            await page.keyboard.press("End")
            if await page.locator("#bend-position").input_value() != "100":
                raise AssertionError("Native keyboard-accessible slider failed at the final endpoint")
            await page.keyboard.press("ArrowLeft")
            if await page.locator("#bend-position").input_value() != "99":
                raise AssertionError("Range input did not respond to the left arrow key")
            if not await page.locator("#bend-play").is_disabled():
                raise AssertionError("Reduced-motion viewport must not autoplay the diagram")
            await page.locator("#bend-reset").click()
            if await page.locator("#bend-position").input_value() != "12":
                raise AssertionError("Bend reset did not return to the approach")
            await diagram.screenshot(path=str(OUT / f"cuyahoga-{width}-bend-demo.png"))
            overflow = await page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2")
            if overflow:
                raise AssertionError(f"Horizontal page overflow at {width}px")
            if errors:
                raise AssertionError("Page JS errors: " + "; ".join(errors[:5]))
            tiles = await page.locator(".leaflet-tile-loaded").count()
            if not tiles:
                raise AssertionError("Map tiles not loaded; browser acceptance blocked")
            filename = OUT / f"cuyahoga-{width}-final-live.png"
            await page.screenshot(path=str(filename), full_page=True, animations="disabled")
            cases.append({"viewport":width,"status":"PASS","firstScreenMapY":round(river["y"]),"firstScreenMapWidth":round(river["width"]),"tilesLoaded":tiles,"liveShipMarkers":marker_count,
                          "visitorJourney":"ship-to-park-to-bridge-to-park","screenshots":filename.name,"jsErrors":errors})
            if width == 390:
                glyphs = await context.new_page()
                now = iso(NOW - timedelta(seconds=60))
                orientation_feed = {"ok": True, "scope": "cuyahoga-regional-openwaters", "checkedAt": iso(NOW - timedelta(seconds=5)), "vessels": [
                    {"mmsi":"367123456","name":"EASTBOUND TEST","seen":now,"lat":41.4945,"lon":-81.7033,"speedKnots":4.0,"course":90,"lengthMeters":190,"shipType":70},
                    {"mmsi":"367123458","name":"NORTHBOUND TEST","seen":now,"lat":41.492,"lon":-81.698,"speedKnots":5.0,"course":0,"lengthMeters":120,"shipType":80},
                    {"mmsi":"367123459","name":"STOPPED TEST","seen":now,"lat":41.491,"lon":-81.705,"speedKnots":0.1,"course":180,"lengthMeters":38,"shipType":31},
                    {"mmsi":"367123460","name":"HEADING AT BERTH","seen":now,"lat":41.490,"lon":-81.708,"speedKnots":0.0,"course":190,"heading":265,"lengthMeters":155,"shipType":70}
                ]}
                await glyphs.route("**/api/freighter-ais?region=cuyahoga", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(orientation_feed)))
                await glyphs.goto(URL, wait_until="domcontentloaded")
                await glyphs.get_by_text("EASTBOUND TEST", exact=True).first.wait_for(timeout=15000)
                if await glyphs.locator(".soo-ais-symbol").count() != 4:
                    raise AssertionError("All four AIS vessels must use Soo Locks symbol markers")
                if await glyphs.locator(".soo-ais-symbol .ship-hull").count() != 4:
                    raise AssertionError("Every moving and stopped AIS report needs a real ship silhouette")
                if await glyphs.locator(".river-ship-course").count():
                    raise AssertionError("Soo-style ship hulls must not have added compass badges")
                shapes = await glyphs.locator(".soo-ais-symbol svg").evaluate_all("(els)=>els.map(x=>x.outerHTML)")
                if any("rotate(" in value for value in shapes):
                    raise AssertionError("Side-profile ships may not rotate upside down with AIS travel course")
                if await glyphs.locator(".soo-ais-symbol.type-cargo").count() != 2:
                    raise AssertionError("Cargo silhouettes or reported type categories lost")
                if await glyphs.locator(".soo-ais-symbol.type-tanker").count() != 1:
                    raise AssertionError("Tanker silhouette missing")
                await glyphs.screenshot(path=str(OUT / "cuyahoga-390-real-direction-glyphs.png"), full_page=False, animations="disabled")
                cases.append({"viewport":390,"vesselOrientation":"Soo profile hulls, moving-and-stopped, no arrows","status":"PASS"})
                await glyphs.close()
            if width == 390:
                failed = await context.new_page()
                await failed.route("**/api/freighter-ais?region=cuyahoga", lambda route: route.fulfill(status=503, content_type="application/json", body='{"ok":false}'))
                await failed.goto(URL, wait_until="domcontentloaded")
                await failed.get_by_text("AIS reporting unavailable").wait_for(timeout=15000)
                await failed.get_by_role("button", name="Rivergate Park").click()
                await failed.locator("#river-focus h3").get_by_text("Rivergate Park").wait_for()
                if await failed.locator("#river-focus a[href*='clevelandmetroparks']").count() != 1:
                    raise AssertionError("Official park guidance disappeared when AIS was unavailable")
                await failed.screenshot(path=str(OUT / "cuyahoga-390-ais-unavailable.png"), full_page=True, animations="disabled")
                cases.append({"viewport":390,"ais":"unavailable","status":"PASS","parkFallback":"Rivergate Park"})
                await failed.close()
            await context.close()
        # Optional playback pauses on demand when reduced-motion is NOT requested.
        motion = await browser.new_context(viewport={"width":390,"height":844}, reduced_motion="no-preference")
        moving = await motion.new_page()
        await moving.goto(URL, wait_until="domcontentloaded")
        await moving.locator("#bend-play:not([disabled])").wait_for(timeout=15000)
        await moving.locator("#bend-play").click()
        await moving.wait_for_timeout(650)
        progress = int(await moving.locator("#bend-position").input_value())
        if progress <= 12:
            raise AssertionError("Optional bend playback did not move the teaching ship")
        await moving.locator("#bend-play").click()
        paused = await moving.locator("#bend-ship").get_attribute("transform")
        await moving.wait_for_timeout(240)
        if paused != await moving.locator("#bend-ship").get_attribute("transform"):
            raise AssertionError("Optional playback did not pause on command")
        await moving.locator("#bend-diagram").screenshot(path=str(OUT / "cuyahoga-390-bend-in-motion.png"))
        cases.append({"viewport":390,"illustrativeAnimation":"play-and-pause","status":"PASS","progressAtPause":progress})
        await motion.close()
        nojs = await browser.new_context(viewport={"width":390,"height":844}, java_script_enabled=False)
        page = await nojs.new_page()
        await page.goto(URL, wait_until="domcontentloaded")
        fallback = page.locator("#river-workbench noscript")
        assert await fallback.count() == 1, "No no-JS HTML fallback in page"
        assert "Interactive vessel markers require JavaScript" in (await fallback.text_content() or "")
        await page.screenshot(path=str(OUT/"cuyahoga-390-nojs.png"), full_page=True)
        assert await page.locator("noscript a[href*='clevelandmetroparks']").count() == 4
        cases.append({"viewport":390,"javascript":False,"status":"PASS","fallbackParkLinks":4})
        await nojs.close()
        await browser.close()
        (OUT/"browser-acceptance.json").write_text(json.dumps({"url":URL,"cases":cases,"status":"PASSED_LOCAL_BROWSER"},indent=2)+"\n")
        print(json.dumps({"status":"PASSED_LOCAL_BROWSER","cases":cases}))
if __name__ == "__main__":
    asyncio.run(run())
