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

def render(data: list[dict], ledger: dict) -> str:
    rows = []
    for d in data:
        links = f'/lake-superior-circle-tour/?itinerary=10&direction=counterclockwise#itin-10'
        badge = {"workable": "An estimated day with room for a stop",
                 "tight": "Tight day: protect the daylight margin",
                 "overloaded": "Too ambitious with these activity assumptions",
                 "source-gap": "Driving clock held: a road approach is unresolved"}[d["baseline"]]
        legs = " · ".join(d["incompleteLegs"]) if d["incompleteLegs"] else "No flagged missing gateway leg; still not GPS-verified"
        rows.append(f"""<article class="day" id="day-{d['day']}" data-day="{d['day']}" data-status="{d['baseline']}">
  <div class="day-top"><div><span class="eyebrow">DAY {d['day']:02d} · {d['miles']} PUBLISHED MILES</span>
    <h3>{esc(d['overnight'])}</h3></div>
    <span class="day-state" aria-live="polite">{esc(badge)}</span></div>
  <p class="waypoints">{esc(d['summary'])}</p>
  <p>{esc(d['narrative'])}</p>
  <div class="decision"><strong>Worth your time</strong><p>{esc(d['choose'])}</p></div>
  <p class="caution"><strong>Before you commit:</strong> {esc(d['caution'])}</p>
  <details><summary>What does the mileage prove?</summary>
    <p>{d['miles']} miles is the published planning estimate for this itinerary day, not a measured route through every listed attraction. {esc(legs)}. All times exclude live traffic and stops beyond the selected experience.</p>
    <p><a href="{esc(links)}">Open the original route and its road-reality sources</a></p>
  </details>
</article>""")
    schema = json.dumps({
      "@context":"https://schema.org", "@type":"Article",
      "headline":"Lake Superior Circle Tour: 10-Day Itinerary, Overnight Stops & Time Reality",
      "mainEntityOfPage": CANONICAL, "dateModified":VERSION,
      "author":{"@type":"Person","name":"Chris Izworski","url":"https://chrisizworski.com/#person"},
      "publisher":{"@type":"Organization","name":"Chris Izworski","url":"https://chrisizworski.com/"}
    }, separators=(",",":"), ensure_ascii=False).replace("<", "\\u003c")
    sources = "".join(f'<li><a href="{esc(url)}" rel="noopener noreferrer">{esc(title)}</a></li>' for title,url in SOURCE_LINKS)
    embedded = json.dumps({"version":VERSION,"days":data,"basis":"source-bounded editorial mileage"}, separators=(",",":"), ensure_ascii=False).replace("<","\\u003c")
    rendered = "\n".join(rows)
    return f"""<!DOCTYPE html>
<html lang="en-US"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lake Superior Circle Tour: 10-Day Itinerary &amp; Stops</title>
<meta name="description" content="Plan Lake Superior's 10-day Circle Tour with 10 overnight bases, 31 mapped stops, realistic time budgets and honest road-mileage cautions. No account needed.">
<link rel="canonical" href="{CANONICAL}">
<meta name="author" content="Chris Izworski">
<meta property="og:type" content="article"><meta property="og:title" content="Lake Superior Circle Tour: 10-Day Itinerary &amp; Overnight Stops">
<meta property="og:description" content="A realistic 10-day road trip around Lake Superior with daily choices, overnight stops, a time-budget check and source-backed road caveats.">
<meta property="og:url" content="{CANONICAL}">
<meta property="og:image" content="https://chrisizworski.com/assets/search/lake-superior-circle-tour-map.png">
<meta name="robots" content="index,follow">
<script type="application/ld+json">{schema}</script>
<style>
:root{{--ink:#17342e;--sea:#155b67;--muted:#596962;--light:#f4f7f4;--border:#dae4df}}
*{{box-sizing:border-box}}body{{margin:0;color:var(--ink);font:17px/1.68 system-ui,-apple-system,Segoe UI,Arial,sans-serif;background:#fff}}
a{{color:#115b69}}a:focus-visible,button:focus-visible,select:focus-visible{{outline:3px solid #ce8a16;outline-offset:3px}}
header{{background:#153d42;color:#fff;padding:20px max(18px,calc((100% - 1120px)/2))}}
header a{{color:#e9f4f1}}main{{max-width:1100px;margin:auto;padding:24px 18px 60px}}
.hero{{display:grid;grid-template-columns:1.3fr 1fr;gap:28px;align-items:center;padding:26px 0 34px}}
.eyebrow{{font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#397566}}
h1{{font:600 clamp(31px,4.7vw,53px)/1.11 Georgia,serif;margin:10px 0 18px}}
h2{{font:600 clamp(25px,3vw,35px)/1.2 Georgia,serif;margin:0 0 12px}}
h3{{font:600 26px/1.2 Georgia,serif;margin:5px 0 0}}p{{margin:12px 0}}
.hero img{{width:100%;height:auto;border-radius:10px;box-shadow:0 12px 35px #17342e18}}
.note{{color:var(--muted);font-size:14px}}.buttons{{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}}
.button{{display:inline-block;background:var(--sea);color:#fff;padding:10px 15px;text-decoration:none;font-weight:700;border-radius:6px}}
.button.secondary{{background:#e8f1ed;color:#17342e}}
.feasibility{{background:var(--light);border:1px solid var(--border);border-radius:12px;padding:20px;margin:18px 0 32px}}
.controls{{display:flex;gap:16px;align-items:end;flex-wrap:wrap}}
label{{font-size:14px;font-weight:700;display:grid;gap:6px}}select{{font:inherit;background:#fff;border:1px solid #8ba39c;border-radius:5px;padding:10px;min-width:160px}}
#trip-brief{{margin-top:15px;font-size:15px;color:#405b53}}.summary-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0 30px}}
.summary-grid div{{background:#f1f6f3;border-radius:7px;padding:14px}}.summary-grid strong{{font-size:22px;display:block}}
.days{{display:grid;gap:18px}}.day{{border:1px solid var(--border);border-radius:10px;padding:20px 22px;scroll-margin-top:20px}}
.day-top{{display:flex;gap:12px;align-items:start;justify-content:space-between;flex-wrap:wrap}}
.day-state{{font-size:13px;font-weight:700;border:1px solid #a9c4b8;border-radius:20px;padding:5px 11px;background:#f0f8f4}}
.day-state[data-code="3"],.day-state[data-code="4"],.day-state[data-code="5"]{{background:#fff3e8;border-color:#d2b59b}}
.waypoints{{font-weight:600;color:#375951}}
.decision{{border-left:3px solid #2c7667;padding:3px 0 3px 15px;margin:16px 0;background:#f7faf8}}
.decision p{{margin:3px 0}}.caution{{font-size:15px;color:#40574e}}
details{{font-size:14px;margin-top:14px}}summary{{cursor:pointer;font-weight:700}}
.sources{{background:#f6f7f4;padding:24px;border-radius:10px;margin:35px 0}}
footer{{border-top:1px solid var(--border);padding:24px 0;font-size:14px;color:var(--muted)}}
@media(max-width:750px){{.hero{{grid-template-columns:1fr}}.summary-grid{{grid-template-columns:1fr 1fr}}.day{{padding:17px}}}}
@media(max-width:440px){{.summary-grid{{grid-template-columns:1fr}}h1{{font-size:34px}}}}
</style></head>
<body><header><a href="/">Chris Izworski</a> / <a href="/lake-superior-circle-tour/">Lake Superior Circle Tour</a> / 10-day field guide</header>
<main><section class="hero"><div>
<span class="eyebrow">Road trip field guide · 10 days · Duluth to Duluth</span>
<h1>Lake Superior Circle Tour: a 10-day itinerary you can actually plan around</h1>
<p>Lake Superior is much bigger than it looks on a map. Ten days is a good compromise: room for the Porcupine Mountains and Pictured Rocks, an Ontario shore that feels genuinely wild, and an unhurried evening or two beside the water.</p>
<p>Follow the published counterclockwise loop from Duluth through Wisconsin, Michigan, Ontario and Minnesota. The ten days below distinguish a destination from a driving waypoint. <strong>A published mileage is not a routed driving guarantee.</strong></p>
<div class="buttons"><a class="button" href="/lake-superior-circle-tour/?itinerary=10&direction=counterclockwise#itin-10">Open the 31-stop interactive map</a>
<a class="button secondary" href="#ten-days">Read the day-by-day route</a></div>
</div><img src="/assets/search/lake-superior-circle-tour-map.png" alt="Lake Superior Circle Tour map showing the route around Wisconsin, Michigan, Ontario and Minnesota" width="900" height="600"></section>
<section class="summary-grid" aria-label="Trip overview">
<div><strong>10 days</strong>9–10 nights, depending on arrival</div>
<div><strong>1,358 mi</strong>sum of editorial day estimates, not independently routed mileage</div>
<div><strong>Two borders</strong>Canadian entry and U.S. return; requirements and waits change</div></section>
<section class="feasibility" aria-labelledby="check-head"><h2 id="check-head">Does your daily schedule have room to breathe?</h2>
<p>Choose the time you can realistically spend on the road and at stops. The calculator preserves the published route and explicitly withholds a time verdict where a leg has incomplete driving evidence.</p>
<div class="controls"><label>Hours available each day<select id="ct-hours"><option value="8">8 hours</option><option value="9" selected>9 hours</option><option value="10">10 hours</option><option value="12">12 hours</option></select></label>
<label>Travel season<select id="ct-season"><option value="summer" selected>Summer</option><option value="autumn">September–November</option><option value="winter">December–March</option></select></label></div>
<p id="trip-brief" role="status" aria-live="polite">Calculating source-grounded time allowances…</p>
<p class="note">Not a live navigation or park-opening service. Driving allowance: published day miles ÷ 47 mph × 1.2, plus an editorial visit budget. Border time uses a 45-minute <em>unverified reserve</em> per crossing; check current official waits. Zero crossings does not mean a border is open.</p>
</section>
<section id="ten-days" aria-labelledby="days-title"><h2 id="days-title">Your day-by-day Circle Tour</h2><p class="note">Each day has one overnight base and a choice worth making. Route miles are editorial estimates. Do not assume every listed waypoint is a scheduled attraction or every park road is open.</p>
<div class="days">{rendered}</div></section>
<section class="sources"><h2>Check the authorities before you go</h2>
<p>These sources substantiate the gateway evidence and road/park checks. They are not a declaration that a park, border crossing or road is currently open. Last editorial reconciliation: {VERSION}.</p>
<ul>{sources}</ul><p><a href="/lake-superior-circle-tour/">Back to the full Lake Superior Circle Tour guide and map</a></p></section>
<footer>Compiled by <a href="https://chrisizworski.com/#person">Chris Izworski</a>. Route planning content updated November 14, 2026. No account required. No live traffic ETA asserted.</footer>
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
    output = render(days, ledger)
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
