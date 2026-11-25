#!/usr/bin/env python3
"""One-off actual-file acquisition for frozen October 20 cycle; no production dependency."""
import datetime as dt
import hashlib
import json
import math
import pathlib
import tempfile
import urllib.request
import statistics
import netCDF4
import numpy as np

UTC=dt.timezone.utc
CYCLE=dt.datetime(2026,10,20,tzinfo=UTC)
LEADS=(0,24,48)
STATIONS=("45029","45161","45183","45002")
MAX_FILE=160*1024*1024
BASE="https://noaa-nos-ofs-pds.s3.amazonaws.com/lmhofs/netcdf/2026/10/20/"
COHORT=[{"station":s,"cycleAt":CYCLE.isoformat(),"leadHours":h} for s in STATIONS for h in (24,48)]

def digest(b): return hashlib.sha256(b).hexdigest()
def fetch(url,path,cap):
    request=urllib.request.Request(url,headers={"User-Agent":"ShoreFeel-offline-archive-review/1.0 (https://chrisizworski.com/)"})
    sha=hashlib.sha256()
    with urllib.request.urlopen(request,timeout=35) as r:
        if r.geturl()!=url: raise ValueError("unexpected redirect")
        size=int(r.headers.get("Content-Length","0"))
        if size>cap: raise ValueError(f"file exceeds cap: {size}")
        meta={"url":url,"lastModified":r.headers.get("Last-Modified"),"etag":r.headers.get("ETag"),"advertisedBytes":size}
        count=0
        with path.open("wb") as f:
            while True:
                chunk=r.read(1024*1024)
                if not chunk: break
                count+=len(chunk)
                if count>cap: raise ValueError("body exceeds cap")
                sha.update(chunk);f.write(chunk)
        if size and count!=size: raise ValueError("incomplete body")
    return {**meta,"bytes":count,"sha256":sha.hexdigest()}

def var(ds,*names):
    lookup={k.lower():k for k in ds.variables}
    for n in names:
        if n.lower() in lookup:return ds.variables[lookup[n.lower()]]
    raise ValueError("missing variable: "+str(names))

def load_grid(path,lead):
    with netCDF4.Dataset(path) as ds:
        t=var(ds,"temp")
        time=var(ds,"time")
        depths=var(ds,"depth")
        lat=var(ds,"latitude","lat")
        lon=var(ds,"longitude","lon")
        if t.shape!=(1,25,478,837): raise ValueError("unexpected regular-grid temp shape "+str(t.shape))
        if str(t.units).lower().replace(" ","_") not in ("celsius","degree_celsius","degrees_celsius","degree_c","degrees_c","degc","c","degree_celcius"): raise ValueError("unexpected temperature units "+str(t.units))
        valid=netCDF4.num2date(time[0],time.units,getattr(time,"calendar","standard"),only_use_cftime_datetimes=False,only_use_python_datetimes=True)
        valid=valid.replace(tzinfo=UTC)
        if valid!=CYCLE+dt.timedelta(hours=lead): raise ValueError("wrong valid time "+str(valid))
        dep=np.asarray(depths[:],dtype=float)
        if dep.shape!=(25,) or abs(dep[0])>0.001: raise ValueError("unverified surface depth "+str(dep[:3]))
        la=np.ma.filled(np.ma.asarray(lat[:],dtype=float),np.nan).squeeze()
        lo=np.ma.filled(np.ma.asarray(lon[:],dtype=float),np.nan).squeeze()
        if la.ndim==1 and lo.ndim==1: lo,la=np.meshgrid(lo,la)
        if la.shape!=(478,837) or lo.shape!=la.shape: raise ValueError("coordinate shape mismatch")
        lo=np.where(lo>180,lo-360,lo)
        values=np.ma.filled(np.ma.asarray(t[0,0,:,:],dtype=float),np.nan)
        values[(values< -2)|(values>36)]=np.nan
        geometry=digest(np.ascontiguousarray(np.stack([la,lo]),dtype="<f8").tobytes())
        return la,lo,values,{"validAt":valid.isoformat(),"tempUnits":str(t.units),"surfaceDepth":float(dep[0]),"geometrySha256":geometry,"shape":list(t.shape),"modelTitle":str(getattr(ds,"title",""))}

def nearest(la,lo,lat,lon):
    dlat=np.radians(la-lat);dlon=np.radians(lo-lon)
    a=np.sin(dlat/2)**2+np.cos(np.radians(lat))*np.cos(np.radians(la))*np.sin(dlon/2)**2
    d=6371*2*np.arcsin(np.sqrt(np.clip(a,0,1)))
    j,i=np.unravel_index(np.nanargmin(d),d.shape)
    return int(j),int(i),float(d[j,i])

