#!/usr/bin/env node
/**
 * Scheduled monitor runner: source HTML -> typed observation -> reconciled
 * condition feed + report. Writes NO data to the public website or to main.
 * Usage: node scripts/pukaskwa/monitor-conditions.mjs --output /tmp/latest.json
 *        --report /tmp/report.json [--previous /tmp/prior.json]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collect } from './refresh-conditions.mjs';
import { recordSuccess, recordFailure } from '../../lib/pukaskwa/condition-monitor.mjs';

export async function runMonitor({ previous = null, checkedAt = new Date().toISOString(), collectImpl = collect } = {}) {
  try {
    const collected = await collectImpl({ now: new Date(checkedAt) });
    return recordSuccess(previous, collected.snapshot, checkedAt);
  } catch (error) {
    return recordFailure(previous, error, checkedAt);
  }
}

function parseArgs(args) {
  if (args.length < 4 || args.length > 6 || args.length % 2 !== 0) throw new Error('Expected --output and --report, plus optional --previous');
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--output', '--report', '--previous'].includes(args[i]) || values.has(args[i]) || !args[i + 1]) throw new Error('Unexpected or duplicate monitor argument');
    values.set(args[i], path.resolve(args[i + 1]));
  }
  if (!values.has('--output') || !values.has('--report')) throw new Error('Missing output or report');
  if (new Set(values.values()).size !== values.size) throw new Error('Monitor paths must be distinct');
  return values;
}

async function main() {
  const paths = parseArgs(process.argv.slice(2));
  let previous = null;
  if (paths.has('--previous')) {
    try {
      previous = JSON.parse(await readFile(paths.get('--previous'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const { feed, report } = await runMonitor({ previous });
  for (const name of ['--output', '--report']) {
    await mkdir(path.dirname(paths.get(name)), { recursive: true });
  }
  await writeFile(paths.get('--output'), JSON.stringify(feed, null, 2) + '\n');
  await writeFile(paths.get('--report'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    result: report.result, observations: report.observations,
    sourceRetrievedAt: report.sourceRetrievedAt ?? null,
    lastSuccessAt: report.lastSuccessAt,
    changed: report.changed, meaningfulChanges: report.changes.length,
    closureHolds: report.holds.length,
    failures: report.failureCount,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    // An invalid prior feed is a hard failure. Never overwrite it as a fresh baseline.
    console.error('Pukaskwa monitor cannot publish a valid state: ' + err.message);
    process.exitCode = 1;
  });
}
