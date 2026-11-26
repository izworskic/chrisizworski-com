"""Manual/offline research collector; no deployment or forecast publication.
Captures original response bytes in content-addressed storage with retrieval receipts.
Run on an Internet-enabled host. No third-party dependencies.
"""
import argparse, csv, hashlib, io, json, math, os, re, tempfile
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from xml.etree import ElementTree as ET

UTC=timezone.utc
MODELS={'lsofs':90964,'lmhofs':90806,'leofs':6106,'loofs':34395}
STATIONS={'Superior':'KDLH','Michigan':'KMKG','Huron':'KAPN','Erie':'KCLE','Ontario':'KROC'}
LAKES=('Superior','Michigan','Huron','Erie','Ontario','StClair','Total')
S3='https://noaa-nos-ofs-pds.s3.amazonaws.com/'
DAP='https://opendap.co-ops.nos.noaa.gov/thredds/dodsC/NOAA/'
ICE='https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/'
MOS='https://mesonet.agron.iastate.edu/api/1/mos.txt'
HORIZONS=(72,120)

def iso(d):return d.astimezone(UTC).isoformat().replace('+00:00','Z')
def timestamp(s):
    if not isinstance(s,str) or not s.endswith('Z'):raise ValueError('UTC timestamp required')
    return datetime.fromisoformat(s[:-1]+'+00:00')
def validate_cycle(c):
    if c.tzinfo!=UTC or c.hour!=12 or c.minute or c.second or c.microsecond:raise ValueError('only fixed 12Z daily cycle supported')
    if c.month not in (11,12,1,2,3):raise ValueError('outside frozen season')
    return c

def digest(b):return hashlib.sha256(b).hexdigest()

def write_once(path,b):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
        try:os.link(tmp,path)
        except FileExistsError:
            if path.read_bytes()!=b:raise ValueError('immutable record collision: '+str(path))
    finally:os.unlink(tmp)

def json_bytes(o):return (json.dumps(o,sort_keys=True,indent=2,allow_nan=False)+'\n').encode()

class Archive:
    def __init__(self,root,fetcher=None):self.root=Path(root);self.fetcher=fetcher or self._network;self.receipts=[]
    @staticmethod
    def _network(url,limit):
        req=Request(url,headers={'User-Agent':'GreatLakesIceResearch/1.0 (offline evidence capture)'})
        with urlopen(req,timeout=25) as response:
            b=response.read(limit+1)
            if len(b)>limit:raise ValueError('response exceeded bound')
            return b,dict(response.headers),response.status
    def read(self,url,limit=200000):
        start=datetime.now(UTC)
        try:b,headers,status=self.fetcher(url,limit)
        except HTTPError as e:
            self.receipts.append({'url':url,'started_at':iso(start),'captured_at':iso(datetime.now(UTC)),'status':e.code,'state':'UNAVAILABLE'});raise
        except Exception as e:
            self.receipts.append({'url':url,'started_at':iso(start),'captured_at':iso(datetime.now(UTC)),'state':'UNAVAILABLE','error':type(e).__name__});raise
        if not isinstance(b,bytes) or len(b)>limit or status!=200:raise ValueError('invalid source response')
        h=digest(b);write_once(self.root/'blobs'/h,b)
        self.receipts.append({'url':url,'started_at':iso(start),'captured_at':iso(datetime.now(UTC)),'status':status,'state':'CAPTURED','sha256':h,'bytes':len(b),'etag':headers.get('ETag'),'last_modified':headers.get('Last-Modified')})
        return b.decode('utf-8',errors='strict')
    def save(self,kind,identity,record):
        # Every run gets a new immutable manifest. No overwrite on retries.
        p=self.root/'manifests'/kind/identity/(datetime.now(UTC).strftime('%Y%m%dT%H%M%S.%fZ')+'-'+digest(json_bytes(record))[:12]+'.json')
        write_once(p,json_bytes(record));return p

def key_for(model,c,lead):
    validate_cycle(c)
    if model not in MODELS or lead not in HORIZONS:raise ValueError('invalid model or lead')
    return f'{model}/netcdf/{c:%Y/%m/%d}/{model}.t{c:%H}z.{c:%Y%m%d}.fields.f{lead:03d}.nc'

