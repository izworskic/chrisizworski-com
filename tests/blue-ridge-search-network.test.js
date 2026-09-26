const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const slugs=['','closures','weather','best-stops','itinerary','map','asheville','boone','roanoke','cherokee'];
const fileFor=slug=>slug?`public/blue-ridge-parkway/${slug}/index.html`:'public/blue-ridge-parkway/index.html';
const urlFor=slug=>`https://chrisizworski.com/blue-ridge-parkway/${slug?`${slug}/`:''}`;
const get=(html,re)=>html.match(re)?.[1]?.replace(/&amp;/g,'&').trim()||'';

test('Blue Ridge search network has one canonical owner per planned intent',()=>{
  const canonicals=new Set();
  for(const slug of slugs){
    const html=read(fileFor(slug));
    const canonical=get(html,/<link rel="canonical" href="([^"]+)"/i);
    assert.equal(canonical,urlFor(slug),`${slug||'main'} canonical must own its exact route`);
    assert.ok(!canonicals.has(canonical),`duplicate canonical ${canonical}`);
    canonicals.add(canonical);
  }
  assert.equal(canonicals.size,10);
});

test('Every Blue Ridge search owner has complete crawl and social metadata',()=>{
  const titles=new Set(),descriptions=new Set();
  for(const slug of slugs){
    const html=read(fileFor(slug));
    const title=get(html,/<title>([^<]+)<\/title>/i);
    const description=get(html,/<meta name="description" content="([^"]+)"/i);
    assert.ok(title.length>=35&&title.length<=65,`${slug||'main'} title length ${title.length}`);
    assert.ok(description.length>=110&&description.length<=170,`${slug||'main'} description length ${description.length}`);
    assert.ok(!titles.has(title),`${slug||'main'} title must be unique`);
    assert.ok(!descriptions.has(description),`${slug||'main'} description must be unique`);
    titles.add(title);descriptions.add(description);
    assert.match(html,/<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/i,`${slug||'main'} robots`);
    assert.match(html,/<meta property="og:type" content="website">/i,`${slug||'main'} og:type`);
    assert.match(html,/<meta property="og:title" content="[^"]+">/i,`${slug||'main'} og:title`);
    assert.match(html,/<meta property="og:description" content="[^"]+">/i,`${slug||'main'} og:description`);
    assert.match(html,new RegExp(`<meta property="og:url" content="${urlFor(slug).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}">`,'i'),`${slug||'main'} og:url`);
    assert.match(html,/<meta property="og:image" content="[^"]+">/i,`${slug||'main'} og:image`);
    assert.match(html,/<meta name="twitter:card" content="summary_large_image">/i,`${slug||'main'} twitter card`);
    assert.match(html,/"@type":"WebPage"/i,`${slug||'main'} WebPage schema`);
    assert.match(html,/"@type":"BreadcrumbList"/i,`${slug||'main'} breadcrumb schema`);
    assert.match(html,/"dateModified":"2026-09-25"/i,`${slug||'main'} dateModified`);
  }
});

test('Main Blue Ridge owner exposes the whole intent network through crawlable links',()=>{
  const html=read(fileFor(''));
  for(const slug of ['closures','weather','best-stops','itinerary','map','asheville','boone','roanoke','cherokee']){
    assert.match(html,new RegExp(`href="/blue-ridge-parkway/${slug}/"`),`main must link ${slug}`);
  }
  assert.match(html,/Blue Ridge Parkway planning network/);
  assert.match(html,/numberOfItems":9/);
  assert.ok(html.indexOf('id="gatewaySnapshots"')<html.indexOf('id="plannerForm"'),'live gateway intelligence remains ahead of personalization');
});

test('Supporting intent pages funnel into the live planner and cross-link the network',()=>{
  for(const slug of ['closures','weather','best-stops','itinerary','map']){
    const html=read(fileFor(slug));
    assert.match(html,/href="\/blue-ridge-parkway\/#planner"/,`${slug} must funnel into live planner`);
    const links=[...html.matchAll(/href="\/blue-ridge-parkway\/([^"?#]+)\/"/g)].map(m=>m[1]);
    assert.ok(new Set(links).size>=3,`${slug} should expose at least three sibling intent/gateway links`);
  }
});

test('Gateway pages are substantial search surfaces, not thin funnel clones',()=>{
  const signals={asheville:['Craggy Gardens','Mount Pisgah','SEASONAL ASHEVILLE PARKWAY'],boone:['Moses H. Cone','Linn Cove','SEASONAL HIGH COUNTRY'],roanoke:['Peaks of Otter','Mabry Mill','SEASONAL ROANOKE PARKWAY'],cherokee:['Waterrock Knob','Richland Balsam','SEASONAL SOUTHERN PARKWAY']};
  for(const [slug,needles] of Object.entries(signals)){
    const html=read(fileFor(slug));
    assert.match(html,new RegExp(`data-blue-ridge-gateway="${slug}"`));
    assert.match(html,/id="gatewayLive"/);
    for(const needle of needles)assert.match(html,new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),`${slug} missing ${needle}`);
    assert.match(html,/PARKWAY PLANNING NETWORK/);
    assert.ok(html.length>6500,`${slug} should carry substantial differentiated crawlable content`);
  }
});

test('Blue Ridge sitemap build includes all search network owners',()=>{
  const script=read('scripts/add-yosemite-firefall-to-sitemap.mjs');
  for(const slug of ['asheville','boone','roanoke','cherokee'])assert.match(script,new RegExp(`'${slug}'`));
  for(const slug of ['closures','weather','best-stops','itinerary','map'])assert.match(script,new RegExp(`slug: '${slug}'`));
  assert.match(script,/one owner per genuinely different search intent/i);
});

test('Blue Ridge search network avoids generic travel filler',()=>{
  const html=slugs.map(slug=>read(fileFor(slug))).join('\n');
  for(const phrase of ['Whether you are','Whether you’re','breathtaking vistas','hidden gems','unforgettable journey','something for everyone','embark on','discover breathtaking']){
    assert.doesNotMatch(html,new RegExp(phrase,'i'));
  }
});
