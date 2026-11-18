import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const page=readFileSync(path.join(root,'public/frozen-lighthouses-michigan/index.html'),'utf8');
const stylesheet=readFileSync(path.join(root,'public/assets/frozen-lighthouse-field-guide.css'),'utf8');
const controller=readFileSync(path.join(root,'public/assets/frozen-lighthouse-desk.js'),'utf8');
const manifest=JSON.parse(readFileSync(path.join(root,'data/frozen-lighthouse-photography.json'),'utf8'));
function ratio(first,second){
 const luminance=c=>{
  const parts=c.match(/\w\w/g).map(k=>parseInt(k,16)/255);
  return parts.reduce((s,v,i)=>s+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0);
 };
 const [a,b]=[luminance(first),luminance(second)].sort((x,y)=>x-y);
 return (b+.05)/(a+.05);
}

test('field-guide palette is legible snow/stone with warm lighthouse red rather than teal-on-teal',()=>{
 assert.match(stylesheet,/:root\s*\{\s*color-scheme:light/);
 assert.match(stylesheet,/--bg:#f7f6f2/);
 assert.match(stylesheet,/--ink:#172c36/);
 assert.match(stylesheet,/--highlight:#165775/);
 for(const [foreground,background] of [
  ['172c36','f7f6f2'],['475c66','f7f6f2'],
  ['165775','f7f6f2'],['9e4d3b','f7f6f2'],
  ['ffffff','254c5e'],['854330','fffbf7']]){
  assert.ok(ratio(foreground,background)>=4.5,foreground+' must pass WCAG AA against '+background);
 }
});

test('all three photos are place-matched, locally served, rights-attributed and explicitly historical',()=>{
 assert.equal(manifest.photos.length,3);
 assert.deepEqual(new Set(manifest.photos.map(p=>p.id)),new Set(['st-joseph','grand-haven','holland']));
 assert.match(page,/Historical, not live/);
 assert.match(page,/not a live camera or proof of current ice/i);
 for(const photo of manifest.photos){
  assert.match(photo.sourcePage,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(photo.license,/^CC BY(?:-SA)? /);
  assert.match(page,new RegExp('data-select-lighthouse="'+photo.placeIds[photo.placeIds.length-1]+'"|data-select-lighthouse="'+photo.placeIds[0]+'"'));
  assert.ok(page.includes(photo.sourcePage),'visible photographer link required for '+photo.id);
  assert.ok(page.includes(photo.licenseUrl),'license URL required for '+photo.id);
  for(const width of [640,1280]){
   const name=photo.outputStem+'-'+width+'.webp';
   const file=path.join(root,'public/assets/frozen-lighthouse-photos',name);
   const data=readFileSync(file);
   assert.equal(data.toString('ascii',0,4),'RIFF',name+' must be an actual WebP image');
   assert.equal(data.toString('ascii',8,12),'WEBP',name+' must be a WebP image');
   assert.ok(statSync(file).size<470000,name+' must remain optimized');
   assert.ok(page.includes(name),name+' must be used in page markup');
  }
 }
 assert.doesNotMatch(page,/(?:gettyimages|i\.pinimg|stockphoto)/i);
});
test('photo controls share existing forecast state without extra API requests',()=>{
 assert.match(controller,/data-select-lighthouse/);
 assert.match(controller,/link\.dataset\.selectLighthouse/);
 assert.match(controller,/render\(true\)/);
 assert.match(page,/id="forecast-desk"/);
 assert.match(page,/id="lighthouse-results"/);
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski\.com\/frozen-lighthouses-michigan\/"/);
 assert.match(page,/https:\/\/chrisizworski\.com\/#person/);
 assert.equal((page.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)||[]).length,1);
});

test('forecast graph explains lighthouse spray signals without implying a vessel forecast or measured ice',()=>{
 assert.match(page,/When could freezing spray form on this lighthouse\?/);
 assert.match(page,/Each bar is one forecast hour/);
 assert.match(page,/Conditions not met/);
 assert.match(page,/Missing evidence/);
 assert.match(page,/not the chance of ice forming or a measurement of ice already on the lighthouse/);
 assert.match(page,/id="desk-chart-axis"/);
 assert.doesNotMatch(page.match(/<p id="desk-chart-note"[^>]*>([^<]+)<\/p>/)?.[1]||'',/vessel/i);
 assert.match(controller,/const chartTick=new Intl\.DateTimeFormat/);
 assert.match(controller,/chartAxis\.replaceChildren\(\)/);
 assert.match(controller,/chartTick\.format\(stamp\)/);
 assert.match(controller,/weather evidence missing/);
 assert.match(stylesheet,/\.desk-chart-axis\{/);
});

test('interpretive field-guide copy retains scientific thresholds, safety and matched FAQ structured data',()=>{
 const faqStructured=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const faqItems=faqStructured['@graph'].find(item=>item['@type']==='FAQPage').mainEntity;
 const visible=[...page.matchAll(/<section class="faq"><h3>([^<]+)<\/h3><p>([^<]+)<\/p><\/section>/g)];
 assert.equal(visible.length,4);
 assert.equal(faqItems.length,4);
 visible.forEach((m,i)=>{
  assert.equal(faqItems[i].name,m[1]);
  assert.equal(faqItems[i].acceptedAnswer.text,m[2]);
 });
 for(const threshold of ['15 mph','32 F','40 F'])assert.ok(page.includes(threshold));
 assert.match(page,/View from shore\. Never walk onto an icy or wave-swept pier\./);
 assert.match(page,/not a live camera or proof of current ice or public access/);
 assert.match(page,/not the chance of ice forming or a measurement of ice already on the lighthouse/);
 assert.doesNotMatch(page,/relative vessel-icing indicator/i);
 assert.match(page,/Originally developed for vessels|developed for ice that builds on vessels/);
 assert.match(controller,/function plainReason\(reason\)/);
 assert.match(controller,/plainReason\(h\.reason\)/);
 const watch=readFileSync(path.join(root,'public/assets/frozen-lighthouse-watch.js'),'utf8');
 assert.match(watch,/function plainReason\(reason\)/);
 assert.match(watch,/plainReason\(h\.reason\)/);
 assert.doesNotMatch(watch,/72 hourly icing potential index bars/);
 assert.equal((page.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)||[]).length,1);
});

test('Michigan Tools puts Frozen Lighthouse Watch in Great Lakes weather and winter decisions',()=>{
 const tools=readFileSync(path.join(root,'public/tools/index.html'),'utf8');
 const outdoors=tools.indexOf('id="outdoors-tools-group"');
 const lakes=tools.indexOf('id="great-lakes-tools-group"');
 const trips=tools.indexOf('id="trip-planners-group"');
 const winter=tools.indexOf('id="winter-task-router"');
 const featured=tools.indexOf('class="featured-tools"');
 const card=tools.indexOf('data-tool-id="frozen-lighthouse-watch"');
 assert.ok(outdoors>=0&&outdoors<lakes&&lakes<trips);
 assert.ok(card>lakes&&card<trips,'catalog card belongs in Great Lakes weather, not fishing');
 assert.equal((tools.match(/data-tool-id="frozen-lighthouse-watch"/g)||[]).length,1,'one canonical tool card');
 const persona=tools.indexOf('data-winter-persona="lighthouse-ice"');
 assert.ok(persona>winter&&persona<featured,'winter decision desk links directly to watch');
 assert.match(tools.slice(persona,persona+850),/data-track-tool="frozen-lighthouse-watch"/);
 assert.match(tools.slice(persona,persona+850),/view from shore/);
 const scriptStart=tools.indexOf('<script type="application/ld+json">');
 assert.ok(scriptStart>=0,'Tools ItemList script exists');
 const jsonStart=scriptStart+'<script type="application/ld+json">'.length;
 const jsonEnd=tools.indexOf('</script>',jsonStart);
 const schema=JSON.parse(tools.slice(jsonStart,jsonEnd));
 const list=schema['@graph'].find(item=>item['@id']==='https://chrisizworski.com/tools/#toollist');
 assert.ok(list);
 const catalogCount=(tools.match(/class="tool-card"/g)||[]).length;
 assert.equal(list.numberOfItems,catalogCount);
 assert.equal(list.itemListElement.length,catalogCount);
 const matches=list.itemListElement.filter(entry=>entry.item.url==='https://chrisizworski.com/frozen-lighthouses-michigan/');
 assert.equal(matches.length,1);
 assert.match(matches[0].item.description,/nine Lake Michigan pier lights/);
});

test('winter canonical remains singly indexed in the winter sitemap and stays in the Tools directory',()=>{
 const canonical='https://chrisizworski.com/frozen-lighthouses-michigan/';
 const winter=readFileSync(path.join(root,'public/sitemap-winter.xml'),'utf8');
 const general=readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
 const index=readFileSync(path.join(root,'public/sitemap-index.xml'),'utf8');
 const tools=readFileSync(path.join(root,'public/tools/index.html'),'utf8');
 assert.equal(winter.split('<loc>'+canonical+'</loc>').length-1,1,'winter sitemap owns exact canonical');
 assert.equal(general.split('<loc>'+canonical+'</loc>').length-1,0,'do not duplicate the canonical in generic sitemap');
 assert.ok(index.includes('sitemap-winter.xml'),'sitemap index must link the winter sitemap');
 assert.ok(tools.includes('data-tool-id="frozen-lighthouse-watch"'));
 assert.ok(tools.includes('href="/frozen-lighthouses-michigan/"'));
});
