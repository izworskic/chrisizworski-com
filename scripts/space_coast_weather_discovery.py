"""Independent, bounded discovery of *links* to official 45WS forecast PDFs.

Only known first-party pages are fetched. This module never invents PDF paths,
scrapes web search results, follows paginated sites, or promotes an unofficial
archive's weather probabilities. Exact official bytes are verified elsewhere.
"""
import datetime as dt
from html.parser import HTMLParser
import re
import urllib.parse
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

OFFICIAL = "45thweathersquadron.nebula.spaceforce.mil"
PUBLIC_SOURCES = (
    ("45ws-home", "https://45thweathersquadron.nebula.spaceforce.mil/", "html"),
    ("45ws-forecast-support", "https://45thweathersquadron.nebula.spaceforce.mil/pages/launchForecastSupport.html", "html"),
    ("45ws-sitemap", "https://45thweathersquadron.nebula.spaceforce.mil/sitemap.xml", "xml"),
    ("45ws-parent-weather", "https://www.patrick.spaceforce.mil/About-Us/Weather/", "html"),
)
MAX_LINKS_PER_PAGE = 1000
MAX_PAGES = 4
MAX_SOURCE_BYTES = 650_000
LOCAL_ZONE = ZoneInfo("America/New_York")
MONTHS = {dt.date(2000, n, 1).strftime("%b").lower(): n for n in range(1, 13)}


class _Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.values = []

    def handle_starttag(self, tag, attrs):
        if tag not in {"a", "link"} or len(self.values) >= MAX_LINKS_PER_PAGE:
            return
        for key, value in attrs:
            if key == "href" and isinstance(value, str) and len(value) <= 500:
                self.values.append(value)
                break


def source_links(body: bytes, address: str, kind: str, official_url):
    """Return only allowlisted official URLs explicitly linked by a page."""
    if len(body) > MAX_SOURCE_BYTES:
        raise ValueError("source-too-large")
    if kind == "html":
        parser = _Links()
        parser.feed(body.decode("utf-8", errors="replace"))
        hrefs = parser.values
    elif kind == "xml":
        # The parser sees only a bounded document and never loads remote DTDs.
        root = ET.fromstring(body)
        hrefs = [e.text for e in root.iter()
                 if e.tag.rsplit("}", 1)[-1] == "loc" and e.text][:MAX_LINKS_PER_PAGE]
    else:
        raise ValueError("unsupported-source-kind")
    output = []
    for href in hrefs:
        if not isinstance(href, str) or len(href) > 500:
            continue
        link = urllib.parse.urljoin(address, href.strip())
        good = official_url(link)
        if good and good not in output:
            output.append(good)
    return output


def mission_marker(value):
    text = str(value or "").lower().replace("\u2013", "-").replace("\u2014", "-")
    rules = (
        (r"\bstarlink(?:\s+group)?\s+g?(\d{1,2}-\d{1,3})\b", "starlink"),
        (r"\bcrew[-\s]*(\d{1,2})\b", "crew"),
        (r"\bcrs[-\s]*(\d{2})\b", "crs"),
        (r"\bbandwagon[-\s]*(\d{1,2})\b", "bandwagon"),
        (r"\btransporter[-\s]*(\d{1,2})\b", "transporter"),
        (r"\bnrol[-\s]*(\d{2,3})\b", "nrol"),
        (r"\bus[sf]{2}[-\s]*(\d{2,3})\b", "ussf"),
        (r"\bm[-\s]*power[-\s]*([a-z0-9-]{1,4})\b", "mpower"),
        (r"\bamazon\s+leo\b.{0,35}\b((?:la|ka|kf)[-\s]*\d{2})\b", "amazon-leo"),
    )
    for pattern, label in rules:
        match = re.search(pattern, text)
        if match:
            return label + ":" + re.sub(r"\s+", "", match.group(1))
    return None


def pdf_filename_date(url, at_year):
    """Filename day/month is only a *prefilter*, not publication verification."""
    name = urllib.parse.unquote(urllib.parse.urlsplit(url).path.split("/")[-1])
    match = re.search(r"(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+Launch\.pdf$", name, re.I)
    if not match:
        return []
    month = MONTHS.get(match.group(2)[:3].lower())
    if not month:
        return []
    possibilities = []
    for year in (at_year - 1, at_year, at_year + 1):
        try:
            possibilities.append(dt.date(year, month, int(match.group(1))))
        except ValueError:
            continue
    return possibilities


def local_launch_date(mission):
    try:
        at = dt.datetime.fromisoformat(str(mission.get("net", "")).replace("Z", "+00:00"))
        if at.tzinfo is None:
            return None
        return at.astimezone(LOCAL_ZONE).date()
    except (TypeError, ValueError, OverflowError):
        return None


def match_direct_candidates(urls, missions, official_url):
    """Map only uniquely matchable official URLs to a current LL2 mission ID.

    Uncertain filename identity/date never becomes a fetched candidate. PDF
    content is still independently checked by existing official parser and
    mission/date validator after download.
    """
    indexed = {}
    for mission in missions:
        marker = mission_marker(mission.get("name"))
        at = local_launch_date(mission)
        if marker and at:
            indexed.setdefault(marker, []).append((mission["id"], at))
    matches = {}
    for link in urls:
        link = official_url(link)
        if not link:
            continue
        name = urllib.parse.unquote(urllib.parse.urlsplit(link).path.split("/")[-1])
        marker = mission_marker(name)
        if not marker or marker not in indexed:
            continue
        eligible = []
        for mission_id, day in indexed[marker]:
            dates = pdf_filename_date(link, day.year)
            if any(abs((d-day).days) <= 2 for d in dates):
                eligible.append(mission_id)
        # No ambiguous mission association.
        if len(eligible) != 1:
            continue
        bucket = matches.setdefault(eligible[0], [])
        if link not in bucket:
            bucket.append(link)
    # Favor L-1/latest official issuances over L-2 when deciding which
    # candidates to download first. The PDF issue timestamp remains authoritative.
    def score(link):
        filename = urllib.parse.unquote(link.rsplit("/",1)[-1])
        m = re.search(r"\bL-(\d+)\b", filename, re.I)
        return int(m.group(1)) if m else 99
    return {k: sorted(v, key=score)[:3] for k,v in matches.items()}


def inspect_sources(missions, download, official_url):
    """Check a small fixed source list, returning transparent per-source health."""
    if len(PUBLIC_SOURCES) > MAX_PAGES:
        raise ValueError("source-inventory-budget-exceeded")
    reports = []
    links = []
    for source_id, address, kind in PUBLIC_SOURCES:
        row = {"id":source_id, "status":"unavailable", "links":0}
        try:
            document = download(address, MAX_SOURCE_BYTES, "text/html,application/xml")
            found = source_links(document, address, kind, official_url)
            row["links"] = len(found)
            row["status"] = "links-found" if found else "checked-no-links"
            links.extend(found)
        except Exception:
            # Many government sites block automated fetches. Do not report
            # "zero official forecasts" when a particular source was blocked.
            row["status"] = "unavailable"
        reports.append(row)
    unique = list(dict.fromkeys(links))
    matches = match_direct_candidates(unique, missions, official_url)
    return matches, reports
