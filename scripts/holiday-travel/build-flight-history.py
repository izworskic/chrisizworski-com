#!/usr/bin/env python3
"""Build the Holiday Travel "Will I make it?" dataset from BTS flight-level records.

Inputs (run manually; the generated JSON is committed so Vercel never needs Python):
  1. A directory with the BTS "Reporting Carrier On-Time Performance (1987-present)" monthly zips
     for November and December of every season in SEASONS:
     https://www.transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_YYYY_M.zip
  2. OurAirports airports.csv (public domain) for airport coordinates, used by the live NWS check:
     https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv

  python3 -I scripts/holiday-travel/build-flight-history.py <zip dir> <airports.csv> [--out public/holiday-travel/data]

Outputs:
  national.json         holiday surfaces per season, airport list + factors + coordinates, route adjacency
  routes/<ORIGIN>.json  per-route factor, schedule shape, carriers and stranding (recovery) curves

Method (details in docs/HOLIDAY_TRAVEL_DATA.md):
  * Window: 6 days either side of Thanksgiving Thursday and of Dec 25.
  * National surfaces per season, holiday-relative day and scheduled departure band:
      cd  = share cancelled or diverted (needs rebooking)
      sop = share that operated AND arrived more than x minutes late, for x in XGRID
  * Origin-airport factor per holiday and time group, then a pooled route residual, both measured on
    "arrival trouble" (cancelled, diverted, or arrived 60+ minutes late) and shrunk toward 1.0.
  * Stranding: for every flight, if it had been cancelled, how late would you arrive on the second
    later operated flight of the same airline on the same route (the first is often full at the
    holidays)? Stored as a survival curve per route and time group, plus the overnight share.
  * First flight of the day: aircraft (tail number) sequences per day give whether a departure was
    that plane's first trip of the day.
"""
import argparse, csv, datetime as dt, glob, json, os, sys, zipfile
import numpy as np
import pandas as pd

SEASONS = [2018, 2019, 2022, 2023, 2024, 2025]  # 2020-2021 excluded: pandemic-distorted schedules
OFFSETS = list(range(-6, 7))
PAD = 2  # extra days loaded each side so rebooking after a day-6 cancellation can be measured
BAND_EDGES = [5, 8, 11, 14, 17, 20]
BAND_LABELS = ["5–8 AM", "8–11 AM", "11 AM–2 PM", "2–5 PM", "5–8 PM", "8 PM–5 AM"]
BAND_GROUP = [0, 0, 1, 1, 2, 2]
XGRID = [0, 15, 30, 60, 90, 120, 180, 240, 360, 480, 720, 1080, 1440]  # minutes of arrival delay
HGRID = [1, 2, 3, 4, 6, 9, 12, 18, 24, 36, 48]  # hours of rebooking delay
REC_CAP_H = 72.0
REC_SCALE_MIN, REC_SCALE_MAX = 0.5, 6.0
MIN_ROUTE_FLIGHTS = 300
K_AIRPORT, K_ROUTE = 25.0, 15.0
F_MIN, F_MAX = 0.3, 3.5
SCALE = 10000  # probabilities stored as integers per 10,000
COLS = ["FlightDate", "Reporting_Airline", "Tail_Number", "Origin", "OriginCityName", "Dest", "DestCityName",
        "CRSDepTime", "DepDelay", "CRSArrTime", "ArrDelay", "Cancelled", "Diverted"]


def thanksgiving(year):
    d = dt.date(year, 11, 1)
    d += dt.timedelta(days=(3 - d.weekday()) % 7)
    return d + dt.timedelta(days=21)


def anchors(year):
    return {"th": thanksgiving(year), "xm": dt.date(year, 12, 25)}


def band_of(hour):
    return np.select([(hour >= e) & (hour < n) for e, n in zip(BAND_EDGES[:-1], BAND_EDGES[1:])], range(5), 5)


def load(raw_dir):
    parts, files = [], []
    for season in SEASONS:
        months = []
        for month in (11, 12):
            found = glob.glob(os.path.join(raw_dir, f"*Performance_1987_present_{season}_{month}.zip"))
            if len(found) != 1:
                sys.exit(f"Expected exactly one file for {season}-{month}, found {found}")
            z = zipfile.ZipFile(found[0])
            name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
            d = pd.read_csv(z.open(name), usecols=COLS, low_memory=False)
            d["FlightDate"] = pd.to_datetime(d["FlightDate"])
            months.append(d)
            files.append(os.path.basename(found[0]))
        d = pd.concat(months, ignore_index=True)
        for hol, anchor in anchors(season).items():
            a = pd.Timestamp(anchor)
            s = d[(d.FlightDate >= a - pd.Timedelta(days=6 + PAD)) & (d.FlightDate <= a + pd.Timedelta(days=6 + PAD))].copy()
            s["off"] = (s.FlightDate - a).dt.days.astype("int16")
            s["hol"], s["season"] = hol, season
            parts.append(s)
    return pd.concat(parts, ignore_index=True), files


