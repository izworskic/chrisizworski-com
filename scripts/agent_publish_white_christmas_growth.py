from pathlib import Path
import re

root=Path('.')
DATE='2026-09-25'
new_slugs=[
'rochester-ny','erie-pa','cleveland-oh','milwaukee-wi','madison-wi','green-bay-wi',
'albany-ny','worcester-ma','bangor-me','concord-nh','lake-placid-ny',
'bismarck-nd','sioux-falls-sd','rapid-city-sd','st-cloud-mn',
'missoula-mt','billings-mt','jackson-wy','colorado-springs-co','steamboat-springs-co',
'leavenworth-wa','mammoth-lakes-ca'
]
base='https://chrisizworski.com/national-tools/white-christmas/cities/'
new_urls=[base+s+'/' for s in new_slugs]

def urls_in(text):
    return re.findall(r'<loc>([^<]+)</loc>',text)

def set_lastmod(text,url,date=DATE):
    pat=re.compile(r'(<loc>'+re.escape(url)+r'</loc>\s*<lastmod>)[^<]+(</lastmod>)')
    return pat.sub(r'\g<1>'+date+r'\g<2>',text)

# Dedicated sitemap is the source for all already-published White Christmas URLs.
dedicated_path=root/'public/sitemap-white-christmas.xml'
dedicated=dedicated_path.read_text()
existing=urls_in(dedicated)
if len(existing)!=43:
    raise SystemExit(f'expected pre-growth dedicated sitemap count 43, got {len(existing)}')

changed_existing=[]
for url in existing:
    path=url.removeprefix('https://chrisizworski.com')
    if path=='/national-tools/white-christmas/forecast/':
        changed_existing.append(url)
    elif path=='/national-tools/white-christmas/cities/' or path.startswith('/national-tools/white-christmas/cities/'):
        changed_existing.append(url)
    elif path.startswith('/national-tools/white-christmas/regions/') and path!='/national-tools/white-christmas/regions/':
        changed_existing.append(url)

for sitemap_rel in ['public/sitemap-white-christmas.xml','public/sitemap.xml','public/sitemap-winter.xml']:
    p=root/sitemap_rel
    text=p.read_text()
    for url in changed_existing:
        if f'<loc>{url}</loc>' not in text:
            raise SystemExit(f'{url} missing from {sitemap_rel} before growth publish')
        text=set_lastmod(text,url)
    for url in new_urls:
        if f'<loc>{url}</loc>' not in text:
            entry=f'  <url><loc>{url}</loc><lastmod>{DATE}</lastmod></url>\n'
            text=text.replace('</urlset>',entry+'</urlset>')
        else:
            text=set_lastmod(text,url)
    p.write_text(text)

# Raise the dedicated sitemap release contract from 43 to 65 canonical URLs.
verify_path=root/'scripts/verify-white-christmas-indexing.mjs'
verify=verify_path.read_text()
old='if(urls.length!==43) failures.push(`dedicated White Christmas sitemap must contain 43 canonical URLs; found ${urls.length}`);'
new='if(urls.length!==65) failures.push(`dedicated White Christmas sitemap must contain 65 canonical URLs; found ${urls.length}`);'
if old not in verify:
    raise SystemExit('expected 43-URL White Christmas indexing contract not found')
verify_path.write_text(verify.replace(old,new,1))

# Non-indexed release/measurement ledger for ship-and-observe.
doc=root/'docs/WHITE_CHRISTMAS_GROWTH_RELEASE_2026-09-25.md'
doc.write_text('''# White Christmas growth release — 2026-09-25\n\n## Scope\n\nThe authoritative `izworskic/national-white-christmas` product was expanded from 28 to 50 materially distinct city/destination guides before this shell release. The owner repository passed its full test suite and its production Vercel deployment reported success before these URLs were added to discovery surfaces.\n\nThis shell change does not copy White Christmas product logic. It publishes the 22 newly proven canonical city routes in the dedicated White Christmas, winter, and main sitemaps and refreshes `lastmod` for White Christmas city/region surfaces materially changed by the owner release.\n\n## Search evidence and reason for expansion\n\nThe September 25 Search Console review showed the White Christmas forecast surface already receiving 2,017 impressions at average position 9.13 in the latest 28-day export, while city guides such as Buffalo, Minneapolis, Pittsburgh, Syracuse, Duluth, Santa Fe, and Bozeman were already appearing on page one or near it. The expansion is therefore concentrated in the same proven snow-region and winter-destination query family rather than a nationwide city-page spray.\n\n## Canonical boundary\n\n- Flagship owner: `/national-tools/white-christmas/` — local probability/current-year outlook.\n- Forecast support page: `/national-tools/white-christmas/forecast/` — when Christmas 2026 forecast evidence becomes useful.\n- City guides: materially local climate/snowpack context plus a handoff to the live estimator.\n- Region pages: regional explanation and discovery into local guides.\n- No query-string estimator state is indexable.\n\n## Measurement plan\n\nOperating mode remains **ship-and-observe**. No active experiment freeze is created.\n\nLeading review: compare the first complete 7-day Search Console window after recrawl with the pre-release query/page mix.\n\nDecision review: use a complete 28-day comparable window. Measure:\n\n1. impressions and average position for the forecast query family;\n2. clicks/CTR at comparable positions for `/forecast/`;\n3. impressions, clicks, and average position across the 50 city guides;\n4. number of city guides earning meaningful impressions and page-one positions;\n5. cannibalization between flagship, forecast, region, and city intent owners.\n\nDo not add another large city batch merely because these URLs are indexed. Expand again only when Search Console shows demand or a distinct user decision that the current network does not satisfy.\n''')

# Final local sanity check of sitemap counts after mutation; this is not the repository gate.
for sitemap_rel in ['public/sitemap-white-christmas.xml','public/sitemap.xml','public/sitemap-winter.xml']:
    text=(root/sitemap_rel).read_text()
    for url in new_urls:
        if f'<loc>{url}</loc>' not in text:
            raise SystemExit(f'new URL missing from {sitemap_rel}: {url}')
if len(urls_in((root/'public/sitemap-white-christmas.xml').read_text()))!=65:
    raise SystemExit('dedicated sitemap did not reach 65 URLs')