def parse_listing(raw,key,c,valid,now):
    root=ET.fromstring(raw);ns={'s':'http://s3.amazonaws.com/doc/2006-03-01/'}
    if root.findtext('s:IsTruncated',namespaces=ns)!='false':raise ValueError('truncated inventory')
    if root.findtext('s:Prefix',namespaces=ns)!=key:raise ValueError('wrong inventory prefix')
    obj=root.findall('s:Contents',ns)
    if len(obj)!=1 or root.findtext('s:KeyCount',namespaces=ns)!='1' or obj[0].findtext('s:Key',namespaces=ns)!=key:raise ValueError('exact object missing')
    o=obj[0];modified=timestamp(o.findtext('s:LastModified',namespaces=ns));size=int(o.findtext('s:Size',namespaces=ns));etag=o.findtext('s:ETag',namespaces=ns)
    if not c<=modified<=now or now>=valid or size<=0 or not etag:raise ValueError('late or invalid object receipt')
    return {'key':key,'object_last_modified':iso(modified),'object_bytes':size,'etag':etag,'etag_is_not_sha256':True}

def parse_schema(raw,model):
    n=MODELS[model]
    for field in (f'Float32 aice[time = 1][node = {n}]',f'Int32 wet_nodes[time = 1][node = {n}]',f'Float32 art1[node = {n}]',f'Float32 lon[node = {n}]',f'Float32 lat[node = {n}]','String Times[time = 1]'):
        if field not in raw:raise ValueError('schema changed: '+field)
    return n

def parse_vector(raw,n):
    parts=re.split(r'-{10,}\s*\n',raw,maxsplit=1)
    if len(parts)!=2:raise ValueError('invalid DAP body')
    lines=parts[1].strip().splitlines()
    if len(lines)<2:raise ValueError('missing array')
    vals=[x.strip() for x in re.sub(r'\[0\],\s*','','\n'.join(lines[1:])).replace('\n',',').split(',') if x.strip()]
    if len(vals)!=n or any(not re.fullmatch(r'[-+]?\d+(?:\.\d*)?(?:[eE][-+]?\d+)?',x) for x in vals):raise ValueError('incomplete/invalid vector')
    out=list(map(float,vals))
    if not all(map(math.isfinite,out)):raise ValueError('nonfinite vector')
    return out

def extract_physical(a,model,c,lead,chunk=8192):
    if not 1<=chunk<=8192:raise ValueError('bounded chunks required')
    valid=c+timedelta(hours=lead);now=datetime.now(UTC)
    if now>=valid:raise ValueError('cannot backdate prospective capture')
    key=key_for(model,c,lead)
    inventory=a.read(S3+'?'+urlencode({'list-type':2,'max-keys':5,'prefix':key}))
    meta=parse_listing(inventory,key,c,valid,now)
    base=f'{DAP}{model.upper()}/MODELS/{c:%Y/%m/%d}/{Path(key).name}'
    n=parse_schema(a.read(base+'.dds'),model);attrs=a.read(base+'.das')
    if 'Area of Node-Base Control volume' not in attrs or 'ice area' not in attrs:raise ValueError('metadata changed')
    t=a.read(base+'.ascii?Times');dates=re.findall(r'"(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?)"',t)
    if len(dates)!=1 or datetime.fromisoformat(dates[0]).replace(tzinfo=UTC)!=valid:raise ValueError('valid time mismatch')
    vectors={}
    for var in ('aice','wet_nodes','art1','lon','lat'):
        vv=[]
        for start in range(0,n,chunk):
            end=min(n-1,start+chunk-1);sel=f'{var}[{start}:1:{end}]' if var in ('art1','lon','lat') else f'{var}[0][{start}:1:{end}]'
            vv.extend(parse_vector(a.read(base+'.ascii?'+quote(sel,safe='')),end-start+1))
        vectors[var]=vv
    if datetime.now(UTC)>=valid:raise ValueError('capture crossed valid time')
    return {**meta,'model':model,'cycle_at':iso(c),'valid_at':iso(valid),'lead_hours':lead,'captured_at':iso(datetime.now(UTC)),**domain_summary(vectors,n),'state':'PROVISIONAL','domain_reviewed':False,'can_promote':False}

