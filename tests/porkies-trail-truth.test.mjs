import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const data=JSON.parse(read("public/porcupine-mountains/trail-reference-catalog.json"));
const html=read("public/porcupine-mountains/index.html");
const css=read("public/assets/porkies-explorer.css");
const js=read("public/assets/porkies-trail-truth.js");
const gis=read("public/assets/porkies-route-evidence.js");
test("21 DNR narrative catalog entries are individually signed-off source references, not generated route lengths",()=>{
 assert.equal(data.entries.length,21);
 assert.equal(new Set(data.entries.map(x=>x.id)).size,21);
 assert.equal(new Set(data.entries.map(x=>x.name)).size,21);
 for(const r of data.entries){
  assert.equal(r.routeCertified,false,r.name);
  assert.ok(r.descriptionEditionMiles>0&&r.descriptionEditionMiles<=18);
  assert.ok(r.source.includes("PMWSP-trail-descriptions.pdf"),r.name);
  assert.ok(r.mapSource.includes("Porcupine-Mountains-State-Park-Map-GPS.pdf"),r.name);
  assert.ok(r.caution.length>50,r.name);
  assert.ok(r.asOf==="2026-10-28");
  assert.ok(!/open now|currently safe|unbridged crossing is passable|verified time/i.test(r.caution));
 }
});
test("conflicting official editions never become a single false-precision hiking distance",()=>{
 const diff=data.entries.filter(x=>x.map2025Miles!==null);
 assert.equal(diff.length,4);
 const m=Object.fromEntries(diff.map(x=>[x.id,[x.descriptionEditionMiles,x.map2025Miles]]));
 assert.deepEqual(m.escarpment,[4.3,3.7]);
 assert.deepEqual(m.government,[7.3,6.4]);
 assert.deepEqual(m["lake-superior"],[17.1,15.6]);
 assert.deepEqual(m["north-mirror"],[3.8,3.5]);
 assert.match(data.rule,/NOT automatically usable from the given lot/);
});
test("published card listing and map inspect controls retain noJS usability",()=>{
 assert.equal((html.match(/class="trail-truth-card"/g)||[]).length,21);
 assert.equal((html.match(/class="trail-see-map"/g)||[]).length,21);
 for(const x of data.entries){
  assert.ok(html.includes('data-trail="'+x.id+'"'),x.id);
  assert.ok(html.includes(x.name),x.name);
 }
 assert.match(html,/id="trail-truth-filter"/);
 assert.match(html,/id="trail-truth-grid"/);
 assert.match(html,/assets\/porkies-trail-truth.js/);
 assert.match(html,/no hiking time or river-crossing clearance/i);
 assert.match(html,/noindex,follow/);
 assert.match(css,/\.trail-truth-card/);
});
test("map inspection highlights ONLY existing named DNR segments without inventing gaps or connected route",()=>{
 assert.match(js,/porkies:trail-reference/);
 assert.match(gis,/inspectNamedTrail/);
 assert.match(gis,/not present as a separately named line/i);
 assert.match(gis,/NOT a verified continuous route/);
 assert.match(gis,/source line fragment/);
 assert.ok(!/walkingTimeMinutes|drivingETA|hikingETA|routeEligible:\s*true/.test(js+gis));
});
