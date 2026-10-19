#!/usr/bin/env python3
"""Build the Holiday Travel flight-disruption dataset from BTS flight-level records.

Source: Bureau of Transportation Statistics, "Reporting Carrier On-Time Performance
(1987-present)", one monthly zip per month:
  https://www.transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_YYYY_M.zip

Usage (run manually; the generated JSON is committed so Vercel never needs Python):
  python3 -I scripts/holiday-travel/build-flight-history.py <dir-containing-the-zips> [--out public/holiday-travel/data]

Needs November and December zips for every season in SEASONS. See docs/HOLIDAY_TRAVEL_DATA.md.

Method, in one paragraph. Every scheduled domestic departure inside a +/-6 day window around
Thanksgiving and around Dec 25 is classified by the day offset from the holiday and by its
scheduled local departure hour band. The national rate for each (holiday, offset, band) is the
mean across seasons of that season's rate, so one bad year counts once instead of being buried.
An airport factor is then estimated for each airport and time-of-day group as observed events
divided by the events the national rates would have predicted for that airport's exact mix of
days and hours, shrunk toward 1.0 so small airports do not produce noise. The page multiplies
the two. Per-season values are kept so the page can show how bad the worst year was.
"""
import argparse, datetime as dt, glob, json, os, re, sys, zipfile
import numpy as np
import pandas as pd

SEASONS = [2018, 2019, 2022, 2023, 2024, 2025]  # 2020-2021 excluded: pandemic-distorted schedules
OFFSETS = list(range(-6, 7))
BAND_EDGES = [5, 8, 11, 14, 17, 20]  # scheduled local hour; the last band runs 20:00-04:59
BAND_LABELS = ["5–8 AM", "8–11 AM", "11 AM–2 PM", "2–5 PM", "5–8 PM", "8 PM–5 AM"]
BAND_GROUP = [0, 0, 1, 1, 2, 2]  # morning, midday/afternoon, evening/night
MIN_AIRPORT_FLIGHTS = 6000  # total window departures across all seasons and both holidays
SHRINK_EVENTS = 25.0  # prior weight, in expected events, toward "same as national"
F_MIN, F_MAX = 0.3, 3.5
COLS = ["FlightDate", "Origin", "OriginCityName", "CRSDepTime", "DepDelay", "Cancelled", "Diverted"]


def thanksgiving(year):
    d = dt.date(year, 11, 1)
    d += dt.timedelta(days=(3 - d.weekday()) % 7)  # first Thursday
    return d + dt.timedelta(days=21)


def anchors(year):
    return {"th": thanksgiving(year), "xm": dt.date(year, 12, 25)}


def load(raw_dir):
    parts, files, rows = [], [], {}
    for season in SEASONS:
        for month in (11, 12):
            pat = os.path.join(raw_dir, f"*Performance_1987_present_{season}_{month}.zip")
            found = glob.glob(pat)
            if len(found) != 1:
                sys.exit(f"Expected exactly one file for {season}-{month}, found {found}")
            z = zipfile.ZipFile(found[0])
            name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
            d = pd.read_csv(z.open(name), usecols=COLS, low_memory=False)
            d["FlightDate"] = pd.to_datetime(d["FlightDate"])
            parts.append(d)
            files.append(os.path.basename(found[0]))
            rows[f"{season}-{month:02d}"] = int(len(d))
    return pd.concat(parts, ignore_index=True), files, rows


def classify(df):
    cancelled = df["Cancelled"].fillna(0).astype(int) == 1
    diverted = df["Diverted"].fillna(0).astype(int) == 1
    delay = df["DepDelay"]
    df["cancel"] = cancelled.astype("int8")
    df["major"] = (cancelled | diverted | (delay >= 60)).astype("int8")  # cancelled, diverted, or left 60+ min late
    df["late"] = (cancelled | diverted | (delay >= 15)).astype("int8")  # not on time (BTS 15-minute standard)
    hour = (df["CRSDepTime"].fillna(0) // 100).astype(int)
    df["band"] = np.select([(hour >= e) & (hour < n) for e, n in zip(BAND_EDGES[:-1], BAND_EDGES[1:])], range(5), 5).astype("int8")
    return df


def window(df):
    out = []
    for season in SEASONS:
        for hol, anchor in anchors(season).items():
            a = pd.Timestamp(anchor)
            s = df[(df.FlightDate >= a - pd.Timedelta(days=6)) & (df.FlightDate <= a + pd.Timedelta(days=6))].copy()
            s["off"] = (s.FlightDate - a).dt.days.astype("int8")
            s["hol"], s["season"] = hol, season
            out.append(s)
    return pd.concat(out, ignore_index=True)


def r1(x):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), 1)


