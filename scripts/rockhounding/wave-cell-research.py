#!/usr/bin/env python3
"""Research-only, fixed-cell directional wave extraction from NOAA Great Lakes GRIB2.

Select the OPEN-NORTH research sector of Agate Beach, NOT the nearest arbitrary
water cell. North-sector membership is NOT proof of open-water connectivity,
wave refraction, legal access, or a safe shoreline.
"""
import datetime as dt
import importlib.util
import math
import pathlib
from collections import defaultdict

HERE=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location("rockhounding_glwu_cell",HERE/"glwu-extract.py")
glwu=importlib.util.module_from_spec(spec)
spec.loader.exec_module(glwu)
PARAMS={3:"HTSGW",4:"WVDIR",5:"WVHGT",6:"WVPER"}
AGATE={"id":"grand-marais-agate","lat":46.6760,"lon":-85.9853}
HARBOR={"id":"grand-marais-harbor","lat":46.6719,"lon":-85.9839}
CANDIDATE_MAX_DISTANCE_KM=4.0
MIN_NORTH_DELTA_DEG=0.0025

def longitude180(value):
    lon=float(value)
    return lon-360 if lon>180 else lon

def good_value(field,value):
    try:v=float(value)
    except (TypeError,ValueError):return False
    if not math.isfinite(v):return False
    if field=="WVDIR":return 0<=v<360
    if field=="WVPER":return 0<v<=30
    return 0<=v<=18

def in_open_north_study_sector(lat,lon,site=AGATE):
    """Qualitative northern-lake sector only: NOT a verified land-water path."""
    lat,lon=float(lat),longitude180(lon)
    return (lat>=site["lat"]+MIN_NORTH_DELTA_DEG
        and glwu.km(site["lat"],site["lon"],lat,lon)<=CANDIDATE_MAX_DISTANCE_KM)

def candidates_from_height_field(latitudes,longitudes,heights,site=AGATE,limit=12):
    candidates=[]
    for lat,lon,height in zip(latitudes,longitudes,heights):
        lat,lon= float(lat),longitude180(lon)
        if not good_value("HTSGW",height):continue
        if not in_open_north_study_sector(lat,lon,site):continue
        distance=glwu.km(site["lat"],site["lon"],lat,lon)
        candidates.append({"lat":round(lat,6),"lon":round(lon,6),
            "distanceKm":round(distance,3),"htsgwFirstM":round(float(height),3)})
    candidates.sort(key=lambda c:(c["distanceKm"],-c["lat"],c["lon"]))
    return candidates[:limit]

def _grib_field_by_time(path,candidates):
    from eccodes import codes_get,codes_get_array,codes_grib_new_from_file,codes_grib_find_nearest,codes_release
    seen=defaultdict(dict)
    cycle_set=set()
    field_counts=defaultdict(int)
    candidate_count=len(candidates)
    with open(path,"rb") as fp:
        while True:
            gid=codes_grib_new_from_file(fp)
            if gid is None:break
            try:
                if int(codes_get(gid,"edition"))!=2 or int(codes_get(gid,"discipline"))!=10 or int(codes_get(gid,"parameterCategory"))!=0:continue
                field=PARAMS.get(int(codes_get(gid,"parameterNumber")))
                if field is None:continue
                field_counts[field]+=1
                when=glwu.timestamp(codes_get(gid,"validityDate"),codes_get(gid,"validityTime"))
                cycle=glwu.timestamp(codes_get(gid,"dataDate"),codes_get(gid,"dataTime"))
                cycle_set.add(cycle)
                for i,c in enumerate(candidates):
                    nearby=codes_grib_find_nearest(gid,c["lat"],c["lon"],npoints=1)
                    if not nearby:continue
                    v=nearby[0]
                    point_lat=float(v["lat"]);point_lon=longitude180(v["lon"])
                    if glwu.km(c["lat"],c["lon"],point_lat,point_lon)>.11:continue
                    value=float(v["value"])
                    if not good_value(field,value):continue
                    key=(i,when)
                    # Only same-cycle + fixed physical GRIB grid cell joins qualify.
                    if field in seen[key]:continue
                    seen[key][field]=value
                    seen[key]["cycle"]=cycle
            finally:codes_release(gid)
    return seen,sorted(cycle_set),dict(field_counts)

