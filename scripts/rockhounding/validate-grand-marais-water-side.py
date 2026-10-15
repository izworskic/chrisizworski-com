#!/usr/bin/env python3
"""Bounded no-key Great Lakes water-body point tests at Grand Marais, MI.

The cited GLAHF NHD-derived open-water polygon establishes GIS water/land
classification, not surveyed present-day waterline, wave refraction, collecting
permission, safety, breakwater attenuation, or a validated shore normal.
This is a ONE-TIME research snapshot; not an API call per visitor.
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

GLAHF_LAYER="https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/Great_Lakes_MAP_ALL__5/FeatureServer/0"
SOURCE_DESCRIPTION="GLAHF open Great Lakes water polygons derived in part from NHD 1:24,000 (2013) and EPA bays"
SITES={
 "grand-marais-agate":{"label":"Agate Beach","anchor":{"lat":46.676,"lon":-85.9853}},
 "grand-marais-harbor":{"label":"Bayshore Park harbor","anchor":{"lat":46.6719,"lon":-85.9839}}
}
# Several points intentionally sit well clear of likely beach width. The near
# shoreline is dynamic and must not be inferred from a single water/land pixel.
POINTS=[
 ("agate_north_450m","grand-marais-agate","OPEN_NORTH_REFERENCE",46.6800,-85.9853,"WATER"),
 ("agate_north_900m","grand-marais-agate","FAR_OPEN_NORTH",46.6841,-85.9853,"WATER"),
 ("agate_south_350m","grand-marais-agate","BEHIND_BEACH_LAND",46.67285,-85.9853,"LAND"),
 ("agate_south_650m","grand-marais-agate","FAR_BEHIND_BEACH_LAND",46.67015,-85.9853,"LAND"),
 ("agate_500m_wave_candidate","grand-marais-agate","NOAA_500M_WET_CELL",46.6800,-85.984978,"WATER"),
 ("agate_2p5km_north_candidate","grand-marais-agate","NOAA_2P5KM_OPEN_SIDE_CANDIDATE",46.688341,-85.976613,"WATER"),
 ("agate_2p5km_south_nearest","grand-marais-agate","REJECTED_HARBOR_SIDE_2P5KM",46.667276,-85.978659,"WATER"),
 ("bayshore_east_750m","grand-marais-harbor","HARBOR_EAST_WATER",46.6719,-85.9741,"WATER"),
 ("bayshore_east_1100m","grand-marais-harbor","EAST_OPEN_WATER_UNVERIFIED_HARBOR_ROUTE",46.6719,-85.9695,"WATER"),
 ("bayshore_west_500m","grand-marais-harbor","BEHIND_HARBOR_LAND",46.6719,-85.9904,"LAND"),
 ("bayshore_west_850m","grand-marais-harbor","FAR_BEHIND_HARBOR_LAND",46.6719,-85.9950,"LAND"),
 ("bayshore_500m_wave_candidate","grand-marais-harbor","NOAA_500M_NEARBY_MODEL_CELL",46.673,-85.974978,"WATER"),
 ("bayshore_north_500m","grand-marais-harbor","INNER_WATER_CONTEXT_NOT_SURF",46.6764,-85.9839,"WATER"),
 ("bayshore_south_500m","grand-marais-harbor","SOUTH_LAND_CONTEXT",46.6674,-85.9839,"LAND"),
]

def arcgis_query_url(lat,lon):
    geom=json.dumps({"x":lon,"y":lat,"spatialReference":{"wkid":4326}},separators=(',',':'))
    params={"where":"1=1","geometry":geom,"geometryType":"esriGeometryPoint",
      "inSR":"4326","spatialRel":"esriSpatialRelIntersects",
      "returnCountOnly":"true","f":"json"}
    return GLAHF_LAYER+"/query?"+urllib.parse.urlencode(params)

def classify(lat,lon,opener=urllib.request.urlopen):
    if not (46.64<lat<46.71 and -86.05<lon<-85.91):
        raise ValueError("Outside bounded Grand Marais study window")
    req=urllib.request.Request(arcgis_query_url(lat,lon),
        headers={"Accept":"application/json","User-Agent":"MichiganRockhoundingResearch/1.0"})
    last=None
    for attempt in range(3):
        try:
            with opener(req,timeout=22) as res:
                raw=res.read(25000)
            result=json.loads(raw)
            if result.get("error") or not isinstance(result.get("count"),int) or result["count"] not in (0,1):
                raise ValueError("Ambiguous GLAHF service response; no water status authorized")
            return "WATER" if result["count"]==1 else "LAND"
        except (urllib.error.URLError,TimeoutError,ValueError) as exc:
            last=exc
            if attempt<2:time.sleep(1.5*(attempt+1))
    raise RuntimeError("Official GLAHF GIS classification unavailable: "+str(last)[:180])

def check_snapshot(results):
    lookup={p["id"]:p for p in results}
    if len(lookup)!=len(POINTS):raise ValueError("Missing or duplicated shoreline study points")
    differences=[p for p in results if p["gisClass"]!=p["expectedResearchClass"]]
    agateRequired=("agate_north_450m","agate_north_900m","agate_south_350m",
                   "agate_south_650m","agate_500m_wave_candidate",
                   "agate_2p5km_north_candidate")
    harborRequired=("bayshore_east_750m","bayshore_west_500m",
                    "bayshore_500m_wave_candidate")
    agate=all(lookup[key]["gisClass"]==lookup[key]["expectedResearchClass"] for key in agateRequired)
    harbor=all(lookup[key]["gisClass"]==lookup[key]["expectedResearchClass"] for key in harborRequired)
    return {
      "agateLakewardWaterSideSupported":agate,
      "harborSeparatelyMappedWaterSideSupported":harbor,
      "allTransectExpectationsMet":not differences,
      "unexpectedClassifications":[{"id":p["id"],"expected":p["expectedResearchClass"],
        "actual":p["gisClass"]} for p in differences],
      "shorelineBearingSurveyed":False,
      "hydrodynamicOpenLakeFetchVerified":False,
      "harborBreakwaterShelterQuantified":False,
      "gisSnapshotPermitsSurfForecast":False,
      "gisSnapshotPermitsRockExposureClaims":False
    }

def capture():
    pts=[]
    for ident,site,role,lat,lon,expected in POINTS:
        got=classify(lat,lon)
        pts.append({"id":ident,"siteId":site,"role":role,
         "coordinate":{"lat":lat,"lon":lon},
         "expectedResearchClass":expected,"gisClass":got})
    gates=check_snapshot(pts)
    return {"schemaVersion":"grand-marais-glahf-water-side-v1",
     "retrievedAt":dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z"),
     "source":{"url":GLAHF_LAYER,"dataDescription":SOURCE_DESCRIPTION,
       "derivationVintage":"2013-2014; not a 2026 shoreline survey",
       "datum":"EPSG:4326 coordinates; NHD derived water polygons",
       "method":"Individual ArcGIS REST point in-waterbody polygon intersection count",
       "limitedTo":"Grand Marais approximate study points, not entrance locations"},
     "sites":SITES,"sampledLocations":pts,"gates":gates,
     "status":"RESEARCH_GIS_WATER_SIDE_ONLY",
     "canRecommendVisit":False,"canInferCollectingPermission":False,
     "canMeasureAgateBeachWaves":False,"canInferShelteredHarborWaveHeight":False}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    output=capture()
    dest=pathlib.Path(args.out)
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(output,indent=2)+"\n",encoding="utf8")
    print("ROCKHOUNDING_GIS_EVIDENCE "+json.dumps({
      "sampledPoints":len(output["sampledLocations"]),
      "gates":output["gates"],"file":str(dest)
    },separators=(',',':')),flush=True)
    # A single inconsistent land/water result is a deliberate research gate fail,
    # not a reason to guess or silently override the official classification.
    if not output["gates"]["allTransectExpectationsMet"]:
        raise SystemExit("Unexpected shoreline GIS classes; research geometry must be reviewed")
if __name__=="__main__":main()
