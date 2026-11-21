import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (name) => readFile(path.join(root, name), 'utf8');

test('REA cannot auto-connect through this repository', async () => {
  const config = JSON.parse(await read('.mcp.json'));
  const servers = config.mcpServers || {};
  assert.ok(Object.keys(servers).every(name => !/\brea\b|rea-agents/i.test(name)));
  assert.doesNotMatch(JSON.stringify(servers), /rea-agents/i);

  const pkg = JSON.parse(await read('package.json'));
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    assert.equal(Object.hasOwn(pkg[section] || {}, 'rea-agents'), false);
  }
  for (const [name, command] of Object.entries(pkg.scripts || {})) {
    assert.doesNotMatch(command, /\brea-agents\b/, `${name} must not launch REA`);
  }
});

test('REA instructions require explicit invocation and pinned one-off CLI', async () => {
  const doc = await read('docs/REA_DEVELOPMENT_WORKFLOW.md');
  const claude = await read('CLAUDE.md');
  const agents = await read('AGENTS.md');

  assert.match(doc, /Do not launch, install, connect, or use REA unless the owner explicitly asks/);
  assert.match(doc, /npx -y rea-agents@6\.9\.0 analyze-javascript-application/);
  assert.match(doc, /no REA entry/);
  assert.match(doc, /full CI gate/);
  assert.match(claude, /only when explicitly requested/);
  assert.match(agents, /only when the owner explicitly requests REA/);
});

test('REA is a discoverable identical opt-in skill for Codex and Claude Code', async () => {
  const codex = await read('.agents/skills/rea/SKILL.md');
  const claude = await read('.claude/skills/rea/SKILL.md');
  const agents = await read('AGENTS.md');
  const guide = await read('docs/REA_DEVELOPMENT_WORKFLOW.md');
  const copilot = await read('.github/copilot-instructions.md');
  const rootClaude = await read('CLAUDE.md');

  assert.equal(codex, claude);
  assert.ok(codex.startsWith('---\nname: rea\ndescription: "'));
  assert.ok(codex.includes('explicitly requests REA'));
  assert.ok(codex.includes('npx -y rea-agents@6.9.0 analyze-javascript-application'));
  assert.ok(codex.includes('Do not run `npx rea-agents setup`'));
  assert.ok(codex.includes('REA stays off by default'));
  assert.ok(codex.includes('not installed or running merely because'));
  assert.ok(agents.includes('.agents/skills/rea/SKILL.md'));
  assert.ok(agents.includes('.claude/skills/rea/SKILL.md'));
  assert.ok(guide.includes('Both skill files must remain identical'));
  assert.ok(copilot.includes('REA is explicit-use only'));
  assert.ok(rootClaude.includes('.claude/skills/rea/SKILL.md'));
  for (const file of [codex, claude]) {
    assert.ok(!file.includes('–') && !file.includes('—'), 'avoid prohibited punctuation');
  }
});