def domain_summary(v,n):
    if set(v)!= {'aice','wet_nodes','art1','lon','lat'} or any(len(x)!=n for x in v.values()):raise ValueError('missing mesh vector')
    for ice,wet,area,lon,lat in zip(v['aice'],v['wet_nodes'],v['art1'],v['lon'],v['lat']):
        if not all(map(math.isfinite,(ice,wet,area,lon,lat))) or not(0<=ice<=1 and wet in (0,1) and area>0 and -180<=lon<=360 and -90<=lat<=90):raise ValueError('invalid node')
    wet_area=math.fsum(x for x,w in zip(v['art1'],v['wet_nodes']) if w);all_area=math.fsum(v['art1'])
    if wet_area<=0 or wet_area/all_area<.99:raise ValueError('insufficient wet coverage')
    return {'node_count':n,'wet_nodes':sum(int(w) for w in v['wet_nodes']),'wet_area_fraction':wet_area/all_area,'coverage_pct':100*math.fsum(i*a for i,a,w in zip(v['aice'],v['art1'],v['wet_nodes']) if w)/wet_area,'scope':'entire model domain only; Michigan-Huron not split; mask and units unreviewed','mesh_derived_sha256':digest(json_bytes({k:v[k] for k in ('art1','lon','lat')}))}

def parse_mos(raw,c):
    validate_cycle(c);rows=csv.DictReader(io.StringIO(raw));required={'station','model','runtime','ftime','n_x','wsp'}
    if not required.issubset(rows.fieldnames or []):raise ValueError('MOS header')
    found={}
    for r in rows:
        if r['station'] not in STATIONS.values() or r['model']!='MEX' or r['runtime']!=c.strftime('%Y-%m-%d %H:%M'):raise ValueError('MOS identity mismatch')
        t=datetime.strptime(r['ftime'],'%Y-%m-%d %H:%M').replace(tzinfo=UTC);k=(r['station'],t)
        if k in found:raise ValueError('duplicate MOS row')
        found[k]=(r['n_x'],r['wsp'])
    out={}
    for lake,station in STATIONS.items():
        series=[]
        for day in range(1,8):
            pair=[]
            for h in (day*24,day*24+12):
                v=c+timedelta(hours=h);x=found.get((station,v))
                if not x or not re.fullmatch(r'-?\d+',x[0]) or not re.fullmatch(r'\d+',x[1]):raise ValueError('missing MOS value')
                t,w=map(int,x)
                if not -80<=t<=130 or not 0<=w<=100:raise ValueError('MOS value range')
                pair.append({'valid_at':iso(v),'temperature_f':t,'wind_kt':w})
            if pair[0]['temperature_f']>pair[1]['temperature_f']:raise ValueError('inverted extrema')
            series.append(pair)
        out[lake]={'station':station,'pairs':series}
    return out

def capture_mos(a,c):
    if datetime.now(UTC)>=c+timedelta(hours=72):raise ValueError('late weather forecast capture')
    q=[('station',s) for s in STATIONS.values()]+[('runtime',c.strftime('%Y-%m-%d %H:%MZ')),('model','MEX')]
    raw=a.read(MOS+'?'+urlencode(q))
    if datetime.now(UTC)>=c+timedelta(hours=72):raise ValueError('weather capture crossed earliest target')
    return {'cycle_at':iso(c),'captured_at':iso(datetime.now(UTC)),'coastal_proxy':True,'model':'MEX','lakes':parse_mos(raw,c),'state':'CAPTURED','note':'Runtime not issuance; record actual capture. Extrema pairs extend 12h after final nominal horizon; cannot be used without explicit target alignment.'}

def winter_year(d):return d.year if d.month>=11 else d.year-1

def parse_observations(raw,season,today):
    found={}
    for line in raw.splitlines():
        p=line.split()
        if len(p)<2 or not re.fullmatch(r'\d{4}',p[0]) or not re.fullmatch(r'\d{1,3}',p[1]):continue
        if len(p)!=9:raise ValueError('invalid daily data row')
        y,j=map(int,p[:2]);d=date(y,1,1)+timedelta(days=j-1)
        if j<1 or d.year!=y:raise ValueError('invalid ordinal date')
        if not date(season,11,1)<=d<=date(season+1,5,31) or d>today:raise ValueError('out-of-season/future row')
        vals=list(map(float,p[2:]));k=d.isoformat()
        if k in found or any(not math.isfinite(v) or not 0<=v<=100 for v in vals):raise ValueError('duplicate or invalid observation')
        found[k]=dict(zip(LAKES,vals))
    if not found:raise ValueError('no daily observations')
    return found

