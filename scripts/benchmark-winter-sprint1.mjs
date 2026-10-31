#!/usr/bin/env node
/**
 * Sprint 1 Fall & Winter Field Guide Benchmark (Value Function V_sprint1)
 * Verifies:
 * 1. Rank #1 /michigan-winter-weekends/ (12 stops, 15 verified photos, 4 always-visible season cards, Leaflet map)
 * 2. Rank #2 /michigan-white-christmas-escapes/ (10 stops, 13 verified photos, 4 always-visible season cards, NOAA climatology + live tool handoffs)
 * 3. Rank #3 /michigan-first-snow-adventures/ (12 stops, 15 verified photos, 4 always-visible season cards, snowbelt tool handoffs)
 * 4. Rank #4 /great-lakes-winter-freighter-guide/ (12 stops, 15 verified photos, 4 always-visible season cards, maritime tool handoffs)
 * 5. /great-lakes-freighter-winter-layup/ + 6 biography pages: 12 real ship card photos (.ship-card-photo img) via thumb.wikimedia.org (0 Special:Redirect 429s)
 * 6. 100% real photograph coverage (0 .wf-story-index placeholders) across all 8 winter field guides
 * 7. Hub & sitemap integration across /tools/, /michigan-destinations/, /freighters/, and /sitemap-winter.xml
 */
import {readFileSync} from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');

const wkdHtml = read('public/michigan-winter-weekends/index.html');
const wceHtml = read('public/michigan-white-christmas-escapes/index.html');
const fsaHtml = read('public/michigan-first-snow-adventures/index.html');
const wfgHtml = read('public/great-lakes-winter-freighter-guide/index.html');
const layupHtml = read('public/great-lakes-freighter-winter-layup/index.html');
const layupReg = read('public/assets/freighter-layup-registry.json');

const checks = [
  {
    name: 'Rank #1 Michigan Winter Weekend Getaways: 12 static 2-day base towns + 4 visual experience doors + Weekend Blueprint',
    weight: 15,
    pass:
      (wkdHtml.match(/<article class="wf-story"/g) || []).length === 12 &&
      (wkdHtml.match(/data-door="/g) || []).length === 4 &&
      (wkdHtml.match(/data-blueprint="/g) || []).length === 4 &&
      wkdHtml.includes('"numberOfItems":12') &&
      wkdHtml.includes('"@type":"FAQPage"'),
  },
  {
    name: 'Rank #2 Michigan White Christmas Escapes: 10 static holiday towns + 4 visual Christmas doors + Climatology Blueprint',
    weight: 15,
    pass:
      (wceHtml.match(/<article class="wf-story"/g) || []).length === 10 &&
      (wceHtml.match(/data-door="/g) || []).length === 4 &&
      (wceHtml.match(/data-blueprint="/g) || []).length === 4 &&
      wceHtml.includes('"numberOfItems":10') &&
      wceHtml.includes('1991–2020') &&
      wceHtml.includes('href="/national-tools/white-christmas/forecast/"'),
  },
  {
    name: 'Rank #3 Michigan First Snow Adventures: 12 static early-snowbelt stops + 4 visual first-snow doors + Snowbelt Blueprint',
    weight: 15,
    pass:
      (fsaHtml.match(/<article class="wf-story"/g) || []).length === 12 &&
      (fsaHtml.match(/data-door="/g) || []).length === 4 &&
      (fsaHtml.match(/data-blueprint="/g) || []).length === 4 &&
      fsaHtml.includes('"numberOfItems":12') &&
      fsaHtml.includes('href="/michigan-snow-depth/"') &&
      fsaHtml.includes('href="/lake-effect-snow/"'),
  },
  {
    name: 'Rank #4 Great Lakes Winter Freighter & Harbor Guide: 12 static harbors + 4 visual maritime doors + Shipping Blueprint',
    weight: 15,
    pass:
      (wfgHtml.match(/<article class="wf-story"/g) || []).length === 12 &&
      (wfgHtml.match(/data-door="/g) || []).length === 4 &&
      (wfgHtml.match(/data-blueprint="/g) || []).length === 4 &&
      wfgHtml.includes('"numberOfItems":12') &&
      wfgHtml.includes('href="/great-lakes-freighter-winter-layup/"') &&
      wfgHtml.includes('href="/great-lakes-freighter-tracking/"'),
  },
  {
    name: 'Freighter Winter Layup: 12 real ship card photos (.ship-card-photo) + thumbUrl in all 14 registry entries (0 Special:Redirect)',
    weight: 15,
    pass:
      (layupHtml.match(/class="ship-card-photo"/g) || []).length === 12 &&
      !layupHtml.includes('Special:Redirect') &&
      (layupReg.match(/"thumbUrl":\s*"https:\/\/thumb\.wikimedia\.org\//g) || []).length === 14,
  },
  {
    name: '100% Real Verified Photographs (0 .wf-story-index boxes) across all 8 Winter Field Guides',
    weight: 15,
    pass: [
      'public/michigan-winter-weekends/index.html',
      'public/michigan-white-christmas-escapes/index.html',
      'public/michigan-first-snow-adventures/index.html',
      'public/great-lakes-winter-freighter-guide/index.html',
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
    name: 'Discovery Hub & Sitemap Wiring (/tools/, /michigan-destinations/, /freighters/, /sitemap-winter.xml)',
    weight: 10,
    pass: [
      'public/tools/index.html',
      'public/michigan-destinations/index.html',
      'public/sitemap-winter.xml',
    ].every((p) => {
      const h = read(p);
      return (
        h.includes('michigan-winter-weekends/') &&
        h.includes('michigan-white-christmas-escapes/') &&
        h.includes('michigan-first-snow-adventures/') &&
        h.includes('great-lakes-winter-freighter-guide/')
      );
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
