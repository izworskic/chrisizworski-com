import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('public/isle-royale-map/index.html');
const js = read('public/assets/isle-royale-map.js');
const catalog = JSON.parse(read('public/isle-royale-map/catalog.json'));
const spec = JSON.parse(read('benchmarks/isle-royale-map.json'));

const checks = [];
const add = (id, weight, ok, evidence) => checks.push({id, weight, ok:Boolean(ok), evidence});
const cat = catalog.items.map(x => `${x.id} ${x.npmapsCategory} ${x.state}`.toLowerCase()).join(' ');

add('source-catalog', 12, catalog.items.length >= 17 && ['regional map','rock harbor','windigo','shipwreck','relief','geologic','vegetation','historical'].every(x => cat.includes(x)), `${catalog.items.length} catalog entries`);
add('visitor-geometry', 13, /75e3ceba038a45f7b4d5a9d7c6a46ccf/.test(js) && /loadArcGISService/.test(js), 'public ArcGIS web-map + service ingestion');
add('planning-flow', 15, ['feature-search','layer-filters','feature-list'].every(x => html.includes(`id="${x}"`)) && /flyToFeature/.test(js), 'search + filters + list + map focus');
add('provenance', 10, /sourceStatus/.test(js) && /source-catalog/.test(html) && catalog.items.every(x => x.publisher && x.source && x.state), 'source/status displayed and cataloged');
add('safety', 10, !/nps\.gov\/maps\/pmtiles|Park Tiles/i.test(html + js) && /not a navigation chart/i.test(html) && /approximate reference/i.test(js), 'no restricted NPS basemap; navigation and fallback caveats');
add('fail-soft', 10, /loadFallbackAnchors/.test(js) && /catch/.test(js) && /tile\.openstreetmap\.org/.test(js), 'fallback anchors + error handling + keyless basemap');
add('accessibility', 8, /aria-live/.test(html) && /feature-list/.test(html) && /focus-visible/.test(html), 'status region + list alternative + focus states');
add('search-entity', 8, /https:\/\/chrisizworski\.com\/#person/.test(html) && /WebApplication/.test(html) && /Dataset/.test(html) && /dateModified/.test(html), 'Person + WebApplication + Dataset + freshness');
add('network', 6, (html.match(/chrisizworski\.com\//g) || []).length >= 4 && /great-lakes-lighthouses|lake-superior-circle-tour|michiganoutdoorsnow/.test(html), 'contextual existing-tool links');
add('deep-data-path', 8, ['geology','vegetation-detailed','historic-brochure','quiet-no-wake'].every(x => cat.includes(x)) && /PMTiles|MBTiles/.test(read('docs/isle-royale-map-plan.md')), 'explicit ETL/tile path for deep layers');

const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
const hardFailures = [];
if (/nps\.gov\/maps\/pmtiles/i.test(html + js)) hardFailures.push('Restricted NPS basemap usage detected in runtime surface');
if (!/not a navigation chart/i.test(html)) hardFailures.push('navigation disclaimer missing');
if (!/approximate reference/i.test(js)) hardFailures.push('fallback derivation label missing');

console.log(`Isle Royale map benchmark: ${score}/100 (release target ${spec.valueFunction.releaseTarget})`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${String(c.weight).padStart(2)} ${c.id} — ${c.evidence}`);
if (hardFailures.length) console.error('HARD GATES:', hardFailures.join('; '));

if (process.argv.includes('--check') && (score < spec.valueFunction.releaseTarget || hardFailures.length)) process.exit(1);
