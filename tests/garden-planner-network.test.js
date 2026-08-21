import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const actions=JSON.parse(await readFile(new URL('../benchmarks/tool-network-actions.json',import.meta.url),'utf8'));
const owned=JSON.parse(await readFile(new URL('../benchmarks/owned-domain-network.json',import.meta.url),'utf8'));
const brand=JSON.parse(await readFile(new URL('../benchmarks/name-serp-governance.json',import.meta.url),'utf8'));
const projects=await readFile(new URL('../public/projects/index.html',import.meta.url),'utf8');

const launch=(actions.launches||[]).find(item=>item.id==='garden-planner-network-launch');
const planned=(owned.plannedSubproperties||[]).find(item=>item.host==='garden.chrisizworski.com');

test('Garden Planner stays launch-blocked until the owned production domain is verified',()=>{
  assert.ok(launch,'garden planner launch action is missing');
  assert.equal(launch.status,'launch-blocked');
  assert.equal(launch.intendedCanonical,'https://garden.chrisizworski.com/');
  assert.ok(launch.blockers.length>=3);
  assert.ok(launch.promotionGate.requires.includes('owned-domain-resolves'));
});

test('Garden Planner records Vercel hosting progress without claiming production verification',()=>{
  assert.equal(launch.hosting?.provider,'Vercel');
  assert.equal(launch.hosting?.projectName,'freighter-view-garden-planner');
  assert.equal(launch.hosting?.projectCreation,'accepted-2026-08-21');
  assert.equal(launch.hosting?.sourceCommit,'b9b50cea0c2d2af2095c7b25d2dfbfe27192f5fb');
  assert.equal(launch.hosting?.verification,'blocked-by-vercel-connector-read-permission');
});

test('planned Garden Planner reinforces one Chris Izworski entity without claiming live coverage',()=>{
  assert.ok(planned,'garden planner planned subproperty is missing');
  assert.equal(planned.status,'launch-blocked');
  assert.equal(planned.hostingState,'vercel-project-created-production-verification-pending');
  assert.equal(planned.creatorEntity,owned.canonicalPersonId);
  assert.equal(brand.canonicalPersonId,owned.canonicalPersonId);
  assert.equal(brand.gardenPlanner.creatorRequirement,owned.canonicalPersonId);
  assert.equal(brand.gardenPlanner.state,'launch-blocked');
});

test('Garden Planner search ownership does not collide with protected Michigan information owners',()=>{
  assert.equal(launch.searchOwnership.primary,'square foot garden planner');
  for(const id of ['planting-calendar','frost-dates','tomato-planting','seed-saving']){
    assert.ok(launch.searchOwnership.protectedAdjacentOwners.includes(id),`missing protected adjacent owner: ${id}`);
  }
});

test('central Projects page does not send users to the unverified Garden Planner yet',()=>{
  assert.doesNotMatch(projects,/garden\.chrisizworski\.com/);
});
