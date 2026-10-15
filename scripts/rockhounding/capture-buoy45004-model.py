#!/usr/bin/env python3
"""Independent offshore GLWU HTSGW sampler near NOAA NDBC buoy 45004.
Research only: does not measure surf at Agate Beach or validate collecting.
One small GRIB filter request, no paid services.
"""
import argparse
import datetime as dt
import importlib.util
import json
import math
import pathlib
import tempfile
import urllib.parse

ROOT=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location('research_glwu',ROOT/'glwu-extract.py')
glwu=importlib.util.module_from_spec(spec)
spec.loader.exec_module(glwu)
STATION={'id':'45004','name':'East Superior','lat':47.583,'lon':-86.586}
MAX_DISTANCE_KM=5.0

def model_url(day,cycle):
 if len(day)!=8 or not day.isdigit():raise ValueError('Expected YYYYMMDD')
 dt.datetime.strptime(day,'%Y%m%d')
 if cycle not in tuple(f'{i:02d}' for i in range(24)):raise ValueError('Expected hourly UTC issue')
 base=glwu.BASE
 q={'file':f'glwu.grlc_2p5km_sr.t{cycle}z.grib2',
    'var_HTSGW':'on','lev_surface':'on','subregion':'',
    'leftlon':'-86.70','rightlon':'-86.47','toplat':'47.68',
    'bottomlat':'47.49','dir':f'/glwu.{day}'}
 return base+'?'+urllib.parse.urlencode(q)

def is_valid_height(x):
 try:
  value=float(x)
 except (TypeError,ValueError):
  return False
 return math.isfinite(value) and 0<=value<=18

def select_cell(candidates):
 """Choose the nearest valid wet GRIB point; exclude 9999 and distant cells."""
 points=[]
 for c in candidates:
  lon=float(c['lon'])
  if lon>180:lon-=360
  height=float(c['value'])
  distance=glwu.km(STATION['lat'],STATION['lon'],float(c['lat']),lon)
  if is_valid_height(height) and distance<=MAX_DISTANCE_KM:
   points.append({'lat':round(float(c['lat']),6),'lon':round(lon,6),
                  'distanceKm':round(distance,3),'heightM':round(height,4)})
 return min(points,key=lambda p:(p['distanceKm'],p['lat'],p['lon'])) if points else None

def decode(path,date,cycle):
 from eccodes import codes_grib_new_from_file,codes_get,codes_grib_find_nearest,codes_release
 expected=glwu.timestamp(date,int(cycle)*100)
 found=None;observations=[];messages=0
 with open(path,'rb') as handle:
  while True:
   gid=codes_grib_new_from_file(handle)
   if gid is None:break
   try:
    if (int(codes_get(gid,'edition'))!=2 or
        int(codes_get(gid,'discipline'))!=10 or
        int(codes_get(gid,'parameterCategory'))!=0 or
        int(codes_get(gid,'parameterNumber'))!=3):continue
    messages+=1
    issue=glwu.timestamp(codes_get(gid,'dataDate'),codes_get(gid,'dataTime'))
    valid=glwu.timestamp(codes_get(gid,'validityDate'),codes_get(gid,'validityTime'))
    if issue!=expected:raise ValueError('Unexpected NOAA issue time')
    if found is None:
     neighbors=codes_grib_find_nearest(gid,STATION['lat'],STATION['lon'],npoints=4)
     found=select_cell(neighbors)
     if not found:raise ValueError('No valid HTSGW wet water cell within 5km of buoy')
    nearby=codes_grib_find_nearest(gid,found['lat'],found['lon'],npoints=1)
    if not nearby:continue
    p=nearby[0];lon=float(p['lon'])
    if lon>180:lon-=360
    distance=glwu.km(found['lat'],found['lon'],float(p['lat']),lon)
    height=p['value']
    if distance>.11 or not is_valid_height(height):continue
    if dt.datetime.fromisoformat(valid.replace('Z','+00:00'))<dt.datetime.fromisoformat(issue.replace('Z','+00:00')):continue
    observations.append({'issueAt':issue,'validAt':valid,
      'leadHours':round((dt.datetime.fromisoformat(valid.replace('Z','+00:00'))-dt.datetime.fromisoformat(issue.replace('Z','+00:00'))).total_seconds()/3600,3),
      'modelSignificantWaveHeightM':round(float(height),4),'phase':'MODEL_INITIAL' if issue==valid else 'MODEL_FORECAST'})
   finally:codes_release(gid)
 if not found or len(observations)<10:raise ValueError('Insufficient authentic valid NOAA wave fields')
 seen=set()
 for obs in observations:
  if obs['validAt'] in seen:raise ValueError('Duplicate NOAA forecast valid time')
  seen.add(obs['validAt'])
 observations.sort(key=lambda x:x['validAt'])
 return {'schemaVersion':'noaa-glwu-buoy45004-model-v1','source':'NOAA_GLWU_GRIB2',
 'station':STATION,'grid':'2p5km','parameter':'HTSGW',
 'cell':{'lat':found['lat'],'lon':found['lon'],'distanceKm':found['distanceKm']},
 'issueAt':expected,'modelRecords':observations,'messageCount':messages,
 'modelInitialIsIndependentObservation':False,
 'isAgateBeachModelCell':False,'canClaimNearshoreSurf':False,
 'canClaimRockExposure':False,'canClaimSafeShore':False}

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--date',required=True)
 parser.add_argument('--cycle',required=True)
 parser.add_argument('--output',required=True)
 args=parser.parse_args()
 url=model_url(args.date,args.cycle)
 with tempfile.TemporaryDirectory(prefix='noaa-45004-') as folder:
  source=pathlib.Path(folder)/'buoy-model.grib2'
  source.write_bytes(glwu.retrieve(url))
  result=decode(source,args.date,args.cycle)
 result['sourceUrl']=url
 dest=pathlib.Path(args.output)
 dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
 print('BUOY_45004_MODEL_CAPTURE '+json.dumps({'issueAt':result['issueAt'],
  'cell':result['cell'],'records':len(result['modelRecords']),
  'source':'NOAA_GLWU_GRIB2','output':str(dest)}))
if __name__=='__main__':
 main()
