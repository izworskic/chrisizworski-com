const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const photos = JSON.parse(fs.readFileSync("data/up-waterfall-photo-provenance.json", "utf8"));
const sitemap = fs.readFileSync("public/sitemap-up-waterfalls.xml", "utf8");

test("every published waterfall photo has uniquely identified subject, primary source and commercial-use license", () => {
  assert.equal(photos.photos.length, 14);
  assert.equal(new Set(photos.photos.map(x => x.id)).size, photos.photos.length);
  assert.equal(new Set(photos.photos.map(x => x.imageUrl)).size, photos.photos.length);
  assert.deepEqual(new Set(photos.photos.map(x => x.id)), new Set(["wagner-falls","bond-falls","miners-falls","sable-falls","munising-falls","spray-falls","mosquito-falls","agate-falls","manabezho-falls","nawadaha-falls","great-conglomerate-falls","potawatomi-falls","sandstone-falls","laughing-whitefish-falls"]));
  for (const p of photos.photos) {
    assert.equal(p.role, "verified-guide-photo");
    assert.match(p.imageUrl, /^https:\/\/(?:thumb|upload)\.wikimedia\.org\/wikipedia\/commons\//);
    assert.ok(p.sourceUrl.startsWith("https://commons.wikimedia.org/wiki/File:"));
    assert.match(p.license, /^(CC BY 2\.0|CC BY-SA (?:3\.0|4\.0)|Public domain)/);
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
    assert.ok(html.includes('<h1>'+p.name+'</h1>'),p.id);
    assert.ok(html.includes('class="upfall-verified-photo"'),p.id);
    assert.ok(html.includes('src="'+p.imageUrl+'"'),p.id);
    assert.ok(html.includes('content="'+p.imageUrl+'"'),p.id+' OG image');
    assert.ok(html.includes('alt="'+p.alt.replaceAll("&","&amp;")+'"'),p.id);
    assert.ok(html.includes('href="'+p.sourceUrl+'"'),p.id+' attribution');
    assert.ok(html.includes('href="'+p.licenseUrl+'"'),p.id+' license');
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
  const css=fs.readFileSync("public/assets/up-waterfalls.css","utf8");
  assert.ok(css.includes(".upfall-verified-photo"));
  assert.ok(css.includes("object-fit:contain"));
});
