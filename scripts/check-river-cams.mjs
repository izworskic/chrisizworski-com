#!/usr/bin/env node
// Daily check of the YouTube live cameras embedded on River Ship Watch pages (data/river-cameras.json).
// Operators change a stream's video id whenever it restarts, so a camera that worked last week can
// show "Video unavailable" today. This reports each id as live, not-live or unknown, and lists the
// operator's current live streams so the fix is a one-line id swap.
//
// Runs in GitHub Actions only (.github/workflows/river-cam-check.yml): no Vercel, no commits.
// Exit code is always 0 for "unknown" (YouTube throttles datacenter IPs); 1 only when a camera is
// confirmed not live, so the workflow can open an issue.
// Usage: node scripts/check-river-cams.mjs [--json]
import fs from 'node:fs';

const cfg = JSON.parse(fs.readFileSync('data/river-cameras.json', 'utf8'));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function page(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en' }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  if (res.status !== 200) return null;
  return res.text();
}

export function liveState(html) {
  if (!html) return 'unknown';
  const ended = /"endTimestamp":"/.test(html);
  if (/"isLiveNow":true/.test(html) || (/"isLive":true/.test(html) && !ended)) return 'live';
  if (/"isLiveNow":false/.test(html) || ended) return 'not-live';
  if (/"playabilityStatus":\{"status":"(ERROR|UNPLAYABLE|LOGIN_REQUIRED)"/.test(html)) return 'not-live';
  return 'unknown';
}

export function currentStreams(html) {
  if (!html) return [];
  const out = [], seen = new Set();
  const re = /"videoId":"([A-Za-z0-9_-]{11})"[\s\S]{0,4000}?"(?:text|content)":"([^"]{8,140})"/g;
  let m;
  while ((m = re.exec(html))) if (!seen.has(m[1])) { seen.add(m[1]); out.push({ id: m[1], title: m[2] }); }
  return out.slice(0, 12);
}

async function main() {
  const results = [];
  for (const [slug, cams] of Object.entries(cfg.pages)) {
    for (const c of cams) {
      let state = 'unknown';
      try { state = liveState(await page('https://www.youtube.com/watch?v=' + c.youtube)); } catch (_) { state = 'unknown'; }
      results.push({ page: slug, id: c.id, youtube: c.youtube, state });
      await sleep(4000);
    }
  }
  let streams = [];
  if (results.some(r => r.state === 'not-live')) {
    try { streams = currentStreams(await page(cfg.channelStreamsUrl)); } catch (_) { streams = []; }
  }
  const report = { checkedAt: new Date().toISOString(), results, streams };
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    for (const r of results) console.log(`${r.state.padEnd(9)} ${r.page} ${r.id} ${r.youtube}`);
    if (streams.length) { console.log('\nOperator streams now listed:'); for (const s of streams) console.log(`  ${s.id}  ${s.title}`); }
  }
  process.exitCode = results.some(r => r.state === 'not-live') ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
