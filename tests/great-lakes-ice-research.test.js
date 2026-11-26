const test = require('node:test');
const { execFileSync } = require('node:child_process');
test('offline Great Lakes research replay preserves historical receipts and never promotes forecasts', () => {
  execFileSync('python3', ['-B', 'test_research.py'], { cwd: 'scripts/ice/research', stdio: 'pipe', timeout: 30000 });
});
