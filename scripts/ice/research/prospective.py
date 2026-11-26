"""Bounded prospective archive and date-level outcome matching, never a forecast.
All input evidence is immutable; reconciliation is a derived, replaceable report.
"""
import argparse
import json
import re
import time as clock
from collections import defaultdict, Counter
from datetime import date, datetime, time, timedelta
from pathlib import Path
from xml.etree.ElementTree import ParseError
from urllib.parse import parse_qs, quote, urlencode, urlsplit
import collector as c

START, END, FOLLOWUP = date(2026, 11, 25), date(2027, 3, 31), date(2027, 4, 10)
DOMAINS = {'lsofs': ('Superior',), 'lmhofs': ('Michigan', 'Huron'), 'leofs': ('Erie',), 'loofs': ('Ontario',)}
OBS_URL = c.ICE + 'g2026_2027_ice.dat'
CHUNK = 2048
MAX_ARCHIVE_BYTES = 150_000_000
MAX_NEW_BYTES = 3_000_000


def cycle_for(now):
    cycle = now.replace(hour=12, minute=0, second=0, microsecond=0)
    if cycle > now:
        cycle -= timedelta(days=1)
    return cycle


def cutoff(cycle):
    # Fixed decision cutoff: within 24h of the nominal cycle. This is not the
    # model publication time. Actual capture times are retained.
    return cycle + timedelta(hours=24)


def inventory_url(model, cycle, lead):
    return c.S3 + '?' + urlencode({'list-type':2, 'max-keys':5, 'prefix':c.key_for(model,cycle,lead)})


def mos_url(cycle):
    q = [('station',s) for s in c.STATIONS.values()] + [('runtime',cycle.strftime('%Y-%m-%d %H:%MZ')),('model','MEX')]
    return c.MOS + '?' + urlencode(q)


def same_url(a, b):
    a,b = urlsplit(a),urlsplit(b)
    return (a.scheme,a.netloc,a.path,parse_qs(a.query,keep_blank_values=True)) == (b.scheme,b.netloc,b.path,parse_qs(b.query,keep_blank_values=True))


def bytes_used(root):
    return sum(p.stat().st_size for p in (root/'blobs').glob('*') if p.is_file())


def collect(root, now=None):
    """One daily capture. Inventory all domains, preserve complete Erie fields only."""
    now = now or datetime.now(c.UTC)
    cycle = cycle_for(now)
    root = Path(root)
    if now.date() < START or now.date() > FOLLOWUP:
        return {'state':'OUTSIDE_SEASON','release_eligible':False}
    budget = bytes_used(root)
    used = 0
    deadline = clock.monotonic() + 300
    def bounded(url, limit):
        nonlocal used
        remaining = min(MAX_NEW_BYTES-used, MAX_ARCHIVE_BYTES-budget-used)
        if remaining <= 0 or clock.monotonic() >= deadline: raise ValueError('archive byte/time budget exhausted')
        b,h,s = c.Archive._network(url,min(limit,remaining))
        used += len(b)
        return b,h,s
    a = c.Archive(root, bounded)
    record = {'season':2026,'started_at':c.iso(datetime.now(c.UTC)), 'cycle_at':c.iso(cycle), 'errors':[], 'physical':[], 'release_eligible':False}
    def attempt(label, f):
        try: return f()
        except Exception as e:
            record['errors'].append({'source':label,'error':str(e)[:300]})
            return None
    record['observations'] = attempt('observations', lambda:c.capture_observations(a,2026))
    if START <= cycle.date() <= END and now < cutoff(cycle):
        record['mos'] = attempt('mos', lambda:c.capture_mos(a,cycle))
        for model in DOMAINS:
            for lead in c.HORIZONS:
                def probe():
                    raw = a.read(inventory_url(model,cycle,lead))
                    return c.parse_listing(raw,c.key_for(model,cycle,lead),cycle,cycle+timedelta(hours=lead),datetime.now(c.UTC))
                meta = attempt(f'{model}:{lead}:inventory',probe)
                if meta:
                    record['physical'].append({'model':model,'lead_hours':lead,**meta,'state':'INVENTORY_ONLY'})
        for lead in c.HORIZONS:
            if datetime.now(c.UTC) >= cutoff(cycle): break
            result = attempt(f'leofs:{lead}:field',lambda:c.extract_physical(a,'leofs',cycle,lead,chunk=CHUNK))
            if result: record['physical'].append(result)
    record['finished_at'] = c.iso(datetime.now(c.UTC))
    record['receipts'] = a.receipts
    record['state'] = 'PARTIAL' if record['errors'] else 'CAPTURED_NOT_QUALIFIED'
    kind = 'cycles' if START <= cycle.date() <= END else 'observations'
    identity = cycle.strftime('%Y%m%dT%HZ') if kind == 'cycles' else '2026'
    a.save(kind,identity,record)
    return record


