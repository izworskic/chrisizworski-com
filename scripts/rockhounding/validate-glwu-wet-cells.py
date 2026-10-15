#!/usr/bin/env python3
"""Remote NOAA Great Lakes wave wet-cell research diagnostic.
No public forecasts, safety or rock-exposure claims. Two low-rate NOMADS queries.
"""
import argparse
import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import time

MODULE=pathlib.Path(__file__).with_name('glwu-extract.py')
spec=importlib.util.spec_from_file_location('rockhounding_glwu',MODULE)
glwu=importlib.util.module_from_spec(spec)
spec.loader.exec_module(glwu)

def diagnose_grid(day,cycle,grid):
    url=glwu.url_for(day,cycle,grid)
    with tempfile.TemporaryDirectory(prefix='rockhound-noaa-') as folder:
        dest=pathlib.Path(folder)/'subset.grib2'
        try:
            raw=glwu.retrieve(url)
            dest.write_bytes(raw)
            result=glwu.extract(dest,grid)
        except Exception as err:
            return {'grid':grid,'status':'SOURCE_OR_DECODE_FAILED',
                'failureType':type(err).__name__,'reason':str(err)[:300],
                'source':url,'canPredictLocalSurf':False}
    arr=result['records']
    sites=[]
    for site in glwu.SITES:
        rows=[r for r in arr if r['sampleTargetId']==site['id']]
        # Separate grid-cell ID / point from raw unverified shore coordinates.
        unique=sorted({r['cellId'] for r in rows})
        nearest=min(rows,key=lambda r:r['cellDistanceKm']) if rows else None
        init=[r for r in rows if r['phase']=='MODEL_ANALYSIS']
        sites.append({
            'siteId':site['id'],'researchTarget':[site['lon'],site['lat']],
            'validCompleteWaveRows':len(rows),'modelAnalysisRows':len(init),
            'wetCellIds':unique[:10],'distinctCellCount':len(unique),
            'nearestValidCell':[nearest['cellLon'],nearest['cellLat']] if nearest else None,
            'distanceToNearestValidCellKm':nearest['cellDistanceKm'] if nearest else None,
            'analysisHtsgwM':init[0]['htsgwM'] if init else None,
            'analysisWindWaveFromDeg':init[0]['windWaveFromDeg'] if init else None,
            'firstValidAt':rows[0]['validAt'] if rows else None,
            'lastValidAt':rows[-1]['validAt'] if rows else None
        })
    shared=set(sites[0]['wetCellIds'])&set(sites[1]['wetCellIds'])
    return {'grid':grid,'status':'SOURCE_DECODED' if arr else 'NO_VALID_COMPLETE_WAVE_ROWS',
        'source':url,'decodedGribBytes':len(raw),'validCompleteWaveRows':len(arr),
        'sharedWetCellIds':sorted(shared),'sameCell':bool(shared),
        'bothSitesHaveWavePoints':all(s['validCompleteWaveRows']>0 for s in sites),
        'sites':sites,'canPredictLocalSurf':False,
        'warning':'Model point is not a beach surf report. A distinct 500m grid cell does not prove harbor shelter.'}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--date',required=True)
    ap.add_argument('--cycle',required=True)
    ap.add_argument('--out',default='/tmp/rockhounding-grid-check.json')
    args=ap.parse_args()
    result={'version':'rockhounding-glwu-cell-check-v1','dateUTC':args.date,
        'cycleUTC':args.cycle,'stationPair':'Grand Marais Agate Beach / Bayshore Park',
        'archiveNotAvailableFor2026SeptemberCases':True,
        'observedEventsSource':'NDBC 45004 offshore, not local beach wave history',
        'canPublishVisitorOpportunity':False,'grids':[]}
    for grid in ('2p5km','500m-greatlakes'):
        info=diagnose_grid(args.date,args.cycle,grid)
        result['grids'].append(info)
        print('NOAA_GRID_REPORT '+json.dumps(info,sort_keys=True,ensure_ascii=True),flush=True)
        if grid=='2p5km':time.sleep(12)  # NOAA scripted request spacing
    output=pathlib.Path(args.out)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,indent=2,sort_keys=True)+'\n',encoding='utf8')
    print('NOAA_GRID_RESULT_FILE '+str(output),flush=True)
    # The job remains successful with meaningful diagnostics even if a source fails;
    # release authorization is always false and no output is incorporated automatically.
    return 0

if __name__=='__main__':
    raise SystemExit(main())
