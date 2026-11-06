#!/usr/bin/env python3
"""Conservative official article -> LL2 mission identity reconciliation.

The only supported positive state requires:
1. A named future or current launch in a directly retrieved official agency article.
2. An explicit event date in a forward-looking launch sentence, not article date.
3. An exact distinctive mission identifier also present in exactly one fresh
   shared national LL2 manifest record at the same launch region.
4. A compatible local calendar date, with no conflicting second official notice.

Current road status, historic mayoral orders, signup pages and general launch
policies are NEVER match candidates or public viewing clearance.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from zoneinfo import ZoneInfo
import hashlib
import html
import json
import re
import urllib.error
import urllib.parse
import urllib.request

UTC=timezone.utc
UUID=re.compile(r"^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$",re.I)
ISO_DATE=re.compile(r"^\d{4}-\d{2}-\d{2}$")
MARKERS=(
    re.compile(r"\bSTARLINK[\s-]+(\d{1,2})\s*[-–]\s*(\d{1,3})\b",re.I),
    re.compile(r"\bUSSF[\s-]+(\d{2,4})\b",re.I),
    re.compile(r"\bNROL[\s-]+(\d{2,4})\b",re.I),
    re.compile(r"\bTRANSPORTER[\s-]+(\d{1,3})\b",re.I),
    re.compile(r"\bBANDWAGON[\s-]+(\d{1,3})\b",re.I),
    re.compile(r"\bCRS[\s-]+(\d{1,3})\b",re.I),
    re.compile(r"\bNG[\s-]+(\d{1,3})\b",re.I),
    re.compile(r"\bHASTE[\s-]+(\d{1,3})\b",re.I),
    re.compile(r"\bARTEMIS[\s-]+(II|III|IV|V|VI)\b",re.I),
    re.compile(r"\bTOMEX\+(?!\w)",re.I)
)
# Only these official sources are accepted for strict mission matching.
# NASA's indexed Wallops Range blog sometimes links to its /blogs/wallops/ pages.
INDEXES=(
  ("wallops-range-blog","virginia","https://www.nasa.gov/blogs/wallops-range/"),
  ("vandenberg-launch-news","california","https://www.vandenberg.spaceforce.mil/News/")
)
SOURCE={x[0]:x for x in INDEXES}
ZONES={"virginia":"America/New_York","california":"America/Los_Angeles"}
MONTHS={"JAN":1,"JANUARY":1,"FEB":2,"FEBRUARY":2,"MAR":3,"MARCH":3,
        "APR":4,"APRIL":4,"MAY":5,"JUN":6,"JUNE":6,"JUL":7,"JULY":7,"AUG":8,"AUGUST":8,
        "SEP":9,"SEPT":9,"SEPTEMBER":9,"OCT":10,"OCTOBER":10,"NOV":11,"NOVEMBER":11,
        "DEC":12,"DECEMBER":12}
DATE=re.compile(r"\b(January|February|March|April|May|June|July|August|September|October|November|December|"
                r"Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(20\d{2})\b",re.I)
PROSPECTIVE=re.compile(r"\b(scheduled|target(?:ed|ing)?|no earlier than|launch window|launch attempt|"
                       r"approved (?:the )?launch|plans? to launch|slated to launch|lift[ -]?off window)\b",re.I)
HISTORIC=re.compile(r"\b(successfully launched|has launched|launched on|launched at|"
                    r"flight successfully|lifted off|completed the launch)\b",re.I)
EVENT_TERMS=re.compile(r"\b(launch|rocket|mission|spacecraft)\b",re.I)
BLOG_DATE_PATH=re.compile(r"/(?:blogs/wallops(?:-range)?/)(20\d{2})/(\d{2})/(\d{2})/",re.I)
TEXT_MAX=18000
ARTICLE_MAX_BYTES=430000
INDEX_MAX_BYTES=440000
MAX_ARTICLES_PER_INDEX=2
MAX_AGE_DAYS=21

def iso(dt):
    return dt.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00","Z")

def when(value):
    try:
        t=datetime.fromisoformat(str(value).replace("Z","+00:00"))
        return t.astimezone(UTC) if t.tzinfo else None
    except (ValueError,TypeError,OverflowError):
        return None

def as_date(value):
    try:
        return datetime.strptime(value,"%Y-%m-%d").date() if ISO_DATE.fullmatch(str(value)) else None
    except (ValueError,TypeError):
        return None

def clean(value,length=280):
    return re.sub(r"\s+"," ",html.unescape(str(value or ""))).strip()[:length]

def markers(text):
    names=set()
    stems=("STARLINK","USSF","NROL","TRANSPORTER","BANDWAGON","CRS","NG","HASTE","ARTEMIS","TOMEX")
    for stem,pattern in zip(stems,MARKERS):
        for match in pattern.finditer(text or ""):
            if stem=="TOMEX":names.add("TOMEX+")
            elif stem=="ARTEMIS":names.add("ARTEMIS-"+match.group(1).upper())
            elif stem=="STARLINK":names.add("STARLINK-"+match.group(1)+"-"+match.group(2))
            else:names.add(stem+"-"+match.group(1))
    return names

def event_url(index_id,raw):
    base=SOURCE[index_id][2]
    if not raw or str(raw).startswith(("javascript:","data:","mailto:","#","//")):
        return None
    url=urllib.parse.urlsplit(urllib.parse.urljoin(base,raw))
    root=urllib.parse.urlsplit(base)
    if url.scheme!="https" or url.hostname!=root.hostname or url.username or url.password or url.port not in (None,443):
        return None
    path=url.path
    if index_id=="wallops-range-blog":
        valid=bool(re.fullmatch(r"/blogs/wallops(?:-range)?/20\d{2}/\d{2}/\d{2}/[a-z0-9-]+/?",path))
    else:
        valid=bool(re.fullmatch(r"/News/Article-Display/Article/\d+/[A-Za-z0-9-]+/?",path))
    return urllib.parse.urlunsplit((url.scheme,url.netloc,path,"","")) if valid else None

class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hide=0;self.in_article=0;self.articles=[];self.parts=[];self.links=[];self.anchor=None
    def handle_starttag(self,tag,attrs):
        if tag in ("script","style","noscript","svg"):
            self.hide+=1
        if self.hide:return
        if tag=="article":self.in_article+=1
        if tag in ("p","h1","h2","h3","li","time","br","section","div"):
            self.parts.append("\n")
        if tag=="a":
            self.anchor=[dict(attrs).get("href",""),[]]
    def handle_data(self,data):
        if self.hide:return
        self.parts.append(data)
        if self.anchor:self.anchor[1].append(data)
    def handle_endtag(self,tag):
        if tag in ("script","style","noscript","svg"):
            self.hide=max(0,self.hide-1);return
        if self.hide:return
        if tag=="a" and self.anchor:
            self.links.append((self.anchor[0],clean(" ".join(self.anchor[1]),250)))
            self.anchor=None
        if tag in ("p","h1","h2","h3","li","section","article"):
            self.parts.append("\n")
        if tag=="article" and self.in_article:
            self.in_article-=1
    def body(self):
        return "\n".join(clean(line,1900) for line in "".join(self.parts).splitlines() if clean(line))[:TEXT_MAX]

def fetch_text(url,expected_host,max_bytes):
    req=urllib.request.Request(url,headers={
       "User-Agent":"ChrisIzworskiLaunchMissionReconciler/1.0 (+https://chrisizworski.com)",
       "Accept":"text/html"})
    with urllib.request.urlopen(req,timeout=9) as response:
        final=urllib.parse.urlsplit(response.geturl())
        if final.scheme!="https" or final.hostname!=expected_host or final.port not in (None,443):
            raise ValueError("official-host-redirect-invalid")
        size=int(response.headers.get("Content-Length") or 0)
        if size>max_bytes:raise ValueError("source-too-large")
        data=response.read(max_bytes+1)
        if len(data)>max_bytes:raise ValueError("source-too-large")
        return data.decode(response.headers.get_content_charset() or "utf-8",errors="replace")

def discover(index_id,body,now):
    parser=Extract();parser.feed(body)
    chosen=[];seen=set()
    for raw,title in parser.links:
        url=event_url(index_id,raw)
        if not url or url in seen or len(title)<14 or not EVENT_TERMS.search(title):
            continue
        seen.add(url)
        # NASA path date is publication date. It is NEVER the launch target.
        m=BLOG_DATE_PATH.search(url)
        if m:
            try:published=datetime(int(m.group(1)),int(m.group(2)),int(m.group(3)),tzinfo=UTC)
            except ValueError:continue
            if (now-published).days>MAX_AGE_DAYS or published>now+timedelta(days=1):
                continue
        chosen.append({"sourceId":index_id,"region":SOURCE[index_id][1],
                       "url":url,"title":clean(title,150)})
        if len(chosen)>=MAX_ARTICLES_PER_INDEX:break
    return chosen

def prospective_date(body,now):
    # Only launch-target dates in an explicit forward-looking launch sentence
    # are eligible. A publication timestamp, history caption or archival
    # previous order must never become an event date.
    lines=[clean(p,1400) for p in body.splitlines() if clean(p)]
    for line in lines:
        if not PROSPECTIVE.search(line) or not EVENT_TERMS.search(line):
            continue
        # Historic launch reports never yield upcoming event notices.
        if HISTORIC.search(line):continue
        for match in DATE.finditer(line):
            month=MONTHS[match.group(1).upper().rstrip(".")]
            try:d=datetime(int(match.group(3)),month,int(match.group(2)),tzinfo=UTC)
            except ValueError:continue
            if now-timedelta(days=2)<=d<=now+timedelta(days=65):
                return d.date().isoformat()
    return None

def launch_region_attested(region,body):
    top=body[:5500].upper()
    if region=="virginia":
        return bool(re.search(r"\bWALLOPS(?:\s+ISLAND|\s+FLIGHT\s+FACILITY|\s+LAUNCH\s+RANGE)?\b",top)) and not re.search(
            r"LAUNCH LOCATION:\s*(?:POKER FLAT|WHITE SANDS|AND[ØO]YA|NORWAY|ALASKA)",top)
    if region=="california":
        return bool(re.search(r"\bVANDENBERG\b|\bSLC-4[EW]?\b",top)) and "CAPE CANAVERAL" not in top
    return False

def publication_date(article):
    m=BLOG_DATE_PATH.search(article["url"])
    if not m:return None
    try:return datetime(int(m.group(1)),int(m.group(2)),int(m.group(3)),tzinfo=UTC).date().isoformat()
    except ValueError:return None

def extract_event(article,html,now):
    doc=Extract();doc.feed(html)
    body=doc.body()
    if not launch_region_attested(article["region"],body):
        return None
    date=prospective_date(body,now)
    if not date:return None
    # The mission identifier MUST occur in the article's core evidence.
    # Take identifiers from the source article title or from paragraphs
    # that actually announce an upcoming attempt. Ignore unrelated footer,
    # "related stories" and navigation links.
    announcements=" ".join(line[:1500] for line in body.splitlines()
                            if PROSPECTIVE.search(line) and EVENT_TERMS.search(line))
    ids=markers(article["title"]) | markers(announcements)
    if len(ids)!=1:return None
    title=clean(article["title"],150)
    return {"sourceId":article["sourceId"],"region":article["region"],
            "articleUrl":article["url"],"title":title,
            "eventDate":date,"publishedDate":publication_date(article),
            "markers":sorted(ids),"scope":"scheduled-official-article",
            "sourceFingerprint":hashlib.sha256((title+"|"+date+"|"+str(sorted(ids))).encode()).hexdigest()[:24]}

def validate_manifest(manifest,now):
    if not isinstance(manifest,dict) or manifest.get("version")!=1 or manifest.get("health")!="recent":
        return None
    at=when(manifest.get("checkedAt"))
    if not at or not -timedelta(minutes=3)<=now-at<=timedelta(minutes=85):
        return None
    missions=manifest.get("missions")
    if not isinstance(missions,list) or len(missions)>220:return None
    safe=[]
    for m in missions:
        if not isinstance(m,dict) or not UUID.fullmatch(str(m.get("id",""))) or not m.get("region") in (
                "california","florida","texas","virginia","alaska","hawaii"):
            return None
        if not isinstance(m.get("name"),str) or len(m["name"])>180:
            return None
        net=when(m.get("net"))
        if not net or net<now-timedelta(days=2) or net>now+timedelta(days=122):
            continue
        if m.get("sourceStale") is True:return None
        safe.append({"id":m["id"],"region":m["region"],"name":m["name"],
                     "net":iso(net),"netPrecision":str(m.get("netPrecision") or "unknown")})
    if len(set(m["id"] for m in safe))!=len(safe):return None
    return {"checkedAt":iso(at),"missions":safe}

def reconcile(events,manifest,now):
    ready=validate_manifest(manifest,now)
    if ready is None:
        return {"version":1,"health":"schedule-unavailable","manifestCheckedAt":None,
                "matches":[],"unmatched":len(events),"conflicts":0,"candidateCount":len(events)}
    matched=[];ambiguous=0;unmatched=0
    indexed={m["id"]:m for m in ready["missions"]}
    used_ids=set()
    for event in events:
        # An article can describe multiple missions; refuse speculative joins.
        choices=[]
        for mission in indexed.values():
            if mission["region"]!=event["region"]:continue
            common=set(event["markers"])&markers(mission["name"])
            if len(common)!=1:continue
            local=datetime.fromisoformat(mission["net"].replace("Z","+00:00")).astimezone(
                ZoneInfo(ZONES[event["region"]])).date()
            day=as_date(event["eventDate"])
            if not day or abs((local-day).days)>1:continue
            choices.append((mission,list(common)[0],(local-day).days))
        if len(choices)!=1:
            unmatched+=1
            if len(choices)>1:ambiguous+=1
            continue
        mission,marker,delta=choices[0]
        if mission["id"] in used_ids:
            ambiguous+=1;unmatched+=1
            matched=[m for m in matched if m["launchId"]!=mission["id"]]
            continue
        used_ids.add(mission["id"])
        matched.append({
            "launchId":mission["id"],"region":event["region"],
            "sourceId":event["sourceId"],"articleUrl":event["articleUrl"],
            "noticeTitle":event["title"],"officialEventDate":event["eventDate"],
            "publishedDate":event["publishedDate"],"missionMarker":marker,
            "sourceFingerprint":event["sourceFingerprint"],"dateDifferenceDays":delta,
            "matchRule":"exact-designation-and-local-date",
            "accessStatus":"not-evaluated","launchStatus":"not-evaluated"})
    return {"version":1,"health":"matched-with-current-ll2" if matched else "no-verified-match",
            "manifestCheckedAt":ready["checkedAt"],"matches":matched[:12],
            "unmatched":unmatched,"conflicts":ambiguous,"candidateCount":len(events)}

def collect_evidence(manifest,now,fetcher=fetch_text):
    status=[];events=[]
    for sid,region,index in INDEXES:
        scanned=0;found=0
        try:
            page=fetcher(index,urllib.parse.urlsplit(index).hostname,INDEX_MAX_BYTES)
            articles=discover(sid,page,now)
            for article in articles:
                try:
                    raw=fetcher(article["url"],urllib.parse.urlsplit(index).hostname,ARTICLE_MAX_BYTES)
                    scanned+=1
                    event=extract_event(article,raw,now)
                    if event:events.append(event);found+=1
                except (OSError,ValueError,urllib.error.URLError,TimeoutError):
                    continue
            state="retrieved" if scanned==len(articles) else "partial"
        except (OSError,ValueError,urllib.error.URLError,TimeoutError):
            state="unavailable"
        status.append({"id":sid,"region":region,"sourceUrl":index,
                       "status":state,"articlesChecked":scanned,"candidateCount":found})
    # Candidate metadata remains bounded; only exact matches go public.
    output=reconcile(events,manifest,now)
    output["sourceStatus"]=status
    output["checkedAt"]=iso(now)
    output["candidateCount"]=len(events)
    return output
