#!/usr/bin/env python3
"""Build source-linked, crawler-readable 10-day Lake Superior Circle Tour field guide.

Offline, deterministic and stdlib-only. Existing 31 stop cards and 10-day
editorial itinerary are the source of route order and published day estimates.
The road evidence ledger supplies bounded gateway corrections. No network
requests, GPS interpolation, new parking or real-time road/access claims.

python3 scripts/build-circle-tour-trip-intelligence.py
python3 scripts/build-circle-tour-trip-intelligence.py --check
"""
from __future__ import annotations

import argparse
from datetime import date
import html
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HUB = ROOT / "public/lake-superior-circle-tour/index.html"
LEDGER = ROOT / "data/circle-tour-road-evidence.json"
VISUALS = ROOT / "data/circle-tour-visual-story.json"
TRAVELER = ROOT / "data/circle-tour-traveler-stops.json"
OUT = ROOT / "public/lake-superior-circle-tour/10-day/index.html"
CANONICAL = "https://chrisizworski.com/lake-superior-circle-tour/10-day/"
VERSION = "2026-11-14"
STORY = {
    1: ("Bayfield", "Start beside the harbor. Duluth's Aerial Lift Bridge is a fitting first look at the working lake; Bayfield is the doorway to island country.",
        "Use the afternoon for Bayfield and a view of the islands. A boat cruise is a separate commitment to weather and departure times.",
        "Do not schedule a full island excursion on top of a late arrival.", 2.0, False),
    2: ("Porcupine Mountains area", "From Bayfield, the road crosses the old iron country and climbs toward the Porcupine Mountains. Lake of the Clouds is a natural place to finish.",
        "Choose one waterfall or overlook on the way. Check park road conditions before promising a sunset view.",
        "Black River Harbor waterfalls take their own drive and walks; they are not a free roadside stop.", 2.0, True),
    3: ("Ontonagon", "This is the day to linger in the Porkies. Forest, rocky shore and Lake Superior weather make a better story than a hurried collection of trailheads.",
        "Spend meaningful time on one permitted park trail or overlook; drive to Ontonagon afterward.",
        "Remote trails and the Lake of the Clouds approach may have separate seasonal road restrictions.", 3.0, True),
    4: ("Houghton, L'Anse or nearby Copper Country", "Ontonagon to Houghton is an approximately 52-mile gateway road leg. Copper Harbor and Brockway Mountain are extra adventures north of that gateway.",
        "Choose one copper-country experience: mining heritage, a shore drive, or an extended peninsula outing.",
        "Do not treat the 52-mile Houghton gateway distance as the whole Copper Harbor loop.", 2.0, True),
    5: ("Marquette", "A shorter drive opens an unusually pleasant town day. Marquette's waterfront and the historic ore docks tell the industrial side of Lake Superior.",
        "Walk Presque Isle or the harbor, then make time for a local meal.",
        "Ore boats are not on a guaranteed schedule. A view of the ore dock is still worthwhile without one.", 2.0, False),
    6: ("Munising", "Pictured Rocks earns a real day, not a rushed photo stop. Sandstone cliffs are a different landscape from the green headlands farther west.",
        "Choose a reserved boat trip or a practical land-based overlook and hike after consulting NPS conditions.",
        "Boat trips, sea conditions, trails and the Munising Falls access notices must be checked individually.", 3.0, True),
    7: ("Sault Ste. Marie, Michigan", "Tahquamenon, Whitefish Point and the Soo make an extraordinary but busy day. The falls, the Shipwreck Coast and the locks are three distinct experiences.",
        "Stand above Tahquamenon's Upper Falls, explore the shipwreck stories at Whitefish Point, or time a Soo Locks visit around a reported vessel. Pick one to enjoy fully, and leave the others as shorter visits or another day.",
        "The Lower Falls, the Shipwreck Museum, and the Soo Locks each mean separate arrivals, parking, and time on foot. Check park hours and ship reports rather than racing between them.", 2.0, True),
    8: ("Wawa", "Cross into Ontario, then let the Lake Superior coast widen. The road threads past high rock and enclosed bays through Lake Superior Provincial Park.",
        "Pull off at Old Woman Bay for a shoreline visit, or choose one permitted Lake Superior Provincial Park trail. The best version of this day leaves time for the Canadian coast to surprise you.",
        "The park's individual trail and day-use seasons differ. Border documents and any current closure alerts are separate checks.", 2.0, True),
    9: ("Thunder Bay", "This is a serious driving day. White River, Marathon, Nipigon and Thunder Bay each deserve attention, but not all in one afternoon.",
        "Choose one stop in the Marathon/Pukaskwa or Nipigon area. Start early and protect a meaningful daylight margin.",
        "A visit deep into Pukaskwa adds substantial time beyond the published gateway miles.", 1.0, True),
    10: ("Duluth", "Minnesota's North Shore is full of waterfalls, lighthouses and cliffs. The final day links Thunder Bay, the border, Grand Marais and Duluth.",
        "Choose Gooseberry Falls for a river walk or Split Rock for the lighthouse and rocky shore. Leave extra North Shore parks for another visit instead of collecting parking lots.",
        "Border delays, the drive to each park entrance, and remaining daylight all matter. Decide on one meaningful stop, then enjoy the final drive to Duluth.", 1.0, True),
}
SOURCE_LINKS = [
    ("NPS: Keweenaw / Porcupine Mountains historic-road corridor", "https://home.nps.gov/kewe/two-day-porcupine-mountains.htm"),
    ("Michigan DNR: Tahquamenon state-park locations", "https://www.michigan.gov/recsearch/parks/TahquamenonFalls"),
    ("Great Lakes Shipwreck Museum: Whitefish Point directions", "https://shipwreckmuseum.com/visit/admission-hours-location/"),
    ("NPS: current Pictured Rocks park conditions", "https://www.nps.gov/piro/planyourvisit/conditions.htm"),
    ("Ontario Parks: Lake Superior park alerts", "https://www.ontarioparks.ca/park/lakesuperior/alerts"),
    ("Destination Ontario: Thunder Bay to Pigeon River", "https://www.destinationontario.com/en-ca/travel-resources/ontario-lake-superior-road-trip"),
    ("Ontario 511: current highway alerts", "https://511on.ca/"),
    ("U.S. CBP: entry documentation", "https://www.cbp.gov/travel/us-citizens/western-hemisphere-travel-initiative"),
    ("Canada CBSA: entry documentation", "https://www.cbsa-asfc.gc.ca/travel-voyage/td-dv-eng.html"),
]
def esc(s: object) -> str:
    return html.escape(str(s), quote=True)

