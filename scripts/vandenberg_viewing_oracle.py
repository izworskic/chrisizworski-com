#!/usr/bin/env python3
"""Independent standard-library solar/geodesic oracle for Vandenberg viewer.

All calculations are static earth/astronomy models; this is NOT a cloud or
terrain visibility model. Run --test for unit tests and --cases for JS parity.
"""
from __future__ import annotations
import datetime as dt
import json
import math
import sys
import unittest
from zoneinfo import ZoneInfo

EARTH_MILES=3958.7613
RAD=math.pi/180
ZONE=ZoneInfo("America/Los_Angeles")

def geometry(a,b):
    la1,lo1=a
    la2,lo2=b
    p1,p2=la1*RAD,la2*RAD
    dl=(lo2-lo1)*RAD
    h=math.sin((p2-p1)/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    distance=2*EARTH_MILES*math.atan2(math.sqrt(h),math.sqrt(max(0,1-h)))
    y=math.sin(dl)*math.cos(p2)
    x=math.cos(p1)*math.sin(p2)-math.sin(p1)*math.cos(p2)*math.cos(dl)
    return {"miles":round(distance,1),"bearing":round(math.degrees(math.atan2(y,x))%360)%360}

def solar_elevation(iso,lat,lon):
    time=dt.datetime.fromisoformat(iso.replace("Z","+00:00")).astimezone(dt.timezone.utc)
    jan1=dt.datetime(time.year,1,1,tzinfo=dt.timezone.utc)
    doy=(time-jan1).days+1
    utc_hours=time.hour+time.minute/60+time.second/3600
    leap=366 if (time.year%4==0 and (time.year%100!=0 or time.year%400==0)) else 365
    gamma=2*math.pi/leap*(doy-1+(utc_hours-12)/24)
    eq=229.18*(0.000075+0.001868*math.cos(gamma)-0.032077*math.sin(gamma)-
      0.014615*math.cos(2*gamma)-0.040849*math.sin(2*gamma))
    dec=(0.006918-0.399912*math.cos(gamma)+0.070257*math.sin(gamma)-
      0.006758*math.cos(2*gamma)+0.000907*math.sin(2*gamma)-
      0.002697*math.cos(3*gamma)+0.00148*math.sin(3*gamma))
    hour_angle=math.radians(((utc_hours*60+eq+4*lon)%1440)/4-180)
    phi=math.radians(lat)
    sin_alt=math.sin(phi)*math.sin(dec)+math.cos(phi)*math.cos(dec)*math.cos(hour_angle)
    return round(math.degrees(math.asin(max(-1,min(1,sin_alt)))),1)

def access(kind,iso,lat=34.689528,lon=-120.5992314):
    if iso is None:return "time-unknown"
    local=dt.datetime.fromisoformat(iso.replace("Z","+00:00")).astimezone(ZONE)
    minute=local.hour*60+local.minute
    if kind=="surf-hours" and 1050<=minute<1080:return "boundary"
    if kind=="surf-hours" and (minute<480 or minute>=1080):return "after-hours"
    if kind=="park-sunset":
        elev=solar_elevation(iso,lat,lon)
        if elev<=-2:return "after-hours"
        if elev<5:return "boundary"
    return "verify"

SITES=[
 ("ocean-park",34.6895280,-120.5992314,"park-sunset"),
 ("surf-station",34.6825853,-120.6050676,"surf-hours"),
 ("hancock",34.6793643,-120.4645477,"college"),
 ("riverbend",34.6675675,-120.4466363,"city-park"),
 ("beattie",34.6313870,-120.4430514,"city-park"),
 ("ryon",34.6377533,-120.4678383,"city-park")
]
PAD=(34.632,-120.611)
TIMES=[
 "2026-11-07T00:46:00Z", # 4:46 pm PST, nearing sunset
 "2026-11-07T03:46:00Z", # 7:46 pm PST, night
 "2026-07-07T20:00:00Z", # 1 pm PDT, summer
 "2026-03-08T17:30:00Z", # 10:30 am PDT, after DST spring-forward
 "2026-11-01T17:30:00Z"  # 9:30 am PST, DST fallback
]
def cases():
    return [{"id":name,"targetAt":time,
             "geometry":geometry((lat,lon),PAD),
             "solarElevation":solar_elevation(time,lat,lon),
             "access":access(kind,time,lat,lon)}
             for name,lat,lon,kind in SITES for time in TIMES]

class OracleTests(unittest.TestCase):
    def test_same_coordinate_zero(self):
        self.assertEqual(geometry(PAD,PAD)["miles"],0)
    def test_bearings_cardinal(self):
        self.assertEqual(geometry((34.6,-120.6),(34.7,-120.6))["bearing"],0)
        self.assertEqual(geometry((34.6,-120.6),(34.6,-120.5))["bearing"],90)
    def test_night_beach_not_public(self):
        self.assertEqual(access("surf-hours","2026-11-07T03:46:00Z"),"after-hours")
    def test_day_beach_can_be_checked(self):
        self.assertEqual(access("surf-hours","2026-11-07T17:00:00Z"),"verify")
    def test_near_closing_beach_withheld(self):
        self.assertEqual(access("surf-hours","2026-11-08T01:45:00Z"),"boundary")
    def test_sunset_boundary_withheld(self):
        self.assertEqual(access("park-sunset","2026-11-07T00:46:00Z"),"boundary")
    def test_sunset_park_closed(self):
        self.assertEqual(access("park-sunset","2026-11-07T03:46:00Z"),"after-hours")
    def test_summer_day_park_candidate(self):
        self.assertEqual(access("park-sunset","2026-07-07T20:00:00Z"),"verify")
    def test_dst_fall_back(self):
        self.assertEqual(access("surf-hours","2026-11-01T17:30:00Z"),"verify")
    def test_missing_target_never_open(self):
        self.assertEqual(access("surf-hours",None),"time-unknown")
    def test_solar_noon_above_evening(self):
        self.assertGreater(solar_elevation("2026-11-07T20:00:00Z",34.68,-120.6),
                           solar_elevation("2026-11-07T03:46:00Z",34.68,-120.6))
    def test_geometry_nonzero(self):
        self.assertGreater(geometry(SITES[0][1:3],PAD)["miles"],3)
    def test_sample_size(self):
        self.assertEqual(len(cases()),30)

def main():
    if "--cases" in sys.argv:
        print(json.dumps({"cases":cases()}))
        return 0
    if "--test" in sys.argv:
        return 0 if unittest.TextTestRunner(verbosity=2).run(
          unittest.defaultTestLoader.loadTestsFromTestCase(OracleTests)).wasSuccessful() else 1
    print("Use --test or --cases",file=sys.stderr)
    return 2

if __name__=="__main__":sys.exit(main())
