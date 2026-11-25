#!/usr/bin/env python3
"""Frozen warm-season cooling-watch alignment and depth sensitivity; research only."""
import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import math
from email.utils import parsedate_to_datetime

spec=importlib.util.spec_from_file_location("expanded",pathlib.Path(__file__).with_name("shorefeel-expanded-dataset.py"))
e=importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)
a=e.a
SOURCE=pathlib.Path("data/shorefeel/warm-season-actual-20261124.json")
HOURS=(4,6,30,54)
DEPTHS=(0.,1.,2.,5.)
def profile(path,cycle,lead,sites):
    la,lo,z,meta=a.load_grid(path,lead,cycle)
    with a.netCDF4.Dataset(path) as ds:
        dep=a.np.asarray(a.var(ds,"depth")[:],dtype=float)
        temp=a.var(ds,"temp")
        if not a.np.all(a.np.isfinite(dep)) or not a.np.all(a.np.diff(dep)>0):raise ValueError("nonmonotonic depth axis")
        out={}
        for s,p in sites.items():
            j,i=p["j"],p["i"]
            if not math.isclose(float(la[j,i]),p["cellLat"],abs_tol=1e-7) or not math.isclose(float(lo[j,i]),p["cellLon"],abs_tol=1e-7):raise ValueError("stored cell coordinate mismatch")
            values=a.np.ma.filled(a.np.ma.asarray(temp[0,:,j,i],dtype=float),a.np.nan)
            result={}
            for d in DEPTHS:
                k=int(a.np.searchsorted(dep,d))
                if k<len(dep) and abs(dep[k]-d)<1e-6: v=values[k]
                elif k==0 or k==len(dep):v=a.np.nan
                else:v=values[k-1]+(values[k]-values[k-1])*(d-dep[k-1])/(dep[k]-dep[k-1]) if all(math.isfinite(x) and -2<=x<=36 for x in (values[k-1],values[k])) else a.np.nan
                result[str(int(d))]=float(v) if math.isfinite(v) and -2<=v<=36 else None
            out[s]=result
        return out,{**meta,"depthAxisM":dep.tolist()}

def counts(rows,field):
    c={"TP":0,"FP":0,"FN":0,"TN":0}
    for p in rows:
        if p.get(field) is None or p.get("observedChangeF") is None:continue
        w=p[field]<=-1.5;v=p["observedChangeF"]<=-3
        c["TP" if w and v else "FP" if w else "FN" if v else "TN"]+=1
    return c

