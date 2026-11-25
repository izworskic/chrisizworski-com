#!/usr/bin/env python3
"""Predeclared new-date observation-only feasibility check, no forecast outcomes read."""
import datetime as dt, hashlib, importlib.util, json, pathlib, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
AUDIT=ROOT/"data/shorefeel/horizon-confirm-coverage-audit-20261125.json"
DATES=tuple("2026-06-%02d"%day for day in (3,6,9,12,15,18,21,24,27,30))
STATIONS=("45002","45013","45024","45026","45029","45161","45168","45183","45210","45214")
PRIMARY=STATIONS[:8]
LEADS=(24,48)
def sha(b):return hashlib.sha256(b).hexdigest()
def frozen_slots():
    return [{"station":s,"cycleAt":day+"T00:00:00+00:00","leadHours":h,"stratum":"primary" if s in PRIMARY else "off-hour-extension"} for day in DATES for s in STATIONS for h in LEADS]
def evaluate(obs,meta,audit):
    if audit["canPromoteModel"] is not False:raise ValueError("Unexpected prior audit")
    eligible=tuple(s for s in STATIONS if all(audit["stations"][s][str(h)]["exact"]>0 for h in LEADS))
    if eligible!=PRIMARY:raise ValueError("Prior coverage does not reproduce frozen stratum")
    slots=frozen_slots();rows=[]
    for p in slots:
        b=dt.datetime.fromisoformat(p["cycleAt"])+dt.timedelta(hours=4)
        t=b+dt.timedelta(hours=2+p["leadHours"])
        station=p["station"];times=obs.get(station,{})
        bm=meta.get(station,{}).get(str(b.month),{});tm=meta.get(station,{}).get(str(t.month),{})
        baseline=b in times and bool(bm.get("sha256")) and not bm.get("error")
        target=t in times and bool(tm.get("sha256")) and not tm.get("error")
        rows.append({**p,"baselineAt":b.isoformat(),"targetAt":t.isoformat(),"baselinePresent":baseline,"targetPresent":target,"exactPairPresent":baseline and target})
    def summarize(ps):
        n=sum(p["exactPairPresent"] for p in ps)
        blocks=sum(any(p["cycleAt"].startswith(day) and p["exactPairPresent"] for p in ps) for day in DATES)
        return {"expected":len(ps),"exactAvailable":n,"fraction":n/len(ps),"dateBlocks":blocks,"passesFeasibility":n*5>=len(ps)*4 and blocks==len(DATES)}
    metrics={str(h):{g:summarize([p for p in rows if p["leadHours"]==h and (g=="all" or p["stratum"]==g)]) for g in ("primary","off-hour-extension","all")} for h in LEADS}
    return {"status":"JUNE_COVERAGE_PREFLIGHT_ONLY","cohortSha256":sha(json.dumps(slots,sort_keys=True,separators=(",",":")).encode()),"slots":rows,"metrics":metrics,"primaryStations":list(PRIMARY),"allStations":list(STATIONS),"dates":list(DATES),"sourceFiles":meta,"canAcquireFixedPrimaryForecastCohort":all(metrics[str(h)]["primary"]["passesFeasibility"] for h in LEADS),"canPromoteModel":False,"limitations":["Primary stratum is fixed from prior July/August exact timestamp presence only, not errors. June dates are fixed and no replacement is allowed.","All ten stations remain in reported secondary coverage; the two off-hour stations are not judged inferior forecasting locations.","Presence audit uses no temperatures or forecast outcomes in its scoring or output. Retrospective observation availability is not proof of original receipt time.","Feasibility is not forecast qualification. No changes to prior frozen cohort or 80% gate."]}
def main():
    spec=importlib.util.spec_from_file_location("expanded",ROOT/"scripts/shorefeel-expanded-dataset.py")
    e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
    raw=AUDIT.read_bytes()
    with tempfile.TemporaryDirectory() as tmp:obs,meta=e.observations(pathlib.Path(tmp),(6,7))
    print(json.dumps({**evaluate(obs,meta,json.loads(raw)),"priorAuditSha256":sha(raw)},indent=2,allow_nan=False))
if __name__=="__main__":main()
