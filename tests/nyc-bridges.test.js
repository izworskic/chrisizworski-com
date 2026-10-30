const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"public/nyc-bridges/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"public/assets/nyc-bridges.css"),"utf8");
const js=fs.readFileSync(path.join(root,"public/assets/nyc-bridges.js"),"utf8");
const guides=fs.readFileSync(path.join(root,"public/guides/index.html"),"utf8");
const sitemap=fs.readFileSync(path.join(root,"public/sitemap.xml"),"utf8");
const ids=["brooklyn","manhattan","williamsburg","queensboro","george-washington","high-bridge"];
test("NYC Bridges has its own canonical purpose and no duplicate traffic decision engine",()=>{
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/nyc-bridges\/">/);
 assert.match(html,/<h1[^>]*>Walk the city/);
 assert.match(html,/href="\/nyc-crossing\/"/);
 assert.match(html,/dateModified/);
 assert.doesNotMatch(html,/noindex/);
 assert.equal((html.match(/<h1\b/g)||[]).length,1)
});
test("Six bridges are rendered as HTML before JavaScript and each has original-source/license links",()=>{
 for(const id of ids){assert.match(html,new RegExp('id="'+id+'"'));assert.match(html,new RegExp('data-list-id="'+id+'"'))}
 assert.equal((html.match(/class="bridge-entry"/g)||[]).length,6);
 assert.equal((html.match(/class="bridge-photo"/g)||[]).length,6);
 assert.equal((html.match(/Special:FilePath/g)||[]).length>=7,true);
 assert.equal((html.match(/commons.wikimedia.org\/wiki\/File:/g)||[]).length>=7,true);
 assert.match(html,/Nabiha\.A/);assert.match(html,/GaoKyle/);assert.match(html,/Kidfly182/);
 assert.match(html,/https:\/\/www.nyc.gov\/html\/dot\/html\/infrastructure/);
 assert.match(html,/https:\/\/www.nycgovparks.org\/park-features\/highbridge-park\/planyc/)
});
test("JSON-LD is strict JSON with six items and consistent Person identity",()=>{
 const block=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert.ok(block,"single JSON-LD block");
 const graph=JSON.parse(block[1])["@graph"];
 assert.ok(graph.find(x=>x["@type"]==="Person"&&x["@id"]==="https://chrisizworski.com/#person"));
 assert.equal(graph.find(x=>x["@type"]==="ItemList").itemListElement.length,6);
});
test("Map and browser interaction parse and fail openly",()=>{
 assert.doesNotThrow(()=>new vm.Script(js,{filename:"nyc-bridges.js"}));
 for(const token of ["leaflet-1.9.4.js","vendor/leaflet-1.9.4.css","bridge-map","filter-status","light-date","day-panel"])assert.ok(html.includes(token));
 for(const token of ["/api/carto-basemap-config","rastertiles/voyager","tile.openstreetmap.org","America/New_York","aria-pressed"])assert.ok(js.includes(token),token);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
 assert.match(html,/astronomical calculations/);
});
test("Guide directory and sitemap discover the new canonical separately from the driving tool",()=>{
 assert.match(guides,/href="\/nyc-bridges\/"/);
 assert.match(guides,/href="\/nyc-crossing\/"/);
 assert.match(sitemap,/https:\/\/chrisizworski.com\/nyc-bridges\//);
 assert.match(sitemap,/<lastmod>2026-10-30<\/lastmod>/);
});
