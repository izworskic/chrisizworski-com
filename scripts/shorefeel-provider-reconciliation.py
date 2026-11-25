#!/usr/bin/env python3
"""Bounded offline research: compare same-platform provider and mirror sample times.
No substitution into the frozen NDBC cohort, no independence or promotion claim.
"""
import csv, datetime as dt, hashlib, io, json, math, pathlib, urllib.parse, urllib.request
from collections import Counter

ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=ROOT/"data/shorefeel/horizon-confirm-cohort-actual-20261125.json"
RECOVERY=ROOT/"data/shorefeel/horizon-confirm-near-time-actual-20261125.json"
START="2026-07-06T03:45:00Z"
END="2026-09-01T06:15:00Z"
CAP=2*1024*1024
SOURCES={
 "cdip269":("45210","https://erddap.cdip.ucsd.edu/erddap/tabledap/sst_agg.csv","station_id,time,latitude,longitude,sstSeaSurfaceTemperature,sstFlagPrimary,sstFlagSecondary",'station_id="269"',"C"),
 "glos45210":("45210","https://seagull-erddap.glos.org/erddap/tabledap/45210_archive.csv","time,latitude,longitude,sea_surface_temperature,sea_surface_temperature_aggregate_test",None,"K"),
 "glos45214":("45214","https://seagull-erddap.glos.org/erddap/tabledap/SPOT-31964C_archive.csv","time,latitude,longitude,sea_surface_temperature,sea_surface_temperature_aggregate_test",None,"K"),
}
def digest(b):return hashlib.sha256(b).hexdigest()
def timestamp(s):
    t=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
    if t.tzinfo is None:raise ValueError("missing UTC offset")
    return t.astimezone(dt.timezone.utc)
def url_for(spec):
    _,base,fields,condition,_=spec
    terms=[fields]+([condition] if condition else [])+["time>="+START,"time<="+END]
    return base+"?"+urllib.parse.quote("&".join(terms),safe=",=&:T-Z")
def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"ShoreFeel historical research/1.0","Accept":"text/csv"})
    with urllib.request.urlopen(req,timeout=45) as res:
        if not res.geturl().startswith("https://"):raise ValueError("non-HTTPS response")
        b=res.read(CAP+1)
        if len(b)>CAP:raise ValueError("response exceeds cap")
        return b,{"url":url,"responseUrl":res.geturl(),"bytes":len(b),"sha256":digest(b),"lastModified":res.headers.get("Last-Modified"),"etag":res.headers.get("ETag")}
def parse(raw,spec,lat,lon):
    station,_,fields,_,unit=spec
    reader=csv.reader(io.StringIO(raw.decode("utf-8-sig")))
    header=next(reader);units=next(reader)
    if header!=fields.split(",") or len(units)!=len(header):raise ValueError("unexpected CSV schema")
    u=dict(zip(header,units))
    temp="sstSeaSurfaceTemperature" if unit=="C" else "sea_surface_temperature"
    flag="sstFlagPrimary" if unit=="C" else "sea_surface_temperature_aggregate_test"
    if u[temp] not in (("Celsius","degree_C","degrees_C","degC","C") if unit=="C" else ("K","kelvin")):raise ValueError("unexpected temperature unit "+u[temp])
    if u["time"]!="UTC":raise ValueError("unexpected time unit")
    observed={};conflict=set();counts=Counter();minutes=Counter()
    for cells in reader:
        counts["rows"]+=1
        if len(cells)!=len(header):counts["invalid"]+=1;continue
        row=dict(zip(header,cells))
        try:
            t=timestamp(row["time"]);v=float(row[temp]);la=float(row["latitude"]);lo=float(row["longitude"])
            if not timestamp(START)<=t<=timestamp(END) or not all(map(math.isfinite,[v,la,lo])) or not -90<=la<=90 or not -180<=lo<=180:raise ValueError()
            if unit=="C" and row["station_id"]!="269":raise ValueError()
            distance=111.2*math.hypot(la-lat,(lo-lon)*math.cos(math.radians(lat)))
            if distance>2.5:raise ValueError()
            c=v if unit=="C" else v-273.15
            if not -2<=c<=40:raise ValueError()
            q=int(row[flag]);secondary=int(row["sstFlagSecondary"]) if unit=="C" else None
            counts["physical"]+=1;counts["flag_"+str(q)]+=1
            if q!=1:continue
            if secondary not in (None,0):counts["secondary_nonzero"]+=1;continue
            sample={"time":t.isoformat(),"tempC":c,"latitude":la,"longitude":lo,"primaryFlag":q,"secondaryFlag":secondary}
            if t in observed and observed[t]!=sample:conflict.add(t)
            else:observed[t]=sample
        except (ValueError,KeyError,OverflowError):counts["invalid"]+=1
    for t in conflict:observed.pop(t,None)
    counts["conflictingTimestamps"]=len(conflict)
    for t in observed:minutes[f"{t.minute:02d}:{t.second:02d}"]+=1
    return observed,dict(counts),dict(minutes)