def extract(source: str, ledger: dict) -> list[dict]:
    panel = source.split('id="itin-10"', 1)[1].split('id="itin-15"', 1)[0]
    found = re.findall(
        r'<div class="itin-day" data-day="(\d+)" data-stops="([\d,]+)" data-miles="(\d+)">'
        r'<span class="day-label">[\s\S]*?</span>([\s\S]*?)</div>', panel
    )
    if len(found) != 10:
        raise ValueError("Exactly 10 published itinerary days must exist")
    edges = {(r["from"], r["to"]): r for r in ledger["edges"]}
    order = [ledger["edges"][0]["from"]] + [e["to"] for e in ledger["edges"]]
    total = 0
    previous = None
    days = []
    for day_raw, stop_raw, miles_raw, summary_raw in found:
        number, miles = int(day_raw), int(miles_raw)
        ids = stop_raw.split(",")
        if number != len(days) + 1 or any(x not in order for x in ids) or (previous is not None and ids[0] != previous):
            raise ValueError("Published itinerary disconnected or missing a stop")
        leg_pairs = list(zip(ids, ids[1:]))
        if any(order.index(a) + 1 != order.index(b) for a, b in leg_pairs):
            raise ValueError("Wrong Circle Tour stop order")
        incomplete = [f"{a}→{b}" for a, b in leg_pairs
                      if edges[(a, b)]["status"] in ("partial-source-only", "arrival-choice-unresolved")]
        next_border = any((a, b) in (("13", "14"), ("20", "21")) for a, b in leg_pairs)
        reserve = 45 if next_border else 0
        overnight, why, choose, caution, visits, seasonal = STORY[number]
        # The 45-minute crossing reserve is an unknown-time budget, never a report.
        driving = miles / 47 * 1.2
        margin = 9 - driving - visits - reserve / 60
        state = "source-gap" if incomplete else "overloaded" if margin < 0 else "tight" if margin < .75 else "workable"
        day = dict(day=number, stops=ids, miles=miles, summary=html.unescape(re.sub("<[^>]+>", "", summary_raw)).strip(),
                   overnight=overnight, narrative=why, choose=choose, caution=caution, visits=visits,
                   seasonalSensitive=seasonal, borderReserveMinutes=reserve,
                   complete=not incomplete, incompleteLegs=incomplete, baseline=state,
                   # These are editorial knobs; do not label as live drive/arrival time.
                   timeBudgetBasis="published-day-estimate")
        days.append(day)
        previous = ids[-1]
        total += miles
    if total != 1358 or days[0]["stops"][0] != "1" or days[-1]["stops"][-1] != "30":
        raise ValueError("10-day total or Duluth loop continuity changed")
    if days[-1]["complete"]:
        raise ValueError("Border-to-park mileage incorrectly promoted into full road distance")
    return days



