const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

test('Mackinac trip-duration value benchmark passes as a release gate', () => {
  const r = spawnSync(process.execPath, ['scripts/benchmark-mackinac-trip-duration.mjs','--check'], {
    encoding:'utf8',
    env:{...process.env, VERCEL:''},
    maxBuffer:1024*1024*5
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  assert.equal(r.status,0,'Mackinac trip-duration benchmark failed');
});
