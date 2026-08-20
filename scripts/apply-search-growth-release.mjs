#!/usr/bin/env node

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const p = (...parts) => path.join(root, ...parts);
const read = (file) => readFile(p(file), "utf8");
const write = async (file, content) => {
  await mkdir(path.dirname(p(file)), { recursive: true });
  await writeFile(p(file), content, "utf8");
};

function insertBeforeClose(html, marker, block) {
  if (html.includes(marker)) return html;
  if (/<\/main>/i.test(html)) return html.replace(/<\/main>/i, `${block}\n</main>`);
  return html.replace(/<\/body>/i, `${block}\n</body>`);
}

function insertAfterMain(html, marker, block) {
  if (html.includes(marker)) return html;
  return html.replace(/(<main\b[^>]*>)/i, `$1\n${block}`);
}

function stampModified(html) {
  return html.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}("\s*)/g, '$12026-08-20$2');
}

function networkBlock(id, links, heading = "Keep planning in Michigan") {
  const cards = links.map(({ href, title, text }) =>
    `<a href="${href}" data-search-growth-link="${id}" style="display:block;padding:12px 14px;border:1px solid #d8d2c5;border-radius:10px;background:#fff;color:inherit;text-decoration:none"><strong style="display:block;margin-bottom:3px">${title}</strong><span style="font-size:.9rem;opacity:.78">${text}</span></a>`
  ).join("");
  return `<aside data-search-growth-network="${id}" aria-label="Related Michigan planning tools" style="max-width:1040px;margin:32px auto;padding:18px;border:1px solid #ddd6c8;border-radius:14px;background:#f8f5ee"><h2 style="font-size:1.15rem;margin:0 0 12px">${heading}</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">${cards}</div></aside>`;
}

async function patchPage(file, { links, id, topBlock = "" }) {
  let html = await read(file);
  if (topBlock) html = insertAfterMain(html, 'data-search-growth-top="fall-weekend"', topBlock);
  html = insertBeforeClose(html, `data-search-growth-network="${id}"`, networkBlock(id, links));
  html = stampModified(html);
  await write(file, html);
}

const fallTopBlock = `<section data-search-growth-top="fall-weekend" aria-labelledby="fall-weekend-title" style="max-width:1040px;margin:18px auto 22px;padding:18px;border:1px solid #d6c8ae;border-radius:14px;background:#fbf6ea"><div style="font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;opacity:.68;margin-bottom:6px">The fastest answer</div><h2 id="fall-weekend-title" style="margin:0 0 8px;font-size:1.35rem">Where are Michigan fall colors best this weekend?</h2><p style="margin:0 0 10px">Use the weekend decision page to rank Michigan regions by how close they are to peak, then factor in the same live canopy and weather feed used by this map. Early in the season, the Western U.P. is the first region to watch.</p><p style="margin:0"><a href="/fall-color/this-weekend/" style="font-weight:700">See the best fall-color region this weekend →</a></p></section>`;

const fallCoreLinks = [
  { href: "/fall-color/this-weekend/", title: "Fall color this weekend", text: "Rank the best region for the coming weekend." },
  { href: "/fall-color/when-do-leaves-peak-in-michigan/", title: "2026 peak dates", text: "See the statewide progression by region." },
  { href: "/fall-color/michigan-fall-color-drives/", title: "Best fall drives", text: "Turn the color forecast into a route." },
];

await patchPage("public/fall-color/index.html", {
  id: "fall-hub-2026",
  links: fallCoreLinks,
  topBlock: fallTopBlock,
});

const fallSupportPages = [
  "public/fall-color/when-do-leaves-peak-in-michigan/index.html",
  "public/fall-color/michigan-fall-color-drives/index.html",
  "public/fall-color/michigan-leaf-peeping-planner/index.html",
  "public/fall-color/upper-peninsula-fall-color/index.html",
  "public/fall-color/porcupine-mountains-fall-color/index.html",
  "public/fall-color/keweenaw-peninsula-fall-color/index.html",
  "public/fall-color/tahquamenon-falls-fall-color/index.html",
  "public/fall-color/mackinac-island-fall-color/index.html",
  "public/fall-color/sleeping-bear-dunes-fall-color/index.html",
  "public/fall-color/au-sable-river-fall-color/index.html",
  "public/fall-color/saginaw-bay-fall-color/index.html",
  "public/fall-color/saugatuck-southwest-michigan-fall-color/index.html",
  "public/fall-color/ann-arbor-irish-hills-fall-color/index.html",
];

for (const file of fallSupportPages) {
  try {
    const s = await stat(p(file));
    if (!s.isFile()) continue;
    let html = await read(file);
    html = insertBeforeClose(
      html,
      'data-fall-weekend-link="2026"',
      `<aside data-fall-weekend-link="2026" style="margin:28px auto;padding:14px 16px;border:1px solid #d8cdbb;border-radius:12px;background:#fbf7ef"><strong>Planning this weekend?</strong> <a href="/fall-color/this-weekend/">See which Michigan region is closest to peak →</a></aside>`,
    );
    html = stampModified(html);
    await write(file, html);
  } catch {}
}

