#!/usr/bin/env python3
"""Paired Working Rivers design acceptance: two distinct tools, one coherent shell.
Runs only against the ephemeral local public/ server and deliberately mocked AIS.
Never claims these fixtures represent live ships or visitor traffic.
"""
import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.async_api import async_playwright

ROOT="http://127.0.0.1:8765"
OUT=Path(os.environ.get("RIVER_PAIR_QA_OUTPUT","/tmp/river-pair-qa"))
OUT.mkdir(parents=True,exist_ok=True)
NOW=datetime.now(timezone.utc)

def iso(t):
    return t.isoformat(timespec="seconds").replace("+00:00","Z")

def fixture(city):
    if city=="calumet":
        return {"ok":True,"checkedAt":iso(NOW-timedelta(seconds=5)),
            "vessels":[{"mmsi":"367771111","name":"ILLUSTRATIVE CHICAGO CARGO","lat":41.7225,
              "lon":-87.544,"seen":iso(NOW-timedelta(minutes=1)),"shipType":70,
              "speedKnots":4.0,"course":90,"lengthMeters":200,"source":"test fixture"}]}
    return {"ok":True,"scope":"cuyahoga-regional-openwaters","checkedAt":iso(NOW-timedelta(seconds=5)),
      "vessels":[{"mmsi":"367881111","name":"ILLUSTRATIVE CLEVELAND CARGO","lat":41.4945,
          "lon":-81.7033,"seen":iso(NOW-timedelta(minutes=1)),"shipType":70,
          "speedKnots":4.0,"course":90,"lengthMeters":220,"source":"test fixture"}]}

