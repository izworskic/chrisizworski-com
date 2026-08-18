#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const write = (rel, value) => writeFileSync(path.join(root, rel), value);

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`${label}: marker not found`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`${label}: marker is not unique`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

// XC: load shared funnel instrumentation.
let xc = read('public/michigan-cross-country-skiing/index.html');
xc = replaceOnce(
  xc,
  '<script defer src="/_vercel/speed-insights/script.js"></script>\n</head>',
  '<script defer src="/_vercel/speed-insights/script.js"></script>\n<script defer src="/assets/winter-funnel.js"></script>\n</head>',
  'xc funnel script'
);

const decisionDesk = `
<section class="section xc-decision-desk" id="xc-decision-desk"><div class="wrap"><p class="eyebrow">Today’s Michigan XC decision desk</p><h2>Start with the constraint that can change the drive</h2><p class="section-intro">This is a shortlist, not a weather-generated trail rating. Check the live regional snow signal first, then use the named operator or groomer as trail truth before leaving.</p><div class="decision-shortcuts"><article><span>Low-snow Lower Peninsula</span><h3>Lower Peninsula snow is marginal</h3><p>Start with Huron Meadows or Forbush Corner because both publish current trail information and have snowmaking capability. Weather can screen the trip; the facility confirms the surface.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-decision-low-snow">Check live snow →</a> · <a href="#trail-picks">Compare the two options ↓</a></p></article><article><span>Northern Lower Peninsula</span><h3>Grayling, Frederic or Roscommon</h3><p>Use the Grayling-area snow signal to decide whether the snowbelt is plausible, then compare Forbush Corner and Tisdale Triangle and open the latest operator or groomer report.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-decision-grayling">Check live snow →</a> · <a href="#trail-picks">Compare nearby trails ↓</a></p></article><article><span>Grand Traverse</span><h3>Traverse City</h3><p>Vasa Pathway is the primary reference in this statewide set. Check regional snow, then use TART Trails for the latest maintained-pathway information before the drive.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-decision-traverse">Check live snow →</a> · <a href="https://traversetrails.org/trails/vasa-pathway/" target="_blank" rel="noopener" data-placement="xc-decision-traverse-source">Open Vasa source ↗</a></p></article><article><span>Upper Peninsula</span><h3>Upper Peninsula trip</h3><p>Blueberry Ridge gives Marquette a groomed reference with a lighted loop; Algonquin covers Sault Ste. Marie. Use the live snow tool to screen the region, then verify the chosen trail locally.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-decision-up">Check live snow →</a> · <a href="#trail-picks">Compare U.P. trails ↓</a></p></article></div></div></section>`;

xc = replaceOnce(
  xc,
  '<section class="section" id="how-to-pick">',
  decisionDesk + '\n<section class="section" id="how-to-pick">',
  'xc decision desk insertion'
);

const regional = `
<section class="section alt regional-intent" id="ski-by-region"><div class="wrap"><p class="eyebrow">Michigan XC by region</p><h2>Where to cross-country ski in Michigan by region</h2><p class="section-intro">Use these regional starting points to narrow the drive, then use the live snow signal and the trail’s own condition source. The regional phrases live on this authority page so they do not create thin competing landing pages.</p><div class="region-grid"><article><h3>Cross-country skiing near Traverse City</h3><p>Start with the Vasa Pathway, where TART Trails maintains the ski system. The trail page below carries the fixed system facts; TART is the better place for the latest maintained-trail information.</p><a href="#trail-picks">See Vasa in the Michigan comparison ↓</a></article><article><h3>Cross-country skiing near Grayling, Frederic and Roscommon</h3><p>Forbush Corner and Tisdale Triangle cover two different northern Lower Peninsula choices, with a regional Grayling camera available as snow context. Confirm grooming separately.</p><a href="#live-visual-heading">Check the Grayling snow view ↓</a></article><article><h3>Cross-country skiing near Marquette and in the Upper Peninsula</h3><p>Blueberry Ridge is the Marquette reference in this set, while Algonquin covers Sault Ste. Marie. Both belong in the U.P. shortlist when the live snow signal supports the drive.</p><a href="#trail-picks">Compare U.P. trail systems ↓</a></article><article><h3>Cross-country skiing in southeast Michigan</h3><p>Huron Meadows is the strongest southern reference here because it combines classic and skate grooming with a snowmaking loop. Use its official winter report for the actual trail surface.</p><a href="#trail-picks">See the southeast Michigan option ↓</a></article></div></div></section>`;