// Leave the Tunnel of Trees page untouched: it has an active single-variable CTR experiment.

const distribution = [
  ["public/index.html", "home-fall-2026", [
    { href: "/fall-color/", title: "Michigan Fall Color Map 2026", text: "Live regional color, forecast and peak progression." },
    { href: "/fall-color/this-weekend/", title: "Where to go this weekend", text: "A direct regional decision page for fall trips." },
    { href: "/northern-lights-michigan/", title: "Northern lights tonight", text: "Pair a fall trip with the live Michigan aurora outlook." },
  ]],
  ["public/tools/index.html", "tools-fall-2026", [
    { href: "/fall-color/", title: "Live fall color map", text: "Track the season across Michigan." },
    { href: "/fall-color/this-weekend/", title: "Fall color this weekend", text: "Choose the best region for a weekend trip." },
    { href: "/michigan-ice/", title: "Michigan ice report", text: "The next seasonal decision tool already building authority." },
  ]],
  ["public/great-lakes/index.html", "great-lakes-fall-2026", [
    { href: "/fall-color/this-weekend/", title: "Fall color this weekend", text: "Choose a region, then plan the Great Lakes drive." },
    { href: "/mackinac-bridge-live/", title: "Mackinac Bridge conditions", text: "Check the crossing before a northern Michigan trip." },
    { href: "/great-lakes-buoys/", title: "Great Lakes buoys", text: "Live waves, wind and water temperature." },
  ]],
  ["public/guides/index.html", "guides-fall-2026", [
    { href: "/fall-color/", title: "Michigan fall color", text: "Start with the live statewide map." },
    { href: "/fall-color/this-weekend/", title: "Best region this weekend", text: "Turn the season into a destination decision." },
    { href: "/fall-color/michigan-fall-color-drives/", title: "Fall color drives", text: "Pick a route after choosing the region." },
  ]],
];

for (const [file, id, links] of distribution) {
  try { await patchPage(file, { id, links }); } catch {}
}

