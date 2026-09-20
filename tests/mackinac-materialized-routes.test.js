import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routes=[
  "plan",
  "where-to-stay",
  "dining",
  "things-to-do",
  "events",
  "around-the-straits",
  "day-trip",
  "with-kids",
  "2-day-itinerary",
  "ferry-planner",
  "from-detroit",
  "from-chicago",
  "from-traverse-city",
  "from-grand-rapids",
  "limited-walking",
  "bike-day",
  "fall"
];

test("every navigable Mackinac page is materialized in the repository",()=>{
  for(const route of routes){
    const file=`public/mackinac-island/${route}/index.html`;
    assert.equal(fs.existsSync(file),true,`missing source-controlled route: ${file}`);
    const html=fs.readFileSync(file,"utf8");
    assert.match(html,/<title>[^<]+<\/title>/,`missing title in ${file}`);
    assert.match(html,/rel="canonical"/,`missing canonical in ${file}`);
  }
});