def verified_receipts(root, as_of):
    """Hash every referenced raw response; fail closed on corruption or future records."""
    groups=[]; quarantined=[]
    for p in sorted((root/'manifests').rglob('*.json')):
        data=json.loads(p.read_text())
        rows=[]
        for r in data.get('receipts',[]):
            state=r.get('state')
            if state not in ('CAPTURED','BODY_CAPTURED'): continue
            h=r.get('sha256','')
            status_ok = r.get('status')==200 if state=='CAPTURED' else r.get('status') is None and r.get('transport')=='connector-body'
            if not re.fullmatch(r'[0-9a-f]{64}',h) or not status_ok:
                raise ValueError('invalid source receipt: '+str(p))
            start,when=c.timestamp(r['started_at']),c.timestamp(r['captured_at'])
            if not start <= when <= as_of: raise ValueError('receipt chronology: '+str(p))
            raw=(root/'blobs'/h).read_bytes()
            if len(raw)!=r['bytes'] or c.digest(raw)!=h:
                raise ValueError('raw evidence integrity: '+h)
            try: body=raw.decode('utf-8')
            except UnicodeDecodeError:
                quarantined.append({'url':r['url'],'sha256':h,'captured_at':c.iso(when),'reason':'INVALID_UTF8'})
                continue
            rows.append((when,r['url'],h,body))
        groups.append(rows)
    return groups, quarantined


def physical_replay(group,cycle,lead):
    """Only full Erie raw fields, not compact summaries or inventory receipts."""
    base=f'{c.DAP}LEOFS/MODELS/{cycle:%Y/%m/%d}/{Path(c.key_for("leofs",cycle,lead)).name}'
    limit=cutoff(cycle)
    def get(suffix):
        rows=[x for x in group if same_url(x[1],base+suffix) and cycle<=x[0]<=limit]
        if not rows or len({x[2] for x in rows})!=1: raise ValueError('missing or conflicting field '+suffix)
        return rows[0][3]
    n=c.parse_schema(get('.dds'),'leofs')
    attrs=get('.das')
    if 'Area of Node-Base Control volume' not in attrs or 'ice area' not in attrs: raise ValueError('field metadata')
    ts=re.findall(r'"(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?)"',get('.ascii?Times'))
    if len(ts)!=1 or datetime.fromisoformat(ts[0]).replace(tzinfo=c.UTC)!=cycle+timedelta(hours=lead): raise ValueError('field valid time')
    vectors={}
    for var in ('aice','wet_nodes','art1','lon','lat'):
        values=[]
        for start in range(0,n,CHUNK):
            end=min(start+CHUNK-1,n-1)
            sel=f'{var}[{start}:1:{end}]' if var in ('art1','lon','lat') else f'{var}[0][{start}:1:{end}]'
            values.extend(c.parse_vector(get('.ascii?'+quote(sel,safe='')),end-start+1))
        vectors[var]=values
    return c.domain_summary(vectors,n)


def match_outcome(index, target, lake):
    # Date-only GLERL values are NOT exact-hour outcomes. Require capture
    # after the target UTC date ends and preserve first-seen and revisions.
    day_end=datetime.combine(target+timedelta(days=1),time(),c.UTC)
    entries=sorted(set((when,h,val) for when,h,val in index.get((target,lake),[]) if when>=day_end))
    if not entries: return None
    first=entries[0]
    by_time=defaultdict(set)
    for when,h,value in entries:
        by_time[when].add(value)
    conflicts=[c.iso(when) for when,values in sorted(by_time.items()) if len(values)>1]
    if conflicts:
        return {'state':'AMBIGUOUS','conflicting_timestamps':conflicts,'revisions':len({x[2] for x in entries})}
    changes=[x for i,x in enumerate(entries) if i==0 or x[2]!=entries[i-1][2]]
    return {'state':'DATE_MATCHED_UNQUALIFIED','first_seen_at':c.iso(first[0]),'first_value_pct':first[2], 'first_sha256':first[1], 'versions':[{'seen_at':c.iso(t),'sha256':h,'pct':v} for t,h,v in changes], 'evidence_count':len(entries), 'revised':len({x[2] for x in entries})>1,'time_precision':'calendar date, not exact-hour outcome'}


