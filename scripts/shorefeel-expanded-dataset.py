#!/usr/bin/env python3
"""One-off expanded Lake Michigan data acquisition, fixed before reading outcomes."""
import datetime as dt
import importlib.util
import json
import pathlib
import statistics
import tempfile
import bisect
import sys
import gzip
from collections import Counter

spec=importlib.util.spec_from_file_location("acquisition",pathlib.Path(__file__).with_name("shorefeel-october-acquisition.py"))
a=importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)
ORIGINAL=a.STATIONS
ADDITIONAL=("45013","45024","45026","45168","45210","45214")
STATIONS=ORIGINAL+ADDITIONAL
# New dates only, every third day; do not replace missing dates/stations.
DATES=("2026-10-15","2026-10-18","2026-10-21","2026-10-24","2026-10-27","2026-10-30","2026-11-02","2026-11-05","2026-11-08")
CYCLES=[dt.datetime.fromisoformat(day).replace(tzinfo=a.UTC) for day in DATES]
CAP=2*1024*1024
def observations(tmp,months=(10,11)):
    out={};meta={}
    for station in STATIONS:
        out[station]={};meta[station]={}
        for month,kind,folder in [(7,"monthly-quality-controlled","stdmet/Jul"),(8,"monthly-quality-controlled","stdmet/Aug"),(9,"monthly-quality-controlled","stdmet/Sep"),(10,"monthly-quality-controlled","l_stdmet"),(11,"provisional-realtime","realtime2")]:
            if month not in months:continue
            key=str(month);path=tmp/(station+"-"+key+".txt")
            try:
                compressed=month in (7,8,9)
                filename=station+str(month)+"2026.txt.gz" if compressed else station+".txt"
                m=a.fetch("https://www.ndbc.noaa.gov/data/"+folder+"/"+filename,path,CAP)
                if compressed:
                    with gzip.open(path,"rb") as gz:
                        decoded=gz.read(CAP+1)
                    if len(decoded)>CAP:raise ValueError("decompressed observation file exceeds cap")
                    path.write_bytes(decoded)
                    m["decodedBytes"]=len(decoded)
                    m["decodedSha256"]=a.digest(decoded)
                records={t:v for t,v in a.parse_obs(path).items() if t.year==2026 and t.month==month}
                meta[station][key]={**m,"sourceKind":kind,"validWaterRows":len(records),"firstAt":min(records).isoformat() if records else None,"lastAt":max(records).isoformat() if records else None}
                out[station].update(records)
            except Exception as e:meta[station][key]={"sourceKind":kind,"error":str(e)[:300]}
            finally:path.unlink(missing_ok=True)
    return out,meta

def measure(rows):
    valid=[p for p in rows if "modelChangeErrorF" in p]
    mean=lambda x:statistics.mean(x) if x else None
    return {"expected":len(rows),"matched":len(valid),"matchedFraction":len(valid)/len(rows) if rows else None,
    "persistenceMAE_F":mean([abs(p["persistenceErrorF"]) for p in valid]),"modelChangeMAE_F":mean([abs(p["modelChangeErrorF"]) for p in valid]),"biasF":mean([p["modelChangeErrorF"] for p in valid]),
    "heuristicUnroundedCoverage":mean([int(abs(p["modelChangeErrorF"])<=(2 if p["leadHours"]==24 else 3)) for p in valid]),
    "missingReasons":dict(Counter(p["reason"] for p in rows if "reason" in p))}

def gap(sorted_times,target,past_only=False):
    i=bisect.bisect_left(sorted_times,target)
    candidates=sorted_times[max(0,i-1):i+1]
    if past_only:candidates=[t for t in candidates if t<=target]
    if not candidates:return None
    return min(abs((t-target).total_seconds())/60 for t in candidates)

