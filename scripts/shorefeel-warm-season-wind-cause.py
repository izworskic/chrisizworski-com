#!/usr/bin/env python3
"""Retrospective measured wind history and archived forcing inventory, not attribution."""
import datetime as dt
import gzip
import importlib.util
import json
import math
import pathlib
import tempfile
import statistics
import urllib.parse
import xml.etree.ElementTree as ET

spec=importlib.util.spec_from_file_location("expanded",pathlib.Path(__file__).with_name("shorefeel-expanded-dataset.py"))
e=importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)
a=e.a
SOURCE=pathlib.Path("data/shorefeel/warm-season-spatial-cause-actual-20261124.json")
BASE=pathlib.Path("data/shorefeel/warm-season-actual-20261124.json")
# Only these three clearly east/west shore sites have a sign assigned.
# Positive stress proxy is offshore Ekman transport (NH); not a current speed.
SHORE={"45029":-1,"45161":-1,"45013":1}
def parse_wind(raw):
    lines=raw.decode().splitlines()
    header=next((x.lstrip("#").split() for x in lines if x.lstrip("#").split()[:3]==["YY","MM","DD"]),None)
    if not header or not all(x in header for x in ("WDIR","WSPD","WTMP")):raise ValueError("missing NDBC wind/temperature columns")
    out={};conflict=set()
    for line in lines:
        row=line.split()
        try:
            t=dt.datetime(*map(int,row[:5]),tzinfo=a.UTC)
        except (ValueError,IndexError):continue
        def get(key,lo,hi):
            try:
                v=float(row[header.index(key)])
                return v if math.isfinite(v) and lo<=v<=hi else None
            except (IndexError,ValueError):return None
        d=get("WDIR",0,360);s=get("WSPD",0,60);w=get("WTMP",-2,36)
        record=(d,s,w)
        if t in out and out[t]!=record:conflict.add(t)
        out[t]=record
    for t in conflict:out.pop(t,None)
    return out

def hourly(records,start,end,shore):
    out=[]
    for hour in range(int((end-start).total_seconds()/3600)):
        t=start+dt.timedelta(hours=hour)
        rows=[(k,v) for k,v in records.items() if t<=k<t+dt.timedelta(hours=1)]
        winds=[(d,s) for _,(d,s,w) in rows if d is not None and s is not None]
        water=[w for _,(d,s,w) in rows if w is not None]
        mean=lambda x:statistics.mean(x) if x else None
        # Meteorological wind from direction -> velocity towards east/north.
        # Stress proxy speed times northward velocity; NH Ekman transport right of wind.
        u=[-s*math.sin(math.radians(d)) for d,s in winds]
        v=[-s*math.cos(math.radians(d)) for d,s in winds]
        stress=[s*n for (_,s),n in zip(winds,v)]
        out.append({"hourAt":t.isoformat(),"windSamples":len(winds),"waterSamples":len(water),"meanWindSpeedMps":mean([s for _,s in winds]),"meanEastwardWindMps":mean(u),"meanNorthwardWindMps":mean(v),"offshoreStressProxyM2S2":mean([shore*x for x in stress]) if shore is not None else None,"meanWaterC":mean(water)})
    return out

def summarize(hours):
    w=[h for h in hours if h["windSamples"]]
    water=[h["meanWaterC"] for h in hours if h["meanWaterC"] is not None]
    proxy=[h["offshoreStressProxyM2S2"] for h in w if h["offshoreStressProxyM2S2"] is not None]
    mean=lambda x:statistics.mean(x) if x else None
    return {"expectedHours":len(hours),"windHours":len(w),"meanWindSpeedMps":mean([h["meanWindSpeedMps"] for h in w]),"meanNorthwardWindMps":mean([h["meanNorthwardWindMps"] for h in w]),"meanOffshoreStressProxyM2S2":mean(proxy),"offshoreFavorableHours":sum(x>0 for x in proxy) if proxy else None,"waterHours":len(water),"waterMinC":min(water) if water else None,"waterMaxC":max(water) if water else None}

