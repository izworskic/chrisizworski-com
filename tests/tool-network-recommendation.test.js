const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'report-tool-network-registry.mjs');

test('registry recommends Circle Tour amplification, network repair, then evidence-gated fall candidate', () => {
  const output = execFileSync(process.execPath, [script, '--focus=circle-tour'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, TOOL_NETWORK_MONTH: '8' },
  });

  assert.match(output, /Focus recommendation/);
  assert.match(output, /AMPLIFY \+ MEASURE\s+Lake Superior Circle Tour \[circle-tour\]/);
  assert.match(output, /2 inbound \/ 2 outbound · search evidence unknown · in season/);
  assert.match(output, /Network repair priority/);
  assert.match(output, /Michigan Border Wait Times \[border-waits\] · in season · evidence growing/);
  assert.match(output, /Candidate after network repair/);
  assert.match(output, /TEST FIRST\s+93\/100\s+Best Fall River Paddle Window \[fall-river-window\]/);
  assert.match(output, /Gate: Strong seasonal composition candidate if query data shows river \+ color planning demand\./);
});