def extract_traveler_presets(source: str, ledger: dict, catalog: dict, visual: dict) -> dict:
    """Build a factual 7/10/15-day comparison from already published route day cards.

    No new distances or roads are generated. The UI must never promise that
    user-selected constraints magically change an editorial overnight itinerary.
    """
    if catalog.get("version") != 1 or catalog.get("routeStart") != "Duluth, Minnesota":
        raise ValueError("Unsupported traveler catalog or start-point claim")
    if catalog.get("routeDirection") != "counterclockwise":
        raise ValueError("Traveler plan must use the published counterclockwise source")
    cards = catalog.get("stops", {})
    stays = catalog.get("overnightBases", {})
    edges = {(r["from"], r["to"]): r for r in ledger["edges"]}
    order = [ledger["edges"][0]["from"]] + [e["to"] for e in ledger["edges"]]
    if len(order) != 31 or len(set(order)) != 31:
        raise ValueError("Source stop order changed; cannot publish preference itineraries")
    # Reuse already self-hosted, attribution-verified destination images.
    # Never attach a photograph of a different park to an unrelated stop.
    photo_matches = {"1":"hero","3":"1","6":"2","8":"4","10":"5",
                     "11":"6","12":"7","15":"8","18":"9","27":"10","30":"hero"}
    cards = {key:dict(value) for key,value in cards.items()}
    for stop, photo_day in photo_matches.items():
        if stop in cards:
            cards[stop]["photo"] = (visual["hero"] if photo_day == "hero"
                                      else visual["days"][photo_day]["photo"])
    for stop, card in cards.items():
        if stop not in order or not card.get("interests") or not set(card["interests"]) <= {"hiking", "waterfalls", "shipwatch", "scenery"}:
            raise ValueError("Specialist activity has an invalid route stop or interests: " + stop)
        href = card.get("toolUrl", "")
        if not href.startswith("/") and href != "https://picturedrocks.chrisizworski.com/":
            raise ValueError("Unreviewed external specialist link: " + href)
        if href.startswith("/") and href not in source:
            local = ROOT / "public" / href.lstrip("/") / "index.html"
            if not local.is_file():
                raise ValueError("Specialist tool absent from original hub and repository: " + href)
        if len(card.get("toolAction", "")) < 18 or len(card.get("caution", "")) < 18:
            raise ValueError("Specialist tool lacks a useful visitor decision")
    expected = {7: 1359, 10: 1358, 15: 1358}
    result = {}
    for length in (7, 10, 15):
        start = source.find('id="itin-' + str(length) + '"')
        if start < 0:
            raise ValueError("Missing published " + str(length) + "-day route")
        end = source.find('id="itin-' + str({7:10, 10:15}.get(length, -1)) + '"', start + 2) if length != 15 else len(source)
        if end < start:
            raise ValueError("Cannot locate next route section")
        panel = source[start:end]
        found = re.findall(
            r'<div class="itin-day" data-day="(\d+)" data-stops="([\d,]+)" data-miles="(\d+)">'
            r'<span class="day-label">[\s\S]*?</span>([\s\S]*?)</div>', panel
        )
        if len(found) != length:
            raise ValueError("Expected exactly " + str(length) + " published days, not " + str(len(found)))
        prev = None
        days = []
        for rawday, rawstops, rawmiles, rawsummary in found:
            number = int(rawday)
            ids = rawstops.split(",")
            miles = int(rawmiles)
            if number != len(days)+1 or any(stop not in order for stop in ids) or (prev and ids[0] != prev):
                raise ValueError("Published travel day is disconnected: " + str(length))
            pairs = list(zip(ids, ids[1:]))
            if any(order.index(a)+1 != order.index(b) for a,b in pairs):
                raise ValueError("Invalid published route adjacency: " + str(length))
            if miles == 0 and len(ids) != 1:
                raise ValueError("Zero-mile stay must be one source stop")
            if miles > 600:
                raise ValueError("Out-of-bounds published daily mileage")
            endpoint = ids[-1]
            if endpoint not in stays:
                raise ValueError("No reviewed overnight area for day ending at stop " + endpoint)
            partial = [a+"→"+b for a,b in pairs if edges[(a,b)]["status"] in ("partial-source-only", "arrival-choice-unresolved")]
            crossings = sum(1 for a,b in pairs if (a,b) in (("13","14"), ("20","21")))
            if crossings > 1:
                raise ValueError("Unexpected second border on one day")
            highlights = [stop for stop in ids if stop in cards]
            days.append({
                "day":number,"stops":ids,"miles":miles,
                "driveAllowanceHours":round(miles / 47 * 1.2, 2),
                "routeSummary":html.unescape(re.sub(r"<[^>]+>", "", rawsummary)).strip(),
                "overnightArea":stays[endpoint],
                "highlights":highlights,
                "complete":not partial,"incompleteLegs":partial,
                "borderReserveMinutes":45 * crossings,
                "seasonalSensitive":any(x in {"3","6","8","11","12","15","18","20","27","28"} for x in ids),
                "basis":"published-day-estimate-not-a-routed-ETA"
            })
            prev = ids[-1]
        if sum(d["miles"] for d in days) != expected[length] or days[0]["stops"][0] != "1" or days[-1]["stops"][-1] != "30":
            raise ValueError("Editorial mileage or Duluth loop changed: "+str(length))
        if days[-1]["complete"]:
            raise ValueError("Border-to-Grand-Portage approach falsely completed for "+str(length))
        result[str(length)] = {"days":days, "totalEditorialMiles":expected[length]}
    return {"version":1,"reviewed":catalog["reviewed"],"start":catalog["routeStart"],
            "direction":"counterclockwise","options":result,
            "specialists":cards,"sourceNotes":catalog["notes"]}


def validate_visuals(visual: dict, hub: str) -> None:
    """Keep every hero/day photo, credit and linked tool auditable at build time."""
    if visual.get("version") != 1 or set(visual.get("days", {})) != {str(i) for i in range(1, 11)}:
        raise ValueError("Visual guide must contain exactly ten days")
    photos = [visual["hero"]] + [visual["days"][str(i)]["photo"] for i in range(1, 11)]
    if len({photo["src"] for photo in photos}) != 11:
        raise ValueError("Every itinerary day needs its own place-specific licensed photo")
    for photo in photos:
        src = photo.get("src", "")
        if not src.startswith("/assets/circle-tour/photos/") or not src.endswith(".jpg"):
            raise ValueError("Photo must be a locally served JPEG thumbnail")
        asset = ROOT / "public" / src.lstrip("/")
        if not asset.is_file() or asset.stat().st_size < 5000:
            raise ValueError("Missing or abnormally small locally hosted photo: " + src)
        with asset.open("rb") as stream:
            if stream.read(3) != bytes((255, 216, 255)):
                raise ValueError("Photo asset is not a valid JPEG: " + src)
        if not photo.get("sourceSrc", "").startswith("https://"):
            raise ValueError("Original Wikimedia source not recorded")
        if not photo.get("file", "").startswith("https://commons.wikimedia.org/wiki/File:"):
            raise ValueError("Missing image attribution link")
        if not photo.get("licenseUrl", "").startswith("https://creativecommons.org/"):
            raise ValueError("Missing photo license")
        if any(len(photo.get(field, "")) < 6 for field in ("alt", "caption", "license")):
            raise ValueError("Photo lacks identifying context or licensing")
        if not photo.get("by", "").strip():
            raise ValueError("No photography credit")
    for index in range(1, 11):
        row = visual["days"][str(index)]
        if any(len(row.get(key, "")) < 24 for key in ("fieldNote", "focus")):
            raise ValueError(f"Day {index} has no destination-specific advice")
        if not 2 <= len(row.get("tools", [])) <= 4:
            raise ValueError(f"Day {index} needs 2 to 4 relevant tools")
        for tool in row["tools"]:
            href = tool.get("url", "")
            if not href.startswith("/") and href != "https://picturedrocks.chrisizworski.com/":
                raise ValueError("Non-owned link in companion tools")
            if href.startswith("/") and href not in hub and href not in (
                "/great-lakes-freighter-tracking/", "/freighters/", "/lake-superior-circle-tour/#stop-11"
            ):
                raise ValueError("Tool has no verified match in the original Circle Tour hub: " + href)
            if len(tool.get("name", "")) < 8 or len(tool.get("why", "")) < 12:
                raise ValueError("Tool link lacks a decision-oriented reason")


