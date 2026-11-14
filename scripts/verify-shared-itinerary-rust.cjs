// Verifies the ACTUAL compiled wasm32-unknown-unknown Rust kernel against
// the independent JS contract. Does not substitute a JS mock for the binary.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const oracle=require('../public/assets/shared-itinerary-engine.js');
const root=path.resolve(__dirname,'..');
const arg=process.argv.find(a=>a.startsWith('--wasm='));
if(!arg)throw Error('Pass --wasm=/path/to/compiled/shared-itinerary.wasm');
const bytes=fs.readFileSync(arg.slice(7));
assert.equal(bytes.subarray(0,4).toString('hex'),'0061736d','Rust binary must be real WebAssembly');
const e=new WebAssembly.Instance(new WebAssembly.Module(bytes),{}).exports;
assert.equal(e.it_version(),1);
for(const key of ['it_stop','it_nearby','it_plan','it_sheet'])assert.equal(typeof e[key],'function',key);
let checked=0;
for(let status=0;status<=8;status++)for(let arrival=0;arrival<=3;arrival++){
 const card={dataset:{status:['verify','seasonal','restricted','closed','research'][status]||'unknown',
 arrivalVerified:arrival===1?'verified':'pending'}};
 assert.equal(e.it_stop(status,arrival),status<=2&&arrival===1?1:0);
 for(const radius of [10,25,50,15])for(const d of [-1,0,9.9,10,24.9,25,49.9,50,50.1,NaN,Infinity]){
  const expected=status<=2&&arrival===1&&[10,25,50].includes(radius)&&Number.isFinite(d)&&d>=0&&d<=radius?1:0;
  assert.equal(e.it_nearby(status,arrival,d,radius),expected);
  if(arrival<=1&&status<=4&&[10,25,50].includes(radius))
   assert.equal(oracle.nearbyEligible(card,d,radius),expected===1);
  checked++;
 }
}
for(let saved=0;saved<=8;saved++)for(let missing=0;missing<=8;missing++)
 for(let verified=0;verified<=2;verified++)for(let ds=0;ds<=3;ds++)
 for(const month of [0,1,3,4,6,12,13])for(let season=0;season<=3;season++){
  let expected=0;
  if(season<=2&&ds<=2&&verified<=1&&(ds===2?(month>=1&&month<=12):month===0)){
   if(ds===0)expected=2;
   else if(season===1&&ds!==2)expected=3;
   else if(ds===2&&(month===12||month<=3)&&season!==0)expected=4;
   else if(saved>6||missing>6||saved+missing>6)expected=5;
   else if(verified!==1)expected=6;
   else expected=1;
  }
  assert.equal(e.it_plan(saved,missing,verified,ds,month,season),expected,
   [saved,missing,verified,ds,month,season].join('/'));
  checked++;
 }
for(let saved=0;saved<=8;saved++)for(let regions=0;regions<=8;regions++){
 const expected=saved<1||saved>6||regions<1||regions>saved?0:regions>1?2:1;
 assert.equal(e.it_sheet(saved,regions),expected);checked++;
}

const circle=require('../public/assets/circle-tour-rust-itinerary.js');
assert.equal(e.ct_version(),1);
for(const key of ['ct_leg','ct_published_day','ct_border','ct_drive'])
 assert.equal(typeof e[key],'function',key);
const order=circle.ORDER.map(Number);
assert.equal(order.length,31);
for(let direction=0;direction<=1;direction++)for(let i=0;i<31;i++)
 for(let j=0;j<31;j++)for(const proof of [0,1])
 for(const miles of [-1,0,1,43,600,601,NaN]){
  const a=order[i],b=order[j],next=order[(i+(direction===0?1:30))%31];
  const alias=(a===1&&b===30)||(a===30&&b===1);
  const expected=proof===1&&b===next&&Number.isFinite(miles)&&
    (alias?miles===0:miles>0&&miles<=600)?1:0;
  assert.equal(e.ct_leg(a,b,direction,miles,proof),expected,
    [a,b,direction,miles,proof].join('/'));checked++;
 }
for(const first of [0,1,3,12,31,30,32])for(const last of [0,1,3,12,31,30,32])
 for(const mile of [-1,0,1,87,87.5,600,601,NaN])for(const count of [0,1,2,11,31,32]){
  const firstValid=order.includes(first),lastValid=order.includes(last);
  const expected=firstValid&&lastValid&&count>=1&&count<=31&&
    Number.isSafeInteger(mile)&&mile>=0&&mile<=600&&
    (mile===0?(first===last&&count===1):(first!==last&&count>1))?1:0;
  assert.equal(e.ct_published_day(first,last,mile,count),expected);
  checked++;
 }
for(const available of [0,1,2])for(const wait of [-1,0,14,45,360,361,NaN])
 for(const allowance of [-1,0,14,45,360,361,NaN]){
   const expected=available<=1&&Number.isFinite(allowance)&&allowance>=0&&allowance<=360&&
     (available===0?allowance===45:Number.isFinite(wait)&&wait>=0&&wait<=360&&wait===allowance)?1:0;
   assert.equal(e.ct_border(available,wait,allowance),expected);
   checked++;
 }
for(const miles of [-1,0,1,47,600,Infinity,NaN])
 for(const hours of [0,1,1.2,47/47*1.2,600/47*1.2,NaN])
 for(const stay of [0,1,2]){
   const expected=stay<=1&&Number.isFinite(miles)&&Number.isFinite(hours)&&
     miles>=0&&hours>=0&&miles<=10000&&hours<=500&&
     (stay===1?(miles===0&&hours===0):Math.abs(hours-miles/47*1.2)<=0.000001)?1:0;
   assert.equal(e.ct_drive(miles,hours,stay),expected);
   checked++;
 }
console.log('Circle Tour source/WASM topology, mileage and border cases validated.');

// Pin the exact build artifact before promoting native runtime. This guards
// against source/binary drift and mislabeled JavaScript-only "Rust" releases.
const pin=path.join(root,'public/assets/shared-itinerary.wasm.b64');
if(fs.existsSync(pin)){
 const committed=Buffer.from(fs.readFileSync(pin,'utf8').trim(),'base64');
 assert.deepEqual(committed,bytes,'Committed binary differs from pinned rustc output');
 console.log('Shared itinerary WASM binary is pinned and reproducible.');
}else{
 console.log('UNPINNED: visitor runtime remains in independent JavaScript mode.');
}
const source=fs.readFileSync(path.join(root,'rust/shared-itinerary/src/lib.rs'),'utf8');
assert.match(source,/no_std/);
assert.doesNotMatch(source,/std::net|reqwest|parkingLat|driveTime|routePolyline/);
console.log('Shared itinerary Rust/WebAssembly verified: '+checked+' binary contract cases.');
