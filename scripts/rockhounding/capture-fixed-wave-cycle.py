#!/usr/bin/env python3
"""Capture exactly one anchored NOAA 500m Great Lakes model cycle for durable research.
One bounded NOMADS request. No forecast or weather safety statements.
"""
import argparse
import datetime as dt
import importlib.util
import json
import pathlib
import tempfile

HERE=pathlib.Path(__file__).parent
def import_script(name,alias):
 spec=importlib.util.spec_from_file_location(alias,HERE/name)
 module=importlib.util.module_from_spec(spec)
 spec.loader.exec_module(module)
 return module
glwu=import_script('glwu-extract.py','rockhounding_grid_cycle')
cell_research=import_script('wave-cell-research.py','rockhounding_cell_cycle')
ANCHOR=(46.680000,-85.984978)
GRID='500m-greatlakes'

def capture(day,cycle):
 url=glwu.url_for(day,cycle,GRID)
 with tempfile.TemporaryDirectory(prefix='rockhounding-cycle-') as directory:
  path=pathlib.Path(directory)/'wave.grib2'
  raw=glwu.retrieve(url)
  path.write_bytes(raw)
  cell=cell_research.analyze_fixed_open_cell(path,GRID,required_cell=ANCHOR)
 if cell['status']!='FIXED_NORTH_SECTOR_FOUR_FIELDS_AVAILABLE':
  raise ValueError('ANCHORED_CELL_UNAVAILABLE '+str(cell.get('status')))
 selected=cell['selected']
 if abs(selected['lat']-ANCHOR[0])>0.00001 or abs(selected['lon']-ANCHOR[1])>0.00001:
  raise ValueError('SOURCE_CHANGED_FIXED_CELL')
 expected=glwu.timestamp(day,int(cycle)*100)
 if cell['cyclesUTC']!=[expected]:raise ValueError('NOAA_CYCLE_MISMATCH')
 rows=[]
 for r in cell['sampledSeries']:
  if r['cycleAt']!=expected:raise ValueError('INCONSISTENT_ISSUE_TIME')
  rows.append({'source':'NOAA_GLWU','phase':r['phase'],
   'validAt':r['validAt'],'modelCycleAt':r['cycleAt'],
   'cellId':f'glwu:{GRID}:{selected["lat"]:.5f}:{selected["lon"]:.5f}',
   'sampleTargetId':'grand-marais-agate',
   'htsgwM':r['htsgwM'],'windWaveHeightM':r['windWaveHeightM'],
   'windWavePeriodS':r['windWavePeriodS'],
   'windWaveFromDeg':r['waveFromDeg'],
   'variables':['HTSGW','WVHGT','WVPER','WVDIR'],
   'siteValidity':'RESEARCH_NORTH_HALF_PLANE_NOT_SURF_CERTIFIED'})
 if len(rows)<20 or len([r for r in rows if r['phase']=='MODEL_ANALYSIS'])!=1:
  raise ValueError('INSUFFICIENT_OR_NO_INITIAL_WAVE_FIELDS')
 return {'schemaVersion':'rockhounding-glwu-cycle-evidence-v1',
  'sourceRun':'NOAA_NOMADS_DIRECT_GRIB2','capturedDate':day,
  'source':'NOAA_NOMADS_GLWU_ORIGINAL_GRIB2','researchOnly':True,
  'canPublishBeachWaveForecast':False,'canClaimSafeShore':False,
  'canClaimFreshExposedStones':False,'harbor':'NOT_RESOLVED',
  'beachWaterConnectivityValidated':False,
  'datasets':[{'grid':GRID,'file':f'glwu.grlr_500m.t{cycle}z.grib2',
    'modelCycleAt':expected,'sourceUrl':url,'cell':selected,
    'selectionRule':'PERSISTENT_EXACT_FIXED_MODEL_CELL',
    'cellStatus':'NORTH_HALF_PLANE_PROXY_NOT_VERIFIED_WATER_CONNECTIVITY',
    'validFourFieldTimestamps':len(rows),
    'analysisInitialFieldCount':1,'forecastTimestampCount':len(rows)-1,
    'records':rows}]}

def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--date',required=True,help='YYYYMMDD UTC')
 ap.add_argument('--cycle',required=True,choices=('00','06','12','18'))
 ap.add_argument('--output',required=True)
 args=ap.parse_args()
 snapshot=capture(args.date,args.cycle)
 output=pathlib.Path(args.output)
 output.parent.mkdir(parents=True,exist_ok=True)
 output.write_text(json.dumps(snapshot,indent=2)+'\n',encoding='utf-8')
 print('ROCKHOUNDING_NOAA_CAPTURE '+json.dumps({'issueAt':snapshot['datasets'][0]['modelCycleAt'],
  'records':snapshot['datasets'][0]['validFourFieldTimestamps'],
  'fixedCellId':snapshot['datasets'][0]['records'][0]['cellId'],
  'canPublishBeachWaveForecast':False,'output':str(output)}))
if __name__=='__main__':
 main()
