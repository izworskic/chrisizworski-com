#!/usr/bin/env node
// Run after source mirrors and page generators, so their legacy About navigation
// cannot reintroduce the retired identity URL. No product text/schema is rewritten.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { consolidateIdentityLinks } from '../lib/identity-links.mjs';
const check = process.argv.includes('--check');
let changed = 0;
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith('.html')) {
      const source = await readFile(file, 'utf8');
      const next = consolidateIdentityLinks(source);
      if (next !== source) {
        changed++;
        if (!check) await writeFile(file, next);
      }
    }
  }
}
await walk(new URL('../public', import.meta.url).pathname.replace(/\/$/, ''));
console.log(`Identity navigation: ${changed} HTML pages ${check ? 'still need consolidation' : 'consolidated'}.`);
if (check && changed) process.exitCode = 1;
