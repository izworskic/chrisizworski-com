#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

function replaceOne(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`Missing migration marker: ${label}`);
  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`Migration marker is not unique: ${label}`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

const icePath = 'scripts/ice/gen_site.py';
let ice = readFileSync(icePath, 'utf8');
ice = replaceOne(ice, 'ICE_ROOT_DATE_MODIFIED = "2026-08-17"', 'ICE_ROOT_DATE_MODIFIED = "2026-08-18"', 'ice modified date');

const decisionData = `REGION_DECISIONS = {
    "saginaw-bay": {
        "behavior": "Shallow, wind-exposed Great Lakes bay that can respond quickly to both cold and thaw.",
        "watch": "Wind direction, working cracks, and rapid nearshore-to-offshore differences.",
        "remote": "Accumulated cold + Lake Huron satellite context + surface cameras.",
        "questions": [
            ("Why can Saginaw Bay ice conditions change so quickly?", "The bay is shallow enough to lose heat quickly, but its wide open fetch also lets wind move and fracture a sheet. A cold total can describe the season while today's wind changes the trip decision in hours."),
            ("What does the Lake Huron ice percentage tell me about Saginaw Bay?", "It is parent-lake context only. NOAA's lake-wide Lake Huron number does not measure the bay, a shoreline access, a crack, or the ice where an angler plans to stand."),
            ("What should I check after the cold number?", "Check current wind direction and the available surface cameras, then verify conditions locally. On the west shore, offshore wind is a specific concern even after a long cold stretch."),
        ],
    },
    "houghton-lake": {
        "behavior": "Large but relatively shallow inland lake that generally responds to sustained cold earlier than deeper northern basins.",
        "watch": "Thaw cycles, local variation, and concentrated shanty or vehicle traffic.",
        "remote": "Accumulated cold + nearby weather + surface camera; no satellite lake-ice product.",
        "questions": [
            ("Why does Houghton Lake often freeze before deeper northern lakes?", "Its relatively shallow water gives up stored heat faster than a deep basin. That makes accumulated cold especially useful for screening the season, but it still does not measure local ice."),
            ("Is there satellite ice coverage for Houghton Lake?", "No comparable NOAA lake-ice product exists for this inland lake. This report intentionally uses accumulated cold, nearby weather, and a surface view without pretending they are a thickness measurement."),
            ("What can change Houghton Lake conditions fastest?", "Warm spells and heavy use matter. A prior cold total remains historical context after a thaw, and concentrated traffic can stress one part of a sheet differently from another."),
        ],
    },
    "lake-st-clair": {
        "behavior": "Shallow lake inside a flowing river system, so current is part of the ice problem everywhere.",
        "watch": "Current, channels, river influence, and shipping-related open water.",
        "remote": "Accumulated cold + Lake St. Clair satellite context + current weather.",
        "questions": [
            ("Why is Lake St. Clair ice different from a normal inland lake?", "Water is continually moving through the lake from Lake Huron toward the Detroit River. Current can undermine ice from below, so a cold winter does not remove the local flow hazard."),
            ("Why do anglers watch Anchor Bay first?", "Anchor Bay is away from the strongest main flow and is the traditional hard-water area. That is a relative geographic pattern, not a statement that the ice there is safe."),
            ("What should I distrust most on Lake St. Clair?", "Uniform-looking surface conditions. Current, channels, river influence, and freighter tracks can make nearby areas behave differently even when the air temperature is the same."),
        ],
    },
    "little-bay-de-noc": {
        "behavior": "Protected northern Lake Michigan bay with a long cold season and important river-mouth and outer-bay differences.",
        "watch": "Escanaba and Ford river mouths plus wind-driven movement toward the outer bay.",
        "remote": "Accumulated cold + Lake Michigan satellite context + current weather.",
        "questions": [
            ("Why does Little Bay de Noc usually build winter ice earlier than southern Michigan waters?", "Northern latitude and the protected bay shape allow it to accumulate cold earlier and hold it longer. The inner and outer bay still behave differently."),
            ("Where are the obvious remote-data blind spots?", "River mouths and local current. A Lake Michigan cover percentage and an Escanaba weather station cannot describe the ice beside the Escanaba or Ford river mouths."),
            ("What can change the outer bay quickly?", "Wind. Where Little Bay de Noc opens toward Green Bay, the sheet is more exposed to movement than the protected inner bay."),
        ],
    },
    "grand-traverse-bay": {
        "behavior": "Deep Great Lakes bay with large thermal mass; protected shallow pockets can behave very differently from the main basin.",
        "watch": "Depth and the difference between protected pockets and the open main basin.",
        "remote": "Accumulated cold + Lake Michigan satellite context + current weather.",
        "questions": [
            ("Why is Grand Traverse Bay slow to freeze?", "The main basin is very deep and stores far more heat than a shallow inland lake or bay. Sustained cold has to overcome that thermal mass before broad ice can develop."),
            ("Which parts are worth watching first in a hard winter?", "The traditional early-watch areas are protected, shallower water such as Suttons Bay, Bowers Harbor, and the far south end of the west arm. That is a freeze pattern, not a safety rating."),
            ("Why can the Lake Michigan ice percentage mislead here?", "The lake-wide number includes far-northern and shallow areas elsewhere. It is useful regional context but cannot tell you whether a specific Grand Traverse Bay pocket has ice."),
        ],
    },
    "burt-mullett": {
        "behavior": "Two deep inland lakes in a connected waterway, so depth delays freeze-up and connecting flow creates local uncertainty.",
        "watch": "Indian River and other current or inlet influence between the basins.",
        "remote": "Accumulated cold + nearby weather; no satellite lake-ice product.",
        "questions": [
            ("Why do Burt and Mullett Lakes freeze later than Houghton Lake?", "They are deeper and hold more heat, so they need a longer cold run before broad freeze-up. The connected waterway adds moving-water complications on top of the depth."),
            ("Is there satellite ice coverage for Burt or Mullett Lake?", "No comparable NOAA lake-ice product exists for these inland lakes. The remote screen is accumulated cold and nearby weather, not observed local ice."),
            ("What is the clearest local hazard in this chain?", "Moving water between the lakes. The Indian River connection and other inlet or spring influence can create conditions that do not match the open basin."),
        ],
    },
}

`;
ice = replaceOne(
  ice,
  '(pathlib.Path(__file__).resolve().parent / "regions.json").write_text(json.dumps(REGIONS, indent=1))',
  decisionData + '(pathlib.Path(__file__).resolve().parent / "regions.json").write_text(json.dumps(REGIONS, indent=1))',
  'region decision data',
);

