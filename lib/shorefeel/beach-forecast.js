'use strict';
// Beach-water forecast: where we say "what will the water at the beach be", not the air.
//
// Method (each step was tested against NDBC buoys, Sept 1 to Oct 13 2026; see
// data/shorefeel/backtest-2026-10.json and docs/SHOREFEEL_BEACH_WATER.md):
//   LEVEL  today's best measured water number: buoy if one is in the destination's water,
//          else the nearest valid NOAA satellite pixel. NOAA's lake model alone is off by
//          about 3.8 F, the satellite by about 0.9 F, so the model is never the level.
//   CHANGE the NOAA Lake Michigan-Huron model's (LMHOFS) own change in surface temperature
//          from now to +6/12/24/36/48 h, taken at the satellite pixel's model cell. Adding it to the
//          level cut 24 h error from 1.45 F to 1.31 F and 48 h error from 2.19 F to 1.87 F.
//   SHALLOW the model's difference between the beach cell and that offshore cell, capped at 2 F.
//          Not yet validated against shore thermometers, so it widens the range.
//   RANGE  1.5 x the backtest mean error at that lead, never a single number.
//   COOLING WATCH  model 24 h change <= -1.5 F caught 7 of 7 real drops of 3 F or more,
//          with a 32% hit rate. It is a watch, worded as one, not a prediction.
// Nothing is estimated when there is no level or no model cycle: the answer is null.

// Cells on NOAA's LMHOFS regular grid (837 x 478, about 1 km). j = row (ny), i = column (nx).
const BEACHES=Object.freeze({
  'traverse-city':[
    {key:'clinch-park',name:'Clinch Park beach',cell:{j:317,i:244},ref:{j:320,i:244},satKey:'west-bay',seaward:0},
    {key:'tc-state-park',name:'Traverse City State Park beach',cell:{j:315,i:251},ref:{j:316,i:249},satKey:'east-bay',seaward:20}
  ],
  'grand-haven':[
    {key:'grand-haven-state-park',name:'Grand Haven State Park beach',cell:{j:145,i:181},ref:{j:145,i:179},satKey:'open-shore',seaward:270}
  ]
});
const LEADS=Object.freeze([0,6,12,24,36,48]);
const BASE_URL='https://opendap.co-ops.nos.noaa.gov/thredds/dodsC/NOAA/LMHOFS/MODELS/';
// Half-widths (F) from the backtest: 1.5 x mean absolute error, rounded up to a whole degree.
const HALF_WIDTH=Object.freeze({0:2,6:2,12:2,24:2,36:3,48:3});
const SHALLOW_CAP_F=2;
const WATCH_F=-1.5,SHARP_F=-3;

const c2f=c=>c*9/5+32;
const r1=n=>Math.round(n*10)/10;
const pad=n=>String(n).padStart(2,'0');

/* The model cycles at 00/06/12/18Z. Return the newest cycles first, starting with the one
   that should have been published by `now` (about 5 h after cycle time). */
function cycleCandidates(now=new Date(),count=3,lagHours=5){
  const out=[];
  let t=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),Math.floor(now.getUTCHours()/6)*6);
  if(now.getTime()-t<lagHours*3600000)t-=6*3600000;
  for(let k=0;k<count;k++,t-=6*3600000)out.push(cycleAt(new Date(t)));
  return out;
}
function cycleAt(d){
  const ymd=d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate());
  return {time:d,url:h=>BASE_URL+d.getUTCFullYear()+'/'+pad(d.getUTCMonth()+1)+'/'+pad(d.getUTCDate())+'/lmhofs.t'+pad(d.getUTCHours())+'z.'+ymd+'.regulargrid.f'+String(h).padStart(3,'0')+'.nc'};
}
/* The cycle whose forecast hour f000-f005 lands on `when` (for the model state at the time
   the level was observed). */
