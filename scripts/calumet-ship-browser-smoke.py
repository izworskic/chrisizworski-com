#!/usr/bin/env python3
"""Calumet map/list source-backed AIS ship silhouettes and type-count browser QA.
Local static public/ server, mocked AIS only; never a claim of live ships.
"""
import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:8765/calumet-freighter-watch/"
OUT = Path(os.environ.get("CALUMET_QA_OUTPUT", "/tmp/calumet-ship-qa"))
OUT.mkdir(parents=True, exist_ok=True)
NOW = datetime.now(timezone.utc)

def iso(dt):
    return dt.isoformat(timespec="seconds").replace("+00:00", "Z")

def report():
    recent=iso(NOW-timedelta(seconds=80))
    def vessel(mmsi,name,lat,lon,type_,speed,course,length):
        return {"mmsi":mmsi,"name":name,"lat":lat,"lon":lon,"shipType":type_,
          "speedKnots":speed,"course":course,"lengthMeters":length,"seen":recent,"source":"mock QA"}
    return {"ok":True,"checkedAt":iso(NOW-timedelta(seconds=9)),"vessels":[
        vessel("367770001","QA CARGO EAST",41.7212,-87.5413,70,4.2,90,242),
        vessel("367770002","QA CARGO UNKNOWN COURSE",41.7240,-87.5459,72,2.8,None,170),
        vessel("367770003","QA TUG STOPPED",41.7262,-87.5381,31,0.2,190,27),
        vessel("367770004","QA TANKER NORTH",41.7165,-87.5482,80,4.9,0,153),
        vessel("367770005","QA STALE SHIP",41.7282,-87.5445,70,5,220,180)|{"seen":iso(NOW-timedelta(minutes=41))}
    ],"attribution":[{"source":"mock QA","credit":"Browser test attribution"}]}