const comparisonBuilder = `    comparison_rows = "".join(
        f'<tr><td><a href="/michigan-ice/regions/{r["slug"]}.html">{r["short"]}</a></td>'
        f'<td>{REGION_DECISIONS[r["slug"]]["behavior"]}</td>'
        f'<td>{REGION_DECISIONS[r["slug"]]["watch"]}</td>'
        f'<td>{REGION_DECISIONS[r["slug"]]["remote"]}</td></tr>'
        for r in REGIONS)

`;
ice = replaceOne(ice, '    body = (\n        header("/") +', comparisonBuilder + '    body = (\n        header("/") +', 'ice hub comparison builder');

const matrixSection = `        '<h2 id="water-behavior">Which Michigan ice water behaves like what?</h2>'
        '<p>Before comparing numbers, compare the water. Depth, current, exposure, and the kind of remote data available determine what the same cold spell can mean in six different places.</p>'
        '<div class="tbl-wrap"><table><thead><tr><th>Water</th><th>Why it behaves differently</th><th>What can change the trip</th><th>Remote screen available</th></tr></thead><tbody>' + comparison_rows + '</tbody></table></div>'
        '<p class="note">This matrix is a decision shortcut, not a ranking and never a safety rating. Open the water page for its current readings, camera availability, and data limits.</p>'

`;
ice = replaceOne(ice, "        '<h2>Conditions by water</h2>'", matrixSection + "        '<h2>Conditions by water</h2>'", 'ice decision matrix');

ice = replaceOne(
  ice,
  '         "isPartOf": {"@id": SITE + "/#website"},\n         "inLanguage": "en-US", "author": {"@id": PERSON_ID},\n         "breadcrumb": {"@id": url + "#breadcrumb"}},',
  '         "isPartOf": {"@id": SITE + "/#website"},\n         "dateModified": ICE_ROOT_DATE_MODIFIED,\n         "inLanguage": "en-US", "author": {"@id": PERSON_ID},\n         "breadcrumb": {"@id": url + "#breadcrumb"}},',
  'ice region dateModified',
);

