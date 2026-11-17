import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = async (name) => readFile(path.join(root, name), 'utf8');

test('REA is a pinned, local-only agent server, not a site dependency', async () => {
  const config = JSON.parse(await read('.mcp.json'));
  assert.deepEqual(Object.keys(config), ['mcpServers']);
  assert.deepEqual(Object.keys(config.mcpServers), ['rea']);
  assert.deepEqual(config.mcpServers.rea, {
    command: 'npx',
    args: ['-y', 'rea-agents@6.9.0', 'mcp'],
  });

  const pkg = JSON.parse(await read('package.json'));
  assert.equal(Object.hasOwn(pkg.dependencies || {}, 'rea-agents'), false);
  assert.equal(Object.hasOwn(pkg.devDependencies || {}, 'rea-agents'), false);
  assert.equal(Object.hasOwn(pkg.optionalDependencies || {}, 'rea-agents'), false);
  for (const [scriptName, command] of Object.entries(pkg.scripts || {})) {
    assert.doesNotMatch(command, /\brea-agents\b/, `${scriptName} must not launch REA`);
  }
});

test('REA instructions preserve the project release workflow', async () => {
  const doc = await read('docs/REA_DEVELOPMENT_WORKFLOW.md');
  const claude = await read('CLAUDE.md');
  const agents = await read('AGENTS.md');

  assert.match(doc, /rea-agents@6\.9\.0/);
  assert.match(doc, /--client codex --dry-run/);
  assert.match(doc, /authoritative owning repository/);
  assert.match(doc, /full CI gate before merge/);
  assert.match(claude, /REA_DEVELOPMENT_WORKFLOW\.md/);
  assert.match(agents, /REA_DEVELOPMENT_WORKFLOW\.md/);
});