def photo_html(photo: dict, hero: bool = False) -> str:
    mode = 'loading="eager" fetchpriority="high"' if hero else 'loading="lazy"'
    return (f'<figure class="{"hero-photo" if hero else "day-photo"}">'
            f'<img {mode} decoding="async" referrerpolicy="no-referrer" '
            f'width="960" height="640" src="{esc(photo["src"])}" alt="{esc(photo["alt"])}">'
            f'<figcaption>{esc(photo["caption"])} '
            f'<span class="photo-credit">Photo: <a href="{esc(photo["file"])}" rel="noopener noreferrer" target="_blank">{esc(photo["by"])}</a>'
            f' · <a href="{esc(photo["licenseUrl"])}" rel="noopener noreferrer" target="_blank">{esc(photo["license"])}</a> · optimized thumbnail</span></figcaption></figure>')


def tools_html(day: int, tools: list[dict]) -> str:
    cards = "".join(
        f'<li><a href="{esc(tool["url"])}">{esc(tool["name"])}</a>'
        f'<small>{esc(tool["why"])}</small></li>' for tool in tools
    )
    return (f'<nav class="day-tools" aria-label="Chris Izworski travel tools for day {day}">'
            '<strong>Use the tools for this stop</strong><ul>' + cards + '</ul></nav>')


STYLES = """
:root{--ink:#17342e;--sea:#155b67;--muted:#536961;--light:#f4f7f4;--border:#dae4df}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);font:17px/1.65 system-ui,-apple-system,Segoe UI,Arial,sans-serif;background:#fff}
a{color:#115b69;text-underline-offset:3px}a:focus-visible,button:focus-visible,select:focus-visible{outline:3px solid #ce8a16;outline-offset:3px}
header{background:#153d42;color:#fff;padding:17px max(18px,calc((100% - 1100px)/2))}
header a{color:#e9f4f1}main{max-width:1100px;margin:auto;padding:24px 18px 60px}
.hero{display:grid;grid-template-columns:1fr 1.02fr;gap:28px;align-items:center;padding:26px 0 26px}
.eyebrow{font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#397566}
h1{font:600 clamp(31px,4.7vw,53px)/1.12 Georgia,serif;margin:10px 0 18px}
h2{font:600 clamp(26px,3vw,35px)/1.23 Georgia,serif;margin:0 0 12px}
h3{font:600 clamp(22px,2.4vw,29px)/1.25 Georgia,serif;margin:5px 0 4px}
p{margin:12px 0}.lead{font-size:1.12rem;max-width:65ch}
.hero-photo,.day-photo{margin:0;min-width:0}
.hero-photo img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px 12px 0 0}
.hero-photo figcaption,.day-photo figcaption{background:#f1f5f2;color:#50645c;padding:8px 12px;font-size:12px;line-height:1.45;border-radius:0 0 9px 9px}
.photo-credit{display:block;font-size:11px;color:#5c6d66}
.note{color:var(--muted);font-size:14px}
.buttons{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0 0}
.button{display:inline-block;background:var(--sea);color:#fff;padding:10px 15px;text-decoration:none;font-weight:700;border-radius:6px}
.button.secondary{background:#e8f1ed;color:#17342e}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0 30px}
.summary-grid div{background:#f1f6f3;border-radius:7px;padding:14px}
.summary-grid strong{font-size:22px;display:block}
.overview{background:#edf4f1;border-left:4px solid #2c7667;padding:18px 22px;margin:28px 0 32px;max-width:100%}
.overview p{margin:8px 0}.overview a{font-weight:700}
.day-jump{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 30px}
.day-jump a{border:1px solid #c9ddd3;border-radius:30px;padding:6px 13px;text-decoration:none;font-weight:700;font-size:14px}
.day-jump a:hover{background:#e7f2ed}
.days{display:grid;gap:24px}
.day{display:grid;grid-template-columns:minmax(225px,.75fr) minmax(0,1.25fr);gap:0;border:1px solid var(--border);border-radius:12px;scroll-margin-top:22px;overflow:hidden}
.day-photo{position:relative;background:#e7eee9}
.day-photo img{display:block;width:100%;height:100%;max-height:385px;min-height:265px;object-fit:cover}
.day-photo figcaption{border-radius:0}
.day-content{padding:22px 25px}
.day-top{display:flex;gap:12px;align-items:start;justify-content:space-between;flex-wrap:wrap}
.day-state{font-size:12px;font-weight:700;border:1px solid #a9c4b8;border-radius:20px;padding:5px 11px;background:#f0f8f4;max-width:240px}
.day-state[data-code="3"],.day-state[data-code="4"],.day-state[data-code="5"]{background:#fff3e8;border-color:#d2b59b}
.waypoints{font-size:.92rem;font-weight:600;color:#375951}
.sense{font-size:1.04rem}.decision{border-left:3px solid #2c7667;padding:3px 0 3px 15px;margin:15px 0;background:#f7faf8}
.decision p{margin:3px 0}.caution{font-size:14px;color:#40574e}
.day-tools{margin:17px 0 0;padding-top:15px;border-top:1px solid #dbe6df}
.day-tools strong{font-size:14px;text-transform:uppercase;letter-spacing:.07em}
.day-tools ul{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:9px;grid-template-columns:repeat(2,minmax(0,1fr))}
.day-tools li{margin:0;background:#edf5f2;padding:10px 12px;border-radius:6px}
.day-tools a{display:block;font-weight:750;line-height:1.3}.day-tools small{display:block;color:#4a6259;font-size:12px;line-height:1.45;margin-top:3px}
.map-bridge{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:center;margin:38px 0;background:#f3f7f5;padding:18px;border-radius:12px}
.map-bridge img{display:block;width:100%;height:auto;border-radius:7px}
.feasibility{background:var(--light);border:1px solid var(--border);border-radius:12px;padding:22px;margin:30px 0}
.controls{display:flex;gap:16px;align-items:end;flex-wrap:wrap}
label{font-size:14px;font-weight:700;display:grid;gap:6px}
select{font:inherit;background:#fff;border:1px solid #8ba39c;border-radius:5px;padding:10px;min-width:160px}
#trip-brief{margin-top:15px;font-size:15px;color:#405b53}
details{font-size:14px;margin-top:16px}
summary{cursor:pointer;font-weight:700}
.sources{background:#f6f7f4;padding:24px;border-radius:10px;margin:35px 0}
footer{border-top:1px solid var(--border);padding:24px 0;font-size:14px;color:var(--muted)}
@media(max-width:820px){.hero{grid-template-columns:1fr}.day{grid-template-columns:1fr}.day-photo img{height:240px;min-height:0;max-height:none}.map-bridge{grid-template-columns:1fr}}
@media(max-width:550px){.summary-grid{grid-template-columns:1fr}.day-content{padding:18px 16px}.day-tools ul{grid-template-columns:1fr}.day-photo img{height:220px}h1{font-size:35px}.sources{padding:18px}}
"""



