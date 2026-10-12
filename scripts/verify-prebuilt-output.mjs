import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = '.vercel/output';
const config = JSON.parse(readFileSync(path.join(root, 'config.json'), 'utf8'));
assert.equal(config.version, 3);
const source = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert.deepEqual(config.crons, source.crons, 'cron schedules must survive prebuilding');
for (const file of ['index.html', 'tools/index.html', 'ballard-locks/index.html', 'national-tools/ice-out/houghton-lake-michigan/index.html'])
  assert.ok(existsSync(path.join(root, 'static', file)), `missing static page: ${file}`);
const functions = [];
function collect(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) collect(file);
    else if (item.name === '.vc-config.json') functions.push({ file, config: JSON.parse(readFileSync(file, 'utf8')) });
  }
}
collect(path.join(root, 'functions'));
for (const api of ['flight-assignment', 'mackinac-watch', 'ballard-locks', 'garden-water-page', 'epic-ikon-guide'])
  assert.ok(functions.some(x => x.file.endsWith(`/api/${api}.func/.vc-config.json`)), `missing API: ${api}`);
assert.ok(functions.some(x => x.config.runtime === 'edge'), 'middleware must survive prebuilding');
assert.ok(config.routes.length > 100, 'routing composition missing');
console.log(JSON.stringify({ status: 'ok', functions: functions.length, routes: config.routes.length, crons: config.crons.length }));
