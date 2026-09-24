const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const regional=require("../lib/detroit-outdoors/regional-discovery.js")._test;

const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Detroit cards always retain a Why this matters read when editorial copy is absent",()=>{
  const client=read("public/assets/detroit-outdoors.js");
  assert.match(client,/function fallbackCardNote\(c\)/);
  assert.match(client,/const cardNote=String\(note\|\|fallbackCardNote\(c\)\)\.trim\(\)/);
  assert.match(client,/<div class="card-read"><span>Why this matters<\/span><p>\$\{esc\(cardNote\)\}<\/p>\$\{sourceLine\}<\/div>/);
  assert.doesNotMatch(client,/\$\{note\?`<div class="card-read"><span>Why this matters/);
});

test("regional discovery supplies reader-facing Why this matters context",()=>{
  const place={
    id:"ibt-downriver",
    name:"IBT Downriver Linked Greenways Huron Clinton Metroparks To Flat Rock",
    area:"Downriver",
    latitude:42.12,
    longitude:-83.19,
    category:"trailhead",
    categoryLabel:"Trail system",
    driveMinutes:38,
    driveHours:0.63,
    source:"Michigan Outdoors Now",
    sourceUrl:"https://example.com/ibt-downriver",
    score:82
  };
  const weather={high:68,low:51,precipitationProbability:15,windGust:16,cloudCover:30,weatherCode:1};
  const candidate=regional.candidateFrom(place,weather,{ok:true,alerts:[]},"2026-09-24");
  assert.ok(candidate);
  assert.match(candidate.whyNow,/trail system/i);
  assert.match(candidate.whyNow,/about 38 minutes from central Detroit/i);
  assert.match(candidate.whyNow,/low rain risk/i);
  assert.doesNotMatch(candidate.whyNow,/entered today's board|discovery pool|cleared the current weather/i);
});
