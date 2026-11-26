#!/usr/bin/env python3
"""Offline lake-specific seven-day ice progression research. Never a live forecast.
Requires Python 3 and NumPy. Use full source files downloaded separately from the
pinned source register in README. No network calls, no production integration.
"""
from __future__ import annotations
import argparse, csv, datetime as dt, hashlib, json, math, statistics as st
from pathlib import Path
import numpy as np

PIN='e7f314982c4272b39521ac21eeedfefa1411265e'
LAKES={'Erie':'eri','Huron':'hur','Michigan':'mic','Ontario':'ont','Superior':'sup'}
BLOBS={'Erie':'f48c5a2ba19ed2549a6dfae4aad96c6f253e2451','Huron':'16e6ac91f47d4ac6ef5600ead9df30b43990e770','Michigan':'3f8154372e5f4ed4192f6569e1233af2b2104102','Ontario':'23bb5e517c20d5a9a401a8e9a38b0aeaf7c0b78b','Superior':'936bc3f369abe69dddd6daa9658497c40a18acee'}
YEARS=tuple(range(1973,2027)); TRAIN=tuple(range(1983,2004)); CAL=tuple(range(2004,2014)); EVAL=tuple(range(2014,2024)); SLOTS=[dt.date(2022,12,1)+dt.timedelta(days=7*i) for i in range(13)]
MONTHS='Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(); MODEL_NAMES=('persistence','seasonal','thermal','realizedWeatherDiagnostic')

def label(d): return f'{MONTHS[d.month-1]}-{d.day:02d}'
def shift(d,n): return d+dt.timedelta(days=n)
def slot_date(y,s): return dt.date(y-1 if s.month==12 else y,s.month,s.day)
def git_blob_sha(raw): return hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()
def parse_temp(raw):
    rows=csv.reader(raw.decode('utf-8').splitlines()); header=next(rows)
    if header != ['DATE','all_ave']: raise ValueError('Unexpected daily Celsius CSV header')
    out={}
    for row in rows:
        if len(row)!=2: raise ValueError('Invalid temperature row')
        d=dt.date.fromisoformat(row[0]); v=float(row[1])
        if d in out or not math.isfinite(v) or not -60<=v<=60: raise ValueError('Duplicate or invalid temperature record')
        out[d]=v
    return out

def parse_ice(raw):
    rows=[line.split() for line in raw.decode('utf-8').splitlines() if line.strip()]
    if tuple(map(int,rows[0]))!=YEARS: raise ValueError('Expected exact 1973–2026 ice-year header')
    out={}; valid={label(shift(dt.date(2000,1,1),i)) for i in range(366)}
    for row in rows[1:]:
        k=row[0]
        if k in out or k not in valid or len(row)!=55: raise ValueError('Duplicate or malformed ice row')
        vals=[None if x=='NA' else float(x) for x in row[1:]]
        if any(v is not None and (not math.isfinite(v) or not 0<=v<=100) for v in vals): raise ValueError('Invalid ice concentration')
        out[k]=dict(zip(YEARS,vals))
    return out

def thermal_sums(temps,start,end):
    vals=[temps.get(shift(start,i)) for i in range((end-start).days+1)]
    if not vals or any(v is None for v in vals): return None
    return sum(max(0,-v) for v in vals),sum(max(0,v) for v in vals)

def build_cohort(temps,ice):
    out=[]; missing_ice=missing_temp=0
    for y in TRAIN+CAL+EVAL:
        for i,s in enumerate(SLOTS):
            d=slot_date(y,s); labels=[label(shift(d,k)) for k in (0,-7,7)]
            if any(k not in ice for k in labels): raise ValueError('Required ice calendar row missing')
            now,prior,target=[ice[k][y] for k in labels]
            if any(v is None for v in (now,prior,target)): missing_ice+=1; continue
            recent=thermal_sums(temps,shift(d,-7),shift(d,-1)); season=thermal_sums(temps,dt.date(y-1,11,1),shift(d,-1)); future=thermal_sums(temps,shift(d,1),shift(d,7))
            # Identical matched cohort for every model, including the diagnostic.
            if any(v is None for v in (recent,season,future)): missing_temp+=1; continue
            x=[now,now-prior,*recent,*season]
            out.append({'year':y,'slot':i,'current':now,'target':target,'past':x,'oracle':x+list(future)})
    return out,missing_ice,missing_temp