STYLES += """
/* Live, constraint-driven visitor decisions. Keep source stories and 10 photos. */
.ct-personalize{background:#f0f6f2;border:1px solid #c5d6cc;border-radius:14px;padding:23px;margin:30px 0 38px;scroll-margin-top:20px}
.ct-personalize .eyebrow{display:block;margin-bottom:10px}
.ct-personalize h2{max-width:780px}
.ct-personal-intro{max-width:800px}
.ct-personal-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 18px;margin:19px 0}
.ct-personal-controls>label{display:flex;flex-direction:column;gap:8px}
.ct-personal-controls select{width:100%;min-width:0}
.ct-personal-choices{grid-column:1/-1;border:1px solid #c9ded2;border-radius:8px;padding:12px 16px;display:flex;flex-wrap:wrap;gap:12px 25px}
.ct-personal-choices legend{padding:0 6px;font-weight:750}
.ct-personal-choices label{display:flex;gap:8px;align-items:center;font-size:14px;font-weight:650}
.ct-personal-choices input{width:17px;height:17px;accent-color:#155b67}
.ct-personal-summary{border-left:4px solid #236e5c;background:#fff;padding:16px 20px;margin:18px 0}
.ct-personal-summary h3{font:600 24px/1.3 Georgia,serif}
.ct-personal-summary p{margin:8px 0}
.ctp-warning{color:#854a19;font-weight:650;font-size:14px}
.ct-personal-alternate{background:#e3efea;padding:14px 17px;border-radius:8px;margin:16px 0}
.ct-personal-alternate p{font-size:15px;margin:6px 0}
.ct-plan-button{cursor:pointer;background:#155b67;border:0;color:white;border-radius:6px;padding:10px 15px;font-weight:700;margin-top:6px}
.ct-personal-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:20px 0}
.ct-personal-actions>a{font-size:15px;font-weight:750}
.ct-personal-day-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:20px 0}
.ct-personal-day{background:#fff;border:1px solid #d0e0d6;border-radius:10px;padding:17px}
.ct-personal-day[data-state="over"],.ct-personal-day[data-state="unverified"]{border-left:4px solid #b77839}
.ct-personal-day-head{display:flex;flex-wrap:wrap;gap:7px;justify-content:space-between;align-items:start}
.ct-personal-day h4{font:600 20px/1.3 Georgia,serif;margin:0 0 7px}
.ct-personal-state{font-size:12px;background:#eff5f1;border-radius:20px;padding:4px 8px;font-weight:750}
.ct-personal-day[data-state="over"] .ct-personal-state,.ct-personal-day[data-state="unverified"] .ct-personal-state{background:#fdf0e5}
.ct-personal-stops{font-size:14px;color:#4a6259}
.ct-personal-miles{font-size:13px;color:#405c51}
.ct-personal-note{font-size:13px;color:#6a5140}
.ct-personal-day-body{display:flex;gap:14px;align-items:start;margin:16px 0}
.ct-personal-photo{width:145px;flex:none;margin:0}
.ct-personal-photo img{width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:7px;display:block}
.ct-personal-photo figcaption{font-size:10px;line-height:1.45;margin:5px 0}
.ct-personal-advice{min-width:0;flex:1;font-size:14px}
.ct-personal-advice ul{margin:8px 0;padding-left:18px}
.ct-personal-advice li{margin:8px 0}
.ct-personal-advice li a{display:block;font-weight:750}
.ct-personal-advice small{display:block;color:#465f54;line-height:1.4}
.ct-personal-day>a:last-child{font-size:13px;font-weight:700}
.ct-personal-share{display:flex;flex-wrap:wrap;gap:8px;margin:13px 0}
.ct-personal-share input{min-width:0;flex:1 1 250px;max-width:100%;background:#fff;border:1px solid #9eb5a9;border-radius:5px;padding:10px}
.ct-personal-share button{padding:10px 14px;cursor:pointer;border:1px solid #155b67;border-radius:5px;background:#155b67;color:#fff;font-weight:700}
.ct-personalize .ct-personal-footnote{font-size:13px;color:#4b6558}
#ct-personalize:not([data-js="on"]) .ct-personal-controls{display:none}
@media(max-width:790px){
 .ct-personal-controls{grid-template-columns:repeat(2,minmax(0,1fr))}
 .ct-personal-day-grid{grid-template-columns:1fr}
}
@media(max-width:480px){
 .ct-personalize{padding:16px;margin:20px 0}
 .ct-personal-controls{grid-template-columns:1fr}
 .ct-personal-day-body{flex-direction:column}
 .ct-personal-photo{width:100%;max-width:260px}
 .ct-personal-day h4{font-size:19px}
}
@media print{
 header,main > :not(#plan-your-trip),footer{display:none!important}
 .ct-personalize{border:0;padding:0;margin:0;background:#fff}
 .ct-personal-controls,.ct-personal-share,.ct-personal-actions,.ct-plan-button{display:none!important}
 .ct-personal-day-grid{display:block}
 .ct-personal-day{break-inside:avoid;margin:12px 0}
 .ct-personal-photo img{max-height:100px}
}
"""


