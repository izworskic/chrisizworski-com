#!/usr/bin/env python3
"""Verify the *official* USACE eHydro July 2026 Grand Marais source links and metadata.

One lightweight ArcGIS REST request. This does not download huge XYZ/TIN data,
measure local surf, assert current navigation clearance, or justify rock collecting.
"""
import argparse
import datetime as dt
import json
import pathlib
import urllib.parse
import urllib.request

LAYER="https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0"
OBJECTID=125722
FIELDS=("OBJECTID","surveyjobidpk","sdsfeaturename","surveytype",
        "surveydatestart","surveydateend","dateuploaded","usacedistrictcode",
        "sourcedatalocation","plotsheetlocation","sourcedatacontent","sourceprojection",
        "sourceagency","channelareaidfk")
SURVEY_ID="GR_01_MAS_20260730_CS"
PREFIX="https://ehydroprod.blob.core.usgovcloudapi.net/"

def source_url():
    return LAYER+"/query?"+urllib.parse.urlencode({
      "where":f"OBJECTID={OBJECTID}","outFields":",".join(FIELDS),
      "returnGeometry":"false","f":"json"
    })

def iso_utc(milliseconds):
    if isinstance(milliseconds,bool) or not isinstance(milliseconds,(int,float)):
        raise ValueError("Missing or invalid official USACE epoch milliseconds")
    try:
        date=dt.datetime.fromtimestamp(milliseconds/1000,tz=dt.timezone.utc)
    except (OSError,OverflowError,ValueError) as exc:
        raise ValueError("USACE survey date out of bounds") from exc
    return date.date().isoformat()

def validate_query(payload,source):
    if not isinstance(payload,dict) or payload.get("error") or payload.get("exceededTransferLimit") or len(payload.get("features",[]))!=1:
        raise ValueError("USACE survey job missing, duplicated or truncated")
    a=payload["features"][0].get("attributes") or {}
    for field,expected in (
        ("OBJECTID",OBJECTID),("surveyjobidpk",SURVEY_ID),
        ("sdsfeaturename","Grand Marais Harbor"),("surveytype","CS"),
        ("channelareaidfk","CELRE_GR_01_MAS"),("usacedistrictcode","CELRE"),
        ("sourceagency","CELRE_DIS"),("sourceprojection",
           "NAD_1983_StatePlane_Michigan_North_FIPS_2111_Feet")
    ):
        if a.get(field)!=expected:
            raise ValueError("Official USACE source field drift: "+field)
    for field,expected in (
        ("surveydatestart","2026-07-30"),("surveydateend","2026-07-30"),
        ("dateuploaded","2026-09-11")
    ):
        if iso_utc(a.get(field))!=expected:
            raise ValueError("USACE official source date drift: "+field)
    expected_zip=PREFIX+"ehydro-surveys/CELRE/CELRE_DIS_"+SURVEY_ID+".ZIP"
    expected_pdf=PREFIX+"ehydro-surveys-pdf/CELRE/CELRE_DIS_"+SURVEY_ID+".PDF"
    if a.get("sourcedatalocation")!=expected_zip or a.get("plotsheetlocation")!=expected_pdf:
        raise ValueError("USACE original survey download links changed")
    actual_files=set(x.strip() for x in str(a.get("sourcedatacontent") or "").split(",") if x.strip())
    if actual_files!=set(source.get("sourceDataContent",[])):
        raise ValueError("USACE survey archive advertised contents changed")
    if (source.get("surveyJobId")!=SURVEY_ID or source.get("objectId")!=OBJECTID or
        source.get("sourceArchiveURL")!=expected_zip or source.get("publicPlotPDFURL")!=expected_pdf or
        source.get("surveyEndUTC")!="2026-07-30"):
        raise ValueError("Frozen USACE source register no longer agrees with official survey")
    return {
      "researchStatus":"OFFICIAL_USACE_2026_SURVEY_METADATA_LINKS_REVERIFIED",
      "surveyJobId":SURVEY_ID,"surveyEndUTC":"2026-07-30",
      "downloadArchiveListed":True,
      "surveyPlotListed":True,
      "originalArchiveContentsParsed":False,
      "bathymetryDatumCalibratedToNOAA":False,
      "waveHeightMeters":None,"canPublishRockhoundingVisitWindow":False,
      "canCertifySafeAccess":False
    }

def capture(source,opener=urllib.request.urlopen):
    req=urllib.request.Request(source_url(),headers={
       "User-Agent":"MichiganRockhoundingEvidenceVerification/1.0",
       "Accept":"application/json"
    })
    with opener(req,timeout=30) as response:
        payload=json.loads(response.read(120000))
    return validate_query(payload,source)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source",default="data/rockhounding/grand-marais-usace-2026-survey-source.json")
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    src=json.loads(pathlib.Path(args.source).read_text())["source"]
    result=capture(src)
    target=pathlib.Path(args.out);target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(result,sort_keys=True))

if __name__=="__main__":
    main()