const weekendPage = `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Michigan Fall Color This Weekend 2026 | Where to Go</title>
<meta name="description" content="Where are Michigan fall colors best this weekend? Rank regions by 2026 peak timing, live canopy and weather data, then open the map and best drive.">
<link rel="canonical" href="https://chrisizworski.com/fall-color/this-weekend/">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="author" content="Chris Izworski">
<meta property="og:type" content="website">
<meta property="og:title" content="Michigan Fall Color This Weekend 2026">
<meta property="og:description" content="A direct answer for where to go in Michigan this weekend for the best fall color.">
<meta property="og:url" content="https://chrisizworski.com/fall-color/this-weekend/">
<meta property="og:image" content="https://chrisizworski.com/fall-color/og.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@graph":[
    {"@type":"Person","@id":"https://chrisizworski.com/#person","name":"Chris Izworski","url":"https://chrisizworski.com/","sameAs":["https://github.com/izworskic","https://www.wikidata.org/wiki/Q138283432"]},
    {"@type":"WebPage","@id":"https://chrisizworski.com/fall-color/this-weekend/#webpage","url":"https://chrisizworski.com/fall-color/this-weekend/","name":"Michigan Fall Color This Weekend 2026: Where to Go","description":"A weekend decision page that ranks Michigan fall-color regions using seasonal timing plus the live canopy and weather feed.","datePublished":"2026-08-20","dateModified":"2026-08-20","author":{"@id":"https://chrisizworski.com/#person"},"publisher":{"@id":"https://chrisizworski.com/#person"},"isPartOf":{"@id":"https://chrisizworski.com/fall-color/#website"},"inLanguage":"en-US"},
    {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Michigan Fall Color","item":"https://chrisizworski.com/fall-color/"},{"@type":"ListItem","position":2,"name":"This Weekend"}]}
  ]
}
</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5eedf;color:#27221b;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}a{color:#74401f}.top{border-bottom:1px solid #d9cdb8;background:#fffaf0}.top-inner,.wrap{max-width:980px;margin:auto;padding:18px 20px}.brand{font-weight:700;text-decoration:none}.crumb{font-size:.86rem;opacity:.72;margin-top:6px}.hero{padding:34px 0 18px}.eyebrow{text-transform:uppercase;letter-spacing:.09em;font-size:.76rem;opacity:.65}.hero h1{font-family:Georgia,serif;font-size:clamp(2rem,6vw,3.5rem);line-height:1.03;margin:.25rem 0 .8rem}.lede{font-size:1.08rem;max-width:760px}.answer{background:#fffaf1;border:1px solid #d8c9ad;border-radius:16px;padding:20px;margin:18px 0}.answer h2{margin:0 0 6px;font-size:1.25rem}.status{font-size:1.3rem;font-weight:800;margin:8px 0}.muted{opacity:.72}.rank{display:grid;gap:10px;margin:16px 0}.card{background:#fff;border:1px solid #ddd2c0;border-radius:14px;padding:16px}.card h3{margin:0 0 6px;font-size:1.05rem}.meter{height:8px;background:#eee5d5;border-radius:99px;overflow:hidden;margin:8px 0}.meter span{display:block;height:100%;background:#9a5b2d}.links{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:24px 0}.links a{background:#fff;border:1px solid #ddd2c0;border-radius:12px;padding:14px;text-decoration:none}.links strong{display:block;margin-bottom:4px}.method{font-size:.9rem;background:#eee5d6;border-radius:12px;padding:16px;margin:26px 0}.footer{border-top:1px solid #d9cdb8;margin-top:38px;padding:22px 0;font-size:.88rem}.pill{display:inline-block;border:1px solid #cdbb9e;border-radius:999px;padding:4px 9px;font-size:.78rem;margin-right:5px;background:#fffaf0}@media(max-width:600px){.top-inner,.wrap{padding-left:16px;padding-right:16px}.hero{padding-top:24px}}
</style>
</head>
<body>
<header class="top"><div class="top-inner"><a class="brand" href="/">Chris Izworski</a><div class="crumb"><a href="/fall-color/">Michigan Fall Color</a> / This Weekend</div></div></header>
<main class="wrap">
<section class="hero">
<div class="eyebrow">2026 weekend decision guide</div>
<h1>Where are Michigan fall colors best this weekend?</h1>
<p class="lede">This page turns the statewide fall-color model into one decision: which Michigan region is closest to peak for the coming weekend, with weather used as a trip-planning tiebreaker.</p>
</section>
<section class="answer" id="weekend-answer" data-search-growth-query="michigan fall color this weekend">
<div class="eyebrow">Best bet for the coming weekend</div>
<h2 id="weekend-date">Checking the next weekend…</h2>
<div class="status" id="best-region">Loading the regional ranking…</div>
<p id="best-reason">The page still works from the 2026 regional timing model if the live feed is temporarily unavailable.</p>
<p><a href="/fall-color/">Open the live Michigan fall color map →</a></p>
</section>
<section aria-labelledby="rank-title"><h2 id="rank-title">Top regions for this weekend</h2><div class="rank" id="rank"></div></section>
<div class="links" data-search-growth-network="fall-this-weekend-2026">
<a href="/fall-color/"><strong>Live Michigan fall color map</strong><span>See every region and move the date slider.</span></a>
<a href="/fall-color/when-do-leaves-peak-in-michigan/"><strong>Michigan peak dates 2026</strong><span>See the statewide north-to-south progression.</span></a>
<a href="/fall-color/michigan-fall-color-drives/"><strong>Best fall color drives</strong><span>Choose the route after you choose the region.</span></a>
<a href="/fall-color/michigan-leaf-peeping-planner/"><strong>Leaf-peeping planner</strong><span>Turn timing into a day or weekend plan.</span></a>
</div>
<section class="method"><strong>How the ranking works.</strong> The score starts with each region's 2026 seasonal timing curve. The coming Saturday is scored for distance from peak. If the live fall-color feed is available, the page also uses forecast precipitation as a practical viewing/travel tiebreaker. It does not claim a camera or weather reading is a statewide leaf count. <span id="updated" class="muted"></span></section>
<section><h2>Regional guides</h2><p><span class="pill">Western U.P.</span><span class="pill">Eastern U.P.</span><span class="pill">Tip of the Mitt</span><span class="pill">Northwest Lower</span><span class="pill">Northeast Lower</span><span class="pill">Central</span><span class="pill">Southwest</span><span class="pill">Southeast</span></p><p><a href="/fall-color/upper-peninsula-fall-color/">Upper Peninsula</a> · <a href="/fall-color/porcupine-mountains-fall-color/">Porcupine Mountains</a> · <a href="/fall-color/keweenaw-peninsula-fall-color/">Keweenaw</a> · <a href="/fall-color/tahquamenon-falls-fall-color/">Tahquamenon</a> · <a href="/fall-color/mackinac-island-fall-color/">Mackinac Island</a> · <a href="/fall-color/sleeping-bear-dunes-fall-color/">Sleeping Bear</a> · <a href="/fall-color/au-sable-river-fall-color/">Au Sable</a></p></section>
</main>
<footer class="footer"><div class="wrap">© 2026 Chris Izworski · Michigan field tools built for real trip decisions.</div></footer>
<script>
const R=[
{id:'wup',name:'Western U.P.',area:'Porkies, Keweenaw, Ontonagon',green:[9,17],ps:[9,28],pe:[10,6],bare:[10,16],drive:'Brockway Mountain Drive and the Porcupine Mountains'},
{id:'eup',name:'Eastern U.P.',area:'Tahquamenon, Hiawatha, Whitefish',green:[9,20],ps:[10,1],pe:[10,9],bare:[10,18],drive:'M-123 through the Tahquamenon country'},
{id:'tip',name:'Tip of the Mitt',area:'Tunnel of Trees, Petoskey, Mackinaw',green:[9,27],ps:[10,5],pe:[10,13],bare:[10,22],drive:'M-119 Tunnel of Trees'},
{id:'nwl',name:'Northwest Lower',area:'Sleeping Bear, Traverse City, Leelanau',green:[9,30],ps:[10,8],pe:[10,16],bare:[10,24],drive:'Pierce Stocking Scenic Drive'},
{id:'nel',name:'Northeast Lower',area:'Grayling, Au Sable, Oscoda',green:[10,1],ps:[10,9],pe:[10,17],bare:[10,25],drive:'River Road Scenic Byway'},
{id:'cen',name:'Central & Saginaw Bay',area:'Bay City, Midland, Mt Pleasant',green:[10,7],ps:[10,14],pe:[10,22],bare:[10,30],drive:'Midland and Saginaw Bay hardwood corridors'},
{id:'swl',name:'Southwest Lower',area:'Grand Rapids, Saugatuck, Kalamazoo',green:[10,11],ps:[10,18],pe:[10,26],bare:[11,3],drive:'Blue Star Highway'},
{id:'sel',name:'Southeast Lower',area:'Detroit, Ann Arbor, Irish Hills',green:[10,13],ps:[10,20],pe:[10,28],bare:[11,5],drive:'US-12 through the Irish Hills'}];
const d=(md,y)=>new Date(y,md[0]-1,md[1],12);const day=86400000;
function weekend(){const n=new Date(),x=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12);let add=(6-x.getDay()+7)%7;if(add===0&&x.getHours()>16)add=7;x.setDate(x.getDate()+add);return x}
function colorScore(r,t){const y=t.getFullYear(),g=d(r.green,y),ps=d(r.ps,y),pe=d(r.pe,y),b=d(r.bare,y);if(t<g){const days=(g-t)/day;return Math.max(2,20-days*.7)}if(t<ps)return 20+65*((t-g)/(ps-g));if(t<=pe)return 100;if(t<=b)return 90-72*((t-pe)/(b-pe));return 8}
function label(s){if(s>=92)return'At or near peak';if(s>=75)return'Approaching peak';if(s>=45)return'Color building';if(s>=20)return'Color starting';return'Still mostly green'}
const wk=weekend();document.getElementById('weekend-date').textContent=wk.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
fetch('/api/fall-color-conditions').then(r=>r.json()).then(live=>render(live)).catch(()=>render(null));
function render(live){const byId=new Map((live&&live.regions||[]).map(x=>[x.id,x]));const rows=R.map(r=>{let c=colorScore(r,wk),wx=85,pop=null;const lr=byId.get(r.id);if(lr&&Array.isArray(lr.forecast)){const k=lr.forecast.find(x=>x.date===wk.toISOString().slice(0,10))||lr.forecast[Math.min(5,lr.forecast.length-1)];if(k&&typeof k.pop==='number'){pop=k.pop;wx=Math.max(20,100-pop)}}const score=Math.round(c*.82+wx*.18);return{...r,color:Math.round(c),score,pop}}).sort((a,b)=>b.score-a.score);const best=rows[0];document.getElementById('best-region').textContent=best.name+' — '+label(best.color);document.getElementById('best-reason').textContent=best.area+'. '+best.drive+'. '+(best.pop==null?'Ranking is using the seasonal timing model because weekend precipitation is unavailable.':'Weekend precipitation signal: '+best.pop+'%.')+' Open the live map before leaving because the regional order can change as the season develops.';document.getElementById('rank').innerHTML=rows.slice(0,3).map((r,i)=>'<article class="card"><div class="eyebrow">#'+(i+1)+' this weekend</div><h3>'+r.name+'</h3><div>'+label(r.color)+' · '+r.area+'</div><div class="meter"><span style="width:'+Math.max(4,r.color)+'%"></span></div><div class="muted">Color timing score '+r.color+'/100'+(r.pop==null?'':' · precip '+r.pop+'%')+'</div><div style="margin-top:7px">'+r.drive+'</div></article>').join('');if(live&&live.updated)document.getElementById('updated').textContent='Live feed updated '+new Date(live.updated).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'.'}
</script>
</body>
</html>`;
await write("public/fall-color/this-weekend/index.html", weekendPage);

