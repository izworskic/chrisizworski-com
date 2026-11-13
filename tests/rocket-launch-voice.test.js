'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

const html=read('public/synced-national-tools/rocket-launch-live/index.html');
const app=read('public/synced-national-tools/rocket-launch-live/app.js');
const flight=read('public/assets/rocket-flight-desk.js');
const history=read('public/synced-national-tools/assets/launch-truth-desk.js');
const florida=read('public/assets/rocket-florida-access.js');
const vandenberg=read('public/synced-national-tools/rocket-launch-live/vandenberg.js');

test('rocket copy invites the spectator in without exposing internal monitoring labels',()=>{
  assert.match(html,/Find your next rocket launch/);
  assert.match(html,/When does your rocket fly\?/);
  assert.match(html,/Will the sky cooperate\?/);
  assert.match(html,/What does NET mean on a launch schedule\?/);
  assert.match(html,/Will I hear the engines from the viewing area\?/);
  assert.match(html,/What should I bring to watch a launch\?/);
  assert.match(html,/Official launch and access updates/);
  assert.doesNotMatch(html,/Python evidence|SOURCE COVERAGE FOR YOUR COAST|bounded source sample/);
  assert.doesNotMatch(html,/No Redis or hidden user tracking/);
});
test('dynamic answers speak to the spectator and still acknowledge uncertainty',()=>{
  assert.match(app,/No launches match that search/);
  assert.match(html,/Launch windows move\. Check again on launch day/);
  assert.match(app,/The map isn.t loading/);
  assert.match(app,/a city-listed vehicle movement overlaps/);
  assert.match(flight,/The launch is on the calendar\. Now find your spot/);
  assert.match(flight,/The countdown stopped\. Watch for the next attempt/);
  assert.match(flight,/The launch pad on a map isn.t a place you can drive to/);
  assert.match(history,/Both calendars list nearly the same launch time/);
  assert.match(florida,/the Titusville waterfront is a good place to start looking/);
  assert.match(vandenberg,/Start by looking at:/);
});
test('editorial changes preserve the trusted mission and public viewing journey',()=>{
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/rocket-launch-live\/"/);
  assert.match(html,/"dateModified":"2026-11-10"/);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/app\.js\?v=20261113-rust-national-v1/);
  assert.match(html,/rocket-flight-desk\.js\?v=20261110-voice-v1/);
  assert.match(html,/launch-truth-desk\.js\?v=20261110-voice-v1/);
  assert.match(html,/vandenberg\.js\?v=20261110-voice-v1/);
  assert.match(app,/siteMapHref\(site\)/);
  assert.match(app,/data\.scheduleFreshness==='recent'/);
  assert.match(flight,/s\?\.state==='candidate'/);
  assert.match(flight,/const UUID=/);
  assert.match(vandenberg,/candidate\?\.access\?\.directionsAllowed/);
  for(const code of [app,flight,history,florida,vandenberg]){
    assert.doesNotThrow(()=>new Function(code));
  }
});
