#!/usr/bin/env python3
"""Read bounded official park-page notice signals; never infer route access.

The three exact textual anchors were researched individually. A MATCHED anchor
means only that the official webpage still publishes that statement. It does
not mean that a forecast has triggered a closure or that another named route
is closed. Missing phrases produce REVIEW_REQUIRED, not a reopening.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import html
import json
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
DEST=ROOT/"previews/great-lakes-winter-desk/operator-notice-monitor.json"
RULES={
 "gooseberry-upper":{
  "sourceUrl":"https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html",
  "scope":"named-route-policy",
  "phrase":"the only maintained, winter walking trail is to the Upper Falls",
  "message":"Minnesota DNR identifies the Upper Falls approach as its maintained winter walking route. This is a route policy, not a current access report."
 },
 "munising-snowshoe":{
  "sourceUrl":"https://www.nps.gov/places/munising-falls.htm",
  "scope":"different-route-closure",
  "phrase":"The Munising Falls Trail within Pictured Rocks National Lakeshore is closed until further notice",
  "message":"NPS lists the nearby Munising Falls Trail as closed until further notice. This does not close the separately marked snowshoe loop."
 },
 "meyers-lakeshore":{
  "sourceUrl":"https://www.nps.gov/apis/planyourvisit/conditions.htm",
  "scope":"conditional-area-closure-policy",
  "phrase":"the Meyers Beach area will be closed, including the ice caves",
  "message":"NPS states that Meyers Beach closes during a parkwide severe-cold closure. This is a conditional policy, not confirmation of a closure today."
 }
}
MAX_BYTES=350_000
ALLOWED={"www.nps.gov","www.dnr.state.mn.us"}

def verified_url(url):
    try:
        p=urllib.parse.urlparse(url)
        return p.scheme=="https" and p.hostname in ALLOWED and p.username is None
    except (TypeError,ValueError):
        return False

def normalize(value):
    value=html.unescape(re.sub(r"<[^>]*>"," ",value))
    return re.sub(r"\s+"," ",value).casefold().strip()

def probe(rule,checked):
    url=rule["sourceUrl"]
    if not verified_url(url):
        return {"state":"UNAVAILABLE","checkedAt":checked,"reason":"invalid source"}
    try:
        req=urllib.request.Request(url,headers={
            "User-Agent":"GreatLakesWinterFieldDesk/1.0 (chrisizworski.com; source-reconciliation)",
            "Accept":"text/html,application/xhtml+xml"})
        with urllib.request.urlopen(req,timeout=15) as response:
            if not verified_url(response.geturl()) or response.status!=200:
                raise ValueError("unapproved redirect or status")
            if "html" not in response.headers.get("Content-Type","").lower():
                raise ValueError("unexpected content type")
            raw=response.read(MAX_BYTES+1)
            if len(raw)>MAX_BYTES:
                raise ValueError("response over length budget")
            decoded=raw.decode("utf-8","replace")
            found=normalize(rule["phrase"]) in normalize(decoded)
            return {"state":"MATCHED" if found else "REVIEW_REQUIRED",
                "checkedAt":checked,"sourceHttpStatus":200,
                "bodySha256":hashlib.sha256(raw).hexdigest()}
    except (urllib.error.URLError,ValueError,TimeoutError,OSError):
        return {"state":"UNAVAILABLE","checkedAt":checked,"reason":"official source unavailable or changed"}

def build(now=None,fetch=probe):
    now=now or dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
    return {"schemaVersion":1,"generatedAt":now,
        "accessVerified":False,
        "meaning":"Exact official webpage statement presence only. No trail opening, closure, route safety or parking status is inferred.",
        "places":{
            key:{"sourceUrl":rule["sourceUrl"],"scope":rule["scope"],
                "message":rule["message"],"operatorAccess":"NOT_DETERMINED",
                **fetch(rule,now)}
            for key,rule in RULES.items()
        }}

def validate(doc):
    if doc.get("schemaVersion")!=1 or doc.get("accessVerified") is not False or set(doc.get("places",{}))!=set(RULES):
        return False
    for key,rule in RULES.items():
        row=doc["places"][key]
        if row.get("sourceUrl")!=rule["sourceUrl"] or row.get("scope")!=rule["scope"] or row.get("message")!=rule["message"]:
            return False
        if row.get("operatorAccess")!="NOT_DETERMINED" or row.get("state") not in ("MATCHED","REVIEW_REQUIRED","UNAVAILABLE"):
            return False
        if not row.get("checkedAt") or any(x in row for x in ("isOpen","isClosed","currentAccess","routeStatus")):
            return False
    return True

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--self-test",action="store_true")
    p.add_argument("--output",type=pathlib.Path,default=DEST)
    args=p.parse_args()
    if args.self_test:
        sample=build("2026-11-17T22:00:00Z",lambda rule,time:{"state":"MATCHED","checkedAt":time})
        assert validate(sample)
        sample["places"]["munising-snowshoe"]["isClosed"]=True
        assert not validate(sample)
        assert normalize("<b>Munising  </b>Falls")=="munising falls"
        assert not verified_url("https://attacker.example/redirect")
        print("PASS official notice source identity and no-inferred-access fixtures")
        return
    result=build()
    if not validate(result):
        raise SystemExit("Operator notice monitor failed validation")
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"generatedAt":result["generatedAt"],
        "states":{key:value["state"] for key,value in result["places"].items()},
        "accessVerified":False},indent=2))

if __name__=="__main__":
    main()
