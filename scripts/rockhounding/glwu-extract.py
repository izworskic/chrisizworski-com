#!/usr/bin/env python3
"""NOAA GLWU research sampler. Dependency: pip install eccodes.
One NOMADS regional GRIB2 request per invocation; respect 10s between requests.
Does NOT validate shore surf, legal collecting, or a safe window.
"""
import argparse
import datetime as dt
import json
import math
import pathlib
import sys
import urllib.parse
import urllib.request
from collections import defaultdict

BASE='https://nomads.ncep.noaa.gov/cgi-bin/filter_glwu.pl'
GRIDS={'2p5km':'glwu.grlc_2p5km_sr','500m-greatlakes':'glwu.grlr_500m'}
PARAMS={3:'HTSGW',4:'WVDIR',5:'WVHGT',6:'WVPER'}
SITES=(
 {'id':'grand-marais-agate','lat':46.6760,'lon':-85.9853},
 {'id':'grand-marais-harbor','lat':46.6719,'lon':-85.9839},
)
def url_for(day,cycle,grid='2p5km'):
 if len(day)!=8 or not day.isdigit():raise ValueError('Need YYYYMMDD')
 dt.datetime.strptime(day,'%Y%m%d')
 if cycle not in tuple(f'{h:02d}' for h in range(24)):raise ValueError('Need an hourly 00-23 UTC cycle')
 if grid not in GRIDS:raise ValueError('Unrecognized GLWU grid')
 q={'file':f'{GRIDS[grid]}.t{cycle}z.grib2','var_HTSGW':'on',
 'var_WVPER':'on','var_WVHGT':'on','var_WVDIR':'on','lev_surface':'on',
 'subregion':'','leftlon':'-86.20','rightlon':'-85.77','toplat':'46.87',
 'bottomlat':'46.53','dir':f'/glwu.{day}'}
 return BASE+'?'+urllib.parse.urlencode(q)
def km(a,b,c,d):
 p,q=math.radians(a),math.radians(c);dp=q-p;dl=math.radians(d-b)
 v=math.sin(dp/2)**2+math.cos(p)*math.cos(q)*math.sin(dl/2)**2
 return 12742*math.asin(min(1,math.sqrt(v)))