// Fall sitemap: this-weekend is a daily/high-priority decision page during the season.
{
  const file = "lib/fall-color/routes/sitemap.js";
  let src = await read(file);
  if (!src.includes('base + "/this-weekend/"')) {
    src = src.replace(
      'const urls = [{ loc: base + "/", pri: "1.0", freq: seasonNow ? "daily" : "weekly" },',
      'const urls = [{ loc: base + "/", pri: "1.0", freq: seasonNow ? "daily" : "weekly" },\n    { loc: base + "/this-weekend/", pri: "1.0", freq: seasonNow ? "daily" : "weekly" },',
    );
  }
  await write(file, src);
}

// Root sitemap and LLM discovery get the new stable URL as well.
{
  let sitemap = await read("public/sitemap.xml");
  if (!sitemap.includes("https://chrisizworski.com/fall-color/this-weekend/")) {
    sitemap = sitemap.replace("</urlset>", `  <url>\n    <loc>https://chrisizworski.com/fall-color/this-weekend/</loc>\n    <lastmod>2026-08-20</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n</urlset>`);
  }
  await write("public/sitemap.xml", sitemap);
  let llms = await read("public/llms.txt");
  if (!llms.includes("Michigan Fall Color This Weekend")) {
    llms += `\n## Michigan Fall 2026 Decision Pages\n\n- Michigan Fall Color Map: https://chrisizworski.com/fall-color/\n- Michigan Fall Color This Weekend: https://chrisizworski.com/fall-color/this-weekend/\n- Michigan Fall Peak Dates: https://chrisizworski.com/fall-color/when-do-leaves-peak-in-michigan/\n- Michigan Fall Color Drives: https://chrisizworski.com/fall-color/michigan-fall-color-drives/\n- These pages form one decision flow: current regional status -> best region this weekend -> peak timing -> route planning.\n`;
  }
  await write("public/llms.txt", llms);
}

