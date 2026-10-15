#!/usr/bin/env python3
"""NOAA ENC chart coastline orientation vs independent GLAHF mapped water/land.
Research only: chart sources 2004/2014, not surveyed 2026 waterline or wave
attenuation; piers are charted structures, not proof of a safe sheltered harbor.
"""
import argparse
import datetime as dt
import importlib.util
import json
import math
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

HERE=pathlib.Path(__file__).resolve().parent
PREVIOUS=HERE/'validate-grand-marais-water-side.py'
spec=importlib.util.spec_from_file_location('glahf_water_side',PREVIOUS)
glahf=importlib.util.module_from_spec(spec)
spec.loader.exec_module(glahf)
ENC='https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer'
SHORE_LAYER=84
PIER_LAYER=85
AGATE_ANCHOR=(-85.9853,46.676)
BAYSHORE_ANCHOR=(-85.9839,46.6719)
SHORE_ID=1938304
PIER_IDS=(2496904,2496908)
M_PER_DEG=111320.0
LAT_SCALE=math.cos(math.radians(AGATE_ANCHOR[1]))
NORMAL_PROBE_METERS=(120,200,350)
SOURCE_CHART='US5MI77M.000'

def url_for(layer,ids):
 if layer not in (SHORE_LAYER,PIER_LAYER) or not ids:raise ValueError('Invalid NOAA ENC research query')
 args={'objectIds':','.join(map(str,ids)),'outFields':'*',
  'outSR':'4326','returnGeometry':'true','geometryPrecision':'7','f':'geojson'}
 return ENC+'/'+str(layer)+'/query?'+urllib.parse.urlencode(args)

def fetch_enc(layer,ids,opener=urllib.request.urlopen):
 url=url_for(layer,ids)
 last=None
 for trial in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'MichiganRockhoundingResearch/1.0',
                                            'Accept':'application/geo+json, application/json'})
   with opener(req,timeout=30) as response:body=response.read(120000)
   payload=json.loads(body)
   if payload.get('type')!='FeatureCollection' or len(payload.get('features',[]))!=len(ids):
    raise ValueError('NOAA ENC feature IDs missing or returned malformed data')
   return payload
  except (ValueError,urllib.error.URLError,TimeoutError) as exc:
   last=exc
   if trial<2:time.sleep(2*(trial+1))
 raise RuntimeError('NOAA ENC shoreline data unavailable: '+str(last)[:160])

def validated_features(data,ids,layer):
 if data.get('type')!='FeatureCollection':raise ValueError('NOAA ENC response is not GeoJSON')
 seen={}
 for f in data.get('features',[]):
  ident=f.get('id')
  if ident not in ids or ident in seen:raise ValueError('Wrong NOAA feature ID')
  p=f.get('properties') or {}
  if (p.get('DSNM')!=SOURCE_CHART or p.get('SORDAT') not in ('201401','200402') or
      'Chart 14962' not in str(p.get('SORIND'))):
   raise ValueError('NOAA ENC source chart/provenance changed')
  if layer==PIER_LAYER and p.get('CATSLC')!='pier':
   raise ValueError('Selected harbor structure not chart-classified as pier')
  if f.get('geometry',{}).get('type')!='LineString':raise ValueError('Expected charted line')
  coords=f['geometry'].get('coordinates') or []
  if len(coords)<2 or len(coords)>250:
   raise ValueError('Invalid chart feature coordinate count')
  for coord in coords:
   if (len(coord)!=2 or not all(math.isfinite(float(x)) for x in coord)
       or not -86.02<coord[0]<-85.95 or not 46.65<coord[1]<46.70):
    raise ValueError('Chart geometry outside Grand Marais bounds')
  seen[ident]={'id':ident,'sourceDate':p['SORDAT'],'chart':SOURCE_CHART,
               'class':'PIER_LINE' if layer==PIER_LAYER else 'COASTLINE_LINE',
               'coordinates':coords}
 if set(seen)!=set(ids):raise ValueError('Missing NOAA ENC chart feature')
 return seen

def meters(point):
 lon,lat=point
 return ((lon-AGATE_ANCHOR[0])*M_PER_DEG*LAT_SCALE,
         (lat-AGATE_ANCHOR[1])*M_PER_DEG)

def lonlat(pt):
 x,y=pt
 return (AGATE_ANCHOR[0]+x/(M_PER_DEG*LAT_SCALE),
         AGATE_ANCHOR[1]+y/M_PER_DEG)