def parse_obs(path):
    lines=path.read_text().splitlines()
    header=next((line.lstrip("#").split() for line in lines if line.lstrip("#").split()[:3]==["YY","MM","DD"]),None)
    if not header or "WTMP" not in header: raise ValueError("NDBC header missing")
    k=header.index("WTMP");out={};conflicts=set()
    for line in lines:
        row=line.split()
        try:
            when=dt.datetime(*map(int,row[:5]),tzinfo=UTC)
            v=float(row[k])
            if not -2<=v<=36: continue
        except (ValueError,IndexError):continue
        if when in out and out[when]!=v: conflicts.add(when)
        out[when]=v
    for when in conflicts:out.pop(when,None)
    return out

def main():
    result={"status":"CYCLE_RELATIVE_DIAGNOSTIC_ONLY","cohort":COHORT,"cohortSha256":digest(json.dumps(COHORT,sort_keys=True,separators=(",",":")).encode()),"models":{},"observations":{},"pairs":[],"canPromoteModel":False,"limitations":["One fixed 00Z cycle; no statistical inference or nearshore skill.","Station locations from repository catalog; historical deployment coordinates and sensor depth not independently authenticated.","Archive Last-Modified does not establish original forecast or observation publication availability. Cycle-relative diagnostic is not a prospective holdout."]}
    catalog={s["id"]:s for s in json.loads(pathlib.Path("data/buoy-stations.json").read_text())}
    with tempfile.TemporaryDirectory() as tmp:
        tmp=pathlib.Path(tmp);grids={};obs={}
        for h in LEADS:
            name=f"lmhofs.t00z.20261020.regulargrid.f{h:03}.nc";path=tmp/name
            try:
                meta=fetch(BASE+name,path,MAX_FILE)
                result["models"][h]=meta
                grids[h]=load_grid(path,h)
                result["models"][h].update(grids[h][3])
            except Exception as e:result["models"].setdefault(h,{}).update(error=str(e)[:300])
            finally:path.unlink(missing_ok=True)
        for s in STATIONS:
            path=tmp/(s+".txt")
            try:
                result["observations"][s]=fetch("https://www.ndbc.noaa.gov/data/l_stdmet/"+s+".txt",path,1024*1024)
                obs[s]=parse_obs(path)
                result["observations"][s]["validWaterRows"]=len(obs[s])
                result["observations"][s]["samplesC"]={str(h):obs[s].get(CYCLE+dt.timedelta(hours=h)) for h in LEADS}
            except Exception as e:result["observations"].setdefault(s,{}).update(error=str(e)[:300])
        for entry in COHORT:
            s,h=entry["station"],entry["leadHours"];p={**entry}
            result["pairs"].append(p)
            if 0 not in grids or h not in grids:p["reason"]="missing model";continue
            la,lo,z,meta=grids[0];_,_,zh,mh=grids[h]
            if meta["geometrySha256"]!=mh["geometrySha256"]:p["reason"]="grid changed";continue
            site=catalog[s];j,i,d=nearest(la,lo,site["lat"],site["lng"])
            p.update(j=j,i=i,distanceKm=round(d,4),cellLat=float(la[j,i]),cellLon=float(lo[j,i]),stationLat=site["lat"],stationLon=site["lng"])
            if d>2.5 or not math.isfinite(z[j,i]) or not math.isfinite(zh[j,i]):p["reason"]="unverified wet grid cell";continue
            baseline=obs.get(s,{}).get(CYCLE);actual=obs.get(s,{}).get(CYCLE+dt.timedelta(hours=h))
            p.update(modelBaseC=float(z[j,i]),modelValidC=float(zh[j,i]),baselineC=baseline,actualC=actual)
            if baseline is None or actual is None:p["reason"]="missing exact-hour independent observation";continue
            f=lambda c:c*1.8+32
            predicted=f(baseline)+(zh[j,i]-z[j,i])*1.8
            p.update(persistenceF=f(baseline),actualF=f(actual),predictedF=float(predicted),persistenceErrorF=f(baseline)-f(actual),modelChangeErrorF=float(predicted-f(actual)))
        result["metrics"]={}
        for h in (24,48):
            rows=[p for p in result["pairs"] if p["leadHours"]==h and "modelChangeErrorF" in p]
            result["metrics"][h]={"n":len(rows),"expected":4,"persistenceMAE_F":statistics.mean(abs(p["persistenceErrorF"]) for p in rows) if rows else None,"modelChangeMAE_F":statistics.mean(abs(p["modelChangeErrorF"]) for p in rows) if rows else None,"biasF":statistics.mean(p["modelChangeErrorF"] for p in rows) if rows else None}
    print(json.dumps(result,indent=2,allow_nan=False))

if __name__=="__main__": main()