const searchBaseline = {
  benchmarkVersion: "1.0.0",
  baselineCreated: "2026-08-20",
  timezone: "America/Detroit",
  source: {
    title: "chrisizworski.com-Performance-on-Search-2026-08-15",
    spreadsheetId: "1UTJHLaV2vPnETwbhDxPhSDkUV5o4GYvs1lY-VZe2v64",
    exportedThrough: "2026-08-13",
    note: "Search Console export supplied by the site owner. Targets are goals, not forecasts or guarantees."
  },
  current28Days: {
    start: "2026-07-17", end: "2026-08-13", days: 28,
    clicks: 407, impressions: 27042, ctr: 0.0150506619,
    dailyClicks: 14.5357143, dailyImpressions: 965.7857143
  },
  goals: {
    targetDate: "2026-10-01",
    dailyImpressionsFloor: 2500,
    dailyImpressionsStretch: 4000,
    qualifiedSiteCtr: 0.025,
    fallHubAveragePosition: 5,
    brandedChrisIzworskiPosition: 2,
    sameImpressionIncrementalClickGoal: 500,
    rule: "Judge released search treatments on complete comparable windows; do not reset active experiments casually."
  },
  pages: [
    { path: "/northern-lights-michigan/", clicks: 365, impressions: 20591, ctr: 0.0177, position: 10.42, targetCtr: 0.025, priority: "P0", state: "frozen-active-experiment" },
    { path: "/soo-locks/", clicks: 272, impressions: 15904, ctr: 0.0171, position: 9.04, targetCtr: 0.03, priority: "P0", state: "frozen-active-experiment" },
    { path: "/when-to-plant-tomatoes-michigan/", clicks: 15, impressions: 5967, ctr: 0.0025, position: 8.32, targetCtr: 0.015, priority: "P0", state: "frozen-active-experiment" },
    { path: "/michigan-frost-dates/", clicks: 4, impressions: 2808, ctr: 0.0014, position: 9.61, targetCtr: 0.015, priority: "P0", state: "frozen-active-experiment" },
    { path: "/great-lakes-buoys/", clicks: 29, impressions: 1530, ctr: 0.019, position: 14.44, targetCtr: 0.025, priority: "P1", state: "measure-and-build-authority" },
    { path: "/great-lakes-freighter-tracking/", clicks: 3, impressions: 1449, ctr: 0.0021, position: 20.68, targetCtr: 0.015, priority: "P1", state: "frozen-active-experiment" },
    { path: "/mackinac-bridge-live/", clicks: 6, impressions: 1161, ctr: 0.0052, position: 11.64, targetCtr: 0.02, priority: "P1", state: "protect-current-treatment" },
    { path: "/fall-color/", clicks: 14, impressions: 575, ctr: 0.0243, position: 11.17, targetCtr: 0.035, priority: "P0-seasonal", state: "execute-now" }
  ],
  queryOpportunities: [
    { query: "soo locks schedule", clicks: 32, impressions: 1594, ctr: 0.0201, position: 7.81, page: "/soo-locks/" },
    { query: "soo locks schedule today", clicks: 28, impressions: 1174, ctr: 0.0239, position: 8.43, page: "/soo-locks/" },
    { query: "when to plant tomatoes in michigan", clicks: 0, impressions: 526, ctr: 0, position: 10.25, page: "/when-to-plant-tomatoes-michigan/" },
    { query: "northern lights michigan tonight", clicks: 6, impressions: 456, ctr: 0.0132, position: 9.93, page: "/northern-lights-michigan/" },
    { query: "northern lights michigan", clicks: 0, impressions: 299, ctr: 0, position: 14.89, page: "/northern-lights-michigan/" },
    { query: "mackinac bridge conditions today live", clicks: 0, impressions: 150, ctr: 0, position: 9.83, page: "/mackinac-bridge-live/" },
    { query: "great lakes buoys", clicks: 1, impressions: 109, ctr: 0.0092, position: 11.65, page: "/great-lakes-buoys/" },
    { query: "michigan fall color map 2026", clicks: 0, impressions: 74, ctr: 0, position: 8.88, page: "/fall-color/" },
    { query: "michigan fall colors 2026", clicks: 0, impressions: 15, ctr: 0, position: 10.33, page: "/fall-color/" },
    { query: "michigan peak fall colors 2026", clicks: 0, impressions: 13, ctr: 0, position: 9.23, page: "/fall-color/" },
    { query: "zone 6a last frost date", clicks: 0, impressions: 25, ctr: 0, position: 8.44, page: "/michigan-frost-dates/" }
  ]
};
await write("benchmarks/search-growth-engine-2026-08-15.json", JSON.stringify(searchBaseline, null, 2) + "\n");

