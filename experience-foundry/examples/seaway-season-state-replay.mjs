// Foundry replay adapter: Seaway navigation-season state at the visitor's decision point.
// Runs against an isolated --source-root copy. Uses fixed dates, no network, no live tree.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const rootArg = process.argv.indexOf('--source-root');
if (rootArg < 0 || !process.argv[rootArg + 1]) { console.error('missing --source-root'); process.exit(2); }
const root = path.resolve(process.argv[rootArg + 1]);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const require = createRequire(import.meta.url);

function heroOf(html) {
  const start = html.indexOf('<div class="hero wrap">');
  if (start < 0) throw new Error('hero missing');
  return html.slice(start, html.indexOf('<figure>', start));
}
function watchHeadOf(html) {
  const start = html.indexOf('<div class="station-head">');
  if (start < 0) throw new Error('station head missing');
  return html.slice(start, html.indexOf('<div class="watch-controls">', start));
}
// What the visitor reads in each [data-seaway-season] element at a given time:
// the season script's state when both script and inline data exist, otherwise static text.
function rendered(page, now) {
  const html = read(page);
  const hero = heroOf(html), watch = watchHeadOf(html);
  const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const hasBand = /data-seaway-season/.test(hero), hasInline = /data-seaway-season/.test(watch);
  let headline = null, detail = null;
  const json = html.match(/<script type="application\/json" id="seawaySeasonData">(.*?)<\/script>/);
  if ((hasBand || hasInline) && json && exists('public/assets/seaway-season.js') && now) {
    const mod = require(path.join(root, 'public/assets/seaway-season.js'));
    const s = mod.seasonState(JSON.parse(json[1]), new Date(now));
    headline = s.headline; detail = s.detail;
  }
  return {
    heroText: hasBand ? [headline, detail].filter(Boolean).join(' ') || strip(hero) : strip(hero),
    watchText: hasInline ? (headline || strip(watch)) : strip(watch),
    hero, watch, html
  };
}

const cases = [];
{
  const r = rendered('public/st-lawrence-seaway/index.html', '2026-11-27T08:00:00-05:00');
  const ok = /28 days left of regular Seaway transits/.test(r.heroText) && /December 24/.test(r.heroText) && /January 5, 2027/.test(r.heroText);
  cases.push({ id: 'late-season-first-screen', passed: ok, observed: r.heroText.slice(0, 260) });
}
{
  const r = rendered('public/eisenhower-lock/index.html', '2026-11-27T08:00:00-05:00');
  const ok = /28 days left/.test(r.heroText) && /December 24/.test(r.heroText);
  cases.push({ id: 'eisenhower-late-season', passed: ok, observed: r.heroText.slice(0, 260) });
}
{
  const r = rendered('public/st-lawrence-seaway/index.html', '2027-01-20T10:00:00-05:00');
  const ok = /closed for winter/.test(r.watchText) && /March 22, 2027/.test(r.heroText);
  cases.push({ id: 'winter-empty-map', passed: ok, observed: 'watch: ' + r.watchText.slice(0, 140) + ' | hero: ' + r.heroText.slice(0, 160) });
}
{
  const r = rendered('public/st-lawrence-seaway/index.html', null);
  const ok = r.hero.includes('href="#ship-watch"') && r.hero.includes('href="#viewing-plan"');
  cases.push({ id: 'hero-jump-links-kept', passed: ok, observed: ok ? 'hero keeps #ship-watch and #viewing-plan links' : 'hero jump link missing' });
}
{
  const r = rendered('public/eisenhower-lock/index.html', null);
  const ok = r.watch.includes('data-track-tool="seaway-official-queue"');
  cases.push({ id: 'official-queue-link-kept', passed: ok, observed: ok ? 'official order-of-turn link present in ship watch' : 'official queue link missing' });
}
process.stdout.write(JSON.stringify({ cases }));