async def run():
    cases=[]
    async with async_playwright() as p:
        executable=next((x for x in ("/usr/bin/google-chrome","/usr/bin/chromium","/opt/google/chrome/chrome") if Path(x).exists()),None)
        opts={"headless":True,"args":["--no-sandbox"]}
        if executable:opts["executable_path"]=executable
        browser=await p.chromium.launch(**opts)
        for width,height in ((360,780),(390,844),(768,1024),(1280,900),(1440,900)):
            context=await browser.new_context(viewport={"width":width,"height":height},
              reduced_motion="reduce",device_scale_factor=1)
            page=await context.new_page()
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            await page.route("**/api/freighter-ais",lambda route:route.fulfill(status=200,
              content_type="application/json",body=json.dumps(report())))
            await page.goto(URL,wait_until="domcontentloaded",timeout=40000)
            await page.locator(".river-type-strip summary").click()
            await page.locator("#calumet-type-counts .river-type-filter.type-cargo").wait_for(timeout=25000)
            await page.locator("#calumet-show-ships:not([disabled])").wait_for(timeout=25000)
            if await page.locator("#calumet-show-ships").inner_text()!="Show 4 ships":
                raise AssertionError("Ships framing count must match observed, fresh AIS count")
            if await page.locator("#calumet-show-places").is_disabled():
                raise AssertionError("Two verified public places should be available for map framing")
            await page.locator("#calumet-show-ships").click()
            await page.locator("#calumet-show-places").click()
            await page.locator("#calumet-map .soo-ais-symbol").first.wait_for(timeout=25000)
            if await page.locator("#calumet-map .soo-ais-symbol").count()!=4:
                raise AssertionError("Only four distinct fresh AIS reports should be mapped")
            if await page.locator(".reported-ships li").count()!=4:
                raise AssertionError("List and map must have same four recent reports")
            for kind,expected in (("cargo","2"),("tug","1"),("tanker","1")):
                count=await page.locator("#calumet-type-counts .river-type-filter.type-"+kind+" strong").inner_text()
                if count!=expected:raise AssertionError(kind+" count: "+count+" vs "+expected)
            if await page.locator("#calumet-type-counts .river-type-filter.type-all strong").inner_text()!="4":
                raise AssertionError("All counter wrong")
            if await page.locator(".soo-ais-symbol .ship-hull").count()!=4:
                raise AssertionError("Some map markers are still generic diamonds/dots")
            if await page.locator("#calumet-map .soo-ais-symbol.type-cargo").count()!=2:
                raise AssertionError("Two reported cargo vessels must use the Soo-class silhouette")
            if await page.locator(".river-ship-course").count()!=0:
                raise AssertionError("Calumet must match Cleveland's upright Soo icons, without second compass badges")
            if await page.locator("#calumet-map .calumet-viewpoint-icon").count()!=2:
                raise AssertionError("Both public views must have distinct illustrated markers")
            if await page.locator("#calumet-map .calumet-bridge-icon").count()!=5:
                raise AssertionError("Five road bridge references should have diagram-shaped marker icons")
            if await page.get_by_text("QA STALE SHIP",exact=True).count():
                raise AssertionError("Stale AIS report should not appear anywhere")
            await page.locator("#calumet-type-counts .river-type-filter.type-tug").click()
            await page.locator("#calumet-map .soo-ais-symbol").first.wait_for()
            if await page.locator("#calumet-map .soo-ais-symbol").count()!=1:
                raise AssertionError("Tug filter did not narrow map")
            if await page.locator(".reported-ships li").count()!=1:
                raise AssertionError("Tug filter did not narrow list")
            if await page.locator("#calumet-type-counts .type-tug[aria-pressed=true]").count()!=1:
                raise AssertionError("Tug filter did not preserve selected state")
            if await page.evaluate("document.activeElement?.dataset.kind")!="tug":
                raise AssertionError("Type filter lost keyboard focus after rerender")
            await page.locator("#calumet-type-counts .river-type-filter.type-all").click()
            if await page.locator("#calumet-map .soo-ais-symbol").count()!=4:
                raise AssertionError("All filter did not restore four ship markers")
            if await page.locator(".reported-ships li").count()!=4:
                raise AssertionError("All filter did not restore four list items")
            # One click-open bubble at a time, matching Cuyahoga's ship
            # metadata, public-place actions, and honest bridge limitations.
            await page.locator("#calumet-map .soo-ais-symbol.type-cargo").first.click()
            popup=page.locator("#calumet-map .leaflet-popup-content")
            await popup.first.wait_for()
            popup_texts=await popup.all_inner_texts()
            if len(popup_texts)!=1:
                raise AssertionError("Expected exactly one clicked vessel popup, got "+repr(popup_texts))
            ship_text=popup_texts[0]
            for required in ("Reported AIS type: Freighter / cargo","Reported length: 794 ft",
                             "4.2 knots reported","MMSI 367770001","mock QA",
                             "Reported travel course: 90°","Last position:"):
                if required not in ship_text:
                    raise AssertionError("Ship popup missing Cuyahoga-parity data: "+required+" / "+ship_text)
            if await page.locator("#calumet-map .leaflet-popup").count()!=1:
                raise AssertionError("Only one ship detail bubble is permitted")
            if width in (390,1280):
                await page.screenshot(path=str(OUT/f"calumet-{width}-ship-popup.png"),animations="disabled")
            # Leaflet popups can cover nearby pins, as on Cuyahoga.
            # Close the ship bubble before choosing a shore marker.
            await page.locator("#calumet-map .leaflet-popup-close-button").click()
            await page.locator("#calumet-map .calumet-viewpoint-icon[title*='95th Street']").click()
            shore=await page.locator("#calumet-map .leaflet-popup-content").inner_text()
            if "95th Street Bridge approaches" not in shore or "Google Maps" not in shore:
                raise AssertionError("95th Street map bubble needs name and map handoff")
            if "not a verified sidewalk standing spot" not in shore:
                raise AssertionError("Approximate public sidewalk access warning missing")
            if await page.locator("#calumet-map .leaflet-popup").count()!=1:
                raise AssertionError("A place click must replace, not stack, the previous ship popup")
            await page.locator("#bridge-select").select_option("95th")
            # The bridge picker closes the shore popup before we tap the
            # separate chart-marker symbol. Verify that close actually settles.
            await page.locator("#calumet-map .leaflet-popup").first.wait_for(state="detached",timeout=5000)
            await page.locator("#calumet-map .calumet-bridge-icon[title*='95th Street']").click()
            await page.wait_for_timeout(300)
            bridge_texts=await page.locator("#calumet-map .leaflet-popup-content").all_inner_texts()
            if len(bridge_texts)!=1:
                raise AssertionError("Bridge click opened competing popups: "+repr(bridge_texts))
            bridge=bridge_texts[0]
            for required in ("95th Street","double-leaf bascule","river mile 1.09",
                             "NOAA bridge reference","not a live bridge opening"):
                if required not in bridge:
                    raise AssertionError("Published bridge bubble missing: "+required+" / "+bridge)
            if await page.locator("#calumet-map .leaflet-popup").count()!=1:
                raise AssertionError("A bridge click must replace the prior public-place popup")
            if width in (390,1280):
                await page.screenshot(path=str(OUT/f"calumet-{width}-bridge-popup.png"),animations="disabled")
            await page.locator("[data-place='calumetpark']").click()
            if await page.locator("#selection h3").inner_text()!="Calumet Park lakefront":
                raise AssertionError("Viewing-place rail and map focus became desynchronized")
            await page.locator("#rail-layer").check()
            if await page.locator("#calumet-map .calumet-bridge-pin--rail").count()!=5:
                raise AssertionError("Rail layer must expose five distinct lift bridge pictograms")
            await page.locator("#rail-layer").uncheck()
            await page.locator("#calumet-map").screenshot(path=str(OUT/f"calumet-{width}-ships.png"))
            if width<=390:
                await page.screenshot(path=str(OUT/f"calumet-{width}-full.png"),full_page=True)
            overflow=await page.evaluate("document.documentElement.scrollWidth-window.innerWidth")
            if overflow>5:raise AssertionError("Horizontal overflow: "+str(overflow)+"px")
            if errors:raise AssertionError("JavaScript page errors: "+str(errors))
            cases.append({"viewport":width,"status":"PASS","fresh":4,"cargo":2,"tug":1,"tanker":1,
              "filters":"tug-to-all","course":"Soo upright hull; reported course in exclusive popup"})
            await context.close()

        # No feed is not zero ships; type counts must not fabricate zero categories.
        context=await browser.new_context(viewport={"width":390,"height":844})
        page=await context.new_page()
        await page.route("**/api/freighter-ais",lambda route:route.fulfill(status=502,body="{}"))
        await page.goto(URL,wait_until="domcontentloaded")
        await page.get_by_text("AIS report unavailable",exact=False).first.wait_for(timeout=20000)
        if await page.locator("#calumet-type-counts .river-type-filter").count()!=0:
            raise AssertionError("Unavailable AIS must not produce numeric vessel-type filters")
        await context.close()

        nojs=await browser.new_context(java_script_enabled=False,viewport={"width":390,"height":844})
        static=await nojs.new_page()
        await static.goto(URL,wait_until="domcontentloaded")
        if not await static.locator("noscript a[href*='chicagomag.com']").count():
            raise AssertionError("Missing static bridge watch fallback")
        if not await static.locator("noscript a[href*='chicagoparkdistrict.com']").count():
            raise AssertionError("Missing static public park fallback")
        await nojs.close()
        await browser.close()
    (OUT/"calumet-ship-qa.json").write_text(json.dumps(cases,indent=2)+"\n")
    print(json.dumps({"result":"PASS","viewports":len(cases),"cases":cases},indent=2))

if __name__=="__main__":
    asyncio.run(run())
