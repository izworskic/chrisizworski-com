"""Offline replay of the November 2026 issued-weather ice experiments.
Historical research, not a forecast. Python stdlib only. No network or writes.
"""
import hashlib
import json
import math
import statistics as st
from pathlib import Path

HERE = Path(__file__).resolve().parent
LAKES = ('Superior', 'Michigan', 'Huron', 'Erie', 'Ontario')
SLOTS = ('01-05', '01-12', '01-19', '01-26', '02-02', '02-09', '02-16', '02-23')
YEARS = tuple(range(2021, 2027))
INPUTS = {
    'five_lake_frozen.txt': '057cd395409ebd4ffc69b78feb6aafd6ca68370c4d2a077dbc1257ee2b52d604',
    'erie_frozen.txt': '86d74c0e16b638b6bf9460b2d95f42d7f66577593f0ed2a78f1a7d3e609d18ba',
}


def load(name):
    raw = (HERE / name).read_bytes()
    if hashlib.sha256(raw).hexdigest() != INPUTS[name]:
        raise ValueError('Frozen cohort checksum mismatch: ' + name)
    return parse(raw.decode(), name == 'erie_frozen.txt')


def parse(text, erie=False):
    expected = [(lake, y) for lake in (('Erie',) if erie else LAKES) for y in YEARS]
    lines = text.splitlines()
    if len(lines) != len(expected):
        raise ValueError('Incomplete fixed cohort')
    out = []
    for line, (lake, year) in zip(lines, expected):
        key, body = line.split('|')
        if key != f'{lake},{year}':
            raise ValueError('Unexpected or duplicate lake/winter identity')
        cells = body.split(';')
        if len(cells) != len(SLOTS):
            raise ValueError('Incomplete winter')
        for slot, cell in zip(SLOTS, cells):
            v = [float(x) for x in cell.split(',')]
            if len(v) != (12 if erie else 7) or not all(math.isfinite(x) for x in v):
                raise ValueError('Invalid field count or nonfinite value')
            if not all(0 <= x <= 100 for x in v[:3]):
                raise ValueError('Ice observation outside 0–100%')
            r = dict(lake=lake, year=year, slot=slot, prior=v[0], base=v[1], target=v[2])
            if erie:
                if not all(-80 <= x <= 130 for x in v[3:10]) or not all(0 <= x <= 100 for x in v[10:]):
                    raise ValueError('Invalid forecast or shorter target')
                r.update(temps=v[3:10], targets={3:v[10], 5:v[11], 7:v[2]})
            else:
                cold, warm, wind, water = v[3:]
                if not (0 <= cold <= 784 and 0 <= warm <= 686 and cold + warm <= 784 and 0 <= wind <= 1400 and -1 <= water <= 35):
                    raise ValueError('Invalid weather proxy')
                r.update(cold=cold*5/9, warm=warm*5/9, wind=wind/14, water_c=water)
            out.append(r)
    return out


def clip(v):
    return min(100, max(0, v))


def features(r):
    return r['cold']*(1-r['base']/100), -r['warm']*r['base']/100


def fit(rows):
    # Original two-variable nonnegative least squares, enumerating active sets.
    x = [features(r) for r in rows]
    y = [r['target']-r['base'] for r in rows]
    a = sum(u*u for u,v in x); b = sum(u*v for u,v in x); c = sum(v*v for u,v in x)
    p = sum(u*z for (u,v),z in zip(x,y)); q = sum(v*z for (u,v),z in zip(x,y)); det = a*c-b*b
    candidates = [(0.,0.)]
    if a > 0: candidates.append((max(0,p/a),0.))
    if c > 0: candidates.append((0.,max(0,q/c)))
    if det > 1e-12:
        both = ((p*c-q*b)/det,(q*a-p*b)/det)
        if min(both) >= 0: candidates.append(both)
    return min(candidates,key=lambda w:sum((w[0]*u+w[1]*v-z)**2 for (u,v),z in zip(x,y)))