def render(data: list[dict], ledger: dict, visual: dict, traveler: dict) -> str:
    rows = []
    for d in data:
        story = visual["days"][str(d["day"])]
        badge = {
            "workable": "Room for a meaningful stop",
            "tight": "Give this day some breathing room",
            "overloaded": "Lighten this day's plans",
            "source-gap": "Verify the final road approach",
        }[d["baseline"]]
        rows.append(f"""<article class="day" id="day-{d['day']}" data-day="{d['day']}" data-status="{d['baseline']}">
{photo_html(story["photo"])}
<div class="day-content">
  <div class="day-top"><div><span class="eyebrow">DAY {d['day']:02d} · {esc(story['strap'])}</span>
    <h3>{esc(d['overnight'])}</h3></div>
    <span class="day-state" aria-live="polite">{esc(badge)}</span></div>
  <p class="waypoints">{esc(d['summary'])}</p>
  <p class="sense">{esc(story['fieldNote'])}</p>
  <div class="decision"><strong>{esc(story['focus'])}</strong><p>{esc(d['choose'])}</p></div>
  <p class="caution"><strong>Before you commit:</strong> {esc(d['caution'])}</p>
  {tools_html(d['day'], story['tools'])}
</div></article>""")
    schema = json.dumps({
        "@context": "https://schema.org", "@type": "Article",
        "headline": "Lake Superior Circle Tour: 10-Day Itinerary, Overnight Stops & What to Do",
        "mainEntityOfPage": CANONICAL, "dateModified": VERSION,
        "image": visual["hero"]["src"],
        "author": {"@type": "Person", "name": "Chris Izworski", "url": "https://chrisizworski.com/#person"},
        "publisher": {"@type": "Organization", "name": "Chris Izworski", "url": "https://chrisizworski.com/"}
    }, separators=(",", ":"), ensure_ascii=False).replace("<", "\\u003c")
    sources = "".join(f'<li><a href="{esc(url)}" rel="noopener noreferrer">{esc(title)}</a></li>' for title, url in SOURCE_LINKS)
    embedded = json.dumps({"version": VERSION, "days": data, "basis": "source-bounded editorial mileage"}, separators=(",", ":"), ensure_ascii=False).replace("<", "\\u003c")
    traveler_embedded = json.dumps(traveler, separators=(",", ":"), ensure_ascii=False).replace("<", "\\u003c")
    sample = traveler["options"]["10"]["days"]
    constrained = [str(day["day"]) for day in sample if day["driveAllowanceHours"] > 5]
    example_warning = ("Under a five-hour sample driving limit, days " + ", ".join(constrained) +
                       " run too long. The final Pigeon River park approach still needs verification." if constrained else
                       "The original ten-day itinerary remains an editorial plan, not turn-by-turn navigation.")
    rendered = "\n".join(rows)
    jump = " ".join(f'<a href="#day-{i}">Day {i}</a>' for i in range(1, 11))
    hero = photo_html(visual["hero"], hero=True)
    return f"""<!DOCTYPE html>
<html lang="en-US"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lake Superior Circle Tour: 10-Day Itinerary &amp; Stops</title>
<meta name="description" content="Lake Superior Circle Tour in 10 days: photos, overnight towns, park and freighter tools, and daily stop choices from Duluth through Ontario.">
<link rel="canonical" href="{CANONICAL}">
<meta name="author" content="Chris Izworski">
<meta property="og:type" content="article">
<meta property="og:title" content="Lake Superior Circle Tour: 10 Days of Parks, Shores &amp; Small Towns">
<meta property="og:description" content="Follow the shore with ten visual days, overnight stops, national park choices, lake views and linked local planning tools.">
<meta property="og:url" content="{CANONICAL}">
<meta property="og:image" content="https://chrisizworski.com/assets/search/lake-superior-circle-tour-map.png">
<meta name="robots" content="index,follow,max-image-preview:large">
<script type="application/ld+json">{schema}</script>
<style>{STYLES}</style></head>
<body><header><a href="/">Chris Izworski</a> / <a href="/lake-superior-circle-tour/">Lake Superior Circle Tour</a> / 10-day field guide</header>
<main>
<section class="hero"><div>
<span class="eyebrow">Lake Superior field guide · 10 days · Duluth to Duluth</span>
<h1>Lake Superior Circle Tour: ten days along the wild shore</h1>
<p class="lead">Watch a freighter slip beneath Duluth's lift bridge. Walk the copper-colored cliffs of Pictured Rocks. Hear the big water at Tahquamenon, then follow Ontario's granite shore toward Thunder Bay.</p>
<p>This is the <strong>day-by-day trip I'd build around</strong>: one good experience at a time, overnight towns you can picture, and the tools to decide what makes sense on the day you're there. You can't see every park in ten days. That's the point of choosing well.</p>
<div class="buttons"><a class="button" href="#plan-your-trip">Build a trip around your time</a>
<a class="button secondary" href="#ten-days">Read the ten-day field guide</a>
<a class="button secondary" href="/lake-superior-circle-tour/?itinerary=10&amp;direction=counterclockwise#itin-10">Open the interactive Circle Tour map</a></div>
</div>{hero}</section>
<section class="summary-grid" aria-label="At a glance">
<div><strong>10 days</strong>Take a balanced loop, with choices for each stop</div>
<div><strong>31 stops mapped</strong>The complete route and all destinations are in the main explorer</div>
<div><strong>2 crossings</strong>Check U.S. and Canadian entry requirements</div>
</section>
<section class="overview" aria-label="How to use this guide">
<p><strong>Choose the experience, then use the right tool.</strong> Each day below pairs a real place and photograph with tools already built for that stretch of shore. Follow the planner links for current available observations, park-specific trade-offs and official sources. Day 9 is a long travel day; Day 10 includes a border crossing.</p>
<p><a href="/lake-superior-circle-tour/">Need a different pace? Explore the full 7-, 10-, and 15-day itineraries.</a></p>
</section>
<section class="ct-personalize" id="plan-your-trip" aria-labelledby="ct-prefer-heading">
<div id="ct-personalize" data-js="none">
<span class="eyebrow">Make this your trip · Source-checked planning</span>
<h2 id="ct-prefer-heading">How much driving are you willing to trade for time at the lake?</h2>
<p class="ct-personal-intro">Tell the planner how long you have, when you're traveling and what you love. It compares <strong>the actual 7-, 10-, and 15-day published routes</strong>, recommends places from those specific days, and points you to the tools that answer the next question. No fabricated extra road legs or lodging reservations.</p>
<p><strong>Starting point:</strong> Duluth, Minnesota · Counterclockwise Lake Superior loop. To choose another start or direction, use the <a href="/lake-superior-circle-tour/">full 31-stop route map</a>.</p>
<div class="ct-personal-controls" role="group" aria-label="Your travel preferences">
<label for="ct-prefer-days">Days you have<select id="ct-prefer-days"><option value="7">7 days</option><option value="10" selected>10 days</option><option value="15">15 days</option></select></label>
<label for="ct-prefer-drive">Maximum sample driving per day<select id="ct-prefer-drive"><option value="4">4 hours</option><option value="5" selected>5 hours</option><option value="6">6 hours</option><option value="8">8 hours</option></select></label>
<label for="ct-prefer-month">Month of travel<select id="ct-prefer-month"><option value="1">January</option><option value="2">February</option><option value="3">March</option><option value="4">April</option><option value="5">May</option><option value="6">June</option><option value="7">July</option><option value="8" selected>August</option><option value="9">September</option><option value="10">October</option><option value="11">November</option><option value="12">December</option></select></label>
<fieldset class="ct-personal-choices"><legend>What makes this trip worth taking?</legend>
<label><input type="checkbox" id="ct-prefer-hiking" checked>Hiking</label>
<label><input type="checkbox" id="ct-prefer-waterfalls" checked>Waterfalls</label>
<label><input type="checkbox" id="ct-prefer-shipwatch">Freighters and maritime history</label>
<label><input type="checkbox" id="ct-prefer-pictured" checked>Pictured Rocks is a must-see</label>
</fieldset></div>
<div class="ct-personal-summary" id="ct-prefer-summary" aria-live="polite">
<h3>See where your preferences meet the road</h3>
<p>{esc(example_warning)}</p>
<p>Without JavaScript, the ten-day photograph-rich field guide below and <a href="/lake-superior-circle-tour/">the full route map</a> are still available.</p></div>
<div class="ct-personal-alternate" id="ct-prefer-alternate">
<p>The 15-day published route spreads the long northern Ontario stretch across two days, although it still needs independent road-approach and park-access checks.</p></div>
<div class="ct-personal-actions">
<a id="ct-prefer-map" href="/lake-superior-circle-tour/?itinerary=10&amp;direction=counterclockwise#itin-10">Open the original ten-day route and all 31 stops on the map</a>
</div>
<div class="ct-personal-day-grid" id="ct-prefer-timeline" aria-label="Your source-linked travel days">
<p>The complete ten-day route with photographs, overnight suggestions and specialist tools is below. <a href="#ten-days">Browse the field guide.</a></p>
</div>
<div class="ct-personal-share">
<input id="ct-prefer-share" readonly aria-label="Shareable itinerary preference link" value="https://chrisizworski.com/lake-superior-circle-tour/10-day/#plan-your-trip">
<button type="button" id="ct-prefer-copy">Copy trip link</button>
<button type="button" id="ct-prefer-print">Print my plan</button>
</div>
<p class="ct-personal-footnote" id="ct-prefer-copy-status">The page remains readable without JavaScript. Interactive controls require a modern browser.</p>
<p class="ct-personal-footnote">Driving figures are conservative editorial allowances, not traffic forecasts. Crossing reserves are unverified when official waits are absent. All parks, lodging, boat tours, border requirements and roads must be checked independently. No purchase or booking is made.</p>
</div></section>

<section id="ten-days" aria-labelledby="days-title">
<h2 id="days-title">Ten days. Ten different stretches of shoreline.</h2>
<p>From harbor towns to quiet bays, here's where I'd focus my time. The stop choices and photographs are destination-specific, not today's live conditions. Open a linked tool when a decision depends on current access or observations.</p>
<nav class="day-jump" aria-label="Jump to itinerary day">{jump}</nav>
<div class="days">{rendered}</div>
</section>
<section class="map-bridge" aria-label="Open the full route map">
<div><span class="eyebrow">See the geography</span><h2>The whole shore, in one loop</h2>
<p>The day cards are the journey. The <a href="/lake-superior-circle-tour/">31-stop interactive map</a> is where you change direction, choose a different starting point and see how the shorelines relate to each other.</p>
<p>The map is not turn-by-turn navigation. Verify your actual driving route, park approaches, border waits and operating seasons before setting off.</p>
<a class="button" href="/lake-superior-circle-tour/?itinerary=10&amp;direction=counterclockwise#itin-10">Explore the full Circle Tour map</a></div>
<a href="/lake-superior-circle-tour/" aria-label="Open the full Lake Superior Circle Tour map"><img src="/assets/search/lake-superior-circle-tour-map.png" loading="lazy" decoding="async" alt="Map of the complete Lake Superior shoreline route across Wisconsin, Michigan, Ontario and Minnesota" width="900" height="600"></a>
</section>
<section class="feasibility" aria-labelledby="check-head">
<h2 id="check-head">How much time can you spend along the way?</h2>
<p>This is an optional gut check for the itinerary, not a prediction of arrival time. Adjust your available hours and season; the planner flags days that may be too crowded or have incomplete road evidence.</p>
<div class="controls"><label>Hours available each day<select id="ct-hours"><option value="8">8 hours</option><option value="9" selected>9 hours</option><option value="10">10 hours</option><option value="12">12 hours</option></select></label>
<label>Travel season<select id="ct-season"><option value="summer" selected>Summer</option><option value="autumn">September–November</option><option value="winter">December–March</option></select></label></div>
<p id="trip-brief" role="status" aria-live="polite">The day-by-day guide above works without this interactive check.</p>
<details><summary>What do the mileage numbers actually tell me?</summary>
<p>The original ten-day itinerary totals <strong>approximately 1,358 published planning miles</strong>, but that sum is not a measured driving route. It doesn't prove the stops fit, predict an arrival time or establish a park is open. For example, the roughly 52-mile Ontonagon–Houghton gateway estimate does not include the Copper Harbor scenic detour; the 38-mile Thunder Bay–Pigeon River reference reaches the border, not the Grand Portage park entrance.</p>
<p>For unavailable official crossing waits, the guide reserves an unverified 45-minute border-time allowance. For the sample time budget, the Rust engine uses the published day estimates divided by 47 mph with a 20% allowance for slower travel, plus planned visit time. This is an editorial comparison, not an actual road-speed forecast. When a leg has an unresolved approach or a winter-sensitive experience lacks confirmation, the result is withheld; it never becomes a green light to drive.</p></details>
</section>
<section class="sources"><h2>Check the authorities before you go</h2>
<p>These official sources provide context for roads, border requirements and park access. A link is not evidence that today's route or facility is open. Last editorial reconciliation: {VERSION}.</p>
<ul>{sources}</ul>
<p><a href="/lake-superior-circle-tour/">Return to the full Circle Tour map, original itineraries and all 31 stops</a></p></section>
<footer>Compiled by <a href="https://chrisizworski.com/#person">Chris Izworski</a>. Destination photography is credited beside each image. Route decisions and linked tools are editorial; confirm current conditions with the source. Updated November 14, 2026.</footer>
</main>
<script id="ct-intelligence-days" type="application/json">{embedded}</script>
<script id="ct-traveler-presets" type="application/json">{traveler_embedded}</script>
<script defer src="/assets/circle-tour-rust-itinerary.js?v=20261114-3"></script>
<script defer src="/assets/circle-tour-trip-feasibility.js?v=20261114-1"></script>
<script defer src="/assets/circle-tour-traveler-engine.js?v=20261114-1"></script>
<script defer src="/assets/circle-tour-traveler-ui.js?v=20261114-1"></script>
</body></html>
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    source = HUB.read_text(encoding="utf8")
    ledger = json.loads(LEDGER.read_text(encoding="utf8"))
    if ledger["reviewed"] != VERSION or len(ledger["edges"]) != 30:
        raise SystemExit("Missing or unreviewed source evidence")
    days = extract(source, ledger)
    visual = json.loads(VISUALS.read_text(encoding="utf8"))
    validate_visuals(visual, source)
    traveler_catalog = json.loads(TRAVELER.read_text(encoding='utf8'))
    traveler = extract_traveler_presets(source, ledger, traveler_catalog, visual)
    output = render(days, ledger, visual, traveler)
    if args.check:
        if not OUT.exists() or OUT.read_text(encoding="utf8") != output:
            raise SystemExit("Circle Tour 10-day static page is missing or stale")
    else:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(output, encoding="utf8")
    print(f"Circle Tour: 10 days, {sum(x['miles'] for x in days)} editorial miles, "
          f"{sum(not x['complete'] for x in days)} days with an unresolved gateway; "
          f"{'checked' if args.check else 'generated'}")

if __name__ == "__main__":
    main()
