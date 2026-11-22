#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const artifactRoot = path.join(repoRoot, 'artifacts', 'agent-browser-qa');
const allowedHosts = new Set(['chrisizworski.com', 'www.chrisizworski.com', 'localhost', '127.0.0.1']);

function usage() {
  return [
    'Read-only Agent Browser smoke for owned/local pages.',
    'Usage: node scripts/agent-browser-smoke.mjs --url URL [--out artifacts/agent-browser-qa/name] [--dry-run]',
    'Target must be https://chrisizworski.com, https://www.chrisizworski.com, or localhost/127.0.0.1 (http or https).',
    'No clicks. Chrome/agent-browser is only required for a real run. Artifacts are ignored by Git.'
  ].join('\n');
}

function parseArgs(args) {
  const opts = { url: null, out: null, dryRun: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' || arg === '--out') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value after ' + arg);
      opts[arg.slice(2)] = args[++i];
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else {
      throw new Error('Unexpected argument: ' + arg);
    }
  }
  return opts;
}

function validateUrl(raw) {
  if (!raw) throw new Error('--url is required');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Invalid URL'); }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!allowedHosts.has(url.hostname)) throw new Error('Only the owned site or local pages are permitted');
  if (url.username || url.password) throw new Error('Credentials in URLs are not permitted');
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('HTTPS required for public site');
  }
  if (!local && url.port && url.port !== '443') throw new Error('Unexpected public port');
  return url.href;
}

function outputDirFor(value, id) {
  const resolved = path.resolve(repoRoot, value || path.join('artifacts', 'agent-browser-qa', id));
  if (resolved !== artifactRoot && !resolved.startsWith(artifactRoot + path.sep)) {
    throw new Error('Output must stay in gitignored artifacts/agent-browser-qa/');
  }
  return resolved;
}

function plan(url, out) {
  return [
    ['open', ['open', url]],
    ['mobile-viewport', ['set', 'viewport', '390', '844']],
    ['mobile-reload', ['reload']],
    ['mobile-snapshot', ['snapshot']],
    ['mobile-screenshot', ['screenshot', path.join(out, 'mobile.png')]],
    ['mobile-console', ['console']],
    ['mobile-errors', ['errors']],
    ['mobile-network', ['network', 'requests']],
    ['desktop-viewport', ['set', 'viewport', '1280', '900']],
    ['desktop-reload', ['reload']],
    ['desktop-snapshot', ['snapshot']],
    ['desktop-screenshot', ['screenshot', path.join(out, 'desktop.png')]],
    ['desktop-console', ['console']],
    ['desktop-errors', ['errors']],
    ['desktop-network', ['network', 'requests']]
  ];
}

function callBrowser(session, args) {
  return spawnSync('agent-browser', ['--session', session, '--content-boundaries', '--max-output', '20000', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 45000,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, AGENT_BROWSER_NO_WEBMCP: '1' }
  });
}

function main() {
  let opts, url, output, session;
  try {
    opts = parseArgs(process.argv.slice(2));
    if (opts.help) { console.log(usage()); return 0; }
    url = validateUrl(opts.url);
    session = 'abqa-' + process.pid + '-' + Date.now();
    output = outputDirFor(opts.out, session);
  } catch (error) {
    console.error('Agent Browser smoke: ' + error.message + '\n' + usage());
    return 2;
  }

  const steps = plan(url, output);
  if (opts.dryRun) {
    console.log(JSON.stringify({ mode: 'DRY RUN ONLY - no browser executed', url, output, steps }, null, 2));
    return 0;
  }

  const report = { mode: 'real browser attempted', url, output, startedAt: new Date().toISOString(), steps: [], success: false };
  fs.mkdirSync(output, { recursive: true });
  let failed = false;
  try {
    for (const [label, args] of steps) {
      const result = callBrowser(session, args);
      const detail = { label, command: args, exitCode: result.status, error: result.error && result.error.message };
      report.steps.push(detail);
      if (label.includes('snapshot') || label.includes('console') || label.includes('errors') || label.includes('network')) {
        fs.writeFileSync(path.join(output, label + '.txt'), (result.stdout || '') + '\n' + (result.stderr || ''));
      }
      if (result.error || result.status !== 0) {
        failed = true;
        console.error('Agent Browser command failed (' + label + '): ' + (result.error ? result.error.message : (result.stderr || 'exit ' + result.status)));
        break;
      }
      console.log('OK: ' + label);
    }
    report.success = !failed;
  } finally {
    const close = callBrowser(session, ['close']);
    report.closeExitCode = close.status;
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log('Local diagnostic evidence: ' + output);
  if (failed) return 1;
  console.log('Browser baseline captured. Interactive behavior, map correctness and accessibility are NOT VERIFIED by this smoke.');
  return 0;
}

process.exitCode = main();
