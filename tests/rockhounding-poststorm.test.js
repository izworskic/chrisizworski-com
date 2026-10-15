'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {assessPostStorm,validateWave,coastProxy}=require('../lib/rockhounding/poststorm-engine.cjs');
const H=3600000,now='2026-10-15T12:00:00.000Z',N=Date.parse(now),cell='glwu-test-cell';
const site={id:'grand-marais-agate',modelCell:{id:cell,reviewStatus:'WET_CELL_VERIFIED',distanceFromBeachKm:4},shore:{outwardBearingDeg:0,reviewStatus:'REVIEWED_WATERLINE'},sheltering:'OPEN_EXPOSURE_REVIEWED'};
function row(h,phase='MODEL_ANALYSIS',wave=.35,dir=0){
 const validAt=new Date(N+h*H).toISOString();
 return {source:'NOAA_GLWU',phase,validAt,modelCycleAt:phase==='MODEL_ANALYSIS'?validAt:now,
 cellId:cell,htsgwM:wave,windWaveHeightM:wave*.9,windWavePeriodS:5,windWaveFromDeg:dir,
 variables:['HTSGW','WVHGT','WVPER','WVDIR']};
}
function fixture(){
 const baseline=[],history=[],forecast=[];
 for(let h=-408;h< -72;h+=3)baseline.push(row(h));
 for(let h=-72;h<=0;h+=3)history.push(row(h,'MODEL_ANALYSIS',h===-24?1.8:(h>=-30&&h<=-18?1.2:.35)));
 for(let h=3;h<=12;h+=3)forecast.push(row(h,'MODEL_FORECAST',.3));
 return {site,baseline,history,forecast,nowISO:now,hazards:{status:'CLEAR'}};
}
test('72 hour elevated then settling signal is explicitly research-only, not safe or new stones',()=>{
 const r=assessPostStorm(fixture());assert.equal(r.status,'RESEARCH_SETTLING_CANDIDATE');
 assert.equal(r.canPublishSearchWindow,false);assert.equal(r.visitWindow,'NOT_ASSESSED');assert.equal(r.canClaimNewStones,false);
 assert.ok(r.evidence.relativeToBaselineP75>1.6);
});
test('ongoing waves prevent post-event result',()=>{
 const d=fixture();d.history[d.history.length-1]=row(0,'MODEL_ANALYSIS',1.6);
 assert.equal(assessPostStorm(d).status,'MODEL_DISTURBANCE_ONGOING');
});
test('waves rebuilding in upcoming forecast prevent settled result',()=>{
 const d=fixture();d.forecast[2]=row(9,'MODEL_FORECAST',1.6);
 assert.equal(assessPostStorm(d).status,'WAVES_MAY_REBUILD');
});
test('known hazards veto recommendation, unknown hazards prevent cleared signal',()=>{
 const d=fixture();d.hazards={status:'ACTIVE'};
 assert.equal(assessPostStorm(d).status,'HAZARD_VETO');
 d.hazards={status:'UNKNOWN'};
 assert.equal(assessPostStorm(d).status,'SETTLING_CANDIDATE_HAZARDS_UNKNOWN');
});
test('no reviewed shoreline bearing or wet cell means no beach comparison',()=>{
 const d=fixture();
 d.site={...site,shore:{outwardBearingDeg:null,reviewStatus:'UNVERIFIED_WATERLINE'}};
 assert.equal(assessPostStorm(d).status,'SHORE_ORIENTATION_UNVERIFIED');
 d.site={...site,modelCell:{id:cell,reviewStatus:'CANDIDATE',distanceFromBeachKm:4}};
 assert.equal(assessPostStorm(d).status,'CELL_NOT_VERIFIED');
});
test('protected harbor cannot be resolved using regional GLWU cell',()=>{
 const d=fixture();d.site={...site,id:'grand-marais-harbor',sheltering:'SHELTERED_BAY_UNRESOLVED'};
 assert.equal(assessPostStorm(d).status,'BAY_NOT_RESOLVED_BY_GRID');
});
test('wave-from not wind-from direction controls directional proxy',()=>{
 const w=row(-24,'MODEL_ANALYSIS',2,0);
 assert.ok(coastProxy(w,0).relativeExposure>10);
 assert.equal(coastProxy(w,180).relativeExposure,0);
 assert.equal(validateWave({...w,variables:['HTSGW','WVHGT','WVPER','WDIR']}),false);
});
test('missing model analyses cannot be substituted by forecast or stale archive',()=>{
 const d=fixture();d.history=d.history.map(r=>({...r,phase:'MODEL_FORECAST',modelCycleAt:new Date(N-4*24*H).toISOString()}));
 assert.equal(assessPostStorm(d).status,'INSUFFICIENT_HISTORY');
 d.history=fixture().history.slice(0,9);
 assert.equal(assessPostStorm(d).status,'STALE_MODEL_ANALYSIS');
});
test('missing baseline rejects a made-up storm anomaly',()=>{
 const d=fixture();d.baseline=[];
 assert.equal(assessPostStorm(d).status,'INSUFFICIENT_BASELINE');
});
test('forecast gaps cannot be silently interpolated',()=>{
 const d=fixture();d.forecast=d.forecast.filter(r=>r.validAt!==row(6,'MODEL_FORECAST').validAt);
 assert.equal(assessPostStorm(d).status,'SETTLING_CANDIDATE_FORECAST_INCOMPLETE');
});
test('incomplete model history is not a valid retrospective event',()=>{
 const d=fixture();d.history=d.history.filter(r=>![-18,-15,-12,-9].some(h=>r.validAt===row(h).validAt));
 assert.equal(assessPostStorm(d).status,'INSUFFICIENT_HISTORY');
});
test('invalid source, dates and wave directions are excluded',()=>{
 const x=row(-24);assert.equal(validateWave({...x,source:'MADE_UP'}),false);
 assert.equal(validateWave({...x,validAt:'yesterday'}),false);
 assert.equal(validateWave({...x,windWaveFromDeg:390}),false);
});
test('same grid cell warning prevents independent harbor resolution',()=>{
 const d=fixture(),r=assessPostStorm({...d,peerCellId:cell});
 assert.ok(r.notes.some(s=>s.includes('share model wet cell')));
 assert.equal(r.canPublishSearchWindow,false);
});
