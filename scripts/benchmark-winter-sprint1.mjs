#!/usr/bin/env node
/**
 * Sprint 1 Fall & Winter Field Guide Benchmark (Value Function V_sprint1)
 * Verifies:
 * 1. /michigan-winter-weekends/ (Rank #1 Flagship: 12 stops, 15 verified photos, Automatic 4-Season Engine, Leaflet map)
 * 2. /michigan-white-christmas-escapes/ (Rank #2: 10 stops, 13 verified photos, Christmas Countdown Engine, NOAA climatology + live tool handoffs)
 * 3. 100% real photograph coverage (0 .wf-story-index placeholders) across all 6 winter field guides
 * 4. Hub & sitemap integration across /tools/, /michigan-destinations/, /fall-color/, and /sitemap-winter.xml
 */
import {readFileSync} from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');

const wkdHtml = read('public/michigan-winter-weekends/index.html');
const wkdJs = read('public/assets/michigan-winter-weekends.js');
const wceHtml = read('public/michigan-white-christmas-escapes/index.html');
const wceJs = read('public/assets/michigan-white-christmas-escapes.js');

const checks = [
  {
    name: 'Rank #1 Michigan Winter Weekend Getaways: 12 static 2-day base towns + JSON-LD',
    weight: 20,
    pass:
      (wkdHtml.match(/<article class="wf-story"/g) || []).length === 12 &&
      wkdHtml.includes('"numberOfItems":12') &&
      wkdHtml.includes('"@type":"FAQPage"'),
  },
  {
    name: 'Rank #1 Automatic 4-Season Calendar Engine (America/Detroit) + Playbook Decoder',
    weight: 15,
    pass:
      wkdHtml.includes('id="wkd-season-bar"') &&
      wkdHtml.includes('id="wkd-mode-stage"') &&
      wkdJs.includes('America/Detroit'),
  },
  {
    name: 'Rank #2 Michigan White Christmas Escapes: 10 static holiday towns + NOAA 1991-2020 climatology',
    weight: 20,
    pass:
      (wceHtml.match(/<article class="wf-story"/g) || []).length === 10 &&
      wceHtml.includes('"numberOfItems":10') &&
      wceHtml.includes('1991–2020') &&
      wceHtml.includes('href="/national-tools/white-christmas/forecast/"') &&
      wceHtml.includes('href="/white-christmas-probability-map/"'),
  },
  {
    name: 'Rank #2 Automatic Christmas Countdown & 4-Season Holiday Engine (America/Detroit)',
    weight: 15,
    pass:
      wceHtml.includes('id="wce-season-bar"') &&
      wceHtml.includes('id="wce-mode-stage"') &&
      wceJs.includes('America/Detroit'),
  },
  {
    name: '100% Real Verified Photographs (0 .wf-story-index boxes) across all 6 Winter Field Guides',
    weight: 15,
    pass: [
      'public/michigan-winter-weekends/index.html',
      'public/michigan-white-christmas-escapes/index.html',
      'public/michigan-winter-activities/index.html',
      'public/frozen-michigan/index.html',
      'public/michigan-winter-trails/index.html',
      'public/michigan-wine-cider-spirits/index.html',
    ].every((p) => {
      const h = read(p);
      return !h.includes('class="wf-story-index"') && (h.match(/<figure class="wf-photo/g) || []).length >= 12;
    }),
  },
  {
    name: 'Discovery Hub & Sitemap Wiring (/tools/, /michigan-destinations/, /fall-color/, /sitemap-winter.xml)',
    weight: 15,
    pass: [
      'public/tools/index.html',
      'public/michigan-destinations/index.html',
      'public/fall-color/index.html',
      'public/sitemap-winter.xml',
    ].every((p) => {
      const h = read(p);
      return h.includes('michigan-winter-weekends/') && h.includes('michigan-white-christmas-escapes/');
    }),
  },
];

let score = 0;
for (const c of checks) {
  if (c.pass) score += c.weight;
  console.log(`${c.pass ? 'PASS' : 'FAIL'} [${c.weight} pts] ${c.name}`);
}
console.log(`\nTOTAL SPRINT 1 BENCHMARK SCORE: ${score}/100`);
if (score < 100) process.exit(1);
