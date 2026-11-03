#!/usr/bin/env python3
"""Compile editorial calendar recommendations; no live status or predictions.

Stdlib only. Python performs catalog reconciliation and constrained ranking once;
the browser only selects a precomputed month. Re-run after catalog/editorial edits.
No build-time Python dependency is added to Vercel.
"""
import argparse
import calendar
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ('public/tools/index.html', 'public/guides/index.html')
EDITORIAL = 'data/seasonal-discovery-editorial.json'
OUTPUT = 'public/assets/seasonal-discovery-data.js'
INTRO = [
    'Build a winter outing around the conditions you can verify, and use indoor days to plan the garden.',
    'Winter outings and spring preparations overlap. Look ahead before the next planting or tapping window.',
    'This is a transition month. Follow spring timing while keeping a winter-weather backup.',
    'Start with spring outings and garden preparation. Local warmth, water and access still decide the day.',
    'Woodland outings, garden planting and island-trip planning all compete for a place on the calendar.',
    'Plan time on the water, in the garden and along the shore. Check the day’s conditions before setting out.',
    'Make room for summer shore trips and garden care, then start looking toward the next seasonal change.',
    'Summer is still here, with harvest planning and autumn trips worth getting ahead of.',
    'Bring autumn trips and garden harvests into focus. Check regional timing before choosing a destination.',
    'Plan around autumn’s shorter windows, and start comparing cold-weather alternatives.',
    'Look toward late-fall outings, the winter shipping transition and holiday plans. Snow-dependent trips need a fresh check.',
    'Choose winter and holiday outings with room for the weather to change. The calendar cannot promise snow.'
]


def plain(value):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', '', value)).split())


def key(url):
    p = urlsplit(urljoin('https://chrisizworski.com/', url))
    return p.netloc.lower() + p.path.rstrip('/')


def months(value):
    result = [int(v) for v in value.split(',') if v.strip()]
    if not result or len(set(result)) != len(result) or any(v < 1 or v > 12 for v in result):
        raise ValueError(f'Invalid calendar window: {value}')
    return sorted(result)


def cluster(text):
    for name, words in [
        ('garden', 'garden planting seed tomato leafcutter maple'),
        ('ships', 'ship freighter locks canal fitzgerald'),
        ('winter', 'snow winter ski ice'),
        ('wildlife', 'bird wildlife morel bloom frog firefly hummingbird trillium salamander woodcock whitetail'),
        ('water', 'fish trout river paddle boating buoy'),
        ('shore', 'beach rockhound lighthouse'),
        ('sky', 'aurora sky meteor'),
        ('travel', 'border bridge holiday')
    ]:
        if any(word in text.lower() for word in words.split()):
            return name
    return 'trips'


def catalog():
    overrides = json.loads((ROOT / EDITORIAL).read_text())
    if overrides['schemaVersion'] != 1:
        raise ValueError('Unknown editorial schema')
    entries = {}
    # Catalog links and month tags remain the default source of truth. Editorial
    # overrides narrow promotional windows; they do not change operating seasons.
    for path, kind, css in [(SOURCES[0], 'Tool', 'tool'), (SOURCES[1], 'Guide', 'guide')]:
        source = (ROOT / path).read_text()
        pattern = rf'<div class="{css}-card"([^>]*)>(.*?)<div class="{css}-desc">'
        for m in re.finditer(pattern, source, re.S):
            anchor = re.search(rf'<div class="{css}-title"><a href="([^"]+)"[^>]*>(.*?)</a>', m[2], re.S)
            if not anchor:
                raise ValueError(f'Unparsed {kind} title')
            url, title = anchor[1], plain(anchor[2])
            parsed = urlsplit(urljoin('https://chrisizworski.com/', url))
            if parsed.scheme != 'https' or parsed.username or parsed.password:
                raise ValueError(f'Unsafe catalog URL: {url}')
            k = key(url)
            # A canonical URL appears only once, even if both directories list it.
            if k in entries:
                continue
            tagged = re.search(r'data-months="([^"]+)"', m[1])
            tag_text = re.search(r'data-tags="([^"]+)"', m[1])
            entries[k] = dict(id=hashlib.sha256(k.encode()).hexdigest()[:12],
                              url=url, title=title, kind=kind,
                              months=months(tagged[1]) if tagged else list(range(1, 13)),
                              cluster=cluster((tag_text[1] if tag_text else '') + ' ' + title),
                              why='', editorial=False)
    for url, edit in overrides['overrides'].items():
        k = key(url)
        if k not in entries:
            raise ValueError(f'Editorial link no longer in directory: {url}')
        entries[k].update(months=months(','.join(map(str, edit['months']))),
                          cluster=edit['cluster'], why=edit['why'], editorial=True)
    return list(entries.values()), overrides['reviewedOn']


