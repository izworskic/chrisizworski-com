#!/usr/bin/env python3
"""Bounded public Seagull archive acquisition; never assume channel number is depth."""
import csv
import datetime as dt
import hashlib
import io
import json
import math
import pathlib
import re
import urllib.parse
import urllib.request
import urllib.error
BASE="https://seagull-erddap.glos.org/erddap/"
DATASET="45013_archive"
CAP=4*1024*1024
WINDOWS=(("2026-07-14T06:00:00Z","2026-07-17T06:00:00Z"),("2026-08-14T06:00:00Z","2026-08-17T06:00:00Z"))
def fetch(url,cap=CAP):
    req=urllib.request.Request(url,headers={"User-Agent":"ShoreFeel-public-archive-research/1.0 (https://chrisizworski.com/)"})
    with urllib.request.urlopen(req,timeout=40) as r:
        if r.geturl()!=url:raise ValueError("unexpected redirect")
        b=r.read(cap+1)
        if len(b)>cap:raise ValueError("response exceeds cap")
        return b,{"url":url,"sha256":hashlib.sha256(b).hexdigest(),"bytes":len(b),"lastModified":r.headers.get("Last-Modified")}
def metadata():
    raw,m=fetch(BASE+"info/"+DATASET+"/index.json")
    rows=json.loads(raw)["table"]["rows"]
    variables={x[1]:{} for x in rows if x[0]=="variable"}
    for row in rows:
        if row[0]=="attribute" and row[1] in variables: variables[row[1]][row[2]]=row[4]
    return variables,m
def number(v,lo,hi):
    try:
        x=float(v)
        return x if math.isfinite(x) and lo<=x<=hi else None
    except (ValueError,TypeError):return None
def query(cols,start,end):
    q=",".join(cols)+"&time>="+start+"&time<="+end
    return BASE+"tabledap/"+DATASET+".csv?"+urllib.parse.quote(q,safe=",:")
def collect(cols,start,end,variables):
    url=query(cols,start,end)
    result={"url":url,"columns":cols}
    try:
        raw,m=fetch(url);result["source"]=m
        reader=csv.reader(io.StringIO(raw.decode("utf-8-sig")));header=next(reader);units=next(reader)
        if header!=cols or len(units)!=len(cols):raise ValueError("unexpected CSV columns")
        result["units"]=dict(zip(cols,units))
        rows={};conflicts=set()
        for vals in reader:
            if len(vals)!=len(cols):raise ValueError("unexpected CSV row width")
            row=dict(zip(cols,vals));t=dt.datetime.fromisoformat(row["time"].replace("Z","+00:00"))
            if not dt.datetime.fromisoformat(start.replace("Z","+00:00"))<=t<=dt.datetime.fromisoformat(end.replace("Z","+00:00")):raise ValueError("outside fixed window")
            lat=number(row["latitude"],43.07,43.13);lon=number(row["longitude"],-87.88,-87.82)
            if lat is None or lon is None:raise ValueError("unexpected station position")
            parsed={"time":t.isoformat(),"latitude":lat,"longitude":lon}
            for col in cols[3:]:
                if col.endswith("_aggregate_test"):parsed[col]=number(row[col],1,9)
                elif "temperature" in col and not "depth" in col:
                    if units[cols.index(col)]!="K":raise ValueError("temperature units not Kelvin")
                    v=number(row[col],271.15,309.15);parsed[col]=v-273.15 if v is not None else None
                elif "depth" in col:
                    if units[cols.index(col)]!="m":raise ValueError("depth units not meters")
                    parsed[col]=number(row[col],0,30)
                elif "velocity" in col:
                    if units[cols.index(col)] not in ("m/s","m s-1","m s^-1"):raise ValueError("unexpected velocity units")
                    parsed[col]=number(row[col],-5,5)
            k=parsed["time"]
            if k in rows and rows[k]!=parsed:conflicts.add(k)
            rows[k]=parsed
        for k in conflicts:rows.pop(k,None)
        result["rows"]=[rows[k] for k in sorted(rows)]
        result["conflictingTimes"]=len(conflicts)
        result["coverage"]={c:{"physicalValues":sum(r.get(c) is not None for r in rows.values()),"qualityPassValues":sum(r.get(c) is not None and r.get(c+"_aggregate_test")==1 for r in rows.values())} for c in cols[3:] if not c.endswith("_aggregate_test")}
    except urllib.error.HTTPError as ex:result["httpStatus"]=ex.code;result["error"]=str(ex)[:200]
    except Exception as ex:result["error"]=str(ex)[:200]
    return result
def main():
    out={"status":"SEAGULL_PUBLIC_ARCHIVE_DIAGNOSTIC_ONLY","dataset":DATASET,"windows":[],"canPromoteModel":False,"limitations":["Channel suffix is not sensor depth. Only explicitly supplied depth metadata can establish depth.","Physical values and flag-1 quality-passing counts are separate; unflagged or suspect data cannot establish validated depth observations.","Historical revisions and original receipt times not authenticated. Fixed investigated dates are not independent holdout.","No physical instrumentation, private records or production dependencies."]}
    try:
        variables,m=metadata();out["metadataSource"]=m
        t=[c for c in variables if re.fullmatch(r"sea_(?:water|surface)_temperature(?:_\d+)?",c)]
        v=[c for c in variables if re.fullmatch(r"(?:eastward|northward)_sea_water_velocity(?:_\d+)?",c)]
        # Keep all available temperature channels and at most first 8 matched current pairs.
        suffixes=sorted(set(c.removeprefix("eastward_sea_water_velocity") for c in v if c.startswith("eastward")) & set(c.removeprefix("northward_sea_water_velocity") for c in v if c.startswith("northward")),key=lambda x:int(x[1:]) if x else -1)[:8]
        v=[prefix+s for s in suffixes for prefix in ("eastward_sea_water_velocity","northward_sea_water_velocity")]
        groups=[]
        for channels in (sorted(t)[:32],v):
            if not channels:continue
            cols=["time","latitude","longitude"]
            for c in channels:
                cols.append(c)
                if c+"_aggregate_test" in variables:cols.append(c+"_aggregate_test")
                for field in str(variables[c].get("ancillary_variables","")).split():
                    if "depth" in field and field in variables and field not in cols:cols.append(field)
            groups.append(cols)
        out["selectedMetadata"]={c:{k:val for k,val in variables[c].items() if k in ("units","long_name","standard_name","ancillary_variables","coordinates","positive","flag_values","flag_meanings","comment")} for cols in groups for c in cols if c in variables}
        for start,end in WINDOWS:
            out["windows"].append({"startAt":start,"endAt":end,"queries":[collect(cols,start,end,variables) for cols in groups]})
    except Exception as ex:out["metadataError"]=str(ex)[:200]
    print(json.dumps(out,separators=(",",":"),allow_nan=False))
if __name__=="__main__":main()
