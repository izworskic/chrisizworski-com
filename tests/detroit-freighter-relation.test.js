"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("Detroit freighter page loads the user-relative live map",()=>{
  const html=read("public/detroit-river-freighters/index.html");
  const js=read("public/assets/detroit-freighter-relation.js");
  assert.match(html,/\/assets\/detroit-freighter-relation\.js\?v=20260924a/);
  assert.match(js,/Where is the ship relative to you\?/);
  assert.match(js,/Use my location/);
  assert.match(js,/navigator\.geolocation\.getCurrentPosition/);
  assert.match(js,/Your coordinates are not sent to the Detroit Outdoors API, JEV or Haiku/);
  assert.match(js,/\/api\/detroit-outdoors\?intent=freighter/);
  assert.match(js,/fetch\("\/api\/freighter-ais"/);
  assert.match(js,/MAX_AIS_AGE_MS=10\*60\*1000/);
  assert.match(js,/REFRESH_MS=5\*60\*1000/);
  assert.match(js,/speed>0\.5/);
  assert.match(js,/tile\.openstreetmap\.org/);
  assert.match(js,/Ship → riverfront/);
  assert.match(js,/You → riverfront/);
  assert.doesNotMatch(js,/latitude.*fetch|longitude.*fetch|userLocation.*JSON\.stringify/);
});

test("Detroit freighter relation bundle parses as JavaScript",()=>{
  execFileSync(process.execPath,["--check",path.join(root,"public/assets/detroit-freighter-relation.js")],{stdio:"pipe"});
});
