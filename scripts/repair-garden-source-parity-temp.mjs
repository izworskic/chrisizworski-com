#!/usr/bin/env node
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const path = 'scripts/verify-source.mjs';
let src = readFileSync(path, 'utf8');
const marker = 'const intentionalChanges = new Set([\n';
const entry = '  // Aug 22 2026: measured Zone 6a planting-calendar page-one CTR treatment. Re-crawl after production release, then remove.\n  "/zone-6a-planting-calendar/",\n';
const blockStart = src.indexOf(marker);
const blockEnd = src.indexOf(']);', blockStart);
if (blockStart < 0 || blockEnd < 0) throw new Error('intentionalChanges block not found');
const block = src.slice(blockStart, blockEnd);
if (!block.includes('"/zone-6a-planting-calendar/"')) {
  src = src.replace(marker, marker + entry);
  writeFileSync(path, src);
}
unlinkSync('scripts/repair-garden-source-parity-temp.mjs');
unlinkSync('.github/workflows/garden-source-parity-temp.yml');
execFileSync('git', ['config', 'user.name', 'github-actions[bot]']);
execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
execFileSync('git', ['add', '-A']);
execFileSync('git', ['commit', '-m', 'Declare Zone 6a CTR source parity']);
execFileSync('git', ['push', 'origin', 'HEAD:feat/garden-page-one-ctr-2026-08-22']);
