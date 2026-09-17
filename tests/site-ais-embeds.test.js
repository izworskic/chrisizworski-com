const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const replace=require('../lib/site-ais-embeds');
const eligible=require('../lib/adsense-eligibility').eligible;
for(const [page,region] of [['ballard-locks','ballard'],['melvin-price','melvin']])test(`${page} provider integration preserves the tool and repairs only its AIS embed`,()=>{
 const source=readFileSync(`public/${page}/index.html`,'utf8'), result=replace(source);
 assert.match(result,new RegExp('/ais-map/\\?region='+region));
 assert.equal((result.match(/<iframe\b/g)||[]).length,(source.match(/<iframe\b/g)||[]).length);
 assert.equal((result.match(/application\/ld\+json/g)||[]).length,(source.match(/application\/ld\+json/g)||[]).length);
 assert.equal(replace(result),result);
 assert.ok(!result.includes('https://embed.myshiptracking.com/embed'));
});
test('embedded map stays unindexed and unmonetized',()=>{const h=readFileSync('public/ais-map/index.html','utf8');assert.equal(eligible(h,'/ais-map/'),false);});
test('shared AIS endpoint rejects arbitrary map regions',async()=>{const handler=require('../api/embedded-ais');const res={setHeader(){},status(n){this.code=n;return this},json(d){this.data=d}};await handler({method:'GET',query:{region:'arbitrary'}},res);assert.equal(res.code,400);assert.equal(res.data.ok,false)});
