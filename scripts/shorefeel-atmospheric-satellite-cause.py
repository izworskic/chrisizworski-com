#!/usr/bin/env python3
"""Bounded recovery of atmospheric inputs and independent daily thermal context."""
import csv
import datetime as dt
import hashlib
import importlib.util
import json
import math
import pathlib
import re
import tempfile
import urllib.parse
import urllib.request
import urllib.error
spec=importlib.util.spec_from_file_location("acq",pathlib.Path(__file__).with_name("shorefeel-october-acquisition.py"))
a=importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)
DATES=("2026-07-15","2026-08-15")
SITES={"45029":(42.900,-86.272),"45161":(43.185,-86.354),"45013":(43.098,-87.850)}
LEADS=(6,12,18,24,30)
CAP=8*1024*1024
UA="ShoreFeel-offline-archive-review/1.0 (https://chrisizworski.com/)"
def probe(url):
    # A range request is bounded even if a server ignores Range.
    try:
        req=urllib.request.Request(url,headers={"User-Agent":UA,"Range":"bytes=0-4095"})
        with urllib.request.urlopen(req,timeout=20) as r:
            if r.geturl()!=url:raise ValueError("unexpected redirect")
            data=r.read(4096)
            return {"url":url,"status":r.status,"contentRange":r.headers.get("Content-Range"),"contentLength":r.headers.get("Content-Length"),"lastModified":r.headers.get("Last-Modified"),"prefixSha256":a.digest(data),"netcdfSignature":data.startswith((b"CDF",b"\x89HDF\r\n\x1a\n"))}
    except urllib.error.HTTPError as ex:return {"url":url,"status":ex.code}
    except Exception as ex:return {"url":url,"error":str(ex)[:200]}
def get_range(url,start,end):
    if not 0<end-start+1<=CAP:raise ValueError("message exceeds cap")
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Range":f"bytes={start}-{end}"})
    with urllib.request.urlopen(req,timeout=30) as r:
        expected=f"bytes {start}-{end}/"
        if r.geturl()!=url or r.status!=206 or not (r.headers.get("Content-Range") or "").startswith(expected):raise ValueError("server did not return exact requested range")
        data=r.read(end-start+2)
        if len(data)!=end-start+1 or not data.startswith(b"GRIB") or not data.endswith(b"7777"):raise ValueError("incomplete GRIB message")
        return data,{"range":[start,end],"sha256":a.digest(data),"bytes":len(data),"lastModified":r.headers.get("Last-Modified")}
def decode(raw,cycle,lead,component):
    import eccodes as ec
    gid=ec.codes_new_from_message(raw)
    try:
        if ec.codes_get(gid,"shortName") not in (("10u","u10") if component=="u" else ("10v","v10")) or ec.codes_get(gid,"typeOfLevel")!="heightAboveGround" or ec.codes_get(gid,"level")!=10:raise ValueError("wrong wind field")
        if ec.codes_get(gid,"units") not in ("m s**-1","m/s","m s-1"):raise ValueError("unexpected wind units")
        if int(ec.codes_get(gid,"dataDate"))!=int(cycle.strftime("%Y%m%d")) or int(ec.codes_get(gid,"dataTime"))!=0:raise ValueError("wrong run")
        valid=cycle+dt.timedelta(hours=lead)
        if int(ec.codes_get(gid,"validityDate"))!=int(valid.strftime("%Y%m%d")) or int(ec.codes_get(gid,"validityTime"))!=valid.hour*100:raise ValueError("wrong valid time")
        out={}
        for station,(lat,lon) in SITES.items():
            n=ec.codes_grib_find_nearest(gid,lat,lon%360)[0]
            v=float(n["value"]);dist=float(n["distance"])
            if not math.isfinite(v) or abs(v)>100 or dist>25:raise ValueError("invalid nearest wind point")
            out[station]={"valueMps":v,"lat":float(n["lat"]),"lon":(float(n["lon"])+180)%360-180,"distanceKm":dist}
        return out
    finally:ec.codes_release(gid)
