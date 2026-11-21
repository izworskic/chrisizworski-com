const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Playwright skill is available to Codex, Claude Code and Copilot', () => {
  const canonical = read('.agents/skills/playwright-browser-qa/SKILL.md');
  assert.match(canonical, /^---\nname: playwright-browser-qa\n/);
  assert.match(canonical, /Playwright CLI/);
  assert.match(canonical, /owning/);
  assert.match(canonical, /npm run verify:all/);
  assert.equal(read('.claude/skills/playwright-browser-qa/SKILL.md'), canonical);
  assert.equal(read('.github/skills/playwright-browser-qa/SKILL.md'), canonical);
});

test('Agent instruction indexes link to the shared workflow', () => {
  for (const file of [
    'AGENTS.md',
    'CLAUDE.md',
    '.github/copilot-instructions.md',
    '.cursor/rules/playwright-browser-qa.mdc'
  ]) {
    assert.match(read(file), /playwright-browser-qa\/SKILL\.md/, file);
  }
  const workflow = read('docs/PLAYWRIGHT_BROWSER_QA_WORKFLOW.md');
  assert.match(workflow, /Playwright test runner/);
  assert.match(workflow, /not run/);
  assert.match(workflow, /No real purchases/);
});

test('Browser evidence directories are excluded from commits', () => {
  const ignore = read('.gitignore');
  assert.match(ignore, /^\.playwright-cli\/$/m);
  assert.match(ignore, /^artifacts\/playwright-qa\/$/m);
  assert.match(ignore, /^playwright-report\/$/m);
  assert.match(ignore, /^test-results\/$/m);
});
