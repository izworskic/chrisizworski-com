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

def field_diagnostics(path):
    """Show first-wave-field nearest neighbors, even when full 4-field records cannot form."""
    from eccodes import codes_grib_new_from_file,codes_grib_find_nearest,codes_get,codes_get_array,codes_release
    wanted={3:'HTSGW',4:'WVDIR',5:'WVHGT',6:'WVPER'}
    counts={k:0 for k in wanted.values()}
    preview={}
    wet_neighbors={}
    with open(path,'rb') as fp:
        while True:
            gid=codes_grib_new_from_file(fp)
            if gid is None:break
            try:
                if int(codes_get(gid,'discipline'))!=10 or int(codes_get(gid,'parameterCategory'))!=0:
                    continue
                name=wanted.get(int(codes_get(gid,'parameterNumber')))
                if name is None:continue
                counts[name]+=1
                if name in preview:continue
                if name=='HTSGW':
                    latitudes=codes_get_array(gid,'latitudes')
                    longitudes=codes_get_array(gid,'longitudes')
                    heights=codes_get_array(gid,'values')
                    for site in glwu.SITES:
                        valid=[]
                        for la,lo,h in zip(latitudes,longitudes,heights):
                            val=float(h)
                            if not 0<=val<=18:continue
                            la,lo=float(la),float(lo)
                            if lo>180:lo-=360
                            dist=glwu.km(site['lat'],site['lon'],la,lo)
                            if dist<=7:valid.append((dist,la,lo,val))
                        valid.sort(key=lambda x:x[0])
                        wet_neighbors[site['id']]={
                          'validWaveHeightCellsWithin7km':len(valid),
                          'closestValidWaveHeightCells':[
                            {'distanceKm':round(p[0],3),'lat':round(p[1],6),
                             'lon':round(p[2],6),'heightM':round(p[3],3)}
                             for p in valid[:6]
                           ],
                          'note':'HTSGW-only wet heights, not complete wave records or certified beach water'}
                out=[]
                for site in glwu.SITES:
                    points=codes_grib_find_nearest(gid,site['lat'],site['lon'],npoints=4)
                    neighbors=[]
                    for v in points:
                        num=float(v['value'])
                        lat=float(v['lat'])
                        lon=float(v['lon'])
                        if lon>180:lon-=360
                        neighbors.append({
                          'lat':round(lat,6),'lon':round(lon,6),
                          'km':round(glwu.km(site['lat'],site['lon'],lat,lon),3),
                          'value':round(num,5) if abs(num)<1e10 else 'MISSING_OR_HUGE'
                        })
                    out.append({'siteId':site['id'],'nearest4':neighbors})
                preview[name]=out
            finally:codes_release(gid)
    return {'fieldMessageCounts':counts,'firstMessageNearest4':preview,
            'firstAnalysisWaveHeightWetNeighborhood':wet_neighbors}

def diagnose_grid(day,cycle,grid):
    url=glwu.url_for(day,cycle,grid)
    with tempfile.TemporaryDirectory(prefix='rockhound-noaa-') as folder:
        dest=pathlib.Path(folder)/'subset.grib2'
        try:
            raw=glwu.retrieve(url)
            dest.write_bytes(raw)
            result=glwu.extract(dest,grid)
            diagnostics=field_diagnostics(dest)
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
        'sites':sites,'fieldDiagnostics':diagnostics,'canPredictLocalSurf':False,
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