def reconcile(root,as_of=None):
    as_of=as_of or datetime.now(c.UTC); root=Path(root)
    groups,quarantined=verified_receipts(root,as_of)
    obs=defaultdict(list); receipts=len(quarantined); rejected=[]
    for group in groups:
        receipts+=len(group)
        for when,url,h,raw in group:
            if not same_url(url,OBS_URL): continue
            try: rows=c.parse_observations(raw,2026,when.date())
            except ValueError as e: rejected.append({'sha256':h,'reason':str(e)}); continue
            for day,values in rows.items():
                for lake,value in values.items(): obs[(date.fromisoformat(day),lake)].append((when,h,value))
    slots=[]
    for i in range((END-START).days+1):
        cycle=datetime.combine(START+timedelta(days=i),time(12),c.UTC)
        if cycle>as_of: candidate=[]
        else: candidate=[g for g in groups if any(cycle<=x[0]<=cutoff(cycle) for x in g)]
        mos=False
        for group in candidate:
            for when,url,h,raw in group:
                if cycle<=when<=cutoff(cycle) and same_url(url,mos_url(cycle)):
                    try: c.parse_mos(raw,cycle); mos=True
                    except (ValueError, c.csv.Error) as e:
                        issue={'url':url,'sha256':h,'captured_at':c.iso(when),'reason':'INVALID_MOS','detail':str(e)[:300]}
                        if issue not in quarantined: quarantined.append(issue)
        for model,lakes in DOMAINS.items():
            for lead in c.HORIZONS:
                valid=cycle+timedelta(hours=lead); inventory=False; fields=[]
                for group in candidate:
                    group_inventory=False
                    for when,url,h,raw in group:
                        if cycle<=when<=cutoff(cycle) and same_url(url,inventory_url(model,cycle,lead)):
                            try: c.parse_listing(raw,c.key_for(model,cycle,lead),cycle,valid,when); group_inventory=True
                            except (ValueError,TypeError,ParseError): pass
                    inventory=inventory or group_inventory
                    if group_inventory and model=='leofs':
                        try: fields.append(physical_replay(group,cycle,lead))
                        except ValueError: pass
                values={x['coverage_pct'] for x in fields}
                state='NOT_YET_DUE' if as_of<cycle else 'INVENTORY_ONLY' if inventory else 'AWAITING_CAPTURE' if as_of<=cutoff(cycle) else 'MISSING_FORECAST'
                if inventory and len(values)==1: state='PROVISIONAL_FIELD'
                elif inventory and len(values)>1: state='CONFLICTING_FIELDS'
                day_end=datetime.combine(valid.date()+timedelta(days=1),time(),c.UTC)
                outcomes={lake:match_outcome(obs,valid.date(),lake) for lake in lakes} if as_of>=day_end else {}
                slots.append({'cycle_at':c.iso(cycle),'valid_at':c.iso(valid),'decision_cutoff':c.iso(cutoff(cycle)),'model':model,'lead_hours':lead,'forecast_state':state,'mos_captured':mos,'provisional_domain_pct':next(iter(values)) if state=='PROVISIONAL_FIELD' else None,'outcome_state':'NOT_YET_DUE' if as_of<day_end else 'DATE_MATCHED_UNQUALIFIED' if outcomes and all(o and o['state']=='DATE_MATCHED_UNQUALIFIED' for o in outcomes.values()) else 'MISSING_OR_AMBIGUOUS','outcomes':outcomes,'score_eligible':False})
    return {'schema':'ice-prospective-reconciliation-v1','as_of':c.iso(as_of),'forecast_states':dict(Counter(s['forecast_state'] for s in slots)),'outcome_states':dict(Counter(s['outcome_state'] for s in slots)),'raw_receipts':receipts,'quarantined_receipts':quarantined,'rejected_observations':rejected,'slots':slots,'release_eligible':False,'scored_count':0,'reason':'Date-only outcome time, domain masks and prospective independent validation remain unqualified.'}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--collect',action='store_true');p.add_argument('--out',type=Path,required=True);args=p.parse_args()
    if args.collect: collect(args.root)
    report=reconcile(args.root);args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_bytes(c.json_bytes(report))
    print(json.dumps({k:v for k,v in report.items() if k!='slots'},indent=2))
