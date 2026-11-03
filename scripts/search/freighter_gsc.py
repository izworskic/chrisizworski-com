#!/usr/bin/env python3
"""Analyze exported Search Console rows without joining unrelated dimensions.

Use separate page and query CSV exports from the same property and date range.
A query export is attributed to the tracker ONLY when exported with that page
filter in Search Console. Data remains local; the script makes no web requests.
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

TARGET = 'https://chrisizworski.com/great-lakes-freighter-tracking/'


def read_csv(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def metric(row):
    try:
        clicks = int(row['Clicks'].replace(',', ''))
        impressions = int(row['Impressions'].replace(',', ''))
        position = float(row['Position'].replace(',', ''))
    except (KeyError, ValueError, AttributeError) as exc:
        raise ValueError('Expected Clicks, Impressions and Position numeric columns') from exc
    if clicks < 0 or impressions < clicks or position < 1:
        raise ValueError('Invalid clicks, impressions or position')
    return clicks, impressions, position


def category(query):
    q = query.casefold()
    if re.search(r'\b(schedule|arrival|arrivals|eta|passage|passing)\b', q):
        return 'schedules and passages'
    if re.search(r'\b(camera|webcam|watching|watch|viewing)\b', q):
        return 'watching and cameras'
    if re.search(r'\b(map|tracker|tracking|traffic|ais|live)\b', q):
        return 'live map and tracking'
    return 'other or uncertain'


def analyze(pages, queries, scope):
    candidates = [row for row in pages if row.get('Top pages', '').rstrip('/') == TARGET.rstrip('/')]
    if len(candidates) != 1:
        raise ValueError('Expected exactly one tracker URL in the Pages export')
    clicks, impressions, position = metric(candidates[0])
    groups = {}
    for row in queries:
        query = row.get('Top queries', '').strip()
        if not query:
            continue
        # Global exports are limited to clear Great Lakes ship/freighter terms;
        # they must never be presented as queries for this particular page.
        q = query.casefold()
        if scope == 'sitewide' and not (('great lakes' in q) and re.search(r'\b(ship|ships|freighter|freighters|vessel|vessels|marine)\b', q)):
            continue
        c, n, p = metric(row)
        g = groups.setdefault(category(query), {'clicks': 0, 'impressions': 0, 'weighted_position': 0.0, 'queries': 0})
        g['clicks'] += c; g['impressions'] += n; g['weighted_position'] += p * n; g['queries'] += 1
    for g in groups.values():
        n = g['impressions']
        g['ctr_percent'] = round(100 * g['clicks'] / n, 2) if n else None
        g['position'] = round(g.pop('weighted_position') / n, 2) if n else None
    return {'page': {'url': TARGET, 'clicks': clicks, 'impressions': impressions,
                     'ctr_percent': round(100 * clicks / impressions, 2) if impressions else None,
                     'position': position},
            'query_scope': scope,
            'query_note': ('Query rows are site-wide, NOT necessarily for the tracker.' if scope == 'sitewide'
                           else 'Page-filtered query export; omitted/anonymized queries may make totals incomplete.'),
            'query_groups': groups}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pages', required=True)
    parser.add_argument('--queries', required=True)
    parser.add_argument('--query-scope', choices=['sitewide', 'page-filtered'], required=True,
                        help='Declare the actual export filter; never infer page attribution.')
    args = parser.parse_args()
    try:
        result = analyze(read_csv(args.pages), read_csv(args.queries), args.query_scope)
    except (OSError, ValueError) as exc:
        parser.exit(2, f'Cannot analyze export: {exc}\n')
    json.dump(result, sys.stdout, indent=2); print()


if __name__ == '__main__':
    main()
