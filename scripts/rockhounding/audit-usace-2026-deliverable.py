#!/usr/bin/env python3
"""Bounded survey-deliverable audit: 2026 USACE Grand Marais eHydro.

Review source polygon and physical download availability before reading datum or
survey depths. Metadata *never* establishes current navigable clearance, local
waves, safe beaches, or newly exposed stones.
"""
import argparse
import datetime as dt
import json
import pathlib
import urllib.parse
import urllib.request

SOURCE="https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0"
OID=125722
ZIP="https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.ZIP"
PDF="https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys-pdf/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.PDF"
POINTS={
 "bayshore-park-approx":(-85.9839,46.6719),
 "agate-beach-approx":(-85.9853,46.6760),
 "inner-harbor-center":(-85.9780,46.6747),
 "entrance-channel-approx":(-85.9702,46.6823)
}
FIELDS="OBJECTID,sdsfeaturename,surveydatestart,surveydateend,dateuploaded,sourcedatalocation,sourceprojection,plotsheetlocation,sourcedatacontent,usacedistrictcode,projectedarea"
def metadata_url():
 q={"where":f"OBJECTID={OID}","outFields":FIELDS,"returnGeometry":"true",
    "outSR":"4326","geometryPrecision":"6","f":"json"}
 return SOURCE+"/query?"+urllib.parse.urlencode(q)
def get_metadata(opener=urllib.request.urlopen):
 req=urllib.request.Request(metadata_url(),headers={"Accept":"application/json",
     "User-Agent":"MichiganRockhoundingResearch/1.0"})
 with opener(req,timeout=28) as res:
  body=res.read(160000)
 payload=json.loads(body)
 features=payload.get("features")
 if payload.get("error") or not isinstance(features,list) or len(features)!=1:
  raise ValueError("USACE 2026 catalog response missing or ambiguous")
 return features[0]

def inside_ring(point,ring):
 x,y=point;inside=False
 for i in range(len(ring)):
  x1,y1=ring[i-1][:2];x2,y2=ring[i][:2]
  if (y1>y)!=(y2>y):
   cut=(x2-x1)*(y-y1)/(y2-y1)+x1
   if x<cut:inside=not inside
 return inside
def polygon_contains(point,rings):
 # Even-odd parity across ArcGIS polygon rings permits holes.
 return sum(inside_ring(point,ring) for ring in rings)%2==1
def validate(feature):
 a=feature.get("attributes") or {}
 expected={"OBJECTID":OID,"sdsfeaturename":"Grand Marais Harbor",
   "sourcedatalocation":ZIP,"plotsheetlocation":PDF,
   "sourceprojection":"NAD_1983_StatePlane_Michigan_North_FIPS_2111_Feet",
   "usacedistrictcode":"CELRE"}
 for key,value in expected.items():
  if a.get(key)!=value:raise ValueError("USACE survey deliverable identity changed: "+key)
 end=dt.datetime.fromtimestamp(a["surveydateend"]/1000,dt.timezone.utc)
 if end.date()!=dt.date(2026,7,30):
  raise ValueError("USACE original survey end date not July 30 2026")
 content=str(a.get("sourcedatacontent") or "")
 for mandatory in (".XYZ",".XML","ReadMe_Survey_Data_Format.txt"):
  if mandatory not in content:raise ValueError("USACE archive contents omit "+mandatory)
 rings=feature.get("geometry",{}).get("rings")
 if not isinstance(rings,list) or not rings or sum(len(r) for r in rings)>8000:
  raise ValueError("USACE original survey footprint absent or excessive")
 for ring in rings:
  if len(ring)<4 or len(ring)>8000:raise ValueError("Invalid USACE hydrographic polygon ring")
  for pt in ring:
   if len(pt)<2 or not -86.04<float(pt[0])<-85.9 or not 46.6<float(pt[1])<46.73:
    raise ValueError("Survey polygon outside Grand Marais bounds")
 results={k:polygon_contains(point,rings) for k,point in POINTS.items()}
 bbox=[min(p[0] for ring in rings for p in ring),min(p[1] for ring in rings for p in ring),
      max(p[0] for ring in rings for p in ring),max(p[1] for ring in rings for p in ring)]
 return {"catalogObjectId":OID,"surveyEndUTC":end.date().isoformat(),
  "originalZipUrl":ZIP,"sourceProjectionLiteral":a["sourceprojection"],
  "sourceDataContentManifest":content,
  "sourcePolygon":{"ringCount":len(rings),"vertices":sum(len(r) for r in rings),
   "boundsWGS84":[round(x,6) for x in bbox],
   "studyPointInSurveyFootprint":results,
   "polygonIsSurveyCoverageNotDepthOrSafeWater":True}}
def check_head(url,opener=urllib.request.urlopen):
 if url not in (ZIP,PDF):raise ValueError("Non-allowlisted survey media URL")
 req=urllib.request.Request(url,method="HEAD",headers={"User-Agent":"MichiganRockhoundingResearch/1.0"})
 with opener(req,timeout=24) as res:
  size=res.headers.get("Content-Length")
  mime=res.headers.get("Content-Type")
  etag=res.headers.get("ETag")
  status=res.status
 return {"status":status,"contentLengthBytes":int(size) if size and size.isdigit() else None,
  "contentType":mime,"etag":etag,"hasKnownDownloadLength":bool(size and size.isdigit())}
def audit():
 validation=validate(get_metadata())
 files={}
 for name,url in (("surveyZip",ZIP),("surveyPdf",PDF)):
  try:files[name]=check_head(url)
  except Exception as e:files[name]={"status":"UNAVAILABLE","errorClass":type(e).__name__}
 return {"schemaVersion":"rockhounding-grand-marais-usace-2026-deliverable-audit-v1",
  "auditedAtUTC":dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z"),
  "source":SOURCE,"catalog":validation,"remoteMedia":files,
  "fullSurveyZipDownloadedAndInterpreted":False,
  "verticalDatumValidated":False,"surveyGridCoverageValidated":False,
  "harborWaveAttenuationMeasured":False,"currentSafeDepthClearanceKnown":False,
  "canPublishRockhoundingWindow":False,"canClaimSafeHarbor":False,
  "status":"ORIGINAL_2026_USACE_SOURCE_AND_SURVEY_FOOTPRINT_AUDITED"}
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument("--out",required=True)
 args=ap.parse_args()
 result=audit();p=pathlib.Path(args.out);p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(result,indent=2)+"\n",encoding="utf8")
 print("USACE_2026_DELIVERABLE_AUDIT "+json.dumps({
  "footprint":result["catalog"]["sourcePolygon"],"media":result["remoteMedia"],
  "surveyDataDownloaded":False,"currentDepthApproved":False},separators=(",",":")))
if __name__=="__main__":main()
