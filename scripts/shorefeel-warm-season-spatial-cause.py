#!/usr/bin/env python3
"""Fixed July/August spatial and later-cycle diagnostic. No tuning or promotion."""
import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import math
import statistics
from email.utils import parsedate_to_datetime

spec=importlib.util.spec_from_file_location("acq",pathlib.Path(__file__).with_name("shorefeel-october-acquisition.py"))
a=importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)
SOURCE=pathlib.Path("data/shorefeel/warm-season-actual-20261124.json")
ALIGNED=pathlib.Path("data/shorefeel/warm-season-depth-watch-actual-20261124.json")
DATES=("2026-07-15","2026-08-15")
RADIUS=2

def extract(cycle,h,sites,expected_hash,geometry):
    name=f"lmhofs.t00z.{cycle:%Y%m%d}.regulargrid.f{h:03}.nc"
    with tempfile.TemporaryDirectory() as tmp:
        path=pathlib.Path(tmp)/name
        m=a.fetch(f"https://noaa-nos-ofs-pds.s3.amazonaws.com/lmhofs/netcdf/{cycle:%Y/%m/%d}/"+name,path,a.MAX_FILE)
        if expected_hash and m["sha256"]!=expected_hash:raise ValueError("archived original file changed")
        la,lo,z,g=a.load_grid(path,h,cycle)
        if g["geometrySha256"]!=geometry:raise ValueError("grid changed")
        out={}
        for station,p in sites.items():
            j,i=p["j"],p["i"]
            if not (math.isclose(float(la[j,i]),p["cellLat"],abs_tol=1e-7) and math.isclose(float(lo[j,i]),p["cellLon"],abs_tol=1e-7)):raise ValueError("cell coordinates changed")
            cells={}
            for y in range(max(0,j-RADIUS),min(z.shape[0],j+RADIUS+1)):
                for x in range(max(0,i-RADIUS),min(z.shape[1],i+RADIUS+1)):
                    if math.isfinite(z[y,x]):cells[f"{y},{x}"]=float(z[y,x])
            out[station]=cells
        return {**m,**g},out

