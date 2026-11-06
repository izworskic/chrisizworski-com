#!/usr/bin/env python3
"""Six-region official launch-notice evidence collector. Python Intelligence OS v1.

Runs ONLY as a scheduled GitHub Actions batch; never from a visitor request.
Does not scrape protected pages, fabricate missions, infer safety-zone activity,
or conflate a policy with event-specific public viewing permission.

Stdlib-only. The existing shared Node/Postgres launch collector remains the
single source for orbital mission IDs, windows, and pad schedule precision.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import html
from html.parser import HTMLParser
import json
import re
import sys
import unittest
import urllib.error
import urllib.parse
import urllib.request

UTC = dt.timezone.utc
VERSION = 1
LIMIT = 800_000
USER_AGENT = "ChrisIzworskiOfficialLaunchNotices/1.0 (+https://chrisizworski.com/)"
REGIONS = ("california", "florida", "texas", "virginia", "alaska", "hawaii")
# Public government/land-manager pages only. No paid API, private range systems,
# generalized search scraping, user's IP or guessed pad coordinates.
SOURCES = (
    ("vandenberg-news", "california", "https://www.vandenberg.spaceforce.mil/News/", "news"),
    ("vandenberg-alerts", "california", "https://public.govdelivery.com/accounts/USDODSFVANDENBERG/signup/41755", "alerts"),
    ("canaveral-nps", "florida", "https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm", "policy"),
    ("ksc-viewing", "florida", "https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing", "policy"),
    ("starbase-city", "texas", "https://www.starbase.texas.gov/beach-road-access", "access"),
    ("wallops-schedule", "virginia", "https://www.nasa.gov/wallops-launch-schedule/", "schedule"),
    ("wallops-visitor", "virginia", "https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/", "policy"),
    ("alaska-aerospace", "alaska", "https://akaerospace.com/", "access"),
    ("alaska-news", "alaska", "https://akaerospace.com/news", "news"),
    ("pmrf-beach", "hawaii", "https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/", "policy"),
)
SOURCE_MAP = {x[0]: x for x in SOURCES}
STAMP = re.compile(r"\b(?:JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:T(?:EMBER)?)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\.?\s+\d{1,2},?\s+20\d{2}\b", re.I)
EVENT_WORDS = re.compile(r"\b(?:rocket|launch|falcon|starship|artemis|atlas|missile|sounding)\b", re.I)
INVALID_LINK = re.compile(r"^(?:mailto:|javascript:|data:|#)", re.I)


def utcnow():
    return dt.datetime.now(UTC)


def iso(value):
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def tidy(value, n=220):
    return re.sub(r"\s+", " ", html.unescape(str(value or ""))).strip()[:n]


class PlainDocument(HTMLParser):
    """Small, deterministic HTML-to-evidence extractor; no HTML retained."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = 0
        self.parts = []
        self.links = []
        self.active = None

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.hidden += 1
        if self.hidden:
            return
        if tag in ("div", "p", "li", "section", "h1", "h2", "h3", "h4", "br", "time"):
            self.parts.append("\n")
        if tag == "a":
            href = dict(attrs).get("href", "")
            self.active = [href, []]

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self.hidden = max(0, self.hidden - 1)
            return
        if self.hidden:
            return
        if tag == "a" and self.active:
            self.links.append((self.active[0], tidy(" ".join(self.active[1]), 250)))
            self.active = None
        if tag in ("p", "li", "h1", "h2", "h3", "h4", "section"):
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)
            if self.active:
                self.active[1].append(data)

    @property
    def text(self):
        # Preserve item boundaries but normalize excess whitespace.
        return "\n".join(tidy(p, 4000) for p in "".join(self.parts).splitlines() if tidy(p))


def official_link(base, raw):
    if not raw or INVALID_LINK.match(raw):
        return None
    u = urllib.parse.urlsplit(urllib.parse.urljoin(base, raw))
    root = urllib.parse.urlsplit(base)
    if u.scheme != "https" or u.hostname != root.hostname or u.username or u.password:
        return None
    if len(u.geturl()) > 420:
        return None
    return urllib.parse.urlunsplit((u.scheme, u.netloc, u.path, "", ""))


