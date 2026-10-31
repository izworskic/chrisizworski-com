#!/usr/bin/env node
/**
 * Manual, source-only proof-of-collection for Pukaskwa conditions.
 * Does NOT register a schedule, deploy a public status, or imply an official API.
 * Node 22: node scripts/pukaskwa/refresh-conditions.mjs [--output path.json]
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parsePukaskwaConditions, summarizePukaskwa } from '../../lib/pukaskwa/conditions.mjs';
import { SOURCES } from '../../lib/pukaskwa/trail-registry.mjs';

export async function collect({ fetchImpl = fetch, now = new Date() } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchImpl(SOURCES.conditions, {
      headers: { Accept: 'text/html', 'User-Agent': 'ChrisIzworski-PukaskwaConditionsResearch/0.1 (+https://chrisizworski.com/)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Official page HTTP ' + response.status);
    if (!/^https:\/\/(?:www\.)?parks\.canada\.ca\//i.test(response.url || SOURCES.conditions)) throw new Error('Official source unexpectedly redirected');
    const type = response.headers.get('content-type') || '';
    if (!/text\/html/i.test(type)) throw new Error('Official source did not return HTML');
    const body = await response.text();
    const snapshot = parsePukaskwaConditions(body, now.toISOString());
    return { snapshot, summary: summarizePukaskwa(snapshot, { visitDate: now.toISOString().slice(0, 10) }) };
  } finally {
    clearTimeout(timeout);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2);
  if (args.length > 2 || (args.length === 2 && args[0] !== '--output') || (args.length === 1 && args[0] === '--output') || (args.length === 1 && args[0].startsWith('--'))) {
    console.error('Usage: node scripts/pukaskwa/refresh-conditions.mjs [--output path.json]');
    process.exitCode = 2;
  } else {
    try {
      const { snapshot, summary } = await collect();
      const outputFile = args.length ? path.resolve(args[1]) : null;
      if (outputFile) {
        await mkdir(path.dirname(outputFile), { recursive: true });
        await writeFile(outputFile, JSON.stringify({ ...snapshot, evaluated: summary }, null, 2) + '\n');
      }
      console.log(JSON.stringify({
        retrievedAt: snapshot.retrievedAt,
        observations: snapshot.sourceRecords.length,
        outputFile,
        dayHikes: Object.fromEntries(summary.dayHikes.map(t => [t.trailId, t.status])),
        backcountry: Object.fromEntries(summary.backcountry.map(t => [t.trailId, t.status])),
      }, null, 2));
    } catch (error) {
      console.error('Pukaskwa collector failed; no status published: ' + error.message);
      process.exitCode = 1;
    }
  }
}
