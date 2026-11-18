#!/usr/bin/env python3
"""Offline Rideau Canal source reconciliation. No network, no generated forecasts.
Source truth: Parks Canada navigation table and paddling itinerary; reviewed 2026-11-17.
The source pages are canonical; this audit refuses incomplete or impossible derived data.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAV = ROOT / "data/rideau-canal/navigation-v2.json"
NAV_PUBLIC = ROOT / "public/assets/rideau-navigation.json"
LOCKS = ROOT / "data/rideau-canal/locations.json"
LOCKS_PUBLIC = ROOT / "public/assets/rideau-locations.json"
NAV_URL = "https://parks.canada.ca/lhn-nhs/on/rideau/visit/navigation/donnees-navigation-data"
PADDLE_URL = "https://parks.canada.ca/lhn-nhs/on/rideau/activ/pagaie-paddling"

def near(a, b):
    return math.isclose(a, b, abs_tol=0.000001)

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def validate():
    nav, lockdata = read(NAV), read(LOCKS)
    assert NAV.read_bytes() == NAV_PUBLIC.read_bytes(), "Browser navigation data differs from reviewed source"
    assert LOCKS.read_bytes() == LOCKS_PUBLIC.read_bytes(), "Browser lock data differs from reviewed source"
    assert nav["schemaVersion"] == 2 and lockdata["schemaVersion"] == 1
    assert nav["navigationSource"] == NAV_URL and nav["paddlingSource"] == PADDLE_URL
    assert nav["status"] == "historic-planning-evidence-only"
    assert nav["operationArchive"]["seasonYear"] == 2026
    assert not nav["operationArchive"]["futureSeasonVerified"]
    assert nav["operationArchive"]["lastLockageBlueLineMinutesPerLock"] == 30
    assert nav["operationArchive"]["swingBridgeMinutesBeforeClose"] == 20
    assert near(nav["mainlineKmTotal"], 202.1)
    assert near(nav["tayJunctionKmFromOttawa"], 110.4)
    assert 107.5 < nav["tayJunctionKmFromOttawa"] and "107.5" in nav["tayJunctionUncertainty"]
    locks = lockdata["lockLocations"]
    assert len(locks) == 26 and sum(l["chambers"] for l in locks) == 47
    assert len({l["groupId"] for l in locks}) == 24
    byid = {l["id"]: l for l in locks}
    assert len(byid) == len(locks)
    main, tay = nav["mainline"], nav["tay"]
    assert len(main) == 25 and len(tay) == 3
    assert {n["id"] for n in main if n["id"] != "kingston-causeway"} == {l["id"] for l in locks if l["branch"] == "main"}
    assert {n["id"] for n in tay if n["id"] != "perth-basin"} == {l["id"] for l in locks if l["branch"] == "tay"}
    assert all(near(n["km"],round(n["km"],1)) and n["km"] >= 0 for n in main + tay), "Chainage in km, 0.1 precision"
    assert all(a["km"] <= b["km"] for a,b in zip(main,main[1:]))
    assert all(a["km"] <= b["km"] for a,b in zip(tay,tay[1:]))
    assert near(main[0]["km"],0.0) and main[-1] == {"id":"kingston-causeway","km":202.1}
    assert near(tay[0]["km"],0.3) and tay[-1] == {"id":"perth-basin","km":10.0}
    assert near(next(x["km"] for x in main if x["id"]=="jones-falls"),159.0)
    assert near(next(x["km"] for x in main if x["id"]=="merrickville"),73.8)
    assert near(next(x["km"] for x in main if x["id"]=="upper-brewers"),176.5)
    assert near(next(x["km"] for x in main if x["id"]=="newboro"),140.8)
    assert near(abs(176.5-140.8),35.7), "Channel distance reference must not replace official paddle itinerary"
    assert all(x["sourceUrl"] == NAV_URL for x in nav["bridgeReference"])
    assert all(math.isfinite(x["km"]) and x["km"] >= 0 for x in nav["bridgeReference"])
    assert len({x["id"] for x in nav["bridgeReference"]}) == len(nav["bridgeReference"])
    paddle = {r["id"]:r for r in nav["paddling"]}
    assert set(paddle) == {"tay-marsh","upper-brewers-newboro"}
    for trip in paddle.values():
        assert trip["sourceUrl"] == PADDLE_URL
        assert trip["officialDays"] in (1,2) and trip["officialKm"] > 0
        assert trip["from"]["kind"] == "official-put-in"
        assert trip["to"]["kind"] == "official-take-out"
        assert "geometry" not in trip and "polyline" not in trip
        assert trip["hazards"] and trip["highlights"]
    assert (paddle["tay-marsh"]["officialKm"],paddle["tay-marsh"]["officialDays"]) == (12,1)
    assert (paddle["upper-brewers-newboro"]["officialKm"],paddle["upper-brewers-newboro"]["officialDays"]) == (39,2)
    assert all(l["profileUrlVerified"] and l["sourceUrl"].startswith("https://parks.canada.ca/") for l in locks)
    # Source mismatch must stay explicit. Deriving an ETA or route line is outside this contract.
    assert "navigation" in nav["distanceSemantics"].lower()
    assert "no digital water track" in paddle["tay-marsh"]["routeKind"].lower()
    return {
        "lockLocations":len(locks),"groupings":len({l["groupId"] for l in locks}),
        "physicalChambers":sum(l["chambers"] for l in locks),
        "mainlineNodes":len(main),"tayNodes":len(tay),
        "documentedBridges":len(nav["bridgeReference"]),"officialPaddleTrips":len(paddle),
        "verifiedSourceMirrors":True,"predictionModel":False,
        "source":NAV_URL
    }

if __name__ == "__main__":
    print(json.dumps(validate(), sort_keys=True))
