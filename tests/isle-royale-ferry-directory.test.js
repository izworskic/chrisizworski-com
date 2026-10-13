const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const canonical='https://chrisizworski.com/isle-royale-ferry/';
test('both tool directories present one clear, search-intent-owned ferry listing',()=>{
 const national=read('public/synced-national-tools/index.html');const tools=read('public/tools/index.html');
 assert.equal((national.match(/data-tool-id="isle-royale-ferry"/g)||[]).length,1);
 assert.equal((tools.match(/data-tool-id="isle-royale-ferry"/g)||[]).length,1);
 assert.match(national,/Isle Royale Ferry Cost, Schedule &amp; Booking/);
 assert.match(tools,/Isle Royale Ferry Cost, Schedule &amp; Booking/);
 assert.match(national,/2027 sailings and seats not yet confirmed/);
 assert.match(tools,/2026 reference ticket prices/);
 const ng=JSON.parse(national.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const tg=JSON.parse(tools.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const nitems=ng.find(x=>x['@type']==='ItemList').itemListElement;
 const titems=tg.find(x=>x['@type']==='ItemList').itemListElement;
 assert.equal(nitems.filter(x=>x.url===canonical).length,1);
 assert.equal(titems.filter(x=>x.item?.url===canonical).length,1);
 assert.equal(nitems.find(x=>x.url===canonical).name,'Isle Royale Ferry Cost, Schedule & Booking');
 assert.equal(titems.find(x=>x.item?.url===canonical).item.name,'Isle Royale Ferry Cost, Schedule & Booking (Grand Portage)');
});
test('Lake Superior Circle Tour sends Grand Portage visitors to the ferry planner',()=>{
 const circle=read('public/lake-superior-circle-tour/index.html');
 assert.match(circle,/Compare Isle Royale ferry prices, sailing days/);
 assert.match(circle,/href="\/isle-royale-ferry\/"/);
});
test('ferry owns a distinct discovery intent in the connected tool registry',()=>{
 const reg=JSON.parse(read('benchmarks/tool-network-registry.json'));
 const node=reg.tools.find(x=>x.id==='isle-royale-ferry');
 assert.equal(node.canonical,canonical);
 assert.match(node.primaryIntent,/ferry cost and schedules/);
 assert.match(node.primaryIntent,/reservations/);
});
