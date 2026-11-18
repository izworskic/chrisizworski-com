#!/usr/bin/env python3
"""Fail-closed audit of three verified winter parking/arrival records.

This validates park names, source identity, claims and Google Maps roles.
A seasonally plowed lot is not a same-day open parking guarantee.
"""
from __future__ import annotations
import datetime as dt
import json
import pathlib
import subprocess
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILE = ROOT / "previews/great-lakes-winter-desk/arrival-evidence.json"
CORE = ROOT / "previews/great-lakes-winter-desk/core.js"

def catalog():
    javascript="const c=require(process.argv[1]);process.stdout.write(JSON.stringify(c.PLACES.map(p=>({id:p.id,conditions:p.conditions}))));"
    p=subprocess.run(["node","-e",javascript,str(CORE)],capture_output=True,text=True,check=True,timeout=10)
    return {x["id"]:x for x in json.loads(p.stdout)}

def good_source(value):
    try:
        parts=urllib.parse.urlparse(value)
        return (parts.scheme=="https" and not parts.username and
                parts.hostname in ("www.nps.gov","www.dnr.state.mn.us","files.dnr.state.mn.us"))
    except (TypeError,ValueError):
        return False

def validate(doc,places,when):
    errors=[]
    if doc.get("schemaVersion")!=1:
        errors.append("Bad evidence schema")
    try:
        reviewed=dt.date.fromisoformat(doc["reviewedOn"])
        if reviewed>when:
            errors.append("Review timestamp in future")
    except (ValueError,TypeError,KeyError):
        errors.append("Invalid review timestamp")
    rows=doc.get("places")
    if not isinstance(rows,dict) or set(rows)!=set(places):
        return errors+["Parking records do not exactly match registered outings"]
    for key,expected in places.items():
        row=rows[key]
        label=key+": "
        if row.get("officialConditions")!=expected["conditions"]:
            errors.append(label+"unmatched official conditions URL")
        if row.get("routeOpenToday") is not False or row.get("verifiedArrivalCoordinates") is not False:
            errors.append(label+"invented present-day open status or precise parking coordinate")
        if row.get("arrivalKind") not in ("verified-park-address","verified-named-trail-parking","verified-street-address-and-lot"):
            errors.append(label+"unknown parking evidence type")
        if row.get("winterParkingEvidence") not in ("designated-winter-arrival","plowed-seasonal-policy","winter-plowing-unknown"):
            errors.append(label+"invalid winter plowing evidence classification")
        for field in ("arrivalName","arrivalAddress","winterParkingText","parkingFeeText","parkingNotes"):
            if not 15<=len(str(row.get(field,"")))<=700:
                errors.append(label+"missing visitor detail "+field)
        for field in ("entranceSource","feeSource","officialConditions"):
            if not good_source(row.get(field)):
                errors.append(label+"source is not official for "+field)
        if not str(row.get("googleSearch","")).startswith("https://www.google.com/maps/search/?api=1&query="):
            errors.append(label+"unverified Google Maps location search")
        direction=row.get("directionsUrl")
        if direction is not None:
            expectedDirections="https://www.google.com/maps/dir/?api=1&destination=90500%20Meyers%20Beach%20Road%20Bayfield%20WI%2054814"
            if key!="meyers-lakeshore" or direction!=expectedDirections or row.get("arrivalKind")!="verified-street-address-and-lot":
                errors.append(label+"unsafe or unsupported driving route")
        if key=="meyers-lakeshore" and row.get("winterParkingEvidence")!="winter-plowing-unknown":
            errors.append(label+"Meyers winter plowing must remain unknown until operator confirms it")
        if key=="munising-snowshoe" and row.get("winterParkingEvidence")!="plowed-seasonal-policy":
            errors.append(label+"Snowshoe lot's published NPS seasonal plowing policy not tagged")
    return errors

def main():
    import argparse
    arg=argparse.ArgumentParser()
    arg.add_argument("--self-test",action="store_true")
    opts=arg.parse_args()
    doc=json.loads(FILE.read_text())
    places=catalog()
    now=dt.datetime.now(dt.timezone.utc).date()
    problems=validate(doc,places,now)
    if opts.self_test:
        assert not problems,problems
        altered=json.loads(json.dumps(doc))
        altered["places"]["meyers-lakeshore"]["winterParkingEvidence"]="plowed-seasonal-policy"
        assert validate(altered,places,now)
        altered=json.loads(json.dumps(doc))
        altered["places"]["munising-snowshoe"]["directionsUrl"]="https://www.google.com/maps/dir/?api=1&destination=restricted"
        assert validate(altered,places,now)
        altered=json.loads(json.dumps(doc))
        altered["places"]["gooseberry-upper"]["routeOpenToday"]=True
        assert validate(altered,places,now)
        print("PASS parking location, plowing provenance and routing-negative fixtures")
    print(json.dumps({"status":"PASS" if not problems else "FAIL",
        "outings":len(places),"newOpenStatusClaims":0,"winterPlowingConfirmedToday":0,
        "errors":problems},indent=2))
    if problems:raise SystemExit(1)

if __name__=="__main__":
    main()
