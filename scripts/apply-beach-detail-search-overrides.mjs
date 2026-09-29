#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const publicRoot = path.join(root, 'public', 'great-lakes-beaches');

export const BEACH_DETAIL_SEARCH_OVERRIDES = {
  'warren-dunes-state-park': {
    title: 'Warren Dunes Beach Conditions Today: Waves & Swim Risk',
    description: 'Check Warren Dunes beach conditions today: NWS swim risk, Lake Michigan waves and water temperature, BeachGuard notices, wind and weather.',
    h1: 'Warren Dunes Beach Conditions Today',
    firstAnswer: "Check today's NWS swim risk, Lake Michigan waves, water temperature, wind, weather, and BeachGuard notices before you go. The physical posted flag must still be checked at the beach."
  },
  'luna-pier': {
    title: 'Luna Pier Beach Water Quality & Conditions Today',
    description: 'Check Luna Pier Beach water quality context and conditions today: BeachGuard notices, NWS swim risk, Lake Erie waves, water temperature and weather.',
    h1: 'Luna Pier Beach Water Quality & Conditions Today',
    firstAnswer: 'Check Michigan BeachGuard notices and sampling history, NWS swim risk, Lake Erie waves and water temperature, and weather for Luna Pier. This page does not certify the water as safe; check posted signs and flags onsite.'
  },
  'new-buffalo-beach': {
    title: 'New Buffalo Beach Conditions Today: Swim Risk & Waves',
    description: 'New Buffalo Beach conditions today: NWS swim risk, Lake Michigan waves and water temperature, BeachGuard notices and weather. Confirm the posted flag onsite.',
    h1: 'New Buffalo Beach Conditions Today',
    firstAnswer: "Looking for today's flag? Check current NWS swim risk, BeachGuard notices, Lake Michigan waves, water temperature, and weather here, then confirm the physical posted flag when you arrive."
  },
  'pj-hoffmaster-state-park': {
    title: 'P.J. Hoffmaster Beach Conditions Today: Waves & Water',
    description: 'Check P.J. Hoffmaster beach conditions today: NWS swim risk, Lake Michigan waves, water temperature, BeachGuard notices, wind and weather.',
    h1: 'P.J. Hoffmaster Beach Conditions Today',
    firstAnswer: "Check today's Lake Michigan waves, water temperature, wind, weather, BeachGuard notices, and NWS alerts for P.J. Hoffmaster before heading to the beach. Confirm posted flags and shoreline conditions onsite."
  },
  'oscoda-beach-park': {
    title: 'Oscoda Beach Park Conditions Today: Waves & Water',
    description: 'Check Oscoda Beach Park conditions today: Lake Huron waves and water temperature, BeachGuard notices, NWS alerts, wind and weather.',
    h1: 'Oscoda Beach Park Conditions Today',
    firstAnswer: "Check today's Lake Huron waves, water temperature, wind, weather, BeachGuard notices, and NWS alerts for Oscoda Beach Park before you go. Confirm posted flags and shoreline conditions onsite."
  }
};

const PICTURED_ROCKS_PLANNER_URL = 'https://picturedrocks.chrisizworski.com/';
const PICTURED_ROCKS_PLANNER_LINKS = {
  'miners-beach': '<p>Planning more than the beach? Use the <a href="https://picturedrocks.chrisizworski.com/">Pictured Rocks map and trip planner</a> to compare Miners Beach with boat, kayak, hiking, and drive options across the national lakeshore.</p>',
  'sand-point-pictured-rocks': '<p>Using Sand Point as one stop in a larger visit? <a href="https://picturedrocks.chrisizworski.com/">Plan your Pictured Rocks day</a> with the park-wide map, current weather and access, and 1- or 2-day itinerary builder.</p>',
  'twelvemile-beach': '<p>Building an east-end day around Twelvemile Beach? The <a href="https://picturedrocks.chrisizworski.com/">Pictured Rocks trip planner</a> maps the park by west, Chapel, and east zones and builds realistic 1- or 2-day routes.</p>'
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeJson(value) {
  return JSON.stringify(String(value)).slice(1, -1);
}

export function applyBeachDetailSearchOverride(source, override) {
  let html = source;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(override.title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(override.description)}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(override.title)}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(override.description)}">`);
  html = html.replace(/("@type": "WebPage",[\s\S]*?"name": ")[^"]+("\s*,)/, `$1${escapeJson(override.h1)}$2`);
  html = html.replace(/("@type": "WebPage",[\s\S]*?"description": ")[^"]+("\s*,)/, `$1${escapeJson(override.description)}$2`);
  html = html.replace(/<h1 id="page-title">[^<]*<\/h1>/, `<h1 id="page-title">${escapeHtml(override.h1)}</h1>`);
  html = html.replace(/<p class="hero-lede">[^<]*<\/p>/, `<p class="hero-lede">${escapeHtml(override.firstAnswer)}</p>`);
  html = html.replace(/"dateModified":\s*"\d{4}-\d{2}-\d{2}"/, '"dateModified": "2026-08-22"');
  return html;
}

export function applyPicturedRocksPlannerLink(source, linkHtml) {
  if (source.includes(`href="${PICTURED_ROCKS_PLANNER_URL}"`)) return source;
  const marker = /(<p>[^<]+Its report combines[\s\S]*?<\/p>)/;
  if (!marker.test(source)) return source;
  return source.replace(marker, `$1\n        ${linkHtml}`)
    .replace(/"dateModified":\s*"\d{4}-\d{2}-\d{2}"/, '"dateModified": "2026-09-28"');
}

for (const [slug, override] of Object.entries(BEACH_DETAIL_SEARCH_OVERRIDES)) {
  const file = path.join(publicRoot, slug, 'index.html');
  const original = await readFile(file, 'utf8');
  const next = applyBeachDetailSearchOverride(original, override);
  if (next === original) throw new Error(`No search-facing change applied for ${slug}`);
  await writeFile(file, next);
}

for (const [slug, linkHtml] of Object.entries(PICTURED_ROCKS_PLANNER_LINKS)) {
  const file = path.join(publicRoot, slug, 'index.html');
  const original = await readFile(file, 'utf8');
  const next = applyPicturedRocksPlannerLink(original, linkHtml);
  if (!next.includes(`href="${PICTURED_ROCKS_PLANNER_URL}"`)) {
    throw new Error(`Pictured Rocks planner link was not applied for ${slug}`);
  }
  await writeFile(file, next);
}
