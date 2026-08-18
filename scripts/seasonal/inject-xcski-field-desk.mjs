#!/usr/bin/env node

/*
 * Prepares the separately deployed XC skiing page for the Seasonal Field Desk.
 *
 * This deliberately writes to a separate output file. The current repository
 * does not own xcski.chrisizworski.com, so the script fails closed instead of
 * pretending it can safely replace that deployment.
 *
 * Usage:
 *   node scripts/seasonal/inject-xcski-field-desk.mjs source.html output.html
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error("usage: node scripts/seasonal/inject-xcski-field-desk.mjs source.html output.html");
  process.exit(1);
}

const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
if (input === output) {
  console.error("output must differ from input; this tool never overwrites the source file");
  process.exit(1);
}

let html = await readFile(input, "utf8");
const required = [
  '<body>',
  '<p class="status" id="region-status">',
  '<div class="bar"><div class="wrap">',
  '<footer><div class="wrap">',
  '</head>',
  '</body>',
];
for (const marker of required) {
  if (!html.includes(marker)) {
    console.error(`XC source changed: required marker is missing: ${marker}`);
    process.exit(1);
  }
}
if (html.includes("data-seasonal-module=\"xc-trail-decisions\"")) {
  console.error("XC source already contains the Seasonal Field Desk");
  process.exit(1);
}

const assets = [
  '<link rel="stylesheet" href="https://chrisizworski.com/assets/seasonal-field-desk.css">',
  '<script defer src="/_vercel/insights/script.js"></script>',
  '<script defer src="https://chrisizworski.com/assets/seasonal-field-desk.js"></script>',
].join("\n");

const decisions = `
<section class="seasonal-desk" data-seasonal-module="xc-trail-decisions" aria-labelledby="xc-trail-title">
  <div class="seasonal-desk__head">
    <div>
      <span class="seasonal-desk__kicker">Pick the ski day</span>
      <h2 class="seasonal-desk__title" id="xc-trail-title">What kind of trail do you need?</h2>
    </div>
    <p class="seasonal-desk__note">Snow is a regional signal. Confirm grooming with the operator.</p>
  </div>
  <div class="seasonal-desk__choices">
    <a class="seasonal-choice seasonal-choice--primary" href="#map" data-xcski-filter="all" data-seasonal-action="open-snow-map" data-seasonal-persona="conditions-first-skier" data-seasonal-placement="hero">
      <span class="seasonal-choice__persona">Conditions first / today</span>
      <strong>Start with the snow map</strong>
      <span class="seasonal-choice__detail">Compare the live regional snow signal at all 48 trailheads.</span>
    </a>
    <a class="seasonal-choice" href="#map" data-xcski-filter="rentals" data-seasonal-action="filter-rentals" data-seasonal-persona="new-skier" data-seasonal-placement="hero">
      <span class="seasonal-choice__persona">New skier / no gear</span>
      <strong>Find trails with rentals</strong>
      <span class="seasonal-choice__detail">Start with staffed centers where you can rent and ask questions.</span>
    </a>
    <a class="seasonal-choice" href="#map" data-xcski-filter="groomed" data-seasonal-action="filter-groomed" data-seasonal-persona="grooming-first-skier" data-seasonal-placement="hero">
      <span class="seasonal-choice__persona">Classic or skate / groomed</span>
      <strong>Show groomed centers</strong>
      <span class="seasonal-choice__detail">Narrow the directory before you reach the 48 trail cards.</span>
    </a>
  </div>
  <p class="seasonal-desk__note"><a href="https://chrisizworski.com/michigan-cross-country-skiing/" data-seasonal-action="open-xc-guide" data-seasonal-persona="trip-planner" data-seasonal-placement="hero">Planning a trip instead of checking today? Open the statewide Michigan XC ski guide →</a></p>
</section>`;

const switcher = `
<nav class="seasonal-switcher" data-seasonal-module="seasonal-tools" aria-label="Michigan seasonal field tools">
  <div class="seasonal-switcher__head">
    <strong>Michigan, season by season</strong>
    <span>Fall &middot; snow &middot; ice</span>
  </div>
  <div class="seasonal-switcher__links">
    <a href="https://chrisizworski.com/fall-color/" data-seasonal-tool-open="fall-color" data-seasonal-placement="seasonal-switcher">Fall color</a>
    <a href="https://xcski.chrisizworski.com/" aria-current="page">Cross-country skiing</a>
    <a href="https://chrisizworski.com/michigan-ice/" data-seasonal-tool-open="michigan-ice" data-seasonal-placement="seasonal-switcher">Ice conditions</a>
  </div>
</nav>`;

const behavior = `
<script>
document.querySelectorAll("[data-xcski-filter]").forEach(function (choice) {
  choice.addEventListener("click", function () {
    var filter = document.querySelector('.f[data-filter="' + choice.dataset.xcskiFilter + '"]');
    if (filter) filter.click();
  });
});
document.querySelectorAll(".f[data-filter]").forEach(function (filter) {
  filter.dataset.seasonalAction = "filter-" + filter.dataset.filter;
  filter.dataset.seasonalPersona = "trail-browser";
  filter.dataset.seasonalPlacement = "sticky-filters";
});
</script>`;

html = html
  .replace("</head>", `${assets}\n</head>`)
  .replace("<body>", '<body class="seasonal-xc" data-seasonal-tool="xc-skiing">')
  .replace('<div class="bar"><div class="wrap">', `<div class="wrap">${decisions}</div>\n<div class="bar"><div class="wrap">`)
  .replace('<footer><div class="wrap">', `${switcher}\n<footer><div class="wrap">`)
  .replace("</body>", `${behavior}\n</body>`);

await writeFile(output, html, "utf8");
console.log(`wrote ${output}`);