def analyze_fixed_open_cell(path,grid):
    """Runs on an already downloaded NOAA GRIB subset; no new HTTP requests."""
    from eccodes import codes_get,codes_get_array,codes_grib_new_from_file,codes_release
    first=None
    with open(path,"rb") as fp:
        while True:
            gid=codes_grib_new_from_file(fp)
            if gid is None:break
            try:
                if (int(codes_get(gid,"edition"))==2
                    and int(codes_get(gid,"discipline"))==10
                    and int(codes_get(gid,"parameterCategory"))==0
                    and int(codes_get(gid,"parameterNumber"))==3):
                    first=candidates_from_height_field(
                        codes_get_array(gid,"latitudes"),codes_get_array(gid,"longitudes"),
                        codes_get_array(gid,"values"))
                    break
            finally:codes_release(gid)
    result={"grid":grid,"selectionMethod":"FIXED_CELL_OPEN_NORTH_STUDY_SECTOR",
        "shorelineSideCertainty":"NORTH_HALF_PLANE_PROXY_NOT_VERIFIED_WATER_CONNECTIVITY",
        "openLakeAgateResearchOnly":True,"harborStatus":"SHELTERED_BREAKWATER_RESPONSE_UNRESOLVED",
        "canPublishSiteWaveVerdict":False,"canPublishRockExposure":False,
        "candidateCount":len(first or []),"candidatesConsidered":[],
        "selected":None,"modelAnalysisRows":0,"sourceModelForecastRows":0}
    if not first:return {**result,"status":"NO_NORTH_SECTOR_WET_HEIGHT_CELLS"}
    observations,cycles,field_counts=_grib_field_by_time(path,first)
    result["cyclesUTC"]=cycles
    result["fieldMessages"]=field_counts
    ranking=[]
    for i,c in enumerate(first):
        full=[]
        for (index,when),values in observations.items():
            if index!=i or any(f not in values for f in PARAMS.values()):continue
            if values["WVHGT"]>values["HTSGW"]+.75:continue
            full.append((when,values))
        full.sort()
        coverage={"cell":c,"completeFourFieldTimestamps":len(full),
            "firstValid":full[0][0] if full else None,
            "lastValid":full[-1][0] if full else None}
        result["candidatesConsidered"].append(coverage)
        if full:ranking.append((i,c,full))
    if not ranking:return {**result,"status":"NO_COMPLETE_FOUR_FIELD_FIXED_CELL"}
    # First prefer sufficient temporal coverage, then proximity.
    ranking.sort(key=lambda x:(-len(x[2]),x[1]["distanceKm"],-x[1]["lat"]))
    index,cell,full=ranking[0]
    sample=[]
    for when,values in full:
        cycle=values["cycle"]
        phase="MODEL_ANALYSIS" if when==cycle else "MODEL_FORECAST"
        row={"validAt":when,"cycleAt":cycle,"phase":phase,
             "htsgwM":round(values["HTSGW"],3),
             "windWaveHeightM":round(values["WVHGT"],3),
             "windWavePeriodS":round(values["WVPER"],3),
             "waveFromDeg":round(values["WVDIR"],3)}
        sample.append(row)
    result["selected"]=cell
    result["modelAnalysisRows"]=sum(r["phase"]=="MODEL_ANALYSIS" for r in sample)
    result["sourceModelForecastRows"]=sum(r["phase"]=="MODEL_FORECAST" for r in sample)
    result["validTimeCoverage"]=len(sample)
    result["firstValidAt"]=sample[0]["validAt"]
    result["lastValidAt"]=sample[-1]["validAt"]
    result["sampledSeries"]=sample[:60]
    result["status"]="FIXED_NORTH_SECTOR_FOUR_FIELDS_AVAILABLE" if len(sample)>=3 else "SPARSE_FOUR_FIELD_SERIES"
    return result
