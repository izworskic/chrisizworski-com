#!/usr/bin/env python3
"""Independent geographic and freshness reference for the live desk tests.

This never downloads or publishes vessel data. Synthetic points exercise the
browser's current-report and haversine calculations against Python's math.
"""
import datetime
import json
import math
import random
import sys


def distance_miles(a, b, c, d):
    rad = math.pi / 180
    lat = (c - a) * rad
    lon = (d - b) * rad
    term = math.sin(lat / 2)**2 + math.cos(a * rad) * math.cos(c * rad) * math.sin(lon / 2)**2
    return 3958.8 * 2 * math.atan2(math.sqrt(term), math.sqrt(1-term))


def generate(centers):
    rng = random.Random(20261103)
    now = datetime.datetime(2026, 11, 3, 12, 0, tzinfo=datetime.timezone.utc)
    points = []
    for key, center in centers.items():
        for i in range(45):
            age = [-61000, -60000, 0, 1799999, 1800000, 1800001][i % 6]
            seen = now - datetime.timedelta(milliseconds=age)
            points.append({'lat': center['lat'] + rng.uniform(-1.0, 1.0),
                           'lon': center['lng'] + rng.uniform(-1.5, 1.5),
                           'seen': seen.isoformat().replace('+00:00', 'Z')})
    counts = {}
    for key, center in centers.items():
        radius = 60 if key == 'saginaw' else 35
        counts[key] = sum(1 for point in points
                          if -60000 <= (now - datetime.datetime.fromisoformat(point['seen'].replace('Z', '+00:00'))).total_seconds()*1000 <= 1800000
                          and distance_miles(center['lat'], center['lng'], point['lat'], point['lon']) <= radius)
    return {'now': int(now.timestamp()*1000), 'points': points, 'counts': counts}

if __name__ == '__main__':
    json.dump(generate(json.load(sys.stdin)), sys.stdout)
