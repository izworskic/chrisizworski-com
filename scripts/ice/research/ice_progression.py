#!/usr/bin/env python3
"""Offline retrospective Great Lakes ice-cover benchmark; never a live forecast.
Input: NOAA GLERL calendar-day matrix, ice-year header, NA or percent values.
No dependency beyond Python standard library. Frozen method: 1973–2006 fit,
2007–2016 width calculation, 2017–2026 retrospective evaluation.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
import statistics as st
from pathlib import Path

YEARS = list(range(1973, 2027))
MODELS = ('persistence', 'seasonal', 'trend', 'blend')
MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split()
SLOTS = [(dt.date(2025, 12, 1) + dt.timedelta(days=7*i)) for i in range(13)]
SOURCE = 'https://www.glerl.noaa.gov/data/ice/glicd/daily/bas.txt'
PINNED_GIT_BLOB = '1abdebb4d427bc404957cdf3baf517ff5d50fa69'

def label(d):
    return f'{MONTHS[d.month-1]}-{d.day:02d}'

def dates_for(year, slot):
    d = dt.date(year-1 if slot.month == 12 else year, slot.month, slot.day)
    return [label(d + dt.timedelta(days=n)) for n in (-7,0,7)]

REQUIRED = {day for y in YEARS for s in SLOTS for day in dates_for(y,s)}

def parse(raw):
    lines = [line.split() for line in raw.decode('utf-8').splitlines() if line.strip()]
    if not lines or [int(x) for x in lines[0]] != YEARS:
        raise ValueError('Expected exact 1973–2026 ice-year header')
    rows = {}
    for row in lines[1:]:
        key = row[0]
        if key in rows or len(row) != len(YEARS)+1:
            raise ValueError(f'Duplicate or malformed row: {key}')
        if key not in {label(dt.date(2000,1,1)+dt.timedelta(days=i)) for i in range(366)}:
            raise ValueError(f'Invalid calendar label: {key}')
        values = []
        for v in row[1:]:
            if v == 'NA': values.append(None); continue
            n = float(v)
            if not math.isfinite(n) or not 0 <= n <= 100:
                raise ValueError(f'Invalid ice concentration: {key} {v}')
            values.append(n)
        rows[key] = dict(zip(YEARS, values))
    if REQUIRED - rows.keys():
        raise ValueError(f'Missing required calendar rows: {sorted(REQUIRED-rows.keys())}')
    return rows

def sample(rows, y, slot):
    values = [rows[k][y] for k in dates_for(y,slot)]
    return None if any(v is None for v in values) else values

def clip(v): return max(0., min(100., v))

def predictions(prior, current, seasonal):
    trend = current-prior
    return dict(persistence=current, seasonal=clip(current+seasonal),
                trend=clip(current+trend), blend=clip(current+.5*seasonal+.5*trend))

def metric(rows, key):
    errs = [r['errors'][key] for r in rows]
    return {'n':len(errs),'mae':st.mean(map(abs,errs)), 'bias':st.mean(errs)} if errs else {'n':0,'mae':None,'bias':None}

def block_width(rows, key, years, target=.9):
    groups = [[abs(r['errors'][key]) for r in rows if r['year']==y] for y in years]
    if any(not g for g in groups): return None
    maxima = sorted(map(max,groups))
    rank = math.ceil((len(maxima)+1)*target)
    if rank > len(maxima): return None
    return math.ceil((maxima[rank-1]-1e-9)*10)/10

def run(rows):
    calibration, evaluation, support = [], [], []
    missing = {'calibration':0,'evaluation':0}
    cal_years = range(2007,2017); eval_years = range(2017,2027)
    for slot in SLOTS:
        training = [v for y in range(1973,2007) if (v:=sample(rows,y,slot)) is not None]
        support.append({'slot':label(slot),'training_count':len(training),'eligible':len(training)>=15})
        if len(training)<15: continue
        seasonal = st.median(v[2]-v[1] for v in training)
        for name, years, records in [('calibration',cal_years,calibration),('evaluation',eval_years,evaluation)]:
            for y in years:
                v=sample(rows,y,slot)
                if v is None: missing[name]+=1; continue
                prior,current,target=v
                pred=predictions(prior,current,seasonal)
                records.append({'year':y,'slot':label(slot),'target':target,'errors':{k:p-target for k,p in pred.items()}})
    models={}
    for k in MODELS:
        width=block_width(calibration,k,cal_years)
        covered=lambda r: width is not None and abs(r['errors'][k])<=width+1e-9
        groups=[[r for r in evaluation if r['year']==y] for y in eval_years]
        models[k]={'calibration':metric(calibration,k),'evaluation':metric(evaluation,k),
                   'half_width_pp':width,'row_coverage':sum(map(covered,evaluation))/len(evaluation) if width is not None and evaluation else None,
                   'complete_observed_winter_blocks_covered':sum(bool(g) and all(map(covered,g)) for g in groups) if width is not None else None,
                   'winters_better_than_persistence':sum(metric(g,k)['mae']<metric(g,'persistence')['mae'] for g in groups if g)}
    return {'schema':'ice-progression-research-v1','fit_years':[1973,2006], 'calibration_years':[2007,2016],
            'evaluation_years':[2017,2026], 'support':support,'expected_per_evaluation_partition':130,
            'missing_after_support_gate':missing,'models':models,'can_promote_model':False,
            'limitations':['Retrospective archive, not preserved issue-time inputs; evaluation years previously inspected.',
                           'Ten calibration winter blocks; observed coverage is descriptive, not a future coverage guarantee.',
                           'Basin percent only, not lake-specific or local ice safety. Temperature is not included.']}

def self_test():
    assert dates_for(2024, SLOTS[-1])[-1]=='Mar-01'
    assert dates_for(2025, SLOTS[-1])[-1]=='Mar-02'
    assert predictions(10,20,4)==dict(persistence=20,seasonal=24,trend=30,blend=27)
    assert predictions(20,1,-10)==dict(persistence=1,seasonal=0,trend=0,blend=0)
    assert predictions(0,95,20)['blend']==100
    header=' '.join(map(str,YEARS))
    fixture='\n'.join([header]+[k+' '+' '.join(['0']*54) for k in sorted(REQUIRED)])
    rows=parse(fixture.encode())
    assert run(rows)['models']['persistence']['evaluation']['n']==130
    assert run(rows)['models']['persistence']['evaluation']['mae']==0
    rows['Jan-05'][2026]=None
    assert sample(rows,2026,SLOTS[5]) is None
    assert run(rows)['models']['persistence']['evaluation']['n']==127
    assert block_width([{'year':2020,'errors':{'persistence':1}}], 'persistence',[2020]) is None
    for broken in [fixture+'\n'+fixture.splitlines()[1],fixture.replace(' 0',' NA',1).replace(' 0',' 101',1), '\n'.join(fixture.splitlines()[:-1])]:
        try: parse(broken.encode())
        except ValueError: pass
        else: raise AssertionError('Invalid source accepted')
    print('All offline self-tests passed (synthetic fixtures).')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('archive',nargs='?',type=Path);p.add_argument('--self-test',action='store_true');p.add_argument('--out',type=Path);a=p.parse_args()
    if a.self_test: self_test()
    if not a.archive:
        if a.self_test:return
        p.error('archive required')
    raw=a.archive.read_bytes();rows=parse(raw);report=run(rows)
    blob=hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()
    report.update(source_url=SOURCE, source_sha256=hashlib.sha256(raw).hexdigest(),git_blob_sha1=blob,
                  matches_pinned_full_archive=blob==PINNED_GIT_BLOB,source_calendar_rows=len(rows),
                  input_scope='full pinned archive' if blob==PINNED_GIT_BLOB else 'unverified bytes or extracted calendar rows')
    result=json.dumps(report,indent=2,allow_nan=False)+'\n'
    if a.out:a.out.write_text(result)
    else:print(result,end='')
if __name__=='__main__':main()