const notesNeedle = '    notes = "".join(f\'<div class="tile"><h3>{t}</h3><p>{d}</p></div>\' for t, d in r["notes"])';
const notesReplacement = notesNeedle + `
    question_cards = "".join(
        f'<div class="tile"><h3>{question}</h3><p>{answer}</p></div>'
        for question, answer in REGION_DECISIONS[r["slug"]]["questions"])
`;
ice = replaceOne(ice, notesNeedle, notesReplacement, 'regional question cards');

const regionInsertNeedle = `        '<h2>The other waters</h2>'`;
const regionInsert = `        f'<h2>{r["name"]} ice questions</h2>'
        '<p>These answers describe how this water behaves and what remote data can or cannot tell you. They do not verify local thickness or safety.</p>'
        f'<div class="grid two">{question_cards}</div>'
        '<div class="card"><div class="kicker">Winter companion</div><p style="margin:0 0 8px"><strong>Planning a snow day instead of a hard-water trip?</strong> Compare Michigan cross-country ski regions, then use the live XC tool for the current snow signal.</p>'
        '<p style="margin:0"><a href="https://chrisizworski.com/michigan-cross-country-skiing/">Michigan XC ski planner</a> &middot; <a href="https://xcski.chrisizworski.com/">Live XC conditions</a></p></div>'

        '<h2>The other waters</h2>'`;
ice = replaceOne(ice, regionInsertNeedle, regionInsert, 'regional questions and winter handoff');

const hubCompanionNeedle = `        '<p><em>Heading north? <a href="/up-north-michigan/">Check the rest of the trip before you drive</a>.</em></p>'`;
const hubCompanion = hubCompanionNeedle + `
        '<div class="card"><div class="kicker">Winter companion</div><p style="margin:0"><strong>Snow instead of ice?</strong> <a href="https://chrisizworski.com/michigan-cross-country-skiing/">Compare Michigan XC ski trails</a> or open <a href="https://xcski.chrisizworski.com/">live XC conditions</a>. The ski system treats snow as a regional signal and operator grooming reports as trail truth.</p></div>'`;
ice = replaceOne(ice, hubCompanionNeedle, hubCompanion, 'ice hub winter handoff');
writeFileSync(icePath, ice);

const xcPath = 'public/michigan-cross-country-skiing/index.html';
let xc = readFileSync(xcPath, 'utf8');
const comparisonSection = `<section class="section compare-section" id="trail-compare"><div class="wrap"><p class="eyebrow">Fast comparison</p><h2>Shortlist the trail before you chase the snow</h2><p class="section-intro">This table compares fixed trail characteristics and the best source to check next. It does not claim any trail is groomed today. Open the live XC tool for the regional snow signal, then use the operator or groomer source for the actual trail surface.</p><div class="compare-wrap"><table class="xc-compare"><thead><tr><th>Trail</th><th>Region</th><th>What stands out</th><th>Best next source</th></tr></thead><tbody>
<tr><td>Huron Meadows</td><td>Southeast</td><td>Classic + skate, snowmaking loop</td><td><a href="https://www.metroparks.com/huron-meadows-metropark/" target="_blank" rel="noopener">Metroparks report ↗</a></td></tr>
<tr><td>Forbush Corner</td><td>Northern Lower</td><td>Classic + skate, snowmaking, rentals</td><td><a href="https://www.forbushcorner.com/webcam.html" target="_blank" rel="noopener">Center webcam/weather ↗</a></td></tr>
<tr><td>Vasa Pathway</td><td>Traverse City</td><td>Groomed 3K–25K loop system</td><td><a href="https://traversetrails.org/trails/vasa-pathway/" target="_blank" rel="noopener">TART Trails ↗</a></td></tr>
<tr><td>Tisdale Triangle</td><td>Roscommon</td><td>Mostly flat, approachable groomed system</td><td><a href="https://www.michigan.gov/recsearch/trails/tisdale-triangle-pathway" target="_blank" rel="noopener">DNR trail page ↗</a></td></tr>
<tr><td>Cadillac Pathway</td><td>Cadillac</td><td>Six-loop groomed system</td><td><a href="https://cadillacpathway.org/" target="_blank" rel="noopener">Pathway updates ↗</a></td></tr>
<tr><td>Wildwood Hills</td><td>Indian River</td><td>Classic-focused trail system</td><td><a href="https://www.michigan.gov/recsearch/trails/wildwood-hills-pathway" target="_blank" rel="noopener">DNR trail page ↗</a></td></tr>
<tr><td>Blueberry Ridge</td><td>Marquette</td><td>Groomed loops, lighted loop, warming hut</td><td><a href="https://www.travelmarquette.com/things-to-do/winter-activities/trail-conditions/" target="_blank" rel="noopener">Marquette conditions ↗</a></td></tr>
<tr><td>Algonquin Pathway</td><td>Sault Ste. Marie</td><td>Groomed system with lighted loop</td><td><a href="https://www.michigan.gov/recsearch/trails/algonquin-pathway" target="_blank" rel="noopener">DNR trail page ↗</a></td></tr>
</tbody></table></div><p class="compare-cta"><a class="button" href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-comparison">Now check the live snow signal</a></p></div></section>
`;
xc = replaceOne(
  xc,
  '</div></div></section>\n<section class="section" id="live-vs-guide">',
  '</div></div></section>\n' + comparisonSection + '<section class="section" id="live-vs-guide">',
  'XC comparison section',
);

