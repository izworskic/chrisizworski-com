#!/usr/bin/env python3
"""Research-only USACE eHydro survey *catalog* check near Grand Marais, Michigan.

The survey catalog does not measure waves, confirm a current depth, or certify
whether public rock collecting is allowed. One bounded query, no key, no polling.
"""
import argparse
import datetime as dt
import json
import pathlib
import re
import urllib.parse
import urllib.request

LAYER = "https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0"
BBOX = (-86.01, 46.65, -85.94, 46.71)
FIELDS = ("OBJECTID", "surveyjobidpk", "sdsfeaturename", "surveytype",
          "surveydatestart", "surveydateend", "dateuploaded",
          "usacedistrictcode", "sourcedatalocation")

def query_url(bbox=BBOX):
    if (len(bbox) != 4 or not -86.1 < bbox[0] < bbox[2] < -85.8
            or not 46.5 < bbox[1] < bbox[3] < 46.8
            or (bbox[2] - bbox[0]) > .1 or (bbox[3] - bbox[1]) > .1):
        raise ValueError("Study bounds invalid or unreasonably broad")
    params = {
        "where": "1=1", "geometry": ",".join(map(str, bbox)),
        "geometryType": "esriGeometryEnvelope", "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects", "outFields": ",".join(FIELDS),
        "returnGeometry": "false", "resultRecordCount": "500", "f": "json"
    }
    return LAYER + "/query?" + urllib.parse.urlencode(params)

def survey_utc(ms):
    if ms is None:
        return None
    if isinstance(ms, bool) or not isinstance(ms, (int, float)):
        raise ValueError("Malformed USACE survey date")
    try:
        date = dt.datetime.fromtimestamp(ms / 1000, tz=dt.timezone.utc)
    except (OverflowError, OSError, ValueError) as exc:
        raise ValueError("Out-of-range USACE survey date") from exc
    if not 1990 <= date.year <= dt.datetime.now(dt.timezone.utc).year + 1:
        raise ValueError("USACE survey date out of bounds")
    return date.date().isoformat()

def parse_catalog(payload):
    if (not isinstance(payload, dict) or payload.get("error")
            or payload.get("exceededTransferLimit")
            or not isinstance(payload.get("features"), list)
            or len(payload["features"]) > 500):
        raise ValueError("USACE catalog unavailable, truncated or invalid")
    records = []
    seen = set()
    for feature in payload["features"]:
        a = feature.get("attributes") if isinstance(feature, dict) else None
        if not isinstance(a, dict) or type(a.get("OBJECTID")) is not int or a["OBJECTID"] <= 0:
            raise ValueError("Invalid USACE survey feature identifier")
        if a["OBJECTID"] in seen:
            raise ValueError("Duplicate USACE survey feature")
        seen.add(a["OBJECTID"])
        name = a.get("sdsfeaturename")
        if not isinstance(name, str):
            raise ValueError("Missing USACE project name")
        # Bounding-envelope intersection is not sufficient to claim a survey
        # belongs to Grand Marais; require the locality in the source title.
        if not re.search(r"grand\s+mar(?:ais|ias)", name, flags=re.I):
            continue
        records.append({
            "objectId": a["OBJECTID"],
            "catalogName": name[:100],
            "surveyType": (a.get("surveytype") or "")[:50],
            "surveyStartUTC": survey_utc(a.get("surveydatestart")),
            "surveyEndUTC": survey_utc(a.get("surveydateend")),
            "uploadedUTC": survey_utc(a.get("dateuploaded")),
            "district": a.get("usacedistrictcode"),
            "hasSourceDownloadReference": bool(a.get("sourcedatalocation")),
            "fullBathymetricSurveyDownloadedAndValidated": False,
            "validatesPresentHarborWaveHeight": False,
        })
    records.sort(key=lambda r: (r["surveyEndUTC"] or "", r["objectId"]), reverse=True)
    return records

def capture(opener=urllib.request.urlopen):
    url = query_url()
    request = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "MichiganRockhoundingResearch/1.0 (one bounded USACE eHydro lookup)"
    })
    with opener(request, timeout=35) as response:
        payload = json.loads(response.read(900000))
    rows = parse_catalog(payload)
    return {
        "schemaVersion": "rockhounding-ehydro-survey-catalog-audit-v1",
        "collectedAtUTC": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": {
            "provider": "US Army Corps of Engineers",
            "catalogLayer": LAYER,
            "queryBbox": list(BBOX),
            "queryType": "bounded_geographic_catalog_lookup",
            "individualSourceFieldsValidated": list(FIELDS),
        },
        "matchingSurveyJobs": rows,
        "catalogFinding": ("MATCHING_SURVEY_JOB_METADATA" if rows
                           else "NO_NAMED_MATCH_IN_BOUNDED_CATALOG_QUERY"),
        "absenceOfSurveyProven": False,
        "currentBathymetryIndependentlyValidated": False,
        "measuredHarborWaveObservationsAvailable": False,
        "harborWaveTransmissionCalibrated": False,
        "canPublishHarborSurf": False,
        "canClaimNewStones": False,
        "canPublishRockhoundingWindow": False,
    }

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", required=True)
    args = p.parse_args()
    evidence = capture()
    target = pathlib.Path(args.out)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": evidence["catalogFinding"],
        "matches": len(evidence["matchingSurveyJobs"]),
        "mostRecentSurveyEndUTC": (evidence["matchingSurveyJobs"][0]["surveyEndUTC"]
                                   if evidence["matchingSurveyJobs"] else None),
        "surfClaimAllowed": evidence["canPublishHarborSurf"]
    }, sort_keys=True))

if __name__ == "__main__":
    main()
