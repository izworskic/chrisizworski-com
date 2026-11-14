'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-layup-registry.json'),'utf8'));
const bios=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-vessel-biographies.json'),'utf8'));
const {renderProfile:renderRawProfile}=require('../lib/freighter-layup-profile-render.cjs');
const xml=fs.readFileSync(path.join(root,'public/sitemap-winter.xml'),'utf8');
function renderProfile(p,registry){
 const needle='https://chrisizworski.com/great-lakes-freighter-winter-layup/vessels/'+p.id+'/</loc><lastmod>';
 const pos=xml.indexOf(needle);
 assert.ok(pos>=0,'biography has sitemap entry: '+p.id);
 const modified=xml.slice(pos+needle.length,pos+needle.length+10);
 return renderRawProfile(p,registry,modified);
}
test('six authored biography subjects with meaningful chapters and trusted references',()=>{
 assert.equal(bios.schemaVersion,1);
 assert.equal(bios.profiles.length,6);
 assert.equal(new Set(bios.profiles.map(p=>p.id)).size,bios.profiles.length);
 for(const p of bios.profiles){
   assert.ok(registry.seasons.some(s=>s.records.some(r=>r.id===p.id)),'must have a winter record');
   assert.ok(p.intro.length>100&&p.chapters.length>=2);
   assert.ok(p.specs.length>=2);
   for(const ch of p.chapters){assert.ok(ch.body.length>=100);assert.match(ch.source,/^https:\/\//);}
   for(const spec of p.specs)assert.match(spec.source,/^https:\/\//);
 }
});
test('static pages match deterministic renderer and have unique canonicals',()=>{
 const augmented={...registry,__profiles:bios.profiles};
 const canonicals=new Set();
 for(const p of bios.profiles){
   const rendered=renderProfile(p,augmented);
   const location=path.join(root,'public/great-lakes-freighter-winter-layup/vessels',p.id,'index.html');
   assert.equal(fs.readFileSync(location,'utf8'),rendered,'profile drift: '+p.id);
   const canonical='https://chrisizworski.com/great-lakes-freighter-winter-layup/vessels/'+p.id+'/';
   assert.ok(rendered.includes('<link rel="canonical" href="'+canonical+'">'));
   assert.ok(!canonicals.has(canonical));canonicals.add(canonical);
   assert.ok(rendered.includes('application/ld+json')&&rendered.includes('Read the original reporting'));
   assert.match(rendered,/Where this ship spent(?:<br>)?<em>?its winters/i);
 }
});
test('Algoma Compass timeline has independent records in both seasons',()=>{
 const p=bios.profiles.find(p=>p.id==='algoma-compass');
 const page=renderProfile(p,{...registry,__profiles:bios.profiles});
 assert.ok(page.includes('Winter 2025–26'));
 assert.ok(page.includes('Winter 2024–25'));
 assert.ok(page.includes('2025-01-31'));
 assert.ok(page.includes('2026-01-19'));
 assert.equal((page.match(/Owen Sound, Ontario/g)||[]).length>=2,true);
 assert.ok(!page.includes('current live ship position'));
});
test('image attribution stays tied to source photo metadata',()=>{
 const page=renderProfile(bios.profiles.find(p=>p.id==='oakglen'),{...registry,__profiles:bios.profiles});
 assert.ok(page.includes('GuavaTrain'));
 assert.ok(page.includes('CC BY-SA 4.0'));
 assert.ok(page.includes('Ship_Oakglen.jpg'));
});

test('all vessel titles fit SERP length and retain individual identity',()=>{
 const augmented={...registry,__profiles:bios.profiles};
 for(const p of bios.profiles){
   const page=renderProfile(p,augmented);
   const match=page.match(/<title>([^<]+)<\/title>/);
   assert.ok(match,'title tag for '+p.id);
   const title=match[1].replace(/&amp;/g,'&');
   assert.ok(title.length<=60,'title too long: '+title);
   assert.ok(title.includes(p.name),'ship name must lead title');
 }
});

test('all six biographies keep the editorial family and verified winter tables',()=>{
 for(const p of bios.profiles){
  const page=renderProfile(p,{...registry,__profiles:bios.profiles});
  assert.ok(page.includes('<body class="layup-biography">'),p.id);
  assert.ok(page.includes('bio-hero-actions')&&page.includes('bio-trust-bar'),p.id);
  assert.ok(page.includes('id="winter-record"')&&page.includes('Read the original reporting'),p.id);
 }
});

test('every ship biography has a crawlable winter sitemap entry and a named-vessel social preview',()=>{
 const xml=fs.readFileSync(path.join(root,'public/sitemap-winter.xml'),'utf8');
 const site='https://chrisizworski.com/great-lakes-freighter-winter-layup/';
 const urls=[];
 for(const p of bios.profiles){
  const url=site+'vessels/'+p.id+'/';
  const page=fs.readFileSync(path.join(root,'public/great-lakes-freighter-winter-layup/vessels',p.id,'index.html'),'utf8');
  const match='<loc>'+url+'</loc><lastmod>';
  assert.equal(xml.split(match).length-1,1,'one sitemap URL for '+p.id);
  assert.match(page,/<meta property="og:image" content="https:\/\/[^"]+"/);
  assert.match(page,/<meta property="og:image:alt" content="[^"]+"/);
  assert.match(page,/<meta name="twitter:image" content="https:\/\/[^"]+"/);
  assert.match(page,/<meta name="twitter:image:alt" content="[^"]+"/);
  assert.ok(page.includes('<meta name="twitter:card" content="summary_large_image">'));
  urls.push(url);
 }
 assert.equal(urls.length,6);
 assert.ok(xml.includes('FREIGHTER_LAYUP_VESSEL_SITEMAP:START'));
 assert.ok(xml.includes('FREIGHTER_LAYUP_VESSEL_SITEMAP:END'));
});

test('atlas has accessible Open Graph and X preview metadata with actual image dimensions',()=>{
 const page=fs.readFileSync(path.join(root,'public/great-lakes-freighter-winter-layup/index.html'),'utf8');
 assert.ok(page.includes('<meta property="og:image:width" content="1280">'));
 assert.ok(page.includes('<meta property="og:image:height" content="960">'));
 assert.ok(page.includes('<meta name="twitter:card" content="summary_large_image">'));
 assert.ok(page.includes('<meta name="twitter:image:alt" content='));
});


test('image sitemap advertises the original winter hero and locally hosted ship previews',()=>{
 const xml=fs.readFileSync(path.join(root,'public/image-sitemap.xml'),'utf8');
 const available=[
  ['','freighter-winter-hero.jpg'],
  ['vessels/lee-a-tregurtha/','freighter-lee-feature.jpg'],
  ['vessels/james-r-barker/','freighter-barker-feature.jpg'],
  ['vessels/american-spirit/','freighter-american-feature.jpg'],
  ['vessels/oakglen/','freighter-oakglen-feature.jpg']
 ];
 for(const [suffix,image] of available){
  const url='https://chrisizworski.com/great-lakes-freighter-winter-layup/'+suffix;
  assert.equal(xml.split('<loc>'+url+'</loc>').length-1,1,'exactly one image sitemap URL '+suffix);
  assert.ok(xml.includes('<image:loc>https://chrisizworski.com/assets/'+image+'</image:loc>'));
  assert.ok(fs.statSync(path.join(root,'public/assets',image)).size>20000,'nonempty local photo '+image);
 }
 assert.ok(xml.includes('FREIGHTER_LAYUP_IMAGE_SITEMAP:START'));
 assert.ok(xml.includes('FREIGHTER_LAYUP_IMAGE_SITEMAP:END'));
 assert.equal((xml.match(/FREIGHTER_LAYUP_IMAGE_SITEMAP:START/g)||[]).length,1);
 const owned=xml.split('FREIGHTER_LAYUP_IMAGE_SITEMAP:START')[1].split('FREIGHTER_LAYUP_IMAGE_SITEMAP:END')[0];
 assert.doesNotMatch(owned,/<image:(?:title|caption|geo_location|license)>/,'no deprecated Google image-sitemap tags');
 assert.equal((owned.match(/<image:loc>/g)||[]).length,5);
});

test('every published vessel source uses Article schema, never Vehicle or Product',()=>{
 const rootDir=path.join(root,'public/great-lakes-freighter-winter-layup/vessels');
 const folders=fs.readdirSync(rootDir,{withFileTypes:true})
   .filter(d=>d.isDirectory()&&fs.existsSync(path.join(rootDir,d.name,'index.html')))
   .map(d=>d.name).sort();
 assert.deepEqual(folders,bios.profiles.map(p=>p.id).sort(),'inspect every published vessel page');
 for(const slug of folders){
  const html=fs.readFileSync(path.join(rootDir,slug,'index.html'),'utf8');
  const matches=[...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
  assert.equal(matches.length,1,'one structured-data script on '+slug);
  const data=JSON.parse(matches[0][1]);
  const graph=data['@graph'];
  assert.ok(Array.isArray(graph),'schema graph on '+slug);
  const web=graph.find(node=>node['@type']==='WebPage');
  const article=graph.find(node=>node['@type']==='Article');
  const person=graph.find(node=>node['@type']==='Person');
  const crumbs=graph.find(node=>node['@type']==='BreadcrumbList');
  const url='https://chrisizworski.com/great-lakes-freighter-winter-layup/vessels/'+slug+'/';
  assert.ok(web&&article&&person&&crumbs,'retain editorial, identity and breadcrumb schema on '+slug);
  assert.deepEqual(web.mainEntity,{'@id':url+'#article'});
  assert.equal(article['@id'],url+'#article');
  assert.deepEqual(article.mainEntityOfPage,{'@id':url+'#page'});
  assert.deepEqual(article.author,{'@id':'https://chrisizworski.com/#person'});
  assert.ok(article.headline.includes(bios.profiles.find(p=>p.id===slug).name));
  assert.equal(article.dateModified,web.dateModified);
  const scan=value=>{
   if(Array.isArray(value)){for(const item of value)scan(item);return;}
   if(!value||typeof value!=='object')return;
   const types=[].concat(value['@type']||[]);
   assert.ok(!types.some(type=>type==='Vehicle'||type==='Product'),'commercial schema on '+slug);
   for(const key of Object.keys(value)){
    assert.ok(!['offers','review','aggregateRating'].includes(key),'fabricated commercial attribute on '+slug);
    scan(value[key]);
   }
  };
  scan(data);
 }
});
