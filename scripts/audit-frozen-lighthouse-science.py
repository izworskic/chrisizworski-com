#!/usr/bin/env python3
"""Independent offline verification of Overland-based screening gates.
Not a forecast, icing observation, or additional production API.
"""
import csv
import math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def numeric(value):
    return None if value == '-' else float(value)

def evaluate(case):
    items=[numeric(case[k]) for k in ('wind','air','water','direction','axis')]
    ice=numeric(case['ice'])
    if any(x is None or not math.isfinite(x) for x in items):
        return ('unknown',None)
    wind,air,water,wind_dir,shore_dir=items
    if ice is not None and (not math.isfinite(ice) or not 0<=ice<=100):
        return ('unknown',None)
    if ice is not None and ice>=80:
        return ('suppressed',0)
    difference=abs((wind_dir-shore_dir+540)%360-180)
    if difference>55 or wind<15 or air>=32 or water>=40:
        return ('none',0)
    va=wind*.44704
    ta=(air-32)*5/9
    tw=(water-32)*5/9
    denominator=1+.3*tw
    if denominator<=0:
        return ('unknown',None)
    pr=va*(-ta)/denominator
    if pr<=0: category,base=('none',0)
    elif pr<22.4: category,base=('light',25)
    elif pr<53.3: category,base=('moderate',55)
    elif pr<83: category,base=('heavy',80)
    else: category,base=('extreme',100)
    return (category,math.floor(base*(1 if ice is None else 1-ice/100)+.5))

def main():
    with (ROOT/'benchmarks/frozen-lighthouse-physics-cases.tsv').open() as f:
        cases=list(csv.DictReader(f,delimiter='|'))
    assert len(cases)>=10
    for case in cases:
        expected=(case['category'],None if case['score']=='unknown' else int(case['score']))
        assert evaluate(case)==expected,(case['id'],evaluate(case),expected)
    for air in (5,15,25):
        for water in (33,35,39):
            outcomes=[]
            for wind in range(15,71,5):
                _,score=evaluate(dict(wind=str(wind),air=str(air),water=str(water),
                    direction='270',axis='270',ice='0'))
                outcomes.append(score)
            assert outcomes==sorted(outcomes)
    print(f'Python: {len(cases)} physics boundary cases and 9 monotonicity series passed')
    print('These tests do not verify real ice accumulation or forecast skill.')

if __name__=='__main__':
    main()