def reconcile(spec,rows,recovered):
    station=spec[0];selected=[p for p in rows if p["station"]==station]
    assert len(selected)==20 and all(p.get("reason") for p in selected)
    url=url_for(spec)
    try:
        raw,meta=fetch(url);obs,counts,minutes=parse(raw,spec,selected[0]["stationLat"],selected[0]["stationLon"])
    except Exception as exc:
        return {"station":station,"source":{"url":url},"status":"unavailable","error":str(exc)[:300],"slots":[{"cycleAt":p["cycleAt"],"leadHours":p["leadHours"],"status":"source unavailable"} for p in selected]}
    slots=[]
    for p in selected:
        b=timestamp(p["baselineAt"]);t=timestamp(p["decisionAt"])+dt.timedelta(hours=p["leadHours"])
        exact=[obs.get(b),obs.get(t)]
        prior=recovered.get((station,p["cycleAt"],p["leadHours"]))
        def nearby(at):
            return [v for k,v in sorted(obs.items()) if abs((k-at).total_seconds())<=900]
        same=[]
        if prior:
            for role,field in [("baseline","baselineObservedAt"),("target","targetObservedAt")]:
                z=obs.get(timestamp(prior[field]))
                same.append({"role":role,"sample":z,"ndbcTempC":prior["baselineC" if role=="baseline" else "actualC"],"differenceC":z["tempC"]-prior["baselineC" if role=="baseline" else "actualC"] if z else None})
        slots.append({"cycleAt":p["cycleAt"],"leadHours":p["leadHours"],"baselineAt":b.isoformat(),"targetAt":t.isoformat(),"exactBaseline":exact[0],"exactTarget":exact[1],"status":"candidate exact pair" if all(exact) else "no exact pair","baselineNearby":nearby(b),"targetNearby":nearby(t),"sameTimestampNdbc":same})
    return {"station":station,"source":meta,"status":"parsed","counts":counts,"goodTimestampMinutesSeconds":minutes,"exactCandidatePairs":sum(s["status"]=="candidate exact pair" for s in slots),"slots":slots}
def main():
    raw=SOURCE.read_bytes();d=json.loads(raw);rec=RECOVERY.read_bytes();r=json.loads(rec)
    assert d["status"]=="FROZEN_HORIZON_RELIABILITY_CONFIRMATION_ONLY" and d["canPromoteModel"] is False and len(d["cohort"])==200
    assert r["sourceDatasetSha256"]==digest(raw) and r["canPromoteModel"] is False
    rows=[p for c in d["cycles"] for p in c["pairs"]]
    recovered={(p["station"],p["cycleAt"],p["leadHours"]):p for p in r["recovered"]}
    result={name:reconcile(spec,rows,recovered) for name,spec in SOURCES.items()}
    print(json.dumps({"status":"PROVIDER_TIMESTAMP_RECONCILIATION_ONLY","sourceDatasetSha256":digest(raw),"recoverySha256":digest(rec),"cohortSha256":d["cohortSha256"],"sources":result,"canPromoteModel":False,"limitations":["Same buoy data from multiple archives are not independent observations.","Candidate exact sample times are not proof of historical availability, sensor-depth equivalence, or receipt time.","No rounding, interpolation, replacement or change to frozen exact coverage. Provider errors remain unavailable.","Coordinates are nominal station positions; no historical deployment proof added by CSV."]},indent=2,allow_nan=False))
if __name__=="__main__":main()