function cycleFor(when){
  const t=Math.floor(when.getTime()/(6*3600000))*6*3600000;
  const c=cycleAt(new Date(t));c.hour=Math.round((when.getTime()-t)/3600000);return c;
}
/* OPeNDAP .ascii hyperslab for one surface box. */
function boxQuery(box){return '.ascii?temp%5B0:0%5D%5B0:0%5D%5B'+box.j0+':'+box.j1+'%5D%5B'+box.i0+':'+box.i1+'%5D';}
function boxFor(cells){
  const js=cells.flatMap(c=>[c.j]),is=cells.flatMap(c=>[c.i]);
  return {j0:Math.min(...js),j1:Math.max(...js),i0:Math.min(...is),i1:Math.max(...is)};
}
/* Parse the .ascii body into {`${j},${i}`: degrees C}. Fill values and anything not a
   plausible lake temperature are dropped (land and ice-masked cells). */
function parseBox(raw,box){
  const out={};
  const text=String(raw||'');
  if(text.length>20000||!/Float32 temp\[/.test(text))return out;
  for(const line of text.split(/\r?\n/)){
    const m=line.match(/^\[0\]\[0\]\[(\d+)\],\s*(.+)$/);
    if(!m)continue;
    const row=Number(m[1]);
    m[2].split(',').map(x=>Number(x.trim())).forEach((v,col)=>{
      if(Number.isFinite(v)&&v>-2&&v<36)out[(box.j0+row)+','+(box.i0+col)]=v;
    });
  }
  return out;
}
const at=(grid,cell)=>{const v=grid?.[cell.j+','+cell.i];return Number.isFinite(v)?c2f(v):null;};

/* Combine one beach's level and model fields into a forecast.
   level      {kind,tempF,observedAt}  the measured water number, observed at observedAt
   refGrid    parsed model box at observedAt (the model's state when the level was measured)
   leads      [{leadH,startsAt,grid}]  parsed model boxes at now+lead
   Returns null whenever the evidence is missing; nothing is estimated. */
function beachForecast(beach,level,refGrid,leads){
  if(!level||!Number.isFinite(level.tempF))return null;
  const ref0=at(refGrid,beach.ref);
  if(ref0===null)return null;
  const points=[];
  for(const L of leads||[]){
    const refT=at(L.grid,beach.ref),cellT=at(L.grid,beach.cell);
    if(refT===null)continue;
    const change=refT-ref0;
    const shallow=cellT===null?0:Math.max(-SHALLOW_CAP_F,Math.min(SHALLOW_CAP_F,cellT-refT));
    const temp=level.tempF+change+shallow;
    const half=(HALF_WIDTH[L.leadH]??3)+(Math.abs(shallow)>0.5?1:0);
    points.push({leadH:L.leadH,startsAt:L.startsAt,tempF:r1(temp),low:Math.round(temp-half),high:Math.round(temp+half),changeF:r1(change),shallowF:r1(shallow)});
  }
  if(!points.length)return null;
  // Cooling watch: model change over the 24 h from NOW (lead 24 minus lead 0), the quantity the backtest scored.
  const p0=points.find(p=>p.leadH===0),p24=points.find(p=>p.leadH===24);
  let cooling=null;
  if(p0&&p24){
    const d=r1(p24.changeF-p0.changeF);
    cooling=d<=SHARP_F?{tier:'sharp',deltaF:d,text:'Sharp cold drop likely. The model has the surface cooling about '+Math.abs(Math.round(d))+'°F within a day. In Sept–Oct 2026 tests, this signal was followed by a drop of 3°F or more half the time.'}
      :d<=WATCH_F?{tier:'watch',deltaF:d,text:'Cooling watch. The model has the surface cooling about '+Math.abs(Math.round(d))+'°F within a day. In Sept–Oct 2026 tests this signal never missed a drop of 3°F or more, but about two in three watches were smaller.'}
      :null;
  }
  return {key:beach.key,name:beach.name,levelKind:level.kind,levelTempF:r1(level.tempF),levelObservedAt:level.observedAt,
    now:points[0],points,cooling,shallowApplied:points.some(p=>Math.abs(p.shallowF)>0.5)};
}
module.exports={BEACHES,LEADS,HALF_WIDTH,SHALLOW_CAP_F,WATCH_F,SHARP_F,cycleCandidates,cycleAt,cycleFor,boxQuery,boxFor,parseBox,at,beachForecast};