def gfs(cycle,lead,tmp):
    url=f"https://noaa-gfs-bdp-pds.s3.amazonaws.com/gfs.{cycle:%Y%m%d}/00/atmos/gfs.t00z.pgrb2.0p25.f{lead:03d}"
    result={"url":url,"leadHours":lead,"validAt":(cycle+dt.timedelta(hours=lead)).isoformat(),"fields":{}}
    try:
        path=tmp/"gfs.idx";result["index"]=a.fetch(url+".idx",path,1024*1024)
        rows=[x.split(":") for x in path.read_text().splitlines() if re.match(r"^\d+:\d+:",x)]
        for comp,var in (("u","UGRD"),("v","VGRD")):
            matches=[i for i,row in enumerate(rows) if len(row)>4 and row[3]==var and row[4]=="10 m above ground"]
            if len(matches)!=1:raise ValueError("missing or ambiguous 10m wind message")
            i=matches[0]
            if i+1==len(rows):raise ValueError("message end not indexed")
            raw,meta=get_range(url,int(rows[i][1]),int(rows[i+1][1])-1)
            result["fields"][comp]={**meta,"points":decode(raw,cycle,lead,comp)}
    except Exception as ex:result["error"]=str(ex)[:200]
    return result
def glsea(cycle,station,lat,lon,tmp):
    # Daily blended satellite analysis, not instantaneous thermal truth.
    result={"station":station,"siteLat":lat,"siteLon":lon}
    start=cycle-dt.timedelta(days=1);end=cycle+dt.timedelta(days=2)
    query=f"sst[({start:%Y-%m-%d}T12:00:00Z):1:({end:%Y-%m-%d}T12:00:00Z)][({lat})][({lon})]"
    url="https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.csv?"+urllib.parse.quote(query,safe=":(),")
    result["url"]=url
    try:
        path=tmp/"sst.csv";result["source"]=a.fetch(url,path,128*1024)
        rows=list(csv.reader(path.read_text().splitlines()))
        if len(rows)<3 or rows[0]!=["time","latitude","longitude","sst"] or rows[1][3] not in ("degree_C","degrees_C","degree_Celsius","degrees Celsius","Celsius"):raise ValueError("unrecognized CSV schema or units")
        points=[]
        for row in rows[2:]:
            t=dt.datetime.fromisoformat(row[0].replace("Z","+00:00"));y,x,v=map(float,row[1:4])
            if abs(y-lat)>.02 or abs(x-lon)>.02 or not start.date()<=t.date()<=end.date():raise ValueError("unexpected grid coordinates or date")
            points.append({"time":t.isoformat(),"lat":y,"lon":x,"tempC":v if math.isfinite(v) and -2<=v<=36 else None})
        result["dailySamples"]=points
    except Exception as ex:result["error"]=str(ex)[:200]
    return result
def main():
    cycles=[]
    for date in DATES:
        cycle=dt.datetime.fromisoformat(date).replace(tzinfo=a.UTC);day=cycle.strftime("%Y%m%d")
        r={"cycleAt":cycle.isoformat(),"exactForcingProbes":[],"gfsProxy":[],"dailySatelliteContext":[]}
        cycles.append(r)
        for kind in ("met.forecast","met.nowcast","hflux.forecast"):
            for root,name in [(f"https://noaa-ofs-pds.s3.amazonaws.com/lmhofs.{day}/",f"lmhofs.t00z.{day}.{kind}.nc"),(f"https://noaa-ofs-pds.s3.amazonaws.com/lmhofs.{day}/",f"nos.lmhofs.{kind}.{day}.t00z.nc"),(f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/nosofs/prod/lmhofs.{day}/",f"lmhofs.t00z.{day}.{kind}.nc")]:
                r["exactForcingProbes"].append(probe(root+name))
        with tempfile.TemporaryDirectory() as folder:
            tmp=pathlib.Path(folder)
            for h in LEADS:r["gfsProxy"].append(gfs(cycle,h,tmp))
            for s,(lat,lon) in SITES.items():r["dailySatelliteContext"].append(glsea(cycle,s,lat,lon,tmp))
    print(json.dumps({"status":"ATMOSPHERIC_AND_SATELLITE_ARCHIVE_DIAGNOSTIC_ONLY","cycles":cycles,"canPromoteModel":False,"limitations":["Exact forcing probes only establish endpoint response and file signature; no complete forcing fields downloaded.","Same-day GFS 00Z 0.25-degree wind is an archived atmospheric forecast proxy, not authenticated LMHOFS input run or interpolation. Six-hour spacing is descriptive, not hourly forcing.","GLSEA is a daily blended, gap-filled satellite-derived analysis that can use other dates; not independent instantaneous buoy-depth truth or proof of an upwelling event.","No fallback to another date or invented observations; missingness retained. No production change."]},indent=2,allow_nan=False))
if __name__=="__main__":main()
