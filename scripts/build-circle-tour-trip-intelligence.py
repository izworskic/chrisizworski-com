#!/usr/bin/env python3
"""Deterministic Circle Tour source reconciliation and crawlable visitor guide.
No network calls, invented road segments, parking pins, access grants, or ETA.
The original 31-stop HTML remains the itinerary and distance source of truth.
"""
from __future__ import annotations
import argparse
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "public/lake-superior-circle-tour/index.html"
EVIDENCE = ROOT / "data/circle-tour-trip-intelligence.json"
OUTPUT = ROOT / "public/assets/circle-tour-trip-intelligence.json"
GUIDE = ROOT / "public/lake-superior-circle-tour/10-day/index.html"
EXPECTED = {7: 1359, 10: 1358, 15: 1358}
ORDER = [str(n) for n in range(1, 13)] + ["31"] + [str(n) for n in range(13, 31)]
GAP_TARGETS = {("7", "8"), ("12", "31"), ("31", "13"), ("20", "21")}
URL = "https://chrisizworski.com/lake-superior-circle-tour/10-day/"
AUTHOR = "https://chrisizworski.com/#person"
PUBLISH_DATE = "2026-11-14"


def fail(message: str):
    raise ValueError("Circle Tour source gate: " + message)


def published_days(source: str, duration: int) -> list[dict]:
    start = source.find('id="itin-' + str(duration) + '"')
    stop = source.find('id="itin-' + str(duration + (3 if duration == 7 else 5)) + '"', start) if duration != 15 else len(source)
    if start < 0 or stop <= start:
        fail("missing itinerary " + str(duration))
    block = source[start:stop]
    matches = re.findall(
        r'<div class="itin-day" data-day="(\\d+)" data-stops="([\\d,]+)" data-miles="(\\d+)"',
        block,
    )
    days = [
        {"day": int(day), "stops": stops.split(","), "miles": int(miles)}
        for day, stops, miles in matches
    ]
    if len(days) != duration or sum(day["miles"] for day in days) != EXPECTED[duration]:
        fail("day count or published miles drifted for " + str(duration))
    for idx, day in enumerate(days):
        if day["day"] != idx + 1 or any(stop not in ORDER for stop in day["stops"]):
            fail("invalid source stop/day for itinerary " + str(duration))
        if idx and day["stops"][0] != days[idx - 1]["stops"][-1]:
            fail("non-contiguous published days")
    if days[0]["stops"][0] != "1" or days[-1]["stops"][-1] != "30":
        fail("published route is not a Duluth loop")
    return days


def reconcile(source: str, evidence: dict) -> dict:
    if evidence.get("schemaVersion") != 1 or len(evidence.get("sourceGaps", [])) != 4:
        fail("source ledger schema missing or invalid")
    if len(re.findall(r'class="stop-card"', source)) != 31:
        fail("31 stops no longer match the editorial source")
    if set((gap.get("from"), gap.get("to")) for gap in evidence["sourceGaps"]) != GAP_TARGETS:
        fail("four unresolved corridor identities changed")
    if len(evidence.get("dayNotes", {})) != 10:
        fail("ten individual visitor decisions are required")
    for gap in evidence["sourceGaps"]:
        to = gap["to"]
        card = re.search(r'id="stop-' + re.escape(to) + r'"[\\s\\S]*?</article>', source)
        if not card or not re.search(r'<span class="stop-dist" data-edge-verified="false"', card.group()):
            fail("a partial corridor was silently treated as an approved mileage: " + to)
        if gap.get("status") != "partial" or not gap.get("references"):
            fail("gap falsely promoted or lost references: " + to)
        for reference in gap["references"]:
            if not reference.get("url", "").startswith("https://"):
                fail("untrusted road source URL")
    plans = {}
    for duration in (7, 10, 15):
        days = published_days(source, duration)
        for day in days:
            # Preserves existing editorial *whole-day* miles and budget assumption.
            # Neither number is a verified road route or measured travel time.
            day["drivePlanningMinutes"] = round(day["miles"] / 47 * 1.2 * 60)
            day["borderReserveMinutes"] = (
                45 if (("13" in day["stops"] and "14" in day["stops"]) or
                       ("20" in day["stops"] and "21" in day["stops"])) else 0
            )
            day["visitPlanningMinutes"] = 90
            if duration == 10:
                detail = evidence["dayNotes"].get(str(day["day"]))
                if not detail or any(not detail.get(key) for key in
                    ("overnight", "experience", "decision", "source", "sourceLabel")):
                    fail("missing independent editorial visitor value for day " + str(day["day"]))
                if not detail["source"].startswith("https://"):
                    fail("invalid source for day " + str(day["day"]))
                day.update(detail)
        plans[str(duration)] = {
            "days": days, "totalPublishedMiles": EXPECTED[duration],
            "basis": "editorial-day-estimate-not-routed-mileage",
        }
    return {
        "schemaVersion": 1,
        "reviewedOn": evidence["reviewedOn"],
        "method": "Python reconciles the original published HTML with reviewed source notes; Rust checks optional day feasibility; no routed ETA or park access is inferred",
        "stopCount": 31,
        "routeOrder": ORDER,
        "itineraries": plans,
        "unresolvedCorridors": evidence["sourceGaps"],
        "assumptions": {
            "drivingAllowance": "published day miles / 47 mph × 1.2; NOT live navigation",
            "borderUnavailableReserveMinutes": 45,
            "defaultDayBudgetMinutes": 540,
            "defaultMainExperienceMinutes": 90,
        },
    }


