"""Conservative NASA-reported launch weather ingestion, separate from 45WS PDFs.

NASA articles report 45WS favorable percentages for selected agency missions.
These are NASA-reported observations, not original 45WS PDF PoV and not
an operator flight approval. No derivation of 100 - percentage is permitted.
"""
import datetime as dt
import hashlib
from html.parser import HTMLParser
import re
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from space_coast_weather_discovery import mission_marker

FEEDS = (
    ("nasa-commercialcrew", "https://www.nasa.gov/blogs/commercialcrew/feed/"),
    ("nasa-all-blogs", "https://www.nasa.gov/blogs/feed/"),
)
MAX_FEED_BYTES = 700_000
MAX_ARTICLE_BYTES = 320_000
MAX_ARTICLES = 3
NASA_HOST = "www.nasa.gov"
UTC = dt.timezone.utc


class TextOnly(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "nav", "footer", "header"}:
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "nav", "footer", "header"} and self.skip:
            self.skip -= 1

    def handle_data(self, text):
        if not self.skip and text.strip():
            self.out.append(text.strip())


def plain_text(html):
    p = TextOnly()
    p.feed(html[:MAX_ARTICLE_BYTES].decode("utf-8", errors="replace"))
    return re.sub(r"\s+", " ", " ".join(p.out)).strip()


def official_article_url(link):
    if not isinstance(link, str) or len(link) > 450:
        return None
    u = urllib.parse.urlsplit(link)
    if u.scheme != "https" or u.hostname != NASA_HOST or u.port or u.username or u.password:
        return None
    if u.query or u.fragment or not re.fullmatch(
        r"/blogs/[a-z0-9_-]+/20\d{2}/\d{2}/\d{2}/[a-z0-9-]+/", u.path
    ):
        return None
    return link


def news_items(xml):
    if len(xml) > MAX_FEED_BYTES:
        raise ValueError("nasa-feed-too-large")
    root = ET.fromstring(xml)
    articles = []
    for item in root.findall(".//item")[:50]:
        title = item.findtext("title") or ""
        link = official_article_url(item.findtext("link"))
        pub = item.findtext("pubDate")
        if not link or not pub:
            continue
        try:
            when = parsedate_to_datetime(pub).astimezone(UTC)
        except (ValueError, TypeError, IndexError):
            continue
        excerpt = item.findtext("description") or ""
        articles.append({
            "title":title.strip()[:180], "sourceUrl":link,
            "publishedAt":when.isoformat().replace("+00:00","Z"),
            "excerpt":plain_text(excerpt.encode("utf-8"))[:1200],
        })
    return articles


