const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('public/michigan-snow-totals/index.html');
test('NWS observed totals remain first with functional city search and map',()=>{
  assert.match(html,/<h1>Michigan Snow Totals Today<\/h1>/);
  assert.match(html,/id="townSearch"/);
  assert.match(html,/id="snowMap"/);
  assert.match(html,/id="snowSummary"/);
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/michigan-snow-totals\/">/);
});
test('distinct next decisions link to the real winter network without confusing models with observations',()=>{
  for(const slug of ['michigan-snow-depth','lake-effect-snow','national-tools/snow','national-tools/white-christmas/forecast','snowmobile','michigan-cross-country-skiing']){
    assert.ok(html.includes('href="/'+slug+'/"'),'Crawlable winter link: '+slug);
  }
  assert.match(html,/where snow remains on the ground, distinct from reports of how much fell/);
  assert.match(html,/which snowbelt could receive new snow next/);
  assert.match(html,/today's snowfall report does not predict December 25/);
});
test('revised HTML date remains truthful and synchronized with both site sitemaps',()=>{
  const stamp = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
  assert.ok(stamp && stamp >= '2026-10-25','page retains its last reviewed source date');
  for(const file of ['public/sitemap.xml','public/sitemap-winter.xml']){
    const xml=read(file);
    const loc='<loc>https://chrisizworski.com/michigan-snow-totals/</loc>';
    assert.ok(xml.includes(loc),'snow totals is in '+file);
    const index=xml.indexOf(loc);
    assert.match(xml.slice(index,index+140),new RegExp('<lastmod>'+stamp+'</lastmod>'),'sitemap agrees with the page source for '+file);
  }
});
test('Michigan snow query choices remain accessible and reflect the four distinct visitor intents',()=>{
  assert.match(html,/id="townForm"/);
  assert.match(html,/class="town-shortcuts" aria-label="Open seven-day snow reports/);
  for (const place of ['Marquette','Gaylord','Grand%20Rapids','Bay%20City']){
    assert.ok(html.includes('town='+place+'&amp;window=168h'),'deep linked seven-day town: '+place);
  }
  assert.match(html,/No nearby report does not mean no snow fell/);
  const network=html.match(/<nav id="headingOut" class="heading-out"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.ok(network,'visible separate winter decision navigation');
  const routes=[
    ['/michigan-snow-depth/','snow on the ground'],
    ['/lake-effect-snow/','snow next'],
    ['/national-tools/white-christmas/forecast/','Christmas']
  ];
  for (const [url,meaning] of routes) assert.ok(network.includes('href="'+url+'"'),'missing '+meaning+' handoff');
  assert.match(network,/does not establish a safe, open or groomed trail/);
  assert.match(html,/<details id="lastSeasonBox">/);
  assert.doesNotMatch(html,/<details id="lastSeasonBox" open>/);
  assert.match(html,/<title>Michigan Snow Totals Today: Live Map \| Chris Izworski<\/title>/);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
});
