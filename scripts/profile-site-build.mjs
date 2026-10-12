import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const stages = JSON.parse(readFileSync('package.json', 'utf8')).scripts['build:site'].split(' && ');
const rows = [];
for (const [index, command] of stages.entries()) {
  const start = performance.now();
  const result = spawnSync(command, { shell: true, stdio: 'inherit' });
  rows.push({ index: index + 1, command, seconds: Number(((performance.now() - start) / 1000).toFixed(3)), exitCode: result.status, signal: result.signal });
  console.log(`Build profile: ${index + 1}/${stages.length} ${rows.at(-1).seconds}s`);
  if (result.status !== 0 || result.signal) break;
}
const output = process.argv[2] || 'build-profile.json';
writeFileSync(output, JSON.stringify({ stageCount: stages.length, completed: rows.length, totalSeconds: rows.reduce((n, row) => n + row.seconds, 0), stages: rows }, null, 2) + '\n');
process.exit(rows.at(-1)?.exitCode === 0 && rows.length === stages.length ? 0 : 1);