def nasa_report(article, html, mission, now):
    source = official_article_url(article.get("sourceUrl"))
    if not source or len(html) > MAX_ARTICLE_BYTES:
        return None
    marker = mission_marker(article.get("title", ""))
    if not marker or marker != mission_marker(mission.get("name")):
        return None
    try:
        published = dt.datetime.fromisoformat(article["publishedAt"].replace("Z","+00:00"))
        launch = dt.datetime.fromisoformat(mission["net"].replace("Z","+00:00"))
    except (KeyError, TypeError, ValueError):
        return None
    if not (now - dt.timedelta(days=7) <= published <= now + dt.timedelta(hours=2)):
        return None
    if not (dt.timedelta(hours=-1) <= launch - published <= dt.timedelta(days=4)):
        return None
    body = plain_text(html)
    if len(body) < 140 or not re.search(r"\b45th\s+Weather\s+Squadron\b|\b45WS\b", body, re.I):
        return None
    # The NASA article must explicitly attribute its favorable-weather
    # percentage to the squadron; don't scrape arbitrary percentages from
    # unrelated launch timings, humidity, likelihoods or image captions.
    candidates = []
    for m in re.finditer(
        r"(?:45th\s+Weather\s+Squadron|45WS).{0,400}?"
        r"(\d{1,3})\s*%\s+chance\s+of\s+favorable"
        r"(?:\s+weather(?:\s+conditions)?|\s+conditions)?\b",
        body, re.I
    ):
        candidates.append(int(m.group(1)))
    # Some NASA copy puts the number ahead of the attribution; keep that
    # exception narrow and within the same short sentence.
    for m in re.finditer(
        r"(\d{1,3})\s*%\s+chance\s+of\s+favorable"
        r"(?:\s+weather(?:\s+conditions)?|\s+conditions)?"
        r".{0,150}?(?:45th\s+Weather\s+Squadron|45WS)\b", body, re.I
    ):
        candidates.append(int(m.group(1)))
    unique = set(candidates)
    if len(unique) != 1:
        return None
    p = next(iter(unique))
    if p < 0 or p > 100:
        return None
    concern_terms = (
        ("cumulus cloud rule","Cumulus Cloud Rule"),
        ("thick cloud layers rule","Thick Cloud Layers Rule"),
        ("flight through precipitation","Flight Through Precipitation"),
        ("liftoff winds","Liftoff Winds"),
        ("lightning rule","Lightning Rule"),
        ("anvil cloud","Anvil Cloud Rule"),
    )
    concerned = body.lower()
    # Only extract categories next to a primary-concerns declaration.
    location = re.search(r"(?:primary|main)\s+weather\s+concerns?\b.{0,240}", concerned)
    snippet = location.group(0) if location else ""
    concerns = [label for token,label in concern_terms if token in snippet]
    return {
        "missionId":mission["id"],
        "sourceMission":article["title"],
        "sourceUrl":source,
        "publishedAt":article["publishedAt"],
        "reportedFavorablePercent":p,
        "primaryConcerns":concerns[:6],
        "sourceSha256":hashlib.sha256(html).hexdigest(),
    }


def collect_nasa_reports(missions, download, now):
    """Inspect two NASA RSS feeds and at most 3 candidate official articles."""
    evidence = []
    statuses = []
    seen = set()
    indexed = {
        mission_marker(m.get("name")): m for m in missions
        if mission_marker(m.get("name"))
    }
    candidates = []
    for key,feed in FEEDS:
        row = {"id":key,"status":"unavailable","entries":0,"candidates":0}
        try:
            xml = download(feed,MAX_FEED_BYTES,"application/rss+xml,application/xml")
            items = news_items(xml)
            row["entries"] = len(items)
            row["status"] = "checked"
            for article in items:
                marker = mission_marker(article["title"])
                if marker not in indexed or article["sourceUrl"] in seen:
                    continue
                if not re.search(r"\b(?:weather|45th\s+Weather\s+Squadron|forecast)\b",
                                 article["title"]+" "+article["excerpt"], re.I):
                    continue
                try:
                    pub = dt.datetime.fromisoformat(article["publishedAt"].replace("Z","+00:00"))
                    launch = dt.datetime.fromisoformat(indexed[marker]["net"].replace("Z","+00:00"))
                    if not (now - dt.timedelta(days=7) <= pub <= now + dt.timedelta(hours=2)):
                        continue
                    if not (dt.timedelta(hours=-1) <= launch - pub <= dt.timedelta(days=4)):
                        continue
                except (TypeError, ValueError):
                    continue
                candidates.append((pub,article,indexed[marker]))
                seen.add(article["sourceUrl"])
                row["candidates"] += 1
        except Exception:
            row["status"] = "unavailable"
        statuses.append(row)
    candidates.sort(key=lambda item:item[0],reverse=True)
    for _,article,mission in candidates[:MAX_ARTICLES]:
        try:
            html = download(article["sourceUrl"],MAX_ARTICLE_BYTES,"text/html")
            record = nasa_report(article,html,mission,now)
            if record:
                evidence.append(record)
        except Exception:
            continue
    return evidence,statuses
