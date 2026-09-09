import fs from 'node:fs';
import path from 'node:path';

const source = path.join('public', 'melvin-price', 'index.html');
const targetDir = path.join('public', 'national-tools', 'melvin-price-live');
const target = path.join(targetDir, 'index.html');

if (!fs.existsSync(source)) throw new Error(`Melvin Price source page missing: ${source}`);
fs.mkdirSync(targetDir, { recursive: true });

let html = fs.readFileSync(source, 'utf8');
const explainer = /\n\s*<section class="panel" aria-labelledby="whatKnow"><h3 id="whatKnow">What we know — and what we don't<\/h3>[\s\S]*?<\/section>/;
html = html.replace(explainer, '');
html = html.replace('<div class="ops-grid">', '<div class="ops-grid" style="grid-template-columns:1fr">');

// Decision v3 keeps the proven live adapters intact, separates the near-real-time
// LPMS traffic report from the older manual/gage observation timestamp, and then
// applies the same visitor-oriented decision layer to the corrected freshness model.
html = html.replace("fetch('/api/melvin-price'", "fetch('/api/melvin-price-v3'");
html = html.replace(
  "setText('decisionTitle',visit?.label||'DATA LIMITED');",
  "setText('decisionTitle',visit?.headline||visit?.label||'DATA LIMITED');",
);
html = html.replace(
  /setText\('decisionCopy',visit\?\.label==='EXCELLENT'[\s\S]*?'Check the live details below\. Some parts of the decision picture are limited or mixed\.'\);/,
  "setText('decisionCopy',visit?.summary||'Check the live details below. Some parts of the decision picture are limited or mixed.');",
);
html = html.replace(
  "setText('activityExtra',m.lockingNow>0?'USACE reports active lockage':'completed up + down lockages');",
  "setText('activityExtra',m.lockingNow>0?'USACE reports active lockage':data.traffic?.comparison?`${data.traffic.comparison.shortLabel} · 2024 avg ${data.traffic.comparison.averageDaily2024}/day`:'completed up + down lockages');",
);
html = html.replace(
  "setText('queueExtra',`LPMS · ${ageLabel(m.observedAt)}`);",
  "setText('queueExtra',`LPMS traffic · ${locks.trafficFreshness||locks.freshness}`);",
);
html = html.replace(
  "setText('opsSource',`Source: USACE LPMS · ${ageLabel(m.observedAt)} · nominal 15-minute report cadence`);",
  "setText('opsSource',`Source: USACE LPMS · traffic report nominal 15-minute cadence · gage/status observation ${ageLabel(m.observedAt)}`);",
);

const tourClientReplacement = [
  "if(t){",
  "      if(t.closedToday){",
  "        setText('tourVal','Closed today','val');",
  "        setText('tourExtra',t.closureReason||'Museum closed');",
  "        setText('tourNextBig','No tours today');",
  "        setText('tourCountdown',t.closureReason||'Museum closed');",
  "      }else{",
  "        setText('tourVal',t.nextTour||'Tours done','val');",
  "        setText('tourExtra',t.nextTour?(t.opportunity?.state==='TIGHT'?'Starts soon · sign-up may be tight':`${t.minutesUntilNextTour} min · scheduled`):'Today’s scheduled tours have passed');",
  "        setText('tourNextBig',t.nextTour||'Tours done');",
  "        setText('tourCountdown',t.nextTour?(t.opportunity?.state==='TIGHT'?`Starts in ${t.minutesUntilNextTour} minutes · USACE recommends arriving ~15 minutes early`:`Starts in ${t.minutesUntilNextTour} minutes · arrive ~15 minutes early`):'Today’s regular tour times have passed');",
  "      }",
  "      setText('museumState',t.museumOpen?'OPEN':'CLOSED')",
  "    }",
].join('\n');
html = html.replace(
  /if\(t\)\{setText\('tourVal'[\s\S]*?setText\('museumState',t\.museumOpen\?'OPEN':'CLOSED'\)\}/,
  tourClientReplacement,
);

html = html.replace(
  'Normal tour times: 10 AM · 1 PM · 3 PM',
  'Normal tours: 10 AM · 1 PM · 3 PM<br>Sign up at desk · arrive ~15 min early · max 25',
);
html = html.replace(
  'Tour times are the normal published schedule, not a same-day operational guarantee. Weather, maintenance, security or river operations can alter access. Check the official museum information before a long drive.',
  'Tour times are the normal published schedule, not a same-day operational guarantee. Public tours are limited to 25 participants, and USACE asks visitors to arrive about 15 minutes early to sign up at the museum desk. Weather, maintenance, security or river operations can alter access.',
);

fs.writeFileSync(source, html, 'utf8');

// Keep SEO authority consolidated on the original canonical while exposing the same
// product through the National Tools URL pattern used for discovery and navigation.
html = html.replace(
  '<meta property="og:url" content="https://chrisizworski.com/melvin-price/">',
  '<meta property="og:url" content="https://chrisizworski.com/national-tools/melvin-price-live/">',
);
fs.writeFileSync(target, html);
console.log('Melvin Price National Tools route synced with decision-v3 split traffic/gage freshness.');