const benchmarkScript = `#!/usr/bin/env node
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");const pub=path.join(root,"public");const read=f=>readFile(path.join(root,f),"utf8");
const b=JSON.parse(await read("benchmarks/search-growth-engine-2026-08-15.json"));const failures=[];let score=0;
const check=(name,ok,pts,detail="")=>{if(ok)score+=pts;else failures.push(detail?name+": "+detail:name)};
const near=(a,c,t=1e-6)=>Math.abs(a-c)<=t;
check("28-day baseline reconciles",b.current28Days.impressions===27042&&b.current28Days.clicks===407&&near(b.current28Days.ctr,b.current28Days.clicks/b.current28Days.impressions),10);
const incremental=b.pages.reduce((s,x)=>s+Math.max(0,Math.round(x.impressions*x.targetCtr)-x.clicks),0);check("same-impression click goal is grounded",incremental>=b.goals.sameImpressionIncrementalClickGoal,5,String(incremental));
const frozen=b.pages.filter(x=>x.state.includes("frozen"));check("active experiments are protected",frozen.length>=5,5,String(frozen.length));
const pageFiles={"/northern-lights-michigan/":"public/northern-lights-michigan/index.html","/soo-locks/":"public/soo-locks/index.html","/when-to-plant-tomatoes-michigan/":"public/when-to-plant-tomatoes-michigan/index.html","/michigan-frost-dates/":"public/michigan-frost-dates/index.html","/great-lakes-buoys/":"public/great-lakes-buoys/index.html","/great-lakes-freighter-tracking/":"public/great-lakes-freighter-tracking/index.html","/mackinac-bridge-live/":"public/mackinac-bridge-live/index.html","/fall-color/":"public/fall-color/index.html"};
let hygiene=0;for(const x of b.pages){const h=await read(pageFiles[x.path]);const title=(h.match(/<title>([\\s\\S]*?)<\\/title>/i)||[])[1]||"";const desc=(h.match(/<meta\\s+name=["']description["']\\s+content=["']([^"']*)["']/i)||[])[1]||"";const canonical=h.includes('href="https://chrisizworski.com'+x.path+'"')||h.includes('href="https://chrisizworski.com'+x.path+'" />');if(title.length>=30&&title.length<=60&&desc.length>=110&&desc.length<=158&&canonical&&/<h1[\\s>]/i.test(h))hygiene++;}check("priority SERP hygiene",hygiene===b.pages.length,20,hygiene+"/"+b.pages.length);
const wk=await read("public/fall-color/this-weekend/index.html");const hub=await read("public/fall-color/index.html");const fallSitemap=await read("lib/fall-color/routes/sitemap.js");const rootSitemap=await read("public/sitemap.xml");
check("weekend decision page is indexable and query-led",wk.includes("Michigan Fall Color This Weekend 2026")&&wk.includes('data-search-growth-query="michigan fall color this weekend"')&&wk.includes("/api/fall-color-conditions"),10);
check("fall hub exposes weekend answer",hub.includes('data-search-growth-top="fall-weekend"')&&hub.includes('/fall-color/this-weekend/'),5);
check("weekend page closes the decision loop",["/fall-color/","/fall-color/when-do-leaves-peak-in-michigan/","/fall-color/michigan-fall-color-drives/","/fall-color/michigan-leaf-peeping-planner/"].every(x=>wk.includes('href="'+x+'"')),5);
check("weekend URL is in both fall and root sitemaps",fallSitemap.includes('base + "/this-weekend/"')&&rootSitemap.includes("https://chrisizworski.com/fall-color/this-weekend/"),5);
const fallDirs=(await readdir(path.join(pub,"fall-color"),{withFileTypes:true})).filter(x=>x.isDirectory()&&x.name!=="this-weekend");let inbound=0;for(const d of fallDirs){try{const h=await read("public/fall-color/"+d.name+"/index.html");if(h.includes('href="/fall-color/this-weekend/"'))inbound++;}catch{}}check("fall support cluster links to weekend intent",inbound>=10,10,String(inbound));
let dist=0;for(const f of ["public/index.html","public/tools/index.html","public/great-lakes/index.html","public/guides/index.html"]){try{const h=await read(f);if(h.includes("data-search-growth-network")&&h.includes("/fall-color/this-weekend/"))dist++;}catch{}}check("authority surfaces distribute fall intent",dist>=4,10,String(dist));
const llms=await read("public/llms.txt");check("AI discovery names the decision flow",llms.includes("Michigan Fall Color This Weekend")&&llms.includes("current regional status -> best region this weekend"),5);
const person=wk.includes('"@id":"https://chrisizworski.com/#person"')&&wk.includes('"name":"Chris Izworski"');check("new page defines the Chris Izworski entity",person,5);
const docs=await read("docs/search-growth-engine-fall-2026.md");check("measurement plan is committed",docs.includes("Do not reset active experiments")&&docs.includes("October 1, 2026"),5);
console.log("SEARCH GROWTH ENGINE BENCHMARK");console.log("=".repeat(72));console.log("Score: "+score+"/100");console.log("Same-impression modeled click headroom at target CTRs: +"+incremental);console.log("Fall support pages linking to /this-weekend/: "+inbound);console.log("Frozen active experiments protected: "+frozen.length);if(failures.length){console.log("Failures:");for(const f of failures)console.log(" - "+f);}if(process.argv.includes("--check")&&(score<95||failures.length))process.exitCode=1;else if(process.argv.includes("--check"))console.log("benchmark:search-growth PASS");
`;
await write("scripts/benchmark-search-growth-engine.mjs", benchmarkScript);

