const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const PAGE = fs.readFileSync(path.join(ROOT, 'public/niagara-border-crossing/index.html'), 'utf8');
const JS = fs.readFileSync(path.join(ROOT, 'public/assets/niagara-border-crossing.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'public/assets/niagara-border-experience.css'), 'utf8');

test('Niagara page leads with traveler action rather than product mechanics', () => {
  assert.match(PAGE, /Cross Niagara without guessing\./);
  assert.match(PAGE, /What is happening there/i);
  assert.match(PAGE, /If you take this bridge right now/i);
  assert.doesNotMatch(PAGE, /Proof\s*→\s*Experience\s*→\s*Understanding/i);
  const decisionIndex = PAGE.indexOf('id="decision"');
  const sourceIndex = PAGE.indexOf('Official sources and live-feed health');
  assert.ok(decisionIndex >= 0 && sourceIndex > decisionIndex, 'source mechanics must come after the traveler decision');
});

test('first decision surface includes direction, traveler and natural route controls', () => {
  assert.match(PAGE, /data-direction="to_canada"/);
  assert.match(PAGE, /data-direction="to_us"/);
  assert.match(PAGE, /id="travelerSelect"/);
  assert.match(PAGE, /id="preferredSelect"/);
  assert.match(PAGE, /id="oversizeToggle"/);
  assert.match(PAGE, /for="travelerSelect"/);
  assert.match(PAGE, /for="oversizeToggle"/);
});

test('live reality and journey are driven from the actual decision payload', () => {
  assert.match(JS, /function renderReality\(payload\)/);
  assert.match(JS, /function renderJourney\(payload\)/);
  assert.match(JS, /operator_validation/);
  assert.match(JS, /result\?\.source\?\.name/);
  assert.match(JS, /crossing\?\.toll\?\.\[state\.direction\]/);
  assert.match(JS, /experience/);
});

test('main traveler language avoids internal decision-engine jargon', () => {
  assert.doesNotMatch(PAGE, /route-switch guardrail/i);
  assert.doesNotMatch(PAGE, /authority hierarchy/i);
  assert.doesNotMatch(PAGE, /deterministic output/i);
  assert.doesNotMatch(PAGE, /proof layer/i);
});

test('source health and methodology are progressive disclosure', () => {
  const details = PAGE.match(/<details>/g) || [];
  assert.ok(details.length >= 2, 'expected methodology and source health disclosures');
  assert.match(PAGE, /<summary(?:\s+[^>]*)?>How this recommendation is made<\/summary>/);
  assert.match(PAGE, /<summary(?:\s+[^>]*)?>Official sources and live-feed health<\/summary>/);
});

test('390px mobile layout puts answer before controls and removes the large hero photo', () => {
  assert.match(CSS, /@media\(max-width:620px\)/);
  assert.match(CSS, /\.hero-photo\{display:none\}/);
  assert.match(CSS, /\.trip-desk\{display:flex;flex-direction:column/);
  assert.match(CSS, /\.trip-answer\{order:1/);
  assert.match(CSS, /\.trip-controls\{order:2/);
  assert.match(CSS, /\.bridge-choice-grid\{grid-template-columns:1fr 1fr/);
  assert.match(CSS, /\.journey-steps\{grid-template-columns:1fr\}/);
});

test('camera action prefers the focused bridge specific official camera link', () => {
  assert.match(JS, /function exactCameraLink\(crossing\)/);
  assert.match(JS, /experience\?\.official_links\?\.find/);
  assert.match(JS, /camera\|webcam/i);
  assert.match(JS, /crossing\.traffic_url/);
  assert.match(JS, /Open official border wait/);
});

test('unknown approach state does not become a clear-roads claim', () => {
  assert.match(JS, /That is not a guarantee of clear roads/);
  assert.doesNotMatch(JS, /roads are clear/i);
});

test('stale waits cannot be presented as current live waits', () => {
  assert.match(JS, /SOURCE_STALE/);
  assert.match(JS, /Stale — recheck/);
  assert.match(JS, /usable_for_recommendation/);
  assert.match(JS, /it is not treated as current/i);
});

test('Whirlpool operator context stays operator context instead of border-agency corroboration', () => {
  assert.match(JS, /source\?\.kind === "operator"/);
  assert.match(JS, /operator context/i);
  assert.match(JS, /does not have equivalent real-time wait technology/i);
  assert.match(JS, /OPERATOR_CONTEXT_ONLY/);
});

test('bus and trailer travelers never inherit passenger operator context', () => {
  assert.match(JS, /if \(state\.traveler === "passenger"\) return "passenger";[\s\S]*return null;/);
});

test('oversize commercial movement preserves approval-required state in the UI', () => {
  assert.match(JS, /requires_approval/);
  assert.match(JS, /Approval required/);
  assert.match(CSS, /\.caution\{color:/);
});

test('closed crossings are described as closed before static eligibility copy', () => {
  const currentRule = JS.slice(JS.indexOf('function currentRule'), JS.indexOf('function tripStatus'));
  assert.ok(currentRule.indexOf('CROSSING_CLOSED') >= 0);
  assert.ok(currentRule.indexOf('CROSSING_CLOSED') < currentRule.indexOf('eligibility?.eligible'));
  assert.match(currentRule, /Do not enter this crossing/i);
});

test('weather feed failure is distinct from a successful no-alert response', () => {
  assert.match(JS, /nws_weather\?\.available \|\| payload\?\.sources\?\.eccc_weather\?\.available/);
  assert.match(JS, /Weather check unavailable/);
  assert.match(JS, /Do not read the absence of alerts as an all-clear/i);
  assert.match(CSS, /\.weather-unavailable\{/);
});

test('failed refresh clears every dependent live panel', () => {
  const failure = JS.slice(JS.indexOf('function renderFailure'), JS.indexOf('function queryString'));
  for (const marker of [
    'latestPayload = null',
    'crossingGrid.innerHTML',
    'realityGrid.innerHTML',
    'journeySteps.innerHTML',
    'compareGrid.innerHTML',
    'eligibilityBody.innerHTML',
    'weatherAlerts.innerHTML',
  ]) assert.match(failure, new RegExp(marker.replace('.', '\\.')));
});

test('journey exit copy uses side-specific destinations instead of parsing the display route', () => {
  assert.match(JS, /Niagara Falls, Ontario and Highway 420/);
  assert.match(JS, /Lewiston, New York and I-190/);
  assert.match(JS, /destinationLabels\[crossing\?\.id\]\?\.\[state\.direction\]/);
});

test('no-JavaScript travelers get direct official-source guidance', () => {
  assert.match(PAGE, /<noscript>/);
  assert.match(PAGE, /Live comparison needs JavaScript/);
  assert.match(PAGE, /https:\/\/bwt\.cbp\.gov\//);
  assert.match(PAGE, /https:\/\/www\.cbsa-asfc\.gc\.ca\/bwt-taf\/menu-eng\.html/);
});
