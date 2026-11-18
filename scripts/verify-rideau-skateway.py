#!/usr/bin/env python3
"""Rideau Skateway NCC official section reference audit. Offline and stdlib only.
Data owner: NCC / Open Government Licence - Canada.
No source observation is presented as current unless the independent browser
source policy validates a complete, recent provider report.
"""
import json
import math
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'data/rideau-skateway/official-sections-v1.json'
PUBLIC=ROOT/'public/assets/rideau-skateway-sections.json'
ACCESS=ROOT/'data/rideau-skateway/entrances-v1.json'
ACCESS_PUBLIC=ROOT/'public/assets/rideau-skateway-entrances.json'

def check():
    a=json.loads(SOURCE.read_text());e=json.loads(ACCESS.read_text())
    assert SOURCE.read_bytes()==PUBLIC.read_bytes()
    assert ACCESS.read_bytes()==ACCESS_PUBLIC.read_bytes()
    assert a['schemaVersion']==1 and e['schemaVersion']==1
    assert a['license']=='Open Government Licence - Canada'
    assert a['sourceLastEditUtc']=='2026-03-05T03:02:37.286Z'
    assert a['dataStatus']=='archived-2025-2026-season'
    assert len(a['sections'])==14
    assert [x['id'] for x in a['sections']]==list(range(1,15))
    assert all(x['archiveStatus']=='Closed for the Season' for x in a['sections'])
    assert all(x['km']>0 and math.isfinite(x['km']) for x in a['sections'])
    assert all(45.35<x['lat']<45.47 and -75.77<x['lon']<-75.60 for x in a['sections'])
    assert 'not entry ramps' in a['positionMeaning']
    assert len(e['entrances'])==11
    assert len({x['name'] for x in e['entrances']})==11
    assert sum(x['accessible'] for x in e['entrances'])==5
    assert all(x['googleSearch'].startswith('https://www.google.com/maps/search/?api=1&query=') for x in e['entrances'])
    assert all('not' in e['selectionMeaning'].lower() for _ in [0])
    return {'officialIceSections':14,'officialEntrances':11,'NccUniversalAccessEntries':5,
      'snapshotCurrent':False,'provider':'National Capital Commission','newForecastService':False}

if __name__=='__main__':
    print(json.dumps(check(),sort_keys=True))