def main():
    src=json.loads(SOURCE.read_text());aligned=json.loads(ALIGNED.read_text())
    results=[];rows=[]
    for date in DATES:
        c=next(c for c in src["cycles"] if c["cohort"][0]["cycleAt"].startswith(date))
        ac=next(c for c in aligned["cycles"] if c["cycleAt"].startswith(date))
        cycle=dt.datetime.fromisoformat(c["cohort"][0]["cycleAt"]);issue=cycle+dt.timedelta(hours=6)
        sites={p["station"]:p for p in c["pairs"] if "cellLat" in p and "modelBaseC" in p}
        cr={"cycleAt":cycle.isoformat(),"files":{},"neighborhoods":{},"pairs":[]};results.append(cr)
        for label,when,h,old in [("decision",cycle,6,ac["files"]["6"]),("forecast",cycle,30,c["models"]["30"]),("laterCycle",cycle+dt.timedelta(days=1),6,None)]:
            try:
                m,fields=extract(when,h,sites,old["sha256"] if old else None,c["models"]["4"]["geometrySha256"])
                cr["files"][label]=m
                if old and (not m.get("lastModified") or parsedate_to_datetime(m["lastModified"])>issue):raise ValueError("original object unavailable by assumed decision")
                cr["neighborhoods"][label]=fields
            except Exception as ex:cr["files"].setdefault(label,{}).update(error=str(ex)[:300])
        for p in ac["pairs"]:
            if p["leadHours"]!=24:continue
            s=p["station"];row={"station":s,"cycleAt":cycle.isoformat(),"observedChangeF":p["observedChangeF"],"decisionObservedC":p["decisionObservedC"],"targetObservedC":p["targetObservedC"]}
            rows.append(row);cr["pairs"].append(row)
            if s not in sites:row["reason"]="no original cell";continue
            point=sites[s];key=f'{point["j"]},{point["i"]}'
            b=cr["neighborhoods"].get("decision",{}).get(s,{})
            f=cr["neighborhoods"].get("forecast",{}).get(s,{})
            v=cr["neighborhoods"].get("laterCycle",{}).get(s,{})
            common=sorted(set(b)&set(f));deltas=[(f[k]-b[k])*1.8 for k in common]
            if key not in common:row["reason"]="missing original model cell";continue
            row.update(cell=key,commonWetCells=len(common),centralForecastChangeF=(f[key]-b[key])*1.8,neighborhoodMedianChangeF=statistics.median(deltas),neighborhoodMinChangeF=min(deltas),neighborhoodMaxChangeF=max(deltas),neighborhoodCoolingFraction=sum(x<=-1.5 for x in deltas)/len(deltas))
            if key in v:
                row.update(laterCycleChangeFromOriginalDecisionF=(v[key]-b[key])*1.8,forecastMinusLaterCycleF=(f[key]-v[key])*1.8)
            if p["observedChangeF"] is not None:
                actual=p["observedChangeF"];row["originalErrorF"]=row["centralForecastChangeF"]-actual
                row["neighborhoodMedianErrorF"]=row["neighborhoodMedianChangeF"]-actual
                if key in v:row["laterCycleErrorF"]=row["laterCycleChangeFromOriginalDecisionF"]-actual
                row["observedChangeWithinNeighborhoodRange"]=min(deltas)<=actual<=max(deltas)
    matched=[p for p in rows if "originalErrorF" in p]
    later=[p for p in matched if "laterCycleErrorF" in p]
    mean=lambda x:statistics.mean(x) if x else None
    false=[p for p in matched if p["centralForecastChangeF"]<=-1.5 and p["observedChangeF"]>-3]
    metrics={"expected":20,"matched":len(matched),"centralMAE_F":mean([abs(p["originalErrorF"]) for p in matched]),"fixedNeighborhoodMedianMAE_F":mean([abs(p["neighborhoodMedianErrorF"]) for p in matched]),"observedWithinNeighborhoodRange":sum(p["observedChangeWithinNeighborhoodRange"] for p in matched),"laterCycleMatched":len(later),"originalMAEOnLaterCycleRows_F":mean([abs(p["originalErrorF"]) for p in later]),"laterCycleMAE_F":mean([abs(p["laterCycleErrorF"]) for p in later]),"falseWatches":len(false),"falseWatchesWithMajorityNeighborhoodCooling":sum(p["neighborhoodCoolingFraction"]>.5 for p in false),"falseWatchesWithLaterCycleCooling":sum(p.get("laterCycleChangeFromOriginalDecisionF",math.inf)<=-1.5 for p in false),"falseWatchesWithLaterCycleAvailable":sum("laterCycleErrorF" in p for p in false)}
    print(json.dumps({"status":"WARM_SEASON_SPATIAL_AND_LATER_CYCLE_DIAGNOSTIC_ONLY","sourceSha256":a.digest(SOURCE.read_bytes()),"alignedSha256":a.digest(ALIGNED.read_bytes()),"metrics":metrics,"cycles":results,"canPromoteModel":False,"limitations":["Two fixed midsummer dates already examined, all ten station IDs, no new independent confirmation.","Fixed 5x5 regular-grid neighborhood, paired wet cells only. Grid range is descriptive, not forecast uncertainty; no selecting best cell against observation.","Later 00Z cycle f006 is a short-lead model forecast, not an observation or actual nowcast. Uses information from after the original decision, strictly for retrospective diagnosis.","A revised later cycle can indicate model evolution or forcing changes; cannot establish which physical process caused the difference. Historical buoy positions, receipt times and actual forcing still unverified.","No production threshold, forecast or location changes."]},indent=2,allow_nan=False))
if __name__=="__main__":main()