def observation_status(rows,now):
    if not rows:return {'state':'UNAVAILABLE','latest_date':None,'values':None}
    latest=max(rows);age=(now-datetime.fromisoformat(latest).replace(tzinfo=UTC)).total_seconds()/3600
    return {'state':'CURRENT_DATE_PROXY' if 0<=age<=48 else 'STALE','latest_date':latest,'age_from_utc_midnight_hours':age,'values':rows[latest] if 0<=age<=48 else None,'timestamp_precision':'calendar date; actual publication time unknown'}

def capture_observations(a,season):
    raw=a.read(ICE+f'g{season}_{season+1}_ice.dat');now=datetime.now(UTC)
    rows=parse_observations(raw,season,now.date())
    return {'captured_at':iso(now),'season':season,'status':observation_status(rows,now),'rows':rows,'publication_time_verified':False}

def run(root,c,models,inventory_only=False):
    validate_cycle(c);a=Archive(root);record={'cycle_at':iso(c),'started_at':iso(datetime.now(UTC)),'mode':'inventory_only' if inventory_only else 'field_capture','physical':[],'errors':[],'release_eligible':False}
    for m in models:
        for lead in HORIZONS:
            try:
                if inventory_only:
                    key=key_for(m,c,lead);raw=a.read(S3+'?'+urlencode({'list-type':2,'max-keys':5,'prefix':key}));meta=parse_listing(raw,key,c,c+timedelta(hours=lead),datetime.now(UTC));record['physical'].append({'model':m,'lead_hours':lead,**meta,'state':'INVENTORY_ONLY'})
                else:record['physical'].append(extract_physical(a,m,c,lead))
            except Exception as e:record['errors'].append({'model':m,'lead_hours':lead,'error':str(e)[:400]})
    try:record['mos']=capture_mos(a,c)
    except Exception as e:record['mos']={'state':'UNAVAILABLE','error':str(e)[:400]}
    try:record['observations']=capture_observations(a,winter_year(c.date()))
    except Exception as e:record['observations']={'status':{'state':'UNAVAILABLE','values':None},'error':str(e)[:400]}
    record['finished_at']=iso(datetime.now(UTC));record['receipts']=a.receipts
    record['state']='PARTIAL' if record['errors'] or record['mos']['state']!='CAPTURED' or record['observations']['status']['state']!='CURRENT_DATE_PROXY' else ('INVENTORY_ONLY' if inventory_only else 'CAPTURED_NOT_QUALIFIED')
    path=a.save('cycles',c.strftime('%Y%m%dT%HZ'),record);return path,record

def observe(root,season):
    a=Archive(root);r={'season':season,'release_eligible':False}
    try:r.update(capture_observations(a,season))
    except Exception as e:r.update({'captured_at':iso(datetime.now(UTC)),'status':{'state':'UNAVAILABLE','values':None},'error':str(e)[:400]})
    r['receipts']=a.receipts
    return a.save('observations',str(season),r),r

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('cycle',nargs='?');p.add_argument('--root',required=True);p.add_argument('--model',action='append',choices=tuple(MODELS));p.add_argument('--inventory-only',action='store_true');p.add_argument('--observe-season',type=int);args=p.parse_args()
    if args.observe_season is not None:
        if args.cycle or args.model or args.inventory_only:p.error('observation capture is independent of forecast capture')
        path,r=observe(args.root,args.observe_season);state=r['status']['state'];errors=r.get('error')
    else:
        if not args.cycle:p.error('cycle or --observe-season required')
        path,r=run(args.root,timestamp(args.cycle),args.model or list(MODELS),args.inventory_only);state=r['state'];errors=r['errors']
    print(json.dumps({'manifest':str(path),'state':state,'errors':errors},indent=2));raise SystemExit(0 if state in ('CAPTURED_NOT_QUALIFIED','CURRENT_DATE_PROXY') else 2)
