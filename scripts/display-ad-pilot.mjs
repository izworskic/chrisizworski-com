#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import pilot from '../lib/display-ad-experiment.js';

const root = path.resolve(import.meta.dirname, '..');
const configPath = path.join(root, 'config/display-ad-experiment.json');
const settings = JSON.parse(await readFile(configPath, 'utf8'));
const mode = process.argv[2] || 'apply';
if (!['apply', 'on', 'off', 'status'].includes(mode)) throw new Error('Use apply, on, off, or status');
if (mode === 'on' || mode === 'off') {
  settings.enabled = mode === 'on';
  await writeFile(configPath, JSON.stringify(settings, null, 2) + '\n');
}
if (mode === 'status') {
  console.log(JSON.stringify(settings, null, 2));
} else {
  const publicRoot = path.join(root, 'public');
  const seen = new Set();
  const writes = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(file); continue; }
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      const route = '/' + path.relative(publicRoot, file).split(path.sep).join('/').replace(/index\.html$/, '');
      const html = await readFile(file, 'utf8');
      if (settings.placements.some(p => p.route === route)) seen.add(route);
      // Strip all previously generated blocks, including removed registry routes.
      const rendered = pilot.render(html, route, settings);
      if (rendered !== html) writes.push([file, rendered]);
    }
  }
  await walk(publicRoot);
  if (settings.enabled) {
    for (const p of settings.placements.filter(p => p.enabled)) {
      if (!seen.has(p.route)) throw new Error(`Pilot route not found in public output: ${p.route}`);
    }
  }
  // Validate every anchor before modifying any page.
  for (const [file, html] of writes) await writeFile(file, html);
  console.log(JSON.stringify({ experiment: settings.id, enabled: settings.enabled,
    placements: settings.enabled ? settings.placements.filter(p => p.enabled).map(p => p.route) : [],
    pagesChanged: writes.length }));
}
