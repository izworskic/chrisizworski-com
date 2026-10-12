const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8'));
test('Grand Portage canonical page, base engine, interactive V2 JavaScript and V2 stylesheet share an owning deployment',()=>{
 const root='https://isle-royale-outdoors.vercel.app';
 const required={
  '/isle-royale-ferry':root+'/isle-royale-ferry/index.html',
  '/isle-royale-ferry/':root+'/isle-royale-ferry/index.html',
  '/assets/grand-portage-ferry.js':root+'/assets/grand-portage-ferry.js',
  '/assets/grand-portage-ferry-v2.css':root+'/assets/grand-portage-ferry-v2.css',
  '/assets/grand-portage-ferry-v2.js':root+'/assets/grand-portage-ferry-v2.js'
 };
 for(const [source,destination] of Object.entries(required)){
  const rules=config.rewrites.filter(x=>x.source===source);
  assert.equal(rules.length,1,'exactly one rewrite for '+source);
  assert.equal(rules[0].destination,destination,'correct source owner for '+source);
 }
});
test('canonical page stays included in National Tools and sitemap',()=>{
 const page=fs.readFileSync(path.join(__dirname,'../public/tools/index.html'),'utf8');
 const sitemap=fs.readFileSync(path.join(__dirname,'../public/sitemap.xml'),'utf8');
 assert.match(page,/data-tool-id="isle-royale-ferry"/);
 assert.match(sitemap,/<loc>https:\/\/chrisizworski.com\/isle-royale-ferry\/<\/loc>/);
});