def closest_polyline(coords,anchor=AGATE_ANCHOR):
 xy=[meters(p) for p in coords]
 target=meters(anchor)
 chain=[0]
 for i in range(1,len(xy)):chain.append(chain[-1]+math.dist(xy[i-1],xy[i]))
 best=None
 for i in range(1,len(xy)):
  a,b=xy[i-1],xy[i]
  vx,vy=b[0]-a[0],b[1]-a[1]
  length2=vx*vx+vy*vy
  if length2==0:continue
  t=max(0,min(1,((target[0]-a[0])*vx+(target[1]-a[1])*vy)/length2))
  point=(a[0]+t*vx,a[1]+t*vy)
  d=math.dist(point,target)
  if best is None or d<best[0]:best=(d,chain[i-1]+t*math.sqrt(length2),point)
 if best is None:raise ValueError('Degenerate coastline')
 return {'distanceM':best[0],'chainM':best[1],'position':best[2],
         'chain':chain,'points':xy}

def along(coast,dist):
 xy,chain=coast['points'],coast['chain']
 dist=max(0,min(dist,chain[-1]))
 for i in range(1,len(chain)):
  if dist<=chain[i]:
   t=(dist-chain[i-1])/(chain[i]-chain[i-1]) if chain[i]>chain[i-1] else 0
   return xy[i-1][0]+t*(xy[i][0]-xy[i-1][0]),xy[i-1][1]+t*(xy[i][1]-xy[i-1][1])
 return xy[-1]

def candidate_normals(coast,half_window_m=100):
 prev=along(coast,coast['chainM']-half_window_m)
 nex=along(coast,coast['chainM']+half_window_m)
 dx,dy=nex[0]-prev[0],nex[1]-prev[1]
 if math.hypot(dx,dy)<40:raise ValueError('Insufficient NOAA coastline tangent baseline')
 tangent=(math.degrees(math.atan2(dx,dy))+360)%360
 return [(tangent+90)%360,(tangent-90)%360]

def offset(point,bearing,dist):
 theta=math.radians(bearing)
 return lonlat((point[0]+math.sin(theta)*dist,
                point[1]+math.cos(theta)*dist))

def pick_waterward(coast,classifier=glahf.classify):
 candidates=candidate_normals(coast,100)
 probed=[]
 for bearing in candidates:
  pairs=[]
  for dist in NORMAL_PROBE_METERS:
   lon,lat=offset(coast['position'],bearing,dist)
   direction=classifier(lat,lon)
   if direction not in ('LAND','WATER'):
    raise ValueError('Ambiguous independent GIS shore-normal side')
   pairs.append({'distanceM':dist,'lon':round(lon,7),'lat':round(lat,7),
                 'glahfClass':direction})
  probed.append({'bearingDeg':round(bearing,2),'sidePoints':pairs})
 classifications=[[x['glahfClass'] for x in item['sidePoints']] for item in probed]
 if sorted(classifications)!=[['LAND']*3,['WATER']*3]:
  return {'status':'INDEPENDENT_NORMAL_PROBES_CONFLICT','bearings':probed,
          'researchBearingDeg':None,'certainty':'NO_CONFIRMED_DIRECTION'}
 chosen=probed[classifications.index(['WATER']*3)]
 return {'status':'HISTORIC_CHART_NORMAL_GIS_SIDE_CORROBORATED',
         'researchBearingDeg':chosen['bearingDeg'],'bearings':probed,
         'certainty':'HISTORIC_CHART_AND_GIS_ONLY_NOT_SURVEYED_2026'}

def chart_pier_summary(pier):
 pts=pier['coordinates']
 north=max(pts,key=lambda p:p[1]);south=min(pts,key=lambda p:p[1])
 # Coordinates trace pier OUTLINES, so sums of polyline segments are not
 # surveyed centerline lengths. Only the north-south geographic extent is shown.
 return {'sourceFeatureId':pier['id'],'chartedClass':'PIER',
   'sourceDate':pier['sourceDate'],'northEnd':north,'southEnd':south,
   'northSouthSpanM':round((north[1]-south[1])*M_PER_DEG),
   'vertexCount':len(pts),'isCurrentStructuralSurvey':False}

