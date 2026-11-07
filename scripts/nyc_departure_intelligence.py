#!/usr/bin/env python3
"""NYC Crossing: offline, stdlib-only Python historical segment intelligence.

Official NYC DOT hourly segment means are not full-route ETAs. No invented
historical data, live traffic, prediction precision or cross-segment rankings.
"""
import argparse
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SOURCE = "https://data.cityofnewyork.us/resource/i4gi-tjb9.json"
RATE_REFERENCE = ROOT / "data/nyc-official-car-rates-2026.json"
OUTPUT = ROOT / "lib/nyc-crossing/departure-intelligence.json"
SCHEMA = "nyc-departure-evidence-v1"
# Audited NYC DOT links; never substitute GWB/PA or Mapbox routes.
LINKS = {
    "queens-midtown": ("4456510", "CROSSING_ONLY", "Toward Manhattan"),
    "hugh-carey": ("4456501", "CROSSING_ONLY", "Toward Manhattan"),
    "brooklyn": ("4616339", "APPROACH_CORRIDOR", "Toward Manhattan"),
    "manhattan": ("4616340", "APPROACH_CORRIDOR", "Toward Manhattan"),
    "rfk": ("4456452", "APPROACH_SEGMENT", "Toward Manhattan"),
    "verrazzano": ("4763652", "CROSSING_ONLY", "Staten Island to Brooklyn"),
}
BY_LINK = {value[0]: key for key, value in LINKS.items()}


def percentile(values, fraction):
    sorted_values = sorted(values)
    if not sorted_values:
        raise ValueError("Empty percentile")
    index = (len(sorted_values) - 1) * fraction
    lower = int(index)
    higher = min(lower + 1, len(sorted_values) - 1)
    return sorted_values[lower] * (higher - index) + sorted_values[higher] * (index - lower)


def normalize(rows, now):
    """Reject future/invalid rows and conflicting duplicate date-hour samples."""
    clean = {}
    invalid = duplicate = conflict = 0
    for row in rows:
        try:
            link = str(row["link_id"])
            if link not in BY_LINK:
                invalid += 1
                continue
            day = date.fromisoformat(str(row["service_date"])[:10])
            hour = int(row["hour"])
            count = int(row["sample_count"])
            seconds = float(row["mean_seconds"])
            if not (0 <= hour < 24 and 4 <= count <= 2000 and
                    math.isfinite(seconds) and 1 <= seconds < 3600 and
                    now.date() - timedelta(days=130) <= day <= now.date()):
                raise ValueError("Invalid data")
            key = (link, day, hour)
            value = (round(seconds / 60, 5), count)
            if key in clean:
                if clean[key] == value:
                    duplicate += 1
                else:
                    clean[key] = None
                    conflict += 1
            else:
                clean[key] = value
        except (KeyError, ValueError, TypeError, OverflowError):
            invalid += 1
    records = [(link, day, hour, v[0]) for (link, day, hour), v in clean.items()
               if v is not None]
    records.sort(key=lambda x: (x[1], x[0], x[2]))
    return records, {"validHourRows": len(records), "invalidRows": invalid,
                     "duplicateRows": duplicate, "conflictRows": conflict}


def day_type(day):
    return "weekend" if day.weekday() >= 5 else "weekday"


def fit_link(records, cutoff):
    training = [r for r in records if r[1] < cutoff]
    testing = [r for r in records if r[1] >= cutoff]
    if len(training) < 350 or len(testing) < 100:
        return None
    train_slots = defaultdict(list)
    test_slots = defaultdict(list)
    for _, day, hour, minutes in training:
        train_slots[(day_type(day), hour)].append(minutes)
    for _, day, hour, minutes in testing:
        test_slots[(day_type(day), hour)].append(minutes)
    naive = statistics.median(r[3] for r in training)
    comparisons = []
    slots = {}
    for key, values in train_slots.items():
        observed = test_slots.get(key, [])
        if len(values) < 8 or len(observed) < 3:
            continue
        typical = statistics.median(values)
        lower, upper = percentile(values, 0.1), percentile(values, 0.9)
        comparisons.extend((abs(actual - typical), abs(actual - naive),
                            lower <= actual <= upper) for actual in observed)
        slots[f"{key[0]}:{key[1]}"] = {
            "typicalMinutes": round(typical, 1),
            "lowerMinutes": round(lower, 1),
            "upperMinutes": round(upper, 1),
            "trainingDays": len(values),
            "holdoutDays": len(observed),
        }
    if len(comparisons) < 100 or len(slots) < 30:
        return None
    mae = statistics.mean(x[0] for x in comparisons)
    naive_mae = statistics.mean(x[1] for x in comparisons)
    coverage = statistics.mean(float(x[2]) for x in comparisons)
    gain = 1 - mae / naive_mae if naive_mae else -1
    if not (math.isfinite(gain) and gain >= 0.05 and coverage >= 0.55):
        return None
    return {
        "slots": dict(sorted(slots.items())),
        "holdout": {"observedHourRows": len(comparisons),
                    "maeMinutes": round(mae, 2),
                    "naiveMaeMinutes": round(naive_mae, 2),
                    "gainFraction": round(gain, 3),
                    "intervalCoverage": round(coverage, 3),
                    "naiveModel": "same-link all-hour training median"},
        "trainingHourRows": len(training),
    }


