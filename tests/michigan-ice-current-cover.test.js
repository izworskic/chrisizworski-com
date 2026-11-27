const test=require('node:test');
const assert=require('node:assert/strict');
const now=new Date('2026-11-26T12:00:00Z');
const fixture=(body,status=200)=>async()=>new Response(body,{status});
test('ice source states never convert missing or stale observations into current zero',async()=>{
  const {readCurrentCover}=await import('../lib/michigan-ice/current-cover.mjs');
  const cases=[
    [fixture('missing',404),'season-file-not-found'],
    [fixture('unavailable',503),'source-http-error'],
    [async()=>{throw Error('network')},'source-unavailable'],
    [fixture('2025 330 0 0 0 0 0 0 0'),'no-current-season-observation'],
    [fixture('2026 330 0 0 NA 0 0 0 0'),'no-complete-observation'],
    [fixture('2026 325 0 0 0 0 0 0 0'),'stale-observation'],
    [fixture('2026 330 0 0 0 0 0 0 0\n2026 330 1 0 0 0 0 0 0'),'ambiguous-observation']
  ];
  for(const [fetcher,state] of cases){
    const r=await readCurrentCover(now,fetcher);
    assert.equal(r.cover,null,state);assert.equal(r.coverStatus.state,state);
    assert.equal(r.coverStatus.seasonFile,'g2026_2027_ice.dat');
  }
  const stale=await readCurrentCover(now,cases[5][0]);
  assert.equal(stale.coverStatus.lastObservedAt,'2026-11-21');
  const live=await readCurrentCover(now,fixture('2026 330 0 0 0 0 0 0 0'));
  assert.equal(live.cover.total,0);assert.equal(live.cover.observedAt,'2026-11-26');
  assert.equal(live.coverStatus.state,'observed');
  const summer=await readCurrentCover(new Date('2026-07-01T12:00:00Z'),async()=>{throw Error('must not fetch')});
  assert.equal(summer.coverStatus.state,'off-season');
});