def escape(value) -> str:
    return html.escape(str(value), quote=True)


def html_page(payload: dict) -> str:
    plan = payload["itineraries"]["10"]["days"]
    cards = []
    for day in plan:
        miles = day["miles"]
        border = day["borderReserveMinutes"]
        base = day["drivePlanningMinutes"] + border + 90
        remaining = 540 - base
        flag = "Over the 9-hour sample budget" if remaining < 0 else (
            "Little spare time" if remaining < 120 else "More room for exploring"
        )
        if miles >= 250:
            flag += " — long driving day"
        cards.append(f'''<article class="day" id="day-{day["day"]}">
<h3>Day {day["day"]}: {escape(day["overnight"])}</h3>
<p class="metrics"><strong>~{miles} published itinerary miles</strong> · planning allowance ~{day["drivePlanningMinutes"] / 60:.1f} hr
 · {escape(flag)}{f" · {border} min unverified border reserve" if border else ""}</p>
<p><strong>Make time for:</strong> {escape(day["experience"])}</p>
<p>{escape(day["decision"])}</p>
<p class="source"><a href="{escape(day["source"])}" rel="noopener noreferrer" target="_blank">{escape(day["sourceLabel"])}</a>
 · <a href="/lake-superior-circle-tour/#stop-{day["stops"][-1]}">See the stop in the 31-stop guide</a></p>
</article>''')
    gaps = []
    for gap in payload["unresolvedCorridors"]:
        refs = ", ".join(
            f'<a href="{escape(ref["url"])}" rel="noopener noreferrer" target="_blank">{escape(ref["name"])}</a>'
            for ref in gap["references"]
        )
        gaps.append(f'''<li><strong>{escape(gap["corridor"])}</strong>:
{escape(gap["editorialNote"])} Sources: {refs}.</li>''')
    article = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Lake Superior Circle Tour: A Realistic 10-Day Itinerary",
        "author": {"@id": AUTHOR},
        "mainEntityOfPage": URL,
        "datePublished": PUBLISH_DATE,
        "dateModified": PUBLISH_DATE,
        "description": "Ten daily decisions with overnight bases, driving allowance cautions, border considerations and source-backed alternatives.",
    }
    breadcrumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Lake Superior Circle Tour", "item": "https://chrisizworski.com/lake-superior-circle-tour/"},
        {"@type": "ListItem", "position": 2, "name": "10-Day Itinerary", "item": URL},
    ]}
    return f'''<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lake Superior Circle Tour 10-Day Itinerary: Daily Plan &amp; Map</title>
<meta name="description" content="Plan a realistic 10-day Lake Superior Circle Tour. Ten day-by-day stops, overnight towns, mileage cautions, border crossings, map and adjustable trip-feasibility check.">
<link rel="canonical" href="{URL}">
<meta name="author" content="Chris Izworski">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="Lake Superior Circle Tour: A Realistic 10-Day Itinerary">
<meta property="og:description" content="Ten overnight bases and honest time-budget decisions, not an invented driving ETA.">
<meta property="og:url" content="{URL}">
<script type="application/ld+json">{json.dumps(article, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(breadcrumbs, ensure_ascii=False)}</script>
<style>
:root{{--ink:#183934;--muted:#5c6c68;--line:#d8e2dc;--accent:#145747;--cream:#f5f8f4}}*{{box-sizing:border-box}}
body{{margin:0;font:16px/1.65 system-ui,-apple-system,sans-serif;color:var(--ink);background:#fff}}
a{{color:#075a55;text-underline-offset:3px}}a:focus-visible,select:focus-visible{{outline:3px solid #ffb347;outline-offset:3px}}
header{{padding:14px max(20px,calc((100vw - 980px)/2));background:var(--ink);color:white}}
header a{{color:white}}header nav{{display:flex;gap:18px;flex-wrap:wrap}}
main{{max-width:980px;margin:auto;padding:20px 20px 64px}}h1{{font-size:clamp(2rem,4.4vw,3rem);line-height:1.15;margin:13px 0}}
h2{{font-size:clamp(1.4rem,3vw,1.85rem);line-height:1.25;margin:36px 0 15px}}h3{{font-size:1.18rem;line-height:1.35}}
.lead{{font-size:1.16rem;max-width:780px}}.eyebrow{{font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--accent)}}
.summary{{border-left:4px solid var(--accent);padding:14px 18px;background:var(--cream);margin:24px 0}}
.grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}}.day{{border:1px solid var(--line);border-radius:10px;padding:19px;background:#fff}}
.day h3{{margin:0 0 8px}}.day p{{margin:10px 0}}.metrics{{font-size:.86rem;color:var(--muted)}}.source{{font-size:.83rem}}
.fine{{color:var(--muted);font-size:.9rem}}.cti-feasibility{{background:var(--cream);padding:20px;border:1px solid var(--line);border-radius:10px;margin-top:22px}}
.cti-controls{{display:flex;flex-wrap:wrap;gap:14px}}.cti-controls label{{display:grid;gap:4px;font-weight:650;font-size:.9rem}}
.cti-controls select{{padding:10px;border:1px solid #aebcb5;border-radius:5px;background:white;min-width:140px;font-size:1rem}}
.cti-output{{overflow-x:auto;margin-top:16px}}.cti-output table{{width:100%;border-collapse:collapse;font-size:.9rem}}
.cti-output th,.cti-output td{{border-bottom:1px solid #d5dfd8;padding:9px;text-align:left;vertical-align:top}}
.cti-flag{{font-weight:700}}.cti-flag[data-level="3"]{{color:#92331c}}.cti-flag[data-level="2"]{{color:#7d4e13}}
footer{{border-top:1px solid var(--line);padding:24px 20px;color:var(--muted);text-align:center;font-size:.88rem}}
@media(max-width:730px){{.grid{{grid-template-columns:1fr}}.day{{padding:16px}}.cti-feasibility{{padding:14px}}}}
</style>
</head>
<body>
<header><nav aria-label="Site and trip navigation"><a href="/">Chris Izworski</a>
<a href="/lake-superior-circle-tour/">Full Circle Tour map and 31 stops</a><a href="/tools/">Explore tools</a></nav></header>
<main>
<p class="eyebrow">The Lake Superior field guide · Ten-day planning edition</p>
<h1>Lake Superior Circle Tour: A realistic 10-day itinerary</h1>
<p class="lead">Ten days around Lake Superior can work, but the shore is too big to treat every park as a quick roadside stop. This plan begins and ends in Duluth, passes through Wisconsin, Michigan, Ontario and Minnesota, and deliberately protects time for the scenery.</p>
<div class="summary"><strong>At a glance:</strong> 10 days · approximately 1,358 miles from our <em>published itinerary estimates</em> · nine or ten overnights depending on arrival · two international crossings. Actual driving mileage can differ because scenic spurs, park entrances and detours are not fully measured. <a href="/lake-superior-circle-tour/">Compare the 7-, 10-, and 15-day plans on the full interactive map</a>.</div>
<section aria-labelledby="pace"><h2 id="pace">How to keep the ten days enjoyable</h2>
<p>Give Bayfield time on the water, protect a slow day in the Porcupine Mountains, and choose one main Pictured Rocks experience rather than trying to squeeze in a boat tour and a major hike. The long Wawa-to-Thunder Bay transit day requires restraint. The final North Shore drive is a chance to pick <em>one</em> favorite park, not a checklist of every waterfall.</p>
<p>Numbers below use the guide's existing estimated day mileages and a conservative <strong>47 mph × 1.2</strong> planning allowance. This is a coarse budget, <strong>not a live routed ETA or access confirmation</strong>. Real conditions, construction, road closures, fuel, parking and border delays must be checked independently.</p>
</section>
<section class="cti-feasibility" id="cti-feasibility" data-preset="10" aria-labelledby="cti-heading">
<h2 id="cti-heading">Will this trip fit your day?</h2>
<p class="fine">Change your daily time and the amount of time reserved for a major experience. The Rust planning check evaluates room in the day without manufacturing missing road distances.</p>
<div class="cti-controls"><label>Hours available each day<select id="cti-hours"><option value="8">8 hours</option><option value="9" selected>9 hours</option><option value="11">11 hours</option></select></label>
<label>One main experience<select id="cti-visit"><option value="60">1 hour</option><option value="90" selected>1.5 hours</option><option value="150">2.5 hours</option></select></label>
<label>Travel season<select id="cti-season"><option value="summer">Summer</option><option value="fall">Fall</option><option value="winter">Winter</option></select></label></div>
<div class="cti-output" id="cti-results" aria-live="polite"><p>The source-linked day decisions below remain available without JavaScript.</p></div>
<p class="fine">For missing crossing observations, 45 minutes is an <strong>unverified planning reserve</strong>, not an official crossing wait. Winter and shoulder season access always require direct checks. The results do not imply park or trail opening.</p>
</section>
<section aria-labelledby="byday"><h2 id="byday">The trip, day by day</h2><div class="grid">
{"".join(cards)}
</div></section>
<section aria-labelledby="evidence"><h2 id="evidence">Four road legs that still need exact mileage</h2>
<p>These are real research gaps, not missing destinations. Independent sources verify roads or partial approaches, but do not prove precise mileage between the specific numbered stops used in this guide. We retain the published <em>whole-day</em> estimates and do not repurpose these partial references as driving directions.</p>
<ul>{"".join(gaps)}</ul>
<p>For road conditions use <a href="https://www.michigan.gov/mdot/travel" target="_blank" rel="noopener">Michigan DOT</a>, <a href="https://511on.ca/" target="_blank" rel="noopener">Ontario 511</a>, <a href="https://511wi.gov/" target="_blank" rel="noopener">Wisconsin 511</a> and <a href="https://511mn.org/" target="_blank" rel="noopener">Minnesota 511</a>. For each park, verify the land manager's current alerts and official visitor entrance.</p></section>
<section aria-labelledby="questions"><h2 id="questions">Common planning questions</h2>
<h3>Can the Circle Tour really be done in 10 days?</h3><p>Yes, as a road trip with selected longer experiences, not every attraction. The ten-day plan preserves slower days in Michigan and explicitly identifies the longer northern Ontario transit leg.</p>
<h3>How long are the longest days?</h3><p>The published nine-day-to-ten-day transfer through White River, Marathon and Nipigon is approximately 303 itinerary miles. The final 192-mile North Shore day also includes an international crossing. Actual mileage and travel time can differ from those published day estimates.</p>
<h3>Where should I spend the nights?</h3><p>This itinerary favors Bayfield, the Porcupine Mountains area, Ontonagon, L'Anse, Marquette, Munising, Sault Ste. Marie, Wawa, and Thunder Bay before returning to Duluth. Confirm lodging and park access before finalizing travel days.</p>
<h3>When should I go?</h3><p>Summer generally offers the broadest selection of shoreline and boat experiences. Autumn requires earlier daylight and closure checks. A winter Circle Tour calls for a separate road-conditions plan: the default summertime park itinerary is not evidence of winter access.</p>
</section>
<p class="summary"><strong>Keep exploring:</strong> <a href="/lake-superior-circle-tour/">Open the complete 31-stop Circle Tour map and route planner</a>, including both travel directions and the original seven- and fifteen-day versions.</p>
</main>
<footer>Compiled by Chris Izworski · Source reconciliation reviewed November 14, 2026 · Rust checks planning feasibility; Python validates source and page output. Neither substitutes for official road or park conditions.</footer>
<script defer src="/assets/circle-tour-rust-itinerary.js"></script>
<script defer src="/assets/circle-tour-feasibility-ui.js"></script>
</body></html>
'''


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true")
    p.add_argument("--emit-build-artifacts", action="store_true")
    args = p.parse_args()
    source = INPUT.read_text("utf-8")
    evidence = json.loads(EVIDENCE.read_text("utf-8"))
    payload = reconcile(source, evidence)
    generated = {
        OUTPUT: json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        GUIDE: html_page(payload),
    }
    for path, content in generated.items():
        if args.check:
            if not path.exists() or path.read_text("utf-8") != content:
                fail(str(path.relative_to(ROOT)) + " is stale; regenerate using Python")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, "utf-8")
        print("CIRCLE TOUR PYTHON RECONCILED", path.relative_to(ROOT), len(content), "UTF-8 chars")
    if args.emit_build_artifacts:
        import base64
        for path, content in generated.items():
            label = "CIRCLE_TOUR_GENERATED_JSON" if path == OUTPUT else "CIRCLE_TOUR_GENERATED_HTML"
            print(label + "_BEGIN")
            print(base64.b64encode(content.encode("utf-8")).decode("ascii"))
            print(label + "_END")
    print("CIRCLE TOUR SOURCE OK 31 stops, 7/10/15 days, 4 gaps, published mile estimates")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(exc, file=sys.stderr)
        raise SystemExit(1)