const sourceHierarchy = `<section class="section source-hierarchy" id="condition-sources"><div class="wrap"><p class="eyebrow">Trust the right signal</p><h2>How to verify a Michigan XC trail today</h2><p class="section-intro">Michigan trail reporting is fragmented, so use a source hierarchy instead of treating every snow number as a grooming report.</p><div class="source-stack"><article><span>1 · trail truth</span><h3>Operator or groomer</h3><p>The trail operator, grooming club, or park is the final source for whether a trail was actually groomed, which technique was set, and whether a facility is operating.</p></article><article><span>2 · regional reporting</span><h3>Community condition networks</h3><p>Regional reports can fill gaps and show recency across multiple systems. Use them as corroboration, then follow the named trail source when the trip depends on it.</p><p><a href="https://nordicskiracer.com/" target="_blank" rel="noopener">NordicSkiRacer ↗</a> · <a href="https://www.skimichigan.org/" target="_blank" rel="noopener">Ski Michigan ↗</a></p></article><article><span>3 · trip screen</span><h3>Snow, temperature and cameras</h3><p>Weather and the live XC map answer whether a region looks plausible. They cannot prove a grooming pass happened. Use them to decide where to investigate, not to label a trail open.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-source-hierarchy">Open live XC conditions →</a></p></article></div></div></section>
`;
xc = replaceOne(
  xc,
  '<section class="section"><div class="wrap"><p class="eyebrow">Primary sources</p>',
  sourceHierarchy + '<section class="section"><div class="wrap"><p class="eyebrow">Primary sources</p>',
  'XC source hierarchy',
);
writeFileSync(xcPath, xc);

const cssPath = 'public/assets/michigan-xc-skiing.css';
let css = readFileSync(cssPath, 'utf8');
css += '.compare-wrap{overflow-x:auto;margin-top:24px}.xc-compare{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(13,53,47,.06)}.xc-compare th,.xc-compare td{text-align:left;vertical-align:top;padding:13px 14px;border-bottom:1px solid var(--line)}.xc-compare th{font:800 11px/1.25 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#57716d;background:#edf5f3}.xc-compare td{font-size:14px}.xc-compare td:first-child{font-weight:700}.xc-compare a{font:800 12px/1.25 system-ui,sans-serif}.compare-cta{margin-top:18px}.source-stack{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:25px}.source-stack article{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 8px 24px rgba(13,53,47,.05)}.source-stack article>span{font:800 11px/1.2 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#55716d}.source-stack h3{font-size:22px;margin:12px 0 8px}.source-stack p{font-size:15px;color:var(--muted)}@media(max-width:840px){.source-stack{grid-template-columns:1fr}}';
writeFileSync(cssPath, css);

console.log('winter engine source migration applied');
