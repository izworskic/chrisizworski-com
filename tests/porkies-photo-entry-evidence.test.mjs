import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const get=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const json=p=>JSON.parse(get(p));
const entries=json("public/porcupine-mountains/experience-entry-evidence.json");
const choices=json("public/porcupine-mountains/experience-options.json");
const parking=json("public/porcupine-mountains/access-points.json").points;
const named=json("public/porcupine-mountains/trail-reference-catalog.json").entries;
const html=get("public/porcupine-mountains/index.html");
const ui=get("public/assets/porkies-experience-compare.js");
const css=get("public/assets/porkies-explorer.css");

test("all six parking-to-recreation matches come from DNR public records, never a certified entrance",()=>{
 assert.equal(entries.schemaVersion,1);
 assert.equal(entries.records.length,6);
 assert.equal(entries.signedTrailEntranceVerified,false);
 assert.equal(entries.parkingOpenVerified,false);
 assert.deepEqual(new Set(entries.records.map(e=>e.experienceId)),new Set(choices.options.map(e=>e.id)));
 for(const e of entries.records){
  const opt=choices.options.find(x=>x.id===e.experienceId);
  const p=parking.find(x=>x.id===e.parkingId);
  assert.ok(opt&&p,e.experienceId);
  assert.equal(opt.parkingId,p.id);
  assert.equal(opt.parkingAssetId,e.dnrParkingAssetId);
  assert.equal(p.parkingAssetId,e.dnrParkingAssetId);
  assert.equal(p.recPointId,e.dnrRecreationPointId);
  assert.equal(p.separationMeters,e.parkingToNamedRecreationPointMeters);
  assert.equal(e.matchedParkingToRecreationPoint,true);
  assert.equal(e.signedPedestrianEntranceIndependentlyVerified,false);
  assert.equal(e.continuousParkingToTrailGeometryCertified,false);
  assert.equal(e.openRoadVerified,false);
  assert.equal(e.openParkingVerified,false);
  assert.equal(e.openTrailVerified,false);
  assert.match(e.separationMeaning,/NOT|not walking/);
  assert.ok(e.relation.length>70&&e.nextAction.length>50);
  assert.ok(e.officialRelationSource.startsWith("https://www.michigan.gov/"));
  assert.ok(e.parkingRecordSource.startsWith("https://www.michigan.gov/"));
  if(opt.trailId)assert.equal(named.find(x=>x.id===opt.trailId)?.parkingId,e.parkingId);
 }
});

test("Presque #841 is not the signed visitor contact booth / day-use route",()=>{
 const e=entries.records.find(x=>x.experienceId==="river");
 assert.equal(e.dnrParkingAssetId,841);
 assert.equal(e.dnrRecreationPointId,3763);
 assert.equal(e.parkingToNamedRecreationPointMeters,66);
 assert.match(e.relation,/contact booth/i);
 assert.match(e.nextAction,/Do not presume/);
 assert.match(e.signedEntryStatus,/unmatched/);
 const esc=entries.records.find(x=>x.experienceId==="escarpment");
 assert.equal(esc.dnrParkingAssetId,1409);
 assert.match(esc.relation,/short overlook|easy Lake of the Clouds/i);
 assert.match(esc.nextAction,/shuttle/);
 const west=choices.options.find(x=>x.id==="river");
 assert.match(west.limits,/work-zone reopening/);
});

test("two newly credited real park photographs are not mislabeled as the exact trail or today's winter facility",()=>{
 const n=choices.options.find(x=>x.id==="nature"),w=choices.options.find(x=>x.id==="winter");
 assert.equal(n.photo.capturedYear,2014);
 assert.equal(w.photo.capturedYear,1959);
 assert.match(n.photo.license,/Public domain/);
 assert.equal(w.photo.license,"CC BY-SA 2.0");
 assert.match(n.photo.credit,/Yinan Chen/);
 assert.match(w.photo.credit,/Victor Grigas/);
 assert.ok(n.photo.creditUrl.startsWith("https://commons.wikimedia.org/wiki/File:"));
 assert.ok(w.photo.creditUrl.startsWith("https://commons.wikimedia.org/wiki/File:"));
 assert.match(n.photoAbout,/NOT confirmed as the Visitor Center Nature Trail/);
 assert.match(w.photoAbout,/NOT today's Winter Sports Complex/);
 assert.match(n.photo.alt,/not identified/);
 assert.match(w.photo.alt,/not an image of today's facilities/);
 assert.equal(choices.policy.photosAreArchived,true);
 assert.match(choices.policy.photoEvidenceRule,/not confirmation/);
});

test("source ledger fails closed; entry buttons use only verified DNR parking pin IDs",()=>{
 assert.match(ui,/experience-entry-evidence\.json/);
 assert.match(ui,/signedPedestrianEntranceIndependentlyVerified!==false/);
 assert.match(ui,/continuousParkingToTrailGeometryCertified!==false/);
 assert.match(ui,/parkingAssetId!==e\.dnrParkingAssetId/);
 assert.match(ui,/NOT a walk/);
 assert.match(ui,/porkies:compare-parking/);
 assert.match(ui,/ids:\[entry\.parkingId,entry\.parkingId\]/);
 assert.match(ui,/experience-photo-scope/);
 assert.match(ui,/option\.photo\.licenseUrl/);
 assert.doesNotMatch(ui,/routePath|calculateWalkingTime|verifyBridgeOpen|estimatedDrivingTime/);
});

test("native no-JavaScript answer and official sources remain published",()=>{
 assert.match(html,/id="experience-compare"/);
 assert.match(html,/experience-entry-static/);
 assert.match(html,/asset #1409.*74 m/);
 assert.match(html,/asset #72.*31 m/);
 assert.match(html,/experience-entry-evidence\.json/);
 assert.match(html,/photographs of today.s signed Nature Trail entrance/);
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(css,/\.experience-entry-source summary:focus-visible/);
 assert.match(css,/@media\(max-width:680px\)/);
});
