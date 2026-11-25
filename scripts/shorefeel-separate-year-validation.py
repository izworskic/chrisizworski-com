#!/usr/bin/env python3
"""Separate-year, predeclared observation and model availability screen, then fixed evaluation."""
import datetime as dt, gzip, hashlib, importlib.util, json, pathlib, tempfile, urllib.request
from email.utils import parsedate_to_datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATES=("2025-07-03","2025-07-09","2025-07-15","2025-07-21","2025-07-27","2025-08-03","2025-08-09","2025-08-15","2025-08-21","2025-08-27")
STATIONS=("45002","45013","45024","45026","45029","45161","45168","45183","45210","45214")
PRIMARY=STATIONS[:8]
LEADS=(24,48)
CAP=4*1024*1024
def digest(b):return hashlib.sha256(b).hexdigest()
def slots():
    return [{"station":s,"cycleAt":day+"T00:00:00+00:00","leadHours":h,"stratum":"primary" if s in PRIMARY else "off-hour-extension"} for day in DATES for s in STATIONS for h in LEADS]
def preflight(obs,meta):
    rows=[]
    for p in slots():
        b=dt.datetime.fromisoformat(p["cycleAt"])+dt.timedelta(hours=4)
        t=b+dt.timedelta(hours=2+p["leadHours"])
        source=meta.get(p["station"],{})
        valid=bool(source.get("sha256")) and not source.get("error")
        times=obs.get(p["station"],{})
        rows.append({**p,"baselineAt":b.isoformat(),"targetAt":t.isoformat(),"baselinePresent":valid and b in times,"targetPresent":valid and t in times,"exactPairPresent":valid and b in times and t in times})
    def summary(ps):
        n=sum(p["exactPairPresent"] for p in ps)
        days=len({p["cycleAt"] for p in ps if p["exactPairPresent"]})
        return {"expected":len(ps),"exactAvailable":n,"fraction":n/len(ps),"dateBlocks":days,"passes":n*5>=len(ps)*4 and days==10}
    metrics={str(h):{g:summary([p for p in rows if p["leadHours"]==h and (g=="all" or p["stratum"]==g)]) for g in ("primary","off-hour-extension","all")} for h in LEADS}
    return {"cohortSha256":digest(json.dumps(slots(),sort_keys=True,separators=(",",":")).encode()),"slots":rows,"metrics":metrics,"observationGate":all(metrics[str(h)]["primary"]["passes"] for h in LEADS)}
def archive_url(day,h):
    date=dt.date.fromisoformat(day)
    return f"https://noaa-nos-ofs-pds.s3.amazonaws.com/lmhofs/netcdf/{date:%Y/%m/%d}/lmhofs.t00z.{date:%Y%m%d}.regulargrid.f{h:03}.nc"
def model_probe(a):
    out=[]
    for day in DATES:
        for h in (4,30,54):
            url=archive_url(day,h);row={"day":day,"fileLead":h,"url":url,"eligible":False}
            try:
                req=urllib.request.Request(url,method="HEAD")
                with urllib.request.urlopen(req,timeout=12) as res:
                    if res.geturl()!=url:raise ValueError("redirect")
                    size=int(res.headers.get("Content-Length","0"));modified=res.headers.get("Last-Modified")
                    issue=dt.datetime.fromisoformat(day+"T06:00:00+00:00")
                    row.update(bytes=size,lastModified=modified,etag=res.headers.get("ETag"),eligible=bool(0<size<=a.MAX_FILE and modified and parsedate_to_datetime(modified)<=issue))
            except Exception as e:row["error"]=str(e)[:300]
            out.append(row)
    return out
def score(rows):
    out={}
    for h,w in ((24,.25),(48,1)):
        group=[p for p in rows if p["leadHours"]==h and p["station"] in PRIMARY]
        matched=[p for p in group if not p.get("reason") and "modelChangeErrorF" in p]
        def metric(weight):
            errors=[(p["modelValidC"]-p["modelBaseC"])*1.8*weight-(p["actualC"]-p["baselineC"])*1.8 for p in matched]
            abs_errors=sorted(map(abs,errors));n=len(errors)
            import math
            return {"n":n,"maeF":sum(abs_errors)/n if n else None,"biasF":sum(errors)/n if n else None,"p90F":abs_errors[math.ceil(.9*n)-1] if n else None,"maxF":max(abs_errors) if n else None}
        baseline,original,candidate=metric(0),metric(1),metric(w)
        blocks=len({p["cycleAt"] for p in matched})
        n=len(matched)
        gates={"exactCoverage":n*5>=len(group)*4,"allTenBlocks":blocks==10,"maeBeatsPersistence":bool(n and candidate["maeF"]<baseline["maeF"]),"maeNoWorseThanOriginal":bool(n and candidate["maeF"]<=original["maeF"]),"p90NoWorseThanBoth":bool(n and candidate["p90F"]<=min(baseline["p90F"],original["p90F"]))}
        out[str(h)]={"expected":len(group),"matched":n,"dateBlocks":blocks,"weight":w,"persistence":baseline,"original":original,"candidate":candidate,"gates":gates,"passesResearchGates":all(gates.values())}
    return out
def main():
    spec=importlib.util.spec_from_file_location("acquisition",ROOT/"scripts/shorefeel-october-acquisition.py")
    a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
    obs={};meta={}
    with tempfile.TemporaryDirectory() as tmp:
        for s in STATIONS:
            path=pathlib.Path(tmp)/(s+".gz")
            try:
                m=a.fetch(f"https://www.ndbc.noaa.gov/data/historical/stdmet/{s}h2025.txt.gz",path,CAP)
                with gzip.open(path,"rb") as f:raw=f.read(CAP+1)
                if len(raw)>CAP:raise ValueError("decompressed cap exceeded")
                path.write_bytes(raw)
                obs[s]={t:v for t,v in a.parse_obs(path).items() if t.year==2025}
                meta[s]={**m,"decodedSha256":digest(raw),"validWaterRows":len(obs[s])}
            except Exception as e:meta[s]={"error":str(e)[:300]}
    result={"status":"SEPARATE_YEAR_FORECAST_RESEARCH_ONLY",**preflight(obs,meta),"sourceFiles":meta,"modelProbes":[],"cycles":[],"scores":None,"canPromoteModel":False,"limitations":["2025 cycles fixed before acquisition; retrospective separate year, not prospective.","No original receipt-time or historical sensor-depth authentication.","Primary station selection frozen from prior timing audit; all ten sites retained in observation coverage and acquired cycle output.","No replacements, no threshold relaxation or production promotion."]}
    if result["observationGate"]:
        result["modelProbes"]=model_probe(a)
        if all(p["eligible"] for p in result["modelProbes"]):
            catalog={s["id"]:s for s in json.loads((ROOT/"data/buoy-stations.json").read_text())}
            result["cycles"]=[a.evaluate_cycle(dt.datetime.fromisoformat(day+"T00:00:00+00:00"),obs,meta,catalog,True,STATIONS) for day in DATES]
            result["scores"]=score([p for c in result["cycles"] for p in c["pairs"]])
    result["modelAcquisitionAllowed"]=result["observationGate"] and len(result["modelProbes"])==30 and all(p["eligible"] for p in result["modelProbes"])
    print(json.dumps(result,indent=2,allow_nan=False))
if __name__=="__main__":main()
