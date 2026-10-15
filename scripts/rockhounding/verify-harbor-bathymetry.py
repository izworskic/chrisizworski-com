#!/usr/bin/env python3
"""Grand Marais NOAA ENC historical harbor sounding/contour coverage.

Research only. NOAA ENC depth values are source chart values, NOT current
surveyed depths, navigation clearance, surf/harbor wave attenuation, or
rock exposure data. Four overlapping study envelopes must NOT be summed.
"""
import argparse
import datetime as dt
import json
import math
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

BASE="https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer"
CHART="US5MI77M.000"
SOUNDING_LAYER=76
CONTOUR_LAYER=104
ZONES={
 "inner-southwest":{"label":"Inner southwest harbor near Bayshore study area",
                    "bbox":(-85.992,46.666,-85.978,46.677)},
 "harbor-center":{"label":"Harbor center / approach toward entrance",
                    "bbox":(-85.983,46.673,-85.971,46.682)},
 "pier-north":{"label":"Northern harbor entrance piers",
               "bbox":(-85.975,46.678,-85.965,46.686)},
 "lake-approach":{"label":"Lake Superior north of harbor entrance",
                  "bbox":(-85.980,46.684,-85.964,46.694)}
}
def query_url(layer,box):
 if layer not in (SOUNDING_LAYER,CONTOUR_LAYER):raise ValueError("Unexpected NOAA ENC layer")
 if (len(box)!=4 or not -86.05<box[0]<box[2]<-85.9 or
     not 46.65<box[1]<box[3]<46.72):
  raise ValueError("Outside approved Grand Marais study bounds")
 out_fields="OBJECTID,Z,SORDAT,SORIND,DSNM" if layer==SOUNDING_LAYER else "OBJECTID,VALDCO,SORDAT,DSNM"
 args={"where":"1=1","geometry":",".join(map(str,box)),
   "geometryType":"esriGeometryEnvelope","inSR":"4326",
   "spatialRel":"esriSpatialRelIntersects",
   "outFields":out_fields,"returnGeometry":"false","f":"json"}
 return BASE+"/"+str(layer)+"/query?"+urllib.parse.urlencode(args)

def remote_features(layer,box,opener=urllib.request.urlopen):
 url=query_url(layer,box)
 last=None
 for attempt in range(3):
  try:
   request=urllib.request.Request(url,headers={"User-Agent":"RockhoundingGrandMaraisResearch/1.0",
                                                "Accept":"application/json"})
   with opener(request,timeout=30) as res: body=res.read(250000)
   data=json.loads(body)
   if data.get("error") or not isinstance(data.get("features"),list) or
      data.get("exceededTransferLimit") or len(data["features"])>500:
    raise ValueError("NOAA ENC features unavailable, excessive or truncated")
   return data["features"]
  except (ValueError,urllib.error.URLError,TimeoutError) as exc:
   last=exc
   if attempt<2:time.sleep(1.5*(attempt+1))
 raise RuntimeError("NOAA ENC chart-depth source failed: "+str(last)[:150])

def summarize_features(layer,features):
 key="Z" if layer==SOUNDING_LAYER else "VALDCO"
 seen=set();values=[];dates=set();identifiers=[];source_types=set()
 for f in features:
  a=f.get("attributes") or {}
  obj=a.get("OBJECTID")
  if (not isinstance(obj,int) or obj<=0 or obj in seen or
      a.get("DSNM")!=CHART or not isinstance(a.get(key),(int,float)) or
      not math.isfinite(a[key]) or a[key]<0 or a[key]>100):
   raise ValueError("Corrupt or non-matching NOAA ENC depth feature")
  seen.add(obj);identifiers.append(obj);values.append(float(a[key]))
  date=a.get("SORDAT")
  if layer==SOUNDING_LAYER:
   if not isinstance(date,str) or len(date) not in (6,8) or not date.isdigit():
    raise ValueError("Dated NOAA sounding provenance required")
   if not (1900<=int(date[:4])<=2026):raise ValueError("Invalid chart sounding source year")
   dates.add(date)
   source_types.add(str(a.get("SORIND") or "NOT_REPORTED"))
  elif date is not None:
   dates.add(str(date))
 if not values:raise ValueError("No chart-depth features in requested study zone")
 return {"featureCount":len(values),"layer":layer,"chartDataset":CHART,
  "chartValueMin":round(min(values),2),"chartValueMax":round(max(values),2),
  "sourceDates":sorted(dates),"sourceAttribution":sorted(source_types),
  "featureIds":sorted(identifiers),
  "isCurrentSoundingSurvey":False,"isNavigableDepthEstimate":False}

def capture():
 result={"schemaVersion":"grand-marais-noaa-enc-harbor-depth-coverage-v1",
  "collectedAtUTC":dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z"),
  "source":{"mapServer":BASE,"chartDataset":CHART,
     "soundingLayer":SOUNDING_LAYER,"contourLayer":CONTOUR_LAYER,
     "primaryVariableSounding":"Z","primaryVariableContour":"VALDCO",
     "chartUnitsAndDatumNotIndependentlyResolved":True,
     "regionSelection":"Four overlapping bounded research envelopes; raw feature counts are NOT additive",
     "sourceWarning":"NOAA ENC GIS is not for navigation; individual sounding survey dates vary"},
  "zones":{},
  "nonAdditiveOverlappingEnvelopes":True,
  "currentHarborBathymetrySurveyValidated":False,
  "currentMinimumNavigableDepthMeters":None,
  "harborWaveTransmissionFactor":None,
  "publicHarborSurfForecastEnabled":False,
  "canClaimSafeWater":False,"canClaimAgatesExposed":False,
  "status":"HISTORIC_CHART_BATHYMETRIC_COVERAGE_RESEARCH_ONLY"}
 for key,z in ZONES.items():
  sound=summarize_features(SOUNDING_LAYER,remote_features(SOUNDING_LAYER,z["bbox"]))
  contour=summarize_features(CONTOUR_LAYER,remote_features(CONTOUR_LAYER,z["bbox"]))
  result["zones"][key]={"label":z["label"],"bbox":list(z["bbox"]),
    "soundings":sound,"contours":contour,
    "currentDepthValidity":"UNVERIFIED_HISTORIC_CHART_SOURCE",
    "waveShelterValidity":"NOT_CALIBRATED"}
 return result

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument("--out",required=True)
 args=parser.parse_args()
 data=capture();dest=pathlib.Path(args.out)
 dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
 print("NOAA_ENC_HARBOR_DEPTH "+json.dumps({
   "source":data["source"]["chartDataset"],
   "zones":{k:{"soundings":v["soundings"]["featureCount"],
               "contours":v["contours"]["featureCount"],
               "sourceDates":v["soundings"]["sourceDates"],
               "chartedValueMin":v["soundings"]["chartValueMin"],
               "chartedValueMax":v["soundings"]["chartValueMax"]} for k,v in data["zones"].items()},
   "noNavigableDepth":data["currentMinimumNavigableDepthMeters"] is None,
   "noAttenuation":data["harborWaveTransmissionFactor"] is None
 },separators=(',',':')),flush=True)
if __name__=="__main__":main()
