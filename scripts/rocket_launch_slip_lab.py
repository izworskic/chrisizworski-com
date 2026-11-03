#!/usr/bin/env python3
"""Python verification oracle for hypothetical rocket-launch delay forecasts.

Recomputes sky-cover scenarios independently of the Node production engine,
using only deterministic synthetic NWS-style observations. No HTTP, secrets,
external Python packages, or fictional launch probabilities.
"""
import argparse
import datetime as dt
import json
import re
import sys
import unittest

UTC=dt.timezone.utc
OFFSETS=(0,1,3,6)
SPAN=re.compile(r"^([^/]+)/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$")


def timestamp(value):
    return dt.datetime.fromisoformat(value.replace("Z","+00:00")).astimezone(UTC)


def iso(value):
    return value.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00","Z")


def interval(value):
    match=SPAN.fullmatch(value or "")
    if not match:
        return None
    try:
        start=timestamp(match[1])
        seconds=int(match[2] or 0)*86400+int(match[3] or 0)*3600+int(match[4] or 0)*60+float(match[5] or 0)
        return (start,start+dt.timedelta(seconds=seconds)) if seconds>0 else None
    except (ValueError,TypeError,OverflowError):
        return None


def cloud_at(grid,target,now):
    props=(grid or {}).get("properties") or {}
    field=props.get("skyCover") or {}
    if not isinstance(field.get("values"),list):
        return None,"missing-field"
    unit=str(field.get("uom") or "")
    if unit and "percent" not in unit.lower() and "%" not in unit:
        return None,"unexpected-units"
    try:
        updated=timestamp(props.get("updateTime",""))
    except ValueError:
        return None,"stale-grid"
    if now-updated>dt.timedelta(hours=18) or updated-now>dt.timedelta(hours=1):
        return None,"stale-grid"
    for item in field["values"]:
        time_span=interval(item.get("validTime",""))
        if not time_span or not time_span[0]<=target<time_span[1]:
            continue
        v=item.get("value")
        if v is None or isinstance(v,bool):
            return None,"missing-value"
        try:
            number=float(v)
            if not 0<=number<=100:
                return None,"invalid-value"
            return int(number+0.5),"ok"
        except (TypeError,ValueError):
            return None,"invalid-value"
    return None,"outside-grid-period"


def compare(points):
    if len(points)!=2 or any(p["cloudStatus"]!="ok" or p["risk"] in ("unknown","poor") for p in points):
        return {"state":"unknown","winner":None}
    diff=abs(points[0]["cloudCoverPercent"]-points[1]["cloudCoverPercent"])
    if diff<20:
        return {"state":"similar","winner":None}
    return {"state":"relative","winner":min(points,key=lambda p:p["cloudCoverPercent"])["id"]}


def evaluate(case):
    start,now=timestamp(case["net"]),timestamp(case["now"])
    result=[]
    for offset in OFFSETS:
        target=start+dt.timedelta(hours=offset)
        sites=[]
        for site in case["sites"]:
            if target>now+dt.timedelta(days=7) or target<now-dt.timedelta(minutes=15):
                value,status=None,"outside-horizon"
            else:
                value,status=cloud_at(site.get("grid"),target,now)
            sites.append({"id":site["id"],"cloudCoverPercent":value,
                          "cloudStatus":status,"risk":site.get("risk","good")})
        result.append({"offsetHours":offset,"targetAt":iso(target),
                       "clouds":[s["cloudCoverPercent"] for s in sites],
                       "cloudStatuses":[s["cloudStatus"] for s in sites],
                       "comparison":compare(sites)})
    return result


def grid(now,values,hours=1,updated=None):
    origin=timestamp(now)
    return {"properties":{"updateTime":updated or now,"skyCover":{
        "uom":"wmoUnit:percent",
        "values":[{"validTime":iso(origin+dt.timedelta(hours=h))+f"/PT{hours}H","value":v}
                  for h,v in values]}}}


def cases():
    now="2026-11-03T12:00:00.000Z"
    def sample(sid,values,hours=1,updated=None,risk="good"):
        return {"id":sid,"grid":grid(now,values,hours,updated),"risk":risk}
    return [
        {"id":"cloud-advantage-reversal","now":now,"net":"2026-11-03T13:00:00.000Z",
         "sites":[sample("west",[(1,20),(2,35),(4,90),(7,95)]),
                  sample("east",[(1,75),(2,55),(4,10),(7,15)])]},
        {"id":"near-tie","now":now,"net":"2026-11-03T13:00:00.000Z",
         "sites":[sample("west",[(1,30)],hours=7),sample("east",[(1,42)],hours=7)]},
        {"id":"stale-observation-veto","now":now,"net":"2026-11-03T13:00:00.000Z",
         "sites":[sample("west",[(1,10)],hours=7,updated="2026-11-02T12:00:00.000Z"),
                  sample("east",[(1,90)],hours=7)]},
        {"id":"exclusive-grid-boundary-and-missing-value","now":now,"net":"2026-11-03T13:00:00.000Z",
         "sites":[sample("west",[(1,45),(2,None)]),sample("east",[(1,50),(2,60)])]},
        {"id":"hazard-veto","now":now,"net":"2026-11-03T13:00:00.000Z",
         "sites":[sample("west",[(1,5)],hours=7,risk="poor"),
                  sample("east",[(1,80)],hours=7)]},
        {"id":"seven-day-boundary","now":now,"net":"2026-11-10T10:00:00.000Z",
         "sites":[sample("west",[(166,5)],hours=10),
                  sample("east",[(166,88)],hours=10)]}
    ]


class ScienceTests(unittest.TestCase):
    def test_interval_end_exclusive(self):
        self.assertEqual(iso(interval("2026-11-03T13:00:00Z/PT1H")[1]),
                         "2026-11-03T14:00:00.000Z")
    def test_utc_survives_fall_dst_transition(self):
        c={"now":"2026-11-01T04:30:00Z","net":"2026-11-01T05:30:00Z","sites":[]}
        self.assertEqual(evaluate(c)[1]["targetAt"],"2026-11-01T06:30:00.000Z")
    def test_reversal(self):
        v=evaluate(cases()[0])
        self.assertEqual(v[0]["comparison"]["winner"],"west")
        self.assertEqual(v[2]["comparison"]["winner"],"east")
    def test_near_tie(self):
        self.assertEqual(evaluate(cases()[1])[0]["comparison"]["state"],"similar")
    def test_stale_withholds_comparison(self):
        self.assertTrue(all(x["comparison"]["state"]=="unknown" for x in evaluate(cases()[2])))
    def test_missing_cloud_withholds_comparison(self):
        self.assertEqual(evaluate(cases()[3])[1]["comparison"]["state"],"unknown")
    def test_hazard_veto(self):
        self.assertTrue(all(x["comparison"]["state"]=="unknown" for x in evaluate(cases()[4])))
    def test_horizon_cutoff(self):
        self.assertEqual(evaluate(cases()[5])[2]["cloudStatuses"],["outside-horizon"]*2)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test",action="store_true",help="run independent Python science checks")
    parser.add_argument("--oracle",action="store_true",help="emit fixture and expected comparisons for JS parity tests")
    opts=parser.parse_args()
    if opts.test:
        result=unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(ScienceTests))
        if not result.wasSuccessful():
            return 1
    if opts.oracle:
        print(json.dumps({"version":1,"offsets":OFFSETS,
                          "cases":[{**x,"expected":evaluate(x)} for x in cases()]},
                         separators=(",",":"),sort_keys=True))
    return 0


if __name__=="__main__":
    sys.exit(main())