def build_model(rows, now):
    clean, integrity = normalize(rows, now)
    artifact = {
        "schemaVersion": SCHEMA, "state": "UNAVAILABLE",
        "generatedAt": now.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": {"url": SOURCE, "datasetId": "i4gi-tjb9",
                   "latestObservationDate": None, "ageHours": None},
        "method": {"kind": "weekday/weekend hourly medians of daily means",
                   "trainingCalendarDays": 70, "holdoutCalendarDays": 14,
                   "segmentOnly": True, "notDoorToDoor": True,
                   "notLiveForecast": True},
        "quality": integrity, "crossings": {},
        "reason": "No fresh, independently validated historical pattern.",
    }
    if not clean:
        return artifact
    latest = max(r[1] for r in clean)
    age = (now.date() - latest).days * 24
    artifact["source"].update(latestObservationDate=latest.isoformat(), ageHours=age)
    if age > 72:
        artifact["state"] = "STALE"
        artifact["reason"] = "Official archive older than 72 hours."
        return artifact
    cutoff = latest - timedelta(days=13)  # last 14 days held out
    start = cutoff - timedelta(days=70)
    eligible = [r for r in clean if start <= r[1] <= latest]
    for crossing, (link_id, scope, direction) in LINKS.items():
        samples = [r for r in eligible if r[0] == link_id]
        if not samples:
            continue
        link_latest = max(r[1] for r in samples)
        # A recently updated dataset is not proof that *this link* has recent data.
        if (latest - link_latest).days > 1:
            continue
        fitted = fit_link(samples, cutoff)
        if fitted:
            artifact["crossings"][crossing] = {
                "linkId": link_id, "scope": scope, "direction": direction,
                "latestObservationDate": link_latest.isoformat(), **fitted}
    if artifact["crossings"]:
        artifact["state"] = "AVAILABLE" if len(artifact["crossings"]) == 6 else "PARTIAL"
        artifact["reason"] = "Validated historical patterns, never door-to-door travel predictions."
    else:
        artifact["reason"] = "No link met independent holdout skill and coverage thresholds."
    return artifact


def fetch_rows(now, fetcher=urlopen):
    """Query small daily/hourly SoQL aggregates; never download raw 113M rows."""
    start = (now.date() - timedelta(days=93)).isoformat()
    end = (now.date() + timedelta(days=1)).isoformat()
    rows = []
    for crossing, (link_id, _, _) in LINKS.items():
        params = {
            "$select": ("link_id,date_trunc_ymd(data_as_of) as service_date,"
                        "date_extract_hh(data_as_of) as hour,"
                        "avg(travel_time::number) as mean_seconds,count(*) as sample_count"),
            "$where": (f"status='0' and link_id='{link_id}' and "
                       f"data_as_of between '{start}T00:00:00.000' and "
                       f"'{end}T00:00:00.000' and "
                       "travel_time::number>0 and travel_time::number<3600"),
            "$group": "link_id,service_date,hour",
            "$order": "service_date asc,hour asc", "$limit": "3000",
        }
        url = SOURCE + "?" + urlencode(params)
        response = fetcher(Request(url, headers={"Accept": "application/json",
                           "User-Agent": "chrisizworski-nyc-history/1.0"}), timeout=35)
        try:
            data = json.load(response)
        finally:
            response.close()
        if not isinstance(data, list) or len(data) >= 3000:
            raise ValueError(f"Incomplete official hourly aggregate for {crossing}")
        rows.extend(data)
    return rows


def audit_tolls(fixture=RATE_REFERENCE):
    """Dated independent official rates checked against the existing Node engine."""
    reference = json.loads(Path(fixture).read_text())
    if reference.get("schemaVersion") != "nyc-car-rate-audit-v1":
        raise ValueError("Unknown rate-reference schema")
    cases = reference["cases"]
    code = """
const {CROSSINGS,chargeFor}=require('./lib/nyc-crossing/engine');
const cases=JSON.parse(process.argv[1]);
const result=cases.map(item=>{
 const crossing=CROSSINGS.find(c=>c.id===item.crossing);
 if(!crossing) throw Error('Missing crossing '+item.crossing);
 const cost=chargeFor(crossing,{payment:item.payment,travelAt:item.travelAt,
   destinationZone:item.destinationZone,vehicle:{type:'car'}});
 return {name:item.name,toll:cost.toll,zone:cost.zone,credit:cost.credit,total:cost.total};
});
process.stdout.write(JSON.stringify(result));"""
    proc = subprocess.run(["node", "-e", code, json.dumps(cases)], cwd=ROOT,
                          capture_output=True, text=True, check=True)
    actual = json.loads(proc.stdout)
    errors = []
    for item, observed in zip(cases, actual):
        for field in ("toll", "zone", "credit", "total"):
            if observed[field] != item[field]:
                errors.append(f"{item['name']} {field}: engine {observed[field]} vs official {item[field]}")
    if errors:
        raise ValueError("Dated toll-rate contract failed:\n" + "\n".join(errors))
    return {"casesChecked": len(cases), "verifiedOn": reference["verifiedOn"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["train", "fetch-build", "audit-tolls"])
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--at", help="Timezone-aware ISO time for deterministic testing")
    args = parser.parse_args()
    if args.command == "audit-tolls":
        print(json.dumps(audit_tolls(), indent=2))
        return
    now = datetime.fromisoformat(args.at.replace("Z", "+00:00")) if args.at else datetime.now(timezone.utc)
    if not now.tzinfo:
        raise ValueError("--at must include a UTC offset")
    rows = json.loads(args.input.read_text()) if args.command == "train" else fetch_rows(now)
    model = build_model(rows, now)
    if args.command == "fetch-build" and model["state"] not in ("AVAILABLE", "PARTIAL"):
        print("No fresh validated archive; preserve existing file, runtime freshness gate applies", file=sys.stderr)
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"state": model["state"], "links": len(model["crossings"]),
                      "sourceLatest": model["source"]["latestObservationDate"]}))


if __name__ == "__main__":
    main()