# Earlier diagnostic dates fixed before examining their numeric model errors.
# They overlap the original September 1 - October 13 backtest period.
EARLY_DATES=("2026-10-02","2026-10-05","2026-10-08","2026-10-11")
WARM_DATES=("2026-07-15","2026-08-15","2026-09-15","2026-09-28")
def main():
    args=sys.argv[1:]
    if args not in ([],["--early-october"],["--warm-season"]):raise SystemExit("Usage: shorefeel-expanded-dataset.py [--early-october|--warm-season]")
    early=args==["--early-october"]
    warm=args==["--warm-season"]
    cycles=[dt.datetime.fromisoformat(day).replace(tzinfo=a.UTC) for day in (EARLY_DATES if early else WARM_DATES)] if early or warm else CYCLES
    catalog={s["id"]:s for s in json.loads(pathlib.Path("data/buoy-stations.json").read_text())}
    with tempfile.TemporaryDirectory() as folder:
        obs,meta=observations(pathlib.Path(folder),(7,8,9) if warm else (10,) if early else (10,11))
        results=[a.evaluate_cycle(c,obs,meta,catalog,True,STATIONS) for c in cycles]
    rows=[p for c in results for p in c["pairs"]]
    cohort=[p for c in results for p in c["cohort"]]
    for p in rows:
        baseline=dt.datetime.fromisoformat(p["baselineAt"])
        target=dt.datetime.fromisoformat(p["decisionAt"])+dt.timedelta(hours=p["leadHours"])
        times=sorted(obs[p["station"]])
        p["baselineGapMinutes"]=gap(times,baseline,True)
        p["outcomeGapMinutes"]=gap(times,target)
        p["baselineSourceKind"]=meta[p["station"]][str(baseline.month)]["sourceKind"]
        p["outcomeSourceKind"]=meta[p["station"]][str(target.month)]["sourceKind"]
    groups={}
    for label,stations in [("original",ORIGINAL),("geographic-extension",ADDITIONAL),("all",STATIONS)]:
        groups[label]={}
        for lead in (24,48):
            subset=[p for p in rows if p["station"] in stations and p["leadHours"]==lead]
            groups[label][lead]={"all":measure(subset),("monthly-quality-controlled-only" if warm else "october-quality-controlled-only"):measure([p for p in subset if p["baselineSourceKind"]==p["outcomeSourceKind"]=="monthly-quality-controlled"]),"includes-november-provisional":measure([p for p in subset if "provisional-realtime" in (p["baselineSourceKind"],p["outcomeSourceKind"])])}
    for result in results:
        # Retain only one copy of observation file metadata in this dataset.
        result.pop("observations")
    out={"status":"MULTI_STATION_DECISION_TIME_DIAGNOSTIC_ONLY","cohort":cohort,"cohortSha256":a.digest(json.dumps(cohort,sort_keys=True,separators=(",",":")).encode()),"observationFiles":meta,"cycles":results,"metrics":groups,"stationMetrics":{s:{h:measure([p for p in rows if p["station"]==s and p["leadHours"]==h]) for h in (24,48)} for s in STATIONS},
    "nearTimeCoverageAudit":{h:{"missingExactObservationPairs":sum(p.get("reason")=="missing exact-hour independent observation" and p["leadHours"]==h for p in rows),"potentialWithin15min":sum(p.get("reason")=="missing exact-hour independent observation" and p["leadHours"]==h and p["baselineGapMinutes"] is not None and p["baselineGapMinutes"]<=15 and p["outcomeGapMinutes"] is not None and p["outcomeGapMinutes"]<=15 for p in rows)} for h in (24,48)},
    "canPromoteModel":False,"limitations":["06Z assumed decision, exact 04Z baseline and original 00Z f004/f030/f054; AWS Last-Modified gate, not original buoy receipt timestamps.","November uses provisional realtime archive; October quality-controlled, mixed cases reported separately. Nominal station positions/depths require historical verification.","Separate original and geographic-extension metrics; dates differ from exploratory cohort, but overlap in meteorological regimes; not independent calibration blocks.","Near-time gap audit measures potential coverage only; no approximate pairs scored. No replacements for missing sources."]}
    if early:
        out["status"]="EARLY_OCTOBER_HISTORICAL_DIAGNOSTIC_NOT_HOLDOUT"
        out["limitations"]=["Four fixed early October dates overlap the original backtest period; do not count as independent validation or calibration.","Same ten stations, 06Z decision sensitivity, f004/f030/f054, exact-hour pairs only. Archived receipt times and historical deployment positions not authenticated.","No model fitting, no adjusted thresholds, no imputed observations. Missing slots retained; near-time availability counted separately."]
    if warm:
        out["status"]="WARM_SEASON_ARCHIVE_COVERAGE_DIAGNOSTIC_NOT_HOLDOUT"
        out["limitations"]=["Fixed July 15, August 15, September 15 and 28 cycles. Model retention unknown until actual downloads; missing slots retained.","July and August predate original backtest; September overlaps it. Not an independent prospective holdout.","Three monthly compressed NDBC archives per station; source-byte and decompressed hashes retained. Both compressed and decompressed sizes bounded.","Same 06Z decision sensitivity and exact hourly measurement matching, near-time gaps counted but not scored. No production calibration."]
    print(json.dumps(out,indent=2,allow_nan=False))
if __name__=="__main__":main()
