const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/breakout-live.js');
function response(){
  return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},
    end(s){this.body=JSON.parse(s);return this;}};
}
test('mirrored Lake Mead page has same-origin validated server API',async()=>{
  const original=global.fetch;
  let upstream;
  global.fetch=async url=>{
    upstream=String(url);
    return {ok:true,status:200,json:async()=>({
      ok:true,id:'lake-mead-access',source:{name:'National Park Service',url:'https://www.nps.gov/lake/planyourvisit/changing-lake-levels.htm'},
      launches:Array.from({length:9},(_,i)=>({name:'Ramp '+i,motorized:i?'CLOSED':'OPEN'}))
    })};
  };
  try{
    const res=response();
    await handler({method:'GET',url:'/api/breakout-live?id=lake-mead-access',query:{id:'lake-mead-access'}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.launches.length,9);
    assert.match(upstream,/national-outdoor-core\.vercel\.app\/api\/breakout-live\?id=lake-mead-access/);
    assert.match(res.headers['Cache-Control'],/s-maxage=120/);
    assert.equal(res.headers['X-Robots-Tag'],'noindex, nofollow');
  }finally{global.fetch=original;}
});
test('unsupported IDs never reach the network',async()=>{
  const original=global.fetch;
  global.fetch=()=>{throw new Error('Should not fetch');};
  try{
    const res=response();
    await handler({url:'/api/breakout-live?id=not-real',query:{id:'not-real'}},res);
    assert.equal(res.statusCode,400);
    assert.equal(res.body.ok,false);
  }finally{global.fetch=original;}
});
test('incomplete lake table cannot be returned as successful live decision',async()=>{
  const original=global.fetch;
  global.fetch=async()=>({ok:true,status:200,json:async()=>({ok:true,id:'lake-powell-ramp-status',ramps:[{name:'Only ramp'}]})});
  try{
    const res=response();
    await handler({url:'/api/breakout-live?id=lake-powell-ramp-status',query:{id:'lake-powell-ramp-status'}},res);
    assert.equal(res.statusCode,502);
    assert.equal(res.body.ok,false);
    assert.equal(res.headers['Cache-Control'],'no-store');
  }finally{global.fetch=original;}
});
test('upstream outage yields an explicit fail-closed visitor state',async()=>{
  const original=global.fetch;
  global.fetch=async()=>{throw new Error('timeout');};
  try{
    const res=response();
    await handler({url:'/api/breakout-live?id=lake-mead-access',query:{id:'lake-mead-access'}},res);
    assert.equal(res.statusCode,502);
    assert.equal(res.body.ok,false);
    assert.match(res.body.detail,/official source/i);
  }finally{global.fetch=original;}
});
