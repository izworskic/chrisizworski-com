#!/usr/bin/env python3
"""Rebuild/audit the snowmobile search index without remote services.

Input: checked-in 2025 U.S. Census Gazetteer place snapshot and the seven
source-backed DNR town proximity snapshots.
Output: public/data/snowmobile-trail-towns.json.
The place file is a separately sourced snapshot and is validated, not guessed.
--check is network-free and safe in every CI run; --write regenerates only the
27 source-backed destination anchors.

Usage:
    python3 scripts/verify-snowmobile-city-index.py --check
    python3 scripts/verify-snowmobile-city-index.py --write
"""
from __future__ import annotations
import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLACES = ROOT / 'public/data/snowmobile-origin-places.json'
TRAILS = ROOT / 'public/data/snowmobile-trail-towns.json'
REGIONS = (
    'eastern-up', 'keweenaw-copper-country', 'central-western-up',
    'grayling-gaylord', 'northeast-sunrise', 'northwest-michigan',
    'west-michigan',
)
# Minimum expected coverage protects against successful-looking truncated range reads.
MIN_ROWS = {'MI': 740, 'WI': 800, 'OH': 1200, 'IN': 950,
            'IL': 1400, 'MN': 900, 'PA': 1950, 'NY': 1250}
SOURCE_ROOT = ('https://www2.census.gov/geo/docs/maps-data/data/'
               'gazetteer/2025_Gazetteer/2025_gaz_place_')
FIPS = {'MI': '26', 'WI': '55', 'OH': '39', 'IN': '18',
        'IL': '17', 'MN': '27', 'PA': '42', 'NY': '36'}


def require(value: bool, message: str) -> None:
    if not value:
        raise ValueError(message)


def point_to_segment_km(lon: float, lat: float, a: list, b: list) -> float:
    """Local equirectangular projection; same geometry test as town-discovery.mjs."""
    cosine = math.cos(math.radians((lat + a[1] + b[1]) / 3))
    ax, ay = (a[0] - lon) * cosine, a[1] - lat
    bx, by = (b[0] - lon) * cosine, b[1] - lat
    vx, vy = bx - ax, by - ay
    t = max(0.0, min(1.0, -(ax * vx + ay * vy) / (vx * vx + vy * vy or 1)))
    return math.hypot(ax + t * vx, ay + t * vy) * 111.195


def trail_nearest_distance_km(t: dict) -> float:
    distances = []
    for feature in t['dnr']['features']:
        shape = feature.get('geometry') or {}
        lines = ([shape['coordinates']] if shape.get('type') == 'LineString'
                 else shape.get('coordinates', []) if shape.get('type') == 'MultiLineString'
                 else [])
        for line in lines:
            distances += [point_to_segment_km(t['lon'], t['lat'], a, b)
                          for a, b in zip(line, line[1:])]
    return min(distances, default=math.inf)


def validate_places() -> dict:
    data = json.loads(PLACES.read_text())
    require(data.get('schemaVersion') == 1, 'City index must use schema v1')
    counts: Counter = Counter()
    ids = set()
    names = set()
    for r in data.get('places', []):
        require(isinstance(r, list) and len(r) == 5, 'Malformed Census place row')
        ident, name, state, lat, lon = r
        require(isinstance(name, str) and 1 <= len(name) <= 150, f'Invalid name: {r}')
        require(isinstance(ident, str) and re.fullmatch('[a-z]{2}-[0-9]{7}', ident) is not None,
                f'Invalid Census GEOID: {r}')
        require(state in MIN_ROWS and ident.startswith(state.lower() + '-'),
                f'Invalid state scope: {r}')
        require(ident not in ids, f'Duplicate Census place GEOID: {ident}')
        require(isinstance(lat, (int, float)) and isinstance(lon, (int, float))
                and math.isfinite(lat) and math.isfinite(lon)
                and 24 <= lat <= 50 and -100 <= lon <= -66,
                f'Invalid place coordinate: {r}')
        ids.add(ident)
        names.add((name.casefold(), state))
        counts[state] += 1
    require(data.get('states') == list(MIN_ROWS), 'Unexpected Census state order/scope')
    require(data.get('sourceUrls') ==
            [SOURCE_ROOT + FIPS[s] + '.txt' for s in MIN_ROWS],
            'Census Gazetteer provenance URLs must match the committed states')
    for state, minimum in MIN_ROWS.items():
        require(counts[state] >= minimum,
                f'{state} source rows incomplete: {counts[state]} < {minimum}')
        require(any(name.startswith('z') and st == state for name, st in names),
                f'{state} source alphabet tail missing; probable truncated file')
    for name, state in (('Bay City', 'MI'), ('Toledo', 'OH'), ('Chicago', 'IL'),
                        ('Duluth', 'MN'), ('Buffalo', 'NY'), ('Pittsburgh', 'PA')):
        require((name.casefold(), state) in names, f'Missing reference place: {name}, {state}')
    return {'rows': len(ids), 'by_state': dict(counts)}


def generate_towns() -> dict:
    towns = []
    for region in REGIONS:
        source = json.loads((ROOT / 'data/snowmobile-town-proximity' /
                             (region + '.json')).read_text())
        require(source.get('region') == region, f'Wrong DNR town snapshot: {region}')
        for row in source.get('towns', []):
            name = row['name']
            slug = re.sub('-+', '-', re.sub('[^a-z0-9]+', '-',
                          name.lower())).strip('-')
            proxy = row.get('proxy') or {}
            dnr = row.get('dnr') or {}
            require('Google autocomplete' in proxy.get('source', '') and
                    proxy.get('seed') and proxy.get('suggestion'),
                    f'Unverified demand-proxy town: {name}')
            require(dnr.get('radiusKm') == 5 and 'distance=5000' in dnr.get('query', '')
                    and dnr.get('features') and
                    len(dnr['features']) == dnr.get('hitCount'),
                    f'No official DNR 5 km query for {name}')
            require(trail_nearest_distance_km(row) <= 5.05,
                    f'{name} is outside its DNR mapped 5 km trail radius')
            towns.append({'name': name, 'region': region, 'lat': row['lat'],
                          'lon': row['lon'], 'url': '/snowmobile/regions/' + region +
                          '.html#trail-conditions-near-' + slug, 'dnrRadiusKm': 5})
    towns.sort(key=lambda t: t['name'].casefold())
    require(len(towns) == 27 and len({(t['name'], t['region']) for t in towns}) == 27,
            'Expected exactly 27 verified named towns in seven regions')
    return {
        'schemaVersion': 1,
        'source': ('Official Michigan DNR trail geometry 5 km verified regional '
                   'town snapshots; 2026-11-23, demand proxy from Google autocomplete'),
        'towns': towns,
    }


def run(check: bool) -> None:
    stats = validate_places()
    computed = generate_towns()
    current = json.loads(TRAILS.read_text()) if TRAILS.exists() else None
    if check:
        require(current == computed, 'Trail town index is stale: regenerate with --write')
    else:
        TRAILS.write_text(json.dumps(computed, separators=(',', ':')) + '\n')
    print(f"SNOWMOBILE CITY INDEX OK: {stats['rows']} source places, "
          f"{len(computed['towns'])} DNR-verified riding towns, "
          f"states: {stats['by_state']}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--write', action='store_true')
    args = parser.parse_args()
    run(args.check)
