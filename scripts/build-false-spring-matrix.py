#!/usr/bin/env python3
"""
Python Intelligence OS v1 precomputation for /michigan-false-spring-field-guide/.
Computes a 4-zone x 8-week (Feb 15 - Apr 10) solar-elevation and thaw-phase matrix
for Michigan's late-winter transition. Outputs static verified JSON for zero-latency
frontend rendering alongside live NWS/NOAA API checks.
"""
import json
import math
from datetime import date, timedelta
from pathlib import Path

ZONES = [
    {
        "id": "southern-lower",
        "name": "Southern Lower",
        "lat": 42.2,
        "base_lag_weeks": 0.0,
        "shed_site": "jackson",
        "sap_site": "lansing",
    },
    {
        "id": "mid-michigan",
        "name": "Mid-Michigan & Bay",
        "lat": 43.6,
        "base_lag_weeks": 1.2,
        "shed_site": "bay-city",
        "sap_site": "bay-city",
    },
    {
        "id": "northern-lower",
        "name": "Northern Snowbelt",
        "lat": 44.8,
        "base_lag_weeks": 2.4,
        "shed_site": "traverse-city",
        "sap_site": "traverse-city",
    },
    {
        "id": "upper-peninsula",
        "name": "Upper Peninsula",
        "lat": 46.5,
        "base_lag_weeks": 3.8,
        "shed_site": "marquette",
        "sap_site": "marquette",
    },
]

WEEKS = [
    ("2026-02-15", "Feb 15"),
    ("2026-02-22", "Feb 22"),
    ("2026-03-01", "Mar 1"),
    ("2026-03-08", "Mar 8"),
    ("2026-03-15", "Mar 15"),
    ("2026-03-22", "Mar 22"),
    ("2026-03-29", "Mar 29"),
    ("2026-04-05", "Apr 5"),
]


def solar_noon_elevation_deg(lat_deg: float, day_of_year: int) -> float:
    """Approximate solar noon elevation angle in degrees."""
    declination = 23.44 * math.sin(math.radians((360.0 / 365.0) * (day_of_year - 81)))
    return round(90.0 - lat_deg + declination, 1)


def classify_phase(effective_week: float) -> dict:
    """Map lag-adjusted transition progress (0..8) to a field phase and AM/PM gear."""
    if effective_week < 1.3:
        return {
            "code": "deep-snow",
            "label": "Deep-Snow Holdout",
            "score": 15,
            "amGear": "Snowshoes + insulated winter boots; packed trails hold firm all day.",
            "pmGear": "Snowshoes off-trail; microspikes on groomed hardpack.",
            "sapStatus": "Dormant / too cold for sustained daytime thaw.",
            "shedStatus": "Snowpack blankets ridges; avoid disturbing deer wintering yards.",
        }
    if effective_week < 3.0:
        return {
            "code": "crust-window",
            "label": "Morning Crust & Early Sap",
            "score": 42,
            "amGear": "Steel microspikes before 10:30 AM on boilerplate trail crust.",
            "pmGear": "Snowshoes after 12:30 PM as top crust softens into slush.",
            "sapStatus": "Early freeze-thaw spikes on sunny south-facing maple edges.",
            "shedStatus": "South-facing oak benches begin melting bare; shaded woods remain covered.",
        }
    if effective_week < 5.0:
        return {
            "code": "freeze-thaw",
            "label": "Peak Freeze-Thaw & South-Slope Sheds",
            "score": 72,
            "amGear": "Microspikes for 8 AM refrozen ruts and icy creek crossings.",
            "pmGear": "Waterproof mud boots + gaiters for thawed south slopes & ag edges.",
            "sapStatus": "Prime sugarbush window (nights < 28°F, days > 40°F).",
            "shedStatus": "Optimal south-slope & hedgerow visibility as snow retreats.",
        }
    return {
        "code": "mud-breakup",
        "label": "Mud, Bare Ground & Ice-Out",
        "score": 94,
        "amGear": "Waterproof boots; watch for black ice on shaded boardwalks at dawn.",
        "pmGear": "Mud boots on paved rail-trails or dry oak ridges; stay off rutted singletrack.",
        "sapStatus": "Late-stage / winding down as overnight lows stay above freezing and buds swell.",
        "shedStatus": "Full bare-ground visibility before spring green-up.",
    }


def main() -> None:
    matrix = {"version": "1.0.0", "model": "python-intelligence-os-v1-solar-lag", "weeks": [], "zones": {}}
    for iso_str, label in WEEKS:
        d = date.fromisoformat(iso_str)
        doy = d.timetuple().tm_yday
        matrix["weeks"].append({"id": iso_str, "label": label, "dayOfYear": doy})

    for z in ZONES:
        entries = {}
        for idx, (iso_str, label) in enumerate(WEEKS):
            doy = date.fromisoformat(iso_str).timetuple().tm_yday
            solar_deg = solar_noon_elevation_deg(z["lat"], doy)
            eff = idx - z["base_lag_weeks"]
            phase = classify_phase(eff)
            entries[iso_str] = {
                "weekLabel": label,
                "solarNoonDeg": solar_deg,
                **phase,
            }
        matrix["zones"][z["id"]] = {
            "name": z["name"],
            "lat": z["lat"],
            "shedSite": z["shed_site"],
            "sapSite": z["sap_site"],
            "byWeek": entries,
        }

    out_path = Path("public/assets/false-spring-transition-matrix.json")
    out_path.write_text(json.dumps(matrix, indent=2), encoding="utf-8")
    print(f"Wrote {out_path} ({len(WEEKS)} weeks x {len(ZONES)} zones)")


if __name__ == "__main__":
    main()
