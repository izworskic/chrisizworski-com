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
            await page.locator("#calumet-type-counts .river-type-filter.type-cargo").wait_for(timeout=25000)
            await page.locator("#calumet-map .river-watch-marker").first.wait_for(timeout=25000)
            if await page.locator("#calumet-map .river-watch-marker").count()!=4:
                raise AssertionError("Only four distinct fresh AIS reports should be mapped")
            if await page.locator(".reported-ships li").count()!=4:
                raise AssertionError("List and map must have same four recent reports")
            for kind,expected in (("cargo","2"),("tug","1"),("tanker","1")):
                count=await page.locator("#calumet-type-counts .river-type-filter.type-"+kind+" strong").inner_text()
                if count!=expected:raise AssertionError(kind+" count: "+count+" vs "+expected)
            if await page.locator("#calumet-type-counts .river-type-filter.type-all strong").inner_text()!="4":
                raise AssertionError("All counter wrong")
            if await page.locator(".river-watch-marker .ship-hull").count()!=4:
                raise AssertionError("Some map markers are still generic diamonds/dots")
            if await page.locator(".river-watch-marker.with-course").count()!=2:
                raise AssertionError("Only actively moving ships with valid course should have an arrow")
            if await page.locator(".river-watch-marker.without-course").count()!=2:
                raise AssertionError("Stopped/unknown direction ships should have an upright hull but no arrow")
            course_styles=await page.locator(".river-ship-course").evaluate_all(
                "(els)=>els.map(e=>e.getAttribute('style'))")
            if not any("--river-course:90.0deg" in x for x in course_styles):
                raise AssertionError("Eastbound reported course arrow missing")
            if not any("--river-course:0.0deg" in x for x in course_styles):
                raise AssertionError("Northbound reported course arrow missing")
            if await page.get_by_text("QA STALE SHIP",exact=True).count():
                raise AssertionError("Stale AIS report should not appear anywhere")
            await page.locator("#calumet-type-counts .river-type-filter.type-tug").click()
            await page.locator("#calumet-map .river-watch-marker").first.wait_for()
            if await page.locator("#calumet-map .river-watch-marker").count()!=1:
                raise AssertionError("Tug filter did not narrow map")
            if await page.locator(".reported-ships li").count()!=1:
                raise AssertionError("Tug filter did not narrow list")
            if await page.locator("#calumet-type-counts .type-tug[aria-pressed=true]").count()!=1:
                raise AssertionError("Tug filter did not preserve selected state")
            if await page.evaluate("document.activeElement?.dataset.kind")!="tug":
                raise AssertionError("Type filter lost keyboard focus after rerender")
            await page.locator("#calumet-type-counts .river-type-filter.type-all").click()
            if await page.locator("#calumet-map .river-watch-marker").count()!=4:
                raise AssertionError("All filter did not restore four ship markers")
            if await page.locator(".reported-ships li").count()!=4:
                raise AssertionError("All filter did not restore four list items")
            await page.locator("#calumet-map").screenshot(path=str(OUT/f"calumet-{width}-ships.png"))
            if width<=390:
                await page.screenshot(path=str(OUT/f"calumet-{width}-full.png"),full_page=True)
            overflow=await page.evaluate("document.documentElement.scrollWidth-window.innerWidth")
            if overflow>5:raise AssertionError("Horizontal overflow: "+str(overflow)+"px")
            if errors:raise AssertionError("JavaScript page errors: "+str(errors))
            cases.append({"viewport":width,"status":"PASS","fresh":4,"cargo":2,"tug":1,"tanker":1,
              "filters":"tug-to-all","course":"separate arrow, upright hull"})
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