def phase(entry, month):
    if not 1 <= month <= 12:
        raise ValueError('Month outside 1..12')
    if month in entry['months']:
        return 'now'
    if month % 12 + 1 in entry['months']:
        return 'soon'
    return None


def rank(entry, month):
    state = phase(entry, month)
    if not state:
        return -1
    # These are editorial ordering weights, never visitor-visible probabilities.
    return (60 if state == 'now' else 38) + min(18, 2 * (12 - len(entry['months']))) + (12 if entry['editorial'] else 0)


def select(entries, month):
    ordered = sorted((e for e in entries if phase(e, month)),
                     key=lambda e: (-rank(e, month), e['id']))
    chosen = []

    def add(candidates):
        for e in candidates:
            if e in chosen or sum(x['cluster'] == e['cluster'] for x in chosen) >= 2:
                continue
            chosen.append(e)
            return

    # Explicit kind quotas and topic cap prevent six near-identical weather tools.
    for kind in ['Tool', 'Guide', 'Tool', 'Guide']:
        add([e for e in ordered if e['kind'] == kind and phase(e, month) == 'now'])
    add([e for e in ordered if phase(e, month) == 'soon'])
    while len(chosen) < 6:
        before = len(chosen)
        add(ordered)
        if before == len(chosen):
            raise ValueError(f'Insufficient diverse candidates for month {month}')
    chosen.sort(key=lambda e: (-rank(e, month), e['id']))
    result = []
    for e in chosen:
        state = phase(e, month)
        reason = e['why'] or ('This guide fits the selected calendar window. Use it to plan, then check current conditions.'
                              if e['kind'] == 'Guide' else 'A useful seasonal starting point. Open the tool for its latest evidence and limitations.')
        if state == 'soon':
            reason = 'Plan ahead for ' + calendar.month_name[month % 12 + 1] + '. ' + reason
        result.append({**{k: e[k] for k in ('id', 'url', 'title', 'kind', 'cluster')},
                       'phase': state, 'why': reason})
    return result


def compile_data():
    entries, reviewed = catalog()
    return dict(schemaVersion=1, reviewedOn=reviewed, scope='Michigan and Great Lakes',
                evidenceKind='editorial-calendar', candidateCount=len(entries),
                months={str(m): dict(name=calendar.month_name[m], intro=INTRO[m - 1],
                                    picks=select(entries, m)) for m in range(1, 13)})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = compile_data()
    content = '// Generated by scripts/build-seasonal-discovery.py; editorial planning only.\nwindow.SeasonalDiscoveryData=' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n'
    output = ROOT / OUTPUT
    if args.check:
        if not output.exists() or output.read_text() != content:
            raise SystemExit('Seasonal discovery data drift: run python3 scripts/build-seasonal-discovery.py')
    else:
        output.write_text(content)
    print(f"Seasonal discovery: {result['candidateCount']} canonical candidates; 12 months; 6 diverse picks each; {len(content.encode())} bytes")


if __name__ == '__main__':
    main()
