#!/usr/bin/env python3
"""MSU Extension corn earworm table discovery and review-only staging.

Never auto-publishes. The only remote input is MSU's official vegetable news
listing and selected same-origin article HTML. Output is a candidate reviewed by
a human through a GitHub PR before the site can display it.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://www.canr.msu.edu"
NEWS = BASE + "/vegetables/news"
ARTICLE_RE = re.compile(r"^/news/michigan-vegetable-crop-report-[a-z0-9-]+-(20\d\d)$")
COUNTY_RE = re.compile(r"^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+Co\.?\s*(\d)?$")
CELL_RE = re.compile(r"^(\d{1,5})(?:\s+\((\d{1,5}(?:\.\d{1,2})?)\))?(\*)?$")
MONTHS = {x.lower(): n for n, x in enumerate(
    ("January", "February", "March", "April", "May", "June",
     "July", "August", "September", "October", "November", "December"), 1)}
COUNTIES = {
    "allegan", "barry", "bay", "berrien", "calhoun", "cass", "clinton",
    "eaton", "genesee", "grand traverse", "hillsdale", "huron", "ingham",
    "ionia", "isabella", "jackson", "kalamazoo", "kent", "lapeer",
    "lenawee", "livingston", "macomb", "manistee", "midland", "monroe",
    "montcalm", "muskegon", "newaygo", "oceana", "oakland", "ottawa",
    "saginaw", "sanilac", "shiawassee", "st clair", "st joseph",
    "tuscola", "van buren", "washtenaw", "wayne",
}
# Any unexpected county must be reviewed and added explicitly; the list is
# an intentional known-name allowlist, not a complete Michigan county gazetteer.
STALE_DAYS = 21
MAX_PAGES = 5
MAX_ARTICLES = 8
MAX_BYTES = 1_200_000
UA = "FreighterViewFarms-GardenPestEvidence/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)"
OUT_CSV = ROOT / "data/garden-earworm-msu-2027-candidate.csv"
OUT_META = ROOT / "data/garden-earworm-msu-2027-provenance.json"
OUT_JS = ROOT / "public/assets/garden-earworm-trap-2027-data.js"


class Veto(ValueError):
    """Scientific/structure/source truth veto. Do not publish or infer data."""


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


class ListingParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self._link = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._link = dict(attrs).get("href")
            self._text = []

    def handle_data(self, text):
        if self._link is not None:
            self._text.append(text)

    def handle_endtag(self, tag):
        if tag == "a" and self._link is not None:
            self.links.append((self._link, normalize("".join(self._text))))
            self._link = None
            self._text = []


class ReportParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.og_titles = []
        self.canonicals = []
        self.article_h2 = []
        self._h2_depth = 0
        self.times = []
        self.tables = []
        self._table = None
        self._row = None
        self._cell = None
        self._cell_kind = None
        self._cell_text = []
        self._general = []
        self._current_text = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "meta" and d.get("property") == "og:title":
            self.og_titles.append(d.get("content", ""))
        if tag == "link" and d.get("rel") == "canonical":
            self.canonicals.append(d.get("href", ""))
        if tag == "h2":
            self._h2_depth += 1
        if tag == "time" and re.fullmatch(r"20\d\d-\d\d-\d\d", d.get("datetime", "")):
            self.times.append(d["datetime"])
        if tag == "table":
            if self._table is not None:
                raise Veto("Nested table cannot be interpreted safely")
            self._table = []
        if tag == "tr" and self._table is not None:
            self._row = []
        if tag in ("th", "td") and self._row is not None:
            if self._cell is not None:
                raise Veto("Nested table cell")
            if d.get("colspan", "1") != "1" or d.get("rowspan", "1") != "1":
                raise Veto("Merged row or column needs manual table review")
            self._cell = tag
            self._cell_kind = tag
            self._cell_text = []

    def handle_data(self, value):
        if self._h2_depth:
            self.article_h2.append(value)
        self._general.append(value)
        if self._cell is not None:
            self._cell_text.append(value)

    def handle_endtag(self, tag):
        if tag in ("th", "td") and self._cell == tag:
            self._row.append((self._cell_kind, normalize("".join(self._cell_text))))
            self._cell = None
            self._cell_kind = None
            self._cell_text = []
        elif tag == "tr" and self._row is not None:
            if self._table is not None and self._row:
                self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            self.tables.append(self._table)
            self._table = None
        if tag == "h2":
            self._h2_depth = max(0, self._h2_depth - 1)

    def text(self):
        return normalize(" ".join(self._general))


def article_url(raw_url: str, year: int) -> str | None:
    parsed = urllib.parse.urlsplit(urllib.parse.urljoin(BASE + "/", raw_url))
    if (parsed.scheme != "https" or parsed.hostname != "www.canr.msu.edu"
            or parsed.username or parsed.password or parsed.port or parsed.query):
        return None
    if not ARTICLE_RE.fullmatch(parsed.path) or int(ARTICLE_RE.fullmatch(parsed.path)[1]) != year:
        return None
    return BASE + parsed.path


def discover_links(pages: list[str], year: int) -> list[str]:
    out = []
    for html in pages:
        p = ListingParser()
        p.feed(html)
        for raw, title in p.links:
            if not re.search(r"\bmichigan vegetable crop report\b", title, re.I):
                continue
            url = article_url(raw, year)
            if url and url not in out:
                out.append(url)
    return out


class RestrictRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parts = urllib.parse.urlsplit(newurl)
        if parts.scheme != "https" or parts.hostname not in ("www.canr.msu.edu", "msu-prod.dotcms.cloud"):
            raise Veto("Unexpected redirect host for official MSU source")
        if parts.username or parts.password or parts.port:
            raise Veto("Unexpected redirect URL credentials or port")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_official(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != "https" or parsed.hostname != "www.canr.msu.edu"
            or parsed.username or parsed.password or parsed.port
            or (parsed.path != "/vegetables/news" and not ARTICLE_RE.fullmatch(parsed.path))):
        raise Veto("Unapproved MSU source URL")
    opener = urllib.request.build_opener(RestrictRedirects())
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with opener.open(req, timeout=13) as res:
        if "text/html" not in res.headers.get("Content-Type", ""):
            raise Veto("MSU source response was not HTML")
        raw = res.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise Veto("MSU HTML page exceeds bounded size")
        return raw.decode("utf-8", errors="strict")


def date_cell(raw: str, year: int) -> str:
    raw = normalize(raw).replace(".", "")
    match = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2})(?:,\s*(20\d\d))?", raw)
    if not match:
        raise Veto("Unknown observation week format: " + raw)
    month = MONTHS.get(match[1].lower()) or MONTHS.get(
        next((x for x in MONTHS if x.startswith(match[1].lower())), ""))
    if not month or (match[3] and int(match[3]) != year):
        raise Veto("Unknown or mismatched observation month/year: " + raw)
    try:
        when = dt.date(year, month, int(match[2]))
    except ValueError as err:
        raise Veto("Impossible observation week: " + raw) from err
    if not dt.date(year, 5, 1) <= when <= dt.date(year, 10, 31):
        raise Veto("Observation week outside reviewed vegetable season")
    return when.isoformat()


def parse_cell(raw: str):
    if raw == "-":
        return {"status": "NOT_REPORTED", "publishedCell": "-", "total": None, "avgPerNight": None,
                "twoWeekTotal": False}
    if not raw:
        return {"status": "MISSING_UNSPECIFIED", "publishedCell": "", "total": None, "avgPerNight": None,
                "twoWeekTotal": False}
    m = CELL_RE.fullmatch(raw)
    if not m:
        raise Veto("Unrecognized trap value: " + raw)
    total, avg, star = m.groups()
    if int(total) > 9999 or (int(total) == 0 and avg is not None) or (
            int(total) > 0 and avg is None):
        raise Veto("Trap count/average requires review: " + raw)
    return {"status": "REPORTED", "publishedCell": raw, "total": int(total),
            "avgPerNight": avg, "twoWeekTotal": bool(star)}


def parse_report(html: str, url: str, year: int, now: dt.date | None = None):
    now = now or dt.date.today()
    if not article_url(url, year):
        raise Veto("Off-domain or off-year article")
    p = ReportParser()
    p.feed(html)
    if len(p.og_titles) != 1 or len(p.canonicals) != 1 or p.canonicals[0] != url:
        raise Veto("Official article title or canonical does not match verified MSU URL")
    title = normalize(p.og_titles[0])
    if title not in normalize(" ".join(p.article_h2)):
        raise Veto("Article title does not match the visible MSU report heading")
    if not re.search(r"^Michigan vegetable crop report\s*[–-]\s*.+,\s*" + str(year) + r"$",
                     title, re.I):
        raise Veto("Source article heading is not an exact-year vegetable crop report")
    if len(p.times) != 1:
        raise Veto("Missing or ambiguous official article publication date")
    published = dt.date.fromisoformat(p.times[0])
    if published.year != year or published > now + dt.timedelta(days=1):
        raise Veto("Publication date not verified for requested year")
    matches = []
    for t in p.tables:
        if not t or not t[0] or t[0][0][1].lower() != "week":
            continue
        if len(t[0]) < 3 or not any("co." in cell[1].lower() for cell in t[0][1:]):
            continue
        matches.append(t)
    body = p.text()
    if not re.search(r"corn earworm captures", body, re.I):
        return None
    if len(matches) != 1:
        raise Veto("Earworm report table missing or ambiguous")
    rows = matches[0]
    col_ids = []
    trap_types = []
    flags = []
    for _, heading in rows[0][1:]:
        h = COUNTY_RE.fullmatch(heading)
        if not h:
            raise Veto("Unrecognized trap column heading: " + heading)
        name = h[1].lower().replace(" ", "-")
        if h[1].lower() not in COUNTIES:
            flags.append("NEW_OR_UNKNOWN_COUNTY:" + h[1])
        if name in col_ids:
            raise Veto("Duplicate county header: " + name)
        col_ids.append(name)
        code = h[2]
        if code == "3":
            trap_types.append("CLOTH_HELIOTHIS")
        elif code == "4":
            trap_types.append("WIRE_HARTSTACK")
        else:
            # Explicitly unknown is a valid source state, never an inferred trap type.
            trap_types.append("TYPE_NOT_SPECIFIED")
    if not (3 <= len(col_ids) <= 20) or len(rows) > 30 or len(rows) < 2:
        raise Veto("Unexpected MSU county roster or observation row count")
    # MSU's 2026 footnotes explicitly define 3=cloth and 4=wire. Do not
    # assume a future report uses the same marker numbering without proof.
    if "CLOTH_HELIOTHIS" in trap_types and not re.search(
            r"cloth\s+heliothis", body, re.I):
        flags.append("CLOTH_TRAP_FOOTNOTE_NOT_VERIFIED")
    if "WIRE_HARTSTACK" in trap_types and not re.search(
            r"wire\s+har(?:t|s)t?stack|wire\s+harstack|wire\s+hartstack", body, re.I):
        flags.append("WIRE_TRAP_FOOTNOTE_NOT_VERIFIED")
    observations = []
    seen = set()
    for record in rows[1:]:
        if len(record) != len(col_ids) + 1 or any(kind != "td" for kind, _ in record):
            raise Veto("Trap table row width or header structure changed")
        week = date_cell(record[0][1], year)
        if week in seen:
            raise Veto("Duplicate reporting week: " + week)
        seen.add(week)
        if dt.date.fromisoformat(week) > published + dt.timedelta(days=1):
            raise Veto("Reporting week is later than the publication")
        vals = [parse_cell(cell[1]) for cell in record[1:]]
        if any(v["status"] == "MISSING_UNSPECIFIED" for v in vals):
            flags.append("BLANK_CELLS_NEED_REVIEW")
        if any(v["twoWeekTotal"] for v in vals) and not re.search(
                r"two[- ]week|not emptied|two weeks", body, re.I):
            flags.append("ASTERISK_COLLECTION_PERIOD_NOT_VERIFIED")
        observations.append((week, vals))
    if sorted(week for week, _ in observations) != [week for week, _ in observations]:
        raise Veto("Collection weeks not in increasing order")
    if len(observations) > 23:
        raise Veto("Excessive reporting weeks, review table")
    counties = []
    for index, id_ in enumerate(col_ids):
        counties.append({"id": id_, "name": id_.replace("-", " ").title() + " County",
                         "trapType": trap_types[index],
                         "samples": [{"week": week, **vals[index]} for week, vals in observations]})
    # Catch unexpected omission/addition, but keep the report reviewable.
    baseline = {"ottawa", "oceana", "washtenaw", "monroe", "saginaw", "lapeer",
                "genesee", "midland"}
    if set(col_ids) != baseline:
        flags.append("COUNTY_ROSTER_CHANGED_FROM_2026")
    latest = observations[-1][0]
    age = (now - published).days
    if age > STALE_DAYS:
        flags.append("ARTICLE_STALE_OVER_21_DAYS")
    if age < -1:
        raise Veto("Future-dated report")
    # No fabricated "active" claims, even when dated official trap counts exist.
    return {
        "schema": "garden-earworm-trap-archive-v1",
        "species": "Helicoverpa zea",
        "season": year,
        "seasonState": "SOURCE_REPORTED_NOT_OUTBREAK_FORECAST",
        "reviewFlags": sorted(set(flags)),
        "source": {
            "publisher": "Michigan State University Extension",
            "articleTitle": title.replace("–", "-"),
            "url": url,
            "publishedDate": published.isoformat(),
            "latestCollectionWeek": latest,
            "dataType": "INDEPENDENT_REGIONAL_PHEROMONE_TRAPS",
            # Hash the actual table evidence, not a changing navigation/sidebar.
            "sourceTableSha256": hashlib.sha256(canonical_json(rows).encode("utf-8")).hexdigest(),
        },
        "sourceLimitations": [
            "A cooperating trap is not a survey of a county or your ZIP.",
            "Missing reports and blank cells never mean zero captured.",
            "Different trap designs and collection intervals are not comparable.",
            "Moth catches are observations, not a home garden infestation, pesticide threshold or outbreak forecast.",
            "The publication date and trap collection week are separate; older readings remain dated historical measurements.",
        ],
        "counties": counties,
    }


def to_csv(data):
    cols = [c["id"] for c in data["counties"]]
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(["week", *cols])
    for i in range(len(data["counties"][0]["samples"])):
        writer.writerow([data["counties"][0]["samples"][i]["week"],
                         *[c["samples"][i]["publishedCell"] for c in data["counties"]]])
    return buffer.getvalue()


def canonical_json(obj):
    return json.dumps(obj, sort_keys=True, ensure_ascii=True, separators=(",", ":"))


def stage(data):
    if data["season"] != 2027:
        raise Veto("Only 2027 official reports can be staged")
    existing = OUT_JS.read_text("utf-8") if OUT_JS.exists() else ""
    previous = re.search(r"window\.GardenEarwormTrap2027Data\s*=\s*Object\.freeze\((\{.+\})\);\s*$", existing, re.S)
    if previous:
        old = json.loads(previous[1])
        if old.get("source", {}).get("publishedDate", "") > data["source"]["publishedDate"]:
            raise Veto("Source chronology regression: never replace newer approved report")
    csv_content = to_csv(data)
    metadata = {k: v for k, v in data.items() if k != "counties"}
    metadata["columns"] = [{"id": c["id"], "trapType": c["trapType"]} for c in data["counties"]]
    metadata["reviewState"] = "AUTOMATED_CANDIDATE_NOT_PUBLISHED_UNTIL_PR_MERGE"
    for path in (OUT_CSV, OUT_META, OUT_JS):
        path.parent.mkdir(parents=True, exist_ok=True)
    OUT_CSV.write_text(csv_content, encoding="utf-8")
    OUT_META.write_text(json.dumps(metadata, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    # No executable third-party script content: quote all source strings as
    # JSON and escape potential closing script delimiters.
    safe = canonical_json(data).replace("<", "\\u003c").replace(">", "\\u003e")
    OUT_JS.write_text("window.GardenEarwormTrap2027Data=Object.freeze(" + safe + ");\n", encoding="utf-8")


def retrieve(year: int, now: dt.date, sleep=time.sleep):
    if year != 2027 or not (dt.date(2027, 5, 1) <= now <= dt.date(2027, 10, 31)):
        return {"status": "OUTSIDE_2027_MONITORING_WINDOW"}
    listing = []
    for number in range(1, MAX_PAGES + 1):
        url = NEWS + "?" + urllib.parse.urlencode({
            "page": number, "contentTypeOption": "Article", "tag": "vegetables",
            "tagUsage": "or", "siteContext": "", "hideHomePage": "",
        })
        listing.append(fetch_official(url))
        links = discover_links(listing, year)
        if len(links) >= 2:
            break
        sleep(0.3)
    links = discover_links(listing, year)
    if not links:
        return {"status": "NO_OFFICIAL_2027_REPORT_DISCOVERED", "source": NEWS}
    failures = []
    for url in links[:MAX_ARTICLES]:
        try:
            html = fetch_official(url)
            data = parse_report(html, url, year, now)
            if data is None:
                failures.append({"url": url, "status": "REPORT_HAS_NO_EARWORM_TRAP_TABLE"})
                continue
            # Never silently substitute a stale table from an old report.
            if "ARTICLE_STALE_OVER_21_DAYS" in data["reviewFlags"]:
                return {"status": "STALE_OFFICIAL_TRAP_REPORT", "source": url,
                        "publishedDate": data["source"]["publishedDate"]}
            stage(data)
            return {"status": "REVIEW_CANDIDATE_WRITTEN",
                    "publishedDate": data["source"]["publishedDate"],
                    "source": url, "latestWeek": data["source"]["latestCollectionWeek"],
                    "counties": len(data["counties"]),
                    "reviewFlags": data["reviewFlags"]}
        except Veto as exc:
            # Vetoes are reported, never concealed by older matching articles.
            return {"status": "SCIENTIFIC_REVIEW_VETO", "source": url, "reason": str(exc)}
    return {"status": "NO_VERIFIED_EARWORM_TABLE", "checks": failures}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("discover-2027", "backtest-2026", "check-window"), required=True)
    parser.add_argument("--output-status", default="")
    args = parser.parse_args()
    now = dt.date.today()
    if args.mode == "check-window":
        result = {"status": "IN_2027_MONITORING_WINDOW" if dt.date(2027, 5, 1) <= now <= dt.date(2027, 10, 31)
                  else "OUTSIDE_2027_MONITORING_WINDOW"}
    elif args.mode == "backtest-2026":
        from importlib.util import spec_from_file_location, module_from_spec
        spec = spec_from_file_location("archive_builder", ROOT / "scripts/build_garden_earworm_traps.py")
        source = module_from_spec(spec)
        spec.loader.exec_module(source)
        url = BASE + "/news/michigan-vegetable-crop-report-september-2-2026"
        data = parse_report(fetch_official(url), url, 2026, dt.date(2026, 11, 3))
        if data is None:
            raise Veto("No published 2026 reference trap table")
        baseline = source.compile_catalog()
        for old in baseline["counties"]:
            new = next((c for c in data["counties"] if c["id"] == old["id"]), None)
            if not new:
                raise Veto("Backtest 2026 county disappeared: " + old["id"])
            if [(s["week"], s["publishedCell"]) for s in new["samples"]] != [
                    (s["week"], s["publishedCell"]) for s in old["samples"]]:
                raise Veto("Backtest 2026 archived cells disagree with official HTML: " + old["id"])
        result = {"status": "BACKTEST_2026_VERIFIED", "counties": len(data["counties"]),
                  "weeks": len(data["counties"][0]["samples"]), "source": url}
    else:
        result = retrieve(2027, now)
    message = json.dumps(result, sort_keys=True)
    print(message)
    if args.output_status:
        Path(args.output_status).write_text(message + "\n", encoding="utf-8")
    if result["status"] == "SCIENTIFIC_REVIEW_VETO":
        raise SystemExit(2)


if __name__ == "__main__":
    try:
        main()
    except (Veto, urllib.error.URLError, TimeoutError) as exc:
        print("SOURCE_UNVERIFIED: " + str(exc), file=sys.stderr)
        raise SystemExit(2)
