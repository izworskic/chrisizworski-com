#!/usr/bin/env python3
"""Audit manually curated, date-scoped operator statements for three exact trails.

Does not scrape natural-language webpages into closure verdicts. A note must be
individually reviewed against an operator notice before an observation is added.
The empty initial observations list is intentional. No weather or HTTP check may
be converted into an open status. Standard library only.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import pathlib
import subprocess
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILE = ROOT / "previews/great-lakes-winter-desk/route-access-evidence.json"
CORE = ROOT / "previews/great-lakes-winter-desk/core.js"

def route_catalog() -> dict:
    js = "const c=require(process.argv[1]);process.stdout.write(JSON.stringify(c.PLACES.map(p=>({id:p.id,official:p.official,conditions:p.conditions}))));"
    result = subprocess.run(["node","-e",js,str(CORE)],capture_output=True,text=True,check=True,timeout=10)
    return {row["id"]: row for row in json.loads(result.stdout)}

def official_url(url: str) -> bool:
    try:
        p = urllib.parse.urlparse(url)
        return p.scheme == "https" and p.hostname in {"www.nps.gov","www.dnr.state.mn.us"} and p.username is None
    except (ValueError,TypeError):
        return False

def stamp(x: str) -> dt.datetime | None:
    try:
        value = dt.datetime.fromisoformat(x.replace("Z","+00:00"))
        return value if value.tzinfo is not None else None
    except (ValueError,TypeError,AttributeError):
        return None

def audit(data: dict, catalog: dict, now: dt.datetime) -> list[str]:
    problems: list[str]=[]
    if data.get("schemaVersion") != 1 or data.get("operatorAccessReady") is not False:
        problems.append("Route evidence version or safety flag is invalid")
    try:
        reviewed = dt.date.fromisoformat(data["editorialReviewDate"])
        if reviewed>now.date():
            problems.append("Editorial review cannot be in the future")
    except (ValueError,TypeError,KeyError):
        problems.append("Invalid editorial review date")
    rows = data.get("routes")
    if not isinstance(rows,dict) or set(rows)!=set(catalog):
        return problems+["Exact route IDs do not match the visitor catalog"]
    for id,place in catalog.items():
        row = rows[id]
        if row.get("routeId")!=id or row.get("routePage")!=place["official"] or row.get("conditionsPage")!=place["conditions"]:
            problems.append(f"{id}: route identity or conditions source mismatch")
        if not official_url(row.get("routePage")) or not official_url(row.get("conditionsPage")):
            problems.append(f"{id}: operator URL outside official host allowlist")
        policy = row.get("policy")
        if not isinstance(policy,dict) or policy.get("sourceUrl")!=place["official"] or not (25<=len(policy.get("text",""))<=600):
            problems.append(f"{id}: specific sourced winter route guidance is missing")
        observations = row.get("observations")
        if not isinstance(observations,list):
            problems.append(f"{id}: observations must be an array")
            continue
        for n,e in enumerate(observations):
            prefix=f"{id} evidence {n}"
            if not isinstance(e,dict):
                problems.append(f"{prefix}: not a source record")
                continue
            if e.get("routeId")!=id or e.get("scope")!="exact-route" or e.get("reviewMethod")!="human-official-notice" or e.get("routeExplicit") is not True:
                problems.append(f"{prefix}: no verified exact-route operator scope")
            if e.get("sourceUrl") not in (place["official"],place["conditions"]) or not official_url(e.get("sourceUrl")):
                problems.append(f"{prefix}: invalid official URL")
            if e.get("status") not in ("open","closed","restricted"):
                problems.append(f"{prefix}: invalid access status")
            if not 12<=len(e.get("sourceStatement",""))<=240:
                problems.append(f"{prefix}: requires short verbatim documented operator notice")
            checked,published = stamp(e.get("checkedAt")),stamp(e.get("publishedAt"))
            if not checked or not published or checked>now+dt.timedelta(minutes=6) or published>checked+dt.timedelta(minutes=6):
                problems.append(f"{prefix}: missing, future or inconsistent source timestamps")
            try:
                start,end=dt.date.fromisoformat(e["validFrom"]),dt.date.fromisoformat(e["validThrough"])
                if start>end or (end-start).days>120:problems.append(f"{prefix}: unsupported date window")
                if e.get("status")=="open" and start!=end:
                    problems.append(f"{prefix}: positive access needs one named calendar date")
            except (ValueError,TypeError,KeyError):
                problems.append(f"{prefix}: date scope must be explicit")
    return problems

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    now=dt.datetime.now(dt.timezone.utc)
    catalog=route_catalog()
    data=json.loads(FILE.read_text())
    errors=audit(data,catalog,now)
    if args.self_test:
        assert not errors,errors
        bad=json.loads(json.dumps(data))
        bad["routes"]["gooseberry-upper"]["routeId"]="another-trail"
        assert audit(bad,catalog,now)
        bad=json.loads(json.dumps(data))
        bad["routes"]["meyers-lakeshore"]["observations"]=[{"status":"open","routeId":"meyers-lakeshore"}]
        assert audit(bad,catalog,now)
        print("PASS route scope and invented-opening rejection fixtures")
    print(json.dumps({"status":"PASS" if not errors else "FAIL","routes":len(catalog),
      "observations":sum(len(row.get("observations",[])) for row in data.get("routes",{}).values()),
      "actualOpenClaims":False if not any(row.get("observations") for row in data.get("routes",{}).values()) else "review individually",
      "errors":errors},indent=2))
    if errors:raise SystemExit(1)

if __name__=="__main__":main()