def timestamp(date,time):
 return dt.datetime.strptime(f'{int(date):08d}{int(time):04d}','%Y%m%d%H%M').replace(tzinfo=dt.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
def retrieve(url):
 req=urllib.request.Request(url,headers={'User-Agent':'RockhoundingResearch/0.1 (one NOAA GRIB subset)','Accept':'application/octet-stream'})
 with urllib.request.urlopen(req,timeout=35) as resp:raw=resp.read(12_000_001)
 if len(raw)>12_000_000:raise ValueError('Subset too large')
 if not raw.startswith(b'GRIB'):raise ValueError('Not GRIB2; possible unavailable file or rate limit')
 return raw
def extract(path,grid='2p5km'):
 try:
  from eccodes import codes_grib_new_from_file,codes_get,codes_grib_find_nearest,codes_release
 except ImportError as e:raise RuntimeError('pip install eccodes is required to decode GRIB2') from e
 groups=defaultdict(dict);cells=defaultdict(set)
 with open(path,'rb') as handle:
  while True:
   gid=codes_grib_new_from_file(handle)
   if gid is None:break
   try:
    if int(codes_get(gid,'edition'))!=2 or int(codes_get(gid,'discipline'))!=10 or int(codes_get(gid,'parameterCategory'))!=0:continue
    parameter=PARAMS.get(int(codes_get(gid,'parameterNumber')))
    if parameter is None:continue
    cycle=timestamp(codes_get(gid,'dataDate'),codes_get(gid,'dataTime'))
    valid=timestamp(codes_get(gid,'validityDate'),codes_get(gid,'validityTime'))
    elapsed=(dt.datetime.fromisoformat(valid.replace('Z','+00:00'))-dt.datetime.fromisoformat(cycle.replace('Z','+00:00'))).total_seconds()
    if elapsed<0 or elapsed>60*3600:continue
    for site in SITES:
     samples=codes_grib_find_nearest(gid,site['lat'],site['lon'],npoints=4)
     def valid_field_value(x):
      val=float(x['value'])
      if not math.isfinite(val):return False
      if parameter=='WVDIR':return 0<=val<360
      if parameter=='WVPER':return 0<val<=30
      return 0<=val<=18
     neighbors=[x for x in samples if valid_field_value(x) and km(site['lat'],site['lon'],float(x['lat']),float(x['lon']))<=7]
     if not neighbors:continue
     n=min(neighbors,key=lambda x:km(site['lat'],site['lon'],float(x['lat']),float(x['lon'])))
     lat=round(float(n['lat']),5)
     lon=float(n['lon'])
     if lon>180:lon-=360
     lon=round(lon,5)
     cell_id=f'glwu:{grid}:{lat:.5f}:{lon:.5f}'
     item=groups[(site['id'],valid,cell_id)]
     item.update({'source':'NOAA_GLWU','phase':'MODEL_ANALYSIS' if valid==cycle else 'MODEL_FORECAST',
       'validAt':valid,'modelCycleAt':cycle,'cellId':cell_id,'sampleTargetId':site['id'],
       'sampleTargetType':'APPROXIMATE_RESEARCH_TARGET_NOT_ENTRANCE',
       'cellLat':lat,'cellLon':lon,
       'cellDistanceKm':round(km(site['lat'],site['lon'],lat,lon),3),
       'waterSideStatus':'UNVERIFIED_NEAREST_GEOGRAPHIC_CELL_MAY_CROSS_LAND',
       'modelGridType':GRIDS[grid],'exposure':'MODEL_POINT_NOT_BEACH_WAVE'})
     item[parameter]=float(n['value']);cells[site['id']].add(cell_id)
   finally:codes_release(gid)
 records=[]
 for item in groups.values():
  if any(x not in item for x in PARAMS.values()):continue
  if not(0<=item['HTSGW']<=18 and 0<=item['WVHGT']<=18 and 0<item['WVPER']<=30):continue
  records.append({**{k:v for k,v in item.items() if k not in PARAMS.values()},
    'htsgwM':item['HTSGW'],'windWaveHeightM':item['WVHGT'],
    'windWavePeriodS':item['WVPER'],'windWaveFromDeg':item['WVDIR']%360,
    'variables':['HTSGW','WVHGT','WVPER','WVDIR']})
 records.sort(key=lambda r:(r['sampleTargetId'],r['validAt'],r['cellId']))
 bysite={s['id']:{'cellIds':sorted(cells[s['id']]),'stationResolved':len(cells[s['id']])==1} for s in SITES}
 common=set(bysite[SITES[0]['id']]['cellIds'])&set(bysite[SITES[1]['id']]['cellIds'])
 return {'schemaVersion':'glwu-research-v1','source':'NOAA_GLWU',
 'originUrl':'https://nomads.ncep.noaa.gov/gribfilter.php?ds=glwu',
 'positionsAre':'APPROXIMATE_RESEARCH_TARGETS_NOT_NAVIGATION_POINTS',
 'modelObservations':'MODEL_ANALYSIS_NOT_BUOY_OBSERVATIONS',
 'directionConvention':'WVDIR_IS_WAVE_FROM_NOT_WIND_FROM',
 'sharedCellBetweenOpenBeachAndHarbor':bool(common),
 'canInferShelteredHarborSurf':False,'canPublishSearchWindow':False,
 'gridName':grid,'verifiedShorelineWetCell':False,
 'waterSideConnectivityChecked':False,
 'siteSampleChecks':bysite,'records':records}
def main(argv=None):
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--date',required=True,help='YYYYMMDD UTC')
 ap.add_argument('--cycle',required=True,choices=tuple(f'{h:02d}' for h in range(24)))
 ap.add_argument('--grid',choices=tuple(GRIDS),default='2p5km',help='2.5 km Great Lakes or 500 m Great Lakes product; neither certifies harbor waves')
 mode=ap.add_mutually_exclusive_group(required=True)
 mode.add_argument('--grib-file')
 mode.add_argument('--download',action='store_true')
 mode.add_argument('--print-url',action='store_true')
 ap.add_argument('--output')
 args=ap.parse_args(argv);url=url_for(args.date,args.cycle,args.grid)
 if args.print_url:print(url);return 0
 if args.download:
  import tempfile
  with tempfile.TemporaryDirectory(prefix='glwu-') as directory:
   path=pathlib.Path(directory)/'subset.grib2'
   path.write_bytes(retrieve(url))
   result=extract(path,args.grid)
 else:result=extract(pathlib.Path(args.grib_file),args.grid)
 result.update({'modelCycleDate':args.date,'modelCycleHourUTC':args.cycle,
  'filterUrl':url,'retrievedAt':dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')})
 output=json.dumps(result,indent=2,sort_keys=True)+'\n'
 if args.output:pathlib.Path(args.output).write_text(output,encoding='utf8')
 else:sys.stdout.write(output)
 return 0
if __name__=='__main__':raise SystemExit(main())