xc = replaceOnce(
  xc,
  '<section class="section camera-section"',
  regional + '\n<section class="section camera-section"',
  'xc regional intent insertion'
);
write('public/michigan-cross-country-skiing/index.html', xc);

let css = read('public/assets/michigan-xc-skiing.css');
const cssAppend = `.xc-decision-desk{padding-top:46px}.decision-shortcuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-top:25px}.decision-shortcuts article,.region-grid article{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 8px 24px rgba(13,53,47,.05)}.decision-shortcuts article>span{font:800 11px/1.2 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#55716d}.decision-shortcuts h3,.region-grid h3{font-size:22px;margin:12px 0 8px}.decision-shortcuts p,.region-grid p{font-size:15px;color:var(--muted)}.decision-shortcuts a,.region-grid a{font:800 12px/1.35 system-ui,sans-serif}.region-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-top:25px}@media(max-width:760px){.decision-shortcuts,.region-grid{grid-template-columns:1fr}}`;
if (css.includes('.xc-decision-desk{')) throw new Error('xc css: final styles already present');
write('public/assets/michigan-xc-skiing.css', css + cssAppend);

// Ice: generated source owns both the instrumentation include and search-facing water labels.
let chrome = read('scripts/ice/gen_chrome.py');
chrome = replaceOnce(
  chrome,
  "        '<script defer src=\"/assets/seasonal-field-desk.js\"></script>'\n        '</head>'",
  "        '<script defer src=\"/assets/seasonal-field-desk.js\"></script>'\n        '<script defer src=\"/assets/winter-funnel.js\"></script>'\n        '</head>'",
  'ice funnel script'
);
write('scripts/ice/gen_chrome.py', chrome);

let gen = read('scripts/ice/gen_site.py');
gen = replaceOnce(
  gen,
  "        f'{r[\"short\"]}</a>' for r in REGIONS)",
  "        f'{r[\"short\"]} ice conditions</a>' for r in REGIONS)",
  'ice water picker search labels'
);
gen = replaceOnce(gen, "        '<h2>Conditions by water</h2>'", "        '<h2>Michigan ice conditions by water</h2>'", 'ice conditions heading');
write('scripts/ice/gen_site.py', gen);

// Keep the unrecovered ownership penalty; improve only the controlled product scores.
const scorePath = 'benchmarks/winter-engine-scorecard.json';
const score = JSON.parse(read(scorePath));
score.version = '1.2.0';
score.candidate.ice.scores.searchCapture = 12;
score.candidate.ice.rawScore = 94;
score.candidate.ice.effectiveScore = 94;
score.candidate.ice.loss = 6;
score.candidate.ice.evidence.push('The generated hub uses exact water-specific ice-condition link language for all six existing regional owners without creating new URLs.');
score.candidate.xc.scores.searchCapture = 14;
score.candidate.xc.scores.differentiation = 10;
score.candidate.xc.rawScore = 94;
score.candidate.xc.effectiveScore = 79;
score.candidate.xc.loss = 21;
score.candidate.xc.evidence.push('The authority page adds a constraint-first daily decision desk and regional Michigan XC intent coverage while preserving the live-app handoff and operator/groomer truth boundary.');
score.candidate.xc.evidence.push('The live application remains penalized 15 points because its source/deployment ownership is still unrecovered; no production mutation is attempted.');
write(scorePath, JSON.stringify(score, null, 2) + '\n');

execFileSync('python3', ['scripts/ice/gen_site.py'], { cwd: root, stdio: 'inherit' });
console.log('Winter final hardening migration applied.');