def prepare(w):
    w["cd"] = (w.Cancelled.fillna(0).astype(int) == 1) | (w.Diverted.fillna(0).astype(int) == 1)
    w["arr"] = w.ArrDelay.where(~w.cd)
    w.loc[~w.cd & w.arr.isna(), "arr"] = 0.0
    w["trouble"] = w.cd | (w.arr >= 60)
    dep_min = (w.CRSDepTime // 100) * 60 + w.CRSDepTime % 100
    arr_min = (w.CRSArrTime // 100) * 60 + w.CRSArrTime % 100
    w["dep_min"] = dep_min.astype("int32")
    shift = arr_min - dep_min
    shift = shift.where(shift > -360, shift + 1440)  # overnight arrivals
    w["shift"] = shift.astype("int32")  # local arrival clock minus local departure clock
    w["band"] = band_of((w.CRSDepTime // 100).astype(int)).astype("int8")
    w["grp"] = w.band.map(lambda b: BAND_GROUP[b]).astype("int8")
    w["inwin"] = w.off.between(-6, 6)
    return w


def national(win):
    out = {}
    for hol in ("th", "xm"):
        h = win[win.hol == hol]
        seasons_out = []
        for season in SEASONS:
            s = h[h.season == season]
            cd = np.zeros((13, 6), dtype=int)
            sop = np.zeros((13, 6, len(XGRID)), dtype=int)
            n = np.zeros((13, 6), dtype=int)
            for (off, band), g in s.groupby(["off", "band"]):
                i = off + 6
                n[i, band] = len(g)
                cd[i, band] = round(g.cd.mean() * SCALE)
                a = g.arr.values
                op = ~g.cd.values
                sop[i, band] = [round(((a > x) & op).mean() * SCALE) for x in XGRID]
            seasons_out.append({"season": season, "n": n.tolist(), "cd": cd.tolist(), "sop": sop.tolist()})
        out[hol] = {"anchors": {str(s): anchors(s)[hol].isoformat() for s in SEASONS}, "seasons": seasons_out}
    return out


def expected_trouble(win):
    """Per-flight expected 'trouble' probability from the season-averaged national surface."""
    rate = win.groupby(["hol", "season", "off", "band"]).trouble.mean().groupby(["hol", "off", "band"]).mean().rename("exp")
    return win.join(rate, on=["hol", "off", "band"])["exp"]


def shrink(o, e, k):
    return float(min(F_MAX, max(F_MIN, (o + k) / (e + k))))


def recovery(full):
    """For each flight: hours late you would arrive if it were cancelled.

    optimistic: the next later operated flight of the same airline on the same route.
    realistic:  holiday flights are nearly full, so you queue behind everyone already displaced.
                You need the (2 + q)-th later operated flight, where q is the number of flights on the
                same airline and route cancelled in the 24 hours before yours (each one's passengers
                use up roughly one later flight's spare seats). On a meltdown day q is large, which
                is what stranded travelers for days in December 2022. Capped at REC_CAP_H.
    """
    f = full.sort_values(["Reporting_Airline", "Origin", "Dest", "hol", "season", "FlightDate", "dep_min"]).reset_index(drop=True)
    key = f.Reporting_Airline + f.Origin + f.Dest + f.hol + f.season.astype(str)
    g = pd.factorize(key)[0].astype(np.int64)
    t = ((f.FlightDate - pd.Timestamp("2000-01-01")).dt.days.values * 1440 + f.dep_min.values).astype(np.int64)
    canc = f.cd.values.astype(np.int64)
    op = 1 - canc
    n = len(f)
    cpre = np.concatenate([[0], np.cumsum(canc)])  # cancelled rows in [0, k)
    opre = np.concatenate([[0], np.cumsum(op)])  # operated rows in [0, k)
    big = np.int64(10 ** 8)
    sk = g * big + t
    j0 = np.searchsorted(sk, g * big + t - 1440, side="right")
    idx = np.arange(n)
    q = cpre[idx] - cpre[j0]

    def nth_operated_after(k):
        target = opre[idx + 1] + k
        j = np.searchsorted(opre, target, side="left") - 1
        valid = (j < n) & (j > idx)
        jj = np.where(valid, j, 0)
        valid &= g[jj] == g
        return np.where(valid, jj, -1)

    def late_hours(j):
        h = np.full(n, REC_CAP_H)
        m = j >= 0
        jj = j[m]
        h[m] = np.minimum(REC_CAP_H, (t[jj] - t[m] + np.maximum(0, f.arr.values[jj])) / 60.0)
        return h

    first = nth_operated_after(np.ones(n, dtype=np.int64))
    queued = nth_operated_after(2 + q)
    f["rec_opt"] = late_hours(first)
    f["rec_real"] = late_hours(queued)
    f["queue"] = q
    day_of = (f.FlightDate - pd.Timestamp("2000-01-01")).dt.days.values
    f["overnight"] = np.where(queued >= 0, day_of[np.maximum(queued, 0)] > day_of, True)
    return f


def first_leg(full):
    f = full[full.Tail_Number.notna()].sort_values(["Tail_Number", "FlightDate", "dep_min"])
    leg = f.groupby(["Tail_Number", "FlightDate"]).cumcount()
    return pd.Series(leg.values == 0, index=f.index).reindex(full.index)


COORD_OVERRIDES = {"PBI": (26.6832, -80.0956)}  # Palm Beach Intl: missing an IATA code in OurAirports at build time


def airport_coords(path):
    coords = dict(COORD_OVERRIDES)
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            code = r.get("iata_code") or ""
            if len(code) == 3 and r["type"] in ("large_airport", "medium_airport", "small_airport") and r["iso_country"] in ("US", "PR", "VI", "GU", "AS", "MP"):
                if code not in COORD_OVERRIDES and (code not in coords or r["type"] == "large_airport"):
                    coords[code] = (round(float(r["latitude_deg"]), 4), round(float(r["longitude_deg"]), 4))
    return coords


def build(raw_dir, airports_csv, out_dir):
    full, files = load(raw_dir)
    full = prepare(full)
    full["first"] = first_leg(full)
    full = recovery(full)
    win = full[full.inwin].copy()
    win["exp"] = expected_trouble(win).values

    # routes that qualify
    rc = win.groupby(["Origin", "Dest"]).size()
    routes = rc[rc >= MIN_ROUTE_FLIGHTS]
    route_set = set(routes.index)
    codes = sorted(set(o for o, _ in route_set) | set(d for _, d in route_set))
    coords = airport_coords(airports_csv)
    missing = [c for c in codes if c not in coords]
    if missing:
        print("warning: no coordinates for", missing)

    # airport factors (origin, holiday, time group) on arrival trouble
    af = win.groupby(["Origin", "hol", "grp"]).agg(o=("trouble", "sum"), e=("exp", "sum"))
    def a_factor(code, hol, g):
        try:
            r = af.loc[(code, hol, g)]
            return shrink(r.o, r.e, K_AIRPORT)
        except KeyError:
            return 1.0
    afac_map = {(c, h, g): a_factor(c, h, g) for c in codes for h in ("th", "xm") for g in range(3)}
    win["afac"] = [afac_map.get((o, h, g), 1.0) for o, h, g in zip(win.Origin, win.hol, win.grp)]
    win["exp_a"] = np.minimum(0.95, win.exp * win.afac)

    # first-flight-of-day stats
    ff = win[win["first"].notna()]
    nat_first = []
    for b in range(6):
        g = ff[ff.band == b]
        nat_first.append([round(g[g["first"] == True].trouble.mean() * SCALE), round(g[g["first"] == False].trouble.mean() * SCALE), round((g["first"] == True).mean() * SCALE)])
    share = ff.groupby(["Origin", "band"])["first"].mean()

    city = pd.concat([win[["Origin", "OriginCityName"]].rename(columns={"Origin": "c", "OriginCityName": "n"}),
                      win[["Dest", "DestCityName"]].rename(columns={"Dest": "c", "DestCityName": "n"})]).drop_duplicates("c").set_index("c")["n"].to_dict()
    flights_by_origin = win.groupby("Origin").size()
    airports = []
    for c in codes:
        airports.append({
            "code": c, "city": city.get(c, c), "flights": int(flights_by_origin.get(c, 0)),
            "lat": coords.get(c, (None, None))[0], "lon": coords.get(c, (None, None))[1],
            "f": {h: [round(afac_map[(c, h, g)], 3) for g in range(3)] for h in ("th", "xm")},
            "firstShare": [round(float(share.get((c, b), np.nan)) * SCALE) if (c, b) in share.index else None for b in range(6)],
        })

    adjacency = {}
    for o, d in sorted(route_set):
        adjacency.setdefault(o, []).append(d)

    meta = {
        "version": 2,
        "source": "Bureau of Transportation Statistics, Reporting Carrier On-Time Performance (1987-present), domestic scheduled flights",
        "sourceUrl": "https://www.transtats.bts.gov/Tables.asp?QO_VQ=EFD&QO_anzr=Nv4%20Pn44vr4%20Fgngvfgvpf%20-%20Fvar%201987",
        "coordsSource": "OurAirports (public domain)",
        "files": files, "windowFlights": int(len(win)), "routes": len(route_set),
        "seasons": SEASONS, "offsets": OFFSETS, "bands": BAND_LABELS, "bandEdges": BAND_EDGES, "bandGroups": BAND_GROUP,
        "xgrid": XGRID, "hgrid": HGRID, "scale": SCALE, "recCapHours": REC_CAP_H,
        "definitions": {
            "cd": "cancelled or diverted: you need a different flight",
            "sop": "flight operated and arrived more than x minutes after its scheduled arrival",
            "trouble": "cancelled, diverted, or arrived 60+ minutes late (used to estimate airport and route factors)",
            "rec": "if cancelled: hours later you would arrive, queuing behind passengers from flights on the same airline and route cancelled in the prior 24 hours (the (2+q)-th later operated flight)",
        },
        "factors": {"kAirport": K_AIRPORT, "kRoute": K_ROUTE, "min": F_MIN, "max": F_MAX, "minRouteFlights": MIN_ROUTE_FLIGHTS},
        "firstFlightNational": {"columns": ["troubleFirst", "troubleLater", "shareFirst"], "byBand": nat_first},
    }
    nat = {"meta": meta, "holidays": national(win), "airports": airports, "routes": adjacency}

    # per-route shards
    rf = win.groupby(["Origin", "Dest"]).agg(o=("trouble", "sum"), e=("exp_a", "sum"), n=("trouble", "size"),
                                             shift=("shift", "median"), dep=("dep_min", "median"))
    carriers = win.groupby(["Origin", "Dest", "Reporting_Airline"]).size()
    days = win.drop_duplicates(["Origin", "Dest", "hol", "season", "off"]).groupby(["Origin", "Dest"]).size()
    shards = {}
    by_route = win.groupby(["Origin", "Dest"])
    for (o, d) in sorted(route_set):
        r = by_route.get_group((o, d))
        rec = []
        for g in range(3):
            x = r[r.grp == g]
            if len(x) < 40:
                x = r
            rr = x.rec_real.values
            ro = x.rec_opt.values
            rec.append({"surv": [round(float((rr > h).mean()) * SCALE) for h in HGRID],
                        "survOpt": [round(float((ro > h).mean()) * SCALE) for h in HGRID],
                        "opt": round(float(np.median(x.rec_opt.values)), 1), "real": round(float(np.median(rr)), 1),
                        "night": round(float(x.overnight.mean()) * SCALE)})
        cs = carriers.loc[(o, d)].sort_values(ascending=False)
        n = int(rf.loc[(o, d)].n)
        shards.setdefault(o, {"origin": o, "routes": {}})["routes"][d] = {
            "n": n, "r": round(shrink(rf.loc[(o, d)].o, rf.loc[(o, d)].e, K_ROUTE), 3),
            "shift": int(rf.loc[(o, d)]["shift"]),
            "perDay": round(n / int(days.loc[(o, d)]), 1),
            "carriers": [[c, round(v / n * 100)] for c, v in cs.items() if v / n >= 0.03],
            "rec": rec,
        }

    # How much slower rebooking was at each origin on each holiday-relative day of each season, relative to
    # that origin's all-season average. Meltdown days (Dec 2022) get large values; the page stretches the
    # route's rebooking curve by this factor when it evaluates that season.
    pooled = win.groupby(["Origin", "hol"]).rec_real.mean()
    daily = win.groupby(["Origin", "hol", "season", "off"]).rec_real.mean()
    for o, sh in shards.items():
        sh["recScale"] = {}
        for hol in ("th", "xm"):
            base = pooled.get((o, hol), np.nan)
            grid = []
            for season in SEASONS:
                row = []
                for off in OFFSETS:
                    v = daily.get((o, hol, season, off), np.nan)
                    row.append(round(float(min(REC_SCALE_MAX, max(REC_SCALE_MIN, v / base))), 2) if base > 0 and v == v else 1.0)
                row[-1] = row[-2]  # day +6 has too few later days loaded to measure; reuse day +5
                grid.append(row)
            sh["recScale"][hol] = grid

    os.makedirs(os.path.join(out_dir, "routes"), exist_ok=True)
    for old in glob.glob(os.path.join(out_dir, "routes", "*.json")):
        os.remove(old)
    dump = lambda p, ob: open(p, "w", encoding="utf-8").write(json.dumps(ob, separators=(",", ":"), ensure_ascii=False) + "\n")
    dump(os.path.join(out_dir, "national.json"), nat)
    for o, sh in shards.items():
        dump(os.path.join(out_dir, "routes", o + ".json"), sh)
    print(f"{len(win):,} window flights | {len(route_set)} routes | {len(codes)} airports | {len(shards)} origin shards")
    return nat


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("raw_dir")
    ap.add_argument("airports_csv")
    ap.add_argument("--out", default="public/holiday-travel/data")
    a = ap.parse_args()
    build(a.raw_dir, a.airports_csv, a.out)