def item(kind, title, source, *, detail, date=None, relevance="general", scope="source-observation"):
    return {"kind": kind, "title": tidy(title, 150), "detail": tidy(detail, 320),
            "sourceUrl": source, "publishedDate": date, "relevance": relevance,
            "scope": scope}


def recent_title_articles(doc, url, now):
    """Official article pointers only; no launch dates or beach status inferred."""
    results = []
    for raw, name in doc.links:
        target = official_link(url, raw)
        if not target or not EVENT_WORDS.search(name):
            continue
        if not any(s in target.lower() for s in ("/article", "/news/", "/press-release", "/updates/")):
            continue
        if name.lower() in ("news", "launches", "launch alerts", "rocket launch"):
            continue
        results.append(item("official-article", name, target,
                            detail="Official source article; its event date and operational implications have not been independently verified.",
                            relevance="unmatched-official-article", scope="historical-or-current-article"))
        if len(results) >= 3:
            break
    return results


def classify(entry, body, now):
    sid, region, url, source_type = entry
    doc = PlainDocument()
    doc.feed(body)
    text = doc.text
    upper = re.sub(r"\s+", " ", text).upper()
    observations = []
    status = "retrieved"
    notes = []

    if sid == "starbase-city":
        # Only fixed current-status labels. Historical "Previous Orders" never
        # determine whether a launch-day road closure is active now.
        beach = re.search(r"BEACH ACCESS STATUS\s+(BOCA CHICA BEACH IS OPEN|BOCA CHICA BEACH IS CLOSED)\b", upper)
        road = re.search(r"ROAD UPDATES\s+(ROAD DELAY\s+NO ROAD DELAYS|(?:ROAD CLOSURE|ROAD DELAY)[^\.]{0,90})", upper)
        if beach:
            label = beach.group(1).capitalize().replace("Boca", "Boca").replace("Chica", "Chica")
            observations.append(item("access-status", label, url,
                detail="City of Starbase website status at source-check time, not a future launch-window clearance.",
                relevance="current-published-status", scope="Boca Chica Beach"))
        if road:
            observations.append(item("road-status", tidy(road.group(1), 95).capitalize(), url,
                detail="City road-update text checked now. Road access can change before a mission; follow signed orders.",
                relevance="current-published-status", scope="Highway 4 approaches"))
        if not beach:
            status = "limited"
            notes.append("Current city beach status field was not located; no access conclusion.")
        # A dated PDF under "Previous Orders" is ALWAYS history, not an active order.
        if "PREVIOUS ORDERS" in upper:
            dates = STAMP.findall(upper.split("PREVIOUS ORDERS", 1)[1][:5000])
            if dates:
                observations.append(item("historical-order-index",
                    "Previous mayoral orders listed", url,
                    detail="Archived official orders exist. The newest listed order does not establish an active closure or the next mission's road status.",
                    relevance="historical-only", scope="prior-order-archive"))
        if "PUBLIC NOTICE OF MAYOR'S ORDER" in upper and "NO PUBLIC NOTICES AT THIS TIME" not in upper:
            observations.append(item("notice-check-required", "Current mayoral-order notice may be posted", url,
                detail="Review the executed order and event-specific dates on the city's official page. This parser does not infer road closure from a heading.",
                relevance="review-required", scope="mayoral-order-section"))
    elif sid == "alaska-aerospace":
        if re.search(r"THERE ARE NO ACTIVE CLOSURES ON KODIAK ISLAND\b", upper):
            observations.append(item("access-status", "Alaska Aerospace reports no active Kodiak closures", url,
                detail="Operator's current homepage wording, not a launch-day road pass or an all-clear for Narrow Cape.",
                relevance="current-published-status", scope="Kodiak road-closure feed"))
        elif "KODIAK ISLAND CLOSURES" in upper:
            status = "limited"
            observations.append(item("notice-check-required", "Kodiak road-closure notice needs review", url,
                detail="The closure heading is present but 'no active closures' could not be confirmed. Follow the operator and hotline.",
                relevance="review-required", scope="Kodiak approach"))
        else:
            status = "limited"
            notes.append("Operator road-closure statement could not be identified.")
    elif sid == "wallops-schedule":
        if "NO PUBLIC LAUNCHES ON THE SCHEDULE AT THIS TIME" in upper:
            observations.append(item("schedule-status", "NASA lists no current public Wallops launches", url,
                detail="NASA Wallops official schedule at check time; this does not exclude classified tests, commercial flights, or off-range sounding rockets.",
                relevance="current-published-status", scope="NASA Wallops public launch schedule"))
        else:
            status = "limited"
            observations.append(item("notice-check-required", "NASA Wallops schedule requires mission review", url,
                detail="The NASA page no longer asserts no public launches. Open the official list for event-specific dates and Visitor Center access.",
                relevance="review-required", scope="NASA Wallops public launch schedule"))
    elif sid == "pmrf-beach":
        if "CURRENT BEACH ACCESS" in upper and "ALL PUBLIC ACCESSIBLE SHORELINE AREAS ARE OPEN" in upper:
            observations.append(item("access-policy", "PMRF posts general shoreline recreation policy", url,
                detail="This policy does not authorize launch viewing or override posted restrictions, Navy force-protection closures or maritime safety notices.",
                relevance="policy-only", scope="designated recreation shoreline"))
        else:
            status = "limited"
            notes.append("Navy general access language changed or could not be parsed.")
    elif sid == "canaveral-nps":
        if "ROCKET LAUNCH VIEWING" in upper and "PLAYALINDA" in upper:
            observations.append(item("access-policy", "NPS Playalinda rocket-launch restrictions apply", url,
                detail="General park viewing and 30-minute Playalinda Road closing guidance; live mission-specific NASA closure not verified by this policy.",
                relevance="policy-only", scope="Playalinda District"))
        else:
            status = "limited"
            notes.append("NPS launch-policy fields not found.")
    elif sid == "ksc-viewing":
        if "LAUNCH VIEWING" in upper and ("OFFICIAL" in upper or "PURCHASING" in upper):
            observations.append(item("access-policy", "KSC viewing requires mission-specific ticket verification", url,
                detail="The existing KSC mission watcher remains authoritative for official events and ticket details; this source is a general policy reference.",
                relevance="policy-only", scope="Kennedy Space Center Visitor Complex"))
        else:
            status = "limited"
            notes.append("Visitor-complex launch viewing policy could not be parsed.")
    elif sid == "vandenberg-alerts":
        observations.append(item("source-link", "Space Force official launch alert subscriptions", url,
            detail="Subscribe to official notices; the sign-up page is not a launch date, an active beach closure or a public viewing permit.",
            relevance="policy-only", scope="SLD 30 official launch alert sign-up"))
    elif sid == "wallops-visitor":
        if "LAUNCH VIEWING AREA" in upper:
            observations.append(item("access-policy", "NASA's Visitor Center opening is mission-specific", url,
                detail="The Visitor Center publishes event-specific availability; historical 'Next Launch' cards are not current access permission.",
                relevance="policy-only", scope="Wallops Visitor Center"))
        else:
            status = "limited"
            notes.append("Launch-viewing guidance could not be verified.")
    elif sid in ("vandenberg-news", "alaska-news"):
        observations.extend(recent_title_articles(doc, url, now))
        if not observations:
            notes.append("No attributable launch article extracted. Absence is not absence of range activity.")

    # Fingerprint the relevant evidence, NOT a whole web page's changing ads,
    # timestamps or unrelated layout. No source text stored.
    normalized = json.dumps([status, observations], separators=(",", ":"), sort_keys=True)
    return {"id":sid, "region":region, "sourceUrl":url, "scope":source_type,
            "status":status, "checkedAt":iso(now), "fingerprint":hashlib.sha256(normalized.encode()).hexdigest()[:24],
            "signals":observations[:4], "notes":notes[:2]}


