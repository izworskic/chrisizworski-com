#!/usr/bin/env node
// Install the pinned browser locally, without touching site dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installRoot = path.join(root, '.agent-tools', 'agent-browser');
const version = '0.43.0';
const binary = path.join(installRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'agent-browser.cmd' : 'agent-browser');
const args = process.argv.slice(2);
const flags = new Set(['--dry-run', '--skip-browser', '--with-deps', '--help']);
function execute(program, operands) {
  const result = spawnSync(program, operands, { cwd:root, stdio:'inherit', timeout:240000, shell:process.platform === 'win32' });
  if (result.error || result.status !== 0) throw new Error(program + ' failed: ' + (result.error?.message || result.status));
}
try {
  if (args.some(a => !flags.has(a))) throw new Error('Unknown option; use --dry-run, --skip-browser or --with-deps');
  if (args.includes('--help')) {
    console.log('node scripts/setup-agent-browser.mjs [--dry-run] [--skip-browser] [--with-deps]');
  } else {
    const npmArgs = ['install','--prefix',installRoot,'--no-save','--package-lock=false','--include=optional','agent-browser@'+version];
    const browserArgs = ['install',...(args.includes('--with-deps') ? ['--with-deps'] : [])];
    if (args.includes('--dry-run')) {
      console.log(JSON.stringify({mode:'DRY RUN - NO INSTALL',version,installRoot,binary,steps:[['npm',npmArgs],...(args.includes('--skip-browser') ? [] : [[binary,browserArgs]]),[binary,['--version']]]},null,2));
    } else {
      if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24+ is required for the pinned Agent Browser setup.');
      if (args.includes('--with-deps') && process.platform !== 'linux') throw new Error('--with-deps is Linux-only.');
      fs.mkdirSync(installRoot, {recursive:true});
      execute(process.platform === 'win32' ? 'npm.cmd' : 'npm', npmArgs);
      if (!fs.existsSync(binary)) throw new Error('Browser executable missing after install: '+binary);
      if (!args.includes('--skip-browser')) execute(binary, browserArgs);
      execute(binary, ['--version']);
      console.log('Agent Browser '+version+' provisioned at '+binary);
    }
  }
} catch (error) {
  console.error('Agent Browser setup: '+error.message);
  process.exitCode=1;
}