def fit(train,key):
    x=np.asarray([r[key] for r in train],dtype=float); y=np.asarray([r['target']-r['current']-r['seasonal'] for r in train]); mean=x.mean(axis=0); sd=x.std(axis=0); sd=np.where(sd==0,1,sd)
    a=np.column_stack([np.ones(len(x)),(x-mean)/sd]); reg=np.diag([0]+[10]*x.shape[1]); beta=np.linalg.solve(a.T@a+reg,a.T@y)
    def predict(r): return float(np.clip(r['current']+r['seasonal']+beta[0]+((np.asarray(r[key])-mean)/sd)@beta[1:],0,100))
    return predict

def block_width(errors,years):
    groups=[[abs(e) for y,e in errors if y==winter] for winter in years]
    if any(not group for group in groups): return None
    maxima=sorted(max(g) for g in groups); rank=math.ceil((len(maxima)+1)*.9)
    return maxima[rank-1] if rank<=len(maxima) else None

def evaluate(rows):
    season={}
    for slot in range(len(SLOTS)):
        a=[r['target']-r['current'] for r in rows if r['year'] in TRAIN and r['slot']==slot]
        if len(a)>=10: season[slot]=st.median(a)
    eligible=[dict(r,seasonal=season[r['slot']]) for r in rows if r['slot'] in season]
    train,cal,test=([r for r in eligible if r['year'] in group] for group in (TRAIN,CAL,EVAL))
    if not train or not cal or not test: raise ValueError('Insufficient matched cohort')
    models={'persistence':lambda r:r['current'],'seasonal':lambda r:min(100,max(0,r['current']+r['seasonal'])),'thermal':fit(train,'past'),'realizedWeatherDiagnostic':fit(train,'oracle')}
    metrics={}
    for name,predict in models.items():
        err=lambda r:predict(r)-r['target']; mae=lambda rs:st.mean(abs(err(r)) for r in rs)
        width=block_width([(r['year'],err(r)) for r in cal],CAL)
        groups=[[r for r in test if r['year']==y] for y in EVAL]
        groups=[g for g in groups if g]
        metrics[name]={'mae':mae(test),'calMAE':mae(cal),'bias':st.mean(err(r) for r in test),'halfWidth':width,'rowCoverage':None if width is None else st.mean(abs(err(r))<=width+1e-9 for r in test),'winterCoverage':None if width is None else sum(all(abs(err(r))<=width+1e-9 for r in g) for g in groups),'winVsPersistence':sum(mae(g)<st.mean(abs(r['current']-r['target']) for r in g) for g in groups)}
    return {'train':len(train),'cal':len(cal),'eval':len(test),'slots':len(season),'metrics':metrics,'canPromote':False}

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('lake',choices=LAKES);p.add_argument('temperature',type=Path);p.add_argument('ice',type=Path); p.add_argument('--out',type=Path); args=p.parse_args()
    t,i=args.temperature.read_bytes(),args.ice.read_bytes()
    if git_blob_sha(t)!=BLOBS[args.lake]: raise ValueError('Temperature full-file blob does not match pinned source')
    temps,ice=parse_temp(t),parse_ice(i); rows,mi,mt=build_cohort(temps,ice); result=evaluate(rows)
    result.update({'name':args.lake,'tempRows':len(temps),'iceRows':len(ice),'missingIce':mi,'missingTemp':mt,'source':{'temperatureBlob':git_blob_sha(t),'iceSha256':hashlib.sha256(i).hexdigest()},'kind':'retrospective-research-not-operational-forecast'})
    output=json.dumps(result,indent=2,allow_nan=False)+'\n'
    if args.out: args.out.write_text(output)
    else: print(output,end='')
if __name__=='__main__':main()
