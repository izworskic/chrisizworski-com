"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const dirs=["synced-national-tools/rocket-launch-live","synced-national-tools/space-coast-launch","starbase-rocket-launch-viewing","wallops-rocket-launch-viewing","kodiak-rocket-launch-viewing","barking-sands-rocket-launch-viewing"];
const now=Date.parse("2026-11-28T12:00:00Z"),stamp=age=>new Date(now-age*60000).toISOString();
const packet=(age,flag="recent")=>({scheduleCheckedAt:stamp(age),generatedAt:stamp(0),scheduleFreshness:flag,selectedLaunch:{id:"national"},next:{id:"florida"},nationalNext:{id:"next"},upcoming:[{id:"listed"}],regions:[{launches:[{id:"regional"}]}]});
let source;
for(const dir of dirs)test(dir+" verifies actual observation age before rendering",()=>{
 const js=fs.readFileSync("public/"+dir+"/app.js","utf8");
 const fn=js.match(/function admitRocketSchedule\(data, now = Date\.now\(\)\) \{[\s\S]*?\n  \}/)?.[0];
 assert.ok(fn);if(source)assert.equal(fn,source,"All six entrypoint guards use the same contract");else source=fn;
 const admit=vm.runInNewContext("("+fn+")");const fresh=packet(75);assert.equal(admit(fresh,now),fresh);assert.equal(fresh.scheduleFreshness,"recent");assert.equal(fresh.selectedLaunch.sourceStale,undefined);
 for(const d of [packet(75.01),packet(-1.01),packet(0,"unknown"),packet(0,"stale"),{...packet(0),scheduleCheckedAt:null},{...packet(0),scheduleCheckedAt:"invalid"},{...packet(0),scheduleCheckedAt:42}]){
  const original=d.scheduleCheckedAt;admit(d,now);assert.equal(d.scheduleFreshness,"stale");assert.equal(d.scheduleCheckedAt,original,"Never rewrite source observation");assert.match(d.scheduleWarning,/overdue/);assert.ok([d.selectedLaunch,d.next,d.nationalNext,...d.upcoming,...d.regions[0].launches].every(m=>m.sourceStale===true));
 }
 assert.equal(admit(packet(-1),now).scheduleFreshness,"recent");
 assert.match(js,/admitRocketSchedule\((?:d|data)\);\s+(?:render|renderSelector|showMission|showMissions|present)\(/);
 assert.match(fs.readFileSync("public/"+dir+"/index.html","utf8"),/app\.js\?v=[^"']*-20261128-age/);
});