def unavailable(entry, now):
    sid, region, url, scope = entry
    return {"id":sid, "region":region, "sourceUrl":url, "scope":scope,
            "status":"unavailable", "checkedAt":iso(now), "fingerprint":None,
            "signals":[], "notes":["Official page not retrievable. No statement about current access or upcoming launches."]}


def fetch_public(entry, now, opener=None):
    sid, region, url, _ = entry
    request=urllib.request.Request(url, headers={"User-Agent":USER_AGENT, "Accept":"text/html"})
    client=opener or urllib.request.urlopen
    with client(request, timeout=8) as response:
        final_url=response.geturl()
        # Redirects away from the registered official host cannot supply evidence.
        if urllib.parse.urlsplit(final_url).hostname != urllib.parse.urlsplit(url).hostname or \
           urllib.parse.urlsplit(final_url).scheme != "https":
            raise ValueError("untrusted redirect")
        size=int(response.headers.get("Content-Length") or 0)
        if size>LIMIT:
            raise ValueError("oversized source")
        data=response.read(LIMIT+1)
        if len(data)>LIMIT:
            raise ValueError("oversized source")
        encoding=response.headers.get_content_charset() or "utf-8"
        body=data.decode(encoding, errors="replace")
    return classify(entry, body, now)


def collect(now=None, fetcher=fetch_public, manifest=None, event_fetcher=None):
    now=now or utcnow()
    if now.tzinfo is None:
        raise ValueError("UTC timezone required")
    def read_one(entry):
        try:
            return fetcher(entry, now)
        except (ValueError, urllib.error.URLError, OSError, UnicodeError, TimeoutError):
            return unavailable(entry, now)
        except Exception:
            return unavailable(entry, now)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        records=list(pool.map(read_one, SOURCES))
    regions={region:[r for r in records if r["region"]==region] for region in REGIONS}
    counts={k:sum(s["status"]=="retrieved" for s in v) for k,v in regions.items()}
    result={"version":VERSION, "checkedAt":iso(now), "sourceCount":len(records),
            "regions":regions, "availableSources":sum(counts.values()),
            "partial":any(s["status"]!="retrieved" for s in records),
            "coverageRule":"Source evidence only. No event permission, all-clear, cancellation or marine-zone activation inferred."}
    # The matching layer is opt-in for the scheduled job, preserving
    # deterministic legacy collector tests and no extra website requests
    # in the LL2 national schedule collector.
    if manifest is not None:
        from rocket_official_matcher import collect_evidence
        try:
            if event_fetcher:
                result["reconciliation"]=collect_evidence(manifest,now,event_fetcher)
            else:
                result["reconciliation"]=collect_evidence(manifest,now)
        except Exception:
            result["reconciliation"]={
                "version":1,"checkedAt":iso(now),"health":"unavailable",
                "manifestCheckedAt":None,"matches":[],"candidateCount":0,
                "unmatched":0,"conflicts":0,"sourceStatus":[]}
    return result


