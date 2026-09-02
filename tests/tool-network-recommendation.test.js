const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'report-tool-network-registry.mjs');

test('registry sees Circle Tour amplification executed and all experiments closed', () => {
  const output = execFileSync(process.execPath, [script, '--focus=circle-tour'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, TOOL_NETWORK_MONTH: '8' },
  });

  assert.match(output, /Focus recommendation/);
  assert.match(output, /AMPLIFY \+ OBSERVE\s+Lake Superior Circle Tour \[circle-tour\]/);
  const connections = output.match(/(\d+) inbound \/ (\d+) outbound · search evidence unknown · in season/);
  assert.ok(connections, 'Circle Tour connection summary should be present');
  assert.ok(Number(connections[1]) >= 2, 'Circle Tour should retain at least two useful inbound relationships');
  assert.ok(Number(connections[2]) >= 3, 'Circle Tour should retain at least three useful outbound relationships');
  assert.match(output, /Operating mode: ship and observe · no search experiment or freeze is active/);
  assert.match(output, /Network repair priority/);
  assert.match(output, /None\. No non-leaf nodes are isolated\./);
  assert.doesNotMatch(output, /Michigan Border Wait Times \[border-waits\] · in season · evidence growing/);
  assert.doesNotMatch(output, /Perfect Lawn Advisor \[perfect-lawn\] · in season · evidence unknown/);
  assert.match(output, /Candidate after network repair/);
  assert.doesNotMatch(output, /fall-river-window-v1/);
  assert.match(output, /SHELVED\s+Best Fall River Paddle Window →/);
});
