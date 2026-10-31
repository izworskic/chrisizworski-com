const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const baseTime='2026-10-31T14:40:21.611Z';
const now=Date.parse(baseTime);
const sourceUrl='https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions';

function raw() {
  const names=['Boardwalk Beach Trail','Beach Trail','Southern Headland trail','Bimose Kinoomagewnan Trail','Manito Miikana Trail','White River Suspension Bridge Trail'];
  const records=names.map(name=>({
    name, difficulty:name.includes('Boardwalk')?'Easy':'Moderate',
    rawStatus:name.startsWith('White River')?'Closed.':'Open.',
    status:name.startsWith('White River')?'closed':'open',
    issuedOn:name.startsWith('White River')?'2026-10-22':'2026-10-12',
    comment:'Official source date reported by Parks Canada',
  }));
  return {schemaVersion:1,park:'pukaskwa',retrievedAt:baseTime,sourceUrl,sourceRecords:records};
}
async function feed(){
  const {recordSuccess}=await import('../lib/pukaskwa/condition-monitor.mjs');
  return recordSuccess(null,raw(),baseTime).feed;
}
const readStatus=()=>import('../lib/pukaskwa/public-status.mjs');
const chooser=()=>import('../public/assets/pukaskwa-choice.mjs');

test('Pukaskwa public response refuses to promote an Oct 12 report as fresh on Oct 31',async()=>{
  const {projectPukaskwaFeed}=await readStatus();
  const result=projectPukaskwaFeed(await feed(),now);
  assert.equal(result.ok,true); // Monitor heartbeat healthy, but trail reports remain old.
  assert.equal(result.monitor.recent,true);
  assert.equal(result.dayHikes.find(x=>x.id==='southern-headland').status,'stale');
  const bridge=result.dayHikes.find(x=>x.id==='white-river-bridge');
  assert.equal(bridge.status,'closed');
  assert.equal(bridge.observations[0].issuedOn,'2026-10-22');
});

test('A stopped or erroring monitor invalidates previous greens, but not last known closures',async()=>{
  const {projectPukaskwaFeed}=await readStatus();
  const healthy=await feed();
  healthy.snapshot.sourceRecords.find(x=>x.name==='Beach Trail').issuedOn='2026-10-31';
  const {contentFingerprint}=await import('../lib/pukaskwa/condition-monitor.mjs');
  healthy.fingerprint=contentFingerprint(healthy.snapshot);
  const recent=projectPukaskwaFeed(healthy,now);
  assert.equal(recent.dayHikes.find(x=>x.id==='beach').status,'recently-reported-open');
  const expired=projectPukaskwaFeed(healthy,now+19*3600_000);
  assert.equal(expired.dayHikes.find(x=>x.id==='beach').status,'source-unverified');
  assert.equal(expired.dayHikes.find(x=>x.id==='white-river-bridge').status,'closed');
  const outage={...healthy,health:'source-error'};
  const errorState=projectPukaskwaFeed(outage,now);
  assert.equal(errorState.dayHikes.find(x=>x.id==='beach').status,'source-unverified');
  assert.equal(errorState.monitor.health,'source-error');
});

test('Bad feed fingerprints and future timestamps are refused',async()=>{
  const {projectPukaskwaFeed}=await readStatus();
  const value=await feed();
  assert.throws(()=>projectPukaskwaFeed({...value,fingerprint:'x'},now),/fingerprint mismatch/);
  assert.throws(()=>projectPukaskwaFeed({...value,lastSuccessAt:'2026-11-02T08:00:00Z'},now),/Future/);
});

test('Thirty-minute gentle beach visit chooses boardwalk, not moderate headland or bridge',async()=>{
  const {projectPukaskwaFeed}=await readStatus();
  const {suitableOutings}=await chooser();
  const trails=projectPukaskwaFeed(await feed(),now).dayHikes;
  const x=suitableOutings(trails,{minutes:30,effort:'easy',vibe:'beach'});
  assert.equal(x.matches[0].id,'boardwalk-beach');
  assert.ok(!x.matches.some(t=>t.id==='southern-headland'||t.id==='white-river-bridge'));
  assert.ok(x.blocked.some(t=>t.id==='white-river-bridge'));
});

