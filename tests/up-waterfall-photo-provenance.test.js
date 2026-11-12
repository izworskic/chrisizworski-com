const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const photos = JSON.parse(fs.readFileSync("data/up-waterfall-photo-provenance.json", "utf8"));
const sitemap = fs.readFileSync("public/sitemap-up-waterfalls.xml", "utf8");

test("every published waterfall photo has uniquely identified subject, primary source and commercial-use license", () => {
  assert.equal(photos.photos.length, 31);
  assert.equal(new Set(photos.photos.map(x => x.id)).size, photos.photos.length);
  assert.equal(new Set(photos.photos.map(x => x.imageUrl)).size, photos.photos.length);
  assert.deepEqual(new Set(photos.photos.map(x => x.id)), new Set(["wagner-falls","bond-falls","miners-falls","sable-falls","munising-falls","spray-falls","mosquito-falls","agate-falls","manabezho-falls","nawadaha-falls","great-conglomerate-falls","potawatomi-falls","sandstone-falls","laughing-whitefish-falls","scott-falls","bridalveil-falls","elliot-falls","manido-falls","o-kun-de-kun-falls","gorge-falls","eagle-river-falls","houghton-douglass-falls","bonanza-falls","gabbro-falls","yondota-falls","lepisto-falls","jumbo-falls","canyon-falls","greenstone-falls","haven-falls","chapel-falls"]));
  for (const p of photos.photos) {
    assert.equal(p.role, "verified-guide-photo");
    if(p.id === "chapel-falls") {
      assert.equal(p.imageUrl, "https://www.nps.gov/piro/planyourvisit/images/ChapelFalls-crop.jpg?autorotate=false&maxwidth=960");
      assert.equal(p.sourceUrl, "https://www.nps.gov/piro/planyourvisit/waterfalls.htm");
      assert.equal(p.creator, "National Park Service");
      assert.match(p.license, /^Public domain/);
    } else {
      assert.match(p.imageUrl, /^https:\/\/(?:thumb|upload)\.wikimedia\.org\/wikipedia\/commons\//);
      assert.ok(p.sourceUrl.startsWith("https://commons.wikimedia.org/wiki/File:"));
    }
    assert.match(p.license, /^(CC BY (?:2\.0|3\.0)|CC BY-SA (?:2\.0|3\.0|4\.0)|Public domain)/);
    assert.ok(p.identityEvidence.length > 45);
    assert.match(p.alt.toLowerCase(), new RegExp(p.name.toLowerCase().replaceAll(" ", "\\s+")));
    assert.ok(p.imageDate === "unknown" || p.imageDate <= photos.reviewed);
    assert.ok(p.width >= 640 && p.height >= 400);
  }
});

test("named waterfall guide displays the correct source-credited picture and honest dates", () => {
  for (const p of photos.photos) {
    const html=fs.readFileSync(p.page,"utf8");
    assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/);
    assert.ok(html.includes('<h1>'+p.name),p.id);
    assert.ok(html.includes('class="upfall-verified-photo"'),p.id);
    assert.ok(html.includes('src="'+p.imageUrl+'"'),p.id);
    assert.ok(html.includes('content="'+p.imageUrl+'"'),p.id+' OG image');
    assert.ok(html.includes('alt="'+p.alt.replaceAll("&","&amp;")+'"'),p.id);
    assert.ok(html.includes('href="'+p.sourceUrl+'"'),p.id+' attribution');
    assert.ok(html.includes('href="'+p.licenseUrl+'"'),p.id+' license');
    if (p.license.startsWith("CC ")) assert.match(p.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\/by(?:-sa)?\/[234]\.0\/$/, p.id+" invalid CC terms");
    assert.ok(html.includes('historical scene, not current conditions'), p.id+" photograph must not imply real-time conditions");
    assert.ok(html.includes(p.creator),p.id+' photo author should be visibly credited');
    assert.ok(html.includes('historical scene, not current conditions'),p.id);
    assert.ok(html.includes('"dateModified":"2026-11-12"'),p.id);
    assert.ok(sitemap.includes('<loc>https://chrisizworski.com/upper-peninsula-waterfalls/'+p.id+'/</loc><lastmod>2026-11-12</lastmod>'),p.id);
    for (const other of photos.photos.filter(x=>x.id!==p.id))assert.ok(!html.includes('src="'+other.imageUrl+'"'),p.id+' must not borrow '+other.id+' photo');
  }
});

test("no false photograph or permission claims on access-restricted research pages", () => {
  for(const path of ["public/upper-peninsula-waterfalls/research/dead-river-falls/index.html","public/upper-peninsula-waterfalls/research/au-train-falls/index.html","public/upper-peninsula-waterfalls/research/alger-falls-highway-parking-review/index.html"]){
    const html=fs.readFileSync(path,"utf8");
    assert.match(html, /noindex,follow/);
    assert.ok(!html.includes('class="upfall-verified-photo"'));
  }
  const closed=fs.readFileSync("public/upper-peninsula-waterfalls/sandstone-falls/index.html","utf8");
  assert.ok(closed.includes("trail closure reported in this guide"));
  const houghton=fs.readFileSync("public/upper-peninsula-waterfalls/houghton-douglass-falls/index.html","utf8");
  assert.ok(houghton.includes("developing scenic site"));
  const gorge=fs.readFileSync("public/upper-peninsula-waterfalls/gorge-falls/index.html","utf8");
  assert.ok(gorge.includes("Existing access restrictions"));
  const css=fs.readFileSync("public/assets/up-waterfalls.css","utf8");
  assert.ok(css.includes(".upfall-verified-photo"));
  assert.ok(css.includes("object-fit:contain"));
});

test("photo coverage queue reconciles all curated waterfall IDs exactly once", () => {
  const catalog=JSON.parse(fs.readFileSync("data/up-waterfalls.json", "utf8"));
  const queue=JSON.parse(fs.readFileSync("data/up-waterfall-photo-review-queue.json","utf8"));
  const ids=new Set(catalog.waterfalls.map(x => x.id));
  const published=new Set(photos.photos.map(x => x.id));
  const pending=new Set(queue.pending.map(x => x.id));
  assert.equal(ids.size, 80);
  assert.equal(queue.catalogCount, ids.size);
  assert.equal(queue.verifiedPhotoCount, published.size);
  assert.equal(queue.unphotographedCuratedCount, pending.size);
  assert.equal(queue.unphotographedCuratedCount + queue.verifiedPhotoCount, ids.size);
  assert.equal(pending.size, queue.pending.length);
  for (const id of published) assert.ok(ids.has(id),"Published photo not in waterfall inventory: "+id);
  for (const item of queue.pending) {
    assert.ok(ids.has(item.id),"Unrecognized waterfall photo queue item: "+item.id);
    assert.ok(!published.has(item.id),"Double counted waterfall photo: "+item.id);
    assert.equal(item.photoStatus,"not-yet-verified");
    assert.ok(!item.imageUrl && !item.photoRightsCleared, "Unreviewed queue row cannot provide published media");
  }
  for (const id of ids) assert.ok(published.has(id)||pending.has(id), "Missing photo source decision: "+id);
});