def main():
    source=json.loads(SOURCE.read_text())
    assert source["status"]=="WARM_SEASON_ARCHIVE_COVERAGE_DIAGNOSTIC_NOT_HOLDOUT" and len(source["cohort"])==80
    with tempfile.TemporaryDirectory() as temp:
        obs,ometa=e.observations(pathlib.Path(temp),(7,8,9))
    results=[];rows=[]
    for c in source["cycles"]:
        cycle=dt.datetime.fromisoformat(c["cohort"][0]["cycleAt"]);issue=cycle+dt.timedelta(hours=6)
        sites={p["station"]:p for p in c["pairs"] if "cellLat" in p and "modelBaseC" in p}
        cr={"cycleAt":cycle.isoformat(),"files":{},"profiles":{},"pairs":[]}
        results.append(cr)
        with tempfile.TemporaryDirectory() as temp:
            for h in HOURS:
                name=f"lmhofs.t00z.{cycle:%Y%m%d}.regulargrid.f{h:03}.nc";path=pathlib.Path(temp)/name
                try:
                    m=a.fetch(f"https://noaa-nos-ofs-pds.s3.amazonaws.com/lmhofs/netcdf/{cycle:%Y/%m/%d}/"+name,path,a.MAX_FILE)
                    cr["files"][h]=m
                    if not m.get("lastModified") or parsedate_to_datetime(m["lastModified"])>issue:raise ValueError("object timestamp later than decision")
                    old=c["models"].get(str(h))
                    if old and old.get("sha256")!=m["sha256"]:raise ValueError("archived model file changed; do not substitute")
                    p,g=profile(path,cycle,h,sites)
                    if g["geometrySha256"]!=c["models"]["4"]["geometrySha256"]:raise ValueError("grid geometry changed")
                    cr["files"][h].update(g);cr["profiles"][h]=p
                except Exception as ex:cr["files"].setdefault(h,{}).update(error=str(ex)[:300])
                finally:path.unlink(missing_ok=True)
        for station in sorted({p["station"] for p in c["cohort"]}):
            for h in (24,48):
                target=issue+dt.timedelta(hours=h)
                b=obs.get(station,{}).get(issue);v=obs.get(station,{}).get(target)
                bm=ometa[station][str(issue.month)];tm=ometa[station][str(target.month)]
                base_same=bm.get("sha256") is not None and bm["sha256"]==source["observationFiles"][station][str(issue.month)].get("sha256")
                target_same=tm.get("sha256") is not None and tm["sha256"]==source["observationFiles"][station][str(target.month)].get("sha256")
                row={"station":station,"cycleAt":cycle.isoformat(),"leadHours":h,"decisionAt":issue.isoformat(),"targetAt":target.isoformat(),"decisionObservedC":b,"targetObservedC":v,"observationSourceHashesMatch":base_same and target_same,"observedChangeF":(v-b)*1.8 if b is not None and v is not None and base_same and target_same else None}
                base=cr["profiles"].get(6,{}).get(station,{})
                old=cr["profiles"].get(4,{}).get(station,{})
                final=cr["profiles"].get(h+6,{}).get(station,{})
                row["changeByDepthF"]={d:(final[d]-base[d])*1.8 if final.get(d) is not None and base.get(d) is not None else None for d in ("0","1","2","5")}
                row["surfaceAlignedChangeF"]=row["changeByDepthF"]["0"]
                row["surfaceOldReferenceChangeF"]=(final["0"]-old["0"])*1.8 if final.get("0") is not None and old.get("0") is not None else None
                row["oneMeterChangeF"]=row["changeByDepthF"]["1"]
                rows.append(row);cr["pairs"].append(row)
    metrics={}
    for h in (24,48):
        selected=[p for p in rows if p["leadHours"]==h]
        matched=[p for p in selected if p["observedChangeF"] is not None and p["surfaceAlignedChangeF"] is not None and p["surfaceOldReferenceChangeF"] is not None]
        common=[p for p in matched if p["oneMeterChangeF"] is not None]
        def score(group,key):
            errors=[p[key]-p["observedChangeF"] for p in group]
            return {"n":len(errors),"maeF":sum(abs(x) for x in errors)/len(errors) if errors else None,"biasF":sum(errors)/len(errors) if errors else None}
        metrics[h]={"expected":len(selected),"alignedMatched":len(matched),"oldReferenceOnSameRows":score(matched,"surfaceOldReferenceChangeF"),"alignedSurface":score(matched,"surfaceAlignedChangeF"),"oldWatchReferenceOnSameRows":counts(matched,"surfaceOldReferenceChangeF"),"alignedSurfaceWatch":counts(matched,"surfaceAlignedChangeF"),"commonDepthRows":len(common),"surfaceOnDepthRows":score(common,"surfaceAlignedChangeF"),"oneMeterOnDepthRows":score(common,"oneMeterChangeF"),"oneMeterWatchOnDepthRows":counts(common,"oneMeterChangeF")}
    print(json.dumps({"status":"WARM_SEASON_DEPTH_AND_WATCH_ALIGNMENT_DIAGNOSTIC_ONLY","sourceDatasetSha256":a.digest(SOURCE.read_bytes()),"sourceCohortSha256":source["cohortSha256"],"metrics":metrics,"cycles":results,"observationFiles":ometa,"canPromoteModel":False,"limitations":["Decision-time watch now compares 00Z model f006 with f030 and actual 06Z buoy to next-day 06Z buoy. 48h is research only, not a live cooling watch.","Old-reference comparison uses the same observed 06Z change and is timing sensitivity, not a reproduction of the earlier baseline-04Z scores.","Nominal 1m depth is a predeclared sensitivity, not authenticated sensor depth. Other profiles retained descriptively; no best-depth selection.","Exact original model file hashes required for f004/f030/f054, original geometry required for all four hours. Observation hashes must match the preserved warm-season archive. Historical receipt times and deployment metadata still unverified.","Four dates already studied, retrospective and correlated; no causal inference, tuning or model promotion."]},indent=2,allow_nan=False))
if __name__=="__main__":main()
