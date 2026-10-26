const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('scripts/audit-million-impressions-cohort.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/million-impressions-cohort.yml', 'utf8');

test('Million Impressions remains on-demand and targeted to audit changes', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /\n\s*(push|schedule):/);
  assert.match(workflow, /scripts\/audit-million-impressions-cohort\.mjs/);
});

test('Million Impressions includes distinct winter and White Christmas discovery pages', () => {
  for (const path of [
    '/tools/', '/lake-effect-snow/', '/michigan-snow-depth/',
    '/michigan-ice/', '/michigan-ice-caves/', '/snowmobile/',
    '/michigan-cross-country-skiing/', '/michigan-ski-hills/',
    '/great-lakes-freighter-winter-layup/', '/white-christmas-probability-map/',
    '/national-tools/white-christmas/', '/national-tools/white-christmas/forecast/'
  ]) assert.ok(script.includes("path: '" + path + "'"), 'Missing audited URL: ' + path);
});

test('Audit is read only and fails for any monitored technical defect', () => {
  assert.match(script, /allPagesTechnicalPass: results\.every\(p => p\.issues\.length === 0\)/);
  assert.match(script, /if \(!output\.allPagesTechnicalPass\)/);
  assert.doesNotMatch(script, /fetch\([^\n]+method: ['"](?:POST|PUT|DELETE)/);
});
