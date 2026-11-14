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
        "The Upper Falls–Paradise–Whitefish route is approximately 25 miles from two sources; the Whitefish–Sault gateway estimate is about 73 miles. Choose one longer stop.",
        "These are gateway estimates; Lower Falls, parking approaches, and a scenic shore detour add time.", 2.0, True),
    8: ("Wawa", "Cross into Ontario, then let the Lake Superior coast widen. The road threads past high rock and enclosed bays through Lake Superior Provincial Park.",
        "Allow at least 45 minutes as an unverified border-time reserve when no current official passenger wait is available. Pick Old Woman Bay or a permitted park walk.",
        "The park's individual trail and day-use seasons differ. Border documents and any current closure alerts are separate checks.", 2.0, True),
    9: ("Thunder Bay", "This is a serious driving day. White River, Marathon, Nipigon and Thunder Bay each deserve attention, but not all in one afternoon.",
        "Choose one stop in the Marathon/Pukaskwa or Nipigon area. Start early and protect a meaningful daylight margin.",
        "A visit deep into Pukaskwa adds substantial time beyond the published gateway miles.", 1.0, True),
    10: ("Duluth", "Minnesota's North Shore is full of waterfalls, lighthouses and cliffs. The final day links Thunder Bay, the border, Grand Marais and Duluth.",
        "The published 38 miles from Thunder Bay reaches the Pigeon River border only, not Grand Portage State Park parking. Keep this as a flexible transit day.",
        "Border time, park approach mileage and optional North Shore detours are not reconciled into a verified arrival clock.", 1.0, True),
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


def validate_visuals(visual: dict, hub: str) -> None:
    """Keep every hero/day photo, credit and linked tool auditable at build time."""
    if visual.get("version") != 1 or set(visual.get("days", {})) != {str(i) for i in range(1, 11)}:
        raise ValueError("Visual guide must contain exactly ten days")
    photos = [visual["hero"]] + [visual["days"][str(i)]["photo"] for i in range(1, 11)]
    if len({photo["src"] for photo in photos}) != 11:
        raise ValueError("Every itinerary day needs its own place-specific licensed photo")
    for photo in photos:
        if not photo.get("src", "").startswith((
            "https://commons.wikimedia.org/wiki/Special:FilePath/",
            "https://thumb.wikimedia.org/wikipedia/commons/thumb/",
        )):
            raise ValueError("Photo must use an approved Wikimedia Commons source")
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
            f' · <a href="{esc(photo["licenseUrl"])}" rel="noopener noreferrer" target="_blank">{esc(photo["license"])}</a></span></figcaption></figure>')


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


def render(data: list[dict], ledger: dict, visual: dict) -> str:
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
    rendered = "\n".join(rows)
    jump = " ".join(f'<a href="#day-{i}">Day {i}</a>' for i in range(1, 11))
    hero = photo_html(visual["hero"], hero=True)
    return f"""<!DOCTYPE html>
<html lang="en-US"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lake Superior Circle Tour: 10-Day Itinerary &amp; Stops</title>
<meta name="description" content="Discover a 10-day Lake Superior Circle Tour with day-by-day photos, overnight towns, real park and freighter tools, and practical decisions from Duluth through Ontario.">
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
<div class="buttons"><a class="button" href="#ten-days">Explore the ten days</a>
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
<script defer src="/assets/circle-tour-rust-itinerary.js?v=20261114-3"></script>
<script defer src="/assets/circle-tour-trip-feasibility.js?v=20261114-1"></script>
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
    output = render(days, ledger, visual)
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
