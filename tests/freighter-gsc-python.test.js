const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
test('Python freighter search analysis preserves scope and weighted metrics', () => {
  const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_freighter_gsc.py'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
