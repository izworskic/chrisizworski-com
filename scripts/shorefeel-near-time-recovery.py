#!/usr/bin/env python3
"""Recover near-time buoy observations for the already frozen 180-slot cohort.
Do not re-download model files, mutate the original dataset or tune forecasts.
"""
import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import bisect
import math

spec=importlib.util.spec_from_file_location("expanded",pathlib.Path(__file__).with_name("shorefeel-expanded-dataset.py"))
e=importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)
SOURCE=pathlib.Path("data/shorefeel/october-november-multistation-actual-20261124.json")
LIMIT_MIN=15

def select(times,target,prior_only):
    i=bisect.bisect_left(times,target)
    choices=times[max(0,i-1):i+1]
    if prior_only:choices=[t for t in choices if t<=target]
    # Ties select the earlier measurement. Preserve true measurement time.
    if not choices:return None
    best=min(choices,key=lambda t:(abs(t-target),t))
    return best if abs((best-target).total_seconds())<=LIMIT_MIN*60 else None

def main():
    original=json.loads(SOURCE.read_text())
    assert original["status"]=="MULTI_STATION_DECISION_TIME_DIAGNOSTIC_ONLY"
    assert len(original["cohort"])==180
    with tempfile.TemporaryDirectory() as tmp:
        obs,meta=e.observations(pathlib.Path(tmp))
    rows=[p for c in original["cycles"] for p in c["pairs"]]
    recovered=[];unresolved=[];revision_checks=[]
    for p in rows:
        station=p["station"]
        b=dt.datetime.fromisoformat(p["baselineAt"])
        t=dt.datetime.fromisoformat(p["decisionAt"])+dt.timedelta(hours=p["leadHours"])
        times=sorted(obs[station])
        if "modelChangeErrorF" in p:
            now_b=obs[station].get(b);now_t=obs[station].get(t)
            if now_b!=p["baselineC"] or now_t!=p["actualC"]:
                revision_checks.append({"station":station,"cycleAt":p["cycleAt"],"leadHours":p["leadHours"],"oldBaselineC":p["baselineC"],"newBaselineC":now_b,"oldActualC":p["actualC"],"newActualC":now_t})
            continue
        row={"station":station,"cycleAt":p["cycleAt"],"leadHours":p["leadHours"],"originalReason":p.get("reason"),"intendedBaselineAt":b.isoformat(),"intendedTargetAt":t.isoformat()}
        if p.get("reason")!="missing exact-hour independent observation" or not all(isinstance(p.get(k),(int,float)) and math.isfinite(p[k]) for k in ("modelBaseC","modelValidC")):
            unresolved.append({**row,"reason":"no eligible preserved model pair"});continue
        bt=select(times,b,True);tt=select(times,t,False)
        if bt is None or tt is None:
            unresolved.append({**row,"reason":"no observation within predeclared tolerance","baselineFound":bt is not None,"targetFound":tt is not None});continue
        bm=meta[station][str(bt.month)];tm=meta[station][str(tt.month)]
        if not bm.get("sha256") or not tm.get("sha256") or bt.month!=b.month or tt.month!=t.month:
            unresolved.append({**row,"reason":"unverified source or month boundary"});continue
        base=obs[station][bt];actual=obs[station][tt]
        # Model reference remains f004, forecast target f030/f054. This
        # intentionally measures timing sensitivity, not exact-time skill.
        delta=(p["modelValidC"]-p["modelBaseC"])*1.8
        pf=base*1.8+32;af=actual*1.8+32
        recovered.append({**row,"baselineObservedAt":bt.isoformat(),"targetObservedAt":tt.isoformat(),"baselineOffsetMinutes":(bt-b).total_seconds()/60,"targetOffsetMinutes":(tt-t).total_seconds()/60,"baselineC":base,"actualC":actual,"modelBaseC":p["modelBaseC"],"modelValidC":p["modelValidC"],"baselineSourceKind":bm["sourceKind"],"targetSourceKind":tm["sourceKind"],"baselineSha256":bm["sha256"],"targetSha256":tm["sha256"],"baselineSourceChanged":bm["sha256"]!=original["observationFiles"][station][str(b.month)].get("sha256"),"targetSourceChanged":tm["sha256"]!=original["observationFiles"][station][str(t.month)].get("sha256"),"persistenceF":pf,"predictedF":pf+delta,"actualF":af,"persistenceErrorF":pf-af,"modelChangeErrorF":pf+delta-af})
    exact=[p for p in rows if "modelChangeErrorF" in p]
    metrics={}
    for h in (24,48):
        x=[p for p in exact if p["leadHours"]==h]
        y=[p for p in recovered if p["leadHours"]==h]
        z=[p for p in unresolved if p["leadHours"]==h]
        metrics[h]={"expected":90,"originalExact":len(x),"newNearTime":len(y),"remainingMissing":len(z),"originalExactMetrics":e.measure(x),"nearTimeOnlyMetrics":e.measure(y),"recoverableCoverageFraction":(len(x)+len(y))/90}
    out={"status":"NEAR_TIME_RECOVERY_SENSITIVITY_ONLY","originalCohortSha256":original["cohortSha256"],"sourceDatasetSha256":e.a.digest(SOURCE.read_bytes()),"maximumOffsetMinutes":LIMIT_MIN,"metrics":metrics,"recovered":recovered,"unresolved":unresolved,"exactObservationRevisionChecks":revision_checks,"observationFiles":meta,"canPromoteModel":False,"limitations":["Prior baseline only; target nearest observation within +/-15 min, ties earlier. No interpolated or manufactured observation.","Model values remain at their original valid times, so nonzero offsets are timing sensitivity, not exact-time validation.","Re-fetched source bytes may differ; revisions of exact pairs are reported, never overwrite original evidence.","Historical buoy availability and sensor deployment still unverified; no pooled calibration metrics or production changes."]}
    print(json.dumps(out,indent=2,allow_nan=False))
if __name__=="__main__":main()
