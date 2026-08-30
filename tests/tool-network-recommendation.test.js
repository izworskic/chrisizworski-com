const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'report-tool-network-registry.mjs');

test('registry sees Circle Tour amplification executed, network repairs complete, and fall candidate under test', () => {
  const output = execFileSync(process.execPath, [script, '--focus=circle-tour'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, TOOL_NETWORK_MONTH: '8' },
  });

  assert.match(output, /Focus recommendation/);
  assert.match(output, /AMPLIFY \+ MEASURE\s+Lake Superior Circle Tour \[circle-tour\]/);
  const connections = output.match(/(\d+) inbound \/ (\d+) outbound · search evidence unknown · in season/);
  assert.ok(connections, 'Circle Tour connection summary should be present');
  assert.ok(Number(connections[1]) >= 2, 'Circle Tour should retain at least two useful inbound relationships');
  assert.ok(Number(connections[2]) >= 3, 'Circle Tour should retain at least three useful outbound relationships');
  assert.match(output, /Active network experiments/);
  assert.match(output, /RUNNING-CONTEXTUAL-TEST\s+Best Fall River Paddle Window \[fall-river-window-v1\]/);
  assert.match(output, /Network repair priority/);
  assert.match(output, /None\. No non-leaf nodes are isolated\./);
  assert.doesNotMatch(output, /Isolated non-leaf nodes/);
  assert.doesNotMatch(output, /Michigan Border Wait Times \[border-waits\] · in season · evidence growing/);
  assert.doesNotMatch(output, /Perfect Lawn Advisor \[perfect-lawn\] · in season · evidence unknown/);
  assert.match(output, /Candidate after network repair/);
  assert.match(output, /TEST RUNNING\s+93\/100\s+Best Fall River Paddle Window \[fall-river-window\]/);
  assert.match(output, /Promotion gate: Build a standalone canonical only when searchEvidence is true and networkEvidence is true and safety remains true\./);
});