const plan = `# Search Growth Engine — Fall 2026\n\n## Goal\n\nTurn existing Google visibility into more qualified clicks while using fall color as the seasonal authority wedge that expands the whole Michigan outdoor network.\n\n### Baseline\n\nSearch Console export: **2026-08-15**, posted data through **2026-08-13**. The latest complete 28-day slice (July 17–August 13) contains **27,042 impressions, 407 clicks, 1.51% CTR, and 966 impressions/day**.\n\nThe eight measured opportunity pages contain enough same-impression headroom to model **519 additional clicks** if each reaches its page-specific target CTR. That is a prioritization model, not a traffic promise.\n\n### October 1, 2026 targets\n\n- **2,500 daily impressions floor**, **4,000/day stretch** on a comparable rolling view.\n- **2.5% qualified-site CTR** across the opportunity set.\n- Main fall-color page: **top 5 average position** for its core 2026 map/peak cluster.\n- Keep the branded Chris Izworski SERP at **#1–2** while topical authority expands.\n- At least **500 incremental clicks of same-impression CTR headroom** harvested over successive clean tests.\n\n## Execution sequence\n\n1. **Protect evidence already in flight.** Northern Lights, Soo Locks, tomato planting, frost dates and the freighter tracker already have active search experiments. Do not reset active experiments just to chase a new idea. Their fresh GSC rows are scored by the engine, but their frozen title/meta/H1/first-answer surfaces remain unchanged until the ledger window permits a decision.\n2. **Own fall weekend intent now.** Ship `/fall-color/this-weekend/` as the direct answer between the statewide live map and the existing peak-date/drive/planner cluster. Rank regions for the coming weekend using the existing seasonal timing model and live weather feed.\n3. **Build internal authority, not doorway pages.** Link the weekend decision page from the fall hub, regional guides, Home, Tools, Great Lakes and Guides. Every new link is contextual and points into an existing useful decision flow.\n4. **Keep discovery explicit.** Add the route to the root sitemap, dynamic fall sitemap and `llms.txt`, with a defined Chris Izworski Person node on the page.\n5. **Measure before the next search-facing rewrite.** The fall release gets a 28-day window from August 21 through September 17. The engine can still update rankings/opportunity scores, but title/meta/H1/first-answer changes on frozen pages wait for their current experiments to resolve.\n6. **Next release lane: winter.** Use the same engine to identify authority pages that should feed `/michigan-ice/` and the existing winter surfaces before winter demand rises. No new winter page is justified until the query/page score shows a distinct intent that the current tool cannot answer.\n\n## Benchmark\n\nRun `npm run benchmark:search-growth -- --check`. Release gate: **95/100 minimum and no fatal failures**. `npm run verify:all` includes this gate.\n\nThe benchmark verifies data reconciliation, frozen-experiment protection, priority-page SERP hygiene, the weekend decision page, fall-cluster inbound links, distribution from authority surfaces, sitemap/LLM discovery, entity integrity and a committed measurement protocol.\n\n## Stop-loss rules\n\n- Do not merge if any existing full-repo gate fails.\n- Do not change canonical URLs or create competing pages for an intent already served by a strong canonical.\n- Do not label weather/camera inputs as direct statewide leaf measurements.\n- If a current active experiment regresses its protected title/meta/H1/first answer, restore it before merge.\n- If the weekend page cannot obtain live conditions, it must continue to rank regions from the crawlable seasonal timing model and say that the live feed is unavailable.\n`;
await write("docs/search-growth-engine-fall-2026.md", plan);

