#!/usr/bin/env python3
"""Retrospective pre-decision physical features; no new model selection."""
import datetime as dt, gzip, hashlib, importlib.util, json, math, pathlib, statistics, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
FILES={"review":"reliability-cohort-actual-20261125.json","confirmation":"horizon-confirm-cohort-actual-20261125.json"}
SHORE={"45029":-1,"45161":-1,"45013":1}
def digest(b):return hashlib.sha256(b).hexdigest()
def mean(a):return statistics.mean(a) if a else None
def features(hours):
    if len(hours)!=24:raise ValueError("expected 24 prior hours")
    wind=[h for h in hours if h["windSamples"]]
    proxy=[h["offshoreStressProxyM2S2"] for h in wind if h["offshoreStressProxyM2S2"] is not None]
    early=[h["meanWaterC"] for h in hours[:6] if h["meanWaterC"] is not None]
    late=[h["meanWaterC"] for h in hours[-6:] if h["meanWaterC"] is not None]
    water=[h["meanWaterC"] for h in hours if h["meanWaterC"] is not None]
    return {"windHours":len(wind),"waterHours":len(water),"windSpeedMps":mean([h["meanWindSpeedMps"] for h in wind]) if len(wind)>=18 else None,
            "offshoreStressProxyM2S2":mean(proxy) if len(proxy)>=18 else None,
            "offshoreFavorableHours":sum(p>0 for p in proxy) if len(proxy)>=18 else None,
            "waterTrendF":(mean(late)-mean(early))*1.8 if len(water)>=18 and len(early)>=4 and len(late)>=4 else None}
def classify(f):
    # Descriptive, fixed bins, not calibrated physical thresholds.
    s=f["windSpeedMps"];t=f["waterTrendF"];p=f["offshoreStressProxyM2S2"]
    return {"wind":"missing" if s is None else "below5mps" if s<5 else "atLeast5mps",
            "priorTrend":"missing" if t is None else "cooling" if t<=-2 else "warming" if t>=2 else "stable",
            "offshore":"missing" if p is None else "favorable" if p>0 else "notFavorable"}
def summarize(rows):
    def score(ps,h):
        paired=[p for p in ps if p["actualChangeF"] is not None]
        w=.25 if h==24 else 1
        return {"expected":len(ps),"matched":len(paired),"largeObservedChange":sum(abs(p["actualChangeF"])>=5 for p in paired),"persistenceMAE_F":mean([abs(p["actualChangeF"]) for p in paired]),"candidateMAE_F":mean([abs(w*p["modelChangeF"]-p["actualChangeF"]) for p in paired])}
    return {str(h):{kind:{band:score([p for p in rows if p["leadHours"]==h and p["bands"][kind]==band],h) for band in bands} for kind,bands in {"wind":["missing","below5mps","atLeast5mps"],"priorTrend":["missing","cooling","stable","warming"],"offshore":["missing","favorable","notFavorable"]}.items()} for h in (24,48)}
def main():
    spec=importlib.util.spec_from_file_location("wind",ROOT/"scripts/shorefeel-warm-season-wind-cause.py")
    w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
    raw={k:(ROOT/"data/shorefeel"/name).read_bytes() for k,name in FILES.items()}
    ds={k:json.loads(b) for k,b in raw.items()}
    if any(d["canPromoteModel"] is not False for d in ds.values()):raise ValueError("unexpected source")
    data={};sourceFiles={}
    with tempfile.TemporaryDirectory() as tmp:
        for s,months in ds["review"]["observationFiles"].items():
            for m in ("7","8"):
                meta=months[m];other=ds["confirmation"]["observationFiles"][s][m]
                key=s+"/"+m;path=pathlib.Path(tmp)/(s+"-"+m+".gz")
                try:
                    if meta["sha256"]!=other["sha256"]:raise ValueError("cohort source mismatch")
                    got=w.a.fetch(meta["url"],path,w.e.CAP)
                    if got["sha256"]!=meta["sha256"]:raise ValueError("monthly archive changed")
                    with gzip.open(path,"rb") as gz:b=gz.read(w.e.CAP+1)
                    if len(b)>w.e.CAP or digest(b)!=meta["decodedSha256"]:raise ValueError("decoded archive mismatch")
                    data[key]=w.parse_wind(b);sourceFiles[key]={**got,"decodedSha256":digest(b),"records":len(data[key])}
                except Exception as exc:sourceFiles[key]={"error":str(exc)[:300],"expectedSha256":meta.get("sha256")}
    out={}
    for name,d in ds.items():
        histories=[];rows=[]
        for c in d["cycles"]:
            for s in sorted({p["station"] for p in c["pairs"]}):
                ps=[p for p in c["pairs"] if p["station"]==s]
                if len(ps)!=2:raise ValueError("unexpected station slots")
                cutoff=dt.datetime.fromisoformat(ps[0]["baselineAt"]);issue=dt.datetime.fromisoformat(ps[0]["decisionAt"])
                if issue-cutoff!=dt.timedelta(hours=2):raise ValueError("unexpected decision lag")
                records=data.get(s+"/"+str(cutoff.month),{})
                # Strictly exclude records at or beyond 04Z, two hours before assumed issue.
                prior={t:v for t,v in records.items() if cutoff-dt.timedelta(hours=24)<=t<cutoff}
                hours=w.hourly(prior,cutoff-dt.timedelta(hours=24),cutoff,SHORE.get(s))
                f=features(hours);bands=classify(f)
                histories.append({"station":s,"cycleAt":ps[0]["cycleAt"],"cutoffExclusive":cutoff.isoformat(),"sourceKey":s+"/"+str(cutoff.month),"features":f,"bands":bands,"latestMeasurementAt":max(prior).isoformat() if prior else None})
                for p in ps:
                    delta=(p["modelValidC"]-p["modelBaseC"])*1.8 if all(isinstance(p.get(k),(float,int)) for k in ("modelBaseC","modelValidC")) else None
                    actual=(p["actualC"]-p["baselineC"])*1.8 if not p.get("reason") and delta is not None else None
                    rows.append({"station":s,"cycleAt":p["cycleAt"],"leadHours":p["leadHours"],"bands":bands,"actualChangeF":actual,"modelChangeF":delta})
        assert len(rows)==len(d["cohort"]) and len({(p["station"],p["cycleAt"],p["leadHours"]) for p in rows})==len(rows)
        out[name]={"sourceSha256":digest(raw[name]),"cohortSha256":d["cohortSha256"],"histories":histories,"rows":rows,"metrics":summarize(rows)}
    print(json.dumps({"status":"PRE_DECISION_PHYSICS_FEATURE_DIAGNOSTIC_ONLY","sourceFiles":sourceFiles,"cohorts":out,"canPromoteModel":False,"limitations":["Same inspected cohorts; outcome-blind feature extraction but retrospective diagnostic only.","24 hours strictly before 04Z; assumed 06Z decision; historical receipt time not authenticated.","At least 18 of 24 hours for wind and water; at least four hours in each endpoint window for trend. Missing features not imputed.","Three existing approximate shoreline signs only. Offshore proxy is not measured transport; thermal stratification not observed.","No adaptive weight or optimized threshold; 5 m/s wind and 2F trend bins descriptive only; no calibrated forecasts."]},indent=2,allow_nan=False))
if __name__=="__main__":main()