def correction(train, base_pred, keys):
    # Training-only standardized residual ridge with fixed penalty 10.
    mu = [st.mean(r[k] for r in train) for k in keys]
    sd = [st.pstdev(r[k] for r in train) or 1. for k in keys]
    def vec(r): return [(r[k]-m)/s for k,m,s in zip(keys,mu,sd)]
    x = [vec(r) for r in train]; y = [r['target']-base_pred(r) for r in train]; n = len(keys)
    a = [[sum(v[i]*v[j] for v in x)+(10 if i==j else 0) for j in range(n)]+[sum(v[i]*z for v,z in zip(x,y))] for i in range(n)]
    for i in range(n):
        z = max(range(i,n),key=lambda j:abs(a[j][i])); a[i],a[z] = a[z],a[i]; v=a[i][i]; a[i]=[q/v for q in a[i]]
        for j in range(n):
            if j!=i:
                v=a[j][i]; a[j]=[q-v*w for q,w in zip(a[j],a[i])]
    beta = [r[-1] for r in a]
    return lambda r:clip(base_pred(r)+sum(b*x for b,x in zip(beta,vec(r))))


def score(errors):
    return dict(n=len(errors), mae_pp=st.mean(map(abs,errors)), bias_pp=st.mean(errors), rmse_pp=math.sqrt(st.mean(x*x for x in errors)))


def evaluate(rows, extra=False):
    tr = [r for r in rows if r['year'] <= 2023]
    ca = [r for r in rows if r['year'] == 2024]
    te = [r for r in rows if r['year'] >= 2025]
    if (len(tr),len(ca),len(te)) != (24,8,16):
        raise ValueError('Unexpected fixed split')
    w = fit(tr)
    seasonal = {s:st.median(r['target']-r['base'] for r in tr if r['slot']==s) for s in SLOTS}
    thermal = lambda r:clip(r['base']+sum(a*b for a,b in zip(w,features(r))))
    models = {'persistence':lambda r:r['base'], 'seasonal':lambda r:clip(r['base']+seasonal[r['slot']]), 'recent_trend':lambda r:clip(2*r['base']-r['prior']), 'thermal':thermal}
    if extra:
        models.update(thermal_wind=correction(tr,thermal,['wind']),thermal_water_diagnostic=correction(tr,thermal,['water_c']),thermal_wind_water_diagnostic=correction(tr,thermal,['wind','water_c']))
    errors = {k:[p(r)-r['target'] for r in te] for k,p in models.items()}
    metrics = {k:{'training':score([p(r)-r['target'] for r in tr]),'calibration_diagnostic':score([p(r)-r['target'] for r in ca]),'evaluation':score(errors[k]),'evaluation_by_winter':{str(y):score([p(r)-r['target'] for r in te if r['year']==y]) for y in (2025,2026)}} for k,p in models.items()}
    return {'coefficients':w, 'models':metrics}, errors


def run():
    five = load('five_lake_frozen.txt'); erie = load('erie_frozen.txt')
    lakes = {}; totals = {}; horizons = {}
    for lake in LAKES:
        lakes[lake], errors = evaluate([r for r in five if r['lake']==lake],True)
        for k,e in errors.items(): totals.setdefault(k,[]).extend(e)
    for h in (3,5,7):
        rows = [dict(r,target=r['targets'][h],cold=sum(max(0,32-v) for v in r['temps'][:h])*5/9,warm=sum(max(0,v-32) for v in r['temps'][:h])*5/9) for r in erie]
        horizons[str(h)], _ = evaluate(rows)
    return {'scope':'Retrospective diagnostic; not issue-time authenticated. Already examined evaluation winters.', 'counts':{'five_lake_records':len(five),'erie_records':len(erie),'five_lake_evaluation':80,'erie_evaluation_per_horizon':16}, 'lakes':lakes,'pooled_equal_lake_week':{k:score(e) for k,e in totals.items()},'erie_horizons':horizons,'can_promote':False,'interval_eligible':False}


if __name__=='__main__':
    print(json.dumps(run(),indent=2,allow_nan=False))
