#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = async (rel) => readFile(path.join(root, rel), 'utf8');
const exists = async (rel) => { try { await access(path.join(root, rel)); return true; } catch { return false; } };

const [tools, home, xc, ice, benchmark] = await Promise.all([
  read('public/tools/index.html'),
  read('public/index.html'),
  read('public/michigan-cross-country-skiing/index.html'),
  read('public/michigan-ice/index.html'),
  read('benchmarks/winter-persona-flow.json').then(JSON.parse),
]);

const checks = [];
const add = (category, points, pass, label) => checks.push({ category, points, pass: Boolean(pass), label });

// 25: Tools task routing
add('toolsIntentRouter', 5, tools.includes('id="winter-task-router"'), 'winter task router exists');
for (const persona of ['skier', 'ice-checker', 'winter-day', 'undecided']) {
  add('toolsIntentRouter', 3, tools.includes(`data-winter-persona="${persona}"`), `${persona} persona is explicit`);
}
add('toolsIntentRouter', 4, tools.includes('Choose the winter question you are trying to answer'), 'router explains the decision model');
add('toolsIntentRouter', 4, tools.includes('Plan trail → live snow → groomer') && tools.includes('Choose water → cold trend → local check'), 'router shows next-step sequences');

// 20: Search-intent ownership
add('searchIntentOwnership', 7, tools.includes('<a href="/michigan-cross-country-skiing/">Michigan Cross-Country Skiing, Trails and Live Conditions</a>'), 'visible XC catalog entry uses planning hub');
add('searchIntentOwnership', 5, tools.includes('"url":"https://chrisizworski.com/michigan-cross-country-skiing/"'), 'structured data uses planning hub');
add('searchIntentOwnership', 4, tools.includes('href="https://xcski.chrisizworski.com/"') && tools.includes('Live trail conditions'), 'live XC remains a secondary destination');
add('searchIntentOwnership', 4, tools.includes('href="/michigan-ice/"') && tools.includes('Michigan Ice Report'), 'Ice keeps its primary hub ownership');

// 15: Homepage entry
add('homepageEntry', 5, home.includes('class="winter-path"'), 'homepage winter path exists');
add('homepageEntry', 4, home.includes('href="/michigan-cross-country-skiing/"'), 'homepage links XC planning hub');
add('homepageEntry', 4, home.includes('href="/michigan-ice/"'), 'homepage links Michigan Ice');
add('homepageEntry', 2, home.includes('href="/tools/#winter-task-router"'), 'homepage can continue to full winter router');

// 20: Cluster continuation
add('clusterContinuation', 5, xc.includes('href="/tools/"') && xc.includes('href="/michigan-ice/"'), 'XC links back to Tools and across to Ice');
add('clusterContinuation', 5, xc.includes('https://xcski.chrisizworski.com/'), 'XC planning hub hands off to live conditions');
add('clusterContinuation', 5, ice.includes('https://chrisizworski.com/michigan-cross-country-skiing/') || ice.includes('href="/michigan-cross-country-skiing/"'), 'Ice links to XC planning');
add('clusterContinuation', 5, ice.includes('https://xcski.chrisizworski.com/'), 'Ice can hand off to live XC snow signal');

// 10: Measurement + accessibility
add('measurementAndAccessibility', 3, (tools.match(/data-placement="winter-persona/g) || []).length >= 6, 'winter persona CTAs are tracked');
add('measurementAndAccessibility', 2, tools.includes('aria-labelledby="winter-task-router-title"'), 'router has an accessible name');
add('measurementAndAccessibility', 3, home.includes('data-placement="home-winter-path"'), 'homepage winter CTAs are tracked');
add('measurementAndAccessibility', 2, tools.includes('/assets/tool-engagement.js') && home.includes('/assets/tool-engagement.js'), 'existing privacy-safe tracker is loaded');

// 10: Search safety
add('searchSafety', 2, tools.includes('<link rel="canonical" href="https://chrisizworski.com/tools/">'), 'Tools canonical unchanged');
add('searchSafety', 2, home.includes('<link rel="canonical" href="https://chrisizworski.com/">'), 'Home canonical unchanged');
add('searchSafety', 3, xc.includes('<title>Michigan Cross-Country Skiing: Trails &amp; Live Conditions</title>') && xc.includes('<h1>Michigan Cross-Country Skiing</h1>') && xc.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-cross-country-skiing/">'), 'XC search ownership unchanged');
add('searchSafety', 1, !(await exists('public/winter-tools/index.html')), 'no competing winter landing page created');
add('searchSafety', 2, /no ice is safe ice|never a safety rating|do not verify local thickness or safety/i.test(ice), 'Ice safety boundary remains visible');

const score = checks.reduce((sum, c) => sum + (c.pass ? c.points : 0), 0);
const loss = 100 - score;
const failures = checks.filter((c) => !c.pass);
const fatal = [
  !tools.includes('<a href="/michigan-cross-country-skiing/">Michigan Cross-Country Skiing, Trails and Live Conditions</a>') ? 'Tools primary XC entry bypasses planning hub' : null,
  !tools.includes('href="https://xcski.chrisizworski.com/"') ? 'live XC destination disappeared' : null,
  (await exists('public/winter-tools/index.html')) ? 'competing winter landing URL created' : null,
  !/no ice is safe ice|never a safety rating|do not verify local thickness or safety/i.test(ice) ? 'Ice safety boundary is not detectable' : null,
].filter(Boolean);

console.log(`Winter persona flow baseline: ${benchmark.baseline.score}/100 (loss ${benchmark.baseline.loss})`);
console.log(`Winter persona flow candidate: ${score}/100 (loss ${loss})`);
for (const c of failures) console.log(`MISS  ${String(c.points).padStart(2)}  ${c.category}: ${c.label}`);
for (const f of fatal) console.log(`FATAL ${f}`);

const checking = process.argv.includes('--check');
if (checking && (fatal.length || score < benchmark.target.minimumScore || loss > benchmark.target.maximumLoss)) {
  console.error('WINTER PERSONA FLOW: FAIL');
  process.exit(1);
}
console.log('WINTER PERSONA FLOW: PASS');