def build_snapshot(coast,pier_data,water_side):
 if coast['distanceM']>250:raise ValueError('Agate chart shoreline too distant from approximate beach reference')
 orientation=pick_waterward(coast,water_side)
 windows={}
 for half in (55,100,175):
  a,b=candidate_normals(coast,half)
  windows[str(half)+'m']={'twoNormalsDeg':[round(a,2),round(b,2)]}
 valid_piers=[chart_pier_summary(x) for x in pier_data.values()]
 if len(valid_piers)!=2 or any(p['northSouthSpanM']<200 for p in valid_piers):
  raise ValueError('Two charted major harbor entrance piers not established')
 # Window tangent direction may reverse across NOAA source edits. Select the
 # normal closest to the independently GIS-backed 200m research bearing.
 chosen_bearing=orientation['researchBearingDeg']
 def angdiff(a,b):return abs((a-b+180)%360-180)
 water_bearings=[]
 if chosen_bearing is not None:
  for sample in windows.values():
   choices=sample['twoNormalsDeg']
   closest=min(choices,key=lambda b:angdiff(b,chosen_bearing))
   sample['waterwardStudyBearingDeg']=closest
   water_bearings.append(closest)
 # Local tangent curvature spread is NOT survey precision or a confidence CI.
 spread=(min(water_bearings),max(water_bearings)) if water_bearings else None
 return {'schemaVersion':'grand-marais-noaa-enc-geometry-v1',
  'collectedAtUTC':dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z'),
  'source':{'url':ENC,'chart':SOURCE_CHART,'harborLineLayer':PIER_LAYER,
      'coastlineLineLayer':SHORE_LAYER,'coastlineFeatureId':SHORE_ID,
      'pierFeatureIds':list(PIER_IDS),
      'sourceDates':'Charted features from 2004/2014, not field-updated shoreline',
      'independentCheck':glahf.GLAHF_LAYER,'intendedUse':'Historic model input research'},
  'agate':{'studyAnchor':{'lat':AGATE_ANCHOR[1],'lon':AGATE_ANCHOR[0]},
   'noaaChartCoastlineNearestPoint':list(map(lambda v:round(v,7),lonlat(coast['position']))),
   'studyAnchorToChartLineM':round(coast['distanceM'],1),
   'researchBearingDeg':orientation['researchBearingDeg'],
   'method':'NOAA shoreline centered 200m tangent; perpendicular normal chosen using six independent GLAHF water/land ray probes',
   'orientation':orientation,'windowNormals':windows,
   'sourceTangentWindowBearingRangeDeg':list(spread) if spread else None,
   'notASurveyedCurrentShorelineNormal':True,
   'notAValidatedBeachWaveDirection':True},
  'bayshore':{'studyAnchor':{'lat':BAYSHORE_ANCHOR[1],'lon':BAYSHORE_ANCHOR[0]},
   'entranceInfrastructureEvidence':'TWO_NOAA_CHARTED_MAJOR_PIERS',
   'chartPiers':valid_piers,'bothPiersMapped':True,
   'shelterFactor':None,'waveAttenuationPercent':None,
   'gapHydrodynamicTransmissionModeled':False,'harborBathymetryReviewed':False,
   'inletWaveRefractionEvaluated':False},
  'publicSafety':{'canPublishRockExposure':False,
    'canPublishVisitWindow':False,'canClaimSafeSurf':False,
    'canClaimHarborCalm':False,'canClaimLegalCollecting':False},
  'geometryStatus':'HISTORIC_NOAA_ENC_NORMAL_CANDIDATE_AND_TWO_CHARTED_PIERS'}
def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--out',required=True)
 args=ap.parse_args()
 coastline=validated_features(fetch_enc(SHORE_LAYER,[SHORE_ID]),[SHORE_ID],SHORE_LAYER)[SHORE_ID]
 piers=validated_features(fetch_enc(PIER_LAYER,PIER_IDS),PIER_IDS,PIER_LAYER)
 coast=closest_polyline(coastline['coordinates'])
 report=build_snapshot(coast,piers,glahf.classify)
 dest=pathlib.Path(args.out)
 dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
 print('NOAA_ENC_SHORELINE_RESULT '+json.dumps({
   'status':report['geometryStatus'],
   'nearestChartLineM':report['agate']['studyAnchorToChartLineM'],
   'bearing':report['agate']['researchBearingDeg'],
   'candidateNormal':report['agate']['orientation']['status'],
   'allGISProbes':report['agate']['orientation']['bearings'],
   'windowNormals':report['agate']['windowNormals'],
   'pierSummaries':report['bayshore']['chartPiers'],
   'noSurfClaims':not report['publicSafety']['canClaimSafeSurf']
 },separators=(',',':')),flush=True)
 if report['agate']['researchBearingDeg'] is None:raise SystemExit('NO_INDEPENDENT_SHORE_NORMAL: research remains blocked')
if __name__=='__main__':main()