def build(raw_dir, out_dir):
    df, files, rows = load(raw_dir)
    w = window(classify(df))
    del df
    w["grp"] = w["band"].map(lambda b: BAND_GROUP[b]).astype("int8")

    # ---- national surface: per-season cells, then mean across seasons -----------------
    cell = w.groupby(["hol", "season", "off", "band"]).agg(n=("major", "size"), major=("major", "sum"), late=("late", "sum"), cancel=("cancel", "sum")).reset_index()
    for m in ("major", "late", "cancel"):
        cell[m + "_rate"] = cell[m] / cell["n"]
    mean_rate = cell.groupby(["hol", "off", "band"])[["major_rate", "late_rate", "cancel_rate"]].mean().reset_index()

    holidays = {}
    for hol in ("th", "xm"):
        block = {"anchors": {str(s): anchors(s)[hol].isoformat() for s in SEASONS}}
        mr = mean_rate[mean_rate.hol == hol]
        nat = {}
        for m in ("major", "late", "cancel"):
            grid = np.full((len(OFFSETS), len(BAND_LABELS)), np.nan)
            for _, r in mr.iterrows():
                grid[int(r.off) + 6, int(r.band)] = r[m + "_rate"] * 100
            nat[m] = [[round(float(v), 2) for v in row] for row in grid]
        per = np.full((len(OFFSETS), len(BAND_LABELS), len(SEASONS)), np.nan)
        for _, r in cell[cell.hol == hol].iterrows():
            per[int(r.off) + 6, int(r.band), SEASONS.index(int(r.season))] = r.major_rate * 100
        nat["majorSeason"] = [[[r1(v) for v in b] for b in o] for o in per]
        day = w[w.hol == hol].groupby(["season", "off"]).agg(n=("major", "size"), major=("major", "mean"), cancel=("cancel", "mean")).reset_index()
        dm = np.full((len(OFFSETS), len(SEASONS)), np.nan); dc = dm.copy(); dn = dm.copy()
        for _, r in day.iterrows():
            i, j = int(r.off) + 6, SEASONS.index(int(r.season))
            dm[i, j], dc[i, j], dn[i, j] = r.major * 100, r.cancel * 100, r.n
        nat["dayMajorSeason"] = [[r1(v) for v in row] for row in dm]
        nat["dayCancelSeason"] = [[r1(v) for v in row] for row in dc]
        nat["dayFlightsSeason"] = [[int(v) for v in row] for row in dn]
        block["nat"] = nat
        holidays[hol] = block

    # ---- airport selection and factors ---------------------------------------------------
    totals = w.groupby("Origin").size()
    keep = sorted(totals[totals >= MIN_AIRPORT_FLIGHTS].index, key=lambda c: -totals[c])
    cities = w.drop_duplicates("Origin").set_index("Origin")["OriginCityName"].to_dict()
    ac = w[w.Origin.isin(keep)].groupby(["Origin", "hol", "grp", "season", "off", "band"]).agg(n=("major", "size"), major=("major", "sum"), late=("late", "sum"), cancel=("cancel", "sum")).reset_index()
    ac = ac.merge(mean_rate, on=["hol", "off", "band"], how="left")
    for m in ("major", "late", "cancel"):
        ac["exp_" + m] = ac["n"] * ac[m + "_rate"]
    fac = ac.groupby(["Origin", "hol", "grp"])[["major", "late", "cancel", "exp_major", "exp_late", "exp_cancel"]].sum()
    airports = []
    for code in keep:
        f = {}
        for hol in ("th", "xm"):
            f[hol] = {}
            for m in ("major", "late", "cancel"):
                vals = []
                for g in range(3):
                    o, e = fac.loc[(code, hol, g), m], fac.loc[(code, hol, g), "exp_" + m]
                    vals.append(round(float(min(F_MAX, max(F_MIN, (o + SHRINK_EVENTS) / (e + SHRINK_EVENTS)))), 3))
                f[hol][m] = vals
        airports.append({"code": code, "city": cities[code], "flights": int(totals[code]), "f": f})

    # ---- self-check against the figure the old page cited --------------------------------
    nov25 = w[(w.Origin == "DTW") & (w.hol == "th") & (w.season == 2025)]
    meta = {
        "version": 1,
        "source": "Bureau of Transportation Statistics, Reporting Carrier On-Time Performance (1987-present), domestic scheduled departures",
        "sourceUrl": "https://www.transtats.bts.gov/Tables.asp?QO_VQ=EFD&QO_anzr=Nv4%20Pn44vr4%20Fgngvfgvpf%20-%20Fvar%201987",
        "files": files, "monthlyRows": rows,
        "windowDepartures": int(len(w)),
        "seasons": SEASONS, "offsets": OFFSETS, "bands": BAND_LABELS, "bandGroups": BAND_GROUP,
        "definitions": {
            "major": "cancelled, diverted, or departed 60 or more minutes after schedule",
            "late": "cancelled, diverted, or departed 15 or more minutes after schedule (the complement of BTS on-time)",
            "cancel": "cancelled"},
        "airportFactor": {"shrinkEvents": SHRINK_EVENTS, "min": F_MIN, "max": F_MAX, "minWindowDepartures": MIN_AIRPORT_FLIGHTS},
    }
    national = {"meta": meta, "holidays": holidays, "airports": airports}
    os.makedirs(out_dir, exist_ok=True)
    dump = lambda p, o: open(p, "w", encoding="utf-8").write(json.dumps(o, separators=(",", ":"), ensure_ascii=False) + "\n")
    dump(os.path.join(out_dir, "national.json"), national)
    print(f"{len(w):,} window departures | {len(keep)} airports | seasons {SEASONS}")
    print(f"DTW Thanksgiving-2025 window major rate: {nov25.major.mean()*100:.1f}% of {len(nov25):,} departures")
    return national


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("raw_dir")
    ap.add_argument("--out", default="public/holiday-travel/data")
    a = ap.parse_args()
    build(a.raw_dir, a.out)
