'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const load = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const ENDPOINT = 'https://design.penpot.app/mcp/stream';

test('Claude, Codex and Cursor expose the official remote MCP without publishing secrets', () => {
  const claude = JSON.parse(load('.mcp.json'));
  const cursor = JSON.parse(load('.cursor/mcp.json'));
  const codex = load('.codex/config.toml');

  assert.deepEqual(Object.keys(claude.mcpServers), ['penpot']);
  assert.deepEqual(Object.keys(cursor.mcpServers), ['penpot']);
  assert.deepEqual(claude.mcpServers.penpot, { type: 'http', url: ENDPOINT });
  assert.deepEqual(cursor.mcpServers.penpot, { url: ENDPOINT });
  assert.match(codex, /^\[mcp_servers\.penpot\]\s*\nurl\s*=\s*"https:\/\/design\.penpot\.app\/mcp\/stream"/m);

  for (const content of [JSON.stringify(claude), JSON.stringify(cursor), codex]) {
    assert.doesNotMatch(content, /userToken|api[_-]?key|password|bearer\s|authorization|mcp-remote/i);
    assert.doesNotMatch(content, /localhost|127\.0\.0\.1/);
  }
});

test('both supported agents see the same explicit-use skill', () => {
  const codex = load('.agents/skills/penpot-design/SKILL.md');
  const claude = load('.claude/skills/penpot-design/SKILL.md');
  assert.equal(codex, claude);
  assert.match(codex, /^---\nname: penpot-design\ndescription: "On-demand Penpot[\s\S]*?\n---/);
  assert.match(codex, /ONLY when the user explicitly asks/);
  assert.match(codex, /high_level_overview/);
  assert.match(codex, /read-only.*execute_code/);
  assert.match(codex, /Suggest → Review → Apply/);
  assert.match(codex, /owning GitHub repo/);
  assert.match(codex, /Never invent a connected Penpot file/);
  assert.match(codex, /No Penpot token/);
  assert.match(codex, /[Dd]o not automatically merge or deploy/);
});

test('the workflow remains source only, with separate authorization and Experience OS release gates', () => {
  const doc = load('docs/PENPOT_DESIGN_WORKFLOW.md');
  const agents = load('AGENTS.md');
  const claudeInstructions = load('CLAUDE.md');
  assert.match(doc, /No Penpot account has been authorized/);
  assert.match(doc, /MCP → Connect/);
  assert.match(doc, /codex mcp login penpot/);
  assert.match(doc, /Experience OS and Foundry/);
  assert.match(doc, /owner merge instructions/);
  assert.match(doc, /node --test tests\/penpot-design-integration\.test\.js/);
  assert.match(agents, /Penpot design.*on-demand/i);
  assert.match(claudeInstructions, /penpot-design/);
  assert.doesNotMatch(doc, /(?:^|\s)YOUR_MCP_KEY\s*=/);
});