def main():
    src=json.loads(SOURCE.read_text());base=json.loads(BASE.read_text())
    assert src["status"]=="WARM_SEASON_SPATIAL_AND_LATER_CYCLE_DIAGNOSTIC_ONLY"
    cycles=[]
    for c in src["cycles"]:
        cycle=dt.datetime.fromisoformat(c["cycleAt"]);issue=cycle+dt.timedelta(hours=6)
        month=cycle.month;folder={7:"Jul",8:"Aug"}[month]
        result={"cycleAt":cycle.isoformat(),"stationHistories":[],"forcingInventory":{}}
        cycles.append(result)
        with tempfile.TemporaryDirectory() as tmp:
            tmp=pathlib.Path(tmp)
            for p in c["pairs"]:
                s=p["station"];path=tmp/(s+".gz")
                row={"station":s,"originalModelChangeF":p.get("centralForecastChangeF"),"observedChangeF":p.get("observedChangeF"),"offshoreSign":SHORE.get(s)}
                result["stationHistories"].append(row)
                try:
                    url=f"https://www.ndbc.noaa.gov/data/stdmet/{folder}/{s}{month}2026.txt.gz"
                    meta=a.fetch(url,path,e.CAP)
                    row["source"]=meta
                    if meta["sha256"]!=base["observationFiles"][s][str(month)]["sha256"]:raise ValueError("monthly source changed")
                    with gzip.open(path,"rb") as f:raw=f.read(e.CAP+1)
                    if len(raw)>e.CAP:raise ValueError("decompressed source exceeds cap")
                    rec=parse_wind(raw)
                    h=hourly(rec,issue-dt.timedelta(hours=24),issue+dt.timedelta(hours=24),SHORE.get(s))
                    row["hours"]=h;row["beforeDecision"]=summarize(h[:24]);row["afterDecision"]=summarize(h[24:])
                except Exception as ex:row["error"]=str(ex)[:300]
                finally:path.unlink(missing_ok=True)
            # Bounded public S3 listing; inventory observed forcing filenames only.
            # No inference from a missing match in a truncated response.
            prefix=f"lmhofs/netcdf/{cycle:%Y/%m/%d}/"
            query=urllib.parse.urlencode({"list-type":"2","prefix":prefix,"max-keys":"1000"})
            path=tmp/"catalog.xml"
            try:
                m=a.fetch("https://noaa-nos-ofs-pds.s3.amazonaws.com/?"+query,path,1024*1024)
                root=ET.fromstring(path.read_bytes())
                keys=[x.text for x in root.findall(".//{*}Key") if x.text]
                result["forcingInventory"]={**m,"listedKeys":len(keys),"truncated":root.findtext("{*}IsTruncated")=="true","candidateKeys":[k for k in keys if any(x in k.lower() for x in ("forcing","wind","met","atm"))][:50]}
            except Exception as ex:result["forcingInventory"]={"error":str(ex)[:300]}
    print(json.dumps({"status":"MIDSUMMER_OBSERVED_WIND_CAUSE_DIAGNOSTIC_ONLY","sourceSha256":a.digest(SOURCE.read_bytes()),"cycles":cycles,"canPromoteModel":False,"limitations":["Observed winds only, not exact model atmospheric forcing. Hourly bins are means of available records, equal-weighted hours, not time-integrated transport.","Simplified north-south shoreline assumption for Holland, Muskegon and Atwater only; positive proxy denotes favorable wind orientation, not proof of upwelling.","Prior and following 24-hour observations are retrospective diagnostics, not features available at original decision. No causal attribution or parameter fitting.","Catalog may be truncated; no listed forcing candidate does not establish nonexistence. No new model downloads or production change."]},indent=2,allow_nan=False))
if __name__=="__main__":main()