class EvidenceTests(unittest.TestCase):
    now=dt.datetime(2026,11,5,12,tzinfo=UTC)
    def source(self, sid):
        return SOURCE_MAP[sid]

    def test_starbase_status_with_historical_orders(self):
        source=self.source("starbase-city")
        record=classify(source, """
        <h2>BEACH Access Status</h2><p>Boca Chica Beach is open.</p>
        <h2>Road Updates</h2><p>Road Delay</p><p>No road delays.</p>
        <h2>Public Notice of Mayor's Order</h2><p>No public notices at this time.</p>
        <h2>Previous Orders</h2><p>October 27, 2026</p><a href="/order.pdf">Executed order</a>
        """, self.now)
        self.assertEqual(record["status"],"retrieved")
        self.assertIn("access-status",[s["kind"] for s in record["signals"]])
        self.assertIn("historical-order-index",[s["kind"] for s in record["signals"]])
        self.assertNotIn("notice-check-required",[s["kind"] for s in record["signals"]])
        self.assertTrue(all(s["relevance"]!="permission" for s in record["signals"]))

    def test_ambiguous_status_is_limited_not_open(self):
        s=classify(self.source("starbase-city"), "<h1>Beach rules</h1><p>The beach was open yesterday.</p>",self.now)
        self.assertEqual(s["status"],"limited")
        self.assertEqual(s["signals"],[])

    def test_alaska_operator_home_current_but_not_future_permission(self):
        s=classify(self.source("alaska-aerospace"), "<h2>Kodiak Island Closures</h2><p>There are no active closures on Kodiak Island.</p>",self.now)
        self.assertEqual(s["signals"][0]["relevance"],"current-published-status")
        self.assertIn("not a launch-day road pass",s["signals"][0]["detail"])

    def test_wallops_no_sounding_rocket_absence_inference(self):
        s=classify(self.source("wallops-schedule"), "<h2>No public launches on the schedule at this time</h2>",self.now)
        self.assertEqual(s["signals"][0]["kind"],"schedule-status")
        self.assertIn("does not exclude",s["signals"][0]["detail"])

    def test_hawaii_policy_is_not_launch_permission(self):
        s=classify(self.source("pmrf-beach"),"<h3>CURRENT BEACH ACCESS</h3><p>ALL PUBLIC ACCESSIBLE SHORELINE AREAS ARE OPEN</p>",self.now)
        self.assertEqual(s["signals"][0]["relevance"],"policy-only")
        self.assertIn("does not authorize launch viewing",s["signals"][0]["detail"])

    def test_nps_conditions_are_only_general_policy(self):
        s=classify(self.source("canaveral-nps"),"<h1>Rocket launch viewing</h1> Playalinda Beach Road closes 30 minutes prior",self.now)
        self.assertEqual(s["signals"][0]["kind"],"access-policy")
        self.assertNotIn("permission",s["signals"][0]["relevance"])

    def test_no_arbitrary_source_links(self):
        self.assertIsNone(official_link("https://www.nasa.gov/wallops-launch-schedule/","https://evil.example/x"))
        self.assertIsNone(official_link("https://akaerospace.com/news","javascript:alert(1)"))
        self.assertEqual(official_link("https://akaerospace.com/news","/news/thing?tracking=2"),"https://akaerospace.com/news/thing")

    def test_alert_page_is_not_mission_date(self):
        s=classify(self.source("vandenberg-alerts"),"<p>Signup</p>",self.now)
        self.assertEqual(s["signals"][0]["relevance"],"policy-only")

    def test_fallback_failure_is_fail_closed(self):
        def fail(entry, now):
            if entry[0]=="starbase-city":raise TimeoutError("provider timeout")
            return classify(entry,"no relevant public data",now)
        result=collect(self.now,fail)
        self.assertEqual(result["sourceCount"],len(SOURCES))
        self.assertEqual(result["regions"]["texas"][0]["status"],"unavailable")
        self.assertEqual(result["regions"]["texas"][0]["signals"],[])
        self.assertEqual(result["version"],VERSION)

    def test_duplicate_date_not_falsely_promoted_to_access(self):
        s=classify(self.source("vandenberg-news"),
           '<a href="/News/Article-Display/Article/999/launch-complete/">Falcon 9 launch complete</a> <p>October 27, 2026</p>',
           self.now)
        self.assertEqual(s["signals"][0]["relevance"],"unmatched-official-article")
        self.assertIsNone(s["signals"][0]["publishedDate"])
        self.assertNotIn("open",s["signals"][0]["detail"].lower())

    def test_fixture_stability(self):
        a=classify(self.source("alaska-aerospace"),"<p>There are no active closures on Kodiak Island.</p>",self.now)
        b=classify(self.source("alaska-aerospace"),"<p>There are no active closures on Kodiak Island.</p>",self.now)
        self.assertEqual(a["fingerprint"],b["fingerprint"])

    def test_source_failure_never_returns_old_access(self):
        s=unavailable(self.source("pmrf-beach"),self.now)
        self.assertEqual(s["status"],"unavailable")
        self.assertEqual(s["signals"],[])
        self.assertIsNone(s["fingerprint"])


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--test", action="store_true")
    p.add_argument("--collect", action="store_true")
    p.add_argument("--output", default="")
    p.add_argument("--mission-manifest", default="", help="Saved compact, trusted same-site schedule manifest; never LL2 HTTP")
    args=p.parse_args()
    if args.test:
        suite=unittest.defaultTestLoader.loadTestsFromTestCase(EvidenceTests)
        report=unittest.TextTestRunner(verbosity=2).run(suite)
        return 0 if report.wasSuccessful() else 1
    manifest=None
    if args.mission_manifest:
        try:
            with open(args.mission_manifest,"r",encoding="utf-8") as handle:
                manifest=json.load(handle)
        except (OSError,ValueError):
            manifest={"version":1,"health":"unavailable","missions":[]}
    data=collect(manifest=manifest)
    output=json.dumps(data, separators=(",",":"),ensure_ascii=False)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(output+"\n")
    else:
        print(output)
    print("Official sources: %d/%d confirmed retrieved; %d unavailable" %
          (data["availableSources"],data["sourceCount"],sum(
              r["status"]=="unavailable" for sources in data["regions"].values() for r in sources)),
          file=sys.stderr)
    return 0

if __name__=="__main__":
    sys.exit(main())
