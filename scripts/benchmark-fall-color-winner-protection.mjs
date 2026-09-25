#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const benchmarkPath = path.join(root, 'benchmarks', 'fall-color-winner-protection-2026-09-25.json');

function fail(message) {
  failures.push(message);
}

function fileForRoute(route) {
  const clean = route.replace(/^\//, '');
  if (!clean) return path.join(root, 'public', 'index.html');
  return path.join(root, 'public', clean, 'index.html');
}

function readRoute(route) {
  const file = fileForRoute(route);
  if (!fs.existsSync(file)) {
    fail(`Missing protected/support route: ${route} (${path.relative(root, file)})`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function decodeBasicEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function firstH1(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return null;
  return decodeBasicEntities(match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

const failures = [];
const warnings = [];

if (!fs.existsSync(benchmarkPath)) {
  console.error(`Missing benchmark: ${path.relative(root, benchmarkPath)}`);
  process.exit(1);
}

const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

for (const owner of benchmark.owners) {
  const html = readRoute(owner.path);
  if (!html) continue;

  const expected = owner.expected;
  const titleNeedle = `<title>${expected.title}</title>`;
  if (!html.includes(titleNeedle)) {
    fail(`${owner.path} title changed. Expected: ${expected.title}`);
  }

  const descriptionNeedle = `content="${expected.description}"`;
  const descriptionTagPresent = html.includes('<meta name="description"') && html.includes(descriptionNeedle);
  if (!descriptionTagPresent) {
    fail(`${owner.path} meta description changed. Expected protected description.`);
  }

  const canonicalNeedle = `href="${expected.canonical}"`;
  const canonicalTagPresent = html.includes('<link rel="canonical"') && html.includes(canonicalNeedle);
  if (!canonicalTagPresent) {
    fail(`${owner.path} canonical changed. Expected: ${expected.canonical}`);
  }

  const h1 = firstH1(html);
  if (h1 !== expected.h1) {
    fail(`${owner.path} H1 changed. Expected "${expected.h1}" but found "${h1 ?? 'none'}".`);
  }

  const robots = html.match(/<meta\s+name=["']robots["'][^>]*>/i)?.[0] ?? '';
  if (/noindex/i.test(robots)) {
    fail(`${owner.path} became noindex.`);
  }
}

for (const check of benchmark.reinforcementChecks) {
  const html = readRoute(check.path);
  if (!html) continue;

  for (const target of check.mustLinkTo) {
    const hrefDouble = `href="${target}"`;
    const hrefSingle = `href='${target}'`;
    if (!html.includes(hrefDouble) && !html.includes(hrefSingle)) {
      fail(`${check.path} no longer links contextually to protected owner ${target}`);
    }
  }
}

const strategyPath = path.join(root, 'docs', 'search-growth-engine-fall-2026.md');
if (fs.existsSync(strategyPath)) {
  const strategy = fs.readFileSync(strategyPath, 'utf8');
  for (const required of [
    'Current mode: protect the winners',
    'Stop broad Fall Color page expansion',
    'Concentrate internal authority',
    'More indexed Fall Color URLs are **not** a success metric.'
  ]) {
    if (!strategy.includes(required)) {
      fail(`Fall strategy lost required winner-protection rule: ${required}`);
    }
  }
} else {
  fail('Missing docs/search-growth-engine-fall-2026.md');
}

const ownerSummary = benchmark.owners
  .map((owner) => `${owner.id}: ${owner.observed.impressions.toLocaleString()} impr / ${owner.observed.clicks.toLocaleString()} clicks / pos ${owner.observed.position}`)
  .join('\n  ');

if (failures.length) {
  console.error(`Fall Color winner protection: FAIL (${failures.length})`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Fall Color winner protection: PASS');
console.log(`Protected owners: ${benchmark.owners.length}`);
console.log(`Reinforcement surfaces: ${benchmark.reinforcementChecks.length}`);
console.log(`  ${ownerSummary}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