async def run():
    cases=[]
    async with async_playwright() as p:
        executable=next((x for x in ("/usr/bin/google-chrome","/usr/bin/chromium","/opt/google/chrome/chrome") if Path(x).exists()),None)
        launch={"headless":True,"args":["--no-sandbox"]}
        if executable:launch["executable_path"]=executable
        browser=await p.chromium.launch(**launch)
        for width,height in ((360,780),(390,844),(768,1024),(1280,900),(1440,900)):
            dimensions={}
            for city in ("calumet","cuyahoga"):
                context=await browser.new_context(viewport={"width":width,"height":height},
                  reduced_motion="reduce",device_scale_factor=1)
                page=await context.new_page()
                errors=[]
                page.on("pageerror",lambda err:errors.append(str(err)))
                url=f"{ROOT}/{city}-freighter-watch/"
                feed=fixture(city)
                request="**/api/freighter-ais?region=cuyahoga" if city=="cuyahoga" else "**/api/freighter-ais"
                async def mock_ais(route):
                    await route.fulfill(status=200,content_type="application/json",body=json.dumps(feed))
                await page.route(request,mock_ais)
                await page.goto(url,wait_until="domcontentloaded",timeout=40000)
                map_id="calumet-map" if city=="calumet" else "cuyahoga-map"
                ship_btn="calumet-show-ships" if city=="calumet" else "show-ships-on-map"
                region_class=f"river-family--{city}"
                await page.locator(f"#{ship_btn}:not([disabled])").wait_for(timeout=25000)
                await page.locator(f"#{map_id} .leaflet-tile-pane img.leaflet-tile").first.wait_for(state="attached",timeout=25000)
                await page.locator(f"#{map_id} .river-watch-marker, #{map_id} .soo-ais-symbol").first.wait_for(timeout=25000)
                await page.wait_for_timeout(250)
                if await page.locator(f"body.{region_class}").count()!=1:
                    raise AssertionError(f"{city}: sister-page identity missing")
                switch=page.locator("header .river-family__switch a")
                if await switch.count()!=2:
                    raise AssertionError(f"{city}: both river navigation links must be present")
                current=page.locator('header .river-family__switch a[aria-current="page"]')
                if await current.count()!=1:
                    raise AssertionError(f"{city}: river navigation has no unique active page")
                if f"/{city}-freighter-watch/" not in await current.get_attribute("href"):
                    raise AssertionError(f"{city}: wrong active sister page")
                opposite="cuyahoga" if city=="calumet" else "calumet"
                if await page.locator(f'header .river-family__switch a[href="/{opposite}-freighter-watch/"]').count()!=1:
                    raise AssertionError(f"{city}: other river not linked directly")
                if await page.locator("h1").count()!=1:
                    raise AssertionError(f"{city}: not exactly one proper page heading")
                if await page.locator(f"#{ship_btn}").inner_text()!="Show 1 ship":
                    raise AssertionError(f"{city}: visible ship count has diverged from AIS evidence")
                if await page.locator("main .river-type-strip summary").count()!=1:
                    raise AssertionError(f"{city}: matching expandable type controls missing")
                if await page.locator("footer a[href='/freighters/']").count()!=1:
                    raise AssertionError(f"{city}: Freighter tools return link missing")
                if await page.locator("main .map-loading").count()!=0:
                    raise AssertionError(f"{city}: map never finished mounting")
                geom=await page.evaluate("""(id) => {
                    const map=document.getElementById(id).getBoundingClientRect();
                    const hero=document.querySelector('.hero,.lead').getBoundingClientRect();
                    const main=document.querySelector('.river-desk,.workbench');
                    const canvas=document.querySelector('.chart-frame,.map-frame');
                    return {width:map.width,top:map.top,height:map.height,heroHeight:hero.height,
                      pageColor:getComputedStyle(document.body).backgroundColor,
                      frameRadius:getComputedStyle(canvas).borderRadius,
                      scroll:document.documentElement.scrollWidth-window.innerWidth,
                      mainWidth:main.getBoundingClientRect().width};
                }""",map_id)
                dimensions[city]=geom
                if geom["width"]<width*(.86 if width<830 else .4):
                    raise AssertionError(f"{city}: river map too narrow: {geom}")
                if width<=390 and geom["top"]>=height*.76:
                    raise AssertionError(f"{city}: visitor's first map is still buried: {geom}")
                if geom["scroll"]>5:
                    raise AssertionError(f"{city}: page has horizontal overflow: {geom}")
                if city=="calumet":
                    if await page.locator(".view-entry-links a[href*='google.com/maps']").count()!=2:
                        raise AssertionError("Chicago public-area Google Maps links missing")
                    await page.locator("#calumet-show-ships").click()
                    await page.locator("#calumet-show-places").click()
                    await page.locator('[data-place="calumetpark"]').click()
                    if await page.locator("#selection h3").inner_text()!="Calumet Park lakefront":
                        raise AssertionError("Calumet public-area selection lost its detail")
                    if await page.locator('[data-place="calumetpark"][aria-pressed=true]').count()!=1:
                        raise AssertionError("Calumet selected area lost its button state")
                    if await page.locator("#selection a[href*='maps']").count()!=1:
                        raise AssertionError("Calumet selected view must link to maps")
                else:
                    if await page.locator(".place-entry-links a[href*='google.com/maps']").count()!=4:
                        raise AssertionError("Cleveland public park Google Maps links missing")
                    await page.locator("#show-ships-on-map").click()
                    await page.locator("#show-parks-on-map").click()
                    await page.locator('[data-park="rivergate"]').click()
                    if "Rivergate Park" not in await page.locator("#river-focus h3").inner_text():
                        raise AssertionError("Cuyahoga public place selection lost detail")
                if errors:raise AssertionError(f"{city}: JS page errors {errors}")
                await page.screenshot(path=str(OUT/f"{city}-{width}-first.png"),full_page=False,animations="disabled")
                if width in (390,1280):
                    await page.screenshot(path=str(OUT/f"{city}-{width}-full.png"),full_page=True,animations="disabled")
                await context.close()
            c,y=dimensions["calumet"],dimensions["cuyahoga"]
            if c["pageColor"]!=y["pageColor"]:
                raise AssertionError(f"Paired pages no longer share paper palette: {c} vs {y}")
            if c["frameRadius"]!=y["frameRadius"]:
                raise AssertionError(f"Map-frame treatments drifted apart: {c} vs {y}")
            if abs(c["top"]-y["top"])>height*.28:
                raise AssertionError(f"Map start positions diverged too far: {c} vs {y}")
            cases.append({"width":width,"status":"PASS","calumet":c,"cuyahoga":y})
        nojs=await browser.new_context(java_script_enabled=False,viewport={"width":390,"height":844})
        for city in ("calumet","cuyahoga"):
            page=await nojs.new_page()
            await page.goto(f"{ROOT}/{city}-freighter-watch/",wait_until="domcontentloaded")
            if await page.locator("noscript a[href]").count()<2:
                raise AssertionError(f"{city}: meaningful no-JS map/access alternatives disappeared")
            if await page.locator("header .river-family__switch a").count()!=2:
                raise AssertionError(f"{city}: cross-river navigation requires JavaScript")
            await page.close()
        await nojs.close()
        await browser.close()
    (OUT/"paired-river-screens.json").write_text(json.dumps(cases,indent=2)+"\n")
    print(json.dumps({"result":"PASS","viewports":len(cases),
      "caseSummary":[{"width":case["width"],"calumetMapTop":round(case["calumet"]["top"]),
                      "cuyahogaMapTop":round(case["cuyahoga"]["top"])} for case in cases]},indent=2))

if __name__=="__main__":
    asyncio.run(run())
