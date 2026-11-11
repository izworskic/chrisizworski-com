const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {stripTypeScriptTypes}=require('node:module');
const {createPageHandler}=require('../lib/freighter-page');
let middleware,config;
test.before(async()=>{
 const source=stripTypeScriptTypes(fs.readFileSync('middleware.ts','utf8'));
 ({default:middleware,config}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')));
});
test('tracker middleware selects its HTML function before the existing static file',async()=>{
 assert.ok(config.matcher.includes('/great-lakes-freighter-tracking/:path*'));
 assert.ok(fs.existsSync('public/great-lakes-freighter-tracking/index.html'));
 for(const host of ['chrisizworski.com','tracker-preview.vercel.app'])for(const path of ['/great-lakes-freighter-tracking','/great-lakes-freighter-tracking/'])for(const method of ['GET','HEAD']){
  const response=await middleware(new Request('https://'+host+path+'?utm_source=test',{method}));
  assert.equal(response.headers.get('x-middleware-rewrite'),'https://'+host+'/api/freighter-page?utm_source=test');
  assert.equal(response.headers.get('location'),null);
  assert.equal(response.headers.get('x-robots-tag'),null);
  assert.equal(await response.text(),'');
 }
});
test('Pictured Rocks canonical redirect still runs before the tracker rewrite',async()=>{
 const response=await middleware(new Request('https://picturedrocks.chrisizworski.com/great-lakes-freighter-tracking/'));
 assert.equal(response.status,308);
 assert.equal(response.headers.get('location'),'https://chrisizworski.com/great-lakes-freighter-tracking/');
 assert.equal(response.headers.get('x-middleware-rewrite'),null);
});
test('other tools, assets, and direct API calls do not enter the tracker rewrite',async()=>{
 for(const path of ['/soo-locks/','/api/freighter-page','/api/freighter-ais','/assets/freighter-tracker.js','/great-lakes-freighter-tracking/unknown']){
  assert.equal(await middleware(new Request('https://chrisizworski.com'+path)),undefined,path);
 }
});
test('dispatching the public middleware destination renders reports while preserving the static template',async()=>{
 const source=fs.readFileSync('public/great-lakes-freighter-tracking/index.html','utf8');
 const response=await middleware(new Request('https://chrisizworski.com/great-lakes-freighter-tracking/'));
 assert.equal(new URL(response.headers.get('x-middleware-rewrite')).pathname,'/api/freighter-page');
 const handler=createPageHandler(()=>source,async()=>({ok:true,checkedAt:new Date().toISOString(),attribution:[],vessels:[{mmsi:'366904950',name:'ROUTING FIXTURE',seen:new Date().toISOString(),lat:46.5,lon:-84.36,speedKnots:1,source:'fixture',destination:null}]}));
 const res={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},send(b){this.body=b}};
 await handler({method:'GET'},res);
 assert.equal(res.statusCode,200);assert.ok(res.body.includes('<strong>ROUTING FIXTURE</strong>'));
 assert.ok(res.body.includes('id="freighter-initial-reports"'));
 assert.equal(res.headers['X-Robots-Tag'],undefined);
 assert.equal(fs.readFileSync('public/great-lakes-freighter-tracking/index.html','utf8'),source);
});
