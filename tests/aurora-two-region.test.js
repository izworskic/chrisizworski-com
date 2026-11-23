const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function replay(sourceRoot) {
  const html = fs.readFileSync(path.join(sourceRoot, 'public/northern-lights-michigan/index.html'), 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('const LOCATIONS ='))[1];
  const nodes = {
    compareRegion: { value: 'keweenaw', options: [] },
    comparisonResult: { textContent: '' },
    comparisonGuide: { removeAttribute(key) { delete this[key]; } }
  };
  const at = '2026-11-23T03:00:00Z';
  const other = { id: 'keweenaw', label: 'Keweenaw', latitude: 47, longitude: -88, planning_kp: 4,
    sky_cover: { periods: [{ start_time: at, end_time: '2026-11-23T06:00:00Z', percent: 14 }] } };
  const home = { id: 'bay-city', label: 'Bay City', planning_kp: 7 };
  const data = { fetched_at: at, ovation: { regions: [other] } };
  const context = vm.createContext({ window: {addEventListener() {}}, document: {getElementById: id => nodes[id]}, data, home,
    choice: {row: {time_tag: at, kp: 5}, cloud: 22} });
  vm.runInContext(script, context);
  const run = code => vm.runInContext(code, context);
  run("selectedRegionId = 'bay-city'");
  const compare = () => run("if (typeof renderComparison === 'function') renderComparison(data, home, choice)");
  compare();
  const together = nodes.comparisonResult.textContent;
  const guide = nodes.comparisonGuide.href;
  other.sky_cover.periods = [];
  compare();
  const missing = nodes.comparisonResult.textContent;
  const stale = run("typeof currentForecast === 'function' && !currentForecast(data, Date.parse(data.fetched_at) + 21*60000)");
  const title = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
  return [
    {id:'same-hour',passed:together.includes('10:00 PM ET') && together.includes('22%') && together.includes('14%') && guide === '/northern-lights-michigan/keweenaw/',observed:together || 'Only one region can be examined at a time.'},
    {id:'cloud-gap',passed:missing.includes('unknown cloud cover') && !missing.includes('14%'),observed:missing || 'There is no comparison of an unknown sky against home.'},
    {id:'expired',passed:stale,observed:stale ? 'Regional response expires after the existing twenty-minute limit.' : 'Regional response has no age guard.'},
    {id:'canonical',passed:title === 'https://chrisizworski.com/northern-lights-michigan/',observed:title}
  ];
}
const rootArg = process.argv.indexOf('--source-root');
if (rootArg >= 0) {
  console.log(JSON.stringify({cases:replay(process.argv[rootArg + 1])}));
} else {
  const test = require('node:test');
  const assert = require('node:assert/strict');
  for (const item of replay(path.resolve(__dirname, '..'))) {
    test('Regional comparison: '+item.id, () => assert.ok(item.passed, item.observed));
  }
}