// Refresh the CTR benchmark with the latest page-level GSC export without changing frozen treatments.
{
  const file = "benchmarks/ctr-surface-baseline.json";
  const j = JSON.parse(await read(file));
  j.benchmarkVersion = "1.1.0";
  j.baselineCreated = "2026-08-20";
  j.source.gscRows = "Google Search Console export chrisizworski.com-Performance-on-Search-2026-08-15, data through 2026-08-13";
  j.source.caution = "Page rows are measured GSC data. Expected CTR remains a modeled prioritization yardstick, not a fact about future traffic. Active experiment surfaces stay frozen until their ledger windows close.";
  j.measuredPages = [
    { path: "/northern-lights-michigan/", persona: "tonight-checker", impressions: 20591, clicks: 365, ctr: 0.0177, position: 10.42, zeroClickRisk: "medium" },
    { path: "/soo-locks/", persona: "boat-watcher", impressions: 15904, clicks: 272, ctr: 0.0171, position: 9.04, zeroClickRisk: "low" },
    { path: "/when-to-plant-tomatoes-michigan/", persona: "local-grower", impressions: 5967, clicks: 15, ctr: 0.0025, position: 8.32, zeroClickRisk: "high" },
    { path: "/michigan-frost-dates/", persona: "local-grower", impressions: 2808, clicks: 4, ctr: 0.0014, position: 9.61, zeroClickRisk: "high" },
    { path: "/great-lakes-buoys/", persona: "field-user", impressions: 1530, clicks: 29, ctr: 0.019, position: 14.44, zeroClickRisk: "low" },
    { path: "/great-lakes-freighter-tracking/", persona: "boat-watcher", impressions: 1449, clicks: 3, ctr: 0.0021, position: 20.68, zeroClickRisk: "low" },
    { path: "/mackinac-bridge-live/", persona: "boat-watcher", impressions: 1161, clicks: 6, ctr: 0.0052, position: 11.64, zeroClickRisk: "low" },
    { path: "/fall-color/", persona: "weekend-planner", impressions: 575, clicks: 14, ctr: 0.0243, position: 11.17, zeroClickRisk: "low" },
  ];
  if (!j.seasonalWatchlist.paths.includes("/fall-color/this-weekend/")) j.seasonalWatchlist.paths.unshift("/fall-color/this-weekend/");
  await write(file, JSON.stringify(j, null, 2) + "\n");
}

// Record this release as a clean fall experiment; do not overwrite existing tests.
{
  const file = "benchmarks/growth-experiments.json";
  const j = JSON.parse(await read(file));
  j.ledgerVersion = "1.8.0";
  const id = "2026-08-20-fall-weekend-decision-network";
  if (!j.experiments.some((x) => x.id === id)) {
    j.experiments.push({
      id,
      path: "/fall-color/",
      hypothesis: "A dedicated this-weekend decision page plus contextual distribution from the fall cluster and authority surfaces will turn page-one 2026 fall impressions into more qualified clicks without fragmenting the canonical live map intent.",
      primaryMetric: "Search Console fall cluster clicks and average position",
      baseline: { impressions: 575, clicks: 14, ctr: 0.0243, averagePosition: 11.17 },
      supportingEvidence: [
        { query: "michigan fall color map 2026", impressions: 74, clicks: 0, ctr: 0, averagePosition: 8.88 },
        { query: "michigan peak fall colors 2026", impressions: 13, clicks: 0, ctr: 0, averagePosition: 9.23 },
        { query: "peak fall colors in michigan 2026", impressions: 4, clicks: 0, ctr: 0, averagePosition: 8.25 }
      ],
      target: { ctr: 0.035, averagePosition: 7, clusterImpressionsMultiple: 5 },
      status: "running",
      releaseDate: "2026-08-20",
      evaluationWindow: { start: "2026-08-21", end: "2026-09-17" },
      decisionDate: null,
      result: null,
      stopCondition: "The live fall map, canonical, indexability, source honesty, or regional-guide utility regresses; or the new page competes with the map instead of feeding it."
    });
  }
  await write(file, JSON.stringify(j, null, 2) + "\n");
}

// Add the benchmark to the full release gate.
{
  const file = "package.json";
  const j = JSON.parse(await read(file));
  j.scripts["benchmark:search-growth"] = "node scripts/benchmark-search-growth-engine.mjs";
  const token = "npm run benchmark:ctr -- --check";
  if (!j.scripts["verify:all"].includes("benchmark:search-growth")) {
    j.scripts["verify:all"] = j.scripts["verify:all"].replace(token, `${token} && npm run benchmark:search-growth -- --check`);
  }
  await write(file, JSON.stringify(j, null, 2) + "\n");
}

// Source verification is intentionally strict. Declare exactly the pages this release changes.
{
  const file = "scripts/verify-source.mjs";
  let src = await read(file);
  if (!src.includes("Aug 20 2026: search growth engine + fall weekend decision network")) {
    const routes = [
      "/fall-color/", "/fall-color/this-weekend/", "/fall-color/when-do-leaves-peak-in-michigan/", "/fall-color/michigan-fall-color-drives/", "/fall-color/michigan-leaf-peeping-planner/", "/fall-color/upper-peninsula-fall-color/", "/fall-color/porcupine-mountains-fall-color/", "/fall-color/keweenaw-peninsula-fall-color/", "/fall-color/tahquamenon-falls-fall-color/", "/fall-color/mackinac-island-fall-color/", "/fall-color/sleeping-bear-dunes-fall-color/", "/fall-color/au-sable-river-fall-color/", "/fall-color/saginaw-bay-fall-color/", "/fall-color/saugatuck-southwest-michigan-fall-color/", "/fall-color/ann-arbor-irish-hills-fall-color/", "/", "/tools/", "/great-lakes/", "/guides/"
    ];
    const block = `\n  // Aug 20 2026: search growth engine + fall weekend decision network.\n  // Additive internal distribution plus the new /fall-color/this-weekend/ intent page.\n  ${routes.map((r) => `"${r}",`).join("\n  ")}\n`;
    src = src.replace("const intentionalChanges = new Set([", "const intentionalChanges = new Set([" + block);
  }
  await write(file, src);
}

console.log("Search growth release migration applied.");