test('Two-hour moderate shore picks headland while keeping stale status visible',async()=>{
  const {projectPukaskwaFeed}=await readStatus();
  const {suitableOutings,decisionMessage}=await chooser();
  const trails=projectPukaskwaFeed(await feed(),now).dayHikes;
  const match=suitableOutings(trails,{minutes:120,effort:'moderate',vibe:'coast'});
  assert.equal(match.matches[0].id,'southern-headland');
  assert.equal(match.matches[0].status,'stale');
  assert.match(decisionMessage(match).lead,/not a confirmed-open trail/);
});

test('Full-day challenge never suggests a bridge with an active official closure',async()=>{
  const {projectPukaskwaFeed}=await readStatus();
  const {suitableOutings}=await chooser();
  const choices=suitableOutings(projectPukaskwaFeed(await feed(),now).dayHikes,{minutes:540,effort:'difficult',vibe:'challenge'});
  assert.ok(!choices.matches.some(t=>t.id==='white-river-bridge'));
  assert.ok(choices.blocked.some(t=>t.id==='white-river-bridge'));
});

test('Disconnected source returns no reassuring open statuses',async()=>{
  const {unavailablePukaskwa}=await readStatus();
  const x=unavailablePukaskwa();
  assert.equal(x.ok,false);
  assert.equal(x.dayHikes.length,8);
  assert.ok(x.dayHikes.every(t=>t.status==='source-unverified'));
});

test('Published HTML retains source links, eight useful no-JS choices, identity and image provenance',()=>{
  const html=fs.readFileSync('public/pukaskwa-national-park/index.html','utf8');
  const stylesheet=fs.readFileSync('public/assets/pukaskwa-explorer.css','utf8');
  const js=fs.readFileSync('public/assets/pukaskwa-explorer.js','utf8');
  assert.equal((html.match(/class="pk-trail" id="/g)||[]).length,8);
  assert.equal((html.match(/pk-photo-row[^>]*>[\s\S]*?<\/section>/g)||[]).length,1);
  assert.ok((html.match(/creativecommons\.org\/licenses\/by-sa\/4\.0/g)||[]).length>=4);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/href="https:\/\/chrisizworski.com\/pukaskwa-national-park\/"/);
  assert.match(html,/Southern Headland Trail.*2\.2 km/s);
  assert.match(html,/name="google-adsense-account"/);
  assert.match(html,/Horseshoe_Bay_Beach/);
  assert.match(html,/Parks Canada's day-hiking guidance/);
  assert.match(stylesheet,/@media\(max-width:670px\)/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  assert.match(js,/\/api\/pukaskwa-conditions/);
  assert.doesNotMatch(html+js, /localStorage|sessionStorage|geolocation/);
});

test('API rejects writes and unsupported query variants',async()=>{
  const handler=require('../api/pukaskwa-conditions.js');
  const recorder=()=>({
    headers:{},code:null,body:null,
    setHeader(k,v){this.headers[k.toLowerCase()]=v;},
    status(x){this.code=x;return this;},
    json(x){this.body=x;return this;},
  });
  const post=recorder();await handler({method:'POST',url:'/api/pukaskwa-conditions'},post);
  assert.equal(post.code,405);assert.equal(post.headers['x-robots-tag'],'noindex, nofollow');
  const query=recorder();await handler({method:'GET',url:'/api/pukaskwa-conditions?fake=open'},query);
  assert.equal(query.code,400);
});

test('Source-fetch helper rejects wrong host without publication',async()=>{
  const {fetchFeed}=require('../api/pukaskwa-conditions.js')._test;
  const response={ok:true,url:'https://fake.example.org/pukaskwa.json',headers:new Map(),text:async()=>JSON.stringify(await feed())};
  await assert.rejects(fetchFeed(async()=>response),/redirect/);
});
