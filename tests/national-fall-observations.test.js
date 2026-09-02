const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const obs=require("../api/national-fall-observations.js")._test;

test("fall observation bounds cover the requested radius",()=>{
  const box=obs.boundsFor(43.6,-83.9,75);
  assert.ok(box.south<43.6&&box.north>43.6);
  assert.ok(box.west<-83.9&&box.east>-83.9);
});

test("fall observations exclude status conflicts and points outside 75 miles",()=>{
  const origin={latitude:43.6,longitude:-83.9};
  const rows=[
    {Observation_Date:"2026-08-31",Latitude:43.7,Longitude:-84.0,Phenophase_Status:1,Site_ID:1,Common_Name:"red maple",Intensity_Value:"25-49%"},
    {Observation_Date:"2026-08-30",Latitude:43.8,Longitude:-84.1,Phenophase_Status:1,Site_ID:2,Observed_Status_Conflict_Flag:1},
    {Observation_Date:"2026-08-30",Latitude:46.0,Longitude:-84.1,Phenophase_Status:1,Site_ID:3}
  ];
  const summary=obs.summarize(rows,origin);
  assert.equal(summary.records,1);
  assert.equal(summary.yes_records,1);
  assert.equal(summary.yes_sites,1);
  assert.equal(summary.latest_yes.common_name,"red maple");
  assert.equal(summary.latest_yes.intensity,"25-49%");
});

test("fall observations discard missing status instead of turning it into a no record",()=>{
  const origin={latitude:43.6,longitude:-83.9};
  const summary=obs.summarize([
    {observation_date:"2026-08-31",latitude:43.6,longitude:-83.9,phenophase_status:null,site_id:1},
    {observation_date:"2026-08-31",latitude:43.61,longitude:-83.91,phenophase_status:"",site_id:2}
  ],origin);
  assert.equal(summary.records,0);
  assert.equal(summary.no_records,0);
});

test("fall observation lookback follows the searched location calendar date",()=>{
  const now=new Date("2026-09-01T00:30:00Z");
  assert.deepEqual(obs.dateWindow(now,"America/New_York"),{start:"2026-08-11",end:"2026-08-31"});
  assert.deepEqual(obs.dateWindow(now,"America/Denver"),{start:"2026-08-11",end:"2026-08-31"});
  assert.deepEqual(obs.dateWindow(now,"Pacific/Honolulu"),{start:"2026-08-11",end:"2026-08-31"});
  assert.equal(obs.validTimeZone("America/New_York"),"America/New_York");
  assert.equal(obs.validTimeZone("not/a-zone"),null);
});

test("fall observations report no-color evidence separately from no data",()=>{
  const origin={latitude:43.6,longitude:-83.9};
  const noSummary=obs.summarize([
    {observation_date:"2026-08-29",latitude:43.6,longitude:-83.9,phenophase_status:0,site_id:10}
  ],origin);
  assert.match(noSummary.label,/no-color records/i);
  assert.equal(noSummary.no_records,1);
  assert.equal(noSummary.yes_records,0);

  const empty=obs.summarize([],origin);
  assert.match(empty.label,/No nearby recent colored-leaf observations/i);
  assert.equal(empty.records,0);
});

test("fall observation status never becomes a landscape peak percentage",()=>{
  const origin={latitude:43.6,longitude:-83.9};
  const summary=obs.summarize([
    {observation_date:"2026-08-31",latitude:43.6,longitude:-83.9,phenophase_status:1,site_id:1,intensity_value:"75-94%"},
    {observation_date:"2026-08-31",latitude:43.61,longitude:-83.91,phenophase_status:1,site_id:2,intensity_value:"95% or more"},
    {observation_date:"2026-08-30",latitude:43.62,longitude:-83.92,phenophase_status:1,site_id:2,intensity_value:"50-74%"}
  ],origin);
  assert.equal(summary.coverage,"some current local coverage");
  assert.equal(summary.yes_records,3);
  assert.ok(!Object.hasOwn(summary,"peak_percent"));
  assert.ok(!Object.hasOwn(summary,"landscape_percent"));
});


test("fall tool loads observation enrichment without blocking the core answer",()=>{
  const html=fs.readFileSync(require.resolve("../public/national-tools/fall-color/index.html"),"utf8");
  assert.match(html,/Nearby current leaf observations/);
  assert.match(html,/async function loadObservations/);
  assert.match(html,/void loadObservations\(loc\)/);
  assert.match(html,/AbortController/);
  assert.match(html,/encodeURIComponent\(loc\.timeZone\|\|""\)/);
  assert.match(html,/optional source failed independently/);
  assert.match(html,/individual monitored plants/i);
  assert.match(html,/never become a landscape/i);
  const inline=html.match(/<script>\s*(document\.addEventListener[\s\S]*?)<\/script>/);
  assert.ok(inline,"fall-color inline script not found");
  assert.doesNotThrow(()=>new Function(inline[1]));
});


test("fall-color route is declared as an intentional production change",()=>{
  const verify=fs.readFileSync(require.resolve("../scripts/verify-source.mjs"),"utf8");
  assert.match(verify,/"\/national-tools\/fall-color\/"/);
});
