'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/utah-ski-road.js');
function req(method='GET',url='/api/utah-ski-road'){
 const headers={};
 return {request:{method,url},response:{setHeader:(k,v)=>{headers[k]=v},status(code){this.code=code;return this},json(body){this.body=body;return {code:this.code,body,headers}}}};
}
test('public UDOT route rejects unsafe methods before contacting upstream',async()=>{
 const {request,response}=req('POST');
 const result=await handler(request,response);assert.equal(result.code,405);
 assert.equal(result.headers.Allow,'GET');assert.equal(result.headers['Cache-Control'],'no-store');
});
test('public UDOT route prevents query-string cache fragmentation',async()=>{
 const {request,response}=req('GET','/api/utah-ski-road?v=1');
 const result=await handler(request,response);assert.equal(result.code,400);
 assert.equal(result.headers['Cache-Control'],'no-store');
});
test('public UDOT route responds with shared cache headers and never raw provider URLs',async()=>{
 const old=process.env.UDOT_API_KEY;delete process.env.UDOT_API_KEY;
 try{
  const {request,response}=req();
  const out=await handler(request,response);
  assert.equal(out.code,200);assert.equal(out.body.sourceHealth,'UNAVAILABLE');
  assert.equal(out.headers['X-Robots-Tag'],'noindex, nofollow');
  assert.match(out.headers['Vercel-CDN-Cache-Control'],/s-maxage=120/);
  assert.deepEqual(Object.keys(out.body.canyons).sort(),['SR190','SR210']);
  assert.equal(out.body.canyons.SR210.openConfirmed,false);
 }finally{if(old===undefined)delete process.env.UDOT_API_KEY;else process.env.UDOT_API_KEY=old}
});
