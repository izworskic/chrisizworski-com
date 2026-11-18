#!/usr/bin/env python3
"""Verify published Rideau viewpoints without inventing entrance geometry."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/rideau-canal/watch-v1.json"
PUBLIC = ROOT / "public/assets/rideau-watch.json"
ALLOWED = {"parks.canada.ca", "ottawatourism.ca"}
def check():
    assert DATA.read_bytes() == PUBLIC.read_bytes(), "Published viewpoint data drifted from review"
    record = json.loads(DATA.read_text(encoding="utf-8"))
    assert record["schemaVersion"] == 1 and record["reviewed"] == "2026-11-18"
    assert set(record["stations"]) == {"ottawa", "jones-falls", "merrickville", "smiths-falls-combined", "newboro", "chaffeys", "kingston-mills"}
    assert "no surveyed parking" in record["scope"].lower()
    count = 0
    for station in record["stations"].values():
        assert len(station["places"]) >= 1
        assert "search" in station["foodSearch"] or "near" in station["foodSearch"]
        for place in station["places"]:
            assert place["name"] and place["watch"] and place["approach"] and place["googleQuery"]
            assert urlparse(place["sourceUrl"]).netloc in ALLOWED
            assert not any(key in place for key in ("lat", "lon", "geometry", "directions", "parkingCoordinates"))
            count += 1
    for kind, chambers in (("ottawa", 8), ("jones-falls", 4)):
        file = ROOT / ("public/assets/rideau-locks-" + kind + "-diagram.svg")
        xml = file.read_text(encoding="utf-8")
        assert ET.fromstring(xml).tag == "{http://www.w3.org/2000/svg}svg"
        assert xml.count("data-chamber=") == chambers
        assert "not to scale" in xml.lower()
        assert "svg" in xml and "source" not in file.name
    return {"auditedStations": len(record["stations"]), "namedViewpointChoices": count,
            "verifiedParkingEntrances": 0, "liveCameraStreams": 0}
if __name__ == "__main__":
    print(json.dumps(check(), sort_keys=True))
